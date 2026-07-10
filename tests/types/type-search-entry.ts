import ReactDataGrid, {
  type TypeColumns,
  type TypeDataGridProps,
  type TypeDataSourceArgs,
} from "@geovi/the-datagrid";
import {
  RDGSearchBar,
  RDGSearchProvider,
  RDGSearchTarget,
} from "@geovi/the-datagrid/search";
import { createElement, type ComponentProps } from "react";

type AssertNever<T extends never> = T;

type SearchOnlyGridProp =
  | "enableGlobalSearch"
  | "globalSearchValue"
  | "searchValue"
  | "defaultSearchValue"
  | "onSearchValueChange";

export type SearchRemainsOutsideTypeDataGridProps = AssertNever<
  Extract<SearchOnlyGridProp, keyof TypeDataGridProps>
>;

export const searchableColumns: TypeColumns = [
  {
    name: "city",
    header: "City",
    searchAliases: ["location", "office"],
    searchable: true,
    searchValue: (row: { city?: string }) => row.city ?? "",
  },
  {
    name: "internalNote",
    header: "Internal note",
    searchable: false,
  },
];

const gridProps = {
  idProperty: "id",
  columns: searchableColumns,
  dataSource: [{ id: 1, city: "Paris", internalNote: "private" }],
} satisfies TypeDataGridProps;

export const directSearchComposition = createElement(
  RDGSearchProvider,
  { children: null, defaultValue: "Paris" },
  createElement(RDGSearchBar, {
    ariaLabel: "Search accounts",
    clearLabel: "Reset account search",
    debounceMs: 150,
    placeholder: "Search account fields…",
  }),
  createElement(ReactDataGrid, gridProps)
);

export function readOptionalRemoteSearchValue(
  args: TypeDataSourceArgs
): string {
  return args.searchValue ?? "";
}

export const nestedSearchComposition = createElement(
  RDGSearchProvider,
  null,
  createElement(RDGSearchBar),
  createElement(
    "section",
    null,
    createElement(
      RDGSearchTarget,
      null,
      createElement(ReactDataGrid, gridProps)
    )
  )
);

export type SearchBarPropsAreExported = ComponentProps<typeof RDGSearchBar>;
export type SearchProviderPropsAreExported = ComponentProps<
  typeof RDGSearchProvider
>;
export type SearchTargetPropsAreExported = ComponentProps<
  typeof RDGSearchTarget
>;
