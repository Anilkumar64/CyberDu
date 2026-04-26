import mongoose from "mongoose";

const schoolSchema = new mongoose.Schema(
  {
    schoolName: { type: String, required: true, trim: true },
    schoolCode: { type: String, required: true, unique: true, uppercase: true, trim: true },
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    district: String,
    city: String,
    subscription: { type: String, enum: ["free", "pro", "enterprise"], default: "free" },
    maxStudents: { type: Number, default: 100 },
    features: [{ type: String }]
  },
  { timestamps: true }
);

export const School = mongoose.model("School", schoolSchema);
