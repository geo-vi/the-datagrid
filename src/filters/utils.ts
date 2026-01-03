import type { TypeFilterValue, TypeSingleFilterValue } from "../types"

export function normalizeFilterValue(
  v: TypeFilterValue | undefined
): TypeFilterValue {
  if (!v || !Array.isArray(v) || v.length === 0) return null
  return v
}

export function getFilterEntry(
  filterValue: TypeFilterValue,
  name: string
): TypeSingleFilterValue | undefined {
  if (!filterValue) return undefined
  return filterValue.find((f) => f.name === name)
}

export function upsertFilterEntry(
  filterValue: TypeFilterValue,
  entry: TypeSingleFilterValue | null
): TypeFilterValue {
  const current = filterValue ?? []
  if (!entry) return current.length ? current : null

  const without = current.filter((f) => f.name !== entry.name)

  const isEmpty =
    entry.value === undefined ||
    entry.value === null ||
    (typeof entry.value === "string" && entry.value.trim() === "")

  if (isEmpty) return without.length ? without : null

  return [...without, { ...entry, active: entry.active ?? true }]
}

export function setFilterOperator(
  filterValue: TypeFilterValue,
  name: string,
  operator: string
): TypeFilterValue {
  const existing = getFilterEntry(filterValue, name)
  if (!existing) return filterValue
  return upsertFilterEntry(filterValue, { ...existing, operator })
}

export function clearFilter(
  filterValue: TypeFilterValue,
  name: string
): TypeFilterValue {
  const current = filterValue ?? []
  const next = current.filter((f) => f.name !== name)
  return next.length ? next : null
}

// Basic local filter (only for array dataSource).
export function applyLocalFilter(
  data: any[],
  filterValue: TypeFilterValue
): any[] {
  if (!filterValue || filterValue.length === 0) return data

  return data.filter((row) => {
    return filterValue.every((f) => {
      if (f.active === false) return true

      const raw = (row as any)?.[f.name]
      const value = raw == null ? "" : String(raw)
      const fv = f.value == null ? "" : String(f.value)

      const v = value.toLowerCase()
      const q = fv.toLowerCase()

      switch (f.operator) {
        case "contains":
          return v.includes(q)
        case "startsWith":
          return v.startsWith(q)
        case "endsWith":
          return v.endsWith(q)
        case "eq":
          return v === q
        case "neq":
          return v !== q
        case "empty":
          return v.trim() === ""
        case "notEmpty":
          return v.trim() !== ""
        default:
          // Unknown operator: default to contains for safety.
          return v.includes(q)
      }
    })
  })
}

export const STRING_OPERATORS: { label: string; value: string }[] = [
  { label: "Contains", value: "contains" },
  { label: "Starts with", value: "startsWith" },
  { label: "Ends with", value: "endsWith" },
  { label: "Equals", value: "eq" },
  { label: "Not equals", value: "neq" },
  { label: "Empty", value: "empty" },
  { label: "Not empty", value: "notEmpty" },
]
