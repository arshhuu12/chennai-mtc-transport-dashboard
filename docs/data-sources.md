# Data Sources and Preparation Notes

## 1. Chennai MTC Static GTFS

**Publisher:** Chennai Unified Metropolitan Transport Authority (CUMTA)

**Portal:** https://opendata.cumta.org/

**Dataset:** MTC Bus — routes, stop locations and trip frequencies.

The downloaded static GTFS package contains files including:

- `agency.txt`
- `routes.txt`
- `trips.txt`
- `stop_times.txt`
- `stops.txt`
- `calendar.txt`
- `feed_info.txt`

The inspected package did not contain `shapes.txt` or `frequencies.txt`.

## 2. Geographic reference data

The CUMTA package also contains geographic files:

- `all_mtc_routes.geojson`
- `mtc_stops.geojson`
- `routes_polyline.geojson`
- `bus_terminus.geojson`

These files were inspected for route geometry, stop locations and geographic consistency.

## 3. Prepared outputs

The `data-preparation/prepared/` directory contains:

| File | Purpose |
|---|---|
| `prepared_stops.csv` | Prepared stop records with coordinate-quality information |
| `stops_for_map.csv` | 5,419 stops selected for default map eligibility |
| `stop_quality_summary.csv` | Summary of stop-coordinate quality |
| `stop_dataset_metadata.json` | Metadata describing the prepared stop dataset |
| `selected_routes.geojson` | Six selected route geometries with validation status |

The dashboard reads `stops_for_map.csv` and `selected_routes.geojson` directly from this folder. The stop markers are loaded only when the map checkbox is enabled.

## 4. Stop coordinate quality

The GTFS stop dataset contains 7,128 records.

The prepared stop dataset classifies coordinates into four categories:

- Verified GeoJSON match
- Unique unmatched provisional
- Repeated-coordinate review
- Placeholder candidate

A total of 5,419 stops were selected for the default map. Placeholder candidates and repeated-coordinate review records were excluded from that map.

These classifications describe the preparation process; they do not guarantee that every included coordinate is perfectly accurate. Provisional coordinates remain provisional.

## 5. Selected route quality

Six route geometries were selected:

- 118N
- 120E
- 120KET
- 555M
- S12
- S54TCT

One route was included without an endpoint warning. Five were included with warnings related to endpoint proximity or unavailable reliable terminal coordinates.

The map displays routes without warnings in teal and routes with quality warnings in amber. Each route's quality note is displayed below the map and in its popup. No missing terminal coordinate is invented.

## 6. Synthetic operational data

The dashboard also contains a separate synthetic operational dataset for demonstrating transport analytics.

Passenger counts, occupancy, delays and other operational measures are simulated. They are not official MTC operational records and must not be described as measured MTC performance.

## 7. Map implementation and limitations

- The interactive map uses Leaflet.js and OpenStreetMap tiles.
- Route geometry and stop locations are static reference data.
- Static GTFS is not real-time vehicle tracking.
- Route geometry matching and endpoint checks are not equivalent to complete route validation.
- Some GTFS stop coordinates were identified as possible placeholders and excluded from the default map.
- The stop layer contains 5,419 map-ready points and is optional to reduce initial rendering load.
- The dashboard requires HTTP serving from the repository root so the map can read the sibling `data-preparation/prepared/` directory.
- An internet connection is required for the Leaflet library and map tiles.

## 8. Source links

- CUMTA Open Data Portal: https://opendata.cumta.org/
- Official MTC Performance: https://mtcbus.tn.gov.in/home/performance
- OpenCity MTC Performance Dataset: https://data.opencity.in/dataset/chennai-mtc-performance-data
