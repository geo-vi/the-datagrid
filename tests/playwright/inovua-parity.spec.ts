import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * Browser-level compatibility contract for the approved Inovua Community
 * behaviors implemented by the-datagrid.
 */

type ParityScenario =
  | "natural-height"
  | "function-row-height"
  | "bounded-row-height"
  | "natural-resize"
  | "resize-callback"
  | "zebra-default"
  | "zebra-disabled"
  | "editing-default"
  | "editing-click"
  | "editing-custom"
  | "editing-async"
  | "editing-completion"
  | "editing-navigation"
  | "editing-imperative"
  | "editing-mobile"
  | "row-style"
  | "row-style-static"
  | "row-style-contract"
  | "flex"
  | "controlled-width";

type NaturalMeasurement = {
  domHeight: number | null;
  virtualHeight: number | null;
  virtualStart: number | null;
  virtualEnd: number | null;
  nextVirtualStart: number | null;
  totalVirtualHeight: number | null;
};

type EditEvent = {
  type: "start" | "stop" | "complete" | "cancel" | "value";
  rowId: string | number;
  rowIndex: number;
  columnId: string;
  columnIndex: number;
  value: unknown;
};

type ResizeEvent = {
  columnId: string;
  width: number | null;
  flex: number | null;
  reservedViewportWidth: number | null;
};

type CustomEditorContractReport = {
  topLevelMarker: unknown;
  nestedMarker: unknown;
  theme: unknown;
  rtl: unknown;
  nativeScroll: unknown;
  hasCell: boolean;
  hasCellProps: boolean;
  getDOMNodeColumnId: string | null;
  secondCellPropsSame: boolean;
  thirdCellSame: boolean;
  hasGotoNext: boolean;
  hasGotoPrev: boolean;
  hasClickHandler: boolean;
};

type ImperativeSnapshot = {
  info: {
    rowId: string | number;
    rowIndex: number;
    columnId: string;
    columnIndex: number;
    value?: unknown;
  } | null;
  isInEdit: boolean;
  hasCompletionPromise: boolean;
};

async function openScenario(page: Page, scenario: ParityScenario) {
  await page.goto(`/compat/inovua-parity?scenario=${scenario}`);

  const scope = page.getByTestId("inovua-parity-scenario");
  await expect(scope).toHaveAttribute("data-scenario", scenario);
  await expect(
    scope.getByRole("heading", { name: `Inovua parity: ${scenario}` })
  ).toBeVisible();

  const grid = scope.locator(".InovuaReactDataGrid.tdg-root").first();
  await expect(grid).toBeVisible();

  return { scope, grid };
}

function row(grid: Locator, rowId: string): Locator {
  return grid.locator(`[data-slot="grid-row"][data-row-id="${rowId}"]`);
}

function cell(grid: Locator, rowId: string, columnId: string): Locator {
  return row(grid, rowId).locator(`[data-column-id="${columnId}"]`);
}

function header(grid: Locator, columnId: string): Locator {
  return grid.locator(
    `[data-slot="grid-header-cell"][data-column-id="${columnId}"]`
  );
}

async function readJson<T>(locator: Locator): Promise<T> {
  const text = (await locator.textContent())?.trim() ?? "";
  return JSON.parse(text) as T;
}

async function readHeight(locator: Locator): Promise<number> {
  return locator.evaluate((element) =>
    Math.round(element.getBoundingClientRect().height)
  );
}

async function readWidth(locator: Locator): Promise<number> {
  return locator.evaluate((element) =>
    Math.round(element.getBoundingClientRect().width)
  );
}

async function moveColumnBy(
  page: Page,
  grid: Locator,
  columnId: string,
  deltaX: number
): Promise<void> {
  const resizer = header(grid, columnId)
    .locator('[data-slot="column-resizer"]')
    .first();
  await expect(resizer).toBeVisible();

  const box = await resizer.boundingBox();
  expect(box).not.toBeNull();

  const x = (box?.x ?? 0) + (box?.width ?? 0) / 2;
  const y = (box?.y ?? 0) + (box?.height ?? 0) / 2;

  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + deltaX, y, { steps: 6 });
}

async function dragColumnBy(
  page: Page,
  grid: Locator,
  columnId: string,
  deltaX: number
): Promise<void> {
  await moveColumnBy(page, grid, columnId, deltaX);
  await page.mouse.up();
}

async function rowBackground(rowLocator: Locator): Promise<string> {
  return rowLocator.evaluate((element) => {
    const rowColor = getComputedStyle(element).backgroundColor;
    if (rowColor !== "rgba(0, 0, 0, 0)") return rowColor;

    const firstCell = element.querySelector<HTMLElement>("td");
    return firstCell ? getComputedStyle(firstCell).backgroundColor : rowColor;
  });
}

function expectOrderedSubsequence(
  actual: EditEvent["type"][],
  expected: EditEvent["type"][]
): void {
  let previousIndex = -1;

  for (const eventType of expected) {
    const nextIndex = actual.indexOf(eventType, previousIndex + 1);
    expect(
      nextIndex,
      `missing ordered edit event: ${eventType}`
    ).toBeGreaterThan(previousIndex);
    previousIndex = nextIndex;
  }
}

test.describe("Inovua Community parity", () => {
  test("measures natural virtualized rows and honors minRowHeight", async ({
    page,
  }) => {
    const { scope, grid } = await openScenario(page, "natural-height");
    const tallRow = row(grid, "natural-tall");
    const shortRow = row(grid, "natural-short");

    await expect(tallRow).toBeVisible();
    await expect(shortRow).toBeVisible();
    await scope.getByTestId("capture-natural-height").click();

    await expect
      .poll(async () => {
        const value = await readJson<NaturalMeasurement>(
          scope.getByTestId("natural-tall-measurement")
        );
        return value.domHeight;
      })
      .not.toBeNull();

    const tall = await readJson<NaturalMeasurement>(
      scope.getByTestId("natural-tall-measurement")
    );
    const short = await readJson<NaturalMeasurement>(
      scope.getByTestId("natural-short-measurement")
    );

    expect(tall.domHeight ?? 0).toBeGreaterThanOrEqual(104);
    expect(short.domHeight ?? 0).toBeGreaterThanOrEqual(52);
    expect(
      Math.abs((tall.virtualHeight ?? 0) - (tall.domHeight ?? 0))
    ).toBeLessThanOrEqual(2);
    expect(
      Math.abs((short.virtualHeight ?? 0) - (short.domHeight ?? 0))
    ).toBeLessThanOrEqual(2);
    expect(
      Math.abs((tall.nextVirtualStart ?? 0) - (tall.virtualEnd ?? 0))
    ).toBeLessThanOrEqual(2);
  });

  test("smooth-scrolls natural rows using measured virtual offsets", async ({
    page,
  }) => {
    const { scope, grid } = await openScenario(page, "natural-height");
    await expect(row(grid, "natural-tall")).toBeVisible();
    const viewport = grid.locator('[data-slot="scroll-area-viewport"]');

    // Ensure the first row's 104px DOM height has replaced the 52px estimate
    // before asking for an offset beyond it.
    await scope.getByTestId("capture-natural-height").click();
    await expect
      .poll(async () => {
        const measurement = await readJson<NaturalMeasurement>(
          scope.getByTestId("natural-tall-measurement")
        );
        if (
          measurement.domHeight == null ||
          measurement.virtualHeight == null
        ) {
          return Number.POSITIVE_INFINITY;
        }

        return Math.abs(measurement.virtualHeight - measurement.domHeight);
      })
      .toBeLessThanOrEqual(2);
    const measuredTallRow = await readJson<NaturalMeasurement>(
      scope.getByTestId("natural-tall-measurement")
    );
    expect(measuredTallRow.virtualHeight ?? 0).toBeGreaterThanOrEqual(104);

    await viewport.evaluate((element) => {
      const scrollElement = element as HTMLElement;
      const originalScrollTo = scrollElement.scrollTo.bind(scrollElement);

      scrollElement.scrollTo = ((
        optionsOrX?: ScrollToOptions | number,
        y?: number
      ) => {
        scrollElement.dataset.testScrollBehavior =
          typeof optionsOrX === "object" && optionsOrX !== null
            ? String(optionsOrX.behavior ?? "auto")
            : "coordinates";
        if (typeof optionsOrX === "number") {
          originalScrollTo(optionsOrX, y ?? 0);
        } else {
          originalScrollTo(optionsOrX);
        }
      }) as typeof scrollElement.scrollTo;
    });
    await scope.getByTestId("smooth-scroll-natural").click();
    await expect(viewport).toHaveAttribute(
      "data-test-scroll-behavior",
      "smooth"
    );

    const targetRow = row(grid, "natural-11");
    await expect(targetRow).toBeVisible();
    await expect
      .poll(async () => {
        const [targetBox, viewportBox] = await Promise.all([
          targetRow.boundingBox(),
          viewport.boundingBox(),
        ]);
        if (!targetBox || !viewportBox) return Number.POSITIVE_INFINITY;

        return Math.abs(targetBox.y - viewportBox.y);
      })
      .toBeLessThanOrEqual(3);
  });

  test("supports a rowHeight function for deterministic per-row heights", async ({
    page,
  }) => {
    const { grid } = await openScenario(page, "function-row-height");
    const firstRow = row(grid, "row-1");
    const secondRow = row(grid, "row-2");

    await expect(firstRow).toBeVisible();
    await expect(secondRow).toBeVisible();

    const [firstHeight, secondHeight] = await Promise.all([
      readHeight(firstRow),
      readHeight(secondRow),
    ]);

    expect(Math.abs(firstHeight - 88)).toBeLessThanOrEqual(2);
    expect(Math.abs(secondHeight - 48)).toBeLessThanOrEqual(2);
  });

  test("clamps function row heights to minRowHeight and maxRowHeight in DOM and virtual offsets", async ({
    page,
  }) => {
    const { scope, grid } = await openScenario(page, "bounded-row-height");
    const maximumRow = row(grid, "bounded-1");
    const minimumRow = row(grid, "bounded-2");
    await expect(maximumRow).toBeVisible();
    await expect(minimumRow).toBeVisible();

    await scope.getByTestId("capture-bounded-height").click();
    await expect
      .poll(async () => {
        const value = await readJson<NaturalMeasurement>(
          scope.getByTestId("bounded-maximum")
        );
        return value.virtualHeight;
      })
      .toBe(80);

    const [maximum, minimum] = await Promise.all([
      readJson<NaturalMeasurement>(scope.getByTestId("bounded-maximum")),
      readJson<NaturalMeasurement>(scope.getByTestId("bounded-minimum")),
    ]);

    expect(Math.abs((maximum.domHeight ?? 0) - 80)).toBeLessThanOrEqual(2);
    expect(maximum.virtualHeight).toBe(80);
    expect(
      Math.abs((maximum.nextVirtualStart ?? 0) - (maximum.virtualEnd ?? 0))
    ).toBeLessThanOrEqual(2);
    expect(Math.abs((minimum.domHeight ?? 0) - 40)).toBeLessThanOrEqual(2);
    expect(minimum.virtualHeight).toBe(40);
    expect(
      Math.abs((minimum.nextVirtualStart ?? 0) - (minimum.virtualEnd ?? 0))
    ).toBeLessThanOrEqual(2);
  });

  test("remeasures natural virtual rows when a controlled column width changes", async ({
    page,
  }) => {
    const { scope, grid } = await openScenario(page, "natural-resize");
    const firstRow = row(grid, "resize-natural-1");
    await expect(firstRow).toBeVisible();

    await scope.getByTestId("capture-natural-resize").click();
    await expect
      .poll(async () => {
        const value = await readJson<NaturalMeasurement>(
          scope.getByTestId("natural-resize-measurement")
        );
        return value.domHeight;
      })
      .not.toBeNull();
    const before = await readJson<NaturalMeasurement>(
      scope.getByTestId("natural-resize-measurement")
    );

    await scope.getByTestId("widen-natural-column").click();
    await expect(scope.getByTestId("natural-resize-width")).toHaveText("360");
    await expect
      .poll(() => readWidth(header(grid, "description")))
      .toBeGreaterThan(340);
    await expect
      .poll(() => readHeight(firstRow))
      .toBeLessThan((before.domHeight ?? 0) - 20);

    await scope.getByTestId("capture-natural-resize").click();
    await expect
      .poll(async () => {
        const value = await readJson<NaturalMeasurement>(
          scope.getByTestId("natural-resize-measurement")
        );
        return value.domHeight;
      })
      .toBeLessThan((before.domHeight ?? 0) - 20);
    const after = await readJson<NaturalMeasurement>(
      scope.getByTestId("natural-resize-measurement")
    );

    expect(
      Math.abs((after.virtualHeight ?? 0) - (after.domHeight ?? 0))
    ).toBeLessThanOrEqual(2);
    expect(after.virtualHeight ?? 0).toBeLessThan(
      (before.virtualHeight ?? 0) - 20
    );
    expect(after.totalVirtualHeight ?? 0).toBeLessThan(
      before.totalVirtualHeight ?? 0
    );
    expect(
      Math.abs((after.nextVirtualStart ?? 0) - (after.virtualEnd ?? 0))
    ).toBeLessThanOrEqual(2);
  });

  test("emits the documented onColumnResize payload", async ({ page }) => {
    const { scope, grid } = await openScenario(page, "resize-callback");
    const descriptionHeader = header(grid, "description");
    const initialWidth = await readWidth(descriptionHeader);

    await moveColumnBy(page, grid, "description", 100);
    await expect(scope.getByTestId("column-resize-event-count")).toHaveText(
      "0"
    );
    await page.mouse.up();

    await expect
      .poll(async () =>
        Number(
          (
            await scope.getByTestId("column-resize-event-count").textContent()
          )?.trim() ?? "0"
        )
      )
      .toBe(1);

    const event = await readJson<ResizeEvent>(
      scope.getByTestId("column-resize-last-event")
    );
    const renderedWidth = await readWidth(descriptionHeader);

    expect(event.columnId).toBe("description");
    expect(event.width).not.toBeNull();
    expect(event.reservedViewportWidth).not.toBeNull();
    expect(Math.abs((event.width ?? 0) - renderedWidth)).toBeLessThanOrEqual(3);
    expect(event.width ?? 0).toBeGreaterThan(initialWidth + 70);
  });

  test("shows visibly different zebra rows by default", async ({ page }) => {
    const { grid } = await openScenario(page, "zebra-default");
    const firstRow = row(grid, "row-1");
    const secondRow = row(grid, "row-2");
    await expect(firstRow).toBeVisible();
    await expect(secondRow).toBeVisible();

    const [firstBackground, secondBackground] = await Promise.all([
      rowBackground(firstRow),
      rowBackground(secondRow),
    ]);

    expect(firstBackground).not.toBe(secondBackground);
  });

  test("showZebraRows=false disables odd/even styling", async ({ page }) => {
    const { grid } = await openScenario(page, "zebra-disabled");
    const firstRow = row(grid, "row-1");
    const secondRow = row(grid, "row-2");
    await expect(firstRow).toBeVisible();
    await expect(secondRow).toBeVisible();

    const [firstBackground, secondBackground] = await Promise.all([
      rowBackground(firstRow),
      rowBackground(secondRow),
    ]);

    expect(firstBackground).toBe(secondBackground);
  });

  test("default double-click editing completes and navigates with the original payload", async ({
    page,
  }) => {
    const { scope, grid } = await openScenario(page, "editing-default");
    const firstNameCell = cell(grid, "row-1", "name");
    const secondNameCell = cell(grid, "row-2", "name");

    await firstNameCell.click();
    await expect(firstNameCell.getByRole("textbox")).toHaveCount(0);
    await firstNameCell.dblclick();

    const editor = firstNameCell.getByRole("textbox");
    await expect(editor).toBeVisible();
    await expect(editor).toBeFocused();
    await expect(editor).toHaveAccessibleName("Name");
    await expect(editor).toHaveValue("Ada Lovelace");

    await editor.fill("Augusta Ada");
    await editor.press("Enter");

    await expect
      .poll(async () => {
        const events = await readJson<EditEvent[]>(
          scope.getByTestId("edit-events")
        );
        return events.some((event) => event.type === "complete");
      })
      .toBe(true);

    const events = await readJson<EditEvent[]>(
      scope.getByTestId("edit-events")
    );
    const firstCellEventTypes = events
      .filter((event) => event.rowId === "row-1" && event.columnId === "name")
      .map((event) => event.type);
    expectOrderedSubsequence(firstCellEventTypes, [
      "start",
      "value",
      "stop",
      "complete",
    ]);
    const complete = events.find((event) => event.type === "complete");
    expect(complete).toMatchObject({
      rowId: "row-1",
      rowIndex: 0,
      columnId: "name",
      columnIndex: 1,
      value: "Augusta Ada",
    });

    await expect(secondNameCell.getByRole("textbox")).toBeFocused();
    await expect(firstNameCell).toContainText("Ada Lovelace");
  });

  test("editStartEvent=click, Escape cancellation, and column.editable=false work together", async ({
    page,
  }) => {
    const { scope, grid } = await openScenario(page, "editing-click");
    const nameCell = cell(grid, "row-1", "name");
    const idCell = cell(grid, "row-1", "id");

    await nameCell.click();
    const editor = nameCell.getByRole("textbox");
    await expect(editor).toBeVisible();
    await expect(editor).toBeFocused();
    await editor.fill("Discard this value");
    await editor.press("Escape");

    await expect(nameCell.getByRole("textbox")).toHaveCount(0);
    await expect(nameCell).toContainText("Ada Lovelace");

    const events = await readJson<EditEvent[]>(
      scope.getByTestId("edit-events")
    );
    const firstCellEventTypes = events
      .filter((event) => event.rowId === "row-1" && event.columnId === "name")
      .map((event) => event.type);
    expectOrderedSubsequence(firstCellEventTypes, [
      "start",
      "value",
      "stop",
      "cancel",
    ]);
    expect(events.some((event) => event.type === "complete")).toBe(false);

    await idCell.click();
    await expect(idCell.getByRole("textbox")).toHaveCount(0);
  });

  test("passes the Inovua custom editor contract and renderEditor cell arguments", async ({
    page,
  }) => {
    const { scope, grid } = await openScenario(page, "editing-custom");
    const nameCell = cell(grid, "row-1", "name");
    await nameCell.dblclick();

    const editor = nameCell.getByTestId("compat-custom-editor");
    await expect(editor).toBeVisible();
    await expect(editor).toBeFocused();
    await expect
      .poll(async () =>
        (
          await scope.getByTestId("custom-editor-contract").textContent()
        )?.trim()
      )
      .not.toBe("none");

    const report = await readJson<CustomEditorContractReport>(
      scope.getByTestId("custom-editor-contract")
    );
    expect(report).toMatchObject({
      topLevelMarker: "column-editor-props",
      nestedMarker: "column-editor-props",
      theme: "default",
      rtl: false,
      hasCell: true,
      hasCellProps: true,
      getDOMNodeColumnId: "name",
      secondCellPropsSame: true,
      thirdCellSame: true,
      hasGotoNext: true,
      hasGotoPrev: true,
      hasClickHandler: true,
    });
    expect(typeof report.nativeScroll).toBe("boolean");

    const bubblesBefore = Number(
      (await scope.getByTestId("custom-editor-bubbles").textContent())?.trim()
    );
    await editor.click();
    await expect(scope.getByTestId("custom-editor-bubbles")).toHaveText(
      String(bubblesBefore)
    );
  });

  test("invalidates stale async editability and contains falsy and rejected checks", async ({
    page,
  }) => {
    const pageErrors: Error[] = [];
    page.on("pageerror", (error) => pageErrors.push(error));
    const { scope, grid } = await openScenario(page, "editing-async");
    const deferredCell = cell(grid, "editable-deferred", "name");
    const falsyCell = cell(grid, "editable-falsy", "name");
    const rejectedCell = cell(grid, "editable-rejected", "name");
    const allowedCell = cell(grid, "editable-allowed", "name");

    await deferredCell.dblclick();
    await expect
      .poll(async () =>
        readJson<string[]>(scope.getByTestId("async-editable-checks"))
      )
      .toContain("editable-deferred");
    await expect(deferredCell.getByRole("textbox")).toHaveCount(0);

    await falsyCell.dblclick();
    await expect
      .poll(async () =>
        readJson<string[]>(scope.getByTestId("async-editable-checks"))
      )
      .toContain("editable-falsy");
    await scope.getByTestId("resolve-deferred-editable").click();
    await expect(deferredCell.getByRole("textbox")).toHaveCount(0);
    await expect(falsyCell.getByRole("textbox")).toHaveCount(0);
    await expect(scope.getByTestId("async-editable-starts")).toHaveText("[]");

    await rejectedCell.dblclick();
    await expect
      .poll(async () =>
        readJson<string[]>(scope.getByTestId("async-editable-checks"))
      )
      .toContain("editable-rejected");
    await expect(rejectedCell.getByRole("textbox")).toHaveCount(0);
    expect(pageErrors).toEqual([]);

    await allowedCell.dblclick();
    await expect(allowedCell.getByRole("textbox")).toBeFocused();
    await expect
      .poll(async () =>
        readJson<string[]>(scope.getByTestId("async-editable-starts"))
      )
      .toEqual(["editable-allowed"]);

    const pointerCellProps = await readJson<Record<string, unknown>>(
      scope.getByTestId("async-editable-cell-props")
    );
    expect(pointerCellProps).toMatchObject({
      rowId: "editable-allowed",
      rowIndex: 3,
      rowRenderIndex: 3,
      remoteRowIndex: 3,
      id: "name",
      name: "name",
      columnId: "name",
      columnIndex: 1,
      computedAbsoluteIndex: 1,
      computedVisibleIndex: 1,
      computedVisibleCount: 2,
      computedWidth: 260,
      editableIsPredicate: true,
      computedEditableIsPredicate: true,
      hasEditValue: false,
      hasInEdit: false,
      rowActive: false,
      rowSelected: false,
      multiSelect: false,
      naturalRowHeight: false,
      rowHeight: 44,
      minRowHeight: 20,
      initialRowHeight: 44,
      totalDataCount: 4,
      nativeScroll: true,
      rtl: false,
      virtualizeColumns: false,
    });
    expect(pointerCellProps.theme).toEqual(expect.any(String));
  });

  test("keeps a newer edit active when an older completion promise resolves", async ({
    page,
  }) => {
    const { scope, grid } = await openScenario(page, "editing-completion");
    const deferredCell = cell(grid, "complete-deferred", "name");
    const newerCell = cell(grid, "complete-newer", "name");

    await deferredCell.dblclick();
    const deferredEditor = deferredCell.getByRole("textbox");
    await deferredEditor.fill("Deferred draft");
    await deferredEditor.press("Enter");
    await expect(scope.getByTestId("completion-status")).toHaveText("pending");
    await expect(deferredEditor).toHaveCount(0);

    await newerCell.dblclick();
    const newerEditor = newerCell.getByRole("textbox");
    await expect(newerEditor).toBeVisible();
    await expect(newerEditor).toHaveValue("Newer edit session");

    await scope.getByTestId("resolve-deferred-completion").click();
    await expect(scope.getByTestId("completion-status")).toHaveText("resolved");
    await expect(newerEditor).toBeVisible();
    await expect(newerEditor).toHaveValue("Newer edit session");

    const events = await readJson<EditEvent[]>(
      scope.getByTestId("completion-events")
    );
    const deferredEvents = events.filter(
      (event) => event.rowId === "complete-deferred"
    );
    expect(
      deferredEvents.filter((event) => event.type === "stop")
    ).toHaveLength(1);
    expect(
      deferredEvents.filter((event) => event.type === "complete")
    ).toHaveLength(1);
  });

  test("stops cleanly when async completion rejects without cancel or duplicate stop", async ({
    page,
  }) => {
    const pageErrors: Error[] = [];
    page.on("pageerror", (error) => pageErrors.push(error));
    const { scope, grid } = await openScenario(page, "editing-completion");
    const rejectedCell = cell(grid, "complete-rejected", "name");

    await rejectedCell.dblclick();
    const editor = rejectedCell.getByRole("textbox");
    await editor.fill("Rejected draft");
    await editor.press("Enter");
    await expect(scope.getByTestId("completion-status")).toHaveText("rejected");
    await expect(editor).toHaveCount(0);

    const events = await readJson<EditEvent[]>(
      scope.getByTestId("completion-events")
    );
    const rejectedEvents = events.filter(
      (event) => event.rowId === "complete-rejected"
    );
    expectOrderedSubsequence(
      rejectedEvents.map((event) => event.type),
      ["start", "value", "stop", "complete"]
    );
    expect(
      rejectedEvents.filter((event) => event.type === "stop")
    ).toHaveLength(1);
    expect(rejectedEvents.some((event) => event.type === "cancel")).toBe(false);
    expect(pageErrors).toEqual([]);
  });

  test("navigates custom editors with Enter, Shift+Enter, Tab, and Shift+Tab", async ({
    page,
  }) => {
    const { grid } = await openScenario(page, "editing-navigation");
    const firstName = cell(grid, "row-1", "name");
    const secondName = cell(grid, "row-2", "name");
    const firstCity = cell(grid, "row-1", "city");

    await secondName.dblclick();
    await secondName.getByTestId("navigation-editor").press("Shift+Enter");
    await expect(firstName.getByTestId("navigation-editor")).toBeFocused();

    await firstName.getByTestId("navigation-editor").press("Enter");
    await expect(secondName.getByTestId("navigation-editor")).toBeFocused();
    await secondName.getByTestId("navigation-editor").press("Escape");

    await firstName.dblclick();
    await firstName.getByTestId("navigation-editor").press("Tab");
    await expect(firstCity.getByTestId("navigation-editor")).toBeFocused();
    await firstCity.getByTestId("navigation-editor").press("Shift+Tab");
    await expect(firstName.getByTestId("navigation-editor")).toBeFocused();
  });

  test("complete=false Enter navigation stops without completing or cancelling", async ({
    page,
  }) => {
    const { scope, grid } = await openScenario(page, "editing-navigation");
    const firstName = cell(grid, "row-1", "name");
    const secondName = cell(grid, "row-2", "name");
    await firstName.dblclick();
    await firstName.getByTestId("stop-only-enter").click();
    await expect(secondName.getByTestId("navigation-editor")).toBeVisible();

    const events = await readJson<EditEvent[]>(
      scope.getByTestId("navigation-events")
    );
    const initialEvents = events.filter(
      (event) => event.rowId === "row-1" && event.columnId === "name"
    );
    expect(initialEvents.map((event) => event.type)).toEqual(["start", "stop"]);
  });

  test("complete=false Tab navigation stops without completing or cancelling", async ({
    page,
  }) => {
    const { scope, grid } = await openScenario(page, "editing-navigation");
    const firstName = cell(grid, "row-1", "name");
    const firstCity = cell(grid, "row-1", "city");
    await firstName.dblclick();
    await firstName.getByTestId("stop-only-tab").click();
    await expect(firstCity.getByTestId("navigation-editor")).toBeVisible();

    const events = await readJson<EditEvent[]>(
      scope.getByTestId("navigation-events")
    );
    const initialEvents = events.filter(
      (event) => event.rowId === "row-1" && event.columnId === "name"
    );
    expect(initialEvents.map((event) => event.type)).toEqual(["start", "stop"]);
  });

  test("Enter falls through to the next statically editable column on the next row", async ({
    page,
  }) => {
    const { grid } = await openScenario(page, "editing-navigation");
    const firstName = cell(grid, "row-1", "name");
    const secondCity = cell(grid, "row-2", "city");

    await firstName.dblclick();
    await firstName.getByTestId("static-fallback-enter").click();
    await expect(secondCity.getByTestId("navigation-editor")).toBeFocused();
  });

  test("exposes the Inovua imperative editing API with live ref-backed state", async ({
    page,
  }) => {
    const { scope, grid } = await openScenario(page, "editing-imperative");
    const firstName = cell(grid, "101", "name");
    const secondCity = cell(grid, "102", "city");

    await scope.getByTestId("api-start-edit").click();
    await expect(firstName.getByRole("textbox")).toBeFocused();
    await expect(firstName.getByRole("textbox")).toHaveValue("Imperative seed");
    await expect
      .poll(async () =>
        readJson<string[]>(scope.getByTestId("imperative-calls"))
      )
      .toContain("startEdit:Imperative seed");

    await scope.getByTestId("api-capture-state").click();
    let snapshot = await readJson<ImperativeSnapshot>(
      scope.getByTestId("imperative-state")
    );
    expect(snapshot).toMatchObject({
      info: {
        rowId: 101,
        rowIndex: 0,
        columnId: "name",
        columnIndex: 1,
        value: "Imperative seed",
      },
      isInEdit: true,
    });

    await scope.getByTestId("api-complete-edit").click();
    await expect(firstName.getByRole("textbox")).toHaveCount(0);
    await expect
      .poll(async () => {
        const events = await readJson<EditEvent[]>(
          scope.getByTestId("imperative-events")
        );
        return events.find((event) => event.type === "complete")?.value;
      })
      .toBe("Completed by API");
    await scope.getByTestId("api-capture-state").click();
    snapshot = await readJson<ImperativeSnapshot>(
      scope.getByTestId("imperative-state")
    );
    expect(snapshot.info).toBeNull();
    expect(snapshot.isInEdit).toBe(false);
    expect(snapshot.hasCompletionPromise).toBe(true);

    await scope.getByTestId("api-try-start-edit").click();
    await expect(secondCity.getByRole("textbox")).toBeFocused();
    await expect
      .poll(async () =>
        readJson<string[]>(scope.getByTestId("imperative-calls"))
      )
      .toContain("tryStartEdit:New York");
    await scope.getByTestId("api-cancel-edit").click();
    await expect(secondCity.getByRole("textbox")).toHaveCount(0);
    const events = await readJson<EditEvent[]>(
      scope.getByTestId("imperative-events")
    );
    expect(
      events.some(
        (event) =>
          event.type === "cancel" &&
          event.rowId === 102 &&
          event.columnId === "city"
      )
    ).toBe(true);
  });

  test("programmatic startEdit and tryStartEdit replace an active editor without ending it", async ({
    page,
  }) => {
    let opened = await openScenario(page, "editing-imperative");
    let { scope, grid } = opened;
    let firstName = cell(grid, "101", "name");

    await scope.getByTestId("api-start-edit").click();
    await expect(firstName.getByRole("textbox")).toBeFocused();
    await scope.getByTestId("api-start-replace").click();

    const thirdName = cell(grid, "103", "name");
    await expect(thirdName.getByRole("textbox")).toBeFocused();
    await expect(thirdName.getByRole("textbox")).toHaveValue(
      "Start replacement"
    );
    await expect(firstName.getByRole("textbox")).toHaveCount(0);

    let events = await readJson<EditEvent[]>(
      scope.getByTestId("imperative-events")
    );
    expect(
      events.filter((event) => event.rowId === 101).map((event) => event.type)
    ).toEqual(["start"]);
    expect(events).toContainEqual(
      expect.objectContaining({
        type: "start",
        rowId: 103,
        columnId: "name",
        value: "Start replacement",
      })
    );

    opened = await openScenario(page, "editing-imperative");
    scope = opened.scope;
    grid = opened.grid;
    firstName = cell(grid, "101", "name");
    await scope.getByTestId("api-start-edit").click();
    await expect(firstName.getByRole("textbox")).toBeFocused();
    await scope.getByTestId("api-try-start-edit").click();

    const secondCity = cell(grid, "102", "city");
    await expect(secondCity.getByRole("textbox")).toBeFocused();
    await expect(firstName.getByRole("textbox")).toHaveCount(0);
    events = await readJson<EditEvent[]>(
      scope.getByTestId("imperative-events")
    );
    expect(
      events.filter((event) => event.rowId === 101).map((event) => event.type)
    ).toEqual(["start"]);
    expect(events).toContainEqual(
      expect.objectContaining({
        type: "start",
        rowId: 102,
        columnId: "city",
        value: "New York",
      })
    );
  });

  test("completeEdit reads the live draft and cell metadata after deferred dispatch", async ({
    page,
  }) => {
    const { scope, grid } = await openScenario(page, "editing-imperative");
    const firstName = cell(grid, "101", "name");

    await scope.getByTestId("api-start-edit").click();
    const editor = firstName.getByRole("textbox");
    await expect(editor).toBeFocused();
    await editor.fill("Draft before dispatch");
    await scope.getByTestId("api-complete-live-value").click();

    await expect(editor).toHaveCount(0);
    await expect
      .poll(async () =>
        readJson<EditEvent[]>(scope.getByTestId("imperative-events"))
      )
      .toContainEqual(
        expect.objectContaining({
          type: "complete",
          rowId: 101,
          rowIndex: 0,
          columnId: "name",
          value: "Live delayed draft",
        })
      );
  });

  test("completeEdit overlays live row and column identity after a deferred reorder", async ({
    page,
  }) => {
    const { scope, grid } = await openScenario(page, "editing-imperative");
    const firstName = cell(grid, "101", "name");

    await scope.getByTestId("api-start-edit").click();
    const editor = firstName.getByRole("textbox");
    await expect(editor).toBeFocused();
    await editor.fill("Draft before identity change");
    await scope.getByTestId("api-complete-live-identity").click();

    await expect
      .poll(async () =>
        readJson<EditEvent[]>(scope.getByTestId("imperative-events"))
      )
      .toContainEqual({
        type: "complete",
        rowId: 901,
        rowIndex: 0,
        columnId: "city",
        columnIndex: 1,
        value: "Live identity draft",
      });
    await expect(cell(grid, "901", "city")).toBeVisible();
    await expect(header(grid, "city")).toHaveAttribute(
      "data-column-index",
      "1"
    );
  });

  test("complete/cancel ignore non-editable targets and cancel ignores offscreen targets", async ({
    page,
  }) => {
    const { scope, grid } = await openScenario(page, "editing-imperative");
    const firstName = cell(grid, "101", "name");
    await scope.getByTestId("api-start-edit").click();
    await expect(firstName.getByRole("textbox")).toBeFocused();
    await expect(row(grid, "140")).toHaveCount(0);

    await scope.getByTestId("api-complete-noneditable").click();
    await page.waitForTimeout(80);
    await expect(firstName.getByRole("textbox")).toBeFocused();

    await scope.getByTestId("api-cancel-noneditable").click();
    await scope.getByTestId("api-cancel-offscreen").click();
    await expect(firstName.getByRole("textbox")).toBeFocused();

    const events = await readJson<EditEvent[]>(
      scope.getByTestId("imperative-events")
    );
    expect(events.map((event) => event.type)).toEqual(["start"]);
    expect(events.some((event) => event.value === "Must not dispatch")).toBe(
      false
    );
  });

  test("cross-target complete only blurs a custom editor that has no blur completion", async ({
    page,
  }) => {
    const { scope, grid } = await openScenario(page, "editing-imperative");

    await scope.getByTestId("api-start-custom-edit").click();
    const customEditor = cell(grid, "101", "custom").getByTestId(
      "imperative-focus-only-editor"
    );
    await expect(customEditor).toBeFocused();

    await scope.getByTestId("api-complete-target").click();
    await expect
      .poll(async () =>
        readJson<EditEvent[]>(scope.getByTestId("imperative-events"))
      )
      .toContainEqual(
        expect.objectContaining({
          type: "complete",
          rowId: 102,
          rowIndex: 1,
          columnId: "city",
          columnIndex: 2,
          value: null,
        })
      );

    await expect(customEditor).toBeVisible();
    await expect(customEditor).not.toBeFocused();
    const events = await readJson<EditEvent[]>(
      scope.getByTestId("imperative-events")
    );
    expect(
      events
        .filter((event) => event.rowId === 101 && event.columnId === "custom")
        .map((event) => event.type)
    ).toEqual(["start"]);
    expect(
      events.some(
        (event) =>
          event.type === "stop" &&
          event.rowId === 102 &&
          event.columnId === "city"
      )
    ).toBe(false);

    await scope.getByTestId("api-capture-state").click();
    const snapshot = await readJson<ImperativeSnapshot>(
      scope.getByTestId("imperative-state")
    );
    expect(snapshot).toMatchObject({
      info: { rowId: 101, columnId: "custom" },
      isInEdit: false,
    });
  });

  test("preserves numeric row IDs and honors imperative complete/cancel targets and fallbacks", async ({
    page,
  }) => {
    let opened = await openScenario(page, "editing-imperative");
    let { scope, grid } = opened;
    let firstName = cell(grid, "101", "name");

    await scope.getByTestId("api-start-edit").click();
    await expect(firstName.getByRole("textbox")).toBeFocused();

    await scope.getByTestId("api-cancel-missing-row").click();
    await expect(firstName.getByRole("textbox")).toBeFocused();
    expect(
      (
        await readJson<EditEvent[]>(scope.getByTestId("imperative-events"))
      ).some((event) => event.type === "cancel")
    ).toBe(false);

    await scope.getByTestId("api-complete-target").click();
    await expect
      .poll(async () =>
        readJson<EditEvent[]>(scope.getByTestId("imperative-events"))
      )
      .toContainEqual(
        expect.objectContaining({
          type: "complete",
          rowId: 102,
          rowIndex: 1,
          columnId: "city",
          columnIndex: 2,
          value: null,
        })
      );
    await expect(firstName.getByRole("textbox")).toHaveCount(0);

    let events = await readJson<EditEvent[]>(
      scope.getByTestId("imperative-events")
    );
    expect(
      events.map((event) => ({
        type: event.type,
        rowId: event.rowId,
        columnId: event.columnId,
      }))
    ).toEqual([
      { type: "start", rowId: 101, columnId: "name" },
      { type: "stop", rowId: 101, columnId: "name" },
      { type: "complete", rowId: 101, columnId: "name" },
      { type: "complete", rowId: 102, columnId: "city" },
    ]);
    expect(events).toContainEqual(
      expect.objectContaining({
        type: "stop",
        rowId: 101,
        columnId: "name",
        value: "Imperative seed",
      })
    );
    expect(events).toContainEqual(
      expect.objectContaining({
        type: "complete",
        rowId: 101,
        columnId: "name",
        value: "Imperative seed",
      })
    );
    expect(
      events.some(
        (event) =>
          event.type === "stop" &&
          event.rowId === 102 &&
          event.columnId === "city"
      )
    ).toBe(false);
    await scope.getByTestId("api-capture-state").click();
    const snapshot = await readJson<ImperativeSnapshot>(
      scope.getByTestId("imperative-state")
    );
    expect(snapshot.info).toBeNull();
    expect(snapshot.isInEdit).toBe(false);

    await scope.getByTestId("api-start-edit").click();
    await expect(firstName.getByRole("textbox")).toBeFocused();
    await scope.getByTestId("api-complete-fallback").click();
    await expect(firstName.getByRole("textbox")).toHaveCount(0);
    events = await readJson<EditEvent[]>(
      scope.getByTestId("imperative-events")
    );
    expect(events).toContainEqual(
      expect.objectContaining({
        type: "complete",
        rowId: 101,
        rowIndex: 0,
        columnId: "name",
        value: "Fallback completion",
      })
    );

    opened = await openScenario(page, "editing-imperative");
    scope = opened.scope;
    grid = opened.grid;
    firstName = cell(grid, "101", "name");
    await scope.getByTestId("api-start-edit").click();
    await expect(firstName.getByRole("textbox")).toBeFocused();

    await scope.getByTestId("api-cancel-target").click();
    await expect
      .poll(async () =>
        readJson<EditEvent[]>(scope.getByTestId("imperative-events"))
      )
      .toContainEqual(
        expect.objectContaining({
          type: "cancel",
          rowId: 102,
          rowIndex: 1,
          columnId: "city",
          columnIndex: 2,
        })
      );
    await expect(firstName.getByRole("textbox")).toBeFocused();
    await expect
      .poll(async () => {
        await scope.getByTestId("api-capture-state").click();
        return readJson<ImperativeSnapshot>(
          scope.getByTestId("imperative-state")
        );
      })
      .toMatchObject({
        info: { rowId: 101, columnId: "name" },
        isInEdit: false,
      });

    await scope.getByTestId("api-cancel-zero-column").click();
    await expect(firstName.getByRole("textbox")).toHaveCount(0);
    events = await readJson<EditEvent[]>(
      scope.getByTestId("imperative-events")
    );
    expect(events).toContainEqual(
      expect.objectContaining({
        type: "cancel",
        rowId: 101,
        rowIndex: 0,
        columnId: "name",
      })
    );
  });

  test("keeps column-only editing in table layout at mobile width", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 800, height: 900 });
    const { grid } = await openScenario(page, "editing-mobile");
    await expect(grid).toHaveAttribute("data-layout", "table");
    await expect(grid.locator('[data-slot="mobile-grid-list"]')).toHaveCount(0);

    const nameCell = cell(grid, "row-1", "name");
    await nameCell.dblclick();
    await expect(nameCell.getByRole("textbox")).toBeFocused();
  });

  test("applies a data-dependent global rowStyle to the row element", async ({
    page,
  }) => {
    const { grid } = await openScenario(page, "row-style");
    const blockedRow = row(grid, "style-blocked");
    const readyRow = row(grid, "style-ready");
    const blockedCell = cell(grid, "style-blocked", "task");
    await expect(blockedRow).toBeVisible();
    await expect(readyRow).toBeVisible();

    const styles = await Promise.all([
      blockedRow.evaluate((element) => ({
        status: element.style.getPropertyValue("--inovua-parity-row-status"),
        rowIndex: element.style.getPropertyValue("--inovua-parity-row-index"),
        remoteRowIndex: element.style.getPropertyValue(
          "--inovua-parity-remote-row-index"
        ),
        columnCount: element.style.getPropertyValue(
          "--inovua-parity-column-count"
        ),
        last: element.style.getPropertyValue("--inovua-parity-last-row"),
        minHeight: element.style.minHeight,
        outline: element.style.outline,
      })),
      readyRow.evaluate((element) => ({
        status: element.style.getPropertyValue("--inovua-parity-row-status"),
        rowIndex: element.style.getPropertyValue("--inovua-parity-row-index"),
        remoteRowIndex: element.style.getPropertyValue(
          "--inovua-parity-remote-row-index"
        ),
        columnCount: element.style.getPropertyValue(
          "--inovua-parity-column-count"
        ),
        last: element.style.getPropertyValue("--inovua-parity-last-row"),
        minHeight: element.style.minHeight,
        outline: element.style.outline,
      })),
    ]);

    expect(styles[0]).toMatchObject({
      status: "blocked",
      rowIndex: "0",
      remoteRowIndex: "0",
      columnCount: "2",
      last: "false",
      minHeight: "72px",
      outline: "rgb(220, 38, 38) solid 3px",
    });
    expect(styles[1]).toMatchObject({
      status: "ready",
      rowIndex: "1",
      remoteRowIndex: "1",
      columnCount: "2",
      last: "true",
      minHeight: "40px",
      outline: "rgb(22, 163, 74) solid 1px",
    });
    expect(
      await blockedCell.evaluate((element) =>
        element.style.getPropertyValue("--inovua-parity-row-status")
      )
    ).toBe("");
  });

  test("applies a static rowStyle object to every row element", async ({
    page,
  }) => {
    const { grid } = await openScenario(page, "row-style-static");
    const firstRow = row(grid, "row-1");
    const secondRow = row(grid, "row-2");
    const firstCell = cell(grid, "row-1", "name");
    await expect(firstRow).toBeVisible();
    await expect(secondRow).toBeVisible();

    const [firstStyle, secondStyle] = await Promise.all([
      firstRow.evaluate((element) => ({
        marker: element.style.getPropertyValue("--inovua-parity-static-row"),
        minHeight: element.style.minHeight,
        boxShadow: element.style.boxShadow,
      })),
      secondRow.evaluate((element) => ({
        marker: element.style.getPropertyValue("--inovua-parity-static-row"),
        minHeight: element.style.minHeight,
        boxShadow: element.style.boxShadow,
      })),
    ]);

    expect(firstStyle).toEqual({
      marker: "applied",
      minHeight: "58px",
      boxShadow: "rgb(124, 58, 237) 4px 0px inset",
    });
    expect(secondStyle).toEqual(firstStyle);
    expect(
      await firstCell.evaluate((element) =>
        element.style.getPropertyValue("--inovua-parity-static-row")
      )
    ).toBe("");
  });

  test("preserves rowStyle base-style mutation and upstream paged-row metadata", async ({
    page,
  }) => {
    const { scope, grid } = await openScenario(page, "row-style-contract");
    const firstPagedRow = row(grid, "103");
    await expect(firstPagedRow).toBeVisible();
    await scope.getByTestId("capture-row-style-contract").click();

    const contract = await readJson<Record<string, string>>(
      scope.getByTestId("row-style-contract-output")
    );
    expect(contract).toEqual({
      marker: "mutated",
      id: "103",
      idType: "number",
      rowIndex: "0",
      remoteRowIndex: "2",
      baseHeight: "54",
      baseWidth: "400",
      baseMinWidth: "400",
      baseDirection: "ltr",
      firstUnlocked: "0",
      lastUnlocked: "1",
      firstLockedStart: "-1",
      lastLockedEnd: "-1",
      height: "54px",
      width: "400px",
      minWidth: "400px",
      direction: "ltr",
      backgroundColor: "rgb(254, 249, 195)",
    });
    expect(
      Math.abs((await readHeight(firstPagedRow)) - 54)
    ).toBeLessThanOrEqual(2);
  });

  test("allocates remaining width through flex/defaultFlex", async ({
    page,
  }) => {
    const { scope, grid } = await openScenario(page, "flex");
    const [fixedWidth, flexOneWidth, flexTwoWidth] = await Promise.all([
      readWidth(header(grid, "fixed")),
      readWidth(header(grid, "one")),
      readWidth(header(grid, "two")),
    ]);

    expect.soft(Math.abs(fixedWidth - 120)).toBeLessThanOrEqual(3);
    expect(Math.abs(flexTwoWidth / flexOneWidth - 2)).toBeLessThanOrEqual(0.12);

    const constrainedGrid = scope
      .getByTestId("flex-constrained")
      .locator(".InovuaReactDataGrid.tdg-root");
    const [defaultMinWidth, zeroMinWidth] = await Promise.all([
      readWidth(header(constrainedGrid, "defaultMin")),
      readWidth(header(constrainedGrid, "zeroMin")),
    ]);
    expect(Math.abs(defaultMinWidth - 40)).toBeLessThanOrEqual(2);
    expect(zeroMinWidth).toBeGreaterThan(0);
    expect(zeroMinWidth).toBeLessThan(35);

    const unboundedGrid = scope
      .getByTestId("flex-unbounded")
      .locator(".InovuaReactDataGrid.tdg-root");
    expect(await readWidth(header(unboundedGrid, "wide"))).toBeGreaterThan(
      10_000
    );
  });

  test("converts resized defaultFlex to width and keeps controlled flex authoritative", async ({
    page,
  }) => {
    const { scope, grid } = await openScenario(page, "flex");
    const defaultFlexHeader = header(grid, "one");
    const controlledFlexHeader = header(grid, "two");
    const defaultFlexBefore = await readWidth(defaultFlexHeader);
    const controlledFlexBefore = await readWidth(controlledFlexHeader);

    await dragColumnBy(page, grid, "one", 80);
    await expect
      .poll(() => readWidth(defaultFlexHeader))
      .toBeGreaterThan(defaultFlexBefore + 65);
    await expect(scope.getByTestId("flex-resize-event-count")).toHaveText("2");

    const defaultFlexEvents = await readJson<ResizeEvent[]>(
      scope.getByTestId("flex-resize-events")
    );
    expect(defaultFlexEvents[0]).toMatchObject({
      columnId: "one",
      flex: null,
    });
    expect(defaultFlexEvents[0]?.width ?? 0).toBeGreaterThan(
      defaultFlexBefore + 65
    );
    expect(defaultFlexEvents[1]).toMatchObject({
      columnId: "two",
      width: null,
    });
    expect(
      Math.abs((defaultFlexEvents[1]?.flex ?? 0) - controlledFlexBefore)
    ).toBeLessThanOrEqual(3);

    const controlledBeforeDrag = await readWidth(controlledFlexHeader);
    await grid
      .locator('[data-slot="scroll-area-viewport"]')
      .evaluate((element) => {
        element.scrollLeft = element.scrollWidth;
      });
    await dragColumnBy(page, grid, "two", 60);
    await expect(scope.getByTestId("flex-resize-event-count")).toHaveText("3");
    expect(
      Math.abs((await readWidth(controlledFlexHeader)) - controlledBeforeDrag)
    ).toBeLessThanOrEqual(2);

    const allEvents = await readJson<ResizeEvent[]>(
      scope.getByTestId("flex-resize-events")
    );
    expect(allEvents.at(-1)).toMatchObject({
      columnId: "two",
      flex: null,
    });
    expect(allEvents.at(-1)?.width ?? 0).toBeGreaterThan(
      controlledBeforeDrag + 45
    );
  });

  test("uses the same defaultFlex commit path for imperative resize", async ({
    page,
  }) => {
    const { scope, grid } = await openScenario(page, "flex");
    const defaultFlexHeader = header(grid, "one");
    const controlledFlexHeader = header(grid, "two");
    const initialWidth = await readWidth(defaultFlexHeader);
    const controlledFlexWidth = await readWidth(controlledFlexHeader);

    await scope.getByTestId("imperative-resize-default-flex").click();
    await expect
      .poll(() => readWidth(defaultFlexHeader))
      .toBeGreaterThan(initialWidth + 45);
    await expect(scope.getByTestId("flex-resize-event-count")).toHaveText("2");

    const events = await readJson<ResizeEvent[]>(
      scope.getByTestId("flex-resize-events")
    );
    expect(events.map((event) => event.columnId)).toEqual(["one", "two"]);
    expect(events[0]?.width ?? 0).toBeGreaterThan(initialWidth + 45);
    expect(events[1]).toMatchObject({ columnId: "two", width: null });
    expect(
      Math.abs((events[1]?.flex ?? 0) - controlledFlexWidth)
    ).toBeLessThanOrEqual(3);
    expect(events[0]?.reservedViewportWidth).toBe(
      initialWidth - (events[0]?.width ?? initialWidth)
    );
    expect(events[0]?.reservedViewportWidth).toBe(
      events[1]?.reservedViewportWidth
    );
  });

  test("uses the same defaultFlex commit path for autosize", async ({
    page,
  }) => {
    const { scope, grid } = await openScenario(page, "flex");
    const defaultFlexHeader = header(grid, "one");
    const controlledFlexHeader = header(grid, "two");
    const initialWidth = await readWidth(defaultFlexHeader);
    const controlledFlexWidth = await readWidth(controlledFlexHeader);
    const resizer = defaultFlexHeader
      .locator('[data-slot="column-resizer"]')
      .first();

    await resizer.dblclick();
    await expect
      .poll(() => readWidth(defaultFlexHeader))
      .toBeLessThan(initialWidth - 40);
    await expect(scope.getByTestId("flex-resize-event-count")).toHaveText("2");

    const events = await readJson<ResizeEvent[]>(
      scope.getByTestId("flex-resize-events")
    );
    expect(events.map((event) => event.columnId)).toEqual(["one", "two"]);
    expect(events[0]).toMatchObject({ columnId: "one", flex: null });
    expect(events[0]?.width ?? initialWidth).toBeLessThan(initialWidth - 40);
    expect(events[1]).toMatchObject({ columnId: "two", width: null });
    expect(
      Math.abs((events[1]?.flex ?? 0) - controlledFlexWidth)
    ).toBeLessThanOrEqual(3);
    expect(events[0]?.reservedViewportWidth).toBe(
      initialWidth - (events[0]?.width ?? initialWidth)
    );
    expect(events[0]?.reservedViewportWidth).toBe(
      events[1]?.reservedViewportWidth
    );
  });

  test("keeps controlled column.width authoritative across manual resize", async ({
    page,
  }) => {
    const { scope, grid } = await openScenario(page, "controlled-width");
    const controlledHeader = header(grid, "controlled");
    const initialWidth = await readWidth(controlledHeader);
    expect(Math.abs(initialWidth - 180)).toBeLessThanOrEqual(3);

    await dragColumnBy(page, grid, "controlled", 400);
    const afterResizeWidth = await readWidth(controlledHeader);
    expect
      .soft(Math.abs(afterResizeWidth - initialWidth))
      .toBeLessThanOrEqual(2);

    const resizeProposals = await readJson<ResizeEvent[]>(
      scope.getByTestId("controlled-resize-events")
    );
    expect(resizeProposals).toHaveLength(1);
    expect(resizeProposals[0]).toMatchObject({
      columnId: "controlled",
      width: 420,
      flex: null,
    });
    expect(resizeProposals[0]?.reservedViewportWidth).not.toBeNull();

    await scope.getByTestId("set-controlled-width").click();
    await expect(scope.getByTestId("controlled-width-value")).toHaveText("300");
    await expect
      .poll(() => readWidth(controlledHeader))
      .toBeGreaterThanOrEqual(298);
    await expect
      .poll(() => readWidth(controlledHeader))
      .toBeLessThanOrEqual(302);
  });
});
