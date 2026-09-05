import assert from "node:assert/strict";
import test from "node:test";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { applyVisibleTreeRows } from "../../src/grid/hierarchy/treeRowAdapter";
import { indexTree, type TreeRecord } from "../../src/grid/hierarchy/treeData";
import { useTreeGrid } from "../../src/grid/hierarchy/useTreeGrid";

const options = {
  idProperty: "id",
  nodesProperty: "nodes",
  nodePathSeparator: "/",
  generateIdFromPath: true,
};
const fixture = (): TreeRecord[] => [
  {
    id: "a",
    name: "Root A",
    nodes: [
      {
        id: "x",
        name: "Child A",
        nodes: [{ id: "hidden", name: "Hidden child" }],
      },
      { id: "y", name: "Sibling A" },
    ],
  },
  { id: "b", name: "Root B", nodes: [{ id: "x", name: "Child B" }] },
];
const visibleIds = ["a", "a/x", "a/y", "b", "b/x"];

test("visible child updates preserve other roots and clone only its ancestry", () => {
  const rows = fixture();
  const next = applyVisibleTreeRows(
    rows,
    visibleIds,
    (visible) =>
      visible.map((row, index) =>
        index === 1 ? { ...row, name: "Changed child" } : row
      ),
    options
  );
  assert.equal(next[0].nodes[0].name, "Changed child");
  assert.equal(next[1].name, "Root B");
  assert.equal(next[1], rows[1]);
  assert.equal(next[0].nodes[1], rows[0].nodes[1]);
  assert.equal(rows[0].nodes[0].name, "Child A");
});

test("replacing a collapsed parent without a children property preserves hidden descendants", () => {
  const rows = fixture();
  const next = applyVisibleTreeRows(
    rows,
    ["a", "b"],
    (visible) => [{ id: "a", name: "Replaced parent" }, visible[1]],
    options
  );
  assert.equal(next[0].name, "Replaced parent");
  assert.deepEqual(next[0].nodes, rows[0].nodes);
  assert.equal(next[0].nodes[0], rows[0].nodes[0]);
  assert.equal(next[0].nodes[0].nodes[0].name, "Hidden child");
});

test("batched parent and descendant replacements preserve both edits and hidden branches", () => {
  const rows = fixture();
  const next = applyVisibleTreeRows(
    rows,
    visibleIds,
    (visible) =>
      visible.map((row, index) => {
        if (index === 0) return { id: "a", name: "Changed parent" };
        if (index === 1) return { id: "x", name: "Changed child" };
        return row;
      }),
    options
  );
  assert.equal(next[0].name, "Changed parent");
  assert.equal(next[0].nodes[0].name, "Changed child");
  assert.equal(next[0].nodes[0].nodes[0], rows[0].nodes[0].nodes[0]);
  assert.equal(next[0].nodes[1], rows[0].nodes[1]);
});

test("explicit parent children control membership and compose with direct child edits", () => {
  const rows = fixture();
  const next = applyVisibleTreeRows(
    rows,
    visibleIds,
    (visible) =>
      visible.map((row, index) => {
        if (index === 0)
          return {
            ...row,
            nodes: [{ ...row.nodes[0], note: "Added by parent" }],
          };
        if (index === 1) return { ...row, name: "Changed directly" };
        return row;
      }),
    options
  );
  assert.equal(next[0].nodes.length, 1);
  assert.equal(next[0].nodes[0].name, "Changed directly");
  assert.equal(next[0].nodes[0].note, "Added by parent");
  assert.equal(next[0].nodes[0].nodes[0], rows[0].nodes[0].nodes[0]);
  const emptied = applyVisibleTreeRows(
    rows,
    visibleIds,
    (visible) =>
      visible.map((row, index) => {
        if (index === 0) return { ...row, nodes: [] };
        if (index === 1) return { ...row, name: "Removed with its parent" };
        return row;
      }),
    options
  );
  assert.deepEqual(emptied[0].nodes, []);
});

test("queued functional updates read the latest nested record", () => {
  const rows = fixture();
  rows[0].nodes[0].version = 1;
  const increment = (visible: TreeRecord[]) =>
    visible.map((row, index) =>
      index === 1 ? { ...row, version: row.version + 1 } : row
    );
  const first = applyVisibleTreeRows(rows, visibleIds, increment, options);
  const second = applyVisibleTreeRows(first, visibleIds, increment, options);
  assert.equal(second[0].nodes[0].version, 3);
  assert.equal(rows[0].nodes[0].version, 1);
});

test("custom children and globally unique numeric IDs address nested records", () => {
  const rows = [
    { key: 0, label: "Root", children: [{ key: 1, label: "Child" }] },
    { key: 2, label: "Other" },
  ];
  const indexing = {
    ...options,
    idProperty: "key",
    nodesProperty: "children",
    generateIdFromPath: false,
  };
  const next = applyVisibleTreeRows(
    rows,
    ["0", "1", "2"],
    (visible) =>
      visible.map((row, index) =>
        index === 1 ? { ...row, label: "Changed" } : row
      ),
    indexing
  );
  assert.equal(next[0].children[0].label, "Changed");
  assert.equal(next[1], rows[1]);
});

test("root and child identity changes retain the nested topology", () => {
  const rows = fixture();
  const next = applyVisibleTreeRows(
    rows,
    visibleIds,
    (visible) =>
      visible.map((row, index) =>
        index === 0
          ? { ...row, id: "renamed" }
          : index === 1
            ? { ...row, id: "new-child" }
            : row
      ),
    options
  );
  const indexed = indexTree(next, options);
  assert.equal(
    indexed.entries.get("renamed/new-child/hidden")?.data.name,
    "Hidden child"
  );
  assert.equal(indexed.entries.get("b/x")?.data.name, "Child B");
});

test("no-op and stale visible snapshots cannot modify unrelated source records", () => {
  const rows = fixture();
  assert.equal(
    applyVisibleTreeRows(rows, visibleIds, (visible) => [...visible], options),
    rows
  );
  assert.equal(
    applyVisibleTreeRows(
      rows,
      ["removed/child"],
      () => {
        throw new Error("A stale updater must not run on another record");
      },
      options
    ),
    rows
  );
});

test("row setters cannot flatten or structurally truncate a tree", () => {
  const rows = fixture();
  assert.throws(
    () =>
      applyVisibleTreeRows(
        rows,
        visibleIds,
        (visible) => visible.slice(0, 2),
        options
      ),
    /change dataSource/
  );
  assert.equal(rows.length, 2);
  assert.equal(rows[0].nodes.length, 2);
});

test("treeColumn alone leaves tree processing inactive", () => {
  const rows = fixture();
  const Harness = () => {
    const tree = useTreeGrid({
      props: { treeColumn: "name" },
      sourceRows: rows,
      idProperty: "id",
      revealMatches: false,
      revealNodes: new Set(),
    });
    assert.equal(tree.enabled, false);
    assert.equal(tree.rows, rows);
    assert.equal(tree.getMetadata(rows[0]), undefined);
    return null;
  };
  renderToStaticMarkup(React.createElement(Harness));
});
