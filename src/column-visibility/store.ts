import * as React from "react";

import type {
  RDGColumnVisibilityController,
  RDGColumnVisibilityPublishedSnapshot,
} from "./controller";

const EMPTY_COLUMNS: RDGColumnVisibilityPublishedSnapshot["columns"] = [];
const EMPTY_COLUMN_ORDER: RDGColumnVisibilityPublishedSnapshot["columnOrder"] =
  [];
const EMPTY_COLUMN_VISIBILITY: RDGColumnVisibilityPublishedSnapshot["columnVisibilityMap"] =
  {};
const NOOP_SET_COLUMN_VISIBLE = () => {};

export const EMPTY_COLUMN_VISIBILITY_SNAPSHOT: RDGColumnVisibilityPublishedSnapshot =
  {
    columns: EMPTY_COLUMNS,
    columnOrder: EMPTY_COLUMN_ORDER,
    columnVisibilityMap: EMPTY_COLUMN_VISIBILITY,
    theme: "default",
    setColumnVisible: NOOP_SET_COLUMN_VISIBLE,
  };

type TargetRegistration = {
  attach: () => () => void;
  controller: RDGColumnVisibilityController;
};

export type RDGColumnVisibilityStore = {
  createTargetRegistration: () => TargetRegistration;
  dispose: () => void;
  getServerSnapshot: () => RDGColumnVisibilityPublishedSnapshot;
  getSnapshot: () => RDGColumnVisibilityPublishedSnapshot;
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
  left: RDGColumnVisibilityPublishedSnapshot,
  right: RDGColumnVisibilityPublishedSnapshot
): boolean {
  return (
    sameArray(left.columns, right.columns) &&
    sameArray(left.columnOrder, right.columnOrder) &&
    sameVisibilityMap(left.columnVisibilityMap, right.columnVisibilityMap) &&
    left.theme === right.theme &&
    left.setColumnVisible === right.setColumnVisible
  );
}

export function createRDGColumnVisibilityStore(): RDGColumnVisibilityStore {
  let activeTarget: symbol | null = null;
  let snapshot = EMPTY_COLUMN_VISIBILITY_SNAPSHOT;
  const listeners = new Set<() => void>();

  const emitSnapshot = (next: RDGColumnVisibilityPublishedSnapshot) => {
    if (sameSnapshot(snapshot, next)) return;
    snapshot = next;
    listeners.forEach((listener) => listener());
  };

  return {
    createTargetRegistration() {
      const target = Symbol("rdg-column-visibility-target");
      let attached = false;
      let latestSnapshot: RDGColumnVisibilityPublishedSnapshot | null = null;

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
              "RDGColumnVisibilityProvider supports one ReactDataGrid target. " +
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
            emitSnapshot(EMPTY_COLUMN_VISIBILITY_SNAPSHOT);
          };
        },
      };
    },
    dispose() {
      activeTarget = null;
      snapshot = EMPTY_COLUMN_VISIBILITY_SNAPSHOT;
      listeners.clear();
    },
    getSnapshot: () => snapshot,
    getServerSnapshot: () => EMPTY_COLUMN_VISIBILITY_SNAPSHOT,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export const RDGColumnVisibilityContext =
  React.createContext<RDGColumnVisibilityStore | null>(null);

export function useRDGColumnVisibilityStore(): RDGColumnVisibilityStore {
  const store = React.useContext(RDGColumnVisibilityContext);
  if (!store) {
    throw new Error(
      "RDG column visibility components must be rendered inside " +
        "RDGColumnVisibilityProvider."
    );
  }
  return store;
}

export function useRDGColumnVisibilitySnapshot(): RDGColumnVisibilityPublishedSnapshot {
  const store = useRDGColumnVisibilityStore();
  return React.useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot
  );
}
