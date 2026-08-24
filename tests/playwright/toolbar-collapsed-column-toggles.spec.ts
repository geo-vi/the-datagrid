import { expect, test, type Locator, type Page } from "@playwright/test";

function fixture(page: Page) {
  return page.getByTestId("toolbar-collapsed-column-toggles");
}

function autoFixture(page: Page) {
  return page.getByTestId("toolbar-nested-target");
}

function mobileInlineFixture(page: Page) {
  return page.getByTestId("toolbar-mobile-inline-column-toggles");
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

test("paints the menu with the toolbar's own tokens", async ({ page }) => {
  const scope = fixture(page);
  const bar = toolbar(scope);
  await bar.getByRole("button", { name: "Choose columns" }).click();

  const menu = columnMenu(bar);
  const firstOption = menu.getByRole("menuitemcheckbox").first();
  await expect(
    menu.locator('[data-slot="rdg-toolbar-column-toggle-menu-label"]')
  ).toHaveText("Choose columns");
  await expect(
    menu.locator('[data-slot="rdg-toolbar-column-toggle-menu-separator"]')
  ).toBeVisible();

  // The menu portals, and the toolbar's stylesheet is scoped to its root: it
  // lands inside that root, or it arrives with none of the paint below.
  await expect(
    menu.locator("xpath=ancestor::*[@data-slot='rdg-toolbar']")
  ).toHaveCount(1);
  await expect
    .poll(() => menu.evaluate((element) => getComputedStyle(element).opacity))
    .toBe("1");

  const geometry = await Promise.all(
    [menu, firstOption].map((locator) =>
      locator.evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          background: style.backgroundColor,
          borderRadius: Number.parseFloat(style.borderRadius),
          boxShadow: style.boxShadow,
          height: Number.parseFloat(style.height),
          lineHeight: Number.parseFloat(style.lineHeight),
          position: style.position,
          width: Number.parseFloat(style.width),
        };
      })
    )
  );
  const [menuStyle, itemStyle] = geometry;

  expect(menuStyle.width).toBeGreaterThanOrEqual(192);
  expect(menuStyle.borderRadius).toBeGreaterThanOrEqual(6);
  expect(menuStyle.background).not.toBe("rgba(0, 0, 0, 0)");
  expect(menuStyle.boxShadow).not.toBe("none");
  // Placement belongs to the menu's popper, which moves the wrapper around it.
  expect(menuStyle.position).toBe("static");
  expect(itemStyle.height).toBeGreaterThanOrEqual(32);
  expect(itemStyle.lineHeight).toBeGreaterThanOrEqual(20);
});

test("lines every column label up behind its tick", async ({ page }) => {
  const scope = fixture(page);
  const bar = toolbar(scope);
  await bar.getByRole("button", { name: "Choose columns" }).click();

  const menu = columnMenu(bar);
  // `id` is visible and `city` is not, so these are a checked and an unchecked
  // row: the indicator holds its width either way, as the grid's own menu does.
  const [checked, unchecked] = await Promise.all(
    ["id", "city"].map((columnId) =>
      columnOption(menu, columnId)
        .locator('[data-slot="rdg-column-toggle-label"]')
        .boundingBox()
    )
  );

  expect(checked!.x).toBeCloseTo(unchecked!.x, 0);

  /*
   * The tick keeps its own space in the row rather than being nudged across it.
   * The menu pairs `absolute` with a `left` inset on that cell, so a positioned
   * cell would drift 8px to the right - swallowing the gap after the tick and
   * doubling the one before it.
   */
  const [row, tick] = await Promise.all([
    columnOption(menu, "id").boundingBox(),
    columnOption(menu, "id")
      .locator(".tdg-dropdown-indicator-cell")
      .boundingBox(),
  ]);
  expect(tick!.x - row!.x).toBeLessThanOrEqual(8);
  expect(checked!.x - (tick!.x + tick!.width)).toBeGreaterThanOrEqual(6);
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

  const [triggerBox, menuBox] = await Promise.all(
    [trigger, menu].map((locator) => locator.boundingBox())
  );
  expect(menuBox).not.toBeNull();
  // Stacked, the button leads its row, so the menu opens from the same edge.
  await expect(menu).toHaveAttribute("data-align", "start");
  expect(menuBox!.x).toBeCloseTo(triggerBox!.x, 0);
  expect(menuBox!.x + menuBox!.width).toBeLessThanOrEqual(390);

  const overflow = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);
});

test("anchors the column menu to its trigger, not to the toolbar's edge", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 844 });

  const bar = toolbar(fixture(page));
  const trigger = bar.getByRole("button", { name: "Choose columns" });
  await trigger.click();

  const menu = columnMenu(bar);
  await expect(menu).toBeVisible();

  /*
   * This toolbar is more than a thousand pixels wider than either the button or
   * the menu, and the button is not at its edge, so an anchored edge is the only
   * way the two can line up. Which edge is the popper's call - it flips on a
   * collision - so read that back rather than fixing a side here.
   */
  const [triggerBox, menuBox, barBox] = await Promise.all(
    [trigger, menu, bar].map((locator) => locator.boundingBox())
  );
  const alignment = await menu.getAttribute("data-align");

  expect(barBox!.width).toBeGreaterThan(menuBox!.width + 200);
  if (alignment === "end") {
    expect(menuBox!.x + menuBox!.width).toBeCloseTo(
      triggerBox!.x + triggerBox!.width,
      0
    );
  } else {
    expect(menuBox!.x).toBeCloseTo(triggerBox!.x, 0);
  }
});

test("groups the column dropdown with the other action controls", async ({
  page,
}) => {
  // Under 1024px, so the dropdown replaces the inline toggles; wide enough that
  // the four action controls still share one row.
  await page.setViewportSize({ width: 900, height: 844 });
  await page.goto("/examples/toolbar");

  const bar = toolbar(page.getByTestId("toolbar-playground"));
  const actions = bar.locator('[data-slot="rdg-toolbar-actions"]');
  const controls = actions.locator("> *");

  // Leading the actions rather than sitting in the toggle list's slot: one
  // button on a row of its own would otherwise trail a whole body gap behind.
  await expect(bar.locator('[data-slot="rdg-toolbar-body"]')).toHaveAttribute(
    "data-leading",
    "none"
  );
  await expect(controls.first()).toHaveAttribute(
    "data-slot",
    "rdg-toolbar-column-toggle-wrapper"
  );

  const [firstBox, lastBox] = await Promise.all([
    controls.first().boundingBox(),
    controls.last().boundingBox(),
  ]);
  expect(firstBox!.y).toBeCloseTo(lastBox!.y, 0);
});

test("automatically switches between inline and dropdown toggles at 1024px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1025, height: 844 });

  const scope = autoFixture(page);
  const bar = toolbar(scope);
  const inlineList = bar.locator('[data-slot="rdg-column-toggle-list"]');
  const trigger = bar.getByRole("button", { name: "Columns", exact: true });

  await expect(inlineList).toBeVisible();
  await expect(trigger).toHaveCount(0);

  await page.setViewportSize({ width: 1024, height: 844 });
  await expect(inlineList).toHaveCount(0);
  await expect(trigger).toBeVisible();

  await trigger.click();
  const menu = columnMenu(bar);
  const city = columnOption(menu, "city");
  await expect(city).toHaveAttribute("aria-checked", "false");
  await city.click();
  await expect(columnHeader(scope, "city")).toBeVisible();

  await page.setViewportSize({ width: 1025, height: 844 });
  await expect(trigger).toHaveCount(0);
  await expect(inlineList).toBeVisible();
  await expect(inlineList.locator('[data-column-id="city"]')).toHaveAttribute(
    "aria-pressed",
    "true"
  );
});

test("can opt out of automatic mobile column collapsing", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  const bar = toolbar(mobileInlineFixture(page));
  await expect(
    bar.locator('[data-slot="rdg-column-toggle-list"]')
  ).toBeVisible();
  await expect(
    bar.getByRole("button", { name: "Columns", exact: true })
  ).toHaveCount(0);
});
