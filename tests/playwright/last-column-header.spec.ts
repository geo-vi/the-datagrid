import { expect, test, type Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 800 });
  await page.goto("/compat/last-column-header");
});

function adviceHeader(page: Page, testId: string) {
  return page
    .getByTestId(testId)
    .locator('[data-slot="grid-header-cell"][data-column-id="advice"]');
}

test("fits a widened last column inside the grid", async ({ page }) => {
  await expect(adviceHeader(page, "last-column-header-block")).toBeVisible();

  const overflow = await page
    .getByTestId("last-column-header-block")
    .locator('[data-slot="scroll-area-viewport"]')
    .evaluate((element) => element.scrollWidth - element.clientWidth);
  expect(overflow).toBe(0);
});

test("does not widen a flex host that sizes to its content", async ({
  page,
}) => {
  await expect(adviceHeader(page, "last-column-header-flex")).toBeVisible();

  // The loop grew the page every frame, so a second is long enough to see it.
  await page.waitForTimeout(1000);

  const pageWidth = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(pageWidth.scrollWidth).toBeLessThanOrEqual(pageWidth.clientWidth);
});
