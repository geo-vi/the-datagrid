import assert from "node:assert/strict";
import test from "node:test";

import type {
  TypeColumn,
  TypeFilterValue,
  TypeSortInfo,
} from "../../src/types";
import {
  fromTanStackColumnFiltersState,
  fromTanStackRowSelectionState,
  fromTanStackSortingState,
  hydrateTanStackRowSelection,
  projectTanStackColumnOrder,
  projectTanStackColumnSizing,
  projectTanStackColumnVisibility,
  toTanStackColumnFiltersState,
  toTanStackRowSelectionState,
  toTanStackSortingState,
} from "../../src/grid/engine/tanstackAdapter";

const columns = [
  { id: 0, name: "rank", sortName: "rankSort", minWidth: 20 },
  { id: false, name: "enabled", sortName: "enabledSort", maxWidth: 100 },
  { id: "display", name: "fullName", filterName: "nameFilter" },
] as unknown as TypeColumn[];

test("sorting projects sort names to column IDs without dropping falsy IDs", () => {
  const sortInfo = [
    { name: "rankSort", dir: 1 as const },
    { name: "enabledSort", dir: -1 as const },
    { name: "ignored", dir: 0 as const },
    { name: "rankSort", dir: -1 as const },
  ];

  assert.deepEqual(toTanStackSortingState(sortInfo, columns), [
    { id: "0", desc: false },
    { id: "false", desc: true },
  ]);
});

test("sorting restores sort names, metadata, unknown IDs, and controlled shape", () => {
  const compare = () => 0;
  const current = [
    {
      name: "rankSort",
      dir: 1 as const,
      type: "number",
      fn: compare,
      columnName: "rank",
    },
  ] satisfies TypeSortInfo;

  const result = fromTanStackSortingState(
    [
      { id: "0", desc: true },
      { id: "external", desc: false },
      { id: "0", desc: false },
    ],
    columns,
    current
  );

  assert.deepEqual(result, [
    {
      name: "rankSort",
      dir: -1,
      type: "number",
      fn: compare,
      columnName: "rank",
    },
    { name: "external", dir: 1 },
  ]);
  assert.deepEqual(fromTanStackSortingState([], columns, current), []);
  assert.deepEqual(
    fromTanStackSortingState([{ id: "false", desc: false }], columns),
    { name: "enabledSort", dir: 1 }
  );
});

test("sorting preserves id-only descriptors and persistent empty array mode", () => {
  const idOnlyColumns = [{ id: "whole", sort: () => 0 }] as TypeColumn[];
  const current = [
    { id: "whole", name: "", dir: 1 as const },
  ] satisfies TypeSortInfo;

  assert.deepEqual(toTanStackSortingState(current, idOnlyColumns), [
    { id: "whole", desc: false },
  ]);
  assert.deepEqual(
    fromTanStackSortingState(
      [{ id: "whole", desc: true }],
      idOnlyColumns,
      current
    ),
    [{ id: "whole", name: "", dir: -1 }]
  );
  assert.deepEqual(fromTanStackSortingState([], idOnlyColumns, current), []);
});

test("filter projection stores and restores complete compatibility entries", () => {
  const getFilterValue = () => "Ada";
  const customFilter = () => true;
  const filterValue: TypeFilterValue = [
    {
      name: "nameFilter",
      type: "string",
      operator: "startsWith",
      value: "A",
      emptyValue: "",
      active: false,
      fn: customFilter,
      getFilterValue,
    },
  ];

  const projected = toTanStackColumnFiltersState(filterValue, columns);
  assert.deepEqual(projected, [
    {
      id: "display",
      value: {
        ...filterValue[0],
      },
    },
  ]);
  assert.notEqual(projected[0]!.value, filterValue[0]);

  assert.deepEqual(
    fromTanStackColumnFiltersState(projected, columns),
    filterValue
  );
});

test("raw TanStack filter updates reuse required compatibility metadata", () => {
  const current: TypeFilterValue = [
    {
      name: "nameFilter",
      type: "string",
      operator: "contains",
      value: "old",
      active: true,
    },
  ];

  assert.deepEqual(
    fromTanStackColumnFiltersState(
      [{ id: "display", value: "new" }],
      columns,
      current
    ),
    [{ ...current[0], value: "new" }]
  );
  assert.equal(
    fromTanStackColumnFiltersState(
      [{ id: "unknown", value: "cannot infer operator" }],
      columns
    ),
    null
  );
});

test("selection conversion preserves numeric and other falsy row IDs", () => {
  assert.deepEqual(toTanStackRowSelectionState(0), { "0": true });
  assert.deepEqual(toTanStackRowSelectionState(false), { false: true });
  assert.deepEqual(
    toTanStackRowSelectionState({
      "": { id: "" },
      "0": { id: 0 },
      false: { id: false },
      disabled: false,
    }),
    { "": true, "0": true, false: true }
  );
  assert.deepEqual(
    toTanStackRowSelectionState({
      selected: 0,
      data: { id: 0 },
    }),
    { "0": true }
  );
});

test("selection restoration retains existing row objects when possible", () => {
  const row = { id: 0, label: "zero" };

  assert.deepEqual(
    fromTanStackRowSelectionState(
      { "0": true, stale: false, added: true, repaired: true },
      { "0": row, repaired: false }
    ),
    { "0": row, added: true, repaired: true }
  );
});

test("selection hydration uses current rows and drops stale selected IDs", () => {
  const rows = [
    { id: 0, version: "current" },
    { id: false, version: "false-id" },
    { id: "", version: "empty-id" },
    { id: 0, version: "duplicate" },
  ];

  assert.deepEqual(
    hydrateTanStackRowSelection(
      { "0": true, false: true, "": true, stale: true },
      rows,
      (row) => row.id
    ),
    {
      "0": rows[0],
      false: rows[1],
      "": rows[2],
    }
  );
});

test("column state projections preserve controlled false/zero values", () => {
  const projectionColumns = [
    {
      id: 0,
      name: "zero",
      visible: false,
      width: 5,
      minWidth: 20,
    },
    {
      id: false,
      name: "false",
      defaultHidden: true,
      width: 200,
      maxWidth: 100,
    },
    {
      id: "plain",
      defaultVisible: false,
      defaultWidth: 0,
    },
  ] as unknown as TypeColumn[];

  assert.deepEqual(
    projectTanStackColumnVisibility(
      projectionColumns,
      {
        "0": true,
        false: false,
      },
      {
        plain: false,
      }
    ),
    { "0": true, false: false, plain: false }
  );
  assert.deepEqual(
    projectTanStackColumnOrder(projectionColumns, [false, 0, "missing", 0]),
    ["false", "0", "plain"]
  );
  assert.deepEqual(projectTanStackColumnSizing(projectionColumns, { "0": 0 }), {
    "0": 20,
    false: 100,
    plain: 0,
  });
});
