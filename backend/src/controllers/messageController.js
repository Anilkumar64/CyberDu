import { Message, MLModel, Student } from "../models/index.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { predictForStudent } from "../services/mlClient.js";
import { applyEscalationRules } from "../services/escalationService.js";
import { ensureStudentModel, maybeRetrainStudentModel } from "../services/modelLifecycleService.js";
import { writeAudit } from "../services/auditService.js";

async function getScopedStudent(req, studentId) {
  const query = { _id: studentId };
  if (req.user.role === "teacher") query.assignedTeacherId = req.user._id;
  if (req.user.role === "admin") query.schoolId = req.user.schoolId;
  return Student.findOne(query);
}

export const createMessage = asyncHandler(async (req, res) => {
  const { studentId, messageText, platform = "chat" } = req.body;
  const student = await getScopedStudent(req, studentId);
  if (!student) return res.status(404).json({ error: "Student not found" });

  const mlModel = await ensureStudentModel(student);
  const prediction = await predictForStudent({ studentId: student._id.toString(), text: messageText });
  const message = await Message.create({
    messageText,
    studentId: student._id,
    teacherId: req.user._id,
    prediction: {
      label: prediction.label,
      riskScore: prediction.riskScore,
      confidence: prediction.confidence,
      severity: prediction.severity
    },
    flaggedWords: prediction.flaggedWords || [],
    mlModelVersion: mlModel.modelVersion,
    platform
  });

  student.totalMessages += 1;
  if (prediction.label === 1) student.flaggedCount += 1;
  if (prediction.severity === "HIGH" || prediction.severity === "CRITICAL") student.riskProfile = "high";
  await student.save();

  req.app.get("io")?.to(`teacher:${req.user._id}`).emit("message-flagged", message);
  await applyEscalationRules({ message, actor: req.user, io: req.app.get("io") });
  await writeAudit({ req, action: "message.predict", resourceType: "Message", resourceId: message._id.toString() });
  res.status(201).json({ message });
});

export const listMessages = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.studentId) filter.studentId = req.query.studentId;
  if (req.query.severity) filter["prediction.severity"] = req.query.severity;

  if (req.user.role === "teacher") filter.teacherId = req.user._id;
  if (req.user.role === "admin") {
    const students = await Student.find({ schoolId: req.user.schoolId }).select("_id");
    filter.studentId = { $in: students.map((student) => student._id) };
  }

  const messages = await Message.find(filter)
    .populate("studentId", "name grade section")
    .sort({ createdAt: -1 })
    .limit(200);
  res.json({ messages });
});

export const labelMessage = asyncHandler(async (req, res) => {
  if (![0, 1].includes(Number(req.body.manualLabel))) {
    return res.status(400).json({ error: "manualLabel must be 0 or 1" });
  }

  const query = { _id: req.params.id };
  if (req.user.role === "teacher") query.teacherId = req.user._id;
  const message = await Message.findOne(query);
  if (!message) return res.status(404).json({ error: "Message not found" });
  if (req.user.role === "admin") {
    const student = await Student.findOne({ _id: message.studentId, schoolId: req.user.schoolId });
    if (!student) return res.status(404).json({ error: "Message not found" });
  }

  message.manualLabel = Number(req.body.manualLabel);
  message.labeledBy = req.user._id;
  message.labeledAt = new Date();
  await message.save();

  await MLModel.findOneAndUpdate({ studentId: message.studentId }, { $inc: { newLabelsSinceTraining: 1 } });
  await maybeRetrainStudentModel({ studentId: message.studentId, io: req.app.get("io") });
  await writeAudit({ req, action: "message.label", resourceType: "Message", resourceId: message._id.toString() });
  res.json({ message });
});
