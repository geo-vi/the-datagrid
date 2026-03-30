import { expect, test } from "@playwright/test";

test("keeps the grid contained inside a constrained parent shell", async ({
  page,
}) => {
  await page.goto("/basic");

  const preview = page.getByTestId("example-preview-panel");
  await expect(preview).toBeVisible();

  const shell = preview.locator("section").first();
  const grid = shell.locator(".InovuaReactDataGrid.tdg-root").first();

  await shell.evaluate((node) => {
    node.style.width = "420px";
    node.style.maxWidth = "420px";
    node.style.minWidth = "420px";
  });

  await expect(shell).toBeVisible();
  await expect(grid).toBeVisible();

  const layout = await shell.evaluate((shell) => {
    const grid = shell.querySelector<HTMLElement>(
      ".InovuaReactDataGrid.tdg-root"
    );
    const headerViewport = shell?.querySelector<HTMLElement>(
      '[data-slot="grid-header-viewport"]'
    );
    const bodyViewport = shell?.querySelector<HTMLElement>(
      '[data-slot="scroll-area-viewport"]'
    );

    if (!shell || !grid || !headerViewport || !bodyViewport) return null;

    const shellRect = shell.getBoundingClientRect();
    const gridRect = grid.getBoundingClientRect();

    return {
      shellClientWidth: shell.clientWidth,
      shellScrollWidth: shell.scrollWidth,
      shellRectWidth: Math.round(shellRect.width * 100) / 100,
      gridClientWidth: grid.clientWidth,
      gridScrollWidth: grid.scrollWidth,
      gridRectWidth: Math.round(gridRect.width * 100) / 100,
      gridComputedMaxWidth: getComputedStyle(grid).maxWidth,
      headerViewportClientWidth: headerViewport.clientWidth,
      headerViewportScrollWidth: headerViewport.scrollWidth,
      bodyViewportClientWidth: bodyViewport.clientWidth,
      bodyViewportScrollWidth: bodyViewport.scrollWidth,
      rootOverflowsParent: gridRect.width > shellRect.width + 0.5,
      shellHasHorizontalOverflow: shell.scrollWidth > shell.clientWidth + 0.5,
      headerViewportHasHorizontalOverflow:
        headerViewport.scrollWidth > headerViewport.clientWidth + 0.5,
      bodyViewportHasHorizontalOverflow:
        bodyViewport.scrollWidth > bodyViewport.clientWidth + 0.5,
    };
  });

  expect(layout).not.toBeNull();
  expect(layout?.rootOverflowsParent).toBe(false);
  expect(layout?.shellHasHorizontalOverflow).toBe(false);
  expect(layout?.headerViewportHasHorizontalOverflow).toBe(true);
  expect(
    Boolean(layout?.headerViewportHasHorizontalOverflow) ||
      Boolean(layout?.bodyViewportHasHorizontalOverflow)
  ).toBe(true);
});
