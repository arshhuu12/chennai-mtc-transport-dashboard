// public/js/app.js
// Main client orchestrator connecting UI, state, API, and Chart.js

import api from "./api.js";
import state from "./state.js";
import charts from "./charts.js";

/**
 * Updates the backend health indicator pill in the header.
 */
async function checkBackendHealth() {
  const indicator = document.getElementById("status-indicator");
  const statusText = document.getElementById("status-text");
  try {
    const health = await api.fetchHealth();
    if (health.status === "ok") {
      indicator.className = "status-indicator online";
      statusText.textContent = "Backend Online";
    }
  } catch (err) {
    indicator.className = "status-indicator offline";
    statusText.textContent = "Backend Offline";
    console.error("Health check error:", err);
  }
}

/**
 * Shows the loading overlay/indicator.
 */
function showLoading() {
  state.setLoading(true);
  const loader = document.getElementById("loading-indicator");
  if (loader) loader.classList.add("active");
}

/**
 * Hides the loading overlay/indicator.
 */
function hideLoading() {
  state.setLoading(false);
  const loader = document.getElementById("loading-indicator");
  if (loader) loader.classList.remove("active");
}

/**
 * Displays an error banner message.
 * @param {string} message
 */
function showError(message) {
  const banner = document.getElementById("error-banner");
  const msgEl = document.getElementById("error-message");
  if (banner && msgEl) {
    msgEl.textContent = message;
    banner.classList.add("active");
  }
}

/**
 * Hides the error banner.
 */
function hideError() {
  const banner = document.getElementById("error-banner");
  if (banner) banner.classList.remove("active");
}

/**
 * Populates the route dropdown with available routes from /api/routes.
 * @param {Array<Object>} routes
 */
function populateRouteDropdown(routes) {
  const select = document.getElementById("route-filter");
  if (!select) return;

  const currentVal = select.value || "all";
  select.innerHTML = '<option value="all">All Routes (12 routes)</option>';

  for (const r of routes) {
    const opt = document.createElement("option");
    opt.value = r.routeId;
    opt.textContent = `${r.routeId} - ${r.routeName}`;
    select.appendChild(opt);
  }

  select.value = currentVal;
}

/**
 * Populates service date filter bounds from daily analytics data.
 * @param {Array<Object>} dailyDemand
 */
function setDateFilterBounds(dailyDemand) {
  const dateInput = document.getElementById("date-filter");
  if (!dateInput || !dailyDemand.length) return;

  const dates = dailyDemand.map((d) => d.serviceDate).sort();
  dateInput.min = dates[0];
  dateInput.max = dates[dates.length - 1];
}

/**
 * Updates the 7 KPI cards with backend response values.
 * @param {Object} kpis
 */
function updateKPICards(kpis = {}) {
  const setText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };

  setText(
    "kpi-total-trips",
    kpis.totalTrips !== undefined ? kpis.totalTrips.toLocaleString() : "--",
  );
  setText(
    "kpi-total-boardings",
    kpis.totalBoardings !== undefined
      ? kpis.totalBoardings.toLocaleString()
      : "--",
  );
  setText(
    "kpi-total-alightings",
    kpis.totalAlightings !== undefined
      ? kpis.totalAlightings.toLocaleString()
      : "--",
  );
  setText(
    "kpi-average-delay",
    kpis.averageDelay !== null && kpis.averageDelay !== undefined
      ? `${kpis.averageDelay.toFixed(1)} min`
      : "N/A",
  );
  setText(
    "kpi-on-time-percentage",
    kpis.onTimePercentage !== undefined
      ? `${kpis.onTimePercentage.toFixed(1)}%`
      : "--%",
  );
  setText(
    "kpi-early-arrivals",
    kpis.earlyArrivalCount !== undefined
      ? kpis.earlyArrivalCount.toLocaleString()
      : "--",
  );
  setText(
    "kpi-time-weighted-occupancy",
    kpis.timeWeightedOccupancy !== null &&
      kpis.timeWeightedOccupancy !== undefined
      ? `${kpis.timeWeightedOccupancy.toFixed(1)}%`
      : "N/A",
  );
}

/**
 * Fetches data from all REST endpoints for current filter state
 * and updates KPI cards and all 6 Chart.js charts.
 */
async function refreshDashboard() {
  const requestId = state.nextRequestId();
  hideError();
  showLoading();

  const filters = state.getFilters();

  try {
    const [dashboardRes, routesRes, stopsRes, analyticsRes] =
      await Promise.all([
        api.fetchDashboard(filters),
        api.fetchRoutes(filters),
        api.fetchStops(filters),
        api.fetchAnalytics(filters),
      ]);

    // Check if this request is still the active one (prevent race conditions)
    if (!state.isCurrentRequest(requestId)) return;

    // 1. Update KPI cards
    updateKPICards(dashboardRes.data);

    // 2. Render / Update the 6 charts
    charts.renderRouteComparisonChart(
      "chart-route-comparison",
      analyticsRes.data.routeComparison,
    );

    charts.renderStopDemandChart("chart-stop-demand", stopsRes.data);

    charts.renderDailyDemandChart(
      "chart-daily-demand",
      analyticsRes.data.dailyDemand,
    );

    charts.renderDelayDistributionChart(
      "chart-delay-distribution",
      analyticsRes.data.delayDistribution,
    );

    charts.renderRouteOccupancyChart(
      "chart-route-occupancy",
      analyticsRes.data.occupancy,
    );

    charts.renderRouteEfficiencyChart(
      "chart-route-efficiency",
      routesRes.data,
    );
  } catch (err) {
    if (state.isCurrentRequest(requestId)) {
      console.error("Dashboard refresh failed:", err);
      showError(err.message || "Failed to load dashboard data.");
    }
  } finally {
    if (state.isCurrentRequest(requestId)) {
      hideLoading();
    }
  }
}

/**
 * Sets up event listeners for filters and user interactions.
 */
function bindFilterEvents() {
  const routeSelect = document.getElementById("route-filter");
  const dateInput = document.getElementById("date-filter");
  const resetBtn = document.getElementById("reset-filters");

  if (routeSelect) {
    routeSelect.addEventListener("change", (e) => {
      state.setRouteFilter(e.target.value);
      refreshDashboard();
    });
  }

  if (dateInput) {
    dateInput.addEventListener("change", (e) => {
      state.setDateFilter(e.target.value);
      refreshDashboard();
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      state.resetFilters();
      if (routeSelect) routeSelect.value = "all";
      if (dateInput) dateInput.value = "";
      refreshDashboard();
    });
  }
}

/**
 * Initializes the entire application on DOM ready.
 */
async function initializeApp() {
  await checkBackendHealth();
  bindFilterEvents();

  // Load initial reference data (routes and date bounds)
  try {
    const [initialRoutes, initialAnalytics] = await Promise.all([
      api.fetchRoutes(),
      api.fetchAnalytics(),
    ]);

    populateRouteDropdown(initialRoutes.data);
    setDateFilterBounds(initialAnalytics.data.dailyDemand);
  } catch (err) {
    console.warn("Failed to populate initial filter options:", err);
  }

  // Load dashboard with default all-data filters
  await refreshDashboard();
}

document.addEventListener("DOMContentLoaded", initializeApp);
