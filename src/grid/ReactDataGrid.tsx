"use client";

import * as React from "react";
import type {
  TypeCheckboxColumn,
  TypeCheckboxProps,
  TypeColumn,
  TypeComputedColumn,
  TypeComputedColumnsMap,
  TypeComputedProps,
  TypeComputedVirtualList,
  TypeComputedVirtualListRow,
  TypeDataGridProps,
  TypeGetColumnByParam,
  TypeSingleFilterValue,
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

import { getColumnId, getColumnSortName } from "../utils/column";
import {
  clamp,
  coerceUserSelect,
  estimateAutoWidth,
  t,
} from "../utils/helpers";
import { useControllableState } from "../hooks/useControllableState";
import { useMediaQuery } from "../hooks/useMediaQuery";

import {
  DEFAULT_FILTER_TYPES,
  applyLocalFilter,
  clearFilter,
  getFilterEntry,
  normalizeFilterValue,
  upsertFilterEntry,
} from "../filters/utils";
import {
  applyLocalSort,
  toTanstackSorting,
  toggleSortInfo,
} from "../sorting/utils";

import {
  injectIntoOrder,
  isColumnVisible,
  isInteractiveClickTarget,
  normalizeColumnOrder,
  stripFromOrder,
  toSelectionMap,
  unwrapSelectionState,
} from "./utils/gridUtils";

import { GridHeader } from "./components/GridHeader";
import { GridBody } from "./components/GridBody";
import { GridPagination } from "./components/GridPagination";
import { MobileGridList } from "./components/MobileGridList";
import {
  DATA_GRID_SEARCH_RUNTIME_SYMBOL,
  getDataGridSearchRuntime,
} from "./searchRuntime";

/**
 * Optional compat export: Inovua exports `plugins`. We export an empty list.
 */
export const plugins: readonly unknown[] = [] as const;

type ReactDataGridDefaultPropName =
  | "theme"
  | "enableColumnFilterContextMenu"
  | "enableColumnAutosize"
  | "skipHeaderOnAutoSize"
  | "resizable"
  | "enableFiltering"
  | "filterTypes"
  | "virtualized"
  | "allowMobileTransform"
  | "columnUserSelect"
  | "showCellBorders"
  | "showColumnMenuTool"
  | "rowHeight"
  | "headerHeight"
  | "filterRowHeight";

type ReactDataGridDefaultProps = Required<
  Pick<TypeDataGridProps, ReactDataGridDefaultPropName>
>;

const REACT_DATA_GRID_DEFAULT_PROPS: ReactDataGridDefaultProps = {
  theme: "default",
  enableColumnFilterContextMenu: false,
  enableColumnAutosize: true,
  skipHeaderOnAutoSize: false,
  resizable: true,
  enableFiltering: true,
  filterTypes: DEFAULT_FILTER_TYPES,
  virtualized: true,
  allowMobileTransform: false,
  columnUserSelect: true,
  showCellBorders: true,
  showColumnMenuTool: false,
  rowHeight: 44,
  headerHeight: 40,
  filterRowHeight: 44,
};

type ReactDataGridComponent = ((
  props: TypeDataGridProps
) => React.ReactElement) & {
  defaultProps: ReactDataGridDefaultProps;
};

type InternalSearchController = {
  value: string;
  filterRows: <Row>(rows: Row[], columns: TypeColumn[]) => Row[];
};

type InternalDataGridProps = TypeDataGridProps & {
  /** Injected by the optional search package; intentionally not public API. */
  __rdgSearchController?: InternalSearchController;
};

let publicSearchPropsCache:
  | WeakMap<InternalDataGridProps, InternalDataGridProps>
  | undefined;

function getPublicSearchProps(
  internalProps: InternalDataGridProps
): InternalDataGridProps {
  const cache =
    publicSearchPropsCache ??
    (publicSearchPropsCache = new WeakMap<
      InternalDataGridProps,
      InternalDataGridProps
    >());
  const cached = cache.get(internalProps);
  if (cached) return cached;

  const publicProps = { ...internalProps };
  delete publicProps.__rdgSearchController;
  cache.set(internalProps, publicProps);
  return publicProps;
}

let nextGridId = 1;

const COMPAT_METHOD_NAME_RE =
  /^(get|set|toggle|clear|show|hide|load|scroll|focus|blur|collapse|expand|add|remove|copy|paste|select|deselect|append|goto|try|is)/;

function resolveStateAction<T>(
  action: React.SetStateAction<T>,
  previous: T
): T {
  return typeof action === "function"
    ? (action as (prevState: T) => T)(previous)
    : action;
}

function resolveFilterTypeName(
  column: TypeColumn | undefined,
  entry?: TypeSingleFilterValue
): string {
  return (
    entry?.type ??
    column?.filterType ??
    (typeof (column as any)?.type === "string"
      ? ((column as any).type as string)
      : undefined) ??
    "string"
  );
}

function resolveDefaultFilterOperator(
  filterType: string,
  entry?: TypeSingleFilterValue
): string {
  if (entry?.operator) return entry.operator;
  if (filterType === "number") return "gte";
  if (filterType === "select") return "eq";
  if (filterType === "date" || filterType === "time") return "afterOrOn";
  return "contains";
}

function getColumnHeaderText(
  column: TypeColumn,
  skipHeaderOnAutoSize: boolean
): string {
  if (skipHeaderOnAutoSize) return "";
  if (typeof column.header === "string") return column.header;
  if (typeof column.name === "string") return column.name;
  if (typeof column.id === "string") return column.id;
  return "";
}

function getKnownTextColumnHeader(column: TypeColumn): string {
  if (
    typeof (column as { renderHeader?: unknown }).renderHeader === "function"
  ) {
    return "";
  }
  if (typeof column.header === "string") return column.header;
  if (column.header != null) return "";
  if (typeof column.name === "string") return column.name;
  if (typeof column.id === "string") return column.id;
  return "";
}

function getColumnWidthBounds(column: TypeColumn): {
  minWidth: number;
  maxWidth: number;
} {
  const minWidth =
    typeof column.minWidth === "number" &&
    Number.isFinite(column.minWidth) &&
    column.minWidth > 0
      ? column.minWidth
      : 60;
  const maxWidth =
    typeof column.maxWidth === "number" &&
    Number.isFinite(column.maxWidth) &&
    column.maxWidth >= minWidth
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

  if (
    typeof explicit === "number" &&
    Number.isFinite(explicit) &&
    explicit > 0
  ) {
    return clamp(explicit, minWidth, maxWidth);
  }

  if (enableColumnAutosize) {
    return estimateColumnContentWidth({ column, rows, skipHeaderOnAutoSize });
  }

  return clamp(column.minWidth ?? 120, minWidth, maxWidth);
}

function ensureLastColumnHeaderFits(args: {
  column: TypeColumn;
  baseWidth: number;
  showColumnMenuTool: boolean;
}): number {
  const { column, baseWidth, showColumnMenuTool } = args;
  const header = getKnownTextColumnHeader(column);
  if (!header) return baseWidth;

  const { minWidth, maxWidth } = getColumnWidthBounds(column);
  const sortControlWidth = column.sortable === false ? 0 : 24;
  const menuControlWidth = showColumnMenuTool ? 36 : 0;
  const headerWidth =
    estimateAutoWidth({ header, values: [] }) +
    sortControlWidth +
    menuControlWidth;

  return clamp(Math.max(baseWidth, headerWidth), minWidth, maxWidth);
}

function ReactDataGrid(props: TypeDataGridProps) {
  const internalProps = props as InternalDataGridProps;
  const searchController = internalProps.__rdgSearchController;
  const searchConnected = searchController != null;
  // The optional search entry uses a private prop as its zero-dependency
  // bridge. Keep that bridge out of every consumer-facing props mirror.
  const publicProps: InternalDataGridProps = searchConnected
    ? getPublicSearchProps(internalProps)
    : internalProps;
  const searchValue = searchController?.value ?? "";
  const searchFilterRows = searchController?.filterRows;
  const searchActive = searchValue.trim().length > 0;
  const loadRequestIdRef = React.useRef(0);

  const {
    theme = REACT_DATA_GRID_DEFAULT_PROPS.theme,
    idProperty,
    columns: inputColumns,
    dataSource,

    enableColumnFilterContextMenu = REACT_DATA_GRID_DEFAULT_PROPS.enableColumnFilterContextMenu,

    enableColumnAutosize = REACT_DATA_GRID_DEFAULT_PROPS.enableColumnAutosize,
    skipHeaderOnAutoSize = REACT_DATA_GRID_DEFAULT_PROPS.skipHeaderOnAutoSize,
    resizable = REACT_DATA_GRID_DEFAULT_PROPS.resizable,

    enableFiltering = REACT_DATA_GRID_DEFAULT_PROPS.enableFiltering,

    filteredRowsCount,

    virtualized = REACT_DATA_GRID_DEFAULT_PROPS.virtualized,
    allowMobileTransform = REACT_DATA_GRID_DEFAULT_PROPS.allowMobileTransform,
    columnUserSelect = REACT_DATA_GRID_DEFAULT_PROPS.columnUserSelect,
    showCellBorders = REACT_DATA_GRID_DEFAULT_PROPS.showCellBorders,

    i18n,
    showColumnMenuTool = REACT_DATA_GRID_DEFAULT_PROPS.showColumnMenuTool,

    rowHeight = REACT_DATA_GRID_DEFAULT_PROPS.rowHeight,
    headerHeight = REACT_DATA_GRID_DEFAULT_PROPS.headerHeight,
    filterRowHeight = REACT_DATA_GRID_DEFAULT_PROPS.filterRowHeight,

    className,
    style,
  } = props;

  const filteredRowsCountRef = React.useRef(filteredRowsCount);
  const lastObservedFilteredRowsCountRef = React.useRef<number | undefined>(
    undefined
  );
  React.useLayoutEffect(() => {
    filteredRowsCountRef.current = filteredRowsCount;

    return () => {
      filteredRowsCountRef.current = undefined;
    };
  }, [filteredRowsCount]);
  const notifyFilteredRowsCount = React.useCallback((count: number) => {
    const previousCount = lastObservedFilteredRowsCountRef.current;
    lastObservedFilteredRowsCountRef.current = count;
    const callback = filteredRowsCountRef.current;
    if (!callback || Object.is(previousCount, count)) {
      return;
    }

    callback(count);
  }, []);

  const themeName = normalizeThemeName(theme);
  const isMobileViewport = useMediaQuery("(max-width: 1024px)");
  const mobileTransformActive = allowMobileTransform && isMobileViewport;
  const themeClassSuffix = toThemeClassSuffix(themeName);
  const themeBase = resolveThemeBase(themeName);
  const shouldUseLegacyThemeBridge =
    themeClassSuffix !== "default" &&
    themeClassSuffix !== "light" &&
    themeClassSuffix !== "dark";
  const gridIdRef = React.useRef<number>(nextGridId++);
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const [portalContainer, setPortalContainer] =
    React.useState<HTMLDivElement | null>(null);
  const attachRootRef = React.useCallback((node: HTMLDivElement | null) => {
    rootRef.current = node;
    setPortalContainer(node);
  }, []);
  const surfaceRef = React.useRef<HTMLDivElement | null>(null);
  const [showHeader, setShowHeader] = React.useState(true);
  const [enableFilteringState, setEnableFilteringState] =
    React.useState(enableFiltering);
  React.useEffect(() => {
    setEnableFilteringState(enableFiltering);
  }, [enableFiltering]);
  const effectiveEnableFiltering = enableFilteringState;
  const showHorizontalCellBorders =
    showCellBorders === true || showCellBorders === "horizontal";
  const showVerticalCellBorders =
    showCellBorders === true || showCellBorders === "vertical";

  useLegacyThemeBridge(
    portalContainer,
    themeClassSuffix,
    shouldUseLegacyThemeBridge
  );

  /** ---------------- selection / checkbox column ---------------- */

  const checkboxColumnProp: TypeCheckboxColumn | undefined =
    props.checkboxColumn;
  const checkboxEnabled = Boolean(checkboxColumnProp);

  const checkboxColId = React.useMemo(() => {
    if (!checkboxEnabled) return "__checkbox__";
    if (typeof checkboxColumnProp === "object") {
      return checkboxColumnProp.id ?? checkboxColumnProp.name ?? "__checkbox__";
    }
    return "__checkbox__";
  }, [checkboxEnabled, checkboxColumnProp]);

  const multiSelect = (props as any).multiSelect ?? checkboxEnabled;
  const checkboxOnlyRowSelect =
    (props as any).checkboxOnlyRowSelect ?? checkboxEnabled;
  const checkboxSelectEnableShiftKey =
    (props as any).checkboxSelectEnableShiftKey ?? false;

  const controlledSelected = props.selected !== undefined;
  const [internalSelected, setInternalSelected] =
    React.useState<TypeRowSelection>(() => {
      if (props.defaultSelected !== undefined) return props.defaultSelected;
      return multiSelect ? {} : null;
    });

  const selected: TypeRowSelection = controlledSelected
    ? (props.selected as TypeRowSelection)
    : internalSelected;
  const selectedMap = React.useMemo(() => toSelectionMap(selected), [selected]);

  const lastSelectedIndexRef = React.useRef<number | null>(null);
  const lastPointerRef = React.useRef<{ shiftKey: boolean }>({
    shiftKey: false,
  });

  const emitSelectionChange = React.useCallback(
    (
      nextMap: Record<string, any>,
      meta?: { data?: unknown; unselected?: TypeRowSelection }
    ) => {
      const nextSelected: TypeRowSelection = nextMap;

      if (!controlledSelected) setInternalSelected(nextSelected);

      props.onSelectionChange?.({
        selected: nextSelected,
        data: meta?.data,
        unselected: meta?.unselected,
        originalData: dataSource,
      });
    },
    [controlledSelected, dataSource, props]
  );

  /** ---------------- filter types ---------------- */

  const filterTypes = React.useMemo(() => {
    return { ...DEFAULT_FILTER_TYPES, ...(props.filterTypes ?? {}) };
  }, [props.filterTypes]);

  /** ---------------- columns / order ---------------- */

  const checkboxColumn: TypeColumn | null = React.useMemo(() => {
    if (!checkboxEnabled) return null;

    const hasAlready = inputColumns.some(
      (c) => getColumnId(c) === checkboxColId
    );
    if (hasAlready) return null;

    const cfg =
      typeof checkboxColumnProp === "object" ? checkboxColumnProp : undefined;
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
  const [columnVisibilityState, setColumnVisibilityState] = React.useState<
    Record<string, boolean>
  >({});
  React.useEffect(() => {
    setColumnVisibilityState((current) => {
      const nextEntries = Object.entries(current).filter(([columnId]) =>
        allInputColumns.some((column) => getColumnId(column) === columnId)
      );

      if (nextEntries.length === Object.keys(current).length) {
        return current;
      }

      return Object.fromEntries(nextEntries);
    });
  }, [allInputColumns]);
  const columnVisibilityMap = React.useMemo(() => {
    const next: Record<string, boolean> = {};

    for (const column of allInputColumns) {
      const columnId = getColumnId(column);
      next[columnId] =
        columnVisibilityState[columnId] ?? isColumnVisible(column);
    }

    return next;
  }, [allInputColumns, columnVisibilityState]);

  const defaultColumnOrder = React.useMemo(() => {
    const base = inputColumns.map((c) => getColumnId(c));
    return checkboxEnabled ? [checkboxColId, ...base] : base;
  }, [checkboxColId, checkboxEnabled, inputColumns]);

  const controlledColumnOrder = React.useMemo(
    () =>
      checkboxEnabled
        ? injectIntoOrder(props.columnOrder, checkboxColId)
        : props.columnOrder,
    [checkboxColId, checkboxEnabled, props.columnOrder]
  );

  const defaultInjectedColumnOrder = React.useMemo(
    () =>
      checkboxEnabled
        ? (injectIntoOrder(
            props.columnOrder ?? defaultColumnOrder,
            checkboxColId
          ) ?? defaultColumnOrder)
        : (props.columnOrder ?? defaultColumnOrder),
    [checkboxColId, checkboxEnabled, defaultColumnOrder, props.columnOrder]
  );

  const [columnOrder, setColumnOrder] = useControllableState<string[]>({
    value: controlledColumnOrder,
    defaultValue: defaultInjectedColumnOrder,
    onChange: (next) => {
      const userNext = checkboxEnabled
        ? stripFromOrder(next, checkboxColId)
        : next;
      props.onColumnOrderChange?.(userNext);
    },
  });
  const availableColumnIds = React.useMemo(
    () => allInputColumns.map((column) => getColumnId(column)),
    [allInputColumns]
  );
  const effectiveColumnOrder = React.useMemo(
    () => normalizeColumnOrder(columnOrder, availableColumnIds),
    [availableColumnIds, columnOrder]
  );

  const [sortInfo, setSortInfo] = useControllableState<TypeSortInfo>({
    value: props.sortInfo,
    defaultValue: props.defaultSortInfo ?? null,
    onChange: props.onSortInfoChange,
  });

  const [filterValue, setFilterValue, filterControlled] =
    useControllableState<TypeFilterValue>({
      value: props.filterValue,
      defaultValue: normalizeFilterValue(props.defaultFilterValue) ?? null,
      onChange: props.onFilterValueChange,
    });

  const [draftFilterValue, setDraftFilterValue] =
    React.useState<TypeFilterValue>(filterValue);
  React.useEffect(() => setDraftFilterValue(filterValue), [filterValue]);

  const pageSizes = React.useMemo(() => {
    const raw = props.pageSizes ?? [10, 50, 100, 1000];
    const unique = Array.from(new Set(raw)).filter(
      (n) => typeof n === "number" && Number.isFinite(n) && n > 0
    );
    return unique.length ? unique : [10, 50, 100, 1000];
  }, [props.pageSizes]);

  const [skip, setSkipState] = useControllableState<number>({
    value: props.skip,
    defaultValue: props.defaultSkip ?? 0,
    onChange: props.onSkipChange,
  });

  // Treat a committed global query like any other filter: start from page one.
  // Keep an override until a controlled parent acknowledges the reset (or
  // intentionally moves to another page), so loading-state renders cannot
  // bounce a remote request back to the stale controlled skip.
  const previousSearchValueRef = React.useRef("");
  const [searchSkipOverride, setSearchSkipOverride] = React.useState<{
    searchValue: string;
    previousSkip: number;
  } | null>(null);
  const searchValueChanged = previousSearchValueRef.current !== searchValue;
  const searchSkipOverrideActive = Boolean(
    searchSkipOverride?.searchValue === searchValue &&
    searchSkipOverride.previousSkip === skip
  );
  const loadSkip = searchValueChanged || searchSkipOverrideActive ? 0 : skip;
  const setSkip = React.useCallback(
    (nextSkip: number) => {
      if (nextSkip !== 0) setSearchSkipOverride(null);
      setSkipState(nextSkip);
    },
    [setSkipState]
  );
  React.useLayoutEffect(() => {
    if (previousSearchValueRef.current !== searchValue) {
      previousSearchValueRef.current = searchValue;
      loadRequestIdRef.current += 1;

      if (skip !== 0) {
        setSearchSkipOverride({ searchValue, previousSkip: skip });
        setSkipState(0);
      } else {
        setSearchSkipOverride(null);
      }
      return;
    }

    if (
      searchSkipOverride &&
      (searchSkipOverride.searchValue !== searchValue ||
        searchSkipOverride.previousSkip !== skip)
    ) {
      setSearchSkipOverride(null);
    }
  }, [searchSkipOverride, searchValue, setSkipState, skip]);

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

    return ordered.filter(
      (column) => columnVisibilityMap[getColumnId(column)] !== false
    );
  }, [allInputColumns, columnVisibilityMap, effectiveColumnOrder]);

  const tanstackSorting = React.useMemo(
    () => toTanstackSorting(sortInfo, orderedColumns),
    [sortInfo, orderedColumns]
  );

  /** ---------------- data loading ---------------- */

  const [rows, setRows] = React.useState<any[]>([]);
  const [count, setCount] = React.useState<number>(0);
  const [internalLoading, setInternalLoading] = React.useState(false);
  const [loadingOverride, setLoadingOverride] = React.useState<boolean | null>(
    null
  );
  const loadMountedRef = React.useRef(false);
  const loading = props.loading ?? loadingOverride ?? internalLoading;

  const computedFilterForFetch = filterValue;
  const computedSortForFetch = sortInfo;

  const columnsForDs = React.useMemo(() => {
    return checkboxEnabled
      ? orderedColumns.filter((c) => getColumnId(c) !== checkboxColId)
      : orderedColumns;
  }, [checkboxColId, checkboxEnabled, orderedColumns]);

  const columnOrderForDs = React.useMemo(() => {
    return checkboxEnabled
      ? stripFromOrder(effectiveColumnOrder, checkboxColId)
      : effectiveColumnOrder;
  }, [checkboxColId, checkboxEnabled, effectiveColumnOrder]);

  const loadData = React.useCallback(async () => {
    if (!loadMountedRef.current) return;

    const requestId = ++loadRequestIdRef.current;
    const remoteDataSource = !Array.isArray(dataSource);

    if (remoteDataSource) {
      setInternalLoading(true);
    } else {
      setInternalLoading(false);
    }

    try {
      if (Array.isArray(dataSource)) {
        let data = dataSource;

        if (searchActive && searchFilterRows) {
          data = searchFilterRows(data, inputColumns);
        }

        if (effectiveEnableFiltering && computedFilterForFetch) {
          data = applyLocalFilter(data, computedFilterForFetch, {
            filterTypes,
            columns: orderedColumns,
          });
        }
        if (computedSortForFetch) {
          data = applyLocalSort(data, computedSortForFetch, orderedColumns);
        }

        const totalCount = data.length;

        const doPage = paginationMode !== false && paginationMode !== "remote";

        const sliced = doPage ? data.slice(loadSkip, loadSkip + limit) : data;

        setRows(sliced);
        setCount(totalCount);
        notifyFilteredRowsCount(totalCount);
        return;
      }

      const ds = dataSource;

      const dsIsFn = typeof ds === "function";
      const sliceLocally =
        paginationMode !== false && (paginationMode === "local" || !dsIsFn);

      const dsArg = {
        ...(paginationMode !== false && paginationMode !== "local" && dsIsFn
          ? { skip: loadSkip, limit }
          : {}),
        sortInfo: computedSortForFetch,
        filterValue: computedFilterForFetch,
        columnOrder: columnOrderForDs,
        columns: columnsForDs,
        idProperty,
        theme: themeName,
        ...(searchConnected ? { searchValue } : {}),
      };

      let result: any;

      try {
        result = dsIsFn ? ds(dsArg) : ds;

        if (result && typeof result.then === "function") {
          result = await result;
        }
      } catch {
        // Remote data-source failures have no public error callback. Preserve
        // the last committed rows and contain the rejected request here.
        return;
      }

      if (!loadMountedRef.current || requestId !== loadRequestIdRef.current) {
        return;
      }

      if (result && typeof result === "object" && Array.isArray(result.data)) {
        // Functions own remote search and return an authoritative count. A
        // static Promise cannot receive args, so search its resolved payload as
        // a local snapshot before count and pagination are derived.
        const resultData =
          !dsIsFn && searchActive && searchFilterRows
            ? searchFilterRows(result.data, inputColumns)
            : result.data;
        const reportedCount = Number(
          !dsIsFn && searchActive
            ? resultData.length
            : (result.count ?? resultData.length)
        );
        const totalCount = Number.isFinite(reportedCount)
          ? reportedCount
          : resultData.length;
        const nextRows = sliceLocally
          ? resultData.slice(loadSkip, loadSkip + limit)
          : resultData;

        setRows(nextRows);
        setCount(totalCount);
        notifyFilteredRowsCount(totalCount);
      } else if (Array.isArray(result)) {
        const resultData =
          !dsIsFn && searchActive && searchFilterRows
            ? searchFilterRows(result, inputColumns)
            : result;
        const totalCount = resultData.length;
        const nextRows = sliceLocally
          ? resultData.slice(loadSkip, loadSkip + limit)
          : resultData;

        setRows(nextRows);
        setCount(totalCount);
        notifyFilteredRowsCount(totalCount);
      } else {
        setRows([]);
        setCount(0);
        notifyFilteredRowsCount(0);
      }
    } finally {
      if (
        remoteDataSource &&
        loadMountedRef.current &&
        requestId === loadRequestIdRef.current
      ) {
        setInternalLoading(false);
      }
    }
  }, [
    dataSource,
    effectiveEnableFiltering,
    computedFilterForFetch,
    computedSortForFetch,
    notifyFilteredRowsCount,
    idProperty,
    inputColumns,
    limit,
    loadSkip,
    orderedColumns,
    paginationMode,
    themeName,
    columnOrderForDs,
    columnsForDs,
    filterTypes,
    searchActive,
    searchConnected,
    searchFilterRows,
    searchValue,
  ]);

  React.useLayoutEffect(() => {
    loadMountedRef.current = true;

    return () => {
      loadMountedRef.current = false;
      loadRequestIdRef.current += 1;
    };
  }, []);

  React.useEffect(() => {
    void loadData();
  }, [loadData]);

  React.useEffect(() => {
    if (filterControlled || Object.is(draftFilterValue, filterValue)) return;

    const handle = window.setTimeout(() => {
      setFilterValue(draftFilterValue);
    }, 300);

    return () => window.clearTimeout(handle);
  }, [draftFilterValue, filterControlled, filterValue, setFilterValue]);

  const autosizeSample = React.useMemo(() => {
    if (Array.isArray(dataSource)) {
      // Search commits load rows in an effect. Reuse that processed result for
      // autosizing so a large index is never built synchronously during render
      // (and the same query is not scanned a second time).
      if (searchActive) {
        return rows.slice(0, 25);
      }

      let data = dataSource;

      if (effectiveEnableFiltering && computedFilterForFetch) {
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
    effectiveEnableFiltering,
    filterTypes,
    orderedColumns,
    rows,
    searchActive,
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
  }, [
    autosizeSample,
    enableColumnAutosize,
    orderedColumns,
    skipHeaderOnAutoSize,
  ]);

  const [manualColumnWidths, setManualColumnWidths] = React.useState<
    Record<string, number>
  >({});
  const hasManualColumnWidths = React.useMemo(
    () => Object.keys(manualColumnWidths).length > 0,
    [manualColumnWidths]
  );

  React.useEffect(() => {
    setManualColumnWidths((current) => {
      const nextEntries = orderedColumns.flatMap((column) => {
        const columnId = getColumnId(column);
        const currentWidth = current[columnId];

        if (
          typeof currentWidth !== "number" ||
          !Number.isFinite(currentWidth)
        ) {
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
    const lastColumnIndex = orderedColumns.length - 1;

    for (const [index, column] of orderedColumns.entries()) {
      const columnId = getColumnId(column);
      const baseWidth =
        manualColumnWidths[columnId] ?? autosizedWidths[columnId];

      next[columnId] =
        index === lastColumnIndex
          ? ensureLastColumnHeaderFits({
              column,
              baseWidth,
              showColumnMenuTool,
            })
          : baseWidth;
    }

    return next;
  }, [autosizedWidths, manualColumnWidths, orderedColumns, showColumnMenuTool]);

  /** ---------------- selection helpers ---------------- */

  const selectionEnabled = checkboxEnabled || Boolean(props.onSelectionChange);

  const getRowKey = React.useCallback(
    (row: any, index: number) => {
      const v = row?.[idProperty];
      return v == null ? String(index) : String(v);
    },
    [idProperty]
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
    [
      checkboxOnlyRowSelect,
      emitSelectionChange,
      multiSelect,
      selectedMap,
      selectionEnabled,
    ]
  );

  /** ---------------- filter operator menu state ---------------- */

  const [openFilterMenuColId, setOpenFilterMenuColId] = React.useState<
    string | null
  >(null);

  /** ---------------- columnDefs (TanStack) ---------------- */

  const columnDefs = React.useMemo<ColumnDef<any, any>[]>(() => {
    return orderedColumns.map((c) => {
      const colId = getColumnId(c);

      if (checkboxEnabled && colId === checkboxColId) {
        const cfg =
          typeof checkboxColumnProp === "object"
            ? checkboxColumnProp
            : undefined;
        const renderCheckbox = (cfg as any)?.renderCheckbox as
          | ((props: TypeCheckboxProps, ctx: any) => React.ReactNode)
          | undefined;

        return {
          id: colId,
          accessorFn: () => null,
          enableSorting: false,

          header: () => {
            const pageRowIds = rows.map((r, idx) => getRowKey(r, idx));
            const selectedOnPage = pageRowIds.reduce(
              (acc, id) => acc + (selectedMap[id] ? 1 : 0),
              0
            );
            const allSelected =
              pageRowIds.length > 0 && selectedOnPage === pageRowIds.length;
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

            const node = renderCheckbox ? (
              renderCheckbox(checkboxProps, { headerCell: true, data: rows })
            ) : (
              <Checkbox
                checked={
                  checkboxProps.indeterminate
                    ? "indeterminate"
                    : checkboxProps.checked
                }
                disabled={checkboxProps.disabled}
                onCheckedChange={(v) => checkboxProps.onChange(v === true, v)}
                onClick={(e) => e.stopPropagation()}
              />
            );

            return (
              <div
                className="tdg-checkbox-cell__content flex h-full w-full items-center justify-center"
                onMouseDown={(e) => {
                  lastPointerRef.current.shiftKey =
                    (e as any).shiftKey === true;
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

              const shiftKey =
                checkboxSelectEnableShiftKey &&
                lastPointerRef.current.shiftKey === true;
              const next = { ...selectedMap };

              const rowModel = ctx.table.getRowModel().rows;

              if (
                shiftKey &&
                multiSelect &&
                lastSelectedIndexRef.current != null
              ) {
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

            const node = renderCheckbox ? (
              renderCheckbox(checkboxProps, {
                headerCell: false,
                data: rowData,
                rowIndex,
              })
            ) : (
              <Checkbox
                checked={checkboxProps.checked}
                disabled={checkboxProps.disabled}
                onCheckedChange={(v) => checkboxProps.onChange(v === true, v)}
                onClick={(e) => e.stopPropagation()}
              />
            );

            return (
              <div
                className="tdg-checkbox-cell__content flex h-full w-full items-center justify-center"
                onMouseDown={(e) => {
                  lastPointerRef.current.shiftKey =
                    (e as any).shiftKey === true;
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

        header: () =>
          (c as any).renderHeader?.({ column: c, columnId: colId }) ??
          c.header ??
          c.name ??
          c.id ??
          colId,

        cell: (ctx) => {
          const value = ctx.getValue();
          const rowData = ctx.row.original;
          const rowIndex = ctx.row.index;

          if (c.render) {
            const renderCell = c.render as (
              valueOrCellProps: unknown,
              args?: {
                data: unknown;
                rowIndex: number;
                column: TypeColumn;
                columnId: string;
              }
            ) => React.ReactNode;
            const cellProps = {
              column: c,
              columnId: colId,
              rowIndex,
              dateFormat: (c as any).dateFormat,
              ...(typeof (c as any).cellProps === "object"
                ? (c as any).cellProps
                : {}),
            };

            if (c.render.length <= 1) {
              return renderCell({
                value,
                data: rowData,
                rowIndex,
                column: c,
                columnId: colId,
                cellProps,
              } as any);
            }

            return renderCell(value, {
              data: rowData,
              rowIndex,
              column: c,
              columnId: colId,
            });
          }

          return value == null ? (
            ""
          ) : (
            <span className="block min-w-0 max-w-full truncate">
              {String(value)}
            </span>
          );
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
  const headerGroupCount = table.getHeaderGroups().length;
  const stickyHeaderOffset =
    (showHeader ? headerGroupCount * headerHeight : 0) +
    (showHeader && effectiveEnableFiltering
      ? headerGroupCount * filterRowHeight
      : 0);

  const rowVirtualizer = useVirtualizer({
    count: rowModel.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => rowHeight,
    overscan: 10,
    scrollMargin: stickyHeaderOffset,
    // Seed a usable range before the desktop viewport observer reports its
    // size, including when returning from the unmounted mobile branch.
    initialRect: { width: 0, height: rowHeight * 10 },
    enabled: virtualized && !mobileTransformActive,
  });

  const virtualItems = virtualized ? rowVirtualizer.getVirtualItems() : [];
  const paddingTop =
    virtualized && virtualItems.length ? virtualItems[0]!.start : 0;
  const paddingBottom =
    virtualized && virtualItems.length
      ? Math.max(
          0,
          rowVirtualizer.getTotalSize() -
            virtualItems[virtualItems.length - 1]!.end
        )
      : 0;

  /** ---------------- pagination derived ---------------- */

  const safeLimit = Math.max(1, limit);
  const pageIndex = Math.floor(loadSkip / safeLimit);
  const pageCount = Math.max(1, Math.ceil(count / safeLimit) || 1);

  const canPrev = loadSkip > 0;
  const canNext = loadSkip + safeLimit < count;

  const userSelectClass =
    coerceUserSelect(columnUserSelect) === "none"
      ? "select-none"
      : "select-text";
  const tableMinWidth = React.useMemo(() => {
    if (orderedColumns.length === 0) return undefined;

    return orderedColumns.reduce((sum, column) => {
      const columnId = getColumnId(column);
      const explicitWidth =
        columnWidths[columnId] ??
        column.width ??
        column.defaultWidth ??
        column.minWidth ??
        120;
      return sum + explicitWidth;
    }, 0);
  }, [columnWidths, orderedColumns]);
  const sharedTableStyle = tableMinWidth
    ? { width: `${tableMinWidth}px` }
    : undefined;
  const columnLayout = React.useMemo(
    () =>
      orderedColumns.map((column) => {
        const columnId = getColumnId(column);
        const explicitWidth =
          columnWidths[columnId] ??
          column.width ??
          column.defaultWidth ??
          column.minWidth ??
          120;

        return {
          id: columnId,
          width: explicitWidth,
          minWidth: column.minWidth,
          maxWidth: column.maxWidth,
        };
      }),
    [columnWidths, orderedColumns]
  );

  const [resizeProxyLeft, setResizeProxyLeft] = React.useState<number | null>(
    null
  );
  const [resizingColumnId, setResizingColumnId] = React.useState<string | null>(
    null
  );
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
    const headerCells = Array.from(
      headerScrollRef.current?.querySelectorAll<HTMLElement>(
        ".tdg-header-cell"
      ) ?? []
    );
    if (headerCells.length === 0) return null;

    const next: Record<string, number> = {};

    for (const [index, column] of orderedColumns.entries()) {
      const headerCell = headerCells[index];
      if (!headerCell) continue;

      const columnId = getColumnId(column);
      const { minWidth, maxWidth } = getColumnWidthBounds(column);
      next[columnId] = clamp(
        Math.round(headerCell.getBoundingClientRect().width),
        minWidth,
        maxWidth
      );
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

  const setManualColumnWidth = React.useCallback(
    (columnId: string, nextWidth: number) => {
      setManualColumnWidths((current) => {
        if (current[columnId] === nextWidth) {
          return current;
        }

        return {
          ...current,
          [columnId]: nextWidth,
        };
      });
    },
    []
  );

  const autosizeColumn = React.useCallback(
    (columnId: string) => {
      const column = orderedColumns.find(
        (candidate) => getColumnId(candidate) === columnId
      );
      if (!column) return;

      const seededWidths = seedManualColumnWidthsFromDom();

      const nextWidth = estimateColumnContentWidth({
        column,
        rows: autosizeSample,
        skipHeaderOnAutoSize,
      });
      const bodyViewport = scrollRef.current;
      const restoreTrailingEdge = Boolean(
        getColumnId(orderedColumns[orderedColumns.length - 1]!) === columnId &&
        bodyViewport &&
        bodyViewport.scrollWidth -
          bodyViewport.clientWidth -
          bodyViewport.scrollLeft <=
          1
      );

      setManualColumnWidths((current) => {
        const base =
          Object.keys(current).length > 0 ? current : (seededWidths ?? current);

        if (base[columnId] === nextWidth) {
          return base;
        }

        return {
          ...base,
          [columnId]: nextWidth,
        };
      });

      if (restoreTrailingEdge && bodyViewport) {
        window.requestAnimationFrame(() => {
          bodyViewport.scrollLeft = bodyViewport.scrollWidth;
        });
      }
    },
    [
      autosizeSample,
      orderedColumns,
      seedManualColumnWidthsFromDom,
      skipHeaderOnAutoSize,
    ]
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

      const column = orderedColumns.find(
        (candidate) => getColumnId(candidate) === columnId
      );
      const surfaceElement = surfaceRef.current;
      const headerCell = event.currentTarget.closest("th");

      if (
        !column ||
        !surfaceElement ||
        !(headerCell instanceof HTMLTableCellElement)
      ) {
        return;
      }

      const surfaceRect = surfaceElement.getBoundingClientRect();
      const headerRect = headerCell.getBoundingClientRect();
      const seededWidths = seedManualColumnWidthsFromDom();
      const startWidth =
        seededWidths?.[columnId] ?? Math.round(headerRect.width);
      const columnLeft = headerRect.left - surfaceRect.left;
      const previousDraggable = headerCell.draggable;
      const bodyViewport = scrollRef.current;
      const isLastColumn =
        getColumnId(orderedColumns[orderedColumns.length - 1]!) === columnId;
      const columnWidthBounds = getColumnWidthBounds(column);
      const minWidth = isLastColumn
        ? ensureLastColumnHeaderFits({
            column,
            baseWidth: columnWidthBounds.minWidth,
            showColumnMenuTool,
          })
        : columnWidthBounds.minWidth;
      const { maxWidth } = columnWidthBounds;
      const restoreTrailingEdge = Boolean(
        isLastColumn &&
        bodyViewport &&
        bodyViewport.scrollWidth -
          bodyViewport.clientWidth -
          bodyViewport.scrollLeft <=
          1
      );

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
          activeSession.maxWidth
        );

        setManualColumnWidth(activeSession.columnId, nextWidth);
        setResizeProxyLeft(activeSession.columnLeft + nextWidth);
      };

      const handleMouseUp = () => {
        stopColumnResize();

        if (restoreTrailingEdge && bodyViewport) {
          window.requestAnimationFrame(() => {
            bodyViewport.scrollLeft = bodyViewport.scrollWidth;
          });
        }
      };
      const handleWindowBlur = () => {
        stopColumnResize();
      };

      resizeCleanupRef.current = () => {
        headerCell.draggable = previousDraggable;
        document.body.style.cursor = previousCursor;
        document.body.style.userSelect = previousUserSelect;
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
        window.removeEventListener("blur", handleWindowBlur);
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("blur", handleWindowBlur);
      setResizingColumnId(columnId);
      setResizeProxyLeft(columnLeft + startWidth);
    },
    [
      orderedColumns,
      seedManualColumnWidthsFromDom,
      setManualColumnWidth,
      showColumnMenuTool,
      stopColumnResize,
    ]
  );

  React.useLayoutEffect(() => {
    return () => {
      resizeCleanupRef.current?.();
    };
  }, []);

  React.useEffect(() => {
    if (!resizingColumnId) return;

    const resizingColumnExists = orderedColumns.some(
      (column) => getColumnId(column) === resizingColumnId
    );

    if (
      mobileTransformActive ||
      !resizable ||
      !showHeader ||
      !resizingColumnExists
    ) {
      stopColumnResize();
    }
  }, [
    mobileTransformActive,
    orderedColumns,
    resizable,
    resizingColumnId,
    showHeader,
    stopColumnResize,
  ]);

  /** ---------------- header drag/drop reorder ---------------- */

  const dragIdRef = React.useRef<string | null>(null);

  const allowColumnReorder =
    ((props as any).reorderColumns ?? true) &&
    Boolean(props.onColumnOrderChange);

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
    if (
      checkboxEnabled &&
      (targetId === checkboxColId || dragIdRef.current === checkboxColId)
    )
      return;

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

  /** ---------------- imperative API / compat surface ---------------- */

  const apiRef = React.useRef<TypeComputedProps | null>(null);
  const [stableApiTarget] = React.useState<TypeComputedProps>(
    () => ({}) as TypeComputedProps
  );
  const [stableApi] = React.useState<TypeComputedProps>(
    () =>
      new Proxy(stableApiTarget, {
        get(target, property, receiver) {
          if (Reflect.has(target, property)) {
            return Reflect.get(target, property, receiver);
          }

          if (
            typeof property === "string" &&
            COMPAT_METHOD_NAME_RE.test(property)
          ) {
            return () => undefined;
          }

          return undefined;
        },
      })
  );
  const onReadyRef = React.useRef(props.onReady);
  const handleRef = React.useRef(props.handle);
  const onReadyNotifiedRef = React.useRef(false);
  const handleNotifiedRef = React.useRef(false);

  React.useLayoutEffect(() => {
    onReadyRef.current = props.onReady;
    handleRef.current = props.handle;

    return () => {
      onReadyRef.current = undefined;
      handleRef.current = undefined;
    };
  }, [props.handle, props.onReady]);

  React.useLayoutEffect(() => {
    return () => {
      apiRef.current = null;

      for (const property of Reflect.ownKeys(stableApiTarget)) {
        Reflect.deleteProperty(stableApiTarget, property);
      }
    };
  }, [stableApiTarget]);

  const originalData = React.useMemo(
    () => (Array.isArray(dataSource) ? dataSource : rows),
    [dataSource, rows]
  );
  const computedFilterValueMap = React.useMemo(() => {
    if (!filterValue || filterValue.length === 0) return null;

    return filterValue.reduce<Record<string, TypeSingleFilterValue>>(
      (accumulator, entry) => {
        accumulator[entry.name] = entry;
        return accumulator;
      },
      {}
    );
  }, [filterValue]);
  const allComputedColumns = React.useMemo<TypeComputedColumn[]>(() => {
    return allInputColumns.map((column, index) => {
      const columnId = getColumnId(column);
      const computedVisibleIndex = orderedColumns.findIndex(
        (candidate) => getColumnId(candidate) === columnId
      );

      return {
        ...column,
        computedWidth: columnWidths[columnId],
        computedVisibleIndex:
          computedVisibleIndex >= 0 ? computedVisibleIndex : undefined,
        index,
      };
    });
  }, [allInputColumns, columnWidths, orderedColumns]);
  const visibleComputedColumns = React.useMemo<TypeComputedColumn[]>(() => {
    return orderedColumns.map((column, visibleIndex) => {
      const columnId = getColumnId(column);
      const computedColumn = allComputedColumns.find(
        (candidate) => getColumnId(candidate) === columnId
      );

      return {
        ...(computedColumn ?? column),
        computedWidth: columnWidths[columnId],
        computedVisibleIndex: visibleIndex,
      };
    });
  }, [allComputedColumns, columnWidths, orderedColumns]);
  const columnsMap = React.useMemo<TypeComputedColumnsMap>(() => {
    return Object.fromEntries(
      allComputedColumns.map((column) => [getColumnId(column), column])
    );
  }, [allComputedColumns]);
  const visibleColumnsMap = React.useMemo<TypeComputedColumnsMap>(() => {
    return Object.fromEntries(
      visibleComputedColumns.map((column) => [getColumnId(column), column])
    );
  }, [visibleComputedColumns]);
  const columnWidthPrefixSums = React.useMemo(() => {
    const sums: number[] = [];
    let running = 0;

    for (const column of columnLayout) {
      running += column.width;
      sums.push(running);
    }

    return sums;
  }, [columnLayout]);
  const columnFlexes = React.useMemo<Record<string, number>>(() => {
    return Object.fromEntries(
      orderedColumns.map((column) => [
        getColumnId(column),
        Number(column.flex ?? column.defaultFlex ?? 0),
      ])
    );
  }, [orderedColumns]);
  const columnSizes = React.useMemo<Record<string, number>>(() => {
    return Object.fromEntries(
      orderedColumns.map((column) => [
        getColumnId(column),
        Number(columnWidths[getColumnId(column)] ?? 0),
      ])
    );
  }, [columnWidths, orderedColumns]);

  const setLimitAndResetPage = React.useCallback(
    (next: number) => {
      setSkip(0);
      setLimit(next);
    },
    [setLimit, setSkip]
  );

  const setSortInfoAndResetPage = React.useCallback(
    (next: TypeSortInfo) => {
      setSkip(0);
      setSortInfo(next);
    },
    [setSkip, setSortInfo]
  );

  const setFilterValueAndResetPage = React.useCallback(
    (next: TypeFilterValue) => {
      setSkip(0);
      if (!filterControlled) {
        setDraftFilterValue(next);
      }
      setFilterValue(next);
    },
    [filterControlled, setDraftFilterValue, setFilterValue, setSkip]
  );

  const setColumnOrderCompat = React.useCallback(
    (next: string[]) => {
      const internalNext = checkboxEnabled
        ? (injectIntoOrder(next, checkboxColId) ?? next)
        : next;
      setColumnOrder(internalNext);
    },
    [checkboxColId, checkboxEnabled, setColumnOrder]
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

  const setColumnSortInfoCompat = React.useCallback(
    (column: TypeGetColumnByParam, dir: 1 | 0 | -1) => {
      const resolved = getColumnByCompat(column, { initial: true });
      if (!resolved) return;

      const sortName = getColumnSortName(resolved);
      setSortInfoAndResetPage(
        dir === 0
          ? null
          : {
              name: sortName,
              dir,
            }
      );
    },
    [getColumnByCompat, setSortInfoAndResetPage]
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
        multi: false,
      });

      setSortInfoAndResetPage(next);
    },
    [
      allowUnsort,
      defaultSortDir,
      getColumnByCompat,
      setSortInfoAndResetPage,
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
    (column: TypeGetColumnByParam, value: unknown) => {
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
      const operator = resolveDefaultFilterOperator(filterType, existing);

      setFilterValueAndResetPage(
        upsertFilterEntry(
          filterValue,
          {
            name: columnId,
            type: filterType,
            operator,
            value,
            active: undefined,
          },
          { filterTypes }
        )
      );
    },
    [
      filterTypes,
      filterValue,
      getColumnByCompat,
      getColumnIdCompat,
      setFilterValueAndResetPage,
    ]
  );

  const clearColumnFilterCompat = React.useCallback(
    (column: TypeGetColumnByParam) => {
      const columnId = getColumnIdCompat(column);
      if (!columnId) return;

      setFilterValueAndResetPage(
        clearFilter(filterValue, columnId, { filterTypes })
      );
    },
    [filterTypes, filterValue, getColumnIdCompat, setFilterValueAndResetPage]
  );

  const setSelectedCompat = React.useCallback(
    (nextSelected: TypeRowSelection) => {
      emitSelectionChange(toSelectionMap(unwrapSelectionState(nextSelected)));
    },
    [emitSelectionChange]
  );

  const selectAllCompat = React.useCallback(() => {
    const next: Record<string, any> = {};

    if (!multiSelect) {
      if (rows[0]) {
        next[getRowKey(rows[0], 0)] = rows[0];
      }
    } else {
      rows.forEach((row, index) => {
        next[getRowKey(row, index)] = row;
      });
    }

    emitSelectionChange(next, { data: rows });
  }, [emitSelectionChange, getRowKey, multiSelect, rows]);

  const deselectAllCompat = React.useCallback(() => {
    emitSelectionChange({}, { data: rows });
  }, [emitSelectionChange, rows]);

  const setSelectedByIdCompat = React.useCallback(
    (id: string, nextSelected: boolean) => {
      const row = rows.find(
        (candidate, index) => getRowKey(candidate, index) === id
      );
      const next = multiSelect ? { ...selectedMap } : {};

      if (nextSelected && row) next[id] = row;
      else delete next[id];

      emitSelectionChange(next, { data: row });
    },
    [emitSelectionChange, getRowKey, multiSelect, rows, selectedMap]
  );

  const setSelectedAtCompat = React.useCallback(
    (index: number, nextSelected: boolean) => {
      const row = rows[index];
      if (!row) return;

      setSelectedByIdCompat(getRowKey(row, index), nextSelected);
    },
    [getRowKey, rows, setSelectedByIdCompat]
  );

  const getItemIndexByIdCompat = React.useCallback(
    (rowId: string | number, data?: unknown[]) => {
      const source = Array.isArray(data) ? data : rows;
      const idAsString = String(rowId);

      return source.findIndex((candidate, index) => {
        const value = (candidate as any)?.[idProperty];
        return String(value == null ? index : value) === idAsString;
      });
    },
    [idProperty, rows]
  );

  const getScrollingElement = React.useCallback(() => scrollRef.current, []);

  const setScrollLeftCompat = React.useCallback((nextScrollLeft: number) => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollLeft = nextScrollLeft;
  }, []);

  const incrementScrollLeftCompat = React.useCallback((delta: number) => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollLeft += delta;
  }, []);

  const setScrollTopCompat = React.useCallback((nextScrollTop: number) => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = nextScrollTop;
  }, []);

  const incrementScrollTopCompat = React.useCallback((delta: number) => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop += delta;
  }, []);

  const scrollToIndexCompat = React.useCallback(
    (
      index: number,
      config?: {
        top?: boolean;
        direction?: "top" | "bottom";
        force?: boolean;
        duration?: number;
        offset?: number;
      },
      callback?: (...args: unknown[]) => void
    ) => {
      if (index < 0) return;

      if (virtualized) {
        rowVirtualizer.scrollToIndex(index, {
          align: config?.direction === "bottom" ? "end" : "start",
        });
      } else {
        const rowNode = surfaceRef.current?.querySelector<HTMLElement>(
          `[data-slot="grid-row"][data-row-index="${index}"]`
        );
        rowNode?.scrollIntoView({
          block: config?.direction === "bottom" ? "end" : "start",
        });
      }

      if (config?.offset && scrollRef.current) {
        scrollRef.current.scrollTop += config.offset;
      }

      callback?.();
    },
    [rowVirtualizer, virtualized]
  );

  const scrollToColumnCompat = React.useCallback(
    (
      index: number,
      config?: {
        offset?: number;
        duration?: number;
        force?: boolean;
        direction?: "left" | "right" | null;
      },
      callback?: (...args: unknown[]) => void
    ) => {
      const viewport = scrollRef.current;
      const column = visibleComputedColumns[index];
      if (!viewport || !column) return;

      const headerCell = surfaceRef.current?.querySelector<HTMLElement>(
        `[data-slot="grid-header-cell"][data-column-id="${getColumnId(column)}"]`
      );
      if (!headerCell) return;

      const viewportRect = viewport.getBoundingClientRect();
      const headerRect = headerCell.getBoundingClientRect();
      const offset = config?.offset ?? 0;

      if (
        config?.direction === "left" ||
        headerRect.left < viewportRect.left + offset
      ) {
        viewport.scrollLeft += headerRect.left - viewportRect.left - offset;
      } else if (
        config?.direction === "right" ||
        headerRect.right > viewportRect.right - offset
      ) {
        viewport.scrollLeft += headerRect.right - viewportRect.right + offset;
      }

      callback?.();
    },
    [visibleComputedColumns]
  );

  const scrollToCellCompat = React.useCallback(
    (
      cell: { rowIndex: number; columnIndex: number },
      config?: {
        offset?: number;
        left?: boolean;
        right?: boolean;
        top?: boolean;
      }
    ) => {
      scrollToIndexCompat(cell.rowIndex, {
        direction: config?.top === false ? "bottom" : "top",
        offset: config?.offset,
      });

      window.requestAnimationFrame(() => {
        scrollToColumnCompat(cell.columnIndex, {
          offset: config?.offset,
          direction: config?.left ? "left" : config?.right ? "right" : null,
        });
      });
    },
    [scrollToColumnCompat, scrollToIndexCompat]
  );

  const getRenderRangeCompat = React.useCallback(() => {
    if (!virtualized) {
      return {
        from: 0,
        to: Math.max(0, rowModel.length - 1),
      };
    }

    if (virtualItems.length === 0) {
      return { from: 0, to: 0 };
    }

    return {
      from: virtualItems[0]!.index,
      to: virtualItems[virtualItems.length - 1]!.index,
    };
  }, [rowModel.length, virtualItems, virtualized]);

  const isRowRenderedCompat = React.useCallback((rowIndex: number) => {
    return Boolean(
      surfaceRef.current?.querySelector(
        `[data-slot="grid-row"][data-row-index="${rowIndex}"]`
      )
    );
  }, []);

  const isRowFullyVisibleCompat = React.useCallback((rowIndex: number) => {
    const viewport = scrollRef.current;
    const rowNode = surfaceRef.current?.querySelector<HTMLElement>(
      `[data-slot="grid-row"][data-row-index="${rowIndex}"]`
    );
    if (!viewport || !rowNode) return false;

    const viewportRect = viewport.getBoundingClientRect();
    const rowRect = rowNode.getBoundingClientRect();

    return (
      rowRect.top >= viewportRect.top && rowRect.bottom <= viewportRect.bottom
    );
  }, []);

  const getVirtualListRowsCompat =
    React.useCallback((): TypeComputedVirtualListRow[] => {
      const virtualRows = virtualized
        ? rowVirtualizer.getVirtualItems()
        : rowModel.map((_, index) => ({
            index,
            start: index * rowHeight,
            end: (index + 1) * rowHeight,
            size: rowHeight,
          }));

      return virtualRows.map((virtualRow) => {
        const row = rowModel[virtualRow.index];

        return {
          id: row?.id ?? virtualRow.index,
          index: virtualRow.index,
          rowIndex: virtualRow.index,
          data: row?.original,
          top: virtualRow.start,
          height: virtualRow.size,
          start: virtualRow.start,
          end: virtualRow.end,
        };
      });
    }, [rowHeight, rowModel, rowVirtualizer, virtualized]);

  const getTotalRowHeightCompat = React.useCallback(() => {
    return virtualized
      ? rowVirtualizer.getTotalSize()
      : rowModel.length * rowHeight;
  }, [rowHeight, rowModel.length, rowVirtualizer, virtualized]);

  const getScrollHeightCompat = React.useCallback(() => {
    return Math.max(
      scrollRef.current?.scrollHeight ?? 0,
      getTotalRowHeightCompat()
    );
  }, [getTotalRowHeightCompat]);

  const getScrollSizeCompat = React.useCallback(() => {
    return {
      width:
        scrollRef.current?.scrollWidth ??
        columnWidthPrefixSums[columnWidthPrefixSums.length - 1] ??
        0,
      height: getScrollHeightCompat(),
    };
  }, [columnWidthPrefixSums, getScrollHeightCompat]);

  const getClientSizeCompat = React.useCallback(() => {
    return {
      width:
        scrollRef.current?.clientWidth ?? surfaceRef.current?.clientWidth ?? 0,
      height:
        scrollRef.current?.clientHeight ??
        surfaceRef.current?.clientHeight ??
        0,
    };
  }, []);

  const getVirtualListRangeCompat = React.useCallback(() => {
    const virtualRows = getVirtualListRowsCompat();
    if (virtualRows.length === 0) return { from: 0, to: 0 };

    return {
      from: virtualRows[0]!.index,
      to: virtualRows[virtualRows.length - 1]!.index,
    };
  }, [getVirtualListRowsCompat]);

  const getVirtualListVisibleCountCompat = React.useCallback(() => {
    return getVirtualListRowsCompat().length;
  }, [getVirtualListRowsCompat]);

  const getVirtualListRenderedIndexesCompat = React.useCallback(() => {
    return getVirtualListRowsCompat().map((row) => row.index);
  }, [getVirtualListRowsCompat]);

  const smoothScrollToCompat = React.useCallback<
    TypeComputedVirtualList["smoothScrollTo"]
  >(
    (index, config, callback) => {
      if (index < 0) return;

      const viewport = scrollRef.current;
      if (!viewport) {
        scrollToIndexCompat(index, config, callback);
        return;
      }

      const maxIndex = Math.max(0, rowModel.length - 1);
      const targetIndex = clamp(index, 0, maxIndex);
      const alignEnd = config?.direction === "bottom" || config?.top === false;
      const offset = config?.offset ?? 0;
      const top = alignEnd
        ? targetIndex * rowHeight + rowHeight - viewport.clientHeight + offset
        : targetIndex * rowHeight + offset;

      viewport.scrollTo({
        top: Math.max(0, top),
        behavior: "smooth",
      });
      callback?.();
    },
    [rowHeight, rowModel.length, scrollToIndexCompat]
  );

  const refreshVirtualListLayoutCompat = React.useCallback(() => {
    if (virtualized) {
      rowVirtualizer.measure();
    }
  }, [rowVirtualizer, virtualized]);

  const virtualListCompat = React.useMemo<TypeComputedVirtualList>(
    () => ({
      props: publicProps as unknown as Record<string, unknown>,
      context: {
        rowHeight,
        virtualized,
      },
      refs: {
        container: surfaceRef as React.MutableRefObject<HTMLElement | null>,
        scroller: scrollRef as React.MutableRefObject<HTMLElement | null>,
      },
      get size() {
        return getClientSizeCompat();
      },
      get rows() {
        return getVirtualListRowsCompat();
      },
      get row() {
        return getVirtualListRowsCompat()[0] ?? null;
      },
      get scrollTopPos() {
        return scrollRef.current?.scrollTop ?? 0;
      },
      get scrollLeftPos() {
        return scrollRef.current?.scrollLeft ?? 0;
      },
      get prevScrollTopPos() {
        return scrollRef.current?.scrollTop ?? 0;
      },
      get prevScrollLeftPos() {
        return scrollRef.current?.scrollLeft ?? 0;
      },
      get visibleCount() {
        return getVirtualListVisibleCountCompat();
      },
      getContainerNode: () => surfaceRef.current,
      getScrollerNode: () => scrollRef.current,
      getScrollingElement,
      getTotalRowHeight: getTotalRowHeightCompat,
      getScrollHeight: getScrollHeightCompat,
      getScrollSize: getScrollSizeCompat,
      getClientSize: getClientSizeCompat,
      getRows: getVirtualListRowsCompat,
      forEachRow: (callback) => {
        getVirtualListRowsCompat().forEach(callback);
      },
      getRowAt: (index) => {
        const virtualRows = getVirtualListRowsCompat();
        return (
          virtualRows.find((row) => row.index === index) ?? virtualRows[index]
        );
      },
      getVisibleCount: getVirtualListVisibleCountCompat,
      getVisibleRange: getVirtualListRangeCompat,
      setRowIndex: (index) => scrollToIndexCompat(index),
      scrollToIndex: scrollToIndexCompat,
      smoothScrollTo: smoothScrollToCompat,
      refreshLayout: refreshVirtualListLayoutCompat,
      updateVisibleCount: getVirtualListVisibleCountCompat,
      isRowRendered: isRowRenderedCompat,
      isRowVisible: (rowIndex) => {
        const range = getVirtualListRangeCompat();
        return rowIndex >= range.from && rowIndex <= range.to;
      },
      getRenderedIndexes: getVirtualListRenderedIndexesCompat,
      getMaxRenderCount: getVirtualListVisibleCountCompat,
    }),
    [
      getClientSizeCompat,
      getScrollingElement,
      getScrollHeightCompat,
      getScrollSizeCompat,
      getTotalRowHeightCompat,
      getVirtualListRangeCompat,
      getVirtualListRenderedIndexesCompat,
      getVirtualListRowsCompat,
      getVirtualListVisibleCountCompat,
      isRowRenderedCompat,
      publicProps,
      refreshVirtualListLayoutCompat,
      rowHeight,
      scrollToIndexCompat,
      smoothScrollToCompat,
      virtualized,
    ]
  );

  React.useEffect(() => {
    const viewport = scrollRef.current;
    const rootNode = rootRef.current;
    const surfaceNode = surfaceRef.current;
    const viewportWidth =
      viewport?.clientWidth ?? surfaceNode?.clientWidth ?? 0;
    const viewportHeight =
      viewport?.clientHeight ?? surfaceNode?.clientHeight ?? 0;
    const totalComputedWidth =
      columnWidthPrefixSums[columnWidthPrefixSums.length - 1] ?? 0;

    const applyColumnResizeBatch = (
      info: {
        column: TypeColumn;
        width?: number;
        flex?: number;
      }[]
    ) => {
      setManualColumnWidths((current) => {
        let changed = false;
        const next = { ...current };

        for (const entry of info) {
          const columnId = getColumnId(entry.column);
          if (
            typeof entry.width === "number" &&
            Number.isFinite(entry.width) &&
            next[columnId] !== entry.width
          ) {
            next[columnId] = entry.width;
            changed = true;
          }
        }

        return changed ? next : current;
      });
    };

    const baseApi: TypeComputedProps = {
      ...publicProps,
      reload: () => void loadData(),
      initialProps: publicProps,
      data: rows,
      originalData,
      count,
      dataCountAfterFilter: count,
      computedSkip: loadSkip,
      computedLimit: limit,
      getData: () => rows,
      getCount: () => count,
      getSkip: () => loadSkip,
      getLimit: () => limit,
      setSkip: (next) => setSkip(next),
      setLimit: setLimitAndResetPage,
      computedSortInfo: sortInfo,
      getSortInfo: () => sortInfo,
      setSortInfo: setSortInfoAndResetPage,
      toggleColumnSort: toggleColumnSortCompat,
      setColumnSortInfo: setColumnSortInfoCompat,
      unsortColumn: (column) => setColumnSortInfoCompat(column, 0),
      computedFilterValue: filterValue,
      computedFilterValueMap,
      getFilterValue: () => filterValue,
      setFilterValue: setFilterValueAndResetPage,
      clearAllFilters: () => setFilterValueAndResetPage(null),
      clearColumnFilter: clearColumnFilterCompat,
      getColumnFilterValue: getColumnFilterValueCompat,
      setColumnFilterValue: setColumnFilterValueCompat,
      isColumnFiltered: (column) => {
        const entry = getColumnFilterValueCompat(column);
        return Boolean(entry && entry.active !== false);
      },
      computedColumnOrder: columnOrderForDs,
      getColumnOrder: () => columnOrderForDs,
      setColumnOrder: setColumnOrderCompat,
      columnsMap,
      visibleColumnsMap,
      allColumns: allComputedColumns,
      visibleColumns: visibleComputedColumns,
      getColumnsInOrder: () => visibleComputedColumns,
      getColumnBy: getColumnByCompat,
      columnVisibilityMap,
      isColumnVisible: (column) => {
        const columnId = getColumnIdCompat(column);
        return columnId ? columnVisibilityMap[columnId] !== false : false;
      },
      setColumnVisible: (column, visible) => {
        const columnId = getColumnIdCompat(column);
        if (!columnId) return;

        setColumnVisibilityState((current) => {
          if (current[columnId] === visible) {
            return current;
          }

          return {
            ...current,
            [columnId]: visible,
          };
        });
      },
      gridId: gridIdRef.current,
      size: {
        width: viewportWidth,
        height: viewportHeight,
      },
      viewportSize: {
        width: viewportWidth,
        height: viewportHeight,
      },
      availableWidthForColumns: viewportWidth,
      maxAvailableWidthForColumns: viewportWidth,
      viewportAvailableWidth: viewportWidth,
      totalColumnCount: allComputedColumns.length,
      totalComputedWidth,
      columnWidthPrefixSums,
      minColumnsSize: totalComputedWidth,
      maxVisibleRows: virtualized ? virtualItems.length : rowModel.length,
      domRef: surfaceRef as React.MutableRefObject<HTMLElement | null>,
      bodyRef: scrollRef as React.MutableRefObject<HTMLElement | null>,
      getDOMNode: () => rootNode,
      getMenuPortalContainer: () => rootNode,
      getScrollingElement,
      getDOMNodeForRowIndex: (index) =>
        surfaceNode?.querySelector(
          `[data-slot="grid-row"][data-row-index="${index}"]`
        ) ?? null,
      getRows: () =>
        surfaceNode?.querySelector(".tdg-body-table tbody") ?? null,
      getHeader: () =>
        surfaceNode?.querySelector(".tdg-header-table thead") ?? null,
      focus: () => {
        surfaceNode?.focus();
      },
      blur: () => {
        surfaceNode?.blur();
      },
      computedLoading: loading,
      isLoading: () => loading,
      setLoading: (nextLoading) => {
        setLoadingOverride((current) =>
          resolveStateAction(nextLoading, current ?? false)
        );
      },
      computedFilterable: effectiveEnableFiltering,
      computedIsFilterable: effectiveEnableFiltering,
      setEnableFiltering: (nextValue) => {
        setEnableFilteringState((current) =>
          resolveStateAction(nextValue, current)
        );
      },
      computedShowHeader: showHeader,
      setShowHeader: (nextValue) => {
        setShowHeader((current) => resolveStateAction(nextValue, current));
      },
      showHorizontalCellBorders,
      showVerticalCellBorders,
      computedShowCellBorders: showCellBorders,
      computedRemoteData: !Array.isArray(dataSource),
      computedRemotePagination:
        !Array.isArray(dataSource) && paginationMode === "remote",
      computedRemoteFilter:
        !Array.isArray(dataSource) && effectiveEnableFiltering,
      computedLocalPagination:
        paginationMode !== false && paginationMode !== "remote",
      computedPagination: paginationMode !== false,
      computedLivePagination: false,
      remoteSort: !Array.isArray(dataSource),
      getItemId: (item) => (item as any)?.[idProperty],
      getItemAt: (index) => rows[index],
      getItemIdAt: (index) => {
        const row = rows[index];
        return row ? (row as any)?.[idProperty] : undefined;
      },
      getItemIndex: (id) => getItemIndexByIdCompat(id),
      getRowIndexById: (rowId, data) => getItemIndexByIdCompat(rowId, data),
      getItemIndexById: (rowId, data) => getItemIndexByIdCompat(rowId, data),
      computedSelected: selected,
      computedUnselected: {},
      getSelectedMap: () => ({ ...selectedMap }),
      setSelected: setSelectedCompat,
      selectAll: selectAllCompat,
      deselectAll: deselectAllCompat,
      isRowSelected: (value) => {
        if (typeof value === "number" || typeof value === "string") {
          return Boolean(selectedMap[String(value)]);
        }

        const rowId = (value as any)?.[idProperty];
        return rowId == null ? false : Boolean(selectedMap[String(rowId)]);
      },
      getSelectedCount: (selectionArg) =>
        Object.keys(
          toSelectionMap(
            unwrapSelectionState(selectionArg ?? selected) as TypeRowSelection
          )
        ).length,
      computedSelectedCount: Object.keys(selectedMap).length,
      computedUnselectedCount: 0,
      setSelectedById: setSelectedByIdCompat,
      setSelectedAt: setSelectedAtCompat,
      setRowSelected: setSelectedAtCompat,
      setScrollLeft: setScrollLeftCompat,
      incrementScrollLeft: incrementScrollLeftCompat,
      getScrollLeft: () => scrollRef.current?.scrollLeft ?? 0,
      getScrollLeftMax: () =>
        Math.max(
          0,
          (scrollRef.current?.scrollWidth ?? 0) -
            (scrollRef.current?.clientWidth ?? 0)
        ),
      setScrollTop: setScrollTopCompat,
      incrementScrollTop: incrementScrollTopCompat,
      getScrollTop: () => scrollRef.current?.scrollTop ?? 0,
      scrollToIndex: scrollToIndexCompat,
      scrollToId: (id, config, callback) => {
        const index = getItemIndexByIdCompat(id);
        if (index < 0) return;
        scrollToIndexCompat(index, config, callback);
      },
      scrollToCell: scrollToCellCompat,
      scrollToColumn: scrollToColumnCompat,
      scrollToIndexIfNeeded: (index, config, callback) => {
        if (isRowFullyVisibleCompat(index)) {
          return false;
        }

        scrollToIndexCompat(index, config, callback);
        return true;
      },
      getFirstVisibleIndex: () => getRenderRangeCompat().from,
      isRowFullyVisible: isRowFullyVisibleCompat,
      isRowRendered: isRowRenderedCompat,
      getRenderRange: getRenderRangeCompat,
      scrollbars: {
        vertical: (viewport?.scrollHeight ?? 0) > (viewport?.clientHeight ?? 0),
        horizontal: (viewport?.scrollWidth ?? 0) > (viewport?.clientWidth ?? 0),
      },
      i18n: (key, defaultValue) =>
        t(i18n, key, defaultValue ?? key) as string | React.ReactNode,
      columnFilterContextMenuProps: openFilterMenuColId
        ? { columnId: openFilterMenuColId }
        : null,
      showColumnFilterContextMenu: (...args) => {
        const target = args[0] as TypeGetColumnByParam | undefined;
        if (target === undefined) return;

        const columnId = getColumnIdCompat(target);
        if (columnId) {
          setOpenFilterMenuColId(columnId);
        }
      },
      hideColumnFilterContextMenu: () => {
        setOpenFilterMenuColId(null);
      },
      showColumnContextMenu: () => undefined,
      hideColumnContextMenu: () => undefined,
      showRowContextMenu: () => undefined,
      hideRowContextMenu: () => undefined,
      loadNextPage: canNext
        ? () => {
            setSkip(loadSkip + safeLimit);
          }
        : undefined,
      paginationCount: pageCount,
      computedActiveIndex: -1,
      computedLastActiveIndex: null,
      doSetLastActiveIndex: () => undefined,
      computedActiveItem: null,
      getActiveItem: () => null,
      computedHasRowNavigation: false,
      computedShowHoverRows: true,
      computedShowZebraRows: true,
      computedShowEmptyRows: false,
      hasLockedStart: false,
      hasLockedEnd: false,
      hasUnlocked: visibleComputedColumns.length > 0,
      firstLockedStartIndex: -1,
      firstLockedEndIndex: -1,
      firstUnlockedIndex: visibleComputedColumns.length > 0 ? 0 : -1,
      lastLockedStartIndex: -1,
      lastUnlockedIndex: visibleComputedColumns.length - 1,
      lastLockedEndIndex: -1,
      computedOnColumnResize: ({
        index,
        diff,
      }: {
        index: number;
        diff: number;
      }) => {
        const column = visibleComputedColumns[index];
        if (!column) return;

        const columnId = getColumnId(column);
        const { minWidth, maxWidth } = getColumnWidthBounds(column);
        const nextWidth = clamp(
          (columnWidths[columnId] ??
            column.width ??
            column.defaultWidth ??
            120) + diff,
          minWidth,
          maxWidth
        );

        setManualColumnWidth(columnId, nextWidth);
      },
      onBatchColumnResize: (
        info: {
          column: TypeColumn;
          width?: number;
          flex?: number;
        }[]
      ) => {
        applyColumnResizeBatch(info);
      },
      columnFlexes,
      columnSizes,
      setColumnFlexes: () => undefined,
      setColumnSizes: () => undefined,
      setActiveIndex: () => undefined,
      incrementActiveIndex: () => undefined,
      setReservedViewportWidth: () => undefined,
      reservedViewportWidth: 0,
      virtualizeColumns: false,
      computedShowHeaderBorderRight: showVerticalCellBorders,
      silentSetData: setRows,
      setOriginalData: setRows,
      getVirtualList: () => virtualListCompat,
    };

    baseApi.publicAPI = stableApi;

    for (const property of Reflect.ownKeys(stableApiTarget)) {
      Reflect.deleteProperty(stableApiTarget, property);
    }
    Object.assign(stableApiTarget, baseApi);
    apiRef.current = stableApi;

    const handle = handleRef.current;
    if (!handleNotifiedRef.current && handle) {
      handleNotifiedRef.current = true;
      handle(apiRef);
    }

    const onReady = onReadyRef.current;
    if (!onReadyNotifiedRef.current && onReady) {
      onReadyNotifiedRef.current = true;
      onReady(apiRef);
    }
  }, [
    allComputedColumns,
    canNext,
    checkboxColId,
    checkboxEnabled,
    columnFlexes,
    columnLayout,
    columnOrderForDs,
    columnSizes,
    columnVisibilityMap,
    columnWidthPrefixSums,
    columnWidths,
    columnsMap,
    count,
    dataSource,
    effectiveEnableFiltering,
    filterControlled,
    filterValue,
    getColumnByCompat,
    getColumnFilterValueCompat,
    getColumnIdCompat,
    getItemIndexByIdCompat,
    getRenderRangeCompat,
    getRowKey,
    getScrollingElement,
    i18n,
    idProperty,
    isRowFullyVisibleCompat,
    isRowRenderedCompat,
    limit,
    loadData,
    loading,
    loadSkip,
    openFilterMenuColId,
    originalData,
    pageCount,
    paginationMode,
    publicProps,
    rowModel.length,
    rows,
    safeLimit,
    selected,
    selectedMap,
    setColumnFilterValueCompat,
    setColumnOrderCompat,
    setColumnSortInfoCompat,
    setFilterValueAndResetPage,
    setLimitAndResetPage,
    setManualColumnWidth,
    setSelectedAtCompat,
    setSelectedByIdCompat,
    setSelectedCompat,
    setSortInfoAndResetPage,
    setScrollLeftCompat,
    setScrollTopCompat,
    showHeader,
    showHorizontalCellBorders,
    showVerticalCellBorders,
    showCellBorders,
    skip,
    sortInfo,
    stableApi,
    stableApiTarget,
    toggleColumnSortCompat,
    scrollToCellCompat,
    scrollToColumnCompat,
    scrollToIndexCompat,
    clearColumnFilterCompat,
    selectAllCompat,
    deselectAllCompat,
    allInputColumns,
    visibleColumnsMap,
    visibleComputedColumns,
    virtualListCompat,
    virtualItems.length,
    virtualized,
  ]);

  /** ---------------- render ---------------- */

  return (
    <div
      ref={attachRootRef}
      className={cn(
        "tdg-root InovuaReactDataGrid flex h-full min-h-0 w-full min-w-0 max-w-full flex-col gap-2 overflow-hidden rounded-lg lg:gap-6",
        `tdg-theme-${themeClassSuffix}`,
        `InovuaReactDataGrid--theme-${themeClassSuffix}`,
        "InovuaReactDataGrid--direction-ltr InovuaReactDataGrid--show-hover-rows",
        themeBase === "dark" ? "dark" : "",
        showVerticalCellBorders ? "InovuaReactDataGrid--show-border-right" : "",
        effectiveEnableFiltering ? "InovuaReactDataGrid--filterable" : "",
        className
      )}
      data-theme={themeName}
      data-theme-base={themeBase}
      data-column-resizing={resizingColumnId ? "true" : "false"}
      data-column-width-mode={hasManualColumnWidths ? "fixed" : "stretch"}
      data-layout={mobileTransformActive ? "mobile-list" : "table"}
    >
      <DatagridThemeProvider
        theme={themeName}
        themeBase={themeBase}
        portalContainer={portalContainer}
      >
        <div
          className="tdg-frame flex h-full min-h-0 w-full min-w-0 max-w-full flex-col overflow-hidden rounded-lg"
          data-slot="grid-frame"
        >
          <div
            ref={surfaceRef}
            className="tdg-surface relative flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col bg-[var(--tdg-grid-bg)] text-foreground"
            data-slot="grid-surface"
            tabIndex={-1}
            style={style}
          >
            {resizeProxyLeft != null ? (
              <div
                className="InovuaReactDataGrid__resize-proxy"
                aria-hidden="true"
                style={{ left: `${resizeProxyLeft}px` }}
              />
            ) : null}
            {mobileTransformActive ? (
              <MobileGridList
                rows={rowModel}
                columns={orderedColumns}
                searchColumns={inputColumns}
                checkboxColumnId={checkboxColId}
                loading={loading}
                selectedMap={selectedMap}
                i18n={i18n}
                sortInfo={sortInfo}
                defaultSortDirection={defaultSortDir}
                searchEnabled={!searchConnected}
                onSortInfoChange={setSortInfoAndResetPage}
                onFilteredRowsCountChange={notifyFilteredRowsCount}
                onRowClick={(id, data, event) =>
                  handleRowClick(id, data, event)
                }
              />
            ) : (
              <ScrollArea
                className="tdg-scroll-area flex min-h-0 w-full min-w-0 max-w-full flex-1 rounded-b-[inherit]"
                viewportRef={scrollRef}
                viewportClassName="tdg-body-viewport relative h-full min-h-0 w-full min-w-0 bg-[var(--tdg-grid-bg)] text-foreground"
              >
                {showHeader ? (
                  <div
                    className="tdg-header-layer sticky top-0 z-20 h-0 overflow-visible"
                    aria-hidden="false"
                  >
                    <div
                      ref={headerScrollRef}
                      className="tdg-header-viewport w-full min-w-0 max-w-full overflow-hidden"
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
                          enableFiltering={effectiveEnableFiltering}
                          enableColumnFilterContextMenu={
                            enableColumnFilterContextMenu
                          }
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
                  </div>
                ) : null}
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
                    stickyHeaderOffset={stickyHeaderOffset}
                    loading={loading}
                    i18n={i18n}
                    selectedMap={selectedMap}
                    onRowClick={(id, data, e) => handleRowClick(id, data, e)}
                  />
                </table>
              </ScrollArea>
            )}
          </div>

          {paginationEnabled ? (
            <div className="tdg-pagination-shell border-t py-2 [border-color:var(--tdg-grid-border-color)]">
              <GridPagination
                count={count}
                skip={loadSkip}
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
// Inovua-compat: expose the runtime defaults via ReactDataGrid.defaultProps.
// Apps commonly extend the filter registry like:
// Object.assign({}, ReactDataGrid.defaultProps.filterTypes, { myCustomType: ... })
// -----------------------------------------------------------------------------
const ReactDataGridWithDefaultProps = ReactDataGrid as ReactDataGridComponent;

ReactDataGridWithDefaultProps.defaultProps = {
  ...REACT_DATA_GRID_DEFAULT_PROPS,
};

// Optional packages can identify the canonical component without relying on
// component names, wrappers, or a public prop.
Object.defineProperty(
  ReactDataGridWithDefaultProps,
  Symbol.for("@geovi/the-datagrid/search-target"),
  { value: true }
);

// Mobile already uses this component and engine. The optional search entry
// reads the same lazy runtime through a private symbol, avoiding both a second
// implementation and a public internal export.
Object.defineProperty(
  ReactDataGridWithDefaultProps,
  DATA_GRID_SEARCH_RUNTIME_SYMBOL,
  { get: getDataGridSearchRuntime }
);

export { ReactDataGridWithDefaultProps as ReactDataGrid };
export default ReactDataGridWithDefaultProps;
