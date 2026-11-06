\# Chennai MTC Public Transport Analytics Dashboard



\## Project Overview



This project develops an interactive public transport analytics dashboard using JavaScript and D3.js, with a focus on Chennai's Metropolitan Transport Corporation (MTC).



The project combines public transport reference data with a separate synthetic operational dataset to demonstrate data preparation, validation, analysis, and visualization.



\## Objectives



\- Explore Chennai MTC routes and bus stop reference data.

\- Prepare and validate geographic data for mapping.

\- Analyse sample transport operations using synthetic data.

\- Present transport indicators through interactive visualizations.

\- Document data quality issues and processing decisions.



\## Technologies



\- HTML5 and CSS3

\- JavaScript

\- D3.js

\- Leaflet.js (planned for geographic map integration)

\- Python and pandas for offline data preparation

\- Jupyter Notebook

\- CSV, JSON, and GeoJSON



\## Repository Structure



```text

Chennai-MTC-GitHub-Upload/

├── .gitignore

├── README.md

├── data-preparation/

│   ├── notebooks/

│   └── prepared/

├── dashboard/

└── docs/

```



\## Data Sources and Methodology



The geographic reference data is based on the Chennai MTC static GTFS and associated geographic data published through the Chennai Unified Metropolitan Transport Authority (CUMTA) open-data portal.



The dashboard's operational demonstration dataset is synthetic. It must not be interpreted as actual MTC passenger counts, bus operations, delays, or performance.



Data preparation includes stop-coordinate matching, route matching, endpoint checks, coordinate-quality classification, and export of selected map-ready datasets.



See `docs/data-sources.md` for source details and data limitations.



\## Important Data Limitations



\- Static GTFS describes scheduled public transport information; it is not live GPS data.

\- Synthetic operational records are used for dashboard demonstrations.

\- Some GTFS stop coordinates were identified as possible placeholders and excluded from the default map.

\- Six selected route geometries are prepared for mapping. Five carry endpoint or coordinate-quality warnings.

\- Route geometry and terminal checks are preliminary validation, not proof of complete route accuracy.



\## Project Status



The dashboard and data-preparation stages are being developed incrementally. Geographic map integration and further validation are planned.



\## Academic Context



Developed as an M.E. Computer Science and Engineering (Data Science) assignment for the study of data science and visualization.



\## Responsible Use



Source datasets should be used in accordance with their respective licences and terms. Synthetic data must always be identified as synthetic.



