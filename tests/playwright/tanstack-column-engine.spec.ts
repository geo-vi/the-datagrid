import { expect, test, type Locator, type Page } from "@playwright/test";

const COLUMN_COUNT = 24;
const COLUMN_WIDTH = 140;
const MAX_GEOMETRY_DRIFT = 2;

function header(grid: Locator, columnId: string) {
  return grid.locator(
    `[data-slot="grid-header-cell"][data-column-id="${columnId}"]`
  );
}

function rowCell(grid: Locator, rowId: string, columnId: string) {
  return grid.locator(
    `[data-slot="grid-row"][data-row-id="${rowId}"] [data-column-id="${columnId}"]`
  );
}

async function renderedColumnIds(locator: Locator) {
  return locator.evaluateAll((elements) =>
    elements.map((element) => element.getAttribute("data-column-id"))
  );
}

async function width(locator: Locator) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  return box?.width ?? 0;
}

async function scrollToHorizontalEnd(viewport: Locator) {
  await viewport.evaluate((element) => {
    element.scrollLeft = element.scrollWidth;
    element.dispatchEvent(new Event("scroll", { bubbles: true }));
  });

  await expect
    .poll(() =>
      viewport.evaluate(
        (element) =>
          element.scrollWidth - element.clientWidth - element.scrollLeft
      )
    )
    .toBeLessThanOrEqual(1);
}

function captureRuntimeFailures(page: Page) {
  const failures: string[] = [];
  const renderLoopPattern =
    /too many re-renders|maximum update depth|cannot update a component while rendering/i;

  page.on("pageerror", (error) => failures.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" && renderLoopPattern.test(message.text())) {
      failures.push(message.text());
    }
  });

  return failures;
}

test.describe("TanStack column engine regression contracts", () => {
  test("virtual columns share one real scroll geometry without render feedback", async ({
    page,
  }) => {
    const runtimeFailures = captureRuntimeFailures(page);

    await page.goto("/compat/inovua-pending-parity?scenario=columns-scroll");

    const scope = page.getByTestId("inovua-pending-parity-scenario");
    const grid = scope.locator(".InovuaReactDataGrid.tdg-root").first();
    const viewport = grid.locator('[data-slot="scroll-area-viewport"]');
    const renderedHeaders = grid.locator(
      '[data-slot="grid-header-cell"][data-column-id]'
    );
    const renderedCells = grid.locator(
      '[data-slot="grid-row"][data-row-id="virtual-row-1"] [data-column-id]'
    );

    await expect(grid).toBeVisible();
    await expect(renderedHeaders).not.toHaveCount(0);

    const initialIds = {
      headers: await renderedColumnIds(renderedHeaders),
      cells: await renderedColumnIds(renderedCells),
    };
    expect(initialIds.headers).toEqual(initialIds.cells);
    expect(initialIds.headers.length).toBeLessThan(COLUMN_COUNT);

    const initialScrollGeometry = await viewport.evaluate((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    }));
    expect(initialScrollGeometry.scrollWidth).toBeGreaterThan(
      initialScrollGeometry.clientWidth
    );
    expect(initialScrollGeometry.scrollWidth).toBeGreaterThanOrEqual(
      COLUMN_COUNT * COLUMN_WIDTH
    );
    expect(initialScrollGeometry.scrollWidth).toBeLessThanOrEqual(
      COLUMN_COUNT * COLUMN_WIDTH + COLUMN_COUNT
    );

    await scrollToHorizontalEnd(viewport);

    const lastHeader = header(grid, "col-23");
    const lastCell = rowCell(grid, "virtual-row-1", "col-23");
    await expect(lastHeader).toBeVisible();
    await expect(lastCell).toBeVisible();
    await expect(header(grid, "col-00")).toHaveCount(0);

    const farIds = {
      headers: await renderedColumnIds(renderedHeaders),
      cells: await renderedColumnIds(renderedCells),
    };
    expect(farIds.headers).toEqual(farIds.cells);
    expect(farIds.headers.at(-1)).toBe("col-23");

    const endGeometry = await viewport.evaluate((element) => {
      const viewportRect = element.getBoundingClientRect();
      const lastHeaderElement = document.querySelector<HTMLElement>(
        '[data-slot="grid-header-cell"][data-column-id="col-23"]'
      );
      const lastCellElement = element.querySelector<HTMLElement>(
        '[data-slot="grid-row"][data-row-id="virtual-row-1"] [data-column-id="col-23"]'
      );
      const lastHeaderRect = lastHeaderElement?.getBoundingClientRect();
      const lastCellRect = lastCellElement?.getBoundingClientRect();

      return {
        remainingScroll:
          element.scrollWidth - element.clientWidth - element.scrollLeft,
        headerBodyRightDrift:
          (lastHeaderRect?.right ?? 0) - (lastCellRect?.right ?? 0),
        headerViewportRightGap:
          viewportRect.right - (lastHeaderRect?.right ?? 0),
        bodyViewportRightGap: viewportRect.right - (lastCellRect?.right ?? 0),
      };
    });
    expect(Math.abs(endGeometry.remainingScroll)).toBeLessThanOrEqual(1);
    expect(Math.abs(endGeometry.headerBodyRightDrift)).toBeLessThanOrEqual(
      MAX_GEOMETRY_DRIFT
    );
    expect(Math.abs(endGeometry.headerViewportRightGap)).toBeLessThanOrEqual(
      MAX_GEOMETRY_DRIFT
    );
    expect(Math.abs(endGeometry.bodyViewportRightGap)).toBeLessThanOrEqual(
      MAX_GEOMETRY_DRIFT
    );

    const neighbourWidthBefore = await width(header(grid, "col-22"));
    const lastWidthBefore = await width(lastHeader);
    const scrollWidthBeforeResize = await viewport.evaluate(
      (element) => element.scrollWidth
    );

    const lastResizer = lastHeader.locator('[data-slot="column-resizer"]');
    await lastResizer.focus();
    await lastResizer.press("ArrowRight");

    // These fixture columns use controlled `width` values. A resize key press
    // may propose a new width, but rendered geometry must remain owned by the
    // controlled value and must not leak to the neighbouring virtual item.
    expect(await width(lastHeader)).toBeCloseTo(lastWidthBefore, 1);
    expect(await width(lastCell)).toBeCloseTo(lastWidthBefore, 1);
    expect(await width(header(grid, "col-22"))).toBeCloseTo(
      neighbourWidthBefore,
      1
    );
    expect(await viewport.evaluate((element) => element.scrollWidth)).toBe(
      scrollWidthBeforeResize
    );

    // Unmount and remount the resize target. Its controlled size must remain
    // attached to the stable column id rather than to a virtual item index.
    await scope.getByTestId("scroll-first-column").click();
    await expect(header(grid, "col-00")).toBeVisible();
    await expect(lastHeader).toHaveCount(0);
    await scope.getByTestId("scroll-last-column").click();
    await expect(lastHeader).toBeVisible();
    expect(await width(lastHeader)).toBeCloseTo(lastWidthBefore, 1);
    expect(await width(lastCell)).toBeCloseTo(lastWidthBefore, 1);

    expect(runtimeFailures).toEqual([]);
  });

  test("imperative hide and reorder preserve geometry by column id", async ({
    page,
  }) => {
    const runtimeFailures = captureRuntimeFailures(page);

    await page.goto("/compat/computed-props");

    const grid = page.locator(".InovuaReactDataGrid.tdg-root").first();
    const firstRow = grid
      .locator('[data-slot="grid-row"][data-row-id]')
      .first();
    await expect(grid).toBeVisible();
    await expect(header(grid, "city")).toBeVisible();

    const initialWidths = {
      id: await width(header(grid, "id")),
      name: await width(header(grid, "name")),
    };
    expect(initialWidths.name).toBeGreaterThan(initialWidths.id);

    await page.getByTestId("compat-run").click();

    await expect(header(grid, "city")).toHaveCount(0);
    await expect
      .poll(() =>
        renderedColumnIds(grid.locator('[data-slot="grid-header-cell"]'))
      )
      .toEqual(["name", "id"]);
    await expect
      .poll(() => renderedColumnIds(firstRow.locator("[data-column-id]")))
      .toEqual(["name", "id"]);

    const reorderedWidths = {
      name: await width(header(grid, "name")),
      id: await width(header(grid, "id")),
    };
    // Hiding `city` legitimately reallocates free viewport space. Relative
    // width identity must still follow each column after reordering; an
    // index-keyed size cache would swap these values.
    expect(reorderedWidths.name).toBeGreaterThan(reorderedWidths.id);

    for (const columnId of ["name", "id"] as const) {
      const currentHeader = header(grid, columnId);
      const currentCell = firstRow.locator(`[data-column-id="${columnId}"]`);
      expect(await width(currentCell)).toBeCloseTo(
        reorderedWidths[columnId],
        1
      );

      const [headerBox, cellBox] = await Promise.all([
        currentHeader.boundingBox(),
        currentCell.boundingBox(),
      ]);
      expect(headerBox).not.toBeNull();
      expect(cellBox).not.toBeNull();
      expect(
        Math.abs((headerBox?.x ?? 0) - (cellBox?.x ?? 0))
      ).toBeLessThanOrEqual(MAX_GEOMETRY_DRIFT);
    }

    expect(runtimeFailures).toEqual([]);
  });

  test("imperative visibility can hide a column that is not user-hideable", async ({
    page,
  }) => {
    const runtimeFailures = captureRuntimeFailures(page);

    await page.goto("/compat/computed-props");

    const probe = page.getByTestId("visibility-reconciliation-probe");
    const grid = probe.locator(".InovuaReactDataGrid.tdg-root");
    const hideLocked = probe.getByTestId("visibility-hide-locked");
    await expect(grid).toBeVisible();
    await expect(hideLocked).toBeEnabled();
    await expect(header(grid, "locked")).toBeVisible();

    await hideLocked.click();

    await expect(header(grid, "locked")).toHaveCount(0);
    await expect(header(grid, "alpha")).toBeVisible();
    await expect(header(grid, "beta")).toBeVisible();
    expect(runtimeFailures).toEqual([]);
  });

  test("a rerender still reconciles an unrelated column's visible prop", async ({
    page,
  }) => {
    const runtimeFailures = captureRuntimeFailures(page);

    await page.goto("/compat/computed-props");

    const probe = page.getByTestId("visibility-reconciliation-probe");
    const grid = probe.locator(".InovuaReactDataGrid.tdg-root");
    const hideAlpha = probe.getByTestId("visibility-hide-alpha");
    const toggleBetaProp = probe.getByTestId("visibility-toggle-beta-prop");
    const betaProp = probe.getByTestId("visibility-beta-prop");
    await expect(grid).toBeVisible();
    await expect(hideAlpha).toBeEnabled();
    await expect(header(grid, "alpha")).toBeVisible();
    await expect(header(grid, "beta")).toBeVisible();

    await hideAlpha.click();
    await expect(header(grid, "alpha")).toHaveCount(0);

    await toggleBetaProp.click();
    await expect(betaProp).toHaveText("false");
    await expect(header(grid, "beta")).toHaveCount(0);
    await expect(header(grid, "alpha")).toHaveCount(0);
    await expect(header(grid, "locked")).toBeVisible();

    // Changing the prop back must restore beta without clearing alpha's
    // independent imperative visibility override.
    await toggleBetaProp.click();
    await expect(betaProp).toHaveText("true");
    await expect(header(grid, "beta")).toBeVisible();
    await expect(header(grid, "alpha")).toHaveCount(0);
    expect(runtimeFailures).toEqual([]);
  });
});
