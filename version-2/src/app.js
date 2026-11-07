// src/app.js
// Express application configuration and route registration

import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "./config.js";

// API Routers
import dashboardRouter from "./api/dashboard.js";
import routesRouter from "./api/routes.js";
import stopsRouter from "./api/stops.js";
import analyticsRouter from "./api/analytics.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicPath = path.resolve(__dirname, "..", "public");

const app = express();

// Middleware: JSON body parsing
app.use(express.json());

// Serve static frontend assets
app.use(express.static(publicPath));

// Health check endpoint (preserved from Stage 1)
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    name: config.appName,
    version: config.version,
    environment: config.nodeEnv,
    timestamp: new Date().toISOString(),
  });
});

// Register Stage 4 REST API routers
app.use("/api/dashboard", dashboardRouter);
app.use("/api/routes", routesRouter);
app.use("/api/stops", stopsRouter);
app.use("/api/analytics", analyticsRouter);

// 404 handler for unmatched API routes
app.use("/api", (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: "NOT_FOUND",
      message: `API endpoint '${req.method} ${req.originalUrl}' does not exist.`,
    },
  });
});

// Centralized error handling middleware
app.use((err, req, res, next) => {
  console.error("[Application Error]", err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    success: false,
    error: {
      code: err.code || err.name || "INTERNAL_SERVER_ERROR",
      message: err.message || "An unexpected error occurred.",
    },
  });
});

export default app;
