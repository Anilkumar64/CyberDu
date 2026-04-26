import { School, Student, User } from "../models/index.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { writeAudit } from "../services/auditService.js";

function studentScope(req) {
  if (req.user.role === "teacher") return { assignedTeacherId: req.user._id };
  if (req.user.role === "admin") return { schoolId: req.user.schoolId };
  return {};
}

export const createStudent = asyncHandler(async (req, res) => {
  let schoolId = req.body.schoolId || req.user.schoolId;
  if (!schoolId) {
    const school = await School.findOneAndUpdate(
      { schoolCode: "DEMO" },
      { $setOnInsert: { schoolName: "Demo School", schoolCode: "DEMO", city: "Local" } },
      { new: true, upsert: true }
    );
    schoolId = school._id;
    await User.findByIdAndUpdate(req.user._id, { schoolId });
  }

  const student = await Student.create({
    ...req.body,
    assignedTeacherId: req.body.assignedTeacherId || req.user._id,
    schoolId
  });
  await writeAudit({ req, action: "student.create", resourceType: "Student", resourceId: student._id.toString() });
  res.status(201).json({ student });
});

export const listStudents = asyncHandler(async (req, res) => {
  const students = await Student.find(studentScope(req)).sort({ riskProfile: 1, name: 1 });
  res.json({ students });
});

export const getStudent = asyncHandler(async (req, res) => {
  const student = await Student.findOne({ _id: req.params.id, ...studentScope(req) }).populate("modelId");
  if (!student) return res.status(404).json({ error: "Student not found" });
  res.json({ student });
});

export const updateStudent = asyncHandler(async (req, res) => {
  const student = await Student.findOneAndUpdate(
    { _id: req.params.id, ...studentScope(req) },
    req.body,
    { new: true, runValidators: true }
  );
  if (!student) return res.status(404).json({ error: "Student not found" });
  await writeAudit({ req, action: "student.update", resourceType: "Student", resourceId: student._id.toString() });
  res.json({ student });
});
