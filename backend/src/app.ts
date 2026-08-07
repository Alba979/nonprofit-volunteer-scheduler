import "express-async-errors";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { config } from "./config";
import { notFoundHandler, errorHandler } from "./middleware/errorHandler";

import authRoutes from "./routes/auth.routes";
import volunteerRoutes from "./routes/volunteer.routes";
import shiftRoutes from "./routes/shift.routes";
import backgroundCheckRoutes from "./routes/backgroundCheck.routes";
import reportRoutes from "./routes/report.routes";
import programAreaRoutes from "./routes/programArea.routes";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: config.clientOrigin, credentials: true }));
  app.use(express.json());
  app.use(morgan(config.nodeEnv === "development" ? "dev" : "combined"));

  app.get("/health", (_req, res) => res.json({ status: "ok", timestamp: new Date().toISOString() }));

  app.use("/api/auth", authRoutes);
  app.use("/api/volunteers", volunteerRoutes);
  app.use("/api/shifts", shiftRoutes);
  app.use("/api/background-checks", backgroundCheckRoutes);
  app.use("/api/reports", reportRoutes);
  app.use("/api/program-areas", programAreaRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
