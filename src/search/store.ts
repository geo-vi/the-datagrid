import * as React from "react";

export type RDGSearchStore = {
  dispose: () => void;
  getDraftServerSnapshot: () => string;
  getDraftSnapshot: () => string;
  getSnapshot: () => string;
  getServerSnapshot: () => string;
  setDraftValue: (value: string, debounceMs: number | null) => void;
  setValue: (value: string) => void;
  subscribe: (listener: () => void) => () => void;
  subscribeDraft: (listener: () => void) => () => void;
};

export function createRDGSearchStore(initialValue: string): RDGSearchStore {
  let value = initialValue;
  let draftValue = initialValue;
  let pendingCommit: ReturnType<typeof setTimeout> | null = null;
  const listeners = new Set<() => void>();
  const draftListeners = new Set<() => void>();

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

  return {
    dispose() {
      cancelPendingCommit();
      listeners.clear();
      draftListeners.clear();
    },
    getDraftSnapshot: () => draftValue,
    getDraftServerSnapshot: () => initialValue,
    getSnapshot: () => value,
    getServerSnapshot: () => initialValue,
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
