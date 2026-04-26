import { Router } from "express";
import { createSchool, listSchools } from "../controllers/schoolController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const schoolRoutes = Router();

schoolRoutes.use(requireAuth, requireRole("superadmin"));
schoolRoutes.get("/", listSchools);
schoolRoutes.post("/", createSchool);
