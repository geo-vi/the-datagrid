import { expect, test, type Locator, type Page } from "@playwright/test";

const MAX_GEOMETRY_DRIFT_PX = 2;
const MAX_INTERACTION_DELAY_MS = 250;
const MAX_LONG_TASK_MS = 250;
const POINTER_BURST_SIZE = 180;

type ResizePayload = {
  columnId: string;
  width: number | null;
  flex: number | null;
  reservedViewportWidth: number | null;
};

type ResizeListenerSnapshot = Record<string, number>;

async function openScenario(
  page: Page,
  scenario: "resize-callback" | "live-resize" | "controlled-live-resize"
) {
  await page.goto(`/compat/inovua-parity?scenario=${scenario}`);

  const scope = page.getByTestId("inovua-parity-scenario");
  await expect(scope).toHaveAttribute("data-scenario", scenario);

  const grid = scope.locator(".InovuaReactDataGrid.tdg-root").first();
  await expect(grid).toBeVisible();

  return { scope, grid };
}

function header(grid: Locator, columnId: string): Locator {
  return grid.locator(
    `[data-slot="grid-header-cell"][data-column-id="${columnId}"]`
  );
}

function firstCell(grid: Locator, columnId: string): Locator {
  return grid
    .locator(
      `[data-slot="grid-row"][data-row-id] [data-column-id="${columnId}"]`
    )
    .first();
}

async function readWidth(locator: Locator): Promise<number> {
  return locator.evaluate((element) => element.getBoundingClientRect().width);
}

async function readCount(locator: Locator): Promise<number> {
  return Number((await locator.textContent())?.trim() ?? "0");
}

async function readPayload(locator: Locator): Promise<ResizePayload> {
  return JSON.parse(
    (await locator.textContent())?.trim() ?? "null"
  ) as ResizePayload;
}

async function readPayloads(locator: Locator): Promise<ResizePayload[]> {
  return JSON.parse(
    (await locator.textContent())?.trim() ?? "[]"
  ) as ResizePayload[];
}

async function settleFrames(page: Page, count = 2): Promise<void> {
  await page.evaluate(async (frameCount) => {
    for (let index = 0; index < frameCount; index += 1) {
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve())
      );
    }
  }, count);
}

async function dragStartPoint(resizer: Locator) {
  const box = await resizer.boundingBox();
  expect(box).not.toBeNull();

  return {
    x: (box?.x ?? 0) + (box?.width ?? 0) / 2,
    y: (box?.y ?? 0) + (box?.height ?? 0) / 2,
  };
}

async function installResizeListenerAudit(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const eventTypes = [
      "blur",
      "mousemove",
      "mouseup",
      "pointermove",
      "pointerup",
      "pointercancel",
    ] as const;
    const active = Object.fromEntries(
      eventTypes.map((type) => [
        type,
        new Set<EventListenerOrEventListenerObject>(),
      ])
    ) as Record<string, Set<EventListenerOrEventListenerObject>>;
    const nativeAdd = window.addEventListener.bind(window);
    const nativeRemove = window.removeEventListener.bind(window);

    window.addEventListener = ((type, listener, options) => {
      if (listener && active[type]) active[type].add(listener);
      nativeAdd(type, listener, options);
    }) as typeof window.addEventListener;
    window.removeEventListener = ((type, listener, options) => {
      if (listener && active[type]) active[type].delete(listener);
      nativeRemove(type, listener, options);
    }) as typeof window.removeEventListener;

    Object.defineProperty(window, "__tdgLiveResizeListenerAudit", {
      configurable: false,
      value: active,
    });
  });
}

async function readResizeListenerAudit(
  page: Page
): Promise<ResizeListenerSnapshot> {
  return page.evaluate(() => {
    const active = (
      window as typeof window & {
        __tdgLiveResizeListenerAudit: Record<
          string,
          Set<EventListenerOrEventListenerObject>
        >;
      }
    ).__tdgLiveResizeListenerAudit;

    return Object.fromEntries(
      Object.entries(active).map(([type, listeners]) => [type, listeners.size])
    );
  });
}

test.describe("live column resizing", () => {
  test("updates header and body geometry during drag and commits the latest payload", async ({
    page,
  }) => {
    const { scope, grid } = await openScenario(page, "live-resize");
    const descriptionHeader = header(grid, "description");
    const descriptionCell = firstCell(grid, "description");
    const resizer = descriptionHeader.locator('[data-slot="column-resizer"]');
    const eventCount = scope.getByTestId("column-resize-event-count");
    const latestEvent = scope.getByTestId("column-resize-last-event");
    const initialWidth = await readWidth(descriptionHeader);
    const start = await dragStartPoint(resizer);

    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await expect(grid).toHaveAttribute("data-column-resizing", "true");
    await expect(
      grid.locator(".InovuaReactDataGrid__resize-proxy")
    ).toHaveCount(0);

    await page.mouse.move(start.x + 100, start.y, { steps: 12 });
    await expect
      .poll(() => readWidth(descriptionHeader))
      .toBeGreaterThan(initialWidth + 75);

    const widthDuringDrag = await readWidth(descriptionHeader);
    const bodyWidthDuringDrag = await readWidth(descriptionCell);
    expect(Math.abs(widthDuringDrag - bodyWidthDuringDrag)).toBeLessThanOrEqual(
      MAX_GEOMETRY_DRIFT_PX
    );
    await expect(eventCount).toHaveText("0");
    await expect(latestEvent).toHaveText("none");
    await settleFrames(page);

    await page.mouse.up();
    await expect(grid).toHaveAttribute("data-column-resizing", "false");
    await expect(
      grid.locator(".InovuaReactDataGrid__resize-proxy")
    ).toHaveCount(0);
    await settleFrames(page);

    // Live mode changes only when geometry is painted. The public Inovua-style
    // callback remains a completion event and fires once with the final size.
    await expect(eventCount).toHaveText("1");
    const renderedWidth = await readWidth(descriptionHeader);
    const finalPayload = await readPayload(latestEvent);
    expect(finalPayload.columnId).toBe("description");
    expect(finalPayload.width).not.toBeNull();
    expect(renderedWidth).toBeGreaterThan(initialWidth + 75);
    expect(
      Math.abs(renderedWidth - (finalPayload.width ?? 0))
    ).toBeLessThanOrEqual(MAX_GEOMETRY_DRIFT_PX + 1);
    expect(finalPayload.reservedViewportWidth).not.toBeNull();
  });

  test("keeps deferred proxy resizing as the default", async ({ page }) => {
    const { scope, grid } = await openScenario(page, "resize-callback");
    const descriptionHeader = header(grid, "description");
    const descriptionCell = firstCell(grid, "description");
    const resizer = descriptionHeader.locator('[data-slot="column-resizer"]');
    const eventCount = scope.getByTestId("column-resize-event-count");
    const initialWidth = await readWidth(descriptionHeader);
    const start = await dragStartPoint(resizer);

    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(start.x + 100, start.y, { steps: 12 });
    await settleFrames(page);

    await expect(
      grid.locator(".InovuaReactDataGrid__resize-proxy")
    ).toBeVisible();
    expect(
      Math.abs((await readWidth(descriptionHeader)) - initialWidth)
    ).toBeLessThanOrEqual(1);
    expect(
      Math.abs((await readWidth(descriptionCell)) - initialWidth)
    ).toBeLessThanOrEqual(MAX_GEOMETRY_DRIFT_PX);
    await expect(eventCount).toHaveText("0");

    await page.mouse.up();
    await expect(eventCount).toHaveText("1");
    await expect
      .poll(() => readWidth(descriptionHeader))
      .toBeGreaterThan(initialWidth + 75);
    await expect(
      grid.locator(".InovuaReactDataGrid__resize-proxy")
    ).toHaveCount(0);
  });

  test("previews a controlled width but leaves ownership with the consumer", async ({
    page,
  }) => {
    const { scope, grid } = await openScenario(page, "controlled-live-resize");
    const controlledHeader = header(grid, "controlled");
    const controlledCell = firstCell(grid, "controlled");
    const resizer = controlledHeader.locator('[data-slot="column-resizer"]');
    const proposals = scope.getByTestId("controlled-resize-events");
    const controlledValue = scope.getByTestId("controlled-width-value");
    const initialWidth = await readWidth(controlledHeader);
    const start = await dragStartPoint(resizer);

    await expect(controlledValue).toHaveText("180");
    expect(await readPayloads(proposals)).toEqual([]);
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(start.x + 100, start.y, { steps: 12 });

    await expect
      .poll(() => readWidth(controlledHeader))
      .toBeGreaterThan(initialWidth + 75);
    expect(
      Math.abs(
        (await readWidth(controlledHeader)) - (await readWidth(controlledCell))
      )
    ).toBeLessThanOrEqual(MAX_GEOMETRY_DRIFT_PX);
    expect(await readPayloads(proposals)).toEqual([]);
    await expect(controlledValue).toHaveText("180");

    await page.mouse.up();
    await expect(grid).toHaveAttribute("data-column-resizing", "false");
    await expect
      .poll(async () => (await readPayloads(proposals)).length)
      .toBe(1);
    const [proposal] = await readPayloads(proposals);
    expect(proposal?.columnId).toBe("controlled");
    expect(proposal?.width ?? 0).toBeGreaterThan(initialWidth + 75);
    await expect
      .poll(async () =>
        Math.abs((await readWidth(controlledHeader)) - initialWidth)
      )
      .toBeLessThanOrEqual(MAX_GEOMETRY_DRIFT_PX);
    expect(
      Math.abs((await readWidth(controlledCell)) - initialWidth)
    ).toBeLessThanOrEqual(MAX_GEOMETRY_DRIFT_PX);
    await expect(controlledValue).toHaveText("180");
    await expect(
      grid.locator(".InovuaReactDataGrid__resize-proxy")
    ).toHaveCount(0);
  });

  test("cancelling restores a controlled width updated during the live drag", async ({
    page,
  }) => {
    const { scope, grid } = await openScenario(page, "controlled-live-resize");
    const controlledHeader = header(grid, "controlled");
    const controlledCell = firstCell(grid, "controlled");
    const fillerHeader = header(grid, "filler");
    const bodyTable = grid.locator(".tdg-body-table");
    const resizer = controlledHeader.locator('[data-slot="column-resizer"]');
    const proposals = scope.getByTestId("controlled-resize-events");
    const controlledValue = scope.getByTestId("controlled-width-value");
    const setControlledWidth = scope.getByTestId("set-controlled-width");
    const initialWidth = await readWidth(controlledHeader);
    const fillerWidth = await readWidth(fillerHeader);
    const start = await dragStartPoint(resizer);

    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(start.x + 70, start.y, { steps: 10 });
    await settleFrames(page);

    const previewWidth = await readWidth(controlledHeader);
    expect(previewWidth).toBeGreaterThan(initialWidth + 50);
    expect(await readPayloads(proposals)).toEqual([]);

    // Dispatch a consumer action without releasing the held resize pointer.
    await setControlledWidth.evaluate((element) =>
      (element as HTMLElement).click()
    );
    await expect(controlledValue).toHaveText("300");
    await settleFrames(page);

    // The active pointer preview remains on top of the new controlled base.
    expect(
      Math.abs((await readWidth(controlledHeader)) - previewWidth)
    ).toBeLessThanOrEqual(MAX_GEOMETRY_DRIFT_PX);
    expect(
      Math.abs((await readWidth(bodyTable)) - (previewWidth + fillerWidth))
    ).toBeLessThanOrEqual(MAX_GEOMETRY_DRIFT_PX + 1);
    expect(await readPayloads(proposals)).toEqual([]);

    await page.evaluate(() => window.dispatchEvent(new Event("blur")));
    await expect(grid).toHaveAttribute("data-column-resizing", "false");
    await expect
      .poll(async () => Math.abs((await readWidth(controlledHeader)) - 300))
      .toBeLessThanOrEqual(MAX_GEOMETRY_DRIFT_PX);
    expect(
      Math.abs((await readWidth(controlledCell)) - 300)
    ).toBeLessThanOrEqual(MAX_GEOMETRY_DRIFT_PX);
    expect(
      Math.abs((await readWidth(bodyTable)) - (300 + fillerWidth))
    ).toBeLessThanOrEqual(MAX_GEOMETRY_DRIFT_PX + 1);
    await expect(controlledValue).toHaveText("300");
    expect(await readPayloads(proposals)).toEqual([]);

    // Reset Playwright's mouse state; the grid listener is already gone.
    await page.mouse.up();
  });

  test("rolls a cancelled live preview back without emitting completion", async ({
    page,
  }) => {
    const { scope, grid } = await openScenario(page, "live-resize");
    const descriptionHeader = header(grid, "description");
    const descriptionCell = firstCell(grid, "description");
    const resizer = descriptionHeader.locator('[data-slot="column-resizer"]');
    const eventCount = scope.getByTestId("column-resize-event-count");
    const initialWidth = await readWidth(descriptionHeader);
    const pointerId = 29;

    const start = await resizer.evaluate((element, id) => {
      const rect = element.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      element.dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true,
          cancelable: true,
          clientX: x,
          clientY: y,
          button: 0,
          buttons: 1,
          pointerId: id,
          pointerType: "mouse",
          isPrimary: true,
        })
      );
      return { x, y };
    }, pointerId);

    await page.evaluate(
      ({ id, x, y }) => {
        window.dispatchEvent(
          new PointerEvent("pointermove", {
            bubbles: true,
            cancelable: true,
            clientX: x + 90,
            clientY: y,
            buttons: 1,
            pointerId: id,
            pointerType: "mouse",
            isPrimary: true,
          })
        );
      },
      { id: pointerId, x: start.x, y: start.y }
    );
    await settleFrames(page, 2);
    await expect
      .poll(() => readWidth(descriptionHeader))
      .toBeGreaterThan(initialWidth + 65);
    await expect(eventCount).toHaveText("0");

    await page.evaluate(
      ({ id, x, y }) => {
        window.dispatchEvent(
          new PointerEvent("pointercancel", {
            bubbles: true,
            cancelable: true,
            clientX: x + 90,
            clientY: y,
            buttons: 0,
            pointerId: id,
            pointerType: "mouse",
            isPrimary: true,
          })
        );
      },
      { id: pointerId, x: start.x, y: start.y }
    );

    await expect(grid).toHaveAttribute("data-column-resizing", "false");
    await expect
      .poll(async () =>
        Math.abs((await readWidth(descriptionHeader)) - initialWidth)
      )
      .toBeLessThanOrEqual(MAX_GEOMETRY_DRIFT_PX);
    expect(
      Math.abs((await readWidth(descriptionCell)) - initialWidth)
    ).toBeLessThanOrEqual(MAX_GEOMETRY_DRIFT_PX);
    await expect(eventCount).toHaveText("0");
    await expect(
      grid.locator(".InovuaReactDataGrid__resize-proxy")
    ).toHaveCount(0);
  });

  test("coalesces pointer bursts and releases every drag listener", async ({
    page,
  }) => {
    await installResizeListenerAudit(page);
    const { scope, grid } = await openScenario(page, "live-resize");
    const descriptionHeader = header(grid, "description");
    const fillerContent = firstCell(grid, "filler").locator(
      ".tdg-cell-content"
    );
    const resizer = descriptionHeader.locator('[data-slot="column-resizer"]');
    const eventCount = scope.getByTestId("column-resize-event-count");
    const initialWidth = await readWidth(descriptionHeader);
    const baselineListeners = await readResizeListenerAudit(page);
    const mountedRows = grid.locator('[data-slot="grid-row"][data-row-id]');
    const initialMountedRowCount = await mountedRows.count();
    expect(initialMountedRowCount).toBeGreaterThan(0);
    expect(initialMountedRowCount).toBeLessThan(500);
    const pointerId = 41;

    const start = await resizer.evaluate((element, id) => {
      const rect = element.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      element.dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true,
          cancelable: true,
          clientX: x,
          clientY: y,
          button: 0,
          buttons: 1,
          pointerId: id,
          pointerType: "mouse",
          isPrimary: true,
        })
      );
      return { x, y };
    }, pointerId);
    await expect(grid).toHaveAttribute("data-column-resizing", "true");

    const burst = await grid.evaluate(
      async (
        gridElement,
        args: {
          pointerId: number;
          startX: number;
          startY: number;
          moveCount: number;
        }
      ) => {
        const descriptionHeader = gridElement.querySelector<HTMLElement>(
          '[data-slot="grid-header-cell"][data-column-id="description"]'
        );
        const descriptionCell = gridElement.querySelector<HTMLElement>(
          '[data-slot="grid-row"][data-row-id] [data-column-id="description"]'
        );
        const fillerContent = gridElement.querySelector<HTMLElement>(
          '[data-slot="grid-row"][data-row-id] [data-column-id="filler"] .tdg-cell-content'
        );
        if (!descriptionHeader || !descriptionCell || !fillerContent) {
          throw new Error(
            "Expected resize performance targets were not mounted"
          );
        }

        const descriptionColumns = Array.from(
          gridElement.querySelectorAll<HTMLTableColElement>(
            'col[data-column-id="description"]'
          )
        );
        const owningTables = Array.from(
          new Set(
            descriptionColumns
              .map((element) => element.closest("table"))
              .filter(
                (element): element is HTMLTableElement =>
                  element instanceof HTMLTableElement
              )
          )
        );
        if (descriptionColumns.length < 2 || owningTables.length < 2) {
          throw new Error(
            "Expected separate header/body column preview targets"
          );
        }

        let columnStyleMutations = 0;
        let tableStyleMutations = 0;
        const styleObserver = new MutationObserver((records) => {
          for (const record of records) {
            if (
              descriptionColumns.includes(record.target as HTMLTableColElement)
            ) {
              columnStyleMutations += 1;
            }
            if (owningTables.includes(record.target as HTMLTableElement)) {
              tableStyleMutations += 1;
            }
          }
        });
        for (const target of [...descriptionColumns, ...owningTables]) {
          styleObserver.observe(target, {
            attributes: true,
            attributeFilter: ["style"],
          });
        }

        const longTasks: number[] = [];
        const longTaskObserver =
          typeof PerformanceObserver === "function" &&
          PerformanceObserver.supportedEntryTypes.includes("longtask")
            ? new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                  longTasks.push(entry.duration);
                }
              })
            : null;
        longTaskObserver?.observe({ entryTypes: ["longtask"] });

        const preservedFillerContent = fillerContent;
        const startedAt = performance.now();
        for (let index = 1; index <= args.moveCount; index += 1) {
          window.dispatchEvent(
            new PointerEvent("pointermove", {
              bubbles: true,
              cancelable: true,
              clientX: args.startX + (120 * index) / args.moveCount,
              clientY: args.startY,
              button: -1,
              buttons: 1,
              pointerId: args.pointerId,
              pointerType: "mouse",
              isPrimary: true,
            })
          );
        }
        const dispatchDuration = performance.now() - startedAt;
        const firstFrameAt = await new Promise<number>((resolve) =>
          requestAnimationFrame(resolve)
        );
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => resolve())
        );
        await new Promise<void>((resolve) => setTimeout(resolve, 0));

        const currentFillerContent = gridElement.querySelector<HTMLElement>(
          '[data-slot="grid-row"][data-row-id] [data-column-id="filler"] .tdg-cell-content'
        );
        styleObserver.disconnect();
        longTaskObserver?.disconnect();

        return {
          cellWidth: descriptionCell.getBoundingClientRect().width,
          dispatchDuration,
          fillerContentPreserved:
            currentFillerContent === preservedFillerContent,
          firstFrameDelay: firstFrameAt - startedAt,
          headerWidth: descriptionHeader.getBoundingClientRect().width,
          columnStyleMutations,
          maxLongTask: Math.max(0, ...longTasks),
          mountedRowCount: gridElement.querySelectorAll(
            '[data-slot="grid-row"][data-row-id]'
          ).length,
          tableStyleMutations,
        };
      },
      {
        pointerId,
        startX: start.x,
        startY: start.y,
        moveCount: POINTER_BURST_SIZE,
      }
    );

    expect(burst.dispatchDuration).toBeLessThan(MAX_INTERACTION_DELAY_MS);
    expect(burst.firstFrameDelay).toBeLessThan(MAX_INTERACTION_DELAY_MS);
    expect(burst.maxLongTask).toBeLessThan(MAX_LONG_TASK_MS);
    expect(burst.headerWidth).toBeGreaterThan(initialWidth + 95);
    expect(Math.abs(burst.headerWidth - burst.cellWidth)).toBeLessThanOrEqual(
      MAX_GEOMETRY_DRIFT_PX
    );
    expect(burst.fillerContentPreserved).toBe(true);
    expect(burst.mountedRowCount).toBe(initialMountedRowCount);
    expect(burst.columnStyleMutations).toBeGreaterThan(0);
    expect(burst.tableStyleMutations).toBeGreaterThan(0);
    expect(
      burst.columnStyleMutations + burst.tableStyleMutations
    ).toBeLessThanOrEqual(12);

    // A synchronous event burst must be reduced to frame-sized DOM work. The
    // public callback remains completion-only even though geometry is live.
    await expect(eventCount).toHaveText("0");

    await page.evaluate(
      ({ id, x, y }) => {
        window.dispatchEvent(
          new PointerEvent("pointerup", {
            bubbles: true,
            cancelable: true,
            clientX: x + 120,
            clientY: y,
            button: 0,
            buttons: 0,
            pointerId: id,
            pointerType: "mouse",
            isPrimary: true,
          })
        );
      },
      { id: pointerId, x: start.x, y: start.y }
    );
    await expect(grid).toHaveAttribute("data-column-resizing", "false");
    await expect
      .poll(() => readResizeListenerAudit(page))
      .toEqual(baselineListeners);
    await settleFrames(page);
    await expect(eventCount).toHaveText("1");

    const settledWidth = await readWidth(descriptionHeader);
    const settledCount = await readCount(eventCount);
    expect(settledCount).toBe(1);
    expect(await mountedRows.count()).toBe(initialMountedRowCount);
    expect(await fillerContent.isVisible()).toBe(true);

    // A stale pointer event after completion must not enqueue more width work.
    await page.evaluate(
      ({ id, x, y }) => {
        window.dispatchEvent(
          new PointerEvent("pointermove", {
            bubbles: true,
            cancelable: true,
            clientX: x + 180,
            clientY: y,
            buttons: 1,
            pointerId: id,
            pointerType: "mouse",
            isPrimary: true,
          })
        );
      },
      { id: pointerId, x: start.x, y: start.y }
    );
    await settleFrames(page, 3);
    expect(await readWidth(descriptionHeader)).toBeCloseTo(settledWidth, 1);
    expect(await readCount(eventCount)).toBe(settledCount);
  });
});
