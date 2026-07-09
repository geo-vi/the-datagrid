import { expect, test } from "@playwright/test";

const overridableI18nDefaults = {
  noRecords: '"No records"',
  clear: '"Clear"',
  clearAll: '"All"',
  selected: '"selected"',
  filter: '"Filter"',
  operator: '"Operator"',
  sortAsc: '"Sort A→Z"',
  sortDesc: '"Sort Z→A"',
  unsort: '"Unsort"',
  showingText: '"Showing"',
  ofText: '"of"',
  perPageText: '"Rows"',
  pageText: '"Page"',
  mobileColumns: '"Display columns"',
  mobileSort: '"Sort"',
  mobileSortBy: '"Sort by"',
  mobileSortAsc: '"Ascending"',
  mobileSortDesc: '"Descending"',
  mobileClearSort: '"Clear sort"',
  mobileApplySort: '"Apply sort"',
  contains: '"Contains" (filter cell); "contains" (operator menu)',
  notContains: '"Not Contains" (filter cell); "notContains" (operator menu)',
  containsOr: '"Contains Or" (filter cell); "containsOr" (operator menu)',
  eq: '"Eq" (filter cell); "eq" (operator menu)',
  neq: '"Neq" (filter cell); "neq" (operator menu)',
  empty: '"Empty" (filter cell); "empty" (operator menu)',
  notEmpty: '"Not Empty" (filter cell); "notEmpty" (operator menu)',
  startsWith: '"Starts With" (filter cell); "startsWith" (operator menu)',
  endsWith: '"Ends With" (filter cell); "endsWith" (operator menu)',
  inlist: '"Inlist" (filter cell); "inlist" (operator menu)',
  notinlist: '"Notinlist" (filter cell); "notinlist" (operator menu)',
  gt: '"Gt" (filter cell); "gt" (operator menu)',
  gte: '"Gte" (filter cell); "gte" (operator menu)',
  lt: '"Lt" (filter cell); "lt" (operator menu)',
  lte: '"Lte" (filter cell); "lte" (operator menu)',
  inrange: '"Inrange" (filter cell); "inrange" (operator menu)',
  notinrange: '"Notinrange" (filter cell); "notinrange" (operator menu)',
  after: '"After" (filter cell); "after" (operator menu)',
  afterOrOn: '"After Or On" (filter cell); "afterOrOn" (operator menu)',
  before: '"Before" (filter cell); "before" (operator menu)',
  beforeOrOn: '"Before Or On" (filter cell); "beforeOrOn" (operator menu)',
} as const;

const stringOnlyI18nKeys = new Set([
  "clear",
  "clearAll",
  "selected",
  "filter",
  "operator",
  "contains",
  "notContains",
  "containsOr",
  "eq",
  "neq",
  "empty",
  "notEmpty",
  "startsWith",
  "endsWith",
  "inlist",
  "notinlist",
  "gt",
  "gte",
  "lt",
  "lte",
  "inrange",
  "notinrange",
  "after",
  "afterOrOn",
  "before",
  "beforeOrOn",
  "mobileSort",
]);

test("documents every currently overridable i18n key", async ({ page }) => {
  await page.goto("/docs/reference/i18n");

  await expect(
    page.getByRole("heading", { name: "Internationalization (i18n)" })
  ).toBeVisible();

  const documentedEntries = await page.locator("tbody tr").evaluateAll((rows) =>
    rows.map((row) => {
      const cells = row.querySelectorAll("td");
      return {
        key: cells[0]?.textContent?.trim(),
        type: cells[1]?.textContent?.trim(),
        defaultValue: cells[2]?.textContent?.trim(),
      };
    })
  );
  const documentedKeys = documentedEntries.map(({ key }) => key);

  expect(documentedKeys.sort()).toEqual(
    Object.keys(overridableI18nDefaults).sort()
  );
  expect(
    Object.fromEntries(
      documentedEntries.map(({ defaultValue, key }) => [key, defaultValue])
    )
  ).toEqual(overridableI18nDefaults);
  expect(
    Object.fromEntries(documentedEntries.map(({ key, type }) => [key, type]))
  ).toEqual(
    Object.fromEntries(
      Object.keys(overridableI18nDefaults).map((key) => [
        key,
        stringOnlyI18nKeys.has(key) ? "string" : "string | ReactNode",
      ])
    )
  );
});
