// File: js/metrics.js
// Responsibility: calculate dashboard metrics without manipulating the DOM.
// These functions are intentionally independent of D3 and browser UI elements.

window.TransitMetrics = (() => {
  const ON_TIME_MAX_DELAY_MINUTES = 5; // Project rule, not an official MTC standard.

  function sum(records, field) {
    return records.reduce((total, record) => {
      const value = Number(record[field]);
      return total + (Number.isFinite(value) ? value : 0);
    }, 0);
  }

  function mean(values) {
    const validValues = values.filter(Number.isFinite);
    if (!validValues.length) return undefined;
    return validValues.reduce((total, value) => total + value, 0) / validValues.length;
  }

  function calculateTimeWeightedOccupancy(records) {
    const tripGroups = new Map();

    records.forEach((record) => {
      if (!tripGroups.has(record.tripId)) tripGroups.set(record.tripId, []);
      tripGroups.get(record.tripId).push(record);
    });

    let totalPassengerMinutes = 0;
    let totalCapacityMinutes = 0;

    tripGroups.forEach((tripRecords) => {
      const sortedRecords = [...tripRecords].sort(
        (a, b) => a.stopSequence - b.stopSequence,
      );

      for (let i = 0; i < sortedRecords.length - 1; i++) {
        const current = sortedRecords[i];
        const next = sortedRecords[i + 1];

        if (!(current.actualArrival instanceof Date) || !(next.actualArrival instanceof Date)) continue;
        if (!Number.isFinite(current.actualArrival.getTime()) || !Number.isFinite(next.actualArrival.getTime())) continue;

        const durationMinutes = (next.actualArrival - current.actualArrival) / 60000;
        if (durationMinutes <= 0) continue;

        const occupancy = Number(current.occupancy);
        const capacity = Number(current.capacity);
        if (!Number.isFinite(occupancy) || !Number.isFinite(capacity) || capacity <= 0) continue;

        totalPassengerMinutes += occupancy * durationMinutes;
        totalCapacityMinutes += capacity * durationMinutes;
      }
    });

    if (totalCapacityMinutes === 0) return undefined;
    return (totalPassengerMinutes / totalCapacityMinutes) * 100;
  }

  function calculateDashboardMetrics(records) {
    const validDelayRecords = records.filter((record) =>
      Number.isFinite(record.delayMinutes),
    );
    const delays = validDelayRecords.map((record) => record.delayMinutes);
    const onTimeCount = delays.filter(
      (delay) => delay >= 0 && delay <= ON_TIME_MAX_DELAY_MINUTES,
    ).length;
    const earlyArrivalCount = delays.filter((delay) => delay < 0).length;

    return {
      totalBoardings: sum(records, "boarding"),
      totalAlightings: sum(records, "alighting"),
      averageDelay: mean(delays),
      validDelayCount: validDelayRecords.length,
      onTimeCount,
      onTimePercentage: delays.length ? (onTimeCount / delays.length) * 100 : 0,
      earlyArrivalCount,
      timeWeightedOccupancy: calculateTimeWeightedOccupancy(records),
    };
  }

  function calculateRouteSummaries(records) {
    const routeGroups = new Map();

    records.forEach((record) => {
      if (!routeGroups.has(record.routeId)) routeGroups.set(record.routeId, []);
      routeGroups.get(record.routeId).push(record);
    });

    return Array.from(routeGroups, ([routeId, routeRecords]) => {
      const validDelays = routeRecords
        .map((record) => record.delayMinutes)
        .filter(Number.isFinite);

      return {
        routeId,
        routeName: routeRecords[0].routeName,
        boardings: sum(routeRecords, "boarding"),
        averageDelay: mean(validDelays),
      };
    }).sort((a, b) => b.boardings - a.boardings);
  }

  return {
    calculateDashboardMetrics,
    calculateRouteSummaries,
    calculateTimeWeightedOccupancy,
  };
})();
