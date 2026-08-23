import ReactDataGrid, {
  type TypeColumns,
  type TypeDataGridProps,
} from "@geovi/the-datagrid";
import * as ToolbarEntry from "@geovi/the-datagrid/toolbar";
import {
  RDGToolbarProvider,
  RDGToolbarTarget,
  RDGToolbar,
  useRDGToolbarApi,
  useRDGToolbarApiState,
  type RDGToolbarApi,
  type RDGToolbarExportFormat,
  type RDGToolbarExportInfo,
  type RDGToolbarExportResult,
  type RDGToolbarExportScope,
  type RDGToolbarExportSettings,
  type RDGToolbarLabels,
  type RDGToolbarProviderProps,
  type RDGToolbarState,
  type RDGToolbarTargetProps,
  type RDGToolbarProps,
} from "@geovi/the-datagrid/toolbar";
import { createElement, createRef, type ComponentProps } from "react";

type AssertNever<T extends never> = T;

type ToolbarRuntimeExport =
  | "RDGToolbarProvider"
  | "RDGToolbarTarget"
  | "RDGToolbar"
  | "useRDGToolbarApi"
  | "useRDGToolbarApiState";

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
  columns: "Choose columns",
  export: "Download",
  hideFilters: "Hide filter row",
  showFilters: "Show filter row",
} satisfies RDGToolbarLabels;

const exportFormats: readonly RDGToolbarExportFormat[] = ["csv", "json"];
const exportScope: RDGToolbarExportScope = "view";

export const toolbarProps = {
  ariaLabel: "Account column toggles",
  children: createElement("button", { type: "button" }, "Reload"),
  collapsible: true,
  description: "Choose fields shown in this table.",
  exportFileName: "accounts",
  exportFormats,
  exportScope,
  labels: toolbarLabels,
  onExportSuccess: (result: RDGToolbarExportResult) => {
    void `${result.fileName}:${result.rowCount}:${result.byteLength}`;
  },
  onExportError: (error: unknown) => {
    void error;
  },
  showClearFilters: true,
  showColumnToggles: true,
  showExport: true,
  showFilterToggle: true,
  toolbarCollapsedColumnToggles: true,
  title: "Visible fields",
} satisfies RDGToolbarProps;

export const toolbarTargetProps = {
  children: gridElement,
} satisfies RDGToolbarTargetProps;

const apiRef = createRef<RDGToolbarApi>();

const exportDefaults = {
  scope: exportScope,
  fileName: (info: RDGToolbarExportInfo) => `accounts-${info.rowCount}`,
  dateFormat: "yyyy-mm-dd hh:mm",
  sheetName: "Accounts",
} satisfies RDGToolbarExportSettings;

export const toolbarProviderProps = {
  apiRef,
  exportDefaults,
  children: [
    createElement(RDGToolbar, toolbarProps),
    createElement(RDGToolbarTarget, toolbarTargetProps),
  ],
} satisfies RDGToolbarProviderProps;

export async function readsTheToolbarApi(api: RDGToolbarApi) {
  const result: RDGToolbarExportResult | null = await api.exportGrid("xlsx", {
    scope: "all",
  });
  const formats: readonly RDGToolbarExportFormat[] = api.getExportFormats();
  const state: RDGToolbarState = api.getState();
  const stop: () => void = api.subscribe(() => {});

  api.setColumnVisible("city", api.isColumnVisible("city"));
  api.setFilteringEnabled(!api.isFilteringEnabled());
  if (api.canToggleFiltering() && api.isFiltered()) api.clearAllFilters();
  stop();

  return {
    result,
    formats,
    state,
    columnCount: api.getColumns().length,
    viewRows: api.getViewRows().length,
    allRows: api.getAllRows().length,
  };
}

export function useToolbarHooksSurface() {
  const api: RDGToolbarApi = useRDGToolbarApi();
  const state: RDGToolbarState = useRDGToolbarApiState(api);

  return state.attached && !state.filtered;
}

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
