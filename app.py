import os
import pickle
import re
import sqlite3
import string
from datetime import datetime, timezone
from functools import wraps

import numpy as np
from flask import Flask, jsonify, request, send_from_directory, session
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier, VotingClassifier
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from werkzeug.security import check_password_hash, generate_password_hash

app = Flask(__name__, static_folder="static")
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "dev-change-this-secret")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "cyberguard.db")
MODEL_PATH = os.path.join(BASE_DIR, "model.pkl")
MIN_TRAINING_SAMPLES = 12

STARTER_DATA = [
    ("you are so stupid and ugly nobody likes you", 1, "Seed Student", "seed"),
    ("kill yourself loser", 1, "Seed Student", "seed"),
    ("i hate you so much you worthless piece of garbage", 1, "Seed Student", "seed"),
    ("nobody wants you here go away forever", 1, "Seed Student", "seed"),
    ("you are fat and disgusting", 1, "Seed Student", "seed"),
    ("you should just disappear nobody cares about you", 1, "Seed Student", "seed"),
    ("idiot moron dumb stupid useless", 1, "Seed Student", "seed"),
    ("you are the worst person alive", 1, "Seed Student", "seed"),
    ("everyone hates you and you know it", 1, "Seed Student", "seed"),
    ("go die in a hole you pathetic loser", 1, "Seed Student", "seed"),
    ("freak weirdo nobody wants you around", 1, "Seed Student", "seed"),
    ("you are a waste of space and air", 1, "Seed Student", "seed"),
    ("had a great day at the park today", 0, "Seed Student", "seed"),
    ("just finished reading an amazing book", 0, "Seed Student", "seed"),
    ("excited for the weekend plans", 0, "Seed Student", "seed"),
    ("happy birthday hope you have a wonderful day", 0, "Seed Student", "seed"),
    ("the weather is so nice today love it", 0, "Seed Student", "seed"),
    ("thank you for your help really appreciate it", 0, "Seed Student", "seed"),
    ("congratulations on your achievement well done", 0, "Seed Student", "seed"),
    ("spending time with family is the best", 0, "Seed Student", "seed"),
    ("good morning everyone hope you have a great day", 0, "Seed Student", "seed"),
    ("finals are tough but i believe in you", 0, "Seed Student", "seed"),
    ("support each other always kindness matters", 0, "Seed Student", "seed"),
    ("this artwork is incredible so talented", 0, "Seed Student", "seed"),
]

TOXIC_TERMS = [
    "stupid",
    "idiot",
    "ugly",
    "hate",
    "kill",
    "die",
    "loser",
    "worthless",
    "disgusting",
    "fat",
    "freak",
    "moron",
    "dumb",
    "pathetic",
    "trash",
    "garbage",
    "useless",
    "horrible",
    "retarded",
    "awful",
    "terrible",
]

model = None
model_metrics = {}


def now_iso():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with get_db() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'teacher',
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS student_samples (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                student_name TEXT NOT NULL,
                text TEXT NOT NULL,
                label INTEGER CHECK(label IN (0, 1)),
                source TEXT NOT NULL DEFAULT 'manual',
                created_by INTEGER,
                prediction_label INTEGER,
                prediction_risk REAL,
                created_at TEXT NOT NULL,
                FOREIGN KEY(created_by) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS model_runs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                trained_at TEXT NOT NULL,
                samples INTEGER NOT NULL,
                accuracy REAL,
                report TEXT,
                trained_by INTEGER,
                FOREIGN KEY(trained_by) REFERENCES users(id)
            );
            """
        )

        seed_count = conn.execute(
            "SELECT COUNT(*) AS count FROM student_samples WHERE source = 'seed'"
        ).fetchone()["count"]
        if seed_count == 0:
            conn.executemany(
                """
                INSERT INTO student_samples
                    (text, label, student_name, source, created_at)
                VALUES (?, ?, ?, ?, ?)
                """,
                [(text, label, student, source, now_iso()) for text, label, student, source in STARTER_DATA],
            )


def clean_text(text):
    text = text.lower()
    text = re.sub(r"http\S+|www\S+", "", text)
    text = re.sub(r"@\w+|#\w+", "", text)
    text = text.translate(str.maketrans("", "", string.punctuation))
    text = re.sub(r"\s+", " ", text).strip()
    return text


def fetch_training_data():
    with get_db() as conn:
        rows = conn.execute(
            """
            SELECT text, label
            FROM student_samples
            WHERE label IS NOT NULL
            ORDER BY id
            """
        ).fetchall()
    return [(row["text"], int(row["label"])) for row in rows]


def build_model(training_data=None, trained_by=None):
    training_data = training_data or fetch_training_data()
    if len(training_data) < MIN_TRAINING_SAMPLES:
        raise ValueError(f"Need at least {MIN_TRAINING_SAMPLES} labeled samples to train.")

    labels = [label for _, label in training_data]
    if len(set(labels)) < 2:
        raise ValueError("Training data must contain both safe and cyberbullying labels.")

    texts = [clean_text(text) for text, _ in training_data]

    lr = LogisticRegression(max_iter=1000, C=1.5, random_state=42)
    rf = RandomForestClassifier(n_estimators=120, random_state=42)
    gb = GradientBoostingClassifier(n_estimators=120, random_state=42)

    ensemble = VotingClassifier(
        estimators=[("lr", lr), ("rf", rf), ("gb", gb)],
        voting="soft",
    )

    pipeline = Pipeline(
        [
            (
                "tfidf",
                TfidfVectorizer(
                    ngram_range=(1, 2),
                    max_features=7000,
                    sublinear_tf=True,
                    min_df=1,
                ),
            ),
            ("clf", ensemble),
        ]
    )

    test_size = 0.25 if len(training_data) >= 24 else 0.2
    X_train, X_test, y_train, y_test = train_test_split(
        texts,
        labels,
        test_size=test_size,
        random_state=42,
        stratify=labels,
    )

    pipeline.fit(X_train, y_train)
    y_pred = pipeline.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    report = classification_report(y_test, y_pred, zero_division=0)

    with open(MODEL_PATH, "wb") as f:
        pickle.dump(pipeline, f)

    metrics = {
        "accuracy": round(float(accuracy), 4),
        "samples": len(training_data),
        "trained_at": now_iso(),
        "report": report,
    }

    with get_db() as conn:
        conn.execute(
            """
            INSERT INTO model_runs (trained_at, samples, accuracy, report, trained_by)
            VALUES (?, ?, ?, ?, ?)
            """,
            (metrics["trained_at"], metrics["samples"], metrics["accuracy"], report, trained_by),
        )

    return pipeline, metrics


def load_model():
    metrics = latest_model_metrics()
    if os.path.exists(MODEL_PATH) and metrics:
        try:
            with open(MODEL_PATH, "rb") as f:
                loaded_model = pickle.load(f)
            return loaded_model, metrics
        except (AttributeError, ModuleNotFoundError, ImportError, ValueError, pickle.UnpicklingError) as exc:
            print(f"Existing model.pkl could not be loaded ({exc}). Retraining from database...")
            return build_model()
    return build_model()


def latest_model_metrics():
    with get_db() as conn:
        row = conn.execute(
            """
            SELECT trained_at, samples, accuracy, report
            FROM model_runs
            ORDER BY id DESC
            LIMIT 1
            """
        ).fetchone()
    if not row:
        return {}
    return {
        "trained_at": row["trained_at"],
        "samples": row["samples"],
        "accuracy": row["accuracy"],
        "report": row["report"],
    }


def current_user():
    user_id = session.get("user_id")
    if not user_id:
        return None
    with get_db() as conn:
        row = conn.execute(
            "SELECT id, name, email, role, created_at FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()
    return dict(row) if row else None


def login_required(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        if not session.get("user_id"):
            return jsonify({"error": "Authentication required"}), 401
        return func(*args, **kwargs)

    return wrapper


def validate_text(text, max_len=2000):
    if not isinstance(text, str):
        return "Text must be a string"
    if not text.strip():
        return "Text is required"
    if len(text) > max_len:
        return f"Text too long (max {max_len} chars)"
    return None


def predict_text(text):
    cleaned = clean_text(text)
    proba = model.predict_proba([cleaned])[0]
    label = int(np.argmax(proba))
    confidence = float(np.max(proba))
    risk_score = float(proba[1])

    if risk_score >= 0.75:
        severity = "HIGH"
    elif risk_score >= 0.45:
        severity = "MEDIUM"
    elif risk_score >= 0.20:
        severity = "LOW"
    else:
        severity = "NONE"

    found_words = [word for word in TOXIC_TERMS if word in cleaned.split()]

    return {
        "label": label,
        "is_bullying": bool(label),
        "confidence": round(confidence * 100, 1),
        "risk_score": round(risk_score * 100, 1),
        "severity": severity,
        "flagged_words": found_words,
        "text_length": len(text),
        "word_count": len(text.split()),
    }


@app.route("/")
def index():
    return send_from_directory("static", "index.html")


@app.route("/api/signup", methods=["POST"])
def signup_route():
    data = request.get_json(silent=True) or {}
    name = str(data.get("name", "")).strip()
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))

    if len(name) < 2:
        return jsonify({"error": "Name must be at least 2 characters"}), 400
    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        return jsonify({"error": "Enter a valid email address"}), 400
    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters"}), 400

    try:
        with get_db() as conn:
            cursor = conn.execute(
                """
                INSERT INTO users (name, email, password_hash, role, created_at)
                VALUES (?, ?, ?, ?, ?)
                """,
                (name, email, generate_password_hash(password), "teacher", now_iso()),
            )
            session["user_id"] = cursor.lastrowid
    except sqlite3.IntegrityError:
        return jsonify({"error": "An account with this email already exists"}), 409

    return jsonify({"user": current_user()}), 201


@app.route("/api/login", methods=["POST"])
def login_route():
    data = request.get_json(silent=True) or {}
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))

    with get_db() as conn:
        row = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()

    if not row or not check_password_hash(row["password_hash"], password):
        return jsonify({"error": "Invalid email or password"}), 401

    session["user_id"] = row["id"]
    return jsonify({"user": current_user()})


@app.route("/api/logout", methods=["POST"])
def logout_route():
    session.clear()
    return jsonify({"ok": True})


@app.route("/api/me", methods=["GET"])
def me_route():
    return jsonify({"user": current_user()})


@app.route("/api/predict", methods=["POST"])
@login_required
def predict_route():
    data = request.get_json(silent=True) or {}
    text = data.get("text", "")
    student_name = str(data.get("student_name", "Anonymous Student")).strip() or "Anonymous Student"
    save_sample = bool(data.get("save_sample", True))
    error = validate_text(text)
    if error:
        return jsonify({"error": error}), 400

    result = predict_text(text.strip())
    sample_id = None
    if save_sample:
        with get_db() as conn:
            cursor = conn.execute(
                """
                INSERT INTO student_samples
                    (student_name, text, source, created_by, prediction_label,
                     prediction_risk, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    student_name,
                    text.strip(),
                    "prediction",
                    session["user_id"],
                    result["label"],
                    result["risk_score"],
                    now_iso(),
                ),
            )
            sample_id = cursor.lastrowid

    return jsonify({**result, "sample_id": sample_id})


@app.route("/api/batch", methods=["POST"])
@login_required
def batch_route():
    data = request.get_json(silent=True) or {}
    texts = data.get("texts")
    student_name = str(data.get("student_name", "Batch Upload")).strip() or "Batch Upload"
    if not isinstance(texts, list):
        return jsonify({"error": "texts must be a list"}), 400

    clean_items = [str(text).strip() for text in texts if str(text).strip()][:20]
    results = []
    with get_db() as conn:
        for text in clean_items:
            if len(text) > 2000:
                continue
            result = predict_text(text)
            cursor = conn.execute(
                """
                INSERT INTO student_samples
                    (student_name, text, source, created_by, prediction_label,
                     prediction_risk, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    student_name,
                    text,
                    "batch",
                    session["user_id"],
                    result["label"],
                    result["risk_score"],
                    now_iso(),
                ),
            )
            results.append({**result, "sample_id": cursor.lastrowid, "text": text})

    return jsonify({"results": results, "count": len(results)})


@app.route("/api/samples", methods=["GET", "POST"])
@login_required
def samples_route():
    if request.method == "POST":
        data = request.get_json(silent=True) or {}
        text = data.get("text", "")
        label = data.get("label")
        student_name = str(data.get("student_name", "Manual Entry")).strip() or "Manual Entry"
        error = validate_text(text)
        if error:
            return jsonify({"error": error}), 400
        if label not in (0, 1, "0", "1"):
            return jsonify({"error": "Label must be 0 for safe or 1 for bullying"}), 400

        with get_db() as conn:
            cursor = conn.execute(
                """
                INSERT INTO student_samples
                    (student_name, text, label, source, created_by, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (student_name, text.strip(), int(label), "manual", session["user_id"], now_iso()),
            )
        return jsonify({"id": cursor.lastrowid}), 201

    limit = min(int(request.args.get("limit", 50)), 100)
    with get_db() as conn:
        rows = conn.execute(
            """
            SELECT s.id, s.student_name, s.text, s.label, s.source,
                   s.prediction_label, s.prediction_risk, s.created_at,
                   u.name AS created_by_name
            FROM student_samples s
            LEFT JOIN users u ON u.id = s.created_by
            ORDER BY s.id DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()
    return jsonify({"samples": [dict(row) for row in rows]})


@app.route("/api/samples/<int:sample_id>/label", methods=["PATCH"])
@login_required
def label_sample_route(sample_id):
    data = request.get_json(silent=True) or {}
    label = data.get("label")
    if label not in (0, 1, "0", "1"):
        return jsonify({"error": "Label must be 0 for safe or 1 for bullying"}), 400

    with get_db() as conn:
        cursor = conn.execute(
            "UPDATE student_samples SET label = ? WHERE id = ?",
            (int(label), sample_id),
        )
    if cursor.rowcount == 0:
        return jsonify({"error": "Sample not found"}), 404
    return jsonify({"ok": True})


@app.route("/api/retrain", methods=["POST"])
@login_required
def retrain_route():
    global model, model_metrics
    try:
        model, model_metrics = build_model(trained_by=session["user_id"])
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    return jsonify({"ok": True, "metrics": model_metrics})


@app.route("/api/stats", methods=["GET"])
@login_required
def stats_route():
    with get_db() as conn:
        counts = conn.execute(
            """
            SELECT
                COUNT(*) AS total_samples,
                SUM(CASE WHEN label IS NOT NULL THEN 1 ELSE 0 END) AS labeled_samples,
                SUM(CASE WHEN label = 1 THEN 1 ELSE 0 END) AS bullying_samples,
                SUM(CASE WHEN label = 0 THEN 1 ELSE 0 END) AS safe_samples,
                SUM(CASE WHEN label IS NULL THEN 1 ELSE 0 END) AS unlabeled_samples
            FROM student_samples
            """
        ).fetchone()
        recent_runs = conn.execute(
            """
            SELECT trained_at, samples, accuracy
            FROM model_runs
            ORDER BY id DESC
            LIMIT 5
            """
        ).fetchall()

    return jsonify(
        {
            "model": "Ensemble (Logistic Regression + Random Forest + Gradient Boosting)",
            "vectorizer": "TF-IDF (1-2 ngrams, 7000 features)",
            "classes": ["Safe", "Cyberbullying"],
            "counts": dict(counts),
            "latest_model": model_metrics or latest_model_metrics(),
            "recent_runs": [dict(row) for row in recent_runs],
        }
    )


init_db()
model, model_metrics = load_model()


if __name__ == "__main__":
    app.run(debug=True, port=5050)
