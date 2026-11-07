# Chennai MTC Public Transport Analytics Dashboard

An interactive public transport analytics platform developed to analyze and visualize operational bus transit data, using the Chennai Metropolitan Transport Corporation (MTC) operational network as a case study.

This repository contains two complete implementations:
- **Version 1 (`dashboard/`):** A static, client-side web dashboard powered by **HTML5, CSS3, Vanilla JavaScript, and D3.js**.
- **Version 2 (`version-2/`):** A modern, server-backed analytics application powered by **Node.js, Express.js 5, REST APIs, and Chart.js 4.4.7**.

---

## Architecture & Version Comparison

| Characteristic | Version 1 (`dashboard/`) | Version 2 (`version-2/`) |
|---|---|---|
| **Architecture** | Pure client-side static application | Two-tier client-server application |
| **Backend / Runtime** | None (Static web server only) | Node.js (>= 24.0.0 LTS) & Express.js 5 |
| **Data Ingestion** | In-browser CSV parsing via D3.js | In-memory CSV parsing via `csv-parse` at server boot |
| **Communication** | Direct browser file reading | RESTful JSON API (`/api/*`) |
| **Visual Analytics** | D3.js v7 | Chart.js 4.4.7 (pinned CDN) |
| **Automated Testing** | Client-side test page | Built-in Node.js test runner (`node:test`, 90 tests) |
| **Documentation** | [docs/data-sources.md](docs/data-sources.md) | [version-2/README.md](version-2/README.md), [Architecture](version-2/docs/architecture.md), [API Reference](version-2/docs/api.md) |

---

## 1. Project Overview

Public transport systems generate operational data that can be analysed to understand passenger demand, route performance, stop-level activity, delays, and bus occupancy.

This project develops an analytics platform to present these indicators through interactive visualisations and filters.

> [!IMPORTANT]
> **Data Notice:** The operational data currently used across both versions is a **synthetic demonstration dataset**. It is not actual MTC operational or passenger data, does not provide live GPS tracking, and does not represent verified MTC performance.

---

## 2. Objectives

- Analyse passenger demand across routes and stops.
- Compare route-level performance and transit durations.
- Visualise daily passenger demand trends.
- Examine simulated arrival delays and punctuality bins.
- Analyse simulated bus occupancy and duration-weighted capacity load.
- Provide interactive filtering and clear visual summaries.

---

## 3. Repository Structure

```text
Chennai-MTC-GitHub-Upload/
├── README.md                      # This root repository guide
├── dashboard/                     # VERSION 1: Static D3.js Implementation
│   ├── index.html                 # V1 frontend entry point
│   ├── css/                       # V1 styles
│   ├── js/                        # V1 D3.js charts and metrics logic
│   ├── data/                      # V1 source CSV datasets (6 files)
│   └── tools/                     # V1 test runner
├── data-preparation/              # Offline data preparation notebooks
│   ├── notebooks/                 # Python and pandas notebooks
│   └── prepared/                  # Output data files
├── docs/                          # V1 documentation
│   └── data-sources.md            # Dataset descriptions
└── version-2/                     # VERSION 2: Node.js, Express 5 & Chart.js Implementation
    ├── README.md                  # Comprehensive Version 2 guide
    ├── docs/
    │   ├── architecture.md        # V2 system architecture and data flows
    │   └── api.md                 # V2 REST API reference and schemas
    ├── data/                      # V2 CSV datasets (SHA-256 verified match to V1)
    ├── src/                       # V2 Node.js / Express 5 backend & metrics engine
    ├── public/                    # V2 frontend interface & Chart.js controllers
    └── tests/                     # V2 automated test suites (90 tests)
```

---

## 4. Running the Applications

### Running Version 2 (Node.js & Express 5)

Version 2 runs on Node.js (>= 24.0.0):

```bash
# 1. Navigate to version-2
cd version-2

# 2. Install dependencies
npm install

# 3. Start the application
npm start
```

- Open the dashboard: [http://localhost:3000](http://localhost:3000)
- Check backend health: [http://localhost:3000/api/health](http://localhost:3000/api/health)
- Run automated test suite: `npm test`

For complete details on Version 2 configuration and API usage, see the [Version 2 Documentation](version-2/README.md).

---

### Running Version 1 (Static D3.js Dashboard)

Python is required only to start a local static web server.

From the repository root, run:

```bash
python -m http.server 8000
```

Open the following address in your browser:

```text
http://localhost:8000/dashboard/
```

#### Version 1 Technology Stack

| Component | Technology |
|---|---|
| Dashboard structure | HTML5 |
| Styling | CSS3 |
| Programming | Vanilla JavaScript |
| Data visualisation | D3.js |
| Data format | CSV and JSON |
| Offline data preparation | Python, pandas and Jupyter Notebook |

The Version 1 dashboard runs entirely in the web browser and does not require Node.js, a backend server, or a database.

---

## 5. Dataset and Limitations

The active dashboard across both versions uses a synthetic dataset created for demonstration and visualisation purposes:
- The dataset includes routes, stops, buses, trips, trip-stop records, and simulated stop observations.
- The data supports demonstration of data loading, transformation, metric calculation, filtering, and visualisation. It must not be interpreted as actual MTC passenger counts, bus schedules, GPS records, or operational performance.
- Geographic data preparation and map integration are retained as future work and are not part of the current dashboard implementation.
- The application does not provide real-time bus tracking or live GPS telemetry.

---

## 6. Academic Scope

This project is developed as an academic assignment for the subject **Data Science and Visualization** in the M.E. Computer Science and Engineering (Data Science) programme.

The implementation focuses on data preparation, metric calculation, interactive filtering, and visual analytics.

---

## 7. Future Enhancements

- Integrate verified MTC operational datasets when available.
- Incorporate validated geographic route and stop information.
- Explore GPS-based delay and service reliability analysis.
- Extend the dashboard with additional operational indicators.
- Integrate real-time data if an authorised data source becomes available.

---

## 8. Disclaimer

This is an academic demonstration project. Synthetic operational data is used in the active dashboard. The project is not an official MTC application and is not affiliated with or endorsed by Chennai Metropolitan Transport Corporation.
