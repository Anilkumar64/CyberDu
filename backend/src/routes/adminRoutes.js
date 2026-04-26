import { Router } from "express";
import { bulkRetrain, schoolOverview } from "../controllers/adminController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const adminRoutes = Router();

adminRoutes.use(requireAuth, requireRole("admin", "superadmin"));
adminRoutes.get("/overview", schoolOverview);
adminRoutes.post("/bulk-retrain", bulkRetrain);
