import type { TypeColumn } from "../../types";
import { getColumnId } from "../../utils/column";

export type TypeResolvedColumnLock = "start" | "end" | false;

export type TypeLockedColumnLayout = {
  side: Exclude<TypeResolvedColumnLock, false>;
  offset: number;
  viewportOffset: number;
  boundary: boolean;
};

export type TypeGridColumnRenderItem =
  | {
      type: "column";
      id: string;
      index: number;
    }
  | {
      type: "spacer";
      id: string;
      width: number;
    };

type TypeColumnLayoutItem = {
  id: string;
  width: number;
};

export function resolveColumnLock(
  column: Pick<TypeColumn, "locked">
): TypeResolvedColumnLock {
  if (column.locked === true || column.locked === "start") return "start";
  if (column.locked === "end") return "end";
  return false;
}

/**
 * Inovua renders locked-start, unlocked, and locked-end sections in that
 * order while preserving the consumer's relative order inside each section.
 */
export function groupColumnsByLock(
  columns: readonly TypeColumn[]
): TypeColumn[] {
  const lockedStart: TypeColumn[] = [];
  const unlocked: TypeColumn[] = [];
  const lockedEnd: TypeColumn[] = [];

  for (const column of columns) {
    const locked = resolveColumnLock(column);
    if (locked === "start") lockedStart.push(column);
    else if (locked === "end") lockedEnd.push(column);
    else unlocked.push(column);
  }

  return [...lockedStart, ...unlocked, ...lockedEnd];
}

export function buildLockedColumnLayout(
  columns: readonly TypeColumn[],
  columnWidths: Readonly<Record<string, number>>,
  lockedEndViewportOffset = 0
): Record<string, TypeLockedColumnLayout> {
  const result: Record<string, TypeLockedColumnLayout> = {};
  const lockedStart = columns.filter(
    (column) => resolveColumnLock(column) === "start"
  );
  const lockedEnd = columns.filter(
    (column) => resolveColumnLock(column) === "end"
  );

  let startOffset = 0;
  lockedStart.forEach((column, index) => {
    const columnId = getColumnId(column);
    result[columnId] = {
      side: "start",
      offset: startOffset,
      viewportOffset: 0,
      boundary: index === lockedStart.length - 1,
    };
    startOffset += columnWidths[columnId] ?? 0;
  });

  let endOffset = 0;
  for (let index = lockedEnd.length - 1; index >= 0; index -= 1) {
    const column = lockedEnd[index]!;
    const columnId = getColumnId(column);
    result[columnId] = {
      side: "end",
      offset: endOffset,
      viewportOffset: lockedEndViewportOffset,
      boundary: index === 0,
    };
    endOffset += columnWidths[columnId] ?? 0;
  }

  return result;
}

function sumWidths(
  columns: readonly TypeColumnLayoutItem[],
  from: number,
  to: number
): number {
  let result = 0;
  for (let index = from; index < to; index += 1) {
    result += columns[index]?.width ?? 0;
  }
  return result;
}

export function buildGridColumnRenderItems(args: {
  columnLayout: readonly TypeColumnLayoutItem[];
  columns: readonly TypeColumn[];
  virtualColumnIndexes: readonly number[];
  virtualizeColumns: boolean;
  trailingViewportWidth?: number;
}): {
  items: TypeGridColumnRenderItem[];
  firstIndex: number;
  lastIndex: number;
  beforeWidth: number;
  afterWidth: number;
  columnRenderCount: number;
} {
  const {
    columnLayout,
    columns,
    virtualColumnIndexes,
    virtualizeColumns,
    trailingViewportWidth = 0,
  } = args;
  const totalColumnCount = columnLayout.length;

  if (
    !virtualizeColumns ||
    totalColumnCount === 0 ||
    virtualColumnIndexes.length === 0
  ) {
    return {
      items: columnLayout.map((column, index) => ({
        type: "column",
        id: column.id,
        index,
      })),
      firstIndex: 0,
      lastIndex: totalColumnCount - 1,
      beforeWidth: 0,
      afterWidth: 0,
      columnRenderCount: totalColumnCount,
    };
  }

  let lockedStartCount = 0;
  while (
    lockedStartCount < columns.length &&
    resolveColumnLock(columns[lockedStartCount]!) === "start"
  ) {
    lockedStartCount += 1;
  }

  let lockedEndStartIndex = columns.length;
  while (
    lockedEndStartIndex > lockedStartCount &&
    resolveColumnLock(columns[lockedEndStartIndex - 1]!) === "end"
  ) {
    lockedEndStartIndex -= 1;
  }

  const unlockedCount = lockedEndStartIndex - lockedStartCount;
  const unlockedVirtualIndexes = virtualColumnIndexes.filter(
    (index) => index >= lockedStartCount && index < lockedEndStartIndex
  );

  // A very wide locked section can consume the virtualizer's initial range.
  // Keep the nearest unlocked boundary mounted so horizontal navigation can
  // advance into that section without waiting for an empty intermediate pass.
  if (unlockedCount > 0 && unlockedVirtualIndexes.length === 0) {
    const lastVirtualIndex =
      virtualColumnIndexes[virtualColumnIndexes.length - 1] ?? -1;
    unlockedVirtualIndexes.push(
      lastVirtualIndex < lockedStartCount
        ? lockedStartCount
        : lockedEndStartIndex - 1
    );
  }

  const virtualFirstIndex =
    unlockedVirtualIndexes[0] ?? Math.min(lockedStartCount, totalColumnCount);
  const virtualLastIndex =
    unlockedVirtualIndexes[unlockedVirtualIndexes.length - 1] ??
    virtualFirstIndex - 1;

  // A resize can change the maximum scroll offset before TanStack Virtual
  // publishes its refreshed range. At the trailing edge, preserve enough real
  // unlocked columns to cover the viewport in front of the locked-end
  // section. Any stale virtual gap remains offscreen instead of becoming a
  // painted empty spacer beside the locked column.
  const normalizedTrailingViewportWidth =
    Number.isFinite(trailingViewportWidth) && trailingViewportWidth > 0
      ? trailingViewportWidth
      : 0;
  let firstIndex = virtualFirstIndex;
  let lastIndex = virtualLastIndex;
  let trailingCoverageWidth = 0;
  if (normalizedTrailingViewportWidth > 0) {
    lastIndex = lockedEndStartIndex - 1;
    firstIndex = lastIndex + 1;

    for (
      let index = lastIndex;
      index >= lockedStartCount &&
      trailingCoverageWidth < normalizedTrailingViewportWidth;
      index -= 1
    ) {
      firstIndex = index;
      trailingCoverageWidth += columnLayout[index]?.width ?? 0;
    }
  }

  const beforeWidth =
    unlockedCount > 0
      ? sumWidths(columnLayout, lockedStartCount, firstIndex)
      : 0;
  const afterWidth =
    unlockedCount > 0
      ? sumWidths(columnLayout, lastIndex + 1, lockedEndStartIndex)
      : 0;
  const items: TypeGridColumnRenderItem[] = [];

  for (let index = 0; index < lockedStartCount; index += 1) {
    const column = columnLayout[index];
    if (column) {
      items.push({ type: "column", id: column.id, index });
    }
  }

  if (beforeWidth > 0) {
    items.push({
      type: "spacer",
      id: "__tdg_virtual_columns_before__",
      width: beforeWidth,
    });
  }

  for (let index = firstIndex; index <= lastIndex; index += 1) {
    if (index < lockedStartCount || index >= lockedEndStartIndex) continue;
    const column = columnLayout[index];
    if (column) {
      items.push({ type: "column", id: column.id, index });
    }
  }

  if (afterWidth > 0) {
    items.push({
      type: "spacer",
      id: "__tdg_virtual_columns_after__",
      width: afterWidth,
    });
  }

  for (let index = lockedEndStartIndex; index < totalColumnCount; index += 1) {
    const column = columnLayout[index];
    if (column) {
      items.push({ type: "column", id: column.id, index });
    }
  }

  return {
    items,
    firstIndex,
    lastIndex,
    beforeWidth,
    afterWidth,
    columnRenderCount: items.filter((item) => item.type === "column").length,
  };
}

/**
 * Which rendered items sit at the row's edges, and which column (if any) sits
 * at the table's trailing/leading edge.
 *
 * The active-row indicator and the trailing resize-handle clamp both used to
 * key off `:first-child` / `:last-child`. That reads the DOM position rather
 * than the intent, so any non-column cell at either end silently took the
 * edge treatment. Resolving it here keeps both concerns keyed on what the
 * item actually is.
 *
 * A virtualization spacer stands in for real columns it replaced, so it *is*
 * row content and covers exactly their width — the row's edge is legitimately
 * its edge. Slack fillers are not row content and are excluded, which is what
 * keeps the indicator from closing across empty space.
 */
export function resolveColumnRenderEdges(
  items: readonly TypeGridColumnRenderItem[]
): {
  rowStartItemIndex: number;
  rowEndItemIndex: number;
  leadingEdgeColumnId: string | null;
  trailingEdgeColumnId: string | null;
} {
  let rowStartItemIndex = -1;
  let rowEndItemIndex = -1;

  for (let index = 0; index < items.length; index += 1) {
    if (!isRowContentItem(items[index]!)) continue;
    if (rowStartItemIndex === -1) rowStartItemIndex = index;
    rowEndItemIndex = index;
  }

  const firstItem = items[0];
  const lastItem = items[items.length - 1];

  return {
    rowStartItemIndex,
    rowEndItemIndex,
    leadingEdgeColumnId:
      firstItem?.type === "column" ? firstItem.id : null,
    trailingEdgeColumnId: lastItem?.type === "column" ? lastItem.id : null,
  };
}

function isRowContentItem(item: TypeGridColumnRenderItem): boolean {
  return item.type === "column" || item.type === "spacer";
}
