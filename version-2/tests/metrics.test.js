// tests/metrics.test.js
// Unit tests for Version 2 metrics engine and mathematical parity

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateDelay,
  calculateSum,
  calculateMean,
  calculateSampleStandardDeviation,
  createOperationalRecords,
  filterRecords,
  calculateTimeWeightedOccupancy,
  calculateDashboardMetrics,
  calculateRouteSummaries,
  calculateRouteEfficiency,
} from "../src/metrics.js";

describe("Metrics Engine Unit & Parity Tests", () => {
  describe("Delay & Punctuality Arithmetic", () => {
    it("calculates positive delay accurately (Test 1 from calculation-tests.js)", () => {
      const delay = calculateDelay(
        "2026-11-06T08:00:00+05:30",
        "2026-11-06T08:07:00+05:30",
      );
      assert.strictEqual(delay, 7);
    });

    it("calculates early arrival as negative delay (Test 2 from calculation-tests.js)", () => {
      const delay = calculateDelay(
        "2026-11-06T08:00:00+05:30",
        "2026-11-06T07:58:00+05:30",
      );
      assert.strictEqual(delay, -2);
    });

    it("returns null when actual arrival is missing or invalid (Test 6 from calculation-tests.js)", () => {
      assert.strictEqual(
        calculateDelay("2026-11-06T08:00:00+05:30", null),
        null,
      );
      assert.strictEqual(
        calculateDelay("2026-11-06T08:00:00+05:30", undefined),
        null,
      );
      assert.strictEqual(
        calculateDelay("2026-11-06T08:00:00+05:30", "invalid-date"),
        null,
      );
    });

    it("evaluates on-time threshold boundaries (0 to 5 minutes inclusive)", () => {
      // Delays: -0.01 (early), 0.0 (on-time), 5.0 (on-time), 5.01 (late), 10.0 (late)
      const records = [
        { tripId: "T1", delayMinutes: -0.01, boarding: 0, alighting: 0 },
        { tripId: "T1", delayMinutes: 0.0, boarding: 0, alighting: 0 },
        { tripId: "T1", delayMinutes: 5.0, boarding: 0, alighting: 0 },
        { tripId: "T1", delayMinutes: 5.01, boarding: 0, alighting: 0 },
        { tripId: "T1", delayMinutes: 10.0, boarding: 0, alighting: 0 },
        { tripId: "T1", delayMinutes: null, boarding: 0, alighting: 0 },
      ];

      const metrics = calculateDashboardMetrics(records);
      assert.strictEqual(metrics.validDelayCount, 5);
      assert.strictEqual(metrics.onTimeCount, 2); // 0.0 and 5.0
      assert.strictEqual(metrics.earlyArrivalCount, 1); // -0.01
      assert.strictEqual(metrics.onTimePercentage, (2 / 5) * 100); // 40%
    });

    it("reproduces on-time percentage test from calculation-tests.js (Test 4)", () => {
      // Delays: [-2, 0, 5, 6, 9, null] -> 40%
      const records = [-2, 0, 5, 6, 9, null].map((d, i) => ({
        tripId: `T${i}`,
        delayMinutes: d,
        boarding: 1,
        alighting: 1,
      }));

      const metrics = calculateDashboardMetrics(records);
      assert.strictEqual(metrics.validDelayCount, 5);
      assert.strictEqual(metrics.onTimeCount, 2);
      assert.strictEqual(metrics.earlyArrivalCount, 1);
      assert.strictEqual(metrics.onTimePercentage, 40);
    });
  });

  describe("Occupancy Calculations", () => {
    it("computes sequential cumulative passenger occupancy (Test 3 from calculation-tests.js)", () => {
      // Sequence: 0 -> +10 -0 = 10 -> +5 -3 = 12 -> +0 -12 = 0
      const mock = {
        routes: [{ route_id: "R1", route_name: "R1" }],
        stops: [
          { stop_id: "S1", stop_name: "S1", latitude: 0, longitude: 0 },
          { stop_id: "S2", stop_name: "S2", latitude: 0, longitude: 0 },
          { stop_id: "S3", stop_name: "S3", latitude: 0, longitude: 0 },
        ],
        buses: [{ bus_id: "B1", capacity: 50 }],
        trips: [
          {
            trip_id: "T1",
            route_id: "R1",
            bus_id: "B1",
            service_date: "2026-10-01",
          },
        ],
        tripStops: [
          {
            trip_id: "T1",
            stop_sequence: 1,
            stop_id: "S1",
            scheduled_arrival: "2026-10-01T08:00:00+05:30",
          },
          {
            trip_id: "T1",
            stop_sequence: 2,
            stop_id: "S2",
            scheduled_arrival: "2026-10-01T08:15:00+05:30",
          },
          {
            trip_id: "T1",
            stop_sequence: 3,
            stop_id: "S3",
            scheduled_arrival: "2026-10-01T08:30:00+05:30",
          },
        ],
        stopObservations: [
          {
            trip_id: "T1",
            stop_sequence: 1,
            actual_arrival: "2026-10-01T08:00:00+05:30",
            boarding: 10,
            alighting: 0,
          },
          {
            trip_id: "T1",
            stop_sequence: 2,
            actual_arrival: "2026-10-01T08:15:00+05:30",
            boarding: 5,
            alighting: 3,
          },
          {
            trip_id: "T1",
            stop_sequence: 3,
            actual_arrival: "2026-10-01T08:30:00+05:30",
            boarding: 0,
            alighting: 12,
          },
        ],
      };

      const records = createOperationalRecords(mock);
      assert.strictEqual(records.length, 3);
      assert.strictEqual(records[0].occupancy, 10);
      assert.strictEqual(records[0].occupancyPercentage, (10 / 50) * 100);
      assert.strictEqual(records[1].occupancy, 12);
      assert.strictEqual(records[1].occupancyPercentage, (12 / 50) * 100);
      assert.strictEqual(records[2].occupancy, 0);
      assert.strictEqual(records[2].occupancyPercentage, 0);
    });

    it("clamps negative occupancy at zero", () => {
      const mock = {
        routes: [{ route_id: "R1", route_name: "R1" }],
        stops: [{ stop_id: "S1", stop_name: "S1", latitude: 0, longitude: 0 }],
        buses: [{ bus_id: "B1", capacity: 40 }],
        trips: [
          {
            trip_id: "T1",
            route_id: "R1",
            bus_id: "B1",
            service_date: "2026-10-01",
          },
        ],
        tripStops: [
          {
            trip_id: "T1",
            stop_sequence: 1,
            stop_id: "S1",
            scheduled_arrival: "2026-10-01T08:00:00+05:30",
          },
        ],
        stopObservations: [
          {
            trip_id: "T1",
            stop_sequence: 1,
            actual_arrival: "2026-10-01T08:00:00+05:30",
            boarding: 2,
            alighting: 5, // Net: 2 - 5 = -3 -> clamped to 0
          },
        ],
      };

      const records = createOperationalRecords(mock);
      assert.strictEqual(records[0].occupancy, 0);
    });

    it("computes time-weighted occupancy with unequal segment durations (Test 5)", () => {
      // 3 segments:
      // Stop 1 to 2: occ = 20, cap = 50, duration = 10 min -> 200 pass-min, 500 cap-min
      // Stop 2 to 3: occ = 30, cap = 50, duration = 20 min -> 600 pass-min, 1000 cap-min
      // Stop 3 to 4: occ = 10, cap = 50, duration = 10 min -> 100 pass-min, 500 cap-min
      // Total pass-min = 900, cap-min = 2000 -> 45%
      const records = [
        {
          tripId: "T1",
          stopSequence: 1,
          occupancy: 20,
          capacity: 50,
          actualArrival: new Date("2026-10-01T08:00:00+05:30"),
        },
        {
          tripId: "T1",
          stopSequence: 2,
          occupancy: 30,
          capacity: 50,
          actualArrival: new Date("2026-10-01T08:10:00+05:30"),
        },
        {
          tripId: "T1",
          stopSequence: 3,
          occupancy: 10,
          capacity: 50,
          actualArrival: new Date("2026-10-01T08:30:00+05:30"),
        },
        {
          tripId: "T1",
          stopSequence: 4,
          occupancy: 0,
          capacity: 50,
          actualArrival: new Date("2026-10-01T08:40:00+05:30"),
        },
      ];

      const two = calculateTimeWeightedOccupancy(records);
      assert.strictEqual(two, 45);
    });

    it("ignores segments with non-positive durations in time-weighted occupancy", () => {
      const records = [
        {
          tripId: "T1",
          stopSequence: 1,
          occupancy: 20,
          capacity: 50,
          actualArrival: new Date("2026-10-01T08:10:00+05:30"),
        },
        {
          tripId: "T1",
          stopSequence: 2,
          occupancy: 30,
          capacity: 50,
          actualArrival: new Date("2026-10-01T08:10:00+05:30"), // duration = 0
        },
        {
          tripId: "T1",
          stopSequence: 3,
          occupancy: 0,
          capacity: 50,
          actualArrival: new Date("2026-10-01T08:20:00+05:30"), // duration = 10 min
        },
      ];

      // Only segment 2->3 counts (occ 30 * 10 min = 300, cap 50 * 10 min = 500) -> 60%
      const two = calculateTimeWeightedOccupancy(records);
      assert.strictEqual(two, 60);
    });
  });

  describe("Filtering Functionality", () => {
    const sampleRecords = [
      { tripId: "T1", routeId: "R1", serviceDate: "2026-10-01" },
      { tripId: "T2", routeId: "R1", serviceDate: "2026-10-02" },
      { tripId: "T3", routeId: "R2", serviceDate: "2026-10-01" },
      { tripId: "T4", routeId: "R2", serviceDate: "2026-10-02" },
    ];

    it("filters all routes when routeId is 'all' or empty", () => {
      const all1 = filterRecords(sampleRecords, { routeId: "all" });
      assert.strictEqual(all1.length, 4);

      const all2 = filterRecords(sampleRecords, {});
      assert.strictEqual(all2.length, 4);
    });

    it("filters by specific routeId", () => {
      const filtered = filterRecords(sampleRecords, { routeId: "R1" });
      assert.strictEqual(filtered.length, 2);
      assert.ok(filtered.every((r) => r.routeId === "R1"));
    });

    it("filters by specific serviceDate", () => {
      const filtered = filterRecords(sampleRecords, {
        serviceDate: "2026-10-01",
      });
      assert.strictEqual(filtered.length, 2);
      assert.ok(filtered.every((r) => r.serviceDate === "2026-10-01"));
    });

    it("combines routeId and serviceDate filters", () => {
      const filtered = filterRecords(sampleRecords, {
        routeId: "R2",
        serviceDate: "2026-10-02",
      });
      assert.strictEqual(filtered.length, 1);
      assert.strictEqual(filtered[0].tripId, "T4");
    });
  });

  describe("Empty & Edge Case Data Handling", () => {
    it("handles empty record array without throwing errors", () => {
      const emptyMetrics = calculateDashboardMetrics([]);
      assert.strictEqual(emptyMetrics.totalTrips, 0);
      assert.strictEqual(emptyMetrics.totalBoardings, 0);
      assert.strictEqual(emptyMetrics.totalAlightings, 0);
      assert.strictEqual(emptyMetrics.averageDelay, undefined);
      assert.strictEqual(emptyMetrics.validDelayCount, 0);
      assert.strictEqual(emptyMetrics.onTimeCount, 0);
      assert.strictEqual(emptyMetrics.onTimePercentage, 0);
      assert.strictEqual(emptyMetrics.earlyArrivalCount, 0);
      assert.strictEqual(emptyMetrics.timeWeightedOccupancy, undefined);

      assert.deepStrictEqual(calculateRouteSummaries([]), []);
      assert.strictEqual(calculateTimeWeightedOccupancy([]), undefined);
    });

    it("handles division by zero in mean and sample standard deviation", () => {
      assert.strictEqual(calculateMean([]), undefined);
      assert.ok(Number.isNaN(calculateSampleStandardDeviation([])));
      assert.ok(Number.isNaN(calculateSampleStandardDeviation([42]))); // N <= 1 yields NaN
    });
  });

  describe("Route Efficiency & Regularity Metrics", () => {
    it("computes journey time ratio, headways, and headway CV", () => {
      // 2 trips on route R1 on service_date 2026-10-01:
      // Trip 1: scheduled 60 min, actual 66 min (departure 08:00)
      // Trip 2: scheduled 60 min, actual 60 min (departure 12:00)
      // Headway between Trip 1 and Trip 2 = 240 minutes
      const mockData = {
        routes: [{ route_id: "R1", route_name: "Route 1" }],
        buses: [{ bus_id: "B1", capacity: 50 }],
        trips: [
          {
            trip_id: "T1",
            route_id: "R1",
            bus_id: "B1",
            service_date: "2026-10-01",
          },
          {
            trip_id: "T2",
            route_id: "R1",
            bus_id: "B1",
            service_date: "2026-10-01",
          },
        ],
        tripStops: [
          {
            trip_id: "T1",
            stop_sequence: 1,
            stop_id: "S1",
            scheduled_arrival: "2026-10-01T08:00:00+05:30",
          },
          {
            trip_id: "T1",
            stop_sequence: 2,
            stop_id: "S2",
            scheduled_arrival: "2026-10-01T09:00:00+05:30",
          },
          {
            trip_id: "T2",
            stop_sequence: 1,
            stop_id: "S1",
            scheduled_arrival: "2026-10-01T12:00:00+05:30",
          },
          {
            trip_id: "T2",
            stop_sequence: 2,
            stop_id: "S2",
            scheduled_arrival: "2026-10-01T13:00:00+05:30",
          },
        ],
        stopObservations: [
          {
            trip_id: "T1",
            stop_sequence: 1,
            actual_arrival: "2026-10-01T08:00:00+05:30",
            boarding: 20,
            alighting: 0,
          },
          {
            trip_id: "T1",
            stop_sequence: 2,
            actual_arrival: "2026-10-01T09:06:00+05:30", // actual = 66 min
            boarding: 0,
            alighting: 20,
          },
          {
            trip_id: "T2",
            stop_sequence: 1,
            actual_arrival: "2026-10-01T12:00:00+05:30",
            boarding: 10,
            alighting: 0,
          },
          {
            trip_id: "T2",
            stop_sequence: 2,
            actual_arrival: "2026-10-01T13:00:00+05:30", // actual = 60 min
            boarding: 0,
            alighting: 10,
          },
        ],
      };

      const efficiency = calculateRouteEfficiency(mockData);
      assert.strictEqual(efficiency.length, 1);
      const r1 = efficiency[0];

      assert.strictEqual(r1.route_id, "R1");
      assert.strictEqual(r1.trips, 2);
      assert.strictEqual(r1.scheduledMin, 60);
      assert.strictEqual(r1.actualMin, 63); // (66 + 60) / 2
      assert.strictEqual(r1.journeyTimeRatio, 63 / 60); // 1.05
      assert.strictEqual(r1.headwayMin, 240); // 12:00 - 08:00 = 240 min
      assert.ok(Number.isNaN(r1.headwayCV)); // only 1 headway gap -> SD is NaN
    });
  });
});
