import type {
  TypeColumns,
  TypeDataGridProps,
  TypeDataSourceArgs,
} from "@geovi/the-datagrid";
import {
  RDGSearchBar,
  RDGSearchProvider,
  RDGSearchTarget,
} from "@geovi/the-datagrid/search";
import type { ComponentProps } from "react";

const columns: TypeColumns = [{ name: "id", searchable: true }];

export const gridProps = {
  idProperty: "id",
  columns,
  dataSource: [{ id: 1 }],
} satisfies TypeDataGridProps;

export const remoteArgs: TypeDataSourceArgs = {
  sortInfo: null,
  filterValue: null,
  columnOrder: ["id"],
  columns,
  idProperty: "id",
  theme: "default",
  searchValue: "one",
};

export type PublishedSearchBarProps = ComponentProps<typeof RDGSearchBar>;
export type PublishedSearchProviderProps = ComponentProps<
  typeof RDGSearchProvider
>;
export type PublishedSearchTargetProps = ComponentProps<typeof RDGSearchTarget>;
