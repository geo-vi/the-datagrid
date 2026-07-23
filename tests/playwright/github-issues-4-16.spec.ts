import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

const PACKAGE_CSS = readFileSync(
  resolve(process.cwd(), "dist/index.css"),
  "utf8"
);

test("GitHub issue #4: the first feedback iteration works as one integrated grid flow", async ({
  page,
}) => {
  await page.goto("/actions");

  const preview = page.getByTestId("example-preview-panel");
  const grid = preview.locator(".InovuaReactDataGrid.tdg-root").first();
  await expect(grid).toBeVisible();

  const containment = await grid.evaluate((element) => {
    const parent = element.parentElement;
    if (!parent) return null;

    const parentRect = parent.getBoundingClientRect();
    const gridRect = element.getBoundingClientRect();
    return {
      left: gridRect.left >= parentRect.left - 1,
      right: gridRect.right <= parentRect.right + 1,
    };
  });
  expect(containment).toEqual({ left: true, right: true });

  // The leading checkbox column has an empty filter cell, so Sample is the
  // first interactive filter cell in this grid.
  const sampleFilterCell = grid.locator(".tdg-filter-cell").nth(1);
  const sampleFilter = sampleFilterCell.getByRole("textbox");
  await sampleFilter.fill("Northwind");
  await expect(preview.getByTestId("actions-filtered-card")).toHaveText(
    /Filtered rows\s*1/
  );
  await sampleFilterCell.getByRole("button", { name: "Clear" }).click();
  await expect(preview.getByTestId("actions-filtered-card")).toHaveText(
    /Filtered rows\s*5/
  );

  await grid
    .locator('tbody [data-slot="grid-row"] [role="checkbox"]')
    .first()
    .click();
  await expect(preview.getByTestId("actions-selected-card")).toHaveText(
    /Selected rows\s*1/
  );

  await preview.getByRole("heading", { name: "Actions example" }).click();
  await preview
    .getByRole("button", { name: "Advance Northwind Health" })
    .click();
  await expect(preview.getByTestId("actions-stage-wf-201")).toHaveText(
    "Reviewing"
  );
  await expect(
    preview
      .getByTestId("actions-log")
      .getByText("Advanced Northwind Health to Reviewing.", { exact: true })
  ).toHaveCount(1);
});

test("GitHub issue #5: the root remains contained by a fixed-width parent", async ({
  page,
}) => {
  await page.goto("/basic");

  const preview = page.getByTestId("example-preview-panel");
  const shell = preview.locator("section").first();
  const grid = shell.locator(".InovuaReactDataGrid.tdg-root").first();
  await expect(grid).toBeVisible();

  await shell.evaluate((element) => {
    element.style.width = "420px";
    element.style.minWidth = "420px";
    element.style.maxWidth = "420px";
  });

  const layout = await shell.evaluate((element) => {
    const grid = element.querySelector<HTMLElement>(
      ".InovuaReactDataGrid.tdg-root"
    );
    const bodyViewport = element.querySelector<HTMLElement>(
      '[data-slot="scroll-area-viewport"]'
    );
    const headerViewport = element.querySelector<HTMLElement>(
      '[data-slot="grid-header-viewport"]'
    );
    if (!grid || !bodyViewport || !headerViewport) return null;

    const shellRect = element.getBoundingClientRect();
    const gridRect = grid.getBoundingClientRect();
    const bodyRect = bodyViewport.getBoundingClientRect();
    const headerRect = headerViewport.getBoundingClientRect();

    return {
      rootWithinParent:
        gridRect.left >= shellRect.left - 1 &&
        gridRect.right <= shellRect.right + 1,
      bodyWithinParent:
        bodyRect.left >= shellRect.left - 1 &&
        bodyRect.right <= shellRect.right + 1,
      headerWithinParent:
        headerRect.left >= shellRect.left - 1 &&
        headerRect.right <= shellRect.right + 1,
      parentHasPageLevelOverflow: element.scrollWidth > element.clientWidth + 1,
      computedMaxWidth: getComputedStyle(grid).maxWidth,
    };
  });

  expect(layout).not.toBeNull();
  expect(layout?.rootWithinParent).toBe(true);
  expect(layout?.bodyWithinParent).toBe(true);
  expect(layout?.headerWithinParent).toBe(true);
  expect(layout?.parentHasPageLevelOverflow).toBe(false);
  expect(layout?.computedMaxWidth).toBe("100%");
});

test("GitHub issue #6: the selection header checkbox is centered with row checkboxes", async ({
  page,
}) => {
  await page.goto("/selection");

  const grid = page
    .getByTestId("example-preview-panel")
    .locator(".InovuaReactDataGrid.tdg-root")
    .first();
  const headerCell = grid.locator("thead .tdg-header-cell").first();
  const rowCell = grid
    .locator('tbody [data-slot="grid-row"] .InovuaReactDataGrid__cell')
    .first();
  await expect(headerCell).toBeVisible();
  await expect(rowCell).toBeVisible();

  const alignment = await grid.evaluate((element) => {
    function centerDelta(cell: Element | null) {
      const checkbox = cell?.querySelector<HTMLElement>('[role="checkbox"]');
      if (!(cell instanceof HTMLElement) || !checkbox) return null;

      const cellRect = cell.getBoundingClientRect();
      const checkboxRect = checkbox.getBoundingClientRect();
      return {
        cellCenter: cellRect.left + cellRect.width / 2,
        checkboxCenter: checkboxRect.left + checkboxRect.width / 2,
      };
    }

    const header = centerDelta(element.querySelector("thead .tdg-header-cell"));
    const row = centerDelta(
      element.querySelector(
        'tbody [data-slot="grid-row"] .InovuaReactDataGrid__cell'
      )
    );
    if (!header || !row) return null;

    return {
      headerOffset: header.checkboxCenter - header.cellCenter,
      rowOffset: row.checkboxCenter - row.cellCenter,
      checkboxDelta: header.checkboxCenter - row.checkboxCenter,
    };
  });

  expect(alignment).not.toBeNull();
  expect(Math.abs(alignment?.headerOffset ?? 99)).toBeLessThan(2);
  expect(Math.abs(alignment?.rowOffset ?? 99)).toBeLessThan(2);
  expect(Math.abs(alignment?.checkboxDelta ?? 99)).toBeLessThan(2);
});

test("GitHub issue #7: narrow header and body cells clip long content at their boundaries", async ({
  page,
}) => {
  await page.goto("/users");

  const preview = page.getByTestId("example-preview-panel");
  await preview
    .locator('[data-slot="rdg-column-toggle-list"]')
    .getByRole("button", { name: "Password changed", exact: true })
    .click();

  const grid = preview.locator(".InovuaReactDataGrid.tdg-root").first();
  const header = grid.locator(
    '[data-slot="grid-header-cell"][data-column-id="date_pwdchanged"]'
  );
  const resizer = header.getByRole("button", {
    name: "Resize Password changed",
  });
  await expect(resizer).toBeVisible();

  for (let index = 0; index < 6; index += 1) {
    await resizer.press("Shift+ArrowLeft");
  }

  const cell = grid
    .locator(
      '[data-slot="grid-row"] .InovuaReactDataGrid__cell[data-column-id="date_pwdchanged"]'
    )
    .first();
  await expect(cell).toBeVisible();

  const clipping = await grid.evaluate((element) => {
    const header = element.querySelector<HTMLElement>(
      '[data-slot="grid-header-cell"][data-column-id="date_pwdchanged"]'
    );
    const headerLabel = header?.querySelector<HTMLElement>(
      ".InovuaReactDataGrid__column-header__sort-button > span"
    );
    const cell = element.querySelector<HTMLElement>(
      '[data-slot="grid-row"] .InovuaReactDataGrid__cell[data-column-id="date_pwdchanged"]'
    );
    const content = cell?.querySelector<HTMLElement>(".tdg-cell-content");
    if (!header || !headerLabel || !cell || !content) return null;

    const headerRect = header.getBoundingClientRect();
    const labelRect = headerLabel.getBoundingClientRect();
    const cellRect = cell.getBoundingClientRect();
    const contentRect = content.getBoundingClientRect();
    const headerStyle = getComputedStyle(headerLabel);
    const contentStyle = getComputedStyle(content);

    return {
      headerWidth: headerRect.width,
      headerActuallyOverflows:
        headerLabel.scrollWidth > headerLabel.clientWidth,
      headerOverflow: headerStyle.overflow,
      headerTextOverflow: headerStyle.textOverflow,
      headerWithinCell:
        labelRect.left >= headerRect.left - 1 &&
        labelRect.right <= headerRect.right + 1,
      bodyActuallyOverflows: content.scrollWidth > content.clientWidth,
      bodyOverflow: contentStyle.overflow,
      bodyWithinCell:
        contentRect.left >= cellRect.left - 1 &&
        contentRect.right <= cellRect.right + 1,
    };
  });

  expect(clipping).not.toBeNull();
  expect(clipping?.headerWidth).toBeLessThanOrEqual(52);
  expect(clipping?.headerActuallyOverflows).toBe(true);
  expect(clipping?.headerOverflow).toBe("hidden");
  expect(clipping?.headerTextOverflow).toBe("ellipsis");
  expect(clipping?.headerWithinCell).toBe(true);
  expect(clipping?.bodyActuallyOverflows).toBe(true);
  expect(clipping?.bodyOverflow).toBe("hidden");
  expect(clipping?.bodyWithinCell).toBe(true);
});

test("GitHub issue #8: controlled row selection round-trips through the direct setter", async ({
  page,
}) => {
  await page.goto("/selection");

  const preview = page.getByTestId("example-preview-panel");
  const grid = preview.locator(".InovuaReactDataGrid.tdg-root").first();
  const rowCheckboxes = grid.locator(
    'tbody [data-slot="grid-row"] [role="checkbox"]'
  );
  const headerCheckbox = grid.locator("thead [role='checkbox']").first();

  await rowCheckboxes.first().click();
  await expect(preview.getByTestId("selection-count-card")).toHaveText(
    /Selected accounts\s*1/
  );
  await expect(preview.getByTestId("selection-chip-list")).toContainText(
    "Northwind Health"
  );

  await headerCheckbox.click();
  await expect(preview.getByTestId("selection-count-card")).toHaveText(
    /Selected accounts\s*8/
  );

  await page.getByRole("button", { name: "Clear selection" }).click();
  await expect(preview.getByTestId("selection-count-card")).toHaveText(
    /Selected accounts\s*0/
  );
});

test("GitHub issue #9: an active filter can be cleared inline without opening its menu", async ({
  page,
}) => {
  await page.goto("/examples/basic");

  const cell = page.locator(".tdg-filter-cell").first();
  const input = cell.getByRole("textbox");
  await expect(cell.getByRole("button", { name: "Clear" })).toHaveCount(0);

  await input.fill("Row 1");
  await expect(input).toHaveValue("Row 1");
  await expect(cell.getByRole("button", { name: "Clear" })).toBeVisible();
  await expect(page.locator('[role="menu"]')).toHaveCount(0);

  await cell.getByRole("button", { name: "Clear" }).click();
  await expect(input).toHaveValue("");
  await expect(cell.getByRole("button", { name: "Clear" })).toHaveCount(0);
  await expect(page.getByTestId("basic-filtered-count")).toHaveText("1000");
});

test("GitHub issue #10: a cell action fires on the first click while the grid is unfocused", async ({
  page,
}) => {
  await page.goto("/actions");

  const preview = page.getByTestId("example-preview-panel");
  await preview.getByRole("heading", { name: "Actions example" }).click();
  await preview
    .getByRole("button", { name: "Advance Northwind Health" })
    .click();

  await expect(preview.getByTestId("actions-stage-wf-201")).toHaveText(
    "Reviewing"
  );
  await expect(
    preview
      .getByTestId("actions-log")
      .getByText("Advanced Northwind Health to Reviewing.", { exact: true })
  ).toHaveCount(1);
});

test("GitHub issue #11: Inovua-style single-argument render callbacks receive value and row data", async ({
  page,
}) => {
  await page.goto("/actions");

  const preview = page.getByTestId("example-preview-panel");
  const grid = preview.locator(".InovuaReactDataGrid.tdg-root").first();
  const firstRow = grid.locator('[data-slot="grid-row"]').first();

  // The stage renderer uses both `{ data, value }`; its test id is derived from
  // `data.id`, while its label is derived from `value`.
  await expect(preview.getByTestId("actions-stage-wf-201")).toHaveText(
    "Queued"
  );
  // The opened date renderer uses the exact `render({ value })` shape reported
  // by the issue.
  await expect(firstRow.locator('[data-column-id="openedAt"]')).toContainText(
    "Mar 4"
  );
  await expect(
    firstRow.getByRole("button", { name: "Advance Northwind Health" })
  ).toBeVisible();
});

test("GitHub issue #12: partial selection uses an indeterminate icon without a stale check", async ({
  page,
}) => {
  await page.goto("/selection");
  await page.getByRole("button", { name: "Ikarus Dark" }).click();

  const grid = page
    .getByTestId("example-preview-panel")
    .locator(".InovuaReactDataGrid.tdg-root")
    .first();
  const headerCheckbox = grid.locator("thead [role='checkbox']").first();
  const rowCheckboxes = grid.locator(
    'tbody [data-slot="grid-row"] [role="checkbox"]'
  );

  await headerCheckbox.click();
  await expect(headerCheckbox).toHaveAttribute("data-state", "checked");
  await expect(
    headerCheckbox.locator(".tdg-checkbox__check-icon")
  ).toBeVisible();

  await rowCheckboxes.first().click();
  await expect(headerCheckbox).toHaveAttribute("data-state", "indeterminate");
  await expect(
    headerCheckbox.locator(".tdg-checkbox__indeterminate-icon")
  ).toBeVisible();
  await expect(headerCheckbox.locator(".tdg-checkbox__check-icon")).toHaveCount(
    0
  );
});

test("GitHub issue #13: the horizontal scrollbar wins hit testing and can be dragged", async ({
  page,
}) => {
  await page.goto("/users");

  const preview = page.getByTestId("example-preview-panel");
  const shell = preview.locator("section").first();
  await shell.evaluate((element) => {
    element.style.width = "760px";
    element.style.minWidth = "760px";
    element.style.maxWidth = "760px";
  });

  for (const columnName of [
    "Failed logins",
    "Last login",
    "Password changed",
    "Language",
  ]) {
    await preview
      .locator('[data-slot="rdg-column-toggle-list"]')
      .getByRole("button", { name: columnName, exact: true })
      .click();
  }

  const grid = preview.locator(".InovuaReactDataGrid.tdg-root").first();
  const scrollArea = grid.locator('[data-slot="scroll-area"]').first();
  const viewport = grid.locator('[data-slot="scroll-area-viewport"]').first();
  const scrollbar = grid
    .locator(
      '[data-slot="scroll-area-scrollbar"][data-orientation="horizontal"]'
    )
    .first();
  const thumb = scrollbar.locator('[data-slot="scroll-area-thumb"]').first();

  await expect
    .poll(() =>
      viewport.evaluate((element) => element.scrollWidth > element.clientWidth)
    )
    .toBe(true);

  const scrollAreaBox = await scrollArea.boundingBox();
  expect(scrollAreaBox).not.toBeNull();
  await scrollArea.hover({
    position: {
      x: 24,
      y: Math.max(4, (scrollAreaBox?.height ?? 12) - 4),
    },
  });
  await expect(scrollbar).toBeVisible();
  await expect(thumb).toBeVisible();

  const hitTarget = await scrollbar.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const target = document.elementFromPoint(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2
    ) as HTMLElement | null;
    return {
      slot: target?.dataset.slot ?? null,
      insideCell: Boolean(target?.closest(".InovuaReactDataGrid__cell")),
    };
  });
  expect(hitTarget.insideCell).toBe(false);
  expect(["scroll-area-scrollbar", "scroll-area-thumb"]).toContain(
    hitTarget.slot
  );

  const thumbBox = await thumb.boundingBox();
  expect(thumbBox).not.toBeNull();
  const before = await viewport.evaluate((element) => element.scrollLeft);
  await page.mouse.move(
    (thumbBox?.x ?? 0) + (thumbBox?.width ?? 0) / 2,
    (thumbBox?.y ?? 0) + (thumbBox?.height ?? 0) / 2
  );
  await page.mouse.down();
  await page.mouse.move(
    (thumbBox?.x ?? 0) + (thumbBox?.width ?? 0) / 2 + 120,
    (thumbBox?.y ?? 0) + (thumbBox?.height ?? 0) / 2,
    { steps: 8 }
  );
  await page.mouse.up();

  await expect
    .poll(() => viewport.evaluate((element) => element.scrollLeft))
    .toBeGreaterThan(before + 20);
});

test("GitHub issue #14: a narrow active filter preserves usable input space with compact tools", async ({
  page,
}) => {
  await page.goto("/users");

  const grid = page
    .getByTestId("example-preview-panel")
    .locator(".InovuaReactDataGrid.tdg-root")
    .first();
  const cell = grid.locator(".tdg-filter-cell").first();
  const input = cell.getByRole("textbox");

  await input.fill("1000");
  await expect(input).toHaveValue("1000");
  await expect(cell.getByRole("button", { name: "Clear" })).toBeVisible();

  const geometry = await cell.evaluate((element) => {
    const inner = element.querySelector<HTMLElement>(".tdg-filter-cell__inner");
    const input = element.querySelector<HTMLInputElement>("input");
    const clear = element.querySelector<HTMLElement>(
      ".InovuaReactDataGrid__column-header__filter-clear"
    );
    const filter = element.querySelector<HTMLElement>(
      ".InovuaReactDataGrid__column-header__filter-settings"
    );
    if (!inner || !input || !clear || !filter) return null;

    const cellRect = element.getBoundingClientRect();
    const inputRect = input.getBoundingClientRect();
    const clearRect = clear.getBoundingClientRect();
    const filterRect = filter.getBoundingClientRect();
    const cellStyle = getComputedStyle(element);
    const innerStyle = getComputedStyle(inner);
    const inputStyle = getComputedStyle(input);
    const usableInputWidth =
      input.clientWidth -
      Number.parseFloat(inputStyle.paddingLeft || "0") -
      Number.parseFloat(inputStyle.paddingRight || "0");

    return {
      cellWidth: cellRect.width,
      paddingLeft: Number.parseFloat(cellStyle.paddingLeft || "0"),
      paddingRight: Number.parseFloat(cellStyle.paddingRight || "0"),
      gap: Number.parseFloat(innerStyle.gap || "0"),
      clearWidth: clearRect.width,
      filterWidth: filterRect.width,
      usableInputWidth,
      inputBeforeClear: inputRect.right <= clearRect.left + 1,
      clearBeforeFilter: clearRect.right <= filterRect.left + 1,
      controlsWithinCell:
        inputRect.left >= cellRect.left - 1 &&
        filterRect.right <= cellRect.right + 1,
    };
  });

  expect(geometry).not.toBeNull();
  expect(geometry?.cellWidth).toBeLessThanOrEqual(110);
  expect(
    (geometry?.paddingLeft ?? 99) + (geometry?.paddingRight ?? 99)
  ).toBeLessThanOrEqual(8);
  expect(geometry?.gap).toBe(0);
  expect(geometry?.clearWidth).toBeLessThanOrEqual(25);
  expect(geometry?.filterWidth).toBeLessThanOrEqual(25);
  expect(geometry?.usableInputWidth).toBeGreaterThan(0);
  expect(geometry?.inputBeforeClear).toBe(true);
  expect(geometry?.clearBeforeFilter).toBe(true);
  expect(geometry?.controlsWithinCell).toBe(true);

  await cell.getByRole("button", { name: "Clear" }).click();
  await expect(input).toHaveValue("");
});

test("GitHub issue #15: computed props expose representative Inovua runtime methods", async ({
  page,
}) => {
  await page.goto("/compat/computed-props");

  await expect(page.getByTestId("compat-apiReady")).toContainText("true");
  await page.getByTestId("compat-run").click();

  await expect(page.getByTestId("compat-hasPublicApi")).toContainText("true");
  await expect(page.getByTestId("compat-columnsMap")).toContainText(
    "id,name,city"
  );
  await expect(page.getByTestId("compat-columnByName")).toContainText("name");
  await expect(page.getByTestId("compat-cityVisible")).toContainText("false");
  await expect(page.getByTestId("compat-sortInfo")).toContainText("name:1");
  await expect(page.getByTestId("compat-filterValue")).toContainText("a");
  await expect(page.getByTestId("compat-domNode")).toContainText("grid-row");
  await expect(page.getByTestId("compat-renderRange")).not.toContainText(
    "missing"
  );
  await expect(page.getByTestId("compat-scrollWorked")).toContainText("true");
  await expect(
    page.getByTestId("compat-virtualListTanStackLeak")
  ).toContainText("false");
});

test("GitHub issue #16: the built stylesheet does not restyle host shadcn utilities", async ({
  page,
}) => {
  await page.setContent(`
    <style>
      :root {
        --font-sans: "Host Sans", sans-serif;
        --tracking-tight: 0em;
        --radius-md: 15px;
        --background: rgb(10 20 30);
        --foreground: rgb(240 244 248);
        --border: rgb(80 96 116);
      }
      .bg-background { background-color: var(--background); }
      .text-foreground { color: var(--foreground); }
      .border { border-style: solid; border-width: 1px; }
      .border-border { border-color: var(--border); }
      .rounded-md { border-radius: var(--radius-md); }
    </style>
    <main style="--tdg-radius-md:44px;--tdg-color-background:rgb(255 0 255);--tdg-color-foreground:rgb(0 255 0);--tdg-color-border:rgb(255 128 0)">
      <div id="host-probe" class="rounded-md border border-border bg-background text-foreground">
        Host shadcn probe
      </div>
      <div class="tdg-root">
        <div class="rounded-md border border-border bg-background text-foreground">Grid probe</div>
      </div>
    </main>
  `);

  const packageStyle = await page.addStyleTag({ content: PACKAGE_CSS });
  await packageStyle.evaluate((element) => {
    element.id = "issue-16-package-css";
  });

  const scan = await page.evaluate(() => {
    const style = document.getElementById(
      "issue-16-package-css"
    ) as HTMLStyleElement | null;
    const sheet = Array.from(document.styleSheets).find(
      (candidate) => candidate.ownerNode === style
    );
    if (!sheet) return null;

    const ownedMarkers = [
      ".tdg-",
      ".InovuaReactDataGrid",
      ".inovua-react-toolkit",
    ];
    const collisionMarkers = [
      ".bg-background",
      ".border-border",
      ".rounded-md",
      ".text-foreground",
    ];
    const leakedSelectors: string[] = [];
    const globalThemeSelectors: string[] = [];

    function visit(rules: CSSRuleList) {
      for (const rule of Array.from(rules)) {
        if (rule instanceof CSSStyleRule) {
          const selector = rule.selectorText;
          const owned = ownedMarkers.some((marker) =>
            selector.includes(marker)
          );
          if (
            !owned &&
            collisionMarkers.some((marker) => selector.includes(marker))
          ) {
            leakedSelectors.push(selector);
          }
          if (
            (selector === ":root" || selector === ":host") &&
            rule.cssText.includes("--tdg-")
          ) {
            globalThemeSelectors.push(selector);
          }
        }

        if ("cssRules" in rule) {
          visit((rule as CSSGroupingRule).cssRules);
        }
      }
    }

    visit(sheet.cssRules);
    return { leakedSelectors, globalThemeSelectors };
  });

  expect(scan).not.toBeNull();
  expect(scan?.leakedSelectors).toEqual([]);
  expect(scan?.globalThemeSelectors).toEqual([]);

  const styles = await page.locator("#host-probe").evaluate((element) => {
    const computed = getComputedStyle(element);
    return {
      background: computed.backgroundColor,
      border: computed.borderTopColor,
      color: computed.color,
      radius: computed.borderRadius,
      fontSans: getComputedStyle(document.documentElement)
        .getPropertyValue("--font-sans")
        .trim(),
      tracking: getComputedStyle(document.documentElement)
        .getPropertyValue("--tracking-tight")
        .trim(),
    };
  });
  expect(styles).toEqual({
    background: "rgb(10, 20, 30)",
    border: "rgb(80, 96, 116)",
    color: "rgb(240, 244, 248)",
    radius: "15px",
    fontSans: '"Host Sans", sans-serif',
    tracking: "0em",
  });
});
