import type { TypeColumn } from "../types";

export type RDGToolbarPublishedSnapshot = {
  columns: readonly TypeColumn[];
  columnOrder: readonly string[];
  columnVisibilityMap: Readonly<Record<string, boolean>>;
  theme: string;
  setColumnVisible: (columnId: string, visible: boolean) => void;
  /** Whether the grid currently renders its filter row. */
  filteringEnabled: boolean;
  /**
   * False while the grid owns `enableFiltering` as a controlled prop. The
   * imperative setter is a no-op in that case, so the toolbar disables its
   * filter toggle instead of pretending to own the state.
   */
  canToggleFiltering: boolean;
  setFilteringEnabled: (enabled: boolean) => void;
  /** Whether at least one column filter holds a non-empty value. */
  filtered: boolean;
  clearAllFilters: () => void;
  /** Rows the grid currently renders: filtered, searched and sorted. */
  getViewRows: () => readonly unknown[];
  /** Every row of the local data source, before filtering and searching. */
  getAllRows: () => readonly unknown[];
};

/** Private bridge injected by RDGToolbarTarget. */
export type RDGToolbarController = {
  publish: (snapshot: RDGToolbarPublishedSnapshot) => void;
};
