import ReactDataGrid, {
  type TypeColumns,
  type TypeDataGridProps,
} from "@geovi/the-datagrid";
import * as ComponentsEntry from "@geovi/the-datagrid/components";
import {
  RDGToolbarProvider,
  RDGToolbarTarget,
  RDGToolbar,
  RDGProvider,
  RDGSearchBar,
  RDGSearchProvider,
  RDGSearchTarget,
  RDGTarget,
  useRDGToolbarApi,
  useRDGToolbarApiState,
  type RDGToolbarApi,
  type RDGToolbarExportSettings,
  type RDGToolbarState,
  type RDGToolbarProviderProps,
  type RDGToolbarTargetProps,
  type RDGToolbarProps,
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
  | "RDGToolbarProvider"
  | "RDGToolbarTarget"
  | "RDGToolbar"
  | "useRDGToolbarApi"
  | "RDGToolbarSurface"
  | "RDGColumnToggleList"
  | "RDGColumnsButton"
  | "RDGExportButton"
  | "RDGFilterToggleButton"
  | "RDGClearFiltersButton"
  | "useRDGColumnToggleItems"
  | "useRDGToolbarApiState";

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
    createElement(RDGToolbar, {
      disableMobileAutoToolbarCollapsedColumns: true,
      showExport: true,
      showFilterToggle: true,
      toolbarCollapsedColumnToggles: true,
      children: createElement("button", { type: "button" }, "Reload"),
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
export type ComponentsToolbarProviderPropsAreExported = ComponentProps<
  typeof RDGToolbarProvider
>;
export type ComponentsToolbarTargetPropsAreExported = ComponentProps<
  typeof RDGToolbarTarget
>;
export type ComponentsToolbarPropsAreExported = ComponentProps<
  typeof RDGToolbar
>;

export type ComponentsProviderPropsMatchExport = RDGProviderProps;
export type ComponentsTargetPropsMatchExport = RDGTargetProps;
export type ComponentsSearchBarPropsMatchExport = RDGSearchBarProps;
export type ComponentsSearchProviderPropsMatchExport = RDGSearchProviderProps;
export type ComponentsSearchTargetPropsMatchExport = RDGSearchTargetProps;
export type ComponentsToolbarProviderPropsMatchExport = RDGToolbarProviderProps;
export type ComponentsToolbarTargetPropsMatchExport = RDGToolbarTargetProps;
export type ComponentsToolbarPropsMatchExport = RDGToolbarProps;

export type ComponentsToolbarApiMatchesExport = RDGToolbarApi;
export type ComponentsToolbarStateMatchesExport = RDGToolbarState;
export type ComponentsToolbarExportSettingsMatchExport =
  RDGToolbarExportSettings;

export function useToolbarApiFromComponentsEntry() {
  const api: RDGToolbarApi = useRDGToolbarApi();
  const state: RDGToolbarState = useRDGToolbarApiState(api);
  const exportDefaults: RDGToolbarExportSettings = { fileName: "people" };

  return { attached: state.attached, exportDefaults, api };
}
