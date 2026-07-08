import { expect, test } from "@playwright/test";

test("issue 21 example renders package-entry filter types and CellProps usage", async ({
  page,
}) => {
  await page.goto("/examples/issue-21-missing-imports");

  await expect(
    page
      .getByTestId("example-preview-panel")
      .getByRole("heading", { name: "Issue 21 export example" })
  ).toBeVisible();

  const grid = page.locator(".InovuaReactDataGrid.tdg-root").first();
  await expect(grid).toBeVisible();
  await expect(page.getByTestId("issue-21-name-1")).toContainText(
    "Ada Lovelace"
  );
  await expect(page.getByTestId("issue-21-name-1")).toContainText(
    "Analyst ops"
  );
  await expect(page.getByTestId("issue-21-status-1")).toContainText("Active");
});
