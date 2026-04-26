import { School } from "../models/index.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { writeAudit } from "../services/auditService.js";

export const createSchool = asyncHandler(async (req, res) => {
  const school = await School.create(req.body);
  await writeAudit({ req, action: "school.create", resourceType: "School", resourceId: school._id.toString() });
  res.status(201).json({ school });
});

export const listSchools = asyncHandler(async (req, res) => {
  const schools = await School.find().sort({ schoolName: 1 });
  res.json({ schools });
});
