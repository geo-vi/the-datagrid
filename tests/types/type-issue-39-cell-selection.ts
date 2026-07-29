import type {
  TypeActiveCell,
  TypeCellSelection,
  TypeComputedProps,
  TypeDataGridProps,
} from "../../src/main";

const activeCell: TypeActiveCell = [0, 1];
const cellSelection: TypeCellSelection = {
  "row-1,name": true,
};

const props = {
  idProperty: "id",
  columns: [{ name: "id" }, { name: "name", cellSelectable: true }],
  dataSource: [{ id: "row-1", name: "Ada" }],
  activeCell,
  defaultActiveCell: [0, 0],
  onActiveCellChange: (next) => {
    const value: TypeActiveCell = next;
    void value;
  },
  activeCellThrottle: 16,
  cellSelection,
  defaultCellSelection: null,
  onCellSelectionChange: (next) => {
    const value: TypeCellSelection = next;
    void value;
  },
  cellSelectionByIndex: false,
  toggleCellSelectOnClick: true,
} satisfies TypeDataGridProps;

declare const api: TypeComputedProps;
const computedActiveCell: TypeActiveCell | undefined = api.computedActiveCell;
const computedSelection: TypeCellSelection | undefined =
  api.computedCellSelection;
api.setActiveCell?.([0, 1]);
api.setCellSelection?.({ "row-1,name": true });

void props;
void computedActiveCell;
void computedSelection;
