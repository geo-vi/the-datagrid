import { expect, test } from "@playwright/test";

test("issue #5 reproduction: grid overflows a fixed-width parent shell", async ({
  page,
}) => {
  await page.goto("/issue-5");

  const section = page.getByTestId("example-preview-panel");
  await expect(section).toBeVisible();

  const shell = section.getByTestId("issue-5-parent-shell");
  const grid = shell.locator(".InovuaReactDataGrid.tdg-root").first();

  await expect(shell).toBeVisible();
  await expect(grid).toBeVisible();

  const layout = await section.evaluate((node) => {
    const shell = node.querySelector<HTMLElement>(
      '[data-testid="issue-5-parent-shell"]'
    );
    const grid = shell?.querySelector<HTMLElement>(
      ".InovuaReactDataGrid.tdg-root"
    );

    if (!shell || !grid) return null;

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
      rootOverflowsParent: gridRect.width > shellRect.width + 0.5,
      shellHasHorizontalOverflow: shell.scrollWidth > shell.clientWidth + 0.5,
    };
  });

  expect(layout).not.toBeNull();
  expect(
    layout?.rootOverflowsParent || layout?.shellHasHorizontalOverflow
  ).toBe(true);
});
