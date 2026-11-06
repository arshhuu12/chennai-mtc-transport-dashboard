# Dashboard Documentation

## Chennai MTC Public Transport Analytics Dashboard

This folder contains the browser-based dashboard developed using HTML5, CSS3, Vanilla JavaScript, and D3.js.

## Features

- Passenger demand KPIs.
- Route-level demand and performance analysis.
- Daily demand trends.
- Stop-level demand analysis.
- Arrival delay distribution.
- Bus occupancy analysis.
- Interactive route and date filters.
- Responsive dashboard interface.

## Folder Structure

```text
dashboard/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── data-loader.js
│   ├── metrics.js
│   ├── filters.js
│   ├── charts.js
│   ├── app.js
│   └── advanced-charts.js
├── data/
│   ├── routes.csv
│   ├── stops.csv
│   ├── buses.csv
│   ├── trips.csv
│   ├── trip_stops.csv
│   └── stop_observations.csv
└── tools/
    └── validation and testing utilities
```

## Running the Dashboard

Open a terminal in the project root and run:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000/dashboard/
```

## Data Description

The dashboard uses CSV files containing synthetic demonstration data for routes, stops, buses, trips, trip-stop records, and stop observations.

**Data limitation:** These operational records are simulated. They are not actual MTC passenger counts, GPS observations, schedules, or measured performance.

## Technology

- HTML5
- CSS3
- Vanilla JavaScript
- D3.js
- CSV data

No Node.js, backend, database, or JavaScript framework is required.

## Scope

The current dashboard focuses on operational analytics and interactive visualisation. Geographic map integration is not included in the active version.