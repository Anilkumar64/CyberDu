from fastapi import FastAPI, HTTPException

from .model_store import bootstrap_student, load_metadata
from .predict import predict
from .schemas import PredictRequest, RetrainRequest
from .train import ensure_base_model, retrain_student

app = FastAPI(title="CyberGuard ML Service", version="1.0.0")


@app.on_event("startup")
def startup() -> None:
    ensure_base_model()


@app.get("/health")
def health():
    return {"ok": True, "service": "cyberguard-ml-service"}


@app.post("/students/{student_id}/bootstrap")
def bootstrap(student_id: str):
    try:
        return bootstrap_student(student_id)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.get("/students/{student_id}/model")
def model_metadata(student_id: str):
    return load_metadata(student_id)


@app.post("/predict")
def predict_route(payload: PredictRequest):
    try:
        return predict(payload.studentId, payload.text)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/students/{student_id}/retrain")
def retrain_route(student_id: str, payload: RetrainRequest):
    try:
        samples = [sample.model_dump() for sample in payload.samples]
        return retrain_student(student_id, samples)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
