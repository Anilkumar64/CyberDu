import mongoose from "mongoose";

const versionSchema = new mongoose.Schema(
  {
    modelVersion: String,
    accuracy: Number,
    f1Score: Number,
    modelFilePath: String,
    trainedAt: Date
  },
  { _id: false }
);

const mlModelSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true, unique: true },
    modelVersion: { type: String, default: "v1" },
    accuracy: { type: Number, default: 0 },
    f1Score: { type: Number, default: 0 },
    trainedAt: Date,
    trainingDataCount: { type: Number, default: 0 },
    modelFilePath: String,
    status: { type: String, enum: ["untrained", "training", "ready", "degraded"], default: "untrained" },
    versions: [versionSchema],
    newLabelsSinceTraining: { type: Number, default: 0 },
    confidenceDriftScore: { type: Number, default: 0 }
  },
  { timestamps: true }
);

export const MLModel = mongoose.model("MLModel", mlModelSchema);
