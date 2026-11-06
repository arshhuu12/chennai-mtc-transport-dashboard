"use strict";

const statusElement = document.querySelector("#status");
const summaryElement = document.querySelector("#summary");
const routeResults = document.querySelector("#route-results");

async function analyseDataset() {
  try {
    statusElement.textContent = "Loading six CSV files...";

    const [routes, buses, trips, tripStops, observations] = await Promise.all([
      d3.csv("../data/routes.csv"),
      d3.csv("../data/buses.csv"),
      d3.csv("../data/trips.csv"),
      d3.csv("../data/trip_stops.csv"),
      d3.csv("../data/stop_observations.csv"),
    ]);

    // ----------------------------------
    // 1. CHECK REQUIRED COLUMNS
    // ----------------------------------

    const requirements = [
      [routes, ["route_id", "route_name"]],
      [buses, ["bus_id", "capacity"]],
      [trips, ["trip_id", "route_id", "bus_id"]],
      [tripStops, ["trip_id", "stop_sequence", "scheduled_arrival"]],
      [
        observations,
        ["trip_id", "stop_sequence", "actual_arrival", "boarding", "alighting"],
      ],
    ];

    requirements.forEach(([records, columns]) => {
      const missing = columns.filter(
        (column) => !records.columns.includes(column),
      );

      if (missing.length > 0) {
        throw new Error("Missing columns: " + missing.join(", "));
      }

      if (records.length === 0) {
        throw new Error("A required CSV file is empty.");
      }
    });

    // ----------------------------------
    // 2. CREATE LOOKUP TABLES
    // ----------------------------------

    const routeLookup = new Map(
      routes.map((route) => [route.route_id, route.route_name]),
    );

    const busLookup = new Map(
      buses.map((bus) => {
        const capacity = Number(bus.capacity);

        if (!Number.isInteger(capacity) || capacity <= 0) {
          throw new Error("Invalid bus capacity: " + bus.bus_id);
        }

        return [bus.bus_id, capacity];
      }),
    );

    const tripLookup = new Map(trips.map((trip) => [trip.trip_id, trip]));

    const scheduleLookup = new Map();

    tripStops.forEach((record) => {
      const key = record.trip_id + "_" + record.stop_sequence;

      if (scheduleLookup.has(key)) {
        throw new Error("Duplicate scheduled stop: " + key);
      }

      scheduleLookup.set(key, record);
    });

    // ----------------------------------
    // 3. VALIDATE AND JOIN OBSERVATIONS
    // ----------------------------------

    const joinedRecords = [];
    const observationKeys = new Set();

    observations.forEach((record) => {
      const key = record.trip_id + "_" + record.stop_sequence;

      if (observationKeys.has(key)) {
        throw new Error("Duplicate observation: " + key);
      }

      observationKeys.add(key);

      const trip = tripLookup.get(record.trip_id);
      const schedule = scheduleLookup.get(key);

      if (!trip || !schedule) {
        throw new Error("Missing trip or schedule reference: " + key);
      }

      const routeName = routeLookup.get(trip.route_id);
      const capacity = busLookup.get(trip.bus_id);

      if (!routeName || !capacity) {
        throw new Error("Unknown route or bus for " + record.trip_id);
      }

      const boarding = Number(record.boarding);
      const alighting = Number(record.alighting);

      if (
        !Number.isInteger(boarding) ||
        !Number.isInteger(alighting) ||
        boarding < 0 ||
        alighting < 0
      ) {
        throw new Error("Invalid passenger count: " + key);
      }

      const scheduledTime = new Date(schedule.scheduled_arrival);

      const actualTime = new Date(record.actual_arrival);

      if (
        Number.isNaN(scheduledTime.getTime()) ||
        Number.isNaN(actualTime.getTime())
      ) {
        throw new Error("Invalid arrival timestamp: " + key);
      }

      const delayMinutes = (actualTime - scheduledTime) / 60000;

      joinedRecords.push({
        trip_id: record.trip_id,
        route_id: trip.route_id,
        route_name: routeName,
        bus_id: trip.bus_id,
        capacity: capacity,
        stop_sequence: Number(record.stop_sequence),
        boarding: boarding,
        alighting: alighting,
        delay: delayMinutes,
      });
    });

    // ----------------------------------
    // 4. CALCULATE OCCUPANCY
    // ----------------------------------

    joinedRecords.sort((a, b) => {
      return (
        a.trip_id.localeCompare(b.trip_id) || a.stop_sequence - b.stop_sequence
      );
    });

    const occupancyByTrip = new Map();

    joinedRecords.forEach((record) => {
      const previous = occupancyByTrip.get(record.trip_id) || 0;

      if (record.alighting > previous) {
        throw new Error(
          "Alighting exceeds onboard passengers: " + record.trip_id,
        );
      }

      const occupancy = previous + record.boarding - record.alighting;

      if (occupancy < 0 || occupancy > record.capacity) {
        throw new Error("Invalid occupancy: " + record.trip_id);
      }

      record.occupancy = occupancy;

      record.occupancyPercent = (occupancy / record.capacity) * 100;

      occupancyByTrip.set(record.trip_id, occupancy);
    });

    // ----------------------------------
    // 5. CALCULATE OVERALL METRICS
    // ----------------------------------

    const totalTrips = trips.length;

    const totalBoardings = d3.sum(joinedRecords, (record) => record.boarding);

    const totalAlightings = d3.sum(joinedRecords, (record) => record.alighting);

    const averageDelay = d3.mean(joinedRecords, (record) => record.delay);

    const onTimeRecords = joinedRecords.filter(
      (record) => record.delay >= 0 && record.delay <= 5,
    );

    const earlyRecords = joinedRecords.filter((record) => record.delay < 0);

    const onTimePercentage =
      joinedRecords.length > 0
        ? (onTimeRecords.length / joinedRecords.length) * 100
        : 0;

    const averageOccupancy = d3.mean(
      joinedRecords,
      (record) => record.occupancyPercent,
    );

    displaySummary([
      ["Total Trips", totalTrips],
      ["Total Boardings", totalBoardings],
      ["Total Alightings", totalAlightings],
      ["Average Delay", averageDelay.toFixed(2) + " min"],
      ["On-time Arrivals", onTimePercentage.toFixed(1) + "%"],
      ["Early Arrivals", earlyRecords.length],
      ["Average Occupancy", averageOccupancy.toFixed(1) + "%"],
    ]);

    // ----------------------------------
    // 6. AGGREGATE BY ROUTE
    // ----------------------------------

    const routeGroups = d3.group(joinedRecords, (record) => record.route_id);

    const routeAnalytics = Array.from(routeGroups, ([routeId, records]) => {
      const boardings = d3.sum(records, (record) => record.boarding);

      const alightings = d3.sum(records, (record) => record.alighting);

      const avgDelay = d3.mean(records, (record) => record.delay);

      const onTimeCount = records.filter(
        (record) => record.delay >= 0 && record.delay <= 5,
      ).length;

      const avgOccupancy = d3.mean(
        records,
        (record) => record.occupancyPercent,
      );

      return {
        route_id: routeId,
        route_name: routeLookup.get(routeId),
        boardings: boardings,
        alightings: alightings,
        averageDelay: avgDelay,
        onTimePercentage: (onTimeCount / records.length) * 100,
        averageOccupancy: avgOccupancy,
      };
    });

    routeAnalytics.sort((a, b) => b.boardings - a.boardings);

    displayRouteResults(routeAnalytics);

    statusElement.textContent =
      "Analysis completed successfully. " +
      joinedRecords.length +
      " stop observations processed.";

    console.log("Overall metrics:", {
      totalTrips,
      totalBoardings,
      totalAlightings,
      averageDelay,
      onTimePercentage,
      earlyArrivals: earlyRecords.length,
      averageOccupancy,
    });

    console.table(routeAnalytics);
  } catch (error) {
    console.error("Analysis error:", error);

    statusElement.textContent = "Analysis failed: " + error.message;
  }
}

// ----------------------------------
// DISPLAY SUMMARY CARDS
// ----------------------------------

function displaySummary(metrics) {
  summaryElement.replaceChildren();

  metrics.forEach(([label, value]) => {
    const card = document.createElement("div");
    card.className = "metric";

    const heading = document.createElement("h3");
    heading.textContent = label;

    const result = document.createElement("p");
    result.textContent = value;

    card.append(heading, result);
    summaryElement.appendChild(card);
  });
}

// ----------------------------------
// DISPLAY ROUTE TABLE
// ----------------------------------

function displayRouteResults(routes) {
  routeResults.replaceChildren();

  routes.forEach((route) => {
    const row = document.createElement("tr");

    const values = [
      route.route_name,
      route.boardings,
      route.alightings,
      route.averageDelay.toFixed(2) + " min",
      route.onTimePercentage.toFixed(1) + "%",
      route.averageOccupancy.toFixed(1) + "%",
    ];

    values.forEach((value) => {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.appendChild(cell);
    });

    routeResults.appendChild(row);
  });
}

// ----------------------------------
// START ANALYSIS
// ----------------------------------

if (typeof d3 !== "undefined") {
  analyseDataset();
} else {
  statusElement.textContent =
    "D3.js unavailable. Check your internet connection.";
}
