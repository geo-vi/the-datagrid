import assert from "node:assert/strict";
import test from "node:test";

import type { TypeColumn } from "../../src/types";
import {
  GRID_SLACK_FILLER_ID,
  buildGridColumnRenderItems,
  resolveColumnRenderEdges,
} from "../../src/grid/utils/lockedColumns";

// Fixed mode leaves the table narrower than the viewport once a column is
// shrunk. A real cell has to absorb that slack: leaving it as a hole is what
// puts an empty phantom column beside a locked-end column and splits the
// active-row indicator in two.

const unlocked = (name: string): TypeColumn => ({ name });
const lockedEnd = (name: string): TypeColumn => ({ name, locked: "end" });
const lockedStart = (name: string): TypeColumn => ({ name, locked: "start" });

function layoutOf(columns: readonly TypeColumn[], width = 100) {
  return columns.map((column) => ({ id: String(column.name), width }));
}

function build(columns: readonly TypeColumn[], fillerWidth: number | null) {
  return buildGridColumnRenderItems({
    columnLayout: layoutOf(columns),
    columns,
    virtualColumnIndexes: [],
    virtualizeColumns: false,
    fillerWidth,
  });
}

test("stretch mode emits no filler at all", () => {
  const { items } = build([unlocked("a"), unlocked("b")], null);

  assert.deepEqual(
    items.map((item) => item.type),
    ["column", "column"]
  );
});

// The filler stays mounted at zero width so the live-resize preview always has
// something to move width into. It can only move width between elements already
// in the DOM, so a filler that appeared only once slack existed would leave the
// first drag with nothing to grow — and the locked-end section would drift left
// with the shrinking table until the drag was released.
test("a filler is still mounted, at zero width, when the columns cover the viewport", () => {
  const { items } = build([unlocked("a"), unlocked("b")], 0);

  assert.deepEqual(
    items.map((item) => item.type),
    ["column", "column", "filler"]
  );
  const filler = items.at(-1)!;
  assert.equal(filler.type === "filler" && filler.width, 0);
});

test("a zero-width filler does not displace the table's trailing edge", () => {
  const columns = [unlocked("a"), unlocked("b")];
  const edges = resolveColumnRenderEdges(build(columns, 0).items);

  // Occupies nothing, so "b" is still the column against the table edge: it
  // keeps its `--last` treatment and the trailing resize clamp still applies.
  assert.equal(edges.trailingEdgeColumnId, "b");

  // Once it carries slack, it does displace the edge.
  const withSlack = resolveColumnRenderEdges(build(columns, 40).items);
  assert.equal(withSlack.trailingEdgeColumnId, null);
});

test("slack after the final column is absorbed by a trailing filler", () => {
  const { items } = build([unlocked("a"), unlocked("b")], 40);

  assert.deepEqual(
    items.map((item) => (item.type === "column" ? item.id : item.type)),
    ["a", "b", "filler"]
  );

  const filler = items.at(-1)!;
  assert.equal(filler.type, "filler");
  if (filler.type !== "filler") return;
  assert.equal(filler.id, GRID_SLACK_FILLER_ID);
  assert.equal(filler.width, 40);
  // Not row content: the row's data ends at the last column.
  assert.equal(filler.variant, "trailing");
});

test("slack is absorbed interior to a locked-end section, not after it", () => {
  const columns = [unlocked("a"), unlocked("b"), lockedEnd("actions")];
  const { items } = build(columns, 40);

  assert.deepEqual(
    items.map((item) => (item.type === "column" ? item.id : item.type)),
    ["a", "b", "filler", "actions"]
  );

  const filler = items[2]!;
  assert.equal(filler.type, "filler");
  if (filler.type !== "filler") return;
  // Row content, so the indicator has to cross it rather than stop at it.
  assert.equal(filler.variant, "interior");
});

test("the locked-end section keeps the row's trailing edge, and the filler never takes it", () => {
  const columns = [lockedStart("sel"), unlocked("a"), lockedEnd("actions")];
  const { items } = build(columns, 40);
  const edges = resolveColumnRenderEdges(items);

  assert.equal(items[edges.rowStartItemIndex]?.type, "column");
  assert.equal(
    items[edges.rowEndItemIndex]?.type === "column" &&
      items[edges.rowEndItemIndex]!.id,
    "actions"
  );
  assert.equal(edges.trailingEdgeColumnId, "actions");
  assert.equal(edges.leadingEdgeColumnId, "sel");
});

test("a trailing filler takes neither the row's end nor the table's trailing edge", () => {
  const columns = [unlocked("a"), unlocked("b")];
  const { items } = build(columns, 40);
  const edges = resolveColumnRenderEdges(items);

  // The row's data ends at "b" even though the filler is the last cell.
  assert.equal(
    items[edges.rowEndItemIndex]?.type === "column" &&
      items[edges.rowEndItemIndex]!.id,
    "b"
  );
  // And "b" is no longer against the table edge, so the trailing resize clamp
  // must not apply to it — its handle can straddle into the filler instead.
  assert.equal(edges.trailingEdgeColumnId, null);
});

test("the filler is placed while virtualizing too, where only some columns are mounted", () => {
  const columns = [
    unlocked("a"),
    unlocked("b"),
    unlocked("c"),
    lockedEnd("actions"),
  ];
  const { items } = buildGridColumnRenderItems({
    columnLayout: layoutOf(columns),
    columns,
    virtualColumnIndexes: [1, 2],
    virtualizeColumns: true,
    fillerWidth: 40,
  });

  const shape = items.map((item) =>
    item.type === "column" ? item.id : item.type
  );

  assert.equal(shape.at(-1), "actions");
  assert.equal(shape.at(-2), "filler");
  // The unmounted leading column is still represented by a spacer.
  assert.ok(shape.includes("spacer"));
});

test("a non-finite or negative slack width is ignored rather than rendered", () => {
  for (const width of [Number.NaN, Number.POSITIVE_INFINITY, -10]) {
    const { items } = build([unlocked("a")], width);
    assert.deepEqual(
      items.map((item) => item.type),
      ["column"],
      `width ${String(width)} should not produce a filler`
    );
  }
});
