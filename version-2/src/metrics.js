// src/metrics.js
// Calculation engine for Chennai MTC Analytics Dashboard - Version 2
// Provides pure mathematical functions strictly matching Version 1 definitions.

export const ON_TIME_MAX_DELAY_MINUTES = 5;

/**
 * Calculates arrival delay in minutes.
 * Negative value indicates early arrival; positive indicates delay.
 * Returns null if actualArrival is missing or unparseable.
 *
 * @param {string|Date} scheduledArrival
 * @param {string|Date} actualArrival
 * @returns {number|null} Delay in minutes or null
 */
export function calculateDelay(scheduledArrival, actualArrival) {
  if (!scheduledArrival || !actualArrival) return null;

  const schedTime =
    scheduledArrival instanceof Date
      ? scheduledArrival.getTime()
      : Date.parse(scheduledArrival);

  const actTime =
    actualArrival instanceof Date
      ? actualArrival.getTime()
      : Date.parse(actualArrival);

  if (!Number.isFinite(schedTime) || !Number.isFinite(actTime)) {
    return null;
  }

  return (actTime - schedTime) / 60000;
}

/**
 * Calculates the sum of a numeric field across records.
 *
 * @param {Array<Object>} records
 * @param {string} field
 * @returns {number}
 */
export function calculateSum(records, field) {
  if (!Array.isArray(records) || !records.length) return 0;
  return records.reduce((total, record) => {
    const val = Number(record[field]);
    return total + (Number.isFinite(val) ? val : 0);
  }, 0);
}

/**
 * Calculates the arithmetic mean of an array of numbers.
 * Returns undefined if valid numbers array is empty (preserving V1 behaviour).
 *
 * @param {Array<number>} values
 * @returns {number|undefined}
 */
export function calculateMean(values) {
  if (!Array.isArray(values)) return undefined;
  const valid = values.filter(Number.isFinite);
  if (!valid.length) return undefined;
  return valid.reduce((sum, v) => sum + v, 0) / valid.length;
}

/**
 * Calculates sample standard deviation (Bessel's correction: N - 1).
 * Returns NaN if values length is <= 1.
 *
 * @param {Array<number>} values
 * @returns {number}
 */
export function calculateSampleStandardDeviation(values) {
  if (!Array.isArray(values) || values.length <= 1) return NaN;
  const m = calculateMean(values);
  if (m === undefined) return NaN;
  const varianceSum = values.reduce((sum, v) => sum + Math.pow(v - m, 2), 0);
  return Math.sqrt(varianceSum / (values.length - 1));
}

/**
 * Joins normalized CSV entities into unified operational records,
 * deriving delay, cumulative onboard occupancy, and occupancy percentage.
 * Matches V1 data-loader.js logic exactly.
 *
 * @param {Object} data - { routes, stops, buses, trips, tripStops, stopObservations }
 * @returns {Array<Object>} Unified operational records
 */
export function createOperationalRecords(data) {
  if (!data) return [];

  const routeMap = new Map((data.routes || []).map((r) => [r.route_id, r]));
  const stopMap = new Map((data.stops || []).map((s) => [s.stop_id, s]));
  const busMap = new Map((data.buses || []).map((b) => [b.bus_id, Number(b.capacity)]));
  const tripMap = new Map((data.trips || []).map((t) => [t.trip_id, t]));
  const scheduleMap = new Map();

  for (const s of data.tripStops || []) {
    scheduleMap.set(`${s.trip_id}_${s.stop_sequence}`, s);
  }

  const records = [];

  for (const obs of data.stopObservations || []) {
    const key = `${obs.trip_id}_${obs.stop_sequence}`;
    const trip = tripMap.get(obs.trip_id);
    const schedule = scheduleMap.get(key);
    if (!trip || !schedule) continue;

    const route = routeMap.get(trip.route_id);
    const stop = stopMap.get(schedule.stop_id);
    const capacity = busMap.get(trip.bus_id);
    if (!route || !stop || !capacity || capacity <= 0) continue;

    const schedArrival =
      schedule.scheduled_arrival_time instanceof Date &&
      Number.isFinite(schedule.scheduled_arrival_time.getTime())
        ? schedule.scheduled_arrival_time
        : new Date(schedule.scheduled_arrival);

    const actArrival =
      obs.actual_arrival_time instanceof Date &&
      Number.isFinite(obs.actual_arrival_time.getTime())
        ? obs.actual_arrival_time
        : obs.actual_arrival
          ? new Date(obs.actual_arrival)
          : null;

    if (
      !schedArrival ||
      Number.isNaN(schedArrival.getTime()) ||
      !Number.isInteger(obs.boarding) ||
      !Number.isInteger(obs.alighting) ||
      obs.boarding < 0 ||
      obs.alighting < 0
    ) {
      continue;
    }

    const delayMinutes = calculateDelay(schedArrival, actArrival);

    records.push({
      tripId: trip.trip_id,
      routeId: trip.route_id,
      routeName: route.route_name,
      stopId: schedule.stop_id,
      stopName: stop.stop_name,
      serviceDate: trip.service_date,
      stopSequence: Number(schedule.stop_sequence),
      scheduledArrival: schedArrival,
      actualArrival: actArrival,
      delayMinutes,
      boarding: obs.boarding,
      alighting: obs.alighting,
      capacity,
      occupancy: 0,
      occupancyPercentage: 0,
    });
  }

  // Sort by tripId ascending, then stopSequence ascending
  records.sort((a, b) => {
    const tripComp = a.tripId.localeCompare(b.tripId);
    return tripComp !== 0 ? tripComp : a.stopSequence - b.stopSequence;
  });

  // Calculate sequential occupancy per trip
  const occupancyByTrip = new Map();
  for (const record of records) {
    const prev = occupancyByTrip.get(record.tripId) || 0;
    const onboard = prev + record.boarding - record.alighting;
    record.occupancy = Math.max(0, onboard);
    record.occupancyPercentage = (record.occupancy / record.capacity) * 100;
    occupancyByTrip.set(record.tripId, record.occupancy);
  }

  return records;
}

/**
 * Filters records by route and service date.
 * Preserves V1 filter semantics:
 * - routeId: "all" or falsy returns all routes
 * - serviceDate: falsy returns all dates
 *
 * @param {Array<Object>} records
 * @param {{ routeId?: string, serviceDate?: string }} filters
 * @returns {Array<Object>} Filtered copy of records
 */
export function filterRecords(records, filters = {}) {
  if (!Array.isArray(records)) return [];
  const selectedRoute = filters.routeId;
  const selectedDate = filters.serviceDate;

  return records.filter((r) => {
    const routeMatches =
      !selectedRoute || selectedRoute === "all" || r.routeId === selectedRoute;
    const dateMatches = !selectedDate || r.serviceDate === selectedDate;
    return routeMatches && dateMatches;
  });
}

/**
 * Calculates time-weighted bus occupancy percentage across trip segments.
 *
 * Formula: (sum(occupancy * durationMinutes) / sum(capacity * durationMinutes)) * 100
 * Only consecutive stops with positive durationMinutes (> 0) and valid timestamps contribute.
 * Returns undefined if totalCapacityMinutes is 0.
 *
 * @param {Array<Object>} records
 * @returns {number|undefined} Time-weighted occupancy percentage
 */
export function calculateTimeWeightedOccupancy(records) {
  if (!Array.isArray(records) || !records.length) return undefined;

  const tripGroups = new Map();
  for (const record of records) {
    if (!tripGroups.has(record.tripId)) tripGroups.set(record.tripId, []);
    tripGroups.get(record.tripId).push(record);
  }

  let totalPassengerMinutes = 0;
  let totalCapacityMinutes = 0;

  for (const [, tripRecords] of tripGroups) {
    const sorted = [...tripRecords].sort(
      (a, b) => a.stopSequence - b.stopSequence,
    );

    for (let i = 0; i < sorted.length - 1; i++) {
      const current = sorted[i];
      const next = sorted[i + 1];

      if (
        !(current.actualArrival instanceof Date) ||
        !(next.actualArrival instanceof Date) ||
        !Number.isFinite(current.actualArrival.getTime()) ||
        !Number.isFinite(next.actualArrival.getTime())
      ) {
        continue;
      }

      const durationMinutes =
        (next.actualArrival.getTime() - current.actualArrival.getTime()) / 60000;
      if (durationMinutes <= 0) continue;

      const occ = Number(current.occupancy);
      const cap = Number(current.capacity);
      if (!Number.isFinite(occ) || !Number.isFinite(cap) || cap <= 0) continue;

      totalPassengerMinutes += occ * durationMinutes;
      totalCapacityMinutes += cap * durationMinutes;
    }
  }

  if (totalCapacityMinutes === 0) return undefined;
  return (totalPassengerMinutes / totalCapacityMinutes) * 100;
}

/**
 * Calculates all summary dashboard KPIs from operational records.
 * Matches V1 TransitMetrics.calculateDashboardMetrics.
 *
 * @param {Array<Object>} records
 * @param {number} [onTimeThreshold] - Threshold in minutes (defaults to ON_TIME_MAX_DELAY_MINUTES = 5)
 * @returns {Object} Comprehensive KPIs
 */
export function calculateDashboardMetrics(
  records,
  onTimeThreshold = ON_TIME_MAX_DELAY_MINUTES,
) {
  if (!Array.isArray(records) || !records.length) {
    return {
      totalTrips: 0,
      totalBoardings: 0,
      totalAlightings: 0,
      averageDelay: undefined,
      validDelayCount: 0,
      onTimeCount: 0,
      onTimePercentage: 0,
      earlyArrivalCount: 0,
      timeWeightedOccupancy: undefined,
    };
  }

  const tripIds = new Set(records.map((r) => r.tripId));
  const validDelayRecords = records.filter((r) =>
    Number.isFinite(r.delayMinutes),
  );
  const delays = validDelayRecords.map((r) => r.delayMinutes);

  const onTimeCount = delays.filter(
    (delay) => delay >= 0 && delay <= onTimeThreshold,
  ).length;

  const earlyArrivalCount = delays.filter((delay) => delay < 0).length;

  return {
    totalTrips: tripIds.size,
    totalBoardings: calculateSum(records, "boarding"),
    totalAlightings: calculateSum(records, "alighting"),
    averageDelay: calculateMean(delays),
    validDelayCount: validDelayRecords.length,
    onTimeCount,
    onTimePercentage: delays.length ? (onTimeCount / delays.length) * 100 : 0,
    earlyArrivalCount,
    timeWeightedOccupancy: calculateTimeWeightedOccupancy(records),
  };
}

/**
 * Calculates route performance summaries (boardings and average delay),
 * sorted descending by passenger boardings.
 * Matches V1 TransitMetrics.calculateRouteSummaries.
 *
 * @param {Array<Object>} records
 * @returns {Array<Object>}
 */
export function calculateRouteSummaries(records) {
  if (!Array.isArray(records) || !records.length) return [];

  const routeGroups = new Map();
  for (const r of records) {
    if (!routeGroups.has(r.routeId)) routeGroups.set(r.routeId, []);
    routeGroups.get(r.routeId).push(r);
  }

  return Array.from(routeGroups, ([routeId, routeRecords]) => {
    const validDelays = routeRecords
      .map((r) => r.delayMinutes)
      .filter(Number.isFinite);

    return {
      routeId,
      routeName: routeRecords[0].routeName,
      boardings: calculateSum(routeRecords, "boarding"),
      averageDelay: calculateMean(validDelays),
    };
  }).sort((a, b) => b.boardings - a.boardings);
}

/**
 * Calculates route efficiency indicators from route-efficiency.js:
 * - scheduledMin: mean scheduled journey duration (start to end stop)
 * - actualMin: mean actual journey duration (start to end stop)
 * - journeyTimeRatio: actualMin / scheduledMin
 * - headwayMin: mean gap between consecutive departures on same route & date
 * - headwayCV: sample standard deviation of headways / headwayMin
 * - avgOccupancyPct: mean load % across stops
 *
 * @param {Object} data - { routes, buses, trips, tripStops, stopObservations }
 * @returns {Array<Object>} Route efficiency metrics per route
 */
export function calculateRouteEfficiency(data) {
  if (!data) return [];

  const capacity = new Map(
    (data.buses || []).map((b) => [b.bus_id, Number(b.capacity)]),
  );
  const tripById = new Map((data.trips || []).map((t) => [t.trip_id, t]));
  const obsByKey = new Map(
    (data.stopObservations || []).map((o) => [
      `${o.trip_id}|${o.stop_sequence}`,
      o,
    ]),
  );

  const stopsByTrip = new Map();
  for (const ts of data.tripStops || []) {
    if (!stopsByTrip.has(ts.trip_id)) stopsByTrip.set(ts.trip_id, []);
    stopsByTrip.get(ts.trip_id).push(ts);
  }

  const tripRows = [];

  for (const [tripId, stops] of stopsByTrip) {
    const trip = tripById.get(tripId);
    if (!trip) continue;

    stops.sort((a, b) => Number(a.stop_sequence) - Number(b.stop_sequence));
    const first = stops[0];
    const last = stops[stops.length - 1];

    const oFirst = obsByKey.get(`${tripId}|${first.stop_sequence}`);
    const oLast = obsByKey.get(`${tripId}|${last.stop_sequence}`);
    if (!oFirst || !oLast) continue;

    const cap = capacity.get(trip.bus_id);
    let load = 0;
    let occSum = 0;
    let n = 0;

    for (const s of stops) {
      const o = obsByKey.get(`${tripId}|${s.stop_sequence}`);
      if (!o) continue;
      load += Number(o.boarding) - Number(o.alighting);
      occSum += (load / cap) * 100;
      n++;
    }

    const schedArrivalFirst = new Date(first.scheduled_arrival).getTime();
    const schedArrivalLast = new Date(last.scheduled_arrival).getTime();
    const actArrivalFirst = new Date(oFirst.actual_arrival).getTime();
    const actArrivalLast = new Date(oLast.actual_arrival).getTime();

    const departure = first.scheduled_departure || first.scheduled_arrival;

    tripRows.push({
      route_id: trip.route_id,
      service_date: trip.service_date,
      departure,
      scheduledMin: (schedArrivalLast - schedArrivalFirst) / 60000,
      actualMin: (actArrivalLast - actArrivalFirst) / 60000,
      occupancyPct: n ? occSum / n : NaN,
    });
  }

  return (data.routes || []).map((route) => {
    const rows = tripRows.filter((r) => r.route_id === route.route_id);

    const dateGroups = new Map();
    for (const r of rows) {
      if (!dateGroups.has(r.service_date)) dateGroups.set(r.service_date, []);
      dateGroups.get(r.service_date).push(r);
    }

    const gaps = [];
    for (const [, list] of dateGroups) {
      list.sort(
        (a, b) => new Date(a.departure).getTime() - new Date(b.departure).getTime(),
      );
      for (let i = 1; i < list.length; i++) {
        const gapMs =
          new Date(list[i].departure).getTime() -
          new Date(list[i - 1].departure).getTime();
        gaps.push(gapMs / 60000);
      }
    }

    const meanGap = calculateMean(gaps) ?? NaN;
    const sdGap = gaps.length > 1 ? calculateSampleStandardDeviation(gaps) : NaN;
    const meanSched = calculateMean(rows.map((r) => r.scheduledMin)) ?? NaN;
    const meanActual = calculateMean(rows.map((r) => r.actualMin)) ?? NaN;

    return {
      route_id: route.route_id,
      route_name: route.route_name,
      trips: rows.length,
      scheduledMin: meanSched,
      actualMin: meanActual,
      journeyTimeRatio: meanSched > 0 ? meanActual / meanSched : NaN,
      headwayMin: meanGap,
      headwayCV: Number.isFinite(meanGap) && meanGap > 0 ? sdGap / meanGap : NaN,
      avgOccupancyPct: calculateMean(rows.map((r) => r.occupancyPct)) ?? NaN,
    };
  });
}

export default {
  ON_TIME_MAX_DELAY_MINUTES,
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
};
