import * as React from "react";

import ReactDataGrid, {
  type TypeColumnGroup,
  type TypeColumnGroupDOMProps,
  type TypeColumnGroupHeaderProps,
  type TypeColumns,
  type TypeDataGridProps,
} from "@geovi/the-datagrid";

const groups = [
  {
    name: "profile",
    header: "Profile",
    draggable: true,
    resizable: true,
  },
  {
    name: "identity",
    group: "profile",
    header: (props: TypeColumnGroupHeaderProps) => {
      const names: string[] = props.columnIds;
      const columns: TypeColumns = props.columns;
      props.computedProps.getColumnOrder();
      props.computedPropsRef.current?.getColumnOrder();
      void names;
      void columns;
      return React.createElement("span", null, props.groupName);
    },
    headerClassName: ({ split }) => (split ? "split" : undefined),
    headerStyle: ({ width }) => ({ width }),
    headerDOMProps: ({ segmentCount }) =>
      ({
        "aria-description": `${segmentCount} segments`,
        "data-segment-count": segmentCount,
      }) satisfies TypeColumnGroupDOMProps,
  },
] satisfies TypeColumnGroup[];

const columns = [
  { name: "id", group: "identity" },
  { name: "name", group: "identity" },
] satisfies TypeColumns;

const props = {
  idProperty: "id",
  columns,
  groups,
  dataSource: [{ id: 1, name: "Ada" }],
  allowGroupSplitOnReorder: false,
  columnOrder: ["id", "name"],
  onColumnOrderChange: (order) => {
    const nextOrder: string[] = order;
    void nextOrder;
  },
} satisfies TypeDataGridProps;

React.createElement(ReactDataGrid, props);
