"use client";

import * as React from "react";
import type {
  TypeActiveCell,
  TypeCheckboxColumn,
  TypeColumn,
  TypeComputedColumn,
  TypeComputedColumnsMap,
  TypeComputedProps,
  TypeCellSelection,
  TypeDataGridProps,
  TypeSingleFilterValue,
  TypeFilterValue,
  TypeOnSelectionChangeArg,
  TypeRowProps,
  TypeRowSelection,
  TypeSortInfo,
  TypeShowCellBorders,
} from "../types";

import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { useVirtualizer, type VirtualItem } from "@tanstack/react-virtual";

import { cn } from "../lib/utils";
import { ScrollArea } from "../components/ui/scroll-area";
import {
  DatagridThemeProvider,
  normalizeThemeName,
  resolveThemeBase,
  toThemeClassSuffix,
} from "../theme/context";

import { getColumnId } from "../utils/column";
import { clamp, coerceUserSelect, t } from "../utils/helpers";
import { useControllableState } from "../hooks/useControllableState";
import { useMediaQuery } from "../hooks/useMediaQuery";

import {
  DEFAULT_FILTER_TYPES,
  applyLocalFilter,
  hasActiveLocalFilter,
  normalizeFilterValue,
  resolveFilterValueForColumns,
} from "../filters/utils";

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
  stripFromOrder,
  toSelectionMap,
  unwrapSelectionState,
} from "./utils/gridUtils";

import { GridHeader } from "./components/GridHeader";
import { GridContextMenuLayer } from "./components/GridContextMenuLayer";
import { GridBody } from "./components/GridBody";
import { resolveConfiguredRowHeight } from "./utils/rowHeight";
import { GridPagination } from "./components/GridPagination";
import { MobileGridList } from "./components/MobileGridList";
import {
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "../components/ui/dropdown-menu";
import { allocateColumnWidths } from "./utils/columnSizing";
import {
  buildGridColumnRenderItems,
  buildLockedColumnLayout,
  groupColumnsByLock,
  resolveColumnLock,
} from "./utils/lockedColumns";
import {
  buildColumnGroupHeaderRows,
  buildColumnGroupModel,
} from "./utils/columnGroups";
import {
  DATA_GRID_SEARCH_RUNTIME_SYMBOL,
  getDataGridSearchRuntime,
} from "./searchRuntime";
import {
  EMPTY_COLUMN_GROUPS,
  REACT_DATA_GRID_DEFAULT_PROPS,
  plugins,
  type ReactDataGridDefaultProps,
} from "./gridDefaultProps";
import {
  allocateGridId,
  getPublicProps,
  resolveStateAction,
  type InternalDataGridProps,
} from "./internalProps";
import { GridLoadingLayer } from "./components/GridLoadingLayer";
import { getLogicalScrollLeft, setLogicalScrollLeft } from "./utils/rtlScroll";
import { equalRowHeights, normalizeRowHeightsMap } from "./utils/rowHeightsMap";
import {
  createSpanAwareRangeExtractor,
  type TypeSpanInterval,
} from "./utils/spanRangeExtractor";
import {
  ensureLastColumnHeaderFits,
  getColumnWidthBounds,
  resolveBaseColumnWidth,
} from "./utils/columnWidthEstimation";
import { useGridColumnDefs } from "./hooks/useGridColumnDefs";
import { useGridColumnResize } from "./hooks/useGridColumnResize";
import { useGridDataLoader } from "./hooks/useGridDataLoader";
import { useGridEditing } from "./hooks/useGridEditing";
import { useGridKeyboardNavigation } from "./hooks/useGridKeyboardNavigation";
import { useGridColumnApi } from "./hooks/useGridColumnApi";
import { useGridContextMenuLayers } from "./hooks/useGridContextMenuLayers";
import { useGridContextMenus } from "./hooks/useGridContextMenus";
import { useGridHeaderReorder } from "./hooks/useGridHeaderReorder";
import { useGridImperativeApi } from "./hooks/useGridImperativeApi";
import { useGridColumnSizingApi } from "./hooks/useGridColumnSizingApi";
import { useGridPaginationApi } from "./hooks/useGridPaginationApi";
import { useGridRowApi } from "./hooks/useGridRowApi";
import { useGridScrollApi } from "./hooks/useGridScrollApi";
import { useGridSelection } from "./hooks/useGridSelection";
import { useGridToolbarBridge } from "./hooks/useGridToolbarBridge";
import { useGridVirtualListApi } from "./hooks/useGridVirtualListApi";

export { plugins };

const EMPTY_VIRTUAL_ITEMS: VirtualItem[] = [];

type ReactDataGridComponent = React.FunctionComponent<TypeDataGridProps> & {
  defaultProps: ReactDataGridDefaultProps;
};

function ReactDataGrid(props: TypeDataGridProps) {
  const internalProps = props as InternalDataGridProps;
  const searchController = internalProps.__rdgSearchController;
  const toolbarController = internalProps.__rdgToolbarController;
  const searchConnected = searchController != null;
  const optionalControllerConnected =
    searchConnected || toolbarController != null;
  // Optional entries use private props as zero-dependency bridges. Keep those
  // bridges out of every consumer-facing props mirror and remote-source args.
  const publicProps: InternalDataGridProps = optionalControllerConnected
    ? getPublicProps(internalProps)
    : internalProps;
  const searchValue = searchController?.value ?? "";
  const searchFilterRows = searchController?.filterRows;
  const searchActive = searchValue.trim().length > 0;
  const loadRequestIdRef = React.useRef(0);
  const loadAbortControllerRef = React.useRef<AbortController | null>(null);
  const apiRef = React.useRef<TypeComputedProps | null>(null);

  const {
    theme = REACT_DATA_GRID_DEFAULT_PROPS.theme,
    idProperty = REACT_DATA_GRID_DEFAULT_PROPS.idProperty,
    columns: inputColumns,
    dataSource,
    groups = EMPTY_COLUMN_GROUPS,
    allowGroupSplitOnReorder = REACT_DATA_GRID_DEFAULT_PROPS.allowGroupSplitOnReorder,
    onColumnVisibleChange,
    sortable = REACT_DATA_GRID_DEFAULT_PROPS.sortable,
    sortFunctions = REACT_DATA_GRID_DEFAULT_PROPS.sortFunctions,
    renderSortTool,
    scrollTopOnSort = REACT_DATA_GRID_DEFAULT_PROPS.scrollTopOnSort,
    scrollTopOnFilter = REACT_DATA_GRID_DEFAULT_PROPS.scrollTopOnFilter,

    enableColumnFilterContextMenu = REACT_DATA_GRID_DEFAULT_PROPS.enableColumnFilterContextMenu,
    renderColumnFilterContextMenu,
    columnFilterContextMenuAlignPositions = REACT_DATA_GRID_DEFAULT_PROPS.columnFilterContextMenuAlignPositions,
    columnFilterContextMenuConstrainTo = REACT_DATA_GRID_DEFAULT_PROPS.columnFilterContextMenuConstrainTo,
    columnFilterContextMenuPosition = REACT_DATA_GRID_DEFAULT_PROPS.columnFilterContextMenuPosition,
    updateMenuPositionOnScroll = REACT_DATA_GRID_DEFAULT_PROPS.updateMenuPositionOnScroll,
    renderColumnContextMenu,
    columnContextMenuAlignPositions = REACT_DATA_GRID_DEFAULT_PROPS.columnContextMenuAlignPositions,
    columnContextMenuConstrainTo = REACT_DATA_GRID_DEFAULT_PROPS.columnContextMenuConstrainTo,
    columnContextMenuPosition = REACT_DATA_GRID_DEFAULT_PROPS.columnContextMenuPosition,
    renderRowContextMenu,
    onRowContextMenu,
    rowContextMenuAlignPositions = REACT_DATA_GRID_DEFAULT_PROPS.rowContextMenuAlignPositions,
    rowContextMenuConstrainTo = REACT_DATA_GRID_DEFAULT_PROPS.rowContextMenuConstrainTo,
    rowContextMenuPosition = REACT_DATA_GRID_DEFAULT_PROPS.rowContextMenuPosition,
    updateMenuPositionOnColumnsChange = REACT_DATA_GRID_DEFAULT_PROPS.updateMenuPositionOnColumnsChange,

    enableColumnAutosize = REACT_DATA_GRID_DEFAULT_PROPS.enableColumnAutosize,
    skipHeaderOnAutoSize = REACT_DATA_GRID_DEFAULT_PROPS.skipHeaderOnAutoSize,
    resizable = REACT_DATA_GRID_DEFAULT_PROPS.resizable,
    liveColumnResize = REACT_DATA_GRID_DEFAULT_PROPS.liveColumnResize,
    columnDefaultWidth = REACT_DATA_GRID_DEFAULT_PROPS.columnDefaultWidth,
    columnMinWidth = REACT_DATA_GRID_DEFAULT_PROPS.columnMinWidth,
    columnMaxWidth = REACT_DATA_GRID_DEFAULT_PROPS.columnMaxWidth,
    shareSpaceOnResize = REACT_DATA_GRID_DEFAULT_PROPS.shareSpaceOnResize,
    columnResizeHandleWidth = REACT_DATA_GRID_DEFAULT_PROPS.columnResizeHandleWidth,
    columnResizeProxyWidth = REACT_DATA_GRID_DEFAULT_PROPS.columnResizeProxyWidth,

    enableFiltering,
    onColumnFilterValueChange,

    filteredRowsCount,

    virtualized = REACT_DATA_GRID_DEFAULT_PROPS.virtualized,
    virtualizeColumnsThreshold = REACT_DATA_GRID_DEFAULT_PROPS.virtualizeColumnsThreshold,
    virtualizeColumns,
    nativeScroll = REACT_DATA_GRID_DEFAULT_PROPS.nativeScroll,
    scrollProps = REACT_DATA_GRID_DEFAULT_PROPS.scrollProps,
    initialScrollTop,
    initialScrollLeft,
    onScroll,
    rtl = REACT_DATA_GRID_DEFAULT_PROPS.rtl,
    allowMobileTransform = REACT_DATA_GRID_DEFAULT_PROPS.allowMobileTransform,
    columnUserSelect = REACT_DATA_GRID_DEFAULT_PROPS.columnUserSelect,
    showCellBorders:
      showCellBordersProp = REACT_DATA_GRID_DEFAULT_PROPS.showCellBorders,

    i18n,
    showColumnMenuTool = REACT_DATA_GRID_DEFAULT_PROPS.showColumnMenuTool,

    rowHeight = REACT_DATA_GRID_DEFAULT_PROPS.rowHeight,
    rowHeights: controlledRowHeights,
    defaultRowHeights,
    onRowHeightsChange,
    onUpdateRowHeights,
    minRowHeight = REACT_DATA_GRID_DEFAULT_PROPS.minRowHeight,
    maxRowHeight,
    rowStyle,
    rowProps,
    rowClassName,
    renderRow,
    onRenderRow,
    onRowClick,
    onRowDoubleClick,
    onCellClick,
    onCellDoubleClick,
    cellDOMProps,
    headerDOMProps,
    showHoverRows:
      showHoverRowsProp = REACT_DATA_GRID_DEFAULT_PROPS.showHoverRows,
    showEmptyRows:
      showEmptyRowsProp = REACT_DATA_GRID_DEFAULT_PROPS.showEmptyRows,
    showZebraRows: controlledShowZebraRows,
    defaultShowZebraRows,
    editable = false,
    editStartEvent = REACT_DATA_GRID_DEFAULT_PROPS.editStartEvent,
    isStartEditKeyPressed = REACT_DATA_GRID_DEFAULT_PROPS.isStartEditKeyPressed,
    autoFocusOnEditComplete = REACT_DATA_GRID_DEFAULT_PROPS.autoFocusOnEditComplete,
    autoFocusOnEditEscape = REACT_DATA_GRID_DEFAULT_PROPS.autoFocusOnEditEscape,
    onEditStart,
    onEditStop,
    onEditComplete,
    onEditCancel,
    onEditValueChange,
    onColumnResize,
    onBatchColumnResize,
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
    activeCell: controlledActiveCell,
    defaultActiveCell,
    onActiveCellChange,
    activeCellThrottle,
    cellSelection: controlledCellSelection,
    defaultCellSelection,
    onCellSelectionChange,
    cellSelectionByIndex = REACT_DATA_GRID_DEFAULT_PROPS.cellSelectionByIndex,
    toggleCellSelectOnClick = REACT_DATA_GRID_DEFAULT_PROPS.toggleCellSelectOnClick,
    rowFocusClassName,
    focusedClassName,
    showActiveRowIndicator = REACT_DATA_GRID_DEFAULT_PROPS.showActiveRowIndicator,
    activeRowIndicatorClassName,
    onDidMount,
    handle,
    onReady,

    className,
    style,
    onKeyDown: onKeyDownProp,
    onFocus: onFocusProp,
    onBlur: onBlurProp,
  } = props;
  const [uncontrolledRowHeights, setUncontrolledRowHeights] = React.useState<
    Record<string, number>
  >(() => ({ ...(defaultRowHeights ?? {}) }));
  const configuredRowHeights =
    controlledRowHeights === undefined
      ? uncontrolledRowHeights
      : controlledRowHeights;
  const configuredColumnMinWidth =
    typeof columnMinWidth === "number" &&
    Number.isFinite(columnMinWidth) &&
    columnMinWidth >= 0
      ? columnMinWidth
      : REACT_DATA_GRID_DEFAULT_PROPS.columnMinWidth;
  const configuredColumnMaxWidth =
    typeof columnMaxWidth === "number" &&
    Number.isFinite(columnMaxWidth) &&
    columnMaxWidth >= 0
      ? columnMaxWidth
      : null;
  const [computedColumnMinWidth, computedColumnMaxWidth] =
    configuredColumnMaxWidth != null &&
    configuredColumnMinWidth > configuredColumnMaxWidth
      ? [configuredColumnMaxWidth, configuredColumnMinWidth]
      : [configuredColumnMinWidth, configuredColumnMaxWidth];
  const computedColumnDefaultWidth = clamp(
    typeof columnDefaultWidth === "number" &&
      Number.isFinite(columnDefaultWidth) &&
      columnDefaultWidth > 0
      ? columnDefaultWidth
      : REACT_DATA_GRID_DEFAULT_PROPS.columnDefaultWidth,
    computedColumnMinWidth,
    computedColumnMaxWidth ?? Number.MAX_SAFE_INTEGER
  );
  const computedColumnResizeHandleWidth = clamp(
    typeof columnResizeHandleWidth === "number" &&
      Number.isFinite(columnResizeHandleWidth)
      ? Math.round(columnResizeHandleWidth)
      : REACT_DATA_GRID_DEFAULT_PROPS.columnResizeHandleWidth,
    2,
    40
  );
  const computedColumnResizeProxyWidth = clamp(
    typeof columnResizeProxyWidth === "number" &&
      Number.isFinite(columnResizeProxyWidth)
      ? Math.round(columnResizeProxyWidth)
      : REACT_DATA_GRID_DEFAULT_PROPS.columnResizeProxyWidth,
    1,
    25
  );
  // Track + margin of an overlay vertical scrollbar, resolved as `ScrollArea`
  // resolves it. `runtime.css` needs it to pull the trailing resize handle
  // clear of the bar, and `scrollProps` can change it.
  const computedVerticalScrollbarFootprint =
    (scrollProps?.scrollThumbOverWidth ?? scrollProps?.scrollThumbWidth ?? 10) +
    (scrollProps?.scrollThumbMargin ?? 0);
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
  const gridIdRef = React.useRef<number>(allocateGridId());
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
  const [showCellBorders, setShowCellBorders] =
    React.useState<TypeShowCellBorders>(showCellBordersProp);
  const [showHoverRows, setShowHoverRows] = React.useState(showHoverRowsProp);
  const [showEmptyRows, setShowEmptyRows] = React.useState(showEmptyRowsProp);
  React.useEffect(() => {
    setShowCellBorders(showCellBordersProp);
  }, [showCellBordersProp]);
  React.useEffect(() => {
    setShowHoverRows(showHoverRowsProp);
  }, [showHoverRowsProp]);
  React.useEffect(() => {
    setShowEmptyRows(showEmptyRowsProp);
  }, [showEmptyRowsProp]);
  const showHorizontalCellBorders =
    showCellBorders === true || showCellBorders === "horizontal";
  const showVerticalCellBorders =
    showCellBorders === true || showCellBorders === "vertical";

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

  const cellSelectionEnabled =
    controlledCellSelection !== undefined ||
    defaultCellSelection !== undefined ||
    controlledActiveCell !== undefined ||
    defaultActiveCell !== undefined;
  const cellMultiSelect = props.multiSelect !== false;
  const [activeCellState, setActiveCellState] =
    useControllableState<TypeActiveCell>({
      value: controlledActiveCell,
      defaultValue: defaultActiveCell ?? null,
      onChange: onActiveCellChange,
    });
  const [cellSelectionState, setCellSelectionState] =
    useControllableState<TypeCellSelection>({
      value: controlledCellSelection,
      defaultValue: defaultCellSelection ?? null,
      onChange: onCellSelectionChange,
    });
  const cellSelectionAnchorRef = React.useRef<TypeActiveCell>(null);
  const pendingActiveCellRef = React.useRef<TypeActiveCell>(null);
  const activeCellThrottleTimerRef = React.useRef<number | null>(null);

  React.useEffect(
    () => () => {
      if (activeIndexThrottleTimerRef.current != null) {
        window.clearTimeout(activeIndexThrottleTimerRef.current);
      }
      if (activeCellThrottleTimerRef.current != null) {
        window.clearTimeout(activeCellThrottleTimerRef.current);
      }
    },
    []
  );

  const lastSelectedIndexRef = React.useRef<number | null>(null);
  const selectionRangeBaseRef = React.useRef<Record<string, any> | null>(null);
  const lastPointerRef = React.useRef<{ shiftKey: boolean }>({
    shiftKey: false,
  });

  // Read off props once, so the callback below depends on this one function
  // rather than on the whole `props` object.
  const onSelectionChange = props.onSelectionChange;
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

      onSelectionChange?.({
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
      // Depends on the one callback this reads, not the whole props object. A
      // parent re-render always mints a new `props`, which rebuilt this while
      // the row-height callbacks (keyed on `rowModel`) stayed cached — and the
      // opposite happened on sort. Alternating the two left every render's
      // scope holding a callback from a different render, so no generation was
      // ever collectable.
      onSelectionChange,
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
  const initialColumnVisibilityRef = React.useRef<Record<string, boolean>>({});
  for (const column of allInputColumns) {
    const columnId = getColumnId(column);
    if (
      Object.prototype.hasOwnProperty.call(
        initialColumnVisibilityRef.current,
        columnId
      )
    ) {
      continue;
    }

    initialColumnVisibilityRef.current[columnId] =
      column.visible !== false &&
      column.defaultVisible !== false &&
      column.defaultHidden !== true;
  }
  const [columnVisibilityState, setColumnVisibilityState] = React.useState<
    Record<string, boolean>
  >({});
  const uncontrolledVisibilityColumnIds = React.useMemo(
    () =>
      new Set(
        allInputColumns
          .filter((column) => column.visible === undefined)
          .map((column) => getColumnId(column))
      ),
    [allInputColumns]
  );
  React.useEffect(() => {
    setColumnVisibilityState((current) => {
      const nextEntries = Object.entries(current).filter(([columnId]) =>
        uncontrolledVisibilityColumnIds.has(columnId)
      );

      if (nextEntries.length === Object.keys(current).length) {
        return current;
      }

      return Object.fromEntries(nextEntries);
    });
  }, [uncontrolledVisibilityColumnIds]);
  const columnVisibilityMap = React.useMemo(() => {
    const uncontrolledOverrides = Object.fromEntries(
      Object.entries(columnVisibilityState).filter(([columnId]) =>
        uncontrolledVisibilityColumnIds.has(columnId)
      )
    );

    return projectTanStackColumnVisibility(
      allInputColumns,
      uncontrolledOverrides,
      initialColumnVisibilityRef.current
    );
  }, [allInputColumns, columnVisibilityState, uncontrolledVisibilityColumnIds]);

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
            props.defaultColumnOrder ?? defaultColumnOrder,
            checkboxColId
          ) ?? defaultColumnOrder)
        : (props.defaultColumnOrder ?? defaultColumnOrder),
    [
      checkboxColId,
      checkboxEnabled,
      defaultColumnOrder,
      props.defaultColumnOrder,
    ]
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

  const [sortInfo, setSortInfo, sortControlled] =
    useControllableState<TypeSortInfo>({
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
  const setEnableFilteringCompat = React.useCallback(
    (nextValue: React.SetStateAction<boolean>) => {
      if (enableFiltering !== undefined) return;
      setEnableFilteringOverride((current) =>
        resolveStateAction(nextValue, current ?? Boolean(filterValue?.length))
      );
    },
    [enableFiltering, filterValue?.length]
  );

  // Inovua 5.10.2 only transforms a local data source with its uncontrolled
  // filter state (`defaultFilterValue` and subsequent internal changes).
  // A controlled `filterValue` is supplied to remote loaders and rendered in
  // the filter row, but does not mutate an array data source. This predicate
  // is deliberately independent from filter-row visibility: explicitly
  // hiding the row does not discard an uncontrolled default filter.
  const localFilterValue = filterControlled ? null : filterValue;
  const activeLocalFilter = React.useMemo(
    () =>
      hasActiveLocalFilter(
        resolveFilterValueForColumns(localFilterValue, allInputColumns),
        filterTypes
      ),
    [allInputColumns, filterTypes, localFilterValue]
  );
  // Inovua 5.10.2 uses controlled sortInfo for the UI and remote request
  // payload, but leaves an array dataSource in consumer order. Only
  // uncontrolled/default sorting owns the local transformation.
  const localSortInfo = sortControlled ? null : sortInfo;

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

  const paginationMode = props.pagination ?? false;
  const paginationEnabled = paginationMode !== false;
  const remoteDataSource = !Array.isArray(dataSource);
  const remotePagination =
    paginationMode === "remote" ||
    (paginationMode === true && remoteDataSource);
  const localPagination =
    paginationMode === "local" ||
    (paginationMode === true && !remoteDataSource);

  const [skip, setSkipState, skipControlled] = useControllableState<number>({
    value: props.skip,
    defaultValue: props.defaultSkip ?? 0,
    onChange: props.onSkipChange,
  });

  // Filtering, sorting, and global search all own a page-one reset. For a
  // controlled skip, retain an optimistic request value until the parent
  // acknowledges the reset (or intentionally supplies another page). This
  // prevents replacement renders from loading the stale page in between the
  // callback and the controlled prop update.
  const previousSearchValueRef = React.useRef("");
  const previousSortInfoRef = React.useRef<TypeSortInfo>(sortInfo);
  const previousFilterValueRef = React.useRef<TypeFilterValue>(filterValue);
  const [skipResetOverride, setSkipResetOverride] = React.useState<{
    previousSkip: number;
  } | null>(null);
  const paginationInputChanged =
    previousSearchValueRef.current !== searchValue ||
    !Object.is(previousSortInfoRef.current, sortInfo) ||
    !Object.is(previousFilterValueRef.current, filterValue);
  const skipResetOverrideActive = Boolean(
    skipResetOverride?.previousSkip === skip
  );
  const loadSkip =
    paginationEnabled && (paginationInputChanged || skipResetOverrideActive)
      ? 0
      : skip;
  const setSkip = React.useCallback(
    (nextSkip: number) => {
      setSkipResetOverride(null);
      setSkipState(nextSkip);
    },
    [setSkipState]
  );
  const resetSkip = React.useCallback(() => {
    if (skip === 0) return;

    loadRequestIdRef.current += 1;
    if (skipControlled) {
      setSkipResetOverride({ previousSkip: skip });
    }
    setSkipState(0);
  }, [setSkipState, skip, skipControlled]);

  React.useLayoutEffect(() => {
    const inputsChanged =
      previousSearchValueRef.current !== searchValue ||
      !Object.is(previousSortInfoRef.current, sortInfo) ||
      !Object.is(previousFilterValueRef.current, filterValue);

    previousSearchValueRef.current = searchValue;
    previousSortInfoRef.current = sortInfo;
    previousFilterValueRef.current = filterValue;

    if (
      paginationEnabled &&
      inputsChanged &&
      skip !== 0 &&
      !skipResetOverrideActive
    ) {
      resetSkip();
      return;
    }

    if (skipResetOverride && skipResetOverride.previousSkip !== skip) {
      setSkipResetOverride(null);
    }
  }, [
    filterValue,
    paginationEnabled,
    resetSkip,
    searchValue,
    skip,
    skipResetOverride,
    skipResetOverrideActive,
    sortInfo,
  ]);

  const [limit, setLimit] = useControllableState<number>({
    value: props.limit,
    defaultValue: props.defaultLimit ?? pageSizes[0] ?? 10,
    onChange: props.onLimitChange,
  });

  const allowUnsort = props.allowUnsort ?? true;
  const defaultSortingDirection = props.defaultSortingDirection ?? "asc";
  const defaultSortDir: 1 | -1 = defaultSortingDirection === "desc" ? -1 : 1;

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
  const columnGroupModel = React.useMemo(
    () =>
      buildColumnGroupModel({
        groups,
        columns: orderedColumns,
      }),
    [groups, orderedColumns]
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
  const getItemId = React.useCallback(
    (data: any) => data?.[idProperty],
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
  const {
    columnOrderForDs,
    controlledLoadingRef,
    loading,
    loadingStore,
    reload,
  } = useGridDataLoader({
    activeLocalFilter,
    apiRef,
    checkboxColId,
    checkboxEnabled,
    controlledLoading: props.loading,
    dataSource,
    draftFilterValue,
    effectiveColumnOrder,
    filterTypes,
    filterValue,
    idProperty,
    inputColumns,
    limit,
    loadAbortControllerRef,
    loadRequestIdRef,
    loadSkip,
    localFilterValue,
    localPagination,
    localSortInfo,
    notifyFilteredRowsCount,
    orderedColumns,
    paginationMode,
    remoteDataSource,
    remotePagination,
    searchActive,
    searchConnected,
    searchFilterRows,
    searchValue,
    setCount,
    setFilterValue,
    setRows,
    sortFunctions,
    sortInfo,
    themeName,
  });

  const autosizeSample = React.useMemo(() => {
    if (Array.isArray(dataSource)) {
      // Search commits load rows in an effect. Reuse that processed result for
      // autosizing so a large index is never built synchronously during render
      // (and the same query is not scanned a second time).
      if (searchActive) {
        return rows.slice(0, 25);
      }

      let data = dataSource;

      if (activeLocalFilter) {
        data = applyLocalFilter(data, localFilterValue, {
          filterTypes,
          columns: allInputColumns,
        });
      }

      return data.slice(0, 25);
    }

    return rows.slice(0, 25);
  }, [
    activeLocalFilter,
    allInputColumns,
    dataSource,
    filterTypes,
    localFilterValue,
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
        columnDefaultWidth: computedColumnDefaultWidth,
        columnMinWidth: computedColumnMinWidth,
        columnMaxWidth: computedColumnMaxWidth,
      });
    }

    return next;
  }, [
    autosizeSample,
    computedColumnDefaultWidth,
    computedColumnMaxWidth,
    computedColumnMinWidth,
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

        const { minWidth, maxWidth } = getColumnWidthBounds(
          column,
          computedColumnMinWidth,
          computedColumnMaxWidth
        );
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
  }, [computedColumnMaxWidth, computedColumnMinWidth, orderedColumns]);

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
      defaultWidth: computedColumnDefaultWidth,
      defaultMinWidth: computedColumnMinWidth,
      defaultMaxWidth: computedColumnMaxWidth ?? Number.MAX_SAFE_INTEGER,
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
          baseWidth:
            next[lastColumnId] ??
            autosizedWidths[lastColumnId] ??
            computedColumnDefaultWidth,
          showColumnMenuTool,
          columnMinWidth: computedColumnMinWidth,
          columnMaxWidth: computedColumnMaxWidth,
        });
      }
    }

    return { ...allocation, widths: next };
  }, [
    autosizedWidths,
    columnViewportWidth,
    computedColumnDefaultWidth,
    computedColumnMaxWidth,
    computedColumnMinWidth,
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
  const hasSpanningColumns = orderedColumns.some(
    (column) => column.rowspan != null || column.colspan != null
  );
  const rowVirtualizationEnabled = Boolean(virtualized);
  const computedVirtualizeColumns = Boolean(
    !mobileTransformActive &&
    orderedColumns.length > 0 &&
    hasFixedNumericRowHeight &&
    (typeof virtualizeColumns === "boolean"
      ? virtualizeColumns
      : orderedColumns.length >= normalizedVirtualizeColumnsThreshold)
  );

  /** ---------------- selection helpers ---------------- */

  const {
    commitRowSelection,
    deselectAllRows,
    getCellSelectionBetweenCompat,
    getCellSelectionKey,
    handleCellSelectionPointer,
    handleRowClick,
    incrementActiveCellCompat,
    incrementActiveIndex,
    isCellSelected,
    normalizedActiveCell,
    normalizedActiveIndex,
    queueActiveCell,
    selectAllRows,
    selectCellRange,
    selectableCellColumnIndexes,
    setActiveCellCompat,
    setActiveIndexCompat,
    toggleActiveCellSelectionCompat,
  } = useGridSelection({
    activeCellState,
    activeCellThrottle,
    activeCellThrottleTimerRef,
    activeIndexState,
    activeIndexThrottle,
    activeIndexThrottleTimerRef,
    cellMultiSelect,
    cellSelectionAnchorRef,
    cellSelectionByIndex,
    cellSelectionEnabled,
    cellSelectionState,
    checkboxColId,
    checkboxOnlyRowSelect,
    checkboxSelectEnableShiftKey,
    dataSource,
    emitSelectionChange,
    enableKeyboardNavigation,
    getRowKey,
    lastSelectedIndexRef,
    multiSelect,
    normalizedSelected,
    orderedColumns,
    paginationMode,
    pendingActiveCellRef,
    pendingActiveIndexRef,
    rows,
    selectedMap,
    selectionEnabled,
    selectionRangeBaseRef,
    setActiveCellState,
    setActiveIndexState,
    setCellSelectionState,
    surfaceRef,
    toggleCellSelectOnClick,
    toggleRowSelectOnClick,
    unselected,
  });

  /** ---------------- filter operator menu state ---------------- */

  const {
    columnContextMenu,
    columnVisibilityMenuOpen,
    filterContextMenuOnHideRef,
    setColumnContextMenu,
    setOpenFilterMenuColId,
    setRowContextMenu,
    handleUiRowContextMenu,
    hideColumnContextMenu,
    hideColumnFilterContextMenu,
    hideRowContextMenu,
    openFilterMenuColId,
    rowContextMenu,
    setColumnVisibilityMenuOpen,
    setOpenFilterContextMenuColumn,
    showColumnContextMenu,
    showRowContextMenu,
  } = useGridContextMenus({
    onRowContextMenu,
    renderRowContextMenu,
    surfaceRef,
  });

  /** ---------------- columnDefs (TanStack) ---------------- */

  // Keep the feature definitions stable. Selection is live compatibility
  // state, so renderers read it through a ref instead of forcing TanStack to
  // rebuild its complete column/header/cell memo graph for every selection or
  // data update.
  const columnDefs = useGridColumnDefs({
    allInputColumns,
    checkboxColId,
    checkboxColumnProp,
    checkboxEnabled,
    commitRowSelection,
    computedColumnMaxWidth,
    computedColumnMinWidth,
    deselectAllRows,
    disabledRowsRef,
    getRowKey,
    lastPointerRef,
    multiSelect,
    resizable,
    rows,
    selectAllRows,
    selectedMap,
    selectionEnabled,
    setActiveIndexCompat,
    sortable,
  });

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
      resetSkip();
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

      resetSkip();
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
  const lastImperativeScrollAtRef = React.useRef(Number.NEGATIVE_INFINITY);
  const lastUserScrollAtRef = React.useRef(Number.NEGATIVE_INFINITY);
  const filterScrollResetStartedAtRef = React.useRef(Number.NEGATIVE_INFINITY);
  const handleScroll = React.useCallback<React.UIEventHandler<HTMLDivElement>>(
    (event) => {
      if (event.nativeEvent.isTrusted) {
        lastUserScrollAtRef.current = window.performance.now();
      }
      onScroll?.(event);
    },
    [onScroll]
  );
  const pendingFilterScrollResetRef = React.useRef(false);
  const rowsAtFilterScrollResetRef = React.useRef(rows);
  const currentRowsForScrollResetRef = React.useRef(rows);
  currentRowsForScrollResetRef.current = rows;
  const rowVirtualizerScrollRef = React.useRef<{
    scrollToOffset: (offset: number) => void;
  } | null>(null);
  const initialScrollAppliedRef = React.useRef(false);
  React.useLayoutEffect(() => {
    if (initialScrollAppliedRef.current) return;
    const viewport = scrollRef.current;
    if (!viewport) return;

    const frameId = window.requestAnimationFrame(() => {
      if (typeof initialScrollTop === "number") {
        viewport.scrollTop = Math.max(0, initialScrollTop);
      }
      if (typeof initialScrollLeft === "number") {
        setLogicalScrollLeft(viewport, initialScrollLeft, rtl);
      }
      initialScrollAppliedRef.current = true;
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [initialScrollLeft, initialScrollTop, mobileTransformActive, rtl]);
  const previousSortForScrollRef = React.useRef(sortInfo);
  const previousFilterForScrollRef = React.useRef(filterValue);
  const previousDraftFilterForScrollRef = React.useRef(draftFilterValue);
  const previousRowsForSortScrollRef = React.useRef(rows);
  React.useLayoutEffect(() => {
    const sortChanged = !Object.is(previousSortForScrollRef.current, sortInfo);
    const rowsChanged = !Object.is(previousRowsForSortScrollRef.current, rows);

    previousSortForScrollRef.current = sortInfo;
    previousRowsForSortScrollRef.current = rows;

    const shouldScroll =
      (scrollTopOnSort === true && sortChanged) ||
      (scrollTopOnSort === "always" && (sortChanged || rowsChanged));
    if (shouldScroll && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [rows, scrollTopOnSort, sortInfo]);
  React.useLayoutEffect(() => {
    const filterChanged = !Object.is(
      previousFilterForScrollRef.current,
      filterValue
    );
    previousFilterForScrollRef.current = filterValue;

    if (scrollTopOnFilter && filterChanged && scrollRef.current) {
      const resetStartedAt = window.performance.now();
      filterScrollResetStartedAtRef.current = resetStartedAt;
      pendingFilterScrollResetRef.current = true;
      rowsAtFilterScrollResetRef.current = currentRowsForScrollResetRef.current;
      scrollRef.current.scrollTop = 0;
      rowVirtualizerScrollRef.current?.scrollToOffset(0);
      let frameId = 0;
      const timeoutId = window.setTimeout(() => {
        if (
          window.performance.now() - lastImperativeScrollAtRef.current < 100 ||
          lastUserScrollAtRef.current > resetStartedAt
        ) {
          pendingFilterScrollResetRef.current = false;
          return;
        }

        if (scrollRef.current) scrollRef.current.scrollTop = 0;
        rowVirtualizerScrollRef.current?.scrollToOffset(0);
        pendingFilterScrollResetRef.current = false;
      }, 250);
      let remainingFrames = 3;
      const correctVirtualizerClamp = () => {
        frameId = window.requestAnimationFrame(() => {
          if (
            window.performance.now() - lastImperativeScrollAtRef.current <
              100 ||
            lastUserScrollAtRef.current > resetStartedAt
          ) {
            return;
          }

          const viewport = scrollRef.current;
          if (!viewport) return;
          viewport.scrollTop = 0;

          remainingFrames -= 1;
          if (remainingFrames > 0) correctVirtualizerClamp();
        });
      };
      correctVirtualizerClamp();
      return () => {
        window.cancelAnimationFrame(frameId);
        window.clearTimeout(timeoutId);
      };
    }
  }, [filterValue, scrollTopOnFilter]);
  React.useLayoutEffect(() => {
    const filterChanged = !Object.is(
      previousDraftFilterForScrollRef.current,
      draftFilterValue
    );
    previousDraftFilterForScrollRef.current = draftFilterValue;

    if (
      !scrollTopOnFilter ||
      !filterChanged ||
      !scrollRef.current ||
      window.performance.now() - lastImperativeScrollAtRef.current < 100
    ) {
      return;
    }

    scrollRef.current.scrollTop = 0;
    rowVirtualizerScrollRef.current?.scrollToOffset(0);
  }, [draftFilterValue, scrollTopOnFilter]);
  React.useEffect(() => {
    if (!pendingFilterScrollResetRef.current) return;
    if (Object.is(rowsAtFilterScrollResetRef.current, rows)) return;

    pendingFilterScrollResetRef.current = false;
    if (
      window.performance.now() - lastImperativeScrollAtRef.current < 100 ||
      lastUserScrollAtRef.current > filterScrollResetStartedAtRef.current
    ) {
      return;
    }

    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    rowVirtualizerScrollRef.current?.scrollToOffset(0);
  }, [rows]);
  const setDraftFilterValueWithScrollReset = React.useCallback<
    React.Dispatch<React.SetStateAction<TypeFilterValue>>
  >(
    (nextFilterValue) => {
      if (scrollTopOnFilter && scrollRef.current) {
        scrollRef.current.scrollTop = 0;
        rowVirtualizerScrollRef.current?.scrollToOffset(0);
      }
      setDraftFilterValue(nextFilterValue);
    },
    [scrollTopOnFilter, setDraftFilterValue]
  );
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
  const spanVirtualizationIntervals = React.useMemo(() => {
    const rowIntervals: TypeSpanInterval[] = [];
    const columnIntervals: TypeSpanInterval[] = [];
    if (!hasSpanningColumns) return { rowIntervals, columnIntervals };

    for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
      const data = rows[rowIndex];
      for (
        let columnIndex = 0;
        columnIndex < orderedColumns.length;
        columnIndex += 1
      ) {
        const column = orderedColumns[columnIndex]!;
        const columnId = getColumnId(column);
        const cellProps = {
          ...column,
          value: data?.[columnId],
          data,
          rowId: getRowKey(data, rowIndex),
          rowIndex,
          rowRenderIndex: rowIndex,
          remoteRowIndex: loadSkip + rowIndex,
          rowSelected: Boolean(selectedMap[getRowKey(data, rowIndex)]),
          rowActive: rowIndex === normalizedActiveIndex,
          selected: isCellSelected(rowIndex, columnIndex),
          cellSelected: isCellSelected(rowIndex, columnIndex),
          active:
            normalizedActiveCell?.[0] === rowIndex &&
            normalizedActiveCell?.[1] === columnIndex,
          cellActive:
            normalizedActiveCell?.[0] === rowIndex &&
            normalizedActiveCell?.[1] === columnIndex,
          empty: false,
          totalDataCount: rows.length,
          totalCount: count,
          column,
          columnId,
          id: columnId,
          name: column.name,
          columnIndex,
          computedVisibleIndex: columnIndex,
          cellProps: {},
        };
        const configuredRowSpan =
          typeof column.rowspan === "function"
            ? column.rowspan(cellProps)
            : column.rowspan;
        const rowSpan =
          typeof configuredRowSpan === "number" &&
          Number.isFinite(configuredRowSpan)
            ? clamp(Math.trunc(configuredRowSpan), 1, rows.length - rowIndex)
            : 1;
        if (rowSpan > 1) {
          rowIntervals.push({
            start: rowIndex,
            end: rowIndex + rowSpan - 1,
          });
        }

        const configuredColSpan =
          typeof column.colspan === "function"
            ? column.colspan(cellProps)
            : column.colspan;
        let colSpan =
          typeof configuredColSpan === "number" &&
          Number.isFinite(configuredColSpan)
            ? clamp(
                Math.trunc(configuredColSpan),
                1,
                orderedColumns.length - columnIndex
              )
            : 1;
        const lockedSide = resolveColumnLock(column);
        while (
          colSpan > 1 &&
          resolveColumnLock(orderedColumns[columnIndex + colSpan - 1]!) !==
            lockedSide
        ) {
          colSpan -= 1;
        }
        if (colSpan > 1) {
          columnIntervals.push({
            start: columnIndex,
            end: columnIndex + colSpan - 1,
          });
        }
      }
    }

    return { rowIntervals, columnIntervals };
  }, [
    count,
    getRowKey,
    hasSpanningColumns,
    isCellSelected,
    loadSkip,
    normalizedActiveCell,
    normalizedActiveIndex,
    orderedColumns,
    rows,
    selectedMap,
  ]);
  const rowRangeExtractor = React.useMemo(
    () =>
      createSpanAwareRangeExtractor(spanVirtualizationIntervals.rowIntervals),
    [spanVirtualizationIntervals.rowIntervals]
  );
  const columnRangeExtractor = React.useMemo(
    () =>
      createSpanAwareRangeExtractor(
        spanVirtualizationIntervals.columnIntervals
      ),
    [spanVirtualizationIntervals.columnIntervals]
  );
  const headerGroupCount = columnGroupModel.depth + 1;
  const stickyHeaderOffset =
    (showHeader ? headerGroupCount * headerHeight : 0) +
    (showHeader && effectiveEnableFiltering ? filterRowHeight : 0);
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
  const computedRowHeights = React.useMemo(
    () =>
      normalizeRowHeightsMap(
        configuredRowHeights,
        computedMinRowHeight,
        computedMaxRowHeight
      ),
    [configuredRowHeights, computedMaxRowHeight, computedMinRowHeight]
  );
  const computedRowHeightsRef = React.useRef(computedRowHeights);
  React.useLayoutEffect(() => {
    computedRowHeightsRef.current = computedRowHeights;
  }, [computedRowHeights]);

  const commitRowHeights = React.useCallback(
    (nextRowHeights: Record<string, number>) => {
      const normalized = normalizeRowHeightsMap(
        nextRowHeights,
        computedMinRowHeight,
        computedMaxRowHeight
      );
      if (equalRowHeights(computedRowHeightsRef.current, normalized)) return;

      computedRowHeightsRef.current = normalized;
      if (controlledRowHeights === undefined) {
        setUncontrolledRowHeights(normalized);
      }
      onRowHeightsChange?.(normalized);

      if (onUpdateRowHeights && apiRef.current) {
        const indexedHeights: Record<number, number> = {};
        rowModel.forEach((row, rowIndex) => {
          const rowId = String(getRowKey(row.original, rowIndex));
          const height = normalized[rowId];
          if (height !== undefined) indexedHeights[rowIndex] = height;
        });
        onUpdateRowHeights(indexedHeights, apiRef.current);
      }
    },
    [
      computedMaxRowHeight,
      computedMinRowHeight,
      controlledRowHeights,
      getRowKey,
      onRowHeightsChange,
      onUpdateRowHeights,
      rowModel,
    ]
  );

  const setRowHeightsCompat = React.useCallback(
    (nextRowHeights: Record<string, number>) => {
      commitRowHeights(nextRowHeights);
    },
    [commitRowHeights]
  );
  const setRowHeightByIdCompat = React.useCallback(
    (nextHeight: number | null, rowId: string | number) => {
      const key = String(rowId);
      const next = { ...computedRowHeightsRef.current };
      if (nextHeight == null) delete next[key];
      else next[key] = nextHeight;
      commitRowHeights(next);
    },
    [commitRowHeights]
  );
  const resolveRowHeight = React.useCallback(
    (rowIndex: number) => {
      const row = rowModel[rowIndex];
      const rowId = row ? String(getRowKey(row.original, rowIndex)) : undefined;
      const override =
        rowId === undefined ? undefined : computedRowHeights[rowId];
      return (
        override ??
        resolveConfiguredRowHeight({
          rowHeight,
          rowIndex,
          minRowHeight: computedMinRowHeight,
          maxRowHeight: computedMaxRowHeight,
        })
      );
    },
    [
      computedMaxRowHeight,
      computedMinRowHeight,
      computedRowHeights,
      getRowKey,
      rowHeight,
      rowModel,
    ]
  );
  const getRowHeightByIdCompat = React.useCallback(
    (rowId: string | number) => {
      const key = String(rowId);
      const override = computedRowHeightsRef.current[key];
      if (override !== undefined) return override;
      const rowIndex = rowModel.findIndex(
        (row, index) => String(getRowKey(row.original, index)) === key
      );
      return resolveConfiguredRowHeight({
        rowHeight,
        rowIndex: rowIndex < 0 ? 0 : rowIndex,
        minRowHeight: computedMinRowHeight,
        maxRowHeight: computedMaxRowHeight,
      });
    },
    [computedMaxRowHeight, computedMinRowHeight, getRowKey, rowHeight, rowModel]
  );
  const initialRowHeight = resolveRowHeight(0);

  const rowVirtualizer = useVirtualizer({
    count: rowModel.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (rowIndex) => resolveRowHeight(rowIndex),
    // Natural-height rows need the wider measurement buffer for accurate
    // smooth-scroll completion. Deterministically sized rows can use the
    // smaller buffer without reconciling another large set of horizontally
    // virtualized cells on every column-range change.
    overscan: rowHeight == null ? 10 : 3,
    scrollMargin: stickyHeaderOffset,
    // Keep start-aligned imperative scrolling below the sticky header and
    // filter rows instead of positioning the requested row underneath them.
    scrollPaddingStart: stickyHeaderOffset,
    // Seed a usable range before the desktop viewport observer reports its
    // size, including when returning from the unmounted mobile branch.
    initialRect: { width: 0, height: initialRowHeight * 10 },
    enabled: rowVirtualizationEnabled && !mobileTransformActive,
    rangeExtractor: rowRangeExtractor,
  });
  rowVirtualizerScrollRef.current = rowVirtualizer;
  const previousResolvedRowHeightsRef = React.useRef<Record<string, number>>(
    {}
  );
  const previousResolvedRowIdsRef = React.useRef<string[]>([]);
  const previousRowHeightOverridesRef = React.useRef<Record<string, number>>(
    {}
  );
  React.useLayoutEffect(() => {
    const previousHeights = previousResolvedRowHeightsRef.current;
    const previousRowIds = previousResolvedRowIdsRef.current;
    const previousOverrides = previousRowHeightOverridesRef.current;
    const nextHeights: Record<string, number> = {};
    const nextRowIds: string[] = [];

    rowModel.forEach((row, rowIndex) => {
      const rowId = String(getRowKey(row.original, rowIndex));
      const nextHeight = resolveRowHeight(rowIndex);
      nextHeights[rowId] = nextHeight;
      nextRowIds[rowIndex] = rowId;
      const previousRowId = previousRowIds[rowIndex];
      const rowIdentityRequiresReset =
        previousRowId !== rowId &&
        (computedRowHeights[rowId] !== undefined ||
          (previousRowId !== undefined &&
            previousOverrides[previousRowId] !== undefined));

      if (rowIdentityRequiresReset || previousHeights[rowId] !== nextHeight) {
        rowVirtualizer.resizeItem(rowIndex, nextHeight);
      }
    });

    previousResolvedRowHeightsRef.current = nextHeights;
    previousResolvedRowIdsRef.current = nextRowIds;
    previousRowHeightOverridesRef.current = computedRowHeights;
  }, [
    computedMaxRowHeight,
    computedMinRowHeight,
    computedRowHeights,
    getRowKey,
    resolveRowHeight,
    rowHeight,
    rowModel,
    rowVirtualizer,
  ]);

  // TanStack Table owns the ordered/visible column model and resolved pixel
  // sizes. TanStack Virtual only decides which of those columns are mounted.
  // Keeping horizontal scroll offset inside the virtualizer avoids rerendering
  // the entire grid from a second, component-level scrollLeft state.
  const columnVirtualizer = useVirtualizer({
    horizontal: true,
    isRtl: rtl,
    count: visibleTableColumns.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: estimateVirtualColumnSize,
    getItemKey: getVirtualColumnKey,
    overscan: 1,
    initialRect: { width: Math.max(0, columnViewportWidth), height: 0 },
    enabled: computedVirtualizeColumns && !mobileTransformActive,
    rangeExtractor: columnRangeExtractor,
  });

  const columnWidthMeasurementKey = React.useMemo(
    () =>
      orderedColumns
        .map(
          (column) =>
            `${getColumnId(column)}:${columnWidths[getColumnId(column)]}`
        )
        // TanStack Virtual caches measurements by the stable column key.
        // Reordering equal-width columns can reuse those measurements; only
        // membership or width changes need to invalidate the cache.
        .sort()
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
        viewport.scrollWidth - viewport.clientWidth
      );
      if (getLogicalScrollLeft(viewport, rtl) > maxScrollLeft + 1) {
        setLogicalScrollLeft(viewport, maxScrollLeft, rtl);
      }
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [
    columnVirtualizer,
    columnWidthMeasurementKey,
    computedVirtualizeColumns,
    mobileTransformActive,
    rtl,
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

  const {
    cancelEditCompat,
    completeEditCompat,
    coordinateEditingCell,
    currentEditCompletePromiseRef,
    editCellNodesRef,
    editingCell,
    getCurrentEditInfoCompat,
    handleEditCancel,
    handleEditComplete,
    handleEditStop,
    handleEditValueChange,
    handleUiCellEditStart,
    isInEditRef,
    startEditCompat,
    tryStartEditCompat,
  } = useGridEditing({
    autoFocusOnEditComplete,
    autoFocusOnEditEscape,
    columnWidths,
    computedMinRowHeight,
    computedVirtualizeColumns,
    editStartEvent,
    editable,
    getDisabledRowState,
    idProperty,
    loadSkip,
    multiSelect,
    onEditCancel,
    onEditComplete,
    onEditStart,
    onEditStop,
    onEditValueChange,
    orderedColumns,
    resolveRowHeight,
    rowHeight,
    rowModel,
    rowVirtualizer,
    rowsCount: rows.length,
    selected,
    selectedMap,
    surfaceRef,
    themeName,
    virtualized,
  });

  const virtualItems = rowVirtualizationEnabled
    ? rowVirtualizer.getVirtualItems()
    : EMPTY_VIRTUAL_ITEMS;
  const paddingTop =
    rowVirtualizationEnabled && virtualItems.length
      ? virtualItems[0]!.start
      : 0;
  const paddingBottom =
    rowVirtualizationEnabled && virtualItems.length
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
  /**
   * Viewport width the columns do not cover — only possible in fixed mode, since
   * stretch forces the table to 100%.
   *
   * A real cell absorbs it so every cell width stays explicit and sums to the
   * table width. Letting `table-layout: fixed` distribute the surplus instead
   * would silently widen the columns and undo the user's resize.
   */
  const gridSlackWidth =
    hasManualColumnWidths && tableMinWidth
      ? Math.max(0, Math.floor(columnViewportWidth - tableMinWidth))
      : null;
  const tableRenderWidth =
    tableMinWidth == null ? undefined : tableMinWidth + (gridSlackWidth ?? 0);
  const sharedTableStyle = tableRenderWidth
    ? { width: `${tableRenderWidth}px` }
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
  const columnViewport = scrollRef.current;
  const isAtTrailingColumnEdge =
    computedVirtualizeColumns &&
    columnViewport != null &&
    columnViewport.scrollWidth -
      columnViewport.clientWidth -
      getLogicalScrollLeft(columnViewport, rtl) <=
      1;
  const lockedEndWidth = columnLayout.reduce((total, column, index) => {
    return resolveColumnLock(orderedColumns[index]!) === "end"
      ? total + column.width
      : total;
  }, 0);
  const columnRenderRange = buildGridColumnRenderItems({
    columnLayout,
    columns: orderedColumns,
    virtualColumnIndexes,
    virtualizeColumns: computedVirtualizeColumns,
    trailingViewportWidth: isAtTrailingColumnEdge
      ? Math.max(0, columnViewportWidth - lockedEndWidth)
      : 0,
    fillerWidth: gridSlackWidth,
  });
  const columnRenderItems = columnRenderRange.items;
  const columnGroupHeaderRows = React.useMemo(
    () =>
      buildColumnGroupHeaderRows({
        model: columnGroupModel,
        columns: orderedColumns,
        columnWidths,
        columnRenderItems,
      }),
    [columnGroupModel, columnRenderItems, columnWidths, orderedColumns]
  );
  const lockedColumnLayout = React.useMemo(
    () =>
      buildLockedColumnLayout(
        orderedColumns,
        Object.fromEntries(
          columnLayout.map((column) => [column.id, column.width])
        )
      ),
    [columnLayout, orderedColumns]
  );
  const renderedColumnLayout = React.useMemo(() => {
    return columnRenderItems.flatMap((renderItem) => {
      if (renderItem.type === "spacer" || renderItem.type === "filler") {
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

  const {
    autosizeColumn,
    commitColumnPixelResize,
    commitColumnResizeEntries,
    resizeColumnBy,
    resizeGroupBy,
    resizeProxyElementRef,
    resizeProxyLeft,
    resizingColumnId,
    resizingGroupKey,
    startColumnResize,
    startGroupResize,
  } = useGridColumnResize({
    autosizeSample,
    columnGroupHeaderRows,
    columnWidths,
    computedColumnDefaultWidth,
    computedColumnMaxWidth,
    computedColumnMinWidth,
    flexWeights: columnWidthAllocation.flexWeights,
    hasManualColumnWidths,
    headerScrollRef,
    liveColumnResize,
    mobileTransformActive,
    onBatchColumnResize,
    onColumnResize,
    orderedColumns,
    renderedColumnLayout,
    reservedViewportWidthRef,
    resizable,
    rtl,
    scrollRef,
    setManualColumnFlexes,
    setManualColumnWidths,
    setReservedViewportWidth,
    shareSpaceOnResize,
    showColumnMenuTool,
    showHeader,
    skipHeaderOnAutoSize,
    surfaceRef,
    tableRenderWidth,
    gridSlackWidth: gridSlackWidth ?? 0,
  });

  /** ---------------- header drag/drop reorder ---------------- */

  const allowColumnReorder = (props as any).reorderColumns ?? true;

  const {
    onGroupHeaderDragStart,
    onGroupHeaderDrop,
    onHeaderDragOver,
    onHeaderDragStart,
    onHeaderDrop,
  } = useGridHeaderReorder({
    allowColumnReorder,
    allowGroupSplitOnReorder,
    checkboxColId,
    checkboxEnabled,
    columnGroupModel,
    orderedColumns,
    renderColumnOrder,
    table,
  });

  /** ---------------- imperative API / compat surface ---------------- */

  const [stableApiTarget] = React.useState<TypeComputedProps>(
    () => ({}) as TypeComputedProps
  );
  const [stableApi] = React.useState<TypeComputedProps>(() => stableApiTarget);
  const onDidMountRef = React.useRef(onDidMount);
  const onReadyNotifiedRef = React.useRef(false);

  React.useLayoutEffect(() => {
    onDidMountRef.current = onDidMount;

    return () => {
      onDidMountRef.current = undefined;
    };
  }, [onDidMount]);

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
  const {
    columnFlexes,
    columnSizes,
    setColumnSizeAutoCompat,
    setColumnSizesCompat,
    setColumnFlexesCompat,
    setColumnSizesToFitCompat,
    setColumnsSizesAutoCompat,
  } = useGridColumnSizingApi({
    autosizeSample,
    columnLayout,
    columnViewportWidth,
    columnWidths,
    commitColumnResizeEntries,
    computedColumnDefaultWidth,
    computedColumnMaxWidth,
    computedColumnMinWidth,
    flexWeights: columnWidthAllocation.flexWeights,
    manualColumnFlexes,
    orderedColumns,
    setManualColumnFlexes,
    setManualColumnWidths,
    skipHeaderOnAutoSize,
  });

  const {
    gotoFirstPage,
    gotoLastPage,
    gotoNextPage,
    gotoPrevPage,
    hasNextPage,
    hasPrevPage,
    paginationProps,
    setFilterValueAndResetPage,
    setLimitAndResetPage,
    setSortInfoAndResetPage,
  } = useGridPaginationApi({
    canNext,
    canPrev,
    count,
    filterControlled,
    i18n,
    loadSkip,
    localPagination,
    pageCount,
    pageIndex,
    pageSizes,
    paginationEnabled,
    reload,
    remotePagination,
    resetSkip,
    rowsCount: rows.length,
    rtl,
    safeLimit,
    setDraftFilterValue,
    setFilterValue,
    setLimit,
    setSkip,
    setSortInfo,
    themeName,
  });

  const {
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
  } = useGridColumnApi({
    allComputedColumns,
    allInputColumns,
    allowUnsort,
    checkboxColId,
    checkboxEnabled,
    columnVisibilityMap,
    defaultSortDir,
    filterTypes,
    filterValue,
    onColumnFilterValueChange,
    onColumnVisibleChange,
    orderedColumns,
    setColumnVisibilityState,
    setFilterValueAndResetPage,
    setSortInfoAndResetPage,
    sortFunctions,
    sortInfo,
    table,
  });

  useGridToolbarBridge({
    columnOrderForDs,
    columnVisibilityMap,
    enableFilteringProp: enableFiltering,
    filterTypes,
    filterValue,
    filteringEnabled: effectiveEnableFiltering,
    inputColumns,
    originalData,
    rows,
    setColumnVisibleById,
    setEnableFiltering: setEnableFilteringCompat,
    setFilterValueAndResetPage,
    theme,
    toolbarController,
  });

  const {
    deselectAllCompat,
    getItemIndexByIdCompat,
    selectAllCompat,
    setItemAtCompat,
    setItemPropertyAtCompat,
    setItemPropertyForIdCompat,
    setItemsAtCompat,
    setSelectedAtCompat,
    setSelectedByIdCompat,
    setSelectedCompat,
  } = useGridRowApi({
    commitRowSelection,
    deselectAllRows,
    emitSelectionChange,
    getRowKey,
    idProperty,
    rows,
    selectAllRows,
    setRows,
    unselected,
  });

  const {
    getRenderRangeCompat,
    getScrollLeftCompat,
    getScrollingElement,
    incrementScrollLeftCompat,
    incrementScrollTopCompat,
    isRowFullyVisibleCompat,
    isRowRenderedCompat,
    scrollToCellCompat,
    scrollToColumnCompat,
    scrollToIndexCompat,
    setScrollLeftCompat,
    setScrollTopCompat,
  } = useGridScrollApi({
    columnWidthPrefixSums,
    lastImperativeScrollAtRef,
    lockedColumnMetrics,
    resolveRowHeight,
    rowHeight,
    rowModel,
    rowVirtualizer,
    rtl,
    scrollRef,
    stickyHeaderOffset,
    surfaceRef,
    virtualItems,
    virtualized,
    visibleComputedColumns,
  });

  const {
    clearPointerActivatesRow,
    handleGridBlur,
    handleGridFocus,
    handleGridKeyDown,
    handleGridPointerDownCapture,
  } = useGridKeyboardNavigation({
    activateRowOnFocus,
    allowRowTabNavigation,
    apiRef,
    cellMultiSelect,
    cellSelectionAnchorRef,
    cellSelectionEnabled,
    cellSelectionState,
    commitRowSelection,
    enableKeyboardNavigation,
    getCellSelectionKey,
    getRenderRangeCompat,
    gridFocused,
    incrementActiveIndex,
    incrementScrollLeftCompat,
    isRowFullyVisibleCompat,
    isStartEditKeyPressed,
    keyPageStep,
    lastActiveIndexRef,
    moveActiveCellQueue: queueActiveCell,
    normalizedActiveCell,
    normalizedActiveIndex,
    onBlurProp,
    onFocusProp,
    onKeyDownProp,
    onRowContextMenu,
    orderedColumns,
    pendingActiveCellRef,
    renderRowContextMenu,
    resolveRowHeight,
    rootRef,
    rowModel,
    rows,
    rtl,
    scrollRef,
    scrollToCellCompat,
    scrollToIndexCompat,
    selectCellRange,
    selectableCellColumnIndexes,
    selectionEnabled,
    setActiveIndexCompat,
    setCellSelectionState,
    setGridFocused,
    surfaceRef,
    toggleCellSelectOnClick,
    tryStartEditCompat,
  });

  const { virtualListCompat } = useGridVirtualListApi({
    columnWidthPrefixSums,
    getScrollLeftCompat,
    getScrollingElement,
    isRowRenderedCompat,
    lastImperativeScrollAtRef,
    publicProps,
    resolveRowHeight,
    rowHeight,
    rowModel,
    rowVirtualizer,
    rtl,
    scrollRef,
    scrollToIndexCompat,
    smoothScrollFrameIdsRef,
    stickyHeaderOffset,
    surfaceRef,
    virtualized,
  });

  useGridImperativeApi({
    allComputedColumns,
    allInputColumns,
    apiRef,
    canNext,
    cancelEditCompat,
    cellMultiSelect,
    cellSelectionByIndex,
    cellSelectionEnabled,
    cellSelectionState,
    checkboxColId,
    checkboxEnabled,
    clearColumnFilterCompat,
    columnContextMenu,
    columnContextMenuAlignPositions,
    columnContextMenuConstrainTo,
    columnContextMenuPosition,
    columnFlexes,
    columnLayout,
    columnOrderForDs,
    columnSizes,
    columnVisibilityMap,
    columnWidthPrefixSums,
    columnWidths,
    columnsMap,
    computedOnColumnFilterValueChangeCompat,
    commitColumnPixelResize,
    commitColumnResizeEntries,
    commitRowSelection,
    completeEditCompat,
    computedColumnDefaultWidth,
    computedColumnMaxWidth,
    computedColumnMinWidth,
    computedFilterValueMap,
    computedRowHeights,
    computedVirtualizeColumns,
    controlledLoadingRef,
    count,
    currentEditCompletePromiseRef,
    dataSource,
    deselectAllCompat,
    editStartEvent,
    editable,
    editingCell,
    effectiveEnableFiltering,
    emitSelectionChange,
    enableFiltering,
    enableKeyboardNavigation,
    filterContextMenuOnHideRef,
    filterControlled,
    filterTypes,
    filterValue,
    getCellSelectionBetweenCompat,
    getCellSelectionKey,
    getColumnByCompat,
    getColumnFilterValueCompat,
    getColumnIdCompat,
    getCurrentEditInfoCompat,
    getItemId,
    getItemIndexByIdCompat,
    getRenderRangeCompat,
    getRowHeightByIdCompat,
    getRowKey,
    getScrollLeftCompat,
    getScrollingElement,
    gotoFirstPage,
    gotoLastPage,
    gotoNextPage,
    gotoPrevPage,
    gridFocused,
    gridIdRef,
    handleGridFocus,
    handleGridKeyDown,
    handleScroll,
    hasNextPage,
    hasPrevPage,
    hideColumnContextMenu,
    hideColumnFilterContextMenu,
    hideRowContextMenu,
    i18n,
    idProperty,
    incrementActiveCellCompat,
    incrementActiveIndex,
    incrementScrollLeftCompat,
    incrementScrollTopCompat,
    isCellSelected,
    isInEditRef,
    isRowFullyVisibleCompat,
    isRowRenderedCompat,
    lastActiveIndexRef,
    limit,
    loadSkip,
    loading,
    loadingStore,
    localPagination,
    lockedColumnMetrics,
    lockedEndColumns,
    lockedStartColumns,
    multiSelect,
    normalizedActiveCell,
    normalizedActiveIndex,
    notifyFilteredRowsCount,
    onCellDoubleClick,
    onRowClick,
    onRowDoubleClick,
    openFilterMenuColId,
    orderedColumns,
    originalData,
    paginationMode,
    paginationProps,
    publicProps,
    reload,
    remotePagination,
    reservedViewportWidth,
    reservedViewportWidthRef,
    resolveRowHeight,
    rootRef,
    rowContextMenu,
    rowContextMenuAlignPositions,
    rowContextMenuConstrainTo,
    rowContextMenuPosition,
    rowModel,
    rows,
    safeLimit,
    scrollRef,
    scrollToCellCompat,
    scrollToColumnCompat,
    scrollToIndexCompat,
    selectAllCompat,
    selected,
    selectedMap,
    selectionEnabled,
    setActiveCellCompat,
    setActiveIndexCompat,
    setCellSelectionState,
    setColumnContextMenu,
    setColumnFilterValueCompat,
    setColumnFlexesCompat,
    setColumnOrderCompat,
    setColumnSizeAutoCompat,
    setColumnSizesCompat,
    setColumnSizesToFitCompat,
    setColumnSortInfoCompat,
    setColumnVisibleCompat,
    setColumnsSizesAutoCompat,
    setEnableFilteringCompat,
    setShowCellBorders,
    setShowEmptyRows,
    setShowHoverRows,
    setFilterValueAndResetPage,
    setGridFocused,
    setItemAtCompat,
    setItemPropertyAtCompat,
    setItemPropertyForIdCompat,
    setItemsAtCompat,
    setLimitAndResetPage,
    setOpenFilterMenuColId,
    setReservedViewportWidth,
    setRowContextMenu,
    setRowHeightByIdCompat,
    setRowHeightsCompat,
    setRows,
    setScrollLeftCompat,
    setScrollTopCompat,
    setSelectedAtCompat,
    setSelectedByIdCompat,
    setSelectedCompat,
    setShowHeader,
    setShowZebraRows,
    setSkip,
    setSortInfoAndResetPage,
    showCellBorders,
    showColumnContextMenu,
    showEmptyRows,
    showHeader,
    showHorizontalCellBorders,
    showHoverRows,
    showRowContextMenu,
    showVerticalCellBorders,
    showZebraRows,
    skip,
    sortInfo,
    stableApi,
    stableApiTarget,
    startEditCompat,
    surfaceRef,
    table,
    toggleActiveCellSelectionCompat,
    toggleColumnSortCompat,
    tryStartEditCompat,
    unlockedColumns,
    unselected,
    updateMenuPositionOnScroll,
    virtualItems,
    virtualListCompat,
    virtualized,
    visibleColumnsMap,
    visibleComputedColumns,
  });

  // Preserve Inovua's mount lifecycle: the API is hydrated by the preceding
  // passive effect, then onDidMount observes that live ref before the other
  // imperative lifecycle callbacks. React StrictMode intentionally replays
  // this mount effect in development, just as it does upstream.
  React.useEffect(() => {
    onDidMountRef.current?.(apiRef);
  }, []);

  React.useEffect(() => {
    handle?.(apiRef);

    return () => {
      handle?.(null);
    };
  }, [handle]);

  React.useEffect(() => {
    if (!onReady || onReadyNotifiedRef.current) return;

    let disposed = false;
    const rootNode = rootRef.current;
    const notifyWhenReady = () => {
      if (
        disposed ||
        onReadyNotifiedRef.current ||
        !rootNode ||
        rootNode.getBoundingClientRect().width <= 0
      ) {
        return false;
      }

      onReadyNotifiedRef.current = true;
      onReady(apiRef);
      return true;
    };

    if (notifyWhenReady()) return;

    if (typeof ResizeObserver === "function" && rootNode) {
      const observer = new ResizeObserver(() => {
        if (notifyWhenReady()) observer.disconnect();
      });
      observer.observe(rootNode);
      return () => {
        disposed = true;
        observer.disconnect();
      };
    }

    const onWindowResize = () => {
      if (notifyWhenReady()) {
        window.removeEventListener("resize", onWindowResize);
      }
    };
    window.addEventListener("resize", onWindowResize);
    return () => {
      disposed = true;
      window.removeEventListener("resize", onWindowResize);
    };
  }, [onReady]);

  /** ---------------- render ---------------- */
  const rowIdPrefix = `tdg-grid-${gridIdRef.current}-row`;
  const loadingText = props.loadingText ?? "Loading";
  const customPaginationToolbar =
    paginationEnabled && props.renderPaginationToolbar
      ? props.renderPaginationToolbar(paginationProps)
      : undefined;
  const paginationToolbar =
    customPaginationToolbar === undefined ? (
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
        setLimit={setLimitAndResetPage}
        i18n={i18n}
      />
    ) : (
      customPaginationToolbar
    );
  const {
    contextMenuCanSort,
    contextMenuCanUnsort,
    contextMenuColumnId,
    renderedColumnContextMenu,
    renderedRowContextMenu,
    showColumnMenuLayer,
    showRowMenuLayer,
    visibleColumnCount,
  } = useGridContextMenuLayers({
    allowUnsort,
    apiRef,
    autosizeColumn,
    checkboxColId,
    checkboxEnabled,
    columnContextMenu,
    columnContextMenuAlignPositions,
    columnContextMenuConstrainTo,
    columnContextMenuPosition,
    columnVisibilityMap,
    effectiveEnableFiltering,
    enableColumnAutosize,
    enableFiltering,
    groupedColumns,
    hideColumnContextMenu,
    hideRowContextMenu,
    i18n,
    nativeScroll,
    renderColumnContextMenu,
    renderRowContextMenu,
    rowContextMenu,
    rowContextMenuAlignPositions,
    rowContextMenuConstrainTo,
    rowContextMenuPosition,
    rtl,
    setColumnSizesToFitCompat,
    setColumnSortInfoCompat,
    setColumnVisibleById,
    setColumnsSizesAutoCompat,
    setEnableFilteringCompat,
    sortInfo,
    sortable,
    stableApi,
    themeName,
    updateMenuPositionOnScroll,
  });

  return (
    <div
      ref={attachRootRef}
      className={cn(
        "tdg-root InovuaReactDataGrid flex h-full min-h-0 w-full min-w-0 max-w-full flex-col gap-2 overflow-hidden rounded-lg lg:gap-6",
        `tdg-theme-${themeClassSuffix}`,
        `InovuaReactDataGrid--theme-${themeClassSuffix}`,
        rtl
          ? "InovuaReactDataGrid--direction-rtl"
          : "InovuaReactDataGrid--direction-ltr",
        "InovuaReactDataGrid--show-hover-rows",
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
      /*
       * Read by border rules that depend on where the table really ends. It lives
       * here rather than on the filler because the live-resize preview patches the
       * DOM without a React render, so it maintains this one attribute rather than
       * every cell going stale mid-drag.
       */
      data-grid-slack={(gridSlackWidth ?? 0) > 0 ? "some" : "none"}
      data-show-zebra-rows={showZebraRows ? "true" : "false"}
      data-layout={mobileTransformActive ? "mobile-list" : "table"}
      data-focused={gridFocused ? "true" : "false"}
      data-native-scroll={nativeScroll ? "true" : "false"}
      data-direction={rtl ? "rtl" : "ltr"}
      dir={rtl ? "rtl" : "ltr"}
      data-active-index={
        normalizedActiveIndex >= 0 ? normalizedActiveIndex : "none"
      }
      style={
        {
          ...style,
          "--tdg-column-resize-handle-width": `${computedColumnResizeHandleWidth}px`,
          "--tdg-column-resize-proxy-width": `${computedColumnResizeProxyWidth}px`,
          "--tdg-scroll-vertical-footprint": `${computedVerticalScrollbarFootprint}px`,
          // The header layer is `h-0`, so its own box cannot report its height.
          // CSS needs it to inset the vertical scrollbar's track.
          "--tdg-header-block-height": `${stickyHeaderOffset}px`,
        } as React.CSSProperties
      }
      onKeyDown={handleGridKeyDown}
      onPointerDownCapture={handleGridPointerDownCapture}
      onPointerUpCapture={clearPointerActivatesRow}
      onPointerCancelCapture={clearPointerActivatesRow}
      onFocus={handleGridFocus}
      onBlur={handleGridBlur}
    >
      <DatagridThemeProvider
        theme={themeName}
        themeBase={themeBase}
        portalContainer={portalContainer}
      >
        <div
          className="tdg-frame relative flex h-full min-h-0 w-full min-w-0 max-w-full flex-col overflow-hidden rounded-lg"
          data-slot="grid-frame"
        >
          <div
            ref={surfaceRef}
            className="tdg-surface relative flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col bg-[var(--tdg-grid-bg)] text-foreground"
            data-slot="grid-surface"
            tabIndex={enableKeyboardNavigation ? 0 : -1}
            aria-label="Data grid"
            aria-busy={loading}
            aria-haspopup={renderRowContextMenu ? "menu" : undefined}
            aria-expanded={renderRowContextMenu ? showRowMenuLayer : undefined}
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
                sortable={sortable}
                sortFunctions={sortFunctions}
                searchEnabled={!searchConnected}
                columnPickerEnabled={toolbarController == null}
                authoritativeResultCount={searchConnected ? count : undefined}
                scrollRef={scrollRef}
                nativeScroll={nativeScroll}
                scrollProps={scrollProps}
                rtl={rtl}
                onScroll={handleScroll}
                onSortInfoChange={setSortInfoAndResetPage}
                onFilteredRowsCountChange={notifyFilteredRowsCount}
                onRowClick={(id, data, rowIndex, event) =>
                  handleRowClick(id, data, rowIndex, event)
                }
                onRowContextMenu={
                  renderRowContextMenu || onRowContextMenu
                    ? (id, data, rowIndex, event, alignTo) =>
                        handleUiRowContextMenu(
                          {
                            data,
                            id,
                            index: rowIndex,
                            rowIndex,
                            realIndex: rowIndex,
                            remoteRowIndex: loadSkip + rowIndex,
                            selected: Boolean(selectedMap[id]),
                            rowSelected: Boolean(selectedMap[id]),
                            active: normalizedActiveIndex === rowIndex,
                            disabledRow: getDisabledRowState(rowIndex),
                            selection: selected,
                            multiSelect: Boolean(multiSelect),
                            theme: themeName,
                            columns: visibleComputedColumns,
                            columnsMap,
                            dataSourceArray: rows,
                          } as unknown as TypeRowProps,
                          undefined,
                          event,
                          alignTo
                        )
                    : undefined
                }
              />
            ) : (
              <ScrollArea
                className="tdg-scroll-area flex min-h-0 w-full min-w-0 max-w-full flex-1 rounded-b-[inherit]"
                viewportRef={scrollRef}
                viewportClassName="tdg-body-viewport relative h-full min-h-0 w-full min-w-0 bg-[var(--tdg-grid-bg)] text-foreground"
                nativeScroll={nativeScroll}
                scrollProps={scrollProps}
                dir={rtl ? "rtl" : "ltr"}
                viewportProps={{
                  dir: rtl ? "rtl" : "ltr",
                  onScroll: handleScroll,
                }}
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
                          groupHeaderRows={columnGroupHeaderRows}
                          orderedColumns={orderedColumns}
                          headerHeight={headerHeight}
                          filterRowHeight={filterRowHeight}
                          sortInfo={sortInfo}
                          setSortInfo={setSortInfo}
                          setSkip={resetSkip}
                          allowUnsort={allowUnsort}
                          defaultSortDir={defaultSortDir}
                          sortable={sortable}
                          sortFunctions={sortFunctions}
                          renderSortTool={renderSortTool}
                          showColumnMenuTool={showColumnMenuTool}
                          openColumnContextMenuColumnId={
                            showColumnMenuLayer ? contextMenuColumnId : null
                          }
                          onOpenColumnContextMenu={(
                            alignTo,
                            cellProps,
                            restoreFocusTo
                          ) =>
                            showColumnContextMenu(
                              alignTo,
                              cellProps,
                              {
                                computedVisibleIndex:
                                  cellProps.computedVisibleIndex,
                              },
                              undefined,
                              restoreFocusTo
                            )
                          }
                          showHorizontalCellBorders={showHorizontalCellBorders}
                          showVerticalCellBorders={showVerticalCellBorders}
                          i18n={i18n}
                          theme={themeName}
                          rtl={rtl}
                          nativeScroll={nativeScroll}
                          gridRef={apiRef}
                          gridProps={
                            (apiRef.current ?? {}) as TypeComputedProps
                          }
                          allowColumnReorder={allowColumnReorder}
                          allowColumnResize={resizable}
                          checkboxEnabled={checkboxEnabled}
                          checkboxColId={checkboxColId}
                          onHeaderDragStart={onHeaderDragStart}
                          onHeaderDragOver={onHeaderDragOver}
                          onHeaderDrop={onHeaderDrop}
                          onGroupHeaderDragStart={onGroupHeaderDragStart}
                          onGroupHeaderDrop={onGroupHeaderDrop}
                          resizingColumnId={resizingColumnId}
                          resizingGroupKey={resizingGroupKey}
                          onColumnResizeStart={startColumnResize}
                          onColumnResizeBy={resizeColumnBy}
                          onColumnAutoResize={autosizeColumn}
                          onGroupResizeStart={startGroupResize}
                          onGroupResizeBy={resizeGroupBy}
                          enableFiltering={effectiveEnableFiltering}
                          enableColumnFilterContextMenu={
                            enableColumnFilterContextMenu
                          }
                          filterControlled={filterControlled}
                          filterValue={filterValue}
                          draftFilterValue={draftFilterValue}
                          setFilterValue={setFilterValue}
                          setDraftFilterValue={
                            setDraftFilterValueWithScrollReset
                          }
                          onColumnFilterValueChange={onColumnFilterValueChange}
                          filterTypes={filterTypes}
                          renderColumnFilterContextMenu={
                            renderColumnFilterContextMenu
                          }
                          columnFilterContextMenuAlignPositions={
                            columnFilterContextMenuAlignPositions
                          }
                          columnFilterContextMenuConstrainTo={
                            columnFilterContextMenuConstrainTo
                          }
                          columnFilterContextMenuPosition={
                            columnFilterContextMenuPosition
                          }
                          updateMenuPositionOnScroll={
                            updateMenuPositionOnScroll
                          }
                          openFilterMenuColId={openFilterMenuColId}
                          setOpenFilterMenuColId={
                            setOpenFilterContextMenuColumn
                          }
                          columnRenderItems={columnRenderItems}
                          lockedColumnLayout={lockedColumnLayout}
                          headerDOMProps={headerDOMProps}
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
                    virtualized={rowVirtualizationEnabled}
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
                    cellSelectionEnabled={cellSelectionEnabled}
                    activeCell={normalizedActiveCell}
                    isCellSelected={isCellSelected}
                    onCellSelectionPointer={handleCellSelectionPointer}
                    rowIdPrefix={rowIdPrefix}
                    rowFocusClassName={rowFocusClassName}
                    showActiveRowIndicator={showActiveRowIndicator}
                    activeRowIndicatorClassName={activeRowIndicatorClassName}
                    getDisabledRowState={getDisabledRowState}
                    onRowClick={(id, data, rowIndex, e) => {
                      if (
                        cellSelectionEnabled &&
                        (e.target as HTMLElement | null)?.closest(
                          '[data-slot="grid-cell"]'
                        )
                      ) {
                        return;
                      }
                      handleRowClick(id, data, rowIndex, e);
                    }}
                    publicOnRowClick={onRowClick}
                    publicOnRowDoubleClick={onRowDoubleClick}
                    publicOnCellClick={onCellClick}
                    publicOnCellDoubleClick={onCellDoubleClick}
                    rowProps={rowProps}
                    rowClassName={rowClassName}
                    renderRow={renderRow}
                    onRenderRow={onRenderRow}
                    cellDOMProps={cellDOMProps}
                    showHoverRows={showHoverRows}
                    showEmptyRows={showEmptyRows}
                    onRowContextMenu={
                      renderRowContextMenu || onRowContextMenu
                        ? handleUiRowContextMenu
                        : undefined
                    }
                    rowHeight={rowHeight}
                    resolveRowHeight={resolveRowHeight}
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
                      totalCount: count,
                      theme: themeName,
                      rtl,
                      nativeScroll,
                      multiSelect: Boolean(multiSelect),
                      selection: selected,
                      maxVisibleRows: Math.max(
                        1,
                        Math.floor(
                          (scrollRef.current?.clientHeight ??
                            initialRowHeight * 10) / initialRowHeight
                        )
                      ),
                      computedShowCellBorders: showCellBorders,
                      editable,
                      getItemId,
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

          {paginationEnabled && paginationToolbar != null ? (
            <div className="tdg-pagination-shell border-t py-2 [border-color:var(--tdg-grid-border-color)]">
              {paginationToolbar}
            </div>
          ) : null}
          <GridLoadingLayer
            controlledLoading={props.loading}
            loadingText={loadingText}
            onLoadingChange={props.onLoadingChange}
            renderLoadMask={props.renderLoadMask}
            store={loadingStore}
            surfaceRef={surfaceRef}
            theme={themeName}
          />
          <GridContextMenuLayer
            open={showColumnMenuLayer}
            onOpenChange={(open) => {
              if (!open) hideColumnContextMenu();
            }}
            alignTo={columnContextMenu?.alignTo ?? null}
            alignPositions={columnContextMenuAlignPositions}
            constrainTo={columnContextMenuConstrainTo}
            position={columnContextMenuPosition}
            updatePositionOnScroll={updateMenuPositionOnScroll}
            positionRevision={
              updateMenuPositionOnColumnsChange
                ? `${renderColumnOrder.join("|")}:${Object.values(
                    columnWidths
                  ).join("|")}:${Object.values(columnVisibilityMap).join("|")}`
                : undefined
            }
            restoreFocusTo={columnContextMenu?.restoreFocusTo}
            ariaLabel="Column menu"
            testId="tdg-column-context-menu"
            rtl={rtl}
          >
            {renderedColumnContextMenu !== undefined ? (
              renderedColumnContextMenu
            ) : columnVisibilityMenuOpen ? (
              <>
                <DropdownMenuLabel>
                  {t(i18n, "columns", "Columns")}
                </DropdownMenuLabel>
                {groupedColumns.map((column) => {
                  const columnId = getColumnId(column);
                  const visible = columnVisibilityMap[columnId] !== false;
                  const disabled =
                    column.hideable === false ||
                    (visible && visibleColumnCount <= 1);
                  return (
                    <DropdownMenuCheckboxItem
                      key={columnId}
                      checked={visible}
                      disabled={disabled}
                      onCheckedChange={(checked) =>
                        setColumnVisibleById(columnId, checked === true)
                      }
                      onSelect={(event) => event.preventDefault()}
                    >
                      <span className="truncate">
                        {typeof column.header === "string"
                          ? column.header
                          : (column.name ?? column.id ?? columnId)}
                      </span>
                    </DropdownMenuCheckboxItem>
                  );
                })}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault();
                    setColumnVisibilityMenuOpen(false);
                  }}
                >
                  {t(i18n, "back", "Back")}
                </DropdownMenuItem>
              </>
            ) : (
              <>
                <DropdownMenuItem
                  disabled={!contextMenuCanSort}
                  onSelect={() =>
                    contextMenuColumnId &&
                    setColumnSortInfoCompat(contextMenuColumnId, 1)
                  }
                >
                  {t(i18n, "sortAsc", "Sort A→Z")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={!contextMenuCanSort}
                  onSelect={() =>
                    contextMenuColumnId &&
                    setColumnSortInfoCompat(contextMenuColumnId, -1)
                  }
                >
                  {t(i18n, "sortDesc", "Sort Z→A")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={!contextMenuCanUnsort}
                  onSelect={() =>
                    contextMenuColumnId &&
                    setColumnSortInfoCompat(contextMenuColumnId, 0)
                  }
                >
                  {t(i18n, "unsort", "Unsort")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  disabled={enableFiltering !== undefined}
                  onSelect={() =>
                    setEnableFilteringCompat(!effectiveEnableFiltering)
                  }
                >
                  {effectiveEnableFiltering
                    ? t(i18n, "hideFiltering", "Hide filtering")
                    : t(i18n, "showFiltering", "Show filtering")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault();
                    setColumnVisibilityMenuOpen(true);
                  }}
                >
                  {t(i18n, "columns", "Columns")}
                </DropdownMenuItem>
                {enableColumnAutosize ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      disabled={!contextMenuColumnId}
                      onSelect={() =>
                        contextMenuColumnId &&
                        autosizeColumn(contextMenuColumnId)
                      }
                    >
                      {t(i18n, "autoSizeColumn", "Auto size this column")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => setColumnsSizesAutoCompat()}
                    >
                      {t(i18n, "autoSizeAllColumns", "Auto size all columns")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={setColumnSizesToFitCompat}>
                      {t(i18n, "sizeColumnsToFit", "Size columns to fit")}
                    </DropdownMenuItem>
                  </>
                ) : null}
              </>
            )}
          </GridContextMenuLayer>
          <GridContextMenuLayer
            open={showRowMenuLayer}
            onOpenChange={(open) => {
              if (!open) hideRowContextMenu();
            }}
            alignTo={rowContextMenu?.alignTo ?? null}
            alignPositions={rowContextMenuAlignPositions}
            constrainTo={rowContextMenuConstrainTo}
            position={rowContextMenuPosition}
            updatePositionOnScroll={updateMenuPositionOnScroll}
            positionRevision={
              updateMenuPositionOnColumnsChange
                ? `${renderColumnOrder.join("|")}:${Object.values(
                    columnWidths
                  ).join("|")}`
                : undefined
            }
            restoreFocusTo={rowContextMenu?.restoreFocusTo}
            ariaLabel="Row context menu"
            testId="tdg-row-context-menu"
            rtl={rtl}
          >
            {renderedRowContextMenu}
          </GridContextMenuLayer>
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
  Symbol.for("@geovi/the-datagrid/toolbar-target"),
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
