import { expect, test, type Locator, type Page } from "@playwright/test";

type NaturalMeasurement = {
  domHeight: number | null;
  virtualHeight: number | null;
};

type EditEvent = {
  type: "start" | "stop" | "complete" | "cancel" | "value";
  rowId: string | number;
  columnId: string;
  value: unknown;
};

type FilterEvent = {
  kind: "column" | "aggregate";
  columnId?: string;
  columnIndex?: number;
  filterValue: unknown;
  cellPropsPresent?: boolean;
};

type ResizeEvent = {
  columnId: string;
  width: number | null;
  reservedViewportWidth: number | null;
};

type ColumnState = {
  computedVirtualizeColumns: boolean | null;
  rowStyleVirtualizeColumns: boolean | null;
  rowStyleColumnRenderCount: number | null;
  rowStyleTotalColumnCount: number | null;
};

type ColumnsLayout = {
  shellHeight: number;
  gridHeight: number;
  viewportHeight: number;
  gridContained: boolean;
  viewportContained: boolean;
  verticalScrollbarContained: boolean | null;
  horizontalScrollbarContained: boolean | null;
  hasVerticalOverflow: boolean;
  hasHorizontalOverflow: boolean;
};

async function readJson<T>(locator: Locator): Promise<T> {
  return JSON.parse((await locator.textContent())?.trim() || "null") as T;
}

function gridRow(grid: Locator, rowId: string): Locator {
  return grid.locator(`[data-slot="grid-row"][data-row-id="${rowId}"]`);
}

function gridCell(grid: Locator, rowId: string, columnId: string): Locator {
  return gridRow(grid, rowId).locator(`[data-column-id="${columnId}"]`);
}

async function openParityScenario(
  page: Page,
  scenario: string,
  pending = false
) {
  const fixture = pending ? "inovua-pending-parity" : "inovua-parity";
  const scopeTestId = pending
    ? "inovua-pending-parity-scenario"
    : "inovua-parity-scenario";

  await page.goto(`/compat/${fixture}?scenario=${scenario}`);
  const scope = page.getByTestId(scopeTestId);
  await expect(scope).toHaveAttribute("data-scenario", scenario);
  const grid = scope.locator(".InovuaReactDataGrid.tdg-root").first();
  await expect(grid).toBeVisible();
  return { scope, grid };
}

async function rowBackground(row: Locator): Promise<string> {
  return row.evaluate((element) => {
    const rowColor = getComputedStyle(element).backgroundColor;
    if (rowColor !== "rgba(0, 0, 0, 0)") return rowColor;

    const firstCell = element.querySelector<HTMLElement>("td");
    return firstCell ? getComputedStyle(firstCell).backgroundColor : rowColor;
  });
}

async function readColumnsLayout(shell: Locator): Promise<ColumnsLayout> {
  return shell.evaluate((element) => {
    const grid = element.querySelector<HTMLElement>(".tdg-root");
    const viewport = element.querySelector<HTMLElement>(
      '[data-slot="scroll-area-viewport"]'
    );
    const verticalScrollbar = element.querySelector<HTMLElement>(
      '[data-slot="scroll-area-scrollbar"][data-orientation="vertical"]'
    );
    const horizontalScrollbar = element.querySelector<HTMLElement>(
      '[data-slot="scroll-area-scrollbar"][data-orientation="horizontal"]'
    );
    if (!grid || !viewport) throw new Error("Columns grid is not rendered");

    const shellRect = element.getBoundingClientRect();
    const gridRect = grid.getBoundingClientRect();
    const viewportRect = viewport.getBoundingClientRect();
    const verticalRect = verticalScrollbar?.getBoundingClientRect();
    const horizontalRect = horizontalScrollbar?.getBoundingClientRect();

    return {
      shellHeight: Math.round(shellRect.height),
      gridHeight: Math.round(gridRect.height),
      viewportHeight: Math.round(viewportRect.height),
      gridContained: gridRect.bottom <= shellRect.bottom + 1,
      viewportContained: viewportRect.bottom <= shellRect.bottom + 1,
      verticalScrollbarContained: verticalRect
        ? verticalRect.bottom <= shellRect.bottom + 1
        : null,
      horizontalScrollbarContained: horizontalRect
        ? horizontalRect.bottom <= shellRect.bottom + 1
        : null,
      hasVerticalOverflow: viewport.scrollHeight > viewport.clientHeight,
      hasHorizontalOverflow: viewport.scrollWidth > viewport.clientWidth,
    };
  });
}

test.describe("GitHub issue implementation audit: #17–#32", () => {
  test("issue #17: the reported missing grid behaviors work as public browser contracts", async ({
    page,
  }) => {
    test.setTimeout(75_000);

    // Natural rowHeight plus minRowHeight.
    let scenario = await openParityScenario(page, "natural-height");
    await scenario.scope.getByTestId("capture-natural-height").click();
    await expect
      .poll(async () => {
        const measurement = await readJson<NaturalMeasurement>(
          scenario.scope.getByTestId("natural-tall-measurement")
        );
        return measurement.virtualHeight;
      })
      .not.toBeNull();
    const tall = await readJson<NaturalMeasurement>(
      scenario.scope.getByTestId("natural-tall-measurement")
    );
    const short = await readJson<NaturalMeasurement>(
      scenario.scope.getByTestId("natural-short-measurement")
    );
    expect(tall.domHeight ?? 0).toBeGreaterThanOrEqual(104);
    expect(short.domHeight ?? 0).toBeGreaterThanOrEqual(52);
    expect(
      Math.abs((tall.virtualHeight ?? 0) - (tall.domHeight ?? 0))
    ).toBeLessThanOrEqual(2);

    // onColumnResize emits the documented completion payload.
    scenario = await openParityScenario(page, "resize-callback");
    const resizeHandle = scenario.grid
      .locator(
        '[data-slot="grid-header-cell"][data-column-id="description"] [data-slot="column-resizer"]'
      )
      .first();
    await resizeHandle.focus();
    await resizeHandle.press("ArrowRight");
    await expect(
      scenario.scope.getByTestId("column-resize-event-count")
    ).toHaveText("1");
    expect(
      await readJson<ResizeEvent>(
        scenario.scope.getByTestId("column-resize-last-event")
      )
    ).toMatchObject({
      columnId: "description",
      width: expect.any(Number),
      reservedViewportWidth: expect.any(Number),
    });

    // showZebraRows=false suppresses alternating row paint.
    scenario = await openParityScenario(page, "zebra-disabled");
    await expect(scenario.grid).toHaveAttribute(
      "data-show-zebra-rows",
      "false"
    );
    const zebraBackgrounds = await Promise.all([
      rowBackground(gridRow(scenario.grid, "row-1")),
      rowBackground(gridRow(scenario.grid, "row-2")),
    ]);
    expect(zebraBackgrounds[0]).toBe(zebraBackgrounds[1]);

    // editable, editStartEvent, lifecycle callbacks and column.editable=false.
    scenario = await openParityScenario(page, "editing-click");
    const editableCell = gridCell(scenario.grid, "row-1", "name");
    await editableCell.click();
    const editor = editableCell.getByRole("textbox");
    await expect(editor).toBeFocused();
    await editor.fill("Discarded value");
    await editor.press("Escape");
    const editEvents = await readJson<EditEvent[]>(
      scenario.scope.getByTestId("edit-events")
    );
    expect(
      editEvents
        .filter((event) => event.rowId === "row-1" && event.columnId === "name")
        .map((event) => event.type)
    ).toEqual(["start", "value", "stop", "cancel"]);
    await gridCell(scenario.grid, "row-1", "id").click();
    await expect(
      gridCell(scenario.grid, "row-1", "id").getByRole("textbox")
    ).toHaveCount(0);

    // A data-dependent global rowStyle reaches the actual row element.
    scenario = await openParityScenario(page, "row-style");
    expect(
      await gridRow(scenario.grid, "style-blocked").evaluate((element) => ({
        status: element.style.getPropertyValue("--inovua-parity-row-status"),
        minHeight: element.style.minHeight,
        outline: element.style.outline,
      }))
    ).toEqual({
      status: "blocked",
      minHeight: "72px",
      outline: "rgb(220, 38, 38) solid 3px",
    });

    // Per-column filtering callback ordering and payload.
    scenario = await openParityScenario(page, "filter-callback", true);
    await scenario.scope.getByTestId("pending-name-filter").fill("Grace");
    await expect
      .poll(async () => {
        const events = await readJson<FilterEvent[]>(
          scenario.scope.getByTestId("filter-event-log")
        );
        return events.map((event) => event.kind);
      })
      .toEqual(["column", "aggregate"]);
    const filterEvents = await readJson<FilterEvent[]>(
      scenario.scope.getByTestId("filter-event-log")
    );
    expect(filterEvents[0]).toMatchObject({
      kind: "column",
      columnId: "name",
      columnIndex: 1,
      filterValue: { value: "Grace" },
      cellPropsPresent: true,
    });

    // Explicit selection enablement works without a checkbox column.
    scenario = await openParityScenario(page, "selection-enable", true);
    await gridRow(scenario.grid, "row-1").click();
    await expect(gridRow(scenario.grid, "row-1")).toHaveAttribute(
      "data-selected",
      "true"
    );

    // virtualizeColumnsThreshold is inclusive and exposes matching metadata.
    scenario = await openParityScenario(page, "columns-threshold-at", true);
    await scenario.scope.getByTestId("capture-column-state").click();
    const columnState = await readJson<ColumnState>(
      scenario.scope.getByTestId("column-state")
    );
    expect(columnState.computedVirtualizeColumns).toBe(true);
    expect(columnState.rowStyleVirtualizeColumns).toBe(true);
    expect(columnState.rowStyleTotalColumnCount).toBe(20);
    expect(columnState.rowStyleColumnRenderCount ?? 20).toBeLessThan(20);

    // emptyText supports a literal override.
    scenario = await openParityScenario(page, "empty-literal", true);
    await expect(
      scenario.grid.getByText("Literal empty state", { exact: true })
    ).toBeVisible();

    // The compatibility TextInput entry required by the issue is executable.
    await page.goto("/compat/issue-48?scenario=text-input");
    await expect(page.getByTestId("text-input-availability")).toHaveAttribute(
      "data-available",
      "true"
    );
  });

  test("issue #18: ReactDataGrid.defaultProps is exported and inspectable", async ({
    page,
  }) => {
    await page.goto("/compat/default-props");
    await expect(page.getByTestId("default-props-available")).toHaveText(
      "true"
    );
    await expect(page.getByTestId("default-props-keys")).toContainText(
      "filterTypes"
    );
    await expect(
      page.getByTestId("default-props-string-operators")
    ).toContainText("contains");
    await expect(
      page.getByRole("cell", { name: "Ada Lovelace" })
    ).toBeVisible();
  });

  test("issue #19: getVirtualList returns the public compatibility facade", async ({
    page,
  }) => {
    await page.goto("/compat/computed-props");
    await expect(page.getByTestId("compat-apiReady")).toContainText("true");
    await page.getByTestId("compat-run").click();
    await expect(page.getByTestId("compat-virtualListKeys")).toContainText(
      "getVisibleRange,getVisibleCount,getScrollSize,getClientSize,getScrollHeight,getTotalRowHeight,getRows,scrollToIndex,smoothScrollTo,adjustHeights"
    );
    await expect(
      page.getByTestId("compat-virtualListScrollWorked")
    ).toContainText("true");
    await expect(
      page.getByTestId("compat-virtualListTanStackLeak")
    ).toContainText("false");
  });

  test("issue #20: the grid follows fixed and natural container heights without clipping", async ({
    page,
  }) => {
    await page.goto("/examples/columns");
    const shell = page.getByTestId("columns-grid-shell");
    await expect(shell.locator(".tdg-root")).toBeVisible();
    await shell.locator('[data-slot="scroll-area"]').hover();

    for (const height of [320, 760] as const) {
      await shell.evaluate((element, nextHeight) => {
        element.style.height = `${nextHeight}px`;
      }, height);
      await expect
        .poll(async () => (await readColumnsLayout(shell)).shellHeight)
        .toBe(height);

      const layout = await readColumnsLayout(shell);
      expect(layout.gridHeight).toBeLessThanOrEqual(height);
      expect(layout.viewportHeight).toBeLessThan(height);
      expect(layout.gridContained).toBe(true);
      expect(layout.viewportContained).toBe(true);
      // Radix mounts auto-hide scrollbar tracks lazily. When present they must
      // stay within the shell; an unmounted track is not a height regression.
      expect(layout.verticalScrollbarContained).not.toBe(false);
      expect(layout.horizontalScrollbarContained).not.toBe(false);
      expect(layout.hasVerticalOverflow).toBe(true);
      expect(layout.hasHorizontalOverflow).toBe(true);
    }

    await shell.evaluate((element) => {
      element.style.height = "";
    });
    await page.getByTestId("columns-height-toggle").click();
    await expect
      .poll(async () => (await readColumnsLayout(shell)).shellHeight)
      .toBeLessThan(400);
    const naturalLayout = await readColumnsLayout(shell);
    expect(naturalLayout.gridContained).toBe(true);
    expect(naturalLayout.viewportContained).toBe(true);
    expect(naturalLayout.hasVerticalOverflow).toBe(false);
  });

  test("issue #21: missing filter and cell exports load through the public package entry", async ({
    page,
  }) => {
    await page.goto("/compat/default-props");
    await expect(page.getByTestId("issue-21-runtime-exports")).toContainText(
      "string:contains"
    );
    await expect(
      page.getByRole("cell", { name: "Ada Lovelace" })
    ).toBeVisible();
  });

  test("issue #26: recreating filteredRowsCount does not loop remote loads", async ({
    page,
  }) => {
    await page.goto("/compat/filtered-rows-count?data-source=remote");
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (
              window as typeof window & {
                __tdgFilteredDataSourceCalls?: number;
              }
            ).__tdgFilteredDataSourceCalls ?? 0
        )
      )
      .toBeGreaterThan(0);
    const callsBefore = await page.evaluate(
      () =>
        (
          window as typeof window & {
            __tdgFilteredDataSourceCalls?: number;
          }
        ).__tdgFilteredDataSourceCalls ?? 0
    );

    await page.getByTestId("arm-filtered-callback").click();
    await page.getByTestId("toggle-filter-feedback").click();
    await expect(
      page.getByTestId("filtered-callback-settled-count")
    ).toHaveText("1");
    await expect(page.getByTestId("filtered-reported-row-count")).toHaveText(
      "2"
    );
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (
              window as typeof window & {
                __tdgFilteredDataSourceCalls?: number;
              }
            ).__tdgFilteredDataSourceCalls ?? 0
        )
      )
      .toBe(callsBefore + 1);
    await page.waitForTimeout(350);
    expect(
      await page.evaluate(
        () =>
          (
            window as typeof window & {
              __tdgFilteredDataSourceCalls?: number;
            }
          ).__tdgFilteredDataSourceCalls ?? 0
      )
    ).toBe(callsBefore + 1);
  });

  test("issue #31: core defaults, optional idProperty and root lifecycle props match Inovua", async ({
    page,
  }) => {
    await page.goto("/compat/github-issues-31-32");
    const probe = page.getByTestId("github-issue-31-probe");
    const defaultGrid = probe
      .getByTestId("issue-31-default-grid-shell")
      .locator(".tdg-root");
    const inferredFilterGrid = probe
      .getByTestId("issue-31-inferred-filter-grid-shell")
      .locator(".tdg-root");
    await expect(defaultGrid).toBeVisible();
    await expect(inferredFilterGrid).toBeVisible();

    const surface = defaultGrid.locator('[data-slot="grid-surface"]');
    await surface.focus();
    await page.keyboard.press("q");
    await probe.getByTestId("issue-31-lifecycle-focus-sink").focus();
    const defaults = await readJson<Record<string, unknown>>(
      probe.getByTestId("issue-31-default-props")
    );
    const defaultGridState = await defaultGrid.evaluate((element) => {
      const firstRow = element.querySelector<HTMLElement>(
        '[data-slot="grid-row"]'
      );
      const surface = element.querySelector<HTMLElement>(
        '[data-slot="grid-surface"]'
      );
      const rootRect = element.getBoundingClientRect();
      const surfaceRect = surface?.getBoundingClientRect();
      return {
        theme: element.getAttribute("data-theme"),
        filterRowCount: element.querySelectorAll(".tdg-filter-row").length,
        firstRowId: firstRow?.dataset.rowId ?? null,
        firstRowHeight: firstRow
          ? Math.round(firstRow.getBoundingClientRect().height)
          : null,
        cellsUseSelectNone:
          element.querySelectorAll('[data-slot="grid-row"] td.select-none')
            .length > 0,
        columnMenuTools: element.querySelectorAll(
          'button[aria-label="Column menu"]'
        ).length,
        hasConsumerClass: element.classList.contains("issue-31-consumer-root"),
        hasInternalClass: element.classList.contains("tdg-root"),
        rootHeight: Math.round(rootRect.height),
        rootWidthInset: Math.round(
          (element.parentElement?.clientWidth ?? rootRect.width) -
            rootRect.width
        ),
        surfaceMatchesRoot:
          surfaceRect != null &&
          Math.abs(surfaceRect.width - rootRect.width) <= 0.5 &&
          Math.abs(surfaceRect.height - rootRect.height) <= 0.5,
        rootScrollMarginTop: element.style.scrollMarginTop || null,
        surfaceScrollMarginTop: surface?.style.scrollMarginTop || null,
      };
    });
    const inferredFilterState = await inferredFilterGrid.evaluate((element) => {
      const row = element.querySelector<HTMLElement>(".tdg-filter-row");
      return {
        filterRowCount: element.querySelectorAll(".tdg-filter-row").length,
        filterRowHeight: row
          ? Math.round(row.getBoundingClientRect().height)
          : null,
        filterOperatorButtons: element.querySelectorAll(
          'button[aria-label="Filter"]'
        ).length,
      };
    });

    expect({
      defaults,
      defaultGrid: {
        ...defaultGridState,
        rootLifecycle: await readJson<{
          focus: number;
          blur: number;
          keyDown: string[];
        }>(probe.getByTestId("issue-31-root-lifecycle")),
      },
      inferredFilterGrid: inferredFilterState,
    }).toEqual({
      defaults: {
        idProperty: "id",
        theme: "default-light",
        rowHeight: 40,
        filterRowHeight: 40,
        enableColumnFilterContextMenu: true,
        enableFiltering: null,
        columnUserSelect: false,
        showColumnMenuTool: true,
      },
      defaultGrid: {
        theme: "default-light",
        filterRowCount: 0,
        firstRowId: "row-1",
        firstRowHeight: 40,
        cellsUseSelectNone: true,
        columnMenuTools: 2,
        hasConsumerClass: true,
        hasInternalClass: true,
        rootHeight: 211,
        rootWidthInset: 17,
        surfaceMatchesRoot: true,
        rootScrollMarginTop: "13px",
        surfaceScrollMarginTop: null,
        rootLifecycle: {
          focus: 1,
          blur: 1,
          keyDown: ["q"],
        },
      },
      inferredFilterGrid: {
        filterRowCount: 1,
        filterRowHeight: 40,
        filterOperatorButtons: 1,
      },
    });
  });

  test("issue #31: filtering inference follows Inovua's explicit-override precedence", async ({
    page,
  }) => {
    await page.goto("/compat/github-issues-31-32");
    const probe = page.getByTestId("github-issue-31-probe");

    const cases = [
      {
        testId: "issue-31-filter-omitted",
        expected: { filterRows: 0, filterEditors: 0, dataRows: 2 },
      },
      {
        testId: "issue-31-filter-default-active",
        expected: { filterRows: 1, filterEditors: 1, dataRows: 1 },
      },
      {
        testId: "issue-31-filter-controlled",
        expected: { filterRows: 1, filterEditors: 1, dataRows: 2 },
      },
      {
        testId: "issue-31-filter-explicit-true",
        expected: { filterRows: 1, filterEditors: 0, dataRows: 2 },
      },
      {
        testId: "issue-31-filter-explicit-false-default",
        expected: { filterRows: 0, filterEditors: 0, dataRows: 1 },
      },
      {
        testId: "issue-31-filter-explicit-false-controlled",
        expected: { filterRows: 0, filterEditors: 0, dataRows: 2 },
      },
      {
        testId: "issue-31-filter-empty-default",
        expected: { filterRows: 0, filterEditors: 0, dataRows: 2 },
      },
      {
        testId: "issue-31-filter-inactive-default",
        expected: { filterRows: 1, filterEditors: 1, dataRows: 2 },
      },
    ] as const;

    // Inovua 5.10.2 separates filter-row visibility from local data
    // transformation. In particular, controlled filterValue is display state
    // only, while an uncontrolled defaultFilterValue still transforms local
    // data even when enableFiltering explicitly hides the filter row.
    for (const filterCase of cases) {
      const grid = probe.getByTestId(filterCase.testId).locator(".tdg-root");
      await expect(grid, filterCase.testId).toBeVisible();
      const state = await grid.evaluate((element) => ({
        filterRows: element.querySelectorAll(".tdg-filter-row").length,
        filterEditors: element.querySelectorAll(".tdg-filter-row input").length,
        dataRows: element.querySelectorAll('[data-slot="grid-row"]').length,
      }));

      expect.soft(state, filterCase.testId).toEqual(filterCase.expected);
    }
  });

  test("issue #31: 40px rows retain complete Latin and Cyrillic glyphs", async ({
    page,
  }) => {
    await page.goto("/compat/github-issues-31-32");
    const grid = page
      .getByTestId("issue-31-40px-glyph-grid-shell")
      .locator(".tdg-root");
    await expect(grid).toBeVisible();

    const measurements = await grid.evaluate((element) => {
      return [
        { rowId: "latin", sample: "ÁÉÍ" },
        { rowId: "cyrillic", sample: "ЙЁЩ" },
      ].map(({ rowId, sample }) => {
        const row = Array.from(
          element.querySelectorAll<HTMLElement>('[data-slot="grid-row"]')
        ).find((candidate) => candidate.textContent?.includes(sample));
        const cell = row?.querySelector<HTMLElement>('[data-column-id="name"]');
        const walker = cell
          ? document.createTreeWalker(cell, NodeFilter.SHOW_TEXT)
          : null;
        let textNode: Node | null = null;
        while (walker && (textNode = walker.nextNode())) {
          if (textNode.textContent?.includes(sample)) break;
        }
        if (!row || !cell || !textNode) {
          throw new Error(`Missing ${rowId} glyph measurement target`);
        }

        const range = document.createRange();
        range.selectNodeContents(textNode);
        const rowRect = row.getBoundingClientRect();
        const cellRect = cell.getBoundingClientRect();
        const textRect = range.getBoundingClientRect();
        const cellStyle = getComputedStyle(cell);

        return {
          rowId,
          rowHeight: rowRect.height,
          cellHeight: cellRect.height,
          textHeight: textRect.height,
          textInsideRow:
            textRect.top >= rowRect.top - 0.5 &&
            textRect.bottom <= rowRect.bottom + 0.5,
          textInsideCell:
            textRect.top >= cellRect.top - 0.5 &&
            textRect.bottom <= cellRect.bottom + 0.5,
          cellHasNoVerticalOverflow: cell.scrollHeight <= cell.clientHeight,
          rowHasNoVerticalOverflow: row.scrollHeight <= row.clientHeight,
          overflowY: cellStyle.overflowY,
        };
      });
    });

    expect(measurements).toHaveLength(2);
    for (const measurement of measurements) {
      expect(measurement.rowHeight).toBeCloseTo(40, 0);
      expect(measurement.cellHeight).toBeCloseTo(40, 0);
      expect(measurement.textHeight).toBeGreaterThan(0);
      expect(measurement.textInsideRow).toBe(true);
      expect(measurement.textInsideCell).toBe(true);
      expect(measurement.cellHasNoVerticalOverflow).toBe(true);
      expect(measurement.rowHasNoVerticalOverflow).toBe(true);
      expect(measurement.overflowY).not.toBe("scroll");
    }
  });

  test("issue #31: a 40px filter row retains Cyrillic and Latin glyph metrics", async ({
    page,
  }) => {
    await page.goto("/compat/github-issues-31-32");
    const grid = page
      .getByTestId("issue-31-40px-filter-glyph-grid-shell")
      .locator(".tdg-root");
    await expect(grid).toBeVisible();

    const measurement = await grid.evaluate((element) => {
      const filterRow = element.querySelector<HTMLElement>(".tdg-filter-row");
      const input = filterRow?.querySelector<HTMLInputElement>("input");
      const filterCell = input?.closest<HTMLElement>(".tdg-filter-cell");
      if (!filterRow || !input || !filterCell) {
        throw new Error("Missing 40px filter glyph measurement target");
      }

      const rowRect = filterRow.getBoundingClientRect();
      const cellRect = filterCell.getBoundingClientRect();
      const inputRect = input.getBoundingClientRect();
      const inputStyle = getComputedStyle(input);
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas text metrics are unavailable");
      context.font = inputStyle.font;
      const glyphMetrics = context.measureText(input.value);
      const glyphHeight =
        glyphMetrics.actualBoundingBoxAscent +
        glyphMetrics.actualBoundingBoxDescent;
      const contentHeight =
        input.clientHeight -
        Number.parseFloat(inputStyle.paddingTop) -
        Number.parseFloat(inputStyle.paddingBottom);

      return {
        value: input.value,
        rowHeight: rowRect.height,
        cellHeight: cellRect.height,
        inputInsideRow:
          inputRect.top >= rowRect.top - 0.5 &&
          inputRect.bottom <= rowRect.bottom + 0.5,
        inputInsideCell:
          inputRect.top >= cellRect.top - 0.5 &&
          inputRect.bottom <= cellRect.bottom + 0.5,
        inputHasNoVerticalOverflow: input.scrollHeight <= input.clientHeight,
        glyphHeight,
        contentHeight,
      };
    });

    expect(measurement.value).toBe("ЙЁЩЦДЪ gjpqy");
    expect(measurement.rowHeight).toBeCloseTo(40, 0);
    expect(measurement.cellHeight).toBeCloseTo(40, 0);
    expect(measurement.inputInsideRow).toBe(true);
    expect(measurement.inputInsideCell).toBe(true);
    expect(measurement.inputHasNoVerticalOverflow).toBe(true);
    expect(measurement.glyphHeight).toBeGreaterThan(0);
    expect(measurement.glyphHeight).toBeLessThanOrEqual(
      measurement.contentHeight + 0.5
    );
  });

  test("issue #32: Promise data sources own remote paging and expose loading and toolbar hooks", async ({
    page,
  }) => {
    await page.goto("/compat/github-issues-31-32");
    const probe = page.getByTestId("github-issue-32-probe");
    const grid = probe.getByTestId("issue-32-grid-shell").locator(".tdg-root");
    await expect(grid).toBeVisible();
    await expect
      .poll(async () => {
        const custom = await probe
          .getByTestId("issue-32-custom-load-mask")
          .count();
        const builtIn = await grid
          .getByText("Loading…", { exact: true })
          .count();
        return custom + builtIn;
      })
      .toBeGreaterThan(0);

    const loadingState = {
      customLoadMask: await probe
        .getByTestId("issue-32-custom-load-mask")
        .count(),
      customLoadingText:
        (
          await probe.getByTestId("issue-32-custom-load-mask").allTextContents()
        )[0]?.trim() ?? null,
      builtInLoadingText: await grid
        .getByText("Loading…", { exact: true })
        .count(),
      loadingEvents: await readJson<boolean[]>(
        probe.getByTestId("issue-32-loading-events")
      ),
      customPaginationToolbar: await probe
        .getByTestId("issue-32-custom-pagination-toolbar")
        .count(),
    };
    expect.soft(loadingState).toEqual({
      customLoadMask: 1,
      customLoadingText: "Fetching issue 32 rows",
      builtInLoadingText: 0,
      loadingEvents: [true],
      customPaginationToolbar: 1,
    });

    await probe.getByTestId("issue-32-resolve-static-promise").click();
    await expect
      .poll(async () => {
        const loadingCount =
          (await probe.getByTestId("issue-32-custom-load-mask").count()) +
          (await grid.getByText("Loading…", { exact: true }).count());
        const rows = await grid.locator('[data-slot="grid-row"]').count();
        const empty = await grid
          .getByText("No records", { exact: true })
          .count();
        return loadingCount === 0 && (rows > 0 || empty > 0);
      })
      .toBe(true);

    const settledState = {
      loadingEvents: await readJson<boolean[]>(
        probe.getByTestId("issue-32-loading-events")
      ),
      rowIds: await grid
        .locator('[data-slot="grid-row"]')
        .evaluateAll((rows) =>
          rows.map((row) => row.getAttribute("data-row-id"))
        ),
      rowText: await grid.locator('[data-slot="grid-row"]').allTextContents(),
      emptyState: await grid.getByText("No records", { exact: true }).count(),
      customLoadMask: await probe
        .getByTestId("issue-32-custom-load-mask")
        .count(),
      customPaginationToolbar: await probe
        .getByTestId("issue-32-custom-pagination-toolbar")
        .count(),
    };
    expect(settledState).toEqual({
      loadingEvents: [true, false],
      rowIds: ["remote-3", "remote-4"],
      rowText: [
        expect.stringContaining("Remote row 3"),
        expect.stringContaining("Remote row 4"),
      ],
      emptyState: 0,
      customLoadMask: 0,
      customPaginationToolbar: 1,
    });
  });
});
