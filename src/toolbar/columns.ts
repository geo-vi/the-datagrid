import type { TypeColumn } from "../types";

/**
 * Deliberately not core's `getColumnId`, which throws on a column with no id:
 * right for rendering a grid, wrong for a toolbar that should skip that column.
 */
export function getColumnId(column: TypeColumn): string {
  return String(column.id ?? column.name ?? "");
}

/**
 * Sorts columns into the grid's column order. Columns the order does not
 * mention keep their declared order and follow the ones it does.
 */
export function orderColumns(
  columns: readonly TypeColumn[],
  columnOrder: readonly string[]
): TypeColumn[] {
  const columnsById = new Map<string, TypeColumn>();
  for (const column of columns) {
    const columnId = getColumnId(column);
    if (columnId && !columnsById.has(columnId)) {
      columnsById.set(columnId, column);
    }
  }

  const ordered: TypeColumn[] = [];
  for (const columnId of columnOrder) {
    const column = columnsById.get(columnId);
    if (!column) continue;
    ordered.push(column);
    columnsById.delete(columnId);
  }
  ordered.push(...columnsById.values());
  return ordered;
}
