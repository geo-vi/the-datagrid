import { expect, test, type Locator } from "@playwright/test";

type ColumnsGridLayout = {
  shellHeight: number;
  gridHeight: number;
  gridMinHeight: string;
  viewportClientHeight: number;
  gridBottomWithinShell: boolean;
  viewportBottomWithinShell: boolean;
  verticalScrollbarBottomWithinShell: boolean | null;
  horizontalScrollbarBottomWithinShell: boolean | null;
  hasVerticalOverflow: boolean;
  hasHorizontalOverflow: boolean;
};

async function readColumnsGridLayout(
  shell: Locator
): Promise<ColumnsGridLayout | null> {
  return shell.evaluate((container): ColumnsGridLayout | null => {
    const gridElement = container.querySelector<HTMLElement>(
      ".InovuaReactDataGrid.tdg-root"
    );
    const viewport = container.querySelector<HTMLElement>(
      '[data-slot="scroll-area-viewport"]'
    );
    const verticalScrollbar = container.querySelector<HTMLElement>(
      '[data-slot="scroll-area-scrollbar"][data-orientation="vertical"]'
    );
    const horizontalScrollbar = container.querySelector<HTMLElement>(
      '[data-slot="scroll-area-scrollbar"][data-orientation="horizontal"]'
    );

    if (!gridElement || !viewport) {
      return null;
    }

    const shellRect = container.getBoundingClientRect();
    const gridRect = gridElement.getBoundingClientRect();
    const viewportRect = viewport.getBoundingClientRect();
    const verticalScrollbarRect = verticalScrollbar?.getBoundingClientRect();
    const horizontalScrollbarRect =
      horizontalScrollbar?.getBoundingClientRect();

    return {
      shellHeight: Math.round(shellRect.height),
      gridHeight: Math.round(gridRect.height),
      gridMinHeight: getComputedStyle(gridElement).minHeight,
      viewportClientHeight: viewport.clientHeight,
      gridBottomWithinShell: gridRect.bottom <= shellRect.bottom + 1,
      viewportBottomWithinShell: viewportRect.bottom <= shellRect.bottom + 1,
      verticalScrollbarBottomWithinShell: verticalScrollbarRect
        ? verticalScrollbarRect.bottom <= shellRect.bottom + 1
        : null,
      horizontalScrollbarBottomWithinShell: horizontalScrollbarRect
        ? horizontalScrollbarRect.bottom <= shellRect.bottom + 1
        : null,
      hasVerticalOverflow: viewport.scrollHeight > viewport.clientHeight,
      hasHorizontalOverflow: viewport.scrollWidth > viewport.clientWidth,
    };
  });
}

test("columns example showcases typed renderers, column configuration, and virtualized overflow", async ({
  page,
}) => {
  await page.goto("/examples/columns");

  const preview = page.getByTestId("example-preview-panel");
  await expect(
    preview.getByRole("heading", { name: "Columns example" })
  ).toBeVisible();
  await expect(
    page.getByText("examples/src/ColumnsGridExample.tsx")
  ).toBeVisible();

  const shell = preview.getByTestId("columns-grid-shell");
  const grid = shell.locator(".InovuaReactDataGrid.tdg-root").first();
  await expect(shell).toBeVisible();
  await expect(grid).toBeVisible();

  await expect(page.getByTestId("columns-work-item-1")).toContainText(
    "TDG-1001"
  );
  await expect(page.getByTestId("columns-work-item-1")).toContainText(
    "Refine column autosizing"
  );
  await expect(page.getByTestId("columns-status-1")).toContainText(
    "In progress"
  );

  await expect(
    grid.locator(
      '[data-slot="grid-header-cell"][data-column-id="internalNote"]'
    )
  ).toHaveCount(0);
  await expect(
    grid.locator('.InovuaReactDataGrid__cell[data-column-id="effort"]').first()
  ).toHaveCSS("text-align", "right");

  await shell.locator('[data-slot="scroll-area"]').hover();

  const layout = await readColumnsGridLayout(shell);

  expect(layout).not.toBeNull();
  expect(layout?.shellHeight).toBe(560);
  expect(layout?.gridMinHeight).toBe("0px");
  expect(layout?.gridHeight).toBeLessThanOrEqual(560);
  expect(layout?.viewportClientHeight).toBeGreaterThan(400);
  expect(layout?.gridBottomWithinShell).toBe(true);
  expect(layout?.viewportBottomWithinShell).toBe(true);
  expect(layout?.hasVerticalOverflow).toBe(true);
  expect(layout?.hasHorizontalOverflow).toBe(true);

  for (const [height, minimumViewportHeight] of [
    [320, 180],
    [760, 640],
  ] as const) {
    await shell.evaluate((element, nextHeight) => {
      element.style.height = `${nextHeight}px`;
    }, height);

    await expect
      .poll(async () => (await readColumnsGridLayout(shell))?.shellHeight)
      .toBe(height);

    const resizedLayout = await readColumnsGridLayout(shell);
    expect(resizedLayout).not.toBeNull();
    expect(resizedLayout?.gridMinHeight).toBe("0px");
    expect(resizedLayout?.gridHeight).toBeLessThanOrEqual(height);
    expect(resizedLayout?.viewportClientHeight).toBeGreaterThan(
      minimumViewportHeight
    );
    expect(resizedLayout?.viewportClientHeight).toBeLessThan(height);
    expect(resizedLayout?.gridBottomWithinShell).toBe(true);
    expect(resizedLayout?.viewportBottomWithinShell).toBe(true);
    expect(resizedLayout?.verticalScrollbarBottomWithinShell).toBe(true);
    expect(resizedLayout?.horizontalScrollbarBottomWithinShell).toBe(true);
    expect(resizedLayout?.hasVerticalOverflow).toBe(true);
    expect(resizedLayout?.hasHorizontalOverflow).toBe(true);
  }

  await shell.evaluate((element) => {
    element.style.height = "";
  });
  await page.getByTestId("columns-height-toggle").click();
  await expect(page.getByTestId("columns-height-toggle")).toHaveText(
    "Use fixed height"
  );

  await expect
    .poll(async () => (await readColumnsGridLayout(shell))?.shellHeight ?? 9999)
    .toBeLessThan(400);

  const naturalLayout = await readColumnsGridLayout(shell);
  expect(naturalLayout).not.toBeNull();
  expect(naturalLayout?.gridMinHeight).toBe("0px");
  expect(naturalLayout?.gridHeight).toBeLessThan(400);
  expect(naturalLayout?.viewportClientHeight).toBeLessThan(360);
  expect(naturalLayout?.gridBottomWithinShell).toBe(true);
  expect(naturalLayout?.viewportBottomWithinShell).toBe(true);
  expect(naturalLayout?.hasVerticalOverflow).toBe(false);
  expect(naturalLayout?.hasHorizontalOverflow).toBe(true);
});
