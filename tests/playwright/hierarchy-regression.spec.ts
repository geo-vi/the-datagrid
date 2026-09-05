// Advanced hierarchy regressions: owned by the master-detail task.
import { expect, test, type Locator, type Page } from "@playwright/test";
import { viteFsUrl } from "./helpers/vite-fs-url";

type RegressionState = {
  patch: (props: Record<string, unknown>) => void;
  events: Array<Record<string, unknown>>;
  counts: number[];
  requests: Array<Record<string, unknown>>;
};

async function mountGrid(page: Page, scenario = "mount({});") {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/examples/hierarchy");
  await expect(page.getByTestId("hierarchy-showcase")).toBeVisible();
  await page.evaluate(() => {
    document.getElementById("root")!.style.display = "none";
    const fixture = document.createElement("div");
    fixture.id = "hierarchy-regression-root";
    fixture.style.cssText =
      "position:fixed;inset:20px;background:white;z-index:1000";
    document.body.append(fixture);
  });
  await page.addScriptTag({
    type: "module",
    content: `
      import React from ${JSON.stringify(viteFsUrl("node_modules/.vite/deps/react.js"))};
      import ReactDOMClient from ${JSON.stringify(viteFsUrl("node_modules/.vite/deps/react-dom_client.js"))};
      import ReactDataGrid from ${JSON.stringify(viteFsUrl("src/ReactDataGrid.tsx"))};
      const fixture = window.__hierarchyRegression = { events: [], counts: [], requests: [] };
      const rows = [{ id: 42, name: "Alpha" }, { id: 43, name: "Beta" }, { id: 44, name: "Gamma" }];
      const columns = [{ name: "name", header: "Name", width: 350 }, { name: "id", header: "ID", width: 130, type: "number" }];
      const root = ReactDOMClient.createRoot(document.getElementById("hierarchy-regression-root"));
      let current = {
        columns, dataSource: rows, idProperty: "id", theme: "default",
        style: { height: 430, width: 760 }, rowHeight: 40, minRowHeight: 40,
        pagination: false, virtualized: true, allowMobileTransform: false,
        enableFiltering: true, defaultFilterValue: [], nativeScroll: true,
        enableRowExpand: true,
        renderRowDetails: info => React.createElement("div", { "data-testid": "detail-" + info.id, style: { height: "100%" } }, "Details for " + info.id),
        rowExpandHeight: 180,
        filteredRowsCount: count => fixture.counts.push(count),
        onRowExpand: info => { fixture.events.push({ kind: "expand", ...info }); },
        onRowCollapse: info => { fixture.events.push({ kind: "collapse", ...info }); },
        onRowExpandChange: info => { fixture.events.push({ kind: "propose", ...info }); },
        onExpandedRowsChange: info => { fixture.events.push({ kind: "commit", ...info }); },
      };
      function mount(props) {
        current = { ...current, ...props };
        root.render(React.createElement(ReactDataGrid, current));
      }
      fixture.patch = mount;
      ${scenario}
    `,
  });
  await expect(
    grid(page).locator('[data-slot="grid-row"]').first()
  ).toBeVisible();
}

const grid = (page: Page) => page.locator("#hierarchy-regression-root");

test("tree controls resolve ID-only columns and legacy column names", async ({
  page,
}) => {
  await mountGrid(
    page,
    `mount({
    enableRowExpand: false, renderRowDetails: undefined, treeEnabled: true,
    columns: [{ id: "label", header: "Label", width: 300 }],
    dataSource: [{ id: "root", label: "Root", nodes: [{ id: "child", label: "Child" }] }],
  });`
  );
  await grid(page).getByRole("button", { name: "Expand node root" }).click();
  await expect(grid(page).locator('[data-row-id="root/child"]')).toHaveCount(1);
  await page.evaluate(() =>
    (
      window as typeof window & { __hierarchyRegression: RegressionState }
    ).__hierarchyRegression.patch({
      columns: [
        { id: "label", name: "displayName", header: "Label", width: 300 },
      ],
      treeColumn: "displayName",
    })
  );
  await expect(
    grid(page).getByRole("button", { name: "Collapse node root" })
  ).toBeVisible();
});
const row = (page: Page, id: string | number) =>
  grid(page).locator(`[data-slot="grid-row"][data-row-id="${id}"]`);
const panel = (page: Page, id: string | number) =>
  grid(page).locator(`[data-slot="row-details"][data-row-id="${id}"]`);

async function toggle(page: Page, id: string | number) {
  await row(page, id)
    .getByRole("button", { name: /row details/ })
    .click();
}

async function expectAdjacent(
  master: Locator,
  detail: Locator,
  next: Locator,
  total: number
) {
  await expect(master).toBeVisible();
  await expect(detail).toBeVisible();
  await expect(next).toBeVisible();
  await expect
    .poll(async () => {
      const [a, b, c] = await Promise.all([
        master.boundingBox(),
        detail.boundingBox(),
        next.boundingBox(),
      ]);
      return a && b && c
        ? Math.max(
            Math.abs(c.y - a.y - total),
            a.y + a.height - b.y,
            b.y + b.height - c.y
          )
        : 999;
    })
    .toBeLessThanOrEqual(1);
}

test("numeric IDs retain their type and row expansion veto prevents all later callbacks", async ({
  page,
}) => {
  await mountGrid(
    page,
    `mount({ onRowExpand: info => {
    fixture.events.push({ kind: "expand", ...info });
    return info.id !== 42;
  }});`
  );
  await toggle(page, 42);
  await expect(panel(page, 42)).toHaveCount(0);
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { __hierarchyRegression: RegressionState })
          .__hierarchyRegression.events
    )
  ).toEqual([
    { kind: "expand", id: 42, index: 0, data: { id: 42, name: "Alpha" } },
  ]);
  await toggle(page, 43);
  await expect(panel(page, 43)).toBeVisible();
  const events = await page.evaluate(
    () =>
      (window as unknown as { __hierarchyRegression: RegressionState })
        .__hierarchyRegression.events
  );
  expect(events.map((event) => [event.kind, event.id])).toEqual([
    ["expand", 42],
    ["expand", 43],
    ["propose", 43],
    ["commit", 43],
  ]);
  expect(events.at(-1)).toMatchObject({
    expandedRows: { 43: true },
    rowExpanded: true,
  });
  await toggle(page, 43);
  await expect(panel(page, 43)).toHaveCount(0);
});

test("expand-all defaults preserve collapse exceptions through close and reopen", async ({
  page,
}) => {
  await mountGrid(
    page,
    `mount({ defaultExpandedRows: true, defaultCollapsedRows: { 43: true }, rowExpandHeight: 100 });`
  );
  await expect(panel(page, 42)).toBeVisible();
  await expect(panel(page, 43)).toHaveCount(0);
  await expect(panel(page, 44)).toBeVisible();
  await toggle(page, 42);
  await expect(panel(page, 42)).toHaveCount(0);
  await toggle(page, 43);
  await expect(panel(page, 43)).toBeVisible();
  const commits = await page.evaluate(() =>
    (
      window as unknown as { __hierarchyRegression: RegressionState }
    ).__hierarchyRegression.events.filter((event) => event.kind === "commit")
  );
  expect(commits[0]).toMatchObject({
    expandedRows: true,
    collapsedRows: { 42: true, 43: true },
    rowExpanded: false,
  });
  expect(commits[1]).toMatchObject({
    expandedRows: true,
    collapsedRows: { 42: true },
    rowExpanded: true,
  });
});

test("controlled expand-all maps wait for collapse-exception acceptance", async ({
  page,
}) => {
  await mountGrid(
    page,
    `mount({ expandedRows: true, collapsedRows: { 43: true }, rowExpandHeight: 100 });`
  );
  await toggle(page, 42);
  await expect(panel(page, 42)).toBeVisible();
  const proposal = await page.evaluate(() =>
    (
      window as unknown as { __hierarchyRegression: RegressionState }
    ).__hierarchyRegression.events.find((event) => event.kind === "commit")
  );
  expect(proposal).toMatchObject({
    expandedRows: true,
    collapsedRows: { 42: true, 43: true },
  });
  await page.evaluate(() =>
    (
      window as unknown as { __hierarchyRegression: RegressionState }
    ).__hierarchyRegression.patch({ collapsedRows: { 42: true, 43: true } })
  );
  await expect(panel(page, 42)).toHaveCount(0);
  await expect(panel(page, 44)).toBeVisible();
});

test("virtual detail offsets follow stable IDs after sorting and scrolling through 80 rows", async ({
  page,
}) => {
  await mountGrid(
    page,
    `const manyRows = Array.from({ length: 80 }, (_, index) => ({ id: index, name: "Record " + String(79 - index).padStart(2, "0") }));
    mount({ dataSource: manyRows, defaultExpandedRows: { 1: true, 76: true }, rowExpandHeight: ({ data }) => data.id === 1 ? 240 : 180 });`
  );
  await expectAdjacent(row(page, 1), panel(page, 1), row(page, 2), 240);
  await grid(page)
    .locator('.tdg-header-cell[data-column-id="name"]')
    .getByText("Name", { exact: true })
    .click();
  await expect(row(page, 79)).toBeVisible();
  await expectAdjacent(row(page, 76), panel(page, 76), row(page, 75), 180);
  const viewport = grid(page).locator(".tdg-body-viewport").first();
  await viewport.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await expect(row(page, 0)).toBeVisible();
  await expectAdjacent(row(page, 1), panel(page, 1), row(page, 0), 240);
  await viewport.evaluate((element) => {
    element.scrollTop = 0;
  });
  await expectAdjacent(row(page, 76), panel(page, 76), row(page, 75), 180);
});

for (const virtualized of [true, false]) {
  test(`natural-height masters and their details remain adjacent with virtualized=${virtualized}`, async ({
    page,
  }) => {
    await mountGrid(
      page,
      `mount({ virtualized: ${virtualized}, rowHeight: null, defaultExpandedRows: { 42: true }, rowExpandHeight: 200,
    columns: [{ name: "name", header: "Name", width: 350, render: ({ value }) => React.createElement("div", { style: { height: 75 } }, value) }] });`
    );
    await expectAdjacent(row(page, 42), panel(page, 42), row(page, 43), 200);
    await toggle(page, 42);
    await expect(panel(page, 42)).toHaveCount(0);
    await toggle(page, 42);
    await expectAdjacent(row(page, 42), panel(page, 42), row(page, 43), 200);
  });
}

test("tree and detail expansion coexist while preserving node identity and record counts", async ({
  page,
}) => {
  await mountGrid(
    page,
    `const nested = [{ id: "root", name: "Root", nodes: [{ id: "child", name: "Child" }, { id: "sibling", name: "Sibling" }] }, { id: "last", name: "Last" }];
    mount({ dataSource: nested, treeEnabled: true, treeColumn: "name", defaultExpandedNodes: { root: true } });`
  );
  await expect(row(page, "root/child")).toBeVisible();
  await toggle(page, "root/child");
  await expectAdjacent(
    row(page, "root/child"),
    panel(page, "root/child"),
    row(page, "root/sibling"),
    180
  );
  await row(page, "root")
    .getByRole("button", { name: "Collapse node root", exact: true })
    .click();
  await expect(row(page, "root/child")).toHaveCount(0);
  await row(page, "root")
    .getByRole("button", { name: "Expand node root", exact: true })
    .click();
  await expect(panel(page, "root/child")).toBeVisible();
  expect(
    await page.evaluate(() =>
      (
        window as unknown as { __hierarchyRegression: RegressionState }
      ).__hierarchyRegression.counts.at(-1)
    )
  ).toBe(4);
});

test("remote dataSource receives stable request props without the generated detail column", async ({
  page,
}) => {
  await mountGrid(
    page,
    `mount({ dataSource: args => {
    fixture.requests.push({ keys: Object.keys(args), columnOrder: args.columnOrder, columns: args.columns.map(column => column.name), idProperty: args.idProperty, theme: args.theme, sortInfo: args.sortInfo, filterValue: args.filterValue });
    return Promise.resolve({ data: rows, count: rows.length });
  }});`
  );
  await toggle(page, 42);
  await expect(panel(page, 42)).toBeVisible();
  await grid(page)
    .locator('.tdg-header-cell[data-column-id="name"]')
    .getByText("Name", { exact: true })
    .click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as { __hierarchyRegression: RegressionState })
            .__hierarchyRegression.requests.length
      )
    )
    .toBeGreaterThan(1);
  const requests = await page.evaluate(
    () =>
      (window as unknown as { __hierarchyRegression: RegressionState })
        .__hierarchyRegression.requests
  );
  for (const request of requests) {
    expect(request.keys).toEqual(
      expect.arrayContaining([
        "sortInfo",
        "filterValue",
        "columnOrder",
        "columns",
        "idProperty",
        "theme",
      ])
    );
    expect(request.columns).toEqual(["name", "id"]);
    expect(request.columnOrder).toEqual(["name", "id"]);
    expect(request.idProperty).toBe("id");
    expect(request.theme).toBe("default");
  }
  expect(requests.at(-1)?.sortInfo).toMatchObject({ name: "name", dir: 1 });
});

test("static Promise tree sources retain matching ancestors and report all retained nodes", async ({
  page,
}) => {
  await mountGrid(
    page,
    `const nested = [{ id: "root", name: "Root", nodes: [{ id: "hit", name: "Needle" }, { id: "miss", name: "Other" }] }, { id: "last", name: "Last" }];
    mount({ dataSource: Promise.resolve(nested), treeEnabled: true, treeColumn: "name", enableRowExpand: false, renderRowDetails: undefined,
      defaultFilterValue: [{ name: "name", operator: "contains", type: "string", value: "Needle" }] });`
  );
  await expect(row(page, "root")).toBeVisible();
  await expect(row(page, "root/hit")).toBeVisible();
  await expect(grid(page).locator('[data-slot="grid-row"]')).toHaveCount(2);
  expect(
    await page.evaluate(() =>
      (
        window as unknown as { __hierarchyRegression: RegressionState }
      ).__hierarchyRegression.counts.at(-1)
    )
  ).toBe(2);
});
