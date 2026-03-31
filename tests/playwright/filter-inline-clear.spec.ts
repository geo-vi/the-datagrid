import { expect, test } from "@playwright/test";

test("renders an inline clear button inside the filter cell", async ({
  page,
}) => {
  await page.goto("/examples/basic");

  const firstFilterCell = page.locator(".tdg-filter-cell").first();
  const filterInput = firstFilterCell.getByRole("textbox");

  await filterInput.fill("Row 1");
  await expect(filterInput).toHaveValue("Row 1");

  await expect(firstFilterCell.getByRole("button")).toHaveCount(2);
  await expect(
    firstFilterCell.getByRole("button", { name: "Filter" })
  ).toBeVisible();
  await expect(
    firstFilterCell.getByRole("button", { name: "Clear" })
  ).toBeVisible();

  await firstFilterCell.getByRole("button", { name: "Clear" }).click();
  await expect(filterInput).toHaveValue("");
});
