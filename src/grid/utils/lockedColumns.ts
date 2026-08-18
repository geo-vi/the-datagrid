import type { TypeColumn } from "../../types";
import { getColumnId } from "../../utils/column";

export type TypeResolvedColumnLock = "start" | "end" | false;

export type TypeLockedColumnLayout = {
  side: Exclude<TypeResolvedColumnLock, false>;
  offset: number;
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
    }
  | {
      type: "filler";
      id: string;
      width: number;
      variant: TypeGridFillerVariant;
    };

/**
 * `interior` sits before a locked-end section and is row content; `trailing`
 * sits after the final column and is not. They are styled as opposites.
 */
export type TypeGridFillerVariant = "interior" | "trailing";

export const GRID_SLACK_FILLER_ID = "__tdg_grid_slack_filler__";

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
  columnWidths: Readonly<Record<string, number>>
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
  /**
   * Leftover viewport width the columns do not cover. `0` still emits the cell,
   * at zero width; `null` omits it (stretch mode, where the columns absorb the
   * surplus themselves).
   *
   * Zero width rather than omitting matters: the live-resize preview can only
   * move width between elements already mounted, so a filler that appeared only
   * once slack existed would leave the first drag nothing to grow.
   */
  fillerWidth?: number | null;
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
    fillerWidth = null,
  } = args;
  const totalColumnCount = columnLayout.length;

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

  if (
    !virtualizeColumns ||
    totalColumnCount === 0 ||
    virtualColumnIndexes.length === 0
  ) {
    const columnItems: TypeGridColumnRenderItem[] = columnLayout.map(
      (column, index) => ({
        type: "column",
        id: column.id,
        index,
      })
    );

    return {
      items: withSlackFiller(
        columnItems,
        lockedEndStartIndex,
        columns.length,
        fillerWidth
      ),
      firstIndex: 0,
      lastIndex: totalColumnCount - 1,
      beforeWidth: 0,
      afterWidth: 0,
      columnRenderCount: totalColumnCount,
    };
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

  const itemsWithFiller = withSlackFiller(
    items,
    lockedEndStartIndex,
    columns.length,
    fillerWidth
  );

  return {
    items: itemsWithFiller,
    firstIndex,
    lastIndex,
    beforeWidth,
    afterWidth,
    columnRenderCount: itemsWithFiller.filter((item) => item.type === "column")
      .length,
  };
}

/**
 * Before a locked-end section if there is one, so those columns stay the row's
 * last cells and keep sitting at the viewport edge; otherwise at the very end.
 */
function withSlackFiller(
  items: TypeGridColumnRenderItem[],
  lockedEndStartIndex: number,
  columnCount: number,
  fillerWidth: number | null
): TypeGridColumnRenderItem[] {
  if (fillerWidth == null || !Number.isFinite(fillerWidth) || fillerWidth < 0) {
    return items;
  }

  const hasLockedEnd = lockedEndStartIndex < columnCount;
  const filler: TypeGridColumnRenderItem = {
    type: "filler",
    id: GRID_SLACK_FILLER_ID,
    width: fillerWidth,
    variant: hasLockedEnd ? "interior" : "trailing",
  };

  if (!hasLockedEnd) return [...items, filler];

  const lockedEndAt = items.findIndex(
    (item) => item.type === "column" && item.index >= lockedEndStartIndex
  );

  return lockedEndAt === -1
    ? [...items, filler]
    : [...items.slice(0, lockedEndAt), filler, ...items.slice(lockedEndAt)];
}

/**
 * Row edges for the active-row indicator, and the column at each table edge for
 * the resize-handle clamp. Both used to key off `:first-child`/`:last-child`,
 * which reads DOM position rather than intent.
 *
 * Virtualization spacers count as row content — they cover exactly the width of
 * the columns they replaced, so the row's edge really is theirs. Slack fillers
 * do not, which is what stops the indicator closing across empty space.
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

  // A filler carrying no slack occupies no space, so it does not displace the
  // table's edges even though it is mounted.
  const spanning = items.filter(
    (item) => !(item.type === "filler" && item.width <= 0)
  );
  const firstItem = spanning[0];
  const lastItem = spanning[spanning.length - 1];

  return {
    rowStartItemIndex,
    rowEndItemIndex,
    leadingEdgeColumnId: firstItem?.type === "column" ? firstItem.id : null,
    trailingEdgeColumnId: lastItem?.type === "column" ? lastItem.id : null,
  };
}

function isRowContentItem(item: TypeGridColumnRenderItem): boolean {
  return item.type === "column" || item.type === "spacer";
}
