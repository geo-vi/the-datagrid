import { expect, test } from "@playwright/test";

test("sorting the selection example does not trigger a render loop", async ({
  page,
}) => {
  const errors: string[] = [];

  page.on("pageerror", (error) => {
    errors.push(error.message);
  });

  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(message.text());
    }
  });

  await page.goto("/selection");

  const preview = page.getByTestId("example-preview-panel");
  await expect(preview).toBeVisible();

  const grid = preview.locator(".InovuaReactDataGrid.tdg-root").first();
  const arrHeader = grid.getByRole("columnheader", { name: /ARR/i }).first();

  await expect(arrHeader).toBeVisible();
  await arrHeader.click();

  await expect
    .poll(async () => {
      const firstRow = grid.locator('tbody [data-slot="grid-row"]').first();
      return (await firstRow.textContent()) ?? "";
    })
    .toContain("Cinder Labs");

  await page.waitForTimeout(100);

  expect(errors.join("\n")).not.toContain("Maximum update depth exceeded");
});
