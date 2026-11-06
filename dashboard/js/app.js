// File: js/app.js

document.addEventListener("DOMContentLoaded", () => {
  if (typeof d3 === "undefined") {
    showError("D3.js could not be loaded. Check your internet connection.");
    return;
  }

  const DATA_PATH = "data/";

  const statusElement = document.getElementById("data-status");
  const routeFilter = document.getElementById("route-filter");
  const routeKpis = document.getElementById("route-kpis");
  const routeList = document.getElementById("route-list");
  const routeChart = d3.select("#route-chart");

  let allRecords = [];
  let allTrips = [];
  let allRoutes = [];
  let allStops = [];
  let filterController = null;

  function showError(message) {
    if (statusElement) {
      statusElement.textContent = message;
      statusElement.style.color = "red";
    }
    console.error(message);
  }

  function createStopSection() {
    if (document.getElementById("stop-analysis-section")) return;

    const section = document.createElement("section");
    section.id = "stop-analysis-section";

    const heading = document.createElement("h2");
    heading.textContent = "Bus Stop Demand Analysis";

    const description = document.createElement("p");
    description.textContent =
      "Compare passenger boardings across stops for the selected filters.";

    const chartContainer = document.createElement("div");
    chartContainer.id = "stop-chart-container";
    chartContainer.style.cssText = "width:100%;min-height:350px;";

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");

    svg.id = "stop-chart";
    svg.style.width = "100%";
    svg.style.minHeight = "350px";

    chartContainer.appendChild(svg);
    section.append(heading, description, chartContainer);

    const main = document.querySelector("main");

    if (main) {
      main.appendChild(section);
    }
  }

  async function loadData() {
    try {
      statusElement.textContent = "Loading operational data...";
      const dataset = await TransitData.load();
      allRoutes = dataset.routes;
      allStops = dataset.stops;
      allTrips = dataset.trips;
      allRecords = dataset.records;

      filterController = TransitFilters.createController({
        records: allRecords,
        routeSelect: routeFilter,
        toolbar: document.querySelector(".filter-toolbar"),
        onChange: applyFilters,
      });
      filterController.initialise(allRoutes);
      createStopSection();

      statusElement.textContent =
        `Data loaded: ${allRoutes.length} routes, ` +
        `${allTrips.length} trips and ${allRecords.length} valid observations.`;
      applyFilters();
    } catch (error) {
      showError(`Unable to load dashboard data: ${error.message}`);
    }
  }

  function getFilteredRecords() {
    return filterController ? filterController.getFilteredRecords() : [];
  }

  function applyFilters() {
    const filteredRecords = getFilteredRecords();

    const filteredTripIds = new Set(
      filteredRecords.map((record) => record.tripId),
    );

    displayKpis(filteredRecords, filteredTripIds);
    displayRouteSummary(filteredRecords);
    TransitCharts.drawRouteChart(filteredRecords);
    TransitCharts.drawStopChart(filteredRecords, routeFilter.value);
    TransitCharts.drawDailyDemandChart(filteredRecords);

    document.dispatchEvent(
      new CustomEvent("dashboard:filtered", {
        detail: { records: filteredRecords },
      }),
    );
  }


  function displayKpis(records, tripIds) {
    if (!routeKpis) return;

    // Calculation rules live in metrics.js; this function only displays results.
    const metrics = TransitMetrics.calculateDashboardMetrics(records);
    const {
      totalBoardings,
      totalAlightings,
      averageDelay,
      onTimePercentage,
      earlyArrivalCount,
      timeWeightedOccupancy,
    } = metrics;

    // 8. Prepare KPI cards.
    const kpis = [
      ["Total Trips", tripIds.size],

      ["Passenger Boardings", totalBoardings],

      ["Passenger Alightings", totalAlightings],

      [
        "Average Delay",
        averageDelay === undefined ? "N/A" : `${averageDelay.toFixed(1)} min`,
      ],

      ["On-time Arrivals", `${onTimePercentage.toFixed(1)}%`],

      ["Early Arrivals", earlyArrivalCount],

      [
        "Time-Weighted Occupancy",
        timeWeightedOccupancy === undefined
          ? "N/A"
          : `${timeWeightedOccupancy.toFixed(1)}%`,
      ],
    ];

    // Update existing KPI cards in place. Avoid clearing the container on every filter change.
    const cards = d3.select(routeKpis).selectAll(".kpi-card").data(
      kpis.map(([label, value]) => ({ label, value })), d => d.label,
    ).join(
      enter => {
        const card = enter.append("div").attr("class", "kpi-card")
          .style("opacity", 0).style("transform", "translateY(5px)");
        card.append("h3").attr("class", "kpi-value");
        card.append("p").attr("class", "kpi-label");
        return card;
      },
      update => update,
      exit => exit.transition().duration(180).style("opacity", 0).remove(),
    );
    cards.select(".kpi-value").text(d => d.value);
    cards.select(".kpi-label").text(d => d.label);
    cards.transition().duration(window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 350)
      .style("opacity", 1).style("transform", "translateY(0px)");
    routeKpis.style.display = "flex";
    routeKpis.style.flexWrap = "wrap";
    routeKpis.style.gap = "8px";
  }

  // =====================================================
  // ROUTE SUMMARY TABLE
  // =====================================================

  function displayRouteSummary(records) {
    if (!routeList) return;
    const routeSummary = TransitMetrics.calculateRouteSummaries(records);
    let table = d3.select(routeList).selectAll("table").data([null]).join("table")
      .style("width", "100%").style("border-collapse", "collapse").style("margin-top", "15px");
    table.selectAll("thead").data([null]).join("thead").selectAll("tr").data([null]).join("tr")
      .selectAll("th").data(["Route", "Passenger Boardings", "Average Delay (min)"])
      .join("th").text(d => d).style("padding", "10px").style("text-align", "left").style("background", "#edf3f9");
    const tbody = table.selectAll("tbody").data([null]).join("tbody");
    if (!routeSummary.length) {
      tbody.selectAll("tr").remove();
      routeList.querySelector(".empty-route-summary")?.remove();
      const note = document.createElement("p");
      note.className = "empty-route-summary";
      note.textContent = "No route data available for these filters.";
      routeList.appendChild(note);
      return;
    }
    routeList.querySelector(".empty-route-summary")?.remove();
    const rows = tbody.selectAll("tr").data(routeSummary, d => d.routeId).join(
      enter => enter.append("tr").style("opacity", 0),
      update => update,
      exit => exit.transition().duration(180).style("opacity", 0).remove(),
    );
    rows.selectAll("td").data(d => [
      d.routeName,
      d.boardings,
      d.averageDelay === undefined ? "N/A" : d.averageDelay.toFixed(1),
    ]).join("td").text(d => d).style("padding", "10px").style("border-bottom", "1px solid #ddd");
    rows.transition().duration(window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 300)
      .style("opacity", 1);
  }



  loadData();
});
