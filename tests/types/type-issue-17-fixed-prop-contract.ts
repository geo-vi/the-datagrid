import type { TypeColumns, TypeDataGridProps, TypeI18n } from "../../src/main";

type Issue17RequestedProp =
  | "minRowHeight"
  | "rowStyle"
  | "onColumnResize"
  | "editable"
  | "editStartEvent"
  | "showZebraRows"
  | "emptyText";

type AssertNever<T extends never> = T;

export type Issue17RequestedPropsRemainOutsideTypeDataGridProps = AssertNever<
  Extract<Issue17RequestedProp, keyof TypeDataGridProps>
>;

const issue17Rows = [
  {
    id: "row-1",
    request: "emptyText",
    supportedPath: "i18n.noRecords",
    impact: 3,
  },
];

export const issue17Columns: TypeColumns = [
  {
    name: "request",
    header: "Requested prop",
    defaultWidth: 180,
    minWidth: 140,
    maxWidth: 260,
    filterable: true,
  },
  {
    name: "supportedPath",
    header: "Supported path",
    defaultWidth: 220,
    minWidth: 180,
    maxWidth: 320,
    render: (value: unknown) => String(value),
  },
  {
    name: "impact",
    header: "Impact",
    defaultWidth: 120,
    textAlign: "end",
    headerAlign: "end",
    style: { fontVariantNumeric: "tabular-nums" },
  },
  {
    name: "internalNote",
    header: "Internal note",
    visible: false,
  },
];

export const issue17I18n: TypeI18n = {
  noRecords: "No issue #17 rows match the current view",
};

export const issue17FixedContractProps = {
  theme: "default",
  idProperty: "id",
  columns: issue17Columns,
  dataSource: issue17Rows,
  columnOrder: ["request", "supportedPath", "impact", "internalNote"],
  enableColumnFilterContextMenu: true,
  enableColumnAutosize: true,
  skipHeaderOnAutoSize: false,
  enableFiltering: true,
  defaultFilterValue: null,
  filteredRowsCount: (_count: number) => {},
  onColumnOrderChange: (_columnOrder: string[]) => {},
  virtualized: true,
  columnUserSelect: "text",
  i18n: issue17I18n,
  showColumnMenuTool: false,
} satisfies TypeDataGridProps;

function acceptGridProps(props: TypeDataGridProps): TypeDataGridProps {
  return props;
}

export const issue17MinRowHeightReproduction = acceptGridProps({
  ...issue17FixedContractProps,
  // @ts-expect-error issue #17: minRowHeight is not in the fixed public prop contract.
  minRowHeight: 28,
});

export const issue17RowStyleReproduction = acceptGridProps({
  ...issue17FixedContractProps,
  // @ts-expect-error issue #17: rowStyle is not in the fixed public prop contract.
  rowStyle: { minHeight: 28 },
});

export const issue17OnColumnResizeReproduction = acceptGridProps({
  ...issue17FixedContractProps,
  // @ts-expect-error issue #17: onColumnResize is not in the fixed public prop contract.
  onColumnResize: (_columnId: string, _width: number) => {},
});

export const issue17EditableReproduction = acceptGridProps({
  ...issue17FixedContractProps,
  // @ts-expect-error issue #17: editable is not in the fixed public prop contract.
  editable: true,
});

export const issue17EditStartEventReproduction = acceptGridProps({
  ...issue17FixedContractProps,
  // @ts-expect-error issue #17: editStartEvent is not in the fixed public prop contract.
  editStartEvent: "click",
});

export const issue17ShowZebraRowsReproduction = acceptGridProps({
  ...issue17FixedContractProps,
  // @ts-expect-error issue #17: showZebraRows is not in the fixed public prop contract.
  showZebraRows: true,
});

export const issue17EmptyTextReproduction = acceptGridProps({
  ...issue17FixedContractProps,
  // @ts-expect-error issue #17: use i18n.noRecords instead of an emptyText root prop.
  emptyText: "No issue #17 rows match the current view",
});
