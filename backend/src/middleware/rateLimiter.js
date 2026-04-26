import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";

const isDevelopment = env.nodeEnv !== "production";

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isDevelopment ? 2000 : 300,
  standardHeaders: true,
  legacyHeaders: false
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isDevelopment ? 500 : 20,
  standardHeaders: true,
  legacyHeaders: false
});
