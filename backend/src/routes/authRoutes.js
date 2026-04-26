import { Router } from "express";
import { login, logout, me, refresh, signup } from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.js";
import { authLimiter } from "../middleware/rateLimiter.js";

export const authRoutes = Router();

authRoutes.post("/signup", authLimiter, signup);
authRoutes.post("/login", authLimiter, login);
authRoutes.post("/refresh", authLimiter, refresh);
authRoutes.post("/logout", requireAuth, logout);
authRoutes.get("/me", requireAuth, me);
