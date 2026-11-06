// File: js/charts.js
// Persistent D3 chart components. Updates data in place instead of deleting and
// rebuilding every SVG element, which prevents the dashboard's sudden visual jumps.
(function (global) {
  "use strict";
  if (typeof d3 === "undefined") {
    console.error("D3.js is not available. charts.js could not initialise.");
    return;
  }

  const DURATION = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 550;
  const ease = d3.easeCubicOut;

  function chartFrame(selector, height, margins) {
    const svg = d3.select(selector);
    if (svg.empty()) return null;
    const parent = svg.node().parentElement;
    const width = Math.max(320, parent.clientWidth || 700);
    svg.attr("viewBox", `0 0 ${width} ${height}`).attr("width", "100%")
      .attr("height", height).style("display", "block");
    let root = svg.selectAll("g.chart-root").data([null]).join("g").attr("class", "chart-root");
    let plot = root.selectAll("g.plot-area").data([null]).join("g").attr("class", "plot-area")
      .attr("transform", `translate(${margins.left},${margins.top})`);
    return { svg, root, plot, width, height,
      plotWidth: Math.max(100, width - margins.left - margins.right),
      plotHeight: Math.max(80, height - margins.top - margins.bottom), margins };
  }

  function showEmpty(frame, message) {
    if (!frame) return;
    frame.plot.selectAll("*").remove();
    frame.root.selectAll("text.empty-state").data([message]).join("text")
      .attr("class", "empty-state").attr("x", frame.width / 2).attr("y", frame.height / 2)
      .attr("text-anchor", "middle").attr("fill", "#718096").text(d => d);
  }

  function clearEmpty(frame) { frame.root.selectAll("text.empty-state").remove(); }

  function drawLollipop(selector, data, labelKey, valueKey, title) {
    const frame = chartFrame(selector, 390, {top: 42, right: 48, bottom: 48, left: 150});
    if (!frame) return;
    if (!data.length) return showEmpty(frame, "No data available for these filters.");
    clearEmpty(frame);
    const rows = data.slice(0, 12);
    const x = d3.scaleLinear().domain([0, d3.max(rows, d => +d[valueKey]) * 1.16 || 1]).nice().range([0, frame.plotWidth]);
    const y = d3.scaleBand().domain(rows.map(d => d[labelKey])).range([0, frame.plotHeight]).padding(.42);
    frame.root.selectAll("text.chart-title").data([title]).join("text").attr("class", "chart-title")
      .attr("x", frame.width/2).attr("y", 22).attr("text-anchor", "middle").attr("font-weight", 700).attr("fill", "#26384d").text(d=>d);
    frame.plot.selectAll("g.x-axis").data([null]).join("g").attr("class", "x-axis")
      .attr("transform", `translate(0,${frame.plotHeight})`).transition().duration(DURATION).ease(ease).call(d3.axisBottom(x).ticks(5));
    frame.plot.selectAll("g.y-axis").data([null]).join("g").attr("class", "y-axis")
      .transition().duration(DURATION).ease(ease).call(d3.axisLeft(y));
    const stems = frame.plot.selectAll("line.lollipop-stem").data(rows, d => d[labelKey]).join(
      enter => enter.append("line").attr("class", "lollipop-stem").attr("x1", 0).attr("x2", 0),
      update => update,
      exit => exit.transition().duration(DURATION/2).attr("x2", 0).style("opacity", 0).remove()
    );
    stems.transition().duration(DURATION).ease(ease).attr("x1", 0).attr("x2", d => x(+d[valueKey] || 0))
      .attr("y1", d => y(d[labelKey]) + y.bandwidth()/2).attr("y2", d => y(d[labelKey]) + y.bandwidth()/2)
      .attr("stroke", "#b8c8d8").attr("stroke-width", 3).style("opacity", 1);
    const dots = frame.plot.selectAll("circle.lollipop-dot").data(rows, d => d[labelKey]).join(
      enter => enter.append("circle").attr("class", "lollipop-dot").attr("cx", 0).attr("r", 0),
      update => update,
      exit => exit.transition().duration(DURATION/2).attr("r", 0).remove()
    );
    dots.transition().duration(DURATION).ease(ease).attr("cx", d => x(+d[valueKey] || 0))
      .attr("cy", d => y(d[labelKey]) + y.bandwidth()/2).attr("r", 6).attr("fill", "#087f6a");
    dots.selectAll("title").data(d=>[d]).join("title").text(d=>`${d[labelKey]}: ${d[valueKey]} boardings`);
    const values = frame.plot.selectAll("text.point-value").data(rows, d=>d[labelKey]).join("text")
      .attr("class", "point-value").attr("dominant-baseline", "middle").attr("font-size", 11).attr("fill", "#526174")
      .text(d => d3.format(",.0f")(+d[valueKey] || 0));
    values.transition().duration(DURATION).ease(ease).attr("x", d=>x(+d[valueKey]||0)+10).attr("y", d=>y(d[labelKey])+y.bandwidth()/2);
  }

  function drawRankedBars(selector, data, labelKey, valueKey, title) {
    // Fixed height prevents the dashboard grid from jumping when filters change row counts.
    const height = 560;
    const frame = chartFrame(selector, height, {top: 42, right: 58, bottom: 42, left: 170});
    if (!frame) return;
    if (!data.length) return showEmpty(frame, "No data available for these filters.");
    clearEmpty(frame);
    const rows = data.slice(0, 15);
    const x = d3.scaleLinear().domain([0, d3.max(rows,d=>+d[valueKey])*1.15 || 1]).nice().range([0,frame.plotWidth]);
    const y = d3.scaleBand().domain(rows.map(d=>d[labelKey])).range([0,frame.plotHeight]).padding(.22);
    frame.root.selectAll("text.chart-title").data([title]).join("text").attr("class","chart-title")
      .attr("x",frame.width/2).attr("y",22).attr("text-anchor","middle").attr("font-weight",700).attr("fill","#26384d").text(d=>d);
    frame.plot.selectAll("g.x-axis").data([null]).join("g").attr("class","x-axis").attr("transform",`translate(0,${frame.plotHeight})`)
      .transition().duration(DURATION).ease(ease).call(d3.axisBottom(x).ticks(5));
    frame.plot.selectAll("g.y-axis").data([null]).join("g").attr("class","y-axis").transition().duration(DURATION).ease(ease).call(d3.axisLeft(y));
    const bars = frame.plot.selectAll("rect.demand-bar").data(rows,d=>d[labelKey]).join(
      enter=>enter.append("rect").attr("class","demand-bar").attr("x",0).attr("width",0),
      update=>update,
      exit=>exit.transition().duration(DURATION/2).attr("width",0).style("opacity",0).remove()
    );
    bars.transition().duration(DURATION).ease(ease).attr("y",d=>y(d[labelKey])).attr("height",y.bandwidth())
      .attr("width",d=>x(+d[valueKey]||0)).attr("rx",5).attr("fill","#3b82f6").style("opacity",1);
    bars.selectAll("title").data(d=>[d]).join("title").text(d=>`${d[labelKey]}: ${d[valueKey]} boardings`);
  }

  function drawDailyDemandChart(records) {
    const frame = chartFrame("#daily-demand-chart", 330, {top: 30, right: 28, bottom: 48, left: 58});
    if (!frame) return;
    const daily = Array.from(d3.group(records,d=>d.serviceDate),([date,items])=>({date,boardings:d3.sum(items,d=>+d.boarding||0)}))
      .filter(d=>d.date).sort((a,b)=>a.date.localeCompare(b.date));
    if (!daily.length) return showEmpty(frame,"No daily demand data available for these filters.");
    clearEmpty(frame);
    const parse = d3.timeParse("%Y-%m-%d");
    daily.forEach(d=>d.day=parse(d.date));
    const valid = daily.filter(d=>d.day);
    if (!valid.length) return showEmpty(frame,"Service dates could not be parsed.");
    const x = d3.scaleTime().domain(d3.extent(valid,d=>d.day)).range([0,frame.plotWidth]);
    const y = d3.scaleLinear().domain([0,d3.max(valid,d=>d.boardings)||1]).nice().range([frame.plotHeight,0]);
    const area = d3.area().x(d=>x(d.day)).y0(frame.plotHeight).y1(d=>y(d.boardings)).curve(d3.curveMonotoneX);
    const line = d3.line().x(d=>x(d.day)).y(d=>y(d.boardings)).curve(d3.curveMonotoneX);
    frame.plot.selectAll("g.x-axis").data([null]).join("g").attr("class","x-axis").attr("transform",`translate(0,${frame.plotHeight})`)
      .transition().duration(DURATION).ease(ease).call(d3.axisBottom(x).ticks(Math.min(7,valid.length)).tickFormat(d3.timeFormat("%d %b")));
    frame.plot.selectAll("g.y-axis").data([null]).join("g").attr("class","y-axis").transition().duration(DURATION).ease(ease).call(d3.axisLeft(y).ticks(5));
    frame.plot.selectAll("path.demand-area").data([valid]).join("path").attr("class","demand-area").attr("fill","#087f6a").attr("opacity",.12)
      .transition().duration(DURATION).ease(ease).attr("d",area);
    frame.plot.selectAll("path.demand-line").data([valid]).join("path").attr("class","demand-line").attr("fill","none").attr("stroke","#087f6a").attr("stroke-width",3)
      .transition().duration(DURATION).ease(ease).attr("d",line);
    const dots=frame.plot.selectAll("circle.daily-point").data(valid,d=>d.date).join(
      enter=>enter.append("circle").attr("class","daily-point").attr("r",0),
      update=>update,
      exit=>exit.transition().duration(DURATION/2).attr("r",0).remove()
    );
    dots.transition().duration(DURATION).ease(ease).attr("cx",d=>x(d.day)).attr("cy",d=>y(d.boardings)).attr("r",3.5).attr("fill","#087f6a");
    dots.selectAll("title").data(d=>[d]).join("title").text(d=>`${d.date}: ${d3.format(",")(d.boardings)} boardings`);
  }

  function drawRouteChart(records) {
    const data=Array.from(d3.group(records,d=>d.routeId),([routeId,items])=>({routeId,routeName:items[0].routeName,boardings:d3.sum(items,d=>+d.boarding||0)}))
      .sort((a,b)=>b.boardings-a.boardings);
    drawLollipop("#route-chart",data,"routeName","boardings","Passenger Boardings by Route");
  }
  function drawStopChart(records, selectedRoute) {
    const data=Array.from(d3.group(records,d=>d.stopId),([stopId,items])=>({stopId,stopName:items[0].stopName,boardings:d3.sum(items,d=>+d.boarding||0)}))
      .sort((a,b)=>b.boardings-a.boardings||a.stopName.localeCompare(b.stopName));
    drawRankedBars("#stop-chart",data,"stopName","boardings",selectedRoute&&selectedRoute!=="all"?"Stop Demand for Selected Route":"Top 15 Stops by Passenger Boardings");
  }
  global.TransitCharts={drawRouteChart,drawStopChart,drawDailyDemandChart};
})(window);
