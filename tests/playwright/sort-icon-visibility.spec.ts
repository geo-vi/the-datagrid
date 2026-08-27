import { expect, test, type Page } from "@playwright/test";

const FIXTURE = "/compat/sort-icon-visibility";

function header(page: Page, grid: string, columnId: string) {
  return page.locator(
    `[data-testid="${grid}"] [data-slot="grid-header-cell"][data-column-id="${columnId}"]`
  );
}

function icon(page: Page, grid: string, columnId: string) {
  return header(page, grid, columnId).locator(
    ".InovuaReactDataGrid__sort-icon"
  );
}

function wrapper(page: Page, grid: string, columnId: string) {
  return header(page, grid, columnId).locator(
    ".InovuaReactDataGrid__sort-icon-wrapper"
  );
}

test("the default keeps the neutral indicator on every sortable column", async ({
  page,
}) => {
  await page.goto(FIXTURE);
  await expect(header(page, "sort-icon-always-grid", "id")).toBeVisible();

  await expect(icon(page, "sort-icon-always-grid", "id")).toHaveClass(
    /InovuaReactDataGrid__sort-icon--active/
  );
  await expect(icon(page, "sort-icon-always-grid", "name")).toBeVisible();
  await expect(icon(page, "sort-icon-always-grid", "city")).toHaveCount(0);
});

test('sortIconVisibility="sorted" shows the indicator only on the sorted column', async ({
  page,
}) => {
  await page.goto(FIXTURE);
  await expect(header(page, "sort-icon-sorted-grid", "id")).toBeVisible();

  await expect(icon(page, "sort-icon-sorted-grid", "id")).toHaveClass(
    /InovuaReactDataGrid__sort-icon--active/
  );
  await expect(icon(page, "sort-icon-sorted-grid", "name")).toHaveCount(0);
  await expect(wrapper(page, "sort-icon-sorted-grid", "name")).toHaveCount(1);
});

// A centred header is where a missing indicator would be seen: the label and
// the indicator centre as one group, so dropping the indicator rather than
// emptying it would slide the label sideways when the column becomes sorted.
test("hiding the indicator reserves its width, so sorting shifts no header", async ({
  page,
}) => {
  await page.goto(FIXTURE);
  const cell = header(page, "sort-icon-sorted-grid", "region");
  const label = cell.locator("span", { hasText: "Region" });
  await expect(label).toBeVisible();
  await expect(icon(page, "sort-icon-sorted-grid", "region")).toHaveCount(0);

  const before = await label.boundingBox();
  await cell.click();
  await expect(icon(page, "sort-icon-sorted-grid", "region")).toBeVisible();
  const after = await label.boundingBox();

  expect(Math.round(after!.x)).toBe(Math.round(before!.x));
  expect(Math.round(after!.width)).toBe(Math.round(before!.width));
});

test("a column's own renderSortTool is left alone", async ({ page }) => {
  await page.goto(FIXTURE);
  await expect(header(page, "sort-icon-sorted-grid", "amount")).toBeVisible();

  await expect(
    header(page, "sort-icon-sorted-grid", "amount").getByTestId(
      "custom-sort-tool-0"
    )
  ).toBeVisible();
});
