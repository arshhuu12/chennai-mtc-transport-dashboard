// tests/validation.test.js
// Automated tests for data validation rules and schema integrity

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  validateDatasets,
  validateHeaders,
  isValidDateString,
  isValidTimestamp,
} from "../src/validation.js";

/**
 * Creates an isolated, valid mock dataset fixture for testing validation rules.
 */
function createValidMock() {
  return {
    routes: [
      {
        route_id: "R001",
        route_name: "Sample Route 001",
        origin: "Stop 1",
        destination: "Stop 2",
      },
    ],
    stops: [
      {
        stop_id: "S001",
        stop_name: "Sample Stop 001",
        latitude: 13.0827,
        longitude: 80.2707,
      },
    ],
    buses: [
      {
        bus_id: "B001",
        capacity: 50,
      },
    ],
    trips: [
      {
        trip_id: "T001",
        route_id: "R001",
        bus_id: "B001",
        service_date: "2026-10-01",
      },
    ],
    tripStops: [
      {
        trip_id: "T001",
        stop_sequence: 1,
        stop_id: "S001",
        scheduled_arrival: "2026-10-01T08:00:00+05:30",
        scheduled_departure: "2026-10-01T08:05:00+05:30",
      },
    ],
    stopObservations: [
      {
        trip_id: "T001",
        stop_sequence: 1,
        actual_arrival: "2026-10-01T08:02:00+05:30",
        boarding: 12,
        alighting: 0,
      },
    ],
  };
}

describe("Data Validation Engine Tests", () => {
  it("passes validation on a fully consistent mock dataset", () => {
    const mock = createValidMock();
    const result = validateDatasets(mock);
    assert.strictEqual(result.isValid, true);
    assert.strictEqual(result.errors.length, 0);
    assert.strictEqual(result.summary.status, "PASSED");
  });

  it("detects missing headers through validateHeaders", () => {
    const errors = validateHeaders("routes", ["route_id"]);
    assert.strictEqual(errors.length, 1);
    assert.ok(errors[0].includes("missing required column(s): route_name"));

    const validErrors = validateHeaders("routes", ["route_id", "route_name"]);
    assert.strictEqual(validErrors.length, 0);
  });

  it("detects duplicate primary keys in routes", () => {
    const mock = createValidMock();
    mock.routes.push({
      route_id: "R001",
      route_name: "Duplicate Route",
    });

    const result = validateDatasets(mock);
    assert.strictEqual(result.isValid, false);
    assert.ok(
      result.errors.some((err) =>
        err.includes("Duplicate route_id detected: 'R001'"),
      ),
    );
  });

  it("detects duplicate composite keys in trip_stops and stop_observations", () => {
    const mock = createValidMock();
    mock.tripStops.push({
      trip_id: "T001",
      stop_sequence: 1,
      stop_id: "S001",
      scheduled_arrival: "2026-10-01T08:10:00+05:30",
    });

    const result = validateDatasets(mock);
    assert.strictEqual(result.isValid, false);
    assert.ok(
      result.errors.some((err) =>
        err.includes("Duplicate trip_stops primary key detected: 'T001_1'"),
      ),
    );
  });

  it("detects invalid foreign key references (trips -> routes and buses)", () => {
    const mock = createValidMock();
    mock.trips[0].route_id = "R_NON_EXISTENT";
    mock.trips[0].bus_id = "B_NON_EXISTENT";

    const result = validateDatasets(mock);
    assert.strictEqual(result.isValid, false);
    assert.ok(
      result.errors.some((err) =>
        err.includes("references unknown route_id: 'R_NON_EXISTENT'"),
      ),
    );
    assert.ok(
      result.errors.some((err) =>
        err.includes("references unknown bus_id: 'B_NON_EXISTENT'"),
      ),
    );
  });

  it("detects invalid foreign key references in trip_stops", () => {
    const mock = createValidMock();
    mock.tripStops[0].stop_id = "S_UNKNOWN";

    const result = validateDatasets(mock);
    assert.strictEqual(result.isValid, false);
    assert.ok(
      result.errors.some((err) =>
        err.includes("references unknown stop_id: 'S_UNKNOWN'"),
      ),
    );
  });

  it("detects observation without matching schedule record", () => {
    const mock = createValidMock();
    mock.stopObservations[0].stop_sequence = 99; // Schedule has stop_sequence 1

    const result = validateDatasets(mock);
    assert.strictEqual(result.isValid, false);
    assert.ok(
      result.errors.some((err) =>
        err.includes("has no matching trip_stops schedule record"),
      ),
    );
  });

  it("rejects negative boarding and alighting values", () => {
    const mock = createValidMock();
    mock.stopObservations[0].boarding = -3;
    mock.stopObservations[0].alighting = -1;

    const result = validateDatasets(mock);
    assert.strictEqual(result.isValid, false);
    assert.ok(
      result.errors.some((err) =>
        err.includes("invalid boarding count: '-3'"),
      ),
    );
    assert.ok(
      result.errors.some((err) =>
        err.includes("invalid alighting count: '-1'"),
      ),
    );
  });

  it("rejects non-positive bus capacities", () => {
    const mock = createValidMock();
    mock.buses[0].capacity = 0;

    const result = validateDatasets(mock);
    assert.strictEqual(result.isValid, false);
    assert.ok(
      result.errors.some((err) =>
        err.includes("invalid capacity: '0'. Capacity must be a positive integer"),
      ),
    );
  });

  it("detects invalid service dates and timestamps", () => {
    assert.strictEqual(isValidDateString("2026-10-01"), true);
    assert.strictEqual(isValidDateString("invalid-date"), false);
    assert.strictEqual(isValidDateString("2026/10/01"), false);

    assert.strictEqual(isValidTimestamp("2026-10-01T08:00:00+05:30"), true);
    assert.strictEqual(isValidTimestamp("not-a-timestamp"), false);

    const mock = createValidMock();
    mock.trips[0].service_date = "bad-date";
    mock.stopObservations[0].actual_arrival = "bad-time";

    const result = validateDatasets(mock);
    assert.strictEqual(result.isValid, false);
    assert.ok(
      result.errors.some((err) =>
        err.includes("invalid service_date: 'bad-date'"),
      ),
    );
    assert.ok(
      result.errors.some((err) =>
        err.includes("invalid actual_arrival timestamp: 'bad-time'"),
      ),
    );
  });
});
