import assert from "node:assert/strict";
import test from "node:test";

import type { TypeColumn } from "../../src/types";
import type { RDGToolbarPublishedSnapshot } from "../../src/toolbar/controller";
import { createRDGToolbarStore } from "../../src/toolbar/store";

type Row = Record<string, unknown>;

const COLUMNS: TypeColumn[] = [
  { name: "id", header: "ID" },
  { name: "customer", header: "Customer" },
  { name: "actions", header: "Actions", exportable: false },
];

const VIEW_ROWS: Row[] = [{ id: 1, customer: "Northwind", actions: "edit" }];
const ALL_ROWS: Row[] = [
  ...VIEW_ROWS,
  { id: 2, customer: "Contoso", actions: "edit" },
];

type Calls = {
  columnVisibility: [string, boolean][];
  filteringEnabled: boolean[];
  clearedFilters: number;
};

/** Drives the store the way `RDGToolbarTarget` and the grid do. */
function attachedStore(overrides: Partial<RDGToolbarPublishedSnapshot> = {}): {
  store: ReturnType<typeof createRDGToolbarStore>;
  calls: Calls;
  detach: () => void;
  publish: (next: Partial<RDGToolbarPublishedSnapshot>) => void;
} {
  const store = createRDGToolbarStore();
  const registration = store.createTargetRegistration();
  const calls: Calls = {
    columnVisibility: [],
    filteringEnabled: [],
    clearedFilters: 0,
  };

  const baseSnapshot: RDGToolbarPublishedSnapshot = {
    columns: COLUMNS,
    columnOrder: ["customer", "id", "actions"],
    columnVisibilityMap: { customer: false },
    theme: "default",
    setColumnVisible: (columnId, visible) => {
      calls.columnVisibility.push([columnId, visible]);
    },
    filteringEnabled: true,
    canToggleFiltering: true,
    setFilteringEnabled: (enabled) => {
      calls.filteringEnabled.push(enabled);
    },
    filtered: true,
    clearAllFilters: () => {
      calls.clearedFilters += 1;
    },
    getViewRows: () => VIEW_ROWS,
    getAllRows: () => ALL_ROWS,
    ...overrides,
  };

  registration.controller.publish(baseSnapshot);
  const detach = registration.attach();

  return {
    store,
    calls,
    detach,
    publish: (next) =>
      registration.controller.publish({ ...baseSnapshot, ...next }),
  };
}

test("the API reads the live grid state through the store", () => {
  const { store, calls } = attachedStore();
  const { api } = store;

  assert.deepEqual(
    api.getColumns().map((column) => column.name),
    ["customer", "id", "actions"],
    "columns come back in the grid's column order"
  );
  assert.equal(api.isColumnVisible("id"), true);
  assert.equal(api.isColumnVisible("customer"), false);
  assert.equal(
    api.isColumnVisible("nosuchcolumn"),
    false,
    "a column the grid does not have is not visible"
  );

  assert.equal(api.isFilteringEnabled(), true);
  assert.equal(api.canToggleFiltering(), true);
  assert.equal(api.isFiltered(), true);
  assert.deepEqual(api.getViewRows(), VIEW_ROWS);
  assert.deepEqual(api.getAllRows(), ALL_ROWS);

  api.setColumnVisible("customer", true);
  api.setFilteringEnabled(false);
  api.clearAllFilters();

  assert.deepEqual(calls.columnVisibility, [["customer", true]]);
  assert.deepEqual(calls.filteringEnabled, [false]);
  assert.equal(calls.clearedFilters, 1);
});

test("a method reads the state of the call, not of the last render", () => {
  const { store, publish } = attachedStore();
  const { api } = store;

  assert.equal(api.isFiltered(), true);
  publish({ filtered: false });
  assert.equal(
    api.isFiltered(),
    false,
    "the API holds no snapshot of its own to go stale"
  );
});

test("getState is stable per snapshot, so useSyncExternalStore accepts it", () => {
  const { store, publish } = attachedStore();
  const { api } = store;

  const first = store.api.getState();
  assert.equal(api.getState(), first, "an unchanged grid returns one object");
  assert.equal(first.attached, true);
  assert.equal(first.filtered, true);

  publish({ filtered: false });
  const second = api.getState();
  assert.notEqual(second, first);
  assert.equal(second.filtered, false);
});

test("subscribers hear grid changes and stop after unsubscribing", () => {
  const { store, publish } = attachedStore();
  let notifications = 0;
  const unsubscribe = store.api.subscribe(() => {
    notifications += 1;
  });

  publish({ filtered: false });
  assert.equal(notifications, 1);

  // The store publishes only real changes, so an identical snapshot is quiet.
  publish({ filtered: false });
  assert.equal(notifications, 1);

  unsubscribe();
  publish({ filtered: true });
  assert.equal(notifications, 1);
});

test("with no grid attached every action is a safe no-op", async () => {
  const store = createRDGToolbarStore();
  const { api } = store;

  assert.equal(api.getState().attached, false);
  assert.deepEqual(api.getColumns(), []);
  assert.deepEqual(api.getViewRows(), []);
  assert.deepEqual(api.getAllRows(), []);
  assert.equal(api.isColumnVisible("id"), false);
  assert.equal(api.canToggleFiltering(), false);
  assert.equal(await api.exportGrid("csv"), null);

  // Nothing to assert beyond "does not throw": these reach the empty snapshot.
  api.setColumnVisible("id", false);
  api.setFilteringEnabled(true);
  api.clearAllFilters();
});

test("a detached grid falls back to the empty state", () => {
  const { store, detach } = attachedStore();

  assert.equal(store.api.getState().attached, true);
  detach();
  assert.equal(store.api.getState().attached, false);
  assert.deepEqual(store.api.getColumns(), []);
});

test("exportGrid writes the grid's rows and honours the provider defaults", async () => {
  const { store } = attachedStore();
  store.setExportDefaults({ fileName: "orders", scope: "all" });

  const defaulted = await store.api.exportGrid("csv");
  assert.deepEqual(defaulted, {
    format: "csv",
    scope: "all",
    rowCount: 2,
    // `actions` is exportable:false and `customer` is hidden, so only `id`.
    columnCount: 1,
    fileName: "orders.csv",
    // Nothing was downloaded: there is no document in this environment.
    byteLength: 0,
  });

  const perCall = await store.api.exportGrid("json", { scope: "view" });
  assert.equal(perCall?.scope, "view", "one export outranks the defaults");
  assert.equal(perCall?.rowCount, 1);
  assert.equal(perCall?.fileName, "orders.json", "the rest still defaults");
});

test("getExportFormats offers every format exportGrid can write", () => {
  const store = createRDGToolbarStore();

  assert.deepEqual([...store.api.getExportFormats()], ["csv", "json", "xlsx"]);
});
