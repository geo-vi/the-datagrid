import { expect, test, type Locator, type Page } from "@playwright/test";

function fixture(page: Page) {
  return page.getByTestId("toolbar-collapsed-column-toggles");
}

function toolbar(scope: Locator) {
  return scope.locator('[data-slot="rdg-toolbar"]');
}

function columnMenu(scope: Locator) {
  return scope.getByRole("menu", { name: "Visible column toggles" });
}

function columnOption(scope: Locator, columnId: string) {
  return scope.locator(
    `[role="menuitemcheckbox"][data-column-id="${columnId}"]`
  );
}

function columnHeader(scope: Locator, columnId: string) {
  return scope.locator(
    `[data-slot="grid-header-cell"][data-column-id="${columnId}"]`
  );
}

test.beforeEach(async ({ page }) => {
  await page.goto("/compat/toolbar");
});

test("collapses every hideable column toggle into one persistent menu", async ({
  page,
}) => {
  const scope = fixture(page);
  const bar = toolbar(scope);
  const trigger = bar.getByRole("button", { name: "Choose columns" });

  await expect(bar.locator('[data-slot="rdg-column-toggle-list"]')).toHaveCount(
    0
  );
  await expect(trigger).toHaveAttribute("aria-haspopup", "menu");
  await expect(trigger).toHaveAttribute("aria-expanded", "false");

  await trigger.click();

  const menu = columnMenu(bar);
  const options = menu.getByRole("menuitemcheckbox");
  await expect(menu).toBeVisible();
  await expect(options).toHaveCount(3);
  await expect(options).toHaveText(["ID", "Name", "City"]);
  await expect(trigger).toHaveAttribute("aria-expanded", "true");

  const city = columnOption(menu, "city");
  await expect(city).toHaveAttribute("aria-checked", "false");
  await expect(columnHeader(scope, "city")).toBeHidden();

  await city.click();
  await expect(menu).toBeVisible();
  await expect(city).toHaveAttribute("aria-checked", "true");
  await expect(columnHeader(scope, "city")).toBeVisible();

  await columnOption(menu, "name").click();
  await columnOption(menu, "city").click();
  await expect(columnOption(menu, "id")).toBeDisabled();
  await expect(columnHeader(scope, "id")).toBeVisible();

  await city.press("Escape");
  await expect(menu).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test("supports menu keyboard navigation and click-outside dismissal", async ({
  page,
}) => {
  const scope = fixture(page);
  const bar = toolbar(scope);
  const trigger = bar.getByRole("button", { name: "Choose columns" });

  await trigger.focus();
  await trigger.press("ArrowDown");

  const menu = columnMenu(bar);
  const id = columnOption(menu, "id");
  const city = columnOption(menu, "city");
  await expect(menu).toBeVisible();
  await expect(id).toBeFocused();

  await id.press("ArrowUp");
  await expect(city).toBeFocused();
  await city.press("Home");
  await expect(id).toBeFocused();
  await id.press("End");
  await expect(city).toBeFocused();

  await page.getByRole("heading", { name: "Dropdown columns" }).click();
  await expect(menu).toHaveCount(0);
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
});

test("keeps the column menu inside a narrow viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  const scope = fixture(page);
  const trigger = toolbar(scope).getByRole("button", {
    name: "Choose columns",
  });
  await trigger.click();

  const menu = columnMenu(scope);
  await expect(menu).toBeVisible();

  const menuBox = await menu.boundingBox();
  expect(menuBox).not.toBeNull();
  expect(menuBox!.x).toBeGreaterThanOrEqual(0);
  expect(menuBox!.x + menuBox!.width).toBeLessThanOrEqual(390);

  const overflow = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);
});
