import ReactDataGrid, {
  TextInput as RootTextInput,
  type TextInputClearButtonConfig as RootTextInputClearButtonConfig,
  type TypeTextInputProps as RootTypeTextInputProps,
  type TypeColumns,
  type TypeDataGridProps,
  type TypeDataSourceArgs,
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
