import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_FILTER_TYPES } from "../../src/filters/utils";
import {
  indexTree,
  processTreeData,
  type TreeRecord,
} from "../../src/grid/hierarchy/treeData";

const rows = [
  {
    id: "org",
    name: "Organization",
    nodes: [
      {
        id: "z",
        name: "Zulu",
        nodes: [
          { id: "leaf", name: "API Gateway" },
          { id: "other", name: "Billing" },
        ],
      },
      { id: "a", name: "Alpha", nodes: [{ id: "leaf", name: "Monitoring" }] },
    ],
  },
  { id: "other", name: "Unrelated" },
];
const indexing = {
  idProperty: "id",
  nodesProperty: "nodes",
  nodePathSeparator: "/",
  generateIdFromPath: true,
};
function process(
  data: TreeRecord[],
  value: string | null = null,
  sort = false
) {
  return processTreeData(data, {
    nodesProperty: "nodes",
    columns: [{ name: "name", filterable: true }],
    filterTypes: DEFAULT_FILTER_TYPES,
    filterValue:
      value === null
        ? null
        : [{ name: "name", operator: "contains", type: "string", value }],
    sortInfo: sort ? { name: "name", dir: 1 } : null,
    sortFunctions: null,
  });
}

test("tree IDs are ancestor paths, sibling IDs may repeat under separate parents", () => {
  const tree = indexTree(rows, indexing);
  assert.equal(tree.entries.get("org/z/leaf")?.data.name, "API Gateway");
  assert.equal(tree.entries.get("org/a/leaf")?.depth, 2);
  assert.equal(tree.entries.get("org/a/leaf")?.parentNodeId, "org/a");
  assert.equal(rows[0]?.nodes?.[0]?.id, "z");
});
test("child matches retain ancestor context and reveal only the matched path", () => {
  const result = process(rows, "API");
  assert.equal(result.count, 3);
  assert.equal(result.data.length, 1);
  assert.deepEqual(
    [...indexTree(result.data, indexing).entries.keys()],
    ["org", "org/z", "org/z/leaf"]
  );
  assert.deepEqual(
    [...result.revealNodes].map((row) => row.name),
    ["Zulu", "Organization"]
  );
  assert.equal(rows[0]?.nodes?.length, 2);
  assert.equal(rows[0]?.nodes?.[0]?.nodes?.length, 2);
});
test("a parent-only match retains the legacy subtree without treating its children as matches", () => {
  const result = process(rows, "Zulu");
  assert.equal(result.count, 4);
  assert.equal(result.data[0]?.nodes[0].nodes.length, 2);
  assert.deepEqual(
    [...result.revealNodes].map((row) => row.name),
    ["Organization"]
  );
});
test("cleared filtering returns every record with original data references", () => {
  const result = process(rows, "");
  assert.equal(result.count, 7);
  assert.deepEqual(result.data, rows);
  assert.equal(result.data[0], rows[0]);
});
test("sorting applies within each sibling list, keeping paths and ancestry stable", () => {
  const result = process(rows, null, true);
  assert.deepEqual(
    result.data[0]?.nodes.map((row: TreeRecord) => row.name),
    ["Alpha", "Zulu"]
  );
  assert.deepEqual(
    result.data[0]?.nodes[1].nodes.map((row: TreeRecord) => row.name),
    ["API Gateway", "Billing"]
  );
  assert.equal(
    indexTree(result.data, indexing).entries.get("org/z/leaf")?.depth,
    2
  );
});
test("pagination can slice roots after processing without slicing their descendants", () => {
  const result = process(rows);
  const page = result.data.slice(0, 1);
  assert.equal(page[0]?.nodes.length, 2);
  assert.equal(result.count, 7);
});

test("a parent-only match still sorts the retained descendant lists", () => {
  const result = process(rows, "Organization", true);
  assert.deepEqual(
    result.data[0]?.nodes.map((row: TreeRecord) => row.name),
    ["Alpha", "Zulu"]
  );
  assert.equal(result.count, 6);
  assert.equal(result.revealNodes.size, 0);
});
test("empty arrays remain synchronous branches; undefined is a leaf and null is async", () => {
  const tree = indexTree(
    [{ id: "empty", nodes: [] }, { id: "leaf" }, { id: "async", nodes: null }],
    indexing
  );
  assert.equal(tree.entries.get("empty")?.leaf, false);
  assert.equal(tree.entries.get("leaf")?.leaf, true);
  assert.equal(tree.entries.get("async")?.leaf, false);
});
test("duplicate IDs and cycles fail explicitly instead of corrupting expansion state", () => {
  assert.throws(
    () => indexTree(rows, { ...indexing, generateIdFromPath: false }),
    /duplicate tree node ID/
  );
  const cyclic: TreeRecord = { id: "cycle" };
  cyclic.nodes = [cyclic];
  assert.throws(() => process([cyclic]), /cyclic tree data/);
  assert.throws(() => indexTree([cyclic], indexing), /cyclic tree data/);
});
test("custom children properties and separators preserve falsy IDs", () => {
  const tree = indexTree([{ key: 0, children: [{ key: "" }] }], {
    ...indexing,
    idProperty: "key",
    nodesProperty: "children",
    nodePathSeparator: ":",
  });
  assert.deepEqual([...tree.entries.keys()], ["0", "0:"]);
});
test("global search and column predicates compose at every depth", () => {
  const result = processTreeData(rows, {
    nodesProperty: "nodes",
    columns: [{ name: "name" }],
    filterTypes: DEFAULT_FILTER_TYPES,
    filterValue: null,
    sortInfo: null,
    sortFunctions: null,
    search: (siblings) => siblings.filter((row) => row.name === "API Gateway"),
  });
  assert.equal(result.count, 3);
});
