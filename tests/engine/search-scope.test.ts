import assert from "node:assert/strict";
import test from "node:test";

import { resolveSearchedColumns } from "../../src/grid/utils/search";
import type { TypeColumn } from "../../src/types";

const columns = [
  { name: "__checkbox__" },
  { name: "from" },
  { name: "subject" },
  { name: "actions", searchable: false },
  { name: "menu", mobileRole: "action" },
  { name: "secret", mobileRole: "hidden" },
] as TypeColumn[];

const idsOf = (result: TypeColumn[]) => result.map((column) => column.name);

test("an unscoped search still drops the columns it cannot match", () => {
  // The regression: the filtered list was computed and then the unfiltered one
  // returned on this path, so a `searchable: false` column stayed in the index
  // while the picker hid it. Every grid without a scope was searching its
  // action column.
  assert.deepEqual(
    idsOf(resolveSearchedColumns(columns, { checkboxColumnId: "__checkbox__" })),
    ["from", "subject"]
  );
});

test("a scope narrows the searchable columns rather than reopening the rest", () => {
  assert.deepEqual(
    idsOf(
      resolveSearchedColumns(columns, {
        checkboxColumnId: "__checkbox__",
        searchColumnIds: ["from", "actions", "secret"],
      })
    ),
    ["from"]
  );
});

test("a scope matching nothing falls back to searchable, not to everything", () => {
  assert.deepEqual(
    idsOf(
      resolveSearchedColumns(columns, {
        checkboxColumnId: "__checkbox__",
        searchColumnIds: ["nosuchcolumn"],
      })
    ),
    ["from", "subject"]
  );
});
