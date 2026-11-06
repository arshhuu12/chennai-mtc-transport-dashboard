"use strict";

const status = document.querySelector("#visualization-status");

const chartWidth = 900;

async function loadVisualizationData() {
  try {
    status.textContent = "Loading operational CSV files...";

    const [routes, buses, trips, schedules, observations] = await Promise.all([
      d3.csv("data/routes.csv"),
      d3.csv("data/buses.csv"),
      d3.csv("data/trips.csv"),
      d3.csv("data/trip_stops.csv"),
      d3.csv("data/stop_observations.csv"),
    ]);

    // ----------------------------------
    // 1. BUILD LOOKUP TABLES
    // ----------------------------------

    const routeLookup = new Map(
      routes.map((route) => [route.route_id, route.route_name]),
    );

    const busLookup = new Map(
      buses.map((bus) => [bus.bus_id, Number(bus.capacity)]),
    );

    const tripLookup = new Map(trips.map((trip) => [trip.trip_id, trip]));

    const scheduleLookup = new Map();

    schedules.forEach((record) => {
      const key = record.trip_id + "_" + record.stop_sequence;

      if (scheduleLookup.has(key)) {
        throw new Error("Duplicate schedule: " + key);
      }

      scheduleLookup.set(key, record);
    });

    // ----------------------------------
    // 2. JOIN AND VALIDATE OBSERVATIONS
    // ----------------------------------

    const records = observations.map((record) => {
      const key = record.trip_id + "_" + record.stop_sequence;

      const trip = tripLookup.get(record.trip_id);
      const schedule = scheduleLookup.get(key);

      if (!trip || !schedule) {
        throw new Error("Missing trip or schedule: " + key);
      }

      const routeName = routeLookup.get(trip.route_id);
      const capacity = busLookup.get(trip.bus_id);

      const boarding = Number(record.boarding);
      const alighting = Number(record.alighting);

      const scheduled = new Date(schedule.scheduled_arrival);
      const actual = new Date(record.actual_arrival);

      if (
        !routeName ||
        !Number.isInteger(capacity) ||
        capacity <= 0 ||
        !Number.isInteger(boarding) ||
        !Number.isInteger(alighting) ||
        boarding < 0 ||
        alighting < 0 ||
        Number.isNaN(scheduled.getTime()) ||
        Number.isNaN(actual.getTime())
      ) {
        throw new Error("Invalid record: " + key);
      }

      return {
        trip_id: record.trip_id,
        route_id: trip.route_id,
        route_name: routeName,
        capacity,
        stop_sequence: Number(record.stop_sequence),
        boarding,
        alighting,
        delay: (actual - scheduled) / 60000,
      };
    });

    // ----------------------------------
    // 3. CALCULATE OCCUPANCY
    // ----------------------------------

    records.sort(
      (a, b) =>
        a.trip_id.localeCompare(b.trip_id) || a.stop_sequence - b.stop_sequence,
    );

    const occupancyByTrip = new Map();

    records.forEach((record) => {
      const previous = occupancyByTrip.get(record.trip_id) || 0;

      if (record.alighting > previous) {
        throw new Error(
          "Alighting exceeds onboard passengers: " + record.trip_id,
        );
      }

      const current = previous + record.boarding - record.alighting;

      if (current < 0 || current > record.capacity) {
        throw new Error("Invalid occupancy: " + record.trip_id);
      }

      record.occupancy = current;

      record.occupancyPercent = (current / record.capacity) * 100;

      occupancyByTrip.set(record.trip_id, current);
    });

    // ----------------------------------
    // 4. GROUP DATA BY ROUTE
    // ----------------------------------

    const routeGroups = d3.group(records, (record) => record.route_id);

    const routeAnalytics = Array.from(
      routeGroups,
      ([routeId, routeRecords]) => ({
        route_id: routeId,
        route_name: routeLookup.get(routeId),

        totalBoardings: d3.sum(routeRecords, (d) => d.boarding),

        averageOccupancy: d3.mean(routeRecords, (d) => d.occupancyPercent),
      }),
    );

    // ----------------------------------
    // 5. DRAW VISUALIZATIONS
    // ----------------------------------

    drawDemandChart(routeAnalytics);
    drawDelayChart(records);
    drawOccupancyChart(routeAnalytics);

    status.textContent =
      "Successfully analysed " +
      records.length +
      " stop observations across " +
      trips.length +
      " trips and " +
      routeAnalytics.length +
      " routes.";

    console.log("Route analytics:", routeAnalytics);
  } catch (error) {
    status.textContent = "Visualization error: " + error.message;

    console.error(error);
  }
}

// ----------------------------------
// CHART 1: ROUTE DEMAND
// ----------------------------------

function drawDemandChart(data) {
  const height = Math.max(350, data.length * 45 + 100);

  const margin = {
    top: 20,
    right: 70,
    bottom: 55,
    left: 160,
  };

  const innerWidth = chartWidth - margin.left - margin.right;

  const innerHeight = height - margin.top - margin.bottom;

  const svg = d3.select("#demand-chart");

  svg.selectAll("*").remove();

  svg.attr("viewBox", `0 0 ${chartWidth} ${height}`);

  const sorted = [...data].sort((a, b) => b.totalBoardings - a.totalBoardings);

  const xScale = d3
    .scaleLinear()
    .domain([0, d3.max(sorted, (d) => d.totalBoardings) || 1])
    .nice()
    .range([0, innerWidth]);

  const yScale = d3
    .scaleBand()
    .domain(sorted.map((d) => d.route_name))
    .range([0, innerHeight])
    .padding(0.25);

  const chart = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  chart
    .selectAll(".chart-bar")
    .data(sorted)
    .join("rect")
    .attr("class", "chart-bar")
    .attr("x", 0)
    .attr("y", (d) => yScale(d.route_name))
    .attr("width", (d) => xScale(d.totalBoardings))
    .attr("height", yScale.bandwidth());

  chart
    .selectAll(".chart-label")
    .data(sorted)
    .join("text")
    .attr("class", "chart-label")
    .attr("x", (d) => xScale(d.totalBoardings) + 6)
    .attr("y", (d) => yScale(d.route_name) + yScale.bandwidth() / 2)
    .attr("dominant-baseline", "middle")
    .text((d) => d.totalBoardings);

  chart
    .append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(xScale).ticks(6));

  chart.append("g").attr("class", "axis").call(d3.axisLeft(yScale));

  chart
    .append("text")
    .attr("class", "chart-title")
    .attr("x", innerWidth / 2)
    .attr("y", innerHeight + 45)
    .attr("text-anchor", "middle")
    .text("Total Passenger Boarding Events");
}

// ----------------------------------
// CHART 2: DELAY DISTRIBUTION
// ----------------------------------

function drawDelayChart(records) {
  const width = chartWidth;
  const height = 390;

  const margin = {
    top: 25,
    right: 30,
    bottom: 65,
    left: 65,
  };

  const innerWidth = width - margin.left - margin.right;

  const innerHeight = height - margin.top - margin.bottom;

  const svg = d3.select("#delay-chart");

  svg.selectAll("*").remove();

  svg.attr("viewBox", `0 0 ${width} ${height}`);

  const delays = records.map((d) => d.delay);

  const minDelay = Math.floor(d3.min(delays));
  const maxDelay = Math.ceil(d3.max(delays));

  const xScale = d3
    .scaleLinear()
    .domain([minDelay, Math.max(minDelay + 1, maxDelay)])
    .nice()
    .range([0, innerWidth]);

  // Create 5-minute intervals.
  const bins = d3
    .bin()
    .domain(xScale.domain())
    .thresholds(
      d3.range(Math.ceil(xScale.domain()[0] / 5) * 5, xScale.domain()[1], 5),
    )(delays);

  const yScale = d3
    .scaleLinear()
    .domain([0, d3.max(bins, (d) => d.length) || 1])
    .nice()
    .range([innerHeight, 0]);

  const chart = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  chart
    .selectAll(".chart-bar")
    .data(bins)
    .join("rect")
    .attr("class", "chart-bar")
    .attr("x", (d) => xScale(d.x0) + 1)
    .attr("y", (d) => yScale(d.length))
    .attr("width", (d) => Math.max(0, xScale(d.x1) - xScale(d.x0) - 2))
    .attr("height", (d) => innerHeight - yScale(d.length));

  chart
    .append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(xScale));

  chart.append("g").attr("class", "axis").call(d3.axisLeft(yScale));

  chart
    .append("text")
    .attr("class", "chart-title")
    .attr("x", innerWidth / 2)
    .attr("y", innerHeight + 48)
    .attr("text-anchor", "middle")
    .text("Arrival Delay (Minutes)");

  chart
    .append("text")
    .attr("class", "chart-title")
    .attr("transform", "rotate(-90)")
    .attr("x", -innerHeight / 2)
    .attr("y", -45)
    .attr("text-anchor", "middle")
    .text("Number of Arrivals");
}

// ----------------------------------
// CHART 3: BUS OCCUPANCY
// ----------------------------------

function drawOccupancyChart(data) {
  const height = Math.max(350, data.length * 45 + 100);

  const margin = {
    top: 20,
    right: 70,
    bottom: 55,
    left: 160,
  };

  const innerWidth = chartWidth - margin.left - margin.right;

  const innerHeight = height - margin.top - margin.bottom;

  const svg = d3.select("#occupancy-chart");

  svg.selectAll("*").remove();

  svg.attr("viewBox", `0 0 ${chartWidth} ${height}`);

  const sorted = [...data].sort(
    (a, b) => b.averageOccupancy - a.averageOccupancy,
  );

  const xScale = d3.scaleLinear().domain([0, 100]).range([0, innerWidth]);

  const yScale = d3
    .scaleBand()
    .domain(sorted.map((d) => d.route_name))
    .range([0, innerHeight])
    .padding(0.25);

  const chart = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  chart
    .selectAll(".chart-bar")
    .data(sorted)
    .join("rect")
    .attr("class", "chart-bar")
    .attr("x", 0)
    .attr("y", (d) => yScale(d.route_name))
    .attr("width", (d) => xScale(d.averageOccupancy))
    .attr("height", yScale.bandwidth());

  chart
    .selectAll(".chart-label")
    .data(sorted)
    .join("text")
    .attr("class", "chart-label")
    .attr("x", (d) => xScale(d.averageOccupancy) + 6)
    .attr("y", (d) => yScale(d.route_name) + yScale.bandwidth() / 2)
    .attr("dominant-baseline", "middle")
    .text((d) => d.averageOccupancy.toFixed(1) + "%");

  chart
    .append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(
      d3
        .axisBottom(xScale)
        .ticks(5)
        .tickFormat((d) => d + "%"),
    );

  chart.append("g").attr("class", "axis").call(d3.axisLeft(yScale));

  chart
    .append("text")
    .attr("class", "chart-title")
    .attr("x", innerWidth / 2)
    .attr("y", innerHeight + 45)
    .attr("text-anchor", "middle")
    .text("Average Occupancy Percentage");
}

// ----------------------------------
// START APPLICATION
// ----------------------------------

if (typeof d3 !== "undefined") {
  loadVisualizationData();
} else {
  status.textContent = "D3.js is unavailable. Check your internet connection.";
}
