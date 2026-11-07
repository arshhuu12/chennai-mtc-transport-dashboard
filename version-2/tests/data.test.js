// tests/data.test.js
// Automated tests for CSV data loading and integrity in Version 2

import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import {
  loadDatasets,
  getData,
  getDataSummary,
  resetData,
} from "../src/data.js";
import { REQUIRED_HEADERS } from "../src/validation.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const V2_DATA_DIR = path.resolve(__dirname, "..", "data");
const V1_DATA_DIR = path.resolve(__dirname, "..", "..", "dashboard", "data");

function computeHash(filePath) {
  const content = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(content).digest("hex");
}

describe("CSV Data Loading & Dataset Verification", () => {
  before(() => {
    resetData();
  });

  it("loads all six datasets into memory successfully", () => {
    const data = loadDatasets(V2_DATA_DIR);
    assert.ok(data, "loadDatasets should return a data object");
    assert.ok(Array.isArray(data.routes), "routes must be an array");
    assert.ok(Array.isArray(data.stops), "stops must be an array");
    assert.ok(Array.isArray(data.buses), "buses must be an array");
    assert.ok(Array.isArray(data.trips), "trips must be an array");
    assert.ok(Array.isArray(data.tripStops), "tripStops must be an array");
    assert.ok(
      Array.isArray(data.stopObservations),
      "stopObservations must be an array",
    );
  });

  it("matches exact expected record counts across all six datasets", () => {
    const data = getData();
    assert.strictEqual(data.routes.length, 12, "routes should contain 12 records");
    assert.strictEqual(data.stops.length, 48, "stops should contain 48 records");
    assert.strictEqual(data.buses.length, 20, "buses should contain 20 records");
    assert.strictEqual(data.trips.length, 672, "trips should contain 672 records");
    assert.strictEqual(
      data.tripStops.length,
      2688,
      "tripStops should contain 2688 records",
    );
    assert.strictEqual(
      data.stopObservations.length,
      2688,
      "stopObservations should contain 2688 records",
    );
  });

  it("contains all required schema headers", () => {
    const data = getData();

    for (const [key, headers] of Object.entries(REQUIRED_HEADERS)) {
      const records =
        key === "trip_stops"
          ? data.tripStops
          : key === "stop_observations"
            ? data.stopObservations
            : data[key];

      assert.ok(records.length > 0, `Dataset ${key} must have records`);
      const sample = records[0];

      for (const header of headers) {
        assert.ok(
          header in sample,
          `Record in ${key} must contain column header '${header}'`,
        );
      }
    }
  });

  it("converts numeric fields to numbers and preserves IDs as strings", () => {
    const data = getData();

    // Check Route
    const route = data.routes[0];
    assert.strictEqual(typeof route.route_id, "string");
    assert.strictEqual(typeof route.route_name, "string");

    // Check Stop
    const stop = data.stops[0];
    assert.strictEqual(typeof stop.stop_id, "string");
    assert.strictEqual(typeof stop.latitude, "number");
    assert.strictEqual(typeof stop.longitude, "number");

    // Check Bus
    const bus = data.buses[0];
    assert.strictEqual(typeof bus.bus_id, "string");
    assert.strictEqual(typeof bus.capacity, "number");
    assert.ok(Number.isInteger(bus.capacity));

    // Check Trip
    const trip = data.trips[0];
    assert.strictEqual(typeof trip.trip_id, "string");
    assert.strictEqual(typeof trip.route_id, "string");
    assert.strictEqual(typeof trip.bus_id, "string");
    assert.strictEqual(typeof trip.service_date, "string");

    // Check TripStop
    const tripStop = data.tripStops[0];
    assert.strictEqual(typeof tripStop.trip_id, "string");
    assert.strictEqual(typeof tripStop.stop_sequence, "number");
    assert.strictEqual(typeof tripStop.stop_id, "string");
    assert.ok(tripStop.scheduled_arrival_time instanceof Date);
    assert.ok(!Number.isNaN(tripStop.scheduled_arrival_time.getTime()));

    // Check StopObservation
    const obs = data.stopObservations[0];
    assert.strictEqual(typeof obs.trip_id, "string");
    assert.strictEqual(typeof obs.stop_sequence, "number");
    assert.strictEqual(typeof obs.boarding, "number");
    assert.strictEqual(typeof obs.alighting, "number");
    assert.ok(obs.actual_arrival_time instanceof Date);
    assert.ok(!Number.isNaN(obs.actual_arrival_time.getTime()));
  });

  it("provides internal data summary with validation status", () => {
    const summary = getDataSummary();
    assert.ok(summary, "getDataSummary should return a summary object");
    assert.strictEqual(summary.routesCount, 12);
    assert.strictEqual(summary.stopsCount, 48);
    assert.strictEqual(summary.busesCount, 20);
    assert.strictEqual(summary.tripsCount, 672);
    assert.strictEqual(summary.tripStopsCount, 2688);
    assert.strictEqual(summary.observationsCount, 2688);
    assert.strictEqual(summary.validationStatus, "PASSED");
    assert.ok(summary.loadedAt);
  });

  it("produces clear error when dataset directory or file is missing", () => {
    const nonExistentDir = path.join(__dirname, "non-existent-directory");
    assert.throws(
      () => loadDatasets(nonExistentDir),
      (err) => {
        assert.ok(err instanceof Error);
        assert.ok(
          err.message.includes("Dataset file not found") ||
            err.message.includes("ENOENT"),
        );
        return true;
      },
    );
  });

  it("preserves Version 1 source files identically (SHA-256 match)", () => {
    const files = [
      "routes.csv",
      "stops.csv",
      "buses.csv",
      "trips.csv",
      "trip_stops.csv",
      "stop_observations.csv",
    ];

    for (const file of files) {
      const srcPath = path.join(V1_DATA_DIR, file);
      const dstPath = path.join(V2_DATA_DIR, file);

      assert.ok(fs.existsSync(srcPath), `Source file ${srcPath} must exist`);
      assert.ok(fs.existsSync(dstPath), `Target file ${dstPath} must exist`);

      const srcHash = computeHash(srcPath);
      const dstHash = computeHash(dstPath);

      assert.strictEqual(
        dstHash,
        srcHash,
        `SHA-256 mismatch detected for ${file}! Source must remain identical to copy.`,
      );
    }
  });
});
