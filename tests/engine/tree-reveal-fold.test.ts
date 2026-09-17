import assert from "node:assert/strict";
import test from "node:test";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { useTreeGrid } from "../../src/grid/hierarchy/useTreeGrid";
import type { TreeRecord } from "../../src/grid/hierarchy/treeData";
import type { TypeTreeGridProps } from "../../src/grid/hierarchy/treeTypes";

type Tree = ReturnType<typeof useTreeGrid>;
type Step = (tree: Tree, rows: TreeRecord[]) => void;

const fixture = (): TreeRecord[] => [
  {
    id: "a",
    name: "Root A",
    nodes: [
      { id: "x", name: "Branch A", nodes: [{ id: "api", name: "API Gateway" }] },
    ],
  },
  { id: "b", name: "Root B", nodes: [{ id: "y", name: "Branch B" }] },
];

/**
 * Renders the hook against a search that has revealed the path to `a/x/api`,
 * running one step per render pass. A fold is state, so it is only visible to
 * the pass after the one that asked for it; a step that changes nothing ends
 * the render, which is how a refused fold is told apart from an accepted one.
 */
function underReveal(
  args: { props: TypeTreeGridProps },
  steps: Step[] = []
) {
  const rows = fixture();
  const revealNodes = new Set<TreeRecord>([rows[0], rows[0].nodes[0]]);
  const passes: Step[] = [];
  const Harness = () => {
    const tree = useTreeGrid({
      props: args.props,
      sourceRows: rows,
      idProperty: "id",
      revealMatches: true,
      revealNodes,
      revealKey: "query",
      branchPageSize: Number.POSITIVE_INFINITY,
    });
    const toggles = rows.map((row, index) =>
      React.createElement(
        React.Fragment,
        { key: String(row.id) },
        tree.renderToggle(row, index)
      )
    );
    const step = steps[passes.length];
    passes.push(step ?? (() => {}));
    step?.(tree, rows);
    return React.createElement(React.Fragment, null, toggles);
  };
  const markup = renderToStaticMarkup(React.createElement(Harness));
  return { markup, passes: passes.length };
}

const ids = (tree: Tree) => tree.rows.map((row) => row.id);

test("a viewer can fold a branch the search revealed, and unfold it again", () => {
  const collapsed: string[] = [];
  const mapChanges: string[] = [];
  const { passes } = underReveal(
    {
      props: {
        treeEnabled: true,
        onNodeCollapse: (event) => {
          collapsed.push(String(event.id));
        },
        onNodeExpandChange: () => {
          mapChanges.push("onNodeExpandChange");
        },
        onExpandedNodesChange: () => {
          mapChanges.push("onExpandedNodesChange");
        },
      },
    },
    [
      (tree, rows) => {
        assert.deepEqual(ids(tree), ["a", "x", "api", "b"]);
        assert.equal(tree.getMetadata(rows[0])?.expanded, true);
        tree.toggle(rows[0], 0);
      },
      (tree, rows) => {
        assert.deepEqual(ids(tree), ["a", "b"]);
        assert.equal(tree.getMetadata(rows[0])?.expanded, false);
        assert.deepEqual(collapsed, ["a"]);
        assert.deepEqual(mapChanges, []);
        assert.deepEqual(tree.expandedNodes, {});
        tree.toggle(rows[0], 0);
      },
      (tree) => {
        assert.deepEqual(ids(tree), ["a", "x", "api", "b"]);
        assert.deepEqual(mapChanges, []);
      },
    ]
  );
  assert.equal(passes, 3);
});

test("refusing the collapse keeps the revealed branch open", () => {
  const mapChanges: string[] = [];
  const { passes } = underReveal(
    {
      props: {
        treeEnabled: true,
        onNodeCollapse: () => false,
        onNodeExpandChange: () => {
          mapChanges.push("onNodeExpandChange");
        },
        onExpandedNodesChange: () => {
          mapChanges.push("onExpandedNodesChange");
        },
      },
    },
    [(tree, rows) => tree.toggle(rows[0], 0)]
  );
  assert.equal(passes, 1);
  assert.deepEqual(mapChanges, []);
});

test("folding a branch the consumer had opened leaves the controlled map alone", () => {
  const proposals: string[] = [];
  const expandedNodes = { a: true };
  const { passes } = underReveal(
    {
      props: {
        treeEnabled: true,
        expandedNodes,
        onExpandedNodesChange: () => {
          proposals.push("onExpandedNodesChange");
        },
      },
    },
    [
      (tree, rows) => tree.toggle(rows[0], 0),
      (tree) => {
        assert.deepEqual(ids(tree), ["a", "b"]);
        assert.deepEqual(proposals, []);
        assert.deepEqual(expandedNodes, { a: true });
      },
    ]
  );
  assert.equal(passes, 2);
});

test("a revealed toggle is offered as a working control", () => {
  const { markup } = underReveal({ props: { treeEnabled: true } });
  assert.doesNotMatch(markup, /aria-disabled/);
  assert.doesNotMatch(markup, /Matching descendants/);
});
