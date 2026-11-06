
// File: js/validate-data.js

document.addEventListener("DOMContentLoaded", () => {

    const DATA_PATH = "../data/";

    const statusElement =
        document.getElementById("validation-status");

    const summaryElement =
        document.getElementById("validation-summary");

    const fileResultsElement =
        document.getElementById("file-results");

    const qualityResultsElement =
        document.getElementById("quality-results");

    const detailsElement =
        document.getElementById("validation-details");

    const runButton =
        document.getElementById("run-validation");

    const fileDefinitions = [
        {
            name: "routes.csv",
            columns: ["route_id", "route_name"]
        },
        {
            name: "stops.csv",
            columns: ["stop_id", "stop_name"]
        },
        {
            name: "buses.csv",
            columns: ["bus_id", "capacity"]
        },
        {
            name: "trips.csv",
            columns: [
                "trip_id",
                "route_id",
                "bus_id",
                "service_date"
            ]
        },
        {
            name: "trip_stops.csv",
            columns: [
                "trip_id",
                "stop_sequence",
                "stop_id",
                "scheduled_arrival"
            ]
        },
        {
            name: "stop_observations.csv",
            columns: [
                "trip_id",
                "stop_sequence",
                "actual_arrival",
                "boarding",
                "alighting"
            ]
        }
    ];

    let issues = [];
    let checks = [];

    function addIssue(check, message, severity = "error") {
        issues.push({
            check,
            message,
            severity
        });
    }

    function addCheck(name, count, severity = "error") {
        checks.push({
            name,
            count,
            severity
        });
    }

    function makeKey(tripId, sequence) {
        return `${tripId}_${sequence}`;
    }

    function parseTimestamp(value) {
        if (!value || !String(value).trim()) {
            return null;
        }

        const parsed = new Date(value);

        if (Number.isNaN(parsed.getTime())) {
            return null;
        }

        return parsed;
    }

    function isNonNegativeInteger(value) {
        const number = Number(value);

        return (
            value !== "" &&
            Number.isInteger(number) &&
            number >= 0
        );
    }

    function isPositiveInteger(value) {
        const number = Number(value);

        return (
            value !== "" &&
            Number.isInteger(number) &&
            number > 0
        );
    }

    function countDuplicates(rows, keyFunction) {
        const seen = new Set();
        let duplicates = 0;

        rows.forEach(row => {
            const key = keyFunction(row);

            if (seen.has(key)) {
                duplicates++;
            } else {
                seen.add(key);
            }
        });

        return duplicates;
    }

    function addQualityCheck(name, count, severity = "error") {
        addCheck(name, count, severity);
    }

    function renderSummary(totalRecords, errorCount, warningCount) {
        summaryElement.innerHTML = "";

        const cards = [
            ["Total Records", totalRecords],
            ["Validation Errors", errorCount],
            ["Warnings", warningCount],
            [
                "Overall Status",
                errorCount > 0
                    ? "Issues Found"
                    : warningCount > 0
                        ? "Review"
                        : "Passed"
            ]
        ];

        cards.forEach(([label, value]) => {
            const card = document.createElement("div");
            card.className = "validation-card";

            const heading = document.createElement("h3");
            heading.textContent = value;

            const paragraph = document.createElement("p");
            paragraph.textContent = label;

            card.append(heading, paragraph);
            summaryElement.appendChild(card);
        });
    }

    function renderFileResults(fileData) {
        fileResultsElement.innerHTML = "";

        fileData.forEach(file => {
            const row = document.createElement("tr");

            const values = [
                file.name,
                file.records,
                file.missingColumns.length
                    ? `Missing: ${file.missingColumns.join(", ")}`
                    : "Complete",
                file.status
            ];

            values.forEach((value, index) => {
                const cell = document.createElement("td");
                cell.textContent = value;

                if (index === 3) {
                    cell.className =
                        file.status === "PASS"
                            ? "status-pass"
                            : "status-fail";
                }

                row.appendChild(cell);
            });

            fileResultsElement.appendChild(row);
        });
    }

    function renderQualityResults() {
        qualityResultsElement.innerHTML = "";

        checks.forEach(check => {
            const row = document.createElement("tr");

            const nameCell = document.createElement("td");
            nameCell.textContent = check.name;

            const countCell = document.createElement("td");
            countCell.textContent = check.count;

            const statusCell = document.createElement("td");

            if (check.count === 0) {
                statusCell.textContent = "PASS";
                statusCell.className = "status-pass";
            } else if (check.severity === "warning") {
                statusCell.textContent = "WARNING";
                statusCell.className = "status-warning";
            } else {
                statusCell.textContent = "FAIL";
                statusCell.className = "status-fail";
            }

            row.append(nameCell, countCell, statusCell);
            qualityResultsElement.appendChild(row);
        });
    }

    function renderDetails() {
        detailsElement.innerHTML = "";

        if (!issues.length) {
            const paragraph = document.createElement("p");
            paragraph.className = "status-pass";
            paragraph.textContent =
                "No validation issues were found.";
            detailsElement.appendChild(paragraph);
            return;
        }

        const list = document.createElement("ul");

        // Limit the on-screen detail list to avoid an excessively
        // long page when a large dataset contains many bad records.
        issues.slice(0, 100).forEach(issue => {
            const item = document.createElement("li");

            item.textContent =
                `[${issue.severity.toUpperCase()}] ` +
                `${issue.check}: ${issue.message}`;

            list.appendChild(item);
        });

        detailsElement.appendChild(list);

        if (issues.length > 100) {
            const note = document.createElement("p");
            note.textContent =
                `Showing the first 100 of ${issues.length} issues.`;
            detailsElement.appendChild(note);
        }
    }

    async function loadFiles() {
        const results = await Promise.all(
            fileDefinitions.map(async definition => {
                try {
                    const rows = await d3.csv(
                        DATA_PATH + definition.name
                    );

                    const columns = rows.columns ||
                        (rows.length ? Object.keys(rows[0]) : []);

                    const missingColumns =
                        definition.columns.filter(
                            column => !columns.includes(column)
                        );

                    return {
                        name: definition.name,
                        rows,
                        records: rows.length,
                        missingColumns,
                        status: missingColumns.length
                            ? "FAIL"
                            : rows.length
                                ? "PASS"
                                : "FAIL"
                    };

                } catch (error) {
                    return {
                        name: definition.name,
                        rows: [],
                        records: 0,
                        missingColumns: definition.columns,
                        status: "FAIL",
                        loadError: error.message
                    };
                }
            })
        );

        return results;
    }

    function validateDataset(data) {
        issues = [];
        checks = [];

        const routes = data["routes.csv"].rows;
        const stops = data["stops.csv"].rows;
        const buses = data["buses.csv"].rows;
        const trips = data["trips.csv"].rows;
        const schedules = data["trip_stops.csv"].rows;
        const observations = data["stop_observations.csv"].rows;

        const fileErrors = Object.values(data).filter(
            file => file.status !== "PASS"
        ).length;

        addQualityCheck(
            "Files missing, empty or with incorrect columns",
            fileErrors
        );

        if (fileErrors > 0) {
            Object.values(data).forEach(file => {
                if (file.status !== "PASS") {
                    addIssue(
                        "File structure",
                        `${file.name}: ${
                            file.loadError ||
                            file.missingColumns.join(", ") ||
                            "File is empty"
                        }`
                    );
                }
            });

            renderQualityResults();
            renderDetails();
            return;
        }

        const routeIds = new Set(routes.map(row => row.route_id));
        const stopIds = new Set(stops.map(row => row.stop_id));
        const busIds = new Set(buses.map(row => row.bus_id));
        const tripIds = new Set(trips.map(row => row.trip_id));

        const tripMap = new Map(
            trips.map(row => [row.trip_id, row])
        );

        const busCapacityMap = new Map(
            buses.map(row => [row.bus_id, Number(row.capacity)])
        );

        const scheduleMap = new Map();
        const observationMap = new Map();

        // 1. Check duplicate primary identifiers.
        const duplicateRoutes = countDuplicates(
            routes,
            row => row.route_id
        );

        const duplicateStops = countDuplicates(
            stops,
            row => row.stop_id
        );

        const duplicateBuses = countDuplicates(
            buses,
            row => row.bus_id
        );

        const duplicateTrips = countDuplicates(
            trips,
            row => row.trip_id
        );

        const duplicateSchedules = countDuplicates(
            schedules,
            row => makeKey(row.trip_id, row.stop_sequence)
        );

        const duplicateObservations = countDuplicates(
            observations,
            row => makeKey(row.trip_id, row.stop_sequence)
        );

        const duplicateTotal =
            duplicateRoutes +
            duplicateStops +
            duplicateBuses +
            duplicateTrips +
            duplicateSchedules +
            duplicateObservations;

        addQualityCheck("Duplicate identifiers or trip-stop keys", duplicateTotal);

        if (duplicateTotal > 0) {
            addIssue(
                "Duplicate records",
                `Found ${duplicateTotal} duplicate identifier(s) or trip-stop key(s).`
            );
        }

        // 2. Validate route references in trips.
        let unknownRouteCount = 0;
        let unknownBusCount = 0;

        trips.forEach(trip => {
            if (!routeIds.has(trip.route_id)) {
                unknownRouteCount++;
                addIssue(
                    "Unknown route reference",
                    `Trip ${trip.trip_id} references route ${trip.route_id}.`
                );
            }

            if (!busIds.has(trip.bus_id)) {
                unknownBusCount++;
                addIssue(
                    "Unknown bus reference",
                    `Trip ${trip.trip_id} references bus ${trip.bus_id}.`
                );
            }

            if (!/^\d{4}-\d{2}-\d{2}$/.test(trip.service_date)) {
                addIssue(
                    "Invalid service date",
                    `Trip ${trip.trip_id} has service date ${trip.service_date}.`
                );
            }
        });

        addQualityCheck("Unknown route references", unknownRouteCount);
        addQualityCheck("Unknown bus references", unknownBusCount);

        // 3. Validate bus capacities.
        let invalidCapacityCount = 0;

        buses.forEach(bus => {
            if (!isPositiveInteger(bus.capacity)) {
                invalidCapacityCount++;

                addIssue(
                    "Invalid bus capacity",
                    `Bus ${bus.bus_id} has capacity ${bus.capacity}.`
                );
            }
        });

        addQualityCheck("Invalid bus capacities", invalidCapacityCount);

        // 4. Validate schedule references and timestamps.
        let unknownTripInSchedule = 0;
        let unknownStopCount = 0;
        let invalidScheduleTime = 0;
        let invalidSequenceCount = 0;

        schedules.forEach(schedule => {
            const key = makeKey(
                schedule.trip_id,
                schedule.stop_sequence
            );

            if (!tripIds.has(schedule.trip_id)) {
                unknownTripInSchedule++;
                addIssue(
                    "Unknown trip in schedule",
                    `Schedule record ${key} references an unknown trip.`
                );
            }

            if (!stopIds.has(schedule.stop_id)) {
                unknownStopCount++;
                addIssue(
                    "Unknown stop reference",
                    `Schedule record ${key} references stop ${schedule.stop_id}.`
                );
            }

            if (!isPositiveInteger(schedule.stop_sequence)) {
                invalidSequenceCount++;
                addIssue(
                    "Invalid stop sequence",
                    `Schedule record ${key} has an invalid sequence.`
                );
            }

            if (!parseTimestamp(schedule.scheduled_arrival)) {
                invalidScheduleTime++;
                addIssue(
                    "Invalid scheduled arrival",
                    `Schedule record ${key} has an invalid timestamp.`
                );
            }

            if (!scheduleMap.has(key)) {
                scheduleMap.set(key, schedule);
            }
        });

        addQualityCheck("Unknown trips in schedule", unknownTripInSchedule);
        addQualityCheck("Unknown stop references", unknownStopCount);
        addQualityCheck("Invalid stop sequences", invalidSequenceCount);
        addQualityCheck("Invalid scheduled timestamps", invalidScheduleTime);

        // 5. Validate passenger observations.
        let unknownTripInObservations = 0;
        let unmatchedObservations = 0;
        let invalidBoardings = 0;
        let invalidAlightings = 0;
        let missingActualArrivals = 0;
        let invalidActualArrivals = 0;

        observations.forEach(observation => {
            const key = makeKey(
                observation.trip_id,
                observation.stop_sequence
            );

            if (!tripIds.has(observation.trip_id)) {
                unknownTripInObservations++;

                addIssue(
                    "Unknown trip in observations",
                    `Observation ${key} references an unknown trip.`
                );
            }

            if (!scheduleMap.has(key)) {
                unmatchedObservations++;

                addIssue(
                    "Unmatched observation",
                    `Observation ${key} has no matching schedule record.`
                );
            }

            if (!isNonNegativeInteger(observation.boarding)) {
                invalidBoardings++;

                addIssue(
                    "Invalid boarding count",
                    `Observation ${key} has boarding value ${observation.boarding}.`
                );
            }

            if (!isNonNegativeInteger(observation.alighting)) {
                invalidAlightings++;

                addIssue(
                    "Invalid alighting count",
                    `Observation ${key} has alighting value ${observation.alighting}.`
                );
            }

            if (
                !observation.actual_arrival ||
                !observation.actual_arrival.trim()
            ) {
                missingActualArrivals++;

                addIssue(
                    "Missing actual arrival",
                    `Observation ${key} has no actual arrival timestamp.`,
                    "warning"
                );
            } else if (!parseTimestamp(observation.actual_arrival)) {
                invalidActualArrivals++;

                addIssue(
                    "Invalid actual arrival",
                    `Observation ${key} has an invalid timestamp.`
                );
            }

            if (!observationMap.has(key)) {
                observationMap.set(key, observation);
            }
        });

        addQualityCheck(
            "Unknown trips in observations",
            unknownTripInObservations
        );

        addQualityCheck(
            "Observations without matching schedules",
            unmatchedObservations
        );

        addQualityCheck(
            "Invalid boarding counts",
            invalidBoardings
        );

        addQualityCheck(
            "Invalid alighting counts",
            invalidAlightings
        );

        addQualityCheck(
            "Missing actual arrival timestamps",
            missingActualArrivals,
            "warning"
        );

        addQualityCheck(
            "Invalid actual arrival timestamps",
            invalidActualArrivals
        );

        // 6. Find schedule records without observations.
        let missingObservations = 0;

        schedules.forEach(schedule => {
            const key = makeKey(
                schedule.trip_id,
                schedule.stop_sequence
            );

            if (!observationMap.has(key)) {
                missingObservations++;

                addIssue(
                    "Missing observation",
                    `Schedule record ${key} has no matching observation.`,
                    "warning"
                );
            }
        });

        addQualityCheck(
            "Schedule records without observations",
            missingObservations,
            "warning"
        );

        // 7. Calculate passenger occupancy sequentially.
        const sortedObservations = observations
            .filter(observation =>
                tripIds.has(observation.trip_id)
            )
            .filter(observation =>
                scheduleMap.has(
                    makeKey(
                        observation.trip_id,
                        observation.stop_sequence
                    )
                )
            )
            .slice()
            .sort((a, b) => {
                const tripComparison =
                    a.trip_id.localeCompare(b.trip_id);

                if (tripComparison !== 0) {
                    return tripComparison;
                }

                return (
                    Number(a.stop_sequence) -
                    Number(b.stop_sequence)
                );
            });

        const occupancyByTrip = new Map();

        let invalidAlightingMovement = 0;
        let negativeOccupancy = 0;
        let capacityViolations = 0;

        sortedObservations.forEach(observation => {
            const trip = tripMap.get(observation.trip_id);

            const capacity = busCapacityMap.get(trip.bus_id);

            const boarding = Number(observation.boarding);
            const alighting = Number(observation.alighting);

            const previousOccupancy =
                occupancyByTrip.get(observation.trip_id) || 0;

            if (
                !Number.isInteger(boarding) ||
                !Number.isInteger(alighting) ||
                boarding < 0 ||
                alighting < 0
            ) {
                return;
            }

            const availablePassengers =
                previousOccupancy + boarding;

            if (alighting > availablePassengers) {
                invalidAlightingMovement++;

                addIssue(
                    "Alighting exceeds available passengers",
                    `Trip ${observation.trip_id}, stop ${observation.stop_sequence}: ` +
                    `${alighting} alighting, but only ${availablePassengers} available.`
                );
            }

            const newOccupancy =
                availablePassengers - alighting;

            if (newOccupancy < 0) {
                negativeOccupancy++;

                addIssue(
                    "Negative occupancy",
                    `Trip ${observation.trip_id} has negative occupancy.`
                );
            }

            if (
                Number.isFinite(capacity) &&
                capacity > 0 &&
                newOccupancy > capacity
            ) {
                capacityViolations++;

                addIssue(
                    "Bus capacity exceeded",
                    `Trip ${observation.trip_id}, stop ${observation.stop_sequence}: ` +
                    `${newOccupancy} passengers on a bus with capacity ${capacity}.`
                );
            }

            occupancyByTrip.set(
                observation.trip_id,
                Math.max(0, newOccupancy)
            );
        });

        addQualityCheck(
            "Alighting exceeds available passengers",
            invalidAlightingMovement
        );

        addQualityCheck(
            "Negative occupancy",
            negativeOccupancy
        );

        addQualityCheck(
            "Bus capacity violations",
            capacityViolations
        );

        // 8. Report total checks and issues.
        const errorCount = issues.filter(
            issue => issue.severity === "error"
        ).length;

        const warningCount = issues.filter(
            issue => issue.severity === "warning"
        ).length;

        const totalRecords =
            routes.length +
            stops.length +
            buses.length +
            trips.length +
            schedules.length +
            observations.length;

        renderSummary(
            totalRecords,
            errorCount,
            warningCount
        );

        renderQualityResults();
        renderDetails();

        statusElement.textContent =
            errorCount === 0 && warningCount === 0
                ? "Validation completed. All checks passed."
                : `Validation completed. ${errorCount} error(s) and ` +
                  `${warningCount} warning(s) found.`;

        statusElement.className =
            errorCount > 0
                ? "status-fail"
                : warningCount > 0
                    ? "status-warning"
                    : "status-pass";
    }

    async function runValidation() {
        runButton.disabled = true;
        runButton.textContent = "Validating...";

        statusElement.textContent =
            "Loading and inspecting CSV files...";

        summaryElement.innerHTML = "";
        issues = [];
        checks = [];

        try {
            const files = await loadFiles();

            const data = {};

            files.forEach(file => {
                data[file.name] = file;
            });

            renderFileResults(files);

            validateDataset(data);

        } catch (error) {
            statusElement.textContent =
                `Validation failed: ${error.message}`;

            statusElement.className = "status-fail";

            console.error(error);

        } finally {
            runButton.disabled = false;
            runButton.textContent = "Run Dataset Validation";
        }
    }

    runButton.addEventListener("click", runValidation);

    // Automatically run validation when the page opens.
    runValidation();

});
