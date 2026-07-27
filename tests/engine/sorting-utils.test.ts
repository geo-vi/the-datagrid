import assert from "node:assert/strict";
import test from "node:test";

import type {
  TypeColumn,
  TypeSingleSortInfo,
  TypeSortFunctions,
  TypeSortInfo,
} from "../../src/types";
import {
  applyLocalSort,
  createColumnSortInfo,
  setColumnSortInfo,
  toggleSortInfo,
} from "../../src/sorting/utils";

const alpha = { id: "alpha-id", name: "alpha" } satisfies TypeColumn;
const beta = { id: "beta-id", name: "beta" } satisfies TypeColumn;
const gamma = { id: "gamma-id", name: "gamma" } satisfies TypeColumn;

test("array-valued sort state is persistent multi-sort and preserves priority", () => {
  const initial: TypeSortInfo = [
    { name: "alpha", dir: 1 },
    { name: "beta", dir: -1 },
  ];

  const toggled = toggleSortInfo({
    sortInfo: initial,
    col: alpha,
    allowUnsort: false,
    defaultDir: 1,
  });
  assert.deepEqual(toggled, [
    {
      id: "alpha-id",
      name: "alpha",
      columnName: "alpha",
      type: undefined,
      dir: -1,
    },
    { name: "beta", dir: -1 },
  ]);

  const removed = toggleSortInfo({
    sortInfo: toggled,
    col: alpha,
    allowUnsort: false,
    defaultDir: 1,
  });
  assert.deepEqual(removed, [{ name: "beta", dir: -1 }]);

  const appended = toggleSortInfo({
    sortInfo: removed,
    col: gamma,
    allowUnsort: false,
    defaultDir: 1,
  });
  assert.deepEqual(appended, [
    { name: "beta", dir: -1 },
    {
      id: "gamma-id",
      name: "gamma",
      columnName: "gamma",
      type: undefined,
      dir: 1,
    },
  ]);
});

test("single sort stays single even when the obsolete modifier flag is passed", () => {
  const result = toggleSortInfo({
    sortInfo: null,
    col: beta,
    allowUnsort: true,
    defaultDir: 1,
    multi: true,
  });

  assert.equal(Array.isArray(result), false);
  assert.deepEqual(result, {
    id: "beta-id",
    name: "beta",
    columnName: "beta",
    type: undefined,
    dir: 1,
  });
});

test("single-sort cycles respect allowUnsort in either default direction", () => {
  const ascending = toggleSortInfo({
    sortInfo: null,
    col: alpha,
    allowUnsort: true,
    defaultDir: 1,
  });
  const descending = toggleSortInfo({
    sortInfo: ascending,
    col: alpha,
    allowUnsort: true,
    defaultDir: 1,
  });
  assert.equal(
    toggleSortInfo({
      sortInfo: descending,
      col: alpha,
      allowUnsort: true,
      defaultDir: 1,
    }),
    null
  );

  const descendingFirst = toggleSortInfo({
    sortInfo: null,
    col: alpha,
    allowUnsort: false,
    defaultDir: -1,
  });
  const ascendingSecond = toggleSortInfo({
    sortInfo: descendingFirst,
    col: alpha,
    allowUnsort: false,
    defaultDir: -1,
  });
  const descendingAgain = toggleSortInfo({
    sortInfo: ascendingSecond,
    col: alpha,
    allowUnsort: false,
    defaultDir: -1,
  });

  assert.deepEqual(
    [descendingFirst, ascendingSecond, descendingAgain].map((entry) =>
      Array.isArray(entry) ? undefined : entry?.dir
    ),
    [-1, 1, -1]
  );
});

test("empty and one-entry arrays never collapse out of multi-sort mode", () => {
  const sorted = setColumnSortInfo({
    sortInfo: [],
    col: alpha,
    dir: 1,
  });
  assert.equal(Array.isArray(sorted), true);

  const unsorted = setColumnSortInfo({
    sortInfo: sorted,
    col: alpha,
    dir: 0,
  });
  assert.deepEqual(unsorted, []);
});

test("column comparators receive Inovua value, column, row, and descriptor arguments", () => {
  const calls: unknown[][] = [];
  const column = {
    id: "score-id",
    name: "score",
    sortName: "nested.score",
    type: "rank",
    sort: (...args: unknown[]) => {
      calls.push(args);
      return Number(args[0]) - Number(args[1]);
    },
  } satisfies TypeColumn;
  const descriptor = createColumnSortInfo({
    column,
    dir: 1,
  });

  assert.ok(descriptor?.fn);
  const firstRow = { id: "a", nested: { score: 2 } };
  const secondRow = { id: "b", nested: { score: 1 } };
  descriptor.fn(2, 1, firstRow, secondRow, descriptor);

  assert.equal(descriptor.id, "score-id");
  assert.equal(descriptor.name, "nested.score");
  assert.equal(descriptor.columnName, "score");
  assert.equal(descriptor.type, "rank");
  assert.deepEqual(calls[0], [2, 1, column, firstRow, secondRow, descriptor]);
});

test("registered and descriptor comparators drive local sorting", () => {
  const rows = [
    { id: "ten", value: "10" },
    { id: "two", value: "2" },
  ];
  const columns = [
    { name: "value", type: "numericText" },
  ] satisfies TypeColumn[];
  const sortFunctions: TypeSortFunctions = {
    numericText: (value1, value2, column) => {
      assert.equal(column, columns[0]);
      return Number(value1) - Number(value2);
    },
  };

  assert.deepEqual(
    applyLocalSort(
      rows,
      { name: "value", dir: 1, type: "numericText" },
      columns,
      sortFunctions
    ).map((row) => row.id),
    ["two", "ten"]
  );

  const descriptorCalls: unknown[][] = [];
  const descriptor: TypeSingleSortInfo = {
    name: "value",
    dir: -1,
    fn: (...args) => {
      descriptorCalls.push(args);
      return Number(args[0]) - Number(args[1]);
    },
  };
  assert.deepEqual(
    applyLocalSort(rows, descriptor, columns).map((row) => row.id),
    ["ten", "two"]
  );
  assert.equal(descriptorCalls[0]?.[2], rows[1]);
  assert.equal(descriptorCalls[0]?.[3], rows[0]);
  assert.deepEqual(descriptorCalls[0]?.[4], {
    ...descriptor,
    id: "value",
    columnName: "value",
    type: "numericText",
  });

  const toggledDescriptor = toggleSortInfo({
    sortInfo: descriptor,
    col: { name: "value" },
    allowUnsort: false,
    defaultDir: 1,
  });
  assert.ok(toggledDescriptor && !Array.isArray(toggledDescriptor));
  assert.equal(toggledDescriptor.dir, 1);
  assert.equal(toggledDescriptor.fn, descriptor.fn);
  assert.deepEqual(
    applyLocalSort(rows, toggledDescriptor).map((row) => row.id),
    ["two", "ten"]
  );
});

test("number and string types use distinct built-in ordering", () => {
  const rows = [
    { id: "ten", value: "10" },
    { id: "two", value: "2" },
  ];

  assert.deepEqual(
    applyLocalSort(rows, { name: "value", dir: 1, type: "number" }, [
      { name: "value", type: "number" },
    ]).map((row) => row.id),
    ["two", "ten"]
  );
  assert.deepEqual(
    applyLocalSort(rows, { name: "value", dir: 1, type: "string" }, [
      { name: "value", type: "string" },
    ]).map((row) => row.id),
    ["ten", "two"]
  );
});

test("an id-only column comparator receives complete rows as its values", () => {
  const rows = [
    { id: "high", score: 20 },
    { id: "low", score: 10 },
  ];
  const seen: unknown[][] = [];
  const column = {
    id: "whole-row",
    sort: (...args: unknown[]) => {
      seen.push(args);
      return (
        (args[0] as (typeof rows)[number]).score -
        (args[1] as (typeof rows)[number]).score
      );
    },
  } satisfies TypeColumn;

  const descriptor = createColumnSortInfo({ column, dir: 1 });
  assert.deepEqual(
    applyLocalSort(rows, descriptor, [column]).map((row) => row.id),
    ["low", "high"]
  );
  assert.equal(seen[0]?.[0], rows[1]);
  assert.equal(seen[0]?.[1], rows[0]);
  assert.equal(seen[0]?.[3], rows[1]);
  assert.equal(seen[0]?.[4], rows[0]);
});
