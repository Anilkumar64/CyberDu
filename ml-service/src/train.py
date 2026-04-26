from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier, VotingClassifier
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, f1_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline

from .config import BASE_MODEL_PATH, MIN_STUDENT_TRAINING_SAMPLES
from .model_store import save_model
from .text_processing import clean_text

STARTER_DATA = [
    ("you are so stupid and ugly nobody likes you", 1),
    ("kill yourself loser", 1),
    ("i hate you so much you worthless piece of garbage", 1),
    ("nobody wants you here go away forever", 1),
    ("you are fat and disgusting", 1),
    ("go die in a hole you pathetic loser", 1),
    ("you are a waste of space and air", 1),
    ("everyone hates you and you know it", 1),
    ("had a great day at the park today", 0),
    ("just finished reading an amazing book", 0),
    ("excited for the weekend plans", 0),
    ("happy birthday hope you have a wonderful day", 0),
    ("thank you for your help really appreciate it", 0),
    ("congratulations on your achievement well done", 0),
    ("support each other always kindness matters", 0),
    ("this artwork is incredible so talented", 0),
]


def make_pipeline() -> Pipeline:
    ensemble = VotingClassifier(
        estimators=[
            ("lr", LogisticRegression(max_iter=1000, C=1.5, random_state=42)),
            ("rf", RandomForestClassifier(n_estimators=120, random_state=42)),
            ("gb", GradientBoostingClassifier(n_estimators=120, random_state=42)),
        ],
        voting="soft",
    )
    return Pipeline(
        [
            ("tfidf", TfidfVectorizer(ngram_range=(1, 2), max_features=7000, sublinear_tf=True)),
            ("clf", ensemble),
        ]
    )


def train_from_samples(samples: list[dict]) -> tuple[Pipeline, dict]:
    if len(samples) < MIN_STUDENT_TRAINING_SAMPLES:
        raise ValueError(f"Need at least {MIN_STUDENT_TRAINING_SAMPLES} labeled samples")

    texts = [clean_text(sample["text"]) for sample in samples]
    labels = [int(sample["label"]) for sample in samples]
    if len(set(labels)) < 2:
        raise ValueError("Training samples must include both safe and bullying labels")

    model = make_pipeline()
    X_train, X_test, y_train, y_test = train_test_split(
        texts, labels, test_size=0.25, random_state=42, stratify=labels
    )
    model.fit(X_train, y_train)
    predictions = model.predict(X_test)
    metrics = {
        "accuracy": round(float(accuracy_score(y_test, predictions)), 4),
        "f1Score": round(float(f1_score(y_test, predictions, zero_division=0)), 4),
        "trainingDataCount": len(samples),
    }
    return model, metrics


def ensure_base_model() -> None:
    if BASE_MODEL_PATH.exists():
        return
    model, _ = train_from_samples([{"text": text, "label": label} for text, label in STARTER_DATA])
    BASE_MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    import joblib

    joblib.dump(model, BASE_MODEL_PATH)


def retrain_student(student_id: str, samples: list[dict]) -> dict:
    model, metrics = train_from_samples(samples)
    metadata = {
        "accuracy": metrics["accuracy"],
        "f1Score": metrics["f1Score"],
        "trainingDataCount": metrics["trainingDataCount"],
    }
    return save_model(student_id, model, metadata)
