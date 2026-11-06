/* Route efficiency metrics.
   Per route:
   - journeyTimeRatio: mean actual journey time / mean scheduled journey time (1.00 = on schedule)
   - headwayMin: mean gap between consecutive trips of a route on the same service date
   - headwayCV: coefficient of variation of those gaps (lower = more regular service)
   - avgOccupancyPct: mean load as % of bus capacity across all stop records
   Note: with 2 trips per route per day, each day yields one headway gap, so headway
   metrics are based on 28 gaps per route and are indicative only. */
(function (global) {
  const minutesBetween = (a, b) => (new Date(b) - new Date(a)) / 60000;

  function compute({ routes, buses, trips, tripStops, observations }) {
    const capacity = new Map(buses.map(b => [b.bus_id, +b.capacity]));
    const tripById = new Map(trips.map(t => [t.trip_id, t]));
    const obsByKey = new Map(observations.map(o => [o.trip_id + "|" + o.stop_sequence, o]));
    const stopsByTrip = d3.group(tripStops, d => d.trip_id);

    const tripRows = [];
    for (const [tripId, stops] of stopsByTrip) {
      const trip = tripById.get(tripId);
      if (!trip) continue;
      stops.sort((a, b) => +a.stop_sequence - +b.stop_sequence);
      const first = stops[0], last = stops[stops.length - 1];
      const oFirst = obsByKey.get(tripId + "|" + first.stop_sequence);
      const oLast = obsByKey.get(tripId + "|" + last.stop_sequence);
      if (!oFirst || !oLast) continue;

      const cap = capacity.get(trip.bus_id);
      let load = 0, occSum = 0, n = 0;
      for (const s of stops) {
        const o = obsByKey.get(tripId + "|" + s.stop_sequence);
        if (!o) continue;
        load += +o.boarding - +o.alighting;
        occSum += (load / cap) * 100;
        n++;
      }
      tripRows.push({
        route_id: trip.route_id,
        service_date: trip.service_date,
        departure: first.scheduled_departure || first.scheduled_arrival,
        scheduledMin: minutesBetween(first.scheduled_arrival, last.scheduled_arrival),
        actualMin: minutesBetween(oFirst.actual_arrival, oLast.actual_arrival),
        occupancyPct: n ? occSum / n : NaN
      });
    }

    return routes.map(route => {
      const rows = tripRows.filter(r => r.route_id === route.route_id);
      const gaps = [];
      for (const [, list] of d3.group(rows, r => r.service_date)) {
        list.sort((a, b) => new Date(a.departure) - new Date(b.departure));
        for (let i = 1; i < list.length; i++) gaps.push(minutesBetween(list[i - 1].departure, list[i].departure));
      }
      const meanGap = d3.mean(gaps);
      const sdGap = gaps.length > 1 ? d3.deviation(gaps) : NaN;
      const meanSched = d3.mean(rows, r => r.scheduledMin);
      const meanActual = d3.mean(rows, r => r.actualMin);
      return {
        route_id: route.route_id,
        route_name: route.route_name,
        trips: rows.length,
        scheduledMin: meanSched,
        actualMin: meanActual,
        journeyTimeRatio: meanActual / meanSched,
        headwayMin: meanGap,
        headwayCV: sdGap / meanGap,
        avgOccupancyPct: d3.mean(rows, r => r.occupancyPct)
      };
    });
  }

  function render(data) {
    const tbody = document.getElementById("efficiency-body");
    if (tbody) {
      tbody.innerHTML = "";
      data.forEach(d => {
        const flag = d.journeyTimeRatio > 1.05 ? "Slower than schedule" : "On schedule";
        tbody.insertAdjacentHTML("beforeend",
          `<tr><td>${d.route_name}</td><td>${d.trips}</td>` +
          `<td>${d.scheduledMin.toFixed(1)}</td><td>${d.actualMin.toFixed(1)}</td>` +
          `<td>${d.journeyTimeRatio.toFixed(2)}</td><td>${d.headwayMin.toFixed(0)}</td>` +
          `<td>${d.headwayCV.toFixed(2)}</td><td>${d.avgOccupancyPct.toFixed(1)}%</td>` +
          `<td>${flag}</td></tr>`);
      });
    }
    const svg = d3.select("#efficiency-chart");
    if (svg.empty()) return;
    svg.selectAll("*").remove();
    const W = 720, H = 320, m = { top: 20, right: 20, bottom: 60, left: 55 };
    svg.attr("viewBox", `0 0 ${W} ${H}`);
    const x = d3.scaleBand().domain(data.map(d => d.route_id)).range([m.left, W - m.right]).padding(0.2);
    const y = d3.scaleLinear()
      .domain([0, Math.max(1.2, d3.max(data, d => d.journeyTimeRatio) * 1.1)])
      .range([H - m.bottom, m.top]);
    svg.append("g").attr("transform", `translate(0,${H - m.bottom})`).call(d3.axisBottom(x))
      .selectAll("text").attr("transform", "rotate(-40)").style("text-anchor", "end");
    svg.append("g").attr("transform", `translate(${m.left},0)`).call(d3.axisLeft(y).ticks(6));
    svg.append("line").attr("x1", m.left).attr("x2", W - m.right)
      .attr("y1", y(1)).attr("y2", y(1)).attr("stroke", "#888").attr("stroke-dasharray", "4 3");
    svg.selectAll("rect").data(data).join("rect")
      .attr("x", d => x(d.route_id)).attr("width", x.bandwidth())
      .attr("y", d => y(d.journeyTimeRatio)).attr("height", d => y(0) - y(d.journeyTimeRatio))
      .attr("fill", d => d.journeyTimeRatio > 1.05 ? "#d9534f" : "#5cb85c");
    svg.append("text").attr("x", W / 2).attr("y", H - 8).attr("text-anchor", "middle")
      .text("Route").style("font-size", "12px");
    svg.append("text").attr("transform", "rotate(-90)").attr("x", -H / 2).attr("y", 14)
      .attr("text-anchor", "middle").text("Journey-time ratio (actual / scheduled)").style("font-size", "12px");
  }

  async function init() {
    if (!document.getElementById("efficiency-body") && !document.getElementById("efficiency-chart")) return;
    const [routes, buses, trips, tripStops, observations] = await Promise.all([
      d3.csv("../data/routes.csv"), d3.csv("../data/buses.csv"), d3.csv("../data/trips.csv"),
      d3.csv("../data/trip_stops.csv"), d3.csv("../data/stop_observations.csv")
    ]);
    const data = compute({ routes, buses, trips, tripStops, observations });
    render(data);
    global.RouteEfficiency = { compute, data };
  }

  global.RouteEfficiency = { compute };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})(window);
