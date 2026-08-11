export type LoadingStore = {
  getEffective: (controlledLoading: boolean | undefined) => boolean;
  getOverride: () => boolean | null;
  setAutomatic: (loading: boolean) => void;
  setOverride: (loading: boolean) => void;
  subscribe: (listener: () => void) => () => void;
};

export function createLoadingStore(): LoadingStore {
  let automaticLoading = false;
  let loadingOverride: boolean | null = null;
  const listeners = new Set<() => void>();

  const notify = () => {
    for (const listener of listeners) listener();
  };

  return {
    getEffective(controlledLoading) {
      return controlledLoading ?? loadingOverride ?? automaticLoading;
    },
    getOverride() {
      return loadingOverride;
    },
    setAutomatic(loading) {
      if (Object.is(automaticLoading, loading)) return;
      automaticLoading = loading;
      notify();
    },
    setOverride(loading) {
      if (Object.is(loadingOverride, loading)) return;
      loadingOverride = loading;
      notify();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
