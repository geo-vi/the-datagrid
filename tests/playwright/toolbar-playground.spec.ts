import {
  expect,
  test,
  type Download,
  type Locator,
  type Page,
} from "@playwright/test";

function preview(page: Page) {
  return page.getByTestId("example-preview-panel");
}

function toolbar(scope: Locator) {
  return scope.locator('[data-slot="rdg-toolbar"]');
}

function controls(scope: Locator) {
  return scope.getByTestId("toolbar-playground-controls");
}

function grid(scope: Locator) {
  return scope.locator(".InovuaReactDataGrid.tdg-root");
}

async function readDownload(download: Download): Promise<string> {
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];

  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString("utf8");
}

test.beforeEach(async ({ page }) => {
  await page.goto("/examples/toolbar");
});

test("switches each built-in toolbar action on and off", async ({ page }) => {
  const scope = preview(page);
  const bar = toolbar(scope);
  const panel = controls(scope);

  await expect(grid(scope)).toHaveCount(1);
  await expect(bar.locator('[data-slot="rdg-toolbar-export"]')).toBeVisible();
  await expect(
    bar.locator('[data-slot="rdg-toolbar-filter-toggle"]')
  ).toBeVisible();
  await expect(
    bar.locator('[data-slot="rdg-toolbar-clear-filters"]')
  ).toBeVisible();
  await expect(
    bar.locator('[data-slot="rdg-column-toggle-list"]')
  ).toBeVisible();
  await expect(
    bar.getByRole("heading", { level: 2, name: "Order columns" })
  ).toBeVisible();

  await panel.getByRole("button", { name: "Export on" }).click();
  await expect(bar.locator('[data-slot="rdg-toolbar-export"]')).toHaveCount(0);

  await panel.getByRole("button", { name: "Filter toggle on" }).click();
  await expect(
    bar.locator('[data-slot="rdg-toolbar-filter-toggle"]')
  ).toHaveCount(0);

  await panel.getByRole("button", { name: "Clear filters on" }).click();
  await expect(
    bar.locator('[data-slot="rdg-toolbar-clear-filters"]')
  ).toHaveCount(0);

  await panel.getByRole("button", { name: "Column toggles on" }).click();
  await expect(bar.locator('[data-slot="rdg-column-toggle-list"]')).toHaveCount(
    0
  );

  await panel.getByRole("button", { name: "Heading on" }).click();
  await expect(
    bar.getByRole("heading", { level: 2, name: "Order columns" })
  ).toHaveCount(0);

  // Everything back on restores the full toolbar.
  await panel.getByRole("button", { name: "Export off" }).click();
  await panel.getByRole("button", { name: "Column toggles off" }).click();
  await expect(bar.locator('[data-slot="rdg-toolbar-export"]')).toBeVisible();
  await expect(
    bar.locator('[data-slot="rdg-column-toggle-list"]')
  ).toBeVisible();
});

test("hands filter-row ownership back to the grid", async ({ page }) => {
  const scope = preview(page);
  const bar = toolbar(scope);
  const panel = controls(scope);
  const filterToggle = bar.locator('[data-slot="rdg-toolbar-filter-toggle"]');

  await expect(grid(scope)).toHaveCount(1);
  await expect(grid(scope).locator(".tdg-filter-cell").first()).toBeVisible();
  await expect(filterToggle).toBeEnabled();
  await expect(filterToggle).toHaveText("Hide filters");

  await filterToggle.click();
  await expect(grid(scope).locator(".tdg-filter-cell")).toHaveCount(0);
  await expect(filterToggle).toHaveText("Show filters");

  await panel
    .getByRole("button", { name: "Filters: enableFiltering={false}" })
    .click();

  await expect(filterToggle).toBeDisabled();
  await expect(filterToggle).toHaveAttribute(
    "title",
    "The grid owns its filter row through the enableFiltering prop."
  );
  await expect(grid(scope).locator(".tdg-filter-cell")).toHaveCount(0);

  await panel
    .getByRole("button", { name: "Filters: enableFiltering={true}" })
    .click();

  await expect(filterToggle).toBeDisabled();
  await expect(grid(scope).locator(".tdg-filter-cell").first()).toBeVisible();

  await panel.getByRole("button", { name: "Filters: toolbar-owned" }).click();

  await expect(filterToggle).toBeEnabled();
});

test("collapses a single export format into a direct download button", async ({
  page,
}) => {
  const scope = preview(page);
  const bar = toolbar(scope);
  const exportControl = bar.locator('[data-slot="rdg-toolbar-export"]');

  await expect(grid(scope)).toHaveCount(1);
  await expect(exportControl).toHaveAttribute("aria-haspopup", "menu");

  // Deselect every format but CSV.
  await controls(scope).getByRole("button", { name: "JSON" }).click();
  await controls(scope).getByRole("button", { name: "Excel" }).click();

  await expect(exportControl).toHaveText("Export CSV");
  await expect(exportControl).not.toHaveAttribute("aria-haspopup", "menu");

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    exportControl.click(),
  ]);

  expect(download.suggestedFilename()).toBe("orders.csv");

  const csv = await readDownload(download);
  const [header, firstRow] = csv.slice(1).split("\r\n");

  // internalNote is hidden but exportWhenHidden; Actions is exportable: false.
  expect(header).toBe(
    "Order,Customer,Region,Items,Total,Placed,Status,Internal note"
  );
  // `Placed` exports a Date, which CSV writes as ISO-8601.
  expect(firstRow).toBe(
    "SO-4200,Northwind Traders,EMEA,1,1250,2026-05-02T09:30:00.000Z,Open," +
      "Priced from tier 1 for EMEA."
  );
});

test("exportScope switches between the filtered view and the whole source", async ({
  page,
}) => {
  const scope = preview(page);
  const bar = toolbar(scope);
  const panel = controls(scope);
  const regionFilter = grid(scope)
    .locator('.tdg-filter-cell[data-column-id="region"]')
    .getByRole("combobox");

  await expect(grid(scope)).toHaveCount(1);
  // Leave JSON as the only format, so the export button downloads directly.
  await panel.getByRole("button", { name: "CSV" }).click();
  await panel.getByRole("button", { name: "Excel" }).click();

  await regionFilter.click();
  const apacOption = page.getByRole("option", { name: "APAC" });
  await apacOption.focus();
  await apacOption.press("Enter");

  await expect(
    scope.getByTestId("toolbar-playground-row-summary")
  ).toContainText("Filtered orders: 12 / 36 · export writes 12 rows");

  const exportControl = bar.locator('[data-slot="rdg-toolbar-export"]');
  const [viewDownload] = await Promise.all([
    page.waitForEvent("download"),
    exportControl.click(),
  ]);
  const viewRecords = JSON.parse(await readDownload(viewDownload)) as Record<
    string,
    unknown
  >[];

  expect(viewRecords).toHaveLength(12);
  expect(viewRecords.every((record) => record.region === "APAC")).toBe(true);

  await panel.getByRole("button", { name: "Scope: all rows" }).click();
  await expect(
    scope.getByTestId("toolbar-playground-row-summary")
  ).toContainText("export writes 36 rows");

  const [allDownload] = await Promise.all([
    page.waitForEvent("download"),
    exportControl.click(),
  ]);
  const allRecords = JSON.parse(await readDownload(allDownload)) as Record<
    string,
    unknown
  >[];

  expect(allRecords).toHaveLength(36);
  expect(allRecords.filter((record) => record.region === "APAC")).toHaveLength(
    12
  );
  // The export still reports the formatted export value, not the React node.
  expect(allRecords[0].fulfilled).toBe("Open");
  expect(allRecords[0].total).toBe(1250);
});
