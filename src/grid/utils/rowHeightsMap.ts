import { clamp } from "../../utils/helpers";

export function normalizeRowHeightsMap(
  rowHeights: Record<string, number> | undefined,
  minRowHeight: number,
  maxRowHeight?: number
): Record<string, number> {
  if (!rowHeights) return {};

  const normalized: Record<string, number> = {};
  for (const [rowId, configuredHeight] of Object.entries(rowHeights)) {
    if (
      typeof configuredHeight !== "number" ||
      !Number.isFinite(configuredHeight) ||
      configuredHeight <= 0
    ) {
      continue;
    }
    normalized[String(rowId)] = clamp(
      configuredHeight,
      minRowHeight,
      maxRowHeight ?? Number.MAX_SAFE_INTEGER
    );
  }
  return normalized;
}

export function equalRowHeights(
  first: Record<string, number>,
  second: Record<string, number>
): boolean {
  const firstKeys = Object.keys(first);
  const secondKeys = Object.keys(second);
  return (
    firstKeys.length === secondKeys.length &&
    firstKeys.every((key) => first[key] === second[key])
  );
}
