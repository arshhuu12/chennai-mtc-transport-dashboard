// tests/api.test.js
// Automated test suite for Stage 4 REST API endpoints

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import app from "../src/app.js";
import { loadDatasets } from "../src/data.js";

describe("Stage 4 REST API Endpoints", () => {
  let server;
  let baseUrl;

  before((_, done) => {
    try {
      loadDatasets();
    } catch {
      // datasets may already be loaded
    }

    server = app.listen(0, "127.0.0.1", () => {
      const address = server.address();
      baseUrl = `http://127.0.0.1:${address.port}`;
      done();
    });
  });

  after((_, done) => {
    if (server) {
      server.close(done);
    } else {
      done();
    }
  });

  describe("1. GET /api/health", () => {
    it("returns HTTP 200 and standard health payload", async () => {
      const res = await fetch(`${baseUrl}/api/health`);
      assert.strictEqual(res.status, 200);

      const data = await res.json();
      assert.strictEqual(data.status, "ok");
      assert.strictEqual(data.name, "chennai-mtc-dashboard-v2");
      assert.ok(data.timestamp);
    });
  });

  describe("2. GET /api/dashboard", () => {
    it("returns HTTP 200 with standard success envelope", async () => {
      const res = await fetch(`${baseUrl}/api/dashboard`);
      assert.strictEqual(res.status, 200);

      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.ok(json.data);
      assert.ok(json.meta);
      assert.strictEqual(json.meta.filters.routeId, "all");
      assert.strictEqual(json.meta.filters.serviceDate, null);
    });

    it("contains all required dashboard KPIs", async () => {
      const res = await fetch(`${baseUrl}/api/dashboard`);
      const { data } = await res.json();

      assert.ok("totalTrips" in data);
      assert.ok("totalBoardings" in data);
      assert.ok("totalAlightings" in data);
      assert.ok("averageDelay" in data);
      assert.ok("onTimePercentage" in data);
      assert.ok("earlyArrivalCount" in data);
      assert.ok("timeWeightedOccupancy" in data);
    });

    it("matches Stage 3 overall all-data KPI values exactly", async () => {
      const res = await fetch(`${baseUrl}/api/dashboard`);
      const { data } = await res.json();

      assert.strictEqual(data.totalTrips, 672);
      assert.strictEqual(data.totalBoardings, 21430);
      assert.strictEqual(data.totalAlightings, 21430);
      assert.strictEqual(data.averageDelay, 4.827752976190476);
      assert.strictEqual(data.onTimePercentage, 41.36904761904761);
      assert.strictEqual(data.earlyArrivalCount, 427);
      assert.strictEqual(data.timeWeightedOccupancy, 42.146618792139215);
    });

    it("applies route filtering accurately (routeId=R001)", async () => {
      const res = await fetch(`${baseUrl}/api/dashboard?routeId=R001`);
      assert.strictEqual(res.status, 200);

      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.meta.filters.routeId, "R001");
      assert.strictEqual(json.data.totalTrips, 56);
      assert.strictEqual(json.data.totalBoardings, 1690);
      assert.strictEqual(json.data.totalAlightings, 1690);
    });

    it("applies service date filtering accurately (serviceDate=2026-10-01)", async () => {
      const res = await fetch(`${baseUrl}/api/dashboard?serviceDate=2026-10-01`);
      assert.strictEqual(res.status, 200);

      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.meta.filters.serviceDate, "2026-10-01");
      assert.strictEqual(json.data.totalTrips, 24);
      assert.strictEqual(json.data.totalBoardings, 760);
      assert.strictEqual(json.data.totalAlightings, 760);
    });

    it("applies combined route and date filtering accurately", async () => {
      const res = await fetch(
        `${baseUrl}/api/dashboard?routeId=R001&serviceDate=2026-10-01`,
      );
      assert.strictEqual(res.status, 200);

      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.meta.filters.routeId, "R001");
      assert.strictEqual(json.meta.filters.serviceDate, "2026-10-01");
      assert.strictEqual(json.data.totalTrips, 2);
      assert.strictEqual(json.data.totalBoardings, 36);
      assert.strictEqual(json.data.totalAlightings, 36);
    });
  });

  describe("3. GET /api/routes", () => {
    it("returns expected route summaries for all 12 routes", async () => {
      const res = await fetch(`${baseUrl}/api/routes`);
      assert.strictEqual(res.status, 200);

      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.data.length, 12);
      assert.strictEqual(json.meta.totalRoutes, 12);

      const r001 = json.data.find((r) => r.routeId === "R001");
      assert.ok(r001);
      assert.strictEqual(r001.routeName, "Sample Route 001");
      assert.strictEqual(r001.boardings, 1690);
      assert.strictEqual(r001.alightings, 1690);
      assert.strictEqual(r001.scheduledMin, 54);
      assert.strictEqual(r001.actualMin, 55.07142857142857);
      assert.strictEqual(r001.journeyTimeRatio, 1.0198412698412698);
      assert.strictEqual(r001.headwayMin, 239.14285714285714);
      assert.strictEqual(r001.headwayCV, 0.05266916932069671);
      assert.strictEqual(r001.avgOccupancyPct, 31.210621630727776);
    });

    it("supports routeId query filter on /api/routes", async () => {
      const res = await fetch(`${baseUrl}/api/routes?routeId=R002`);
      assert.strictEqual(res.status, 200);

      const json = await res.json();
      assert.strictEqual(json.data.length, 1);
      assert.strictEqual(json.data[0].routeId, "R002");
    });
  });

  describe("4. GET /api/stops", () => {
    it("returns correctly ranked stop demand preserving V1 sorting", async () => {
      const res = await fetch(`${baseUrl}/api/stops`);
      assert.strictEqual(res.status, 200);

      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.data.length, 48);

      const first = json.data[0];
      assert.ok("stopId" in first);
      assert.ok("stopName" in first);
      assert.ok("boardings" in first);
      assert.ok("alightings" in first);
      assert.ok("totalActivity" in first);
      assert.strictEqual(first.totalActivity, first.boardings + first.alightings);

      // Verify descending sort by boardings
      for (let i = 0; i < json.data.length - 1; i++) {
        const a = json.data[i];
        const b = json.data[i + 1];
        assert.ok(
          a.boardings >= b.boardings,
          `Stops must be sorted descending by boardings: ${a.boardings} vs ${b.boardings}`,
        );
      }
    });

    it("filters stops by routeId", async () => {
      const res = await fetch(`${baseUrl}/api/stops?routeId=R001`);
      assert.strictEqual(res.status, 200);

      const json = await res.json();
      assert.strictEqual(json.data.length, 4); // Route R001 has 4 stops
    });
  });

  describe("5. GET /api/analytics", () => {
    it("returns expected chart datasets (dailyDemand, delayDistribution, occupancy, routeComparison)", async () => {
      const res = await fetch(`${baseUrl}/api/analytics`);
      assert.strictEqual(res.status, 200);

      const json = await res.json();
      assert.strictEqual(json.success, true);
      const { data } = json;

      // dailyDemand
      assert.ok(Array.isArray(data.dailyDemand));
      assert.strictEqual(data.dailyDemand.length, 28);
      assert.strictEqual(data.dailyDemand[0].serviceDate, "2026-10-01");
      assert.strictEqual(data.dailyDemand[0].boardings, 760);

      // delayDistribution
      assert.ok(Array.isArray(data.delayDistribution));
      assert.ok(data.delayDistribution.length > 0);
      assert.ok("x0" in data.delayDistribution[0]);
      assert.ok("x1" in data.delayDistribution[0]);
      assert.ok("count" in data.delayDistribution[0]);
      assert.ok("isEarly" in data.delayDistribution[0]);

      // occupancy
      assert.ok(Array.isArray(data.occupancy));
      assert.strictEqual(data.occupancy.length, 12);
      assert.ok("timeWeightedOccupancy" in data.occupancy[0]);

      // routeComparison
      assert.ok(Array.isArray(data.routeComparison));
      assert.strictEqual(data.routeComparison.length, 12);
      assert.ok("boardings" in data.routeComparison[0]);
    });
  });

  describe("6. Validation & Error Handling", () => {
    it("returns HTTP 400 when routeId is unknown", async () => {
      const res = await fetch(`${baseUrl}/api/dashboard?routeId=R_NON_EXISTENT`);
      assert.strictEqual(res.status, 400);

      const json = await res.json();
      assert.strictEqual(json.success, false);
      assert.strictEqual(json.error.code, "INVALID_ROUTE");
      assert.ok(json.error.message.includes("R_NON_EXISTENT"));
    });

    it("returns HTTP 400 when serviceDate format is invalid", async () => {
      const res = await fetch(`${baseUrl}/api/dashboard?serviceDate=invalid-date`);
      assert.strictEqual(res.status, 400);

      const json = await res.json();
      assert.strictEqual(json.success, false);
      assert.strictEqual(json.error.code, "INVALID_DATE");
      assert.ok(json.error.message.includes("invalid-date"));
    });

    it("returns HTTP 400 for calendar-invalid dates (e.g. 2026-02-31)", async () => {
      const res = await fetch(`${baseUrl}/api/dashboard?serviceDate=2026-02-31`);
      assert.strictEqual(res.status, 400);

      const json = await res.json();
      assert.strictEqual(json.success, false);
      assert.strictEqual(json.error.code, "INVALID_DATE");
    });

    it("returns HTTP 200 with zero-result data when valid filters match no records", async () => {
      // Valid date outside the 28-day operating window
      const res = await fetch(`${baseUrl}/api/dashboard?serviceDate=2025-01-01`);
      assert.strictEqual(res.status, 200);

      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.data.totalTrips, 0);
      assert.strictEqual(json.data.totalBoardings, 0);
      assert.strictEqual(json.data.averageDelay, null);
    });

    it("returns HTTP 404 with standard error JSON for unknown API paths", async () => {
      const res = await fetch(`${baseUrl}/api/non-existent-endpoint`);
      assert.strictEqual(res.status, 404);

      const json = await res.json();
      assert.strictEqual(json.success, false);
      assert.strictEqual(json.error.code, "NOT_FOUND");
      assert.ok(json.error.message.includes("/api/non-existent-endpoint"));
    });
  });
});
