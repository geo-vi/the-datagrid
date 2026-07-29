import { expect, test } from "@playwright/test";

// GitHub issue #58: a `color` returned from `rowStyle` was dropped because
// `.InovuaReactDataGrid__cell` asserted its own `color`, which beat the color
// inherited from the row. The cell now inherits color, so the row style wins.
const ROW_COLOR = "rgb(220, 20, 60)";

test("GitHub issue #58: rowStyle color is applied to cell text", async ({
  page,
}) => {
  await page.goto("/compat/issue-58-row-style-color");

  const scope = page.getByTestId("issue-58-scenario");
  await expect(scope).toHaveAttribute("data-issue", "58");

  const cells = scope.locator(
    '[data-slot="grid-row"] .InovuaReactDataGrid__cell'
  );
  await expect(cells.first()).toBeVisible();

  const count = await cells.count();
  expect(count).toBeGreaterThan(0);

  for (let index = 0; index < count; index += 1) {
    await expect(cells.nth(index)).toHaveCSS("color", ROW_COLOR);
  }
});
