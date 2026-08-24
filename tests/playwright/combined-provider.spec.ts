import { expect, test, type Locator, type Page } from "@playwright/test";

const COMPAT_ROUTE = "/compat/toolbar";

function combinedScope(page: Page, target: "direct" | "nested") {
  return page.getByTestId(`combined-provider-${target}-target`);
}

function gridIn(scope: Locator) {
  return scope.locator(".InovuaReactDataGrid.tdg-root");
}

function visibilityToolbar(scope: Locator) {
  return scope.locator('[data-slot="rdg-toolbar"]');
}

function columnToggle(scope: Locator, columnId: string) {
  return visibilityToolbar(scope).locator(
    `[data-slot="rdg-column-toggle"][data-column-id="${columnId}"]`
  );
}

function columnHeader(grid: Locator, columnId: string) {
  return grid.locator(
    `[data-slot="grid-header-cell"][data-column-id="${columnId}"]`
  );
}

function mountedColumnCells(grid: Locator, columnId: string) {
  return grid.locator(`[data-slot="grid-row"] [data-column-id="${columnId}"]`);
}

test.describe("combined provider", () => {
  test("direct targeting searches and changes the same grid column model", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(COMPAT_ROUTE);

    const scope = combinedScope(page, "direct");
    const grid = gridIn(scope);
    const rows = grid.locator('[data-slot="grid-row"]');
    const search = scope.getByRole("searchbox", {
      name: "Search direct combined grid",
    });
    const cityToggle = columnToggle(scope, "city");

    await expect(grid).toHaveCount(1);
    await expect(visibilityToolbar(scope)).toHaveCount(1);
    await expect(search).toHaveCount(1);
    await expect(rows).toHaveCount(3);
    await expect(columnHeader(grid, "city")).toBeVisible();
    await expect(cityToggle).toHaveAttribute("aria-pressed", "true");

    await search.fill("Grace Hopper");

    await expect(rows).toHaveCount(1);
    await expect(grid.getByText("Grace Hopper", { exact: true })).toBeVisible();
    await expect(grid.getByText("Ada Lovelace", { exact: true })).toHaveCount(
      0
    );

    await cityToggle.click();

    await expect(cityToggle).toHaveAttribute("aria-pressed", "false");
    await expect(columnHeader(grid, "city")).toHaveCount(0);
    await expect(mountedColumnCells(grid, "city")).toHaveCount(0);
    await expect(rows).toHaveCount(1);

    await search.fill("Paris");

    await expect(rows).toHaveCount(1);
    await expect(
      grid.getByText("Katherine Johnson", { exact: true })
    ).toBeVisible();
    await expect(grid.getByText("Paris", { exact: true })).toHaveCount(0);

    await cityToggle.click();

    await expect(cityToggle).toHaveAttribute("aria-pressed", "true");
    await expect(columnHeader(grid, "city")).toBeVisible();
    await expect(grid.getByText("Paris", { exact: true })).toBeVisible();
  });

  test("an explicit target works with controls imported from legacy entries", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(COMPAT_ROUTE);

    const scope = combinedScope(page, "nested");
    const grid = gridIn(scope);
    const rows = grid.locator('[data-slot="grid-row"]');
    const search = scope.getByRole("searchbox", {
      name: "Search nested combined grid",
    });
    const roleToggle = columnToggle(scope, "role");

    await expect(grid).toHaveCount(1);
    await expect(visibilityToolbar(scope)).toHaveCount(1);
    await expect(search).toHaveCount(1);
    await expect(search).toHaveValue("London");
    await expect(rows).toHaveCount(1);
    await expect(grid.getByText("Ada Lovelace", { exact: true })).toBeVisible();
    await expect(columnHeader(grid, "role")).toBeVisible();

    await roleToggle.click();

    await expect(roleToggle).toHaveAttribute("aria-pressed", "false");
    await expect(columnHeader(grid, "role")).toHaveCount(0);
    await expect(mountedColumnCells(grid, "role")).toHaveCount(0);
    await expect(rows).toHaveCount(1);

    await search.fill("");

    await expect(rows).toHaveCount(3);
    await expect(columnHeader(grid, "name")).toBeVisible();
    await expect(columnHeader(grid, "city")).toBeVisible();
  });

  test("mobile uses the external search and visibility controls as the sole pickers", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(COMPAT_ROUTE);

    const scope = combinedScope(page, "direct");
    const grid = gridIn(scope);
    const toolbar = visibilityToolbar(scope);
    const search = scope.getByRole("searchbox", {
      name: "Search direct combined grid",
    });
    const cityToggle = columnToggle(scope, "city");
    const firstCard = grid.locator('article[data-row-id="combined-1"]');

    await expect(grid).toHaveCount(1);
    await expect(grid).toHaveAttribute("data-layout", "mobile-list");
    await expect(search).toHaveCount(1);
    await expect(scope.getByRole("searchbox")).toHaveCount(1);
    await expect(toolbar).toHaveCount(1);
    await expect(
      toolbar.locator('[data-slot="rdg-column-toggle-list"]')
    ).toHaveCount(0);
    const columnTrigger = toolbar.getByRole("button", {
      name: "Columns",
      exact: true,
    });
    await expect(columnTrigger).toBeVisible();
    await expect(
      grid.getByRole("button", { name: "Display columns" })
    ).toHaveCount(0);
    await expect(firstCard).toBeVisible();
    await expect(firstCard.getByText("City", { exact: true })).toBeVisible();
    await expect(firstCard.getByText("London", { exact: true })).toBeVisible();

    await columnTrigger.click();
    await expect(cityToggle).toHaveAttribute("aria-checked", "true");
    await cityToggle.click();

    await expect(cityToggle).toHaveAttribute("aria-checked", "false");
    await expect(firstCard.getByText("City", { exact: true })).toHaveCount(0);
    await expect(firstCard.getByText("London", { exact: true })).toHaveCount(0);

    // Typing in the search box moves focus out of the menu, which dismisses it
    // the way any menu does; the picker has to be reopened to toggle again.
    await search.fill("Paris");
    await expect(cityToggle).toHaveCount(0);

    const parisCard = grid.locator('article[data-row-id="combined-3"]');
    await expect(grid.locator("article[data-row-id]")).toHaveCount(1);
    await expect(parisCard).toBeVisible();
    await expect(
      parisCard.getByText("Katherine Johnson", { exact: true })
    ).toBeVisible();
    await expect(parisCard.getByText("City", { exact: true })).toHaveCount(0);
    await expect(parisCard.getByText("Paris", { exact: true })).toHaveCount(0);

    await columnTrigger.click();
    await cityToggle.click();

    await expect(cityToggle).toHaveAttribute("aria-checked", "true");
    await expect(parisCard.getByText("City", { exact: true })).toBeVisible();
    await expect(parisCard.getByText("Paris", { exact: true })).toBeVisible();
  });
});
