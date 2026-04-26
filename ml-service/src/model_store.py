import json
import shutil
from datetime import datetime, timezone
from pathlib import Path

import joblib

from .config import BASE_MODEL_PATH, KEEP_MODEL_VERSIONS, MODEL_DIR


def utc_stamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")


def student_dir(student_id: str) -> Path:
    safe_id = "".join(ch for ch in student_id if ch.isalnum() or ch in ("-", "_"))
    path = MODEL_DIR / safe_id
    path.mkdir(parents=True, exist_ok=True)
    return path


def current_model_path(student_id: str) -> Path:
    return student_dir(student_id) / "current.pkl"


def metadata_path(student_id: str) -> Path:
    return student_dir(student_id) / "metadata.json"


def load_metadata(student_id: str) -> dict:
    path = metadata_path(student_id)
    if not path.exists():
        return {
            "studentId": student_id,
            "modelVersion": "global-base",
            "accuracy": 0,
            "f1Score": 0,
            "trainingDataCount": 0,
            "status": "untrained",
            "versions": [],
            "confidenceHistory": [],
        }
    return json.loads(path.read_text())


def save_metadata(student_id: str, metadata: dict) -> None:
    metadata_path(student_id).write_text(json.dumps(metadata, indent=2))


def save_model(student_id: str, model, metadata: dict) -> dict:
    version = f"v{utc_stamp()}"
    directory = student_dir(student_id)
    versioned_path = directory / f"{version}.pkl"
    joblib.dump(model, versioned_path)
    shutil.copy2(versioned_path, current_model_path(student_id))

    metadata.update(
        {
            "studentId": student_id,
            "modelVersion": version,
            "modelFilePath": str(current_model_path(student_id)),
            "trainedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "status": "ready",
        }
    )
    metadata["versions"] = [
        {
            "modelVersion": version,
            "accuracy": metadata.get("accuracy", 0),
            "f1Score": metadata.get("f1Score", 0),
            "modelFilePath": str(versioned_path),
            "trainedAt": metadata["trainedAt"],
        },
        *metadata.get("versions", []),
    ][:KEEP_MODEL_VERSIONS]
    save_metadata(student_id, metadata)
    return metadata


def bootstrap_student(student_id: str) -> dict:
    if not BASE_MODEL_PATH.exists():
        raise FileNotFoundError("Global base model is not trained yet")
    shutil.copy2(BASE_MODEL_PATH, current_model_path(student_id))
    metadata = load_metadata(student_id)
    metadata.update(
        {
            "modelVersion": "global-base",
            "modelFilePath": str(current_model_path(student_id)),
            "status": "ready",
            "trainedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        }
    )
    save_metadata(student_id, metadata)
    return metadata


def load_student_model(student_id: str):
    path = current_model_path(student_id)
    if not path.exists():
        bootstrap_student(student_id)
    return joblib.load(current_model_path(student_id))
