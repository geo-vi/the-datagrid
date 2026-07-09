import { expect, test } from "@playwright/test";

test("issue 17 example uses supported alternatives without adding grid props", async ({
  page,
}) => {
  await page.goto("/examples/issue-17");

  await expect(
    page
      .getByTestId("example-preview-panel")
      .getByRole("heading", { name: "Issue 17 fixed-prop alternatives" })
  ).toBeVisible();
  await expect(
    page.getByText("examples/src/Issue17FixedContractExample.tsx")
  ).toBeVisible();

  const preview = page.getByTestId("example-preview-panel");
  await expect(preview.getByTestId("issue17-empty-alternative")).toContainText(
    "i18n.noRecords"
  );
  await expect(preview.getByTestId("issue17-column-alternative")).toContainText(
    "render, alignment, sizing, visible"
  );
  await expect(preview.getByTestId("issue17-unsupported-props")).toContainText(
    "minRowHeight"
  );
  await expect(preview.getByTestId("issue17-unsupported-props")).toContainText(
    "emptyText"
  );
  await expect(preview.getByTestId("issue17-unsupported-props")).toContainText(
    "onColumnFilterValueChange"
  );
  await expect(preview.getByTestId("issue17-unsupported-props")).toContainText(
    "enableSelection"
  );
  await expect(preview.getByTestId("issue17-unsupported-props")).toContainText(
    "virtualizeColumnsThreshold"
  );

  const grid = preview.locator(".InovuaReactDataGrid.tdg-root").first();
  await expect(grid).toBeVisible();
  await expect(
    grid.locator(
      '[data-slot="grid-header-cell"][data-column-id="internalNote"]'
    )
  ).toHaveCount(0);
  await expect(grid.getByText("TypeColumn render/style")).toBeVisible();
  await expect(grid.getByText("Column-level")).toHaveCount(2);

  await expect(
    grid.locator('[data-slot="grid-row"][data-row-index="0"]')
  ).toHaveAttribute("data-row-parity", "odd");
  await expect(
    grid.locator('[data-slot="grid-row"][data-row-index="1"]')
  ).toHaveAttribute("data-row-parity", "even");
  await expect(
    grid.locator('.InovuaReactDataGrid__cell[data-column-id="impact"]').first()
  ).toHaveCSS("text-align", "right");

  await page.getByTestId("issue17-toggle-empty").click();

  await expect(grid).toContainText("No issue #17 rows match the current view");
  await expect(page.getByTestId("issue17-filtered-count")).toContainText("0");
});
