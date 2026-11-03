import assert from "node:assert/strict";
import test from "node:test";
import { Virtualizer } from "@tanstack/virtual-core";
import {
  applyVirtualRowHeights,
  BULK_ROW_RESIZE_THRESHOLD,
} from "../../src/grid/utils/virtualRowHeights";

const createVirtualizer = (heights: number[], initialOffset = 0) => {
  const state = {
    notifications: 0,
    scrolledTo: undefined as number | undefined,
  };
  const virtualizer = new Virtualizer<Element, Element>({
    count: heights.length,
    getScrollElement: () => null,
    estimateSize: (index) => heights[index],
    scrollToFn: (offset, { adjustments = 0 }) => {
      state.scrolledTo = offset + adjustments;
    },
    observeElementRect: () => undefined,
    observeElementOffset: () => undefined,
    onChange: () => {
      state.notifications += 1;
    },
    initialRect: { width: 0, height: 600 },
    initialOffset,
  });
  virtualizer.getVirtualItems();
  return { virtualizer, state };
};

test("relayouts a global row height change once instead of once per row", () => {
  const rowCount = 100_000;
  const heights = Array.from({ length: rowCount }, () => 55);
  const { virtualizer, state } = createVirtualizer(heights, 55 * 1_000);

  heights.fill(30);
  const cleared = applyVirtualRowHeights(
    virtualizer,
    heights.map((_, index) => index),
    heights
  );

  assert.equal(cleared, true);
  assert.equal(state.notifications, 1);
  assert.equal(virtualizer.getTotalSize(), 30 * rowCount);
  assert.equal(state.scrolledTo, 30 * 1_000);
  assert.equal(virtualizer.scrollOffset, 30 * 1_000);
});

test("anchors later row measurements against the new scroll offset", () => {
  const heights = Array.from({ length: 10_000 }, () => 55);
  const { virtualizer, state } = createVirtualizer(heights, 55 * 1_000);

  heights.fill(30);
  applyVirtualRowHeights(
    virtualizer,
    heights.map((_, index) => index),
    heights
  );
  // A mounted row above the viewport is measured before the scroll event of
  // the anchor write arrives.
  virtualizer.resizeItem(999, 38);

  assert.equal(state.scrolledTo, 30 * 1_000 + 8);
});

test("resizes a few changed rows in place and keeps the size cache", () => {
  const heights = Array.from({ length: 1_000 }, () => 40);
  const { virtualizer, state } = createVirtualizer(heights);

  const changedIndexes = Array.from(
    { length: BULK_ROW_RESIZE_THRESHOLD },
    (_, index) => index * 2
  );
  for (const index of changedIndexes) heights[index] = 80;
  const cleared = applyVirtualRowHeights(virtualizer, changedIndexes, heights);

  assert.equal(cleared, false);
  assert.equal(state.notifications, changedIndexes.length);
  assert.equal(state.scrolledTo, undefined);
  assert.equal(
    virtualizer.getTotalSize(),
    40 * heights.length + 40 * changedIndexes.length
  );
});

test("does nothing when no row height changed", () => {
  const heights = Array.from({ length: 100 }, () => 40);
  const { virtualizer, state } = createVirtualizer(heights);

  assert.equal(applyVirtualRowHeights(virtualizer, [], heights), false);
  assert.equal(state.notifications, 0);
});
