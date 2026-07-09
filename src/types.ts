/**
 * the-datagrid
 *
 * Compatibility-oriented type surface inspired by Inovua ReactDataGrid (MIT).
 * Goal: keep familiar type names/contracts while implementing our own runtime.
 */

import type * as React from "react";

export type TypeDataSource =
  | unknown[]
  | Promise<unknown[]>
  | Promise<{ data: unknown[]; count: number }>
  | ((props: unknown) => unknown[])
  | ((props: unknown) => Promise<unknown[]>)
  | ((props: unknown) => Promise<{ data: unknown[]; count: number }>);

export type SortDirection = 1 | -1 | 0;

export type TypeSingleSortInfo = {
  dir: SortDirection;
  name: string;
  id?: string;
  type?: string;
  fn?: (...args: unknown[]) => unknown;
  columnName?: string;
};

export type TypeSortInfo = TypeSingleSortInfo | TypeSingleSortInfo[] | null;

export type TypeSingleFilterValue = {
  name: string;
  type: string;
  operator: string;
  value: unknown;

  /**
   * For compat: Inovua keeps "empty value" semantics per type.
   * We preserve it to allow `clear` without removing the entry.
   */
  emptyValue?: unknown;

  fn?: (arg: unknown) => unknown;
  getFilterValue?: (...args: unknown[]) => unknown;

  /**
   * If not set, runtime derives active/inactive from operator and value.
   */
  active?: boolean;
};

export type TypeFilterValue = TypeSingleFilterValue[] | null;

export type TypeFilterOperator = {
  name: string;
  fn: (args: {
    value: unknown;
    filterValue: unknown;
    emptyValue?: unknown;
    data?: unknown;
    _data?: unknown;
    column?: unknown;
  }) => boolean;

  /**
   * If true, the operator remains active even if the filterValue is empty.
   * Useful for "empty"/"notEmpty".
   */
  filterOnEmptyValue?: boolean;

  /**
   * If set, selecting this operator may initialize the filter value.
   */
  valueOnOperatorSelect?: unknown;

  /**
   * If true, UI may disable editor for this operator.
   */
  disableFilterEditor?: boolean;
};

export type TypeFilterType = {
  type: string;
  emptyValue: unknown;
  operators: TypeFilterOperator[];
};

export type TypeFilterTypes = Record<string, TypeFilterType>;

export type TypeColumnRenderArgs = {
  data: any;
  rowIndex: number;
  column: IColumn;
  columnId: string;
};

export type CellProps = TypeColumnRenderArgs & {
  value: any;
  cellProps: Record<string, unknown>;
};

export type TypeColumnRenderCellProps = CellProps;

export type TypeColumnRenderFn =
  | ((cellProps: CellProps) => React.ReactNode)
  | ((value: any, args: TypeColumnRenderArgs) => React.ReactNode);

export interface IColumn {
  name?: string;
  id?: string;

  header?: React.ReactNode;
  renderHeader?: (cellProps: unknown) => React.ReactNode;

  /**
   * Compatibility note:
   * Inovua commonly uses `render({ value, data, ... }) => ReactNode`.
   * Our runtime supports BOTH:
   *  - render(cellPropsObject)   (Inovua-style)
   *  - render(value, argsObject) (legacy/internal)
   */
  render?: TypeColumnRenderFn;

  width?: number;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  flex?: number | null;
  defaultFlex?: number | null;

  visible?: boolean;
  defaultVisible?: boolean;
  defaultHidden?: boolean;
  hideable?: boolean;
  draggable?: boolean;
  resizable?: boolean;

  sortable?: boolean;
  sortName?: string;

  filterable?: boolean;
  filterType?: string;
  filterName?: string;
  filterEditor?: React.ComponentType<Record<string, unknown>>;
  filterEditorProps?: unknown;
  filterCellPadding?: React.CSSProperties["padding"];

  textAlign?: "start" | "end" | "left" | "right" | "center";
  headerAlign?: "start" | "end" | "left" | "right" | "center";

  className?: string;
  style?: unknown;
  headerProps?: { className?: string; style?: React.CSSProperties };

  [key: string]: unknown;
}

export type TypeColumn = IColumn;
export type TypeColumns = TypeColumn[];

export type TypeI18n = { [key: string]: string | React.ReactNode };

/**
 * Inovua selection in your codebase is an object map: { [id]: rowObject }.
 * We accept broad shapes, and the runtime also tolerates the emitted
 * `onSelectionChange` wrapper object being passed back through `selected`.
 */
export type TypeRowSelection =
  | string
  | number
  | boolean
  | { [key: string]: any }
  | null;

export type TypeOnSelectionChangeArg = {
  selected: TypeRowSelection;
  data?: unknown;
  unselected?: TypeRowSelection;
  originalData?: TypeDataSource;
};

export type TypeGetColumnByParam =
  | string
  | number
  | TypeColumn
  | { id: string | number; name?: string | number }
  | { name: string | number; id?: string | number };

export type TypeComputedColumn = TypeColumn & {
  computedWidth?: number;
  computedVisibleIndex?: number;
  index?: number;
};

export type TypeComputedColumnsMap = Record<string, TypeComputedColumn>;

export type TypeSize = {
  width: number;
  height: number;
};

export type TypeComputedVirtualListRange = {
  from: number;
  to: number;
};

export type TypeComputedVirtualListRow = {
  id: string | number;
  index: number;
  rowIndex: number;
  data: unknown;
  top: number;
  height: number;
  start: number;
  end: number;
};

export type TypeScrollToIndexConfig = {
  top?: boolean;
  direction?: "top" | "bottom";
  force?: boolean;
  duration?: number;
  offset?: number;
};

export type TypeScrollToIndex = (
  index: number,
  config?: TypeScrollToIndexConfig,
  callback?: (...args: unknown[]) => void
) => void;

export type TypeComputedVirtualList = {
  props: Record<string, unknown>;
  context: Record<string, unknown>;
  refs: {
    container: React.MutableRefObject<HTMLElement | null>;
    scroller: React.MutableRefObject<HTMLElement | null>;
  };
  size: TypeSize;
  rows: TypeComputedVirtualListRow[];
  row: TypeComputedVirtualListRow | null;
  scrollTopPos: number;
  scrollLeftPos: number;
  prevScrollTopPos: number;
  prevScrollLeftPos: number;
  visibleCount: number;

  getContainerNode: () => HTMLElement | null;
  getScrollerNode: () => HTMLElement | null;
  getScrollingElement: () => HTMLElement | null;
  getTotalRowHeight: () => number;
  getScrollHeight: () => number;
  getScrollSize: () => TypeSize;
  getClientSize: () => TypeSize;
  getRows: () => TypeComputedVirtualListRow[];
  forEachRow: (
    callback: (row: TypeComputedVirtualListRow, index: number) => void
  ) => void;
  getRowAt: (index: number) => TypeComputedVirtualListRow | undefined;
  getVisibleCount: () => number;
  getVisibleRange: () => TypeComputedVirtualListRange;
  setRowIndex: (index: number) => void;
  scrollToIndex: TypeScrollToIndex;
  smoothScrollTo: TypeScrollToIndex;
  refreshLayout: () => void;
  updateVisibleCount: () => number;
  isRowRendered: (rowIndex: number) => boolean;
  isRowVisible: (rowIndex: number) => boolean;
  getRenderedIndexes: () => number[];
  getMaxRenderCount: () => number;
};

export type TypeComputedProps = {
  /**
   * Inovua exposes a very broad computed-props object.
   * Keep this type intentionally open so legacy property access continues
   * to type-check even when our runtime only implements a compat subset.
   */
  [key: string]: any;

  reload: () => void;

  initialProps?: unknown;
  publicAPI?: TypeComputedProps;

  data?: unknown[];
  originalData?: unknown[];
  count?: number;
  dataCountAfterFilter?: number;

  getData: () => unknown[];
  getCount: () => number;

  computedSkip?: number;
  computedLimit?: number;
  getSkip: () => number;
  getLimit: () => number;
  setSkip: (skip: number) => void;
  setLimit: (limit: number) => void;

  computedSortInfo?: TypeSortInfo;
  getSortInfo: () => TypeSortInfo;
  setSortInfo: (sortInfo: TypeSortInfo) => void;
  toggleColumnSort?: (column: TypeGetColumnByParam) => void;
  setColumnSortInfo?: (
    column: TypeGetColumnByParam,
    dir: SortDirection
  ) => void;
  unsortColumn?: (column: TypeGetColumnByParam) => void;

  computedFilterValue?: TypeFilterValue;
  computedFilterValueMap?: Record<string, TypeSingleFilterValue> | null;
  getFilterValue: () => TypeFilterValue;
  setFilterValue: (filterValue: TypeFilterValue) => void;
  clearAllFilters?: () => void;
  clearColumnFilter?: (column: TypeGetColumnByParam) => void;
  getColumnFilterValue?: (
    column: TypeGetColumnByParam
  ) => TypeSingleFilterValue | undefined;
  setColumnFilterValue?: (column: TypeGetColumnByParam, value: unknown) => void;
  isColumnFiltered?: (column: TypeGetColumnByParam) => boolean;

  computedColumnOrder?: string[] | undefined;
  getColumnOrder: () => string[];
  setColumnOrder: (columnOrder: string[]) => void;
  columnsMap?: TypeComputedColumnsMap;
  visibleColumnsMap?: TypeComputedColumnsMap;
  allColumns?: TypeComputedColumn[];
  visibleColumns?: TypeComputedColumn[];
  getColumnsInOrder?: () => TypeComputedColumn[];
  getColumnBy?: (
    column: TypeGetColumnByParam,
    config?: { initial?: boolean }
  ) => TypeComputedColumn | TypeColumn | undefined;
  columnVisibilityMap?: Record<string, boolean>;
  isColumnVisible?: (column: TypeGetColumnByParam) => boolean;
  setColumnVisible?: (column: TypeGetColumnByParam, visible: boolean) => void;

  gridId?: number;
  size?: TypeSize;
  viewportSize?: TypeSize;
  availableWidthForColumns?: number;
  maxAvailableWidthForColumns?: number;
  viewportAvailableWidth?: number;
  totalColumnCount?: number;
  totalComputedWidth?: number;
  columnWidthPrefixSums?: number[];
  minColumnsSize?: number;
  maxVisibleRows?: number;

  domRef?: React.MutableRefObject<HTMLElement | null>;
  bodyRef?: React.MutableRefObject<HTMLElement | null>;
  getDOMNode?: () => HTMLDivElement | null;
  getMenuPortalContainer?: () => HTMLDivElement | null;
  getScrollingElement?: () => HTMLElement | null;
  getDOMNodeForRowIndex?: (index: number) => HTMLElement | null;
  getRows?: () => HTMLElement | null;
  getHeader?: () => HTMLElement | null;
  focus?: () => void;
  blur?: () => void;

  computedLoading?: boolean;
  isLoading?: () => boolean;
  setLoading?: (value: React.SetStateAction<boolean>) => void;

  computedFilterable?: boolean;
  computedIsFilterable?: boolean;
  setEnableFiltering?: (value: React.SetStateAction<boolean>) => void;

  computedShowHeader?: boolean;
  setShowHeader?: (value: React.SetStateAction<boolean>) => void;

  showHorizontalCellBorders?: boolean;
  showVerticalCellBorders?: boolean;
  computedShowCellBorders?: TypeShowCellBorders;

  computedRemoteData?: boolean;
  computedRemotePagination?: boolean;
  computedRemoteFilter?: boolean;
  computedLocalPagination?: boolean;
  computedPagination?: boolean;
  computedLivePagination?: boolean;
  remoteSort?: boolean;

  getItemId?: (item: object) => unknown;
  getItemAt?: (index: number) => unknown;
  getItemIdAt?: (index: number) => unknown;
  getItemIndex?: (id: string | number) => number;
  getRowIndexById?: (rowId: string | number, data?: unknown[]) => number;
  getItemIndexById?: (rowId: string | number, data?: unknown[]) => number;

  computedSelected?: TypeRowSelection;
  computedUnselected?: Record<string, boolean>;
  getSelectedMap?: () => Record<string, unknown>;
  setSelected?: (selected: TypeRowSelection, ...args: unknown[]) => void;
  selectAll?: () => void;
  deselectAll?: () => void;
  isRowSelected?: (data: object | number | string) => boolean;
  getSelectedCount?: (
    selected?: TypeRowSelection,
    unselected?: TypeRowSelection
  ) => number;
  computedSelectedCount?: number;
  computedUnselectedCount?: number;
  setSelectedById?: (id: string, selected: boolean) => void;
  setSelectedAt?: (index: number, selected: boolean) => void;
  setRowSelected?: (index: number, selected: boolean, event?: unknown) => void;

  setScrollLeft?: (scrollLeft: number) => void;
  incrementScrollLeft?: (scrollLeft: number) => void;
  getScrollLeft?: () => number;
  getScrollLeftMax?: () => number;
  setScrollTop?: (scrollTop: number) => void;
  incrementScrollTop?: (scrollTop: number) => void;
  getScrollTop?: () => number;
  scrollToIndex?: TypeScrollToIndex;
  scrollToId?: (
    id: string | number,
    config?: TypeScrollToIndexConfig,
    callback?: (...args: unknown[]) => void
  ) => void;
  scrollToCell?: (
    cell: { rowIndex: number; columnIndex: number },
    config?: {
      offset?: number;
      left?: boolean;
      right?: boolean;
      top?: boolean;
    }
  ) => void;
  scrollToColumn?: (
    index: number,
    config?: {
      offset?: number;
      duration?: number;
      force?: boolean;
      direction?: "left" | "right" | null;
    },
    callback?: (...args: unknown[]) => void
  ) => void;
  scrollToIndexIfNeeded?: (
    index: number,
    config?: TypeScrollToIndexConfig,
    callback?: (...args: unknown[]) => void
  ) => boolean;
  getFirstVisibleIndex?: () => number;
  isRowFullyVisible?: (rowIndex: number) => boolean;
  isRowRendered?: (rowIndex: number) => boolean;
  getRenderRange?: () => { from: number; to: number };
  getVirtualList: () => TypeComputedVirtualList;
  scrollbars?: {
    vertical: boolean;
    horizontal: boolean;
  };

  i18n?: (key: string, defaultValue?: string) => string | React.ReactNode;
  columnFilterContextMenuProps?: Record<string, unknown> | null;
  showColumnFilterContextMenu?: (...args: unknown[]) => void;
  hideColumnFilterContextMenu?: () => void;
  showColumnContextMenu?: (...args: unknown[]) => void;
  hideColumnContextMenu?: (...args: unknown[]) => void;
  showRowContextMenu?: (...args: unknown[]) => void;
  hideRowContextMenu?: (...args: unknown[]) => void;
};

export type TypePaginationMode = true | false | "remote" | "local";
export type TypeShowCellBorders = true | false | "vertical" | "horizontal";

/**
 * Checkbox column compat surface.
 */
export type TypeCheckboxColumnCellProps = {
  headerCell: boolean;
  data: unknown;
  rowIndex?: number;
};

export type TypeCheckboxProps = {
  checked: boolean;
  indeterminate?: boolean;
  disabled?: boolean;

  /**
   * Compat: common checkbox components call onChange(checked) or onChange(event).
   * We provide (checked, event?) and tolerate callers that ignore the second arg.
   */
  onChange: (checked: boolean, event?: unknown) => void;

  onClick?: (event: unknown) => void;

  [key: string]: unknown;
};

export type TypeRenderCheckbox = (
  checkboxProps: TypeCheckboxProps,
  cellProps: TypeCheckboxColumnCellProps
) => React.ReactNode;

export type TypeCheckboxColumn =
  | boolean
  | (IColumn & {
      renderCheckbox?: TypeRenderCheckbox;
    });

export type TypeDataGridProps = {
  /**
   * Built-ins:
   * - "default": follows the nearest `.dark` ancestor when present
   * - "light": forces the light theme tokens
   * - "dark": forces the dark theme tokens
   *
   * Named custom themes are exposed on the grid root via `data-theme="<name>"`.
   * Custom theme names ending in `-dark`/`_dark` inherit the dark token base.
   * Custom theme names ending in `-light`/`_light` inherit the light token base.
   */
  theme?: string;
  idProperty: string;

  columns: TypeColumns;
  dataSource: TypeDataSource;

  columnOrder?: string[];
  onColumnOrderChange?: (columnOrder: string[]) => void;

  /**
   * In Inovua, `reorderColumns={false}` is common.
   * We support it explicitly now.
   */
  reorderColumns?: boolean;
  resizable?: boolean;

  enableColumnFilterContextMenu?: boolean;

  enableColumnAutosize?: boolean;
  skipHeaderOnAutoSize?: boolean;

  enableFiltering?: boolean;
  filterValue?: TypeFilterValue;
  defaultFilterValue?: TypeFilterValue;
  onFilterValueChange?: (filterValue: TypeFilterValue) => void;

  filterTypes?: TypeFilterTypes;

  filteredRowsCount?: (filteredRows: number) => void;

  sortInfo?: TypeSortInfo;
  defaultSortInfo?: TypeSortInfo;
  onSortInfoChange?: (sortInfo: TypeSortInfo) => void;
  allowUnsort?: boolean;
  defaultSortingDirection?: "desc" | "asc";

  pagination?: TypePaginationMode;
  skip?: number;
  defaultSkip?: number;
  limit?: number;
  defaultLimit?: number;
  onSkipChange?: (skip: number) => void;
  onLimitChange?: (limit: number) => void;
  pageSizes?: number[];

  virtualized?: boolean;

  columnUserSelect?: true | false | "text" | "none";
  /**
   * Defaults to `true`, which renders both horizontal and vertical separators.
   * Use `"horizontal"` to keep row dividers while disabling vertical separators.
   */
  showCellBorders?: TypeShowCellBorders;

  i18n?: TypeI18n;

  showColumnMenuTool?: boolean;

  rowHeight?: number;
  headerHeight?: number;
  filterRowHeight?: number;

  loading?: boolean;

  /**
   * Selection / checkbox column (Inovua-compatible).
   */
  checkboxColumn?: TypeCheckboxColumn;

  selected?: TypeRowSelection;
  defaultSelected?: TypeRowSelection;
  onSelectionChange?: (config: TypeOnSelectionChangeArg) => void;

  multiSelect?: boolean;
  checkboxOnlyRowSelect?: boolean;
  checkboxSelectEnableShiftKey?: boolean;

  onReady?: (
    computedPropsRef: React.MutableRefObject<TypeComputedProps | null>
  ) => void;
  handle?: (
    gridApiRef: React.MutableRefObject<TypeComputedProps | null>
  ) => void;

  className?: string;
  style?: React.CSSProperties;
};
