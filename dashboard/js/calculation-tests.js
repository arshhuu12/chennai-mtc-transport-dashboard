
// Independent calculation verification tests

function calculateDelay(scheduledArrival, actualArrival) {
    if (!actualArrival) {
        return null;
    }

    return (
        Date.parse(actualArrival) -
        Date.parse(scheduledArrival)
    ) / 60000;
}

function calculateOccupancy(previous, boarding, alighting) {
    return previous + boarding - alighting;
}

function calculateOnTimeMetrics(delays) {
    const validDelays = delays.filter(
        value => Number.isFinite(value)
    );

    const onTime = validDelays.filter(
        value => value >= 0 && value <= 5
    );

    const early = validDelays.filter(
        value => value < 0
    );

    return {
        onTimePercentage: validDelays.length
            ? (onTime.length / validDelays.length) * 100
            : 0,
        earlyCount: early.length,
        validCount: validDelays.length
    };
}

function calculateTimeWeightedOccupancy(segments) {
    let passengerMinutes = 0;
    let capacityMinutes = 0;

    segments.forEach(segment => {
        passengerMinutes +=
            segment.occupancy * segment.duration;

        capacityMinutes +=
            segment.capacity * segment.duration;
    });

    return capacityMinutes > 0
        ? (passengerMinutes / capacityMinutes) * 100
        : 0;
}

// Run all independent tests

function runCalculationTests() {
    const results = [];

    function addTest(name, expected, actual, tolerance = 0.001) {
        const passed =
            typeof expected === "number" &&
            typeof actual === "number"
                ? Math.abs(expected - actual) <= tolerance
                : expected === actual;

        results.push({
            name,
            expected,
            actual,
            passed
        });
    }

    // Test 1: Seven-minute delay
    addTest(
        "Delay calculation",
        7,
        calculateDelay(
            "2026-11-06T08:00:00+05:30",
            "2026-11-06T08:07:00+05:30"
        )
    );

    // Test 2: Early arrival
    addTest(
        "Early arrival",
        -2,
        calculateDelay(
            "2026-11-06T08:00:00+05:30",
            "2026-11-06T07:58:00+05:30"
        )
    );

    // Test 3: Sequential passenger occupancy
    let occupancy = 0;

    occupancy = calculateOccupancy(occupancy, 10, 0);
    occupancy = calculateOccupancy(occupancy, 5, 3);
    occupancy = calculateOccupancy(occupancy, 0, 12);

    addTest(
        "Final passenger occupancy",
        0,
        occupancy
    );

    // Test 4: On-time percentage
    // -2 = early, 0 and 5 = on time, 6 and 9 = late
    const metrics = calculateOnTimeMetrics([
        -2, 0, 5, 6, 9, null
    ]);

    addTest(
        "On-time percentage",
        40,
        metrics.onTimePercentage
    );

    // Test 5: Time-weighted occupancy
    const weightedOccupancy = calculateTimeWeightedOccupancy([
        { occupancy: 20, capacity: 50, duration: 10 },
        { occupancy: 30, capacity: 50, duration: 20 },
        { occupancy: 10, capacity: 50, duration: 10 }
    ]);

    addTest(
        "Time-weighted occupancy",
        45,
        weightedOccupancy
    );

    // Test 6: Missing actual arrival
    const missingArrivalDelay = calculateDelay(
        "2026-11-06T08:00:00+05:30",
        null
    );

    addTest(
        "Missing arrival delay",
        null,
        missingArrivalDelay
    );

    // Display test results
    const tableBody = document.getElementById("test-results");
    tableBody.innerHTML = "";

    results.forEach(test => {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${test.name}</td>
            <td>${test.expected}</td>
            <td>${test.actual}</td>
            <td class="${test.passed ? "pass" : "fail"}">
                ${test.passed ? "PASS" : "FAIL"}
            </td>
        `;

        tableBody.appendChild(row);
    });

    const passedCount = results.filter(
        test => test.passed
    ).length;

    document.getElementById("summary").textContent =
        `${passedCount} of ${results.length} tests passed.`;
}

document.getElementById("run-tests").addEventListener(
    "click",
    runCalculationTests
);
