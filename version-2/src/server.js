// src/server.js
// HTTP server entry point

import app from "./app.js";
import { config } from "./config.js";
import { loadDatasets, getDataSummary } from "./data.js";

// Ensure datasets are loaded and validated before starting the HTTP server
try {
  console.log(`Loading and validating CSV datasets from ${config.dataDir}...`);
  loadDatasets();
  const summary = getDataSummary();
  console.log(
    `Dataset validation ${summary.validationStatus}: ` +
      `${summary.routesCount} routes, ${summary.stopsCount} stops, ` +
      `${summary.busesCount} buses, ${summary.tripsCount} trips, ` +
      `${summary.tripStopsCount} trip_stops, ${summary.observationsCount} observations.`,
  );
} catch (error) {
  console.error("[Startup Error] Failed to load or validate datasets:", error.message);
  process.exit(1);
}

const server = app.listen(config.port, () => {
  console.log(`Server started successfully: ${config.appName} v${config.version}`);
  console.log(`Local address: http://localhost:${config.port}`);
  console.log(`Health check: http://localhost:${config.port}/api/health`);
  console.log(`Environment: ${config.nodeEnv}`);
});

export default server;
