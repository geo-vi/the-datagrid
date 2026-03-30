import { expect, test } from "@playwright/test";

test("searches docs keys and example content from the shared header", async ({
  page,
}) => {
  await page.goto("/examples");

  await expect(
    page.getByRole("button", { name: "Open global search" })
  ).toBeVisible();

  await page.getByRole("button", { name: "Open global search" }).click();
  await expect(page.getByRole("heading", { name: "Global search" })).toBeVisible();

  const searchInput = page.getByRole("combobox", {
    name: "Global search input",
  });
  await searchInput.fill("onColumnOrderChange");

  await expect(
    page.getByText("ReactDataGrid prop reference · onColumnOrderChange")
  ).toBeVisible();

  await page
    .getByText("ReactDataGrid prop reference · onColumnOrderChange")
    .click();

  await expect(page).toHaveURL(/\/docs\/reference\/reactdatagrid#core-props$/);
  await expect(
    page.getByRole("heading", { name: "ReactDataGrid prop reference" })
  ).toBeVisible();

  await page.getByRole("button", { name: "Open global search" }).click();
  await expect(searchInput).toBeVisible();
  await searchInput.fill("Selection example");

  await expect(
    page.getByText("Selection example", { exact: true })
  ).toBeVisible();
  await page.getByText("Selection example", { exact: true }).click();

  await expect(page).toHaveURL(/\/examples\/selection$/);
  await expect(
    page
      .getByTestId("example-preview-panel")
      .getByRole("heading", { name: "Selection example" })
  ).toBeVisible();
});
