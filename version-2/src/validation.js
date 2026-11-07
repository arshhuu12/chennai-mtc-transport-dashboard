// src/validation.js
// Data integrity and relational validation engine for Version 2

export const REQUIRED_HEADERS = {
  routes: ["route_id", "route_name"],
  stops: ["stop_id", "stop_name", "latitude", "longitude"],
  buses: ["bus_id", "capacity"],
  trips: ["trip_id", "route_id", "bus_id", "service_date"],
  trip_stops: ["trip_id", "stop_sequence", "stop_id", "scheduled_arrival"],
  stop_observations: [
    "trip_id",
    "stop_sequence",
    "actual_arrival",
    "boarding",
    "alighting",
  ],
};

/**
 * Validates that all required column headers are present in a parsed dataset.
 * @param {string} datasetKey - The dataset identifier (e.g. 'routes')
 * @param {string[]} actualHeaders - Headers found in the CSV
 * @returns {string[]} Array of missing header error messages
 */
export function validateHeaders(datasetKey, actualHeaders) {
  const required = REQUIRED_HEADERS[datasetKey] || [];
  const missing = required.filter((col) => !actualHeaders.includes(col));
  if (missing.length > 0) {
    return [
      `Dataset '${datasetKey}' is missing required column(s): ${missing.join(", ")}`,
    ];
  }
  return [];
}

/**
 * Checks if a date string is a strictly valid YYYY-MM-DD calendar date.
 * @param {string} value
 * @returns {boolean}
 */
export function isValidDateString(value) {
  if (!value || typeof value !== "string") return false;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/**
 * Checks if a timestamp string can be parsed into a valid Date.
 * @param {string} value
 * @returns {boolean}
 */
export function isValidTimestamp(value) {
  if (!value || typeof value !== "string" || !value.trim()) return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime());
}

/**
 * Validates all six loaded datasets in memory for schema compliance,
 * primary key uniqueness, foreign key consistency, and integrity constraints.
 *
 * @param {Object} data - Object containing routes, stops, buses, trips, tripStops, stopObservations arrays
 * @returns {{ isValid: boolean, errors: string[], warnings: string[], summary: Object }}
 */
export function validateDatasets(data) {
  const errors = [];
  const warnings = [];

  const routes = data.routes || [];
  const stops = data.stops || [];
  const buses = data.buses || [];
  const trips = data.trips || [];
  const tripStops = data.tripStops || [];
  const stopObservations = data.stopObservations || [];

  // 1. Primary-key uniqueness sets
  const routeIds = new Set();
  const stopIds = new Set();
  const busIds = new Set();
  const tripIds = new Set();
  const scheduleKeys = new Set();
  const observationKeys = new Set();

  // Validate Routes
  for (const r of routes) {
    if (!r.route_id || !String(r.route_id).trim()) {
      errors.push("Route record has missing or empty route_id.");
      continue;
    }
    if (routeIds.has(r.route_id)) {
      errors.push(`Duplicate route_id detected: '${r.route_id}'.`);
    } else {
      routeIds.add(r.route_id);
    }
    if (!r.route_name || !String(r.route_name).trim()) {
      errors.push(`Route '${r.route_id}' has missing or empty route_name.`);
    }
  }

  // Validate Stops
  for (const s of stops) {
    if (!s.stop_id || !String(s.stop_id).trim()) {
      errors.push("Stop record has missing or empty stop_id.");
      continue;
    }
    if (stopIds.has(s.stop_id)) {
      errors.push(`Duplicate stop_id detected: '${s.stop_id}'.`);
    } else {
      stopIds.add(s.stop_id);
    }
    if (!s.stop_name || !String(s.stop_name).trim()) {
      errors.push(`Stop '${s.stop_id}' has missing or empty stop_name.`);
    }
    if (!Number.isFinite(s.latitude)) {
      errors.push(`Stop '${s.stop_id}' has invalid latitude: '${s.latitude}'.`);
    }
    if (!Number.isFinite(s.longitude)) {
      errors.push(
        `Stop '${s.stop_id}' has invalid longitude: '${s.longitude}'.`,
      );
    }
  }

  // Validate Buses
  for (const b of buses) {
    if (!b.bus_id || !String(b.bus_id).trim()) {
      errors.push("Bus record has missing or empty bus_id.");
      continue;
    }
    if (busIds.has(b.bus_id)) {
      errors.push(`Duplicate bus_id detected: '${b.bus_id}'.`);
    } else {
      busIds.add(b.bus_id);
    }
    if (!Number.isInteger(b.capacity) || b.capacity <= 0) {
      errors.push(
        `Bus '${b.bus_id}' has invalid capacity: '${b.capacity}'. Capacity must be a positive integer.`,
      );
    }
  }

  // Validate Trips (Primary key + Foreign keys to routes and buses)
  for (const t of trips) {
    if (!t.trip_id || !String(t.trip_id).trim()) {
      errors.push("Trip record has missing or empty trip_id.");
      continue;
    }
    if (tripIds.has(t.trip_id)) {
      errors.push(`Duplicate trip_id detected: '${t.trip_id}'.`);
    } else {
      tripIds.add(t.trip_id);
    }

    if (!routeIds.has(t.route_id)) {
      errors.push(
        `Trip '${t.trip_id}' references unknown route_id: '${t.route_id}'.`,
      );
    }
    if (!busIds.has(t.bus_id)) {
      errors.push(
        `Trip '${t.trip_id}' references unknown bus_id: '${t.bus_id}'.`,
      );
    }
    if (!isValidDateString(t.service_date)) {
      errors.push(
        `Trip '${t.trip_id}' has invalid service_date: '${t.service_date}'. Expected format YYYY-MM-DD.`,
      );
    }
  }

  // Validate Trip Stops (Primary key composite + Foreign keys to trips and stops)
  for (const ts of tripStops) {
    if (!ts.trip_id || !String(ts.trip_id).trim()) {
      errors.push("Trip-stop record has missing or empty trip_id.");
      continue;
    }
    if (!Number.isInteger(ts.stop_sequence) || ts.stop_sequence <= 0) {
      errors.push(
        `Trip '${ts.trip_id}' has invalid stop_sequence: '${ts.stop_sequence}'. Must be positive integer.`,
      );
    }

    const key = `${ts.trip_id}_${ts.stop_sequence}`;
    if (scheduleKeys.has(key)) {
      errors.push(`Duplicate trip_stops primary key detected: '${key}'.`);
    } else {
      scheduleKeys.add(key);
    }

    if (!tripIds.has(ts.trip_id)) {
      errors.push(
        `Trip-stop '${key}' references unknown trip_id: '${ts.trip_id}'.`,
      );
    }
    if (!stopIds.has(ts.stop_id)) {
      errors.push(
        `Trip-stop '${key}' references unknown stop_id: '${ts.stop_id}'.`,
      );
    }
    if (!isValidTimestamp(ts.scheduled_arrival)) {
      errors.push(
        `Trip-stop '${key}' has invalid scheduled_arrival timestamp: '${ts.scheduled_arrival}'.`,
      );
    }
    if (
      ts.scheduled_departure &&
      !isValidTimestamp(ts.scheduled_departure)
    ) {
      errors.push(
        `Trip-stop '${key}' has invalid scheduled_departure timestamp: '${ts.scheduled_departure}'.`,
      );
    }
  }

  // Validate Stop Observations (Primary key composite + Matching schedule record + Passenger movements)
  for (const obs of stopObservations) {
    if (!obs.trip_id || !String(obs.trip_id).trim()) {
      errors.push("Stop observation record has missing or empty trip_id.");
      continue;
    }
    if (!Number.isInteger(obs.stop_sequence) || obs.stop_sequence <= 0) {
      errors.push(
        `Observation for trip '${obs.trip_id}' has invalid stop_sequence: '${obs.stop_sequence}'.`,
      );
    }

    const key = `${obs.trip_id}_${obs.stop_sequence}`;
    if (observationKeys.has(key)) {
      errors.push(`Duplicate stop_observations primary key detected: '${key}'.`);
    } else {
      observationKeys.add(key);
    }

    if (!tripIds.has(obs.trip_id)) {
      errors.push(
        `Observation '${key}' references unknown trip_id: '${obs.trip_id}'.`,
      );
    }
    if (!scheduleKeys.has(key)) {
      errors.push(
        `Observation '${key}' has no matching trip_stops schedule record.`,
      );
    }
    if (!isValidTimestamp(obs.actual_arrival)) {
      errors.push(
        `Observation '${key}' has invalid actual_arrival timestamp: '${obs.actual_arrival}'.`,
      );
    }
    if (!Number.isInteger(obs.boarding) || obs.boarding < 0) {
      errors.push(
        `Observation '${key}' has invalid boarding count: '${obs.boarding}'. Boardings must be a non-negative integer.`,
      );
    }
    if (!Number.isInteger(obs.alighting) || obs.alighting < 0) {
      errors.push(
        `Observation '${key}' has invalid alighting count: '${obs.alighting}'. Alightings must be a non-negative integer.`,
      );
    }
  }

  // Check if any schedule records are missing observations (warning level, consistent with V1)
  for (const key of scheduleKeys) {
    if (!observationKeys.has(key)) {
      warnings.push(`Trip-stop record '${key}' has no matching observation.`);
    }
  }

  const totalRecords =
    routes.length +
    stops.length +
    buses.length +
    trips.length +
    tripStops.length +
    stopObservations.length;

  const isValid = errors.length === 0;

  return {
    isValid,
    errors,
    warnings,
    summary: {
      totalRecords,
      errorCount: errors.length,
      warningCount: warnings.length,
      status: isValid ? "PASSED" : "FAILED",
    },
  };
}

export default {
  REQUIRED_HEADERS,
  validateHeaders,
  isValidDateString,
  isValidTimestamp,
  validateDatasets,
};
