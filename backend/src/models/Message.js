import mongoose from "mongoose";

const predictionSchema = new mongoose.Schema(
  {
    label: { type: Number, enum: [0, 1], required: true },
    riskScore: { type: Number, required: true },
    confidence: { type: Number, required: true },
    severity: { type: String, enum: ["NONE", "LOW", "MEDIUM", "HIGH", "CRITICAL"], required: true }
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    messageText: { type: String, required: true, trim: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    prediction: { type: predictionSchema, required: true },
    flaggedWords: [{ type: String }],
    mlModelVersion: { type: String, required: true },
    manualLabel: { type: Number, enum: [0, 1], default: null },
    labeledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    labeledAt: Date,
    isEscalated: { type: Boolean, default: false },
    escalationReason: String,
    platform: { type: String, enum: ["sms", "email", "chat"], default: "chat" }
  },
  { timestamps: true }
);

messageSchema.index({ studentId: 1, createdAt: -1 });
messageSchema.index({ "prediction.severity": 1, isEscalated: 1 });

export const Message = mongoose.model("Message", messageSchema);
