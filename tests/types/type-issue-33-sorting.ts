import * as React from "react";

import ReactDataGrid, {
  type TypeColumn,
  type TypeColumns,
  type TypeDataGridProps,
  type TypeRenderSortTool,
  type TypeSortFunctions,
  type TypeSortInfo,
  type TypeSortToolProps,
} from "@geovi/the-datagrid";

const columnSort: NonNullable<TypeColumn["sort"]> = (
  value1,
  value2,
  column,
  data1,
  data2,
  sortInfo
) => {
  const columnName: string | undefined = column.name;
  const sortName: string = sortInfo.name;
  void columnName;
  void sortName;
  void data1;
  void data2;
  return Number(value1) - Number(value2);
};

const renderSortTool: TypeRenderSortTool = (
  direction,
  extraProps: TypeSortToolProps
) => {
  const sortable: boolean = extraProps.computedSortable;
  const headerCell: true = extraProps.headerCell;
  const columnId: string = extraProps.columnId;
  void sortable;
  void headerCell;
  return React.createElement("span", { "data-column-id": columnId }, direction);
};

const columns: TypeColumns = [
  {
    id: "whole-row",
    header: "Whole row",
    sortable: true,
    type: "rank",
    sort: columnSort,
    renderSortTool,
  },
  { name: "name", type: "string" },
];
const sortFunctions: TypeSortFunctions = {
  rank(value1, value2, column) {
    const id: string | number | undefined = column.id;
    void id;
    return Number(value1) - Number(value2);
  },
};
const defaultSortInfo: TypeSortInfo = [
  { id: "whole-row", name: "", dir: 1, type: "rank" },
];

const props = {
  idProperty: "id",
  columns,
  dataSource: [{ id: "row-1", name: "Ada" }],
  sortable: true,
  sortFunctions,
  renderSortTool,
  scrollTopOnSort: "always",
  defaultSortInfo,
  onSortInfoChange(sortInfo) {
    const next: TypeSortInfo = sortInfo;
    void next;
  },
} satisfies TypeDataGridProps;

React.createElement(ReactDataGrid, props);
