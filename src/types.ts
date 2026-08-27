/**
 * the-datagrid
 *
 * Compatibility-oriented type surface inspired by Inovua ReactDataGrid (MIT).
 * Goal: keep familiar type names/contracts while implementing our own runtime.
 */

import type * as React from "react";

/**
 * Stable state passed to function-backed data sources.
 *
 * `searchValue` is present only when the grid is connected to the optional
 * search package. Keeping it optional lets the core data-source contract stay
 * backwards compatible for consumers that do not install a search target.
 */
export type TypeDataSourceArgs = {
  sortInfo: TypeSortInfo;
  filterValue: TypeFilterValue;
  columnOrder: string[];
  columns: TypeColumns;
  idProperty: string;
  theme: string;
  skip?: number;
  limit?: number;
  searchValue?: string;
  /**
   * Aborted when a newer request replaces this one or the grid unmounts.
   *
   * This is a backwards-compatible extension to the Inovua request payload:
   * consumers that do not need cancellation can ignore it. Runtime defines
   * it as non-enumerable so existing Object.keys/JSON payloads stay stable.
   */
  signal?: AbortSignal;
};

export type TypeDataSourceResult =
  | unknown[]
  | { data: unknown[]; count: number };

export type TypeDataSource =
  | unknown[]
  | Promise<TypeDataSourceResult>
  | ((
      props: TypeDataSourceArgs
    ) => TypeDataSourceResult | Promise<TypeDataSourceResult>);

export type SortDirection = 1 | -1 | 0;

export type TypeSingleSortInfo = {
  dir: SortDirection;
  name: string;
  id?: string;
  type?: string;
  fn?: (
    value1: unknown,
    value2: unknown,
    data1: unknown,
    data2: unknown,
    sortInfo: TypeSingleSortInfo
  ) => number | boolean;
  columnName?: string;
};

export type TypeSortInfo = TypeSingleSortInfo | TypeSingleSortInfo[] | null;

export type TypeSortFunction = (
  value1: unknown,
  value2: unknown,
  column: TypeColumn
) => number | boolean;

export type TypeSortFunctions = Record<string, TypeSortFunction>;

export type TypeColumnSort = (
  value1: unknown,
  value2: unknown,
  column: TypeColumn,
  data1: unknown,
  data2: unknown,
  sortInfo: TypeSingleSortInfo
) => number | boolean;

export type TypeSortToolProps = {
  column: TypeColumn;
  columnId: string;
  computedSortable: boolean;
  computedSortInfo: TypeSingleSortInfo | null;
  sortInfo: TypeSortInfo;
  headerCell: true;
};

export type TypeRenderSortTool = (
  direction: SortDirection,
  extraProps: TypeSortToolProps
) => React.ReactNode;

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
  getFilterValue?: (args: {
    data: TypeColumnRenderArgs["data"];
    value: unknown;
  }) => unknown;

  /**
   * If not set, runtime derives active/inactive from operator and value.
   */
  active?: boolean;
};

export type TypeFilterValue = TypeSingleFilterValue[] | null;

/**
 * Filter-header cell context supplied by `onColumnFilterValueChange`.
 *
 * Inovua types this payload as `TypeCellProps`. Header filter cells do not
 * represent a data row, so `rowIndex` is reported as `-1` by our runtime while
 * the column aliases identify the filter that initiated the change.
 */
export type TypeCellProps = {
  rowIndex: number;
  columnIndex: number;
  computedVisibleIndex?: number;
  data?: any;
  name?: string;
  header?:
    | React.ReactNode
    | string
    | ((
        cellProps: TypeCellProps,
        context: {
          cellProps: TypeCellProps;
          column: TypeComputedColumn;
          contextMenu: any;
        }
      ) => React.ReactNode);
  groupProps?: any;
  cellSelectable?: boolean;
  id?: string | number;
  columnId?: string;
  column?: TypeComputedColumn | TypeColumn;
  [key: string]: any;
};

export type TypeColumnFilterValueChangeArg = {
  filterValue: TypeSingleFilterValue;
  columnId: string;
  columnIndex: number;
  cellProps?: TypeCellProps;
};

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

export type TypeFilterParam = {
  column?: TypeColumn;
  data?: unknown;
  emptyValue?: string;
  filterValue?: string | number;
  value?: string | number;
};

export type TypeFnParam = {
  value: unknown;
  filterValue?: unknown;
  emptyValue?: string;
  data?: unknown[];
  column?: TypeColumn;
};

export type TypeFilter = (
  data: unknown[],
  filterValueArray: TypeSingleFilterValue[],
  filterTypes?: TypeFilterTypes,
  columnsMap?: Record<string, TypeColumn>
) => unknown[] | ((item: unknown) => boolean);

export type TypeColumnRenderArgs = {
  data: any;
  rowIndex: number;
  column: IColumn;
  columnId: string;
  value?: any;
  rowId?: string | number;
  rowSelected?: boolean;
  rowActive?: boolean;
  cellSelected?: boolean;
  cellActive?: boolean;
  empty?: boolean;
  totalDataCount?: number;
  /**
   * Raw disabledRows entry for this displayed index. Inovua exposes `null`
   * when the map is absent and `undefined` when this key is missing.
   */
  disabledRow?: boolean | null;
};

export type TypeInlineEditorProps = {
  inEdit: boolean;
  value: any;
  startEdit: (
    editValue?: any,
    errBack?: (...args: any[]) => any
  ) => Promise<any>;
  onClick: (event: { stopPropagation: () => void }) => void;
  onChange: (value: any, event?: unknown) => void;
  onComplete: (valueOrEvent?: any) => void;
  onCancel: (event?: unknown) => void;
  onEnterNavigation: (
    complete?: boolean,
    direction?: number,
    event?: unknown
  ) => void;
  onTabNavigation: (
    complete?: boolean,
    direction?: number,
    event?: unknown
  ) => void;
  gotoNext: () => unknown;
  gotoPrev: () => unknown;
};

export type CellProps = TypeColumnRenderArgs & {
  value: any;
  cellProps: Record<string, unknown>;
  /** Raw runtime row-disable state exposed to Inovua-style hooks. */
  disabledRow?: boolean | null;
  /** Inovua-compatible column identifier aliases used by custom editors. */
  id?: string | number;
  name?: string;
  columnIndex?: number;
  computedVisibleIndex?: number;
  editValue?: any;
  inEdit?: boolean;
  theme?: string;
  rtl?: boolean;
  nativeScroll?: boolean;
  editorProps?: Record<string, unknown>;
  rendersInlineEditor?: boolean | ((cellProps: CellProps) => boolean);
  editProps?: TypeInlineEditorProps;
  [key: string]: any;
};

export type TypeColumnRenderCellProps = CellProps;

export type TypeColumnRenderFn =
  | ((cellProps: CellProps) => React.ReactNode)
  | ((value: any, args: TypeColumnRenderArgs) => React.ReactNode);

export type TypeActiveCell = [rowIndex: number, columnIndex: number] | null;
export type TypeCellSelection = { [cellKey: string]: boolean } | null;
export type TypeRowHeights = { [rowId: string]: number };
export type TypeScrollProps = {
  /** Hides custom tracks until the viewport is hovered or scrolled. */
  autoHide?: boolean;
  /** Space between the custom thumb and the viewport edge. */
  scrollThumbMargin?: number;
  /** Resting custom thumb thickness in pixels. */
  scrollThumbWidth?: number;
  /** Hover/drag custom thumb thickness in pixels. */
  scrollThumbOverWidth?: number;
  /** Custom thumb corner radius. */
  scrollThumbRadius?: number | string;
  /** Inline custom-track overrides. */
  scrollTrackStyle?: React.CSSProperties;
  /** Inline custom-thumb overrides. */
  scrollThumbStyle?: React.CSSProperties;
};

export type TypeCellDOMProps = React.TdHTMLAttributes<HTMLTableCellElement> & {
  [key: `data-${string}`]: unknown;
};
export type TypeHeaderDOMProps =
  React.ThHTMLAttributes<HTMLTableCellElement> & {
    [key: `data-${string}`]: unknown;
  };
export type TypeRowDOMProps = React.HTMLAttributes<HTMLTableRowElement> & {
  [key: `data-${string}`]: unknown;
};

export type TypeCellDOMPropsConfig =
  | TypeCellDOMProps
  | ((cellProps: CellProps) => TypeCellDOMProps | undefined);
export type TypeHeaderDOMPropsConfig =
  | TypeHeaderDOMProps
  | ((cellProps: TypeCellProps) => TypeHeaderDOMProps | undefined);

export type TypeEditInfo = {
  rowIndex: number;
  columnIndex: number;
  /**
   * Inovua 5.10.2 declares this as `string` but emits the raw numeric ID at
   * runtime. `any` deliberately preserves source compatibility with handlers
   * written against that declaration while accurately permitting numeric IDs.
   */
  rowId: any;
  columnId: string;
  value?: any;
  data?: any;
  column?: TypeColumn;
  cellProps?: CellProps;
};

export type TypeStartEditArgs = {
  columnId: string | number;
  rowIndex?: number;
  rowId?: string | number;
  value?: any;
};

export type TypeTryStartEditArgs = {
  columnId: string | number;
  rowIndex?: number;
  rowId?: string | number;
  dir?: number;
};

export type TypeCompleteEditArgs = {
  rowId?: string | number;
  rowIndex?: number;
  dir?: number;
  columnId?: string | number;
  value?: any;
};

export type TypeCancelEditArgs = {
  rowIndex?: number;
  columnId?: string | number;
};

export type TypeColumnEditorCell = {
  getProps: () => CellProps;
  getDOMNode: () => HTMLElement | null;
  isInEdit: () => boolean;
  getEditable: (editValue?: any, cellProps?: CellProps) => Promise<boolean>;
  startEdit: (
    editValue?: any,
    errBack?: (...args: any[]) => any
  ) => Promise<any>;
  stopEdit: (value?: any) => void;
  cancelEdit: () => void;
  completeEdit: (value?: any) => void;
  getCurrentEditValue: () => any;
  getEditStartValue: (cellProps?: CellProps) => Promise<any>;
  gotoNextEditor: () => unknown;
  gotoPrevEditor: () => unknown;
  onEditorEnterNavigation: (
    complete?: boolean,
    direction?: number,
    event?: unknown
  ) => void;
  onEditorTabNavigation: (
    complete?: boolean,
    direction?: number,
    event?: unknown
  ) => void;
  onEditorClick: (event: { stopPropagation: () => void }) => void;
  domRef: HTMLElement | null;
  props: CellProps;
};

export type TypeColumnEditorProps = {
  value: any;
  autoFocus: boolean;
  cellProps: CellProps;
  column: IColumn;
  editorProps?: Record<string, unknown>;
  nativeScroll?: boolean;
  cell: TypeColumnEditorCell;
  theme?: string;
  rtl?: boolean;
  onChange: (value: any, event?: unknown) => void;
  onComplete: (valueOrEvent?: any) => void;
  onCancel: (event?: unknown) => void;
  onEnterNavigation: (
    complete?: boolean,
    direction?: number,
    event?: unknown
  ) => void;
  onTabNavigation: (
    complete?: boolean,
    direction?: number,
    event?: unknown
  ) => void;
  gotoNext: () => unknown;
  gotoPrev: () => unknown;
  onClick: (event: { stopPropagation: () => void }) => void;
  key?: React.Key;
};

export type TypeStartEditKeyArgs = {
  event: React.KeyboardEvent<HTMLDivElement>;
  data: any;
  index: number;
  activeItem: any;
  activeIndex: number;
  handle: React.MutableRefObject<TypeComputedProps | null>;
  rowSelectionEnabled: boolean;
};

export type TypeColumnResizeInfo = {
  column: TypeColumn;
  width?: number;
  flex?: number;
};

export type TypeColumnResizeContext = {
  reservedViewportWidth: number;
};

export type TypeRowStyleProps = Record<string, unknown> & {
  data: any;
  dataSourceArray: any[];
  id: string | number;
  /** Page-local row index, matching Inovua's `realIndex`. */
  rowIndex: number;
  realIndex: number;
  /** Absolute index when `skip`/pagination is active. */
  remoteRowIndex: number;
  /** Legacy alias retained from the first the-datagrid implementation. */
  index: number;
  selected: boolean;
  /** Raw disabledRows entry for the current displayed row index. */
  disabledRow?: boolean | null;
  selection: TypeRowSelection;
  multiSelect: boolean;
  even: boolean;
  odd: boolean;
  last: boolean;
  lastNonEmpty: boolean;
  columns: TypeComputedColumn[];
  columnsMap: TypeComputedColumnsMap;
  columnRenderCount: number;
  totalColumnCount: number;
  firstUnlockedIndex: number;
  lastUnlockedIndex: number;
  firstLockedStartIndex: number;
  lastLockedStartIndex: number;
  firstLockedEndIndex: number;
  lastLockedEndIndex: number;
  hasLockedStart: boolean;
  hasLockedEnd: boolean;
  availableWidth: number;
  width: number;
  minWidth: number;
  totalComputedWidth: number;
  totalUnlockedWidth: number;
  totalLockedStartWidth: number;
  totalLockedEndWidth: number;
  totalDataCount: number;
  maxVisibleRows: number;
  rowHeight: number;
  defaultRowHeight: number;
  initialRowHeight: number;
  /** `null` only for naturally measured rows; kept for existing consumers. */
  height: number | null;
  minRowHeight: number;
  maxRowHeight?: number;
  naturalRowHeight: boolean;
  computedShowZebraRows: boolean;
  computedShowCellBorders: TypeShowCellBorders;
  showHorizontalCellBorders: boolean;
  showVerticalCellBorders: boolean;
  editable: boolean;
  editing: boolean;
  editStartEvent: string;
  editValue?: unknown;
  editColumnIndex?: number;
  editColumnId?: string;
  virtualizeColumns: boolean;
  theme: string;
  getItemId: (data: any) => unknown;
};

type TypeOpenRowStyleObject = React.CSSProperties & {
  [property: string]: string | number | undefined;
};

type TypeRowStyleObject =
  | React.CSSProperties
  | { [property: string]: string | number | undefined };

export type TypeRowStyleArgs = {
  data: any;
  props: TypeRowStyleProps;
  style: TypeOpenRowStyleObject;
};

export type TypeRowStyle =
  | TypeRowStyleObject
  | ((args: TypeRowStyleArgs) => TypeRowStyleObject | undefined);

export type TypeColumnGroupHeaderProps = {
  group: TypeColumnGroup;
  groupName: string;
  depth: number;
  computedDepth: number;
  segmentIndex: number;
  segmentCount: number;
  split: boolean;
  width: number;
  fullWidth: number;
  columnIds: string[];
  columns: TypeColumn[];
  grid: TypeComputedProps;
  computedProps: TypeComputedProps;
  computedPropsRef: React.MutableRefObject<TypeComputedProps | null>;
};

export type TypeColumnGroupDOMProps =
  React.ThHTMLAttributes<HTMLTableCellElement> & {
    [key: `data-${string}`]: unknown;
  };

/**
 * Inovua-compatible stacked-column descriptor.
 *
 * `group` points at another descriptor by name and creates a nested header.
 * Header groups are derived from the live visible column order, so separated
 * siblings render as independent segments of the same logical group.
 */
export type TypeColumnGroup = {
  name: string;
  header?:
    | React.ReactNode
    | ((props: TypeColumnGroupHeaderProps) => React.ReactNode);
  group?: string;
  computedDepth?: number;
  draggable?: boolean;
  resizable?: boolean;
  headerClassName?:
    | string
    | ((props: TypeColumnGroupHeaderProps) => string | undefined);
  headerStyle?:
    | React.CSSProperties
    | ((props: TypeColumnGroupHeaderProps) => React.CSSProperties | undefined);
  headerDOMProps?:
    | TypeColumnGroupDOMProps
    | ((
        props: TypeColumnGroupHeaderProps
      ) => TypeColumnGroupDOMProps | undefined);
};

export interface IColumn {
  name?: string;
  id?: string;

  /** Name of the stacked-column descriptor this leaf belongs to. */
  group?: string;

  header?: React.ReactNode | ((cellProps: TypeCellProps) => React.ReactNode);
  renderHeader?: (cellProps: TypeCellProps) => React.ReactNode;

  /**
   * Compatibility note:
   * Inovua commonly uses `render({ value, data, ... }) => ReactNode`.
   * Our runtime supports BOTH:
   *  - render(cellPropsObject)   (Inovua-style)
   *  - render(value, argsObject) (legacy/internal)
   */
  render?: TypeColumnRenderFn;

  editable?:
    | boolean
    | ((
        editValue: any,
        cellProps: CellProps
      ) => boolean | void | Promise<boolean | void>);
  editor?: React.ElementType<any> | React.ReactElement<any>;
  editorProps?: Record<string, unknown>;
  getEditStartValue?: (value: any, cellProps: CellProps) => any | Promise<any>;
  /** Synchronously transforms the draft before either completion callback sees it. */
  getEditCompleteValue?: (value: any, cellProps: CellProps) => any;

  /*
   * Column-level edit lifecycle. Inovua merges the column into the cell props,
   * so these are called as `handler(value, cellProps)` and run before their
   * grid-level `TypeDataGridProps` counterparts, which take a `TypeEditInfo`.
   */
  onEditStart?: (value: any, cellProps: CellProps) => void;
  onEditStop?: (value: any, cellProps: CellProps) => void;
  onEditComplete?: (value: any, cellProps: CellProps) => void | Promise<any>;
  onEditCancel?: (cellProps: CellProps) => void;
  onEditValueChange?: (value: any, cellProps: CellProps) => void;
  /**
   * Keeps a consumer-rendered editor mounted through `column.render`.
   * The render callback receives lifecycle-aware `cellProps.editProps`.
   */
  rendersInlineEditor?: boolean | ((cellRenderObject: CellProps) => boolean);
  renderEditor?: (
    editorProps: TypeColumnEditorProps,
    cellProps: CellProps,
    cell: TypeColumnEditorCell
  ) => React.ReactNode;

  width?: number;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  flex?: number | null;
  defaultFlex?: number | null;
  /**
   * Retains flex ownership when the user resizes this column.
   *
   * Inovua defaults this to true. Set false to convert an uncontrolled
   * flex/defaultFlex column to a fixed-width column after a no-share resize.
   */
  keepFlex?: boolean;

  visible?: boolean;
  defaultVisible?: boolean;
  defaultHidden?: boolean;
  hideable?: boolean;
  draggable?: boolean;
  resizable?: boolean;
  /**
   * Keeps the column visible at a horizontal edge.
   *
   * Inovua compatibility: `true` is an alias for `"start"`, while `"end"`
   * pins action-style columns to the trailing edge.
   */
  locked?: "start" | "end" | true | false;

  sortable?: boolean;
  sortName?: string;
  type?: string;
  sort?: TypeColumnSort;
  renderSortTool?: TypeRenderSortTool;

  filterable?: boolean;
  filterType?: string;
  filterName?: string;
  getFilterValue?: (args: {
    data: TypeColumnRenderArgs["data"];
    value: unknown;
  }) => unknown;
  filterEditor?: React.ComponentType<Record<string, unknown>>;
  filterEditorProps?: unknown;
  /**
   * Debounce interval for committing this column's filter value.
   *
   * `false` and `0` commit immediately. When omitted, filter editors use the
   * Inovua-compatible 250 ms default.
   */
  filterDelay?: boolean | number;
  filterCellPadding?: React.CSSProperties["padding"];

  /** Excludes this column from the optional toolbar export when false. */
  exportable?: boolean;
  /**
   * Exports this column even while it is hidden in the grid. Ignored when
   * `exportable` is false.
   */
  exportWhenHidden?: boolean;
  /**
   * Supplies the exported cell value for this column.
   *
   * The toolbar export cannot use `render`, which returns React nodes. This is
   * the transform hook for the exported representation instead.
   */
  exportValue?: (args: {
    value: unknown;
    data: TypeColumnRenderArgs["data"];
    column: IColumn;
  }) => unknown;

  /** Excludes this column from optional global search when false. */
  searchable?: boolean;
  /** Additional exact aliases accepted by column-scoped search queries. */
  searchAliases?: readonly string[];
  /** Supplies the raw row value indexed by optional global search. */
  searchValue?: (data: TypeColumnRenderArgs["data"]) => unknown;

  textAlign?: "start" | "end" | "left" | "right" | "center";
  headerAlign?: "start" | "end" | "left" | "right" | "center";

  cellSelectable?: boolean;
  cellProps?: Record<string, unknown>;
  cellDOMProps?: TypeCellDOMPropsConfig;
  headerDOMProps?: TypeHeaderDOMPropsConfig;
  colspan?: number | ((cellProps: CellProps) => number);
  rowspan?: number | ((cellProps: CellProps) => number);

  className?: string | ((cellProps: CellProps) => string | undefined);
  style?:
    | React.CSSProperties
    | ((cellProps: CellProps) => React.CSSProperties | undefined);
  headerProps?: { className?: string; style?: React.CSSProperties };
}

export type TypeColumn = IColumn;
export type TypeColumns = TypeColumn[];
export type TypeColumnWithId = TypeColumn & { id: string };
export type TypeHeaderProps = {
  style?: React.CSSProperties;
  className?: string;
};

export type TypeI18n = { [key: string]: string | React.ReactNode };

export type TypeColumnFilterContextMenuProps = {
  position?: string;
  style?: React.CSSProperties;
  constrainTo?:
    | boolean
    | HTMLElement
    | string
    | ((...args: unknown[]) => HTMLElement | null);
  alignPositions?: string[];
  updatePositionOnScroll?: boolean;
  selected?: string | { operator: string };
  items?: TypeContextMenuItem[];
  onSelectionChange?: (operator: string) => void;
  onDismiss?: () => void;
  [key: string]: unknown;
};

export type TypeRenderColumnFilterContextMenu = (
  menuProps: TypeColumnFilterContextMenuProps,
  context: {
    cellProps: TypeCellProps;
    grid: React.MutableRefObject<TypeComputedProps | null>;
    props: TypeComputedProps;
  }
) => React.ReactNode;

export type TypeContextMenuConstrainTo =
  | boolean
  | HTMLElement
  | string
  | ((...args: unknown[]) => HTMLElement | null);

export type TypeContextMenuPoint = {
  left: number;
  top: number;
};

export type TypeContextMenuItem =
  | "-"
  | {
      name?: string;
      label?: React.ReactNode;
      disabled?: boolean;
      checked?: boolean;
      items?: TypeContextMenuItem[];
      onClick?: (...args: unknown[]) => void;
      [key: string]: unknown;
    };

export type TypeRowProps = Partial<TypeRowStyleProps> &
  Pick<TypeRowStyleProps, "data" | "rowIndex"> & {
    groupProps?: unknown;
    empty?: boolean;
    active?: boolean;
    rowSelected?: boolean;
  };
export type RowProps = TypeRowProps;

export type TypeRenderRow = (
  rowProps: TypeRowDOMProps &
    React.RefAttributes<HTMLTableRowElement> & {
      children?: React.ReactNode;
      rowProps: TypeRowProps;
    }
) => React.ReactNode;

export type TypeOnRenderRow = (rowProps: TypeRowProps) => void;
export type TypeRowClassName =
  | string
  | ((rowProps: TypeRowProps) => string | undefined);

export type TypeOnRowClick = (
  rowProps: TypeRowProps,
  event: React.MouseEvent<HTMLTableRowElement>
) => void;
export type TypeOnRowDoubleClick = (
  event: React.MouseEvent<HTMLTableRowElement>,
  rowProps: TypeRowProps
) => void;
export type TypeOnCellClick = (
  event: React.MouseEvent<HTMLTableCellElement>,
  cellProps: CellProps
) => void;
export type TypeOnCellDoubleClick = TypeOnCellClick;

export type TypeColumnContextMenuProps = {
  autoFocus?: boolean;
  alignTo?: HTMLElement | TypeContextMenuPoint | null;
  alignPositions?: string[];
  cellProps?: TypeCellProps;
  constrainTo?: TypeContextMenuConstrainTo;
  items?: TypeContextMenuItem[];
  nativeScroll?: boolean;
  onDismiss?: () => void;
  position?: string;
  style?: React.CSSProperties;
  theme?: string;
  updatePositionOnScroll?: boolean;
  [key: string]: unknown;
};

export type TypeRowContextMenuProps = TypeColumnContextMenuProps & {
  rowProps?: TypeRowProps;
};

export type TypeRenderColumnContextMenu = (
  menuProps: TypeColumnContextMenuProps,
  context: {
    cellProps: TypeCellProps;
    grid: TypeComputedProps;
    computedProps: TypeComputedProps;
    computedPropsRef: React.MutableRefObject<TypeComputedProps | null>;
  }
) => React.ReactNode;

export type TypeRenderRowContextMenu = (
  menuProps: TypeRowContextMenuProps,
  context: {
    rowProps: TypeRowProps;
    cellProps?: TypeCellProps;
    grid: TypeComputedProps;
    computedProps: TypeComputedProps;
    computedPropsRef: React.MutableRefObject<TypeComputedProps | null>;
  }
) => React.ReactNode;

export type TypeContextMenuEvent =
  | React.MouseEvent<HTMLElement>
  | React.KeyboardEvent<HTMLElement>
  | React.PointerEvent<HTMLElement>;

export type TypeOnRowContextMenu = (
  rowProps: TypeRowProps,
  event: TypeContextMenuEvent
) => void;

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

export type TypeBoolMap = { [key: string]: boolean };
export type TypeRowUnselected = TypeBoolMap | null;

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
  computedLocked?: "start" | "end" | false;
  index?: number;
};

export type TypeComputedColumnsMap = Record<string, TypeComputedColumn>;
export type TypeWithId = { id: string };

export interface TypeBatchUpdateQueue {
  (fn: () => void): void;
  commit: (extraFn?: () => void) => void;
}

export type TypeDragHelper = {
  onDrag: (...args: unknown[]) => unknown;
  onDrop: (...args: unknown[]) => unknown;
};

export type TypeConstrainRegion = {
  0: number;
  1: number;
  bottom: number;
  left: number;
  right: number;
  top: number;
  _events: object;
  _eventsCount: number;
  _maxListeners: number;
  height: number;
  width: number;
  getHeight?: () => number;
};

export type TypeDiff = {
  top: number;
  left: number;
};

export type TypeConfig = {
  diff: TypeDiff;
  didDrag: boolean;
  scope?: unknown;
};

export type RangeResultType = {
  top: number;
  bottom: number;
  height: number;
  index: number;
  group?: boolean;
  keyPath?: string[] | string;
  leaf?: boolean;
  value?: string;
  depth?: number;
  parent?: boolean;
};

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

export type TypeSmoothScrollConfig = {
  orientation?: "horizontal" | "vertical";
  duration?: number;
};

export type TypeSmoothScrollCallback = (value: number) => void;

export type TypeSmoothScrollTo = (
  value: number,
  configOrCallback?: TypeSmoothScrollConfig | TypeSmoothScrollCallback | null,
  callback?: TypeSmoothScrollCallback
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
  smoothScrollTo: TypeSmoothScrollTo;
  /**
   * Remeasure the currently rendered variable-height rows.
   *
   * This mirrors Inovua's virtual-list compatibility method: it is a no-op
   * for fixed numeric row heights and returns synchronously.
   */
  adjustHeights: () => void;
  refreshLayout: () => void;
  updateVisibleCount: () => number;
  isRowRendered: (rowIndex: number) => boolean;
  isRowVisible: (rowIndex: number) => boolean;
  getRenderedIndexes: () => number[];
  getMaxRenderCount: () => number;
};

export type TypeComputedProps = {
  reload: () => void;

  initialProps?: unknown;
  publicAPI?: TypeComputedProps;

  data?: unknown[];
  originalData?: unknown[];
  count?: number;
  dataCountAfterFilter?: number;
  filteredRowsCount?: (filteredRows: number) => void;

  getData: () => unknown[];
  getCount: () => number;

  computedSkip?: number;
  computedLimit?: number;
  getSkip: () => number;
  getLimit: () => number;
  setSkip: (skip: number) => void;
  setLimit: (limit: number) => void;

  computedSortInfo?: TypeSortInfo;
  computedIsMultiSort?: boolean;
  getSortInfo: () => TypeSortInfo;
  setSortInfo: (sortInfo: TypeSortInfo) => void;
  toggleColumnSort?: (column: TypeGetColumnByParam) => void;
  setColumnSortInfo?: (
    column: TypeGetColumnByParam,
    dir: SortDirection
  ) => void;
  unsortColumn?: (column: TypeGetColumnByParam) => void;

  computedFilterValue?: TypeFilterValue;
  computedFiltered?: boolean;
  computedFilterValueMap?: Record<string, TypeSingleFilterValue> | null;
  getFilterValue: () => TypeFilterValue;
  setFilterValue: (filterValue: TypeFilterValue) => void;
  clearAllFilters?: () => void;
  clearColumnFilter?: (column: TypeGetColumnByParam) => void;
  getColumnFilterValue?: (
    column: TypeGetColumnByParam
  ) => TypeSingleFilterValue | undefined;
  setColumnFilterValue?: (
    column: TypeGetColumnByParam,
    value: unknown,
    operator?: string
  ) => void;
  computedOnColumnFilterValueChange?: (
    columnFilterValue: TypeColumnFilterValueChangeArg
  ) => void;
  isColumnFiltered?: (column: TypeGetColumnByParam) => boolean;

  computedEditable?: boolean;
  computedEditStartEvent?: string;
  computedIsEditing?: boolean;
  isInEdit?: React.MutableRefObject<boolean>;
  getCurrentEditInfo?: () => TypeEditInfo | null;
  startEdit?: (args: TypeStartEditArgs) => Promise<any>;
  tryStartEdit?: (args: TypeTryStartEditArgs) => Promise<any>;
  completeEdit?: (args?: TypeCompleteEditArgs) => void;
  cancelEdit?: (args?: TypeCancelEditArgs) => void;
  currentEditCompletePromise?: React.MutableRefObject<Promise<unknown>>;

  computedRowHeights?: TypeRowHeights;
  setRowHeights?: (rowHeights: TypeRowHeights) => void;
  setRowHeightById: (rowHeight: number | null, id: string | number) => void;
  getRowHeightById: (id: string | number) => number;
  getRowHeight?: (rowIndex: number) => number;

  computedColumnOrder?: string[] | undefined;
  getColumnOrder: () => string[];
  setColumnOrder: (columnOrder: string[]) => void;
  columnSizes?: Record<string, number>;
  columnFlexes?: Record<string, number>;
  setColumnSizes?: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  setColumnFlexes?: React.Dispatch<
    React.SetStateAction<Record<string, number | null>>
  >;
  onBatchColumnResize?: (
    info: TypeColumnResizeInfo[],
    context?: TypeColumnResizeContext
  ) => void;
  computedOnColumnResize?: (args: { index: number; diff: number }) => void;
  setColumnsSizesAuto?: (config?: {
    columnIds?: string[];
    skipHeader?: boolean;
    skipSortTool?: boolean;
  }) => void;
  setColumnSizesToFit?: () => void;
  setColumnSizeAuto?: (id: string, skipHeader?: boolean) => void;
  reservedViewportWidth?: number;
  setReservedViewportWidth?: React.Dispatch<React.SetStateAction<number>>;
  columnsMap?: TypeComputedColumnsMap;
  visibleColumnsMap?: TypeComputedColumnsMap;
  allColumns?: TypeComputedColumn[];
  visibleColumns?: TypeComputedColumn[];
  lockedStartColumns?: TypeComputedColumn[];
  unlockedColumns?: TypeComputedColumn[];
  lockedEndColumns?: TypeComputedColumn[];
  hasLockedStart?: boolean;
  hasLockedEnd?: boolean;
  hasUnlocked?: boolean;
  firstLockedStartIndex?: number;
  lastLockedStartIndex?: number;
  firstUnlockedIndex?: number;
  lastUnlockedIndex?: number;
  firstLockedEndIndex?: number;
  lastLockedEndIndex?: number;
  totalLockedStartWidth?: number;
  totalUnlockedWidth?: number;
  totalLockedEndWidth?: number;
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

  computedShowHoverRows?: boolean;
  setShowHoverRows?: React.Dispatch<React.SetStateAction<boolean>>;
  computedShowZebraRows: boolean;
  setShowZebraRows: (value: React.SetStateAction<boolean>) => void;
  computedShowEmptyRows?: boolean;
  setShowEmptyRows?: React.Dispatch<React.SetStateAction<boolean>>;

  showHorizontalCellBorders?: boolean;
  showVerticalCellBorders?: boolean;
  computedShowCellBorders?: TypeShowCellBorders;
  setShowCellBorders?: React.Dispatch<
    React.SetStateAction<TypeShowCellBorders>
  >;

  computedRemoteData?: boolean;
  computedRemotePagination?: boolean;
  computedRemoteFilter?: boolean;
  computedLocalPagination?: boolean;
  computedPagination?: boolean;
  computedLivePagination?: boolean;
  remoteSort?: boolean;
  loadNextPage?: () => void;
  paginationCount?: number;
  paginationProps?: TypePaginationProps;
  hasNextPage?: () => boolean;
  hasPrevPage?: () => boolean;
  gotoNextPage?: () => void;
  gotoPrevPage?: () => void;
  gotoFirstPage?: () => void;
  gotoLastPage?: () => void;

  getItemId?: (item: object) => unknown;
  getItemAt?: (index: number) => unknown;
  getItemIdAt?: (index: number) => unknown;
  getItemIndex?: (id: string | number) => number;
  getRowIndexById?: (rowId: string | number, data?: unknown[]) => number;
  getItemIndexById?: (rowId: string | number, data?: unknown[]) => number;
  setItemPropertyAt?: (index: number, property: string, value: unknown) => void;
  setItemPropertyForId?: (
    id: string | number,
    property: string,
    value: unknown
  ) => void;
  setItemAt?: (
    index: number,
    item: unknown,
    config?: {
      replace?: boolean;
      property?: string;
      value?: unknown;
      deepCloning?: boolean;
    }
  ) => void;
  setItemsAt?: (
    items: unknown[] | Record<number, unknown>,
    config?: { replace?: boolean }
  ) => void;

  computedSelected?: TypeRowSelection;
  computedUnselected?: TypeBoolMap | null;
  computedRowSelectionEnabled?: boolean;
  computedRowMultiSelectionEnabled?: boolean;
  getSelectedMap?: () => Record<string, unknown>;
  setSelected?: (selected: TypeRowSelection, ...args: unknown[]) => void;
  setUnselected?: React.Dispatch<React.SetStateAction<TypeRowUnselected>>;
  selectAll?: () => void;
  deselectAll?: () => void;
  isRowSelected?: (data: object | number | string) => boolean;
  getSelectedCount?: (
    selected?: TypeRowSelection,
    unselected?: TypeRowSelection
  ) => number;
  getUnselectedCount?: (unselected?: TypeRowUnselected) => number;
  isSelectionEmpty?: () => boolean;
  computedSelectedCount?: number;
  computedUnselectedCount?: number;
  setSelectedById?: (id: string, selected: boolean) => void;
  setSelectedAt?: (index: number, selected: boolean) => void;
  setRowSelected?: (index: number, selected: boolean, event?: unknown) => void;

  computedActiveIndex?: number;
  computedLastActiveIndex?: number | null;
  doSetLastActiveIndex?: (activeIndex: number | null) => void;
  computedActiveItem?: unknown;
  computedHasRowNavigation?: boolean;
  computedFocused?: boolean;
  computedSetFocused?: React.Dispatch<React.SetStateAction<boolean>>;
  computedOnKeyDown?: React.KeyboardEventHandler<HTMLDivElement>;
  computedOnFocus?: React.FocusEventHandler<HTMLDivElement>;
  toggleActiveRowSelection?: (event?: {
    ctrlKey?: boolean;
    metaKey?: boolean;
    shiftKey?: boolean;
  }) => void;
  computedOnRowClick?: (
    event: React.MouseEvent<HTMLTableRowElement>,
    rowProps: TypeRowProps
  ) => void;
  computedRowDoubleClick?: TypeOnRowDoubleClick;
  computedCellDoubleClick?: TypeOnCellDoubleClick;
  setActiveIndex?: (activeIndex: number) => void;
  incrementActiveIndex?: (increment: number) => void;
  getActiveItem?: () => unknown;

  computedActiveCell?: TypeActiveCell;
  computedCellSelection?: TypeCellSelection;
  computedCellSelectionEnabled?: boolean;
  computedCellMultiSelectionEnabled?: boolean;
  computedCellNavigationEnabled?: boolean;
  computedCellSelectionByIndex?: boolean;
  getActiveCell?: () => TypeActiveCell;
  setActiveCell?: (activeCell: TypeActiveCell) => void;
  getCellSelection?: () => TypeCellSelection;
  setCellSelection?: (selection: TypeCellSelection) => void;
  isCellSelected?: (
    cell: TypeActiveCell | { rowIndex: number; columnIndex: number }
  ) => boolean;
  getCellSelectionIdKey?: (
    rowIndex: number,
    columnIndex: number
  ) => string | number;
  getCellSelectionKey?: (
    cell: string | number | TypeCellProps,
    column?: TypeGetColumnByParam
  ) => string | number;
  incrementActiveCell?: (direction: [number, number]) => void;
  toggleActiveCellSelection?: (event?: {
    shiftKey?: boolean;
    ctrlKey?: boolean;
    metaKey?: boolean;
  }) => void;
  getCellSelectionBetween?: (
    start?: TypeActiveCell,
    end?: TypeActiveCell
  ) => Record<string, boolean>;
  isCellVisible?: (cell: { rowIndex: number; columnIndex: number }) =>
    | boolean
    | {
        topDiff: number;
        bottomDiff: number;
        leftDiff: number;
        rightDiff: number;
      };

  setScrollLeft?: (scrollLeft: number) => void;
  incrementScrollLeft?: (scrollLeft: number) => void;
  getScrollLeft?: () => number;
  getScrollLeftMax?: () => number;
  /** Logical horizontal offset; writable in both LTR and RTL mode. */
  scrollLeft?: number;
  setScrollTop?: (scrollTop: number) => void;
  incrementScrollTop?: (scrollTop: number) => void;
  getScrollTop?: () => number;
  /** Vertical offset; writable in both native and custom-scrollbar modes. */
  scrollTop?: number;
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
  virtualizeColumns?: boolean;
  computedEnableRowspan?: boolean;
  computedHasColSpan?: boolean;
  computedEnableColumnHover?: boolean;
  availableWidth?: number;
  edition?: "community";
  computedLicenseValid?: boolean;
  getColumnLayout?: () => unknown;
  computedShowHeaderBorderRight?: boolean;
  silentSetData?: React.Dispatch<React.SetStateAction<any[]>>;
  setOriginalData?: React.Dispatch<React.SetStateAction<any[]>>;

  i18n?: (key: string, defaultValue?: string) => string | React.ReactNode;
  getMenuAvailableHeight?: () => number;
  isFilterable?: () => boolean;
  shouldShowFilteringMenuItems?: () => boolean;
  updateMenuPositions?: () => void;
  onScroll?: React.UIEventHandler<HTMLDivElement>;
  rtlOffset?: number;
  columnFilterContextMenuProps?: Record<string, unknown> | null;
  showColumnFilterContextMenu?: (...args: unknown[]) => void;
  hideColumnFilterContextMenu?: () => void;
  columnContextMenuProps?: TypeColumnContextMenuProps | null;
  rowContextMenuProps?: TypeRowContextMenuProps | null;
  showColumnContextMenu?: (
    alignTo: HTMLElement | TypeContextMenuPoint,
    cellProps: TypeCellProps,
    config?: { computedVisibleIndex?: number },
    onHide?: () => void
  ) => void;
  hideColumnContextMenu?: () => void;
  showRowContextMenu?: (
    alignTo: HTMLElement | TypeContextMenuPoint,
    rowProps: TypeRowProps,
    cellProps?: TypeCellProps,
    onHide?: () => void
  ) => void;
  hideRowContextMenu?: () => void;
  getState?: () => {
    data: unknown[];
    count: number;
    skip: number;
    limit: number;
    sortInfo: TypeSortInfo;
    filterValue: TypeFilterValue;
    selected: TypeRowSelection;
    unselected: TypeRowUnselected;
    activeIndex: number;
    activeCell: TypeActiveCell;
    cellSelection: TypeCellSelection;
    columnOrder: string[];
    rowHeights: TypeRowHeights;
  };
};

export type TypePaginationMode = true | false | "remote" | "local";

/**
 * Pagination toolbar contract aligned with Inovua ReactDataGrid 5.10.2.
 *
 * Pages passed to `gotoPage` are one-based, matching the upstream API.
 */
export type TypePaginationProps = {
  skip: number;
  limit: number;
  /** Number of rows in the currently rendered page. */
  count: number;
  pagination: boolean;
  livePagination?: boolean;
  remotePagination: boolean;
  localPagination: boolean;
  /** Authoritative row count across all pages. */
  totalCount: number;
  pageSizes?: number[];
  gotoNextPage: () => void;
  reload: () => void;
  onRefresh: () => void;
  gotoFirstPage: () => void;
  gotoLastPage: () => void;
  gotoPrevPage: () => void;
  hasNextPage: () => boolean;
  hasPrevPage: () => boolean;
  onSkipChange: (skip: number) => void;
  onLimitChange: (limit: number) => void;
  gotoPage: (page: number, config?: { force: boolean }) => void;
  onClick?: (event: { stopPropagation?: () => void }) => unknown;
  theme?: string;
  className?: string;
  perPageText?: React.ReactNode;
  pageText?: React.ReactNode;
  ofText?: React.ReactNode;
  showingText?: React.ReactNode;
  rtl?: boolean;
  bordered?: boolean;
};

export type TypeLoadMaskProps = {
  visible: boolean;
  livePagination: boolean;
  loadingText: React.ReactNode | (() => React.ReactNode);
  zIndex: number;
  /** Runtime extension already supplied by Inovua's implementation. */
  theme: string;
};

export type TypeShowCellBorders = true | false | "vertical" | "horizontal";

/**
 * Checkbox column compat surface.
 */
export type TypeCheckboxColumnCellProps = {
  headerCell: boolean;
  data: unknown;
  rowIndex?: number;
  disabledRow?: boolean | null;
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
   * - "default-light": the Inovua-compatible default; forces light tokens
   * - "default": follows the nearest `.dark` ancestor when present
   * - "light": forces the light theme tokens
   * - "dark": forces the dark theme tokens
   *
   * Named custom themes are exposed on the grid root via `data-theme="<name>"`.
   * Custom theme names ending in `-dark`/`_dark` inherit the dark token base.
   * Custom theme names ending in `-light`/`_light` inherit the light token base.
   */
  theme?: string;
  /**
   * Required by the raw Inovua-compatible props type. JSX consumers may omit
   * it because `ReactDataGrid.defaultProps.idProperty` is `"id"`.
   */
  idProperty: string;

  columns: TypeColumns;
  dataSource: TypeDataSource;

  /** Stacked and nested column-header descriptors. */
  groups?: TypeColumnGroup[];
  /**
   * When false, leaf and group drag operations stay inside their existing
   * group parent. The Inovua Community default is true.
   */
  allowGroupSplitOnReorder?: boolean;

  columnOrder?: string[];
  defaultColumnOrder?: string[];
  onColumnOrderChange?: (columnOrder: string[]) => void;
  onColumnVisibleChange?: (args: {
    column: TypeColumn;
    visible: boolean;
  }) => void;

  /**
   * In Inovua, `reorderColumns={false}` is common.
   * We support it explicitly now.
   */
  reorderColumns?: boolean;
  resizable?: boolean;
  /** Root fallback used when a column has no width/defaultWidth. */
  columnDefaultWidth?: number;
  /**
   * Root fallback used when a column sets neither `headerAlign` nor
   * `textAlign`, so a grid can centre or end-align every header without
   * repeating the field on each column definition. A column that sets either
   * one still wins, and the checkbox column is left alone.
   */
  columnDefaultHeaderAlign?: "start" | "end" | "left" | "right" | "center";
  /** Root fallback used when a column has no minWidth. */
  columnMinWidth?: number;
  /** Root fallback used when a column has no maxWidth. */
  columnMaxWidth?: number | null;
  /**
   * Resizes the adjacent visible column in the opposite direction so the
   * pair keeps its total rendered width.
   */
  shareSpaceOnResize?: boolean;
  /** Pointer target width, in pixels, for header resize handles. */
  columnResizeHandleWidth?: number;
  /** Rendered width, in pixels, of the deferred resize proxy. */
  columnResizeProxyWidth?: number;

  /**
   * When enabled, the rendered column follows the pointer while its resize
   * handle is dragged. The default deferred mode keeps the lightweight resize
   * proxy and applies the proposed width when the gesture completes.
   *
   * `onColumnResize` remains a completion callback in both modes.
   */
  liveColumnResize?: boolean;

  enableColumnFilterContextMenu?: boolean;

  enableColumnAutosize?: boolean;
  skipHeaderOnAutoSize?: boolean;

  /**
   * Explicitly shows or hides the filter row. When omitted, a non-empty
   * `filterValue` or `defaultFilterValue` makes the row visible.
   *
   * For local arrays, uncontrolled `defaultFilterValue` state performs the
   * data transformation even when this row is hidden. Controlled
   * `filterValue` is display/remote-request state and does not transform the
   * supplied array, matching Inovua 5.10.2.
   */
  enableFiltering?: boolean;
  filterValue?: TypeFilterValue;
  defaultFilterValue?: TypeFilterValue;
  onFilterValueChange?: (filterValue: TypeFilterValue) => void;
  onColumnFilterValueChange?: (
    columnFilterValue: TypeColumnFilterValueChangeArg
  ) => void;

  filterTypes?: TypeFilterTypes;
  scrollTopOnFilter?: boolean;
  renderColumnFilterContextMenu?: TypeRenderColumnFilterContextMenu;
  columnFilterContextMenuAlignPositions?: string[];
  columnFilterContextMenuConstrainTo?:
    | boolean
    | HTMLElement
    | string
    | ((...args: unknown[]) => HTMLElement | null);
  columnFilterContextMenuPosition?: string;
  updateMenuPositionOnScroll?: boolean;
  renderColumnContextMenu?: TypeRenderColumnContextMenu;
  columnContextMenuAlignPositions?: string[];
  columnContextMenuConstrainTo?: TypeContextMenuConstrainTo;
  columnContextMenuPosition?: string;
  renderRowContextMenu?: TypeRenderRowContextMenu;
  onRowContextMenu?: TypeOnRowContextMenu;
  rowContextMenuAlignPositions?: string[];
  rowContextMenuConstrainTo?: TypeContextMenuConstrainTo;
  rowContextMenuPosition?: string;
  updateMenuPositionOnColumnsChange?: boolean;

  filteredRowsCount?: (filteredRows: number) => void;

  sortInfo?: TypeSortInfo;
  defaultSortInfo?: TypeSortInfo;
  onSortInfoChange?: (sortInfo: TypeSortInfo) => void;
  sortable?: boolean;
  sortFunctions?: TypeSortFunctions | null;
  renderSortTool?: TypeRenderSortTool;
  scrollTopOnSort?: boolean | "always";
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
  renderPaginationToolbar?: (
    paginationProps: TypePaginationProps
  ) => React.ReactNode;

  virtualized?: boolean;

  /**
   * Uses the browser's visible scrollbars when true. The default false mode
   * keeps native overflow semantics while rendering shadcn-compatible custom
   * tracks and thumbs.
   */
  nativeScroll?: boolean;
  scrollProps?: TypeScrollProps;
  initialScrollTop?: number;
  initialScrollLeft?: number;
  onScroll?: React.UIEventHandler<HTMLDivElement>;
  /** Mirrors horizontal layout and exposes logical scroll offsets. */
  rtl?: boolean;

  /**
   * Enables horizontal column virtualization when the grid has at least this
   * many visible columns. The boundary is inclusive and defaults to `15`.
   * Column virtualization requires a fixed numeric `rowHeight`.
   */
  virtualizeColumnsThreshold?: number;

  /**
   * Explicitly enables or disables horizontal column virtualization,
   * overriding `virtualizeColumnsThreshold`. A function-valued or natural
   * `rowHeight` still disables column virtualization because those layouts
   * cannot safely share a fixed horizontal render window.
   */
  virtualizeColumns?: boolean;

  /** Transform the grid into a responsive virtual list at widths up to 1024px. */
  allowMobileTransform?: boolean;

  columnUserSelect?: true | false | "text" | "none";
  /**
   * Defaults to `true`, which renders both horizontal and vertical separators.
   * Use `"horizontal"` to keep row dividers while disabling vertical separators.
   */
  showCellBorders?: TypeShowCellBorders;

  i18n?: TypeI18n;

  /**
   * Content rendered when the current data view has no rows.
   *
   * String values are resolved as i18n keys before falling back to the
   * supplied string. A function is invoked when the empty state is rendered;
   * `null`, `false`, and an empty string suppress the empty-state content.
   */
  emptyText?: React.ReactNode | (() => React.ReactNode);

  showColumnMenuTool?: boolean;

  rowHeight?: number | ((rowIndex: number) => number) | null;
  rowHeights?: TypeRowHeights;
  defaultRowHeights?: TypeRowHeights;
  onRowHeightsChange?: (rowHeights: TypeRowHeights) => void;
  onUpdateRowHeights?: (
    heights: { [rowIndex: number]: number },
    computedProps: TypeComputedProps
  ) => void;
  minRowHeight?: number;
  maxRowHeight?: number;
  rowStyle?: TypeRowStyle;
  rowProps?:
    | TypeRowDOMProps
    | ((rowProps: TypeRowProps) => TypeRowDOMProps | undefined);
  rowClassName?: TypeRowClassName;
  renderRow?: TypeRenderRow;
  onRenderRow?: TypeOnRenderRow;
  onRowClick?: TypeOnRowClick;
  onRowDoubleClick?: TypeOnRowDoubleClick;
  onCellClick?: TypeOnCellClick;
  onCellDoubleClick?: TypeOnCellDoubleClick;
  cellDOMProps?: TypeCellDOMPropsConfig;
  headerDOMProps?: TypeHeaderDOMPropsConfig;
  showHoverRows?: boolean;
  showEmptyRows?: boolean;
  showZebraRows?: boolean;
  defaultShowZebraRows?: boolean;

  editable?: boolean;
  editStartEvent?: string;
  isStartEditKeyPressed?: (args: TypeStartEditKeyArgs) => boolean;
  autoFocusOnEditComplete?: boolean;
  autoFocusOnEditEscape?: boolean;
  onEditStart?: (editInfo: TypeEditInfo) => void;
  onEditStop?: (editInfo: TypeEditInfo) => void;
  onEditComplete?: (editInfo: TypeEditInfo) => void | Promise<unknown>;
  onEditCancel?: (editInfo: TypeEditInfo) => void;
  onEditValueChange?: (editInfo: TypeEditInfo) => void;

  onColumnResize?: (
    info: TypeColumnResizeInfo,
    context: TypeColumnResizeContext
  ) => void;
  onBatchColumnResize?: (
    info: TypeColumnResizeInfo[],
    context: TypeColumnResizeContext
  ) => void;
  headerHeight?: number;
  filterRowHeight?: number;

  loading?: boolean;
  loadingText?: React.ReactNode | (() => React.ReactNode);
  renderLoadMask?: (loadMaskProps: TypeLoadMaskProps) => React.ReactNode | null;
  /**
   * Extension callback fired exactly once for each effective loading-state
   * transition. This also observes a controlled `loading` prop.
   */
  onLoadingChange?: (loading: boolean) => void;

  /**
   * Selection / checkbox column (Inovua-compatible).
   */
  checkboxColumn?: TypeCheckboxColumn;

  /**
   * Explicitly enables or disables row selection. When omitted, selection is
   * inferred from `selected`, `defaultSelected`, or `checkboxColumn`.
   */
  enableSelection?: boolean;

  selected?: TypeRowSelection;
  defaultSelected?: TypeRowSelection;
  unselected?: TypeBoolMap;
  defaultUnselected?: TypeBoolMap;
  onSelectionChange?: (config: TypeOnSelectionChangeArg) => void;

  multiSelect?: boolean;
  checkboxOnlyRowSelect?: boolean;
  checkboxSelectEnableShiftKey?: boolean;
  toggleRowSelectOnClick?: boolean;

  activeCell?: TypeActiveCell;
  defaultActiveCell?: TypeActiveCell;
  onActiveCellChange?: (activeCell: TypeActiveCell) => void;
  activeCellThrottle?: number;
  cellSelection?: TypeCellSelection;
  defaultCellSelection?: TypeCellSelection;
  onCellSelectionChange?: (cellSelection: TypeCellSelection) => void;
  cellSelectionByIndex?: boolean;
  toggleCellSelectOnClick?: boolean;

  activeIndex?: number;
  defaultActiveIndex?: number;
  onActiveIndexChange?: (activeIndex: number) => void;
  activeIndexThrottle?: number;
  enableKeyboardNavigation?: boolean;
  activateRowOnFocus?: boolean;
  keyPageStep?: number;
  allowRowTabNavigation?: boolean;
  rowFocusClassName?: string;
  focusedClassName?: string;
  showActiveRowIndicator?: boolean;
  activeRowIndicatorClassName?: string;

  /**
   * Disables pointer interaction for rows at the specified zero-based
   * displayed indexes.
   *
   * This follows Inovua 5.10.2: indexes are resolved after local
   * sorting/filtering/pagination, not from `idProperty`. Disabled rows remain
   * eligible for controlled, header, and imperative selection.
   */
  disabledRows?: { [key: string]: boolean } | null;

  /**
   * Invoked from the grid's mount effect after the imperative API has been
   * hydrated and before `handle` / `onReady` are notified.
   */
  onDidMount?: (
    computedPropsRef: React.MutableRefObject<TypeComputedProps | null>
  ) => void;
  onReady?: (
    computedPropsRef: React.MutableRefObject<TypeComputedProps | null>
  ) => void;
  handle?: (
    gridApiRef: React.MutableRefObject<TypeComputedProps | null> | null
  ) => void;

  className?: string;
  style?: React.CSSProperties;
  onKeyDown?: React.KeyboardEventHandler<HTMLDivElement>;
  onFocus?: React.FocusEventHandler<HTMLDivElement>;
  onBlur?: React.FocusEventHandler<HTMLDivElement>;
};

/**
 * Executable descriptor for an internally implemented Community feature.
 *
 * the-datagrid does not require consumers to install plugins. These
 * descriptors expose the equivalent built-in behavior for compatibility and
 * diagnostics without pretending that an empty placeholder is functional.
 */
export type TypePlugin = {
  readonly name: string;
  hook: (
    props: TypeDataGridProps,
    computedProps: TypeComputedProps,
    computedPropsRef: React.MutableRefObject<TypeComputedProps | null>
  ) => unknown;
  defaultProps?: () => Record<string, unknown>;
  maybeAddColumns?: (
    columns: TypeColumns,
    props: Record<string, unknown>
  ) => TypeColumns;
  renderColumnContextMenu?: (
    computedProps: TypeComputedProps,
    computedPropsRef: React.MutableRefObject<TypeComputedProps | null>
  ) => React.ReactNode;
  renderRowContextMenu?: (
    computedProps: TypeComputedProps,
    computedPropsRef: React.MutableRefObject<TypeComputedProps | null>
  ) => React.ReactNode;
  renderColumnFilterContextMenu?: (
    computedProps: TypeComputedProps,
    computedPropsRef: React.MutableRefObject<TypeComputedProps | null>
  ) => React.ReactNode;
};

export type TypeCommunityPlugin = TypePlugin & {
  readonly name: "sortable-columns" | "filters" | "menus" | "cell-selection";
  readonly methods: readonly (keyof TypeComputedProps)[];
  isEnabled: (props: Readonly<TypeDataGridProps>) => boolean;
  getState: (computedProps: Readonly<TypeComputedProps>) => unknown;
};
