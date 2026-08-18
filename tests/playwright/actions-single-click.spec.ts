import { chromium, expect, test, type Locator } from "@playwright/test";

import type { TypeColumns } from "../../src/types";
import {
  buildGridColumnRenderItems,
  buildLockedColumnLayout,
  groupColumnsByLock,
  resolveColumnLock,
} from "../../src/grid/utils/lockedColumns";

async function readTrailingColumnCoverage(grid: Locator) {
  return grid.evaluate((element) => {
    const viewport = element.querySelector<HTMLElement>(
      '[data-slot="scroll-area-viewport"]'
    );
    if (!viewport) return null;

    const viewportRect = viewport.getBoundingClientRect();
    const rows = [
      {
        name: "header",
        element: element.querySelector<HTMLElement>(".tdg-header-row"),
      },
      {
        name: "filter",
        element: element.querySelector<HTMLElement>(".tdg-filter-row"),
      },
      {
        name: "body",
        element: element.querySelector<HTMLElement>(
          '[data-slot="grid-row"][data-row-id]'
        ),
      },
    ];

    return {
      scrollEndDistance: Math.abs(
        viewport.scrollWidth - viewport.clientWidth - viewport.scrollLeft
      ),
      rows: rows.map((row) => {
        const lockedEnd = row.element?.querySelector<HTMLElement>(
          '[data-column-id="actions"]'
        );
        if (!row.element || !lockedEnd) {
          return {
            name: row.name,
            centerWidth: 0,
            maxUncoveredWidth: Number.POSITIVE_INFINITY,
            visibleColumnIds: [] as string[],
          };
        }

        const centerLeft = viewportRect.left;
        const centerRight = Math.min(
          viewportRect.right,
          lockedEnd.getBoundingClientRect().left
        );
        const intervals = Array.from(
          row.element.querySelectorAll<HTMLElement>("[data-column-id]")
        )
          .flatMap((cell) => {
            const columnId = cell.dataset.columnId;
            if (
              !columnId ||
              columnId === "__checkbox__" ||
              columnId === "actions"
            ) {
              return [];
            }

            const rect = cell.getBoundingClientRect();
            const left = Math.max(centerLeft, rect.left);
            const right = Math.min(centerRight, rect.right);

            return right > left ? [{ columnId, left, right }] : [];
          })
          .sort((a, b) => a.left - b.left);

        let cursor = centerLeft;
        let maxUncoveredWidth = 0;

        for (const interval of intervals) {
          maxUncoveredWidth = Math.max(
            maxUncoveredWidth,
            interval.left - cursor
          );
          cursor = Math.max(cursor, interval.right);
        }
        maxUncoveredWidth = Math.max(maxUncoveredWidth, centerRight - cursor);

        return {
          name: row.name,
          centerWidth: Math.max(0, centerRight - centerLeft),
          maxUncoveredWidth,
          visibleColumnIds: intervals.map((interval) => interval.columnId),
        };
      }),
    };
  });
}

async function startTrailingSpacerGapMonitor(grid: Locator) {
  await grid.evaluate((element) => {
    const monitoredElement = element as HTMLElement & {
      __tdgTrailingSpacerGapMonitor?: {
        frameId: number;
        maximumVisibleWidth: number;
        observer: MutationObserver;
      };
    };
    const existingMonitor = monitoredElement.__tdgTrailingSpacerGapMonitor;
    if (existingMonitor) {
      cancelAnimationFrame(existingMonitor.frameId);
      existingMonitor.observer.disconnect();
    }

    const monitor = {
      frameId: 0,
      maximumVisibleWidth: 0,
      observer: null as unknown as MutationObserver,
    };
    monitoredElement.__tdgTrailingSpacerGapMonitor = monitor;

    const measure = () => {
      const viewport = monitoredElement.querySelector<HTMLElement>(
        '[data-slot="scroll-area-viewport"]'
      );
      if (viewport) {
        const viewportRect = viewport.getBoundingClientRect();
        const rows = [
          monitoredElement.querySelector<HTMLElement>(".tdg-header-row"),
          monitoredElement.querySelector<HTMLElement>(".tdg-filter-row"),
          monitoredElement.querySelector<HTMLElement>(
            '[data-slot="grid-row"][data-row-id]'
          ),
        ];

        for (const row of rows) {
          const lockedEnd = row?.querySelector<HTMLElement>(
            '[data-column-id="actions"]'
          );
          if (!row || !lockedEnd) continue;

          const centerRight = Math.min(
            viewportRect.right,
            lockedEnd.getBoundingClientRect().left
          );
          for (const child of Array.from(row.children)) {
            if (!(child instanceof HTMLElement)) continue;
            if (child.hasAttribute("data-column-id")) continue;

            const rect = child.getBoundingClientRect();
            const visibleWidth =
              Math.min(centerRight, rect.right) -
              Math.max(viewportRect.left, rect.left);
            monitor.maximumVisibleWidth = Math.max(
              monitor.maximumVisibleWidth,
              visibleWidth
            );
          }
        }
      }
    };

    const tick = () => {
      measure();
      monitor.frameId = requestAnimationFrame(tick);
    };
    monitor.observer = new MutationObserver(measure);
    monitor.observer.observe(monitoredElement, {
      childList: true,
      subtree: true,
    });

    tick();
  });
}

async function stopTrailingSpacerGapMonitor(grid: Locator) {
  return grid.evaluate((element) => {
    const monitoredElement = element as HTMLElement & {
      __tdgTrailingSpacerGapMonitor?: {
        frameId: number;
        maximumVisibleWidth: number;
        observer: MutationObserver;
      };
    };
    const monitor = monitoredElement.__tdgTrailingSpacerGapMonitor;
    if (!monitor) return Number.POSITIVE_INFINITY;

    cancelAnimationFrame(monitor.frameId);
    monitor.observer.disconnect();
    delete monitoredElement.__tdgTrailingSpacerGapMonitor;
    return monitor.maximumVisibleWidth;
  });
}

test("locked-column helpers normalize both start forms and accumulate offsets on each edge", () => {
  const columns: TypeColumns = [
    { name: "middle-a" },
    { name: "end-a", locked: "end" },
    { name: "start-alias", locked: true },
    { name: "middle-b", locked: false },
    { name: "start-explicit", locked: "start" },
    { name: "end-b", locked: "end" },
  ];
  const grouped = groupColumnsByLock(columns);

  expect(grouped.map((column) => column.name)).toEqual([
    "start-alias",
    "start-explicit",
    "middle-a",
    "middle-b",
    "end-a",
    "end-b",
  ]);
  expect(resolveColumnLock(grouped[0]!)).toBe("start");
  expect(resolveColumnLock(grouped[1]!)).toBe("start");

  const widths = {
    "start-alias": 70,
    "start-explicit": 90,
    "middle-a": 120,
    "middle-b": 130,
    "end-a": 80,
    "end-b": 100,
  };
  const layout = buildLockedColumnLayout(grouped, widths);

  // No viewport offset any more: the locked-end section reaches the viewport
  // edge because a filler cell absorbs the slack, not because these cells are
  // transformed out of their own slots.
  expect(layout).toEqual({
    "start-alias": {
      side: "start",
      offset: 0,
      boundary: false,
    },
    "start-explicit": {
      side: "start",
      offset: 70,
      boundary: true,
    },
    "end-a": {
      side: "end",
      offset: 100,
      boundary: true,
    },
    "end-b": {
      side: "end",
      offset: 0,
      boundary: false,
    },
  });

  const renderItems = buildGridColumnRenderItems({
    columns: grouped,
    columnLayout: grouped.map((column) => ({
      id: String(column.name),
      width: widths[column.name as keyof typeof widths],
    })),
    virtualColumnIndexes: [2],
    virtualizeColumns: true,
  });

  expect(
    renderItems.items
      .filter((item) => item.type === "column")
      .map((item) => item.id)
  ).toEqual(["start-alias", "start-explicit", "middle-a", "end-a", "end-b"]);
  expect(renderItems.items).toContainEqual({
    type: "spacer",
    id: "__tdg_virtual_columns_after__",
    width: 130,
  });

  const trailingCoverageColumns: TypeColumns = [
    { name: "start", locked: "start" },
    { name: "visible" },
    { name: "middle" },
    { name: "near-end" },
    { name: "trailing" },
    { name: "end", locked: "end" },
  ];
  const trailingCoverageItems = buildGridColumnRenderItems({
    columns: trailingCoverageColumns,
    columnLayout: trailingCoverageColumns.map((column) => ({
      id: String(column.name),
      width: column.name === "start" ? 40 : 100,
    })),
    virtualColumnIndexes: [1],
    virtualizeColumns: true,
    trailingViewportWidth: 180,
  });

  expect(
    trailingCoverageItems.items
      .filter((item) => item.type === "column")
      .map((item) => item.id)
  ).toEqual(["start", "near-end", "trailing", "end"]);
  expect(trailingCoverageItems.items).toContainEqual({
    type: "spacer",
    id: "__tdg_virtual_columns_before__",
    width: 200,
  });
  expect(trailingCoverageItems.items).not.toContainEqual(
    expect.objectContaining({
      id: "__tdg_virtual_columns_after__",
    })
  );
});

test("actions example keeps the locked-end column mounted and aligned while horizontally virtualized", async ({
  page,
}) => {
  await page.setViewportSize({ width: 650, height: 900 });
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
  const unlockedHeader = grid.locator(
    '.tdg-header-cell[data-column-id="sample"]'
  );
  const unlockedFilter = grid.locator(
    '.tdg-filter-cell[data-column-id="sample"]'
  );
  const unlockedCell = grid
    .locator(
      'tbody [data-slot="grid-row"] .InovuaReactDataGrid__cell[data-column-id="sample"]'
    )
    .first();

  await expect(grid).toBeVisible();
  await expect(header).toBeVisible();
  await expect(filter).toBeVisible();
  await expect(firstActionCell).toBeVisible();
  await expect(unlockedHeader).toBeVisible();
  await expect(unlockedFilter).toBeVisible();
  await expect(unlockedCell).toBeVisible();
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

  const lockedChrome = await grid.evaluate((element) => {
    const selector = (kind: "header" | "filter" | "cell", columnId: string) =>
      kind === "header"
        ? `.tdg-header-cell[data-column-id="${columnId}"]`
        : kind === "filter"
          ? `.tdg-filter-cell[data-column-id="${columnId}"]`
          : `tbody .InovuaReactDataGrid__cell[data-column-id="${columnId}"]`;

    const computedShadow = (kind: "header" | "filter" | "cell", id: string) => {
      const node = element.querySelector<HTMLElement>(selector(kind, id));
      return node ? getComputedStyle(node).boxShadow : null;
    };

    const checkbox = element.querySelector<HTMLElement>(".tdg-checkbox");
    const sampleHeader = element.querySelector<HTMLElement>(
      '.tdg-header-cell[data-column-id="sample"] span'
    );
    const sampleCell = element.querySelector<HTMLElement>(
      'tbody .InovuaReactDataGrid__cell[data-column-id="sample"] .tdg-cell-content'
    );
    const sampleRenderer = sampleCell?.firstElementChild as HTMLElement | null;
    const actionButton = element.querySelector<HTMLElement>(
      'tbody .InovuaReactDataGrid__cell[data-column-id="actions"] button'
    );
    const actionContent =
      actionButton?.closest<HTMLElement>(".tdg-cell-content");

    return {
      lockedShadows: [
        computedShadow("header", "__checkbox__"),
        computedShadow("filter", "__checkbox__"),
        computedShadow("cell", "__checkbox__"),
        computedShadow("header", "actions"),
        computedShadow("filter", "actions"),
        computedShadow("cell", "actions"),
      ],
      checkboxShadow: checkbox ? getComputedStyle(checkbox).boxShadow : null,
      headerContentLeft: sampleHeader?.getBoundingClientRect().left ?? null,
      bodyContentLeft: sampleCell?.getBoundingClientRect().left ?? null,
      sampleContentFits:
        sampleCell && sampleRenderer
          ? sampleRenderer.getBoundingClientRect().height <=
            sampleCell.getBoundingClientRect().height
          : null,
      actionButtonFits:
        actionButton && actionContent
          ? actionButton.getBoundingClientRect().height <=
            actionContent.getBoundingClientRect().height
          : null,
    };
  });

  expect(lockedChrome.lockedShadows).toEqual([
    "none",
    "none",
    "none",
    "none",
    "none",
    "none",
  ]);
  expect(lockedChrome.checkboxShadow).toBe("none");
  expect(lockedChrome.headerContentLeft).not.toBeNull();
  expect(lockedChrome.bodyContentLeft).not.toBeNull();
  expect(
    Math.abs(lockedChrome.headerContentLeft! - lockedChrome.bodyContentLeft!)
  ).toBeLessThan(1);
  expect(lockedChrome.sampleContentFits).toBe(true);
  expect(lockedChrome.actionButtonFits).toBe(true);

  const initialScrollGeometry = await viewport.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
    scrollLeft: element.scrollLeft,
  }));
  expect(initialScrollGeometry.scrollWidth).toBeGreaterThan(
    initialScrollGeometry.clientWidth
  );
  expect(initialScrollGeometry.scrollLeft).toBe(0);

  await header.scrollIntoViewIfNeeded();
  await viewport.evaluate((element) => {
    element.scrollLeft = 160;
    element.dispatchEvent(new Event("scroll", { bubbles: true }));
  });
  await expect
    .poll(() => viewport.evaluate((element) => element.scrollLeft))
    .toBeGreaterThan(100);

  const lockedEndOwnsVisibleBoundary = await grid.evaluate((element) => {
    const cells = [
      element.querySelector<HTMLElement>(
        '.tdg-header-cell[data-column-id="actions"]'
      ),
      element.querySelector<HTMLElement>(
        '.tdg-filter-cell[data-column-id="actions"]'
      ),
    ];

    return cells.every((cell) => {
      if (!cell) return false;
      const rect = cell.getBoundingClientRect();
      return [2, rect.width / 2, rect.width - 2].every((offset) => {
        const hit = document.elementFromPoint(
          rect.left + offset,
          rect.top + rect.height / 2
        );
        return (
          hit?.closest("[data-column-id]")?.getAttribute("data-column-id") ===
          "actions"
        );
      });
    });
  });
  expect(lockedEndOwnsVisibleBoundary).toBe(true);

  await viewport.evaluate((element) => {
    element.scrollLeft = element.scrollWidth;
    element.dispatchEvent(new Event("scroll", { bubbles: true }));
  });
  await expect
    .poll(() => viewport.evaluate((element) => element.scrollLeft))
    .toBeGreaterThan(0);

  await expect(header).toBeVisible();
  await expect(filter).toBeVisible();
  await expect(firstActionCell).toBeVisible();
  await expect(unlockedHeader).toHaveCount(0);
  await expect(unlockedFilter).toHaveCount(0);
  await expect(unlockedCell).toHaveCount(0);

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

test("narrow resize does not leave a virtual spacer gap at full horizontal scroll", async () => {
  // Use a fresh browser process so the resize + full-scroll sequence runs
  // before a reused worker page can settle the column virtualizer.
  const regressionBrowser = await chromium.launch();
  const page = await regressionBrowser.newPage({
    baseURL: String(test.info().project.use.baseURL),
    viewport: { width: 348, height: 844 },
  });
  await page.goto("/actions");

  const preview = page.getByTestId("example-preview-panel");
  const grid = preview.locator(".InovuaReactDataGrid.tdg-root").first();
  const viewport = grid.locator(".tdg-body-viewport");
  const actionsHeader = grid.locator(
    '.tdg-header-cell[data-column-id="actions"]'
  );
  const resizer = actionsHeader.getByRole("button", {
    name: "Resize Actions",
  });

  await grid.waitFor({ state: "visible" });
  await actionsHeader.scrollIntoViewIfNeeded();
  await startTrailingSpacerGapMonitor(grid);

  const initialWidth = (await actionsHeader.boundingBox())?.width ?? 0;
  const resizerBox = await resizer.boundingBox();
  expect(resizerBox).not.toBeNull();

  const startX = resizerBox!.x + resizerBox!.width / 2;
  const startY = resizerBox!.y + resizerBox!.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX - 90, startY);
  await page.mouse.up();

  await viewport.evaluate((element) => {
    element.scrollLeft = element.scrollWidth;
    element.dispatchEvent(new Event("scroll", { bubbles: true }));
  });

  // The broken range was published asynchronously after the scroll event and
  // could later recover. Keep the in-page frame monitor running beyond that
  // update so even a transient painted spacer is observable.
  await page.waitForTimeout(500);
  const maximumVisibleSpacerWidth = await stopTrailingSpacerGapMonitor(grid);
  const coverage = await readTrailingColumnCoverage(grid);

  await expect(grid).toHaveAttribute("data-column-resizing", "false");
  expect((await actionsHeader.boundingBox())?.width ?? 0).toBeLessThan(
    initialWidth - 70
  );
  expect(coverage?.scrollEndDistance).toBeLessThanOrEqual(1);
  expect(maximumVisibleSpacerWidth).toBeLessThanOrEqual(1);
  expect(coverage).not.toBeNull();
  for (const row of coverage!.rows) {
    expect(row.centerWidth).toBeGreaterThan(100);
    expect(row.visibleColumnIds).toContain("openedAt");
  }
  await regressionBrowser.close();
});

test("imperative column scrolling reveals unlocked cells between both locked sections", async ({
  page,
}) => {
  await page.setViewportSize({ width: 650, height: 900 });
  await page.goto("/actions");

  const preview = page.getByTestId("example-preview-panel");
  const grid = preview.locator(".InovuaReactDataGrid.tdg-root").first();
  const viewport = grid.locator(".tdg-body-viewport");
  const lockedStart = grid.locator(
    '.tdg-header-cell[data-column-id="__checkbox__"]'
  );
  const openedHeader = grid.locator(
    '.tdg-header-cell[data-column-id="openedAt"]'
  );
  const lockedEnd = grid.locator('.tdg-header-cell[data-column-id="actions"]');

  await expect(grid).toBeVisible();
  await expect(lockedStart).toHaveCSS("position", "sticky");
  await expect(lockedEnd).toHaveCSS("position", "sticky");
  await preview.getByTestId("actions-reveal-opened").click();

  await expect(openedHeader).toBeVisible();
  await expect
    .poll(() => viewport.evaluate((element) => element.scrollLeft))
    .toBeGreaterThan(0);

  const [startBox, openedBox, endBox] = await Promise.all([
    lockedStart.boundingBox(),
    openedHeader.boundingBox(),
    lockedEnd.boundingBox(),
  ]);
  expect(startBox).not.toBeNull();
  expect(openedBox).not.toBeNull();
  expect(endBox).not.toBeNull();
  expect(openedBox!.x).toBeGreaterThanOrEqual(
    startBox!.x + startBox!.width - 2
  );
  expect(openedBox!.x + openedBox!.width).toBeLessThanOrEqual(endBox!.x + 2);
});

test("live resize keeps a fixed-width locked-end column aligned before pointer release", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1500, height: 900 });
  await page.goto("/actions");

  const preview = page.getByTestId("example-preview-panel");
  const grid = preview.locator(".InovuaReactDataGrid.tdg-root").first();
  const viewport = grid.locator(".tdg-body-viewport");
  const bodyTable = grid.locator(".tdg-body-table");
  const actionsHeader = grid.locator(
    '.tdg-header-cell[data-column-id="actions"]'
  );
  const resizer = actionsHeader.getByRole("button", {
    name: "Resize Actions",
  });

  await expect(grid).toBeVisible();
  await expect(grid).toHaveAttribute("data-column-width-mode", "stretch");

  // The keyboard proposal enters deterministic fixed-width mode with the columns
  // no longer covering this viewport.
  //
  // The slack used to be left as a hole and the locked column translated back
  // over it, so this asserted that the *table* was narrower than the viewport.
  // A filler cell absorbs it now, which is the point: the table still spans the
  // viewport, so the check is that the filler carries the width instead.
  await resizer.press("ArrowLeft");
  await expect(grid).toHaveAttribute("data-column-width-mode", "fixed");
  await expect
    .poll(() =>
      grid.evaluate((element) => {
        const filler = element.querySelector<HTMLElement>(
          '.tdg-header-row > [data-slot="grid-filler-cell"]'
        );
        return filler ? Math.round(filler.getBoundingClientRect().width) : 0;
      })
    )
    .toBeGreaterThan(20);
  await expect
    .poll(async () => {
      const [tableBox, viewportWidth] = await Promise.all([
        bodyTable.boundingBox(),
        viewport.evaluate((element) => element.clientWidth),
      ]);
      return Math.abs(viewportWidth - (tableBox?.width ?? 0));
    })
    .toBeLessThanOrEqual(2);

  const rightEdgeDrift = async () => {
    const [viewportBox, headerBox] = await Promise.all([
      viewport.boundingBox(),
      actionsHeader.boundingBox(),
    ]);
    return Math.abs(
      headerBox!.x + headerBox!.width - (viewportBox!.x + viewportBox!.width)
    );
  };
  await expect.poll(rightEdgeDrift).toBeLessThan(3);

  const initialWidth = (await actionsHeader.boundingBox())!.width;
  const resizerBox = await resizer.boundingBox();
  expect(resizerBox).not.toBeNull();
  const startX = resizerBox!.x + resizerBox!.width / 2;
  const startY = resizerBox!.y + resizerBox!.height / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await expect(grid).toHaveAttribute("data-column-resizing", "true");
  await page.mouse.move(startX - 40, startY, { steps: 8 });
  await expect
    .poll(async () => (await actionsHeader.boundingBox())!.width)
    .toBeLessThan(initialWidth - 25);

  // This assertion runs while the pointer is still down. The locked action
  // column must not drift and then snap back only at commit time.
  await expect.poll(rightEdgeDrift).toBeLessThan(3);
  await page.mouse.up();
  await expect(grid).toHaveAttribute("data-column-resizing", "false");
  await expect.poll(rightEdgeDrift).toBeLessThan(3);
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
