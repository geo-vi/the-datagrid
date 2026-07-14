import { expect, test, type Locator } from "@playwright/test";

type CellHeightGeometry = {
  rowIndex: number | null;
  rowHeight: number;
  rowInlineHeight: string;
  cellHeight: number;
  cellTop: number;
  cellBottom: number;
  rowTop: number;
  rowBottom: number;
  contentClientHeight: number;
  contentScrollHeight: number;
  contentTop: number;
  contentBottom: number;
  contentInlineMaxHeight: string;
  renderedTop: number;
  renderedBottom: number;
};

async function readCellHeightGeometry(
  cells: Locator
): Promise<CellHeightGeometry[]> {
  return cells.evaluateAll((cellElements): CellHeightGeometry[] =>
    cellElements.map((cellElement) => {
      const cell = cellElement as HTMLElement;
      const row = cell.closest<HTMLElement>('[data-slot="grid-row"]');
      const content = cell.querySelector<HTMLElement>(".tdg-cell-content");
      const rendered = content?.firstElementChild as HTMLElement | null;

      if (!row || !content || !rendered) {
        throw new Error(
          "Expected a rendered data row, cell content, and renderer"
        );
      }

      const rowRect = row.getBoundingClientRect();
      const cellRect = cell.getBoundingClientRect();
      const contentRect = content.getBoundingClientRect();
      const renderedRect = rendered.getBoundingClientRect();
      const parsedIndex = Number(row.dataset.rowIndex);

      return {
        rowIndex: Number.isFinite(parsedIndex) ? parsedIndex : null,
        rowHeight: rowRect.height,
        rowInlineHeight: row.style.height,
        cellHeight: cellRect.height,
        cellTop: cellRect.top,
        cellBottom: cellRect.bottom,
        rowTop: rowRect.top,
        rowBottom: rowRect.bottom,
        contentClientHeight: content.clientHeight,
        contentScrollHeight: content.scrollHeight,
        contentTop: contentRect.top,
        contentBottom: contentRect.bottom,
        contentInlineMaxHeight: content.style.maxHeight,
        renderedTop: renderedRect.top,
        renderedBottom: renderedRect.bottom,
      };
    })
  );
}

function expectContentToFit(geometry: CellHeightGeometry): void {
  const tolerance = 1;

  expect(geometry.contentScrollHeight).toBeLessThanOrEqual(
    geometry.contentClientHeight + tolerance
  );
  expect(geometry.renderedTop).toBeGreaterThanOrEqual(
    geometry.contentTop - tolerance
  );
  expect(geometry.renderedBottom).toBeLessThanOrEqual(
    geometry.contentBottom + tolerance
  );
  expect(geometry.cellTop).toBeGreaterThanOrEqual(geometry.rowTop - tolerance);
  expect(geometry.cellBottom).toBeLessThanOrEqual(
    geometry.rowBottom + tolerance
  );
  expect(
    Math.abs(geometry.cellHeight - geometry.rowHeight)
  ).toBeLessThanOrEqual(tolerance);
}

async function expectAdjacentRowsToShareAnEdge(
  grid: Locator,
  firstRowIndex: number,
  secondRowIndex: number
): Promise<void> {
  const edgeDelta = await grid.evaluate(
    (gridElement, { firstIndex, secondIndex }) => {
      const firstRow = gridElement.querySelector<HTMLElement>(
        `[data-slot="grid-row"][data-row-index="${firstIndex}"]`
      );
      const secondRow = gridElement.querySelector<HTMLElement>(
        `[data-slot="grid-row"][data-row-index="${secondIndex}"]`
      );

      if (!firstRow || !secondRow) {
        throw new Error(
          `Expected adjacent rendered rows ${firstIndex} and ${secondIndex}`
        );
      }

      const firstRect = firstRow.getBoundingClientRect();
      const secondRect = secondRow.getBoundingClientRect();

      return Math.abs(secondRect.top - firstRect.bottom);
    },
    { firstIndex: firstRowIndex, secondIndex: secondRowIndex }
  );

  expect(edgeDelta).toBeLessThanOrEqual(1);
}

async function waitForRowsToRemainRendered(
  grid: Locator,
  rowIndexes: number[]
): Promise<void> {
  await expect
    .poll(
      () =>
        grid.evaluate(async (gridElement, expectedIndexes) => {
          const rowsAreRendered = () =>
            expectedIndexes.every((rowIndex) =>
              gridElement.querySelector(
                `[data-slot="grid-row"][data-row-index="${rowIndex}"]`
              )
            );

          // The virtualizer can briefly expose its initial range while React
          // finishes the first post-scroll render. Requiring the requested
          // range to survive several paints waits for the settled range rather
          // than accepting that transient DOM.
          for (let frame = 0; frame < 6; frame += 1) {
            if (!rowsAreRendered()) return false;
            await new Promise<void>((resolve) =>
              window.requestAnimationFrame(() => resolve())
            );
          }

          return rowsAreRendered();
        }, rowIndexes),
      { message: `rows ${rowIndexes.join(", ")} to remain rendered` }
    )
    .toBe(true);
}

test("selection example uses natural rows without clipping composite Account cells", async ({
  page,
}) => {
  await page.goto("/examples/selection");

  const grid = page
    .getByTestId("selection-example-shell")
    .locator(".InovuaReactDataGrid.tdg-root")
    .first();
  await expect(grid).toBeVisible();

  const accountCells = grid.locator(
    '[data-slot="grid-row"] [data-column-id="account"]'
  );
  await expect(accountCells).toHaveCount(8);

  const geometry = await readCellHeightGeometry(accountCells);
  for (const cell of geometry) {
    expectContentToFit(cell);
    expect(cell.rowHeight).toBeGreaterThanOrEqual(52);
    // Natural mode leaves the renderer unconstrained and uses minRowHeight as
    // a floor; the table may grow by a fractional pixel for its two text lines.
    expect(cell.contentInlineMaxHeight).toBe("");
    expect(cell.rowInlineHeight).toBe("52px");
  }

  await expectAdjacentRowsToShareAnEdge(grid, 0, 1);
});

test("columns example keeps fixed virtual rows and an offscreen Owner renderer aligned", async ({
  page,
}) => {
  await page.goto("/examples/columns");

  const shell = page.getByTestId("columns-grid-shell");
  const grid = shell.locator(".InovuaReactDataGrid.tdg-root").first();
  const viewport = grid.locator('[data-slot="scroll-area-viewport"]');
  const headerViewport = grid.locator('[data-slot="grid-header-viewport"]');
  await expect(grid).toBeVisible();

  const initialOwnerCells = grid.locator(
    '[data-slot="grid-row"] [data-column-id="owner"]'
  );
  await expect(initialOwnerCells.first()).toBeVisible();
  for (const cell of await readCellHeightGeometry(initialOwnerCells)) {
    expectContentToFit(cell);
    expect(cell.rowHeight).toBeCloseTo(56, 0);
    expect(cell.rowInlineHeight).toBe("56px");
    expect(cell.contentInlineMaxHeight).toBe("40px");
  }

  const targetIndex = 77;
  await viewport.evaluate(async (element, targetScrollTop) => {
    element.scrollTo({ top: targetScrollTop });
    await new Promise<void>((resolve) =>
      window.requestAnimationFrame(() => resolve())
    );
  }, targetIndex * 56);

  await waitForRowsToRemainRendered(grid, [targetIndex, targetIndex + 1]);

  const targetRow = grid.locator(
    `[data-slot="grid-row"][data-row-index="${targetIndex}"]`
  );
  const nextRow = grid.locator(
    `[data-slot="grid-row"][data-row-index="${targetIndex + 1}"]`
  );
  await expect(targetRow).toBeVisible();
  await expect(nextRow).toBeVisible();

  const [targetGeometry] = await readCellHeightGeometry(
    targetRow.locator('[data-column-id="owner"]')
  );
  expect(targetGeometry).toBeDefined();
  expectContentToFit(targetGeometry!);
  expect(targetGeometry?.rowHeight).toBeCloseTo(56, 0);
  await expectAdjacentRowsToShareAnEdge(grid, targetIndex, targetIndex + 1);

  const virtualOffset = await grid.evaluate(
    (gridElement, { targetIndex: index, expectedRowHeight }) => {
      const row = gridElement.querySelector<HTMLElement>(
        `[data-slot="grid-row"][data-row-index="${index}"]`
      );
      const bodyViewport = gridElement.querySelector<HTMLElement>(
        '[data-slot="scroll-area-viewport"]'
      );
      const header = gridElement.querySelector<HTMLElement>(
        '[data-slot="grid-header-viewport"]'
      );

      if (!row || !bodyViewport || !header) {
        throw new Error(
          "Expected the target row, grid body, and sticky header viewports"
        );
      }

      const rowRect = row.getBoundingClientRect();
      const viewportRect = bodyViewport.getBoundingClientRect();

      return {
        actualStart:
          rowRect.top -
          viewportRect.top +
          bodyViewport.scrollTop -
          header.getBoundingClientRect().height,
        expectedStart: index * expectedRowHeight,
      };
    },
    { targetIndex, expectedRowHeight: 56 }
  );
  expect(
    Math.abs(virtualOffset.actualStart - virtualOffset.expectedStart)
  ).toBeLessThanOrEqual(2);

  // Keep the header locator live through the scroll: the row must begin below
  // the same sticky layer rather than being virtually positioned under it.
  await expect(headerViewport).toBeVisible();
});

test("columns natural-height toggle measures its three composite rows without clipping", async ({
  page,
}) => {
  await page.goto("/examples/columns");
  await page.getByTestId("columns-height-toggle").click();
  await expect(page.getByTestId("columns-height-toggle")).toHaveText(
    "Use fixed height"
  );

  const shell = page.getByTestId("columns-grid-shell");
  const grid = shell.locator(".InovuaReactDataGrid.tdg-root").first();
  const ownerCells = grid.locator(
    '[data-slot="grid-row"] [data-column-id="owner"]'
  );
  await expect(ownerCells).toHaveCount(3);

  const geometry = await readCellHeightGeometry(ownerCells);
  for (const cell of geometry) {
    expectContentToFit(cell);
    expect(cell.rowHeight).toBeGreaterThanOrEqual(52);
    expect(cell.rowInlineHeight).toBe("52px");
    expect(cell.contentInlineMaxHeight).toBe("");
  }

  await expectAdjacentRowsToShareAnEdge(grid, 0, 1);
  await expectAdjacentRowsToShareAnEdge(grid, 1, 2);

  const layout = await shell.evaluate((element) => {
    const gridElement = element.querySelector<HTMLElement>(".tdg-root");
    const viewport = element.querySelector<HTMLElement>(
      '[data-slot="scroll-area-viewport"]'
    );

    if (!gridElement || !viewport) {
      throw new Error("Expected the natural-height grid layout");
    }

    return {
      shellHeight: element.getBoundingClientRect().height,
      gridHeight: gridElement.getBoundingClientRect().height,
      hasVerticalOverflow: viewport.scrollHeight > viewport.clientHeight + 1,
    };
  });

  expect(layout.shellHeight).toBeLessThan(400);
  expect(layout.gridHeight).toBeLessThanOrEqual(layout.shellHeight + 1);
  expect(layout.hasVerticalOverflow).toBe(false);
});
