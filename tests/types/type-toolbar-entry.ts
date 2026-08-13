import ReactDataGrid, {
  type TypeColumns,
  type TypeDataGridProps,
} from "@geovi/the-datagrid";
import * as ToolbarEntry from "@geovi/the-datagrid/toolbar";
import {
  RDGToolbarProvider,
  RDGToolbarTarget,
  RDGToolbar,
  type RDGToolbarExportFormat,
  type RDGToolbarExportScope,
  type RDGToolbarLabels,
  type RDGToolbarProviderProps,
  type RDGToolbarTargetProps,
  type RDGToolbarProps,
} from "@geovi/the-datagrid/toolbar";
import { createElement, type ComponentProps } from "react";

type AssertNever<T extends never> = T;

type ToolbarRuntimeExport =
  | "RDGToolbarProvider"
  | "RDGToolbarTarget"
  | "RDGToolbar";

export type ToolbarEntryHasNoPublicInternals = AssertNever<
  Exclude<keyof typeof ToolbarEntry, ToolbarRuntimeExport>
>;

export type ToolbarStaysOutsideCoreRuntime = AssertNever<
  Extract<ToolbarRuntimeExport, keyof typeof import("@geovi/the-datagrid")>
>;

export type InternalToolbarBridgeStaysPrivate = AssertNever<
  Extract<"__rdgToolbarController", keyof TypeDataGridProps>
>;

const columns: TypeColumns = [
  { name: "id", header: "ID", hideable: false },
  { name: "name", header: "Name" },
  { name: "city", header: "City", visible: false, exportWhenHidden: true },
  {
    name: "balance",
    header: "Balance",
    exportValue: ({ value, data, column }) =>
      `${column.name}:${String((data as { id?: unknown }).id)}:${String(value)}`,
  },
  { name: "actions", header: "Actions", exportable: false },
];

const gridProps = {
  idProperty: "id",
  columns,
  dataSource: [{ id: 1, name: "Ada", city: "London" }],
} satisfies TypeDataGridProps;

const gridElement = createElement(ReactDataGrid, gridProps);

const toolbarLabels = {
  clearFilters: "Reset filters",
  export: "Download",
  hideFilters: "Hide filter row",
  showFilters: "Show filter row",
} satisfies RDGToolbarLabels;

const exportFormats: readonly RDGToolbarExportFormat[] = ["csv", "json"];
const exportScope: RDGToolbarExportScope = "view";

export const toolbarProps = {
  ariaLabel: "Account column toggles",
  children: createElement("button", { type: "button" }, "Reload"),
  description: "Choose fields shown in this table.",
  exportFileName: "accounts",
  exportFormats,
  exportScope,
  labels: toolbarLabels,
  showClearFilters: true,
  showColumnToggles: true,
  showExport: true,
  showFilterToggle: true,
  title: "Visible fields",
} satisfies RDGToolbarProps;

export const toolbarTargetProps = {
  children: gridElement,
} satisfies RDGToolbarTargetProps;

export const toolbarProviderProps = {
  children: [
    createElement(RDGToolbar, toolbarProps),
    createElement(RDGToolbarTarget, toolbarTargetProps),
  ],
} satisfies RDGToolbarProviderProps;

export const toolbarComposition = createElement(
  RDGToolbarProvider,
  toolbarProviderProps
);

export type ToolbarProviderPropsAreExported = ComponentProps<
  typeof RDGToolbarProvider
>;
export type ToolbarPropsAreExported = ComponentProps<typeof RDGToolbar>;
export type ToolbarTargetPropsAreExported = ComponentProps<
  typeof RDGToolbarTarget
>;
