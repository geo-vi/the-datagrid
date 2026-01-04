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
  render?: (
    valueOrCellProps: unknown,
    args?: {
      data: unknown;
      rowIndex: number;
      column: TypeColumn;
      columnId: string;
    }
  ) => React.ReactNode;

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

  sortable?: boolean;
  sortName?: string;

  filterable?: boolean;
  filterType?: string;
  filterName?: string;
  filterEditor?: React.ComponentType<Record<string, unknown>>;
  filterEditorProps?: unknown;

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
 * We accept broad shapes, but the runtime will emit rowObject maps for compat.
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

export type TypeComputedProps = {
  reload: () => void;

  getData: () => unknown[];
  getCount: () => number;

  getSkip: () => number;
  getLimit: () => number;
  setSkip: (skip: number) => void;
  setLimit: (limit: number) => void;

  getSortInfo: () => TypeSortInfo;
  setSortInfo: (sortInfo: TypeSortInfo) => void;

  getFilterValue: () => TypeFilterValue;
  setFilterValue: (filterValue: TypeFilterValue) => void;

  getColumnOrder: () => string[];
  setColumnOrder: (columnOrder: string[]) => void;
};

export type TypePaginationMode = true | false | "remote" | "local";

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
  handle?: (gridApiRef: React.MutableRefObject<TypeComputedProps | null>) => void;

  className?: string;
  style?: React.CSSProperties;
};
