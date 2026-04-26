import compression from "compression";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import { apiLimiter } from "./middleware/rateLimiter.js";
import { sanitizeInput } from "./middleware/sanitize.js";
import { routes } from "./routes/index.js";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.frontendOrigin,
      credentials: true
    })
  );
  app.use(compression());
  app.use(express.json({ limit: "1mb" }));
  app.use(sanitizeInput);
  app.use(apiLimiter);
  app.use(morgan(env.nodeEnv === "production" ? "combined" : "dev"));

  app.use("/api", routes);
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
