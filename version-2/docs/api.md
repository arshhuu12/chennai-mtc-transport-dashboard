# Chennai MTC Transport Analytics — Version 2 REST API Documentation

This document describes all implemented REST API endpoints in Version 2.

All API routes are served under the `/api` prefix and return JSON payloads.

---

## 1. Response Formats & Standards

### Standard Success Response

Successful analytical requests return an HTTP 200 status code with a standard JSON envelope:

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "filters": {
      "routeId": "all",
      "serviceDate": null
    },
    "generatedAt": "2026-11-07T05:30:00.000Z"
  }
}
```

### Standard Error Response

When an error occurs (such as an unknown route, malformed date, or non-existent endpoint), the server returns an appropriate HTTP 4xx or 5xx status code with an error envelope:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description of the error."
  }
}
```

### Standard Error Codes & HTTP Statuses

| HTTP Status | Error Code | Description |
|---|---|---|
| **400 Bad Request** | `INVALID_ROUTE` | The requested `routeId` does not exist in the route catalog (e.g., `routeId=R999`). |
| **400 Bad Request** | `INVALID_DATE` | The requested `serviceDate` is not in `YYYY-MM-DD` format or represents an invalid calendar date (e.g., `2026-02-31`). |
| **404 Not Found** | `NOT_FOUND` | The requested API route does not exist (e.g., `GET /api/unknown`). |
| **500 Internal Error** | `INTERNAL_SERVER_ERROR` | An unexpected server error occurred during processing. |

---

## 2. Common Query Parameters

The analytical endpoints (`/api/dashboard`, `/api/routes`, `/api/stops`, `/api/analytics`) accept the following optional query parameters:

| Parameter | Type | Default | Description | Example |
|---|---|---|---|---|
| `routeId` | `string` | `"all"` | Filter by a specific route ID. Pass `"all"` or omit to include all routes. | `?routeId=R001` |
| `serviceDate` | `string` | `null` | Filter by an operational service date in `YYYY-MM-DD` format. | `?serviceDate=2026-10-01` |

---

## 3. Endpoints

### 1. Health Check

Returns the operational status and metadata of the backend server.

- **URL:** `/api/health`
- **Method:** `GET`
- **Authentication:** None
- **Query Parameters:** None

#### Response: `200 OK`

```json
{
  "status": "ok",
  "name": "chennai-mtc-dashboard-v2",
  "version": "2.0.0",
  "environment": "development",
  "timestamp": "2026-11-07T05:30:00.000Z"
}
```

---

### 2. Dashboard Key Performance Indicators (KPIs)

Calculates the 7 core operational summary metrics across the filtered dataset.

- **URL:** `/api/dashboard`
- **Method:** `GET`
- **Authentication:** None
- **Query Parameters:** `routeId` (optional), `serviceDate` (optional)

#### Example Request: All Data (No Filters)

`GET /api/dashboard`

#### Response: `200 OK`

```json
{
  "success": true,
  "data": {
    "totalTrips": 672,
    "totalBoardings": 21430,
    "totalAlightings": 21430,
    "averageDelay": 4.827752976190476,
    "onTimePercentage": 41.36904761904761,
    "earlyArrivalCount": 427,
    "timeWeightedOccupancy": 42.146618792139215
  },
  "meta": {
    "filters": {
      "routeId": "all",
      "serviceDate": null
    },
    "generatedAt": "2026-11-07T05:30:00.000Z"
  }
}
```

#### Example Request: Filtered by Route & Date

`GET /api/dashboard?routeId=R001&serviceDate=2026-10-01`

#### Response: `200 OK`

```json
{
  "success": true,
  "data": {
    "totalTrips": 2,
    "totalBoardings": 36,
    "totalAlightings": 36,
    "averageDelay": 5.5,
    "onTimePercentage": 37.5,
    "earlyArrivalCount": 1,
    "timeWeightedOccupancy": 32.8
  },
  "meta": {
    "filters": {
      "routeId": "R001",
      "serviceDate": "2026-10-01"
    },
    "generatedAt": "2026-11-07T05:30:00.000Z"
  }
}
```

#### Example Response: Valid Date With Zero Matching Records

`GET /api/dashboard?serviceDate=2026-11-15`

```json
{
  "success": true,
  "data": {
    "totalTrips": 0,
    "totalBoardings": 0,
    "totalAlightings": 0,
    "averageDelay": null,
    "onTimePercentage": 0,
    "earlyArrivalCount": 0,
    "timeWeightedOccupancy": null
  },
  "meta": {
    "filters": {
      "routeId": "all",
      "serviceDate": "2026-11-15"
    },
    "generatedAt": "2026-11-07T05:30:00.000Z"
  }
}
```

---

### 3. Route Performance & Efficiency

Returns performance summaries for each route, sorted descending by total passenger boardings. Includes scheduled vs. actual transit durations and headway regularity indicators.

- **URL:** `/api/routes`
- **Method:** `GET`
- **Authentication:** None
- **Query Parameters:** `routeId` (optional), `serviceDate` (optional)

#### Example Request

`GET /api/routes`

#### Response: `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "routeId": "R005",
      "routeName": "Tambaram - Broadway",
      "origin": "Tambaram",
      "destination": "Broadway",
      "trips": 56,
      "boardings": 2870,
      "alightings": 2870,
      "averageDelay": 4.1,
      "timeWeightedOccupancy": 46.2,
      "scheduledMin": 68.0,
      "actualMin": 72.1,
      "journeyTimeRatio": 1.06,
      "headwayMin": 15.0,
      "headwayCV": 0.18,
      "avgOccupancyPct": 46.2
    },
    {
      "routeId": "R001",
      "routeName": "Central - T.Nagar",
      "origin": "Central",
      "destination": "T.Nagar",
      "trips": 56,
      "boardings": 1690,
      "alightings": 1690,
      "averageDelay": 4.5,
      "timeWeightedOccupancy": 38.4,
      "scheduledMin": 54.0,
      "actualMin": 58.5,
      "journeyTimeRatio": 1.083,
      "headwayMin": 15.0,
      "headwayCV": 0.21,
      "avgOccupancyPct": 38.4
    }
  ],
  "meta": {
    "filters": {
      "routeId": "all",
      "serviceDate": null
    },
    "generatedAt": "2026-11-07T05:30:00.000Z",
    "totalRoutes": 12
  }
}
```

---

### 4. Stop Passenger Demand

Returns bus stops with aggregated passenger boardings and alightings, sorted descending by passenger boardings (matching Version 1 ordering).

- **URL:** `/api/stops`
- **Method:** `GET`
- **Authentication:** None
- **Query Parameters:**
  - `routeId` (optional): Filter stops served by a specific route.
  - `serviceDate` (optional): Filter stop activity by service date.
  - `limit` (optional, integer): Maximum number of stops to return.

#### Example Request

`GET /api/stops?limit=3`

#### Response: `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "stopId": "S001",
      "stopName": "Central Railway Station",
      "boardings": 1845,
      "alightings": 1620,
      "totalActivity": 3465
    },
    {
      "stopId": "S012",
      "stopName": "T.Nagar Bus Terminus",
      "boardings": 1710,
      "alightings": 1750,
      "totalActivity": 3460
    },
    {
      "stopId": "S005",
      "stopName": "Guindy Railway Station",
      "boardings": 1420,
      "alightings": 1390,
      "totalActivity": 2810
    }
  ],
  "meta": {
    "filters": {
      "routeId": "all",
      "serviceDate": null
    },
    "generatedAt": "2026-11-07T05:30:00.000Z",
    "totalStops": 3
  }
}
```

---

### 5. Visualization Analytics

Returns pre-processed datasets tailored for direct consumption by Chart.js charts.

- **URL:** `/api/analytics`
- **Method:** `GET`
- **Authentication:** None
- **Query Parameters:** `routeId` (optional), `serviceDate` (optional)

#### Example Request

`GET /api/analytics`

#### Response: `200 OK`

```json
{
  "success": true,
  "data": {
    "dailyDemand": [
      {
        "serviceDate": "2026-10-01",
        "boardings": 760,
        "alightings": 760
      },
      {
        "serviceDate": "2026-10-02",
        "boardings": 780,
        "alightings": 780
      }
    ],
    "delayDistribution": [
      {
        "x0": -10,
        "x1": -5,
        "label": "-10 to -5 min",
        "count": 48,
        "isEarly": true
      },
      {
        "x0": -5,
        "x1": 0,
        "label": "-5 to 0 min",
        "count": 379,
        "isEarly": true
      },
      {
        "x0": 0,
        "x1": 5,
        "label": "0 to 5 min",
        "count": 1112,
        "isEarly": false
      },
      {
        "x0": 5,
        "x1": 10,
        "label": "5 to 10 min",
        "count": 720,
        "isEarly": false
      }
    ],
    "occupancy": [
      {
        "routeId": "R005",
        "routeName": "Tambaram - Broadway",
        "timeWeightedOccupancy": 46.21
      },
      {
        "routeId": "R001",
        "routeName": "Central - T.Nagar",
        "timeWeightedOccupancy": 38.45
      }
    ],
    "routeComparison": [
      {
        "routeId": "R005",
        "routeName": "Tambaram - Broadway",
        "boardings": 2870,
        "alightings": 2870,
        "averageDelay": 4.1
      },
      {
        "routeId": "R001",
        "routeName": "Central - T.Nagar",
        "boardings": 1690,
        "alightings": 1690,
        "averageDelay": 4.5
      }
    ]
  },
  "meta": {
    "filters": {
      "routeId": "all",
      "serviceDate": null
    },
    "generatedAt": "2026-11-07T05:30:00.000Z"
  }
}
```

---

## 4. Error Response Examples

### Unknown Route ID

`GET /api/dashboard?routeId=R999`

**HTTP Status:** `400 Bad Request`

```json
{
  "success": false,
  "error": {
    "code": "INVALID_ROUTE",
    "message": "Unknown route ID: 'R999'"
  }
}
```

### Invalid Service Date Format

`GET /api/dashboard?serviceDate=2026-99-99`

**HTTP Status:** `400 Bad Request`

```json
{
  "success": false,
  "error": {
    "code": "INVALID_DATE",
    "message": "Invalid service date format: '2026-99-99'. Expected YYYY-MM-DD."
  }
}
```

### Calendar-Invalid Service Date

`GET /api/dashboard?serviceDate=2026-02-31`

**HTTP Status:** `400 Bad Request`

```json
{
  "success": false,
  "error": {
    "code": "INVALID_DATE",
    "message": "Invalid service date format: '2026-02-31'. Expected YYYY-MM-DD."
  }
}
```

### Unmatched Route

`GET /api/nonexistent-endpoint`

**HTTP Status:** `404 Not Found`

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "API endpoint 'GET /api/nonexistent-endpoint' does not exist."
  }
}
```
