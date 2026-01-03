import * as React from "react"
import type { TypeDataSource, TypeDataGridProps } from "../types"

export function t(
  i18n: TypeDataGridProps["i18n"],
  key: string,
  fallback: string
): React.ReactNode {
  const v = i18n?.[key]
  return v ?? fallback
}

export function coerceUserSelect(
  v: TypeDataGridProps["columnUserSelect"]
): "none" | "text" {
  if (v === false || v === "none") return "none"
  return "text"
}

export function isRemoteDataSource(ds: TypeDataSource): boolean {
  return typeof ds === "function" || (ds as any)?.then instanceof Function
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

export function estimateAutoWidth(args: {
  header?: string
  values: any[]
}): number {
  const { header, values } = args
  const lens: number[] = []
  if (header) lens.push(header.length)
  for (const v of values) lens.push(String(v ?? "").length)
  const maxLen = lens.length ? Math.max(...lens) : 0

  // heuristic: ~8px per char + padding
  return clamp(maxLen * 8 + 32, 90, 520)
}
