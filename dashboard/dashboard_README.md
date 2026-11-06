# Public Transport Analytics Dashboard

A single-page, browser-based academic dashboard built with HTML5, CSS3, Vanilla JavaScript and D3.js.

## Run the dashboard

Use VS Code Live Server or another static HTTP server. For example:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000/index.html`. Do not open the page directly with `file://`, because browser CSV loading requires HTTP.

## Project structure

- `index.html` — the only main dashboard entry point.
- `css/` — dashboard and chart styles.
- `js/app.js`, `js/advanced-charts.js` — current dashboard logic (to be refactored in stages).
- `data/` — the reproducible synthetic CSV/JSON dataset.
- `tools/` — optional development utilities and legacy analysis pages; these are not part of the dashboard navigation.
- `js/generate-data.js`, `js/validate-data.js`, `js/calculation-tests.js` — supporting utility scripts used by pages in `tools/`.

## Dataset provenance and limitations

This is a **synthetic demonstration dataset**, not actual Chennai MTC operational data. It contains 12 sample routes, 48 sample stops, 20 sample buses, 672 simulated trips over 28 days, and 2,688 scheduled stop records with matching stop observations. Stop coordinates, schedules, arrival times and passenger movements are simulated. No live GPS, ticketing or verified trip-level MTC records are included. See `data/dataset_metadata.json`.

The dashboard must label its data as synthetic in the user interface and in any report or demonstration.

## Technology constraints

The dashboard uses HTML, CSS, Vanilla JavaScript, D3.js and CSV/JSON. No backend, database, Node.js application server or front-end framework is required. D3.js is loaded from its public CDN, so an internet connection is required for the chart library.


### Modular JavaScript architecture

- `js/data-loader.js`: CSV loading, validation, joining and occupancy derivation.
- `js/metrics.js`: KPI and route-summary calculations.
- `js/app.js`: dashboard initialisation, filtering and UI rendering.
- `js/advanced-charts.js`: additional D3 chart rendering.


### Stage 3C architecture update
- `js/filters.js` manages route/date controls and filtering.
- `js/app.js` coordinates dashboard updates when filters change.
- Route and date selections apply together; Reset clears both.


### JavaScript module layout (Stage 3D)
- `data-loader.js`: CSV loading, joins and record preparation.
- `metrics.js`: KPI and route metric calculations.
- `filters.js`: shared route/date filter state.
- `charts.js`: route and stop demand D3 charts.
- `advanced-charts.js`: delay distribution and occupancy D3 charts.
- `app.js`: dashboard startup and coordination.


## Modern chart and transition update

This revision replaces destructive SVG redraws with persistent D3 joins and coordinated transitions. Route demand uses a lollipop ranking, stop demand remains a ranked horizontal bar chart, daily passenger boardings use a line/area chart, arrival delays use a histogram, and occupancy uses a capacity-track/bullet-style chart. KPI cards are updated in place. The motion duration is reduced to zero when the operating system requests reduced motion.

The dataset and metric definitions are unchanged. The dataset remains synthetic demonstration data, not live MTC operational data.
