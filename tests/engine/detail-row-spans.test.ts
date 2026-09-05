import assert from "node:assert/strict";
import test from "node:test";
import {
  createDetailRowSpanPlan,
  type DetailSpanEntry,
} from "../../src/grid/hierarchy/detailRowSpans";

const owner = (rowSpan: number, colSpan = 1): DetailSpanEntry => ({
  covered: false,
  rowSpan,
  colSpan,
});
const covered: DetailSpanEntry = { covered: true, rowSpan: 1, colSpan: 1 };

test("extends native spans through intervening details, leaving free panel columns", () => {
  const logicalPlan = new Map([
    ["0,1", owner(3)],
    ["1,1", covered],
    ["2,1", covered],
  ]);
  const plan = createDetailRowSpanPlan({
    logicalPlan,
    expandedRows: [true, true, true],
    renderedColumns: [0, 1, 2, 3],
  });
  assert.equal(plan.cells.get("0,1")?.rowSpan, 5);
  assert.deepEqual(plan.detailRuns.get(0), [
    { start: 0, colSpan: 1 },
    { start: 2, colSpan: 2 },
  ]);
  assert.deepEqual(plan.detailRuns.get(2), [{ start: 0, colSpan: 4 }]);
  assert.equal(logicalPlan.get("0,1")?.rowSpan, 3);
});

test("combined row and column spans occupy every covered column in detail rows", () => {
  const plan = createDetailRowSpanPlan({
    logicalPlan: new Map([["0,1", owner(2, 2)]]),
    expandedRows: [true, false],
    renderedColumns: [0, 1, 2, 3],
  });
  assert.deepEqual(plan.detailRuns.get(0), [
    { start: 0, colSpan: 1 },
    { start: 3, colSpan: 1 },
  ]);
  assert.equal(plan.cells.get("0,1")?.rowSpan, 3);
});

test("fully occupied detail boundaries split spans into blank continuation cells", () => {
  const plan = createDetailRowSpanPlan({
    logicalPlan: new Map([
      ["0,0", owner(3, 2)],
      ["1,0", covered],
      ["2,0", covered],
    ]),
    expandedRows: [true, false, false],
    renderedColumns: [0, 1],
  });
  assert.deepEqual(plan.detailRuns.get(0), [{ start: 0, colSpan: 2 }]);
  assert.deepEqual(plan.cells.get("0,0"), owner(1, 2));
  assert.deepEqual(plan.cells.get("1,0"), {
    ...owner(2, 2),
    continuation: true,
  });
});

test("collapsed details leave logical span values intact and spacer slots remain available", () => {
  const logicalPlan = new Map([["0,0", owner(2)]]);
  const collapsedPlan = createDetailRowSpanPlan({
    logicalPlan,
    expandedRows: [false, false],
    renderedColumns: [0, 1],
  });
  assert.deepEqual(collapsedPlan.cells, logicalPlan);
  assert.equal(collapsedPlan.detailRuns.size, 0);
  const virtualColumns = createDetailRowSpanPlan({
    logicalPlan,
    expandedRows: [true, false],
    renderedColumns: [0, null],
  });
  assert.deepEqual(virtualColumns.detailRuns.get(0), [
    { start: 1, colSpan: 1 },
  ]);
});
