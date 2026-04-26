import { User } from "../models/index.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/tokens.js";
import { writeAudit } from "../services/auditService.js";

function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    schoolId: user.schoolId,
    isVerified: user.isVerified
  };
}

export const signup = asyncHandler(async (req, res) => {
  const existingUser = await User.findOne({ email: req.body.email });
  if (existingUser) return res.status(409).json({ error: "An account with this email already exists" });

  const user = await User.create(req.body);
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  user.refreshToken = refreshToken;
  user.tokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await user.save();
  await writeAudit({ req, action: "auth.signup", resourceType: "User", resourceId: user._id.toString() });
  res.status(201).json({ user: publicUser(user), accessToken, refreshToken });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select("+password +refreshToken");
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ error: "Invalid email or password" });
  }
  if (!user.isActive) return res.status(403).json({ error: "Account disabled" });

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  user.refreshToken = refreshToken;
  user.lastLogin = new Date();
  user.tokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await user.save();
  await writeAudit({ req, action: "auth.login", resourceType: "User", resourceId: user._id.toString() });
  res.json({ user: publicUser(user), accessToken, refreshToken });
});

export const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  const payload = verifyRefreshToken(refreshToken);
  const user = await User.findById(payload.sub).select("+refreshToken");
  if (!user || user.refreshToken !== refreshToken) {
    return res.status(401).json({ error: "Invalid refresh token" });
  }

  const accessToken = signAccessToken(user);
  const rotatedRefreshToken = signRefreshToken(user);
  user.refreshToken = rotatedRefreshToken;
  user.tokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await user.save();
  res.json({ accessToken, refreshToken: rotatedRefreshToken });
});

export const logout = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { refreshToken: null, tokenExpiry: null });
  await writeAudit({ req, action: "auth.logout", resourceType: "User", resourceId: req.user._id.toString() });
  res.json({ ok: true });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ user: publicUser(req.user) });
});
