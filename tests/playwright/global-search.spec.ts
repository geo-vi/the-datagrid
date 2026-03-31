import { expect, test } from "@playwright/test";

test("searches docs keys and example content from the shared header", async ({
  page,
}) => {
  await page.goto("/examples");

  await expect(
    page.getByRole("button", { name: "Open global search" })
  ).toBeVisible();

  await page.getByRole("button", { name: "Open global search" }).click();
  const searchInput = page.getByRole("combobox", {
    name: "Global search input",
  });
  await expect(searchInput).toBeVisible();
  await expect
    .poll(async () => {
      return page.evaluate(() => {
        const content = document.querySelector('[data-slot="dialog-content"]');
        const overlay = document.querySelector('[data-slot="dialog-overlay"]');

        if (!content || !overlay) {
          return null;
        }

        const contentRect = content.getBoundingClientRect();
        const contentStyle = getComputedStyle(content);
        const overlayStyle = getComputedStyle(overlay);

        return (
          contentStyle.position === "fixed" &&
          overlayStyle.position === "fixed" &&
          Math.abs(
            Math.round(contentRect.left + contentRect.width / 2) -
              Math.round(window.innerWidth / 2)
          ) <= 4 &&
          Math.abs(
            Math.round(contentRect.top + contentRect.height / 2) -
              Math.round(window.innerHeight / 2)
          ) <= 4
        );
      });
    })
    .toBe(true);
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
