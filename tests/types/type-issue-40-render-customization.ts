import * as React from "react";

import type {
  CellProps,
  TypeCellProps,
  TypeColumns,
  TypeDataGridProps,
  TypeRowProps,
} from "../../src/main";

const columns = [
  {
    name: "id",
    header: (cell: TypeCellProps) => `ID ${cell.columnIndex}`,
    renderHeader: (cell: TypeCellProps) => cell.columnId,
    render: (cell: CellProps) => cell.value,
    cellProps: { source: "column" },
    cellDOMProps: (cell: CellProps) => ({
      "data-row-id": String(cell.rowId),
    }),
    headerDOMProps: {
      "data-header-hook": "id",
    },
    className: (cell: CellProps) => (cell.empty ? "empty" : "filled"),
    style: (cell: CellProps) => ({ opacity: cell.active ? 1 : 0.9 }),
    rowspan: (cell: CellProps) => (cell.rowIndex === 0 ? 2 : 1),
    colspan: 1,
  },
] satisfies TypeColumns;

const props = {
  idProperty: "id",
  columns,
  dataSource: [{ id: "row-1" }],
  cellDOMProps: (cell) => ({ "data-cell": String(cell.columnId) }),
  headerDOMProps: (cell) => ({ "data-header": String(cell.columnId) }),
  rowProps: (row: TypeRowProps) => ({
    "data-row": String(row.id),
  }),
  rowClassName: (row: TypeRowProps) => `row-${row.rowIndex}`,
  renderRow: ({ rowProps, ...nativeProps }) =>
    React.createElement("tr", {
      ...nativeProps,
      "data-rendered-row": String(rowProps.id),
    }),
  onRenderRow: (row: TypeRowProps) => {
    void row.empty;
  },
  onRowClick: (row, event) => {
    void row.data;
    void event.currentTarget;
  },
  onRowDoubleClick: (event, row) => {
    void event.currentTarget;
    void row.data;
  },
  onCellClick: (event, cell) => {
    void event.currentTarget;
    void cell.totalDataCount;
  },
  onCellDoubleClick: (event, cell) => {
    void event.currentTarget;
    void cell.empty;
  },
  showHoverRows: false,
  showEmptyRows: true,
} satisfies TypeDataGridProps;

void props;
