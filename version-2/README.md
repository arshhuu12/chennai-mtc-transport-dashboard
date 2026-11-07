# Chennai MTC Public Transport Analytics Dashboard — Version 2

A modern, server-backed public transport analytics dashboard for the Chennai Metropolitan Transport Corporation (MTC) operational dataset.

Version 2 upgrades the original Version 1 architecture into a modular **Node.js, Express.js 5, and Chart.js 4.4.7** application featuring an in-memory data engine, a RESTful JSON API, and a responsive frontend interface.

---

## 1. Project Overview & Objectives

Public transit operators require clear operational insights into passenger demand, route reliability, stop congestion, schedule adherence, and vehicle capacity.

Version 2 provides an end-to-end analytics platform designed to:
- **Centralize Calculations:** Process transit metrics (delay, on-time punctuality, time-weighted occupancy, and headway regularity) in a testable backend engine.
- **Expose Structured REST Endpoints:** Deliver analytical data through predictable JSON APIs.
- **Deliver Responsive Visual Analytics:** Render clear, performant charts using Chart.js with verified layout containment across desktop, tablet, and mobile devices.
- **Ensure Regression Parity:** Match Version 1 calculation baselines bit-for-bit while operating as a completely independent codebase.

---

## 2. Technology Stack

- **Runtime Environment:** Node.js (>= 24.0.0 LTS)
- **Backend Framework:** Express.js 5 (`^5.0.0`)
- **Module System:** ECMAScript Modules (`"type": "module"`)
- **CSV Parser:** `csv-parse` (`^7.0.3`) for synchronous ingestion
- **Frontend Architecture:** Semantic HTML5, responsive CSS3, and modern Vanilla JavaScript (native ES modules)
- **Visual Analytics:** Chart.js 4.4.7 (loaded via pinned CDN `https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js`)
- **Automated Testing:** Node.js built-in test runner (`node:test`) and assertion library (`node:assert/strict`)

---

## 3. Prerequisites

- **Node.js:** Version `24.0.0` or higher.
- **Package Manager:** `npm` (bundled with Node.js).
- **Web Browser:** Any modern browser supporting ES modules and `<canvas>` (Chrome, Edge, Firefox, Safari).

---

## 4. Installation & Execution

### Installation

Navigate to the `version-2` directory and install the runtime dependencies:

```bash
cd version-2
npm install
```

### Starting the Server

- **Production Mode:**
  ```bash
  npm start
  ```
  Starts the HTTP listener (default port: `3000`).

- **Development Mode (with native watch mode):**
  ```bash
  npm run dev
  ```
  Monitors server files and automatically restarts on changes using Node.js's built-in `--watch` flag.

### Accessing the Dashboard

Once started, open your browser and navigate to:
- **Dashboard Interface:** [http://localhost:3000](http://localhost:3000)
- **Health Check Endpoint:** [http://localhost:3000/api/health](http://localhost:3000/api/health)

---

## 5. Running Automated Tests

Version 2 relies exclusively on Node.js's built-in test runner. No external testing harnesses (e.g., Jest, Mocha) are required:

```bash
npm test
```

The test command runs `node --test tests/**/*.test.js`, executing 90 automated tests across 24 suites:
- **Server Foundation Tests:** Validates HTTP listener and health check payload.
- **Data Ingestion Tests:** Validates CSV parsing, schema conformity, and SHA-256 data match against V1.
- **Validation Engine Tests:** Enforces foreign keys, primary keys, and numeric boundaries.
- **Metrics Engine Parity Tests:** Validates delay arithmetic, time-weighted occupancy, and efficiency formulas.
- **Regression Parity Tests:** Confirms exact bit-level parity against Version 1 analytical outputs.
- **REST API Tests:** Verifies all 5 endpoints, query parameters, and error handlers.
- **System Integration Tests:** Verifies end-to-end data flows and filter combinations.
- **Headless Chrome Browser Tests:** Real-browser tests verifying live DOM rendering, canvas widths, filter reactivity, race-condition defense, and responsive viewport containment.

---

## 6. Dashboard Features & Visualizations

### Key Performance Indicator (KPI) Cards
The dashboard features 7 summary cards reflecting current filter selections:
1. **Total Trips:** Count of unique operating service runs.
2. **Passenger Boardings:** Cumulative boarding events ($21,430$ across full dataset).
3. **Passenger Alightings:** Cumulative alighting events ($21,430$ across full dataset).
4. **Average Delay:** Mean arrival deviation in minutes ($4.8\text{ min}$ overall).
5. **On-Time Percentage:** Percentage of arrivals within $0$ to $5$ minutes ($41.4\%$ overall).
6. **Early Arrivals:** Count of arrivals ahead of schedule ($427$ overall).
7. **Time-Weighted Occupancy:** Duration-weighted bus load factor ($42.1\%$ overall).

### Interactive Filter Toolbar
- **Route Selector:** Filter by any of the 12 individual routes (`R001` through `R012`) or view all routes.
- **Service Date Picker:** Filter by operational calendar date (`2026-10-01` to `2026-10-28`).
- **Reset Filters Button:** One-click restoration of the default all-data view.
- **Race Condition Prevention:** Out-of-order asynchronous responses are safely discarded using monotonic request identifiers.

### Chart.js Visualizations
1. **Route Passenger Demand:** Horizontal bar chart comparing boardings across routes (sorted descending).
2. **Stop Passenger Demand:** Horizontal bar chart displaying the top 15 stops by passenger activity.
3. **Daily Passenger Demand Trends:** Dual line chart tracking daily boardings vs. alightings.
4. **Arrival Delay Distribution:** 5-minute interval histogram classifying early ($< 0$ min, blue), on-time ($0$ to $5$ min, green), and late ($> 5$ min, amber) arrivals.
5. **Route-Level Bus Occupancy:** Time-weighted capacity load bar chart with amber warning threshold at $\ge 80\%$.
6. **Route Efficiency & Schedule Regularity:** Bar chart displaying journey-time ratios (actual / scheduled transit duration) with a $1.0$ reference benchmark line.

---

## 7. REST API Overview

All endpoints return JSON responses. Complete details, request parameters, and schemas are documented in [docs/api.md](docs/api.md).

| Endpoint | Method | Description |
|---|---|---|
| `GET /api/health` | `GET` | Health check returning status and application metadata. |
| `GET /api/dashboard` | `GET` | High-level 7 KPI summary indicators supporting `routeId` and `serviceDate` filters. |
| `GET /api/routes` | `GET` | Route summaries, scheduled vs actual runtimes, journey time ratios, and headway regularity. |
| `GET /api/stops` | `GET` | Stop demand rankings supporting `routeId`, `serviceDate`, and `limit` parameters. |
| `GET /api/analytics` | `GET` | Pre-binned and formatted visualization datasets matching Chart.js requirements. |

---

## 8. Project Structure

```text
version-2/
├── package.json               # Package configuration, engines, scripts, and dependencies
├── .gitignore                 # Version control exclusions
├── .env.example               # Template environment configuration
├── README.md                  # This file
├── docs/                      # Technical documentation
│   ├── architecture.md        # System architecture and data flow diagrams
│   └── api.md                 # Complete REST API reference and schemas
├── data/                      # Local CSV datasets (SHA-256 verified identical to V1)
│   ├── routes.csv             # 12 bus routes
│   ├── stops.csv              # 48 bus stops
│   ├── buses.csv              # 24 buses with seating capacities
│   ├── trips.csv              # 672 trip definitions across 28 service dates
│   ├── trip_stops.csv         # 2,688 scheduled stop sequences and times
│   └── stop_observations.csv  # 2,688 observed arrivals, boardings, and alightings
├── src/                       # Backend application code
│   ├── server.js              # Server bootstrapper and HTTP listener
│   ├── app.js                 # Express application, middleware, and router registration
│   ├── config.js              # Environment and path configurations
│   ├── data.js                # CSV loading, parsing, and in-memory operational store
│   ├── validation.js          # Relational integrity, foreign key, and schema validators
│   ├── metrics.js             # Pure analytical calculation engine
│   └── api/                   # REST API route handlers
│       ├── utils.js           # Query parameter validation and standard JSON formatters
│       ├── dashboard.js       # KPI metrics endpoint handler
│       ├── routes.js          # Route performance and regularity endpoint handler
│       ├── stops.js           # Stop demand rankings endpoint handler
│       └── analytics.js       # Chart visualization datasets endpoint handler
├── public/                    # Frontend client assets
│   ├── index.html             # Semantic HTML5 dashboard layout
│   ├── css/
│   │   └── style.css          # MTC-themed CSS styles, CSS variables, and responsive layout
│   └── js/
│       ├── api.js             # REST API fetch client
│       ├── state.js           # Filter state and monotonic request tracking
│       ├── charts.js          # Chart.js lifecycle management and visual configs
│       └── app.js             # Frontend controller and event orchestrator
└── tests/                     # Automated test suites (node:test)
    ├── server.test.js         # HTTP server and health endpoint tests
    ├── data.test.js           # CSV loading and checksum verification tests
    ├── validation.test.js     # Data integrity and schema validation tests
    ├── metrics.test.js        # Analytical engine unit and parity tests
    ├── regression.test.js     # Version 1 vs Version 2 parity tests
    ├── api.test.js            # REST API endpoints and error handling tests
    ├── integration.test.js    # System integration and filter combination tests
    └── browser.test.js        # Headless Chrome automated tests (DOM, viewports, charts)
```

---

## 9. Known Limitations

- **Simulated Demonstration Dataset:** The operational records used in Version 2 are synthetic demonstration data. They do **not** represent actual Chennai MTC passenger counts, GPS logs, or official transit performance.
- **No Real-Time Tracking or Live GPS:** The dashboard does not connect to live automated vehicle location (AVL) feeds or vehicle telemetry.
- **In-Memory Storage:** Datasets are loaded synchronously into server memory at boot. There is no external database (PostgreSQL, MongoDB, etc.). Changes to CSV files require restarting the application.
- **Local Application Scope:** The project is designed and configured for local execution and academic/engineering evaluation. It does not include authentication, user session management, or public cloud deployment infrastructure.
