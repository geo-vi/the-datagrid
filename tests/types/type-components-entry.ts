import ReactDataGrid, {
  type TypeColumns,
  type TypeDataGridProps,
} from "@geovi/the-datagrid";
import * as ComponentsEntry from "@geovi/the-datagrid/components";
import {
  RDGColumnVisibilityProvider,
  RDGColumnVisibilityTarget,
  RDGColumnVisibilityToolbar,
  RDGProvider,
  RDGSearchBar,
  RDGSearchProvider,
  RDGSearchTarget,
  RDGTarget,
  type RDGColumnVisibilityProviderProps,
  type RDGColumnVisibilityTargetProps,
  type RDGColumnVisibilityToolbarProps,
  type RDGProviderProps,
  type RDGSearchBarProps,
  type RDGSearchProviderProps,
  type RDGSearchTargetProps,
  type RDGTargetProps,
} from "@geovi/the-datagrid/components";
import { createElement, type ComponentProps } from "react";

type AssertNever<T extends never> = T;

type ComponentsRuntimeExport =
  | "RDGProvider"
  | "RDGTarget"
  | "RDGSearchBar"
  | "RDGSearchProvider"
  | "RDGSearchTarget"
  | "RDGColumnVisibilityProvider"
  | "RDGColumnVisibilityTarget"
  | "RDGColumnVisibilityToolbar";

export type ComponentsEntryHasNoPublicInternals = AssertNever<
  Exclude<keyof typeof ComponentsEntry, ComponentsRuntimeExport>
>;

export type UnifiedComponentsStayOutsideCoreRuntime = AssertNever<
  Extract<
    "RDGProvider" | "RDGTarget",
    keyof typeof import("@geovi/the-datagrid")
  >
>;

const columns: TypeColumns = [
  { name: "id", header: "ID", hideable: false },
  { name: "name", header: "Name", searchable: true },
  { name: "city", header: "City", visible: false },
];

const gridProps = {
  idProperty: "id",
  columns,
  dataSource: [{ id: 1, name: "Ada", city: "London" }],
} satisfies TypeDataGridProps;

const gridElement = createElement(ReactDataGrid, gridProps);

export const componentsTargetProps = {
  children: gridElement,
} satisfies RDGTargetProps;

export const componentsProviderProps = {
  defaultSearchValue: "Ada",
  children: [
    createElement(RDGSearchBar, { placeholder: "Search people" }),
    createElement(RDGColumnVisibilityToolbar, {
      children: createElement("button", { type: "button" }, "Export"),
    }),
    createElement(RDGTarget, componentsTargetProps),
  ],
} satisfies RDGProviderProps;

export const componentsComposition = createElement(
  RDGProvider,
  componentsProviderProps
);

export type ComponentsProviderPropsAreExported = ComponentProps<
  typeof RDGProvider
>;
export type ComponentsTargetPropsAreExported = ComponentProps<typeof RDGTarget>;
export type ComponentsSearchBarPropsAreExported = ComponentProps<
  typeof RDGSearchBar
>;
export type ComponentsSearchProviderPropsAreExported = ComponentProps<
  typeof RDGSearchProvider
>;
export type ComponentsSearchTargetPropsAreExported = ComponentProps<
  typeof RDGSearchTarget
>;
export type ComponentsColumnVisibilityProviderPropsAreExported = ComponentProps<
  typeof RDGColumnVisibilityProvider
>;
export type ComponentsColumnVisibilityTargetPropsAreExported = ComponentProps<
  typeof RDGColumnVisibilityTarget
>;
export type ComponentsColumnVisibilityToolbarPropsAreExported = ComponentProps<
  typeof RDGColumnVisibilityToolbar
>;

export type ComponentsProviderPropsMatchExport = RDGProviderProps;
export type ComponentsTargetPropsMatchExport = RDGTargetProps;
export type ComponentsSearchBarPropsMatchExport = RDGSearchBarProps;
export type ComponentsSearchProviderPropsMatchExport = RDGSearchProviderProps;
export type ComponentsSearchTargetPropsMatchExport = RDGSearchTargetProps;
export type ComponentsColumnVisibilityProviderPropsMatchExport =
  RDGColumnVisibilityProviderProps;
export type ComponentsColumnVisibilityTargetPropsMatchExport =
  RDGColumnVisibilityTargetProps;
export type ComponentsColumnVisibilityToolbarPropsMatchExport =
  RDGColumnVisibilityToolbarProps;
