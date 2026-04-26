import { Message, MLModel, Student } from "../models/index.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { maybeRetrainStudentModel } from "../services/modelLifecycleService.js";

export const schoolOverview = asyncHandler(async (req, res) => {
  const schoolFilter = req.user.role === "superadmin" ? {} : { schoolId: req.user.schoolId };
  if (req.user.role === "admin" && !req.user.schoolId) {
    return res.json({ students: 0, criticalMessages: 0, models: [], riskByGrade: [] });
  }
  const scopedStudentIds = await Student.find(schoolFilter).select("_id");
  const studentIdFilter = { studentId: { $in: scopedStudentIds.map((student) => student._id) } };
  const [students, criticalMessages, models] = await Promise.all([
    Promise.resolve(scopedStudentIds.length),
    Message.countDocuments({
      ...studentIdFilter,
      "prediction.severity": { $in: ["HIGH", "CRITICAL"] },
      isEscalated: true
    }),
    MLModel.find(studentIdFilter).sort({ trainedAt: -1 }).limit(20)
  ]);

  const riskByGrade = await Student.aggregate([
    { $match: schoolFilter },
    { $group: { _id: { grade: "$grade", section: "$section", risk: "$riskProfile" }, count: { $sum: 1 } } },
    { $sort: { "_id.grade": 1, "_id.section": 1 } }
  ]);

  res.json({ students, criticalMessages, models, riskByGrade });
});

export const bulkRetrain = asyncHandler(async (req, res) => {
  const schoolFilter = req.user.role === "superadmin" ? {} : { schoolId: req.user.schoolId };
  if (req.user.role === "admin" && !req.user.schoolId) {
    return res.json({ retrainChecked: 0 });
  }
  const students = await Student.find(schoolFilter).select("_id");
  for (const student of students) {
    await maybeRetrainStudentModel({ studentId: student._id, io: req.app.get("io") });
  }
  res.json({ retrainChecked: students.length });
});
