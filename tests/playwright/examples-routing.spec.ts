import { expect, test } from "@playwright/test";

test("navigates between the dedicated example pages", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Example catalog" })
  ).toBeVisible();
  await expect(page.locator(".InovuaReactDataGrid.tdg-root")).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Open example" }).first()
  ).toBeVisible();

  const basicCard = page.locator("article", {
    has: page.getByRole("heading", { name: "Basic example" }),
  });
  await expect(basicCard).toBeVisible();
  await expect(
    basicCard.getByText(
      "The compact baseline grid used by the visual regression suite."
    )
  ).toBeVisible();

  await basicCard.getByRole("link", { name: "Open example" }).click();
  await expect(page).toHaveURL(/\/basic$/);
  await expect(page.getByTestId("example-preview-panel")).toBeVisible();
  await expect(page.getByTestId("example-source-panel")).toBeVisible();
  await expect(
    page.getByText("examples/src/BasicGridExample.tsx")
  ).toBeVisible();

  await page.getByRole("link", { name: "Selection" }).click();
  await expect(page).toHaveURL(/\/selection$/);
  await expect(
    page
      .getByTestId("example-preview-panel")
      .getByRole("heading", { name: "Selection example" })
  ).toBeVisible();
  await expect(
    page.getByText("examples/src/SelectionGridExample.tsx")
  ).toBeVisible();

  await page.getByRole("link", { name: "Users" }).click();
  await expect(page).toHaveURL(/\/users$/);
  await expect(
    page
      .getByTestId("example-preview-panel")
      .getByRole("heading", { name: "Users-style example" })
  ).toBeVisible();
  await expect(
    page.getByText("examples/src/UsersGridExample.tsx")
  ).toBeVisible();
});
