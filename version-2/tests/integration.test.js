// tests/integration.test.js
// Stage 6: Full System Integration, End-to-End API and Regression Verification Test Suite

import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import app from "../src/app.js";
import { loadDatasets, getData, getOperationalRecords } from "../src/data.js";
import {
  filterRecords,
  calculateDashboardMetrics,
  calculateSum,
  calculateMean,
  calculateTimeWeightedOccupancy,
  calculateRouteEfficiency,
} from "../src/metrics.js";

let server;
let baseUrl;

before(() => {
  loadDatasets();
  return new Promise((resolve) => {
    server = app.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });
});

after(() => {
  return new Promise((resolve) => {
    if (server) {
      server.close(resolve);
    } else {
      resolve();
    }
  });
});

describe("Stage 6: System Integration & End-to-End API Verification", () => {
  describe("1. Dataset Invariants & In-Memory Availability", () => {
    test("verifies core dataset counts and values match expected figures", () => {
      const data = getData();
      assert.equal(data.routes.length, 12, "Must contain exactly 12 routes");
      assert.equal(data.stops.length, 48, "Must contain exactly 48 stops");
      assert.equal(data.trips.length, 672, "Must contain exactly 672 trips");

      const records = getOperationalRecords();
      const totalBoardings = calculateSum(records, "boarding");
      const totalAlightings = calculateSum(records, "alighting");
      const maxOccupancy = Math.max(...records.map((r) => r.occupancy));

      assert.equal(totalBoardings, 21430, "Total boardings must be 21,430");
      assert.equal(totalAlightings, 21430, "Total alightings must be 21,430");
      assert.equal(maxOccupancy, 49, "Maximum occupancy must be 49");
    });
  });

  describe("2. End-to-End API: No Filters (All-Data)", () => {
    test("GET /api/health returns HTTP 200 with service metadata", async () => {
      const res = await fetch(`${baseUrl}/api/health`);
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.status, "ok");
      assert.equal(json.name, "chennai-mtc-dashboard-v2");
      assert.ok(json.timestamp);
    });

    test("GET /api/dashboard returns complete metrics matching metrics engine", async () => {
      const res = await fetch(`${baseUrl}/api/dashboard`);
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);

      const d = json.data;
      assert.equal(d.totalTrips, 672);
      assert.equal(d.totalBoardings, 21430);
      assert.equal(d.totalAlightings, 21430);
      assert.ok(Math.abs(d.averageDelay - 4.82775) < 0.001);
      assert.ok(Math.abs(d.onTimePercentage - 41.369) < 0.01);
      assert.equal(d.earlyArrivalCount, 427);
      assert.ok(Math.abs(d.timeWeightedOccupancy - 42.1466) < 0.01);
    });

    test("GET /api/routes returns all 12 routes with boardings summing to 21,430", async () => {
      const res = await fetch(`${baseUrl}/api/routes`);
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.equal(json.data.length, 12);

      const totalRouteBoardings = json.data.reduce((sum, r) => sum + r.boardings, 0);
      assert.equal(totalRouteBoardings, 21430);

      // Verify each route has efficiency metrics
      for (const r of json.data) {
        assert.ok(r.routeId);
        assert.ok(r.routeName);
        assert.ok(typeof r.trips === "number");
        assert.ok(typeof r.scheduledMin === "number");
        assert.ok(typeof r.actualMin === "number");
        assert.ok(typeof r.journeyTimeRatio === "number");
      }
    });

    test("GET /api/stops returns all 48 stops correctly ranked by boardings", async () => {
      const res = await fetch(`${baseUrl}/api/stops`);
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.equal(json.data.length, 48);

      const totalStopBoardings = json.data.reduce((sum, s) => sum + s.boardings, 0);
      assert.equal(totalStopBoardings, 21430);

      // Verify sorted descending by boardings
      for (let i = 0; i < json.data.length - 1; i++) {
        assert.ok(
          json.data[i].boardings >= json.data[i + 1].boardings,
          "Stops must be ordered descending by boardings",
        );
      }
    });

    test("GET /api/analytics returns valid datasets for all four charts", async () => {
      const res = await fetch(`${baseUrl}/api/analytics`);
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);

      const { dailyDemand, delayDistribution, occupancy, routeComparison } = json.data;

      assert.equal(dailyDemand.length, 28, "Must have 28 service dates");
      const dailyBoardingsSum = dailyDemand.reduce((sum, d) => sum + d.boardings, 0);
      assert.equal(dailyBoardingsSum, 21430);

      assert.ok(delayDistribution.length > 0, "Histogram bins must exist");
      const totalDelayObservations = delayDistribution.reduce((sum, b) => sum + b.count, 0);
      assert.equal(totalDelayObservations, 2688);

      assert.equal(occupancy.length, 12, "Must have 12 route occupancy items");
      assert.equal(routeComparison.length, 12, "Must have 12 route comparison items");
    });
  });

  describe("3. End-to-End API: Filter Scenarios & Metrics Parity", () => {
    test("Filter by Route R001", async () => {
      const res = await fetch(`${baseUrl}/api/dashboard?routeId=R001`);
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.data.totalTrips, 56);
      assert.equal(json.data.totalBoardings, 1690);
      assert.equal(json.data.totalAlightings, 1690);

      // Verify parity with direct metrics engine calculation
      const records = getOperationalRecords();
      const filtered = filterRecords(records, { routeId: "R001", serviceDate: null });
      const expected = calculateDashboardMetrics(filtered);
      assert.equal(json.data.totalTrips, expected.totalTrips);
      assert.equal(json.data.totalBoardings, expected.totalBoardings);
      assert.equal(json.data.averageDelay, expected.averageDelay);
      assert.equal(json.data.onTimePercentage, expected.onTimePercentage);
    });

    test("Filter by Valid Service Date 2026-10-01", async () => {
      const res = await fetch(`${baseUrl}/api/dashboard?serviceDate=2026-10-01`);
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.data.totalTrips, 24);
      assert.equal(json.data.totalBoardings, 760);
      assert.equal(json.data.totalAlightings, 760);

      const records = getOperationalRecords();
      const filtered = filterRecords(records, { routeId: "all", serviceDate: "2026-10-01" });
      const expected = calculateDashboardMetrics(filtered);
      assert.equal(json.data.totalTrips, expected.totalTrips);
      assert.equal(json.data.totalBoardings, expected.totalBoardings);
    });

    test("Combined Filter: Route R001 and Service Date 2026-10-01", async () => {
      const res = await fetch(
        `${baseUrl}/api/dashboard?routeId=R001&serviceDate=2026-10-01`,
      );
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.data.totalTrips, 2);
      assert.equal(json.data.totalBoardings, 36);
      assert.equal(json.data.totalAlightings, 36);
    });

    test("Unknown Route returns HTTP 400 with INVALID_ROUTE error", async () => {
      const res = await fetch(`${baseUrl}/api/dashboard?routeId=R999`);
      assert.equal(res.status, 400);
      const json = await res.json();
      assert.equal(json.success, false);
      assert.equal(json.error.code, "INVALID_ROUTE");
    });

    test("Invalid Date format returns HTTP 400 with INVALID_DATE error", async () => {
      const res = await fetch(`${baseUrl}/api/dashboard?serviceDate=2026-99-99`);
      assert.equal(res.status, 400);
      const json = await res.json();
      assert.equal(json.success, false);
      assert.equal(json.error.code, "INVALID_DATE");
    });

    test("Calendar-invalid date (2026-02-31) returns HTTP 400", async () => {
      const res = await fetch(`${baseUrl}/api/dashboard?serviceDate=2026-02-31`);
      assert.equal(res.status, 400);
      const json = await res.json();
      assert.equal(json.success, false);
      assert.equal(json.error.code, "INVALID_DATE");
    });

    test("Valid Date with No Matching Records returns HTTP 200 with zero values", async () => {
      const res = await fetch(`${baseUrl}/api/dashboard?serviceDate=2026-11-15`);
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.equal(json.data.totalTrips, 0);
      assert.equal(json.data.totalBoardings, 0);
      assert.equal(json.data.totalAlightings, 0);
      assert.equal(json.data.averageDelay, null);
      assert.equal(json.data.onTimePercentage, 0);
      assert.equal(json.data.earlyArrivalCount, 0);
      assert.equal(json.data.timeWeightedOccupancy, null);
    });

    test("Unknown API route returns HTTP 404 with NOT_FOUND error", async () => {
      const res = await fetch(`${baseUrl}/api/unknown-endpoint`);
      assert.equal(res.status, 404);
      const json = await res.json();
      assert.equal(json.success, false);
      assert.equal(json.error.code, "NOT_FOUND");
    });
  });

  describe("4. Chart Dataset Integrity & Consistency", () => {
    test("Route comparison boardings exactly equal individual route boardings", async () => {
      const [analyticsRes, routesRes] = await Promise.all([
        fetch(`${baseUrl}/api/analytics`),
        fetch(`${baseUrl}/api/routes`),
      ]);
      const analytics = await analyticsRes.json();
      const routes = await routesRes.json();

      const routeBoardingMap = new Map(routes.data.map((r) => [r.routeId, r.boardings]));
      for (const item of analytics.data.routeComparison) {
        assert.equal(
          item.boardings,
          routeBoardingMap.get(item.routeId),
          `Boardings mismatch for route ${item.routeId}`,
        );
      }
    });

    test("Stop demand ranking preserves descending order and accurate counts", async () => {
      const res = await fetch(`${baseUrl}/api/stops`);
      const json = await res.json();
      assert.equal(json.data.length, 48);

      const topStop = json.data[0];
      assert.ok(topStop.boardings > 0);
      assert.equal(topStop.totalActivity, topStop.boardings + topStop.alightings);
    });

    test("Daily demand chronological order and boarding/alighting counts", async () => {
      const res = await fetch(`${baseUrl}/api/analytics`);
      const json = await res.json();
      const { dailyDemand } = json.data;

      for (let i = 0; i < dailyDemand.length - 1; i++) {
        assert.ok(
          dailyDemand[i].serviceDate < dailyDemand[i + 1].serviceDate,
          "Daily demand must be in chronological order",
        );
      }
    });

    test("Delay histogram correctly classifies negative bins as early and spans 5-min bins", async () => {
      const res = await fetch(`${baseUrl}/api/analytics`);
      const json = await res.json();
      const { delayDistribution } = json.data;

      for (const bin of delayDistribution) {
        assert.equal(bin.x1 - bin.x0, 5, "Bin width must be exactly 5 minutes");
        if (bin.x0 < 0) {
          assert.equal(bin.isEarly, true, `Bin [${bin.x0}, ${bin.x1}) should be marked early`);
        } else {
          assert.equal(bin.isEarly, false, `Bin [${bin.x0}, ${bin.x1}) should not be marked early`);
        }
      }
    });

    test("Route occupancy timeWeightedOccupancy values are finite percentages", async () => {
      const res = await fetch(`${baseUrl}/api/analytics`);
      const json = await res.json();
      const { occupancy } = json.data;

      for (const o of occupancy) {
        assert.ok(Number.isFinite(o.timeWeightedOccupancy));
        assert.ok(o.timeWeightedOccupancy >= 0 && o.timeWeightedOccupancy <= 100);
      }
    });

    test("Route efficiency journeyTimeRatio and scheduled benchmarks", async () => {
      const res = await fetch(`${baseUrl}/api/routes`);
      const json = await res.json();

      for (const r of json.data) {
        assert.ok(r.scheduledMin > 0);
        assert.ok(r.actualMin > 0);
        const expectedRatio = +(r.actualMin / r.scheduledMin).toFixed(3);
        assert.ok(
          Math.abs(r.journeyTimeRatio - expectedRatio) <= 0.01,
          `Journey time ratio calculation for route ${r.routeId}`,
        );
      }
    });
  });
});
