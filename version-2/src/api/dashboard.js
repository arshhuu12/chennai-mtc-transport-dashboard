// src/api/dashboard.js
// Router for overall dashboard KPIs and performance summary

import { Router } from "express";
import { getOperationalRecords } from "../data.js";
import { filterRecords, calculateDashboardMetrics } from "../metrics.js";
import { validateQueryParams, formatSuccessResponse } from "./utils.js";

const router = Router();

router.get("/", (req, res) => {
  const filters = validateQueryParams(req, res);
  if (!filters) return;

  const records = getOperationalRecords();
  const filtered = filterRecords(records, filters);
  const metrics = calculateDashboardMetrics(filtered);

  const responseData = {
    totalTrips: metrics.totalTrips,
    totalBoardings: metrics.totalBoardings,
    totalAlightings: metrics.totalAlightings,
    averageDelay: metrics.averageDelay !== undefined ? metrics.averageDelay : null,
    onTimePercentage: metrics.onTimePercentage,
    earlyArrivalCount: metrics.earlyArrivalCount,
    timeWeightedOccupancy:
      metrics.timeWeightedOccupancy !== undefined
        ? metrics.timeWeightedOccupancy
        : null,
  };

  res.json(formatSuccessResponse(responseData, filters));
});

export default router;
