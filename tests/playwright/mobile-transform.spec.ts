import { expect, test } from "@playwright/test";

import { parseDataGridSearchQuery } from "../../src/grid/utils/search";

test.describe("allowMobileTransform", () => {
  test("recognizes punctuation-rich column headers and column keys", () => {
    const columns = [{ id: "orgid", aliases: ["orgid", "Org #"] }];

    expect(parseDataGridSearchQuery("Org #: 154", columns)).toEqual({
      columnIds: ["orgid"],
      prefixEnd: 6,
      searchQuery: " 154",
    });
    expect(parseDataGridSearchQuery("ORGID: 154", columns)).toEqual({
      columnIds: ["orgid"],
      prefixEnd: 6,
      searchQuery: " 154",
    });
    expect(parseDataGridSearchQuery("Test: 123", columns)).toEqual({
      columnIds: [],
      prefixEnd: null,
      searchQuery: "Test: 123",
    });
    expect(
      parseDataGridSearchQuery("Time: UTC: 12", [
        { id: "localTime", aliases: ["Time"] },
        { id: "utcTime", aliases: ["Time: UTC"] },
      ])
    ).toEqual({
      columnIds: ["utcTime"],
      prefixEnd: 10,
      searchQuery: " 12",
    });
  });

  test("defaults to the table layout on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/examples/basic");
    await expect(page.locator(".tdg-root")).toHaveAttribute(
      "data-layout",
      "table"
    );
  });

  test("keeps the table layout on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/examples/mobile-transform");
    const grid = page.locator(".tdg-root");
    const example = page.getByTestId("mobile-transform-example");
    const shell = page.getByTestId("mobile-transform-shell");

    await expect(grid).toHaveAttribute("data-layout", "table");
    await expect(example).toHaveCSS("border-radius", "16px");
    await expect(shell).toHaveCSS("border-top-width", "0px");
    await expect(grid).toHaveCSS("border-radius", "12px");
    await expect(
      page.getByRole("columnheader", { name: /^Account Resize/ })
    ).toBeVisible();
  });

  test("keeps the final column label and resize handle fully accessible", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/examples/mobile-transform");

    const grid = page.locator(".tdg-root");
    const scrollArea = grid.locator('[data-slot="scroll-area"]');
    const viewport = grid.locator('[data-slot="scroll-area-viewport"]');
    const actionsHeader = grid.locator(
      '[data-slot="grid-header-cell"][data-column-id="actions"]'
    );
    const actionsResizer = actionsHeader.getByRole("button", {
      name: "Resize Customer account actions",
    });

    await viewport.evaluate((element) => {
      element.scrollLeft = element.scrollWidth;
      element.dispatchEvent(new Event("scroll", { bubbles: true }));
    });
    await expect
      .poll(async () => {
        return viewport.evaluate(
          (element) =>
            element.scrollWidth - element.clientWidth - element.scrollLeft
        );
      })
      .toBeLessThanOrEqual(1);

    const scrollAreaBox = await scrollArea.boundingBox();
    await scrollArea.hover({
      position: {
        x: Math.max(1, (scrollAreaBox?.width ?? 2) - 2),
        y: 24,
      },
    });

    await expect(actionsHeader).toBeVisible();
    await expect(actionsHeader).toContainText("Customer account actions");
    await expect(actionsResizer).toBeVisible();

    const edgeLayout = await grid.evaluate((gridElement) => {
      const frame = gridElement.querySelector<HTMLElement>(
        '[data-slot="grid-frame"]'
      );
      const bodyViewport = gridElement.querySelector<HTMLElement>(
        '[data-slot="scroll-area-viewport"]'
      );
      const header = gridElement.querySelector<HTMLElement>(
        '[data-slot="grid-header-cell"][data-column-id="actions"]'
      );
      const label = header?.querySelector<HTMLElement>("span.truncate");
      const handle = header?.querySelector<HTMLElement>(
        '[data-slot="column-resizer"]'
      );
      const verticalScrollbar = gridElement.querySelector<HTMLElement>(
        '[data-slot="scroll-area-scrollbar"][data-orientation="vertical"]'
      );

      if (!frame || !bodyViewport || !header || !label || !handle) {
        return null;
      }

      const frameRect = frame.getBoundingClientRect();
      const viewportRect = bodyViewport.getBoundingClientRect();
      const headerRect = header.getBoundingClientRect();
      const labelRect = label.getBoundingClientRect();
      const handleRect = handle.getBoundingClientRect();
      const scrollbarRect = verticalScrollbar?.getBoundingClientRect();
      const clipRight = Math.min(frameRect.right, viewportRect.right);
      const hitTarget = document.elementFromPoint(
        handleRect.left + handleRect.width / 2,
        handleRect.top + handleRect.height / 2
      );

      return {
        gutterWidth: clipRight - headerRect.right,
        handleWidth: handleRect.width,
        handleFullyVisible: handleRect.right <= clipRight + 1,
        handleClearsScrollbar:
          !scrollbarRect || handleRect.right <= scrollbarRect.left + 1,
        handleHitTarget:
          hitTarget === handle ||
          Boolean(hitTarget && handle.contains(hitTarget)),
        headerFullyVisible:
          headerRect.left >= viewportRect.left - 1 &&
          headerRect.right <= viewportRect.right + 1,
        labelFullyVisible:
          labelRect.left >= headerRect.left - 1 &&
          labelRect.right <= headerRect.right + 1 &&
          label.scrollWidth <= label.clientWidth + 1,
      };
    });

    expect(edgeLayout).not.toBeNull();
    expect(edgeLayout?.headerFullyVisible).toBe(true);
    expect(edgeLayout?.labelFullyVisible).toBe(true);
    expect(edgeLayout?.gutterWidth ?? 0).toBeGreaterThanOrEqual(
      (edgeLayout?.handleWidth ?? 0) / 2
    );
    expect(edgeLayout?.handleFullyVisible).toBe(true);
    expect(edgeLayout?.handleClearsScrollbar).toBe(true);
    expect(edgeLayout?.handleHitTarget).toBe(true);

    const initialWidth = await actionsHeader.evaluate((element) =>
      Math.round(element.getBoundingClientRect().width)
    );
    const handleBox = await actionsResizer.boundingBox();
    expect(handleBox).not.toBeNull();

    await page.mouse.move(
      (handleBox?.x ?? 0) + (handleBox?.width ?? 0) / 2,
      (handleBox?.y ?? 0) + (handleBox?.height ?? 0) / 2
    );
    await page.mouse.down();
    await page.mouse.move(
      (handleBox?.x ?? 0) + (handleBox?.width ?? 0) / 2 + 40,
      (handleBox?.y ?? 0) + (handleBox?.height ?? 0) / 2,
      { steps: 4 }
    );
    await page.mouse.up();

    await expect
      .poll(async () => {
        return actionsHeader.evaluate((element) =>
          Math.round(element.getBoundingClientRect().width)
        );
      })
      .toBeGreaterThan(initialWidth + 20);

    await expect
      .poll(async () => {
        return grid.evaluate((gridElement) => {
          const viewport = gridElement.querySelector<HTMLElement>(
            '[data-slot="scroll-area-viewport"]'
          );
          const header = gridElement.querySelector<HTMLElement>(
            '[data-slot="grid-header-cell"][data-column-id="actions"]'
          );
          const label = header?.querySelector<HTMLElement>("span.truncate");
          const handle = header?.querySelector<HTMLElement>(
            '[data-slot="column-resizer"]'
          );

          if (!viewport || !header || !label || !handle) return null;

          const viewportRect = viewport.getBoundingClientRect();
          const handleRect = handle.getBoundingClientRect();

          return {
            atTrailingEdge:
              viewport.scrollWidth -
                viewport.clientWidth -
                viewport.scrollLeft <=
              1,
            handleFullyVisible: handleRect.right <= viewportRect.right + 1,
            labelFullyVisible: label.scrollWidth <= label.clientWidth + 1,
          };
        });
      })
      .toEqual({
        atTrailingEdge: true,
        handleFullyVisible: true,
        labelFullyVisible: true,
      });

    const resizedHandleBox = await actionsResizer.boundingBox();
    expect(resizedHandleBox).not.toBeNull();
    await page.mouse.move(
      (resizedHandleBox?.x ?? 0) + (resizedHandleBox?.width ?? 0) / 2,
      (resizedHandleBox?.y ?? 0) + (resizedHandleBox?.height ?? 0) / 2
    );
    await page.mouse.down();
    await page.mouse.move(
      (resizedHandleBox?.x ?? 0) - 500,
      (resizedHandleBox?.y ?? 0) + (resizedHandleBox?.height ?? 0) / 2,
      { steps: 4 }
    );
    await page.mouse.up();

    await expect
      .poll(async () => {
        return actionsHeader.evaluate((header) => {
          const label = header.querySelector<HTMLElement>("span.truncate");
          if (!label) return false;
          return label.scrollWidth <= label.clientWidth + 1;
        });
      })
      .toBe(true);
  });

  test("renders, searches, virtualizes, and preserves actions on mobile", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/examples/mobile-transform");
    const grid = page.locator(".tdg-root");
    await expect(grid).toHaveAttribute("data-layout", "mobile-list");
    await expect(page.getByRole("columnheader")).toHaveCount(0);
    const mountedRows = await page.locator('[role="listitem"]').count();
    expect(mountedRows).toBeGreaterThan(0);
    expect(mountedRows).toBeLessThan(20);

    const search = page.getByRole("searchbox", { name: "Search all fields" });
    await search.fill("ZX-9001 Maya");
    await expect(
      page
        .getByTestId("mobile-transform-shell")
        .getByText("Aurora Clinic ZX-9001")
    ).toBeVisible();
    await expect(page.getByText("1 result")).toBeVisible();
    await page.getByRole("button", { name: "View" }).click();
    await expect(page.getByTestId("mobile-action-output")).toHaveText(
      "Opened Aurora Clinic ZX-9001"
    );
  });

  test("scopes mobile search by column and bolds only a recognized prefix", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/examples/mobile-transform");

    const grid = page.locator('.tdg-root[data-layout="mobile-list"]');
    const search = grid.getByRole("searchbox", { name: "Search all fields" });
    const resultCount = grid.locator('output[aria-live="polite"]');
    const prefix = grid.locator('strong[data-slot="rdg-search-column-prefix"]');
    const value = grid.locator('[data-slot="rdg-search-query-value"]');
    const targetRow = grid.locator('article[data-row-id="AC-09001"]');
    const composingRow = grid.locator('article[data-row-id="AC-00001"]');

    await search.fill("Account ID: AC-09001");
    await expect(resultCount).toHaveText("1 result");
    await expect(targetRow).toBeVisible();
    await expect(prefix).toHaveText("Account ID:");
    await expect(value).toHaveText(" AC-09001");

    const [weights, inputColors] = await Promise.all([
      Promise.all([
        prefix.evaluate((node) => Number(getComputedStyle(node).fontWeight)),
        value.evaluate((node) => Number(getComputedStyle(node).fontWeight)),
      ]),
      search.evaluate((node) => ({
        caret: getComputedStyle(node).caretColor,
        text: getComputedStyle(node).color,
      })),
    ]);
    expect(weights[0]).toBeGreaterThan(weights[1]);
    expect(inputColors.text).toBe("rgba(0, 0, 0, 0)");
    expect(inputColors.caret).not.toBe(inputColors.text);

    await search.dispatchEvent("compositionstart");
    await expect(prefix).toHaveCount(0);
    await expect
      .poll(() => search.evaluate((node) => getComputedStyle(node).color))
      .not.toBe("rgba(0, 0, 0, 0)");
    await search.fill("Account ID: AC-00001");
    await expect(search).toHaveValue("Account ID: AC-00001");
    await expect(resultCount).toHaveText("1 result");
    await expect(targetRow).toBeVisible();
    await expect(composingRow).toHaveCount(0);
    await expect(prefix).toHaveCount(0);
    await search.dispatchEvent("compositionend");
    await expect(prefix).toHaveText("Account ID:");
    await expect(composingRow).toBeVisible();
    await expect
      .poll(() => search.evaluate((node) => getComputedStyle(node).color))
      .toBe("rgba(0, 0, 0, 0)");

    await search.fill("Account: AC-09001");
    await expect(resultCount).toHaveText("0 results");
    await expect(prefix).toHaveText("Account:");

    await search.fill("id: AC-09001");
    await expect(resultCount).toHaveText("1 result");
    await expect(targetRow).toBeVisible();
    await expect(prefix).toHaveText("id:");

    await search.fill("account-key: AC-09001");
    await expect(resultCount).toHaveText("1 result");
    await expect(targetRow).toBeVisible();
    await expect(prefix).toHaveText("account-key:");

    await search.fill("Revenue: ledger-AC-09001");
    await expect(resultCount).toHaveText("1 result");
    await expect(targetRow).toBeVisible();
    await expect(prefix).toHaveText("Revenue:");

    await search.fill("Reference: AC-09001");
    await expect(search).toHaveValue("Reference: AC-09001");
    await expect(resultCount).toHaveText("0 results");
    await expect(prefix).toHaveCount(0);
    await expect
      .poll(() => search.evaluate((node) => getComputedStyle(node).color))
      .not.toBe("rgba(0, 0, 0, 0)");

    await search.press("Escape");
    await expect(search).toHaveValue("");
    await expect(search).toBeFocused();
    await expect(resultCount).toHaveText("10000 results");
  });

  test("uses icon-only toolbar actions and controls displayed columns", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/examples/mobile-transform");

    const sortButton = page.getByRole("button", { name: "Sort" });
    const columnsButton = page.getByRole("button", {
      name: "Display columns",
    });

    for (const button of [sortButton, columnsButton]) {
      await expect(button).toBeVisible();
      await expect(button).toHaveText("");
      await expect(button.locator("svg")).toHaveCount(1);
      const box = await button.boundingBox();
      expect(Math.round(box?.width ?? 0)).toBe(40);
      expect(Math.round(box?.height ?? 0)).toBe(40);
    }

    const firstCard = page.locator('article[data-row-id="AC-00001"]');
    await expect(firstCard.getByText("Notes", { exact: true })).toBeVisible();

    await columnsButton.click();
    const columnsMenu = page.getByRole("menu");
    await expect(columnsMenu.getByText("Display columns")).toBeVisible();

    const notesItem = columnsMenu.getByRole("menuitemcheckbox", {
      name: "Notes",
    });
    await expect(notesItem).toHaveAttribute("aria-checked", "true");
    await notesItem.click();
    await expect(notesItem).toHaveAttribute("aria-checked", "false");
    await expect(firstCard.getByText("Notes", { exact: true })).toHaveCount(0);

    await notesItem.click();
    await expect(notesItem).toHaveAttribute("aria-checked", "true");
    await expect(firstCard.getByText("Notes", { exact: true })).toBeVisible();
  });

  test("uses two metadata columns on iPad widths", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto("/examples/mobile-transform");
    await expect(page.locator(".tdg-root")).toHaveAttribute(
      "data-layout",
      "mobile-list"
    );
    const columns = await page
      .locator(".tdg-mobile dl")
      .first()
      .evaluate((node) => getComputedStyle(node).gridTemplateColumns);
    expect(columns.split(" ")).toHaveLength(2);
  });

  test("restores virtualized table rows after leaving the mobile layout", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto("/examples/mobile-transform");

    const grid = page.locator(".tdg-root");
    await expect(grid).toHaveAttribute("data-layout", "mobile-list");
    await expect(grid.locator('[role="listitem"]')).not.toHaveCount(0);

    for (let transition = 0; transition < 2; transition += 1) {
      await page.setViewportSize({ width: 1025, height: 768 });
      await expect(grid).toHaveAttribute("data-layout", "table");

      const viewport = grid.locator('[data-slot="scroll-area-viewport"]');
      const firstHeader = grid.locator(
        '[data-slot="grid-header-cell"][data-column-id="id"]'
      );
      const firstRow = grid.locator(
        '[data-slot="grid-row"][data-row-index="0"]'
      );

      await expect(viewport).toBeVisible();
      await expect(firstHeader).toBeVisible();
      await expect(firstRow).toBeVisible();
      await expect
        .poll(() => viewport.evaluate((element) => element.clientHeight))
        .toBeGreaterThan(0);
      await expect
        .poll(() =>
          viewport.evaluate(
            (element) => element.scrollHeight > element.clientHeight
          )
        )
        .toBe(true);

      const renderedRows = await grid.locator('[data-slot="grid-row"]').count();
      expect(renderedRows).toBeGreaterThan(0);
      expect(renderedRows).toBeLessThan(100);

      if (transition === 0) {
        await page.setViewportSize({ width: 1024, height: 768 });
        await expect(grid).toHaveAttribute("data-layout", "mobile-list");
        await expect(grid.locator('[role="listitem"]')).not.toHaveCount(0);
      }
    }
  });

  test("offers a recommended mobile sort and applies or clears it", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/examples/mobile-transform");

    await page.getByRole("button", { name: "Sort" }).click();
    const sortPanel = page.locator('[data-slot="mobile-sort-panel"]');
    await expect(sortPanel).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Sort by" })).toContainText(
      "Account"
    );
    await expect(
      page.getByRole("button", { name: "Ascending" })
    ).toHaveAttribute("aria-pressed", "true");

    await page.getByRole("combobox", { name: "Sort by" }).click();
    await page.getByRole("option", { name: "Account ID" }).click();
    await page.getByRole("button", { name: "Descending" }).click();
    await page.getByRole("button", { name: "Apply sort" }).click();

    await expect(page.locator('article[data-row-id="AC-10000"]')).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: "Sort: Account ID descending",
      })
    ).toBeVisible();

    await page
      .getByRole("button", { name: "Sort: Account ID descending" })
      .click();
    await page.getByRole("button", { name: "Clear sort" }).click();
    await expect(page.locator('article[data-row-id="AC-00001"]')).toBeVisible();
  });
});
