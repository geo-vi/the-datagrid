import * as React from "react";

import ReactDataGrid, {
  type TypeBoolMap,
  type TypeColumns,
  type TypeComputedProps,
  type TypeDataGridProps,
  type TypeRowSelection,
} from "@geovi/the-datagrid";

const columns: TypeColumns = [
  { name: "id", header: "ID" },
  { name: "name", header: "Name" },
];
const rows = [{ id: "row-1", name: "Ada" }];
const unselected: TypeBoolMap = { "row-2": true };

const props = {
  idProperty: "id",
  columns,
  dataSource: rows,
  enableSelection: true,
  multiSelect: true,
  selected: true as TypeRowSelection,
  unselected,
  defaultUnselected: {},
  toggleRowSelectOnClick: false,
  activeIndex: 0,
  defaultActiveIndex: 0,
  activeIndexThrottle: 16,
  enableKeyboardNavigation: true,
  activateRowOnFocus: true,
  keyPageStep: 10,
  allowRowTabNavigation: true,
  rowFocusClassName: "row-focused",
  focusedClassName: "grid-focused",
  showActiveRowIndicator: true,
  activeRowIndicatorClassName: "active-indicator",
  onActiveIndexChange: (activeIndex: number) => {
    void activeIndex;
  },
  onSelectionChange: ({ selected, unselected: excluded }) => {
    void selected;
    void excluded;
  },
} satisfies TypeDataGridProps;

React.createElement(ReactDataGrid, props);

declare const api: TypeComputedProps;
api.setActiveIndex?.(3);
api.incrementActiveIndex?.(-1);
api.getActiveItem?.();
api.getFirstVisibleIndex?.();
api.setSelected?.(true);
api.setSelectedById?.("row-1", true);

const activeIndex: number | undefined = api.computedActiveIndex;
const lastActiveIndex: number | null | undefined = api.computedLastActiveIndex;
const selectionEnabled: boolean | undefined = api.computedRowSelectionEnabled;
const multiSelectionEnabled: boolean | undefined =
  api.computedRowMultiSelectionEnabled;
const focused: boolean | undefined = api.computedFocused;

void activeIndex;
void lastActiveIndex;
void selectionEnabled;
void multiSelectionEnabled;
void focused;
