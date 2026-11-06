# Chennai MTC Public Transport Analytics Dashboard

An interactive public transport analytics dashboard developed using **HTML5, CSS3, JavaScript, and D3.js**. The project demonstrates how data visualisation can support the analysis of public transport operations, using Chennai Metropolitan Transport Corporation (MTC) as the case study.

## 1. Project Overview

Public transport systems generate operational data that can be analysed to understand passenger demand, route performance, stop-level activity, delays, and bus occupancy.

This project develops a browser-based dashboard to present these indicators through interactive visualisations and filters.

**Important:** The operational data currently used in the dashboard is synthetic demonstration data. It is not actual MTC operational or passenger data, and the dashboard does not represent verified MTC performance.

## 2. Objectives

- Analyse passenger demand across routes and stops.
- Compare route-level performance.
- Visualise daily passenger demand trends.
- Examine simulated arrival delays.
- Analyse simulated bus occupancy.
- Provide interactive filtering and clear visual summaries.

## 3. Technology Stack

| Component | Technology |
|---|---|
| Dashboard structure | HTML5 |
| Styling | CSS3 |
| Programming | Vanilla JavaScript |
| Data visualisation | D3.js |
| Data format | CSV and JSON |
| Offline data preparation | Python, pandas and Jupyter Notebook |

The dashboard runs in a web browser and does not require Node.js, a backend server, or a database.

## 4. Dashboard Features

- Key performance indicator cards.
- Route-level demand and performance visualisation.
- Daily passenger demand trends.
- Stop-level demand analysis.
- Arrival delay distribution.
- Bus occupancy analysis.
- Interactive route and date filters.
- Responsive dashboard layout.

## 5. Dataset and Limitations

The active dashboard uses a synthetic dataset created for demonstration and visualisation purposes.

The dataset includes routes, stops, buses, trips, trip-stop records, and simulated stop observations.

The data supports demonstration of data loading, transformation, metric calculation, filtering, and visualisation. It must not be interpreted as actual MTC passenger counts, bus schedules, GPS records, or operational performance.

Geographic data preparation and map integration are retained as future work and are not part of the current dashboard implementation.

## 6. Project Structure

```text
Chennai-MTC-GitHub-Upload/
├── README.md
├── dashboard/
│   ├── index.html
│   ├── css/
│   ├── js/
│   ├── data/
│   └── tools/
├── data-preparation/
│   ├── notebooks/
│   └── prepared/
└── docs/
    └── data-sources.md
```

## 7. Running the Dashboard

Python is required only to start a local static web server.

From the project root, run:

```bash
python -m http.server 8000
```

Open the following address in your browser:

```text
http://localhost:8000/dashboard/
```

## 8. Academic Scope

This project is developed as an academic assignment for the subject **Data Science and Visualization** in the M.E. Computer Science and Engineering (Data Science) programme.

The implementation focuses on data preparation, metric calculation, interactive filtering, and visual analytics using JavaScript and D3.js.

## 9. Future Enhancements

- Integrate verified MTC operational datasets when available.
- Incorporate validated geographic route and stop information.
- Explore GPS-based delay and service reliability analysis.
- Extend the dashboard with additional operational indicators.
- Integrate real-time data if an authorised data source becomes available.

## 10. Disclaimer

This is an academic demonstration project. Synthetic operational data is used in the active dashboard. The project is not an official MTC application and is not affiliated with or endorsed by Chennai Metropolitan Transport Corporation.