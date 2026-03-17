"use client";

import * as React from "react";
import type {
  TypeCheckboxColumn,
  TypeCheckboxProps,
  TypeColumn,
  TypeComputedProps,
  TypeDataGridProps,
  TypeFilterValue,
  TypeRowSelection,
  TypeSortInfo,
} from "../types";

import type { ColumnDef } from "@tanstack/react-table";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";

import { cn } from "../lib/utils";
import { Checkbox } from "../components/ui/checkbox";
import { ScrollArea } from "../components/ui/scroll-area";
import {
  DatagridThemeProvider,
  normalizeThemeName,
  resolveThemeBase,
  toThemeClassSuffix,
} from "../theme/context";
import { useLegacyThemeBridge } from "../theme/use-legacy-theme-bridge";

import { getColumnId } from "../utils/column";
import { clamp, coerceUserSelect, estimateAutoWidth } from "../utils/helpers";
import { useControllableState } from "../hooks/useControllableState";

import { DEFAULT_FILTER_TYPES, normalizeFilterValue, applyLocalFilter } from "../filters/utils";
import { toTanstackSorting, applyLocalSort } from "../sorting/utils";

import {
  injectIntoOrder,
  isColumnVisible,
  isInteractiveClickTarget,
  normalizeColumnOrder,
  stripFromOrder,
  toSelectionMap,
} from "./utils/gridUtils";

import { GridHeader } from "./components/GridHeader";
import { GridBody } from "./components/GridBody";
import { GridPagination } from "./components/GridPagination";

/**
 * Optional compat export: Inovua exports `plugins`. We export an empty list.
 */
export const plugins: readonly unknown[] = [] as const;

function getColumnHeaderText(column: TypeColumn, skipHeaderOnAutoSize: boolean): string {
  if (skipHeaderOnAutoSize) return "";
  if (typeof column.header === "string") return column.header;
  if (typeof column.name === "string") return column.name;
  if (typeof column.id === "string") return column.id;
  return "";
}

function getColumnWidthBounds(column: TypeColumn): { minWidth: number; maxWidth: number } {
  const minWidth =
    typeof column.minWidth === "number" && Number.isFinite(column.minWidth) && column.minWidth > 0
      ? column.minWidth
      : 60;
  const maxWidth =
    typeof column.maxWidth === "number" && Number.isFinite(column.maxWidth) && column.maxWidth >= minWidth
      ? column.maxWidth
      : 9999;

  return { minWidth, maxWidth };
}

function estimateColumnContentWidth(args: {
  column: TypeColumn;
  rows: any[];
  skipHeaderOnAutoSize: boolean;
}): number {
  const { column, rows, skipHeaderOnAutoSize } = args;
  const columnId = getColumnId(column);
  const { minWidth, maxWidth } = getColumnWidthBounds(column);
  const header = getColumnHeaderText(column, skipHeaderOnAutoSize);
  const values = rows.map((row) => (row as any)?.[columnId]);

  return clamp(estimateAutoWidth({ header, values }), minWidth, maxWidth);
}

function resolveBaseColumnWidth(args: {
  column: TypeColumn;
  rows: any[];
  enableColumnAutosize: boolean;
  skipHeaderOnAutoSize: boolean;
}): number {
  const { column, rows, enableColumnAutosize, skipHeaderOnAutoSize } = args;
  const explicit = column.width ?? column.defaultWidth;
  const { minWidth, maxWidth } = getColumnWidthBounds(column);

  if (typeof explicit === "number" && Number.isFinite(explicit) && explicit > 0) {
    return clamp(explicit, minWidth, maxWidth);
  }

  if (enableColumnAutosize) {
    return estimateColumnContentWidth({ column, rows, skipHeaderOnAutoSize });
  }

  return clamp(column.minWidth ?? 120, minWidth, maxWidth);
}

function ReactDataGrid(props: TypeDataGridProps) {
  const {
    theme = "default",
    idProperty,
    columns: inputColumns,
    dataSource,

    enableColumnFilterContextMenu = false,

    enableColumnAutosize = true,
    skipHeaderOnAutoSize = false,
    resizable = true,

    enableFiltering = true,

    filteredRowsCount,

    virtualized = true,
    columnUserSelect = true,
    showCellBorders = true,

    i18n,
    showColumnMenuTool = false,

    rowHeight = 44,
    headerHeight = 40,
    filterRowHeight = 44,

    className,
    style,
  } = props;

  const themeName = normalizeThemeName(theme);
  const themeClassSuffix = toThemeClassSuffix(themeName);
  const themeBase = resolveThemeBase(themeName);
  const shouldUseLegacyThemeBridge =
    themeClassSuffix !== "default" &&
    themeClassSuffix !== "light" &&
    themeClassSuffix !== "dark";
  const [portalContainer, setPortalContainer] = React.useState<HTMLDivElement | null>(null);
  const surfaceRef = React.useRef<HTMLDivElement | null>(null);
  const showHorizontalCellBorders = showCellBorders === true || showCellBorders === "horizontal";
  const showVerticalCellBorders = showCellBorders === true || showCellBorders === "vertical";

  useLegacyThemeBridge(portalContainer, themeClassSuffix, shouldUseLegacyThemeBridge);

  /** ---------------- selection / checkbox column ---------------- */

  const checkboxColumnProp: TypeCheckboxColumn | undefined = props.checkboxColumn;
  const checkboxEnabled = Boolean(checkboxColumnProp);

  const checkboxColId = React.useMemo(() => {
    if (!checkboxEnabled) return "__checkbox__";
    if (typeof checkboxColumnProp === "object") {
      return checkboxColumnProp.id ?? checkboxColumnProp.name ?? "__checkbox__";
    }
    return "__checkbox__";
  }, [checkboxEnabled, checkboxColumnProp]);

  const multiSelect = (props as any).multiSelect ?? checkboxEnabled;
  const checkboxOnlyRowSelect = (props as any).checkboxOnlyRowSelect ?? checkboxEnabled;
  const checkboxSelectEnableShiftKey = (props as any).checkboxSelectEnableShiftKey ?? false;

  const controlledSelected = props.selected !== undefined;
  const [internalSelected, setInternalSelected] = React.useState<TypeRowSelection>(() => {
    if (props.defaultSelected !== undefined) return props.defaultSelected;
    return multiSelect ? {} : null;
  });

  const selected: TypeRowSelection = controlledSelected ? (props.selected as TypeRowSelection) : internalSelected;
  const selectedMap = React.useMemo(() => toSelectionMap(selected), [selected]);

  const lastSelectedIndexRef = React.useRef<number | null>(null);
  const lastPointerRef = React.useRef<{ shiftKey: boolean }>({ shiftKey: false });

  const emitSelectionChange = React.useCallback(
    (nextMap: Record<string, any>, meta?: { data?: unknown; unselected?: TypeRowSelection }) => {
      const nextSelected: TypeRowSelection = nextMap;

      if (!controlledSelected) setInternalSelected(nextSelected);

      props.onSelectionChange?.({
        selected: nextSelected,
        data: meta?.data,
        unselected: meta?.unselected,
        originalData: dataSource,
      });
    },
    [controlledSelected, dataSource, props],
  );

  /** ---------------- filter types ---------------- */

  const filterTypes = React.useMemo(() => {
    return { ...DEFAULT_FILTER_TYPES, ...(props.filterTypes ?? {}) };
  }, [props.filterTypes]);

  /** ---------------- columns / order ---------------- */

  const checkboxColumn: TypeColumn | null = React.useMemo(() => {
    if (!checkboxEnabled) return null;

    const hasAlready = inputColumns.some((c) => getColumnId(c) === checkboxColId);
    if (hasAlready) return null;

    const cfg = typeof checkboxColumnProp === "object" ? checkboxColumnProp : undefined;
    const width = (cfg?.width ?? cfg?.defaultWidth ?? 44) as number;

    return {
      ...(cfg ?? {}),
      id: checkboxColId,
      name: checkboxColId,
      sortable: false,
      filterable: false,
      draggable: false,
      hideable: false,
      width,
      defaultWidth: width,
      minWidth: cfg?.minWidth ?? width,
      maxWidth: cfg?.maxWidth ?? width,
    } as TypeColumn;
  }, [checkboxColId, checkboxColumnProp, checkboxEnabled, inputColumns]);

  const allInputColumns = React.useMemo(() => {
    return checkboxColumn ? [checkboxColumn, ...inputColumns] : inputColumns;
  }, [checkboxColumn, inputColumns]);

  const defaultColumnOrder = React.useMemo(() => {
    const base = inputColumns.map((c) => getColumnId(c));
    return checkboxEnabled ? [checkboxColId, ...base] : base;
  }, [checkboxColId, checkboxEnabled, inputColumns]);

  const [columnOrder, setColumnOrder] = useControllableState<string[]>({
    value: checkboxEnabled ? injectIntoOrder(props.columnOrder, checkboxColId) : props.columnOrder,
    defaultValue:
      checkboxEnabled
        ? injectIntoOrder(props.columnOrder ?? defaultColumnOrder, checkboxColId) ?? defaultColumnOrder
        : props.columnOrder ?? defaultColumnOrder,
    onChange: (next) => {
      const userNext = checkboxEnabled ? stripFromOrder(next, checkboxColId) : next;
      props.onColumnOrderChange?.(userNext);
    },
  });
  const availableColumnIds = React.useMemo(() => allInputColumns.map((column) => getColumnId(column)), [allInputColumns]);
  const effectiveColumnOrder = React.useMemo(
    () => normalizeColumnOrder(columnOrder, availableColumnIds),
    [availableColumnIds, columnOrder],
  );

  const [sortInfo, setSortInfo] = useControllableState<TypeSortInfo>({
    value: props.sortInfo,
    defaultValue: props.defaultSortInfo ?? null,
    onChange: props.onSortInfoChange,
  });

  const [filterValue, setFilterValue, filterControlled] = useControllableState<TypeFilterValue>({
    value: props.filterValue,
    defaultValue: normalizeFilterValue(props.defaultFilterValue) ?? null,
    onChange: props.onFilterValueChange,
  });

  const [draftFilterValue, setDraftFilterValue] = React.useState<TypeFilterValue>(filterValue);
  React.useEffect(() => setDraftFilterValue(filterValue), [filterValue]);

  const pageSizes = React.useMemo(() => {
    const raw = props.pageSizes ?? [10, 50, 100, 1000];
    const unique = Array.from(new Set(raw)).filter((n) => typeof n === "number" && Number.isFinite(n) && n > 0);
    return unique.length ? unique : [10, 50, 100, 1000];
  }, [props.pageSizes]);

  const [skip, setSkip] = useControllableState<number>({
    value: props.skip,
    defaultValue: props.defaultSkip ?? 0,
    onChange: props.onSkipChange,
  });

  const [limit, setLimit] = useControllableState<number>({
    value: props.limit,
    defaultValue: props.defaultLimit ?? pageSizes[0] ?? 10,
    onChange: props.onLimitChange,
  });

  const allowUnsort = props.allowUnsort ?? true;
  const defaultSortingDirection = props.defaultSortingDirection ?? "asc";
  const defaultSortDir: 1 | -1 = defaultSortingDirection === "desc" ? -1 : 1;

  const paginationMode = props.pagination ?? false;
  const paginationEnabled = paginationMode !== false;

  const orderedColumns = React.useMemo(() => {
    const colById = new Map<string, TypeColumn>();
    for (const c of allInputColumns) colById.set(getColumnId(c), c);

    const ordered: TypeColumn[] = [];
    for (const id of effectiveColumnOrder) {
      const col = colById.get(id);
      if (col) ordered.push(col);
    }

    for (const c of allInputColumns) {
      const id = getColumnId(c);
      if (!ordered.find((x) => getColumnId(x) === id)) ordered.push(c);
    }

    return ordered.filter(isColumnVisible);
  }, [allInputColumns, effectiveColumnOrder]);

  const tanstackSorting = React.useMemo(() => toTanstackSorting(sortInfo, orderedColumns), [sortInfo, orderedColumns]);

  /** ---------------- data loading ---------------- */

  const [rows, setRows] = React.useState<any[]>([]);
  const [count, setCount] = React.useState<number>(0);
  const [internalLoading, setInternalLoading] = React.useState(false);
  const loading = props.loading ?? internalLoading;

  const computedFilterForFetch = filterValue;
  const computedSortForFetch = sortInfo;

  const columnsForDs = React.useMemo(() => {
    return checkboxEnabled ? orderedColumns.filter((c) => getColumnId(c) !== checkboxColId) : orderedColumns;
  }, [checkboxColId, checkboxEnabled, orderedColumns]);

  const columnOrderForDs = React.useMemo(() => {
    return checkboxEnabled ? stripFromOrder(effectiveColumnOrder, checkboxColId) : effectiveColumnOrder;
  }, [checkboxColId, checkboxEnabled, effectiveColumnOrder]);

  const loadData = React.useCallback(async () => {
    if (Array.isArray(dataSource)) {
      let data = dataSource;

      if (enableFiltering && computedFilterForFetch) {
        data = applyLocalFilter(data, computedFilterForFetch, { filterTypes, columns: orderedColumns });
      }
      if (computedSortForFetch) {
        data = applyLocalSort(data, computedSortForFetch, orderedColumns);
      }

      const totalCount = data.length;

      const doPage = paginationMode !== false && paginationMode !== "remote";

      const sliced = doPage ? data.slice(skip, skip + limit) : data;

      setRows(sliced);
      setCount(totalCount);
      filteredRowsCount?.(totalCount);
      return;
    }

    setInternalLoading(true);

    try {
      const ds = dataSource;

      const dsIsFn = typeof ds === "function";
      const sliceLocally = paginationMode !== false && (paginationMode === "local" || !dsIsFn);

      const dsArg = {
        ...(paginationMode !== false && paginationMode !== "local" && dsIsFn ? { skip, limit } : {}),
        sortInfo: computedSortForFetch,
        filterValue: computedFilterForFetch,
        columnOrder: columnOrderForDs,
        columns: columnsForDs,
        idProperty,
        theme: themeName,
      };

      let result: any = ds;

      if (dsIsFn) {
        result = ds(dsArg);
      }

      if (result && typeof result.then === "function") {
        result = await result;
      }

      if (result && typeof result === "object" && Array.isArray(result.data)) {
        const totalCount = Number(result.count ?? result.data.length);
        const nextRows = sliceLocally ? result.data.slice(skip, skip + limit) : result.data;

        setRows(nextRows);
        setCount(totalCount);
        filteredRowsCount?.(totalCount);
      } else if (Array.isArray(result)) {
        const totalCount = result.length;
        const nextRows = sliceLocally ? result.slice(skip, skip + limit) : result;

        setRows(nextRows);
        setCount(totalCount);
        filteredRowsCount?.(totalCount);
      } else {
        setRows([]);
        setCount(0);
        filteredRowsCount?.(0);
      }
    } finally {
      setInternalLoading(false);
    }
  }, [
    dataSource,
    enableFiltering,
    computedFilterForFetch,
    computedSortForFetch,
    filteredRowsCount,
    idProperty,
    limit,
    orderedColumns,
    paginationMode,
    skip,
    themeName,
    columnOrderForDs,
    columnsForDs,
    filterTypes,
  ]);

  React.useEffect(() => {
    void loadData();
  }, [loadData]);

  React.useEffect(() => {
    if (filterControlled) return;

    const handle = window.setTimeout(() => {
      setFilterValue(draftFilterValue);
    }, 300);

    return () => window.clearTimeout(handle);
  }, [draftFilterValue, filterControlled, setFilterValue]);

  const autosizeSample = React.useMemo(() => {
    if (Array.isArray(dataSource)) {
      let data = dataSource;

      if (enableFiltering && computedFilterForFetch) {
        data = applyLocalFilter(data, computedFilterForFetch, {
          filterTypes,
          columns: orderedColumns,
        });
      }

      return data.slice(0, 25);
    }

    return rows.slice(0, 25);
  }, [
    computedFilterForFetch,
    dataSource,
    enableFiltering,
    filterTypes,
    orderedColumns,
    rows,
  ]);

  /** ---------------- column widths ---------------- */

  const autosizedWidths = React.useMemo(() => {
    const next: Record<string, number> = {};

    for (const column of orderedColumns) {
      const columnId = getColumnId(column);
      next[columnId] = resolveBaseColumnWidth({
        column,
        rows: autosizeSample,
        enableColumnAutosize,
        skipHeaderOnAutoSize,
      });
    }

    return next;
  }, [autosizeSample, enableColumnAutosize, orderedColumns, skipHeaderOnAutoSize]);

  const [manualColumnWidths, setManualColumnWidths] = React.useState<Record<string, number>>({});
  const hasManualColumnWidths = React.useMemo(
    () => Object.keys(manualColumnWidths).length > 0,
    [manualColumnWidths],
  );

  React.useEffect(() => {
    setManualColumnWidths((current) => {
      const nextEntries = orderedColumns.flatMap((column) => {
        const columnId = getColumnId(column);
        const currentWidth = current[columnId];

        if (typeof currentWidth !== "number" || !Number.isFinite(currentWidth)) {
          return [];
        }

        const { minWidth, maxWidth } = getColumnWidthBounds(column);
        return [[columnId, clamp(currentWidth, minWidth, maxWidth)] as const];
      });

      if (
        nextEntries.length === Object.keys(current).length &&
        nextEntries.every(([columnId, width]) => current[columnId] === width)
      ) {
        return current;
      }

      return Object.fromEntries(nextEntries);
    });
  }, [orderedColumns]);

  const columnWidths = React.useMemo(() => {
    const next: Record<string, number> = {};

    for (const column of orderedColumns) {
      const columnId = getColumnId(column);
      next[columnId] = manualColumnWidths[columnId] ?? autosizedWidths[columnId];
    }

    return next;
  }, [autosizedWidths, manualColumnWidths, orderedColumns]);

  /** ---------------- selection helpers ---------------- */

  const selectionEnabled = checkboxEnabled || Boolean(props.onSelectionChange);

  const getRowKey = React.useCallback(
    (row: any, index: number) => {
      const v = row?.[idProperty];
      return v == null ? String(index) : String(v);
    },
    [idProperty],
  );

  const handleRowClick = React.useCallback(
    (rowId: string, rowData: any, e: React.MouseEvent) => {
      if (!selectionEnabled) return;
      if (checkboxOnlyRowSelect) return;
      if (isInteractiveClickTarget(e.target as any)) return;

      const next = { ...selectedMap };

      if (multiSelect) {
        if (next[rowId]) delete next[rowId];
        else next[rowId] = rowData;
      } else {
        Object.keys(next).forEach((k) => delete next[k]);
        next[rowId] = rowData;
      }

      emitSelectionChange(next, { data: rowData });
    },
    [checkboxOnlyRowSelect, emitSelectionChange, multiSelect, selectedMap, selectionEnabled],
  );

  /** ---------------- filter operator menu state ---------------- */

  const [openFilterMenuColId, setOpenFilterMenuColId] = React.useState<string | null>(null);

  /** ---------------- columnDefs (TanStack) ---------------- */

  const columnDefs = React.useMemo<ColumnDef<any, any>[]>(() => {
    return orderedColumns.map((c) => {
      const colId = getColumnId(c);

      if (checkboxEnabled && colId === checkboxColId) {
        const cfg = typeof checkboxColumnProp === "object" ? checkboxColumnProp : undefined;
        const renderCheckbox = (cfg as any)?.renderCheckbox as
          | ((props: TypeCheckboxProps, ctx: any) => React.ReactNode)
          | undefined;

        return {
          id: colId,
          accessorFn: () => null,
          enableSorting: false,

          header: () => {
            const pageRowIds = rows.map((r, idx) => getRowKey(r, idx));
            const selectedOnPage = pageRowIds.reduce((acc, id) => acc + (selectedMap[id] ? 1 : 0), 0);
            const allSelected = pageRowIds.length > 0 && selectedOnPage === pageRowIds.length;
            const someSelected = selectedOnPage > 0 && !allSelected;

            const onChange = (checked: boolean) => {
              if (!multiSelect) {
                const next: Record<string, any> = {};
                if (checked && rows[0]) next[getRowKey(rows[0], 0)] = rows[0];
                emitSelectionChange(next, { data: rows[0] });
                return;
              }

              const next = { ...selectedMap };
              if (checked) {
                rows.forEach((r, idx) => {
                  next[getRowKey(r, idx)] = r;
                });
              } else {
                rows.forEach((r, idx) => {
                  delete next[getRowKey(r, idx)];
                });
              }
              emitSelectionChange(next, { data: rows });
            };

            const checkboxProps: TypeCheckboxProps = {
              checked: allSelected,
              indeterminate: someSelected,
              disabled: rows.length === 0,
              onChange,
            };

            const node = renderCheckbox
              ? renderCheckbox(checkboxProps, { headerCell: true, data: rows })
              : (
                  <Checkbox
                    checked={checkboxProps.indeterminate ? "indeterminate" : checkboxProps.checked}
                    disabled={checkboxProps.disabled}
                    onCheckedChange={(v) => checkboxProps.onChange(v === true, v)}
                    onClick={(e) => e.stopPropagation()}
                  />
                );

            return (
              <div
                className="flex items-center justify-center"
                onMouseDown={(e) => {
                  lastPointerRef.current.shiftKey = (e as any).shiftKey === true;
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {node}
              </div>
            );
          },

          cell: (ctx) => {
            const rowData = ctx.row.original;
            const rowIndex = ctx.row.index;
            const rowId = ctx.row.id;

            const isSelected = Boolean(selectedMap[rowId]);

            const onChange = (checked: boolean) => {
              if (!selectionEnabled) return;

              const shiftKey = checkboxSelectEnableShiftKey && lastPointerRef.current.shiftKey === true;
              const next = { ...selectedMap };

              const rowModel = ctx.table.getRowModel().rows;

              if (shiftKey && multiSelect && lastSelectedIndexRef.current != null) {
                const from = Math.min(lastSelectedIndexRef.current, rowIndex);
                const to = Math.max(lastSelectedIndexRef.current, rowIndex);

                for (let i = from; i <= to; i++) {
                  const r = rowModel[i];
                  if (!r) continue;
                  if (checked) next[r.id] = r.original;
                  else delete next[r.id];
                }
              } else {
                if (checked) {
                  if (!multiSelect) {
                    Object.keys(next).forEach((k) => delete next[k]);
                  }
                  next[rowId] = rowData;
                } else {
                  delete next[rowId];
                }
              }

              lastSelectedIndexRef.current = rowIndex;
              emitSelectionChange(next, { data: rowData });
            };

            const checkboxProps: TypeCheckboxProps = {
              checked: isSelected,
              disabled: false,
              onChange,
            };

            const node = renderCheckbox
              ? renderCheckbox(checkboxProps, { headerCell: false, data: rowData, rowIndex })
              : (
                  <Checkbox
                    checked={checkboxProps.checked}
                    disabled={checkboxProps.disabled}
                    onCheckedChange={(v) => checkboxProps.onChange(v === true, v)}
                    onClick={(e) => e.stopPropagation()}
                  />
                );

            return (
              <div
                className="flex items-center justify-center"
                onMouseDown={(e) => {
                  lastPointerRef.current.shiftKey = (e as any).shiftKey === true;
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {node}
              </div>
            );
          },

          meta: { __column: c },
        } satisfies ColumnDef<any, any>;
      }

      return {
        id: colId,
        accessorFn: (row) => (row as any)?.[colId],
        enableSorting: c.sortable ?? true,

        header: () => (c as any).renderHeader?.({ column: c, columnId: colId }) ?? c.header ?? c.name ?? c.id ?? colId,

        cell: (ctx) => {
          const value = ctx.getValue();
          const rowData = ctx.row.original;
          const rowIndex = ctx.row.index;

          if (c.render) {
            const cellProps = {
              column: c,
              columnId: colId,
              rowIndex,
              dateFormat: (c as any).dateFormat,
              ...(typeof (c as any).cellProps === "object" ? (c as any).cellProps : {}),
            };

            if (c.render.length <= 1) {
              return c.render({
                value,
                data: rowData,
                rowIndex,
                column: c,
                columnId: colId,
                cellProps,
              } as any);
            }

            return c.render(value, { data: rowData, rowIndex, column: c, columnId: colId });
          }

          return value == null ? "" : String(value);
        },

        meta: { __column: c },
      } satisfies ColumnDef<any, any>;
    });
  }, [
    checkboxColId,
    checkboxColumnProp,
    checkboxEnabled,
    emitSelectionChange,
    getRowKey,
    multiSelect,
    orderedColumns,
    rows,
    selectedMap,
    selectionEnabled,
    checkboxSelectEnableShiftKey,
  ]);

  const table = useReactTable({
    data: rows,
    columns: columnDefs,
    state: { sorting: tanstackSorting },
    manualSorting: true,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row, index) => {
      const v = (row as any)?.[idProperty];
      return v == null ? String(index) : String(v);
    },
  });

  /** ---------------- virtualization ---------------- */

  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const headerScrollRef = React.useRef<HTMLDivElement | null>(null);
  const rowModel = table.getRowModel().rows;

  const rowVirtualizer = useVirtualizer({
    count: rowModel.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => rowHeight,
    overscan: 10,
    enabled: virtualized,
  });

  const virtualItems = virtualized ? rowVirtualizer.getVirtualItems() : [];
  const paddingTop = virtualized && virtualItems.length ? virtualItems[0]!.start : 0;
  const paddingBottom =
    virtualized && virtualItems.length
      ? Math.max(0, rowVirtualizer.getTotalSize() - virtualItems[virtualItems.length - 1]!.end)
      : 0;

  React.useEffect(() => {
    const bodyViewport = scrollRef.current;
    const headerViewport = headerScrollRef.current;
    if (!bodyViewport || !headerViewport) return;

    const syncHeaderScroll = () => {
      headerViewport.scrollLeft = bodyViewport.scrollLeft;
    };

    syncHeaderScroll();
    bodyViewport.addEventListener("scroll", syncHeaderScroll, { passive: true });

    return () => {
      bodyViewport.removeEventListener("scroll", syncHeaderScroll);
    };
  }, []);

  /** ---------------- imperative API ---------------- */

  const apiRef = React.useRef<TypeComputedProps | null>(null);

  React.useEffect(() => {
    apiRef.current = {
      reload: () => void loadData(),

      getData: () => rows,
      getCount: () => count,

      getSkip: () => skip,
      getLimit: () => limit,
      setSkip: (next) => setSkip(next),
      setLimit: (next) => {
        setSkip(0);
        setLimit(next);
      },

      getSortInfo: () => sortInfo,
      setSortInfo: (next) => {
        setSkip(0);
        setSortInfo(next);
      },

      getFilterValue: () => filterValue,
      setFilterValue: (next) => {
        setSkip(0);
        setFilterValue(next);
      },

      getColumnOrder: () => columnOrderForDs,
      setColumnOrder: (next) => {
        const internalNext = checkboxEnabled ? injectIntoOrder(next, checkboxColId) ?? next : next;
        setColumnOrder(internalNext);
      },
    };

    props.handle?.(apiRef);
    props.onReady?.(apiRef);
  }, [
    checkboxColId,
    checkboxEnabled,
    columnOrderForDs,
    count,
    filterValue,
    limit,
    loadData,
    props,
    rows,
    setColumnOrder,
    setFilterValue,
    setLimit,
    setSkip,
    setSortInfo,
    skip,
    sortInfo,
  ]);

  /** ---------------- pagination derived ---------------- */

  const safeLimit = Math.max(1, limit);
  const pageIndex = Math.floor(skip / safeLimit);
  const pageCount = Math.max(1, Math.ceil(count / safeLimit) || 1);

  const canPrev = skip > 0;
  const canNext = skip + safeLimit < count;

  const userSelectClass = coerceUserSelect(columnUserSelect) === "none" ? "select-none" : "select-text";
  const tableMinWidth = React.useMemo(() => {
    if (orderedColumns.length === 0) return undefined;

    return orderedColumns.reduce((sum, column) => {
      const columnId = getColumnId(column);
      const explicitWidth = columnWidths[columnId] ?? column.width ?? column.defaultWidth ?? column.minWidth ?? 120;
      return sum + explicitWidth;
    }, 0);
  }, [columnWidths, orderedColumns]);
  const sharedTableStyle = tableMinWidth ? { width: `${tableMinWidth}px` } : undefined;
  const columnLayout = React.useMemo(
    () =>
      orderedColumns.map((column) => {
        const columnId = getColumnId(column);
        const explicitWidth = columnWidths[columnId] ?? column.width ?? column.defaultWidth ?? column.minWidth ?? 120;

        return {
          id: columnId,
          width: explicitWidth,
          minWidth: column.minWidth,
          maxWidth: column.maxWidth,
        };
      }),
    [columnWidths, orderedColumns],
  );

  const [resizeProxyLeft, setResizeProxyLeft] = React.useState<number | null>(null);
  const [resizingColumnId, setResizingColumnId] = React.useState<string | null>(null);
  const resizeSessionRef = React.useRef<{
    columnId: string;
    startX: number;
    startWidth: number;
    columnLeft: number;
    minWidth: number;
    maxWidth: number;
  } | null>(null);
  const resizeCleanupRef = React.useRef<(() => void) | null>(null);

  const captureRenderedColumnWidths = React.useCallback(() => {
    const headerCells = Array.from(headerScrollRef.current?.querySelectorAll<HTMLElement>(".tdg-header-cell") ?? []);
    if (headerCells.length === 0) return null;

    const next: Record<string, number> = {};

    for (const [index, column] of orderedColumns.entries()) {
      const headerCell = headerCells[index];
      if (!headerCell) continue;

      const columnId = getColumnId(column);
      const { minWidth, maxWidth } = getColumnWidthBounds(column);
      next[columnId] = clamp(Math.round(headerCell.getBoundingClientRect().width), minWidth, maxWidth);
    }

    return Object.keys(next).length > 0 ? next : null;
  }, [orderedColumns]);

  const seedManualColumnWidthsFromDom = React.useCallback(() => {
    if (hasManualColumnWidths) return null;

    const measuredWidths = captureRenderedColumnWidths();
    if (!measuredWidths) return null;

    setManualColumnWidths((current) => {
      if (Object.keys(current).length > 0) {
        return current;
      }

      return measuredWidths;
    });

    return measuredWidths;
  }, [captureRenderedColumnWidths, hasManualColumnWidths]);

  const setManualColumnWidth = React.useCallback((columnId: string, nextWidth: number) => {
    setManualColumnWidths((current) => {
      if (current[columnId] === nextWidth) {
        return current;
      }

      return {
        ...current,
        [columnId]: nextWidth,
      };
    });
  }, []);

  const autosizeColumn = React.useCallback(
    (columnId: string) => {
      const column = orderedColumns.find((candidate) => getColumnId(candidate) === columnId);
      if (!column) return;

      const seededWidths = seedManualColumnWidthsFromDom();

      const nextWidth = estimateColumnContentWidth({
        column,
        rows: autosizeSample,
        skipHeaderOnAutoSize,
      });

      setManualColumnWidths((current) => {
        const base = Object.keys(current).length > 0 ? current : seededWidths ?? current;

        if (base[columnId] === nextWidth) {
          return base;
        }

        return {
          ...base,
          [columnId]: nextWidth,
        };
      });
    },
    [autosizeSample, orderedColumns, seedManualColumnWidthsFromDom, skipHeaderOnAutoSize],
  );

  const stopColumnResize = React.useCallback(() => {
    resizeCleanupRef.current?.();
    resizeCleanupRef.current = null;
    resizeSessionRef.current = null;
    setResizeProxyLeft(null);
    setResizingColumnId(null);
  }, []);

  const startColumnResize = React.useCallback(
    (event: React.MouseEvent<HTMLElement>, columnId: string) => {
      event.preventDefault();
      event.stopPropagation();

      const column = orderedColumns.find((candidate) => getColumnId(candidate) === columnId);
      const surfaceElement = surfaceRef.current;
      const headerCell = event.currentTarget.closest("th");

      if (!column || !surfaceElement || !(headerCell instanceof HTMLTableCellElement)) {
        return;
      }

      const surfaceRect = surfaceElement.getBoundingClientRect();
      const headerRect = headerCell.getBoundingClientRect();
      const seededWidths = seedManualColumnWidthsFromDom();
      const startWidth = seededWidths?.[columnId] ?? Math.round(headerRect.width);
      const { minWidth, maxWidth } = getColumnWidthBounds(column);
      const columnLeft = headerRect.left - surfaceRect.left;
      const previousDraggable = headerCell.draggable;

      headerCell.draggable = false;

      resizeSessionRef.current = {
        columnId,
        startX: event.clientX,
        startWidth,
        columnLeft,
        minWidth,
        maxWidth,
      };

      resizeCleanupRef.current?.();

      const previousCursor = document.body.style.cursor;
      const previousUserSelect = document.body.style.userSelect;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const activeSession = resizeSessionRef.current;
        if (!activeSession) return;

        const nextWidth = clamp(
          activeSession.startWidth + (moveEvent.clientX - activeSession.startX),
          activeSession.minWidth,
          activeSession.maxWidth,
        );

        setManualColumnWidth(activeSession.columnId, nextWidth);
        setResizeProxyLeft(activeSession.columnLeft + nextWidth);
      };

      const handleMouseUp = () => {
        stopColumnResize();
      };

      resizeCleanupRef.current = () => {
        headerCell.draggable = previousDraggable;
        document.body.style.cursor = previousCursor;
        document.body.style.userSelect = previousUserSelect;
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      setResizingColumnId(columnId);
      setResizeProxyLeft(columnLeft + startWidth);
    },
    [orderedColumns, seedManualColumnWidthsFromDom, setManualColumnWidth, stopColumnResize],
  );

  React.useEffect(() => {
    return () => {
      resizeCleanupRef.current?.();
    };
  }, []);

  /** ---------------- header drag/drop reorder ---------------- */

  const dragIdRef = React.useRef<string | null>(null);

  const allowColumnReorder = ((props as any).reorderColumns ?? true) && Boolean(props.onColumnOrderChange);

  function onHeaderDragStart(e: React.DragEvent, columnId: string) {
    if (!allowColumnReorder) return;
    if (checkboxEnabled && columnId === checkboxColId) return;

    dragIdRef.current = columnId;
    try {
      e.dataTransfer.setData("text/plain", columnId);
    } catch {
      // Some environments reject custom drag payloads; column reordering still works.
    }
    e.dataTransfer.effectAllowed = "move";
  }

  function onHeaderDrop(e: React.DragEvent, targetId: string) {
    if (!allowColumnReorder) return;
    if (checkboxEnabled && (targetId === checkboxColId || dragIdRef.current === checkboxColId)) return;

    e.preventDefault();
    const sourceId = dragIdRef.current ?? e.dataTransfer.getData("text/plain");
    dragIdRef.current = null;
    if (!sourceId || sourceId === targetId) return;

    const next = [...effectiveColumnOrder];
    const from = next.indexOf(sourceId);
    const to = next.indexOf(targetId);
    if (from < 0 || to < 0) return;

    next.splice(from, 1);
    next.splice(to, 0, sourceId);
    setColumnOrder(next);
  }

  function onHeaderDragOver(e: React.DragEvent) {
    if (!allowColumnReorder) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  /** ---------------- render ---------------- */

  return (
    <div
      ref={setPortalContainer}
      className={cn(
        "tdg-root InovuaReactDataGrid flex flex-col gap-2 rounded-lg lg:gap-6",
        `tdg-theme-${themeClassSuffix}`,
        `InovuaReactDataGrid--theme-${themeClassSuffix}`,
        "InovuaReactDataGrid--direction-ltr InovuaReactDataGrid--show-hover-rows",
        themeBase === "dark" ? "dark" : "",
        showVerticalCellBorders ? "InovuaReactDataGrid--show-border-right" : "",
        enableFiltering ? "InovuaReactDataGrid--filterable" : "",
        className,
      )}
      data-theme={themeName}
      data-theme-base={themeBase}
      data-column-resizing={resizingColumnId ? "true" : "false"}
      data-column-width-mode={hasManualColumnWidths ? "fixed" : "stretch"}
    >
      <DatagridThemeProvider
        theme={themeName}
        themeBase={themeBase}
        portalContainer={portalContainer}
      >
        <div className="tdg-frame overflow-hidden rounded-lg" data-slot="grid-frame">
          <div
            ref={surfaceRef}
            className="tdg-surface relative bg-[var(--tdg-grid-bg)] text-foreground"
            data-slot="grid-surface"
            style={style}
          >
            {resizeProxyLeft != null ? (
              <div
                className="InovuaReactDataGrid__resize-proxy"
                aria-hidden="true"
                style={{ left: `${resizeProxyLeft}px` }}
              />
            ) : null}
            <div
              ref={headerScrollRef}
              className="tdg-header-viewport overflow-hidden"
              data-slot="grid-header-viewport"
            >
              <table
                className="tdg-table tdg-header-table !table w-full table-fixed border-separate border-spacing-0 caption-bottom text-sm"
                style={sharedTableStyle}
              >
                <colgroup>
                  {columnLayout.map((column) => (
                    <col
                      key={column.id}
                      style={{
                        width: column.width,
                        minWidth: column.minWidth,
                        maxWidth: column.maxWidth,
                      }}
                    />
                  ))}
                </colgroup>
                <GridHeader
                  headerGroups={table.getHeaderGroups()}
                  headerHeight={headerHeight}
                  filterRowHeight={filterRowHeight}
                  columnWidths={columnWidths}
                  sortInfo={sortInfo}
                  setSortInfo={setSortInfo}
                  setSkip={setSkip}
                  allowUnsort={allowUnsort}
                  defaultSortDir={defaultSortDir}
                  showColumnMenuTool={showColumnMenuTool}
                  showHorizontalCellBorders={showHorizontalCellBorders}
                  showVerticalCellBorders={showVerticalCellBorders}
                  i18n={i18n}
                  allowColumnReorder={allowColumnReorder}
                  allowColumnResize={resizable}
                  checkboxEnabled={checkboxEnabled}
                  checkboxColId={checkboxColId}
                  onHeaderDragStart={onHeaderDragStart}
                  onHeaderDragOver={onHeaderDragOver}
                  onHeaderDrop={onHeaderDrop}
                  resizingColumnId={resizingColumnId}
                  onColumnResizeStart={startColumnResize}
                  onColumnAutoResize={autosizeColumn}
                  enableFiltering={enableFiltering}
                  enableColumnFilterContextMenu={enableColumnFilterContextMenu}
                  filterControlled={filterControlled}
                  filterValue={filterValue}
                  draftFilterValue={draftFilterValue}
                  setFilterValue={setFilterValue}
                  setDraftFilterValue={setDraftFilterValue}
                  filterTypes={filterTypes}
                  openFilterMenuColId={openFilterMenuColId}
                  setOpenFilterMenuColId={setOpenFilterMenuColId}
                />
              </table>
            </div>

            <ScrollArea
              className="tdg-scroll-area rounded-b-[inherit]"
              viewportRef={scrollRef}
              viewportClassName={cn(
                "tdg-body-viewport relative bg-[var(--tdg-grid-bg)] text-foreground",
                virtualized ? "h-[560px]" : "",
              )}
            >
              <table
                className="tdg-table tdg-body-table !table w-full table-fixed border-separate border-spacing-0 caption-bottom text-sm"
                style={sharedTableStyle}
              >
                <colgroup>
                  {columnLayout.map((column) => (
                    <col
                      key={column.id}
                      style={{
                        width: column.width,
                        minWidth: column.minWidth,
                        maxWidth: column.maxWidth,
                      }}
                    />
                  ))}
                </colgroup>
                <GridBody
                  rowModel={rowModel}
                  orderedColumns={orderedColumns}
                  columnWidths={columnWidths}
                  userSelectClass={userSelectClass}
                  showHorizontalCellBorders={showHorizontalCellBorders}
                  showVerticalCellBorders={showVerticalCellBorders}
                  virtualized={virtualized}
                  virtualItems={virtualItems}
                  paddingTop={paddingTop}
                  paddingBottom={paddingBottom}
                  loading={loading}
                  i18n={i18n}
                  selectedMap={selectedMap}
                  onRowClick={(id, data, e) => handleRowClick(id, data, e)}
                />
              </table>
            </ScrollArea>
          </div>

          {paginationEnabled ? (
            <div className="tdg-pagination-shell border-t py-2 [border-color:var(--tdg-grid-border-color)]">
              <GridPagination
                count={count}
                skip={skip}
                limit={limit}
                pageIndex={pageIndex}
                pageCount={pageCount}
                canPrev={canPrev}
                canNext={canNext}
                pageSizes={pageSizes}
                setSkip={setSkip}
                setLimit={setLimit}
                i18n={i18n}
              />
            </div>
          ) : null}
        </div>
      </DatagridThemeProvider>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Inovua-compat: expose default filterTypes via ReactDataGrid.defaultProps.filterTypes
// so apps can extend defaults like:
// Object.assign({}, ReactDataGrid.defaultProps.filterTypes, { myCustomType: ... })
// -----------------------------------------------------------------------------
(ReactDataGrid as any).defaultProps = {
  ...(ReactDataGrid as any).defaultProps,
  filterTypes: DEFAULT_FILTER_TYPES,
};

export { ReactDataGrid };
export default ReactDataGrid;
