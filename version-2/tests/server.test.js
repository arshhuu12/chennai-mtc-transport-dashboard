// tests/server.test.js
// Node.js built-in automated test suite for Stage 1 & 2

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import app from "../src/app.js";
import { config } from "../src/config.js";
import { loadDatasets } from "../src/data.js";

describe("Express Foundation & Health API Tests", () => {
  let server;
  let baseUrl;

  before((_, done) => {
    try {
      loadDatasets();
    } catch (e) {
      // datasets may already be loaded
    }
    server = app.listen(0, "127.0.0.1", () => {
      const address = server.address();
      baseUrl = `http://127.0.0.1:${address.port}`;
      done();
    });
  });

  after((_, done) => {
    if (server) {
      server.close(done);
    } else {
      done();
    }
  });

  it("Health endpoint returns HTTP 200", async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.strictEqual(res.status, 200);
  });

  it("Health endpoint returns valid JSON", async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    const contentType = res.headers.get("content-type");
    assert.ok(contentType && contentType.includes("application/json"));

    const data = await res.json();
    assert.strictEqual(typeof data, "object");
    assert.ok(data !== null);
  });

  it("Application name and service status are correct", async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    const data = await res.json();

    assert.strictEqual(data.status, "ok");
    assert.strictEqual(data.name, config.appName);
    assert.strictEqual(data.version, config.version);
    assert.ok(data.timestamp);
    assert.ok(!Number.isNaN(Date.parse(data.timestamp)));
  });

  it("Unknown API endpoint returns HTTP 404 with error JSON", async () => {
    const res = await fetch(`${baseUrl}/api/unknown-route`);
    assert.strictEqual(res.status, 404);

    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert.strictEqual(data.error.code, "NOT_FOUND");
    assert.ok(data.error.message.includes("/api/unknown-route"));
  });
});
