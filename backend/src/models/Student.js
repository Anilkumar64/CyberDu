import mongoose from "mongoose";

const studentSchema = new mongoose.Schema(
  {
    studentId: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    grade: { type: String, required: true },
    section: { type: String, required: true },
    assignedTeacherId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true },
    modelId: { type: mongoose.Schema.Types.ObjectId, ref: "MLModel" },
    riskProfile: { type: String, enum: ["low", "medium", "high", "critical"], default: "low" },
    totalMessages: { type: Number, default: 0 },
    flaggedCount: { type: Number, default: 0 },
    parentContact: String,
    guardianEmail: String
  },
  { timestamps: true }
);

studentSchema.index({ schoolId: 1, assignedTeacherId: 1 });
studentSchema.index({ grade: 1, section: 1, riskProfile: 1 });

export const Student = mongoose.model("Student", studentSchema);
