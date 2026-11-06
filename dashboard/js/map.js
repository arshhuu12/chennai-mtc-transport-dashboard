// File: js/map.js
// Responsibility: render static CUMTA/MTC route and stop reference data.
// This module is independent of the synthetic operational analytics modules.

(() => {
  const mapElement = document.getElementById("network-map");
  if (!mapElement) return;

  const statusElement = document.getElementById("map-status");
  const routeSelect = document.getElementById("map-route-filter");
  const stopToggle = document.getElementById("show-map-stops");
  const detailsElement = document.getElementById("map-route-details");

  const ROUTES_URL = "../data-preparation/prepared/selected_routes.geojson";
  const STOPS_URL = "../data-preparation/prepared/stops_for_map.csv";

  function setStatus(message, isError = false) {
    statusElement.textContent = message;
    statusElement.classList.toggle("is-error", isError);
  }

  function safeText(value, fallback = "Not available") {
    const text = value === null || value === undefined ? "" : String(value).trim();
    return text || fallback;
  }

  function createPopup(title, rows) {
    const wrapper = document.createElement("div");
    wrapper.className = "map-popup";
    const heading = document.createElement("strong");
    heading.textContent = title;
    wrapper.appendChild(heading);

    rows.forEach(([label, value]) => {
      const line = document.createElement("div");
      const labelNode = document.createElement("span");
      labelNode.textContent = label + ": ";
      const valueNode = document.createElement("span");
      valueNode.textContent = safeText(value);
      line.append(labelNode, valueNode);
      wrapper.appendChild(line);
    });
    return wrapper;
  }

  if (typeof L === "undefined" || typeof d3 === "undefined") {
    setStatus("The map libraries could not be loaded. Check your internet connection.", true);
    return;
  }

  const map = L.map(mapElement, {
    preferCanvas: true,
    scrollWheelZoom: false,
  }).setView([13.05, 80.22], 10);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);

  const canvasRenderer = L.canvas({ padding: 0.5 });
  const routeLayer = L.layerGroup().addTo(map);
  const stopLayer = L.layerGroup();
  let routeData = null;
  let stopData = null;
  let stopMarkersCreated = false;

  function routeName(feature) {
    return safeText(feature.properties?.route_name, "Unnamed route");
  }

  function routeStatus(feature) {
    return safeText(feature.properties?.geometry_status, "included_with_warning");
  }

  function routeWarning(feature) {
    return routeStatus(feature) !== "included";
  }

  function renderRouteDetails(features) {
    detailsElement.replaceChildren();

    const heading = document.createElement("h3");
    heading.textContent = features.length === 1 ? "Selected route quality note" : "Route quality notes";
    detailsElement.appendChild(heading);

    features.forEach((feature) => {
      const properties = feature.properties || {};
      const item = document.createElement("article");
      item.className = "map-route-detail";
      const title = document.createElement("strong");
      title.textContent = routeName(feature) + (routeWarning(feature) ? " · Quality warning" : " · Endpoint check passed");
      const path = document.createElement("p");
      path.textContent = safeText(properties.source) + " → " + safeText(properties.destination || properties.destinatio);
      const note = document.createElement("p");
      note.textContent = safeText(properties.quality_note, "No additional quality note.");
      item.append(title, path, note);
      detailsElement.appendChild(item);
    });
  }

  function renderRoutes() {
    if (!routeData) return;

    const selected = routeSelect.value;
    const features = routeData.features.filter((feature) =>
      selected === "all" || String(feature.properties?.route_name) === selected
    );

    routeLayer.clearLayers();

    const geoLayer = L.geoJSON(
      { type: "FeatureCollection", features },
      {
        renderer: canvasRenderer,
        style: (feature) => ({
          color: routeWarning(feature) ? "#d99018" : "#087f6a",
          weight: selected === "all" ? 3.5 : 5,
          opacity: 0.88,
          lineCap: "round",
          lineJoin: "round",
        }),
        onEachFeature: (feature, layer) => {
          const properties = feature.properties || {};
          layer.bindPopup(createPopup(routeName(feature), [
            ["From", properties.source],
            ["To", properties.destination || properties.destinatio],
            ["GTFS route ID", properties.gtfs_route_id],
            ["Geometry status", properties.geometry_status],
            ["Quality note", properties.quality_note],
          ]));
        },
      }
    );
    geoLayer.addTo(routeLayer);
    renderRouteDetails(features);

    const warningCount = features.filter(routeWarning).length;
    setStatus(
      "Showing " + features.length + " route geometry feature(s); " +
      warningCount + " have endpoint or coordinate-quality warnings."
    );

    if (!map._routeBoundsSet && geoLayer.getBounds().isValid()) {
      map.fitBounds(geoLayer.getBounds(), { padding: [24, 24] });
      map._routeBoundsSet = true;
    }
  }

  function addStopMarkers() {
    if (stopMarkersCreated || !stopData) return;

    stopData.forEach((stop) => {
      const latitude = Number(stop.map_lat);
      const longitude = Number(stop.map_lon);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;

      const marker = L.circleMarker([latitude, longitude], {
        renderer: canvasRenderer,
        radius: 2.6,
        color: "#ffffff",
        weight: 0.7,
        fillColor: "#3b82f6",
        fillOpacity: 0.78,
      });
      marker.bindPopup(createPopup(safeText(stop.stop_name, "Unnamed stop"), [
        ["Stop ID", stop.stop_id],
        ["Coordinate status", stop.coordinate_status],
      ]));
      marker.addTo(stopLayer);
    });

    stopMarkersCreated = true;
  }

  async function loadStopsIfNeeded() {
    if (!stopToggle.checked) {
      map.removeLayer(stopLayer);
      return;
    }

    try {
      if (!stopData) {
        setStatus("Loading route geometry and 5,419 map-ready stop locations...");
        stopData = await d3.csv(STOPS_URL);
        const required = ["stop_id", "stop_name", "map_lat", "map_lon", "coordinate_status"];
        const missing = required.filter((column) => !stopData.columns.includes(column));
        if (missing.length) throw new Error("Stop CSV is missing columns: " + missing.join(", "));
      }

      addStopMarkers();
      stopLayer.addTo(map);
      setStatus(
        "Showing " + routeSelect.options[routeSelect.selectedIndex].text +
        " and " + stopLayer.getLayers().length.toLocaleString() + " map-ready stops."
      );
    } catch (error) {
      stopToggle.checked = false;
      map.removeLayer(stopLayer);
      setStatus("Unable to load stop locations: " + error.message, true);
    }
  }

  routeSelect.addEventListener("change", renderRoutes);
  stopToggle.addEventListener("change", loadStopsIfNeeded);

  async function initialiseMap() {
    try {
      setStatus("Loading prepared MTC route geometries...");
      const response = await fetch(ROUTES_URL);
      if (!response.ok) throw new Error("Route GeoJSON request failed (" + response.status + ").");

      routeData = await response.json();
      if (!routeData || routeData.type !== "FeatureCollection" || !Array.isArray(routeData.features)) {
        throw new Error("The route GeoJSON is not a valid FeatureCollection.");
      }

      routeData.features
        .slice()
        .sort((a, b) => routeName(a).localeCompare(routeName(b)))
        .forEach((feature) => {
          const option = document.createElement("option");
          option.value = routeName(feature);
          option.textContent = routeName(feature) + (routeWarning(feature) ? " · warning" : "");
          routeSelect.appendChild(option);
        });

      renderRoutes();
    } catch (error) {
      setStatus(
        "Unable to load route geometry. Serve the repository root over HTTP and check the prepared data paths. " +
        error.message,
        true
      );
      console.error("MTC map initialisation failed:", error);
    }
  }

  initialiseMap();
})();
