import { Router } from "express";
import { createStudent, getStudent, listStudents, updateStudent } from "../controllers/studentController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const studentRoutes = Router();

studentRoutes.use(requireAuth);
studentRoutes.get("/", listStudents);
studentRoutes.post("/", requireRole("teacher", "admin", "superadmin"), createStudent);
studentRoutes.get("/:id", getStudent);
studentRoutes.patch("/:id", requireRole("teacher", "admin", "superadmin"), updateStudent);
