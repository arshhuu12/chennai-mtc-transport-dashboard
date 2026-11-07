// src/data.js
// In-memory CSV data integration and lifecycle management for Version 2

import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { config } from "./config.js";
import { validateHeaders, validateDatasets } from "./validation.js";
import { createOperationalRecords } from "./metrics.js";

const CSV_FILES = {
  routes: "routes.csv",
  stops: "stops.csv",
  buses: "buses.csv",
  trips: "trips.csv",
  tripStops: "trip_stops.csv",
  stopObservations: "stop_observations.csv",
};

// In-memory cache
let inMemoryData = null;
let operationalRecords = null;
let dataSummary = null;

/**
 * Parses raw CSV content with strict column and empty line handling.
 * @param {string} filePath
 * @param {string} datasetKey
 * @returns {Array<Object>}
 */
function readAndParseCSV(filePath, datasetKey) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Dataset file not found: ${filePath}`);
  }

  const fileContent = fs.readFileSync(filePath, "utf8");
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  if (!records.length) {
    throw new Error(`Dataset '${datasetKey}' in ${filePath} is empty.`);
  }

  const headers = Object.keys(records[0]);
  const headerErrors = validateHeaders(
    datasetKey === "tripStops"
      ? "trip_stops"
      : datasetKey === "stopObservations"
        ? "stop_observations"
        : datasetKey,
    headers,
  );

  if (headerErrors.length > 0) {
    throw new Error(headerErrors.join("; "));
  }

  return records;
}

/**
 * Transforms raw string records into typed JavaScript records.
 */
function transformDatasets(raw) {
  const routes = raw.routes.map((row) => ({
    route_id: String(row.route_id).trim(),
    route_name: String(row.route_name).trim(),
    origin: row.origin ? String(row.origin).trim() : "",
    destination: row.destination ? String(row.destination).trim() : "",
  }));

  const stops = raw.stops.map((row) => ({
    stop_id: String(row.stop_id).trim(),
    stop_name: String(row.stop_name).trim(),
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
  }));

  const buses = raw.buses.map((row) => ({
    bus_id: String(row.bus_id).trim(),
    capacity: Number(row.capacity),
  }));

  const trips = raw.trips.map((row) => ({
    trip_id: String(row.trip_id).trim(),
    route_id: String(row.route_id).trim(),
    bus_id: String(row.bus_id).trim(),
    service_date: String(row.service_date).trim(),
  }));

  const tripStops = raw.tripStops.map((row) => {
    const scheduledArrival = String(row.scheduled_arrival).trim();
    const scheduledDeparture = row.scheduled_departure
      ? String(row.scheduled_departure).trim()
      : null;

    return {
      trip_id: String(row.trip_id).trim(),
      stop_sequence: Number(row.stop_sequence),
      stop_id: String(row.stop_id).trim(),
      scheduled_arrival: scheduledArrival,
      scheduled_arrival_time: new Date(scheduledArrival),
      scheduled_departure: scheduledDeparture,
      scheduled_departure_time: scheduledDeparture
        ? new Date(scheduledDeparture)
        : null,
    };
  });

  const stopObservations = raw.stopObservations.map((row) => {
    const actualArrival = String(row.actual_arrival).trim();

    return {
      trip_id: String(row.trip_id).trim(),
      stop_sequence: Number(row.stop_sequence),
      actual_arrival: actualArrival,
      actual_arrival_time: new Date(actualArrival),
      boarding: Number(row.boarding),
      alighting: Number(row.alighting),
    };
  });

  return {
    routes,
    stops,
    buses,
    trips,
    tripStops,
    stopObservations,
  };
}

/**
 * Loads all six CSV files from disk, validates their contents,
 * and caches the structured datasets and unified operational records in memory.
 *
 * @param {string} [customDataDir] - Optional directory path override
 * @returns {Object} Structured in-memory datasets
 */
export function loadDatasets(customDataDir) {
  const targetDir = customDataDir || config.dataDir;

  const raw = {
    routes: readAndParseCSV(path.join(targetDir, CSV_FILES.routes), "routes"),
    stops: readAndParseCSV(path.join(targetDir, CSV_FILES.stops), "stops"),
    buses: readAndParseCSV(path.join(targetDir, CSV_FILES.buses), "buses"),
    trips: readAndParseCSV(path.join(targetDir, CSV_FILES.trips), "trips"),
    tripStops: readAndParseCSV(
      path.join(targetDir, CSV_FILES.tripStops),
      "tripStops",
    ),
    stopObservations: readAndParseCSV(
      path.join(targetDir, CSV_FILES.stopObservations),
      "stopObservations",
    ),
  };

  const parsed = transformDatasets(raw);
  const validation = validateDatasets(parsed);

  if (!validation.isValid) {
    const errSummary = validation.errors.slice(0, 5).join(" | ");
    throw new Error(
      `Dataset validation failed with ${validation.errors.length} error(s): ${errSummary}`,
    );
  }

  inMemoryData = parsed;
  operationalRecords = createOperationalRecords(parsed);

  dataSummary = {
    routesCount: parsed.routes.length,
    stopsCount: parsed.stops.length,
    busesCount: parsed.buses.length,
    tripsCount: parsed.trips.length,
    tripStopsCount: parsed.tripStops.length,
    observationsCount: parsed.stopObservations.length,
    validationStatus: validation.summary.status,
    loadedAt: new Date().toISOString(),
  };

  return inMemoryData;
}

/**
 * Returns the currently cached in-memory dataset.
 * Throws if loadDatasets() has not been executed.
 * @returns {Object}
 */
export function getData() {
  if (!inMemoryData) {
    throw new Error(
      "Datasets have not been loaded into memory. Call loadDatasets() first.",
    );
  }
  return inMemoryData;
}

/**
 * Returns pre-joined, validated operational records.
 * Throws if loadDatasets() has not been executed.
 * @returns {Array<Object>}
 */
export function getOperationalRecords() {
  if (!operationalRecords) {
    if (inMemoryData) {
      operationalRecords = createOperationalRecords(inMemoryData);
    } else {
      throw new Error(
        "Datasets have not been loaded into memory. Call loadDatasets() first.",
      );
    }
  }
  return operationalRecords;
}

/**
 * Returns summary statistics and validation status for loaded data.
 * @returns {Object|null}
 */
export function getDataSummary() {
  return dataSummary;
}

/**
 * Resets the in-memory cache (primarily used in testing).
 */
export function resetData() {
  inMemoryData = null;
  operationalRecords = null;
  dataSummary = null;
}

export default {
  loadDatasets,
  getData,
  getOperationalRecords,
  getDataSummary,
  resetData,
};
