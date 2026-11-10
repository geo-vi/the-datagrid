import type { TypeColumn } from "../types";

export function getColumnId(col: TypeColumn): string {
  const id = (col.id ?? col.name ?? "").toString();
  if (!id) {
    throw new Error("the-datagrid: column must have `id` or `name`.");
  }
  return id;
}

export function getColumnSortName(col: TypeColumn): string {
  return (col.sortName ?? col.name ?? col.id ?? "").toString();
}

/** Action-only columns must not make the last meaningful field hideable. */
export function canHideColumn(
  column: TypeColumn,
  columns: readonly TypeColumn[],
  isVisible: (candidate: TypeColumn) => boolean
): boolean {
  if (column.hideable === false) return false;
  if (!isVisible(column)) return true;
  const isContent = (candidate: TypeColumn) =>
    candidate.exportable !== false ||
    candidate.filterable !== false ||
    candidate.sortable !== false;
  const protectedColumns = isContent(column)
    ? columns.filter(isContent)
    : columns;
  return protectedColumns.filter(isVisible).length > 1;
}
