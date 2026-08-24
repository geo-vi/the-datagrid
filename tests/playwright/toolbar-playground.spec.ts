import {
  expect,
  test,
  type Download,
  type Locator,
  type Page,
} from "@playwright/test";

// The playground card, not the whole panel: the apiRef demo adds a second grid.
function preview(page: Page) {
  return page.getByTestId("toolbar-playground");
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

type ControlPaint = { fill: string; border: string; text: string };

/**
 * The three painted colours of one control, normalised through a canvas so that
 * `transparent` and `rgba(0, 0, 0, 0)` compare equal.
 */
function paint(node: Locator): Promise<ControlPaint> {
  return node.evaluate((element) => {
    const style = getComputedStyle(element);
    const context = document.createElement("canvas").getContext("2d");
    const normalize = (value: string): string => {
      if (!context) return value;
      context.fillStyle = "#000";
      context.fillStyle = value;
      return String(context.fillStyle);
    };

    return {
      fill: normalize(style.backgroundColor),
      border: normalize(style.borderTopColor),
      text: normalize(style.color),
    };
  });
}

function isTransparent(color: string): boolean {
  return color === "rgba(0, 0, 0, 0)" || /\/\s*0\s*\)$/.test(color);
}

/** True for any colour carrying an alpha below 1, however it is notated. */
function isTranslucent(color: string): boolean {
  return /\/\s*(0|0?\.\d+|\d+(\.\d+)?%)\s*\)$/.test(color);
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

function paletteOf(bar: Locator): Promise<Record<string, string>> {
  return bar.evaluate((element) => {
    const style = getComputedStyle(element);
    const entries = [
      "card",
      "foreground",
      "input",
      "muted-foreground",
      "popover",
    ].map((name) => [
      name,
      style.getPropertyValue(`--tdg-toolbar-${name}`).trim(),
    ]);

    return Object.fromEntries(entries) as Record<string, string>;
  });
}

/*
 * The site theme owns `.dark` on the document, the grid theme owns
 * `data-theme-base` on the toolbar, and the toolbar must follow the second. A
 * dark grid theme inside a light page used to keep the page's light palette: the
 * declarations led with `var(--card, ...)`, so a host defining that variable at
 * all made the dark literal behind it unreachable.
 */
test("follows a named grid theme's mode, not the site's", async ({ page }) => {
  const bar = toolbar(preview(page));
  const gridTheme = (name: string) =>
    page.getByLabel("Grid theme buttons").getByRole("button", { name }).first();
  // The button names the mode it switches *to*, so "Light mode" means the site
  // is currently dark.
  const siteThemeToggle = page.getByLabel("Switch site theme").first();
  const goToSiteMode = async (mode: "light" | "dark") => {
    const target = mode === "light" ? "Light mode" : "Dark mode";
    if ((await siteThemeToggle.textContent())?.trim() === target) {
      await siteThemeToggle.click();
    }
    await expect(siteThemeToggle).not.toHaveText(target);
  };

  const surfaceOf = (node: Locator) =>
    node.evaluate((element) => getComputedStyle(element).backgroundColor);

  await expect(bar).toBeVisible();

  await goToSiteMode("light");
  await gridTheme("Default").click();
  await expect(bar).toHaveAttribute("data-theme-base", "default");
  const sitePaletteLight = await paletteOf(bar);

  // Following the page, the card stays translucent so the page tints it.
  expect(isTranslucent(await surfaceOf(bar))).toBe(true);

  // The reported case: a dark grid theme while the page stays light.
  await gridTheme("Ikarus Dark").click();
  await expect(bar).toHaveAttribute("data-theme-base", "dark");
  const namedDark = await paletteOf(bar);

  expect(namedDark).not.toEqual(sitePaletteLight);

  // Naming a mode makes the card opaque; translucent it would blend in 40% of
  // the light page and land on a mid grey.
  expect(isTranslucent(await surfaceOf(bar))).toBe(false);

  // And it is the same dark palette the site's own dark mode resolves, not just
  // something different from the light one.
  await goToSiteMode("dark");
  await gridTheme("Default").click();
  await expect(bar).toHaveAttribute("data-theme-base", "default");

  expect(await paletteOf(bar)).toEqual(namedDark);

  // The mirror holds too: a light grid theme inside a dark page stays light.
  await gridTheme("Ikarus Light").click();
  await expect(bar).toHaveAttribute("data-theme-base", "light");

  expect(await paletteOf(bar)).toEqual(sitePaletteLight);
  expect(isTranslucent(await surfaceOf(bar))).toBe(false);

  // Those rules use attribute selectors, which outrank a plain
  // `.tdg-toolbar-root` rule, so they may only move private plumbing.
  await page.addStyleTag({
    content:
      ".tdg-toolbar-root { --tdg-toolbar-surface: rgb(1, 2, 3); --tdg-toolbar-card: rgb(4, 5, 6); }",
  });
  await gridTheme("Ikarus Dark").click();
  await expect(bar).toHaveAttribute("data-theme-base", "dark");

  expect(await surfaceOf(bar)).toBe("rgb(1, 2, 3)");
  expect((await paletteOf(bar)).card).toBe("rgb(4, 5, 6)");
});

/*
 * The toggles used to read inverted: only a released one had a border, while a
 * pressed one dropped its border for a fill three percent off the surface. These
 * assertions name the signals rather than the colours, so they hold in either
 * theme and under a consumer's own tokens.
 */
test("tells a pressed toggle from a released one by its border", async ({
  page,
}) => {
  const scope = preview(page);
  const bar = toolbar(scope);
  const filterToggle = bar.locator('[data-slot="rdg-toolbar-filter-toggle"]');
  const pressedColumn = bar.locator(
    '[data-slot="rdg-column-toggle"][data-state="on"]'
  );
  const releasedColumn = bar.locator(
    '[data-slot="rdg-column-toggle"][data-state="off"]'
  );

  // Colours are read straight after a click, and the 150ms cross-fade would
  // otherwise hand back an interpolated value.
  await page.addStyleTag({
    content: '[data-slot="rdg-toolbar"] * { transition: none !important; }',
  });

  await expect(grid(scope)).toHaveCount(1);
  await expect(pressedColumn.first()).toBeVisible();
  await expect(releasedColumn.first()).toBeVisible();

  const pressed = await paint(pressedColumn.first());
  const released = await paint(releasedColumn.first());

  // A pressed toggle owns an edge and an opaque fill at full label contrast.
  expect(isTransparent(pressed.border)).toBe(false);
  expect(isTransparent(pressed.fill)).toBe(false);

  // A released one gives up both and dims its label.
  expect(isTransparent(released.border)).toBe(true);
  expect(isTransparent(released.fill)).toBe(true);
  expect(released.text).not.toBe(pressed.text);

  // The filter toggle is a toggle too, and follows the same pair.
  await expect(filterToggle).toHaveText("Hide filters");
  expect(await paint(filterToggle)).toEqual(pressed);

  await filterToggle.click();
  await expect(filterToggle).toHaveText("Show filters");
  // Parked away from the button, so this reads the resting state and not hover.
  await page.mouse.move(0, 0);
  expect(await paint(filterToggle)).toEqual(released);

  // Export and clear-filters command rather than report: they keep a border even
  // though export reports `data-state="closed"`, which is its menu's state and
  // not a grid setting.
  const exportControl = bar.locator('[data-slot="rdg-toolbar-export"]');
  await expect(exportControl).toHaveAttribute("data-state", "closed");
  const exportPaint = await paint(exportControl);
  const clearPaint = await paint(
    bar.locator('[data-slot="rdg-toolbar-clear-filters"]')
  );

  expect(isTransparent(exportPaint.border)).toBe(false);
  expect(isTransparent(clearPaint.border)).toBe(false);
  expect(exportPaint.text).toBe(pressed.text);

  // Hover moves the fill only, so it can never impersonate the state it covers.
  await releasedColumn.first().hover();
  const hovered = await paint(releasedColumn.first());

  expect(isTransparent(hovered.border)).toBe(true);
  expect(isTransparent(hovered.fill)).toBe(false);
  expect(hovered.fill).not.toBe(pressed.fill);
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
