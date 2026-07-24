"use client";

import * as React from "react";
import type {
  TypeCheckboxColumn,
  TypeCheckboxProps,
  TypeColumn,
  TypeComputedColumn,
  TypeComputedColumnsMap,
  TypeComputedProps,
  TypeColumnFilterValueChangeArg,
  TypeComputedVirtualList,
  TypeComputedVirtualListRow,
  TypeCompleteEditArgs,
  TypeCancelEditArgs,
  TypeDataGridProps,
  TypeEditInfo,
  TypeGetColumnByParam,
  TypeSingleFilterValue,
  TypeFilterValue,
  TypeOnSelectionChangeArg,
  TypeRowSelection,
  TypeStartEditArgs,
  TypeSortInfo,
  TypeTryStartEditArgs,
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
  clearAllFilters,
  clearFilter,
  getFilterEntry,
  hasActiveLocalFilter,
  isFilterEntryEmptyValue,
  normalizeFilterValue,
  upsertFilterEntry,
} from "../filters/utils";
import { applyLocalSort, toggleSortInfo } from "../sorting/utils";

import {
  fromTanStackColumnFiltersState,
  fromTanStackRowSelectionState,
  fromTanStackSortingState,
  hydrateTanStackRowSelection,
  projectTanStackColumnOrder,
  projectTanStackColumnSizing,
  projectTanStackColumnVisibility,
  toTanStackColumnFiltersState,
  toTanStackRowSelectionState,
  toTanStackSortingState,
} from "./engine/tanstackAdapter";

import {
  injectIntoOrder,
  isColumnVisible,
  isInteractiveClickTarget,
  stripFromOrder,
  toSelectionMap,
  unwrapSelectionState,
} from "./utils/gridUtils";

import { GridHeader } from "./components/GridHeader";
import {
  GridBody,
  type GridCellEditStartArgs,
  type GridEditingCell,
  type GridEditNavigation,
} from "./components/GridBody";
import { buildEditCellProps } from "./utils/editing";
import { resolveConfiguredRowHeight } from "./utils/rowHeight";
import { GridPagination } from "./components/GridPagination";
import { MobileGridList } from "./components/MobileGridList";
import { allocateColumnWidths } from "./utils/columnSizing";
import {
  buildGridColumnRenderItems,
  buildLockedColumnLayout,
  groupColumnsByLock,
  resolveColumnLock,
} from "./utils/lockedColumns";
import {
  DATA_GRID_SEARCH_RUNTIME_SYMBOL,
  getDataGridSearchRuntime,
} from "./searchRuntime";

/**
 * Optional compat export: Inovua exports `plugins`. We export an empty list.
 */
export const plugins: readonly unknown[] = [] as const;

type ReactDataGridDefaultPropName =
  | "idProperty"
  | "theme"
  | "enableColumnFilterContextMenu"
  | "enableColumnAutosize"
  | "skipHeaderOnAutoSize"
  | "resizable"
  | "liveColumnResize"
  | "filterTypes"
  | "virtualized"
  | "virtualizeColumnsThreshold"
  | "allowMobileTransform"
  | "columnUserSelect"
  | "showCellBorders"
  | "showColumnMenuTool"
  | "rowHeight"
  | "minRowHeight"
  | "defaultShowZebraRows"
  | "editStartEvent"
  | "emptyText"
  | "headerHeight"
  | "filterRowHeight"
  | "enableKeyboardNavigation"
  | "activateRowOnFocus"
  | "keyPageStep"
  | "allowRowTabNavigation"
  | "toggleRowSelectOnClick"
  | "showActiveRowIndicator";

type ReactDataGridDefaultProps = Required<
  Pick<TypeDataGridProps, ReactDataGridDefaultPropName>
>;

const REACT_DATA_GRID_DEFAULT_PROPS: ReactDataGridDefaultProps = {
  idProperty: "id",
  theme: "default-light",
  enableColumnFilterContextMenu: true,
  enableColumnAutosize: true,
  skipHeaderOnAutoSize: false,
  resizable: true,
  liveColumnResize: false,
  filterTypes: DEFAULT_FILTER_TYPES,
  virtualized: true,
  virtualizeColumnsThreshold: 15,
  allowMobileTransform: false,
  columnUserSelect: false,
  showCellBorders: true,
  showColumnMenuTool: true,
  rowHeight: 40,
  minRowHeight: 20,
  defaultShowZebraRows: true,
  editStartEvent: "dblclick",
  emptyText: "noRecords",
  headerHeight: 40,
  filterRowHeight: 40,
  enableKeyboardNavigation: true,
  activateRowOnFocus: true,
  keyPageStep: 10,
  allowRowTabNavigation: false,
  toggleRowSelectOnClick: false,
  showActiveRowIndicator: true,
};

type ReactDataGridComponent = React.FunctionComponent<TypeDataGridProps> & {
  defaultProps: ReactDataGridDefaultProps;
};

type LiveColumnResizePreview = {
  baseColumnWidth: number;
  columns: {
    element: HTMLTableColElement;
    inlineWidth: string;
  }[];
  tables: {
    element: HTMLTableElement;
    inlineWidth: string;
    renderedWidth: number;
  }[];
  viewport: HTMLElement | null;
  lockedColumns: {
    side: "start" | "end";
    columnId: string;
    cells: {
      element: HTMLElement;
      inlineOffset: string;
      inlineViewportOffset: string;
    }[];
  }[];
};

type ColumnResizeSession = {
  columnId: string;
  column: TypeColumn;
  inputType: "mouse" | "pointer";
  pointerId: number | null;
  startX: number;
  startWidth: number;
  nextWidth: number;
  columnLeft: number;
  minWidth: number;
  maxWidth: number;
  liveColumnResize: boolean;
  appliedPreviewWidth: number | null;
  preview: LiveColumnResizePreview | null;
};

function captureLiveColumnResizePreview(
  surface: HTMLElement,
  columnId: string,
  baseColumnWidth: number
): LiveColumnResizePreview {
  const columns = Array.from(
    surface.querySelectorAll<HTMLTableColElement>("col[data-column-id]")
  )
    .filter((element) => element.dataset.columnId === columnId)
    .map((element) => ({
      element,
      inlineWidth: element.style.width,
    }));
  const owningTables = new Set<HTMLTableElement>();

  for (const { element } of columns) {
    const table = element.closest("table");
    if (table instanceof HTMLTableElement) owningTables.add(table);
  }

  const lockedColumnsByKey = new Map<
    string,
    LiveColumnResizePreview["lockedColumns"][number]
  >();
  for (const element of surface.querySelectorAll<HTMLElement>(
    ".tdg-locked-column[data-column-id]"
  )) {
    const lockedColumnId = element.dataset.columnId;
    const side = element.classList.contains("tdg-locked-column--start")
      ? "start"
      : element.classList.contains("tdg-locked-column--end")
        ? "end"
        : null;
    if (!lockedColumnId || !side) continue;

    const key = `${side}:${lockedColumnId}`;
    let lockedColumn = lockedColumnsByKey.get(key);
    if (!lockedColumn) {
      lockedColumn = {
        side,
        columnId: lockedColumnId,
        cells: [],
      };
      lockedColumnsByKey.set(key, lockedColumn);
    }
    lockedColumn.cells.push({
      element,
      inlineOffset: element.style.getPropertyValue(
        "--tdg-locked-column-offset"
      ),
      inlineViewportOffset: element.style.getPropertyValue(
        "--tdg-locked-column-viewport-offset"
      ),
    });
  }

  return {
    baseColumnWidth,
    columns,
    tables: Array.from(owningTables, (element) => ({
      element,
      inlineWidth: element.style.width,
      renderedWidth: element.getBoundingClientRect().width,
    })),
    viewport: surface.querySelector<HTMLElement>(".tdg-body-viewport"),
    lockedColumns: Array.from(lockedColumnsByKey.values()),
  };
}

function updateLiveLockedColumnLayout(preview: LiveColumnResizePreview) {
  const root = preview.viewport?.closest<HTMLElement>(".tdg-root");
  const fixedWidthMode = root?.dataset.columnWidthMode === "fixed";
  const renderedTableWidth = preview.tables.reduce(
    (width, table) =>
      Math.max(width, table.element.getBoundingClientRect().width),
    0
  );
  const viewportOffset =
    fixedWidthMode && preview.viewport
      ? Math.max(0, preview.viewport.clientWidth - renderedTableWidth)
      : 0;

  const updateSide = (side: "start" | "end") => {
    const columns = preview.lockedColumns.filter(
      (column) => column.side === side
    );
    const iteration = side === "end" ? [...columns].reverse() : columns;
    let offset = 0;

    for (const column of iteration) {
      for (const cell of column.cells) {
        cell.element.style.setProperty(
          "--tdg-locked-column-offset",
          `${offset}px`
        );
        cell.element.style.setProperty(
          "--tdg-locked-column-viewport-offset",
          side === "end" ? `${viewportOffset}px` : "0px"
        );
      }

      const representativeCell = column.cells[0]?.element;
      offset += representativeCell?.getBoundingClientRect().width ?? 0;
    }
  };

  updateSide("start");
  updateSide("end");
}

function applyLiveColumnResizePreview(
  session: ColumnResizeSession,
  nextWidth: number
) {
  if (!session.preview || session.appliedPreviewWidth === nextWidth) return;

  const widthDelta = nextWidth - session.preview.baseColumnWidth;
  for (const { element } of session.preview.columns) {
    element.style.width = `${nextWidth}px`;
  }
  for (const { element, renderedWidth } of session.preview.tables) {
    element.style.width = `${Math.max(1, renderedWidth + widthDelta)}px`;
  }
  updateLiveLockedColumnLayout(session.preview);
  session.appliedPreviewWidth = nextWidth;
}

function restoreLiveColumnResizePreview(session: ColumnResizeSession | null) {
  if (!session?.preview || session.appliedPreviewWidth == null) return;

  for (const { element, inlineWidth } of session.preview.columns) {
    element.style.width = inlineWidth;
  }
  for (const { element, inlineWidth } of session.preview.tables) {
    element.style.width = inlineWidth;
  }
  for (const column of session.preview.lockedColumns) {
    for (const cell of column.cells) {
      if (cell.inlineOffset) {
        cell.element.style.setProperty(
          "--tdg-locked-column-offset",
          cell.inlineOffset
        );
      } else {
        cell.element.style.removeProperty("--tdg-locked-column-offset");
      }
      if (cell.inlineViewportOffset) {
        cell.element.style.setProperty(
          "--tdg-locked-column-viewport-offset",
          cell.inlineViewportOffset
        );
      } else {
        cell.element.style.removeProperty(
          "--tdg-locked-column-viewport-offset"
        );
      }
    }
  }
  session.appliedPreviewWidth = null;
}

type InternalSearchController = {
  value: string;
  filterRows: <Row>(rows: Row[], columns: TypeColumn[]) => Row[];
};

type InternalColumnVisibilitySnapshot = {
  columns: readonly TypeColumn[];
  columnOrder: readonly string[];
  columnVisibilityMap: Readonly<Record<string, boolean>>;
  theme: string;
  setColumnVisible: (columnId: string, visible: boolean) => void;
};

type InternalColumnVisibilityController = {
  publish: (snapshot: InternalColumnVisibilitySnapshot) => void;
};

type InternalDataGridProps = TypeDataGridProps & {
  /** Injected by the optional search package; intentionally not public API. */
  __rdgSearchController?: InternalSearchController;
  /** Injected by the optional column-visibility package; not public API. */
  __rdgColumnVisibilityController?: InternalColumnVisibilityController;
};

let publicPropsCache:
  | WeakMap<InternalDataGridProps, InternalDataGridProps>
  | undefined;

function getPublicProps(
  internalProps: InternalDataGridProps
): InternalDataGridProps {
  const cache =
    publicPropsCache ??
    (publicPropsCache = new WeakMap<
      InternalDataGridProps,
      InternalDataGridProps
    >());
  const cached = cache.get(internalProps);
  if (cached) return cached;

  const publicProps = { ...internalProps };
  delete publicProps.__rdgSearchController;
  delete publicProps.__rdgColumnVisibilityController;
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
    column.minWidth >= 0
      ? column.minWidth
      : 40;
  const maxWidth =
    typeof column.maxWidth === "number" &&
    Number.isFinite(column.maxWidth) &&
    column.maxWidth >= minWidth
      ? column.maxWidth
      : Number.MAX_SAFE_INTEGER;

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
  const columnVisibilityController =
    internalProps.__rdgColumnVisibilityController;
  const searchConnected = searchController != null;
  const optionalControllerConnected =
    searchConnected || columnVisibilityController != null;
  // Optional entries use private props as zero-dependency bridges. Keep those
  // bridges out of every consumer-facing props mirror and remote-source args.
  const publicProps: InternalDataGridProps = optionalControllerConnected
    ? getPublicProps(internalProps)
    : internalProps;
  const searchValue = searchController?.value ?? "";
  const searchFilterRows = searchController?.filterRows;
  const searchActive = searchValue.trim().length > 0;
  const loadRequestIdRef = React.useRef(0);

  const {
    theme = REACT_DATA_GRID_DEFAULT_PROPS.theme,
    idProperty = REACT_DATA_GRID_DEFAULT_PROPS.idProperty,
    columns: inputColumns,
    dataSource,

    enableColumnFilterContextMenu = REACT_DATA_GRID_DEFAULT_PROPS.enableColumnFilterContextMenu,

    enableColumnAutosize = REACT_DATA_GRID_DEFAULT_PROPS.enableColumnAutosize,
    skipHeaderOnAutoSize = REACT_DATA_GRID_DEFAULT_PROPS.skipHeaderOnAutoSize,
    resizable = REACT_DATA_GRID_DEFAULT_PROPS.resizable,
    liveColumnResize = REACT_DATA_GRID_DEFAULT_PROPS.liveColumnResize,

    enableFiltering,
    onColumnFilterValueChange,

    filteredRowsCount,

    virtualized = REACT_DATA_GRID_DEFAULT_PROPS.virtualized,
    virtualizeColumnsThreshold = REACT_DATA_GRID_DEFAULT_PROPS.virtualizeColumnsThreshold,
    virtualizeColumns,
    allowMobileTransform = REACT_DATA_GRID_DEFAULT_PROPS.allowMobileTransform,
    columnUserSelect = REACT_DATA_GRID_DEFAULT_PROPS.columnUserSelect,
    showCellBorders = REACT_DATA_GRID_DEFAULT_PROPS.showCellBorders,

    i18n,
    showColumnMenuTool = REACT_DATA_GRID_DEFAULT_PROPS.showColumnMenuTool,

    rowHeight = REACT_DATA_GRID_DEFAULT_PROPS.rowHeight,
    minRowHeight = REACT_DATA_GRID_DEFAULT_PROPS.minRowHeight,
    maxRowHeight,
    rowStyle,
    showZebraRows: controlledShowZebraRows,
    defaultShowZebraRows,
    editable = false,
    editStartEvent = REACT_DATA_GRID_DEFAULT_PROPS.editStartEvent,
    onEditStart,
    onEditStop,
    onEditComplete,
    onEditCancel,
    onEditValueChange,
    onColumnResize,
    headerHeight = REACT_DATA_GRID_DEFAULT_PROPS.headerHeight,
    filterRowHeight = REACT_DATA_GRID_DEFAULT_PROPS.filterRowHeight,
    disabledRows,
    activeIndex: controlledActiveIndex,
    defaultActiveIndex,
    onActiveIndexChange,
    activeIndexThrottle,
    enableKeyboardNavigation = REACT_DATA_GRID_DEFAULT_PROPS.enableKeyboardNavigation,
    activateRowOnFocus = REACT_DATA_GRID_DEFAULT_PROPS.activateRowOnFocus,
    keyPageStep = REACT_DATA_GRID_DEFAULT_PROPS.keyPageStep,
    allowRowTabNavigation = REACT_DATA_GRID_DEFAULT_PROPS.allowRowTabNavigation,
    toggleRowSelectOnClick = REACT_DATA_GRID_DEFAULT_PROPS.toggleRowSelectOnClick,
    rowFocusClassName,
    focusedClassName,
    showActiveRowIndicator = REACT_DATA_GRID_DEFAULT_PROPS.showActiveRowIndicator,
    activeRowIndicatorClassName,

    className,
    style,
    onKeyDown: onKeyDownProp,
    onFocus: onFocusProp,
    onBlur: onBlurProp,
  } = props;
  const disabledRowsRef = React.useRef(disabledRows);
  disabledRowsRef.current = disabledRows;
  const getDisabledRowState = React.useCallback(
    (rowIndex: number) => (disabledRows ? disabledRows[rowIndex] : null),
    [disabledRows]
  );
  const isRowDisabled = React.useCallback(
    (rowIndex: number) => Boolean(getDisabledRowState(rowIndex)),
    [getDisabledRowState]
  );

  const [uncontrolledShowZebraRows, setUncontrolledShowZebraRows] =
    React.useState(
      () =>
        defaultShowZebraRows ??
        REACT_DATA_GRID_DEFAULT_PROPS.defaultShowZebraRows
    );
  const showZebraRowsControlled = controlledShowZebraRows !== undefined;
  const showZebraRowsControlledRef = React.useRef(showZebraRowsControlled);
  React.useLayoutEffect(() => {
    showZebraRowsControlledRef.current = showZebraRowsControlled;
  }, [showZebraRowsControlled]);
  const setShowZebraRows = React.useCallback(
    (nextValue: React.SetStateAction<boolean>) => {
      if (showZebraRowsControlledRef.current) return;

      setUncontrolledShowZebraRows((current) =>
        resolveStateAction(nextValue, current)
      );
    },
    []
  );
  const showZebraRows = controlledShowZebraRows ?? uncontrolledShowZebraRows;

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
  const hasColumnEditing = inputColumns.some(
    (column) => Boolean(column.editable) && isColumnVisible(column)
  );
  const mobileTransformActive =
    allowMobileTransform && isMobileViewport && !editable && !hasColumnEditing;
  const themeClassSuffix = toThemeClassSuffix(themeName);
  const themeBase = resolveThemeBase(themeName);
  const shouldUseLegacyThemeBridge =
    themeClassSuffix !== "default" &&
    themeClassSuffix !== "default-light" &&
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
  const [columnViewportWidth, setColumnViewportWidth] = React.useState(0);
  React.useLayoutEffect(() => {
    const surface = surfaceRef.current;
    if (!surface) return;

    const updateWidth = () => {
      const nextWidth = Math.max(0, Math.round(surface.clientWidth));
      setColumnViewportWidth((current) =>
        current === nextWidth ? current : nextWidth
      );
    };

    updateWidth();
    if (typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(updateWidth);
    observer.observe(surface);
    return () => observer.disconnect();
  }, [mobileTransformActive]);
  const [showHeader, setShowHeader] = React.useState(true);
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
  const controlledSelected = props.selected !== undefined;
  const controlledUnselected = props.unselected !== undefined;
  const selectionEnabled =
    props.enableSelection !== undefined
      ? Boolean(props.enableSelection)
      : controlledSelected ||
        props.defaultSelected !== undefined ||
        controlledUnselected ||
        props.defaultUnselected !== undefined ||
        checkboxEnabled;

  const checkboxColId = React.useMemo(() => {
    if (!checkboxEnabled) return "__checkbox__";
    if (typeof checkboxColumnProp === "object") {
      return checkboxColumnProp.id ?? checkboxColumnProp.name ?? "__checkbox__";
    }
    return "__checkbox__";
  }, [checkboxEnabled, checkboxColumnProp]);

  const selectionValue = controlledSelected
    ? props.selected
    : props.defaultSelected;
  const multiSelect = selectionEnabled
    ? (props.multiSelect ??
      ((typeof selectionValue === "object" && selectionValue !== null) ||
        typeof selectionValue === "boolean" ||
        (!controlledSelected && checkboxEnabled)))
    : false;
  const checkboxOnlyRowSelect = props.checkboxOnlyRowSelect ?? false;
  const checkboxSelectEnableShiftKey =
    props.checkboxSelectEnableShiftKey ?? false;

  const [internalSelected, setInternalSelected] =
    React.useState<TypeRowSelection>(() => {
      if (props.defaultSelected !== undefined) return props.defaultSelected;
      return multiSelect ? {} : null;
    });

  const selected: TypeRowSelection = selectionEnabled
    ? controlledSelected
      ? (props.selected as TypeRowSelection)
      : internalSelected
    : null;
  const normalizedSelected = unwrapSelectionState(selected);
  const selectedWrapper =
    selected &&
    typeof selected === "object" &&
    "selected" in selected &&
    ("data" in selected ||
      "unselected" in selected ||
      "originalData" in selected)
      ? (selected as TypeOnSelectionChangeArg)
      : null;
  const selectedWrapperUnselected = selectedWrapper?.unselected as
    | Record<string, boolean>
    | null
    | undefined;

  const [internalUnselected, setInternalUnselected] = React.useState<Record<
    string,
    boolean
  > | null>(() => props.defaultUnselected ?? null);
  const unselected =
    selectionEnabled && multiSelect
      ? controlledUnselected
        ? (props.unselected ?? null)
        : selectedWrapperUnselected !== undefined
          ? selectedWrapperUnselected
          : internalUnselected
      : null;

  const [activeIndexState, setActiveIndexState] = useControllableState<number>({
    value: controlledActiveIndex,
    defaultValue: defaultActiveIndex ?? -1,
    onChange: onActiveIndexChange,
  });
  const [gridFocused, setGridFocused] = React.useState(false);
  const lastActiveIndexRef = React.useRef<number | null>(null);
  const pendingActiveIndexRef = React.useRef<number | null>(null);
  const activeIndexThrottleTimerRef = React.useRef<number | null>(null);

  React.useEffect(
    () => () => {
      if (activeIndexThrottleTimerRef.current != null) {
        window.clearTimeout(activeIndexThrottleTimerRef.current);
      }
    },
    []
  );

  const lastSelectedIndexRef = React.useRef<number | null>(null);
  const selectionRangeBaseRef = React.useRef<Record<string, any> | null>(null);
  const lastPointerRef = React.useRef<{ shiftKey: boolean }>({
    shiftKey: false,
  });

  const emitSelectionChange = React.useCallback(
    (
      nextSelected: TypeRowSelection,
      meta?: { data?: unknown; unselected?: TypeRowSelection }
    ) => {
      if (!selectionEnabled) return;

      const nextUnselected =
        nextSelected === true
          ? ((meta?.unselected as Record<string, boolean> | null | undefined) ??
            null)
          : null;

      if (!controlledSelected) setInternalSelected(nextSelected);
      if (!controlledUnselected) setInternalUnselected(nextUnselected);

      props.onSelectionChange?.({
        selected: nextSelected,
        data: meta?.data,
        unselected: nextUnselected,
        originalData: dataSource,
      });
    },
    [
      controlledSelected,
      controlledUnselected,
      dataSource,
      props,
      selectionEnabled,
    ]
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
      editable: false,
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
  const columnVisibilityMap = React.useMemo(
    () =>
      projectTanStackColumnVisibility(allInputColumns, columnVisibilityState),
    [allInputColumns, columnVisibilityState]
  );

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
  const effectiveColumnOrder = React.useMemo(
    () => projectTanStackColumnOrder(allInputColumns, columnOrder),
    [allInputColumns, columnOrder]
  );

  const [sortInfo, setSortInfo] = useControllableState<TypeSortInfo>({
    value: props.sortInfo,
    defaultValue: props.defaultSortInfo ?? null,
    onChange: props.onSortInfoChange,
  });

  const [filterValue, setFilterValue, filterControlled] =
    useControllableState<TypeFilterValue>({
      value:
        props.filterValue === undefined
          ? undefined
          : normalizeFilterValue(props.filterValue),
      defaultValue: normalizeFilterValue(props.defaultFilterValue) ?? null,
      onChange: props.onFilterValueChange,
    });

  // Inovua treats `enableFiltering` as a tri-state visibility override. When
  // omitted, the presence of a non-empty filter value makes the filter row
  // visible. Keep an uncontrolled state so the imperative API can still show
  // or hide the row without turning inference into a public default.
  const [enableFilteringOverride, setEnableFilteringOverride] = React.useState<
    boolean | undefined
  >(undefined);
  const resolvedEnableFiltering =
    enableFiltering !== undefined ? enableFiltering : enableFilteringOverride;
  const effectiveEnableFiltering =
    resolvedEnableFiltering !== undefined
      ? resolvedEnableFiltering
      : Boolean(filterValue?.length);

  // Inovua 5.10.2 only transforms a local data source with its uncontrolled
  // filter state (`defaultFilterValue` and subsequent internal changes).
  // A controlled `filterValue` is supplied to remote loaders and rendered in
  // the filter row, but does not mutate an array data source. This predicate
  // is deliberately independent from filter-row visibility: explicitly
  // hiding the row does not discard an uncontrolled default filter.
  const localFilterValue = filterControlled ? null : filterValue;

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

  const consumerOrderedColumns = React.useMemo(() => {
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

    return ordered;
  }, [allInputColumns, effectiveColumnOrder]);
  const groupedColumns = React.useMemo(
    () => groupColumnsByLock(consumerOrderedColumns),
    [consumerOrderedColumns]
  );
  const orderedColumns = React.useMemo(
    () =>
      groupedColumns.filter(
        (column) => columnVisibilityMap[getColumnId(column)] !== false
      ),
    [columnVisibilityMap, groupedColumns]
  );
  const renderColumnOrder = React.useMemo(
    () => groupedColumns.map((column) => getColumnId(column)),
    [groupedColumns]
  );

  const tanstackSorting = React.useMemo(
    () => toTanStackSortingState(sortInfo, allInputColumns),
    [allInputColumns, sortInfo]
  );
  const tanstackColumnFilters = React.useMemo(
    () => toTanStackColumnFiltersState(filterValue, allInputColumns),
    [allInputColumns, filterValue]
  );

  /** ---------------- data loading ---------------- */

  const [rows, setRows] = React.useState<any[]>([]);
  const [count, setCount] = React.useState<number>(0);
  const getRowKey = React.useCallback(
    (row: any, index: number) => {
      const value = row?.[idProperty];
      return value == null ? String(index) : String(value);
    },
    [idProperty]
  );
  const selectedMap = React.useMemo(() => {
    if (!selectionEnabled) return {};

    if (normalizedSelected === true) {
      const result: Record<string, any> = {};
      rows.forEach((row, index) => {
        const rowId = getRowKey(row, index);
        if (!unselected?.[rowId]) result[rowId] = row;
      });
      return result;
    }
    if (normalizedSelected === false || normalizedSelected == null) return {};

    return toSelectionMap(normalizedSelected);
  }, [getRowKey, normalizedSelected, rows, selectionEnabled, unselected]);
  const tanstackRowSelection = React.useMemo(
    () => toTanStackRowSelectionState(selectedMap),
    [selectedMap]
  );
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

        if (localFilterValue) {
          data = applyLocalFilter(data, localFilterValue, {
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

      const transformStaticPromiseRows = <Row,>(snapshot: Row[]): Row[] => {
        if (dsIsFn) return snapshot;

        let data = snapshot;

        if (searchActive && searchFilterRows) {
          data = searchFilterRows(data, inputColumns);
        }
        if (localFilterValue) {
          data = applyLocalFilter(data, localFilterValue, {
            filterTypes,
            columns: orderedColumns,
          });
        }
        if (computedSortForFetch) {
          data = applyLocalSort(data, computedSortForFetch, orderedColumns);
        }

        return data;
      };

      if (result && typeof result === "object" && Array.isArray(result.data)) {
        // Functions own remote search and return an authoritative count. A
        // static Promise cannot receive args, so treat its resolved payload as
        // a local snapshot before count and pagination are derived.
        const resultData = transformStaticPromiseRows(result.data);
        const staticPromiseHasLocalPredicate =
          !dsIsFn &&
          (searchActive || hasActiveLocalFilter(localFilterValue, filterTypes));
        const reportedCount = Number(
          staticPromiseHasLocalPredicate
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
        const resultData = transformStaticPromiseRows(result);
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
    localFilterValue,
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

      if (localFilterValue) {
        data = applyLocalFilter(data, localFilterValue, {
          filterTypes,
          columns: orderedColumns,
        });
      }

      return data.slice(0, 25);
    }

    return rows.slice(0, 25);
  }, [
    dataSource,
    filterTypes,
    localFilterValue,
    orderedColumns,
    rows,
    searchActive,
  ]);

  /** ---------------- column widths ---------------- */

  const defaultColumnSizingRef = React.useRef(
    new Map<string, { defaultWidth?: number; defaultFlex?: number | null }>()
  );
  const sizingColumns = React.useMemo(
    () =>
      orderedColumns.map((column) => {
        const columnId = getColumnId(column);
        let defaults = defaultColumnSizingRef.current.get(columnId);
        if (!defaults) {
          defaults = {
            defaultWidth: column.defaultWidth,
            defaultFlex: column.defaultFlex,
          };
          defaultColumnSizingRef.current.set(columnId, defaults);
        }

        return {
          ...column,
          defaultWidth: defaults.defaultWidth,
          defaultFlex: defaults.defaultFlex,
        };
      }),
    [orderedColumns]
  );

  const autosizedWidths = React.useMemo(() => {
    const next: Record<string, number> = {};

    for (const column of sizingColumns) {
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
    sizingColumns,
    skipHeaderOnAutoSize,
  ]);

  const [manualColumnWidths, setManualColumnWidths] = React.useState<
    Record<string, number>
  >({});
  const [manualColumnFlexes, setManualColumnFlexes] = React.useState<
    Record<string, number | null>
  >({});
  const [reservedViewportWidth, setReservedViewportWidth] = React.useState(0);
  const reservedViewportWidthRef = React.useRef(0);
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

  React.useEffect(() => {
    setManualColumnFlexes((current) => {
      const nextEntries = orderedColumns.flatMap((column) => {
        const columnId = getColumnId(column);
        if (!Object.prototype.hasOwnProperty.call(current, columnId)) {
          return [];
        }

        const value = current[columnId];
        if (
          value !== null &&
          (typeof value !== "number" || !Number.isFinite(value) || value <= 0)
        ) {
          return [];
        }

        return [[columnId, value] as const];
      });

      if (
        nextEntries.length === Object.keys(current).length &&
        nextEntries.every(([columnId, value]) => current[columnId] === value)
      ) {
        return current;
      }

      return Object.fromEntries(nextEntries);
    });
  }, [orderedColumns]);

  const columnWidthAllocation = React.useMemo(() => {
    const allocation = allocateColumnWidths({
      columns: sizingColumns,
      availableWidth: Math.max(0, columnViewportWidth - reservedViewportWidth),
      preferredWidths: Object.fromEntries(
        orderedColumns.map((column) => {
          const columnId = getColumnId(column);
          return [
            columnId,
            manualColumnWidths[columnId] ?? autosizedWidths[columnId],
          ];
        })
      ),
      preferredFlexes: manualColumnFlexes,
    });
    const next = { ...allocation.widths };
    const lastColumn = orderedColumns[orderedColumns.length - 1];

    if (lastColumn) {
      const lastColumnId = getColumnId(lastColumn);
      const hasControlledWidth =
        typeof lastColumn.width === "number" &&
        Number.isFinite(lastColumn.width) &&
        lastColumn.width > 0;
      const hasFlex = Boolean(allocation.flexWeights[lastColumnId]);

      if (!hasControlledWidth && !hasFlex) {
        next[lastColumnId] = ensureLastColumnHeaderFits({
          column: lastColumn,
          baseWidth: next[lastColumnId] ?? autosizedWidths[lastColumnId] ?? 120,
          showColumnMenuTool,
        });
      }
    }

    return { ...allocation, widths: next };
  }, [
    autosizedWidths,
    columnViewportWidth,
    manualColumnFlexes,
    manualColumnWidths,
    orderedColumns,
    reservedViewportWidth,
    sizingColumns,
    showColumnMenuTool,
  ]);
  const columnWidths = columnWidthAllocation.widths;
  const tanstackColumnSizing = React.useMemo(
    () => projectTanStackColumnSizing(allInputColumns, columnWidths),
    [allInputColumns, columnWidths]
  );
  const normalizedVirtualizeColumnsThreshold =
    typeof virtualizeColumnsThreshold === "number" &&
    Number.isFinite(virtualizeColumnsThreshold)
      ? Math.max(0, Math.floor(virtualizeColumnsThreshold))
      : REACT_DATA_GRID_DEFAULT_PROPS.virtualizeColumnsThreshold;
  const hasFixedNumericRowHeight =
    typeof rowHeight === "number" && Number.isFinite(rowHeight);
  const computedVirtualizeColumns = Boolean(
    !mobileTransformActive &&
    orderedColumns.length > 0 &&
    hasFixedNumericRowHeight &&
    (typeof virtualizeColumns === "boolean"
      ? virtualizeColumns
      : orderedColumns.length >= normalizedVirtualizeColumnsThreshold)
  );

  /** ---------------- selection helpers ---------------- */

  const normalizedActiveIndex =
    enableKeyboardNavigation && rows.length > 0
      ? clamp(activeIndexState, -1, rows.length - 1)
      : -1;

  const setActiveIndexCompat = React.useCallback(
    (nextActiveIndex: number) => {
      if (!enableKeyboardNavigation || Number.isNaN(nextActiveIndex)) return;

      const normalized =
        rows.length === 0
          ? -1
          : nextActiveIndex < 0
            ? -1
            : clamp(Math.trunc(nextActiveIndex), 0, rows.length - 1);
      pendingActiveIndexRef.current = normalized;
      if (normalized === normalizedActiveIndex) return;
      setActiveIndexState(normalized);
    },
    [
      enableKeyboardNavigation,
      normalizedActiveIndex,
      rows.length,
      setActiveIndexState,
    ]
  );

  const incrementActiveIndex = React.useCallback(
    (increment: number) => {
      if (!enableKeyboardNavigation || rows.length === 0) return;

      const base = pendingActiveIndexRef.current ?? normalizedActiveIndex;
      const next = clamp(base + increment, 0, rows.length - 1);
      const delay =
        typeof activeIndexThrottle === "number" &&
        Number.isFinite(activeIndexThrottle)
          ? Math.max(0, activeIndexThrottle)
          : 0;

      pendingActiveIndexRef.current = next;
      if (delay === 0) {
        setActiveIndexCompat(next);
        return;
      }

      if (activeIndexThrottleTimerRef.current != null) return;
      activeIndexThrottleTimerRef.current = window.setTimeout(() => {
        activeIndexThrottleTimerRef.current = null;
        const pending = pendingActiveIndexRef.current;
        if (pending != null) setActiveIndexCompat(pending);
      }, delay);
    },
    [
      activeIndexThrottle,
      enableKeyboardNavigation,
      normalizedActiveIndex,
      rows.length,
      setActiveIndexCompat,
    ]
  );

  React.useEffect(() => {
    pendingActiveIndexRef.current = normalizedActiveIndex;
  }, [normalizedActiveIndex]);

  const clearSelectionRange = React.useCallback(() => {
    selectionRangeBaseRef.current = null;
  }, []);

  const commitRowSelection = React.useCallback(
    (
      rowIndex: number,
      options: {
        checked?: boolean;
        ctrlKey?: boolean;
        metaKey?: boolean;
        shiftKey?: boolean;
        fromCheckbox?: boolean;
      } = {}
    ) => {
      if (!selectionEnabled) return;
      const row = rows[rowIndex];
      if (!row) return;

      const rowId = getRowKey(row, rowIndex);
      const isSelected = Boolean(selectedMap[rowId]);
      const ctrlKey = Boolean(options.ctrlKey || options.metaKey);
      const shiftKey = Boolean(options.shiftKey);

      if (!multiSelect) {
        const shouldSelect =
          options.checked ??
          (isSelected && (ctrlKey || toggleRowSelectOnClick) ? false : true);
        emitSelectionChange(shouldSelect ? rowId : null, { data: row });
        lastSelectedIndexRef.current = shouldSelect ? rowIndex : null;
        clearSelectionRange();
        return;
      }

      if (
        shiftKey &&
        lastSelectedIndexRef.current != null &&
        (!options.fromCheckbox || checkboxSelectEnableShiftKey)
      ) {
        const base = selectionRangeBaseRef.current ?? { ...selectedMap };
        selectionRangeBaseRef.current = { ...base };
        const next = { ...base };
        const from = Math.min(lastSelectedIndexRef.current, rowIndex);
        const to = Math.max(lastSelectedIndexRef.current, rowIndex);
        const checked = options.checked ?? true;

        for (let index = from; index <= to; index += 1) {
          const rangeRow = rows[index];
          if (!rangeRow) continue;
          const rangeId = getRowKey(rangeRow, index);
          if (checked) next[rangeId] = rangeRow;
          else delete next[rangeId];
        }

        emitSelectionChange(next, {
          data: rows.slice(from, to + 1),
        });
        return;
      }

      clearSelectionRange();
      lastSelectedIndexRef.current = rowIndex;

      const shouldToggle =
        options.checked === undefined &&
        (ctrlKey ||
          (toggleRowSelectOnClick &&
            Object.keys(selectedMap).length === 1 &&
            isSelected));
      const shouldSelect =
        options.checked ?? (shouldToggle ? !isSelected : true);

      if (normalizedSelected === true && (ctrlKey || options.fromCheckbox)) {
        const nextUnselected = { ...(unselected ?? {}) };
        if (shouldSelect) delete nextUnselected[rowId];
        else nextUnselected[rowId] = true;
        emitSelectionChange(true, {
          data: row,
          unselected: nextUnselected,
        });
        return;
      }

      const next =
        shouldToggle || options.fromCheckbox ? { ...selectedMap } : {};
      if (shouldSelect) next[rowId] = row;
      else delete next[rowId];
      emitSelectionChange(next, { data: row });
    },
    [
      checkboxSelectEnableShiftKey,
      clearSelectionRange,
      emitSelectionChange,
      getRowKey,
      multiSelect,
      rows,
      normalizedSelected,
      selectedMap,
      selectionEnabled,
      toggleRowSelectOnClick,
      unselected,
    ]
  );

  const selectAllRows = React.useCallback(() => {
    if (!selectionEnabled || rows.length === 0) return;

    if (!multiSelect) {
      emitSelectionChange(getRowKey(rows[0], 0), { data: rows[0] });
      return;
    }

    clearSelectionRange();
    if (paginationMode !== false || !Array.isArray(dataSource)) {
      emitSelectionChange(true, { data: rows, unselected: null });
      return;
    }

    const next: Record<string, any> = {};
    rows.forEach((row, index) => {
      next[getRowKey(row, index)] = row;
    });
    emitSelectionChange(next, { data: rows });
  }, [
    clearSelectionRange,
    dataSource,
    emitSelectionChange,
    getRowKey,
    multiSelect,
    paginationMode,
    rows,
    selectionEnabled,
  ]);

  const deselectAllRows = React.useCallback(() => {
    if (!selectionEnabled) return;
    clearSelectionRange();
    lastSelectedIndexRef.current = null;
    emitSelectionChange(multiSelect ? {} : null, {
      data: rows,
      unselected: null,
    });
  }, [
    clearSelectionRange,
    emitSelectionChange,
    multiSelect,
    rows,
    selectionEnabled,
  ]);

  const handleRowClick = React.useCallback(
    (
      rowId: string,
      rowData: any,
      rowIndex: number,
      event: React.MouseEvent
    ) => {
      void rowId;
      void rowData;

      const interactiveTarget = isInteractiveClickTarget(event.target as any);
      if (!interactiveTarget) {
        surfaceRef.current?.focus({ preventScroll: true });
      }
      setActiveIndexCompat(rowIndex);

      if (!selectionEnabled || checkboxOnlyRowSelect || interactiveTarget) {
        return;
      }

      commitRowSelection(rowIndex, {
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        shiftKey: event.shiftKey,
      });
    },
    [
      checkboxOnlyRowSelect,
      commitRowSelection,
      selectionEnabled,
      setActiveIndexCompat,
    ]
  );

  /** ---------------- filter operator menu state ---------------- */

  const [openFilterMenuColId, setOpenFilterMenuColId] = React.useState<
    string | null
  >(null);

  /** ---------------- columnDefs (TanStack) ---------------- */

  // Keep the feature definitions stable. Selection is live compatibility
  // state, so renderers read it through a ref instead of forcing TanStack to
  // rebuild its complete column/header/cell memo graph for every selection or
  // data update.
  const selectionRuntimeRef = React.useRef({
    rows,
    selectedMap,
    selectionEnabled,
    multiSelect,
    getRowKey,
    commitRowSelection,
    selectAllRows,
    deselectAllRows,
    setActiveIndexCompat,
  });
  selectionRuntimeRef.current = {
    rows,
    selectedMap,
    selectionEnabled,
    multiSelect,
    getRowKey,
    commitRowSelection,
    selectAllRows,
    deselectAllRows,
    setActiveIndexCompat,
  };

  const columnDefs = React.useMemo<ColumnDef<any, any>[]>(() => {
    return allInputColumns.map((c) => {
      const colId = getColumnId(c);
      const { minWidth, maxWidth } = getColumnWidthBounds(c);
      const configuredSize =
        typeof c.width === "number" && Number.isFinite(c.width)
          ? c.width
          : typeof c.defaultWidth === "number" &&
              Number.isFinite(c.defaultWidth)
            ? c.defaultWidth
            : undefined;

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
          enableColumnFilter: false,
          enableHiding: false,
          enableResizing: false,
          size: configuredSize,
          minSize: minWidth,
          maxSize: maxWidth,

          header: () => {
            const runtime = selectionRuntimeRef.current;
            const pageRowIds = runtime.rows.map((r, idx) =>
              runtime.getRowKey(r, idx)
            );
            const selectedOnPage = pageRowIds.reduce(
              (acc, id) => acc + (runtime.selectedMap[id] ? 1 : 0),
              0
            );
            const allSelected =
              pageRowIds.length > 0 && selectedOnPage === pageRowIds.length;
            const someSelected = selectedOnPage > 0 && !allSelected;

            const onChange = (checked: boolean) => {
              const current = selectionRuntimeRef.current;
              if (!current.selectionEnabled) return;

              if (checked) current.selectAllRows();
              else current.deselectAllRows();
            };

            const checkboxProps: TypeCheckboxProps = {
              checked: allSelected,
              indeterminate: someSelected,
              disabled: !runtime.selectionEnabled || runtime.rows.length === 0,
              onChange,
            };

            const node = renderCheckbox ? (
              renderCheckbox(checkboxProps, {
                headerCell: true,
                data: runtime.rows,
              })
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
            const runtime = selectionRuntimeRef.current;
            const disabledRow = disabledRowsRef.current
              ? disabledRowsRef.current[rowIndex]
              : null;

            const isSelected = Boolean(runtime.selectedMap[rowId]);

            const onChange = (checked: boolean) => {
              const current = selectionRuntimeRef.current;
              if (!current.selectionEnabled) return;
              current.setActiveIndexCompat(rowIndex);
              current.commitRowSelection(rowIndex, {
                checked,
                shiftKey: lastPointerRef.current.shiftKey,
                fromCheckbox: true,
              });
            };

            const checkboxProps: TypeCheckboxProps = {
              checked: isSelected,
              disabled: !runtime.selectionEnabled,
              onChange,
            };

            const node = renderCheckbox ? (
              renderCheckbox(checkboxProps, {
                headerCell: false,
                data: rowData,
                rowIndex,
                disabledRow,
              })
            ) : (
              <Checkbox
                checked={checkboxProps.checked}
                disabled={checkboxProps.disabled}
                tabIndex={disabledRow ? -1 : undefined}
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
        enableColumnFilter: c.filterable ?? true,
        enableHiding: c.hideable ?? true,
        enableResizing: resizable && (c.resizable ?? true),
        size: configuredSize,
        minSize: minWidth,
        maxSize: maxWidth,

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
          const disabledRow = disabledRowsRef.current
            ? disabledRowsRef.current[rowIndex]
            : null;

          if (c.render) {
            const renderCell = c.render as (
              valueOrCellProps: unknown,
              args?: {
                data: unknown;
                rowIndex: number;
                column: TypeColumn;
                columnId: string;
                disabledRow?: boolean | null;
              }
            ) => React.ReactNode;
            const cellProps = {
              column: c,
              columnId: colId,
              rowIndex,
              disabledRow,
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
                disabledRow,
                cellProps,
              } as any);
            }

            return renderCell(value, {
              data: rowData,
              rowIndex,
              column: c,
              columnId: colId,
              disabledRow,
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
    allInputColumns,
    resizable,
  ]);

  const table = useReactTable({
    data: rows,
    columns: columnDefs,
    state: {
      sorting: tanstackSorting,
      columnFilters: tanstackColumnFilters,
      globalFilter: searchValue,
      columnOrder: renderColumnOrder,
      columnVisibility: columnVisibilityMap,
      columnSizing: tanstackColumnSizing,
      rowSelection: tanstackRowSelection,
    },
    onSortingChange: (updater) => {
      const nextSorting = resolveStateAction(updater, tanstackSorting);
      setSkip(0);
      setSortInfo(
        fromTanStackSortingState(nextSorting, allInputColumns, sortInfo)
      );
    },
    onColumnFiltersChange: (updater) => {
      const nextColumnFilters = resolveStateAction(
        updater,
        tanstackColumnFilters
      );
      const nextFilterValue = fromTanStackColumnFiltersState(
        nextColumnFilters,
        allInputColumns,
        filterValue
      );

      setSkip(0);
      if (!filterControlled) setDraftFilterValue(nextFilterValue);
      setFilterValue(nextFilterValue);
    },
    onColumnOrderChange: (updater) => {
      setColumnOrder(resolveStateAction(updater, renderColumnOrder));
    },
    onColumnVisibilityChange: (updater) => {
      const nextVisibility = resolveStateAction(updater, columnVisibilityMap);

      // TanStack visibility is a complete controlled snapshot, while the
      // compatibility layer stores sparse user overrides on top of live
      // column.visible values. Persist only the IDs changed by this action so
      // an unrelated column prop can still change on a later render.
      setColumnVisibilityState((current) => {
        const next = { ...current };
        let changed = false;

        for (const column of allInputColumns) {
          const columnId = getColumnId(column);
          const previousVisible = columnVisibilityMap[columnId] !== false;
          const nextVisible = nextVisibility[columnId] !== false;
          if (nextVisible === previousVisible) continue;

          next[columnId] = nextVisible;
          changed = true;
        }

        return changed ? next : current;
      });
    },
    onRowSelectionChange: (updater) => {
      if (!selectionEnabled) return;

      const nextRowSelection = resolveStateAction(
        updater,
        tanstackRowSelection
      );
      const nextCompatibilitySelection = fromTanStackRowSelectionState(
        nextRowSelection,
        selected
      );
      const nextMap = {
        ...toSelectionMap(nextCompatibilitySelection),
        ...hydrateTanStackRowSelection(nextRowSelection, rows, getRowKey),
      };

      emitSelectionChange(nextMap);
    },
    manualSorting: true,
    manualFiltering: true,
    manualPagination: true,
    enableRowSelection: selectionEnabled,
    enableMultiRowSelection: multiSelect,
    enableSortingRemoval: allowUnsort,
    sortDescFirst: defaultSortDir === -1,
    enableColumnResizing: resizable,
    columnResizeMode: "onEnd",
    getCoreRowModel: getCoreRowModel(),
    getRowId: getRowKey,
  });

  /** ---------------- virtualization ---------------- */

  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const headerScrollRef = React.useRef<HTMLDivElement | null>(null);
  const smoothScrollFrameIdsRef = React.useRef<Set<number>>(new Set());
  React.useEffect(
    () => () => {
      smoothScrollFrameIdsRef.current.forEach((frameId) =>
        window.cancelAnimationFrame(frameId)
      );
      smoothScrollFrameIdsRef.current.clear();
    },
    []
  );
  const visibleTableColumns = table.getVisibleLeafColumns();
  const visibleTableColumnsRef = React.useRef(visibleTableColumns);
  visibleTableColumnsRef.current = visibleTableColumns;
  const estimateVirtualColumnSize = React.useCallback(
    (columnIndex: number) =>
      visibleTableColumnsRef.current[columnIndex]?.getSize() ?? 0,
    []
  );
  const getVirtualColumnKey = React.useCallback(
    (columnIndex: number) =>
      visibleTableColumnsRef.current[columnIndex]?.id ?? columnIndex,
    []
  );
  const rowModel = table.getRowModel().rows;
  const headerGroupCount = table.getHeaderGroups().length;
  const stickyHeaderOffset =
    (showHeader ? headerGroupCount * headerHeight : 0) +
    (showHeader && effectiveEnableFiltering
      ? headerGroupCount * filterRowHeight
      : 0);
  const computedMinRowHeight =
    typeof minRowHeight === "number" &&
    Number.isFinite(minRowHeight) &&
    minRowHeight > 0
      ? minRowHeight
      : REACT_DATA_GRID_DEFAULT_PROPS.minRowHeight;
  const computedMaxRowHeight =
    typeof maxRowHeight === "number" &&
    Number.isFinite(maxRowHeight) &&
    maxRowHeight >= computedMinRowHeight
      ? maxRowHeight
      : undefined;
  const resolveRowHeight = React.useCallback(
    (rowIndex: number) =>
      resolveConfiguredRowHeight({
        rowHeight,
        rowIndex,
        minRowHeight: computedMinRowHeight,
        maxRowHeight: computedMaxRowHeight,
      }),
    [computedMaxRowHeight, computedMinRowHeight, rowHeight]
  );
  const initialRowHeight = resolveRowHeight(0);

  const rowVirtualizer = useVirtualizer({
    count: rowModel.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (rowIndex) => resolveRowHeight(rowIndex),
    overscan: 10,
    scrollMargin: stickyHeaderOffset,
    // Keep start-aligned imperative scrolling below the sticky header and
    // filter rows instead of positioning the requested row underneath them.
    scrollPaddingStart: stickyHeaderOffset,
    // Seed a usable range before the desktop viewport observer reports its
    // size, including when returning from the unmounted mobile branch.
    initialRect: { width: 0, height: initialRowHeight * 10 },
    enabled: virtualized && !mobileTransformActive,
  });

  // TanStack Table owns the ordered/visible column model and resolved pixel
  // sizes. TanStack Virtual only decides which of those columns are mounted.
  // Keeping horizontal scroll offset inside the virtualizer avoids rerendering
  // the entire grid from a second, component-level scrollLeft state.
  const columnVirtualizer = useVirtualizer({
    horizontal: true,
    count: visibleTableColumns.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: estimateVirtualColumnSize,
    getItemKey: getVirtualColumnKey,
    overscan: 1,
    initialRect: { width: Math.max(0, columnViewportWidth), height: 0 },
    enabled: computedVirtualizeColumns && !mobileTransformActive,
  });

  const columnWidthMeasurementKey = React.useMemo(
    () =>
      orderedColumns
        .map(
          (column) =>
            `${getColumnId(column)}:${columnWidths[getColumnId(column)]}`
        )
        .join("|"),
    [columnWidths, orderedColumns]
  );
  React.useLayoutEffect(() => {
    if (!computedVirtualizeColumns || mobileTransformActive) return;

    columnVirtualizer.measure();
    const viewport = scrollRef.current;
    if (!viewport) return;

    const frameId = window.requestAnimationFrame(() => {
      const maxScrollLeft = Math.max(
        0,
        columnVirtualizer.getTotalSize() - viewport.clientWidth
      );
      if (viewport.scrollLeft > maxScrollLeft + 1) {
        viewport.scrollLeft = maxScrollLeft;
      }
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [
    columnVirtualizer,
    columnWidthMeasurementKey,
    computedVirtualizeColumns,
    mobileTransformActive,
  ]);
  React.useLayoutEffect(() => {
    if (virtualized && rowHeight == null && !mobileTransformActive) {
      rowVirtualizer.measure();

      // `measure()` clears cached sizes for rows which are currently outside
      // the viewport. Remeasure the mounted rows once after the resulting
      // layout, rather than replacing every row ref on every grid render.
      const frameId = window.requestAnimationFrame(() => {
        scrollRef.current
          ?.querySelectorAll<HTMLElement>('[data-slot="grid-row"][data-index]')
          .forEach((element) => rowVirtualizer.measureElement(element));
      });

      return () => window.cancelAnimationFrame(frameId);
    }
  }, [
    columnWidthMeasurementKey,
    mobileTransformActive,
    rowHeight,
    rowVirtualizer,
    virtualized,
  ]);

  /** ---------------- cell editing ---------------- */

  const editCellNodesRef = React.useRef(
    new Map<string, HTMLTableCellElement>()
  );
  const [editingCell, setEditingCellState] =
    React.useState<GridEditingCell | null>(null);
  const editingCellRef = React.useRef<GridEditingCell | null>(null);
  const editingRowsRef = React.useRef(rowModel);
  const editingColumnsRef = React.useRef(orderedColumns);
  editingRowsRef.current = rowModel;
  editingColumnsRef.current = orderedColumns;

  const editAttemptRef = React.useRef(0);
  const editSessionIdRef = React.useRef(0);
  const editEndingSessionRef = React.useRef<number | null>(null);
  const isInEditRef = React.useRef(false);
  const currentEditCompletePromiseRef = React.useRef<Promise<unknown>>(
    Promise.resolve(true)
  );

  const setEditingCell = React.useCallback((next: GridEditingCell | null) => {
    editingCellRef.current = next;
    isInEditRef.current = next != null;
    setEditingCellState(next);
  }, []);

  const toEditInfo = React.useCallback(
    (
      cell: GridEditingCell,
      options: { includeValue: boolean; value?: unknown }
    ): TypeEditInfo => ({
      rowId: cell.rowId,
      rowIndex: cell.rowIndex,
      columnId: cell.columnId,
      columnIndex: cell.columnIndex,
      ...(options.includeValue
        ? { value: options.value === undefined ? cell.value : options.value }
        : {}),
      data: cell.data,
      column: cell.column,
      cellProps: cell.cellProps,
    }),
    []
  );

  const tryStartCellEdit = React.useCallback(
    async (
      args: GridCellEditStartArgs,
      options?: { replaceActive?: boolean }
    ): Promise<boolean> => {
      const attempt = ++editAttemptRef.current;
      const replaceActive = options?.replaceActive === true;

      const current = editingCellRef.current;
      if (
        !replaceActive &&
        current &&
        String(current.rowId) === String(args.rowId) &&
        current.columnId === args.columnId
      ) {
        return true;
      }
      if (current && !replaceActive) return false;

      const configuredEditable =
        args.column.editable === undefined ? editable : args.column.editable;
      if (!configuredEditable) return false;

      if (typeof configuredEditable === "function") {
        let allowed: boolean | void;
        try {
          allowed = await Promise.resolve(
            configuredEditable(args.value, args.cellProps)
          );
        } catch {
          return false;
        }

        if (attempt !== editAttemptRef.current || !allowed) {
          return false;
        }
      }

      const latestRow = editingRowsRef.current[args.rowIndex];
      const latestColumn = editingColumnsRef.current[args.columnIndex];
      if (
        attempt !== editAttemptRef.current ||
        String(latestRow?.id) !== String(args.rowId) ||
        !latestColumn ||
        getColumnId(latestColumn) !== args.columnId
      ) {
        return false;
      }

      const next: GridEditingCell = {
        sessionId: ++editSessionIdRef.current,
        rowId: args.rowId,
        rowIndex: args.rowIndex,
        columnId: args.columnId,
        columnIndex: args.columnIndex,
        originalValue: args.value,
        value: args.value,
        data: args.data,
        column: args.column,
        initialCellHeight: args.initialCellHeight,
        cellProps: {
          ...args.cellProps,
          editValue: args.value,
          inEdit: true,
        },
      };

      editEndingSessionRef.current = null;
      currentEditCompletePromiseRef.current = Promise.resolve(true);
      setEditingCell(next);
      onEditStart?.(
        toEditInfo(
          { ...next, cellProps: args.cellProps },
          { includeValue: true, value: args.value }
        )
      );
      return true;
    },
    [editable, onEditStart, setEditingCell, toEditInfo]
  );

  // Inovua treats a UI activation on another cell as a direct coordinate
  // replacement. The previous custom editor is not implicitly completed or
  // cancelled; editors that want blur completion call their supplied
  // `onComplete` handler. Keeping this path separate preserves the guarded
  // behavior used by post-completion keyboard navigation.
  const handleUiCellEditStart = React.useCallback(
    (args: GridCellEditStartArgs) =>
      tryStartCellEdit(args, { replaceActive: true }),
    [tryStartCellEdit]
  );

  const getEditStartArgs = React.useCallback(
    (
      rowIndex: number,
      columnIndex: number,
      editValue?: unknown
    ): GridCellEditStartArgs | null => {
      const row = rowModel[rowIndex];
      const column = orderedColumns[columnIndex];
      const cell = row?.getVisibleCells()[columnIndex];
      if (!row || !column || !cell) return null;

      const columnId = getColumnId(column);
      const value = cell.getValue();
      const initialEditValue = editValue === undefined ? value : editValue;
      const itemId = (row.original as any)?.[idProperty];
      const rowId =
        typeof itemId === "string" || typeof itemId === "number"
          ? itemId
          : row.id;
      const cellProps = buildEditCellProps({
        value,
        data: row.original,
        rowIndex,
        remoteRowIndex: loadSkip + rowIndex,
        rowId,
        rowSelected: Boolean(selectedMap[String(row.id)]),
        disabledRow: getDisabledRowState(rowIndex),
        selection: selected,
        multiSelect: Boolean(multiSelect),
        naturalRowHeight: rowHeight == null,
        resolvedRowHeight: resolveRowHeight(rowIndex),
        minRowHeight: computedMinRowHeight,
        column,
        columnId,
        columnIndex,
        columnCount: orderedColumns.length,
        computedWidth: columnWidths[columnId],
        editable,
        editStartEvent,
        theme: themeName,
        totalDataCount: rows.length,
        virtualizeColumns: computedVirtualizeColumns,
      });

      return {
        rowId,
        rowIndex,
        columnId,
        columnIndex,
        value: initialEditValue,
        data: row.original,
        column,
        cellProps,
        initialCellHeight:
          editCellNodesRef.current
            .get(`${String(row.id)}\u0000${columnId}`)
            ?.getBoundingClientRect().height ?? null,
      };
    },
    [
      columnWidths,
      computedMinRowHeight,
      computedVirtualizeColumns,
      editStartEvent,
      editable,
      idProperty,
      getDisabledRowState,
      loadSkip,
      multiSelect,
      orderedColumns,
      resolveRowHeight,
      rowModel,
      rowHeight,
      rows.length,
      selected,
      selectedMap,
      themeName,
    ]
  );
  const getEditStartArgsRef = React.useRef(getEditStartArgs);
  getEditStartArgsRef.current = getEditStartArgs;

  // Inovua anchors an active edit session to its visible coordinates. If a
  // controlled row or column model changes, preserve the session and draft
  // while resolving identity and callback metadata from the new occupant.
  // Model reconciliation itself must not emit edit lifecycle callbacks.
  const reconcileEditingCellToCoordinate = React.useCallback(
    (cell: GridEditingCell | null): GridEditingCell | null => {
      if (!cell) return null;

      const args = getEditStartArgsRef.current(cell.rowIndex, cell.columnIndex);
      if (!args) return cell;

      const targetChanged =
        String(cell.rowId) !== String(args.rowId) ||
        cell.columnId !== args.columnId;

      return {
        ...cell,
        rowId: args.rowId,
        rowIndex: args.rowIndex,
        columnId: args.columnId,
        columnIndex: args.columnIndex,
        originalValue: targetChanged ? args.value : cell.originalValue,
        data: args.data,
        column: args.column,
        initialCellHeight: targetChanged
          ? args.initialCellHeight
          : cell.initialCellHeight,
        cellProps: {
          ...args.cellProps,
          editValue: cell.value,
          inEdit: true,
        },
      };
    },
    []
  );

  const getEditingCellAtCurrentCoordinate = React.useCallback(() => {
    const current = editingCellRef.current;
    const reconciled = reconcileEditingCellToCoordinate(current);

    if (current && reconciled && current.sessionId === reconciled.sessionId) {
      editingCellRef.current = reconciled;
    }

    return reconciled;
  }, [reconcileEditingCellToCoordinate]);

  const coordinateEditingCell = reconcileEditingCellToCoordinate(editingCell);

  React.useLayoutEffect(() => {
    if (
      coordinateEditingCell &&
      editingCellRef.current?.sessionId === coordinateEditingCell.sessionId
    ) {
      editingCellRef.current = coordinateEditingCell;
    }
  }, [coordinateEditingCell]);

  const resolveEditRowIndex = React.useCallback(
    (rowIndex?: number, rowId?: string | number): number => {
      if (rowIndex !== undefined) {
        return typeof rowIndex === "number" &&
          Number.isInteger(rowIndex) &&
          rowIndex >= 0 &&
          rowIndex < rowModel.length
          ? rowIndex
          : -1;
      }

      if (rowId === undefined) return -1;
      return rowModel.findIndex((row) => {
        const itemId = (row.original as any)?.[idProperty];
        const parsedRowId = typeof itemId === "number" ? Number(rowId) : rowId;
        return itemId === parsedRowId;
      });
    },
    [idProperty, rowModel]
  );

  const resolveEditColumnIndex = React.useCallback(
    (columnId: string | number | undefined): number => {
      if (columnId === undefined) return -1;
      if (typeof columnId === "number") {
        return Number.isInteger(columnId) &&
          columnId >= 0 &&
          columnId < orderedColumns.length
          ? columnId
          : -1;
      }
      const normalizedColumnId = String(columnId);
      return orderedColumns.findIndex(
        (column) => getColumnId(column) === normalizedColumnId
      );
    },
    [orderedColumns]
  );

  const getRenderedEditingTarget = React.useCallback(
    (
      rowIndex: number,
      columnIndex: number,
      sessionId: number
    ): GridEditingCell | null => {
      const row = editingRowsRef.current[rowIndex];
      const column = editingColumnsRef.current[columnIndex];
      if (!row || !column) return null;

      const configuredEditable =
        column.editable === undefined ? editable : column.editable;
      if (!configuredEditable) return null;

      const columnId = getColumnId(column);
      const cellKey = `${String(row.id)}\u0000${columnId}`;
      if (!editCellNodesRef.current.has(cellKey)) return null;

      const args = getEditStartArgsRef.current(rowIndex, columnIndex);
      if (!args) return null;

      const liveEdit = getEditingCellAtCurrentCoordinate();
      if (
        liveEdit?.rowIndex === rowIndex &&
        liveEdit.columnIndex === columnIndex
      ) {
        return {
          ...liveEdit,
          rowId: args.rowId,
          rowIndex: args.rowIndex,
          columnId: args.columnId,
          columnIndex: args.columnIndex,
          data: args.data,
          column: args.column,
          cellProps: {
            ...args.cellProps,
            editValue: liveEdit.value,
            inEdit: true,
          },
        };
      }

      return {
        sessionId,
        rowId: args.rowId,
        rowIndex: args.rowIndex,
        columnId: args.columnId,
        columnIndex: args.columnIndex,
        originalValue: args.value,
        value: undefined,
        data: args.data,
        column: args.column,
        cellProps: args.cellProps,
        initialCellHeight: args.initialCellHeight,
      };
    },
    [editable, getEditingCellAtCurrentCoordinate]
  );

  const navigateAfterEdit = React.useCallback(
    async (cell: GridEditingCell, navigation: GridEditNavigation) => {
      const candidates: Array<{ rowIndex: number; columnIndex: number }> = [];

      if (navigation.type === "enter") {
        for (
          let rowIndex = cell.rowIndex + navigation.direction;
          rowIndex >= 0 && rowIndex < rowModel.length;
          rowIndex += navigation.direction
        ) {
          for (
            let columnIndex = cell.columnIndex;
            columnIndex >= 0 && columnIndex < orderedColumns.length;
            columnIndex += navigation.direction
          ) {
            const column = orderedColumns[columnIndex];
            if (
              column &&
              (Boolean(column.editable) ||
                (editable && column.editable !== false))
            ) {
              candidates.push({ rowIndex, columnIndex });
              // Enter uses the first statically eligible column on each row.
              // If its async predicate rejects, Inovua advances to the next
              // row instead of trying another column on this row.
              break;
            }
          }
        }
      } else {
        const columnCount = orderedColumns.length;
        const cellCount = rowModel.length * columnCount;
        let linearIndex =
          cell.rowIndex * columnCount + cell.columnIndex + navigation.direction;

        while (linearIndex >= 0 && linearIndex < cellCount) {
          candidates.push({
            rowIndex: Math.floor(linearIndex / columnCount),
            columnIndex: linearIndex % columnCount,
          });
          linearIndex += navigation.direction;
        }
      }

      for (const candidate of candidates) {
        const args = getEditStartArgs(
          candidate.rowIndex,
          candidate.columnIndex
        );
        if (!args) continue;

        if (virtualized) {
          rowVirtualizer.scrollToIndex(candidate.rowIndex, { align: "auto" });
        }
        if (await tryStartCellEdit(args)) return;
      }

      surfaceRef.current?.focus();
    },
    [
      getEditStartArgs,
      editable,
      orderedColumns,
      rowModel.length,
      rowVirtualizer,
      tryStartCellEdit,
      virtualized,
    ]
  );

  const handleEditValueChange = React.useCallback(
    (value: unknown) => {
      const current = getEditingCellAtCurrentCoordinate();
      if (!current || editEndingSessionRef.current != null) return;

      const next = {
        ...current,
        value,
        cellProps: {
          ...current.cellProps,
          editValue: value,
          inEdit: true,
        },
      };
      setEditingCell(next);
      onEditValueChange?.(toEditInfo(next, { includeValue: true, value }));
    },
    [
      getEditingCellAtCurrentCoordinate,
      onEditValueChange,
      setEditingCell,
      toEditInfo,
    ]
  );

  const handleEditComplete = React.useCallback(
    async (
      navigation?: GridEditNavigation,
      value?: unknown,
      targetCell?: GridEditingCell
    ) => {
      const current = getEditingCellAtCurrentCoordinate();
      if (
        !current ||
        editEndingSessionRef.current === current.sessionId ||
        editEndingSessionRef.current != null
      ) {
        return;
      }

      editAttemptRef.current += 1;
      const sessionId = current.sessionId;
      editEndingSessionRef.current = sessionId;
      const completedCell = {
        ...(targetCell ?? current),
        sessionId,
        value: value === undefined ? (targetCell ?? current).value : value,
      };
      const info = toEditInfo(completedCell, { includeValue: true });
      let resolveCompletion!: (value: unknown) => void;
      let rejectCompletion!: (reason?: unknown) => void;
      const completionPromise = new Promise<unknown>((resolve, reject) => {
        resolveCompletion = resolve;
        rejectCompletion = reject;
      });
      currentEditCompletePromiseRef.current = completionPromise;

      let stopError: unknown;
      try {
        onEditStop?.(info);
      } catch (error) {
        stopError = error;
      }

      if (editingCellRef.current?.sessionId === sessionId) {
        setEditingCell(null);
      }
      surfaceRef.current?.focus();

      if (stopError !== undefined) {
        rejectCompletion(stopError);
      } else {
        try {
          Promise.resolve(onEditComplete?.(info)).then(
            resolveCompletion,
            rejectCompletion
          );
        } catch (error) {
          rejectCompletion(error);
        }
      }

      let completed = false;
      try {
        await completionPromise;
        completed = true;
      } catch {
        completed = false;
      } finally {
        if (editEndingSessionRef.current === sessionId) {
          editEndingSessionRef.current = null;
        }
      }

      if (
        completed &&
        navigation &&
        editSessionIdRef.current === sessionId &&
        editingCellRef.current == null
      ) {
        await navigateAfterEdit(completedCell, navigation);
      }
    },
    [
      getEditingCellAtCurrentCoordinate,
      navigateAfterEdit,
      onEditComplete,
      onEditStop,
      setEditingCell,
      toEditInfo,
    ]
  );

  const handleEditStop = React.useCallback(
    async (navigation?: GridEditNavigation, value?: unknown) => {
      const current = getEditingCellAtCurrentCoordinate();
      editAttemptRef.current += 1;
      if (!current || editEndingSessionRef.current != null) return;

      const sessionId = current.sessionId;
      editEndingSessionRef.current = sessionId;
      const stoppedCell = {
        ...current,
        value: value === undefined ? current.value : value,
      };

      try {
        onEditStop?.(toEditInfo(stoppedCell, { includeValue: true }));
      } finally {
        if (editingCellRef.current?.sessionId === sessionId) {
          setEditingCell(null);
        }
        editEndingSessionRef.current = null;
        currentEditCompletePromiseRef.current = Promise.resolve(true);
      }

      if (navigation) {
        await navigateAfterEdit(stoppedCell, navigation);
      } else {
        surfaceRef.current?.focus();
      }
    },
    [
      getEditingCellAtCurrentCoordinate,
      navigateAfterEdit,
      onEditStop,
      setEditingCell,
      toEditInfo,
    ]
  );

  const handleEditCancel = React.useCallback(
    (targetCell?: GridEditingCell) => {
      editAttemptRef.current += 1;
      const current = getEditingCellAtCurrentCoordinate();
      if (!current || editEndingSessionRef.current != null) return;

      const sessionId = current.sessionId;
      const cancelledCell = targetCell ?? current;
      editEndingSessionRef.current = sessionId;
      try {
        onEditStop?.(toEditInfo(cancelledCell, { includeValue: true }));
        onEditCancel?.(toEditInfo(cancelledCell, { includeValue: false }));
      } finally {
        if (editingCellRef.current?.sessionId === sessionId) {
          setEditingCell(null);
        }
        editEndingSessionRef.current = null;
        currentEditCompletePromiseRef.current = Promise.resolve(true);
      }
      surfaceRef.current?.focus();
    },
    [
      getEditingCellAtCurrentCoordinate,
      onEditCancel,
      onEditStop,
      setEditingCell,
      toEditInfo,
    ]
  );

  const handleCrossTargetEditComplete = React.useCallback(
    (targetCell: GridEditingCell, value?: unknown) => {
      const completedCell = {
        ...targetCell,
        value: value === undefined ? targetCell.value : value,
      };
      isInEditRef.current = false;

      try {
        currentEditCompletePromiseRef.current = Promise.resolve(
          onEditComplete?.(toEditInfo(completedCell, { includeValue: true }))
        );
      } catch (error) {
        const rejectedPromise = Promise.reject(error);
        currentEditCompletePromiseRef.current = rejectedPromise;
        void rejectedPromise.catch(() => undefined);
      }
    },
    [onEditComplete, toEditInfo]
  );

  const handleCrossTargetEditCancel = React.useCallback(
    (targetCell: GridEditingCell) => {
      onEditCancel?.(toEditInfo(targetCell, { includeValue: false }));
      window.setTimeout(() => {
        if (editingCellRef.current) isInEditRef.current = false;
      }, 50);
    },
    [onEditCancel, toEditInfo]
  );

  const startEditCompat = React.useCallback(
    async (args: TypeStartEditArgs): Promise<any> => {
      const columnIndex = resolveEditColumnIndex(args?.columnId);
      if (columnIndex < 0) {
        throw new Error(
          `No column found for columnId: ${String(args?.columnId)}`
        );
      }

      const rowIndex = resolveEditRowIndex(args?.rowIndex, args?.rowId);
      if (rowIndex < 0) throw null;

      if (virtualized) {
        rowVirtualizer.scrollToIndex(rowIndex, { align: "auto" });
      }
      await new Promise<void>((resolve) => window.setTimeout(resolve, 50));

      const liveStartArgs = getEditStartArgsRef.current(
        rowIndex,
        columnIndex,
        args?.value
      );
      if (!liveStartArgs) throw null;

      return (await tryStartCellEdit(liveStartArgs, { replaceActive: true }))
        ? liveStartArgs.value
        : undefined;
    },
    [
      resolveEditColumnIndex,
      resolveEditRowIndex,
      rowVirtualizer,
      tryStartCellEdit,
      virtualized,
    ]
  );

  const tryStartEditCompat = React.useCallback(
    async (args: TypeTryStartEditArgs): Promise<any> => {
      const columnIndex = resolveEditColumnIndex(args?.columnId);
      if (columnIndex < 0) {
        throw new Error(
          `No column found for columnId: ${String(args?.columnId)}`
        );
      }

      const rowIndex = resolveEditRowIndex(args?.rowIndex, args?.rowId);
      if (rowIndex < 0) throw null;

      const direction = args?.dir === 1 || !args?.dir ? 1 : -1;
      if (virtualized) {
        rowVirtualizer.scrollToIndex(rowIndex, { align: "auto" });
      }
      await new Promise<void>((resolve) => window.setTimeout(resolve, 50));

      const columnCount = editingColumnsRef.current.length;
      const cellCount = editingRowsRef.current.length * columnCount;
      let linearIndex = rowIndex * columnCount + columnIndex;

      while (linearIndex >= 0 && linearIndex < cellCount) {
        const candidateRowIndex = Math.floor(linearIndex / columnCount);
        const candidateColumnIndex = linearIndex % columnCount;
        const startArgs = getEditStartArgsRef.current(
          candidateRowIndex,
          candidateColumnIndex
        );

        if (startArgs) {
          if (virtualized) {
            rowVirtualizer.scrollToIndex(candidateRowIndex, { align: "auto" });
          }
          if (await tryStartCellEdit(startArgs, { replaceActive: true })) {
            return startArgs.value;
          }
        }

        linearIndex += direction;
      }

      throw null;
    },
    [
      resolveEditColumnIndex,
      resolveEditRowIndex,
      rowVirtualizer,
      tryStartCellEdit,
      virtualized,
    ]
  );

  const completeEditCompat = React.useCallback(
    (args?: TypeCompleteEditArgs): void => {
      const current = getEditingCellAtCurrentCoordinate();
      if (!current) return;

      let columnIndex = resolveEditColumnIndex(args?.columnId);
      let rowIndex: number | undefined;
      if (columnIndex < 0) {
        columnIndex = current.columnIndex;
        rowIndex = current.rowIndex;
      } else if (args?.rowIndex !== undefined) {
        rowIndex = args.rowIndex;
      } else {
        const resolvedRowIndex = resolveEditRowIndex(undefined, args?.rowId);
        rowIndex = resolvedRowIndex < 0 ? undefined : resolvedRowIndex;
      }

      if (
        rowIndex === undefined ||
        rowIndex < 0 ||
        rowIndex >= editingRowsRef.current.length
      ) {
        return;
      }

      // 5.10.2 accepts `dir` but does not use it. Calling with no object uses
      // its historical empty-string completion value; omitting only `value`
      // from an object preserves the current editor value.
      const value = args === undefined ? "" : args.value;

      if (virtualized) {
        rowVirtualizer.scrollToIndex(rowIndex, { align: "auto" });
      }

      window.setTimeout(() => {
        const target = getRenderedEditingTarget(
          rowIndex,
          columnIndex,
          current.sessionId
        );
        if (!target) return;

        const liveEditBeforeFocus = getEditingCellAtCurrentCoordinate();
        const targetsAnotherCell = Boolean(
          liveEditBeforeFocus &&
          (target.rowIndex !== liveEditBeforeFocus.rowIndex ||
            target.columnIndex !== liveEditBeforeFocus.columnIndex)
        );

        // Inovua focuses the grid before dispatching a completion to another
        // valid cell. Its default text editor completes itself on blur, so
        // this focus produces the current cell's stop + complete lifecycle
        // before the requested target completion. Custom editors without
        // blur completion merely lose focus and remain mounted.
        if (targetsAnotherCell) {
          surfaceRef.current?.focus();
        }

        const liveEdit = getEditingCellAtCurrentCoordinate();
        if (
          !liveEdit ||
          target.rowIndex !== liveEdit.rowIndex ||
          target.columnIndex !== liveEdit.columnIndex
        ) {
          handleCrossTargetEditComplete(target, value);
          return;
        }
        void handleEditComplete(undefined, value, target);
      }, 50);
    },
    [
      getRenderedEditingTarget,
      getEditingCellAtCurrentCoordinate,
      handleCrossTargetEditComplete,
      handleEditComplete,
      resolveEditColumnIndex,
      resolveEditRowIndex,
      rowVirtualizer,
      virtualized,
    ]
  );

  const cancelEditCompat = React.useCallback(
    (args?: TypeCancelEditArgs): void => {
      const current = getEditingCellAtCurrentCoordinate();
      if (!current) return;

      // Inovua's 5.10.2 truthy column check makes numeric index 0 use the
      // current-edit fallback. Other numbers are visible-column indices.
      let columnIndex = args?.columnId
        ? resolveEditColumnIndex(args.columnId)
        : -1;
      let rowIndex = args?.rowIndex;
      if (columnIndex < 0) {
        columnIndex = current.columnIndex;
        rowIndex = current.rowIndex;
      }

      if (rowIndex === undefined) return;
      const target = getRenderedEditingTarget(
        rowIndex,
        columnIndex,
        current.sessionId
      );
      if (!target) return;
      if (
        target.rowIndex !== current.rowIndex ||
        target.columnIndex !== current.columnIndex
      ) {
        handleCrossTargetEditCancel(target);
        return;
      }
      handleEditCancel(target);
    },
    [
      getRenderedEditingTarget,
      getEditingCellAtCurrentCoordinate,
      handleCrossTargetEditCancel,
      handleEditCancel,
      resolveEditColumnIndex,
    ]
  );

  const getCurrentEditInfoCompat =
    React.useCallback((): TypeEditInfo | null => {
      const current = getEditingCellAtCurrentCoordinate();
      return current ? toEditInfo(current, { includeValue: true }) : null;
    }, [getEditingCellAtCurrentCoordinate, toEditInfo]);

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
  const tableMinWidth =
    visibleTableColumns.length > 0 ? table.getTotalSize() : undefined;
  const sharedTableStyle = tableMinWidth
    ? { width: `${tableMinWidth}px` }
    : undefined;
  const columnLayout = React.useMemo(
    () =>
      visibleTableColumns.map((column) => {
        const tableWidth = column.getSize();
        return {
          id: column.id,
          width: Number.isFinite(tableWidth)
            ? tableWidth
            : (columnWidths[column.id] ?? 0),
          minWidth: column.columnDef.minSize,
          maxWidth: column.columnDef.maxSize,
        };
      }),
    [columnWidths, visibleTableColumns]
  );
  const virtualColumnIndexes = computedVirtualizeColumns
    ? columnVirtualizer
        .getVirtualItems()
        .map((virtualColumn) => virtualColumn.index)
    : [];
  const columnRenderRange = buildGridColumnRenderItems({
    columnLayout,
    columns: orderedColumns,
    virtualColumnIndexes,
    virtualizeColumns: computedVirtualizeColumns,
  });
  const columnRenderItems = columnRenderRange.items;
  const lockedEndViewportOffset =
    hasManualColumnWidths && tableMinWidth
      ? Math.max(0, columnViewportWidth - tableMinWidth)
      : 0;
  const lockedColumnLayout = React.useMemo(
    () =>
      buildLockedColumnLayout(
        orderedColumns,
        Object.fromEntries(
          columnLayout.map((column) => [column.id, column.width])
        ),
        lockedEndViewportOffset
      ),
    [columnLayout, lockedEndViewportOffset, orderedColumns]
  );
  const renderedColumnLayout = React.useMemo(() => {
    return columnRenderItems.flatMap((renderItem) => {
      if (renderItem.type === "spacer") {
        return [
          {
            id: renderItem.id,
            width: renderItem.width,
            minWidth: renderItem.width,
            maxWidth: renderItem.width,
          },
        ];
      }

      const column = columnLayout[renderItem.index];
      return column ? [column] : [];
    });
  }, [columnLayout, columnRenderItems]);

  const [resizeProxyLeft, setResizeProxyLeft] = React.useState<number | null>(
    null
  );
  const resizeProxyElementRef = React.useRef<HTMLDivElement | null>(null);
  const resizeProxyFrameRef = React.useRef<number | null>(null);
  const resizeProxyNextLeftRef = React.useRef<number | null>(null);
  const liveColumnResizeFrameRef = React.useRef<number | null>(null);
  const liveColumnResizeNextWidthRef = React.useRef<number | null>(null);
  const [resizingColumnId, setResizingColumnId] = React.useState<string | null>(
    null
  );
  const resizeSessionRef = React.useRef<ColumnResizeSession | null>(null);
  const resizeCleanupRef = React.useRef<(() => void) | null>(null);

  const cancelResizeProxyFrame = React.useCallback(() => {
    if (resizeProxyFrameRef.current != null) {
      window.cancelAnimationFrame(resizeProxyFrameRef.current);
      resizeProxyFrameRef.current = null;
    }
    resizeProxyNextLeftRef.current = null;
  }, []);

  const scheduleResizeProxyPosition = React.useCallback((nextLeft: number) => {
    resizeProxyNextLeftRef.current = nextLeft;
    if (resizeProxyFrameRef.current != null) return;

    resizeProxyFrameRef.current = window.requestAnimationFrame(() => {
      resizeProxyFrameRef.current = null;
      const proxy = resizeProxyElementRef.current;
      const left = resizeProxyNextLeftRef.current;
      if (!proxy || left == null) return;

      proxy.style.transform = `translate3d(${left}px, 0, 0)`;
    });
  }, []);

  const cancelLiveColumnResizeFrame = React.useCallback(() => {
    if (liveColumnResizeFrameRef.current != null) {
      window.cancelAnimationFrame(liveColumnResizeFrameRef.current);
      liveColumnResizeFrameRef.current = null;
    }
    liveColumnResizeNextWidthRef.current = null;
  }, []);

  const scheduleLiveColumnResizePreview = React.useCallback(
    (nextWidth: number) => {
      liveColumnResizeNextWidthRef.current = nextWidth;
      if (liveColumnResizeFrameRef.current != null) return;

      liveColumnResizeFrameRef.current = window.requestAnimationFrame(() => {
        liveColumnResizeFrameRef.current = null;
        const activeSession = resizeSessionRef.current;
        const width = liveColumnResizeNextWidthRef.current;
        liveColumnResizeNextWidthRef.current = null;
        if (!activeSession?.liveColumnResize || width == null) return;

        applyLiveColumnResizePreview(activeSession, width);
      });
    },
    []
  );

  React.useLayoutEffect(() => {
    const activeSession = resizeSessionRef.current;
    const preview = activeSession?.preview;
    if (!activeSession?.liveColumnResize || !preview) return;

    const latestColumn = renderedColumnLayout.find(
      (column) => column.id === activeSession.columnId
    );
    if (!latestColumn) return;

    // React can receive a newer controlled width while a pointer gesture is
    // still active. Keep that latest React-owned geometry as the cancellation
    // baseline, then place the transient pointer preview back on top before
    // paint. This prevents cleanup from restoring a stale drag-start width.
    preview.baseColumnWidth = latestColumn.width;
    for (const column of preview.columns) {
      column.inlineWidth = `${latestColumn.width}px`;
    }

    const latestTableInlineWidth = tableMinWidth ? `${tableMinWidth}px` : "";
    for (const table of preview.tables) {
      table.inlineWidth = latestTableInlineWidth;
      table.renderedWidth =
        tableMinWidth ?? table.element.getBoundingClientRect().width;
    }
    for (const lockedColumn of preview.lockedColumns) {
      for (const cell of lockedColumn.cells) {
        cell.inlineOffset = cell.element.style.getPropertyValue(
          "--tdg-locked-column-offset"
        );
        cell.inlineViewportOffset = cell.element.style.getPropertyValue(
          "--tdg-locked-column-viewport-offset"
        );
      }
    }

    const appliedPreviewWidth = activeSession.appliedPreviewWidth;
    if (appliedPreviewWidth == null) return;

    activeSession.appliedPreviewWidth = null;
    applyLiveColumnResizePreview(activeSession, appliedPreviewWidth);
  }, [renderedColumnLayout, tableMinWidth]);

  const captureRenderedColumnWidths = React.useCallback(() => {
    const headerCells = Array.from(
      headerScrollRef.current?.querySelectorAll<HTMLElement>(
        ".tdg-header-cell"
      ) ?? []
    );
    if (headerCells.length === 0) return null;

    const next: Record<string, number> = {};

    for (const headerCell of headerCells) {
      const columnId = headerCell.dataset.columnId;
      if (!columnId) continue;
      const column = orderedColumns.find(
        (candidate) => getColumnId(candidate) === columnId
      );
      if (!column) continue;
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

  const commitColumnResizeEntries = React.useCallback(
    (
      entries: {
        column: TypeColumn;
        width?: number;
        flex?: number;
      }[],
      nextReservedViewportWidth = reservedViewportWidthRef.current
    ) => {
      const normalizedReservedViewportWidth = Number.isFinite(
        nextReservedViewportWidth
      )
        ? Math.round(nextReservedViewportWidth)
        : reservedViewportWidthRef.current;

      if (
        normalizedReservedViewportWidth !== reservedViewportWidthRef.current
      ) {
        reservedViewportWidthRef.current = normalizedReservedViewportWidth;
        setReservedViewportWidth(normalizedReservedViewportWidth);
      }

      setManualColumnWidths((current) => {
        let changed = false;
        const next = { ...current };

        for (const entry of entries) {
          const columnId = getColumnId(entry.column);
          const controlledWidth =
            typeof entry.column.width === "number" &&
            Number.isFinite(entry.column.width) &&
            entry.column.width > 0;
          const controlledFlex =
            !controlledWidth &&
            typeof entry.column.flex === "number" &&
            Number.isFinite(entry.column.flex) &&
            entry.column.flex > 0;

          if (
            typeof entry.flex === "number" &&
            Number.isFinite(entry.flex) &&
            entry.flex > 0
          ) {
            if (!controlledWidth && !controlledFlex && columnId in next) {
              delete next[columnId];
              changed = true;
            }
            continue;
          }

          if (
            typeof entry.width === "number" &&
            Number.isFinite(entry.width) &&
            !controlledWidth &&
            !controlledFlex &&
            next[columnId] !== entry.width
          ) {
            next[columnId] = entry.width;
            changed = true;
          }
        }

        return changed ? next : current;
      });

      setManualColumnFlexes((current) => {
        let changed = false;
        const next = { ...current };

        for (const entry of entries) {
          const columnId = getColumnId(entry.column);
          const controlledWidth =
            typeof entry.column.width === "number" &&
            Number.isFinite(entry.column.width) &&
            entry.column.width > 0;
          const controlledFlex =
            !controlledWidth && entry.column.flex !== undefined;

          if (controlledWidth || controlledFlex) continue;

          if (
            typeof entry.flex === "number" &&
            Number.isFinite(entry.flex) &&
            entry.flex > 0
          ) {
            if (next[columnId] !== entry.flex) {
              next[columnId] = entry.flex;
              changed = true;
            }
          } else if (
            typeof entry.width === "number" &&
            Number.isFinite(entry.width) &&
            next[columnId] !== null
          ) {
            // Inovua's default no-share resize converts a flex/defaultFlex
            // column to a fixed width unless `keepFlex` is requested. We do
            // not expose keepFlex yet, so a width proposal explicitly turns
            // off the grid-owned defaultFlex value.
            next[columnId] = null;
            changed = true;
          }
        }

        return changed ? next : current;
      });

      for (const entry of entries) {
        onColumnResize?.(entry, {
          reservedViewportWidth: normalizedReservedViewportWidth,
        });
      }
    },
    [onColumnResize]
  );

  const commitColumnPixelResize = React.useCallback(
    (column: TypeColumn, requestedWidth: number) => {
      const columnId = getColumnId(column);
      const { minWidth, maxWidth } = getColumnWidthBounds(column);
      const nextWidth = clamp(requestedWidth, minWidth, maxWidth);
      const currentWidth = columnWidths[columnId] ?? nextWidth;
      const controlledWidth =
        typeof column.width === "number" &&
        Number.isFinite(column.width) &&
        column.width > 0;
      const controlledFlex =
        !controlledWidth &&
        typeof column.flex === "number" &&
        Number.isFinite(column.flex) &&
        column.flex > 0;
      const effectiveFlex = Boolean(
        columnWidthAllocation.flexWeights[columnId]
      );
      const resizeIsGridOwned = !controlledWidth && !controlledFlex;
      const flexColumnCount = Object.keys(
        columnWidthAllocation.flexWeights
      ).length;
      const diff = nextWidth - currentWidth;
      const adjustsAvailableWidth =
        resizeIsGridOwned &&
        diff !== 0 &&
        ((!effectiveFlex && flexColumnCount > 0) ||
          (effectiveFlex && flexColumnCount > 1));
      const nextReservedViewportWidth = adjustsAvailableWidth
        ? reservedViewportWidthRef.current - diff
        : reservedViewportWidthRef.current;
      const resizeEntries: {
        column: TypeColumn;
        width?: number;
        flex?: number;
      }[] = [{ column, width: nextWidth, flex: undefined }];

      if (
        resizeIsGridOwned &&
        flexColumnCount > 0 &&
        (!effectiveFlex || flexColumnCount > 1)
      ) {
        for (const flexColumn of orderedColumns) {
          const flexColumnId = getColumnId(flexColumn);
          if (
            flexColumnId === columnId ||
            !columnWidthAllocation.flexWeights[flexColumnId]
          ) {
            continue;
          }

          const currentFlexWidth = columnWidths[flexColumnId];
          if (
            typeof currentFlexWidth === "number" &&
            Number.isFinite(currentFlexWidth) &&
            currentFlexWidth > 0
          ) {
            resizeEntries.push({
              column: flexColumn,
              width: undefined,
              flex: currentFlexWidth,
            });
          }
        }
      }

      // A pixel drag/autosize uses Inovua's default no-share behavior: an
      // uncontrolled defaultFlex column becomes fixed. A controlled width or
      // flex remains prop-owned, so only the proposal is emitted.
      commitColumnResizeEntries(resizeEntries, nextReservedViewportWidth);
    },
    [
      columnWidthAllocation.flexWeights,
      columnWidths,
      commitColumnResizeEntries,
      orderedColumns,
    ]
  );

  const resizeColumnBy = React.useCallback(
    (columnId: string, diff: number) => {
      const column = orderedColumns.find(
        (candidate) => getColumnId(candidate) === columnId
      );
      if (!column || !Number.isFinite(diff) || diff === 0) return;

      const currentWidth =
        columnWidths[columnId] ?? column.width ?? column.defaultWidth ?? 120;
      commitColumnPixelResize(column, currentWidth + diff);
    },
    [columnWidths, commitColumnPixelResize, orderedColumns]
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

      if (seededWidths) {
        setManualColumnWidths((current) =>
          Object.keys(current).length > 0 ? current : seededWidths
        );
      }
      commitColumnPixelResize(column, nextWidth);

      if (restoreTrailingEdge && bodyViewport) {
        window.requestAnimationFrame(() => {
          bodyViewport.scrollLeft = bodyViewport.scrollWidth;
        });
      }
    },
    [
      autosizeSample,
      commitColumnPixelResize,
      orderedColumns,
      seedManualColumnWidthsFromDom,
      skipHeaderOnAutoSize,
    ]
  );

  const stopColumnResize = React.useCallback(() => {
    const session = resizeSessionRef.current;
    const cleanup = resizeCleanupRef.current;
    resizeCleanupRef.current = null;
    resizeSessionRef.current = null;
    cancelResizeProxyFrame();
    cancelLiveColumnResizeFrame();
    restoreLiveColumnResizePreview(session);
    cleanup?.();
    setResizeProxyLeft(null);
    setResizingColumnId(null);
  }, [cancelLiveColumnResizeFrame, cancelResizeProxyFrame]);

  const startColumnResize = React.useCallback(
    (
      event: React.MouseEvent<HTMLElement> | React.PointerEvent<HTMLElement>,
      columnId: string
    ) => {
      event.preventDefault();
      event.stopPropagation();

      const isPointerEvent = "pointerId" in event;
      const resizeHandle = event.currentTarget;
      const pointerId = isPointerEvent ? event.pointerId : null;
      if (
        event.button !== 0 ||
        (isPointerEvent && !event.isPrimary) ||
        // A real mouse interaction emits pointerdown followed by mousedown.
        // The pointer session owns that gesture, so the compatibility
        // mousedown must not register a second set of listeners or commit it
        // twice.
        resizeSessionRef.current
      ) {
        return;
      }

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
      const preview = liveColumnResize
        ? captureLiveColumnResizePreview(surfaceElement, columnId, startWidth)
        : null;

      headerCell.draggable = false;

      resizeSessionRef.current = {
        columnId,
        column,
        inputType: isPointerEvent ? "pointer" : "mouse",
        pointerId,
        startX: event.clientX,
        startWidth,
        nextWidth: startWidth,
        columnLeft,
        minWidth,
        maxWidth,
        liveColumnResize,
        appliedPreviewWidth: null,
        preview,
      };

      resizeCleanupRef.current?.();

      const previousCursor = document.body.style.cursor;
      const previousUserSelect = document.body.style.userSelect;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      const updateResize = (clientX: number) => {
        const activeSession = resizeSessionRef.current;
        if (!activeSession) return;

        const nextWidth = clamp(
          activeSession.startWidth + (clientX - activeSession.startX),
          activeSession.minWidth,
          activeSession.maxWidth
        );

        activeSession.nextWidth = nextWidth;
        if (activeSession.liveColumnResize) {
          scheduleLiveColumnResizePreview(nextWidth);
        } else {
          scheduleResizeProxyPosition(activeSession.columnLeft + nextWidth);
        }
      };

      const completeResize = () => {
        const completedSession = resizeSessionRef.current;
        const shouldCommit = Boolean(
          completedSession &&
          completedSession.nextWidth !== completedSession.startWidth
        );
        if (completedSession && shouldCommit) {
          // Settle the imperative preview before entering the existing commit
          // path. React applies the grid-owned result in the same event turn;
          // controlled widths therefore return to their prop value unless the
          // consumer supplies the proposal back from `onColumnResize`.
          cancelLiveColumnResizeFrame();
          restoreLiveColumnResizePreview(completedSession);
          commitColumnPixelResize(
            completedSession.column,
            completedSession.nextWidth
          );
        }
        stopColumnResize();

        if (restoreTrailingEdge && bodyViewport) {
          window.requestAnimationFrame(() => {
            bodyViewport.scrollLeft = bodyViewport.scrollWidth;
          });
        }
      };
      const handleMouseMove = (moveEvent: MouseEvent) => {
        const activeSession = resizeSessionRef.current;
        if (!activeSession || activeSession.inputType !== "mouse") return;
        updateResize(moveEvent.clientX);
      };
      const handleMouseUp = (upEvent: MouseEvent) => {
        const activeSession = resizeSessionRef.current;
        if (
          !activeSession ||
          activeSession.inputType !== "mouse" ||
          upEvent.button !== 0
        ) {
          return;
        }
        completeResize();
      };
      const handlePointerMove = (moveEvent: PointerEvent) => {
        const activeSession = resizeSessionRef.current;
        if (
          !activeSession ||
          activeSession.inputType !== "pointer" ||
          activeSession.pointerId !== moveEvent.pointerId
        ) {
          return;
        }
        moveEvent.preventDefault();
        updateResize(moveEvent.clientX);
      };
      const handlePointerUp = (upEvent: PointerEvent) => {
        const activeSession = resizeSessionRef.current;
        if (
          !activeSession ||
          activeSession.inputType !== "pointer" ||
          activeSession.pointerId !== upEvent.pointerId
        ) {
          return;
        }
        completeResize();
      };
      const handlePointerCancel = (cancelEvent: PointerEvent) => {
        const activeSession = resizeSessionRef.current;
        if (
          !activeSession ||
          activeSession.inputType !== "pointer" ||
          activeSession.pointerId !== cancelEvent.pointerId
        ) {
          return;
        }
        stopColumnResize();
      };
      const handleLostPointerCapture = (lostEvent: PointerEvent) => {
        const activeSession = resizeSessionRef.current;
        if (
          !activeSession ||
          activeSession.inputType !== "pointer" ||
          activeSession.pointerId !== lostEvent.pointerId
        ) {
          return;
        }
        stopColumnResize();
      };
      const handleWindowBlur = () => {
        stopColumnResize();
      };

      resizeCleanupRef.current = () => {
        if (pointerId != null && resizeHandle.hasPointerCapture(pointerId)) {
          resizeHandle.releasePointerCapture(pointerId);
        }
        headerCell.draggable = previousDraggable;
        document.body.style.cursor = previousCursor;
        document.body.style.userSelect = previousUserSelect;
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
        window.removeEventListener("pointercancel", handlePointerCancel);
        resizeHandle.removeEventListener(
          "lostpointercapture",
          handleLostPointerCapture
        );
        window.removeEventListener("blur", handleWindowBlur);
      };

      if (isPointerEvent) {
        window.addEventListener("pointermove", handlePointerMove, {
          passive: false,
        });
        window.addEventListener("pointerup", handlePointerUp);
        window.addEventListener("pointercancel", handlePointerCancel);
        resizeHandle.addEventListener(
          "lostpointercapture",
          handleLostPointerCapture
        );
        // Capturing keeps a touch/pen drag alive when the pointer leaves the
        // narrow handle. Window listeners remain the fallback for browsers
        // which reject capture for a synthetic pointer event.
        try {
          resizeHandle.setPointerCapture(event.pointerId);
        } catch {
          // The gesture can still be tracked by the window listeners.
        }
      } else {
        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);
      }
      window.addEventListener("blur", handleWindowBlur);
      setResizingColumnId(columnId);
      cancelResizeProxyFrame();
      cancelLiveColumnResizeFrame();
      if (liveColumnResize) {
        setResizeProxyLeft(null);
      } else {
        const initialProxyLeft = columnLeft + startWidth;
        resizeProxyNextLeftRef.current = initialProxyLeft;
        setResizeProxyLeft(initialProxyLeft);
      }
    },
    [
      cancelLiveColumnResizeFrame,
      cancelResizeProxyFrame,
      commitColumnPixelResize,
      liveColumnResize,
      orderedColumns,
      scheduleLiveColumnResizePreview,
      scheduleResizeProxyPosition,
      seedManualColumnWidthsFromDom,
      showColumnMenuTool,
      stopColumnResize,
    ]
  );

  React.useLayoutEffect(() => {
    return () => {
      const session = resizeSessionRef.current;
      const cleanup = resizeCleanupRef.current;
      resizeCleanupRef.current = null;
      resizeSessionRef.current = null;
      cancelResizeProxyFrame();
      cancelLiveColumnResizeFrame();
      restoreLiveColumnResizePreview(session);
      cleanup?.();
    };
  }, [cancelLiveColumnResizeFrame, cancelResizeProxyFrame]);

  React.useEffect(() => {
    if (!resizingColumnId) return;

    const activeSession = resizeSessionRef.current;
    const resizingColumnExists = orderedColumns.some(
      (column) => getColumnId(column) === resizingColumnId
    );

    if (
      mobileTransformActive ||
      !resizable ||
      !showHeader ||
      !resizingColumnExists ||
      activeSession?.liveColumnResize !== liveColumnResize
    ) {
      stopColumnResize();
    }
  }, [
    liveColumnResize,
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

    const sourceColumn = orderedColumns.find(
      (column) => getColumnId(column) === sourceId
    );
    const targetColumn = orderedColumns.find(
      (column) => getColumnId(column) === targetId
    );
    if (
      !sourceColumn ||
      !targetColumn ||
      resolveColumnLock(sourceColumn) !== resolveColumnLock(targetColumn)
    ) {
      return;
    }

    const next = [...renderColumnOrder];
    const from = next.indexOf(sourceId);
    const to = next.indexOf(targetId);
    if (from < 0 || to < 0) return;

    next.splice(from, 1);
    next.splice(to, 0, sourceId);
    table.setColumnOrder(next);
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
  const onDidMountRef = React.useRef(props.onDidMount);
  const onReadyNotifiedRef = React.useRef(false);
  const handleNotifiedRef = React.useRef(false);

  React.useLayoutEffect(() => {
    onReadyRef.current = props.onReady;
    handleRef.current = props.handle;
    onDidMountRef.current = props.onDidMount;

    return () => {
      onReadyRef.current = undefined;
      handleRef.current = undefined;
      onDidMountRef.current = undefined;
    };
  }, [props.handle, props.onDidMount, props.onReady]);

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
  const computedColumnLayoutMap = React.useMemo(
    () =>
      new Map(
        columnLayout.map((column, visibleIndex) => [
          column.id,
          { ...column, visibleIndex },
        ])
      ),
    [columnLayout]
  );
  const allComputedColumns = React.useMemo<TypeComputedColumn[]>(() => {
    return allInputColumns.map((column, index) => {
      const columnId = getColumnId(column);
      const layout = computedColumnLayoutMap.get(columnId);

      return {
        ...column,
        computedWidth:
          layout?.width ??
          tanstackColumnSizing[columnId] ??
          columnWidths[columnId],
        computedVisibleIndex: layout?.visibleIndex,
        computedLocked: resolveColumnLock(column),
        index,
      };
    });
  }, [
    allInputColumns,
    columnWidths,
    computedColumnLayoutMap,
    tanstackColumnSizing,
  ]);
  const visibleComputedColumns = React.useMemo<TypeComputedColumn[]>(() => {
    return columnLayout.map((layout, visibleIndex) => {
      const columnId = layout.id;
      const computedColumn = allComputedColumns.find(
        (candidate) => getColumnId(candidate) === columnId
      );

      return {
        ...(computedColumn ?? { id: columnId }),
        computedWidth: layout.width,
        computedVisibleIndex: visibleIndex,
      };
    });
  }, [allComputedColumns, columnLayout]);
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
  const lockedStartColumns = React.useMemo(
    () =>
      visibleComputedColumns.filter(
        (column) => column.computedLocked === "start"
      ),
    [visibleComputedColumns]
  );
  const lockedEndColumns = React.useMemo(
    () =>
      visibleComputedColumns.filter(
        (column) => column.computedLocked === "end"
      ),
    [visibleComputedColumns]
  );
  const unlockedColumns = React.useMemo(
    () =>
      visibleComputedColumns.filter(
        (column) => column.computedLocked === false
      ),
    [visibleComputedColumns]
  );
  const columnWidthPrefixSums = React.useMemo(() => {
    const sums: number[] = [];
    let running = 0;

    for (const column of columnLayout) {
      running += column.width;
      sums.push(running);
    }

    return sums;
  }, [columnLayout]);
  const lockedColumnMetrics = React.useMemo(() => {
    const lockedStartCount = visibleComputedColumns.filter(
      (column) => column.computedLocked === "start"
    ).length;
    const lockedEndCount = visibleComputedColumns.filter(
      (column) => column.computedLocked === "end"
    ).length;
    const firstLockedEndIndex =
      lockedEndCount > 0 ? visibleComputedColumns.length - lockedEndCount : -1;
    const firstUnlockedIndex =
      visibleComputedColumns.length - lockedStartCount - lockedEndCount > 0
        ? lockedStartCount
        : -1;
    const lastUnlockedIndex =
      firstUnlockedIndex >= 0
        ? visibleComputedColumns.length - lockedEndCount - 1
        : -1;
    const totalLockedStartWidth = visibleComputedColumns.reduce(
      (total, column) =>
        total +
        (column.computedLocked === "start" ? (column.computedWidth ?? 0) : 0),
      0
    );
    const totalLockedEndWidth = visibleComputedColumns.reduce(
      (total, column) =>
        total +
        (column.computedLocked === "end" ? (column.computedWidth ?? 0) : 0),
      0
    );
    const totalComputedWidth =
      columnWidthPrefixSums[columnWidthPrefixSums.length - 1] ?? 0;

    return {
      hasLockedStart: lockedStartCount > 0,
      hasLockedEnd: lockedEndCount > 0,
      hasUnlocked: firstUnlockedIndex >= 0,
      firstLockedStartIndex: lockedStartCount > 0 ? 0 : -1,
      lastLockedStartIndex: lockedStartCount - 1,
      firstUnlockedIndex,
      lastUnlockedIndex,
      firstLockedEndIndex,
      lastLockedEndIndex:
        lockedEndCount > 0 ? visibleComputedColumns.length - 1 : -1,
      totalLockedStartWidth,
      totalLockedEndWidth,
      totalUnlockedWidth:
        totalComputedWidth - totalLockedStartWidth - totalLockedEndWidth,
    };
  }, [columnWidthPrefixSums, visibleComputedColumns]);
  const columnFlexes = React.useMemo<Record<string, number>>(() => {
    return { ...columnWidthAllocation.flexWeights };
  }, [columnWidthAllocation.flexWeights]);
  const columnSizes = React.useMemo<Record<string, number>>(() => {
    return Object.fromEntries(
      columnLayout.map((column) => [column.id, Number(column.width)])
    );
  }, [columnLayout]);

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
      if (
        !allInputColumns.some(
          (candidate) => getColumnId(candidate) === columnId
        )
      ) {
        return;
      }

      // `hideable` constrains UI affordances, not the Inovua imperative API.
      // Writing the sparse controlled override also avoids TanStack's
      // `getCanHide()` gate for hideable:false columns.
      setColumnVisibilityState((current) => {
        if (current[columnId] === visible) return current;
        return { ...current, [columnId]: visible };
      });
    },
    [allInputColumns, getColumnIdCompat]
  );

  const columnVisibilityIdsRef = React.useRef<ReadonlySet<string>>(new Set());
  columnVisibilityIdsRef.current = new Set(
    allInputColumns.map((column) => getColumnId(column))
  );
  const setColumnVisibleById = React.useCallback(
    (columnId: string, visible: boolean) => {
      if (!columnVisibilityIdsRef.current.has(columnId)) return;

      setColumnVisibilityState((current) => {
        if (current[columnId] === visible) return current;
        return { ...current, [columnId]: visible };
      });
    },
    []
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

  const setSelectedCompat = React.useCallback(
    (nextSelected: TypeRowSelection) => {
      const normalized = unwrapSelectionState(nextSelected);
      emitSelectionChange(normalized, {
        unselected: normalized === true ? unselected : null,
      });
    },
    [emitSelectionChange, unselected]
  );

  const selectAllCompat = selectAllRows;
  const deselectAllCompat = deselectAllRows;

  const setSelectedByIdCompat = React.useCallback(
    (id: string, nextSelected: boolean) => {
      const rowIndex = rows.findIndex(
        (candidate, index) => getRowKey(candidate, index) === id
      );
      if (rowIndex < 0) return;
      commitRowSelection(rowIndex, {
        checked: nextSelected,
        fromCheckbox: true,
      });
    },
    [commitRowSelection, getRowKey, rows]
  );

  const setSelectedAtCompat = React.useCallback(
    (index: number, nextSelected: boolean) => {
      if (!rows[index]) return;
      commitRowSelection(index, {
        checked: nextSelected,
        fromCheckbox: true,
      });
    },
    [commitRowSelection, rows]
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
        const viewport = scrollRef.current;
        if (
          viewport &&
          typeof rowHeight === "number" &&
          Number.isFinite(rowHeight)
        ) {
          const resolvedHeight = resolveRowHeight(index);
          viewport.scrollTop =
            config?.direction === "bottom"
              ? stickyHeaderOffset +
                (index + 1) * resolvedHeight -
                viewport.clientHeight
              : index * resolvedHeight;
        } else {
          rowVirtualizer.scrollToIndex(index, {
            align: config?.direction === "bottom" ? "end" : "start",
          });
        }
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
    [
      resolveRowHeight,
      rowHeight,
      rowVirtualizer,
      stickyHeaderOffset,
      virtualized,
    ]
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
      if (column.computedLocked) {
        callback?.();
        return;
      }
      const columnStart =
        index === 0 ? 0 : (columnWidthPrefixSums[index - 1] ?? 0);
      const columnEnd = columnWidthPrefixSums[index] ?? columnStart;
      const offset = config?.offset ?? 0;
      const lockedStartWidth = lockedColumnMetrics.totalLockedStartWidth;
      const lockedEndWidth = lockedColumnMetrics.totalLockedEndWidth;
      const visibleStart = viewport.scrollLeft + lockedStartWidth + offset;
      const visibleEnd =
        viewport.scrollLeft + viewport.clientWidth - lockedEndWidth - offset;
      let nextScrollLeft = viewport.scrollLeft;

      if (config?.direction === "left" || columnStart < visibleStart) {
        nextScrollLeft = columnStart - lockedStartWidth - offset;
      } else if (config?.direction === "right" || columnEnd > visibleEnd) {
        nextScrollLeft =
          columnEnd - viewport.clientWidth + lockedEndWidth + offset;
      }

      viewport.scrollLeft = Math.min(
        Math.max(0, viewport.scrollWidth - viewport.clientWidth),
        Math.max(0, nextScrollLeft)
      );

      callback?.();
    },
    [columnWidthPrefixSums, lockedColumnMetrics, visibleComputedColumns]
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

  const handleGridFocus = React.useCallback(
    (event: React.FocusEvent<HTMLDivElement>) => {
      onFocusProp?.(event);
      if (event.defaultPrevented) return;

      const relatedTarget = event.relatedTarget;
      if (
        relatedTarget instanceof Node &&
        rootRef.current?.contains(relatedTarget)
      ) {
        return;
      }

      setGridFocused(true);
      if (
        enableKeyboardNavigation &&
        activateRowOnFocus &&
        normalizedActiveIndex < 0 &&
        rows.length > 0
      ) {
        const visibleIndex = getRenderRangeCompat().from;
        const restoredIndex = lastActiveIndexRef.current;
        setActiveIndexCompat(
          restoredIndex != null &&
            restoredIndex >= 0 &&
            restoredIndex < rows.length
            ? restoredIndex
            : clamp(visibleIndex, 0, rows.length - 1)
        );
      }
    },
    [
      activateRowOnFocus,
      enableKeyboardNavigation,
      getRenderRangeCompat,
      normalizedActiveIndex,
      onFocusProp,
      rows.length,
      setActiveIndexCompat,
    ]
  );

  const handleGridBlur = React.useCallback(
    (event: React.FocusEvent<HTMLDivElement>) => {
      const relatedTarget = event.relatedTarget;
      if (
        relatedTarget instanceof Node &&
        rootRef.current?.contains(relatedTarget)
      ) {
        return;
      }

      onBlurProp?.(event);
      if (event.defaultPrevented) return;

      if (normalizedActiveIndex >= 0) {
        lastActiveIndexRef.current = normalizedActiveIndex;
      }
      setGridFocused(false);
      setActiveIndexCompat(-1);
    },
    [normalizedActiveIndex, onBlurProp, setActiveIndexCompat]
  );

  const handleGridKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      onKeyDownProp?.(event);
      if (
        event.defaultPrevented ||
        !enableKeyboardNavigation ||
        rows.length === 0 ||
        isInteractiveClickTarget(event.target as HTMLElement | null)
      ) {
        return;
      }

      const currentIndex =
        normalizedActiveIndex < 0 ? 0 : normalizedActiveIndex;
      const pageStep =
        typeof keyPageStep === "number" && Number.isFinite(keyPageStep)
          ? Math.max(1, Math.trunc(keyPageStep))
          : REACT_DATA_GRID_DEFAULT_PROPS.keyPageStep;
      let handled = true;

      switch (event.key) {
        case "ArrowUp":
          incrementActiveIndex(-1);
          break;
        case "ArrowDown":
          incrementActiveIndex(1);
          break;
        case "Home":
          setActiveIndexCompat(0);
          break;
        case "End":
          setActiveIndexCompat(rows.length - 1);
          break;
        case "PageUp":
          setActiveIndexCompat(currentIndex - pageStep);
          break;
        case "PageDown":
          setActiveIndexCompat(currentIndex + pageStep);
          break;
        case "Enter":
          commitRowSelection(currentIndex, {
            ctrlKey: event.ctrlKey,
            metaKey: event.metaKey,
            shiftKey: event.shiftKey,
          });
          break;
        case "Tab": {
          if (!allowRowTabNavigation) {
            handled = false;
            break;
          }

          const nextIndex = currentIndex + (event.shiftKey ? -1 : 1);
          if (nextIndex < 0 || nextIndex >= rows.length) {
            handled = false;
            break;
          }
          setActiveIndexCompat(nextIndex);
          break;
        }
        default:
          handled = false;
      }

      if (handled) event.preventDefault();
    },
    [
      allowRowTabNavigation,
      commitRowSelection,
      enableKeyboardNavigation,
      incrementActiveIndex,
      keyPageStep,
      normalizedActiveIndex,
      onKeyDownProp,
      rows.length,
      setActiveIndexCompat,
    ]
  );

  const previousScrolledActiveIndexRef = React.useRef(-1);
  React.useLayoutEffect(() => {
    if (!gridFocused || normalizedActiveIndex < 0) return;

    const previousIndex = previousScrolledActiveIndexRef.current;
    previousScrolledActiveIndexRef.current = normalizedActiveIndex;
    if (isRowFullyVisibleCompat(normalizedActiveIndex)) return;

    scrollToIndexCompat(normalizedActiveIndex, {
      direction:
        previousIndex >= 0 && normalizedActiveIndex < previousIndex
          ? "top"
          : "bottom",
    });
  }, [
    gridFocused,
    isRowFullyVisibleCompat,
    normalizedActiveIndex,
    scrollToIndexCompat,
  ]);

  // Non-virtual rows still participate in Inovua's virtual-list compatibility
  // API. Keep their explicit DOM measurements outside React state: the table
  // already lays those rows out naturally, while the imperative getters need
  // to report the same measured sizes immediately after `adjustHeights()`.
  const nonVirtualRowHeightOverridesRef = React.useRef(
    new Map<string, number>()
  );
  React.useEffect(() => {
    const overrides = nonVirtualRowHeightOverridesRef.current;
    if (typeof rowHeight === "number" || virtualized) {
      overrides.clear();
      return;
    }
    if (overrides.size === 0) return;

    const currentRowIds = new Set(rowModel.map((row) => row.id));
    for (const rowId of overrides.keys()) {
      if (!currentRowIds.has(rowId)) overrides.delete(rowId);
    }
  }, [rowHeight, rowModel, virtualized]);
  const getResolvedRowHeightLayout = React.useCallback(() => {
    let start = 0;
    return rowModel.map((row, index) => {
      const size =
        (typeof rowHeight !== "number"
          ? nonVirtualRowHeightOverridesRef.current.get(row.id)
          : undefined) ?? resolveRowHeight(index);
      const item = { index, start, end: start + size, size };
      start += size;
      return item;
    });
  }, [resolveRowHeight, rowHeight, rowModel]);

  const getVirtualListRowsCompat =
    React.useCallback((): TypeComputedVirtualListRow[] => {
      const virtualRows = virtualized
        ? rowVirtualizer.getVirtualItems()
        : getResolvedRowHeightLayout();

      return virtualRows.map((virtualRow) => {
        const row = rowModel[virtualRow.index];
        const start = Math.max(
          0,
          virtualRow.start - (virtualized ? stickyHeaderOffset : 0)
        );
        const end = start + virtualRow.size;

        return {
          id: row?.id ?? virtualRow.index,
          index: virtualRow.index,
          rowIndex: virtualRow.index,
          data: row?.original,
          top: start,
          height: virtualRow.size,
          start,
          end,
        };
      });
    }, [
      getResolvedRowHeightLayout,
      rowModel,
      rowVirtualizer,
      stickyHeaderOffset,
      virtualized,
    ]);

  const getTotalRowHeightCompat = React.useCallback(() => {
    if (virtualized) return rowVirtualizer.getTotalSize();

    const resolvedRowHeightLayout = getResolvedRowHeightLayout();
    return (
      resolvedRowHeightLayout[resolvedRowHeightLayout.length - 1]?.end ?? 0
    );
  }, [getResolvedRowHeightLayout, rowVirtualizer, virtualized]);

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
  >((value, configOrCallback, callback) => {
    const viewport = scrollRef.current;
    if (!viewport || !Number.isFinite(value)) return;

    const config =
      typeof configOrCallback === "function"
        ? undefined
        : (configOrCallback ?? undefined);
    const resolvedCallback =
      typeof configOrCallback === "function" ? configOrCallback : callback;
    const horizontal = config?.orientation === "horizontal";
    const duration = config?.duration ?? 100;
    const initialValue = horizontal ? viewport.scrollLeft : viewport.scrollTop;
    const writeValue = (nextValue: number) => {
      if (horizontal) {
        viewport.scrollLeft = nextValue;
      } else {
        viewport.scrollTop = nextValue;
      }
    };

    if (!Number.isFinite(duration) || duration <= 0 || initialValue === value) {
      writeValue(value);
      resolvedCallback?.(value);
      return;
    }

    const scheduleFrame = (frameCallback: FrameRequestCallback) => {
      let frameId = 0;
      frameId = window.requestAnimationFrame((now) => {
        smoothScrollFrameIdsRef.current.delete(frameId);
        frameCallback(now);
      });
      smoothScrollFrameIdsRef.current.add(frameId);
    };
    const startedAt = window.performance.now();
    const difference = value - initialValue;
    const animate = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      writeValue(initialValue + difference * progress);

      if (progress < 1) {
        scheduleFrame(animate);
        return;
      }

      writeValue(value);
      resolvedCallback?.(value);
    };

    scheduleFrame(animate);
  }, []);

  const refreshVirtualListLayoutCompat = React.useCallback(() => {
    if (virtualized) {
      rowVirtualizer.measure();
    }
  }, [rowVirtualizer, virtualized]);

  const adjustVirtualListHeightsCompat = React.useCallback((): void => {
    // Inovua only performs manual measurement when row height is variable.
    // A numeric value, including a non-finite one, selects fixed-height mode.
    if (typeof rowHeight === "number") return;

    const rowContainer = scrollRef.current ?? surfaceRef.current;
    rowContainer
      ?.querySelectorAll<HTMLElement>('[data-slot="grid-row"][data-row-index]')
      .forEach((element) => {
        const rowIndex = Number(element.dataset.rowIndex);
        const measuredHeight = element.scrollHeight;
        if (
          !Number.isInteger(rowIndex) ||
          rowIndex < 0 ||
          rowIndex >= rowModel.length ||
          !Number.isFinite(measuredHeight) ||
          measuredHeight <= 0
        ) {
          return;
        }

        if (virtualized) {
          // `measureElement()` also registers the node with TanStack's
          // ResizeObserver/cache. Calling it imperatively for function-height
          // rows (which have no ref cleanup) can retain disconnected DOM nodes
          // after scrolling. Inovua reads `scrollHeight`; `resizeItem()` gives
          // us the same explicit measurement without creating an observer.
          rowVirtualizer.resizeItem(rowIndex, measuredHeight);
          return;
        }

        const row = rowModel[rowIndex];
        if (row) {
          nonVirtualRowHeightOverridesRef.current.set(row.id, measuredHeight);
        }
      });
  }, [rowHeight, rowModel, rowVirtualizer, virtualized]);

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
        return virtualRows.find((row) => row.index === index);
      },
      getVisibleCount: getVirtualListVisibleCountCompat,
      getVisibleRange: getVirtualListRangeCompat,
      setRowIndex: (index) => scrollToIndexCompat(index),
      scrollToIndex: scrollToIndexCompat,
      smoothScrollTo: smoothScrollToCompat,
      adjustHeights: adjustVirtualListHeightsCompat,
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
      adjustVirtualListHeightsCompat,
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
      commitColumnResizeEntries(info);
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
      clearAllFilters: () =>
        setFilterValueAndResetPage(
          clearAllFilters(filterValue, { filterTypes })
        ),
      clearColumnFilter: clearColumnFilterCompat,
      getColumnFilterValue: getColumnFilterValueCompat,
      setColumnFilterValue: setColumnFilterValueCompat,
      computedOnColumnFilterValueChange:
        computedOnColumnFilterValueChangeCompat,
      isColumnFiltered: (column) => {
        const entry = getColumnFilterValueCompat(column);
        return Boolean(entry && !isFilterEntryEmptyValue(entry, filterTypes));
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
      setColumnVisible: setColumnVisibleCompat,
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
        if (enableFiltering === undefined) {
          setEnableFilteringOverride((current) =>
            resolveStateAction(
              nextValue,
              current ?? Boolean(filterValue?.length)
            )
          );
        }
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
      computedUnselected: unselected,
      computedRowSelectionEnabled: selectionEnabled,
      computedRowMultiSelectionEnabled: Boolean(multiSelect),
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
      getSelectedCount: (selectionArg, unselectedArg) => {
        if (!selectionEnabled) return 0;
        const normalized = unwrapSelectionState(selectionArg ?? selected);
        if (normalized === true) {
          return Math.max(
            0,
            count -
              Object.keys(toSelectionMap(unselectedArg ?? unselected)).length
          );
        }
        return Object.keys(toSelectionMap(normalized)).length;
      },
      computedSelectedCount:
        unwrapSelectionState(selected) === true
          ? Math.max(0, count - Object.keys(unselected ?? {}).length)
          : Object.keys(selectedMap).length,
      computedUnselectedCount: Object.keys(unselected ?? {}).length,
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
      computedActiveIndex: normalizedActiveIndex,
      computedLastActiveIndex: lastActiveIndexRef.current,
      doSetLastActiveIndex: (index: number | null) => {
        lastActiveIndexRef.current = index;
      },
      computedActiveItem:
        normalizedActiveIndex >= 0 ? rows[normalizedActiveIndex] : null,
      getActiveItem: () =>
        normalizedActiveIndex >= 0 ? rows[normalizedActiveIndex] : null,
      computedHasRowNavigation: enableKeyboardNavigation && rows.length > 0,
      computedFocused: gridFocused,
      setActiveIndex: setActiveIndexCompat,
      incrementActiveIndex,
      computedShowHoverRows: true,
      computedShowZebraRows: showZebraRows,
      setShowZebraRows,
      computedEditable: editable,
      computedEditStartEvent: editStartEvent,
      computedIsEditing: editingCell != null,
      isInEdit: isInEditRef,
      getCurrentEditInfo: getCurrentEditInfoCompat,
      startEdit: startEditCompat,
      tryStartEdit: tryStartEditCompat,
      cancelEdit: cancelEditCompat,
      completeEdit: completeEditCompat,
      currentEditCompletePromise: currentEditCompletePromiseRef,
      computedShowEmptyRows: false,
      lockedStartColumns,
      unlockedColumns,
      lockedEndColumns,
      ...lockedColumnMetrics,
      computedOnColumnResize: ({
        index,
        diff,
      }: {
        index: number;
        diff: number;
      }) => {
        const column = orderedColumns[index];
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

        commitColumnPixelResize(column, nextWidth);
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
      setReservedViewportWidth: (nextValue: React.SetStateAction<number>) => {
        const nextReservedViewportWidth = resolveStateAction(
          nextValue,
          reservedViewportWidthRef.current
        );
        if (!Number.isFinite(nextReservedViewportWidth)) return;

        reservedViewportWidthRef.current = Math.round(
          nextReservedViewportWidth
        );
        setReservedViewportWidth(reservedViewportWidthRef.current);
      },
      reservedViewportWidth,
      virtualizeColumns: computedVirtualizeColumns,
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
    commitColumnPixelResize,
    commitColumnResizeEntries,
    computedVirtualizeColumns,
    computedFilterValueMap,
    computedOnColumnFilterValueChangeCompat,
    count,
    dataSource,
    editable,
    editStartEvent,
    editingCell,
    enableKeyboardNavigation,
    enableFiltering,
    effectiveEnableFiltering,
    filterControlled,
    filterTypes,
    filterValue,
    getColumnByCompat,
    getColumnFilterValueCompat,
    getColumnIdCompat,
    getItemIndexByIdCompat,
    getRenderRangeCompat,
    getRowKey,
    getScrollingElement,
    gridFocused,
    cancelEditCompat,
    completeEditCompat,
    getCurrentEditInfoCompat,
    i18n,
    idProperty,
    incrementActiveIndex,
    incrementScrollLeftCompat,
    incrementScrollTopCompat,
    isRowFullyVisibleCompat,
    isRowRenderedCompat,
    limit,
    loadData,
    loading,
    loadSkip,
    lockedColumnMetrics,
    lockedEndColumns,
    lockedStartColumns,
    multiSelect,
    normalizedActiveIndex,
    openFilterMenuColId,
    orderedColumns,
    originalData,
    pageCount,
    paginationMode,
    publicProps,
    reservedViewportWidth,
    rowModel.length,
    rows,
    safeLimit,
    selected,
    selectedMap,
    selectionEnabled,
    unselected,
    showZebraRows,
    setColumnFilterValueCompat,
    setColumnOrderCompat,
    setColumnVisibleCompat,
    setColumnSortInfoCompat,
    setFilterValueAndResetPage,
    setLimitAndResetPage,
    setSelectedAtCompat,
    setSelectedByIdCompat,
    setSelectedCompat,
    setActiveIndexCompat,
    setShowZebraRows,
    setSkip,
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
    table,
    startEditCompat,
    toggleColumnSortCompat,
    tryStartEditCompat,
    unlockedColumns,
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

  // Preserve Inovua's mount lifecycle: the API is hydrated by the preceding
  // passive effect, then onDidMount observes that live ref before the other
  // imperative lifecycle callbacks. React StrictMode intentionally replays
  // this mount effect in development, just as it does upstream.
  React.useEffect(() => {
    onDidMountRef.current?.(apiRef);
  }, []);

  React.useEffect(() => {
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
  }, [props.handle, props.onReady]);

  /** ---------------- render ---------------- */

  const rowIdPrefix = `tdg-grid-${gridIdRef.current}-row`;

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
        gridFocused
          ? cn(
              "tdg-root--focused InovuaReactDataGrid--focused",
              focusedClassName
            )
          : "",
        className
      )}
      data-theme={themeName}
      data-theme-base={themeBase}
      data-column-resizing={resizingColumnId ? "true" : "false"}
      data-column-width-mode={hasManualColumnWidths ? "fixed" : "stretch"}
      data-show-zebra-rows={showZebraRows ? "true" : "false"}
      data-layout={mobileTransformActive ? "mobile-list" : "table"}
      data-focused={gridFocused ? "true" : "false"}
      data-active-index={
        normalizedActiveIndex >= 0 ? normalizedActiveIndex : "none"
      }
      style={style}
      onKeyDown={handleGridKeyDown}
      onFocus={handleGridFocus}
      onBlur={handleGridBlur}
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
            tabIndex={enableKeyboardNavigation ? 0 : -1}
            aria-label="Data grid"
          >
            {!liveColumnResize && resizeProxyLeft != null ? (
              <div
                ref={resizeProxyElementRef}
                className="InovuaReactDataGrid__resize-proxy"
                aria-hidden="true"
                style={{
                  transform: `translate3d(${resizeProxyLeft}px, 0, 0)`,
                }}
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
                activeIndex={normalizedActiveIndex}
                gridFocused={gridFocused}
                selectionEnabled={selectionEnabled}
                rowIdPrefix={rowIdPrefix}
                rowFocusClassName={rowFocusClassName}
                showActiveRowIndicator={showActiveRowIndicator}
                activeRowIndicatorClassName={activeRowIndicatorClassName}
                isRowDisabled={isRowDisabled}
                i18n={i18n}
                emptyText={props.emptyText}
                sortInfo={sortInfo}
                defaultSortDirection={defaultSortDir}
                searchEnabled={!searchConnected}
                columnPickerEnabled={columnVisibilityController == null}
                authoritativeResultCount={searchConnected ? count : undefined}
                onSortInfoChange={setSortInfoAndResetPage}
                onFilteredRowsCountChange={notifyFilteredRowsCount}
                onRowClick={(id, data, rowIndex, event) =>
                  handleRowClick(id, data, rowIndex, event)
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
                          {renderedColumnLayout.map((column) => (
                            <col
                              key={column.id}
                              data-column-id={column.id}
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
                          onColumnResizeBy={resizeColumnBy}
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
                          onColumnFilterValueChange={onColumnFilterValueChange}
                          filterTypes={filterTypes}
                          openFilterMenuColId={openFilterMenuColId}
                          setOpenFilterMenuColId={setOpenFilterMenuColId}
                          columnRenderItems={columnRenderItems}
                          lockedColumnLayout={lockedColumnLayout}
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
                    {renderedColumnLayout.map((column) => (
                      <col
                        key={column.id}
                        data-column-id={column.id}
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
                    virtualizeColumns={computedVirtualizeColumns}
                    columnRenderItems={columnRenderItems}
                    lockedColumnLayout={lockedColumnLayout}
                    virtualItems={virtualItems}
                    paddingTop={paddingTop}
                    paddingBottom={paddingBottom}
                    stickyHeaderOffset={stickyHeaderOffset}
                    loading={loading}
                    i18n={i18n}
                    emptyText={props.emptyText}
                    selectedMap={selectedMap}
                    activeIndex={normalizedActiveIndex}
                    gridFocused={gridFocused}
                    selectionEnabled={selectionEnabled}
                    rowIdPrefix={rowIdPrefix}
                    rowFocusClassName={rowFocusClassName}
                    showActiveRowIndicator={showActiveRowIndicator}
                    activeRowIndicatorClassName={activeRowIndicatorClassName}
                    getDisabledRowState={getDisabledRowState}
                    onRowClick={(id, data, rowIndex, e) =>
                      handleRowClick(id, data, rowIndex, e)
                    }
                    rowHeight={rowHeight}
                    minRowHeight={computedMinRowHeight}
                    maxRowHeight={computedMaxRowHeight}
                    measureElement={rowVirtualizer.measureElement}
                    rowStyle={rowStyle}
                    rowStyleMetadata={{
                      availableWidth: columnViewportWidth,
                      totalComputedWidth: tableMinWidth ?? 0,
                      remoteRowOffset: loadSkip,
                      columns: visibleComputedColumns,
                      columnRenderCount: columnRenderRange.columnRenderCount,
                      totalColumnCount: visibleComputedColumns.length,
                      virtualizeColumns: computedVirtualizeColumns,
                      columnsMap,
                      dataSourceArray: rows,
                      theme: themeName,
                      multiSelect: Boolean(multiSelect),
                      selection: selected,
                      maxVisibleRows: virtualized
                        ? virtualItems.length
                        : rowModel.length,
                      computedShowCellBorders: showCellBorders,
                      editable,
                      getItemId: (data) => (data as any)?.[idProperty],
                      ...lockedColumnMetrics,
                    }}
                    showZebraRows={showZebraRows}
                    editingCell={coordinateEditingCell}
                    cellNodesRef={editCellNodesRef}
                    editStartEvent={editStartEvent}
                    onCellEditStart={handleUiCellEditStart}
                    onEditValueChange={handleEditValueChange}
                    onEditComplete={handleEditComplete}
                    onEditStop={handleEditStop}
                    onEditCancel={handleEditCancel}
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

Object.defineProperty(
  ReactDataGridWithDefaultProps,
  Symbol.for("@geovi/the-datagrid/column-visibility-target"),
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
