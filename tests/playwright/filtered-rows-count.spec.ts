import { expect, test, type Page } from "@playwright/test";

async function expectSingleSettledObserverCall(
  page: Page,
  expectedRows: number
) {
  const settledCount = page.getByTestId("filtered-callback-settled-count");
  await expect(settledCount).toHaveText(/^\d+$/);

  const calls = Number((await settledCount.textContent())?.trim());
  expect(calls).toBe(1);
  await expect(page.getByTestId("filtered-reported-row-count")).toHaveText(
    String(expectedRows)
  );
}

test.describe("filteredRowsCount callback identity", () => {
  test("does not reload when a desktop observer is recreated", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/compat/filtered-rows-count?data-source=remote");

    await expect(page.locator(".tdg-root")).toHaveAttribute(
      "data-layout",
      "table"
    );
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (
              window as typeof window & {
                __tdgFilteredDataSourceCalls?: number;
              }
            ).__tdgFilteredDataSourceCalls ?? 0
        )
      )
      .toBeGreaterThan(0);
    const callsBeforeChange = await page.evaluate(
      () =>
        (
          window as typeof window & {
            __tdgFilteredDataSourceCalls?: number;
          }
        ).__tdgFilteredDataSourceCalls ?? 0
    );
    await page.getByTestId("arm-filtered-callback").click();
    await page.getByTestId("toggle-filter-feedback").click();

    await expectSingleSettledObserverCall(page, 2);
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (
              window as typeof window & {
                __tdgFilteredDataSourceCalls?: number;
              }
            ).__tdgFilteredDataSourceCalls ?? 0
        )
      )
      .toBe(callsBeforeChange + 1);
    await page.waitForTimeout(350);
    expect(
      await page.evaluate(
        () =>
          (
            window as typeof window & {
              __tdgFilteredDataSourceCalls?: number;
            }
          ).__tdgFilteredDataSourceCalls ?? 0
      )
    ).toBe(callsBeforeChange + 1);
  });

  test("does not refilter when a mobile observer is recreated", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/compat/filtered-rows-count");

    const grid = page.locator(".tdg-root");
    await expect(grid).toHaveAttribute("data-layout", "mobile-list");
    await expect(grid.getByText("3 results", { exact: true })).toBeVisible();

    await page.getByTestId("arm-filtered-callback").click();
    await grid
      .getByRole("searchbox", { name: "Search all fields" })
      .fill("Grace");
    await expect(grid.getByText("1 result", { exact: true })).toBeVisible();

    await expectSingleSettledObserverCall(page, 1);
  });
});
