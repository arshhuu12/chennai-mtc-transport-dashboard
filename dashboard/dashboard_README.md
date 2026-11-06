# Public Transport Analytics Dashboard

A browser-based academic dashboard built with HTML5, CSS3, Vanilla JavaScript, D3.js and Leaflet.js.

## Run the dashboard

Start the static server from the **repository root** so the dashboard can read the prepared geographic files in the sibling `data-preparation/` folder.

```bash
python -m http.server 8000
```

Open:

`http://localhost:8000/dashboard/`

Do not open the HTML file directly with `file://`; browser CSV and GeoJSON loading requires HTTP.

## Project structure

- `index.html` — main dashboard entry point.
- `css/` — dashboard, chart and map styles.
- `js/app.js` — dashboard initialisation, filtering and UI coordination.
- `js/map.js` — Leaflet map for static MTC route geometry and map-ready stops.
- `js/data-loader.js`, `js/metrics.js`, `js/filters.js` — operational data loading, calculations and filters.
- `js/charts.js`, `js/advanced-charts.js` — D3 visualisations.
- `data/` — synthetic operational CSV/JSON data.
- `../data-preparation/prepared/` — prepared MTC stop CSV and selected route GeoJSON used by the map.
- `tools/` — optional development utilities and validation pages.

## Geographic map

The map loads:

- `../data-preparation/prepared/selected_routes.geojson` — six selected route geometries.
- `../data-preparation/prepared/stops_for_map.csv` — 5,419 map-ready stop locations.

Use the route selector to display all selected routes or one route. Stop markers are optional and load only when the checkbox is enabled to keep the initial map responsive.

Routes with endpoint or coordinate-quality concerns are shown in amber, and their quality notes remain visible below the map. The map uses static geographic reference data; it does not show live bus positions or real-time tracking.

## Operational dataset provenance and limitations

The dashboard's passenger, delay, occupancy and trip-observation records are a **synthetic demonstration dataset**, not actual Chennai MTC operational data. The map's route and stop references are separate static CUMTA/MTC geographic data.

The dashboard must label synthetic operational data as synthetic in the user interface and in any report or demonstration. See `data/dataset_metadata.json` and the repository's `docs/data-sources.md`.

## Technology constraints

The dashboard uses HTML, CSS, Vanilla JavaScript, D3.js, Leaflet.js and CSV/JSON/GeoJSON. No backend, database, Node.js application server or front-end framework is required. D3.js, Leaflet.js and OpenStreetMap tiles require an internet connection.
