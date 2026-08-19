import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * The apiRef demo renders no toolbar, so every control here proves the ref
 * crossed the wrapper boundary. What needs no browser stays in
 * tests/engine/toolbar-api.test.ts.
 */
function demo(page: Page) {
  return page.getByTestId("toolbar-api-demo");
}

function controls(scope: Locator) {
  return scope.getByTestId("toolbar-api-controls");
}

function grid(scope: Locator) {
  return scope.getByTestId("toolbar-api-viewport");
}

test.beforeEach(async ({ page }) => {
  await page.goto("/examples/toolbar");
});

test("drives the grid from buttons outside the provider", async ({ page }) => {
  const scope = demo(page);
  const panel = controls(scope);
  const viewport = grid(scope);
  const customerHeader = viewport.locator(
    '[data-slot="grid-header-cell"][data-column-id="customer"]'
  );
  const customerToggle = panel.getByRole("button", {
    name: "Customer",
    exact: true,
  });

  await expect(scope.locator('[data-slot="rdg-toolbar"]')).toHaveCount(0);
  await expect(customerHeader).toBeVisible();
  await expect(customerToggle).toHaveAttribute("aria-pressed", "true");

  await customerToggle.click();

  await expect(customerHeader).toHaveCount(0);
  // The button follows the grid, so the subscription runs both ways.
  await expect(customerToggle).toHaveAttribute("aria-pressed", "false");

  const filterToggle = panel.getByRole("button", { name: "Filter row" });
  await expect(viewport.locator(".tdg-filter-cell").first()).toBeVisible();

  await filterToggle.click();

  await expect(viewport.locator(".tdg-filter-cell")).toHaveCount(0);
  await expect(filterToggle).toHaveText("Filter row off");
});

test("exports from outside the provider, named by exportDefaults", async ({
  page,
}) => {
  const panel = controls(demo(page));
  const notice = demo(page).getByTestId("toolbar-api-export-ok");

  const [csv] = await Promise.all([
    page.waitForEvent("download"),
    panel.getByRole("button", { name: "Export CSV" }).click(),
  ]);

  // Neither button names a file: `orders` comes from exportDefaults.
  expect(csv.suggestedFilename()).toBe("orders.csv");
  await expect(notice).toContainText("Wrote 36 rows to orders.csv");

  // The xlsx writer is a lazy import of an optional peer; exercise that path
  // through the API too.
  const [xlsx] = await Promise.all([
    page.waitForEvent("download"),
    panel.getByRole("button", { name: "Export all as Excel" }).click(),
  ]);

  expect(xlsx.suggestedFilename()).toBe("orders.xlsx");
  await expect(notice).toContainText("Wrote 36 rows to orders.xlsx");
});
