import { expect, test } from "@playwright/test";

test("loads the example app and switches the grid theme", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "the-datagrid demo" })).toBeVisible();

  const grid = page.locator(".tdg-root").first();
  await expect(grid).toHaveAttribute("data-theme", "default");

  await page.getByRole("button", { name: "Ikarus Dark" }).click();
  await expect(grid).toHaveAttribute("data-theme", "ikarus-dark");

  const hoverVars = await grid.evaluate((el) => {
    const style = getComputedStyle(el);
    return {
      odd: style.getPropertyValue("--tdg-row-odd-hover-bg").trim(),
      even: style.getPropertyValue("--tdg-row-even-hover-bg").trim(),
    };
  });

  expect(hoverVars).toEqual({
    odd: "rgb(33.6, 33.6, 33.6)",
    even: "rgb(33.6, 33.6, 33.6)",
  });

  const firstHeaderCell = page.locator(".tdg-header-cell").first();

  const headerBorderOn = await firstHeaderCell.evaluate((el) => {
    const style = getComputedStyle(el);
    return {
      borderRightWidth: style.borderRightWidth,
      borderRightColor: style.borderRightColor,
    };
  });

  expect(headerBorderOn).toEqual({
    borderRightWidth: "1px",
    borderRightColor: "rgb(56, 56, 56)",
  });

  await page.getByRole("button", { name: "Vertical separators on" }).click();
  await expect(page.getByRole("button", { name: "Vertical separators off" })).toBeVisible();

  const headerBorderOff = await firstHeaderCell.evaluate((el) => {
    const style = getComputedStyle(el);
    return {
      borderRightWidth: style.borderRightWidth,
      borderRightColor: style.borderRightColor,
    };
  });

  expect(headerBorderOff).toEqual({
    borderRightWidth: "0px",
    borderRightColor: "rgb(56, 56, 56)",
  });

  await page.getByRole("button", { name: "Filter" }).first().click();

  const menu = page.getByRole("menu").last();
  await expect(menu.getByText("Filter", { exact: true })).toBeVisible();
  await expect(menu.getByText("Operator", { exact: true })).toBeVisible();
  await expect(menu.getByRole("menuitem", { name: "Clear" })).toBeVisible();
  await expect(menu.getByRole("menuitemradio", { name: /^Contains$/ })).toHaveAttribute("aria-checked", "true");

  const menuStyles = await menu.evaluate((el) => {
    const cs = getComputedStyle(el);
    const root = el.closest(".tdg-root");

    return {
      backgroundColor: cs.backgroundColor,
      color: cs.color,
      borderColor: cs.borderColor,
      theme: root?.getAttribute("data-theme") ?? null,
      insideGrid: Boolean(root),
    };
  });

  expect(menuStyles).toEqual({
    backgroundColor: "rgb(49, 57, 67)",
    color: "rgb(155, 167, 180)",
    borderColor: "rgb(56, 56, 56)",
    theme: "ikarus-dark",
    insideGrid: true,
  });
});

test("keeps table alignment under hostile global table styles", async ({ page }) => {
  await page.goto("/");

  await page.addStyleTag({
    content: `
      table, thead, tbody, tfoot, tr, th, td {
        display: block;
      }

      tr {
        width: min-content;
      }
    `,
  });

  const layout = await page.locator(".tdg-root").first().evaluate((root) => {
    const table = root.querySelector("table");
    const thead = root.querySelector("thead");
    const headerRow = root.querySelector(".tdg-header-row");
    const headerCells = Array.from(root.querySelectorAll(".tdg-header-cell")).slice(0, 3);
    const firstBodyRow = root.querySelector("tbody .tdg-row");
    const bodyCells = firstBodyRow ? Array.from(firstBodyRow.querySelectorAll("td")).slice(0, 3) : [];

    if (!table || !thead || !headerRow || headerCells.length < 3 || bodyCells.length < 3) {
      return null;
    }

    const pick = (elements: Element[]) =>
      elements.map((element) => {
        const rect = element.getBoundingClientRect();

        return {
          top: Math.round(rect.top),
          left: Math.round(rect.left),
        };
      });

    return {
      tableDisplay: getComputedStyle(table).display,
      theadDisplay: getComputedStyle(thead).display,
      rowDisplay: getComputedStyle(headerRow).display,
      headerCellDisplay: getComputedStyle(headerCells[0]!).display,
      bodyCellDisplay: getComputedStyle(bodyCells[0]!).display,
      headerRects: pick(headerCells),
      bodyRects: pick(bodyCells),
    };
  });

  expect(layout).not.toBeNull();
  expect(layout?.tableDisplay).toBe("table");
  expect(layout?.theadDisplay).toBe("table-header-group");
  expect(layout?.rowDisplay).toBe("table-row");
  expect(layout?.headerCellDisplay).toBe("table-cell");
  expect(layout?.bodyCellDisplay).toBe("table-cell");

  expect(new Set(layout?.headerRects.map((rect) => rect.top)).size).toBe(1);
  expect(new Set(layout?.bodyRects.map((rect) => rect.top)).size).toBe(1);

  expect(layout?.headerRects[1]?.left).toBeGreaterThan(layout?.headerRects[0]?.left ?? 0);
  expect(layout?.headerRects[2]?.left).toBeGreaterThan(layout?.headerRects[1]?.left ?? 0);
  expect(layout?.bodyRects[1]?.left).toBeGreaterThan(layout?.bodyRects[0]?.left ?? 0);
  expect(layout?.bodyRects[2]?.left).toBeGreaterThan(layout?.bodyRects[1]?.left ?? 0);
});
