import * as React from "react";

import { clearAllFilters, isFilterEntryEmptyValue } from "../../filters/utils";
import type {
  TypeColumn,
  TypeDataGridProps,
  TypeFilterTypes,
  TypeFilterValue,
} from "../../types";
import { getColumnId } from "../../utils/column";
import type { InternalToolbarController } from "../internalProps";

export type UseGridToolbarBridgeParams = {
  columnOrderForDs: string[];
  columnVisibilityMap: Record<string, boolean>;
  /** The grid's `enableFiltering` prop; defined means the consumer owns it. */
  enableFilteringProp: TypeDataGridProps["enableFiltering"];
  filterTypes: TypeFilterTypes;
  filterValue: TypeFilterValue;
  filteringEnabled: boolean;
  inputColumns: TypeColumn[];
  originalData: unknown[];
  rows: unknown[];
  setColumnVisibleById: (columnId: string, visible: boolean) => void;
  setEnableFiltering: (next: boolean) => void;
  setFilterValueAndResetPage: (next: TypeFilterValue) => void;
  theme: TypeDataGridProps["theme"];
  toolbarController: InternalToolbarController | undefined;
};

type LatestBridgeValues = {
  clearAllFilters: () => void;
  originalData: unknown[];
  rows: unknown[];
  setEnableFiltering: (next: boolean) => void;
};

/**
 * Publishes the state the optional toolbar package renders from.
 *
 * Rows and imperative setters are exposed through stable callbacks reading a
 * latest-value ref, so new data does not invalidate the published snapshot: the
 * toolbar only reads rows when the user exports.
 */
export function useGridToolbarBridge(params: UseGridToolbarBridgeParams): void {
  const {
    columnOrderForDs,
    columnVisibilityMap,
    enableFilteringProp,
    filterTypes,
    filterValue,
    filteringEnabled,
    inputColumns,
    originalData,
    rows,
    setColumnVisibleById,
    setEnableFiltering,
    setFilterValueAndResetPage,
    theme,
    toolbarController,
  } = params;

  const latestRef = React.useRef<LatestBridgeValues>({
    clearAllFilters: () => {},
    originalData,
    rows,
    setEnableFiltering,
  });

  React.useLayoutEffect(() => {
    latestRef.current = {
      clearAllFilters: () =>
        setFilterValueAndResetPage(
          clearAllFilters(filterValue, { filterTypes })
        ),
      originalData,
      rows,
      setEnableFiltering,
    };
  });

  const getViewRows = React.useCallback(
    (): readonly unknown[] => latestRef.current.rows,
    []
  );
  const getAllRows = React.useCallback(
    (): readonly unknown[] => latestRef.current.originalData,
    []
  );
  const setFilteringEnabled = React.useCallback((enabled: boolean) => {
    latestRef.current.setEnableFiltering(enabled);
  }, []);
  const clearAllFiltersForToolbar = React.useCallback(() => {
    latestRef.current.clearAllFilters();
  }, []);

  // A controlled `enableFiltering` makes the imperative setter a no-op, so the
  // toolbar has to know it cannot own the filter row.
  const canToggleFiltering = enableFilteringProp === undefined;
  const filtered = Boolean(
    filterValue?.some((entry) => !isFilterEntryEmptyValue(entry, filterTypes))
  );

  React.useLayoutEffect(() => {
    if (!toolbarController) return;

    const consumerColumnVisibilityMap = Object.fromEntries(
      inputColumns.map((column) => {
        const columnId = getColumnId(column);
        return [columnId, columnVisibilityMap[columnId] !== false];
      })
    );

    toolbarController.publish({
      columns: inputColumns,
      columnOrder: columnOrderForDs,
      columnVisibilityMap: consumerColumnVisibilityMap,
      theme: String(theme),
      setColumnVisible: setColumnVisibleById,
      filteringEnabled,
      canToggleFiltering,
      setFilteringEnabled,
      filtered,
      clearAllFilters: clearAllFiltersForToolbar,
      getViewRows,
      getAllRows,
    });
  }, [
    canToggleFiltering,
    clearAllFiltersForToolbar,
    columnOrderForDs,
    columnVisibilityMap,
    filtered,
    filteringEnabled,
    getAllRows,
    getViewRows,
    inputColumns,
    setColumnVisibleById,
    setFilteringEnabled,
    theme,
    toolbarController,
  ]);
}
