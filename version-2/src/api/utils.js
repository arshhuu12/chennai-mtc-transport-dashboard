// src/api/utils.js
// Shared request validation, normalization, and standard response formatters

import { getData } from "../data.js";
import { isValidDateString } from "../validation.js";

/**
 * Extracts and validates 'routeId' and 'serviceDate' query parameters.
 * Returns { filters: { routeId, serviceDate } } on success,
 * or sends an HTTP 400 error response and returns null.
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {{ routeId: string, serviceDate: string|null }|null}
 */
export function validateQueryParams(req, res) {
  let routeId = req.query.routeId;
  let serviceDate = req.query.serviceDate;

  // Normalize routeId
  if (routeId === undefined || routeId === null) {
    routeId = "all";
  } else {
    routeId = String(routeId).trim();
    if (routeId === "" || routeId.toLowerCase() === "all") {
      routeId = "all";
    }
  }

  // Validate routeId against loaded routes
  if (routeId !== "all") {
    let knownRoutes = [];
    try {
      const data = getData();
      knownRoutes = data.routes.map((r) => r.route_id);
    } catch {
      // In case datasets aren't loaded yet
    }

    if (knownRoutes.length > 0 && !knownRoutes.includes(routeId)) {
      res.status(400).json({
        success: false,
        error: {
          code: "INVALID_ROUTE",
          message: `Unknown route ID: '${routeId}'`,
        },
      });
      return null;
    }
  }

  // Normalize and validate serviceDate
  if (serviceDate === undefined || serviceDate === null) {
    serviceDate = null;
  } else {
    serviceDate = String(serviceDate).trim();
    if (serviceDate === "") {
      serviceDate = null;
    } else if (!isValidDateString(serviceDate)) {
      res.status(400).json({
        success: false,
        error: {
          code: "INVALID_DATE",
          message: `Invalid service date format: '${serviceDate}'. Expected YYYY-MM-DD.`,
        },
      });
      return null;
    }
  }

  return { routeId, serviceDate };
}

/**
 * Wraps data into the standard API success envelope.
 *
 * @param {Object|Array} data
 * @param {{ routeId: string, serviceDate: string|null }} filters
 * @param {Object} [extraMeta]
 * @returns {Object}
 */
export function formatSuccessResponse(data, filters, extraMeta = {}) {
  return {
    success: true,
    data,
    meta: {
      filters: {
        routeId: filters.routeId,
        serviceDate: filters.serviceDate,
      },
      generatedAt: new Date().toISOString(),
      ...extraMeta,
    },
  };
}

export default {
  validateQueryParams,
  formatSuccessResponse,
};
