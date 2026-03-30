import { expect, test } from "@playwright/test";

test("keeps selection checkboxes aligned between the header and rows", async ({
  page,
}) => {
  await page.goto("/selection");

  const preview = page.getByTestId("example-preview-panel");
  await expect(preview).toBeVisible();
  await expect(preview).not.toContainText("[object Object]");

  const grid = preview.locator(".InovuaReactDataGrid.tdg-root").first();
  const headerCell = grid.locator("thead .tdg-header-cell").first();
  const firstDataCell = grid
    .locator('tbody [data-slot="grid-row"] .InovuaReactDataGrid__cell')
    .first();

  await expect(headerCell).toBeVisible();
  await expect(firstDataCell).toBeVisible();

  const alignment = await grid.evaluate((table) => {
    const getGeometry = (cell: Element | null) => {
      const checkbox = cell?.querySelector<HTMLElement>('[role="checkbox"]');

      if (!(cell instanceof HTMLElement) || !checkbox) return null;

      const cellRect = cell.getBoundingClientRect();
      const checkboxRect = checkbox.getBoundingClientRect();
      const cellCenterX = cellRect.left + cellRect.width / 2;
      const checkboxCenterX = checkboxRect.left + checkboxRect.width / 2;

      return {
        cellWidth: Math.round(cellRect.width * 100) / 100,
        deltaX: Math.round((checkboxCenterX - cellCenterX) * 100) / 100,
        checkboxCenterX: Math.round(checkboxCenterX * 100) / 100,
      };
    };

    const header = getGeometry(table.querySelector("thead .tdg-header-cell"));
    const body = getGeometry(
      table.querySelector(
        'tbody [data-slot="grid-row"] .InovuaReactDataGrid__cell'
      )
    );

    if (!header || !body) return null;

    return {
      header,
      body,
      checkboxCenterDelta:
        Math.round((body.checkboxCenterX - header.checkboxCenterX) * 100) / 100,
    };
  });

  expect(alignment).not.toBeNull();
  expect(alignment?.header.cellWidth).toBeGreaterThan(36);
  expect(alignment?.header.cellWidth).toBeLessThan(56);
  expect(alignment?.body.cellWidth).toBeGreaterThan(36);
  expect(alignment?.body.cellWidth).toBeLessThan(56);
  expect(Math.abs(alignment?.header.deltaX ?? 99)).toBeLessThan(2);
  expect(Math.abs(alignment?.body.deltaX ?? 99)).toBeLessThan(2);
  expect(Math.abs(alignment?.checkboxCenterDelta ?? 99)).toBeLessThan(2);
});
