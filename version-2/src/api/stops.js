// src/api/stops.js
// Router for bus stop passenger demand and stop rankings

import { Router } from "express";
import { getOperationalRecords } from "../data.js";
import { filterRecords, calculateSum } from "../metrics.js";
import { validateQueryParams, formatSuccessResponse } from "./utils.js";

const router = Router();

router.get("/", (req, res) => {
  const filters = validateQueryParams(req, res);
  if (!filters) return;

  const records = getOperationalRecords();
  const filtered = filterRecords(records, filters);

  // Group records by stopId
  const stopGroups = new Map();
  for (const r of filtered) {
    if (!stopGroups.has(r.stopId)) {
      stopGroups.set(r.stopId, {
        stopId: r.stopId,
        stopName: r.stopName,
        records: [],
      });
    }
    stopGroups.get(r.stopId).records.push(r);
  }

  const stopList = Array.from(stopGroups.values()).map((group) => {
    const boardings = calculateSum(group.records, "boarding");
    const alightings = calculateSum(group.records, "alighting");
    return {
      stopId: group.stopId,
      stopName: group.stopName,
      boardings,
      alightings,
      totalActivity: boardings + alightings,
    };
  });

  // Preserve V1 sorting: boardings descending, tie-break by stopName ascending
  stopList.sort(
    (a, b) => b.boardings - a.boardings || a.stopName.localeCompare(b.stopName),
  );

  res.json(
    formatSuccessResponse(stopList, filters, {
      totalStops: stopList.length,
    }),
  );
});

export default router;
