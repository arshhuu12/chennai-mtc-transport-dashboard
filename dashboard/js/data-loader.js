// File: js/data-loader.js
// Responsibility: load, validate, join and derive the dashboard's operational records.
// This module does not render UI or calculate dashboard KPIs.

window.TransitData = (() => {
  const DATA_PATH = "data/";

  function observationKey(tripId, sequence) {
    return `${tripId}_${sequence}`;
  }

  function parseTimestamp(value) {
    if (!value || !value.trim()) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  function validateColumns(fileName, rows, requiredColumns) {
    if (!rows.length) throw new Error(`${fileName} is empty.`);
    const columns = Object.keys(rows[0]);
    const missing = requiredColumns.filter((column) => !columns.includes(column));
    if (missing.length) throw new Error(`${fileName} is missing columns: ${missing.join(", ")}`);
  }

  async function load() {
    const [routes, stops, buses, trips, schedules, observations] = await Promise.all([
      d3.csv(`${DATA_PATH}routes.csv`),
      d3.csv(`${DATA_PATH}stops.csv`),
      d3.csv(`${DATA_PATH}buses.csv`),
      d3.csv(`${DATA_PATH}trips.csv`),
      d3.csv(`${DATA_PATH}trip_stops.csv`),
      d3.csv(`${DATA_PATH}stop_observations.csv`),
    ]);

    validateColumns("routes.csv", routes, ["route_id", "route_name"]);
    validateColumns("stops.csv", stops, ["stop_id", "stop_name"]);
    validateColumns("buses.csv", buses, ["bus_id", "capacity"]);
    validateColumns("trips.csv", trips, ["trip_id", "route_id", "bus_id", "service_date"]);
    validateColumns("trip_stops.csv", schedules, ["trip_id", "stop_sequence", "stop_id", "scheduled_arrival"]);
    validateColumns("stop_observations.csv", observations, ["trip_id", "stop_sequence", "actual_arrival", "boarding", "alighting"]);

    const routeMap = new Map(routes.map((route) => [route.route_id, route]));
    const stopMap = new Map(stops.map((stop) => [stop.stop_id, stop]));
    const busMap = new Map(buses.map((bus) => [bus.bus_id, Number(bus.capacity)]));
    const tripMap = new Map(trips.map((trip) => [trip.trip_id, trip]));
    const scheduleMap = new Map();
    const observationMap = new Map();

    schedules.forEach((schedule) => {
      const key = observationKey(schedule.trip_id, schedule.stop_sequence);
      if (scheduleMap.has(key)) console.warn("Duplicate schedule record:", key);
      scheduleMap.set(key, schedule);
    });

    observations.forEach((observation) => {
      const key = observationKey(observation.trip_id, observation.stop_sequence);
      if (observationMap.has(key)) console.warn("Duplicate observation record:", key);
      observationMap.set(key, observation);
    });

    const records = [];
    observations.forEach((observation) => {
      const key = observationKey(observation.trip_id, observation.stop_sequence);
      const trip = tripMap.get(observation.trip_id);
      const schedule = scheduleMap.get(key);
      if (!trip || !schedule) {
        console.warn("Unmatched observation:", key);
        return;
      }

      const route = routeMap.get(trip.route_id);
      const stop = stopMap.get(schedule.stop_id);
      const capacity = busMap.get(trip.bus_id);
      if (!route || !stop || !capacity || capacity <= 0) {
        console.warn("Invalid route, stop or bus reference:", key);
        return;
      }

      const scheduledArrival = parseTimestamp(schedule.scheduled_arrival);
      const actualArrival = parseTimestamp(observation.actual_arrival);
      const boarding = Number(observation.boarding);
      const alighting = Number(observation.alighting);
      if (!scheduledArrival || !Number.isInteger(boarding) || !Number.isInteger(alighting) || boarding < 0 || alighting < 0) {
        console.warn("Invalid observation values:", key);
        return;
      }

      records.push({
        tripId: trip.trip_id,
        routeId: trip.route_id,
        routeName: route.route_name,
        stopId: schedule.stop_id,
        stopName: stop.stop_name,
        serviceDate: trip.service_date,
        stopSequence: Number(schedule.stop_sequence),
        scheduledArrival,
        actualArrival,
        delayMinutes: actualArrival ? (actualArrival - scheduledArrival) / 60000 : null,
        boarding,
        alighting,
        capacity,
        occupancy: 0,
        occupancyPercentage: 0,
      });
    });

    records.sort((a, b) => {
      const tripComparison = a.tripId.localeCompare(b.tripId);
      return tripComparison !== 0 ? tripComparison : a.stopSequence - b.stopSequence;
    });

    const occupancyByTrip = new Map();
    records.forEach((record) => {
      const previousOccupancy = occupancyByTrip.get(record.tripId) || 0;
      const onboard = previousOccupancy + record.boarding - record.alighting;
      if (onboard < 0) console.warn("Negative occupancy detected:", record.tripId, record.stopSequence);
      if (record.alighting > previousOccupancy + record.boarding) console.warn("Alighting exceeds available passengers:", record.tripId, record.stopSequence);
      if (onboard > record.capacity) console.warn("Capacity exceeded:", record.tripId, record.stopSequence);
      record.occupancy = Math.max(0, onboard);
      record.occupancyPercentage = (record.occupancy / record.capacity) * 100;
      occupancyByTrip.set(record.tripId, record.occupancy);
    });

    return { routes, stops, buses, trips, records };
  }

  return { load };
})();
