import { expect, test } from "@playwright/test";

import { parseDataGridSearchQuery } from "../../src/grid/utils/search";
import { viteFsUrl } from "./helpers/vite-fs-url";

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

  test("preserves the cards-only layout when mobileTransform is omitted", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/examples/basic");
    await page.evaluate(() => {
      document.getElementById("root")!.style.display = "none";
      const fixture = document.createElement("div");
      fixture.id = "legacy-mobile-transform";
      fixture.style.cssText = "position:fixed;inset:20px;height:600px";
      document.body.append(fixture);
    });
    await page.addScriptTag({
      type: "module",
      content: `
        import React from ${JSON.stringify(viteFsUrl("node_modules/.vite/deps/react.js"))};
        import ReactDOMClient from ${JSON.stringify(viteFsUrl("node_modules/.vite/deps/react-dom_client.js"))};
        import ReactDataGrid from ${JSON.stringify(viteFsUrl("src/ReactDataGrid.tsx"))};
        const root = ReactDOMClient.createRoot(document.getElementById("legacy-mobile-transform"));
        root.render(React.createElement(ReactDataGrid, {
          idProperty: "id",
          columns: [{ name: "name", header: "Name" }],
          dataSource: [{ id: "a", name: "Alpha" }],
          allowMobileTransform: true,
          virtualized: true,
        }));
      `,
    });

    const fixture = page.locator("#legacy-mobile-transform");
    await expect(fixture.locator(".tdg-root")).toHaveAttribute(
      "data-layout",
      "mobile-list"
    );
    await expect(
      fixture.locator('[data-slot="mobile-grid-list"]')
    ).toHaveAttribute("data-variant", "cards");
    await expect(fixture.locator(".tdg-mobile-card")).toHaveCount(1);
    await expect(fixture.locator(".tdg-mobile-variant-toggle")).toHaveCount(0);
  });

  test("uses the document as the only page-scroll viewport", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/examples/mobile-transform");

    const grid = page.locator(".tdg-root");
    const list = grid.locator(".tdg-mobile-list");
    const items = list.locator('[role="listitem"]');
    await expect(grid).toHaveAttribute("data-mobile-scroll", "page");
    await expect(
      grid.locator('[data-slot="scroll-area-viewport"]')
    ).toHaveCount(0);
    await expect(grid).toHaveCSS("overflow", "visible");
    await expect(grid.locator('[data-slot="grid-frame"]')).toHaveCSS(
      "overflow",
      "visible"
    );

    const mountedAtTop = await items.count();
    expect(mountedAtTop).toBeGreaterThan(0);
    expect(mountedAtTop).toBeLessThan(25);
    const listTop = await list.evaluate(
      (element) => element.getBoundingClientRect().top + window.scrollY
    );
    await page.evaluate((top) => window.scrollTo(0, top + 800), listTop);
    await expect
      .poll(async () => Number(await items.first().getAttribute("data-index")))
      .toBeGreaterThan(0);
    await expect
      .poll(() => page.evaluate(() => window.scrollY))
      .toBeGreaterThan(listTop);
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
      grid.locator('[data-slot="grid-header-cell"][data-column-id="account"]')
    ).toContainText("Account");
  });

  test("honours grid sizing props without a fixed-height wrapper", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/examples/mobile-transform");

    const grid = page.locator(".tdg-root");
    const shell = page.getByTestId("mobile-transform-shell");
    const viewport = grid.locator('[data-slot="scroll-area-viewport"]');
    const measurements = await Promise.all([
      grid.evaluate((element) => ({
        height: element.getBoundingClientRect().height,
        maxHeight: getComputedStyle(element).maxHeight,
        minHeight: getComputedStyle(element).minHeight,
      })),
      shell.evaluate((element) => ({
        height: element.style.height,
        maxHeight: element.style.maxHeight,
      })),
      viewport.evaluate((element) => ({
        clientHeight: element.clientHeight,
        scrollHeight: element.scrollHeight,
      })),
    ]);

    expect(measurements[0]).toEqual({
      height: 680,
      maxHeight: "680px",
      minHeight: "300px",
    });
    expect(measurements[1]).toEqual({ height: "", maxHeight: "" });
    expect(measurements[2].scrollHeight).toBeGreaterThan(
      measurements[2].clientHeight
    );
    expect(await grid.locator('[data-slot="grid-row"]').count()).toBeLessThan(
      100
    );
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
        handleWidth: handleRect.width,
        handleInsideHeader:
          handleRect.left >= headerRect.left - 1 &&
          handleRect.right <= headerRect.right + 1,
        edgeAlignment: Math.abs(clipRight - headerRect.right),
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
    expect(edgeLayout?.handleWidth ?? 0).toBeGreaterThanOrEqual(24);
    expect(edgeLayout?.handleInsideHeader).toBe(true);
    expect(edgeLayout?.edgeAlignment ?? Infinity).toBeLessThanOrEqual(1);
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
    await page.getByRole("button", { name: "View", exact: true }).click();
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

    // The card fields are the subject here, and the layout now starts in the list.
    await page.getByRole("button", { name: "Card view" }).click();
    const firstCard = page.locator('article[data-row-id="AC-00001"]');
    await expect(firstCard.getByText("Owner", { exact: true })).toBeVisible();

    await columnsButton.click();
    const columnsMenu = page.getByRole("menu");
    await expect(columnsMenu.getByText("Display columns")).toBeVisible();

    const notesItem = columnsMenu.getByRole("menuitemcheckbox", {
      name: "Owner",
    });
    await expect(notesItem).toHaveAttribute("aria-checked", "true");
    await notesItem.click();
    await expect(notesItem).toHaveAttribute("aria-checked", "false");
    await expect(firstCard.getByText("Owner", { exact: true })).toHaveCount(0);

    await notesItem.click();
    await expect(notesItem).toHaveAttribute("aria-checked", "true");
    await expect(firstCard.getByText("Owner", { exact: true })).toBeVisible();
  });

  test("uses two metadata columns on iPad widths", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto("/examples/mobile-transform");
    await expect(page.locator(".tdg-root")).toHaveAttribute(
      "data-layout",
      "mobile-list"
    );
    // The two-column field grid is a card, and the layout now starts in the list.
    await page.getByRole("button", { name: "Card view" }).click();
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

  test("toolbar controls do not claim a row", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/examples/mobile-transform");

    const grid = page.locator(".tdg-root");
    await expect(grid).toHaveAttribute("data-layout", "mobile-list");
    await expect(grid).toHaveAttribute("data-active-index", "none");

    await page.getByRole("searchbox", { name: "Search all fields" }).click();
    await expect(grid).toHaveAttribute("data-focused", "true");
    await expect(grid).toHaveAttribute("data-active-index", "none");

    await page.getByRole("button", { name: "Sort" }).click();
    await expect(page.locator('[data-slot="mobile-sort-panel"]')).toBeVisible();
    await expect(grid).toHaveAttribute("data-active-index", "none");

    // Entry into the grid itself is what activateRowOnFocus serves.
    await page.reload();
    await grid.locator('[data-slot="grid-surface"]').focus();
    await expect(grid).toHaveAttribute("data-active-index", "0");
  });

  test("boxed list rows gutter both ends of a scrolling container", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/examples/mobile-transform");

    await page.getByTestId("mobile-scroll-mode").click();
    await page.getByRole("option", { name: "Container scroll" }).click();
    await page.getByTestId("mobile-list-rows").click();
    await page.getByRole("option", { name: "Boxed" }).click();

    const list = page.locator('[data-slot="mobile-grid-list"]');
    await expect(list).toHaveAttribute("data-variant", "list");
    await expect(list).toHaveAttribute("data-scroll-mode", "container");

    const items = page.locator('[role="listitem"]');
    await expect(items.first()).toHaveCSS("padding-top", "12px");

    const viewport = page.locator(".tdg-body-viewport");
    // Each pass measures more rows and grows the run, so one scroll to the
    // bottom lands short of it.
    await expect
      .poll(async () => {
        await viewport.evaluate((element) => {
          element.scrollTop = element.scrollHeight;
        });
        return viewport.evaluate((element) =>
          Math.round(
            element.scrollHeight - element.clientHeight - element.scrollTop
          )
        );
      })
      .toBe(0);
    await expect(items.last()).toHaveCSS("padding-bottom", "12px");

    // Page scroll ends against the document, and divided rows have their own
    // gaps — neither takes the gutters.
    await page.getByTestId("mobile-scroll-mode").click();
    await page.getByRole("option", { name: "Page scroll" }).click();
    await expect(list).toHaveAttribute("data-scroll-mode", "page");
    await expect(items.first()).toHaveCSS("padding-top", "0px");
  });

  test("hands a paginated grid's own paging to the mobile pager", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/examples/mobile-transform");

    // Asking for the mobile row budget as well: the grid's paging still wins,
    // because the rows the layout receives are one page of it.
    await page.getByTestId("mobile-overflow-mode").click();
    await page.getByRole("option", { name: "Pagination", exact: true }).click();
    await page.getByTestId("mobile-grid-pagination-toggle").click();

    const pager = page.locator('[data-slot="mobile-pagination"]');
    await expect(pager).toHaveCount(1);
    await expect(pager).toContainText(/1.25 of 10000/);
    await expect(pager.locator(".tdg-mobile-pagination__size")).toContainText(
      "25"
    );
    await expect(page.locator(".tdg-pagination-shell")).toHaveCount(0);

    await pager.getByRole("button", { name: "Next page" }).click();
    await expect(pager).toContainText(/26.50 of 10000/);

    // Pressing the pager scrolls it into view, so the window virtualizer is
    // mounting further down the page than the row the skip now starts at.
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(
      page.locator('[data-slot="mobile-grid-list"] [role="listitem"]').first()
    ).toContainText("AC-00026");

    await pager.locator(".tdg-mobile-pagination__size").click();
    await page.getByRole("option", { name: "50", exact: true }).click();
    await expect(pager).toContainText(/1.50 of 10000/);
  });

  test("offers the active page size in the desktop pager too", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/examples/mobile-transform");
    await page.getByTestId("mobile-grid-pagination-toggle").click();

    // `pageSizes` defaults to [10, 50, 100, 1000] against a grid limited to 25.
    // A select falls back to its placeholder only for an empty value, so an
    // unmatched one renders nothing at all.
    const trigger = page.locator("#rows-per-page");
    await expect(trigger).toHaveText("25");

    await trigger.click();
    await expect(page.getByRole("option")).toHaveText([
      "10",
      "25",
      "50",
      "100",
      "1000",
    ]);
  });

  test("sizes the mobile pager rows-per-page control to its content", async ({
    page,
  }) => {
    // Wide enough to still be the mobile layout, where the trailing column is
    // roomy enough for the armoured `width: 100%` to show.
    await page.setViewportSize({ width: 900, height: 844 });
    await page.goto("/examples/mobile-transform");

    await page.getByTestId("mobile-overflow-mode").click();
    await page.getByRole("option", { name: "Pagination", exact: true }).click();

    const size = page.locator(".tdg-mobile-pagination__size");
    await expect(size).toBeVisible();
    const measure = async () =>
      size.evaluate((element) => ({
        width: element.getBoundingClientRect().width,
        columnWidth: element.parentElement!.getBoundingClientRect().width,
      }));

    const initial = await measure();
    expect(initial.width).toBeLessThan(100);
    expect(initial.columnWidth).toBeGreaterThan(200);

    // Content-sized, not just capped: three digits take more room than two.
    await size.click();
    await page.getByRole("option", { name: "100", exact: true }).click();
    const wider = await measure();
    expect(wider.width).toBeGreaterThan(initial.width);
    expect(wider.width).toBeLessThan(100);
  });

  test("page-scroll fields take the surface, container scroll keeps the fill", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/examples/mobile-transform");
    // The only bundled theme whose field fill differs from its own surface, so
    // it is the one where honouring or dropping it is visible.
    await page
      .getByRole("button", { name: "Ikarus Dark", exact: true })
      .click();
    await page.getByTestId("mobile-overflow-mode").click();
    await page.getByRole("option", { name: "Pagination", exact: true }).click();

    const backgroundOf = (selector: string) =>
      page
        .locator(selector)
        .evaluate((element) => getComputedStyle(element).backgroundColor);
    const TRANSPARENT = "rgba(0, 0, 0, 0)";

    // Page scroll, the example's default: no frame of its own, so the fields
    // take what the host paints rather than cutting a patch out of it.
    expect(await backgroundOf('[data-slot="rdg-search-bar"]')).toBe(
      TRANSPARENT
    );
    expect(await backgroundOf(".tdg-mobile-pagination__size")).toBe(
      TRANSPARENT
    );

    await page.getByTestId("mobile-scroll-mode").click();
    await page.getByRole("option", { name: "Container scroll" }).click();

    // Container scroll owns the surface behind its fields, so the theme's fill
    // stands again — and is its own colour, not the surface it sits on.
    const searchBackground = await backgroundOf('[data-slot="rdg-search-bar"]');
    expect(searchBackground).not.toBe(TRANSPARENT);
    expect(searchBackground).not.toBe(
      await backgroundOf('[data-slot="grid-surface"]')
    );
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
