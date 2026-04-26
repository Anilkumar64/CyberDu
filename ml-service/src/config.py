from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]
MODEL_DIR = BASE_DIR / "models"
BASE_MODEL_PATH = MODEL_DIR / "global_base.pkl"
MODEL_DIR.mkdir(parents=True, exist_ok=True)

MIN_STUDENT_TRAINING_SAMPLES = 12
KEEP_MODEL_VERSIONS = 3
