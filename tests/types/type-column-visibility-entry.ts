import ReactDataGrid, {
  type TypeColumns,
  type TypeDataGridProps,
} from "@geovi/the-datagrid";
import * as ColumnVisibilityEntry from "@geovi/the-datagrid/column-visibility";
import {
  RDGColumnVisibilityProvider,
  RDGColumnVisibilityTarget,
  RDGColumnVisibilityToolbar,
  type RDGColumnVisibilityProviderProps,
  type RDGColumnVisibilityTargetProps,
  type RDGColumnVisibilityToolbarProps,
} from "@geovi/the-datagrid/column-visibility";
import { createElement, type ComponentProps } from "react";

type AssertNever<T extends never> = T;

type ColumnVisibilityRuntimeExport =
  | "RDGColumnVisibilityProvider"
  | "RDGColumnVisibilityTarget"
  | "RDGColumnVisibilityToolbar";

export type ColumnVisibilityEntryHasNoPublicInternals = AssertNever<
  Exclude<keyof typeof ColumnVisibilityEntry, ColumnVisibilityRuntimeExport>
>;

export type ColumnVisibilityStaysOutsideCoreRuntime = AssertNever<
  Extract<
    ColumnVisibilityRuntimeExport,
    keyof typeof import("@geovi/the-datagrid")
  >
>;

export type InternalColumnVisibilityBridgeStaysPrivate = AssertNever<
  Extract<"__rdgColumnVisibilityController", keyof TypeDataGridProps>
>;

const columns: TypeColumns = [
  { name: "id", header: "ID", hideable: false },
  { name: "name", header: "Name" },
  { name: "city", header: "City", visible: false },
];

const gridProps = {
  idProperty: "id",
  columns,
  dataSource: [{ id: 1, name: "Ada", city: "London" }],
} satisfies TypeDataGridProps;

const gridElement = createElement(ReactDataGrid, gridProps);

export const columnVisibilityToolbarProps = {
  ariaLabel: "Account column toggles",
  children: createElement("button", { type: "button" }, "Export CSV"),
  description: "Choose fields shown in this table.",
  title: "Visible fields",
} satisfies RDGColumnVisibilityToolbarProps;

export const columnVisibilityTargetProps = {
  children: gridElement,
} satisfies RDGColumnVisibilityTargetProps;

export const columnVisibilityProviderProps = {
  children: [
    createElement(RDGColumnVisibilityToolbar, columnVisibilityToolbarProps),
    createElement(RDGColumnVisibilityTarget, columnVisibilityTargetProps),
  ],
} satisfies RDGColumnVisibilityProviderProps;

export const columnVisibilityComposition = createElement(
  RDGColumnVisibilityProvider,
  columnVisibilityProviderProps
);

export type ColumnVisibilityProviderPropsAreExported = ComponentProps<
  typeof RDGColumnVisibilityProvider
>;
export type ColumnVisibilityToolbarPropsAreExported = ComponentProps<
  typeof RDGColumnVisibilityToolbar
>;
export type ColumnVisibilityTargetPropsAreExported = ComponentProps<
  typeof RDGColumnVisibilityTarget
>;
