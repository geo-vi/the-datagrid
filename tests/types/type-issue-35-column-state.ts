import type {
  TypeColumn,
  TypeComputedProps,
  TypeDataGridProps,
} from "../../src/main";

const columns: TypeColumn[] = [
  {
    name: "id",
    defaultWidth: 120,
    minWidth: 80,
    maxWidth: 220,
    defaultVisible: true,
    hideable: false,
  },
  {
    name: "name",
    defaultFlex: 1,
    keepFlex: true,
    defaultHidden: false,
  },
];

const props: TypeDataGridProps = {
  idProperty: "id",
  columns,
  dataSource: [{ id: 1, name: "Ada" }],
  defaultColumnOrder: ["name", "id"],
  columnDefaultWidth: 150,
  columnMinWidth: 40,
  columnMaxWidth: 400,
  columnResizeHandleWidth: 24,
  columnResizeProxyWidth: 5,
  shareSpaceOnResize: true,
  onColumnVisibleChange: ({ column, visible }) => {
    void column;
    void visible;
  },
  onBatchColumnResize: (entries, context) => {
    entries.forEach(({ column, width, flex }) => {
      void column;
      void width;
      void flex;
    });
    context.reservedViewportWidth.toFixed();
  },
};

declare const api: TypeComputedProps;

api.setColumnSizes?.({ id: 160, name: 240 });
api.setColumnSizes?.((current) => ({ ...current, id: 180 }));
api.setColumnFlexes?.({ name: 2 });
api.setColumnFlexes?.((current) => ({ ...current, name: null }));
api.setColumnsSizesAuto?.({
  columnIds: ["name"],
  skipHeader: true,
  skipSortTool: true,
});
api.setColumnSizeAuto?.("name", false);
api.setColumnSizesToFit?.();
api.onBatchColumnResize?.([{ column: columns[0]!, width: 180 }], {
  reservedViewportWidth: 0,
});

void props;
