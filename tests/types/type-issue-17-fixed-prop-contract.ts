import * as React from "react";

import type {
  CellProps,
  TypeColumnEditorCell,
  TypeColumnEditorProps,
  TypeColumns,
  TypeComputedProps,
  TypeDataGridProps,
  TypeEditInfo,
  TypeI18n,
} from "../../src/main";

type Issue17ImplementedProp =
  | "rowHeight"
  | "minRowHeight"
  | "maxRowHeight"
  | "rowStyle"
  | "onColumnResize"
  | "editable"
  | "editStartEvent"
  | "onEditStart"
  | "onEditStop"
  | "onEditComplete"
  | "onEditCancel"
  | "onEditValueChange"
  | "showZebraRows"
  | "defaultShowZebraRows"
  | "enableSelection"
  | "virtualizeColumnsThreshold"
  | "virtualizeColumns"
  | "onColumnFilterValueChange"
  | "emptyText";

type Issue17UnsupportedProp = never;

type AssertNever<T extends never> = T;

export type Issue17ImplementedPropsArePublic = AssertNever<
  Exclude<Issue17ImplementedProp, keyof TypeDataGridProps>
>;

export type Issue17UnsupportedPropsRemainOutsideTypeDataGridProps = AssertNever<
  Extract<Issue17UnsupportedProp, keyof TypeDataGridProps>
>;

const issue17Rows = [
  {
    id: "row-1",
    request: "emptyText",
    supportedPath: "i18n.noRecords",
    impact: 3,
  },
];

function Issue17Editor(props: TypeColumnEditorProps): React.ReactNode {
  void props.editorProps;
  void props.nativeScroll;
  void props.theme;
  void props.rtl;
  void props.cell.getProps();
  void props.cell.getDOMNode();
  void props.gotoNext;
  void props.gotoPrev;
  void props.onClick;

  return React.createElement("input", {
    autoFocus: props.autoFocus,
    value: String(props.value ?? ""),
    onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
      props.onChange(event.target.value),
    onBlur: () => props.onComplete(),
    onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Escape") props.onCancel();
    },
  });
}

type Issue17ConfiguredEditorProps = TypeColumnEditorProps & {
  placeholder: string;
};

function Issue17ConfiguredEditor(
  props: Issue17ConfiguredEditorProps
): React.ReactNode {
  return React.createElement("input", {
    placeholder: props.placeholder,
    value: String(props.value ?? ""),
    onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
      props.onChange(event),
    onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        props.onEnterNavigation(true, event.shiftKey ? -1 : 1, event);
      }
      if (event.key === "Tab") {
        props.onTabNavigation(true, event.shiftKey ? -1 : 1, event);
      }
    },
  });
}

export const issue17Columns: TypeColumns = [
  {
    name: "request",
    header: "Requested prop",
    defaultWidth: 180,
    minWidth: 140,
    maxWidth: 260,
    filterable: true,
    editable: false,
  },
  {
    name: "supportedPath",
    header: "Supported path",
    defaultWidth: 220,
    minWidth: 180,
    maxWidth: 320,
    editable: async (editValue) => String(editValue).length > 0,
    editor: Issue17ConfiguredEditor,
    editorProps: { placeholder: "Edit supported path" },
    render: (value: unknown) => String(value),
  },
  {
    name: "impact",
    header: "Impact",
    defaultWidth: 120,
    textAlign: "end",
    headerAlign: "end",
    editable: true,
    renderEditor: (
      editorProps: TypeColumnEditorProps,
      cellProps: CellProps,
      cell: TypeColumnEditorCell
    ) => {
      void editorProps.editorProps;
      void cellProps.computedVisibleIndex;
      void cell.getCurrentEditValue();
      return Issue17Editor(editorProps);
    },
    style: { fontVariantNumeric: "tabular-nums" },
  },
  {
    name: "internalNote",
    header: "Internal note",
    visible: false,
  },
];

export const issue17I18n: TypeI18n = {
  noRecords: "No issue #17 rows match the current view",
};

export const issue17FixedContractProps = {
  theme: "default",
  idProperty: "id",
  columns: issue17Columns,
  dataSource: issue17Rows,
  columnOrder: ["request", "supportedPath", "impact", "internalNote"],
  enableColumnFilterContextMenu: true,
  enableColumnAutosize: true,
  skipHeaderOnAutoSize: false,
  enableFiltering: true,
  defaultFilterValue: null,
  filteredRowsCount: () => {},
  onColumnOrderChange: () => {},
  virtualized: true,
  columnUserSelect: "text",
  i18n: issue17I18n,
  showColumnMenuTool: false,
} satisfies TypeDataGridProps;

function acceptGridProps(props: TypeDataGridProps): TypeDataGridProps {
  return props;
}

export const issue17NaturalHeightProps = acceptGridProps({
  ...issue17FixedContractProps,
  rowHeight: null,
  minRowHeight: 28,
  maxRowHeight: 160,
});

export const issue17FunctionalHeightProps = acceptGridProps({
  ...issue17FixedContractProps,
  rowHeight: (rowIndex) => (rowIndex === 0 ? 72 : 44),
  minRowHeight: 32,
  maxRowHeight: 120,
});

export const issue17RowAppearanceProps = acceptGridProps({
  ...issue17FixedContractProps,
  showZebraRows: false,
  rowStyle: ({ data, props, style }) => {
    void props.realIndex;
    void props.remoteRowIndex;
    void props.columns[0]?.computedWidth;
    void props.totalComputedWidth;
    void props.naturalRowHeight;
    style["--issue-17-row-impact"] = data.impact;

    return {
      ...style,
      "--issue-17-row-state": data.impact === 0 ? "empty" : "active",
      opacity: data.impact === 0 ? 0.6 : 1,
    };
  },
});

export const issue17EditingAndResizeProps = acceptGridProps({
  ...issue17FixedContractProps,
  editable: true,
  editStartEvent: "click",
  onEditStart: (info) => void info.rowId,
  onEditValueChange: (info) => void info.value,
  onEditStop: (info) => void info.columnId,
  onEditComplete: async (info) => void info.value,
  onEditCancel: (info) => void info.rowIndex,
  onColumnResize: (info, context) => {
    void info.column;
    void info.width;
    void info.flex;
    void context.reservedViewportWidth;
  },
});

export const issue17StaticRowStyleProps = acceptGridProps({
  ...issue17FixedContractProps,
  rowStyle: {
    "--issue-17-static-row": "supported",
    minHeight: 28,
  },
  defaultShowZebraRows: true,
});

type Issue17OptionalEditingApi = Pick<
  TypeComputedProps,
  | "isInEdit"
  | "getCurrentEditInfo"
  | "startEdit"
  | "tryStartEdit"
  | "completeEdit"
  | "cancelEdit"
  | "currentEditCompletePromise"
>;

export const issue17OptionalEditingApi: Issue17OptionalEditingApi = {};

export const issue17NumericEditInfo = {
  rowIndex: 0,
  columnIndex: 1,
  rowId: 103,
  columnId: "supportedPath",
} satisfies TypeEditInfo;

export function exerciseIssue17EditInfoRowIdCompatibility(
  info: TypeEditInfo
): void {
  // The published upstream declaration says string, while its runtime keeps
  // numeric IDs numeric. The compatibility type must support both consumers.
  const declaredStringConsumer: string = info.rowId;
  const observedNumericConsumer: number = info.rowId;
  void declaredStringConsumer;
  void observedNumericConsumer;
}

export async function exerciseIssue17EditingApi(
  api: TypeComputedProps
): Promise<void> {
  const startedValue = await api.startEdit?.({
    rowIndex: 0,
    columnId: "supportedPath",
    value: "programmatic value",
  });
  void startedValue;

  const triedValue = await api.tryStartEdit?.({
    rowId: "row-1",
    columnId: "request",
    dir: 1,
  });
  void triedValue;

  void api.getCurrentEditInfo?.()?.columnId;
  void api.isInEdit?.current;
  void api.currentEditCompletePromise?.current;

  api.completeEdit?.({
    rowIndex: 0,
    columnId: "supportedPath",
    dir: 1,
    value: "completed value",
  });
  api.cancelEdit?.({ rowIndex: 0, columnId: "supportedPath" });
  api.completeEdit?.();
  api.cancelEdit?.();
}

export const issue17EmptyTextReproduction = acceptGridProps({
  ...issue17FixedContractProps,
  emptyText: "No issue #17 rows match the current view",
});

export const issue17EmptyTextRendererReproduction = acceptGridProps({
  ...issue17FixedContractProps,
  emptyText: () =>
    React.createElement(
      "button",
      { type: "button" },
      "No issue #17 rows match the current view"
    ),
});

export const issue17ColumnFilterCallbackReproduction = acceptGridProps({
  ...issue17FixedContractProps,
  onColumnFilterValueChange: (event) => {
    const columnId: string = event.columnId;
    const columnIndex: number = event.columnIndex;
    const filterName: string = event.filterValue.name;
    const cellColumnIndex: number | undefined =
      event.cellProps?.computedVisibleIndex;

    void columnId;
    void columnIndex;
    void filterName;
    void cellColumnIndex;
  },
});

export const issue17EnableSelectionReproduction = acceptGridProps({
  ...issue17FixedContractProps,
  enableSelection: true,
});

export const issue17VirtualizeColumnsThresholdReproduction = acceptGridProps({
  ...issue17FixedContractProps,
  virtualizeColumnsThreshold: 20,
  virtualizeColumns: true,
});
