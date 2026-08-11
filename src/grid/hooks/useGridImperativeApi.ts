import * as React from "react";
import type { Row } from "@tanstack/react-table";

import type {
  TypeActiveCell,
  TypeCellProps,
  TypeCellSelection,
  TypeColumn,
  TypeComputedColumn,
  TypeComputedColumnsMap,
  TypeComputedProps,
  TypeDataGridProps,
  TypeFilterTypes,
  TypeFilterValue,
  TypeGetColumnByParam,
  TypePaginationProps,
  TypeRowSelection,
  TypeRowUnselected,
  TypeShowCellBorders,
  TypeSingleFilterValue,
  TypeSortInfo,
} from "../../types";
import { getColumnId } from "../../utils/column";
import { clamp, t } from "../../utils/helpers";
import { clearAllFilters, isFilterEntryEmptyValue } from "../../filters/utils";
import { toSelectionMap, unwrapSelectionState } from "../utils/gridUtils";
import { getColumnWidthBounds } from "../utils/columnWidthEstimation";
import { resolveStateAction } from "../internalProps";
import type {
  InternalDataGridProps,
  OpenColumnContextMenu,
  OpenRowContextMenu,
} from "../internalProps";
import type { LoadingStore } from "../utils/loadingStore";
import type { GridEditingCell } from "../components/GridBody";

import type { useGridColumnApi } from "./useGridColumnApi";
import type { useGridColumnResize } from "./useGridColumnResize";
import type { useGridColumnSizingApi } from "./useGridColumnSizingApi";
import type { useGridEditing } from "./useGridEditing";
import type { useGridKeyboardNavigation } from "./useGridKeyboardNavigation";
import type { useGridPaginationApi } from "./useGridPaginationApi";
import type { useGridRowApi } from "./useGridRowApi";
import type { useGridScrollApi } from "./useGridScrollApi";
import type { useGridSelection } from "./useGridSelection";
import type { useGridVirtualListApi } from "./useGridVirtualListApi";

type ColumnApi = ReturnType<typeof useGridColumnApi>;
type ColumnResizeApi = ReturnType<typeof useGridColumnResize>;
type ColumnSizingApi = ReturnType<typeof useGridColumnSizingApi>;
type EditingApi = ReturnType<typeof useGridEditing>;
type KeyboardApi = ReturnType<typeof useGridKeyboardNavigation>;
type PaginationApi = ReturnType<typeof useGridPaginationApi>;
type RowApi = ReturnType<typeof useGridRowApi>;
type ScrollApi = ReturnType<typeof useGridScrollApi>;
type SelectionApi = ReturnType<typeof useGridSelection>;
type VirtualListApi = ReturnType<typeof useGridVirtualListApi>;

export type LockedColumnMetrics = {
  hasLockedStart: boolean;
  hasLockedEnd: boolean;
  hasUnlocked: boolean;
  firstLockedStartIndex: number;
  lastLockedStartIndex: number;
  firstUnlockedIndex: number;
  lastUnlockedIndex: number;
  firstLockedEndIndex: number;
  lastLockedEndIndex: number;
  totalLockedStartWidth: number;
  totalLockedEndWidth: number;
  totalUnlockedWidth: number;
};

export type UseGridImperativeApiParams = {
  allComputedColumns: TypeComputedColumn[];
  allInputColumns: TypeColumn[];
  apiRef: React.MutableRefObject<TypeComputedProps | null>;
  canNext: boolean;
  cancelEditCompat: EditingApi["cancelEditCompat"];
  cellMultiSelect: boolean;
  cellSelectionByIndex: boolean;
  cellSelectionEnabled: boolean;
  cellSelectionState: TypeCellSelection;
  checkboxColId: string;
  checkboxEnabled: boolean;
  clearColumnFilterCompat: ColumnApi["clearColumnFilterCompat"];
  columnContextMenu: OpenColumnContextMenu | null;
  columnContextMenuAlignPositions: TypeDataGridProps["columnContextMenuAlignPositions"];
  columnContextMenuConstrainTo: TypeDataGridProps["columnContextMenuConstrainTo"];
  columnContextMenuPosition: NonNullable<
    TypeDataGridProps["columnContextMenuPosition"]
  >;
  columnFlexes: ColumnSizingApi["columnFlexes"];
  columnLayout: readonly {
    id: string;
    width: number;
    minWidth?: number;
    maxWidth?: number;
  }[];
  columnOrderForDs: string[];
  columnSizes: ColumnSizingApi["columnSizes"];
  columnVisibilityMap: Record<string, boolean>;
  columnWidthPrefixSums: number[];
  columnWidths: Readonly<Record<string, number>>;
  computedOnColumnFilterValueChangeCompat: ColumnApi["computedOnColumnFilterValueChangeCompat"];
  columnsMap: TypeComputedColumnsMap;
  commitColumnPixelResize: ColumnResizeApi["commitColumnPixelResize"];
  commitColumnResizeEntries: ColumnResizeApi["commitColumnResizeEntries"];
  commitRowSelection: SelectionApi["commitRowSelection"];
  completeEditCompat: EditingApi["completeEditCompat"];
  computedColumnDefaultWidth: number;
  computedColumnMaxWidth: number | null;
  computedColumnMinWidth: number;
  computedFilterValueMap: Record<string, TypeSingleFilterValue> | null;
  computedRowHeights: Record<string, number>;
  computedVirtualizeColumns: boolean;
  controlledLoadingRef: React.MutableRefObject<boolean | undefined>;
  count: number;
  currentEditCompletePromiseRef: EditingApi["currentEditCompletePromiseRef"];
  dataSource: TypeDataGridProps["dataSource"];
  deselectAllCompat: RowApi["deselectAllCompat"];
  editStartEvent: string;
  editable: boolean;
  editingCell: GridEditingCell | null;
  effectiveEnableFiltering: boolean;
  emitSelectionChange: (
    nextSelected: TypeRowSelection,
    meta?: { data?: unknown; unselected?: TypeRowSelection }
  ) => void;
  enableFiltering: boolean | undefined;
  enableKeyboardNavigation: boolean;
  filterContextMenuOnHideRef: React.MutableRefObject<(() => void) | null>;
  filterControlled: boolean;
  filterTypes: TypeFilterTypes;
  filterValue: TypeFilterValue;
  getCellSelectionBetweenCompat: SelectionApi["getCellSelectionBetweenCompat"];
  getCellSelectionKey: SelectionApi["getCellSelectionKey"];
  getColumnByCompat: ColumnApi["getColumnByCompat"];
  getColumnFilterValueCompat: ColumnApi["getColumnFilterValueCompat"];
  getColumnIdCompat: ColumnApi["getColumnIdCompat"];
  getCurrentEditInfoCompat: EditingApi["getCurrentEditInfoCompat"];
  getItemId: (data: any) => any;
  getItemIndexByIdCompat: RowApi["getItemIndexByIdCompat"];
  getRenderRangeCompat: ScrollApi["getRenderRangeCompat"];
  getRowHeightByIdCompat: (rowId: string | number) => number;
  getRowKey: (row: any, index: number) => string;
  getScrollLeftCompat: ScrollApi["getScrollLeftCompat"];
  getScrollingElement: ScrollApi["getScrollingElement"];
  gotoFirstPage: PaginationApi["gotoFirstPage"];
  gotoLastPage: PaginationApi["gotoLastPage"];
  gotoNextPage: PaginationApi["gotoNextPage"];
  gotoPrevPage: PaginationApi["gotoPrevPage"];
  gridFocused: boolean;
  gridIdRef: React.MutableRefObject<number>;
  handleGridFocus: KeyboardApi["handleGridFocus"];
  handleGridKeyDown: KeyboardApi["handleGridKeyDown"];
  handleScroll: React.UIEventHandler<HTMLDivElement>;
  hasNextPage: PaginationApi["hasNextPage"];
  hasPrevPage: PaginationApi["hasPrevPage"];
  hideColumnContextMenu: () => void;
  hideColumnFilterContextMenu: () => void;
  hideRowContextMenu: () => void;
  i18n: TypeDataGridProps["i18n"];
  idProperty: string;
  incrementActiveCellCompat: SelectionApi["incrementActiveCellCompat"];
  incrementActiveIndex: SelectionApi["incrementActiveIndex"];
  incrementScrollLeftCompat: ScrollApi["incrementScrollLeftCompat"];
  incrementScrollTopCompat: ScrollApi["incrementScrollTopCompat"];
  isCellSelected: SelectionApi["isCellSelected"];
  isInEditRef: EditingApi["isInEditRef"];
  isRowFullyVisibleCompat: ScrollApi["isRowFullyVisibleCompat"];
  isRowRenderedCompat: ScrollApi["isRowRenderedCompat"];
  lastActiveIndexRef: React.MutableRefObject<number | null>;
  limit: number;
  loadSkip: number;
  loading: boolean;
  loadingStore: LoadingStore;
  localPagination: boolean;
  lockedColumnMetrics: LockedColumnMetrics;
  lockedEndColumns: TypeComputedColumn[];
  lockedStartColumns: TypeComputedColumn[];
  multiSelect: boolean | undefined;
  normalizedActiveCell: TypeActiveCell;
  normalizedActiveIndex: number;
  notifyFilteredRowsCount: (count: number) => void;
  onCellDoubleClick: TypeDataGridProps["onCellDoubleClick"];
  onRowClick: TypeDataGridProps["onRowClick"];
  onRowDoubleClick: TypeDataGridProps["onRowDoubleClick"];
  openFilterMenuColId: string | null;
  orderedColumns: TypeColumn[];
  originalData: any[];
  paginationMode: TypeDataGridProps["pagination"];
  paginationProps: TypePaginationProps;
  publicProps: InternalDataGridProps;
  reload: () => void;
  remotePagination: boolean;
  reservedViewportWidth: number;
  reservedViewportWidthRef: React.MutableRefObject<number>;
  resolveRowHeight: (rowIndex: number) => number;
  rootRef: React.RefObject<HTMLDivElement | null>;
  rowContextMenu: OpenRowContextMenu | null;
  rowContextMenuAlignPositions: TypeDataGridProps["rowContextMenuAlignPositions"];
  rowContextMenuConstrainTo: TypeDataGridProps["rowContextMenuConstrainTo"];
  rowContextMenuPosition: NonNullable<
    TypeDataGridProps["rowContextMenuPosition"]
  >;
  rowModel: Row<any>[];
  rows: any[];
  safeLimit: number;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  scrollToCellCompat: ScrollApi["scrollToCellCompat"];
  scrollToColumnCompat: ScrollApi["scrollToColumnCompat"];
  scrollToIndexCompat: ScrollApi["scrollToIndexCompat"];
  selectAllCompat: RowApi["selectAllCompat"];
  selected: TypeRowSelection;
  selectedMap: Record<string, any>;
  selectionEnabled: boolean;
  setActiveCellCompat: SelectionApi["setActiveCellCompat"];
  setActiveIndexCompat: SelectionApi["setActiveIndexCompat"];
  setCellSelectionState: (next: TypeCellSelection) => void;
  setColumnContextMenu: React.Dispatch<
    React.SetStateAction<OpenColumnContextMenu | null>
  >;
  setColumnFilterValueCompat: ColumnApi["setColumnFilterValueCompat"];
  setColumnFlexesCompat: ColumnSizingApi["setColumnFlexesCompat"];
  setColumnOrderCompat: ColumnApi["setColumnOrderCompat"];
  setColumnSizeAutoCompat: ColumnSizingApi["setColumnSizeAutoCompat"];
  setColumnSizesCompat: ColumnSizingApi["setColumnSizesCompat"];
  setColumnSizesToFitCompat: ColumnSizingApi["setColumnSizesToFitCompat"];
  setColumnSortInfoCompat: ColumnApi["setColumnSortInfoCompat"];
  setColumnVisibleCompat: ColumnApi["setColumnVisibleCompat"];
  setColumnsSizesAutoCompat: ColumnSizingApi["setColumnsSizesAutoCompat"];
  setShowCellBorders: React.Dispatch<React.SetStateAction<TypeShowCellBorders>>;
  setShowEmptyRows: React.Dispatch<React.SetStateAction<boolean>>;
  setShowHoverRows: React.Dispatch<React.SetStateAction<boolean>>;
  setEnableFilteringCompat: (next: React.SetStateAction<boolean>) => void;
  setFilterValueAndResetPage: PaginationApi["setFilterValueAndResetPage"];
  setGridFocused: React.Dispatch<React.SetStateAction<boolean>>;
  setItemAtCompat: RowApi["setItemAtCompat"];
  setItemPropertyAtCompat: RowApi["setItemPropertyAtCompat"];
  setItemPropertyForIdCompat: RowApi["setItemPropertyForIdCompat"];
  setItemsAtCompat: RowApi["setItemsAtCompat"];
  setLimitAndResetPage: PaginationApi["setLimitAndResetPage"];
  setOpenFilterMenuColId: React.Dispatch<React.SetStateAction<string | null>>;
  setReservedViewportWidth: React.Dispatch<React.SetStateAction<number>>;
  setRowContextMenu: React.Dispatch<
    React.SetStateAction<OpenRowContextMenu | null>
  >;
  setRowHeightByIdCompat: (
    nextHeight: number | null,
    rowId: string | number
  ) => void;
  setRowHeightsCompat: (nextRowHeights: Record<string, number>) => void;
  setRows: React.Dispatch<React.SetStateAction<any[]>>;
  setScrollLeftCompat: ScrollApi["setScrollLeftCompat"];
  setScrollTopCompat: ScrollApi["setScrollTopCompat"];
  setSelectedAtCompat: RowApi["setSelectedAtCompat"];
  setSelectedByIdCompat: RowApi["setSelectedByIdCompat"];
  setSelectedCompat: RowApi["setSelectedCompat"];
  setShowHeader: React.Dispatch<React.SetStateAction<boolean>>;
  setShowZebraRows: (next: React.SetStateAction<boolean>) => void;
  setSkip: (nextSkip: number) => void;
  setSortInfoAndResetPage: PaginationApi["setSortInfoAndResetPage"];
  showCellBorders: TypeDataGridProps["showCellBorders"];
  showColumnContextMenu: (
    alignTo: HTMLElement | { left: number; top: number },
    cellProps: TypeCellProps,
    config?: { computedVisibleIndex?: number },
    onHide?: () => void,
    restoreFocusTo?: HTMLElement | null
  ) => void;
  showEmptyRows: boolean;
  showHeader: boolean;
  showHorizontalCellBorders: boolean;
  showHoverRows: boolean;
  showRowContextMenu: (
    alignTo: HTMLElement | { left: number; top: number },
    rowProps: any,
    cellProps?: TypeCellProps,
    onHide?: () => void,
    restoreFocusTo?: HTMLElement | null
  ) => void;
  showVerticalCellBorders: boolean;
  showZebraRows: boolean;
  skip: number;
  sortInfo: TypeSortInfo;
  stableApi: TypeComputedProps;
  stableApiTarget: TypeComputedProps;
  startEditCompat: EditingApi["startEditCompat"];
  surfaceRef: React.RefObject<HTMLDivElement | null>;
  table: { setColumnOrder: (order: string[]) => void };
  toggleActiveCellSelectionCompat: SelectionApi["toggleActiveCellSelectionCompat"];
  toggleColumnSortCompat: ColumnApi["toggleColumnSortCompat"];
  tryStartEditCompat: EditingApi["tryStartEditCompat"];
  unlockedColumns: TypeComputedColumn[];
  unselected: TypeRowUnselected;
  updateMenuPositionOnScroll: boolean;
  virtualItems: readonly { index: number }[];
  virtualListCompat: VirtualListApi["virtualListCompat"];
  virtualized: boolean;
  visibleColumnsMap: TypeComputedColumnsMap;
  visibleComputedColumns: TypeComputedColumn[];
};

/**
 * Assembles the Inovua-compatible `TypeComputedProps` surface and publishes it
 * on `apiRef` / the stable API proxy.
 *
 * The object it builds holds roughly a hundred arrow functions that live for as
 * long as the grid does. Building it here means those functions capture this
 * hook's parameters instead of the entire `ReactDataGrid` render scope.
 */
export function useGridImperativeApi(params: UseGridImperativeApiParams) {
  const {
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
  } = params;

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
      }[],
      context?: { reservedViewportWidth: number }
    ) => {
      commitColumnResizeEntries(
        info,
        context?.reservedViewportWidth ?? reservedViewportWidthRef.current
      );
    };

    const baseApi: TypeComputedProps = {
      ...publicProps,
      reload,
      initialProps: publicProps,
      data: rows,
      originalData,
      count,
      dataCountAfterFilter: count,
      filteredRowsCount: notifyFilteredRowsCount,
      computedSkip: loadSkip,
      computedLimit: limit,
      getData: () => rows,
      getCount: () => count,
      getSkip: () => loadSkip,
      getLimit: () => limit,
      setSkip: (next) => setSkip(next),
      setLimit: setLimitAndResetPage,
      computedSortInfo: sortInfo,
      computedIsMultiSort: Array.isArray(sortInfo),
      getSortInfo: () => sortInfo,
      setSortInfo: setSortInfoAndResetPage,
      toggleColumnSort: toggleColumnSortCompat,
      setColumnSortInfo: setColumnSortInfoCompat,
      unsortColumn: (column) => setColumnSortInfoCompat(column, 0),
      computedFilterValue: filterValue,
      computedFiltered: Boolean(
        filterValue?.some(
          (entry) => !isFilterEntryEmptyValue(entry, filterTypes)
        )
      ),
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
      isLoading: () => loadingStore.getEffective(controlledLoadingRef.current),
      setLoading: (nextLoading) => {
        loadingStore.setOverride(
          resolveStateAction(nextLoading, loadingStore.getOverride() ?? false)
        );
        if (apiRef.current) {
          apiRef.current.computedLoading = loadingStore.getEffective(
            controlledLoadingRef.current
          );
        }
      },
      computedFilterable: effectiveEnableFiltering,
      computedIsFilterable: effectiveEnableFiltering,
      setEnableFiltering: setEnableFilteringCompat,
      computedShowHeader: showHeader,
      setShowHeader: (nextValue) => {
        setShowHeader((current) => resolveStateAction(nextValue, current));
      },
      showHorizontalCellBorders,
      showVerticalCellBorders,
      computedShowCellBorders: showCellBorders,
      setShowCellBorders,
      computedRemoteData: !Array.isArray(dataSource),
      computedRemotePagination: remotePagination,
      computedRemoteFilter:
        !Array.isArray(dataSource) && effectiveEnableFiltering,
      computedLocalPagination: localPagination,
      computedPagination: paginationMode !== false,
      computedLivePagination: false,
      remoteSort: !Array.isArray(dataSource),
      paginationProps,
      hasNextPage,
      hasPrevPage,
      gotoNextPage,
      gotoPrevPage,
      gotoFirstPage,
      gotoLastPage,
      getItemId,
      getItemAt: (index) => rows[index],
      getItemIdAt: (index) => {
        const row = rows[index];
        return row ? (row as any)?.[idProperty] : undefined;
      },
      getItemIndex: (id) => getItemIndexByIdCompat(id),
      getRowIndexById: (rowId, data) => getItemIndexByIdCompat(rowId, data),
      getItemIndexById: (rowId, data) => getItemIndexByIdCompat(rowId, data),
      setItemPropertyAt: setItemPropertyAtCompat,
      setItemPropertyForId: setItemPropertyForIdCompat,
      setItemAt: setItemAtCompat,
      setItemsAt: setItemsAtCompat,
      computedSelected: selected,
      computedUnselected: unselected,
      computedRowSelectionEnabled: selectionEnabled,
      computedRowMultiSelectionEnabled: Boolean(multiSelect),
      getSelectedMap: () => ({ ...selectedMap }),
      setSelected: setSelectedCompat,
      setUnselected: (nextUnselected) => {
        const resolved = resolveStateAction(nextUnselected, unselected);
        emitSelectionChange(true, {
          data: rows,
          unselected: resolved,
        });
      },
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
      getUnselectedCount: (value = unselected) =>
        Object.keys(value ?? {}).length,
      isSelectionEmpty: () =>
        unwrapSelectionState(selected) !== true &&
        Object.keys(selectedMap).length === 0,
      setSelectedById: setSelectedByIdCompat,
      setSelectedAt: setSelectedAtCompat,
      setRowSelected: setSelectedAtCompat,
      setScrollLeft: setScrollLeftCompat,
      incrementScrollLeft: incrementScrollLeftCompat,
      getScrollLeft: getScrollLeftCompat,
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
      getMenuAvailableHeight: () => {
        const rect = rootNode?.getBoundingClientRect();
        return Math.max(0, window.innerHeight - (rect?.top ?? 0));
      },
      isFilterable: () => effectiveEnableFiltering,
      shouldShowFilteringMenuItems: () => effectiveEnableFiltering,
      updateMenuPositions: () => {
        setColumnContextMenu((current) => (current ? { ...current } : current));
        setRowContextMenu((current) => (current ? { ...current } : current));
      },
      onScroll: handleScroll,
      rtlOffset: getScrollLeftCompat(),
      columnFilterContextMenuProps: openFilterMenuColId
        ? { columnId: openFilterMenuColId }
        : null,
      columnContextMenuProps: columnContextMenu
        ? {
            alignTo: columnContextMenu.alignTo,
            alignPositions: columnContextMenuAlignPositions,
            cellProps: columnContextMenu.cellProps,
            constrainTo: columnContextMenuConstrainTo,
            position: columnContextMenuPosition,
            updatePositionOnScroll: updateMenuPositionOnScroll,
          }
        : null,
      rowContextMenuProps: rowContextMenu
        ? {
            alignTo: rowContextMenu.alignTo,
            alignPositions: rowContextMenuAlignPositions,
            cellProps: rowContextMenu.cellProps,
            constrainTo: rowContextMenuConstrainTo,
            position: rowContextMenuPosition,
            rowProps: rowContextMenu.rowProps,
            updatePositionOnScroll: updateMenuPositionOnScroll,
          }
        : null,
      showColumnFilterContextMenu: (...args) => {
        const alignTo = args[0];
        const suppliedCellProps = args[1] as TypeCellProps | undefined;
        const elementColumnId =
          alignTo instanceof HTMLElement
            ? alignTo.closest<HTMLElement>("[data-column-id]")?.dataset.columnId
            : undefined;
        const target =
          suppliedCellProps?.columnId ??
          suppliedCellProps?.name ??
          elementColumnId ??
          (alignTo as TypeGetColumnByParam | undefined);
        if (target === undefined) return;

        const columnId =
          typeof target === "string" && columnsMap[target]
            ? target
            : getColumnIdCompat(target);
        if (columnId) {
          const onHide = [...args]
            .reverse()
            .find((arg) => typeof arg === "function") as
            | (() => void)
            | undefined;
          filterContextMenuOnHideRef.current = onHide ?? null;
          setOpenFilterMenuColId(columnId);
        }
      },
      hideColumnFilterContextMenu,
      showColumnContextMenu,
      hideColumnContextMenu,
      showRowContextMenu,
      hideRowContextMenu,
      loadNextPage: () => {
        if (canNext) {
          setSkip(loadSkip + safeLimit);
        }
      },
      paginationCount: count,
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
      computedSetFocused: setGridFocused,
      computedOnKeyDown: handleGridKeyDown,
      computedOnFocus: handleGridFocus,
      toggleActiveRowSelection: (event = {}) => {
        if (normalizedActiveIndex < 0) return;
        commitRowSelection(normalizedActiveIndex, event);
      },
      computedOnRowClick: (event, rowProps) => {
        onRowClick?.(rowProps, event);
      },
      computedRowDoubleClick: onRowDoubleClick,
      computedCellDoubleClick: onCellDoubleClick,
      setActiveIndex: setActiveIndexCompat,
      incrementActiveIndex,
      computedActiveCell: normalizedActiveCell,
      computedCellSelection: cellSelectionState,
      computedCellSelectionEnabled: cellSelectionEnabled,
      computedCellMultiSelectionEnabled: cellMultiSelect,
      computedCellNavigationEnabled: cellSelectionEnabled,
      computedCellSelectionByIndex: cellSelectionByIndex,
      getActiveCell: () => normalizedActiveCell,
      setActiveCell: setActiveCellCompat,
      getCellSelection: () => cellSelectionState,
      setCellSelection: setCellSelectionState,
      getCellSelectionIdKey: getCellSelectionKey,
      getCellSelectionKey: (cell, column) => {
        if (typeof cell === "object" && cell !== null) {
          return typeof cell.rowIndex === "number" &&
            typeof cell.columnIndex === "number"
            ? getCellSelectionKey(cell.rowIndex, cell.columnIndex)
            : "";
        }

        const rowIndex = getItemIndexByIdCompat(cell);
        const columnId =
          column === undefined ? undefined : getColumnIdCompat(column);
        const columnIndex =
          columnId === undefined
            ? -1
            : orderedColumns.findIndex(
                (candidate) => getColumnId(candidate) === columnId
              );
        return rowIndex < 0 || columnIndex < 0
          ? ""
          : getCellSelectionKey(rowIndex, columnIndex);
      },
      incrementActiveCell: incrementActiveCellCompat,
      toggleActiveCellSelection: toggleActiveCellSelectionCompat,
      getCellSelectionBetween: getCellSelectionBetweenCompat,
      isCellSelected: (
        cell: TypeActiveCell | { rowIndex: number; columnIndex: number }
      ) =>
        cell != null &&
        isCellSelected(
          Array.isArray(cell) ? cell[0] : cell.rowIndex,
          Array.isArray(cell) ? cell[1] : cell.columnIndex
        ),
      isCellVisible: ({ rowIndex, columnIndex }) => {
        const rowNode = surfaceNode?.querySelector<HTMLElement>(
          `[data-slot="grid-row"][data-row-index="${rowIndex}"]`
        );
        const column = orderedColumns[columnIndex];
        const viewportNode = scrollRef.current;
        if (!rowNode || !column || !viewportNode) return false;
        const columnId = getColumnId(column);
        const cellNode = Array.from(
          rowNode.querySelectorAll<HTMLElement>("[data-column-id]")
        ).find((node) => node.dataset.columnId === columnId);
        if (!cellNode) return false;

        const viewportRect = viewportNode.getBoundingClientRect();
        const cellRect = cellNode.getBoundingClientRect();
        const differences = {
          topDiff: Math.max(0, viewportRect.top - cellRect.top),
          bottomDiff: Math.max(0, cellRect.bottom - viewportRect.bottom),
          leftDiff: Math.max(0, viewportRect.left - cellRect.left),
          rightDiff: Math.max(0, cellRect.right - viewportRect.right),
        };
        return Object.values(differences).every((value) => value === 0)
          ? true
          : differences;
      },
      computedShowHoverRows: showHoverRows,
      setShowHoverRows,
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
      computedRowHeights,
      setRowHeights: setRowHeightsCompat,
      setRowHeightById: setRowHeightByIdCompat,
      getRowHeightById: getRowHeightByIdCompat,
      getRowHeight: resolveRowHeight,
      computedShowEmptyRows: showEmptyRows,
      setShowEmptyRows,
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
        const { minWidth, maxWidth } = getColumnWidthBounds(
          column,
          computedColumnMinWidth,
          computedColumnMaxWidth
        );
        const nextWidth = clamp(
          (columnWidths[columnId] ??
            column.width ??
            column.defaultWidth ??
            computedColumnDefaultWidth) + diff,
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
        }[],
        context?: { reservedViewportWidth: number }
      ) => {
        applyColumnResizeBatch(info, context);
      },
      columnFlexes,
      columnSizes,
      setColumnFlexes: setColumnFlexesCompat,
      setColumnSizes: setColumnSizesCompat,
      setColumnsSizesAuto: setColumnsSizesAutoCompat,
      setColumnSizeAuto: setColumnSizeAutoCompat,
      setColumnSizesToFit: setColumnSizesToFitCompat,
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
      computedEnableRowspan: orderedColumns.some(
        (column) => column.rowspan != null
      ),
      computedHasColSpan: orderedColumns.some(
        (column) => column.colspan != null
      ),
      computedEnableColumnHover: showHoverRows,
      availableWidth: viewportWidth,
      edition: "community",
      computedLicenseValid: true,
      getColumnLayout: () => columnLayout,
      computedShowHeaderBorderRight: showVerticalCellBorders,
      silentSetData: setRows,
      setOriginalData: setRows,
      getVirtualList: () => virtualListCompat,
      getState: () => ({
        data: rows,
        count,
        skip: loadSkip,
        limit,
        sortInfo,
        filterValue,
        selected,
        unselected,
        activeIndex: normalizedActiveIndex,
        activeCell: normalizedActiveCell,
        cellSelection: cellSelectionState,
        columnOrder: columnOrderForDs,
        rowHeights: computedRowHeights,
      }),
    };

    baseApi.publicAPI = stableApi;

    for (const property of Reflect.ownKeys(stableApiTarget)) {
      Reflect.deleteProperty(stableApiTarget, property);
    }
    Object.assign(stableApiTarget, baseApi);
    Object.defineProperties(stableApiTarget, {
      scrollLeft: {
        configurable: true,
        enumerable: true,
        get: getScrollLeftCompat,
        set: setScrollLeftCompat,
      },
      scrollTop: {
        configurable: true,
        enumerable: true,
        get: () => scrollRef.current?.scrollTop ?? 0,
        set: setScrollTopCompat,
      },
    });
    apiRef.current = stableApi;
  }, [
    allComputedColumns,
    canNext,
    cellMultiSelect,
    cellSelectionByIndex,
    cellSelectionEnabled,
    cellSelectionState,
    checkboxColId,
    checkboxEnabled,
    columnFlexes,
    columnContextMenu,
    columnContextMenuAlignPositions,
    columnContextMenuConstrainTo,
    columnContextMenuPosition,
    columnLayout,
    columnOrderForDs,
    columnSizes,
    columnVisibilityMap,
    columnWidthPrefixSums,
    columnWidths,
    columnsMap,
    commitColumnPixelResize,
    commitColumnResizeEntries,
    commitRowSelection,
    computedColumnDefaultWidth,
    computedColumnMaxWidth,
    computedColumnMinWidth,
    computedVirtualizeColumns,
    computedFilterValueMap,
    computedOnColumnFilterValueChangeCompat,
    computedRowHeights,
    count,
    dataSource,
    editable,
    editStartEvent,
    editingCell,
    enableKeyboardNavigation,
    enableFiltering,
    effectiveEnableFiltering,
    emitSelectionChange,
    filterControlled,
    filterTypes,
    filterValue,
    getColumnByCompat,
    getColumnFilterValueCompat,
    getColumnIdCompat,
    getCellSelectionBetweenCompat,
    getCellSelectionKey,
    getItemIndexByIdCompat,
    getItemId,
    getScrollLeftCompat,
    getRenderRangeCompat,
    getRowKey,
    getRowHeightByIdCompat,
    getScrollingElement,
    gridFocused,
    gotoFirstPage,
    gotoLastPage,
    gotoNextPage,
    gotoPrevPage,
    handleGridFocus,
    handleGridKeyDown,
    hasNextPage,
    hasPrevPage,
    incrementActiveCellCompat,
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
    isCellSelected,
    limit,
    localPagination,
    loading,
    loadingStore,
    loadSkip,
    lockedColumnMetrics,
    lockedEndColumns,
    lockedStartColumns,
    multiSelect,
    normalizedActiveIndex,
    normalizedActiveCell,
    notifyFilteredRowsCount,
    onCellDoubleClick,
    onRowClick,
    onRowDoubleClick,
    openFilterMenuColId,
    handleScroll,
    orderedColumns,
    originalData,
    paginationMode,
    paginationProps,
    publicProps,
    reload,
    remotePagination,
    reservedViewportWidth,
    rowModel.length,
    rows,
    rowContextMenu,
    rowContextMenuAlignPositions,
    rowContextMenuConstrainTo,
    rowContextMenuPosition,
    safeLimit,
    selected,
    selectedMap,
    selectionEnabled,
    unselected,
    showZebraRows,
    setColumnFilterValueCompat,
    setColumnFlexesCompat,
    setColumnOrderCompat,
    setColumnSizeAutoCompat,
    setColumnSizesCompat,
    setColumnSizesToFitCompat,
    setColumnVisibleCompat,
    setEnableFilteringCompat,
    setColumnsSizesAutoCompat,
    setColumnSortInfoCompat,
    setFilterValueAndResetPage,
    setItemAtCompat,
    setItemPropertyAtCompat,
    setItemPropertyForIdCompat,
    setItemsAtCompat,
    setLimitAndResetPage,
    setRowHeightByIdCompat,
    setRowHeightsCompat,
    setSelectedAtCompat,
    setSelectedByIdCompat,
    setSelectedCompat,
    setActiveIndexCompat,
    setActiveCellCompat,
    setCellSelectionState,
    setShowZebraRows,
    setSkip,
    setSortInfoAndResetPage,
    setScrollLeftCompat,
    setScrollTopCompat,
    showHeader,
    showEmptyRows,
    showHoverRows,
    showColumnContextMenu,
    hideColumnContextMenu,
    hideColumnFilterContextMenu,
    showRowContextMenu,
    hideRowContextMenu,
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
    toggleActiveCellSelectionCompat,
    tryStartEditCompat,
    unlockedColumns,
    scrollToCellCompat,
    scrollToColumnCompat,
    scrollToIndexCompat,
    resolveRowHeight,
    clearColumnFilterCompat,
    selectAllCompat,
    deselectAllCompat,
    allInputColumns,
    visibleColumnsMap,
    visibleComputedColumns,
    virtualListCompat,
    virtualItems.length,
    virtualized,
    updateMenuPositionOnScroll,
    // Stable identities: `useRef` objects and `useState`/`useCallback([])`
    // setters threaded in as parameters. The linter cannot see their origin
    // from here, so they are listed explicitly; none of them ever change, so
    // this does not affect how often the effect re-runs.
    apiRef,
    controlledLoadingRef,
    currentEditCompletePromiseRef,
    filterContextMenuOnHideRef,
    gridIdRef,
    isInEditRef,
    lastActiveIndexRef,
    reservedViewportWidthRef,
    rootRef,
    scrollRef,
    surfaceRef,
    setColumnContextMenu,
    setGridFocused,
    setOpenFilterMenuColId,
    setReservedViewportWidth,
    setRowContextMenu,
    setRows,
    setShowCellBorders,
    setShowEmptyRows,
    setShowHeader,
    setShowHoverRows,
  ]);
}
