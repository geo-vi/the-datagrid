import "./index.css";

export { default, ReactDataGrid, plugins } from "./ReactDataGrid";

export { DateFilter, NumberFilter, SelectFilter } from "./filters/editors";
export { default as CheckBox } from "./packages/CheckBox";

// optionally useful for consumers
export { DEFAULT_FILTER_TYPES } from "./filters/utils";

export type {
  IColumn,
  SortDirection,
  TypeColumn,
  TypeColumns,
  TypeComputedColumn,
  TypeComputedColumnsMap,
  TypeComputedProps,
  TypeDataGridProps,
  TypeDataSource,
  TypeFilterOperator,
  TypeFilterType,
  TypeFilterTypes,
  TypeFilterValue,
  TypeGetColumnByParam,
  TypeI18n,
  TypeOnSelectionChangeArg,
  TypePaginationMode,
  TypeShowCellBorders,
  TypeRowSelection,
  TypeSize,
  TypeSingleFilterValue,
  TypeSingleSortInfo,
  TypeSortInfo,
  // plus your checkbox/selection compat types if you added them
  TypeCheckboxColumn,
  TypeCheckboxProps,
} from "./types";
