import numpy as np

from .model_store import load_metadata, load_student_model, save_metadata
from .text_processing import clean_text, flagged_words


def severity_from_risk(risk_score: float) -> str:
    if risk_score >= 0.9:
        return "CRITICAL"
    if risk_score >= 0.75:
        return "HIGH"
    if risk_score >= 0.45:
        return "MEDIUM"
    if risk_score >= 0.20:
        return "LOW"
    return "NONE"


def predict(student_id: str, text: str) -> dict:
    model = load_student_model(student_id)
    cleaned = clean_text(text)
    proba = model.predict_proba([cleaned])[0]
    label = int(np.argmax(proba))
    confidence = float(np.max(proba))
    risk_score = float(proba[1])
    metadata = load_metadata(student_id)
    metadata["confidenceHistory"] = [*metadata.get("confidenceHistory", []), confidence][-100:]
    metadata["confidenceDriftScore"] = round(1 - (sum(metadata["confidenceHistory"]) / len(metadata["confidenceHistory"])), 4)
    save_metadata(student_id, metadata)
    return {
        "label": label,
        "riskScore": round(risk_score, 4),
        "confidence": round(confidence, 4),
        "severity": severity_from_risk(risk_score),
        "flaggedWords": flagged_words(text),
        "modelVersion": metadata.get("modelVersion", "global-base"),
        "confidenceDriftScore": metadata["confidenceDriftScore"],
    }
