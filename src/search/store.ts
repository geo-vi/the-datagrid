import * as React from "react";
import { useSyncExternalStore } from "use-sync-external-store/shim";
import type { TypeColumn } from "../types";

const EMPTY_COLUMNS: readonly TypeColumn[] = [];
const DEFAULT_THEME = "default";

type RDGSearchTargetRegistration = {
  columns: readonly TypeColumn[];
  theme: string;
};

export type RDGSearchStore = {
  dispose: () => void;
  getDraftServerSnapshot: () => string;
  getDraftSnapshot: () => string;
  getColumnsServerSnapshot: () => readonly TypeColumn[];
  getColumnsSnapshot: () => readonly TypeColumn[];
  getThemeServerSnapshot: () => string;
  getThemeSnapshot: () => string;
  getSnapshot: () => string;
  getServerSnapshot: () => string;
  registerTarget: (
    columns: readonly TypeColumn[],
    theme: string | null | undefined
  ) => () => void;
  setDraftValue: (value: string, debounceMs: number | null) => void;
  setValue: (value: string) => void;
  subscribe: (listener: () => void) => () => void;
  subscribeColumns: (listener: () => void) => () => void;
  subscribeDraft: (listener: () => void) => () => void;
  subscribeTheme: (listener: () => void) => () => void;
};

export function createRDGSearchStore(initialValue: string): RDGSearchStore {
  let value = initialValue;
  let draftValue = initialValue;
  let columnsSnapshot = EMPTY_COLUMNS;
  let themeSnapshot = DEFAULT_THEME;
  let pendingCommit: ReturnType<typeof setTimeout> | null = null;
  const listeners = new Set<() => void>();
  const draftListeners = new Set<() => void>();
  const columnsListeners = new Set<() => void>();
  const themeListeners = new Set<() => void>();
  const targetRegistrations = new Map<symbol, RDGSearchTargetRegistration>();

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

  const updateTargetSnapshots = () => {
    const seen = new Set<TypeColumn>();
    const registrations = Array.from(targetRegistrations.values());
    const nextColumns = registrations.flatMap((registration) =>
      registration.columns.filter((column) => {
        if (seen.has(column)) return false;
        seen.add(column);
        return true;
      })
    );
    const unchanged =
      nextColumns.length === columnsSnapshot.length &&
      nextColumns.every((column, index) => column === columnsSnapshot[index]);
    if (!unchanged) {
      columnsSnapshot = nextColumns;
      columnsListeners.forEach((listener) => listener());
    }

    const nextTheme = registrations[0]?.theme ?? DEFAULT_THEME;
    if (!Object.is(themeSnapshot, nextTheme)) {
      themeSnapshot = nextTheme;
      themeListeners.forEach((listener) => listener());
    }
  };

  return {
    dispose() {
      cancelPendingCommit();
      listeners.clear();
      draftListeners.clear();
      columnsListeners.clear();
      themeListeners.clear();
      targetRegistrations.clear();
    },
    getColumnsSnapshot: () => columnsSnapshot,
    getColumnsServerSnapshot: () => EMPTY_COLUMNS,
    getDraftSnapshot: () => draftValue,
    getDraftServerSnapshot: () => initialValue,
    getThemeSnapshot: () => themeSnapshot,
    getThemeServerSnapshot: () => DEFAULT_THEME,
    getSnapshot: () => value,
    getServerSnapshot: () => initialValue,
    registerTarget(columns, theme) {
      const registration = Symbol();
      targetRegistrations.set(registration, {
        columns,
        theme: String(theme ?? DEFAULT_THEME),
      });
      updateTargetSnapshots();

      return () => {
        if (!targetRegistrations.delete(registration)) return;
        updateTargetSnapshots();
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
    subscribeTheme(listener) {
      themeListeners.add(listener);
      return () => themeListeners.delete(listener);
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
  return useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot
  );
}

export function useRDGSearchDraftSnapshot(): string {
  const store = useRDGSearchStore();
  return useSyncExternalStore(
    store.subscribeDraft,
    store.getDraftSnapshot,
    store.getDraftServerSnapshot
  );
}

export function useRDGSearchColumnsSnapshot(): readonly TypeColumn[] {
  const store = useRDGSearchStore();
  return useSyncExternalStore(
    store.subscribeColumns,
    store.getColumnsSnapshot,
    store.getColumnsServerSnapshot
  );
}

export function useRDGSearchThemeSnapshot(): string {
  const store = useRDGSearchStore();
  return useSyncExternalStore(
    store.subscribeTheme,
    store.getThemeSnapshot,
    store.getThemeServerSnapshot
  );
}
