// public/js/api.js
// REST client for Version 2 analytics endpoints

const BASE_URL = "/api";

/**
 * Builds a query string from filter object.
 * @param {{ routeId?: string, serviceDate?: string|null }} [filters]
 * @returns {string} Query string e.g. "?routeId=R001&serviceDate=2026-10-01"
 */
function buildQueryString(filters = {}) {
  const params = new URLSearchParams();
  if (filters.routeId && filters.routeId !== "all") {
    params.set("routeId", filters.routeId);
  }
  if (filters.serviceDate) {
    params.set("serviceDate", filters.serviceDate);
  }
  const str = params.toString();
  return str ? `?${str}` : "";
}

/**
 * Generic fetch wrapper with error handling and JSON parsing.
 * @param {string} endpoint
 * @param {Object} [filters]
 * @returns {Promise<any>}
 */
async function fetchEndpoint(endpoint, filters = {}) {
  const url = `${BASE_URL}${endpoint}${buildQueryString(filters)}`;
  const response = await fetch(url);

  let payload;
  try {
    payload = await response.json();
  } catch (err) {
    throw new Error(`Failed to parse response from ${endpoint}: ${err.message}`);
  }

  if (!response.ok || payload.success === false) {
    const errorMsg =
      payload?.error?.message ||
      `HTTP error ${response.status} from ${endpoint}`;
    const error = new Error(errorMsg);
    error.code = payload?.error?.code || "HTTP_ERROR";
    error.status = response.status;
    throw error;
  }

  return payload;
}

/**
 * Checks backend health status.
 * @returns {Promise<{ status: string, name: string, version: string, timestamp: string }>}
 */
export async function fetchHealth() {
  const res = await fetch(`${BASE_URL}/health`);
  if (!res.ok) throw new Error(`Health check returned ${res.status}`);
  return res.json();
}

/**
 * Fetches overall dashboard KPIs.
 * @param {Object} [filters]
 * @returns {Promise<{ data: Object, meta: Object }>}
 */
export async function fetchDashboard(filters = {}) {
  return fetchEndpoint("/dashboard", filters);
}

/**
 * Fetches route summaries and efficiency metrics.
 * @param {Object} [filters]
 * @returns {Promise<{ data: Array<Object>, meta: Object }>}
 */
export async function fetchRoutes(filters = {}) {
  return fetchEndpoint("/routes", filters);
}

/**
 * Fetches ranked bus stop demand.
 * @param {Object} [filters]
 * @returns {Promise<{ data: Array<Object>, meta: Object }>}
 */
export async function fetchStops(filters = {}) {
  return fetchEndpoint("/stops", filters);
}

/**
 * Fetches aggregated chart datasets.
 * @param {Object} [filters]
 * @returns {Promise<{ data: { dailyDemand: Array, delayDistribution: Array, occupancy: Array, routeComparison: Array }, meta: Object }>}
 */
export async function fetchAnalytics(filters = {}) {
  return fetchEndpoint("/analytics", filters);
}

export default {
  fetchHealth,
  fetchDashboard,
  fetchRoutes,
  fetchStops,
  fetchAnalytics,
};
