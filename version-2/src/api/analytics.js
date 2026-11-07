// src/api/analytics.js
// Router providing visualization datasets matching Version 1 chart specifications

import { Router } from "express";
import { getOperationalRecords } from "../data.js";
import { filterRecords, calculateSum, calculateMean } from "../metrics.js";
import { validateQueryParams, formatSuccessResponse } from "./utils.js";

const router = Router();

/**
 * Creates 5-minute histogram bins matching Version 1 D3 d3.bin() implementation.
 * @param {number[]} delayValues
 * @returns {Array<Object>}
 */
function createDelayHistogram(delayValues) {
  if (!delayValues.length) return [];

  const minVal = Math.min(0, Math.min(...delayValues));
  const maxVal = Math.max(0, Math.max(...delayValues));

  const start = Math.floor(minVal / 5) * 5;
  const end = Math.ceil(maxVal / 5) * 5 || 5;

  const bins = [];
  for (let x0 = start; x0 < end; x0 += 5) {
    const x1 = x0 + 5;
    const isLastBin = x1 >= end;

    const count = delayValues.filter((v) =>
      isLastBin ? v >= x0 && v <= x1 : v >= x0 && v < x1,
    ).length;

    bins.push({
      x0,
      x1,
      label: `${x0} to ${x1} min`,
      count,
      isEarly: x0 < 0,
    });
  }

  return bins;
}

/**
 * Computes per-route time-weighted occupancy matching Version 1 drawOccupancyChart.
 * @param {Array<Object>} records
 * @returns {Array<Object>}
 */
function calculateRouteOccupancyChartData(records) {
  const tripGroups = new Map();
  for (const r of records) {
    if (!tripGroups.has(r.tripId)) tripGroups.set(r.tripId, []);
    tripGroups.get(r.tripId).push(r);
  }

  const totals = new Map();

  for (const [, items] of tripGroups) {
    const sorted = [...items].sort((a, b) => a.stopSequence - b.stopSequence);

    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i];
      const b = sorted[i + 1];

      if (
        !(a.actualArrival instanceof Date) ||
        !(b.actualArrival instanceof Date) ||
        !Number.isFinite(a.actualArrival.getTime()) ||
        !Number.isFinite(b.actualArrival.getTime())
      ) {
        continue;
      }

      const mins = (b.actualArrival.getTime() - a.actualArrival.getTime()) / 60000;
      const occ = Number(a.occupancy);
      const cap = Number(a.capacity);

      if (mins <= 0 || !Number.isFinite(occ) || !Number.isFinite(cap) || cap <= 0) {
        continue;
      }

      if (!totals.has(a.routeId)) {
        totals.set(a.routeId, {
          routeId: a.routeId,
          routeName: a.routeName,
          passengerMinutes: 0,
          capacityMinutes: 0,
        });
      }

      const t = totals.get(a.routeId);
      t.passengerMinutes += occ * mins;
      t.capacityMinutes += cap * mins;
    }
  }

  const result = Array.from(totals.values()).map((t) => ({
    routeId: t.routeId,
    routeName: t.routeName,
    timeWeightedOccupancy:
      t.capacityMinutes > 0
        ? (t.passengerMinutes / t.capacityMinutes) * 100
        : 0,
  }));

  // Sort descending by time-weighted occupancy
  result.sort((a, b) => b.timeWeightedOccupancy - a.timeWeightedOccupancy);
  return result;
}

router.get("/", (req, res) => {
  const filters = validateQueryParams(req, res);
  if (!filters) return;

  const records = getOperationalRecords();
  const filtered = filterRecords(records, filters);

  // 1. Daily Passenger Demand (chronologically sorted)
  const dailyGroups = new Map();
  for (const r of filtered) {
    if (!dailyGroups.has(r.serviceDate)) {
      dailyGroups.set(r.serviceDate, []);
    }
    dailyGroups.get(r.serviceDate).push(r);
  }

  const dailyDemand = Array.from(dailyGroups.entries())
    .map(([serviceDate, items]) => ({
      serviceDate,
      boardings: calculateSum(items, "boarding"),
      alightings: calculateSum(items, "alighting"),
    }))
    .sort((a, b) => a.serviceDate.localeCompare(b.serviceDate));

  // 2. Arrival Delay Distribution (5-minute bins)
  const delayValues = filtered
    .map((r) => r.delayMinutes)
    .filter(Number.isFinite);
  const delayDistribution = createDelayHistogram(delayValues);

  // 3. Time-Weighted Bus Occupancy by Route
  const occupancy = calculateRouteOccupancyChartData(filtered);

  // 4. Route Performance Comparison (boardings by route, sorted descending)
  const routeGroups = new Map();
  for (const r of filtered) {
    if (!routeGroups.has(r.routeId)) {
      routeGroups.set(r.routeId, {
        routeId: r.routeId,
        routeName: r.routeName,
        records: [],
      });
    }
    routeGroups.get(r.routeId).records.push(r);
  }

  const routeComparison = Array.from(routeGroups.values())
    .map((g) => ({
      routeId: g.routeId,
      routeName: g.routeName,
      boardings: calculateSum(g.records, "boarding"),
      alightings: calculateSum(g.records, "alighting"),
      averageDelay:
        calculateMean(
          g.records.map((r) => r.delayMinutes).filter(Number.isFinite),
        ) ?? null,
    }))
    .sort((a, b) => b.boardings - a.boardings);

  const analyticsData = {
    dailyDemand,
    delayDistribution,
    occupancy,
    routeComparison,
  };

  res.json(formatSuccessResponse(analyticsData, filters));
});

export default router;
