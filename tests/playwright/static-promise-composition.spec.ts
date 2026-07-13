import { expect, test } from "@playwright/test";

test("composes static Promise search with column filtering and sorting before pagination", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/compat/search-data-source");

  const scope = page.getByTestId("composed-promise-search-scope");
  const grid = scope.locator(".InovuaReactDataGrid.tdg-root");
  const filteredCount = page.getByTestId(
    "search-composed-promise-filtered-count"
  );
  const search = scope.getByRole("searchbox", { name: "Search all fields" });

  await expect(filteredCount).toHaveText("3");
  await expect(
    grid.getByRole("columnheader", { name: "Name" })
  ).toHaveAttribute("aria-sort", "descending");
  await expect(grid.getByText("Delta Engineer", { exact: true })).toBeVisible();

  await search.fill("candidate");

  await expect(filteredCount).toHaveText("2");
  await expect(grid.locator('[data-slot="grid-row"]')).toHaveCount(1);
  await expect(grid.getByText("Beta Candidate", { exact: true })).toBeVisible();
  await expect(grid.getByText("Alpha Candidate", { exact: true })).toHaveCount(
    0
  );
  await expect(grid.getByText("Gamma Candidate", { exact: true })).toHaveCount(
    0
  );

  await search.fill("");
  await expect(filteredCount).toHaveText("3");

  const cityFilter = grid.locator(".tdg-filter-cell").nth(2).locator("input");
  await cityFilter.fill("");

  await expect(filteredCount).toHaveText("4");

  const nameFilter = grid.locator(".tdg-filter-cell").nth(1).locator("input");
  await expect(nameFilter).toHaveValue("a");
  await nameFilter.fill("");
  await expect(filteredCount).toHaveText("40");

  await search.fill("a");
  await expect(filteredCount).toHaveText("4");

  await search.fill("");
  await expect(filteredCount).toHaveText("40");
});

test("composes a Promise array with filtering and sorting before pagination", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/compat/search-data-source");

  const scope = page.getByTestId("composed-promise-array-search-scope");
  const grid = scope.locator(".InovuaReactDataGrid.tdg-root");
  const filteredCount = page.getByTestId(
    "search-composed-promise-array-filtered-count"
  );
  const search = scope.getByRole("searchbox", { name: "Search all fields" });

  await expect(filteredCount).toHaveText("3");
  await expect(
    grid.getByRole("columnheader", { name: "Name" })
  ).toHaveAttribute("aria-sort", "descending");
  await expect(grid.getByText("Delta Engineer", { exact: true })).toBeVisible();

  await search.fill("candidate");
  await expect(filteredCount).toHaveText("2");
  await expect(grid.locator('[data-slot="grid-row"]')).toHaveCount(1);
  await expect(grid.getByText("Beta Candidate", { exact: true })).toBeVisible();

  await search.fill("");
  await expect(filteredCount).toHaveText("3");

  const cityFilter = grid.locator(".tdg-filter-cell").nth(2).locator("input");
  await cityFilter.fill("");
  await expect(filteredCount).toHaveText("4");
});
