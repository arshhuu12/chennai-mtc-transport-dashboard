"use strict";

// ------------------------------------------
// 1. SIMULATION CONFIGURATION
// ------------------------------------------

const CONFIG = {
  seed: 2026,
  startDate: "2026-10-01",
  days: 28,
  routeCount: 12,
  busCount: 20,
  stopsPerRoute: 4,
  tripsPerRoutePerDay: 2,
};

let generatedFiles = {};

// ------------------------------------------
// 2. REPRODUCIBLE RANDOM NUMBER GENERATOR
// ------------------------------------------

function createRandomGenerator(seed) {
  let state = seed >>> 0;

  return function () {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

const random = createRandomGenerator(CONFIG.seed);

function randomInteger(min, max) {
  return Math.floor(random() * (max - min + 1)) + min;
}

// ------------------------------------------
// 3. GENERAL HELPERS
// ------------------------------------------

function formatDate(date) {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function addMinutesToTime(dateString, minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  return `${dateString}T${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}:00+05:30`;
}

function csvEscape(value) {
  const text = String(value ?? "");

  if (/[",\n\r]/.test(text)) {
    return '"' + text.replace(/"/g, '""') + '"';
  }

  return text;
}

function toCSV(columns, records) {
  const lines = [columns.join(",")];

  records.forEach((record) => {
    lines.push(columns.map((column) => csvEscape(record[column])).join(","));
  });

  return lines.join("\n");
}

// ------------------------------------------
// 4. GENERATE REFERENCE DATA
// ------------------------------------------

function generateRoutes() {
  const routes = [];

  for (let i = 1; i <= CONFIG.routeCount; i++) {
    const id = String(i).padStart(3, "0");

    routes.push({
      route_id: "R" + id,
      route_name: "Sample Route " + id,
      origin: "Sample Stop " + String((i - 1) * 4 + 1).padStart(2, "0"),
      destination: "Sample Stop " + String(i * 4).padStart(2, "0"),
    });
  }

  return routes;
}

function generateStops() {
  const stops = [];

  for (let i = 1; i <= CONFIG.routeCount * CONFIG.stopsPerRoute; i++) {
    const id = String(i).padStart(3, "0");

    stops.push({
      stop_id: "S" + id,
      stop_name: "Sample Stop " + id,
      latitude: "",
      longitude: "",
    });
  }

  return stops;
}

function generateBuses() {
  const buses = [];

  for (let i = 1; i <= CONFIG.busCount; i++) {
    const id = String(i).padStart(3, "0");

    buses.push({
      bus_id: "B" + id,
      capacity: randomInteger(40, 60),
    });
  }

  return buses;
}

// ------------------------------------------
// 5. GENERATE OPERATIONAL DATA
// ------------------------------------------

function generateOperations(routes, buses) {
  const trips = [];
  const tripStops = [];
  const observations = [];

  const start = new Date(CONFIG.startDate + "T00:00:00Z");

  for (let day = 0; day < CONFIG.days; day++) {
    const serviceDate = new Date(start);
    serviceDate.setUTCDate(start.getUTCDate() + day);

    const dateString = formatDate(serviceDate);

    routes.forEach((route, routeIndex) => {
      for (
        let tripNumber = 0;
        tripNumber < CONFIG.tripsPerRoutePerDay;
        tripNumber++
      ) {
        const tripId = "T" + String(trips.length + 1).padStart(5, "0");

        // Six routes operate in each time group.
        const group = Math.floor(routeIndex / 6);
        const position = routeIndex % 6;

        const firstBus = group === 0 ? position : position + 12;

        const secondBus = group === 0 ? position + 6 : position;

        const busIndex = tripNumber === 0 ? firstBus : secondBus;

        const bus = buses[busIndex];

        // Departure times are staggered.
        const departureMinutes =
          360 + group * 240 + position * 15 + tripNumber * 240;

        trips.push({
          trip_id: tripId,
          route_id: route.route_id,
          bus_id: bus.bus_id,
          service_date: dateString,
        });

        let onboard = 0;

        // Delay scenario: every fourth route has
        // a higher chance of delays.
        const delayedRoute = routeIndex % 4 === 0;

        const baseDelay = delayedRoute
          ? randomInteger(5, 14)
          : randomInteger(-2, 7);

        for (let sequence = 1; sequence <= CONFIG.stopsPerRoute; sequence++) {
          const stopIndex = routeIndex * CONFIG.stopsPerRoute + sequence - 1;

          const stopId = "S" + String(stopIndex + 1).padStart(3, "0");

          const scheduledMinutes = departureMinutes + (sequence - 1) * 18;

          const scheduledArrival = addMinutesToTime(
            dateString,
            scheduledMinutes,
          );

          const scheduledDeparture = addMinutesToTime(
            dateString,
            scheduledMinutes + 5,
          );

          // Delay can vary as the trip progresses.
          const actualDelay = baseDelay + randomInteger(-2, 3) * (sequence - 1);

          const actualMinutes = scheduledMinutes + actualDelay;

          const actualArrival = addMinutesToTime(
            dateString,
            Math.max(0, actualMinutes),
          );

          tripStops.push({
            trip_id: tripId,
            stop_sequence: sequence,
            stop_id: stopId,
            scheduled_arrival: scheduledArrival,
            scheduled_departure: scheduledDeparture,
          });

          let boarding = 0;
          let alighting = 0;

          if (sequence === 1) {
            // First stop: passengers board.
            boarding = randomInteger(8, 20);
          } else if (sequence === CONFIG.stopsPerRoute) {
            // Final stop: everyone remaining alights.
            alighting = onboard;
          } else {
            // Intermediate stops.
            alighting = randomInteger(0, Math.floor(onboard * 0.35));

            const passengersAfterAlighting = onboard - alighting;

            const availableCapacity = bus.capacity - passengersAfterAlighting;

            boarding = randomInteger(0, Math.min(18, availableCapacity));
          }

          onboard = onboard + boarding - alighting;

          observations.push({
            trip_id: tripId,
            stop_sequence: sequence,
            actual_arrival: actualArrival,
            boarding: boarding,
            alighting: alighting,
          });
        }
      }
    });
  }

  return {
    trips,
    tripStops,
    observations,
  };
}

// ------------------------------------------
// 6. VALIDATE GENERATED DATA
// ------------------------------------------

function validateData(data, buses) {
  const errors = [];

  const busLookup = new Map(buses.map((bus) => [bus.bus_id, bus]));

  const tripLookup = new Map(data.trips.map((trip) => [trip.trip_id, trip]));

  const observationKeys = new Set();

  data.observations.forEach((record) => {
    const key = record.trip_id + "_" + record.stop_sequence;

    if (observationKeys.has(key)) {
      errors.push("Duplicate observation: " + key);
    }

    observationKeys.add(key);
  });

  data.trips.forEach((trip) => {
    if (!busLookup.has(trip.bus_id)) {
      errors.push("Unknown bus: " + trip.bus_id);
    }
  });

  const onboardByTrip = new Map();

  data.observations.forEach((record) => {
    const trip = tripLookup.get(record.trip_id);
    const bus = trip ? busLookup.get(trip.bus_id) : null;

    if (!trip || !bus) {
      errors.push("Invalid trip or bus reference.");
      return;
    }

    if (
      record.boarding < 0 ||
      record.alighting < 0 ||
      record.alighting % 1 !== 0 ||
      record.boarding % 1 !== 0
    ) {
      errors.push("Invalid passenger count.");
      return;
    }

    const previous = onboardByTrip.get(record.trip_id) || 0;

    if (record.alighting > previous) {
      errors.push("Alighting exceeds onboard passengers: " + record.trip_id);
      return;
    }

    const current = previous + record.boarding - record.alighting;

    if (current < 0 || current > bus.capacity) {
      errors.push("Invalid occupancy: " + record.trip_id);
    }

    onboardByTrip.set(record.trip_id, current);
  });

  if (errors.length > 0) {
    throw new Error(
      "Data validation failed:\n" + errors.slice(0, 10).join("\n"),
    );
  }

  return {
    status: "Passed",
    trip_count: data.trips.length,
    observation_count: data.observations.length,
    validation_errors: 0,
  };
}

// ------------------------------------------
// 7. GENERATE AND PREPARE DOWNLOADS
// ------------------------------------------

function downloadFile(filename, content, type) {
  const blob = new Blob([content], {
    type: type + ";charset=utf-8",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

function generateDataset() {
  const routes = generateRoutes();
  const stops = generateStops();
  const buses = generateBuses();

  const operations = generateOperations(routes, buses);

  const validation = validateData(operations, buses);

  const metadata = {
    project: "Public Transport Analytics Dashboard",
    dataset_version: "1.0",
    city_context: "Chennai",
    data_strategy: "Synthetic demonstration dataset",
    simulation: {
      enabled: true,
      random_seed: CONFIG.seed,
      start_date: CONFIG.startDate,
      period_days: CONFIG.days,
      route_count: routes.length,
      bus_count: buses.length,
      trips_per_route_per_day: CONFIG.tripsPerRoutePerDay,
      stops_per_route: CONFIG.stopsPerRoute,
    },
    provenance: {
      routes: "Synthetic sample records",
      stops: "Synthetic sample records; coordinates unavailable",
      buses: "Synthetic sample records",
      trips: "Synthetic",
      scheduled_operations: "Synthetic",
      actual_arrivals: "Synthetic",
      passenger_movements: "Synthetic",
      analytical_metrics: "Derived from generated records",
    },
    validation: validation,
    limitations: [
      "Not actual Chennai MTC operational data",
      "No verified geographic coordinates",
      "Passenger movements are simulated",
      "Arrival times are simulated",
    ],
  };

  generatedFiles = {
    "routes.csv": toCSV(
      ["route_id", "route_name", "origin", "destination"],
      routes,
    ),

    "stops.csv": toCSV(
      ["stop_id", "stop_name", "latitude", "longitude"],
      stops,
    ),

    "buses.csv": toCSV(["bus_id", "capacity"], buses),

    "trips.csv": toCSV(
      ["trip_id", "route_id", "bus_id", "service_date"],
      operations.trips,
    ),

    "trip_stops.csv": toCSV(
      [
        "trip_id",
        "stop_sequence",
        "stop_id",
        "scheduled_arrival",
        "scheduled_departure",
      ],
      operations.tripStops,
    ),

    "stop_observations.csv": toCSV(
      ["trip_id", "stop_sequence", "actual_arrival", "boarding", "alighting"],
      operations.observations,
    ),

    "dataset_metadata.json": JSON.stringify(metadata, null, 4),
  };

  return {
    routes,
    stops,
    buses,
    operations,
    validation,
  };
}

// ------------------------------------------
// 8. PAGE INTERACTION
// ------------------------------------------

document
  .querySelector("#generate-button")
  .addEventListener("click", function () {
    try {
      const result = generateDataset();

      const status = document.querySelector("#status");
      const downloads = document.querySelector("#downloads");

      downloads.replaceChildren();

      status.textContent =
        "Generation successful. " +
        result.operations.trips.length +
        " trips and " +
        result.operations.observations.length +
        " stop observations validated.";

      Object.entries(generatedFiles).forEach(([filename, content]) => {
        const button = document.createElement("button");

        button.textContent = "Download " + filename;

        button.addEventListener("click", function () {
          const type = filename.endsWith(".json")
            ? "application/json"
            : "text/csv";

          downloadFile(filename, content, type);
        });

        downloads.appendChild(button);
      });

      console.log("Dataset generated:", result);
      console.log("Validation:", result.validation);
    } catch (error) {
      document.querySelector("#status").textContent =
        "Generation failed: " + error.message;

      console.error(error);
    }
  });
