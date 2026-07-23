import { expect, test } from "@playwright/test";

test("actions example keeps the locked-end column mounted and aligned while horizontally virtualized", async ({
  page,
}) => {
  await page.goto("/actions");

  const preview = page.getByTestId("example-preview-panel");
  const grid = preview.locator(".InovuaReactDataGrid.tdg-root").first();
  const viewport = grid.locator(".tdg-body-viewport");
  const header = grid.locator('.tdg-header-cell[data-column-id="actions"]');
  const filter = grid.locator('.tdg-filter-cell[data-column-id="actions"]');
  const firstActionCell = grid
    .locator(
      'tbody [data-slot="grid-row"] .InovuaReactDataGrid__cell[data-column-id="actions"]'
    )
    .first();

  await expect(grid).toBeVisible();
  await expect(header).toBeVisible();
  await expect(filter).toBeVisible();
  await expect(firstActionCell).toBeVisible();
  await expect(header).toHaveCSS("position", "sticky");
  await expect(filter).toHaveCSS("position", "sticky");
  await expect(firstActionCell).toHaveCSS("position", "sticky");
  await expect(header).toHaveAttribute(
    "class",
    /InovuaReactDataGrid__column-header--locked-end/
  );
  await expect(filter).toHaveAttribute(
    "class",
    /InovuaReactDataGrid__filter-cell--locked-end/
  );
  await expect(firstActionCell).toHaveAttribute(
    "class",
    /InovuaReactDataGrid__cell--locked-end/
  );
  await expect(preview.getByTestId("actions-locked-metadata")).toHaveText(
    "Runtime metadata: locked end contains actions."
  );

  const initialGeometry = await Promise.all([
    viewport.boundingBox(),
    header.boundingBox(),
    filter.boundingBox(),
    firstActionCell.boundingBox(),
  ]);
  const [initialViewport, initialHeader, initialFilter, initialCell] =
    initialGeometry;
  expect(initialViewport).not.toBeNull();
  expect(initialHeader).not.toBeNull();
  expect(initialFilter).not.toBeNull();
  expect(initialCell).not.toBeNull();

  const initialRight = initialViewport!.x + initialViewport!.width;
  for (const lockedBox of [initialHeader!, initialFilter!, initialCell!]) {
    expect(Math.abs(lockedBox.x + lockedBox.width - initialRight)).toBeLessThan(
      3
    );
  }

  await viewport.evaluate((element) => {
    element.scrollLeft = element.scrollWidth;
    element.dispatchEvent(new Event("scroll", { bubbles: true }));
  });
  await page.waitForTimeout(50);

  await expect(header).toBeVisible();
  await expect(filter).toBeVisible();
  await expect(firstActionCell).toBeVisible();

  const scrolledGeometry = await Promise.all([
    viewport.boundingBox(),
    header.boundingBox(),
    filter.boundingBox(),
    firstActionCell.boundingBox(),
  ]);
  const [scrolledViewport, scrolledHeader, scrolledFilter, scrolledCell] =
    scrolledGeometry;
  const scrolledRight = scrolledViewport!.x + scrolledViewport!.width;
  for (const lockedBox of [scrolledHeader!, scrolledFilter!, scrolledCell!]) {
    expect(
      Math.abs(lockedBox.x + lockedBox.width - scrolledRight)
    ).toBeLessThan(3);
  }

  const widthBeforeResize = (await header.boundingBox())!.width;
  await header
    .getByRole("button", { name: "Resize Actions" })
    .press("ArrowRight");
  await expect
    .poll(async () => (await header.boundingBox())?.width)
    .not.toBe(widthBeforeResize);
  await expect
    .poll(async () => {
      const [resizedViewport, resizedHeader] = await Promise.all([
        viewport.boundingBox(),
        header.boundingBox(),
      ]);
      return Math.abs(
        resizedHeader!.x +
          resizedHeader!.width -
          (resizedViewport!.x + resizedViewport!.width)
      );
    })
    .toBeLessThan(3);

  await page.getByRole("button", { name: "Advance Northwind Health" }).click();
  await expect(preview.getByTestId("actions-stage-wf-201")).toHaveText(
    "Reviewing"
  );
});

test("actions example fires row actions on the first click and supports bulk mutations", async ({
  page,
}) => {
  await page.goto("/actions");

  const preview = page.getByTestId("example-preview-panel");
  const grid = preview.locator(".InovuaReactDataGrid.tdg-root").first();

  await expect(grid).toBeVisible();
  await expect(
    preview.getByRole("heading", { name: "Actions example" })
  ).toBeVisible();
  await expect(
    preview.getByText("A focused actions grid", { exact: false })
  ).toBeVisible();

  await preview.getByRole("heading", { name: "Actions example" }).click();
  await page.getByRole("button", { name: "Advance Northwind Health" }).click();

  await expect(preview.getByTestId("actions-stage-wf-201")).toHaveText(
    "Reviewing"
  );
  await expect(preview.getByTestId("actions-log")).toContainText(
    "Advanced Northwind Health to Reviewing."
  );
  await expect(
    preview
      .getByTestId("actions-log")
      .getByText("Advanced Northwind Health to Reviewing.", { exact: true })
  ).toHaveCount(1);

  await page.getByRole("button", { name: "Insert row" }).click();
  await expect(preview.getByTestId("actions-rows-card")).toContainText("6");
  await expect(preview.getByTestId("actions-log")).toContainText(
    "Inserted sample 206"
  );

  const rowCheckboxes = grid.locator(
    'tbody [data-slot="grid-row"] [role="checkbox"]'
  );
  await rowCheckboxes.nth(0).click();
  await rowCheckboxes.nth(1).click();

  await expect(preview.getByTestId("actions-selected-card")).toContainText("2");

  await page.getByRole("button", { name: "Delete selected" }).click();

  await expect(preview.getByTestId("actions-rows-card")).toContainText("4");
  await expect(preview.getByTestId("actions-selected-card")).toContainText("0");
  await expect(preview.getByTestId("actions-log")).toContainText(
    "Deleted 2 selected rows."
  );
});
