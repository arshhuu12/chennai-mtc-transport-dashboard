// File: js/filters.js
// Responsibility: manage shared route/date filter controls and return filtered records.
// This module does not calculate metrics or render charts.

window.TransitFilters = (() => {
  function createController({ records, routeSelect, toolbar, onChange }) {
    if (!Array.isArray(records)) throw new TypeError("records must be an array");
    if (!routeSelect) throw new Error("Route filter element was not found.");
    if (!toolbar) throw new Error("Filter toolbar element was not found.");

    let sourceRecords = records;

    function populateRoutes(routes) {
      routeSelect.innerHTML = "";
      const allOption = document.createElement("option");
      allOption.value = "all";
      allOption.textContent = "All Routes";
      routeSelect.appendChild(allOption);

      routes.forEach((route) => {
        const option = document.createElement("option");
        option.value = route.route_id;
        option.textContent = route.route_name;
        routeSelect.appendChild(option);
      });
    }

    function createDateAndResetControls() {
      if (document.getElementById("dashboard-filters")) return;

      const container = document.createElement("div");
      container.id = "dashboard-filters";

      const label = document.createElement("label");
      label.textContent = "Service date";

      const dateInput = document.createElement("input");
      dateInput.type = "date";
      dateInput.id = "date-filter";
      label.appendChild(dateInput);

      const resetButton = document.createElement("button");
      resetButton.id = "reset-filters";
      resetButton.type = "button";
      resetButton.textContent = "Reset filters";

      container.append(label, resetButton);
      toolbar.appendChild(container);

      dateInput.addEventListener("change", () => onChange());
      resetButton.addEventListener("click", () => {
        routeSelect.value = "all";
        dateInput.value = "";
        onChange();
      });
    }

    function getFilteredRecords() {
      const selectedRoute = routeSelect.value;
      const dateInput = document.getElementById("date-filter");
      const selectedDate = dateInput ? dateInput.value : "";

      return sourceRecords.filter((record) => {
        const routeMatches = selectedRoute === "all" || record.routeId === selectedRoute;
        const dateMatches = !selectedDate || record.serviceDate === selectedDate;
        return routeMatches && dateMatches;
      });
    }

    function initialise(routes) {
      populateRoutes(routes);
      createDateAndResetControls();
      routeSelect.addEventListener("change", () => onChange());
    }

    function updateRecords(nextRecords) {
      if (!Array.isArray(nextRecords)) throw new TypeError("nextRecords must be an array");
      sourceRecords = nextRecords;
    }

    return { initialise, getFilteredRecords, updateRecords };
  }

  return { createController };
})();
