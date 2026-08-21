import * as React from "react";

import type {
  CellProps,
  TypeColumnEditorProps,
  TypeColumns,
  TypeDataGridProps,
  TypeInlineEditorProps,
} from "../../src/main";
import {
  BoolEditor,
  DateEditor,
  NumericEditor,
  SelectEditor,
  TextEditor,
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
  {
    name: "bool",
    editable: true,
    editor: BoolEditor,
  },
  {
    name: "date",
    editable: true,
    editor: DateEditor,
  },
  {
    name: "number",
    editable: true,
    editor: NumericEditor,
    editorProps: {
      onTabNavigation: (
        complete: boolean,
        direction: -1 | 0 | 1,
        event: React.KeyboardEvent<HTMLElement>
      ) => {
        void complete;
        void direction;
        void event;
      },
    },
  },
  {
    name: "status",
    editable: true,
    editor: SelectEditor,
    editorProps: {
      seamless: true,
      dataSource: [
        { id: "triage", label: "Triage" },
        { id: "done", label: "Signed off" },
      ],
    },
  },
  {
    // Inovua merges the column into the cell props, so column-scoped edit
    // callbacks receive `(value, cellProps)` rather than a `TypeEditInfo`.
    name: "text",
    editable: (_value: unknown, cellProps: CellProps) =>
      cellProps.data.enabled !== "locked",
    editor: TextEditor,
    editorProps: { seamless: true, trim: true, maxLength: 120 },
    getEditCompleteValue: (value: unknown, cellProps: CellProps) =>
      `${String(value)}@${cellProps.rowIndex}`,
    onEditStart: (value: unknown, cellProps: CellProps) => {
      void value;
      void cellProps.rowId;
    },
    onEditValueChange: (value: unknown, cellProps: CellProps) => {
      void value;
      void cellProps.editValue;
    },
    onEditStop: (value: unknown, cellProps: CellProps) => {
      void value;
      void cellProps.columnId;
    },
    onEditCancel: (cellProps: CellProps) => {
      void cellProps.data;
    },
    onEditComplete: async (value: string, cellProps: CellProps) => {
      void value;
      void cellProps.data;
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
