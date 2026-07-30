import type {
  TypeComputedProps,
  TypeDataGridProps,
  TypeRowHeights,
} from "../../src/main";

const defaultRowHeights = {
  "row-2": 72,
} satisfies TypeRowHeights;

const props = {
  idProperty: "id",
  columns: [{ name: "id" }],
  dataSource: [{ id: "row-1" }, { id: "row-2" }],
  rowHeight: 40,
  defaultRowHeights,
  onRowHeightsChange: (rowHeights) => {
    rowHeights["row-1"] = 48;
  },
  onUpdateRowHeights: (indexedHeights, computedProps) => {
    void indexedHeights[0];
    computedProps.setRowHeightById(64, "row-1");
  },
  onReady: (ref) => {
    const api: TypeComputedProps | null = ref.current;
    api?.setRowHeights?.({ "row-1": 48 });
    api?.setRowHeightById(52, "row-1");
    api?.setRowHeightById(null, "row-1");
    void api?.getRowHeightById("row-1");
    void api?.getRowHeight?.(0);
  },
} satisfies TypeDataGridProps;

void props;
