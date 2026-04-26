import { User } from "../models/index.js";
import { verifyAccessToken } from "../utils/tokens.js";

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: "Missing access token" });

    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.sub).select("-password -refreshToken");
    if (!user || !user.isActive) return res.status(401).json({ error: "Invalid user" });

    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired access token" });
  }
}

export function requireRole(...roles) {
  return function roleGuard(req, res, next) {
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: "Forbidden" });
    next();
  };
}
