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
  TypeComputedProps,
  TypeDataGridProps,
  TypeDataSource,
  TypeFilterOperator,
  TypeFilterType,
  TypeFilterTypes,
  TypeFilterValue,
  TypeI18n,
  TypeOnSelectionChangeArg,
  TypePaginationMode,
  TypeRowSelection,
  TypeSingleFilterValue,
  TypeSingleSortInfo,
  TypeSortInfo,
  // plus your checkbox/selection compat types if you added them
  TypeCheckboxColumn,
  TypeCheckboxProps,
} from "./types";
