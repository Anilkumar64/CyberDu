import { Router } from "express";
import { createMessage, labelMessage, listMessages } from "../controllers/messageController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const messageRoutes = Router();

messageRoutes.use(requireAuth);
messageRoutes.get("/", listMessages);
messageRoutes.post("/", requireRole("teacher", "admin", "superadmin"), createMessage);
messageRoutes.patch("/:id/label", requireRole("teacher", "admin", "superadmin"), labelMessage);
