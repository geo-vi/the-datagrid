import * as React from "react";
import { useSyncExternalStore } from "use-sync-external-store/shim";

import {
  createRDGToolbarApi,
  type RDGToolbarApi,
  type RDGToolbarState,
} from "./api";
import type {
  RDGToolbarController,
  RDGToolbarPublishedSnapshot,
} from "./controller";
import type { RDGToolbarExportSettings } from "./export";

const EMPTY_COLUMNS: RDGToolbarPublishedSnapshot["columns"] = [];
const EMPTY_COLUMN_ORDER: RDGToolbarPublishedSnapshot["columnOrder"] = [];
const EMPTY_COLUMN_VISIBILITY: RDGToolbarPublishedSnapshot["columnVisibilityMap"] =
  {};
const EMPTY_ROWS: readonly unknown[] = [];
const NOOP_SET_COLUMN_VISIBLE = () => {};
const NOOP_SET_FILTERING_ENABLED = () => {};
const NOOP_CLEAR_ALL_FILTERS = () => {};
const EMPTY_GET_ROWS = () => EMPTY_ROWS;

export const EMPTY_TOOLBAR_SNAPSHOT: RDGToolbarPublishedSnapshot = {
  columns: EMPTY_COLUMNS,
  columnOrder: EMPTY_COLUMN_ORDER,
  columnVisibilityMap: EMPTY_COLUMN_VISIBILITY,
  theme: "default",
  setColumnVisible: NOOP_SET_COLUMN_VISIBLE,
  filteringEnabled: false,
  canToggleFiltering: false,
  setFilteringEnabled: NOOP_SET_FILTERING_ENABLED,
  filtered: false,
  clearAllFilters: NOOP_CLEAR_ALL_FILTERS,
  getViewRows: EMPTY_GET_ROWS,
  getAllRows: EMPTY_GET_ROWS,
};

type TargetRegistration = {
  attach: () => () => void;
  controller: RDGToolbarController;
};

export type RDGToolbarStore = {
  /** One instance per store, so `apiRef` and `useRDGToolbarApi()` agree. */
  api: RDGToolbarApi;
  createTargetRegistration: () => TargetRegistration;
  dispose: () => void;
  /** Export settings the provider configured for every export of this grid. */
  getExportDefaults: () => RDGToolbarExportSettings | undefined;
  getServerSnapshot: () => RDGToolbarPublishedSnapshot;
  getSnapshot: () => RDGToolbarPublishedSnapshot;
  setExportDefaults: (settings: RDGToolbarExportSettings | undefined) => void;
  subscribe: (listener: () => void) => () => void;
};

function sameArray<T>(left: readonly T[], right: readonly T[]): boolean {
  return (
    left === right ||
    (left.length === right.length &&
      left.every((value, index) => value === right[index]))
  );
}

function sameVisibilityMap(
  left: Readonly<Record<string, boolean>>,
  right: Readonly<Record<string, boolean>>
): boolean {
  if (left === right) return true;

  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  return (
    leftKeys.length === rightKeys.length &&
    leftKeys.every(
      (columnId) =>
        Object.prototype.hasOwnProperty.call(right, columnId) &&
        left[columnId] === right[columnId]
    )
  );
}

function sameSnapshot(
  left: RDGToolbarPublishedSnapshot,
  right: RDGToolbarPublishedSnapshot
): boolean {
  return (
    sameArray(left.columns, right.columns) &&
    sameArray(left.columnOrder, right.columnOrder) &&
    sameVisibilityMap(left.columnVisibilityMap, right.columnVisibilityMap) &&
    left.theme === right.theme &&
    left.setColumnVisible === right.setColumnVisible &&
    left.filteringEnabled === right.filteringEnabled &&
    left.canToggleFiltering === right.canToggleFiltering &&
    left.setFilteringEnabled === right.setFilteringEnabled &&
    left.filtered === right.filtered &&
    left.clearAllFilters === right.clearAllFilters &&
    left.getViewRows === right.getViewRows &&
    left.getAllRows === right.getAllRows
  );
}

export function createRDGToolbarStore(): RDGToolbarStore {
  let activeTarget: symbol | null = null;
  let snapshot = EMPTY_TOOLBAR_SNAPSHOT;
  let exportDefaults: RDGToolbarExportSettings | undefined;
  const listeners = new Set<() => void>();

  const emitSnapshot = (next: RDGToolbarPublishedSnapshot) => {
    if (sameSnapshot(snapshot, next)) return;
    snapshot = next;
    listeners.forEach((listener) => listener());
  };

  const getSnapshot = () => snapshot;
  const getExportDefaults = () => exportDefaults;
  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  return {
    api: createRDGToolbarApi({
      getSnapshot,
      subscribe,
      getExportDefaults,
      isAttached: () => snapshot !== EMPTY_TOOLBAR_SNAPSHOT,
    }),
    createTargetRegistration() {
      const target = Symbol("rdg-toolbar-target");
      let attached = false;
      let latestSnapshot: RDGToolbarPublishedSnapshot | null = null;

      return {
        controller: {
          publish(nextSnapshot) {
            latestSnapshot = nextSnapshot;
            if (attached && activeTarget === target) {
              emitSnapshot(nextSnapshot);
            }
          },
        },
        attach() {
          if (activeTarget !== null && activeTarget !== target) {
            throw new Error(
              "RDGToolbarProvider supports one ReactDataGrid target. " +
                "Use a separate provider for each grid."
            );
          }

          attached = true;
          activeTarget = target;
          if (latestSnapshot) emitSnapshot(latestSnapshot);

          return () => {
            if (!attached) return;
            attached = false;
            if (activeTarget !== target) return;
            activeTarget = null;
            emitSnapshot(EMPTY_TOOLBAR_SNAPSHOT);
          };
        },
      };
    },
    dispose() {
      activeTarget = null;
      snapshot = EMPTY_TOOLBAR_SNAPSHOT;
      exportDefaults = undefined;
      listeners.clear();
    },
    getExportDefaults,
    getSnapshot,
    getServerSnapshot: () => EMPTY_TOOLBAR_SNAPSHOT,
    setExportDefaults(settings) {
      exportDefaults = settings;
    },
    subscribe,
  };
}

export const RDGToolbarContext = React.createContext<RDGToolbarStore | null>(
  null
);

export function useRDGToolbarStore(): RDGToolbarStore {
  const store = React.useContext(RDGToolbarContext);
  if (!store) {
    throw new Error(
      "RDG toolbar components must be rendered inside RDGToolbarProvider."
    );
  }
  return store;
}

export function useRDGToolbarSnapshot(): RDGToolbarPublishedSnapshot {
  const store = useRDGToolbarStore();
  return useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot
  );
}

/**
 * The provider's imperative API. Stable, and does not re-render on grid
 * changes: pass it to `useRDGToolbarApiState` to render grid state.
 */
export function useRDGToolbarApi(): RDGToolbarApi {
  return useRDGToolbarStore().api;
}

/** Subscribes to `api.getState()`, re-rendering when the grid state changes. */
export function useRDGToolbarApiState(api: RDGToolbarApi): RDGToolbarState {
  return useSyncExternalStore(api.subscribe, api.getState, api.getState);
}
