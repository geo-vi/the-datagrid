import type { TypeColumns } from "../../src/main";

export const columnsWithFilterPadding: TypeColumns = [
  {
    name: "id",
    header: "ID",
    filterable: true,
    filterCellPadding: "0 2px",
  },
  {
    name: "name",
    header: "Name",
    filterable: true,
    filterCellPadding: 0,
  },
];
