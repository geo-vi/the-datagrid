import assert from "node:assert/strict";
import test from "node:test";

import type { TypeFilterTypes, TypeSingleFilterValue } from "../../src/types";
import { hasActiveLocalFilter, isFilterEntryEmptyValue } from "../../src/filters/utils";

function entry(
  type: string,
  operator: string,
  value: unknown,
  extra: Partial<TypeSingleFilterValue> = {}
): TypeSingleFilterValue {
  return { name: "col", type, operator, value, ...extra };
}

// A consumer-supplied type that never declares `emptyValue`, which is the
// common shape for custom filters.
const customTypes: TypeFilterTypes = {
  mycustom: {
    type: "mycustom",
    emptyValue: undefined,
    operators: [
      { name: "eq", fn: ({ value, filterValue }) => value === filterValue },
    ],
  },
};

test("null and undefined are empty for every type, not just the ones nominating null", () => {
  // string/date/time nominate "", so null and undefined used to read as active
  // and ran the predicate over every row.
  for (const value of [null, undefined]) {
    for (const [type, operator] of [
      ["string", "contains"],
      ["date", "eq"],
      ["time", "eq"],
      ["number", "eq"],
      ["bool", "eq"],
      ["select", "inlist"],
    ] as const) {
      assert.equal(
        hasActiveLocalFilter([entry(type, operator, value)]),
        false,
        `${type} filter with ${String(value)} should be empty`
      );
    }
  }
});

test("a custom type that declares no emptyValue still recognises cleared values", () => {
  // Without this, `emptyValue` is undefined and only a literal `undefined`
  // value counts as empty — so every other value looks like a live filter.
  for (const value of [null, undefined]) {
    assert.equal(
      hasActiveLocalFilter([entry("mycustom", "eq", value)], customTypes),
      false,
      `custom filter with ${String(value)} should be empty`
    );
  }
  assert.equal(
    hasActiveLocalFilter([entry("mycustom", "eq", "x")], customTypes),
    true
  );
});

test('"" stays type-nominated rather than universally empty', () => {
  // Empty for the types that nominate it...
  assert.equal(hasActiveLocalFilter([entry("string", "contains", "")]), false);
  assert.equal(hasActiveLocalFilter([entry("date", "eq", "")]), false);

  // ...but a real value elsewhere. A number `eq` filter of "" matches rows
  // whose cell is an empty string; issue #34 parity covers this end to end.
  assert.equal(hasActiveLocalFilter([entry("number", "eq", "")]), true);
});

test("falsy values that are real filter input stay active", () => {
  // 0 and false are values to filter on, not cleared editors. The nullish
  // check must be `== null`, which excludes them; `== ""` would not.
  assert.equal(hasActiveLocalFilter([entry("number", "eq", 0)]), true);
  assert.equal(hasActiveLocalFilter([entry("bool", "eq", false)]), true);
  assert.equal(hasActiveLocalFilter([entry("number", "eq", 5)]), true);
  assert.equal(hasActiveLocalFilter([entry("string", "contains", "a")]), true);
  assert.equal(hasActiveLocalFilter([entry("select", "inlist", ["a"])]), true);
});

test("operators that filter on an empty value are unaffected", () => {
  // `empty`/`notEmpty` opt out via filterOnEmptyValue + disableFilterEditor,
  // so broadening what counts as empty must not disable them.
  assert.equal(hasActiveLocalFilter([entry("string", "empty", "")]), true);
  assert.equal(hasActiveLocalFilter([entry("string", "notEmpty", "")]), true);
  assert.equal(hasActiveLocalFilter([entry("string", "empty", null)]), true);
});

test("an explicit active flag still wins", () => {
  assert.equal(
    hasActiveLocalFilter([entry("string", "contains", "a", { active: false })]),
    false
  );
});

test("an entry-level emptyValue override is still honoured", () => {
  assert.equal(
    isFilterEntryEmptyValue(
      entry("string", "contains", "none", { emptyValue: "none" })
    ),
    true
  );
  assert.equal(
    isFilterEntryEmptyValue(
      entry("string", "contains", "set", { emptyValue: "none" })
    ),
    false
  );
});

test("isFilterEntryEmptyValue agrees with the runnable check", () => {
  // These two drive the inline clear button and the imperative filter API, so
  // they must classify the same way the filtering pass does.
  assert.equal(isFilterEntryEmptyValue(entry("string", "contains", null)), true);
  assert.equal(isFilterEntryEmptyValue(entry("number", "eq", "")), false);
  assert.equal(isFilterEntryEmptyValue(entry("number", "eq", 0)), false);
  assert.equal(
    isFilterEntryEmptyValue(entry("mycustom", "eq", null), customTypes),
    true
  );
});
