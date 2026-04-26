import { Router } from "express";
import { adminRoutes } from "./adminRoutes.js";
import { authRoutes } from "./authRoutes.js";
import { messageRoutes } from "./messageRoutes.js";
import { schoolRoutes } from "./schoolRoutes.js";
import { studentRoutes } from "./studentRoutes.js";

export const routes = Router();

routes.get("/health", (req, res) => res.json({ ok: true, service: "cyberguard-backend" }));
routes.use("/auth", authRoutes);
routes.use("/students", studentRoutes);
routes.use("/messages", messageRoutes);
routes.use("/admin", adminRoutes);
routes.use("/schools", schoolRoutes);
