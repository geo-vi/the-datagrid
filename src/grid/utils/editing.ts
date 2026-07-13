import type { CellProps, TypeColumn } from "../../types";

export type TypeBuildEditCellPropsArgs = {
  value: unknown;
  data: CellProps["data"];
  rowIndex: number;
  remoteRowIndex: number;
  rowId: string | number;
  rowSelected: boolean;
  selection: unknown;
  multiSelect: boolean;
  naturalRowHeight: boolean;
  resolvedRowHeight: number;
  minRowHeight: number;
  column: TypeColumn;
  columnId: string;
  columnIndex: number;
  columnCount: number;
  computedWidth?: number;
  editValue?: unknown;
  inEdit?: boolean;
  editable: boolean;
  editStartEvent: string;
  theme: string;
  totalDataCount: number;
};

/**
 * Builds the cell object exposed to Inovua-style editability and editor hooks.
 * Keep pointer and public-API edit starts on this one path: upstream supplies
 * the same computed cell metadata regardless of how editing begins.
 */
export function buildEditCellProps({
  value,
  data,
  rowIndex,
  remoteRowIndex,
  rowId,
  rowSelected,
  selection,
  multiSelect,
  naturalRowHeight,
  resolvedRowHeight,
  minRowHeight,
  column,
  columnId,
  columnIndex,
  columnCount,
  computedWidth,
  editValue,
  inEdit,
  editable,
  editStartEvent,
  theme,
  totalDataCount,
}: TypeBuildEditCellPropsArgs): CellProps {
  const configuredCellProps =
    column.cellProps && typeof column.cellProps === "object"
      ? column.cellProps
      : {};
  const computedEditable = column.editable ?? editable;

  return {
    ...column,
    value,
    data,
    rowId,
    rowIndex,
    rowRenderIndex: rowIndex,
    remoteRowIndex,
    rowActive: false,
    rowSelected,
    selection,
    multiSelect,
    naturalRowHeight,
    rowHeight: resolvedRowHeight,
    initialRowHeight: resolvedRowHeight,
    minRowHeight,
    totalDataCount,
    column,
    columnId,
    id: columnId,
    name: column.name,
    index: columnIndex,
    initialIndex: columnIndex,
    indexInColumns: columnIndex,
    columnIndex,
    computedAbsoluteIndex: columnIndex,
    computedVisibleIndex: columnIndex,
    computedVisibleCount: columnCount,
    computedVisible: true,
    first: columnIndex === 0,
    last: columnIndex === columnCount - 1,
    computedWidth,
    computedMinWidth: column.minWidth,
    computedMaxWidth: column.maxWidth,
    computedFlex: column.flex ?? column.defaultFlex ?? undefined,
    computedEditable,
    editable: column.editable,
    ...(inEdit === undefined ? {} : { editValue, inEdit }),
    editStartEvent,
    theme,
    rtl: false,
    nativeScroll: true,
    editorProps: column.editorProps,
    virtualizeColumns: false,
    cellProps: {
      ...configuredCellProps,
      column,
      columnId,
      columnIndex,
      rowIndex,
      remoteRowIndex,
    },
  };
}
