import { expect, test } from "@playwright/test";

test.describe("allowMobileTransform", () => {
  test("defaults to the table layout on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/examples/basic");
    await expect(page.locator(".tdg-root")).toHaveAttribute(
      "data-layout",
      "table"
    );
  });

  test("keeps the table layout on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/examples/mobile-transform");
    const grid = page.locator(".tdg-root");
    await expect(grid).toHaveAttribute("data-layout", "table");
    await expect(
      page.getByRole("columnheader", { name: /^Account Resize/ })
    ).toBeVisible();
  });

  test("renders, searches, virtualizes, and preserves actions on mobile", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/examples/mobile-transform");
    const grid = page.locator(".tdg-root");
    await expect(grid).toHaveAttribute("data-layout", "mobile-list");
    await expect(page.getByRole("columnheader")).toHaveCount(0);
    const mountedRows = await page.locator('[role="listitem"]').count();
    expect(mountedRows).toBeGreaterThan(0);
    expect(mountedRows).toBeLessThan(20);

    const search = page.getByRole("searchbox", { name: "Search all fields" });
    await search.fill("ZX-9001 Maya");
    await expect(page.getByText("Aurora Clinic ZX-9001")).toBeVisible();
    await expect(page.getByText("1 result")).toBeVisible();
    await page.getByRole("button", { name: "View" }).click();
    await expect(page.getByTestId("mobile-action-output")).toHaveText(
      "Opened Aurora Clinic ZX-9001"
    );
  });

  test("uses two metadata columns on iPad widths", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto("/examples/mobile-transform");
    await expect(page.locator(".tdg-root")).toHaveAttribute(
      "data-layout",
      "mobile-list"
    );
    const columns = await page
      .locator(".tdg-mobile dl")
      .first()
      .evaluate((node) => getComputedStyle(node).gridTemplateColumns);
    expect(columns.split(" ")).toHaveLength(2);
  });
});
