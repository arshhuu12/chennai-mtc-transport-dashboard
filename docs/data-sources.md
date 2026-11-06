\# Data Sources and Preparation Notes



\## 1. Chennai MTC Static GTFS



\*\*Publisher:\*\* Chennai Unified Metropolitan Transport Authority (CUMTA)



\*\*Portal:\*\* https://opendata.cumta.org/



\*\*Dataset:\*\* MTC Bus — routes, stop locations, and trip frequencies.



The downloaded static GTFS package contains files including:



\- `agency.txt`

\- `routes.txt`

\- `trips.txt`

\- `stop\_times.txt`

\- `stops.txt`

\- `calendar.txt`

\- `feed\_info.txt`



The inspected package did not contain `shapes.txt` or `frequencies.txt`.



\## 2. Geographic Reference Data



The downloaded CUMTA package also contains geographic files:



\- `all\_mtc\_routes.geojson`

\- `mtc\_stops.geojson`

\- `routes\_polyline.geojson`

\- `bus\_terminus.geojson`



These files were inspected for route geometry, stop locations, and geographic consistency.



\## 3. Prepared Outputs



The `data-preparation/prepared/` directory contains:



| File | Purpose |

|---|---|

| `prepared\_stops.csv` | Prepared stop records with coordinate-quality information |

| `stops\_for\_map.csv` | Stops selected for default map display |

| `stop\_quality\_summary.csv` | Summary of stop-coordinate quality |

| `stop\_dataset\_metadata.json` | Metadata describing the prepared stop dataset |

| `selected\_routes.geojson` | Six selected route geometries with validation status |



\## 4. Stop Coordinate Quality



The GTFS stop dataset contains 7,128 records.



The prepared stop dataset classifies coordinates into four categories:



\- Verified GeoJSON match

\- Unique unmatched provisional

\- Repeated-coordinate review

\- Placeholder candidate



A total of 5,419 stops were selected for the default map. Placeholder candidates and repeated-coordinate review records were excluded from that map.



These classifications describe the preparation process; they do not guarantee that every included coordinate is perfectly accurate.



\## 5. Selected Route Quality



Six routes were selected:



\- 118N

\- 120E

\- 120KET

\- 555M

\- S12

\- S54TCT



One route was included without an endpoint warning. Five were included with warnings related to endpoint proximity or unavailable reliable terminal coordinates.



These warnings must be retained when presenting the route data.



\## 6. Synthetic Operational Data



The dashboard also contains a separate synthetic operational dataset for demonstrating transport analytics.



Its passenger counts, occupancy, delays, and other operational measures are simulated. They are not official MTC operational records.



\## 7. Limitations and Responsible Use



\- Static GTFS is schedule/reference data, not real-time vehicle tracking.

\- Route geometry matching is not equivalent to complete route validation.

\- Some GTFS stop coordinates may be placeholders.

\- Do not interpret synthetic operational metrics as actual MTC performance.

\- Check the publisher's current licence and reuse terms before redistributing original source files.



\## 8. Source Links



\- CUMTA Open Data Portal: https://opendata.cumta.org/

\- Official MTC Performance: https://mtcbus.tn.gov.in/home/performance

\- OpenCity MTC Performance Dataset: https://data.opencity.in/dataset/chennai-mtc-performance-data



