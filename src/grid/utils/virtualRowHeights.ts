import type { Virtualizer } from "@tanstack/react-virtual";

type RowSizeVirtualizer = Pick<
  Virtualizer<Element, Element>,
  | "measure"
  | "measurementsCache"
  | "resizeItem"
  | "scrollOffset"
  | "scrollToOffset"
>;

/**
 * Each `resizeItem` call notifies React, and each scroll correction it makes
 * from a layout effect calls `flushSync`. Above this many changed rows, one
 * full relayout with one notification is cheaper.
 */
export const BULK_ROW_RESIZE_THRESHOLD = 32;

/**
 * Push changed row heights into the row virtualizer. Returns true when the
 * size cache was cleared, so the caller must remeasure the mounted rows.
 */
export function applyVirtualRowHeights(
  virtualizer: RowSizeVirtualizer,
  changedIndexes: readonly number[],
  heights: readonly number[]
): boolean {
  if (changedIndexes.length <= BULK_ROW_RESIZE_THRESHOLD) {
    for (const index of changedIndexes) {
      virtualizer.resizeItem(index, heights[index]);
    }
    return false;
  }

  // Keep the rows in view where they are, as `resizeItem` does, by shifting
  // the scroll offset by the size change of every row above it.
  const scrollOffset = virtualizer.scrollOffset ?? 0;
  let anchorDelta = 0;
  for (const item of virtualizer.measurementsCache) {
    if (item.start >= scrollOffset) break;
    anchorDelta += (heights[item.index] ?? item.size) - item.size;
  }

  virtualizer.measure();
  if (anchorDelta !== 0) {
    virtualizer.scrollToOffset(scrollOffset + anchorDelta);
  }
  return true;
}
