import * as React from "react";

import type {
  CellProps,
  TypeColumnEditorProps,
  TypeColumns,
  TypeDataGridProps,
  TypeInlineEditorProps,
} from "../../src/main";

const columns = [
  {
    name: "enabled",
    editable: async (editValue: unknown, cellProps: CellProps) => {
      void editValue;
      return cellProps.rowIndex >= 0;
    },
    getEditStartValue: async (value: unknown, cellProps: CellProps) =>
      `${String(value)}:${cellProps.rowId}`,
    editor: (props: TypeColumnEditorProps) =>
      React.createElement("input", {
        value: String(props.value),
        onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
          props.onChange(event.target.value, event),
      }),
    editorProps: { inputMode: "text" },
  },
  {
    name: "inline",
    editable: true,
    rendersInlineEditor: (cellProps: CellProps) => !cellProps.empty,
    render: (cellProps: CellProps) => {
      const editProps: TypeInlineEditorProps | undefined = cellProps.editProps;
      return React.createElement("input", {
        value: String(editProps?.value ?? cellProps.value ?? ""),
        onFocus: () => void editProps?.startEdit(),
        onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
          editProps?.onChange(event.target.value, event),
      });
    },
  },
] satisfies TypeColumns;

const props = {
  idProperty: "id",
  columns,
  dataSource: [{ id: 1, enabled: "before", inline: "always" }],
  editable: true,
  editStartEvent: "click",
  isStartEditKeyPressed: ({ event, activeItem, activeIndex, handle }) => {
    void activeItem;
    void activeIndex;
    void handle.current?.getCurrentEditInfo?.();
    return event.key === "F2";
  },
  autoFocusOnEditComplete: false,
  autoFocusOnEditEscape: false,
} satisfies TypeDataGridProps;

void props;
