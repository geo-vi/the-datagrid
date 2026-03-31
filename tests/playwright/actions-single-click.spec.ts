import { expect, test } from "@playwright/test";

test("actions example fires row actions on the first click and supports bulk mutations", async ({
  page,
}) => {
  await page.goto("/actions");

  const preview = page.getByTestId("example-preview-panel");
  const grid = preview.locator(".InovuaReactDataGrid.tdg-root").first();

  await expect(grid).toBeVisible();
  await expect(
    preview.getByRole("heading", { name: "Actions example" })
  ).toBeVisible();
  await expect(
    preview.getByText("A focused actions grid", { exact: false })
  ).toBeVisible();

  await preview.getByRole("heading", { name: "Actions example" }).click();
  await page
    .getByRole("button", { name: "Advance Northwind Health" })
    .click();

  await expect(preview.getByTestId("actions-stage-wf-201")).toHaveText(
    "Reviewing"
  );
  await expect(preview.getByTestId("actions-log")).toContainText(
    "Advanced Northwind Health to Reviewing."
  );
  await expect(
    preview
      .getByTestId("actions-log")
      .getByText("Advanced Northwind Health to Reviewing.", { exact: true })
  ).toHaveCount(1);

  await page.getByRole("button", { name: "Insert row" }).click();
  await expect(preview.getByTestId("actions-rows-card")).toContainText("6");
  await expect(preview.getByTestId("actions-log")).toContainText(
    "Inserted sample 206"
  );

  const rowCheckboxes = grid.locator(
    'tbody [data-slot="grid-row"] [role="checkbox"]'
  );
  await rowCheckboxes.nth(0).click();
  await rowCheckboxes.nth(1).click();

  await expect(preview.getByTestId("actions-selected-card")).toContainText("2");

  await page.getByRole("button", { name: "Delete selected" }).click();

  await expect(preview.getByTestId("actions-rows-card")).toContainText("4");
  await expect(preview.getByTestId("actions-selected-card")).toContainText("0");
  await expect(preview.getByTestId("actions-log")).toContainText(
    "Deleted 2 selected rows."
  );
});
