import { filterTypes } from "../../src/main";
import type { CellProps, TypeColumns, TypeFilterTypes } from "../../src/main";

const exportedFilterTypes: TypeFilterTypes = filterTypes;

export const issue21Columns: TypeColumns = [
  {
    name: "name",
    header: "Name",
    filterable: true,
    filterType: exportedFilterTypes.string.type,
    render: (cellProps: CellProps) => {
      return String(cellProps.value ?? cellProps.data?.name ?? "");
    },
  },
];

export const issue21DefaultFilter = [
  {
    name: "name",
    type: exportedFilterTypes.string.type,
    operator: exportedFilterTypes.string.operators[0]?.name ?? "contains",
    value: "",
  },
];
