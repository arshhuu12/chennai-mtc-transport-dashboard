// public/js/charts.js
// Chart.js visualizations for Version 2 analytics dashboard

/* global Chart */

const chartInstances = new Map();

const prefersReducedMotion =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const DEFAULT_ANIMATION = prefersReducedMotion ? false : { duration: 350 };

const THEME = {
  teal: "#087f6a",
  tealLight: "rgba(8, 127, 106, 0.15)",
  blue: "#3b82f6",
  blueLight: "rgba(59, 130, 246, 0.15)",
  amber: "#d99018",
  amberLight: "rgba(217, 144, 24, 0.15)",
  red: "#ef4444",
  green: "#10b981",
  gridColor: "#edf2f7",
  textColor: "#475569",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
};

/**
 * Safely destroys an existing Chart.js instance on a canvas.
 * @param {string} canvasId
 */
export function destroyChart(canvasId) {
  if (chartInstances.has(canvasId)) {
    chartInstances.get(canvasId).destroy();
    chartInstances.delete(canvasId);
  }
}

/**
 * Destroys all active chart instances.
 */
export function destroyAllCharts() {
  for (const [id, chart] of chartInstances.entries()) {
    chart.destroy();
    chartInstances.delete(id);
  }
}

/**
 * Common chart creation helper that manages instance lifecycle.
 * @param {string} canvasId
 * @param {Object} config
 * @returns {Chart|null}
 */
function createChart(canvasId, config) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) {
    console.warn(`Canvas #${canvasId} not found.`);
    return null;
  }

  destroyChart(canvasId);

  // Apply default font and animation options
  config.options = config.options || {};
  config.options.animation = DEFAULT_ANIMATION;
  config.options.responsive = true;
  config.options.maintainAspectRatio = false;

  const chart = new Chart(canvas, config);
  chartInstances.set(canvasId, chart);
  return chart;
}

/**
 * 1. Route Performance Comparison (Horizontal Bar Chart)
 * Sourced from /api/analytics (routeComparison)
 * @param {string} canvasId
 * @param {Array<{ routeId: string, routeName: string, boardings: number }>} data
 */
export function renderRouteComparisonChart(canvasId, data = []) {
  const rows = [...data].slice(0, 12);
  const labels = rows.map((r) => r.routeName || r.routeId);
  const values = rows.map((r) => r.boardings);

  return createChart(canvasId, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Passenger Boardings",
          data: values,
          backgroundColor: THEME.teal,
          borderRadius: 4,
          maxBarThickness: 24,
        },
      ],
    },
    options: {
      indexAxis: "y",
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.raw.toLocaleString()} boardings`,
          },
        },
      },
      scales: {
        x: {
          grid: { color: THEME.gridColor },
          ticks: { color: THEME.textColor, font: { family: THEME.fontFamily } },
        },
        y: {
          grid: { display: false },
          ticks: { color: THEME.textColor, font: { family: THEME.fontFamily } },
        },
      },
    },
  });
}

/**
 * 2. Stop Passenger Demand (Horizontal Bar Chart - Top 15)
 * Sourced from /api/stops
 * @param {string} canvasId
 * @param {Array<{ stopId: string, stopName: string, boardings: number }>} data
 */
export function renderStopDemandChart(canvasId, data = []) {
  const rows = [...data].slice(0, 15);
  const labels = rows.map((s) => s.stopName || s.stopId);
  const values = rows.map((s) => s.boardings);

  return createChart(canvasId, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Boardings",
          data: values,
          backgroundColor: THEME.blue,
          borderRadius: 4,
          maxBarThickness: 20,
        },
      ],
    },
    options: {
      indexAxis: "y",
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.raw.toLocaleString()} boardings`,
          },
        },
      },
      scales: {
        x: {
          grid: { color: THEME.gridColor },
          ticks: { color: THEME.textColor, font: { family: THEME.fontFamily } },
        },
        y: {
          grid: { display: false },
          ticks: { color: THEME.textColor, font: { family: THEME.fontFamily } },
        },
      },
    },
  });
}

/**
 * 3. Daily Passenger Demand (Line Chart with Boardings & Alightings)
 * Sourced from /api/analytics (dailyDemand)
 * @param {string} canvasId
 * @param {Array<{ serviceDate: string, boardings: number, alightings: number }>} data
 */
export function renderDailyDemandChart(canvasId, data = []) {
  const labels = data.map((d) => {
    const parts = d.serviceDate.split("-");
    if (parts.length === 3) {
      const monthNames = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
      ];
      const monthIdx = parseInt(parts[1], 10) - 1;
      return `${parts[2]} ${monthNames[monthIdx] || parts[1]}`;
    }
    return d.serviceDate;
  });

  const boardings = data.map((d) => d.boardings);
  const alightings = data.map((d) => d.alightings);

  return createChart(canvasId, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Boardings",
          data: boardings,
          borderColor: THEME.teal,
          backgroundColor: THEME.tealLight,
          fill: true,
          tension: 0.25,
          borderWidth: 2.5,
          pointRadius: 3,
          pointHoverRadius: 5,
        },
        {
          label: "Alightings",
          data: alightings,
          borderColor: THEME.blue,
          backgroundColor: "transparent",
          borderDash: [4, 4],
          tension: 0.25,
          borderWidth: 2,
          pointRadius: 2.5,
          pointHoverRadius: 5,
        },
      ],
    },
    options: {
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: {
          position: "top",
          labels: { font: { family: THEME.fontFamily }, boxWidth: 12 },
        },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.dataset.label}: ${ctx.raw.toLocaleString()}`,
          },
        },
      },
      scales: {
        x: {
          grid: { color: THEME.gridColor },
          ticks: { color: THEME.textColor, font: { family: THEME.fontFamily }, maxTicksLimit: 14 },
        },
        y: {
          grid: { color: THEME.gridColor },
          ticks: { color: THEME.textColor, font: { family: THEME.fontFamily } },
        },
      },
    },
  });
}

/**
 * 4. Arrival Delay Distribution (Binned Bar Chart)
 * Sourced from /api/analytics (delayDistribution)
 * @param {string} canvasId
 * @param {Array<{ x0: number, x1: number, label: string, count: number, isEarly: boolean }>} data
 */
export function renderDelayDistributionChart(canvasId, data = []) {
  const labels = data.map((b) => b.label);
  const counts = data.map((b) => b.count);
  const backgroundColors = data.map((b) => {
    if (b.x0 < 0) return THEME.blue; // Early arrivals
    if (b.x0 >= 0 && b.x1 <= 5) return THEME.teal; // On-time arrivals (0-5 min)
    return THEME.amber; // Late arrivals (> 5 min)
  });

  return createChart(canvasId, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Arrivals",
          data: counts,
          backgroundColor: backgroundColors,
          borderRadius: 4,
          maxBarThickness: 32,
        },
      ],
    },
    options: {
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.raw.toLocaleString()} arrivals`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: THEME.textColor, font: { family: THEME.fontFamily } },
        },
        y: {
          grid: { color: THEME.gridColor },
          ticks: { color: THEME.textColor, font: { family: THEME.fontFamily } },
        },
      },
    },
  });
}

/**
 * 5. Route-level Time-Weighted Occupancy (Horizontal Bar Chart)
 * Sourced from /api/analytics (occupancy)
 * @param {string} canvasId
 * @param {Array<{ routeId: string, routeName: string, timeWeightedOccupancy: number }>} data
 */
export function renderRouteOccupancyChart(canvasId, data = []) {
  const labels = data.map((r) => r.routeName || r.routeId);
  const values = data.map((r) =>
    Number(r.timeWeightedOccupancy !== null ? r.timeWeightedOccupancy.toFixed(1) : 0),
  );

  // Amber for high occupancy (>= 80%), Teal for standard load (< 80%)
  const backgroundColors = values.map((val) =>
    val >= 80 ? THEME.amber : THEME.teal,
  );

  return createChart(canvasId, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Time-Weighted Occupancy (%)",
          data: values,
          backgroundColor: backgroundColors,
          borderRadius: 4,
          maxBarThickness: 20,
        },
      ],
    },
    options: {
      indexAxis: "y",
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.raw}% time-weighted occupancy`,
          },
        },
      },
      scales: {
        x: {
          min: 0,
          max: 100,
          grid: { color: THEME.gridColor },
          ticks: {
            color: THEME.textColor,
            font: { family: THEME.fontFamily },
            callback: (v) => `${v}%`,
          },
        },
        y: {
          grid: { display: false },
          ticks: { color: THEME.textColor, font: { family: THEME.fontFamily } },
        },
      },
    },
  });
}

/**
 * 6. Route Efficiency (Journey Time Ratio with 1.0 Baseline Reference)
 * Sourced from /api/routes
 * @param {string} canvasId
 * @param {Array<{ routeId: string, routeName: string, journeyTimeRatio: number|null }>} data
 */
export function renderRouteEfficiencyChart(canvasId, data = []) {
  const validRoutes = data.filter((r) => r.journeyTimeRatio !== null);
  const labels = validRoutes.map((r) => r.routeId);
  const values = validRoutes.map((r) =>
    Number(r.journeyTimeRatio !== null ? r.journeyTimeRatio.toFixed(2) : 0),
  );

  // Green for on schedule (<= 1.05), Red/Amber for slower than schedule (> 1.05)
  const backgroundColors = values.map((v) =>
    v > 1.05 ? THEME.amber : THEME.green,
  );

  return createChart(canvasId, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Journey Time Ratio",
          data: values,
          backgroundColor: backgroundColors,
          borderRadius: 4,
          maxBarThickness: 24,
        },
      ],
    },
    options: {
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (items) => {
              const r = validRoutes[items[0].dataIndex];
              return `${r.routeId} - ${r.routeName}`;
            },
            label: (ctx) => {
              const ratio = ctx.raw;
              const status =
                ratio > 1.05 ? "Slower than scheduled" : "On schedule";
              return ` Ratio: ${ratio} (${status})`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: THEME.textColor, font: { family: THEME.fontFamily } },
        },
        y: {
          min: 0,
          max: 1.2,
          grid: { color: THEME.gridColor },
          ticks: {
            color: THEME.textColor,
            font: { family: THEME.fontFamily },
            stepSize: 0.2,
          },
        },
      },
    },
  });
}

export default {
  destroyChart,
  destroyAllCharts,
  renderRouteComparisonChart,
  renderStopDemandChart,
  renderDailyDemandChart,
  renderDelayDistributionChart,
  renderRouteOccupancyChart,
  renderRouteEfficiencyChart,
};
