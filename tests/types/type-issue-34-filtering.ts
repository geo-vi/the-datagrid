import * as React from "react";

import ReactDataGrid, {
  type TypeColumnFilterContextMenuProps,
  type TypeColumns,
  type TypeDataGridProps,
  type TypeRenderColumnFilterContextMenu,
} from "@geovi/the-datagrid";

const columns: TypeColumns = [
  { name: "id", filterable: false },
  {
    name: "name",
    type: "string",
    filterName: "profileName",
    filterDelay: 25,
    getFilterValue: ({ data }) => (data as { profileName: string }).profileName,
  },
  {
    name: "enabled",
    filterType: "boolean",
    filterDelay: false,
  },
];

const renderColumnFilterContextMenu: TypeRenderColumnFilterContextMenu = (
  menuProps,
  { cellProps, grid, props }
) => {
  const typedMenuProps: TypeColumnFilterContextMenuProps = menuProps;
  const columnId: string | undefined = cellProps.columnId;
  const currentGrid = grid.current;
  const count = props.getCount();
  void typedMenuProps;
  void columnId;
  void currentGrid;
  void count;
  return React.createElement("div", { role: "menu" });
};

const props = {
  idProperty: "id",
  columns,
  dataSource: [{ id: 1, profileName: "Ada", enabled: true }],
  defaultFilterValue: [
    {
      name: "name",
      type: "string",
      operator: "contains",
      value: "Ada",
    },
  ],
  scrollTopOnFilter: false,
  renderColumnFilterContextMenu,
  columnFilterContextMenuAlignPositions: ["tl-bl"],
  columnFilterContextMenuConstrainTo: () => document.body,
  columnFilterContextMenuPosition: "fixed",
  updateMenuPositionOnScroll: false,
} satisfies TypeDataGridProps;

React.createElement(ReactDataGrid, props);
