import type { TypeColumn } from "../types"

export function getColumnId(col: TypeColumn): string {
  const id = (col.id ?? col.name ?? "").toString()
  if (!id) {
    throw new Error("the-datagrid: column must have `id` or `name`.")
  }
  return id
}

export function getColumnSortName(col: TypeColumn): string {
  return (col.sortName ?? col.name ?? col.id ?? "").toString()
}
