import type { TypeColumn } from "../types";
import { getColumnId, orderColumns } from "./columns";
import type { RDGToolbarPublishedSnapshot } from "./controller";
import {
  mergeExportSettings,
  performExport,
  RDG_TOOLBAR_EXPORT_FORMATS,
  type RDGToolbarExportFormat,
  type RDGToolbarExportResult,
  type RDGToolbarExportSettings,
} from "./export";

/** The grid state the API publishes; the actions live on the API itself. */
export type RDGToolbarState = {
  /** False until a grid mounts inside the provider, and again once it unmounts. */
  attached: boolean;
  /** Columns in the grid's current column order. */
  columns: readonly TypeColumn[];
  /** Visibility per column id. A column the map omits is visible. */
  columnVisibilityMap: Readonly<Record<string, boolean>>;
  theme: string;
  filteringEnabled: boolean;
  /** False while the grid owns `enableFiltering`, which makes the setter a no-op. */
  canToggleFiltering: boolean;
  filtered: boolean;
};

/**
 * The toolbar's surface, callable from outside React's tree. Comes from
 * `RDGToolbarProvider`'s `apiRef`, or from `useRDGToolbarApi()` inside it.
 *
 * Methods, never properties: a ref does not re-render its holder, so a
 * `columns` property would go stale as soon as a column was hidden.
 */
export type RDGToolbarApi = {
  /**
   * Writes one export, exactly as the toolbar's own button does. Settings win
   * over the provider's `exportDefaults`, which win over the library defaults.
   *
   * Resolves `null` when there is nothing to export, and rejects when a writer
   * fails - a missing `xlsx` peer dependency, say.
   */
  exportGrid(
    format: RDGToolbarExportFormat,
    settings?: RDGToolbarExportSettings
  ): Promise<RDGToolbarExportResult | null>;
  /** Every format `exportGrid` accepts, whatever a rendered toolbar offers. */
  getExportFormats(): readonly RDGToolbarExportFormat[];

  /** Columns in the grid's current column order. */
  getColumns(): readonly TypeColumn[];
  /** False for a hidden column, and for a column id the grid does not have. */
  isColumnVisible(columnId: string): boolean;
  setColumnVisible(columnId: string, visible: boolean): void;

  isFilteringEnabled(): boolean;
  /** False while the grid owns `enableFiltering` as its own prop. */
  canToggleFiltering(): boolean;
  setFilteringEnabled(enabled: boolean): void;
  /** Whether at least one column filter holds a non-empty value. */
  isFiltered(): boolean;
  clearAllFilters(): void;

  /** Rows the grid currently renders: filtered, searched and sorted. */
  getViewRows(): readonly unknown[];
  /** Every row of the local data source, before filtering and searching. */
  getAllRows(): readonly unknown[];

  /** The current state as plain data. Stable while the grid state is. */
  getState(): RDGToolbarState;
  /** Notifies on every grid state change. Returns an unsubscribe function. */
  subscribe(listener: () => void): () => void;
};

/** Taking these from the store is what keeps the runtime dependency one-way. */
export type RDGToolbarApiSource = {
  getSnapshot: () => RDGToolbarPublishedSnapshot;
  subscribe: (listener: () => void) => () => void;
  getExportDefaults: () => RDGToolbarExportSettings | undefined;
  isAttached: () => boolean;
};

const ALL_EXPORT_FORMATS = Object.keys(
  RDG_TOOLBAR_EXPORT_FORMATS
) as RDGToolbarExportFormat[];

export function createRDGToolbarApi(
  source: RDGToolbarApiSource
): RDGToolbarApi {
  // `useSyncExternalStore` requires a stable reference until something changes,
  // and the store publishes a new snapshot only when a field differs.
  let cachedSnapshot: RDGToolbarPublishedSnapshot | null = null;
  let cachedState: RDGToolbarState | null = null;

  const getState = (): RDGToolbarState => {
    const snapshot = source.getSnapshot();
    if (cachedSnapshot === snapshot && cachedState) return cachedState;

    cachedSnapshot = snapshot;
    cachedState = {
      attached: source.isAttached(),
      columns: orderColumns(snapshot.columns, snapshot.columnOrder),
      columnVisibilityMap: snapshot.columnVisibilityMap,
      theme: snapshot.theme,
      filteringEnabled: snapshot.filteringEnabled,
      canToggleFiltering: snapshot.canToggleFiltering,
      filtered: snapshot.filtered,
    };
    return cachedState;
  };

  return {
    async exportGrid(format, settings) {
      return performExport(
        source.getSnapshot(),
        format,
        mergeExportSettings(settings, source.getExportDefaults())
      );
    },
    getExportFormats: () => ALL_EXPORT_FORMATS,

    getColumns: () => getState().columns,
    isColumnVisible(columnId) {
      const snapshot = source.getSnapshot();
      if (snapshot.columnVisibilityMap[columnId] === false) return false;
      return snapshot.columns.some(
        (column) => getColumnId(column) === columnId
      );
    },
    setColumnVisible(columnId, visible) {
      source.getSnapshot().setColumnVisible(columnId, visible);
    },

    isFilteringEnabled: () => source.getSnapshot().filteringEnabled,
    canToggleFiltering: () => source.getSnapshot().canToggleFiltering,
    setFilteringEnabled(enabled) {
      source.getSnapshot().setFilteringEnabled(enabled);
    },
    isFiltered: () => source.getSnapshot().filtered,
    clearAllFilters() {
      source.getSnapshot().clearAllFilters();
    },

    getViewRows: () => source.getSnapshot().getViewRows(),
    getAllRows: () => source.getSnapshot().getAllRows(),

    getState,
    subscribe: (listener) => source.subscribe(listener),
  };
}
