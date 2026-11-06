// File: js/advanced-charts.js
// Advanced distribution and utilisation charts. SVG elements are updated in place.
document.addEventListener("DOMContentLoaded", () => {
  if (typeof d3 === "undefined") return console.error("D3.js is not available.");
  const DURATION = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 550;
  const ease = d3.easeCubicOut;
  createAdvancedChartSections();
  document.addEventListener("dashboard:filtered", event => {
    const records = event.detail.records || [];
    drawDelayHistogram(records);
    drawOccupancyChart(records);
  });

  function addSection(id,title,description,svgId) {
    if (document.getElementById(id)) return;
    const section=document.createElement("section"); section.id=id;
    const h=document.createElement("h2"); h.textContent=title;
    const p=document.createElement("p"); p.textContent=description;
    const svg=document.createElementNS("http://www.w3.org/2000/svg","svg"); svg.id=svgId;
    svg.style.width="100%"; svg.style.minHeight="330px";
    section.append(h,p,svg); document.querySelector("main")?.appendChild(section);
  }
  function createAdvancedChartSections(){
    addSection("daily-demand-section","Daily Passenger Demand","Track daily passenger boardings for the selected routes and service dates.","daily-demand-placeholder");
    // Move the daily SVG into the chart section and use the selector expected by charts.js.
    const placeholder=document.getElementById("daily-demand-placeholder"); if(placeholder) placeholder.id="daily-demand-chart";
    addSection("delay-analysis-section","Arrival Delay Distribution","Frequency of early and late arrivals, grouped into five-minute intervals.","delay-histogram");
    addSection("occupancy-analysis-section","Time-Weighted Bus Occupancy","Compare passenger occupancy against the full vehicle capacity.","occupancy-chart");
  }
  function frame(selector,height,margin){
    const svg=d3.select(selector); if(svg.empty()) return null;
    const width=Math.max(320,svg.node().parentElement.clientWidth||700);
    svg.attr("viewBox",`0 0 ${width} ${height}`).attr("width","100%").attr("height",height).style("display","block");
    const root=svg.selectAll("g.chart-root").data([null]).join("g").attr("class","chart-root");
    const plot=root.selectAll("g.plot-area").data([null]).join("g").attr("class","plot-area").attr("transform",`translate(${margin.left},${margin.top})`);
    return {svg,root,plot,width,height,pw:Math.max(100,width-margin.left-margin.right),ph:Math.max(80,height-margin.top-margin.bottom)};
  }
  function empty(f,msg){ if(!f)return; f.plot.selectAll("*").remove(); f.root.selectAll("text.empty-state").data([msg]).join("text").attr("class","empty-state").attr("x",f.width/2).attr("y",f.height/2).attr("text-anchor","middle").attr("fill","#718096").text(d=>d); }
  function drawDelayHistogram(records){
    const values=records.map(r=>r.delayMinutes).filter(Number.isFinite);
    const f=frame("#delay-histogram",340,{top:25,right:28,bottom:65,left:58}); if(!f)return;
    if(!values.length)return empty(f,"No delay data available for these filters.");
    f.root.selectAll("text.empty-state").remove();
    const min=Math.min(0,d3.min(values)),max=Math.max(0,d3.max(values));
    const x=d3.scaleLinear().domain([Math.floor(min/5)*5,Math.ceil(max/5)*5||5]).nice().range([0,f.pw]);
    const thresholds=d3.range(Math.ceil(x.domain()[0]/5)*5,x.domain()[1],5);
    const bins=d3.bin().domain(x.domain()).thresholds(thresholds)(values);
    const y=d3.scaleLinear().domain([0,d3.max(bins,b=>b.length)||1]).nice().range([f.ph,0]);
    f.plot.selectAll("g.x-axis").data([null]).join("g").attr("class","x-axis").attr("transform",`translate(0,${f.ph})`).transition().duration(DURATION).ease(ease).call(d3.axisBottom(x));
    f.plot.selectAll("g.y-axis").data([null]).join("g").attr("class","y-axis").transition().duration(DURATION).ease(ease).call(d3.axisLeft(y).ticks(5));
    const bars=f.plot.selectAll("rect.delay-bin").data(bins,b=>`${b.x0}-${b.x1}`).join(
      enter=>enter.append("rect").attr("class","delay-bin").attr("y",f.ph).attr("height",0),
      update=>update,
      exit=>exit.transition().duration(DURATION/2).attr("height",0).remove()
    );
    bars.transition().duration(DURATION).ease(ease).attr("x",b=>x(b.x0)+1).attr("width",b=>Math.max(0,x(b.x1)-x(b.x0)-2)).attr("y",b=>y(b.length)).attr("height",b=>f.ph-y(b.length)).attr("rx",3).attr("fill",b=>b.x0<0?"#3b82f6":"#d99018");
    bars.selectAll("title").data(b=>[b]).join("title").text(b=>`${b.x0} to ${b.x1} minutes: ${b.length} arrivals`);
    f.plot.selectAll("line.zero-reference").data([0]).join("line").attr("class","zero-reference").transition().duration(DURATION).attr("x1",x(0)).attr("x2",x(0)).attr("y1",0).attr("y2",f.ph).attr("stroke","#64748b").attr("stroke-dasharray","4,4");
    f.plot.selectAll("text.x-label").data([null]).join("text").attr("class","x-label").attr("x",f.pw/2).attr("y",f.ph+48).attr("text-anchor","middle").attr("fill","#526174").text("Arrival delay in minutes (negative = early)");
  }
  function drawOccupancyChart(records){
    const trips=d3.group(records,r=>r.tripId), totals=new Map();
    trips.forEach(items=>{
      const sorted=[...items].sort((a,b)=>a.stopSequence-b.stopSequence);
      for(let i=0;i<sorted.length-1;i++){
        const a=sorted[i],b=sorted[i+1];
        if(!(a.actualArrival instanceof Date)||!(b.actualArrival instanceof Date)||!Number.isFinite(a.actualArrival.getTime())||!Number.isFinite(b.actualArrival.getTime()))continue;
        const mins=(b.actualArrival-a.actualArrival)/60000,occ=+a.occupancy,cap=+a.capacity;
        if(mins<=0||!Number.isFinite(occ)||!Number.isFinite(cap)||cap<=0)continue;
        if(!totals.has(a.routeId))totals.set(a.routeId,{routeName:a.routeName,passengerMinutes:0,capacityMinutes:0});
        const t=totals.get(a.routeId);t.passengerMinutes+=occ*mins;t.capacityMinutes+=cap*mins;
      }
    });
    const data=Array.from(totals,([routeId,t])=>({routeId,routeName:t.routeName,occupancy:t.capacityMinutes?100*t.passengerMinutes/t.capacityMinutes:0})).sort((a,b)=>b.occupancy-a.occupancy);
    // Keep a stable panel height across route selections to avoid layout reflow.
    const h=440,f=frame("#occupancy-chart",h,{top:25,right:55,bottom:42,left:150});if(!f)return;
    if(!data.length)return empty(f,"No valid time-weighted occupancy data available.");
    f.root.selectAll("text.empty-state").remove();
    const x=d3.scaleLinear().domain([0,100]).range([0,f.pw]),y=d3.scaleBand().domain(data.map(d=>d.routeName)).range([0,f.ph]).padding(.24);
    f.plot.selectAll("g.x-axis").data([null]).join("g").attr("class","x-axis").attr("transform",`translate(0,${f.ph})`).transition().duration(DURATION).ease(ease).call(d3.axisBottom(x).ticks(5).tickFormat(d=>`${d}%`));
    f.plot.selectAll("g.y-axis").data([null]).join("g").attr("class","y-axis").transition().duration(DURATION).ease(ease).call(d3.axisLeft(y));
    f.plot.selectAll("rect.capacity-track").data(data,d=>d.routeId).join("rect").attr("class","capacity-track").attr("x",0).attr("y",d=>y(d.routeName)).attr("height",y.bandwidth()).attr("width",f.pw).attr("rx",5).attr("fill","#e8eef4");
    const bars=f.plot.selectAll("rect.occupancy-value").data(data,d=>d.routeId).join(enter=>enter.append("rect").attr("class","occupancy-value").attr("width",0),update=>update,exit=>exit.transition().duration(DURATION/2).attr("width",0).remove());
    bars.transition().duration(DURATION).ease(ease).attr("x",0).attr("y",d=>y(d.routeName)).attr("height",y.bandwidth()).attr("width",d=>x(Math.max(0,Math.min(100,d.occupancy)))).attr("rx",5).attr("fill",d=>d.occupancy>=80?"#d99018":"#087f6a");
    bars.selectAll("title").data(d=>[d]).join("title").text(d=>`${d.routeName}: ${d.occupancy.toFixed(1)}% time-weighted occupancy`);
    f.plot.selectAll("text.occupancy-value-label").data(data,d=>d.routeId).join("text").attr("class","occupancy-value-label").attr("dominant-baseline","middle").attr("font-size",11).attr("fill","#526174").text(d=>`${d.occupancy.toFixed(1)}%`).transition().duration(DURATION).ease(ease).attr("x",d=>x(Math.max(0,Math.min(100,d.occupancy)))+6).attr("y",d=>y(d.routeName)+y.bandwidth()/2);
  }
});
