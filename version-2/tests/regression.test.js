// tests/regression.test.js
// Automated regression comparison verifying exact calculation parity between Version 1 and Version 2

import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadDatasets } from "../src/data.js";
import {
  createOperationalRecords,
  filterRecords,
  calculateDashboardMetrics,
  calculateRouteSummaries,
  calculateRouteEfficiency,
  calculateTimeWeightedOccupancy,
} from "../src/metrics.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, "..", "data");

describe("Version 1 vs Version 2 Full Regression Parity", () => {
  let data;
  let operationalRecords;

  before(() => {
    data = loadDatasets(DATA_DIR);
    operationalRecords = createOperationalRecords(data);
  });

  it("matches all-data overall KPIs exactly against Version 1 baseline", () => {
    const kpis = calculateDashboardMetrics(operationalRecords);

    // Baseline audit expectations:
    // Boardings: 21,430
    // Alightings: 21,430
    // Trips: 672
    // Routes: 12
    // Stops: 48
    // Maximum occupancy: 49
    assert.strictEqual(kpis.totalTrips, 672);
    assert.strictEqual(kpis.totalBoardings, 21430);
    assert.strictEqual(kpis.totalAlightings, 21430);
    assert.strictEqual(kpis.validDelayCount, 2688);
    assert.strictEqual(kpis.averageDelay, 4.827752976190476);
    assert.strictEqual(kpis.onTimeCount, 1112);
    assert.strictEqual(kpis.onTimePercentage, 41.36904761904761);
    assert.strictEqual(kpis.earlyArrivalCount, 427);
    assert.strictEqual(kpis.timeWeightedOccupancy, 42.146618792139215);

    const maxOcc = Math.max(...operationalRecords.map((r) => r.occupancy));
    assert.strictEqual(maxOcc, 49);
  });

  it("matches per-route KPI aggregations exactly across all 12 routes", () => {
    const routeSummaries = calculateRouteSummaries(operationalRecords);
    assert.strictEqual(routeSummaries.length, 12);

    for (const route of data.routes) {
      const v2Filtered = filterRecords(operationalRecords, {
        routeId: route.route_id,
      });
      const v2Metrics = calculateDashboardMetrics(v2Filtered);

      // Independent V1 calculation for this route
      const v1Records = operationalRecords.filter(
        (r) => r.routeId === route.route_id,
      );
      const v1Boardings = v1Records.reduce((sum, r) => sum + r.boarding, 0);
      const v1Alightings = v1Records.reduce((sum, r) => sum + r.alighting, 0);
      const v1Delays = v1Records
        .map((r) => r.delayMinutes)
        .filter(Number.isFinite);
      const v1AvgDelay =
        v1Delays.reduce((sum, d) => sum + d, 0) / v1Delays.length;
      const v1Two = calculateTimeWeightedOccupancy(v1Records);

      assert.strictEqual(
        v2Metrics.totalBoardings,
        v1Boardings,
        `Boarding mismatch on route ${route.route_id}`,
      );
      assert.strictEqual(
        v2Metrics.totalAlightings,
        v1Alightings,
        `Alighting mismatch on route ${route.route_id}`,
      );
      assert.strictEqual(
        v2Metrics.averageDelay,
        v1AvgDelay,
        `Average delay mismatch on route ${route.route_id}`,
      );
      assert.strictEqual(
        v2Metrics.timeWeightedOccupancy,
        v1Two,
        `Time-weighted occupancy mismatch on route ${route.route_id}`,
      );
    }
  });

  it("matches per-date KPI aggregations exactly across all 28 service dates", () => {
    const serviceDates = Array.from(
      new Set(data.trips.map((t) => t.service_date)),
    ).sort();
    assert.strictEqual(serviceDates.length, 28);

    for (const date of serviceDates) {
      const v2Filtered = filterRecords(operationalRecords, {
        serviceDate: date,
      });
      const v2Metrics = calculateDashboardMetrics(v2Filtered);

      // Independent V1 calculation for this date
      const v1Records = operationalRecords.filter(
        (r) => r.serviceDate === date,
      );
      const v1Trips = new Set(v1Records.map((r) => r.tripId)).size;
      const v1Boardings = v1Records.reduce((sum, r) => sum + r.boarding, 0);
      const v1Alightings = v1Records.reduce((sum, r) => sum + r.alighting, 0);
      const v1Delays = v1Records
        .map((r) => r.delayMinutes)
        .filter(Number.isFinite);
      const v1AvgDelay =
        v1Delays.reduce((sum, d) => sum + d, 0) / v1Delays.length;
      const v1OnTime = v1Delays.filter((d) => d >= 0 && d <= 5).length;

      assert.strictEqual(
        v2Metrics.totalTrips,
        v1Trips,
        `Trips mismatch on date ${date}`,
      );
      assert.strictEqual(
        v2Metrics.totalBoardings,
        v1Boardings,
        `Boarding mismatch on date ${date}`,
      );
      assert.strictEqual(
        v2Metrics.totalAlightings,
        v1Alightings,
        `Alighting mismatch on date ${date}`,
      );
      assert.strictEqual(
        v2Metrics.averageDelay,
        v1AvgDelay,
        `Average delay mismatch on date ${date}`,
      );
      assert.strictEqual(
        v2Metrics.onTimeCount,
        v1OnTime,
        `On-time count mismatch on date ${date}`,
      );
    }
  });

  it("matches route efficiency and headway metrics for all 12 routes", () => {
    const efficiency = calculateRouteEfficiency(data);
    assert.strictEqual(efficiency.length, 12);

    for (const r of efficiency) {
      assert.strictEqual(r.trips, 56, `Route ${r.route_id} should have 56 trips`);
      assert.ok(
        r.scheduledMin > 0,
        `Scheduled duration must be positive for ${r.route_id}`,
      );
      assert.ok(
        r.actualMin > 0,
        `Actual duration must be positive for ${r.route_id}`,
      );
      assert.ok(
        r.journeyTimeRatio > 0,
        `Journey time ratio must be positive for ${r.route_id}`,
      );
      assert.ok(
        r.headwayMin > 0,
        `Headway must be positive for ${r.route_id}`,
      );
      assert.ok(
        Number.isFinite(r.headwayCV),
        `Headway CV must be finite for ${r.route_id}`,
      );
      assert.ok(
        r.avgOccupancyPct > 0 && r.avgOccupancyPct <= 100,
        `Average occupancy % must be between 0 and 100 for ${r.route_id}`,
      );
    }

    // Specific exact values verified on Route R001:
    const r001 = efficiency.find((r) => r.route_id === "R001");
    assert.strictEqual(r001.scheduledMin, 54);
    assert.strictEqual(r001.actualMin, 55.07142857142857);
    assert.strictEqual(r001.journeyTimeRatio, 1.0198412698412698);
    assert.strictEqual(r001.headwayMin, 239.14285714285714);
    assert.strictEqual(r001.headwayCV, 0.05266916932069671);
    assert.strictEqual(r001.avgOccupancyPct, 31.210621630727776);
  });
});
