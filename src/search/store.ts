import * as React from "react";
import type { TypeColumn } from "../types";

const EMPTY_COLUMNS: readonly TypeColumn[] = [];

export type RDGSearchStore = {
  dispose: () => void;
  getDraftServerSnapshot: () => string;
  getDraftSnapshot: () => string;
  getColumnsServerSnapshot: () => readonly TypeColumn[];
  getColumnsSnapshot: () => readonly TypeColumn[];
  getSnapshot: () => string;
  getServerSnapshot: () => string;
  registerColumns: (columns: readonly TypeColumn[]) => () => void;
  setDraftValue: (value: string, debounceMs: number | null) => void;
  setValue: (value: string) => void;
  subscribe: (listener: () => void) => () => void;
  subscribeColumns: (listener: () => void) => () => void;
  subscribeDraft: (listener: () => void) => () => void;
};

export function createRDGSearchStore(initialValue: string): RDGSearchStore {
  let value = initialValue;
  let draftValue = initialValue;
  let columnsSnapshot = EMPTY_COLUMNS;
  let pendingCommit: ReturnType<typeof setTimeout> | null = null;
  const listeners = new Set<() => void>();
  const draftListeners = new Set<() => void>();
  const columnsListeners = new Set<() => void>();
  const columnRegistrations = new Map<symbol, readonly TypeColumn[]>();

  const cancelPendingCommit = () => {
    if (pendingCommit == null) return;
    clearTimeout(pendingCommit);
    pendingCommit = null;
  };

  const commit = (nextValue: string) => {
    pendingCommit = null;
    if (Object.is(value, nextValue)) return;

    value = nextValue;
    listeners.forEach((listener) => listener());
  };

  const updateColumnsSnapshot = () => {
    const seen = new Set<TypeColumn>();
    const nextColumns = Array.from(columnRegistrations.values()).flatMap(
      (columns) =>
        columns.filter((column) => {
          if (seen.has(column)) return false;
          seen.add(column);
          return true;
        })
    );
    const unchanged =
      nextColumns.length === columnsSnapshot.length &&
      nextColumns.every((column, index) => column === columnsSnapshot[index]);
    if (unchanged) return;

    columnsSnapshot = nextColumns;
    columnsListeners.forEach((listener) => listener());
  };

  return {
    dispose() {
      cancelPendingCommit();
      listeners.clear();
      draftListeners.clear();
      columnsListeners.clear();
      columnRegistrations.clear();
    },
    getColumnsSnapshot: () => columnsSnapshot,
    getColumnsServerSnapshot: () => EMPTY_COLUMNS,
    getDraftSnapshot: () => draftValue,
    getDraftServerSnapshot: () => initialValue,
    getSnapshot: () => value,
    getServerSnapshot: () => initialValue,
    registerColumns(columns) {
      const registration = Symbol();
      columnRegistrations.set(registration, columns);
      updateColumnsSnapshot();

      return () => {
        if (!columnRegistrations.delete(registration)) return;
        updateColumnsSnapshot();
      };
    },
    setDraftValue(nextValue, debounceMs) {
      cancelPendingCommit();

      if (!Object.is(draftValue, nextValue)) {
        draftValue = nextValue;
        draftListeners.forEach((listener) => listener());
      }

      if (debounceMs == null) return;
      if (debounceMs <= 0) {
        commit(nextValue);
        return;
      }

      pendingCommit = setTimeout(() => commit(nextValue), debounceMs);
    },
    setValue(nextValue) {
      cancelPendingCommit();

      if (!Object.is(draftValue, nextValue)) {
        draftValue = nextValue;
        draftListeners.forEach((listener) => listener());
      }

      commit(nextValue);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    subscribeColumns(listener) {
      columnsListeners.add(listener);
      return () => columnsListeners.delete(listener);
    },
    subscribeDraft(listener) {
      draftListeners.add(listener);
      return () => draftListeners.delete(listener);
    },
  };
}

export const RDGSearchContext = React.createContext<RDGSearchStore | null>(
  null
);

export function useRDGSearchStore(): RDGSearchStore {
  const store = React.useContext(RDGSearchContext);

  if (!store) {
    throw new Error(
      "RDG search components must be rendered inside RDGSearchProvider."
    );
  }

  return store;
}

export function useRDGSearchSnapshot(): string {
  const store = useRDGSearchStore();
  return React.useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot
  );
}

export function useRDGSearchDraftSnapshot(): string {
  const store = useRDGSearchStore();
  return React.useSyncExternalStore(
    store.subscribeDraft,
    store.getDraftSnapshot,
    store.getDraftServerSnapshot
  );
}

export function useRDGSearchColumnsSnapshot(): readonly TypeColumn[] {
  const store = useRDGSearchStore();
  return React.useSyncExternalStore(
    store.subscribeColumns,
    store.getColumnsSnapshot,
    store.getColumnsServerSnapshot
  );
}
