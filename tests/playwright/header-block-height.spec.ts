import { expect, test, type Page } from "@playwright/test";

// `headerHeight` sizes the header rows, but a table row only treats it as a
// floor: a header whose content outgrows it makes the row taller. The header is
// a sticky, zero-height layer painted over the body, so everything below it
// reserves space from the grid's own offset -- while that offset stayed
// nominal, a grown header covered the first row instead of pushing it down.
//
// Measured against rendered geometry because that is the only place the defect
// exists: every number in the props is correct either way.

// The reserved offset is ceiled, so the first row may start a fraction below
// the header, never above it.
const MAX_DRIFT_PX = 1;
// Comfortably more than the subpixel drift, comfortably less than the ~42px the
// fixture's extra header lines add.
const MIN_HEADER_GROWTH_PX = 20;

type HeaderGeometry = {
  headerHeight: number;
  blockHeight: string;
  gap: number;
};

async function readGeometry(
  page: Page,
  testId: string
): Promise<HeaderGeometry> {
  return page.getByTestId(testId).evaluate((element) => {
    const grid = element.querySelector<HTMLElement>(".tdg-root");
    const headerViewport = grid?.querySelector<HTMLElement>(
      ".tdg-header-viewport"
    );
    const firstRow = grid?.querySelector<HTMLElement>('[data-slot="grid-row"]');

    if (!grid || !headerViewport || !firstRow) {
      throw new Error("Expected a rendered header and a first data row");
    }

    return {
      headerHeight: headerViewport.getBoundingClientRect().height,
      blockHeight: getComputedStyle(grid)
        .getPropertyValue("--tdg-header-block-height")
        .trim(),
      gap:
        firstRow.getBoundingClientRect().top -
        headerViewport.getBoundingClientRect().bottom,
    };
  });
}

function expectFirstRowClearsHeader(geometry: HeaderGeometry) {
  expect(geometry.blockHeight).toBe(`${Math.ceil(geometry.headerHeight)}px`);
  expect(geometry.gap).toBeGreaterThanOrEqual(0);
  expect(geometry.gap).toBeLessThanOrEqual(MAX_DRIFT_PX);
}

// The plain grid reserves the offset with a spacer row; the virtualized one
// feeds it to the virtualizer as a scroll margin. Two code paths, one offset.
const GRIDS = ["tall-header-grid", "tall-header-virtualized-grid"];

test("the body reserves the header's rendered height, not its nominal one", async ({
  page,
}) => {
  await page.goto("/compat/tall-header");
  await expect(page.getByTestId("tall-header-scenario")).toBeVisible();

  const nominal: Record<string, HeaderGeometry> = {};
  for (const testId of GRIDS) {
    nominal[testId] = await readGeometry(page, testId);
    expectFirstRowClearsHeader(nominal[testId]!);
  }

  await page.getByTestId("toggle-tall-header").click();

  for (const testId of GRIDS) {
    await expect
      .poll(async () => (await readGeometry(page, testId)).headerHeight)
      .toBeGreaterThanOrEqual(
        nominal[testId]!.headerHeight + MIN_HEADER_GROWTH_PX
      );
    expectFirstRowClearsHeader(await readGeometry(page, testId));
  }

  // And back: a header that shrinks must give the space back, not keep the
  // body pushed down by a stale measurement.
  await page.getByTestId("toggle-tall-header").click();

  for (const testId of GRIDS) {
    await expect
      .poll(async () => (await readGeometry(page, testId)).headerHeight)
      .toBe(nominal[testId]!.headerHeight);
    expectFirstRowClearsHeader(await readGeometry(page, testId));
  }
});
