import { expect, test } from "@playwright/test";

test.describe("optional table search", () => {
  test("searches a virtualized table without adding search UI to plain grids", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/examples/basic");

    const grid = page.locator(".InovuaReactDataGrid.tdg-root").first();
    const search = page.getByRole("searchbox", {
      name: "Search all fields",
    });
    const filteredCount = page.getByTestId("basic-filtered-count");

    await expect(grid).toHaveAttribute("data-layout", "table");
    await expect(search).toBeVisible();
    await expect(search).toHaveAttribute("placeholder", "Search all fields…");
    await expect(filteredCount).toHaveText("1000");

    const initialMountedRows = await grid
      .locator('[data-slot="grid-row"]')
      .count();
    expect(initialMountedRows).toBeGreaterThan(0);
    expect(initialMountedRows).toBeLessThan(100);

    await search.dispatchEvent("compositionstart");
    await search.fill("Row 999 Paris");
    await page.waitForTimeout(225);
    await expect(filteredCount).toHaveText("1000");
    await search.dispatchEvent("compositionend");
    await expect(filteredCount).toHaveText("1");
    await page.getByRole("button", { name: "Clear search" }).click();
    await expect(filteredCount).toHaveText("1000");

    await search.fill("ROW 999 páris");
    await expect(filteredCount).toHaveText("1");
    await expect(grid.getByText("Row 999", { exact: true })).toBeVisible();
    await expect(grid.getByText("Paris", { exact: true })).toBeVisible();
    await expect(grid.locator('[data-slot="grid-row"]')).toHaveCount(1);

    await page.getByRole("button", { name: "Clear search" }).click();
    await expect(search).toHaveValue("");
    await expect(search).toBeFocused();
    await expect(filteredCount).toHaveText("1000");
    await expect
      .poll(() => grid.locator('[data-slot="grid-row"]').count())
      .toBeLessThan(100);

    await page.goto("/examples/columns");
    await expect(
      page.getByRole("searchbox", { name: "Search all fields" })
    ).toHaveCount(0);
  });

  test("supports column-scoped queries and intersects with column filters", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/examples/basic");

    const grid = page.locator(".InovuaReactDataGrid.tdg-root").first();
    const search = page.getByRole("searchbox", {
      name: "Search all fields",
    });
    const filteredCount = page.getByTestId("basic-filtered-count");

    await search.fill("city:paris");
    await expect(filteredCount).toHaveText("250");
    await expect(
      grid.getByText("Paris", { exact: true }).first()
    ).toBeVisible();
    expect(await grid.locator('[data-slot="grid-row"]').count()).toBeLessThan(
      100
    );

    const nameFilter = grid.locator(".tdg-filter-cell").nth(1).locator("input");
    await nameFilter.fill("Row 99");

    await expect(filteredCount).toHaveText("4");
    await expect(grid.getByText("Row 99", { exact: true })).toBeVisible();
    await expect(grid.getByText("Row 991", { exact: true })).toBeVisible();
    await expect(grid.getByText("Row 995", { exact: true })).toBeVisible();
    await expect(grid.getByText("Row 999", { exact: true })).toBeVisible();
    await expect(grid.locator('[data-slot="grid-row"]')).toHaveCount(4);
  });

  test("resets remote pagination, forwards searchValue, and preserves originalData", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/compat/search-data-source");

    const scope = page.getByTestId("remote-search-scope");
    const grid = scope.locator(".InovuaReactDataGrid.tdg-root");
    const search = scope.getByRole("searchbox", {
      name: "Search all fields",
    });
    const callCount = page.getByTestId("search-remote-call-count");

    await expect(page.getByTestId("search-remote-skip")).toHaveText("5");
    await expect(page.getByTestId("search-remote-filtered-count")).toHaveText(
      "18"
    );
    const callsBeforeSearch = Number(await callCount.textContent());

    await search.fill("target");

    await expect(page.getByTestId("search-remote-value")).toHaveText("target");
    await expect(page.getByTestId("search-remote-skip")).toHaveText("0");
    await expect(page.getByTestId("search-remote-filtered-count")).toHaveText(
      "3"
    );
    await expect(page.getByTestId("search-remote-keys")).toHaveText(
      "columnOrder,columns,filterValue,idProperty,limit,searchValue,skip,sortInfo,theme"
    );
    await expect
      .poll(async () => Number(await callCount.textContent()))
      .toBeGreaterThan(callsBeforeSearch);
    await expect(
      grid.getByText("Target account 2", { exact: true })
    ).toBeVisible();

    await grid.getByRole("checkbox").nth(1).click();
    await expect(page.getByTestId("search-original-data-preserved")).toHaveText(
      "true"
    );
  });

  test("searches a static Promise snapshot through an explicit nested target", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/compat/search-data-source");

    const scope = page.getByTestId("promise-search-scope");
    const grid = scope.locator(".InovuaReactDataGrid.tdg-root");
    const search = scope.getByRole("searchbox", {
      name: "Search all fields",
    });
    const mirrorSearch = scope.getByRole("searchbox", {
      name: "Mirror search",
    });

    await expect(page.getByTestId("search-promise-filtered-count")).toHaveText(
      "3"
    );
    await expect(page.getByTestId("search-private-api-leak")).toHaveText(
      "false"
    );
    await expect(
      grid.getByText("Katherine Johnson", { exact: true })
    ).toBeVisible();

    await mirrorSearch.fill("Grace");
    await search.fill("Ada");
    await page.waitForTimeout(300);
    await expect(search).toHaveValue("Ada");
    await expect(mirrorSearch).toHaveValue("Ada");
    await expect(page.getByTestId("search-promise-filtered-count")).toHaveText(
      "1"
    );
    await expect(grid.getByText("Ada Lovelace", { exact: true })).toBeVisible();

    await search.fill("private:analytical");

    await expect(page.getByTestId("search-promise-filtered-count")).toHaveText(
      "1"
    );
    await expect(grid.getByText("Ada Lovelace", { exact: true })).toBeVisible();
    await expect(
      grid.getByText("Katherine Johnson", { exact: true })
    ).toHaveCount(0);

    await search.fill("do-not-find");
    await expect(page.getByTestId("search-promise-filtered-count")).toHaveText(
      "0"
    );
  });

  test("uses the external search bar as the single search source on mobile", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/compat/search-data-source");

    const scope = page.getByTestId("remote-search-scope");
    const grid = scope.locator(".InovuaReactDataGrid.tdg-root");
    const search = scope.getByRole("searchbox", { name: "Search all fields" });

    await expect(grid).toHaveAttribute("data-layout", "mobile-list");
    await expect(search).toHaveCount(1);
    await expect(page.getByTestId("search-remote-filtered-count")).toHaveText(
      "18"
    );

    await search.fill("target");
    await expect(page.getByTestId("search-remote-filtered-count")).toHaveText(
      "3"
    );
    await expect(search).toHaveCount(1);
  });
});
