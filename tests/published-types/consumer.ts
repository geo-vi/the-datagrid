import ReactDataGrid, {
  TextInput as RootTextInput,
  type TextInputClearButtonConfig as RootTextInputClearButtonConfig,
  type TypeTextInputProps as RootTypeTextInputProps,
  type TypeColumns,
  type TypeDataGridProps,
  type TypeDataSourceArgs,
  type TypeDataSourceResult,
  type TypeLoadMaskProps,
  type TypePaginationProps,
} from "@geovi/the-datagrid";
import {
  RDGSearchBar,
  RDGSearchProvider,
  RDGSearchTarget,
} from "@geovi/the-datagrid/search";
import {
  RDGColumnVisibilityProvider,
  RDGColumnVisibilityTarget,
  RDGColumnVisibilityToolbar,
  type RDGColumnVisibilityProviderProps,
  type RDGColumnVisibilityTargetProps,
  type RDGColumnVisibilityToolbarProps,
} from "@geovi/the-datagrid/column-visibility";
import {
  RDGColumnVisibilityProvider as ComponentsColumnVisibilityProvider,
  RDGColumnVisibilityTarget as ComponentsColumnVisibilityTarget,
  RDGColumnVisibilityToolbar as ComponentsColumnVisibilityToolbar,
  RDGProvider,
  RDGSearchBar as ComponentsSearchBar,
  RDGSearchProvider as ComponentsSearchProvider,
  RDGSearchTarget as ComponentsSearchTarget,
  RDGTarget,
  type RDGProviderProps,
  type RDGTargetProps,
} from "@geovi/the-datagrid/components";
import TextInput, {
  type TextInputClearButtonConfig,
  type TextInputProps,
  type TypeTextInputProps,
} from "@geovi/the-datagrid/packages/TextInput";
import BoolEditor, {
  type BoolEditorProps,
} from "@geovi/the-datagrid/BoolEditor";
import DateEditor, {
  type DateEditorProps,
} from "@geovi/the-datagrid/DateEditor";
import NumericEditor, {
  type NumericEditorProps,
} from "@geovi/the-datagrid/NumericEditor";
import StringFilter, {
  type StringFilterProps,
} from "@geovi/the-datagrid/StringFilter";
import BoolFilter, {
  type BoolFilterProps,
} from "@geovi/the-datagrid/BoolFilter";
import DateFilter from "@geovi/the-datagrid/DateFilter";
import NumberFilter from "@geovi/the-datagrid/NumberFilter";
import SelectFilter from "@geovi/the-datagrid/SelectFilter";
import type {
  IColumn as TypesIColumn,
  TypeDataGridProps as TypesDataGridProps,
} from "@geovi/the-datagrid/types";
import type { TypeColumn as DeepTypeColumn } from "@geovi/the-datagrid/types/TypeColumn";
import type { TypeDataSource as DeepTypeDataSource } from "@geovi/the-datagrid/types/TypeDataSource";
import type { TypeFilterValue as DeepTypeFilterValue } from "@geovi/the-datagrid/types/TypeFilterValue";
import type { TypeSortInfo as DeepTypeSortInfo } from "@geovi/the-datagrid/types/TypeSortInfo";
import { createElement, type ComponentProps } from "react";

const columns: TypeColumns = [{ name: "id", searchable: true }];

export const gridProps = {
  idProperty: "id",
  columns,
  dataSource: [{ id: 1 }],
  onDidMount(ref) {
    const result: void | undefined = ref.current
      ?.getVirtualList()
      .adjustHeights();
    void result;
  },
} satisfies TypeDataGridProps;

export const communityModuleTypes = {
  BoolEditor,
  DateEditor,
  NumericEditor,
  StringFilter,
  BoolFilter,
  DateFilter,
  NumberFilter,
  SelectFilter,
};

export const boolEditorProps = {
  value: true,
  onChange(value) {
    const next: boolean | null = value;
    void next;
  },
} satisfies BoolEditorProps;

export const dateEditorProps = {
  value: "2026-07-29",
} satisfies DateEditorProps;

export const numericEditorProps = {
  value: 42,
  min: 0,
} satisfies NumericEditorProps;

export const stringFilterProps = {
  filterValue: {
    name: "name",
    operator: "contains",
    type: "string",
    value: "Ada",
  },
} satisfies StringFilterProps;

export const boolFilterProps = {
  value: true,
} satisfies BoolFilterProps;

export type PublishedTypesIColumn = TypesIColumn;
export type PublishedTypesDataGridProps = TypesDataGridProps;
export type PublishedDeepTypeColumn = DeepTypeColumn;
export type PublishedDeepTypeDataSource = DeepTypeDataSource;
export type PublishedDeepTypeFilterValue = DeepTypeFilterValue;
export type PublishedDeepTypeSortInfo = DeepTypeSortInfo;

export const remoteArgs: TypeDataSourceArgs = {
  sortInfo: null,
  filterValue: null,
  columnOrder: ["id"],
  columns,
  idProperty: "id",
  theme: "default",
  searchValue: "one",
};

export const countBearingResult: TypeDataSourceResult = {
  data: [{ id: 1 }],
  count: 1,
};

export const issue32PublishedProps = {
  idProperty: "id",
  columns,
  dataSource: () => countBearingResult,
  pagination: true,
  loadingText: "Loading",
  onLoadingChange(loading) {
    void loading;
  },
  renderLoadMask(props: TypeLoadMaskProps) {
    return props.visible
      ? typeof props.loadingText === "function"
        ? props.loadingText()
        : props.loadingText
      : null;
  },
  renderPaginationToolbar(props: TypePaginationProps) {
    props.reload();
    return props.totalCount;
  },
} satisfies TypeDataGridProps;

export type PublishedSearchBarProps = ComponentProps<typeof RDGSearchBar>;
export type PublishedDataGridProps = ComponentProps<typeof ReactDataGrid>;
export type PublishedSearchProviderProps = ComponentProps<
  typeof RDGSearchProvider
>;
export type PublishedSearchTargetProps = ComponentProps<typeof RDGSearchTarget>;
export type PublishedColumnVisibilityProviderProps = ComponentProps<
  typeof RDGColumnVisibilityProvider
>;
export type PublishedColumnVisibilityToolbarProps = ComponentProps<
  typeof RDGColumnVisibilityToolbar
>;
export type PublishedColumnVisibilityTargetProps = ComponentProps<
  typeof RDGColumnVisibilityTarget
>;
export type PublishedComponentsProviderProps = ComponentProps<
  typeof RDGProvider
>;
export type PublishedComponentsTargetProps = ComponentProps<typeof RDGTarget>;
export type PublishedComponentsSearchBarProps = ComponentProps<
  typeof ComponentsSearchBar
>;
export type PublishedComponentsSearchProviderProps = ComponentProps<
  typeof ComponentsSearchProvider
>;
export type PublishedComponentsSearchTargetProps = ComponentProps<
  typeof ComponentsSearchTarget
>;
export type PublishedComponentsColumnVisibilityProviderProps = ComponentProps<
  typeof ComponentsColumnVisibilityProvider
>;
export type PublishedComponentsColumnVisibilityTargetProps = ComponentProps<
  typeof ComponentsColumnVisibilityTarget
>;
export type PublishedComponentsColumnVisibilityToolbarProps = ComponentProps<
  typeof ComponentsColumnVisibilityToolbar
>;
export type PublishedTextInputProps = ComponentProps<typeof TextInput>;
export type PublishedRootTextInputProps = ComponentProps<typeof RootTextInput>;

export const textInputProps = {
  acceptClearToolFocus: true,
  clearButtonSize: [12, 14] as const,
  defaultValue: "Ada",
  inputProps: {
    "aria-label": "Migration input",
    "data-consumer-input": "true",
    onChange(value) {
      void value;
    },
  },
  onChange(value, event) {
    void value;
    void event;
  },
  renderClearIcon({ fill, height, width }) {
    void fill;
    void height;
    void width;
    return null;
  },
  rootClassName: "legacy-text-input",
  rtl: true,
  stopChangePropagation: false,
  theme: "blue-dark",
} satisfies TextInputProps;

export const aliasedTextInputProps: TypeTextInputProps = textInputProps;
export const rootAliasedTextInputProps: RootTypeTextInputProps = textInputProps;

export const legacyNullTextInputProps = {
  defaultValue: 0,
  inputProps: null,
  stopChangePropagation: null,
} satisfies TextInputProps;

export declare const textInputInstance: InstanceType<typeof TextInput>;
textInputInstance.focus();
textInputInstance.setValue("Grace");
const clearButtonConfig: TextInputClearButtonConfig = {
  clearButtonClassName: "legacy-clear",
  clearButtonColor: "currentColor",
  clearButtonSize: [12, 14],
};
const rootClearButtonConfig: RootTextInputClearButtonConfig = clearButtonConfig;
void rootClearButtonConfig;
textInputInstance.renderClearButton(clearButtonConfig);

const publishedGridElement = createElement(ReactDataGrid, gridProps);
const publishedColumnVisibilityToolbarProps = {
  ariaLabel: "Published column toggles",
  children: createElement("button", { type: "button" }, "Export"),
  description: "Choose visible columns.",
  title: "Visible columns",
} satisfies RDGColumnVisibilityToolbarProps;
const publishedColumnVisibilityTargetProps = {
  children: publishedGridElement,
} satisfies RDGColumnVisibilityTargetProps;
export const publishedColumnVisibilityProviderProps = {
  children: [
    createElement(
      RDGColumnVisibilityToolbar,
      publishedColumnVisibilityToolbarProps
    ),
    createElement(
      RDGColumnVisibilityTarget,
      publishedColumnVisibilityTargetProps
    ),
  ],
} satisfies RDGColumnVisibilityProviderProps;
export const publishedColumnVisibilityComposition = createElement(
  RDGColumnVisibilityProvider,
  publishedColumnVisibilityProviderProps
);

const publishedComponentsTargetProps = {
  children: publishedGridElement,
} satisfies RDGTargetProps;
export const publishedComponentsProviderProps = {
  defaultSearchValue: "Ada",
  children: [
    createElement(ComponentsSearchBar, { placeholder: "Search records" }),
    createElement(ComponentsColumnVisibilityToolbar, {
      children: createElement("button", { type: "button" }, "Export"),
    }),
    createElement(RDGTarget, publishedComponentsTargetProps),
  ],
} satisfies RDGProviderProps;
export const publishedComponentsComposition = createElement(
  RDGProvider,
  publishedComponentsProviderProps
);
