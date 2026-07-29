import { execFile as execFileCallback } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";

import { expect, test, type Locator, type Page } from "@playwright/test";

const issueFixturePath = "/compat/github-issues-33-48";
const execFile = promisify(execFileCallback);

type PackageExportValue =
  | string
  | Record<string, string | Record<string, string>>;

function collectExportTargets(value: PackageExportValue | undefined): string[] {
  if (typeof value === "string") return [value];
  if (!value) return [];

  return Object.values(value).flatMap((target) =>
    typeof target === "string"
      ? [target]
      : Object.values(target).filter(
          (nestedTarget): nestedTarget is string =>
            typeof nestedTarget === "string"
        )
  );
}

async function openIssue(page: Page, issue: number, query = "") {
  await page.goto(
    `${issueFixturePath}?issue=${issue}${query ? `&${query}` : ""}`
  );

  const scope = page.getByTestId("github-issues-33-48-scenario");
  await expect(scope).toHaveAttribute("data-issue", String(issue));
  await expect(
    scope.getByRole("heading", {
      name: `GitHub issue #${issue} compatibility`,
    })
  ).toBeVisible();
  return scope;
}

async function renderedRowHeight(row: Locator) {
  return Math.round((await row.boundingBox())?.height ?? Number.NaN);
}

// Known parity debt: the remaining fixme tests for #36 and #39–#46
// record unimplemented behavior. This PR does not fix that functionality.
test("GitHub issue #33: controlled sortInfo does not reorder a local array", async ({
  page,
}) => {
  const scope = await openIssue(page, 33);
  const grid = scope.locator(".tdg-root");

  await expect(
    grid.locator('[data-slot="grid-header-cell"][data-column-id="name"]')
  ).toHaveAttribute("aria-sort", "ascending");
  await expect(grid.locator('[data-slot="grid-row"]')).toHaveCount(2);
  await expect(grid.locator('[data-slot="grid-row"]').first()).toHaveAttribute(
    "data-row-id",
    "sort-z"
  );
});

test("GitHub issue #34: filterName and getFilterValue resolve the same local field", async ({
  page,
}) => {
  const scope = await openIssue(page, 34);
  const grid = scope.locator(".tdg-root");

  await expect(
    grid.locator('[data-slot="grid-row"][data-row-id="filter-a"]')
  ).toBeVisible();
  await expect(
    grid.locator('[data-slot="grid-row"][data-row-id="filter-g"]')
  ).toHaveCount(0);
});

test("GitHub issue #35: visibility defaults initialize hidden columns", async ({
  page,
}) => {
  const scope = await openIssue(page, 35);

  await expect(
    scope.locator('[data-slot="grid-header-cell"][data-column-id="secret"]')
  ).toHaveCount(0);
  await expect(
    scope.locator(
      '[data-slot="grid-header-cell"][data-column-id="legacySecret"]'
    )
  ).toHaveCount(0);
});

test("GitHub issue #36: grouped columns render their shared group header", async ({
  page,
}) => {
  const scope = await openIssue(page, 36);
  const grid = scope.locator(".tdg-root");

  await expect(
    grid.getByRole("columnheader", { name: "Identity", exact: true })
  ).toBeVisible();
});

test("GitHub issue #37: a row context menu invokes renderRowContextMenu with live payloads", async ({
  page,
}) => {
  const scope = await openIssue(page, 37);
  const surface = scope.locator('[data-slot="grid-surface"]');
  const firstRow = scope.locator('[data-slot="grid-row"]').first();
  const nameCell = firstRow.locator('[data-column-id="name"]');

  await expect(firstRow).toBeVisible();
  await surface.focus();
  await nameCell.click({ button: "right" });
  const rowMenu = scope.getByTestId("issue-37-row-menu");
  await expect(rowMenu).toBeVisible();
  await expect(rowMenu).toHaveAttribute("data-row-id", "row-1");
  await expect(rowMenu).toHaveAttribute("data-cell-column", "name");
  await expect(rowMenu).toHaveAttribute("data-position", "absolute");
  await expect(rowMenu).toHaveAttribute("data-has-constrain-to", "true");
  await expect(rowMenu).toHaveAttribute("data-callback-before-render", "true");
  await expect(rowMenu).toHaveAttribute("data-callback-saw-prevented", "false");
  await expect(rowMenu).toHaveAttribute("data-row-props-same", "true");
  await expect(rowMenu).toHaveAttribute("data-api-same", "true");
  await expect(rowMenu).toBeFocused();
  await expect(
    scope.getByRole("menu", { name: "Row context menu" })
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(rowMenu).toHaveCount(0);
  await expect(surface).toBeFocused();
});

test("GitHub issue #37: column and filter renderers support mouse and keyboard", async ({
  page,
}) => {
  const scope = await openIssue(page, 37);
  const nameHeader = scope.locator(
    '[data-slot="grid-header-cell"][data-column-id="name"]'
  );

  const menuButton = nameHeader.getByRole("button", { name: "Column menu" });
  await menuButton.click();
  const columnMenu = scope.getByTestId("issue-37-column-menu");
  await expect(columnMenu).toHaveAttribute("data-column-id", "name");
  await expect(columnMenu).toHaveAttribute("data-position", "absolute");
  await expect(columnMenu).toHaveAttribute("data-has-constrain-to", "true");
  await expect(columnMenu).toHaveAttribute("data-api-same", "true");
  await expect(columnMenu).toBeFocused();
  await expect(menuButton).toHaveAttribute("aria-expanded", "true");
  await scope.locator('[data-slot="grid-row"]').first().click();
  await expect(columnMenu).toHaveCount(0);
  await expect(menuButton).toBeFocused();

  await menuButton.press("Enter");
  await expect(columnMenu).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(menuButton).toBeFocused();

  const filterCell = scope.locator('.tdg-filter-cell[data-column-id="name"]');
  const filterInput = filterCell.getByRole("textbox");
  await filterInput.focus();
  await page.keyboard.press("Shift+F10");
  const filterMenu = scope.getByTestId("issue-37-filter-menu");
  await expect(filterMenu).toHaveAttribute("data-column-id", "name");
  await expect(filterMenu).toHaveAttribute(
    "data-selected-operator",
    "contains"
  );
  await expect(filterMenu.getByRole("menuitem")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(filterInput).toBeFocused();
});

test("GitHub issue #37: ContextMenu keyboard key opens the active row menu", async ({
  page,
}) => {
  const scope = await openIssue(page, 37);
  const surface = scope.locator('[data-slot="grid-surface"]');

  await surface.focus();
  await page.keyboard.press("ContextMenu");
  await expect(scope.getByTestId("issue-37-row-menu")).toHaveAttribute(
    "data-row-id",
    "row-1"
  );
});

test("GitHub issue #37: computed show and hide APIs control every menu class", async ({
  page,
}) => {
  const scope = await openIssue(page, 37);

  await page.evaluate(() => {
    const api = (
      window as typeof window & {
        __issue37GridApi?: {
          showColumnContextMenu?: (...args: unknown[]) => void;
        };
      }
    ).__issue37GridApi;
    api?.showColumnContextMenu?.(
      { left: 160, top: 160 },
      {
        rowIndex: -1,
        columnIndex: 1,
        computedVisibleIndex: 1,
        columnId: "name",
        name: "name",
      },
      { computedVisibleIndex: 1 }
    );
  });
  await expect(scope.getByTestId("issue-37-column-menu")).toBeVisible();
  await page.evaluate(() => {
    (
      window as typeof window & {
        __issue37GridApi?: { hideColumnContextMenu?: () => void };
      }
    ).__issue37GridApi?.hideColumnContextMenu?.();
  });
  await expect(scope.getByTestId("issue-37-column-menu")).toHaveCount(0);

  await page.evaluate(() => {
    const api = (
      window as typeof window & {
        __issue37GridApi?: {
          showColumnFilterContextMenu?: (...args: unknown[]) => void;
        };
      }
    ).__issue37GridApi;
    const alignTo = document.querySelector<HTMLElement>(
      '.tdg-filter-cell[data-column-id="name"] button[aria-label="Filter"]'
    );
    if (alignTo) {
      api?.showColumnFilterContextMenu?.(alignTo, {
        rowIndex: -1,
        columnIndex: 1,
        columnId: "name",
        name: "name",
      });
    }
  });
  await expect(scope.getByTestId("issue-37-filter-menu")).toBeVisible();
  await page.evaluate(() => {
    (
      window as typeof window & {
        __issue37GridApi?: { hideColumnFilterContextMenu?: () => void };
      }
    ).__issue37GridApi?.hideColumnFilterContextMenu?.();
  });
  await expect(scope.getByTestId("issue-37-filter-menu")).toHaveCount(0);

  await page.evaluate(() => {
    (
      window as typeof window & {
        __issue37GridApi?: {
          showRowContextMenu?: (...args: unknown[]) => void;
        };
      }
    ).__issue37GridApi?.showRowContextMenu?.(
      { left: 180, top: 180 },
      { data: { id: "api-row" }, id: "api-row", rowIndex: 0 }
    );
  });
  await expect(scope.getByTestId("issue-37-row-menu")).toHaveAttribute(
    "data-row-id",
    "api-row"
  );
  await page.evaluate(() => {
    (
      window as typeof window & {
        __issue37GridApi?: { hideRowContextMenu?: () => void };
      }
    ).__issue37GridApi?.hideRowContextMenu?.();
  });
  await expect(scope.getByTestId("issue-37-row-menu")).toHaveCount(0);
});

test("GitHub issue #37: row menus stay functional in the mobile transform", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const scope = await openIssue(page, 37);
  const grid = scope.locator(".tdg-root");
  const surface = scope.locator('[data-slot="grid-surface"]');
  const firstRow = scope.locator('[data-slot="grid-row"]').first();

  await expect(grid).toHaveAttribute("data-layout", "mobile-list");
  await surface.focus();
  await firstRow.click({ button: "right" });
  const rowMenu = scope.getByTestId("issue-37-row-menu");
  await expect(rowMenu).toHaveAttribute("data-row-id", "row-1");
  await expect(rowMenu).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(surface).toBeFocused();
});

test("GitHub issue #37: the default column menu owns sorting, filtering, and visibility", async ({
  page,
}) => {
  const scope = await openIssue(page, 37, "menuMode=default");
  const nameHeader = scope.locator(
    '[data-slot="grid-header-cell"][data-column-id="name"]'
  );

  await nameHeader.getByRole("button", { name: "Column menu" }).click();
  await expect(scope.getByRole("menuitem", { name: "Sort A→Z" })).toBeVisible();
  await expect(
    scope.getByRole("menuitem", { name: "Hide filtering" })
  ).toBeVisible();
  await scope.getByRole("menuitem", { name: "Hide filtering" }).click();
  await expect(scope.locator(".tdg-filter-row")).toHaveCount(0);

  await nameHeader.getByRole("button", { name: "Column menu" }).click();
  await expect(
    scope.getByRole("menuitem", { name: "Show filtering" })
  ).toBeVisible();
  await scope.getByRole("menuitem", { name: "Columns", exact: true }).click();
  const cityOption = scope.getByRole("menuitemcheckbox", { name: "City" });
  await expect(cityOption).toBeChecked();
  await cityOption.click();
  await expect(
    scope.locator('[data-slot="grid-header-cell"][data-column-id="city"]')
  ).toHaveCount(0);
});

test("GitHub issue #37: touch long-press opens column, filter, and row menus", async ({
  page,
}) => {
  const scope = await openIssue(page, 37);

  const longPress = async (target: Locator) => {
    const box = await target.boundingBox();
    expect(box).not.toBeNull();
    const x = box!.x + Math.min(12, box!.width / 2);
    const y = box!.y + Math.min(12, box!.height / 2);
    await target.dispatchEvent("pointerdown", {
      pointerType: "touch",
      pointerId: 7,
      isPrimary: true,
      clientX: x,
      clientY: y,
    });
    await page.waitForTimeout(550);
    await target.dispatchEvent("pointerup", {
      pointerType: "touch",
      pointerId: 7,
      isPrimary: true,
      clientX: x,
      clientY: y,
    });
    return { x, y };
  };

  const nameHeader = scope.locator(
    '[data-slot="grid-header-cell"][data-column-id="name"]'
  );
  const headerPoint = await longPress(nameHeader);
  await expect(scope.getByTestId("issue-37-column-menu")).toBeVisible();
  await nameHeader.dispatchEvent("click", {
    clientX: headerPoint.x,
    clientY: headerPoint.y,
  });
  await expect(scope.getByTestId("issue-37-column-menu")).toBeVisible();
  await expect(nameHeader).toHaveAttribute("aria-sort", "none");
  await page.keyboard.press("Escape");

  const filterCell = scope.locator('.tdg-filter-cell[data-column-id="name"]');
  await longPress(filterCell);
  await expect(scope.getByTestId("issue-37-filter-menu")).toBeVisible();
  await page.keyboard.press("Escape");

  const row = scope.locator('[data-slot="grid-row"]').first();
  await longPress(row);
  await expect(scope.getByTestId("issue-37-row-menu")).toBeVisible();
});

test("GitHub issue #37: repeated context-menu cycles stay within frame budgets @production-performance", async ({
  page,
}) => {
  const scope = await openIssue(page, 37);
  await expect(scope.locator('[data-slot="grid-row"]').first()).toBeVisible();

  const metrics = await page.evaluate(async () => {
    const row = document.querySelector<HTMLElement>(
      '[data-testid="github-issues-33-48-scenario"] [data-slot="grid-row"]'
    );
    if (!row) throw new Error("Issue #37 row was not mounted");

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

    const frameDurations: number[] = [];
    let previousFrame = performance.now();
    for (let index = 0; index < 20; index += 1) {
      const rect = row.getBoundingClientRect();
      row.dispatchEvent(
        new MouseEvent("contextmenu", {
          bubbles: true,
          cancelable: true,
          clientX: rect.left + 8,
          clientY: rect.top + 8,
        })
      );
      const openedFrame = await new Promise<number>((resolve) =>
        requestAnimationFrame(resolve)
      );
      frameDurations.push(openedFrame - previousFrame);
      previousFrame = openedFrame;
      document.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Escape",
          bubbles: true,
          cancelable: true,
        })
      );
      const closedFrame = await new Promise<number>((resolve) =>
        requestAnimationFrame(resolve)
      );
      frameDurations.push(closedFrame - previousFrame);
      previousFrame = closedFrame;
    }
    observer?.disconnect();
    frameDurations.sort((first, second) => first - second);

    return {
      p95Frame: frameDurations[Math.floor(frameDurations.length * 0.95)] ?? 0,
      maxLongTask: Math.max(0, ...longTasks),
      mountedMenus: document.querySelectorAll(
        '[data-testid="tdg-row-context-menu"]'
      ).length,
      mountedRows: document.querySelectorAll('[data-slot="grid-row"]').length,
    };
  });

  expect(metrics.p95Frame).toBeLessThan(34);
  expect(metrics.maxLongTask).toBeLessThan(50);
  expect(metrics.mountedMenus).toBe(0);
  expect(metrics.mountedRows).toBe(3);
});

test("GitHub issue #38: ArrowDown advances defaultActiveIndex and emits the callback", async ({
  page,
}) => {
  const scope = await openIssue(page, 38);
  const surface = scope.locator('[data-slot="grid-surface"]');

  await surface.focus();
  await expect(surface).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(scope.getByTestId("issue-38-active-index")).toHaveText("1");
});

test("GitHub issue #38: controlled activeIndex and throttled navigation remain authoritative", async ({
  page,
}) => {
  const scope = await openIssue(page, 38, "activeMode=controlled");
  const root = scope.locator(".tdg-root");
  const surface = scope.locator('[data-slot="grid-surface"]');
  const activeIndex = scope.getByTestId("issue-38-active-index");

  await surface.focus();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await expect(activeIndex).toHaveText("3");
  await expect(root).toHaveAttribute("data-active-index", "3");

  await scope.locator('[data-slot="grid-row"][data-row-index="6"]').click();
  await expect(activeIndex).toHaveText("6");
  await expect(root).toHaveAttribute("data-active-index", "6");

  await scope.getByTestId("issue-38-outside-focus").focus();
  await expect(activeIndex).toHaveText("-1");
  await surface.focus();
  await expect(activeIndex).toHaveText("6");
  await expect(root).toHaveAttribute("data-active-index", "6");
});

test("GitHub issue #38: keyboard navigation, focus restoration, and virtual scrolling stay synchronized", async ({
  page,
}) => {
  const scope = await openIssue(page, 38);
  const root = scope.locator(".tdg-root");
  const surface = scope.locator('[data-slot="grid-surface"]');
  const activeIndex = scope.getByTestId("issue-38-active-index");
  const rowAt = (index: number) =>
    scope.locator(`[data-slot="grid-row"][data-row-index="${index}"]`);

  await surface.focus();
  await expect(surface).toBeFocused();
  await expect(root).toHaveAttribute("data-focused", "true");
  await expect(root).toHaveClass(/issue-38-grid-focused/);
  await expect(root).toHaveAttribute("data-active-index", "0");
  await expect(rowAt(0)).toHaveAttribute("data-active", "true");
  await expect(rowAt(0)).toHaveAttribute("aria-current", "true");
  await expect(rowAt(0)).toHaveClass(/issue-38-row-focused/);
  await expect(rowAt(0)).toHaveClass(/issue-38-active-indicator/);
  await expect(rowAt(0)).not.toHaveClass(/tdg-row--selected/);

  await page.keyboard.press("End");
  await expect(activeIndex).toHaveText("39");
  await expect(rowAt(39)).toBeVisible();
  await expect(rowAt(39)).toHaveAttribute("data-active", "true");

  await page.keyboard.press("Home");
  await expect(activeIndex).toHaveText("0");
  await expect(rowAt(0)).toBeVisible();

  await page.keyboard.press("PageDown");
  await expect(activeIndex).toHaveText("5");
  await page.keyboard.press("PageUp");
  await expect(activeIndex).toHaveText("0");
  await page.keyboard.press("Tab");
  await expect(activeIndex).toHaveText("1");
  await page.keyboard.press("Shift+Tab");
  await expect(activeIndex).toHaveText("0");

  await scope.getByTestId("issue-38-outside-focus").focus();
  await expect(root).toHaveAttribute("data-focused", "false");
  await expect(root).toHaveAttribute("data-active-index", "none");
  await expect(activeIndex).toHaveText("-1");
  await expect(
    root.locator('[data-slot="grid-row"][data-active="true"]')
  ).toHaveCount(0);

  await surface.focus();
  await expect(root).toHaveAttribute("data-active-index", "0");
  await expect(activeIndex).toHaveText("0");
});

test("GitHub issue #38: pointer and keyboard selection match Inovua multi-select semantics", async ({
  page,
}) => {
  const scope = await openIssue(page, 38);
  const selection = scope.getByTestId("issue-38-selection");
  const rowAt = (index: number) =>
    scope.locator(`[data-slot="grid-row"][data-row-index="${index}"]`);

  await rowAt(1).click();
  await expect(selection).toHaveText(
    '{"selected":["active-1"],"unselected":[]}'
  );
  await expect(rowAt(1)).toHaveAttribute("aria-selected", "true");

  await rowAt(4).click({ modifiers: ["Shift"] });
  await expect(selection).toHaveText(
    '{"selected":["active-1","active-2","active-3","active-4"],"unselected":[]}'
  );

  await rowAt(7).click({ modifiers: ["Meta"] });
  await expect(selection).toHaveText(
    '{"selected":["active-1","active-2","active-3","active-4","active-7"],"unselected":[]}'
  );

  await rowAt(7).click();
  await expect(selection).toHaveText(
    '{"selected":["active-7"],"unselected":[]}'
  );
  await rowAt(7).click({ modifiers: ["Meta"] });
  await expect(selection).toHaveText('{"selected":[],"unselected":[]}');

  const surface = scope.locator('[data-slot="grid-surface"]');
  await surface.focus();
  await page.keyboard.press("Home");
  await page.keyboard.press("Enter");
  await expect(selection).toHaveText(
    '{"selected":["active-0"],"unselected":[]}'
  );
  await page.keyboard.press("Meta+Enter");
  await expect(selection).toHaveText('{"selected":[],"unselected":[]}');

  await scope.getByTestId("issue-38-select-all-mode").click();
  await expect(selection).toHaveText('{"selected":true,"unselected":[]}');
  const firstRowCheckbox = rowAt(0).getByRole("checkbox");
  await firstRowCheckbox.click();
  await expect(selection).toHaveText(
    '{"selected":true,"unselected":["active-0"]}'
  );
  await firstRowCheckbox.click();
  await expect(selection).toHaveText('{"selected":true,"unselected":[]}');
});

test.fixme("GitHub issue #39: clicking a cell emits the active tuple and stable id selection key", async ({
  page,
}) => {
  const scope = await openIssue(page, 39);
  const nameCell = scope
    .locator(
      '[data-slot="grid-row"][data-row-id="row-1"] .InovuaReactDataGrid__cell[data-column-id="name"]'
    )
    .first();

  await nameCell.click();
  await expect(scope.getByTestId("issue-39-active-cell")).toHaveText("[0,1]");
  await expect(scope.getByTestId("issue-39-cell-selection")).toHaveText(
    '{"row-1,name":true}'
  );
});

test.fixme("GitHub issue #40: cellDOMProps are inherited by rendered cells", async ({
  page,
}) => {
  const scope = await openIssue(page, 40);
  const nameCell = scope
    .locator(
      '[data-slot="grid-row"][data-row-id="row-1"] .InovuaReactDataGrid__cell[data-column-id="name"]'
    )
    .first();

  await expect(nameCell).toHaveAttribute(
    "data-issue-40-cell",
    '["row-1","name",0,1]'
  );
});

test.fixme("GitHub issue #41: async getEditStartValue seeds the inline editor", async ({
  page,
}) => {
  const scope = await openIssue(page, 41);
  const nameCell = scope
    .locator(
      '[data-slot="grid-row"][data-row-id="row-1"] .InovuaReactDataGrid__cell[data-column-id="name"]'
    )
    .first();

  await nameCell.dblclick();
  await expect(nameCell.locator('[data-slot="cell-editor"]')).toHaveValue(
    "seeded-by-getEditStartValue"
  );
});

test.fixme("GitHub issue #42: rowHeights applies a stable per-row override map", async ({
  page,
}) => {
  const scope = await openIssue(page, 42);
  const firstRow = scope.locator('[data-slot="grid-row"][data-row-id="row-1"]');
  const secondRow = scope.locator(
    '[data-slot="grid-row"][data-row-id="row-2"]'
  );
  const thirdRow = scope.locator('[data-slot="grid-row"][data-row-id="row-3"]');

  await expect(firstRow).toBeVisible();
  await expect(secondRow).toBeVisible();
  await expect.poll(() => renderedRowHeight(firstRow)).toBe(40);
  await expect.poll(() => renderedRowHeight(secondRow)).toBe(88);

  const updateHeight = scope.getByTestId("issue-42-set-row-height");
  await expect(updateHeight).toBeEnabled();
  await updateHeight.click();
  await expect.poll(() => renderedRowHeight(thirdRow)).toBe(96);
  await expect(scope.getByTestId("issue-42-height-events")).toContainText(
    '"row-3":96'
  );
});

test.fixme("GitHub issue #43: initialScrollTop and initialScrollLeft initialize the viewport", async ({
  page,
}) => {
  const scope = await openIssue(page, 43);
  const viewport = scope.locator(".tdg-body-viewport");

  await expect(viewport).toBeVisible();
  await expect
    .poll(() =>
      viewport.evaluate((element) => ({
        top: element.scrollTop,
        left: element.scrollLeft,
      }))
    )
    .toEqual({ top: 120, left: 90 });
});

test.fixme("GitHub issue #44: a browser consumer loads documented module and stylesheet exports", async ({
  page,
}) => {
  const scope = await openIssue(page, 44);
  const output = scope.getByTestId("issue-44-package-results");
  const expectedEntries = [
    ".",
    "./BoolEditor",
    "./DateEditor",
    "./NumericEditor",
    "./StringFilter",
    "./BoolFilter",
    "./index.css",
    "./base.css",
    "./style/theme/default-light/index.css",
    "./style/theme/default-dark/index.css",
  ];

  await expect(output).not.toHaveText("pending");
  const results = JSON.parse((await output.textContent()) || "null") as Record<
    string,
    string
  >;
  const manifest = JSON.parse(await readFile("package.json", "utf8")) as {
    exports?: Record<string, PackageExportValue>;
  };
  const { stdout } = await execFile(
    process.platform === "win32" ? "npm.cmd" : "npm",
    ["pack", "--dry-run", "--json"],
    { cwd: process.cwd(), maxBuffer: 10 * 1024 * 1024 }
  );
  const pack = JSON.parse(stdout) as Array<{
    files?: Array<{ path: string }>;
  }>;
  const packedFiles = new Set(
    (pack[0]?.files ?? []).map((file) => file.path.replace(/^package\//, ""))
  );
  const missingPackedTargets = expectedEntries.flatMap((entry) =>
    collectExportTargets(manifest.exports?.[entry])
      .map((target) => target.replace(/^\.\//, ""))
      .filter((target) => !packedFiles.has(target))
      .map((target) => `${entry} -> ${target}`)
  );

  expect.soft(results).toEqual({
    ".": "loaded",
    "./BoolEditor": "loaded",
    "./DateEditor": "loaded",
    "./NumericEditor": "loaded",
    "./StringFilter": "loaded",
    "./BoolFilter": "loaded",
    "./index.css": "loaded",
    "./base.css": "loaded",
    "./style/theme/default-light/index.css": "loaded",
    "./style/theme/default-dark/index.css": "loaded",
  });
  expect.soft(missingPackedTargets).toEqual([]);
  expect.soft(packedFiles.has("LICENSE")).toBe(true);
});

test.fixme("GitHub issue #45: unknown computed API methods do not silently succeed", async ({
  page,
}) => {
  const scope = await openIssue(page, 45);
  const invoke = scope.getByTestId("issue-45-call-unknown");

  await expect(scope.getByTestId("issue-45-public-plugins")).toHaveText(
    '["sortable-columns","filters","menus","cell-selection"]'
  );
  await expect(invoke).toBeEnabled();
  await invoke.click();
  await expect(scope.getByTestId("issue-45-unknown-result")).toHaveText(
    "undefined:not-callable"
  );
});

test.fixme("GitHub issue #46: every Community child issue has executable release-gate evidence", async ({
  page,
}) => {
  const softExpect = expect.configure({ soft: true });
  const actual: Record<number, unknown> = {};

  await page.goto("/compat/inovua-pending-parity?scenario=empty-literal");
  const issue17Scope = page.getByTestId("inovua-pending-parity-scenario");
  await expect(issue17Scope.locator(".tdg-root")).toBeVisible();
  actual[17] = await issue17Scope
    .getByText("Literal empty state", { exact: true })
    .count();

  await page.goto("/compat/github-issues-31-32");
  const issue31Probe = page.getByTestId("github-issue-31-probe");
  await expect(issue31Probe.locator(".tdg-root").first()).toBeVisible();
  const issue31Defaults = JSON.parse(
    (await issue31Probe.getByTestId("issue-31-default-props").textContent()) ||
      "null"
  ) as Record<string, unknown>;
  actual[31] = {
    idProperty: issue31Defaults.idProperty,
    theme: issue31Defaults.theme,
    rowHeight: issue31Defaults.rowHeight,
    filterRowHeight: issue31Defaults.filterRowHeight,
  };
  actual[32] = await page
    .getByTestId("github-issue-32-probe")
    .getByTestId("issue-32-custom-pagination-toolbar")
    .count();

  let scope = await openIssue(page, 33);
  actual[33] = await scope
    .locator('[data-slot="grid-row"]')
    .first()
    .getAttribute("data-row-id");

  scope = await openIssue(page, 34);
  actual[34] = await scope
    .locator('[data-slot="grid-row"]')
    .evaluateAll((rows) => rows.map((row) => row.getAttribute("data-row-id")));

  scope = await openIssue(page, 35);
  actual[35] = await scope
    .locator('[data-slot="grid-header-cell"][data-column-id="secret"]')
    .count();

  scope = await openIssue(page, 36);
  actual[36] = await scope
    .getByRole("columnheader", { name: "Identity", exact: true })
    .count();

  scope = await openIssue(page, 37);
  await scope
    .locator('[data-slot="grid-row"]')
    .first()
    .click({ button: "right" });
  actual[37] = await scope.getByTestId("issue-37-row-menu").count();

  scope = await openIssue(page, 38);
  await scope.locator('[data-slot="grid-surface"]').focus();
  await page.keyboard.press("ArrowDown");
  actual[38] = await scope.getByTestId("issue-38-active-index").textContent();

  scope = await openIssue(page, 39);
  await scope
    .locator(
      '[data-slot="grid-row"][data-row-id="row-1"] [data-column-id="name"]'
    )
    .click();
  actual[39] = {
    activeCell: await scope.getByTestId("issue-39-active-cell").textContent(),
    cellSelection: await scope
      .getByTestId("issue-39-cell-selection")
      .textContent(),
  };

  scope = await openIssue(page, 40);
  actual[40] = await scope
    .locator(
      '[data-slot="grid-row"][data-row-id="row-1"] [data-column-id="name"]'
    )
    .getAttribute("data-issue-40-cell");

  scope = await openIssue(page, 41);
  const issue41Cell = scope.locator(
    '[data-slot="grid-row"][data-row-id="row-1"] [data-column-id="name"]'
  );
  await issue41Cell.dblclick();
  const issue41Editor = issue41Cell.locator('[data-slot="cell-editor"]');
  actual[41] = (await issue41Editor.count())
    ? await issue41Editor.inputValue()
    : "missing-editor";

  scope = await openIssue(page, 42);
  actual[42] = await renderedRowHeight(
    scope.locator('[data-slot="grid-row"][data-row-id="row-2"]')
  );

  scope = await openIssue(page, 43);
  actual[43] = await scope
    .locator(".tdg-body-viewport")
    .evaluate((element) => ({
      top: element.scrollTop,
      left: element.scrollLeft,
    }));

  scope = await openIssue(page, 44);
  const issue44Output = scope.getByTestId("issue-44-package-results");
  await expect(issue44Output).not.toHaveText("pending");
  actual[44] = JSON.parse((await issue44Output.textContent()) || "null");

  scope = await openIssue(page, 45);
  const issue45Invoke = scope.getByTestId("issue-45-call-unknown");
  await expect(issue45Invoke).toBeEnabled();
  await issue45Invoke.click();
  actual[45] = {
    plugins: await scope.getByTestId("issue-45-public-plugins").textContent(),
    unknownMethod: await scope
      .getByTestId("issue-45-unknown-result")
      .textContent(),
  };

  const expected: Record<number, unknown> = {
    17: 1,
    31: {
      idProperty: "id",
      theme: "default-light",
      rowHeight: 40,
      filterRowHeight: 40,
    },
    32: 1,
    33: "sort-z",
    34: ["filter-a"],
    35: 0,
    36: 1,
    37: 1,
    38: "1",
    39: {
      activeCell: "[0,1]",
      cellSelection: '{"row-1,name":true}',
    },
    40: '["row-1","name",0,1]',
    41: "seeded-by-getEditStartValue",
    42: 88,
    43: { top: 120, left: 90 },
    44: {
      ".": "loaded",
      "./BoolEditor": "loaded",
      "./DateEditor": "loaded",
      "./NumericEditor": "loaded",
      "./StringFilter": "loaded",
      "./BoolFilter": "loaded",
      "./index.css": "loaded",
      "./base.css": "loaded",
      "./style/theme/default-light/index.css": "loaded",
      "./style/theme/default-dark/index.css": "loaded",
    },
    45: {
      plugins: '["sortable-columns","filters","menus","cell-selection"]',
      unknownMethod: "undefined:not-callable",
    },
  };

  for (const issue of [
    17,
    ...Array.from({ length: 15 }, (_, index) => 31 + index),
  ]) {
    softExpect(actual[issue], `Community issue #${issue}`).toEqual(
      expected[issue]
    );
  }
});

test("GitHub issue #48: TextInput, onDidMount, and adjustHeights are all available", async ({
  page,
}) => {
  await page.goto("/compat/issue-48?scenario=text-input");
  let scope = page.getByTestId("issue-48-scenario");
  await expect(scope).toHaveAttribute("data-scenario", "text-input");
  await expect(scope.getByTestId("text-input-availability")).toHaveAttribute(
    "data-available",
    "true"
  );

  await page.goto("/compat/issue-48?scenario=did-mount");
  scope = page.getByTestId("issue-48-scenario");
  await expect(scope).toHaveAttribute("data-scenario", "did-mount");
  await expect(scope.getByTestId("did-mount-events")).toContainText(
    '"type":"didMount"'
  );

  await page.goto("/compat/issue-48?scenario=adjust-fixed");
  scope = page.getByTestId("issue-48-scenario");
  await expect(scope).toHaveAttribute("data-scenario", "adjust-fixed");
  await scope.getByTestId("run-adjust-heights").click();
  const report = JSON.parse(
    (await scope.getByTestId("adjust-heights-report").textContent()) || "null"
  ) as {
    methodExists: boolean;
    returnedUndefined: boolean;
    error: string | null;
  };

  expect(report).toMatchObject({
    methodExists: true,
    returnedUndefined: true,
    error: null,
  });
});
