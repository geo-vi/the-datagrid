/** Translate logical record spans into DOM spans around master-detail rows. */
export type DetailSpanEntry = {
  covered: boolean;
  rowSpan: number;
  colSpan: number;
  continuation?: boolean;
};

export type DetailColumnRun = { start: number; colSpan: number };

function availableRuns(occupied: readonly boolean[]): DetailColumnRun[] {
  const runs: DetailColumnRun[] = [];
  occupied.forEach((taken, index) => {
    if (taken) return;
    const last = runs[runs.length - 1];
    if (last && last.start + last.colSpan === index) last.colSpan += 1;
    else runs.push({ start: index, colSpan: 1 });
  });
  return runs;
}

export function createDetailRowSpanPlan(args: {
  logicalPlan: ReadonlyMap<string, DetailSpanEntry>;
  expandedRows: readonly boolean[];
  /** Each rendered table slot's logical column index; null denotes a spacer. */
  renderedColumns: readonly (number | null)[];
}): {
  cells: Map<string, DetailSpanEntry>;
  detailRuns: Map<number, DetailColumnRun[]>;
} {
  const { logicalPlan, expandedRows, renderedColumns } = args;
  const owners = [...logicalPlan].flatMap(([key, entry]) => {
    if (entry.covered || entry.rowSpan <= 1) return [];
    const [row, column] = key.split(",").map(Number);
    return [{ row, column, entry }];
  });
  const occupiedByRow = new Map<number, Set<number>>();
  for (const { row, column, entry } of owners) {
    // A detail row after the final covered record lies outside the span.
    for (let index = row; index < row + entry.rowSpan - 1; index += 1) {
      if (!expandedRows[index]) continue;
      let occupied = occupiedByRow.get(index);
      if (!occupied) occupiedByRow.set(index, (occupied = new Set()));
      for (let offset = 0; offset < entry.colSpan; offset += 1) {
        occupied.add(column + offset);
      }
    }
  }

  const detailRuns = new Map<number, DetailColumnRun[]>();
  const splitBoundaries = new Set<number>();
  expandedRows.forEach((expanded, row) => {
    if (!expanded) return;
    const occupied = occupiedByRow.get(row);
    const runs = availableRuns(
      renderedColumns.map(
        (column) => column !== null && Boolean(occupied?.has(column))
      )
    );
    if (runs.length === 0 && renderedColumns.length > 0) {
      // With no expander column, every column can be occupied. End the spans
      // before this panel and resume blank continuation cells on the next
      // record, so the details remain visible without creating phantom columns.
      splitBoundaries.add(row);
      detailRuns.set(row, [{ start: 0, colSpan: renderedColumns.length }]);
    } else {
      detailRuns.set(row, runs);
    }
  });

  const cells = new Map(logicalPlan);
  for (const { row, column, entry } of owners) {
    const end = row + entry.rowSpan - 1;
    let start = row;
    let nativeSpan = 1;
    for (let index = row; index < end; index += 1) {
      if (splitBoundaries.has(index)) {
        cells.set(`${start},${column}`, {
          ...entry,
          rowSpan: nativeSpan,
          ...(start !== row ? { continuation: true } : {}),
        });
        start = index + 1;
        nativeSpan = 1;
      } else {
        nativeSpan += 1 + Number(Boolean(expandedRows[index]));
      }
    }
    cells.set(`${start},${column}`, {
      ...entry,
      rowSpan: nativeSpan,
      ...(start !== row ? { continuation: true } : {}),
    });
  }
  return { cells, detailRuns };
}
