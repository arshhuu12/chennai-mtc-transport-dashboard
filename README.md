# Chennai MTC Public Transport Analytics Dashboard

## Project overview

This M.E. CSE (Data Science) assignment develops an interactive public transport analytics dashboard using JavaScript, D3.js and Leaflet.js, with a focus on Chennai's Metropolitan Transport Corporation (MTC).

The project combines:
1. Static CUMTA/MTC geographic reference data for route geometries and bus stop locations.
2. A separate synthetic operational dataset for demonstrating passenger demand, delays and occupancy analytics.

These sources are kept distinct. Synthetic passenger and operational metrics are not official MTC performance data.

## Objectives

- Explore Chennai MTC route and bus stop reference data.
- Prepare and validate geographic data for interactive mapping.
- Analyse sample transport operations using synthetic data.
- Present transport indicators through interactive D3 visualisations.
- Document data quality issues, assumptions and processing decisions.

## Technologies

- HTML5 and CSS3
- Vanilla JavaScript
- D3.js for operational analytics
- Leaflet.js for geographic mapping
- Python, pandas and Jupyter Notebook for offline preparation
- CSV, JSON and GeoJSON

## Repository structure

```text
.
├── dashboard/
│   ├── css/
│   ├── data/                 # Synthetic operational data
│   ├── js/                   # D3 analytics and Leaflet map modules
│   ├── tools/
│   └── index.html
├── data-preparation/
│   ├── notebooks/
│   └── prepared/             # Prepared static MTC geographic data
├── docs/
└── README.md
```

## Run the dashboard

Start a static HTTP server from the repository root:

```bash
python -m http.server 8000
```

Open `http://localhost:8000/dashboard/`. Do not use `file://`; the browser must load CSV and GeoJSON files over HTTP.

## Data sources and methodology

Geographic reference data is based on Chennai MTC static GTFS and associated geographic files published through the Chennai Unified Metropolitan Transport Authority (CUMTA) open-data portal: https://opendata.cumta.org/.

Preparation includes stop-coordinate matching, coordinate-quality classification, route matching, endpoint checks and export of selected map-ready datasets. See `docs/data-sources.md` and the Jupyter notebook in `data-preparation/notebooks/`.

## Important limitations

- Static GTFS describes scheduled/reference information; it is not live GPS data.
- The map displays six selected route geometries and 5,419 map-ready stop locations.
- Five of the six selected route geometries carry endpoint or coordinate-quality warnings. These warnings are displayed in the map.
- Provisional stop coordinates have not all been independently verified.
- Route geometry and terminal checks are preliminary validation, not proof of complete route accuracy.
- Passenger boardings, alightings, occupancy, delays and trip observations in the analytics dashboard are synthetic, not actual MTC operational records.
- The original raw GTFS archive is not included in the repository; retain it locally in the notebook's expected `raw/` folder if you need to rerun the full preparation workflow.

## Academic context

Developed as an M.E. Computer Science and Engineering (Data Science) assignment for the study of data science and visualization.

## Responsible use

Check the source publisher's current licence and reuse terms before redistributing original data. Always identify synthetic operational data as synthetic.
