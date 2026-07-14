type TypeConfiguredRowHeight = number | ((rowIndex: number) => number) | null;

type ResolveConfiguredRowHeightArgs = {
  rowHeight: TypeConfiguredRowHeight;
  rowIndex: number;
  minRowHeight: number;
  maxRowHeight?: number;
};

/**
 * Resolve the layout height for a row without applying natural DOM
 * measurement. Inovua treats a valid fixed rowHeight as the authoritative
 * layout size; min/max bounds are for natural and function-valued heights.
 */
export function resolveConfiguredRowHeight({
  rowHeight,
  rowIndex,
  minRowHeight,
  maxRowHeight,
}: ResolveConfiguredRowHeightArgs): number {
  if (typeof rowHeight === "number") {
    return Number.isFinite(rowHeight) && rowHeight > 0
      ? rowHeight
      : minRowHeight;
  }

  if (rowHeight == null) return minRowHeight;

  const requestedHeight = rowHeight(rowIndex);
  const finiteHeight =
    typeof requestedHeight === "number" &&
    Number.isFinite(requestedHeight) &&
    requestedHeight > 0
      ? requestedHeight
      : minRowHeight;
  const upperBound =
    typeof maxRowHeight === "number" &&
    Number.isFinite(maxRowHeight) &&
    maxRowHeight >= minRowHeight
      ? maxRowHeight
      : Number.POSITIVE_INFINITY;

  return Math.min(Math.max(finiteHeight, minRowHeight), upperBound);
}
