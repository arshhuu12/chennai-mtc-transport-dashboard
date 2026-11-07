// src/api/routes.js
// Router for route-level performance summaries and efficiency indicators

import { Router } from "express";
import { getData, getOperationalRecords } from "../data.js";
import {
  filterRecords,
  calculateSum,
  calculateMean,
  calculateTimeWeightedOccupancy,
  calculateRouteEfficiency,
} from "../metrics.js";
import { validateQueryParams, formatSuccessResponse } from "./utils.js";

const router = Router();

router.get("/", (req, res) => {
  const filters = validateQueryParams(req, res);
  if (!filters) return;

  const data = getData();
  const allRecords = getOperationalRecords();
  const filteredRecords = filterRecords(allRecords, filters);

  // Determine subset of routes to report on
  const targetRoutes =
    filters.routeId === "all"
      ? data.routes
      : data.routes.filter((r) => r.route_id === filters.routeId);

  // Compute efficiency metrics on applicable trips subset
  const applicableTrips = filters.serviceDate
    ? data.trips.filter((t) => t.service_date === filters.serviceDate)
    : data.trips;

  const efficiencyResults = calculateRouteEfficiency({
    routes: targetRoutes,
    buses: data.buses,
    trips: applicableTrips,
    tripStops: data.tripStops,
    stopObservations: data.stopObservations,
  });

  const efficiencyMap = new Map(
    efficiencyResults.map((e) => [e.route_id, e]),
  );

  // Group filtered records by route
  const recordsByRoute = new Map();
  for (const r of filteredRecords) {
    if (!recordsByRoute.has(r.routeId)) recordsByRoute.set(r.routeId, []);
    recordsByRoute.get(r.routeId).push(r);
  }

  const routeSummaries = targetRoutes.map((route) => {
    const routeRecords = recordsByRoute.get(route.route_id) || [];
    const validDelays = routeRecords
      .map((r) => r.delayMinutes)
      .filter(Number.isFinite);

    const eff = efficiencyMap.get(route.route_id);

    const boardings = calculateSum(routeRecords, "boarding");
    const alightings = calculateSum(routeRecords, "alighting");
    const averageDelay = calculateMean(validDelays) ?? null;
    const timeWeightedOccupancy =
      calculateTimeWeightedOccupancy(routeRecords) ?? null;

    const scheduledMin =
      eff && Number.isFinite(eff.scheduledMin) ? eff.scheduledMin : null;

    const actualMin =
      eff && Number.isFinite(eff.actualMin) ? eff.actualMin : null;

    const journeyTimeRatio =
      eff && Number.isFinite(eff.journeyTimeRatio)
        ? eff.journeyTimeRatio
        : null;

    const headwayMin =
      eff && Number.isFinite(eff.headwayMin) ? eff.headwayMin : null;

    const headwayCV =
      eff && Number.isFinite(eff.headwayCV) ? eff.headwayCV : null;

    const avgOccupancyPct =
      eff && Number.isFinite(eff.avgOccupancyPct)
        ? eff.avgOccupancyPct
        : null;

    return {
      routeId: route.route_id,
      routeName: route.route_name,
      origin: route.origin || "",
      destination: route.destination || "",
      trips: new Set(routeRecords.map((r) => r.tripId)).size,
      boardings,
      alightings,
      averageDelay,
      timeWeightedOccupancy,
      scheduledMin,
      actualMin,
      journeyTimeRatio,
      headwayMin,
      headwayCV,
      avgOccupancyPct,
    };
  });

  // Sort descending by boardings, tie-break by routeId
  routeSummaries.sort(
    (a, b) => b.boardings - a.boardings || a.routeId.localeCompare(b.routeId),
  );

  res.json(
    formatSuccessResponse(routeSummaries, filters, {
      totalRoutes: routeSummaries.length,
    }),
  );
});

export default router;
