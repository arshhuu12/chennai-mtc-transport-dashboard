# Data Sources and Data Description

## 1. Project Case Study

This project uses Chennai Metropolitan Transport Corporation (MTC) as the public transport case study.

The active dashboard uses synthetic operational data to demonstrate data preparation, metric calculation, interactive filtering, and visualisation.

## 2. Active Dashboard Dataset

The dashboard dataset contains the following CSV files:

| File | Description |
|---|---|
| `routes.csv` | Route identifiers and route details |
| `stops.csv` | Stop identifiers and stop details |
| `buses.csv` | Bus identifiers and capacity information |
| `trips.csv` | Simulated trip and schedule records |
| `trip_stops.csv` | Scheduled stop sequence and timing records |
| `stop_observations.csv` | Simulated passenger and arrival observations |

## 3. Data Classification

**Synthetic operational data**

The active dashboard's trip, passenger, delay, and occupancy observations are simulated for academic demonstration. They must not be interpreted as actual MTC operational measurements.

**Geographic reference research**

GTFS and geographic datasets were separately explored and prepared as part of preliminary data research. These files are retained under `data-preparation/` for future work. They are not integrated into the active dashboard.

## 4. External Reference Sources

The following sources were consulted during project research:

- CUMTA Open Data Portal: https://opendata.cumta.org/
- Chennai MTC Official Performance Information: https://mtcbus.tn.gov.in/home/performance
- OpenCity Chennai MTC Performance Dataset: https://data.opencity.in/dataset/chennai-mtc-performance-data
- Mobility Database: https://mobilitydatabase.org/

These sources provide background and reference information. Their existence does not mean that the active dashboard uses their operational records.

## 5. Data Preparation and Validation

The project includes offline data preparation and validation work using Python, pandas, and Jupyter Notebook.

The preparation workflow supports:
- Dataset inspection and structural validation.
- Missing-value and duplicate checks.
- Relationship checks between routes, stops, buses, and trips.
- Consistency checks for passenger and occupancy values.
- Preparation of data for browser-based visualisation.

The notebook and prepared research outputs are retained separately from the active dashboard dataset.

## 6. Limitations

- The active dashboard does not use live MTC GPS data.
- Passenger counts and operational observations are synthetic.
- Dashboard metrics demonstrate analytical methods, not verified MTC performance.
- Geographic map integration is outside the current project scope.
- External reference sources are not automatically connected to the dashboard.

## 7. Future Scope

Future development may integrate validated MTC operational datasets, verified geographic stop and route information, and authorised GPS or real-time feeds where available.