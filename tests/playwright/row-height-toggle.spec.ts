import { expect, test, type Page } from "@playwright/test";

// The fixture renders 100,000 natural-height rows with
// `minRowHeight={condensed ? 30 : 55}`. A toggle changes the height of every
// row, which used to resize the row virtualizer once per row.
const TOGGLE_BUDGET_MS = 2_000;
const ANCHOR_ROW_INDEX = 50_000;

const grid = (page: Page) => page.getByTestId("row-height-toggle-grid");
const viewport = (page: Page) =>
  grid(page).locator('[data-slot="scroll-area-viewport"]').first();

async function topVisibleRow(page: Page) {
  return grid(page).evaluate((root) => {
    const headerBottom =
      root
        .querySelector('[data-slot="grid-header-viewport"]')
        ?.getBoundingClientRect().bottom ?? root.getBoundingClientRect().top;
    const rows = Array.from(
      root.querySelectorAll<HTMLElement>('[data-slot="grid-row"][data-index]')
    )
      .map((row) => ({
        index: Number(row.dataset.index),
        rect: row.getBoundingClientRect(),
      }))
      .filter(({ rect }) => rect.bottom > headerBottom + 1)
      .sort((first, second) => first.index - second.index);
    const top = rows[0];
    if (!top) throw new Error("no rendered rows");
    return { index: top.index, height: Math.round(top.rect.height) };
  });
}

// Clicks the toggle and waits for the next two frames, so the result covers
// the render, the layout effects and the paint that the click causes.
async function toggleAndTime(page: Page) {
  return page.getByTestId("row-height-toggle").evaluate(
    (button) =>
      new Promise<number>((resolve) => {
        const start = performance.now();
        (button as HTMLButtonElement).click();
        requestAnimationFrame(() =>
          requestAnimationFrame(() => resolve(performance.now() - start))
        );
      })
  );
}

test("toggles minRowHeight on 100k rows quickly and keeps the rows in view", async ({
  page,
}) => {
  await page.goto("/compat/row-height-toggle");
  await expect(
    grid(page).locator('[data-slot="grid-row"][data-index="0"]')
  ).toBeVisible();

  await viewport(page).evaluate((element, rowIndex) => {
    element.scrollTop = rowIndex * 55;
  }, ANCHOR_ROW_INDEX);
  await expect
    .poll(async () => (await topVisibleRow(page)).index)
    .toBeGreaterThan(ANCHOR_ROW_INDEX - 50);
  const comfortable = await topVisibleRow(page);
  expect(comfortable.height).toBeGreaterThanOrEqual(55);

  const condenseMs = await toggleAndTime(page);
  expect(condenseMs).toBeLessThan(TOGGLE_BUDGET_MS);
  await expect(page.getByTestId("row-height-toggle")).toHaveText("Condensed");
  await expect
    .poll(async () => (await topVisibleRow(page)).height)
    .toBeLessThan(55);
  const condensed = await topVisibleRow(page);
  expect(Math.abs(condensed.index - comfortable.index)).toBeLessThanOrEqual(1);

  const expandMs = await toggleAndTime(page);
  expect(expandMs).toBeLessThan(TOGGLE_BUDGET_MS);
  await expect(page.getByTestId("row-height-toggle")).toHaveText("Comfortable");
  await expect
    .poll(async () => (await topVisibleRow(page)).height)
    .toBeGreaterThanOrEqual(55);
  const expanded = await topVisibleRow(page);
  expect(Math.abs(expanded.index - comfortable.index)).toBeLessThanOrEqual(1);
});
