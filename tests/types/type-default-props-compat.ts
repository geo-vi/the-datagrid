import ReactDataGrid, {
  ReactDataGrid as NamedReactDataGrid,
  type TypeDataGridProps,
  type TypeFilterTypes,
} from "@geovi/the-datagrid";
import type { JSX } from "react";

type AssertFalse<T extends false> = T;
type IsOptional<T, K extends keyof T> =
  Partial<Record<K, never>> extends Pick<T, K> ? true : false;
type ManagedGridProps = JSX.LibraryManagedAttributes<
  typeof ReactDataGrid,
  TypeDataGridProps
>;

export type IdPropertyRemainsRequired = AssertFalse<
  IsOptional<ManagedGridProps, "idProperty">
>;
export type ColumnsRemainRequired = AssertFalse<
  IsOptional<ManagedGridProps, "columns">
>;
export type DataSourceRemainsRequired = AssertFalse<
  IsOptional<ManagedGridProps, "dataSource">
>;

const defaultExportDefaults = ReactDataGrid.defaultProps;
const namedExportDefaults = NamedReactDataGrid.defaultProps;

const defaultPropsShape: Partial<TypeDataGridProps> = defaultExportDefaults;
const defaultFilterTypes: TypeFilterTypes = defaultExportDefaults.filterTypes;
const namedFilterTypes: TypeFilterTypes = namedExportDefaults.filterTypes;
const defaultTheme: string = defaultExportDefaults.theme;
const defaultVirtualized: boolean = defaultExportDefaults.virtualized;
const defaultVirtualizeColumnsThreshold: number =
  defaultExportDefaults.virtualizeColumnsThreshold;
const defaultEmptyText: TypeDataGridProps["emptyText"] =
  defaultExportDefaults.emptyText;

export const defaultPropsCompat = {
  defaultPropsShape,
  defaultFilterTypes,
  namedFilterTypes,
  defaultTheme,
  defaultVirtualized,
  defaultVirtualizeColumnsThreshold,
  defaultEmptyText,
  stringOperatorCount: defaultFilterTypes.string.operators.length,
};
