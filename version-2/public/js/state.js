// public/js/state.js
// Client-side state manager for Version 2 dashboard

const state = {
  filters: {
    routeId: "all",
    serviceDate: null,
  },
  availableRoutes: [],
  availableDates: [],
  loading: false,
  error: null,
  currentRequestId: 0,
};

/**
 * Returns a copy of current filter values.
 * @returns {{ routeId: string, serviceDate: string|null }}
 */
export function getFilters() {
  return { ...state.filters };
}

/**
 * Updates the route filter.
 * @param {string} routeId
 */
export function setRouteFilter(routeId) {
  state.filters.routeId = routeId && routeId !== "" ? routeId : "all";
}

/**
 * Updates the service date filter.
 * @param {string|null} serviceDate
 */
export function setDateFilter(serviceDate) {
  state.filters.serviceDate = serviceDate && serviceDate !== "" ? serviceDate : null;
}

/**
 * Resets all filters back to initial all-data state.
 */
export function resetFilters() {
  state.filters.routeId = "all";
  state.filters.serviceDate = null;
}

/**
 * Stores available routes for dropdown population.
 * @param {Array<{ routeId: string, routeName: string }>} routes
 */
export function setAvailableRoutes(routes) {
  state.availableRoutes = Array.isArray(routes) ? [...routes] : [];
}

/**
 * Returns available routes.
 * @returns {Array}
 */
export function getAvailableRoutes() {
  return [...state.availableRoutes];
}

/**
 * Increments and returns the next request ID to prevent race conditions.
 * @returns {number}
 */
export function nextRequestId() {
  state.currentRequestId += 1;
  return state.currentRequestId;
}

/**
 * Checks if a given request ID is still the active/latest request.
 * @param {number} requestId
 * @returns {boolean}
 */
export function isCurrentRequest(requestId) {
  return state.currentRequestId === requestId;
}

/**
 * Updates loading status.
 * @param {boolean} isLoading
 */
export function setLoading(isLoading) {
  state.loading = Boolean(isLoading);
}

/**
 * Gets current loading status.
 * @returns {boolean}
 */
export function isLoading() {
  return state.loading;
}

export default {
  getFilters,
  setRouteFilter,
  setDateFilter,
  resetFilters,
  setAvailableRoutes,
  getAvailableRoutes,
  nextRequestId,
  isCurrentRequest,
  setLoading,
  isLoading,
};
