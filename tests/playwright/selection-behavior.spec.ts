import { expect, test } from "@playwright/test";

test("selection example supports the direct Inovua-style setter flow", async ({
  page,
}) => {
  await page.goto("/selection");

  const preview = page.getByTestId("example-preview-panel");
  const source = page.getByTestId("example-source-panel");
  await expect(preview).toBeVisible();
  await expect(source).toContainText("const [selectedRows, setSelectedRows]");
  await expect(source).toContainText("selected={selectedRows}");
  await expect(source).toContainText("onSelectionChange={setSelectedRows}");

  const grid = preview.locator(".InovuaReactDataGrid.tdg-root").first();
  const rowCheckboxes = grid.locator(
    'tbody [data-slot="grid-row"] [role="checkbox"]'
  );
  const headerCheckbox = grid.locator("thead [role='checkbox']").first();
  const countCard = preview.getByTestId("selection-count-card");
  const arrCard = preview.getByTestId("selection-arr-card");
  const reviewCard = preview.getByTestId("selection-review-card");
  const chipList = preview.getByTestId("selection-chip-list");

  await expect(rowCheckboxes).toHaveCount(8);
  await expect(
    countCard.getByText("Selected accounts", { exact: true })
  ).toBeVisible();
  await expect(
    chipList.getByText("No accounts selected yet.", { exact: true })
  ).toBeVisible();
  await expect(arrCard.getByText("$0", { exact: false })).toBeVisible();

  await rowCheckboxes.nth(0).click();

  await expect(countCard.getByText("1", { exact: true })).toBeVisible();
  await expect(
    chipList.getByText("Northwind Health", { exact: true })
  ).toBeVisible();
  await expect(arrCard.getByText("$128,000", { exact: false })).toBeVisible();
  await expect(
    reviewCard.getByText("Ava Patel", { exact: true })
  ).toBeVisible();
  await expect(
    chipList.getByText("No accounts selected yet.", { exact: true })
  ).toHaveCount(0);

  await headerCheckbox.click();

  await expect(countCard.getByText("8", { exact: true })).toBeVisible();
  await expect(arrCard.getByText("$560,000", { exact: false })).toBeVisible();
  await expect(
    chipList.getByText("Everline Education", { exact: true })
  ).toBeVisible();

  await page.getByRole("button", { name: "Clear selection" }).click();

  await expect(countCard.getByText("0", { exact: true })).toBeVisible();
  await expect(arrCard.getByText("$0", { exact: false })).toBeVisible();
  await expect(
    chipList.getByText("No accounts selected yet.", { exact: true })
  ).toBeVisible();
});

test("shows the indeterminate selector without a stale check icon in Ikarus Dark", async ({
  page,
}) => {
  await page.goto("/selection");

  await page.getByRole("button", { name: "Ikarus Dark" }).click();

  const preview = page.getByTestId("example-preview-panel");
  const grid = preview.locator(".InovuaReactDataGrid.tdg-root").first();
  await expect(grid).toHaveAttribute("data-theme", "ikarus-dark");

  const headerCheckbox = grid.locator("thead [role='checkbox']").first();
  const rowCheckboxes = grid.locator(
    'tbody [data-slot="grid-row"] [role="checkbox"]'
  );

  await headerCheckbox.click();
  await expect(headerCheckbox).toHaveAttribute("data-state", "checked");
  await expect(
    headerCheckbox.locator(".tdg-checkbox__check-icon")
  ).toBeVisible();

  await rowCheckboxes.nth(0).click();

  await expect(headerCheckbox).toHaveAttribute("data-state", "indeterminate");
  await expect(
    headerCheckbox.locator(".tdg-checkbox__indeterminate-icon")
  ).toBeVisible();
  await expect(headerCheckbox.locator(".tdg-checkbox__check-icon")).toHaveCount(
    0
  );
});
