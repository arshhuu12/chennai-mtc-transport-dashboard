// src/config.js
// Centralized configuration management for Version 2

import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const config = {
  appName: "chennai-mtc-dashboard-v2",
  appTitle: "Chennai MTC Public Transport Analytics Dashboard",
  version: "2.0.0",
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || "development",
  dataDir: process.env.DATA_DIR || path.resolve(__dirname, "..", "data"),
};

export default config;
