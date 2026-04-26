import dotenv from "dotenv";

dotenv.config();

const frontendOrigins = (
  process.env.FRONTEND_ORIGIN || "http://127.0.0.1:5173,http://localhost:5173,http://127.0.0.1:5174,http://localhost:5174"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 8080),
  mongoUri: process.env.MONGO_URI || "mongodb://127.0.0.1:27017/cyberguard",
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || "dev-access-secret",
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || "dev-refresh-secret",
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL || "15m",
  refreshTokenTtl: process.env.REFRESH_TOKEN_TTL || "7d",
  frontendOrigin: frontendOrigins,
  mlServiceUrl: process.env.ML_SERVICE_URL || "http://127.0.0.1:7000"
};
