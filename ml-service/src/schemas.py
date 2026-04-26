from pydantic import BaseModel, Field


class PredictRequest(BaseModel):
    studentId: str
    text: str = Field(min_length=1, max_length=5000)


class TrainingSample(BaseModel):
    text: str = Field(min_length=1, max_length=5000)
    label: int = Field(ge=0, le=1)


class RetrainRequest(BaseModel):
    samples: list[TrainingSample]
