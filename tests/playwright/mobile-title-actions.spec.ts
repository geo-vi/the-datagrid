import { expect, test, type Locator, type Page } from "@playwright/test";

import { viteFsUrl } from "./helpers/vite-fs-url";

/*
 * Every case here was a regression a consumer reported, not something the
 * examples site could show: `listActions: "title"` restructures the row, and the
 * examples that exercise it carry no checkbox column and never hide the grid.
 *
 * The fixtures import `src` through `/@fs/` rather than the built `dist`, so a
 * check that one of these fails without its fix costs a re-run, not a rebuild.
 */
const REACT = viteFsUrl("node_modules/.vite/deps/react.js");
const REACT_DOM = viteFsUrl("node_modules/.vite/deps/react-dom_client.js");
const GRID = viteFsUrl("src/ReactDataGrid.tsx");

const ROWS = `[
  { id: "a", name: "Alpha", zone: "north" },
  { id: "b", name: "Bravo", zone: "south" },
]`;

const COLUMNS = `[
  { name: "name", header: "Name", mobileRole: "primary" },
  { name: "zone", header: "Zone" },
  {
    name: "actions",
    header: "Actions",
    render: () => React.createElement("button", { type: "button" }, "Edit"),
  },
]`;

async function mountGrid(page: Page, gridProps: string, wrapperCss = "") {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/examples/basic");
  await page.evaluate((css) => {
    document.body.innerHTML = "";
    const host = document.createElement("div");
    host.id = "fixture";
    host.style.cssText = css || "position:fixed;inset:20px;height:600px";
    document.body.append(host);
  }, wrapperCss);
  await page.addScriptTag({
    type: "module",
    content: `
      import React from ${JSON.stringify(REACT)};
      import ReactDOMClient from ${JSON.stringify(REACT_DOM)};
      import ReactDataGrid from ${JSON.stringify(GRID)};
      window.__mount = (target) => {
        const root = ReactDOMClient.createRoot(target);
        root.render(React.createElement(ReactDataGrid, ${gridProps}));
      };
      window.__mount(document.getElementById("fixture"));
    `,
  });
  await expect(page.locator("#fixture .tdg-root")).toHaveAttribute(
    "data-layout",
    "mobile-list"
  );
}

/** Top-left of an element, rounded, for comparing what sits on which line. */
async function box(locator: Locator) {
  const rect = await locator.first().boundingBox();
  if (!rect) throw new Error("element has no box");
  return {
    top: Math.round(rect.y),
    bottom: Math.round(rect.y + rect.height),
    left: Math.round(rect.x),
    right: Math.round(rect.x + rect.width),
  };
}

const TITLE_ACTIONS_GRID = `{
  idProperty: "id",
  columns: ${COLUMNS},
  dataSource: ${ROWS},
  checkboxColumn: true,
  allowMobileTransform: true,
  mobileTransform: {
    listActions: "title",
    listFieldIds: ["zone"],
  },
}`;

test.describe("listActions: title", () => {
  test("keeps the controls on the headline's line and drops the summary below", async ({
    page,
  }) => {
    await mountGrid(page, TITLE_ACTIONS_GRID);
    const row = page.locator("#fixture .tdg-mobile-row").first();

    const headline = await box(row.locator('[data-cell-role="primary"]'));
    const actions = await box(row.locator(".tdg-mobile-row-actions"));
    const summary = await box(row.locator(".tdg-mobile-row-summary"));

    // Same line as the title, not a line of their own underneath it.
    expect(Math.abs(actions.top - headline.top)).toBeLessThan(20);
    // And the summary wrapped past them rather than sharing that line.
    expect(summary.top).toBeGreaterThanOrEqual(headline.bottom);

    /*
     * The one that tells the two modes apart. Under `"inline"` the summary sits
     * inside the column that stops where the controls begin, so both of the
     * assertions above hold there too; only spanning the whole row, and so
     * reaching under the controls, is particular to `"title"`.
     */
    expect(summary.right).toBeGreaterThan(actions.left);
  });

  test("indents the summary past the checkbox, level with the headline", async ({
    page,
  }) => {
    await mountGrid(page, TITLE_ACTIONS_GRID);
    const row = page.locator("#fixture .tdg-mobile-row").first();

    const headline = await box(row.locator('[data-cell-role="primary"]'));
    const summary = row.locator(".tdg-mobile-row-summary");

    /*
     * The indent is padding, so the summary's own box still starts at the row's
     * edge and only its content moves. Comparing boxes would pass whether or not
     * the padding is there; the content edge is what has to line up.
     */
    const contentLeft =
      (await box(summary)).left +
      (await summary
        .first()
        .evaluate((el) =>
          parseFloat(getComputedStyle(el).paddingInlineStart || "0")
        ));

    expect(Math.abs(contentLeft - headline.left)).toBeLessThan(2);
  });

  test("keeps the open fields panel below the summary, not above it", async ({
    page,
  }) => {
    await mountGrid(page, TITLE_ACTIONS_GRID);
    const row = page.locator("#fixture .tdg-mobile-row").first();
    await row.locator(".tdg-mobile-row-expand").click();

    const panel = row.locator('[data-slot="mobile-row-fields"]');
    await expect(panel).toBeVisible();

    // The summary and the panel are both flex items of the row, so ordering
    // them by hand is what keeps the row reading top to bottom.
    const summary = await box(row.locator(".tdg-mobile-row-summary"));
    expect((await box(panel)).top).toBeGreaterThan(summary.top);
  });
});

test.describe("listSummaryWhenOpen", () => {
  test('"hide" drops the summary while the row is open and brings it back', async ({
    page,
  }) => {
    await mountGrid(
      page,
      `{
        idProperty: "id",
        columns: ${COLUMNS},
        dataSource: ${ROWS},
        allowMobileTransform: true,
        mobileTransform: {
          listFieldIds: ["zone"],
          listSummaryWhenOpen: "hide",
        },
      }`
    );
    const row = page.locator("#fixture .tdg-mobile-row").first();
    const summary = row.locator(".tdg-mobile-row-summary");

    await expect(summary).toHaveCount(1);
    await row.locator(".tdg-mobile-row-expand").click();
    await expect(row.locator('[data-slot="mobile-row-fields"]')).toBeVisible();
    await expect(summary).toHaveCount(0);

    await row.locator(".tdg-mobile-row-expand").click();
    await expect(summary).toHaveCount(1);
  });
});

test.describe("disabled rows", () => {
  test("can still be opened, though nothing on them can be acted on", async ({
    page,
  }) => {
    await mountGrid(
      page,
      `{
        idProperty: "id",
        columns: ${COLUMNS},
        dataSource: ${ROWS},
        checkboxColumn: true,
        disabledRows: { 0: true },
        allowMobileTransform: true,
        mobileTransform: { listFieldIds: ["zone"] },
      }`
    );
    const row = page.locator("#fixture .tdg-mobile-row").first();
    await expect(row).toHaveAttribute("data-disabled", "true");

    /*
     * The row takes `pointer-events: none` so its checkbox and actions are
     * inert. That must not take the control that only reveals things with it:
     * a row nobody can open is a row nobody can read.
     */
    await row.locator(".tdg-mobile-row-expand").click();
    await expect(row.locator('[data-slot="mobile-row-fields"]')).toBeVisible();
  });
});

test.describe("duplicate row ids", () => {
  test("warns once, naming the idProperty that produced them", async ({
    page,
  }) => {
    const warnings: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "warning") warnings.push(message.text());
    });

    await mountGrid(
      page,
      `{
        idProperty: "zone",
        columns: ${COLUMNS},
        dataSource: [
          { id: "a", name: "Alpha", zone: "north" },
          { id: "b", name: "Bravo", zone: "north" },
          { id: "c", name: "Carol", zone: "north" },
        ],
        allowMobileTransform: true,
        mobileTransform: { listFieldIds: ["name"] },
      }`
    );
    await expect(page.locator("#fixture .tdg-mobile-row")).not.toHaveCount(0);

    const duplicates = warnings.filter((text) =>
      text.includes("duplicate row id")
    );
    // Two rows share "north", but the id is named once, not once per row.
    expect(duplicates).toHaveLength(1);
    expect(duplicates[0]).toContain('"north"');
    expect(duplicates[0]).toContain('"zone"');
  });
});

test.describe("maxHeight", () => {
  test("still renders rows after the grid has been hidden and shown again", async ({
    page,
  }) => {
    await mountGrid(
      page,
      `{
        idProperty: "id",
        columns: ${COLUMNS},
        dataSource: ${ROWS},
        maxHeight: 300,
        minHeight: 300,
        allowMobileTransform: true,
        mobileTransform: { scroll: "container", overflow: "none" },
      }`,
      "position:fixed;inset:20px"
    );
    const rows = page.locator("#fixture .tdg-mobile-row");
    await expect(rows).toHaveCount(2);

    /*
     * Under `maxHeight` the root's own height is `auto`, so anything below it
     * sized by percentage has nothing definite to resolve against. Hiding the
     * grid resets the virtualiser's measurements to zero, and the chain then
     * deadlocks there: the scrollport needs content to have height, the content
     * needs a scrollport to be rendered. A tab switch is what does this in
     * practice.
     */
    await page.evaluate(() => {
      const host = document.getElementById("fixture") as HTMLElement;
      host.style.display = "none";
    });
    await expect(rows).toHaveCount(0);

    await page.evaluate(() => {
      const host = document.getElementById("fixture") as HTMLElement;
      host.style.display = "";
    });
    await expect(rows).toHaveCount(2);
    expect((await box(page.locator("#fixture .tdg-frame"))).bottom).toBeGreaterThan(
      (await box(page.locator("#fixture .tdg-frame"))).top
    );
  });
});
