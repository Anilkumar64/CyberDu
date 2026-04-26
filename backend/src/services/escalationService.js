import { Message, Student } from "../models/index.js";

export async function applyEscalationRules({ message, actor, io }) {
  const riskScore = message.prediction.riskScore;
  const severity = message.prediction.severity;

  let shouldEscalate = riskScore >= 0.85 || severity === "CRITICAL";
  let reason = riskScore >= 0.85 ? "Risk score exceeded 0.85" : "";

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentFlagCount = await Message.countDocuments({
    studentId: message.studentId,
    createdAt: { $gte: since },
    "prediction.severity": { $in: ["HIGH", "CRITICAL"] }
  });

  if (recentFlagCount >= 3) {
    shouldEscalate = true;
    reason = "Student flagged 3 or more times in 24 hours";
  }

  if (!shouldEscalate) return message;

  message.isEscalated = true;
  message.escalationReason = reason || "Critical severity detected";
  await message.save();

  await Student.findByIdAndUpdate(message.studentId, { riskProfile: "critical" });
  if (actor?.schoolId) io?.to(`school:${actor.schoolId}`).emit("critical-alert", message);
  io?.to(`teacher:${message.teacherId}`).emit("critical-alert", message);

  return message;
}
