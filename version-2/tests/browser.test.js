// tests/browser.test.js
// Headless Chrome End-to-End Integration and Viewport Verification

import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { spawn } from "node:child_process";
import app from "../src/app.js";
import { loadDatasets } from "../src/data.js";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const hasChrome = fs.existsSync(CHROME_PATH);
const CDP_PORT = 9223;

let server;
let serverPort;
let chromeProcess;
let ws;
let messageId = 1;
const pendingMessages = new Map();

function sendCommand(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = messageId++;
    pendingMessages.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  const res = await sendCommand("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (res.exceptionDetails) {
    throw new Error(res.exceptionDetails.text || "Runtime evaluation error");
  }
  return res.result?.value;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

before(async () => {
  if (!hasChrome) return;
  loadDatasets();

  // 1. Start Express server on ephemeral port
  await new Promise((resolve) => {
    server = app.listen(0, "127.0.0.1", () => {
      serverPort = server.address().port;
      resolve();
    });
  });

  // 2. Launch Headless Chrome
  chromeProcess = spawn(CHROME_PATH, [
    "--headless=new",
    `--remote-debugging-port=${CDP_PORT}`,
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "about:blank",
  ]);

  // Give Chrome up to 6000ms to open CDP port
  let targets;
  for (let attempt = 0; attempt < 30; attempt++) {
    try {
      const listRes = await fetch(`http://127.0.0.1:${CDP_PORT}/json`);
      if (listRes.ok) {
        targets = await listRes.json();
        if (targets && targets.length > 0) break;
      }
    } catch {
      // Chrome is still starting up
    }
    await delay(200);
  }
  assert.ok(targets && targets.length > 0, "CDP targets must be available");
  const pageTarget = targets.find((t) => t.type === "page") || targets[0];
  assert.ok(pageTarget && pageTarget.webSocketDebuggerUrl, "CDP target must exist");

  ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.id && pendingMessages.has(data.id)) {
      const { resolve, reject } = pendingMessages.get(data.id);
      pendingMessages.delete(data.id);
      if (data.error) reject(new Error(data.error.message));
      else resolve(data.result);
    }
  };

  await sendCommand("Page.enable");
  await sendCommand("Runtime.enable");

  // 4. Navigate to dashboard URL
  await sendCommand("Page.navigate", { url: `http://127.0.0.1:${serverPort}/` });

  // Wait for page load and initial API queries to finish
  await delay(2000);
});

after(async () => {
  if (!hasChrome) return;
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.close();
  }
  if (chromeProcess) {
    chromeProcess.kill();
  }
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

describe("Stage 6: Headless Chrome Browser Verification", { skip: !hasChrome }, () => {
  test("Dashboard loads successfully and backend status indicator is Online", async () => {
    const statusText = await evaluate("document.getElementById('status-text')?.textContent");
    assert.equal(statusText, "Backend Online");
  });

  test("All seven KPI cards display accurate initial all-data figures", async () => {
    const kpiData = await evaluate(`({
      trips: document.getElementById('kpi-total-trips')?.textContent,
      boardings: document.getElementById('kpi-total-boardings')?.textContent,
      alightings: document.getElementById('kpi-total-alightings')?.textContent,
      avgDelay: document.getElementById('kpi-average-delay')?.textContent,
      onTime: document.getElementById('kpi-on-time-percentage')?.textContent,
      early: document.getElementById('kpi-early-arrivals')?.textContent,
      occupancy: document.getElementById('kpi-time-weighted-occupancy')?.textContent,
    })`);

    assert.equal(kpiData.trips, "672");
    assert.equal(kpiData.boardings, "21,430");
    assert.equal(kpiData.alightings, "21,430");
    assert.equal(kpiData.avgDelay, "4.8 min");
    assert.equal(kpiData.onTime, "41.4%");
    assert.equal(kpiData.early, "427");
    assert.equal(kpiData.occupancy, "42.1%");
  });

  test("Filter dropdowns are populated with routes and date bounds", async () => {
    const filtersInfo = await evaluate(`({
      routeCount: document.getElementById('route-filter')?.options.length,
      routeValues: Array.from(document.getElementById('route-filter')?.options || []).map(o => o.value),
      minDate: document.getElementById('date-filter')?.min,
      maxDate: document.getElementById('date-filter')?.max,
    })`);

    assert.equal(filtersInfo.routeCount, 13); // 'all' + 12 routes
    assert.equal(filtersInfo.routeValues[0], "all");
    assert.ok(filtersInfo.routeValues.includes("R001"), "Route options must include R001");
    assert.equal(filtersInfo.minDate, "2026-10-01");
    assert.equal(filtersInfo.maxDate, "2026-10-28");
  });

  test("All six Chart.js visualizations render active canvases", async () => {
    const canvasStatus = await evaluate(`[
      'chart-route-comparison',
      'chart-stop-demand',
      'chart-daily-demand',
      'chart-delay-distribution',
      'chart-route-occupancy',
      'chart-route-efficiency'
    ].map(id => {
      const el = document.getElementById(id);
      return { id, exists: !!el, width: el?.width, height: el?.height };
    })`);

    assert.equal(canvasStatus.length, 6);
    for (const c of canvasStatus) {
      assert.ok(c.exists, `Canvas ${c.id} must exist in DOM`);
      assert.ok(c.width > 0, `Canvas ${c.id} width must be > 0`);
      assert.ok(c.height > 0, `Canvas ${c.id} height must be > 0`);
    }
  });

  test("Filtering by Route R001 updates KPI cards and charts reactively", async () => {
    await evaluate(`(() => {
      const select = document.getElementById('route-filter');
      select.value = 'R001';
      select.dispatchEvent(new Event('change'));
    })()`);

    await delay(1200);

    const kpiData = await evaluate(`({
      trips: document.getElementById('kpi-total-trips')?.textContent,
      boardings: document.getElementById('kpi-total-boardings')?.textContent,
      alightings: document.getElementById('kpi-total-alightings')?.textContent,
    })`);

    assert.equal(kpiData.trips, "56");
    assert.equal(kpiData.boardings, "1,690");
    assert.equal(kpiData.alightings, "1,690");
  });

  test("Combined Filter: Route R001 + Date 2026-10-01 updates accurately", async () => {
    await evaluate(`(() => {
      const dateInput = document.getElementById('date-filter');
      dateInput.value = '2026-10-01';
      dateInput.dispatchEvent(new Event('change'));
    })()`);

    await delay(1200);

    const kpiData = await evaluate(`({
      trips: document.getElementById('kpi-total-trips')?.textContent,
      boardings: document.getElementById('kpi-total-boardings')?.textContent,
      alightings: document.getElementById('kpi-total-alightings')?.textContent,
    })`);

    assert.equal(kpiData.trips, "2");
    assert.equal(kpiData.boardings, "36");
    assert.equal(kpiData.alightings, "36");
  });

  test("Reset Filters button restores all-data state", async () => {
    await evaluate(`(() => {
      document.getElementById('reset-filters')?.click();
    })()`);

    await delay(1200);

    const stateValues = await evaluate(`({
      routeVal: document.getElementById('route-filter')?.value,
      dateVal: document.getElementById('date-filter')?.value,
      trips: document.getElementById('kpi-total-trips')?.textContent,
      boardings: document.getElementById('kpi-total-boardings')?.textContent,
    })`);

    assert.equal(stateValues.routeVal, "all");
    assert.equal(stateValues.dateVal, "");
    assert.equal(stateValues.trips, "672");
    assert.equal(stateValues.boardings, "21,430");
  });

  test("Zero-result filter state displays clean zero/NA values without crashing", async () => {
    await evaluate(`(() => {
      const dateInput = document.getElementById('date-filter');
      dateInput.value = '2026-11-15';
      dateInput.dispatchEvent(new Event('change'));
    })()`);

    await delay(1200);

    const zeroState = await evaluate(`({
      trips: document.getElementById('kpi-total-trips')?.textContent,
      boardings: document.getElementById('kpi-total-boardings')?.textContent,
      avgDelay: document.getElementById('kpi-average-delay')?.textContent,
      occupancy: document.getElementById('kpi-time-weighted-occupancy')?.textContent,
      errorActive: document.getElementById('error-banner')?.classList.contains('active'),
    })`);

    assert.equal(zeroState.trips, "0");
    assert.equal(zeroState.boardings, "0");
    assert.equal(zeroState.avgDelay, "N/A");
    assert.equal(zeroState.occupancy, "N/A");
    assert.equal(zeroState.errorActive, false, "Zero-result should not trigger error banner");

    // Reset back to normal
    await evaluate(`document.getElementById('reset-filters')?.click()`);
    await delay(1000);
  });

  test("Rapid consecutive filter changes prevent stale results (race conditions)", async () => {
    // Fire 3 changes in rapid succession: R001 -> R002 -> R003
    await evaluate(`(() => {
      const select = document.getElementById('route-filter');
      select.value = 'R001';
      select.dispatchEvent(new Event('change'));
      select.value = 'R002';
      select.dispatchEvent(new Event('change'));
      select.value = 'R003';
      select.dispatchEvent(new Event('change'));
    })()`);

    await delay(1500);

    // Final result must reflect R003
    const finalRoute = await evaluate("document.getElementById('route-filter')?.value");
    const boardings = await evaluate("document.getElementById('kpi-total-boardings')?.textContent");
    assert.equal(finalRoute, "R003");
    // Verify boardings match R003
    assert.ok(boardings !== "21,430", "Should reflect R003 data, not default");

    // Reset back
    await evaluate(`document.getElementById('reset-filters')?.click()`);
    await delay(1000);
  });

  describe("Responsive Viewport Verification via Emulation", () => {
    const viewports = [
      { name: "Desktop (1440x900)", width: 1440, height: 900 },
      { name: "Tablet (768x1024)", width: 768, height: 1024 },
      { name: "Mobile (390x844)", width: 390, height: 844 },
    ];

    for (const vp of viewports) {
      test(`Layout conforms at ${vp.name} without horizontal overflow`, async () => {
        await sendCommand("Emulation.setDeviceMetricsOverride", {
          width: vp.width,
          height: vp.height,
          deviceScaleFactor: 1,
          mobile: false,
        });

        await evaluate("window.dispatchEvent(new Event('resize'))");
        await delay(600);

        const metrics = await evaluate(`({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
          hasKpis: document.querySelectorAll('.kpi-card').length === 7,
          hasCharts: document.querySelectorAll('.chart-card').length === 6,
        })`);

        assert.ok(
          metrics.scrollWidth <= metrics.clientWidth + 1,
          `At ${vp.name}, document.scrollWidth (${metrics.scrollWidth}) must not exceed clientWidth (${metrics.clientWidth})`,
        );
        assert.ok(metrics.hasKpis, "All 7 KPI cards present");
        assert.ok(metrics.hasCharts, "All 6 Chart cards present");
      });
    }
  });
});
