import { expect, test, type Page } from "@playwright/test";

// Timing is a secondary guard because CI scheduling can be noisy. DOM identity
// below is the deterministic signal for the expensive renderer churn.
const MAX_FRAME_DELAY_MS = 250;
const MAX_LONG_TASK_MS = 250;
const MAX_GEOMETRY_DRIFT_PX = 2;
const MAX_LAYOUT_DRIFT_PX = 1;
const OPTIONAL_COLUMNS = [
  { label: "Failed logins", id: "failed_login_attempts" },
  { label: "Last login", id: "date_last_successful_login" },
  { label: "Password changed", id: "date_pwdchanged" },
  { label: "Language", id: "lang" },
] as const;

function captureRuntimeFailures(page: Page) {
  const failures: string[] = [];
  const renderLoopPattern =
    /too many re-renders|maximum update depth|cannot update a component while rendering/i;

  page.on("pageerror", (error) => failures.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" && renderLoopPattern.test(message.text())) {
      failures.push(message.text());
    }
  });

  return failures;
}

test("Visible columns toggles stay responsive and geometrically consistent", async ({
  page,
}) => {
  const runtimeFailures = captureRuntimeFailures(page);

  // This width exposed the old icon-driven wrap: toggling a hidden column
  // changed the toolbar from one line to two and moved the complete grid.
  await page.setViewportSize({ width: 940, height: 900 });
  await page.goto("/users");

  const preview = page.getByTestId("example-preview-panel");
  const toggleGroup = preview.getByRole("group", {
    name: "Visible column toggles",
  });
  const grid = preview.locator(".InovuaReactDataGrid.tdg-root").first();
  const failedLoginsButton = toggleGroup.getByRole("button", {
    name: "Failed logins",
    exact: true,
  });
  const failedLoginsHeader = grid.locator(
    '[data-slot="grid-header-cell"][data-column-id="failed_login_attempts"]'
  );

  await expect(preview).toBeVisible();
  await expect(grid).toBeVisible();
  await expect(failedLoginsButton).toBeVisible();
  await expect(failedLoginsHeader).toHaveCount(0);
  await expect(failedLoginsButton).toHaveAttribute("aria-pressed", "false");

  const mountedRows = grid.locator('[data-slot="grid-row"][data-row-id]');
  await expect(mountedRows.first()).toBeVisible();
  const mountedRowCount = await mountedRows.count();
  expect(mountedRowCount).toBeGreaterThan(0);
  expect(mountedRowCount).toBeLessThan(48);

  // Column toggles are text controls. Their state must not add an eye icon or
  // change the button's accessible name when a column is hidden.
  const initialIconCount = await toggleGroup.locator("svg").count();

  // Exercise one browser-driven round trip before the in-page probe. This
  // catches pointer/focus regressions that a synthetic click alone would miss.
  await failedLoginsButton.click();
  await expect(failedLoginsHeader).toBeVisible();
  await expect(failedLoginsButton).toHaveAttribute("aria-pressed", "true");
  await failedLoginsButton.click();
  await expect(failedLoginsHeader).toHaveCount(0);
  await expect(failedLoginsButton).toHaveAttribute("aria-pressed", "false");

  const result = await preview.evaluate(
    async (previewElement, optionalColumns) => {
      const gridElement = previewElement.querySelector<HTMLElement>(
        ".InovuaReactDataGrid.tdg-root"
      );
      const group = previewElement.querySelector<HTMLElement>(
        '[role="group"][aria-label="Visible column toggles"]'
      );
      if (!gridElement || !group) {
        return { error: "Visibility controls or grid were not found" } as const;
      }

      const longTasks: number[] = [];
      const observer =
        typeof PerformanceObserver === "function" &&
        PerformanceObserver.supportedEntryTypes.includes("longtask")
          ? new PerformanceObserver((list) => {
              for (const entry of list.getEntries()) {
                longTasks.push(entry.duration);
              }
            })
          : null;

      observer?.observe({ entryTypes: ["longtask"] });

      const nextFrame = () =>
        new Promise<number>((resolve) => requestAnimationFrame(resolve));

      // Do not attribute route initialization or first-paint work to toggles.
      await nextFrame();
      await nextFrame();

      const samples: Array<{
        frameDelay: number;
        geometryDrift: number;
        headerIds: string[];
        bodyIds: string[];
        expectedVisible: boolean;
        visibleOnNextFrame: boolean;
        iconCount: number;
        label: string;
        pressedOnNextFrame: boolean;
        replacedContentNodes: number;
        buttonWidthDrift: number;
        groupHeightDrift: number;
        gridTopDrift: number;
      }> = [];

      const toggleColumn = async (
        target: { label: string; id: string },
        expectedVisible: boolean
      ) => {
        const button = Array.from(
          group.querySelectorAll<HTMLButtonElement>("button")
        ).find((element) => element.textContent?.trim() === target.label);
        if (!button) throw new Error(`Missing ${target.label} toggle`);

        // Existing renderers are the strongest deterministic proxy for work:
        // adding one column must not remount content in every unaffected cell.
        const preservedContent = new Map<string, Element>();
        for (const rowElement of gridElement.querySelectorAll<HTMLElement>(
          '[data-slot="grid-row"][data-row-id]'
        )) {
          for (const cellElement of rowElement.querySelectorAll<HTMLElement>(
            `[data-column-id]:not([data-column-id="${target.id}"])`
          )) {
            const content = cellElement.querySelector(".tdg-cell-content > *");
            if (!content) continue;

            preservedContent.set(
              `${rowElement.dataset.rowId}\u0000${cellElement.dataset.columnId}`,
              content
            );
          }
        }

        const buttonWidthBefore = button.getBoundingClientRect().width;
        const groupHeightBefore = group.getBoundingClientRect().height;
        const gridTopBefore = gridElement.getBoundingClientRect().top;
        const clickTime = performance.now();
        button.click();
        const frameTime = await nextFrame();

        const header = gridElement.querySelector<HTMLElement>(
          `[data-slot="grid-header-cell"][data-column-id="${target.id}"]`
        );
        const firstRow = gridElement.querySelector<HTMLElement>(
          '[data-slot="grid-row"][data-row-id]'
        );
        const headers = Array.from(
          gridElement.querySelectorAll<HTMLElement>(
            '[data-slot="grid-header-cell"][data-column-id]'
          )
        );
        const cells = Array.from(
          firstRow?.querySelectorAll<HTMLElement>("[data-column-id]") ?? []
        );
        const headerIds = headers.map(
          (element) => element.dataset.columnId ?? ""
        );
        const bodyIds = cells.map((element) => element.dataset.columnId ?? "");
        let replacedContentNodes = 0;
        for (const [key, previousContent] of preservedContent) {
          const [rowId, columnId] = key.split("\u0000");
          const currentContent = gridElement.querySelector(
            `[data-slot="grid-row"][data-row-id="${rowId}"] ` +
              `[data-column-id="${columnId}"] .tdg-cell-content > *`
          );

          if (currentContent !== previousContent) replacedContentNodes += 1;
        }
        const geometryDrift = headers.reduce(
          (maximum, headerElement, index) => {
            const cellElement = cells[index];
            if (!cellElement) return Number.POSITIVE_INFINITY;

            const headerRect = headerElement.getBoundingClientRect();
            const cellRect = cellElement.getBoundingClientRect();
            return Math.max(
              maximum,
              Math.abs(headerRect.left - cellRect.left),
              Math.abs(headerRect.width - cellRect.width)
            );
          },
          0
        );

        samples.push({
          frameDelay: frameTime - clickTime,
          geometryDrift,
          headerIds,
          bodyIds,
          expectedVisible,
          visibleOnNextFrame: Boolean(header),
          iconCount: group.querySelectorAll("svg").length,
          label: target.label,
          pressedOnNextFrame:
            button.getAttribute("aria-pressed") === String(expectedVisible),
          replacedContentNodes,
          buttonWidthDrift: Math.abs(
            button.getBoundingClientRect().width - buttonWidthBefore
          ),
          groupHeightDrift: Math.abs(
            group.getBoundingClientRect().height - groupHeightBefore
          ),
          gridTopDrift: Math.abs(
            gridElement.getBoundingClientRect().top - gridTopBefore
          ),
        });
      };

      for (let cycle = 0; cycle < 2; cycle += 1) {
        for (const target of optionalColumns) {
          await toggleColumn(target, true);
        }
        for (const target of [...optionalColumns].reverse()) {
          await toggleColumn(target, false);
        }
      }

      // Let PerformanceObserver deliver any entry generated by the final
      // toggle before disconnecting it.
      await nextFrame();
      observer?.disconnect();

      return {
        error: null,
        longTasks,
        samples,
      };
    },
    OPTIONAL_COLUMNS
  );

  expect(result.error).toBeNull();
  if (result.error) return;

  expect(result.samples).toHaveLength(16);
  for (const sample of result.samples) {
    // A click is a discrete React event, so the complete header/body state must
    // be committed before the next paint rather than settling over many frames.
    expect(sample.visibleOnNextFrame).toBe(sample.expectedVisible);
    expect(sample.pressedOnNextFrame).toBe(true);
    expect(sample.headerIds).toEqual(sample.bodyIds);
    expect(sample.geometryDrift).toBeLessThanOrEqual(MAX_GEOMETRY_DRIFT_PX);
    expect(sample.replacedContentNodes).toBe(0);
    expect(sample.buttonWidthDrift).toBeLessThanOrEqual(MAX_LAYOUT_DRIFT_PX);
    expect(sample.groupHeightDrift).toBeLessThanOrEqual(MAX_LAYOUT_DRIFT_PX);
    expect(sample.gridTopDrift).toBeLessThanOrEqual(MAX_LAYOUT_DRIFT_PX);
    expect(sample.frameDelay).toBeLessThan(MAX_FRAME_DELAY_MS);
  }

  expect(Math.max(0, ...result.longTasks)).toBeLessThan(MAX_LONG_TASK_MS);
  await expect(failedLoginsHeader).toHaveCount(0);

  const filterLifecycle = await preview.evaluate(async (previewElement) => {
    const initialGridRoot = previewElement.querySelector<HTMLElement>(
      ".InovuaReactDataGrid.tdg-root"
    );
    const group = previewElement.querySelector<HTMLElement>(
      '[role="group"][aria-label="Visible column toggles"]'
    );
    const failedLoginsToggle = Array.from(
      group?.querySelectorAll<HTMLButtonElement>("button") ?? []
    ).find((element) => element.textContent?.trim() === "Failed logins");

    if (!initialGridRoot || !failedLoginsToggle) {
      return { error: "Grid root or visibility toggle was not found" } as const;
    }

    let rootWasDisconnected = false;
    const rootObserver = new MutationObserver(() => {
      if (!initialGridRoot.isConnected) rootWasDisconnected = true;
    });
    rootObserver.observe(previewElement, { childList: true, subtree: true });

    const nextFrame = () =>
      new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    const findButton = (label: string) =>
      Array.from(
        previewElement.querySelectorAll<HTMLButtonElement>("button")
      ).find((element) => element.textContent?.trim() === label);
    const currentGridRoot = () =>
      previewElement.querySelector<HTMLElement>(
        ".InovuaReactDataGrid.tdg-root"
      );
    const failedLoginsIsVisible = () =>
      Boolean(
        currentGridRoot()?.querySelector(
          '[data-slot="grid-header-cell"][data-column-id="failed_login_attempts"]'
        )
      );

    failedLoginsToggle.click();
    await nextFrame();
    const afterColumnShow = {
      sameRoot: currentGridRoot() === initialGridRoot,
      columnVisible: failedLoginsIsVisible(),
      pressed: failedLoginsToggle.getAttribute("aria-pressed"),
    };

    const hideFilters = findButton("Hide filters");
    hideFilters?.click();
    await nextFrame();
    const afterFilterHide = {
      sameRoot: currentGridRoot() === initialGridRoot,
      columnVisible: failedLoginsIsVisible(),
      filterCellCount:
        currentGridRoot()?.querySelectorAll(".tdg-filter-cell").length ?? -1,
    };

    const showFilters = findButton("Show filters");
    showFilters?.click();
    await nextFrame();
    const afterFilterShow = {
      sameRoot: currentGridRoot() === initialGridRoot,
      columnVisible: failedLoginsIsVisible(),
      filterCellCount:
        currentGridRoot()?.querySelectorAll(".tdg-filter-cell").length ?? -1,
    };

    rootObserver.disconnect();

    return {
      error: hideFilters && showFilters ? null : "Filter toggle was not found",
      afterColumnShow,
      afterFilterHide,
      afterFilterShow,
      rootWasDisconnected,
    };
  });

  expect(filterLifecycle.error).toBeNull();
  if (filterLifecycle.error) return;

  expect(filterLifecycle.afterColumnShow).toEqual({
    sameRoot: true,
    columnVisible: true,
    pressed: "true",
  });
  expect(filterLifecycle.afterFilterHide).toEqual({
    sameRoot: true,
    columnVisible: true,
    filterCellCount: 0,
  });
  expect(filterLifecycle.afterFilterShow.sameRoot).toBe(true);
  expect(filterLifecycle.afterFilterShow.columnVisible).toBe(true);
  expect(filterLifecycle.afterFilterShow.filterCellCount).toBeGreaterThan(0);
  expect(filterLifecycle.rootWasDisconnected).toBe(false);
  await expect(failedLoginsHeader).toBeVisible();
  await expect(failedLoginsButton).toHaveAttribute("aria-pressed", "true");

  expect(runtimeFailures).toEqual([]);
  expect(
    Math.max(
      initialIconCount,
      ...result.samples.map((sample) => sample.iconCount)
    )
  ).toBe(0);
});
