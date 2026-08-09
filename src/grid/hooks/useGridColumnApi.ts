import * as React from "react";

import type {
  TypeColumn,
  TypeColumnFilterValueChangeArg,
  TypeComputedColumn,
  TypeDataGridProps,
  TypeFilterTypes,
  TypeFilterValue,
  TypeGetColumnByParam,
  TypeSortFunctions,
  TypeSortInfo,
} from "../../types";
import { getColumnId } from "../../utils/column";
import {
  clearFilter,
  getFilterEntry,
  upsertFilterEntry,
} from "../../filters/utils";
import { setColumnSortInfo, toggleSortInfo } from "../../sorting/utils";
import { injectIntoOrder } from "../utils/gridUtils";
import {
  resolveDefaultFilterOperator,
  resolveFilterTypeName,
  type InternalColumnVisibilityController,
} from "../internalProps";

export type UseGridColumnApiParams = {
  allComputedColumns: TypeComputedColumn[];
  allInputColumns: TypeColumn[];
  allowUnsort: boolean;
  checkboxColId: string;
  checkboxEnabled: boolean;
  columnOrderForDs: string[];
  columnVisibilityController: InternalColumnVisibilityController | undefined;
  columnVisibilityMap: Record<string, boolean>;
  defaultSortDir: 1 | -1;
  filterTypes: TypeFilterTypes;
  filterValue: TypeFilterValue;
  inputColumns: TypeColumn[];
  onColumnFilterValueChange: TypeDataGridProps["onColumnFilterValueChange"];
  onColumnVisibleChange: TypeDataGridProps["onColumnVisibleChange"];
  orderedColumns: TypeColumn[];
  setColumnVisibilityState: React.Dispatch<
    React.SetStateAction<Record<string, boolean>>
  >;
  setFilterValueAndResetPage: (next: TypeFilterValue) => void;
  setSortInfoAndResetPage: (next: TypeSortInfo) => void;
  sortFunctions: TypeSortFunctions | null;
  sortInfo: TypeSortInfo;
  table: { setColumnOrder: (order: string[]) => void };
  theme: TypeDataGridProps["theme"];
};

/**
 * Inovua-compatible per-column API: lookup, order, visibility, sorting and
 * filtering. Extracted so this fan-out of callbacks stops anchoring the whole
 * grid render scope.
 */
export function useGridColumnApi(params: UseGridColumnApiParams) {
  const {
    allComputedColumns,
    allInputColumns,
    allowUnsort,
    checkboxColId,
    checkboxEnabled,
    columnOrderForDs,
    columnVisibilityController,
    columnVisibilityMap,
    defaultSortDir,
    filterTypes,
    filterValue,
    inputColumns,
    onColumnFilterValueChange,
    onColumnVisibleChange,
    orderedColumns,
    setColumnVisibilityState,
    setFilterValueAndResetPage,
    setSortInfoAndResetPage,
    sortFunctions,
    sortInfo,
    table,
    theme,
  } = params;

  const computedOnColumnFilterValueChangeCompat = React.useCallback(
    (event: TypeColumnFilterValueChangeArg) => {
      onColumnFilterValueChange?.(event);
      setFilterValueAndResetPage(
        upsertFilterEntry(filterValue, event.filterValue, { filterTypes })
      );
    },
    [
      filterTypes,
      filterValue,
      onColumnFilterValueChange,
      setFilterValueAndResetPage,
    ]
  );

  const setColumnOrderCompat = React.useCallback(
    (next: string[]) => {
      const internalNext = checkboxEnabled
        ? (injectIntoOrder(next, checkboxColId) ?? next)
        : next;
      table.setColumnOrder(internalNext);
    },
    [checkboxColId, checkboxEnabled, table]
  );

  const getColumnByCompat = React.useCallback(
    (
      column: TypeGetColumnByParam,
      config?: { initial?: boolean }
    ): TypeComputedColumn | TypeColumn | undefined => {
      const source = config?.initial ? allInputColumns : allComputedColumns;

      if (typeof column === "number") {
        return source[column];
      }

      if (typeof column === "string") {
        return source.find((candidate) => {
          const candidateId = getColumnId(candidate);
          return (
            candidateId === column ||
            candidate.id === column ||
            candidate.name === column
          );
        });
      }

      const candidateId =
        column && typeof column === "object"
          ? "id" in column && column.id != null
            ? String(column.id)
            : "name" in column && column.name != null
              ? String(column.name)
              : null
          : null;

      if (!candidateId) return undefined;

      return source.find((candidate) => {
        const resolvedId = getColumnId(candidate);
        return (
          resolvedId === candidateId ||
          candidate.id === candidateId ||
          candidate.name === candidateId
        );
      });
    },
    [allComputedColumns, allInputColumns]
  );

  const getColumnIdCompat = React.useCallback(
    (column: TypeGetColumnByParam): string | null => {
      if (typeof column === "string") return column;
      if (typeof column === "number") {
        const resolved = getColumnByCompat(column);
        return resolved ? getColumnId(resolved) : null;
      }

      const resolved =
        getColumnByCompat(column, { initial: true }) ??
        getColumnByCompat(column);

      return resolved ? getColumnId(resolved) : null;
    },
    [getColumnByCompat]
  );

  const setColumnVisibleCompat = React.useCallback(
    (column: TypeGetColumnByParam, visible: boolean) => {
      const columnId = getColumnIdCompat(column);
      if (!columnId) return;
      const initialColumn = allInputColumns.find(
        (candidate) => getColumnId(candidate) === columnId
      );
      if (!initialColumn) return;
      if ((columnVisibilityMap[columnId] !== false) === visible) return;

      onColumnVisibleChange?.({
        column: initialColumn,
        visible,
      });

      // A declarative `visible` value is controlled ownership. The callback
      // receives the proposal, but rendering remains prop-authoritative until
      // the consumer supplies a new value.
      if (initialColumn.visible !== undefined) return;

      // `hideable` constrains UI affordances, not the Inovua imperative API.
      // Writing the sparse internal override also avoids TanStack's
      // `getCanHide()` gate for hideable:false columns.
      setColumnVisibilityState((current) => {
        if (current[columnId] === visible) return current;
        return { ...current, [columnId]: visible };
      });
    },
    [
      allInputColumns,
      columnVisibilityMap,
      getColumnIdCompat,
      onColumnVisibleChange,
      setColumnVisibilityState,
    ]
  );

  const setColumnVisibleById = React.useCallback(
    (columnId: string, visible: boolean) => {
      setColumnVisibleCompat(columnId, visible);
    },
    [setColumnVisibleCompat]
  );

  React.useLayoutEffect(() => {
    if (!columnVisibilityController) return;

    const consumerColumnVisibilityMap = Object.fromEntries(
      inputColumns.map((column) => {
        const columnId = getColumnId(column);
        return [columnId, columnVisibilityMap[columnId] !== false];
      })
    );

    columnVisibilityController.publish({
      columns: inputColumns,
      columnOrder: columnOrderForDs,
      columnVisibilityMap: consumerColumnVisibilityMap,
      theme: String(theme),
      setColumnVisible: setColumnVisibleById,
    });
  }, [
    columnOrderForDs,
    columnVisibilityController,
    columnVisibilityMap,
    inputColumns,
    setColumnVisibleById,
    theme,
  ]);

  const setColumnSortInfoCompat = React.useCallback(
    (column: TypeGetColumnByParam, dir: 1 | 0 | -1) => {
      const resolved = getColumnByCompat(column, { initial: true });
      if (!resolved) return;

      setSortInfoAndResetPage(
        setColumnSortInfo({
          sortInfo,
          col: resolved,
          dir,
          sortFunctions,
        })
      );
    },
    [getColumnByCompat, setSortInfoAndResetPage, sortFunctions, sortInfo]
  );

  const toggleColumnSortCompat = React.useCallback(
    (column: TypeGetColumnByParam) => {
      const resolved = getColumnByCompat(column, { initial: true });
      if (!resolved) return;

      const next = toggleSortInfo({
        sortInfo,
        col: resolved,
        allowUnsort,
        defaultDir: defaultSortDir,
        sortFunctions,
      });

      setSortInfoAndResetPage(next);
    },
    [
      allowUnsort,
      defaultSortDir,
      getColumnByCompat,
      setSortInfoAndResetPage,
      sortFunctions,
      sortInfo,
    ]
  );

  const getColumnFilterValueCompat = React.useCallback(
    (column: TypeGetColumnByParam) => {
      const columnId = getColumnIdCompat(column);
      return columnId ? getFilterEntry(filterValue, columnId) : undefined;
    },
    [filterValue, getColumnIdCompat]
  );

  const setColumnFilterValueCompat = React.useCallback(
    (column: TypeGetColumnByParam, value: unknown, operator?: string) => {
      const resolved = getColumnByCompat(column, { initial: true });
      const columnId = resolved
        ? getColumnId(resolved)
        : getColumnIdCompat(column);
      if (!columnId) return;

      const existing = getFilterEntry(filterValue, columnId);
      const filterType = resolveFilterTypeName(
        resolved as TypeColumn | undefined,
        existing
      );
      const nextOperator =
        operator ?? resolveDefaultFilterOperator(filterType, existing);
      const columnIndex = orderedColumns.findIndex(
        (candidate) => getColumnId(candidate) === columnId
      );

      computedOnColumnFilterValueChangeCompat({
        columnId,
        columnIndex,
        filterValue: {
          ...(existing ?? {}),
          name: columnId,
          type: filterType,
          operator: nextOperator,
          value,
        },
      });
    },
    [
      computedOnColumnFilterValueChangeCompat,
      filterValue,
      getColumnByCompat,
      getColumnIdCompat,
      orderedColumns,
    ]
  );

  const clearColumnFilterCompat = React.useCallback(
    (column: TypeGetColumnByParam) => {
      const columnId = getColumnIdCompat(column);
      if (!columnId) return;

      const existing = getFilterEntry(filterValue, columnId);
      if (!existing) {
        setFilterValueAndResetPage(
          clearFilter(filterValue, columnId, { filterTypes })
        );
        return;
      }

      const next = clearFilter(filterValue, columnId, { filterTypes });
      const clearedEntry = getFilterEntry(next, columnId);
      if (!clearedEntry) return;

      const columnIndex = orderedColumns.findIndex(
        (candidate) => getColumnId(candidate) === columnId
      );

      computedOnColumnFilterValueChangeCompat({
        columnId,
        columnIndex,
        filterValue: clearedEntry,
      });
    },
    [
      computedOnColumnFilterValueChangeCompat,
      filterTypes,
      filterValue,
      getColumnIdCompat,
      orderedColumns,
      setFilterValueAndResetPage,
    ]
  );
  return {
    clearColumnFilterCompat,
    computedOnColumnFilterValueChangeCompat,
    getColumnByCompat,
    getColumnFilterValueCompat,
    getColumnIdCompat,
    setColumnFilterValueCompat,
    setColumnOrderCompat,
    setColumnSortInfoCompat,
    setColumnVisibleById,
    setColumnVisibleCompat,
    toggleColumnSortCompat,
  };
}
