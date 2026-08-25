import { expect, test, type Locator, type Page } from "@playwright/test";

// The exported controls, laid out by the page instead of by RDGToolbar. What
// can break here and nowhere else: the surface has to carry the stylesheet's
// scope (or every control arrives unstyled), the menus have to portal into it
// (or they do), and each control has to reach the same store as the built-in
// toolbar.

function demo(page: Page): Locator {
  return page.getByTestId("toolbar-composed-demo");
}

function bar(page: Page): Locator {
  return page.getByTestId("toolbar-composed-bar");
}

async function openToolbarExample(page: Page): Promise<void> {
  await page.goto("/examples/toolbar");
  await demo(page).scrollIntoViewIfNeeded();
  await bar(page).waitFor();
}

test("renders the controls in the page's own order", async ({ page }) => {
  await openToolbarExample(page);

  const slots = await bar(page)
    .locator("[data-slot]")
    .evaluateAll((elements) =>
      elements
        .map((element) => element.getAttribute("data-slot"))
        .filter(
          (slot) =>
            slot === "rdg-toolbar-filter-toggle" ||
            slot === "rdg-toolbar-clear-filters" ||
            slot === "rdg-toolbar-column-toggle-wrapper" ||
            slot === "rdg-toolbar-export"
        )
    );

  expect(slots).toEqual([
    "rdg-toolbar-filter-toggle",
    "rdg-toolbar-clear-filters",
    "rdg-toolbar-column-toggle-wrapper",
    "rdg-toolbar-export",
  ]);

  // Labels come from the page, not from RDGToolbar's defaults. The grid starts
  // with its filter row shown, so the toggle offers to hide it.
  await expect(
    bar(page).locator('[data-slot="rdg-toolbar-filter-toggle"]')
  ).toHaveText("Filters off");
  await expect(
    bar(page).locator('[data-slot="rdg-toolbar-clear-filters"]')
  ).toHaveText("Reset");
  await expect(
    bar(page).locator('[data-slot="rdg-toolbar-column-toggle-trigger"]')
  ).toHaveText("Fields");
  await expect(
    bar(page).locator('[data-slot="rdg-toolbar-export"]')
  ).toHaveText("Download CSV");
});

test("the bare surface keeps the scope and drops the card", async ({
  page,
}) => {
  await openToolbarExample(page);
  const surface = demo(page).locator('[data-slot="rdg-toolbar-surface"]');

  expect(
    await surface.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        hasScope: element.classList.contains("tdg-toolbar-root"),
        theme: element.getAttribute("data-theme"),
        padding: style.paddingTop,
        borderWidth: style.borderTopWidth,
        background: style.backgroundColor,
        shadow: style.boxShadow,
      };
    })
  ).toMatchObject({
    hasScope: true,
    theme: "default",
    padding: "0px",
    borderWidth: "0px",
    background: "rgba(0, 0, 0, 0)",
    shadow: "none",
  });

  // The scope is what styles the controls: a bare surface must still do it.
  const exportButton = bar(page).locator('[data-slot="rdg-toolbar-export"]');
  expect(
    await exportButton.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        display: style.display,
        radius: style.borderTopLeftRadius,
        borderWidth: style.borderTopWidth,
      };
    })
  ).toMatchObject({ display: "flex", borderWidth: "1px" });
});

test("the column dropdown portals into the surface and drives the grid", async ({
  page,
}) => {
  await openToolbarExample(page);
  const viewport = demo(page).getByTestId("toolbar-composed-viewport");
  const region = viewport.locator(
    '[data-slot="grid-header-cell"][data-column-id="region"]'
  );
  await expect(region).toBeVisible();

  await bar(page)
    .locator('[data-slot="rdg-toolbar-column-toggle-trigger"]')
    .click();

  const menu = page.locator('[data-slot="rdg-toolbar-column-toggle-menu"]');
  await expect(menu).toBeVisible();
  // Unstyled menus are what portalling to the body costs here.
  expect(
    await menu.evaluate((element) =>
      Boolean(element.closest('[data-slot="rdg-toolbar-surface"]'))
    )
  ).toBe(true);

  await menu.locator('[data-column-id="region"]').click();
  await expect(region).toHaveCount(0);

  await page.keyboard.press("Escape");
  await expect(menu).toHaveCount(0);
});

test("the filter toggle and clear button share the grid's filter state", async ({
  page,
}) => {
  await openToolbarExample(page);
  const viewport = demo(page).getByTestId("toolbar-composed-viewport");
  const filterRow = viewport.locator(".tdg-filter-row");
  const filterToggle = bar(page).locator(
    '[data-slot="rdg-toolbar-filter-toggle"]'
  );
  const clearFilters = bar(page).locator(
    '[data-slot="rdg-toolbar-clear-filters"]'
  );

  // The example's defaultFilterValue starts the row shown but nothing filtered.
  await expect(filterRow).toBeVisible();
  await expect(clearFilters).toBeDisabled();

  await filterToggle.click();
  await expect(filterRow).toHaveCount(0);
  await expect(filterToggle).toHaveText("Filters");

  await filterToggle.click();
  await expect(filterRow).toBeVisible();

  const customerFilter = filterRow
    .locator('[data-column-id="customer"]')
    .getByRole("textbox");
  await customerFilter.fill("Ada");
  await expect(clearFilters).toBeEnabled();

  await clearFilters.click();
  await expect(customerFilter).toHaveValue("");
  await expect(clearFilters).toBeDisabled();
});

test("the export button uses the provider's export defaults", async ({
  page,
}) => {
  await openToolbarExample(page);

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    bar(page).locator('[data-slot="rdg-toolbar-export"]').click(),
  ]);

  expect(download.suggestedFilename()).toBe("orders.csv");
});
