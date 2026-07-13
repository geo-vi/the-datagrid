import {
  devices,
  expect,
  test,
  type Locator,
  type Page,
} from "@playwright/test";

/**
 * Intentionally red compatibility contracts.
 *
 * These tests exercise only the-datagrid's local fixture. They use ordinary
 * assertions and must turn green one behavior at a time as the pending
 * Inovua contracts are implemented or the unsafe behavior is corrected.
 */

type PendingScenario =
  | "filter-callback"
  | "selection-enable"
  | "selection-derived"
  | "selection-disable"
  | "selection-disable-controlled"
  | "selection-callback-only"
  | "columns-default-15"
  | "columns-default-14"
  | "columns-threshold-at"
  | "columns-threshold-below"
  | "columns-force-on"
  | "columns-force-off"
  | "columns-function-height"
  | "columns-natural-height"
  | "columns-scroll"
  | "empty-literal"
  | "empty-key"
  | "empty-node"
  | "empty-function"
  | "empty-null"
  | "empty-false"
  | "empty-string"
  | "empty-loading"
  | "empty-filtered"
  | "empty-remote"
  | "empty-mobile"
  | "row-height-authority"
  | "editing-column-coordinate"
  | "editing-row-coordinate"
  | "zebra-imperative";

type FilterLogEvent = {
  kind: "column" | "aggregate";
  columnId?: string;
  columnIndex?: number;
  filterValue:
    | Array<{
        name: string;
        type: string;
        operator: string;
        value: unknown;
        active?: boolean | null;
      }>
    | {
        name: string;
        type: string;
        operator: string;
        value: unknown;
        active?: boolean | null;
      }
    | null;
  cellPropsPresent?: boolean;
  cellPropsId?: string | null;
  cellPropsColumnIndex?: number | null;
};

type ColumnStateSnapshot = {
  computedVirtualizeColumns: boolean | null;
  rowStyleVirtualizeColumns: boolean | null;
  rowStyleColumnRenderCount: number | null;
  rowStyleTotalColumnCount: number | null;
};

type EditorVirtualizationSnapshot = {
  columnId: string;
  columnIndex: number;
  virtualizeColumns: boolean | null;
};

type RowHeightSnapshot = {
  domHeight: number | null;
  virtualHeight: number | null;
  totalHeight: number | null;
};

type EditCoordinateEvent = {
  type: "stop" | "complete";
  rowId: string;
  rowIndex: number;
  columnId: string;
  columnIndex: number;
  value: unknown;
};

const RED_ASSERTION_TIMEOUT = 1_000;
const baseSelectionRowIds = ["row-1", "row-2", "row-3"] as const;

async function openPendingScenario(page: Page, scenario: PendingScenario) {
  await page.goto(`/compat/inovua-pending-parity?scenario=${scenario}`);

  const scope = page.getByTestId("inovua-pending-parity-scenario");
  await expect(scope).toHaveAttribute("data-scenario", scenario);
  await expect(
    scope.getByRole("heading", {
      name: `Pending Inovua parity: ${scenario}`,
    })
  ).toBeVisible();

  const grid = scope.locator(".InovuaReactDataGrid.tdg-root").first();
  await expect(grid).toBeVisible();
  return { scope, grid };
}

function row(grid: Locator, rowId: string) {
  return grid.locator(`[data-slot="grid-row"][data-row-id="${rowId}"]`);
}

function cell(grid: Locator, rowId: string, columnId: string) {
  return row(grid, rowId).locator(`[data-column-id="${columnId}"]`);
}

function header(grid: Locator, columnId: string) {
  return grid.locator(
    `[data-slot="grid-header-cell"][data-column-id="${columnId}"]`
  );
}

function renderedHeaders(grid: Locator) {
  return grid.locator('[data-slot="grid-header-cell"][data-column-id]');
}

function renderedRowCells(grid: Locator, rowId: string) {
  return row(grid, rowId).locator("[data-column-id]");
}

function nameFilterCell(grid: Locator) {
  return grid.locator(
    '.tdg-filter-cell:has([data-testid="pending-name-filter"])'
  );
}

async function readJson<T>(locator: Locator): Promise<T> {
  const text = (await locator.textContent())?.trim() ?? "";
  return JSON.parse(text) as T;
}

async function waitForAggregateEvent(scope: Locator) {
  await expect
    .poll(async () => {
      const events = await readJson<FilterLogEvent[]>(
        scope.getByTestId("filter-event-log")
      );
      return events.some((event) => event.kind === "aggregate");
    })
    .toBe(true);
}

async function captureColumnState(
  scope: Locator
): Promise<ColumnStateSnapshot> {
  await scope.getByTestId("capture-column-state").click();
  return readJson<ColumnStateSnapshot>(scope.getByTestId("column-state"));
}

test.describe("pending Inovua filtering contracts", () => {
  test("onColumnFilterValueChange precedes the aggregate callback for editor changes", async ({
    page,
  }) => {
    const { scope } = await openPendingScenario(page, "filter-callback");
    const editor = scope.getByTestId("pending-name-filter");
    await expect(editor).toBeVisible();

    await editor.fill("Grace");
    await waitForAggregateEvent(scope);

    const events = await readJson<FilterLogEvent[]>(
      scope.getByTestId("filter-event-log")
    );
    expect(events.map((event) => event.kind)).toEqual(["column", "aggregate"]);
    expect(events[0]).toMatchObject({
      kind: "column",
      columnId: "name",
      columnIndex: 1,
      filterValue: {
        name: "name",
        type: "string",
        operator: "contains",
        value: "Grace",
        active: null,
      },
      cellPropsPresent: true,
      cellPropsId: "name",
      cellPropsColumnIndex: 1,
    });
  });

  test("onColumnFilterValueChange reports operator changes before aggregate state", async ({
    page,
  }) => {
    const { scope, grid } = await openPendingScenario(page, "filter-callback");
    const filterCell = nameFilterCell(grid);
    await expect(filterCell).toBeVisible();

    await filterCell.getByRole("button", { name: "Filter" }).click();
    await page.getByRole("menuitemradio", { name: "Equals" }).click();
    await waitForAggregateEvent(scope);

    const events = await readJson<FilterLogEvent[]>(
      scope.getByTestId("filter-event-log")
    );
    expect(events.map((event) => event.kind)).toEqual(["column", "aggregate"]);
    expect(events[0]).toMatchObject({
      columnId: "name",
      columnIndex: 1,
      filterValue: { operator: "eq", value: "Ada", active: null },
      cellPropsPresent: true,
    });
  });

  test("onColumnFilterValueChange reports an inline clear with filter-cell context", async ({
    page,
  }) => {
    const { scope, grid } = await openPendingScenario(page, "filter-callback");
    const filterCell = nameFilterCell(grid);
    const clearButton = filterCell.getByRole("button", { name: "Clear" });
    await expect(clearButton).toBeVisible();

    await clearButton.click();
    await waitForAggregateEvent(scope);

    const events = await readJson<FilterLogEvent[]>(
      scope.getByTestId("filter-event-log")
    );
    expect(events.map((event) => event.kind)).toEqual(["column", "aggregate"]);
    expect(events[0]).toMatchObject({
      columnId: "name",
      columnIndex: 1,
      filterValue: { value: "", active: null },
      cellPropsPresent: true,
    });
  });

  test("imperative column set emits a per-column payload without cellProps", async ({
    page,
  }) => {
    const { scope } = await openPendingScenario(page, "filter-callback");

    await scope.getByTestId("set-column-filter").click();
    await waitForAggregateEvent(scope);
    const events = await readJson<FilterLogEvent[]>(
      scope.getByTestId("filter-event-log")
    );
    expect(events.map((event) => event.kind)).toEqual(["column", "aggregate"]);
    expect(events[0]).toMatchObject({
      columnId: "name",
      columnIndex: 1,
      filterValue: { value: "Grace", active: null },
      cellPropsPresent: false,
      cellPropsId: null,
      cellPropsColumnIndex: null,
    });
  });

  test("imperative column clear emits a per-column payload without cellProps", async ({
    page,
  }) => {
    const { scope } = await openPendingScenario(page, "filter-callback");

    await scope.getByTestId("clear-column-filter").click();
    await waitForAggregateEvent(scope);
    const events = await readJson<FilterLogEvent[]>(
      scope.getByTestId("filter-event-log")
    );
    expect(events.map((event) => event.kind)).toEqual(["column", "aggregate"]);
    expect(events[0]).toMatchObject({
      columnId: "name",
      columnIndex: 1,
      filterValue: { value: "", active: null },
      cellPropsPresent: false,
      cellPropsId: null,
      cellPropsColumnIndex: null,
    });
  });
});

test.describe("pending Inovua selection contracts", () => {
  test("enableSelection=true enables uncontrolled single row selection without a checkbox or callback", async ({
    page,
  }) => {
    const { grid } = await openPendingScenario(page, "selection-enable");
    const firstRow = row(grid, "row-1");
    const secondRow = row(grid, "row-2");
    await expect(firstRow).toHaveAttribute("data-selected", "false");

    await firstRow.click();
    expect.soft(await firstRow.getAttribute("data-selected")).toBe("true");

    await secondRow.click();
    expect({
      first: await firstRow.getAttribute("data-selected"),
      second: await secondRow.getAttribute("data-selected"),
    }).toEqual({ first: "false", second: "true" });
  });

  test("defaultSelected infers enabled multi-selection when enableSelection is omitted", async ({
    page,
  }) => {
    const { grid } = await openPendingScenario(page, "selection-derived");
    const firstRow = row(grid, "row-1");
    const secondRow = row(grid, "row-2");

    await firstRow.click();
    await secondRow.click({ modifiers: ["ControlOrMeta"] });

    expect({
      first: await firstRow.getAttribute("data-selected"),
      second: await secondRow.getAttribute("data-selected"),
    }).toEqual({ first: "true", second: "true" });
  });

  test("enableSelection=false overrides row-click selection and onSelectionChange", async ({
    page,
  }) => {
    const { scope, grid } = await openPendingScenario(
      page,
      "selection-disable"
    );
    const firstRow = row(grid, "row-1");

    await firstRow.click();

    expect({
      selected: await firstRow.getAttribute("data-selected"),
      events: await readJson<unknown[]>(
        scope.getByTestId("selection-event-log")
      ),
    }).toEqual({ selected: "false", events: [] });
  });

  test("enableSelection=false makes a row-checkbox action a no-op", async ({
    page,
  }) => {
    const { scope, grid } = await openPendingScenario(
      page,
      "selection-disable"
    );
    const rowCheckboxes = grid.locator(
      'tbody [data-slot="grid-row"] [role="checkbox"]'
    );
    await expect(rowCheckboxes).toHaveCount(3);

    await rowCheckboxes
      .nth(0)
      .evaluate((element) => (element as HTMLElement).click());

    expect({
      events: await readJson<unknown[]>(
        scope.getByTestId("selection-event-log")
      ),
      selected: await Promise.all(
        baseSelectionRowIds.map((rowId) =>
          row(grid, rowId).getAttribute("data-selected")
        )
      ),
    }).toEqual({ events: [], selected: ["false", "false", "false"] });
  });

  test("enableSelection=false makes the header-checkbox action a no-op", async ({
    page,
  }) => {
    const { scope, grid } = await openPendingScenario(
      page,
      "selection-disable"
    );
    const headerCheckbox = grid.locator('thead [role="checkbox"]');
    await expect(headerCheckbox).toHaveCount(1);

    await headerCheckbox.evaluate((element) =>
      (element as HTMLElement).click()
    );

    expect({
      events: await readJson<unknown[]>(
        scope.getByTestId("selection-event-log")
      ),
      selected: await Promise.all(
        baseSelectionRowIds.map((rowId) =>
          row(grid, rowId).getAttribute("data-selected")
        )
      ),
    }).toEqual({ events: [], selected: ["false", "false", "false"] });
  });

  test("enableSelection=false suppresses a controlled selected map", async ({
    page,
  }) => {
    const { grid } = await openPendingScenario(
      page,
      "selection-disable-controlled"
    );

    expect(await row(grid, "row-1").getAttribute("data-selected")).toBe(
      "false"
    );
  });

  test("onSelectionChange alone does not opt a grid into selection", async ({
    page,
  }) => {
    const { scope, grid } = await openPendingScenario(
      page,
      "selection-callback-only"
    );
    const firstRow = row(grid, "row-1");

    await firstRow.click();

    expect({
      selected: await firstRow.getAttribute("data-selected"),
      events: await readJson<unknown[]>(
        scope.getByTestId("selection-event-log")
      ),
    }).toEqual({ selected: "false", events: [] });
  });
});

test.describe("pending Inovua column-virtualization contracts", () => {
  test("uses the default threshold at 15 and leaves 14 visible columns unvirtualized", async ({
    page,
  }) => {
    let opened = await openPendingScenario(page, "columns-default-15");
    const headerCount = await renderedHeaders(opened.grid).count();
    const cellCount = await renderedRowCells(
      opened.grid,
      "virtual-row-1"
    ).count();
    expect.soft(headerCount).toBeGreaterThan(0);
    expect.soft(headerCount).toBeLessThan(15);
    expect.soft(cellCount).toBeGreaterThan(0);
    expect.soft(cellCount).toBeLessThan(15);

    let state = await captureColumnState(opened.scope);
    expect.soft(state).toMatchObject({
      computedVirtualizeColumns: true,
      rowStyleVirtualizeColumns: true,
      rowStyleTotalColumnCount: 15,
    });
    expect.soft(state.rowStyleColumnRenderCount ?? 15).toBeLessThan(15);

    opened = await openPendingScenario(page, "columns-default-14");
    await expect(renderedHeaders(opened.grid)).toHaveCount(14);
    await expect(renderedRowCells(opened.grid, "virtual-row-1")).toHaveCount(
      14
    );
    state = await captureColumnState(opened.scope);
    expect(state).toMatchObject({
      computedVirtualizeColumns: false,
      rowStyleVirtualizeColumns: false,
      rowStyleColumnRenderCount: 14,
      rowStyleTotalColumnCount: 14,
    });
  });

  test("virtualizeColumnsThreshold uses an inclusive visible-column boundary", async ({
    page,
  }) => {
    let opened = await openPendingScenario(page, "columns-threshold-at");
    expect.soft(await renderedHeaders(opened.grid).count()).toBeLessThan(20);
    expect
      .soft((await captureColumnState(opened.scope)).computedVirtualizeColumns)
      .toBe(true);

    opened = await openPendingScenario(page, "columns-threshold-below");
    await expect(renderedHeaders(opened.grid)).toHaveCount(20);
    await expect(renderedRowCells(opened.grid, "virtual-row-1")).toHaveCount(
      20
    );
    expect(
      (await captureColumnState(opened.scope)).computedVirtualizeColumns
    ).toBe(false);
  });

  test("explicit virtualizeColumns overrides the threshold in both directions", async ({
    page,
  }) => {
    let opened = await openPendingScenario(page, "columns-force-on");
    expect.soft(await renderedHeaders(opened.grid).count()).toBeLessThan(14);
    expect
      .soft((await captureColumnState(opened.scope)).computedVirtualizeColumns)
      .toBe(true);

    opened = await openPendingScenario(page, "columns-force-off");
    await expect(renderedHeaders(opened.grid)).toHaveCount(20);
    expect(
      (await captureColumnState(opened.scope)).computedVirtualizeColumns
    ).toBe(false);
  });

  test("numeric row heights enable column virtualization while function and natural heights disable it", async ({
    page,
  }) => {
    let opened = await openPendingScenario(page, "columns-force-on");
    expect.soft(await renderedHeaders(opened.grid).count()).toBeLessThan(14);
    expect
      .soft((await captureColumnState(opened.scope)).computedVirtualizeColumns)
      .toBe(true);

    for (const scenario of [
      "columns-function-height",
      "columns-natural-height",
    ] as const) {
      opened = await openPendingScenario(page, scenario);
      await expect(renderedHeaders(opened.grid)).toHaveCount(20);
      await expect(renderedRowCells(opened.grid, "virtual-row-1")).toHaveCount(
        20
      );
      expect(await captureColumnState(opened.scope)).toMatchObject({
        computedVirtualizeColumns: false,
        rowStyleVirtualizeColumns: false,
        rowStyleColumnRenderCount: 20,
        rowStyleTotalColumnCount: 20,
      });
    }
  });

  test("horizontal scrolling changes the mounted range while keeping header and body aligned", async ({
    page,
  }) => {
    const { scope, grid } = await openPendingScenario(page, "columns-scroll");
    const firstHeader = header(grid, "col-00");
    const lastHeader = header(grid, "col-23");
    const lastCell = cell(grid, "virtual-row-1", "col-23");
    const viewport = grid.locator('[data-slot="scroll-area-viewport"]');

    expect.soft(await lastHeader.count()).toBe(0);
    await scope.getByTestId("scroll-last-column").click();
    await expect
      .poll(() => viewport.evaluate((element) => element.scrollLeft), {
        timeout: RED_ASSERTION_TIMEOUT,
      })
      .toBeGreaterThan(0);
    await expect(lastHeader).toBeVisible({ timeout: RED_ASSERTION_TIMEOUT });
    await expect(lastCell).toBeVisible({ timeout: RED_ASSERTION_TIMEOUT });
    expect.soft(await firstHeader.count()).toBe(0);

    const scrollGeometry = await viewport.evaluate((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    }));
    expect
      .soft(scrollGeometry.scrollWidth)
      .toBeGreaterThan(scrollGeometry.clientWidth);
    expect.soft(scrollGeometry.scrollWidth).toBeGreaterThanOrEqual(24 * 140);
    expect.soft(scrollGeometry.scrollWidth).toBeLessThanOrEqual(24 * 140 + 24);

    const [headerBox, cellBox] = await Promise.all([
      lastHeader.boundingBox(),
      lastCell.boundingBox(),
    ]);
    expect(headerBox).not.toBeNull();
    expect(cellBox).not.toBeNull();
    expect(
      Math.abs((headerBox?.x ?? 0) - (cellBox?.x ?? 0))
    ).toBeLessThanOrEqual(1);
    expect(
      Math.abs((headerBox?.width ?? 0) - (cellBox?.width ?? 0))
    ).toBeLessThanOrEqual(1);

    const state = await captureColumnState(scope);
    expect(state.computedVirtualizeColumns).toBe(true);
    expect(state.rowStyleVirtualizeColumns).toBe(true);
    expect(state.rowStyleColumnRenderCount ?? 24).toBeLessThan(24);
  });

  test("a far virtualized column remains filterable after imperative scrolling", async ({
    page,
  }) => {
    const { scope, grid } = await openPendingScenario(page, "columns-scroll");
    expect.soft(await header(grid, "col-23").count()).toBe(0);

    await scope.getByTestId("scroll-last-column").click();
    const editor = scope.getByTestId("last-column-filter");
    await expect(editor).toBeVisible();
    await editor.fill("needle");

    await expect(
      grid.locator('[data-slot="grid-row"][data-row-id]')
    ).toHaveCount(1);
    await expect(row(grid, "virtual-row-1")).toBeVisible();
    expect((await captureColumnState(scope)).rowStyleVirtualizeColumns).toBe(
      true
    );
  });

  test("far-column editing reports virtualized cell metadata", async ({
    page,
  }) => {
    const { scope, grid } = await openPendingScenario(page, "columns-scroll");
    await scope.getByTestId("scroll-last-column").click();
    const targetCell = cell(grid, "virtual-row-1", "col-23");
    await expect(targetCell).toBeVisible();

    await targetCell.dblclick();
    await expect(targetCell.getByRole("textbox")).toBeFocused();

    const state = await readJson<EditorVirtualizationSnapshot>(
      scope.getByTestId("column-editor-state")
    );
    expect(state).toMatchObject({
      columnId: "col-23",
      columnIndex: 23,
      virtualizeColumns: true,
    });
  });
});

test.describe("pending Inovua emptyText contracts", () => {
  test("a literal emptyText overrides i18n.noRecords", async ({ page }) => {
    const { grid } = await openPendingScenario(page, "empty-literal");
    const literal = grid.getByText("Literal empty state", { exact: true });
    const fallback = grid.getByText("Localized empty fallback", {
      exact: true,
    });

    expect({
      literalCount: await literal.count(),
      literalVisible: await literal.isVisible(),
      fallbackCount: await fallback.count(),
    }).toEqual({ literalCount: 1, literalVisible: true, fallbackCount: 0 });
  });

  test("an emptyText i18n key resolves through the supplied map", async ({
    page,
  }) => {
    const { grid } = await openPendingScenario(page, "empty-key");
    const localized = grid.getByText("Localized custom empty", {
      exact: true,
    });
    const fallback = grid.getByText("Localized empty fallback", {
      exact: true,
    });

    expect({
      localizedCount: await localized.count(),
      localizedVisible: await localized.isVisible(),
      fallbackCount: await fallback.count(),
    }).toEqual({ localizedCount: 1, localizedVisible: true, fallbackCount: 0 });
  });

  test("emptyText preserves an interactive React node", async ({ page }) => {
    const { scope, grid } = await openPendingScenario(page, "empty-node");
    const action = grid.getByTestId("empty-node-action");
    expect({
      count: await action.count(),
      visible: await action.isVisible(),
    }).toEqual({ count: 1, visible: true });

    await action.click();
    await expect(scope.getByTestId("empty-action-count")).toHaveText("1");
  });

  test("emptyText invokes and renders a zero-argument function", async ({
    page,
  }) => {
    const { scope, grid } = await openPendingScenario(page, "empty-function");
    const action = grid.getByTestId("empty-function-action");
    expect({
      count: await action.count(),
      visible: await action.isVisible(),
    }).toEqual({ count: 1, visible: true });

    await action.click();
    await expect(scope.getByTestId("empty-action-count")).toHaveText("1");
  });

  for (const { scenario, label } of [
    { scenario: "empty-null", label: "null" },
    { scenario: "empty-false", label: "false" },
    { scenario: "empty-string", label: "an empty string" },
  ] as const) {
    test(`${label} suppresses empty-state content`, async ({ page }) => {
      const { grid } = await openPendingScenario(page, scenario);
      const fallback = grid.getByText("Localized empty fallback", {
        exact: true,
      });
      const bodyText = (await grid.locator("tbody").allTextContents())
        .join("")
        .trim();

      expect({ fallbackCount: await fallback.count(), bodyText }).toEqual({
        fallbackCount: 0,
        bodyText: "",
      });
    });
  }

  test("loading suppresses emptyText until loading finishes", async ({
    page,
  }) => {
    const { scope, grid } = await openPendingScenario(page, "empty-loading");
    await expect(grid.getByText("Loading…", { exact: true })).toBeVisible();
    await expect(grid.getByTestId("loading-empty-content")).toHaveCount(0);

    await scope.getByTestId("finish-empty-loading").click();
    await expect(grid.getByText("Loading…", { exact: true })).toHaveCount(0);
    const customContent = grid.getByTestId("loading-empty-content");
    expect({
      count: await customContent.count(),
      visible: await customContent.isVisible(),
    }).toEqual({ count: 1, visible: true });
  });

  test("filtered local data uses emptyText after the filter removes every row", async ({
    page,
  }) => {
    const { grid } = await openPendingScenario(page, "empty-filtered");
    await expect(
      grid.locator('[data-slot="grid-row"][data-row-id]')
    ).toHaveCount(0);
    const customContent = grid.getByTestId("filtered-empty-content");
    expect({
      count: await customContent.count(),
      visible: await customContent.isVisible(),
    }).toEqual({ count: 1, visible: true });
  });

  test("remote empty data hides emptyText while loading and shows it after resolution", async ({
    page,
  }) => {
    const { grid } = await openPendingScenario(page, "empty-remote");
    await expect(grid.getByText("Loading…", { exact: true })).toBeVisible();
    await expect(grid.getByTestId("remote-empty-content")).toHaveCount(0);

    await page.getByTestId("resolve-remote-empty").click();
    await expect(grid.getByText("Loading…", { exact: true })).toHaveCount(0);
    const customContent = grid.getByTestId("remote-empty-content");
    expect({
      count: await customContent.count(),
      visible: await customContent.isVisible(),
    }).toEqual({ count: 1, visible: true });
  });

  test("mobile-list empty state uses the same emptyText resolver", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 800, height: 900 });
    const { grid } = await openPendingScenario(page, "empty-mobile");
    await expect(grid).toHaveAttribute("data-layout", "mobile-list");
    const list = grid.locator('[data-slot="mobile-grid-list"] [role="list"]');
    await expect(list).toBeVisible();
    const customContent = list.getByTestId("mobile-empty-content");
    const fallback = list.getByText("Localized empty fallback", {
      exact: true,
    });
    expect({
      customCount: await customContent.count(),
      customVisible: await customContent.isVisible(),
      fallbackCount: await fallback.count(),
    }).toEqual({ customCount: 1, customVisible: true, fallbackCount: 0 });
  });
});

test.describe("unsafe implemented-contract edges", () => {
  test("an explicit numeric rowHeight remains authoritative over minRowHeight", async ({
    page,
  }) => {
    const { scope } = await openPendingScenario(page, "row-height-authority");
    await scope.getByTestId("capture-row-height-authority").click();
    const snapshot = await readJson<RowHeightSnapshot>(
      scope.getByTestId("row-height-authority-state")
    );

    expect(snapshot).toEqual({
      domHeight: 60,
      virtualHeight: 60,
      totalHeight: 1200,
    });
  });

  test("active editing stays coordinate-anchored when columns reorder", async ({
    page,
  }) => {
    const { scope, grid } = await openPendingScenario(
      page,
      "editing-column-coordinate"
    );
    const originalName = cell(grid, "edit-r1", "name");
    await originalName.dblclick();
    const activeEditor = grid.getByRole("textbox");
    await expect(activeEditor).toHaveCount(1);
    await activeEditor.fill("Draft column");

    await scope.getByTestId("reorder-edit-columns").click();
    await expect(header(grid, "team")).toHaveAttribute(
      "data-column-index",
      "0"
    );
    expect
      .soft({
        teamEditors: await cell(grid, "edit-r1", "team")
          .getByRole("textbox")
          .count(),
        nameEditors: await cell(grid, "edit-r1", "name")
          .getByRole("textbox")
          .count(),
      })
      .toEqual({ teamEditors: 1, nameEditors: 0 });

    await grid.getByRole("textbox").press("Enter");
    await expect
      .poll(
        async () =>
          readJson<EditCoordinateEvent[]>(
            scope.getByTestId("editing-coordinate-events")
          ),
        { timeout: RED_ASSERTION_TIMEOUT }
      )
      .toContainEqual({
        type: "complete",
        rowId: "edit-r1",
        rowIndex: 0,
        columnId: "team",
        columnIndex: 0,
        value: "Draft column",
      });
  });

  test("active editing stays coordinate-anchored when rows reorder", async ({
    page,
  }) => {
    const { scope, grid } = await openPendingScenario(
      page,
      "editing-row-coordinate"
    );
    await cell(grid, "edit-r1", "name").dblclick();
    const activeEditor = grid.getByRole("textbox");
    await expect(activeEditor).toHaveCount(1);
    await activeEditor.fill("Draft row");

    await scope.getByTestId("reorder-edit-rows").click();
    await expect(row(grid, "edit-r2")).toHaveAttribute("data-row-index", "0");
    expect
      .soft({
        secondRowEditors: await cell(grid, "edit-r2", "name")
          .getByRole("textbox")
          .count(),
        firstRowEditors: await cell(grid, "edit-r1", "name")
          .getByRole("textbox")
          .count(),
      })
      .toEqual({ secondRowEditors: 1, firstRowEditors: 0 });

    await grid.getByRole("textbox").press("Enter");
    await expect
      .poll(
        async () =>
          readJson<EditCoordinateEvent[]>(
            scope.getByTestId("editing-coordinate-events")
          ),
        { timeout: RED_ASSERTION_TIMEOUT }
      )
      .toContainEqual({
        type: "complete",
        rowId: "edit-r2",
        rowIndex: 0,
        columnId: "name",
        columnIndex: 0,
        value: "Draft row",
      });
  });

  test("the computed API can update uncontrolled showZebraRows state", async ({
    page,
  }) => {
    const { scope, grid } = await openPendingScenario(page, "zebra-imperative");
    await expect(grid).toHaveAttribute("data-show-zebra-rows", "true");

    await scope.getByTestId("disable-zebra-imperatively").click();

    await expect(scope.getByTestId("zebra-setter-present")).toHaveText("true", {
      timeout: RED_ASSERTION_TIMEOUT,
    });
    await expect(grid).toHaveAttribute("data-show-zebra-rows", "false", {
      timeout: RED_ASSERTION_TIMEOUT,
    });
  });
});

test.describe("unsafe touch-resize contract", () => {
  test.use({
    userAgent: devices["Pixel 7"].userAgent,
    viewport: devices["Pixel 7"].viewport,
    deviceScaleFactor: devices["Pixel 7"].deviceScaleFactor,
    isMobile: devices["Pixel 7"].isMobile,
    hasTouch: devices["Pixel 7"].hasTouch,
  });

  test("touch dragging a resize handle resizes and emits onColumnResize", async ({
    page,
  }) => {
    await page.goto("/compat/inovua-parity?scenario=resize-callback");
    const scope = page.getByTestId("inovua-parity-scenario");
    const grid = scope.locator(".InovuaReactDataGrid.tdg-root").first();
    await expect(grid).toBeVisible();
    const descriptionHeader = header(grid, "description");
    const resizer = descriptionHeader.locator('[data-slot="column-resizer"]');
    await expect(resizer).toHaveCount(1);
    const beforeWidth = await descriptionHeader.evaluate((element) =>
      Math.round(element.getBoundingClientRect().width)
    );
    const box = await resizer.boundingBox();
    expect(box).not.toBeNull();

    const session = await page.context().newCDPSession(page);
    const x = Math.round((box?.x ?? 0) + (box?.width ?? 0) / 2);
    const y = Math.round((box?.y ?? 0) + (box?.height ?? 0) / 2);
    await session.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x, y }],
    });
    await session.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: x + 1, y }],
    });
    await session.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: x + 91, y }],
    });
    await session.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await session.detach();

    await expect(scope.getByTestId("column-resize-event-count")).toHaveText(
      "1",
      { timeout: RED_ASSERTION_TIMEOUT }
    );
    const event = await readJson<{
      columnId: string;
      width: number;
      flex: number | null;
      reservedViewportWidth: number;
    }>(scope.getByTestId("column-resize-last-event"));
    expect(event).toMatchObject({
      columnId: "description",
      flex: null,
      reservedViewportWidth: 0,
    });
    expect(event.width).toBeGreaterThan(beforeWidth + 75);
    expect(
      await descriptionHeader.evaluate((element) =>
        Math.round(element.getBoundingClientRect().width)
      )
    ).toBeGreaterThan(beforeWidth + 75);
  });
});
