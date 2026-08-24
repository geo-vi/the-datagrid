import {
  expect,
  test,
  type Download,
  type Locator,
  type Page,
} from "@playwright/test";

const ALL_COLUMN_IDS = [
  "csuserid",
  "csrolename",
  "csemail",
  "failed_login_attempts",
  "date_last_successful_login",
  "date_pwdchanged",
  "lang",
  "disabled",
  "tfa_enabled",
  "actions",
] as const;

const BYTE_ORDER_MARK = String.fromCharCode(0xfeff);

const INITIALLY_VISIBLE_COLUMN_IDS = [
  "csuserid",
  "csrolename",
  "csemail",
  "disabled",
  "tfa_enabled",
  "actions",
] as const;

function usersPreview(page: Page) {
  return page.getByTestId("example-preview-panel");
}

function usersGrid(preview: Locator) {
  return preview.locator(".InovuaReactDataGrid.tdg-root");
}

function visibilityToolbar(preview: Locator) {
  return preview.locator('[data-slot="rdg-toolbar"]');
}

function toggleList(toolbar: Locator) {
  return toolbar.locator('[data-slot="rdg-column-toggle-list"]');
}

function columnToggle(toolbar: Locator, columnId: string) {
  return toggleList(toolbar).locator(
    `[data-slot="rdg-column-toggle"][data-column-id="${columnId}"]`
  );
}

function toolbarActions(toolbar: Locator) {
  return toolbar.locator('[data-slot="rdg-toolbar-actions"]');
}

function exportMenuItem(page: Page, format: "csv" | "json") {
  return page.locator(
    `[data-slot="rdg-toolbar-export-format"][data-export-format="${format}"]`
  );
}

async function readDownload(download: Download): Promise<string> {
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];

  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString("utf8");
}

function columnHeader(grid: Locator, columnId: string) {
  return grid.locator(
    `[data-slot="grid-header-cell"][data-column-id="${columnId}"]`
  );
}

function mountedColumnCells(grid: Locator, columnId: string) {
  return grid.locator(`[data-slot="grid-row"] [data-column-id="${columnId}"]`);
}

async function columnIds(locator: Locator): Promise<string[]> {
  const elements = await locator.all();
  return Promise.all(
    elements.map(
      async (element) => (await element.getAttribute("data-column-id")) ?? ""
    )
  );
}

async function expectColumnIds(
  locator: Locator,
  expectedColumnIds: readonly string[]
) {
  await expect(locator).toHaveCount(expectedColumnIds.length);

  for (const [index, columnId] of expectedColumnIds.entries()) {
    await expect(locator.nth(index)).toHaveAttribute(
      "data-column-id",
      columnId
    );
  }
}

async function pressedState(
  toolbar: Locator
): Promise<Record<string, string | null>> {
  const state: Record<string, string | null> = {};

  for (const columnId of ALL_COLUMN_IDS) {
    state[columnId] = await columnToggle(toolbar, columnId).getAttribute(
      "aria-pressed"
    );
  }

  return state;
}

test.describe("external toolbar controls", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/examples/users");
  });

  test("reflects the registered grid order and initial visibility", async ({
    page,
  }) => {
    const preview = usersPreview(page);
    const grid = usersGrid(preview);
    const toolbar = visibilityToolbar(preview);
    const group = toggleList(toolbar);
    const toggles = group.locator('[data-slot="rdg-column-toggle"]');
    const description = toolbar.getByText(
      "Toggle columns, export the current view, and show or hide the filter row.",
      { exact: true }
    );

    await expect(preview).toBeVisible();
    await expect(grid).toHaveCount(1);
    await expect(grid).toBeVisible();
    await expect(toolbar).toBeVisible();
    await expect(toolbar).toHaveRole("region");
    await expect(toolbar).toHaveAccessibleName("Visible columns");
    await expect(
      toolbar.getByRole("heading", { level: 2, name: "Visible columns" })
    ).toBeVisible();
    await expect(group).toHaveRole("group");
    await expect(group).toHaveAccessibleName("Visible column toggles");
    const descriptionId = await description.getAttribute("id");
    expect(descriptionId).toBeTruthy();
    await expect(toolbar).toHaveAttribute("aria-describedby", descriptionId!);
    await expect(group).toHaveAttribute("aria-describedby", descriptionId!);
    await expectColumnIds(toggles, ALL_COLUMN_IDS);

    const initiallyVisible = new Set(INITIALLY_VISIBLE_COLUMN_IDS);
    for (const columnId of ALL_COLUMN_IDS) {
      const visible = initiallyVisible.has(
        columnId as (typeof INITIALLY_VISIBLE_COLUMN_IDS)[number]
      );
      await expect(columnToggle(toolbar, columnId)).toHaveAttribute(
        "aria-pressed",
        String(visible)
      );
      await expect(columnHeader(grid, columnId)).toHaveCount(visible ? 1 : 0);
    }

    await expectColumnIds(
      grid.locator('[data-slot="grid-header-cell"][data-column-id]'),
      INITIALLY_VISIBLE_COLUMN_IDS
    );
  });

  test("shows and hides columns independently with pointer input", async ({
    page,
  }) => {
    const preview = usersPreview(page);
    const grid = usersGrid(preview);
    const toolbar = visibilityToolbar(preview);
    const failedLoginsToggle = columnToggle(toolbar, "failed_login_attempts");
    const emailToggle = columnToggle(toolbar, "csemail");

    await expect(grid).toHaveCount(1);
    await expect(failedLoginsToggle).toHaveAttribute("aria-pressed", "false");
    await expect(columnHeader(grid, "failed_login_attempts")).toHaveCount(0);
    await expect(emailToggle).toHaveAttribute("aria-pressed", "true");
    await expect(columnHeader(grid, "csemail")).toBeVisible();

    await failedLoginsToggle.click();

    await expect(failedLoginsToggle).toHaveAttribute("aria-pressed", "true");
    await expect(columnHeader(grid, "failed_login_attempts")).toBeVisible();
    await expect(
      mountedColumnCells(grid, "failed_login_attempts").first()
    ).toBeVisible();

    await emailToggle.click();

    await expect(emailToggle).toHaveAttribute("aria-pressed", "false");
    await expect(columnHeader(grid, "csemail")).toHaveCount(0);
    await expect(mountedColumnCells(grid, "csemail")).toHaveCount(0);
    await expect(failedLoginsToggle).toHaveAttribute("aria-pressed", "true");
    await expect(columnHeader(grid, "csrolename")).toBeVisible();

    await emailToggle.click();
    await failedLoginsToggle.click();

    await expect(emailToggle).toHaveAttribute("aria-pressed", "true");
    await expect(columnHeader(grid, "csemail")).toBeVisible();
    await expect(failedLoginsToggle).toHaveAttribute("aria-pressed", "false");
    await expect(columnHeader(grid, "failed_login_attempts")).toHaveCount(0);
  });

  test("supports native keyboard toggling and retains focus", async ({
    page,
  }) => {
    const preview = usersPreview(page);
    const grid = usersGrid(preview);
    const toolbar = visibilityToolbar(preview);
    const languageToggle = columnToggle(toolbar, "lang");

    await expect(grid).toHaveCount(1);
    await expect(languageToggle).toHaveAccessibleName("Language");
    await languageToggle.focus();
    await expect(languageToggle).toBeFocused();

    await languageToggle.press(" ");

    await expect(languageToggle).toHaveAttribute("aria-pressed", "true");
    await expect(languageToggle).toBeFocused();
    await expect(columnHeader(grid, "lang")).toBeVisible();
    await expect(mountedColumnCells(grid, "lang").first()).toBeVisible();

    await languageToggle.press("Enter");

    await expect(languageToggle).toHaveAttribute("aria-pressed", "false");
    await expect(languageToggle).toBeFocused();
    await expect(columnHeader(grid, "lang")).toHaveCount(0);
    await expect(mountedColumnCells(grid, "lang")).toHaveCount(0);
  });

  test("keeps built-in export and filter controls isolated from visibility", async ({
    page,
  }) => {
    const preview = usersPreview(page);
    const grid = usersGrid(preview);
    const toolbar = visibilityToolbar(preview);
    const group = toggleList(toolbar);
    const actions = toolbarActions(toolbar);
    const initialPressedState = await pressedState(toolbar);
    const initialHeaderIds = await columnIds(
      grid.locator('[data-slot="grid-header-cell"][data-column-id]')
    );

    await expect(grid).toHaveCount(1);
    await expect(actions).toBeVisible();
    await expect(actions.getByRole("button", { name: "Export" })).toBeVisible();
    await expect(
      actions.getByRole("button", { name: "Hide filters" })
    ).toBeVisible();
    await expect(group.getByRole("button", { name: "Export" })).toHaveCount(0);
    await expect(
      group.getByRole("button", { name: "Hide filters" })
    ).toHaveCount(0);
    await expect(grid.locator(".tdg-filter-cell").first()).toBeVisible();

    await actions.getByRole("button", { name: "Hide filters" }).click();

    await expect(grid.locator(".tdg-filter-cell")).toHaveCount(0);
    await expect(
      actions.getByRole("button", { name: "Show filters" })
    ).toBeVisible();
    expect(await pressedState(toolbar)).toEqual(initialPressedState);
    expect(
      await columnIds(
        grid.locator('[data-slot="grid-header-cell"][data-column-id]')
      )
    ).toEqual(initialHeaderIds);

    await actions.getByRole("button", { name: "Export" }).click();
    await expect(exportMenuItem(page, "csv")).toBeVisible();
    // Opened by pointer, the menu takes focus itself and highlights nothing;
    // an arrow key is what moves onto the first format.
    await page.keyboard.press("ArrowDown");
    await expect(exportMenuItem(page, "csv")).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(exportMenuItem(page, "csv")).toHaveCount(0);
    await expect(actions.getByRole("button", { name: "Export" })).toBeFocused();
    expect(await pressedState(toolbar)).toEqual(initialPressedState);

    await actions.getByRole("button", { name: "Show filters" }).click();
    await expect(grid.locator(".tdg-filter-cell").first()).toBeVisible();
    expect(await pressedState(toolbar)).toEqual(initialPressedState);
  });

  test("exports the visible columns, honouring exportValue and exportWhenHidden", async ({
    page,
  }) => {
    const preview = usersPreview(page);
    const toolbar = visibilityToolbar(preview);
    const actions = toolbarActions(toolbar);

    await expect(usersGrid(preview)).toHaveCount(1);
    await actions.getByRole("button", { name: "Export" }).click();

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      exportMenuItem(page, "csv").click(),
    ]);

    expect(download.suggestedFilename()).toBe("users-grid.csv");

    const csv = await readDownload(download);
    // The CSV is written with a UTF-8 BOM so spreadsheet apps stop guessing.
    expect(csv.startsWith(BYTE_ORDER_MARK)).toBe(true);
    const [header, firstRow] = csv.slice(BYTE_ORDER_MARK.length).split("\r\n");

    // `failed_login_attempts` is hidden but marked exportWhenHidden; `actions`
    // is exportable:false; hidden columns without the flag stay out.
    expect(header).toBe("User #,Role,Email,Failed logins,Disabled,2FA");
    expect(firstRow).toBe(
      "1000,Administrator,user.1000@ikarus.demo,0,Yes,Disabled"
    );
    expect(csv).not.toContain("Actions");
    expect(csv).not.toContain("Language");

    // A toggled-off column drops out of the next export.
    await columnToggle(toolbar, "csemail").click();
    await actions.getByRole("button", { name: "Export" }).click();

    const [jsonDownload] = await Promise.all([
      page.waitForEvent("download"),
      exportMenuItem(page, "json").click(),
    ]);

    expect(jsonDownload.suggestedFilename()).toBe("users-grid.json");

    const records = JSON.parse(await readDownload(jsonDownload)) as Record<
      string,
      unknown
    >[];
    expect(records).toHaveLength(48);
    expect(Object.keys(records[0])).toEqual([
      "csuserid",
      "csrolename",
      "failed_login_attempts",
      "disabled",
      "tfa_enabled",
    ]);
    expect(records[0].disabled).toBe("Yes");
    expect(records[0].tfa_enabled).toBe("Disabled");
  });

  test("exports only the filtered rows and enables clearing filters", async ({
    page,
  }) => {
    const preview = usersPreview(page);
    const grid = usersGrid(preview);
    const toolbar = visibilityToolbar(preview);
    const actions = toolbarActions(toolbar);
    const clearFilters = actions.getByRole("button", {
      name: "Clear filters",
    });
    const roleFilter = grid
      .locator('.tdg-filter-cell[data-column-id="csrolename"]')
      .getByRole("combobox");

    await expect(grid).toHaveCount(1);
    await expect(clearFilters).toBeDisabled();

    await roleFilter.click();
    await page.getByRole("option", { name: "Billing Manager" }).click();

    await expect(clearFilters).toBeEnabled();
    await expect(preview.getByText("Filtered users: 12 / 48")).toBeVisible();

    await actions.getByRole("button", { name: "Export" }).click();
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      exportMenuItem(page, "json").click(),
    ]);

    const records = JSON.parse(await readDownload(download)) as Record<
      string,
      unknown
    >[];
    expect(records).toHaveLength(12);
    expect(
      records.every((record) => record.csrolename === "Billing Manager")
    ).toBe(true);

    await clearFilters.click();

    await expect(clearFilters).toBeDisabled();
    await expect(preview.getByText("Filtered users: 48 / 48")).toBeVisible();
  });

  test("never hides the final visible column", async ({ page }) => {
    const preview = usersPreview(page);
    const grid = usersGrid(preview);
    const toolbar = visibilityToolbar(preview);
    const survivorId = "csuserid";

    await expect(grid).toHaveCount(1);
    for (const columnId of INITIALLY_VISIBLE_COLUMN_IDS) {
      if (columnId === survivorId) continue;

      const toggle = columnToggle(toolbar, columnId);
      await toggle.click();
      await expect(toggle).toHaveAttribute("aria-pressed", "false");
      await expect(columnHeader(grid, columnId)).toHaveCount(0);
    }

    const survivor = columnToggle(toolbar, survivorId);
    await expect(survivor).toHaveAttribute("aria-pressed", "true");
    await expect(columnHeader(grid, survivorId)).toBeVisible();
    await expect(survivor).toBeDisabled();
    await expect(survivor).toHaveAttribute("aria-pressed", "true");
    await expect(columnHeader(grid, survivorId)).toBeVisible();
    await expect(
      grid.locator('[data-slot="grid-header-cell"][data-column-id]')
    ).toHaveCount(1);
  });
});

test("an explicit nested target follows controlled order after a remount", async ({
  page,
}) => {
  await page.goto("/compat/toolbar");

  const scope = page.getByTestId("toolbar-nested-target");
  const toolbar = visibilityToolbar(scope);
  const grid = usersGrid(scope);
  const toggles = toggleList(toolbar).locator(
    '[data-slot="rdg-column-toggle"]'
  );
  const headers = grid.locator(
    '[data-slot="grid-header-cell"][data-column-id]'
  );

  await expect(scope).toBeVisible();
  await expect(grid).toHaveCount(1);
  await expect(toolbar).toBeVisible();
  await expectColumnIds(toggles, ["id", "name", "city"]);
  await expectColumnIds(headers, ["id", "name"]);
  await expect(columnToggle(toolbar, "city")).toHaveAttribute(
    "aria-pressed",
    "false"
  );

  await page.getByTestId("toolbar-reverse-order").click();

  await expectColumnIds(toggles, ["city", "name", "id"]);
  await expectColumnIds(headers, ["name", "id"]);

  await page.getByTestId("toolbar-remount-grid").click();

  await expectColumnIds(toggles, ["city", "name", "id"]);
  await expectColumnIds(headers, ["name", "id"]);
  await expect(columnToggle(toolbar, "city")).toHaveAttribute(
    "aria-pressed",
    "false"
  );

  await columnToggle(toolbar, "city").click();

  await expect(columnToggle(toolbar, "city")).toHaveAttribute(
    "aria-pressed",
    "true"
  );
  await expectColumnIds(headers, ["city", "name", "id"]);
  await expect(mountedColumnCells(grid, "city").first()).toBeVisible();
});

test("auto-targets a direct grid and omits non-hideable columns", async ({
  page,
}) => {
  await page.goto("/compat/toolbar");

  const scope = page.getByTestId("toolbar-direct-target");
  const toolbar = visibilityToolbar(scope);
  const grid = usersGrid(scope);
  const toggles = toggleList(toolbar).locator(
    '[data-slot="rdg-column-toggle"]'
  );
  const optionalToggle = columnToggle(toolbar, "optional");

  await expect(scope).toBeVisible();
  await expect(grid).toHaveCount(1);
  await expect(toggles).toHaveCount(1);
  expect(await columnIds(toggles)).toEqual(["optional"]);
  await expect(columnToggle(toolbar, "locked")).toHaveCount(0);
  await expect(columnHeader(grid, "locked")).toBeVisible();
  await expect(columnHeader(grid, "optional")).toHaveCount(0);
  await expect(optionalToggle).toBeEnabled();
  await expect(optionalToggle).toHaveAttribute("aria-pressed", "false");

  await optionalToggle.click();
  await expect(optionalToggle).toHaveAttribute("aria-pressed", "true");
  await expect(columnHeader(grid, "optional")).toBeVisible();

  await optionalToggle.click();
  await expect(optionalToggle).toHaveAttribute("aria-pressed", "false");
  await expect(columnHeader(grid, "optional")).toHaveCount(0);
  await expect(columnHeader(grid, "locked")).toBeVisible();
});
