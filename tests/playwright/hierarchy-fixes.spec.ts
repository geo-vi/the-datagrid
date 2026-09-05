// Merge review regressions; hierarchy fixes task owns this fixture and suite.
import { expect, test, type Locator, type Page } from "@playwright/test";
import type { TypeComputedProps } from "../../src/types";
import { viteFsUrl } from "./helpers/vite-fs-url";

type FixesWindow = typeof window & {
  __hierarchyFixes: {
    api: { current: TypeComputedProps };
    patch: (props: Record<string, unknown>) => void;
    render: () => void;
    events: { rowId: string; value: unknown }[];
    rowFields: string[];
    cellFields: string[];
    source: {
      id: string;
      name: string;
      children?: { id: string; name: string }[];
    }[];
  };
};

async function mount(page: Page, scenario: string, mobile = false) {
  await page.setViewportSize(
    mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 }
  );
  await page.goto("/examples/hierarchy");
  await expect(page.getByTestId("hierarchy-showcase")).toBeVisible();
  await page.evaluate(() => {
    document.getElementById("root")!.style.display = "none";
    const fixture = document.createElement("div");
    fixture.id = "hierarchy-fixes-root";
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
    const root = ReactDOMClient.createRoot(document.getElementById("hierarchy-fixes-root"));
      const fixture = window.__hierarchyFixes = { events: [] };
    let props = {
      theme: "default", idProperty: "id", rowHeight: 40, minRowHeight: 40,
      style: { height: 430, width: "100%", maxWidth: 760 }, virtualized: true,
      nativeScroll: true, pagination: false, allowMobileTransform: ${mobile},
      columns: [{ name: "name", header: "Name", width: 350 }],
      dataSource: [{ id: "a", name: "Alpha" }, { id: "b", name: "Beta" }, { id: "c", name: "Gamma" }],
      onReady: api => fixture.api = api,
      onEditComplete: info => fixture.events.push({ rowId: info.rowId, value: info.value }),
    };
    fixture.render = () => root.render(React.createElement(ReactDataGrid, props));
    fixture.patch = patch => { props = { ...props, ...patch }; fixture.render(); };
    const details = { enableRowExpand: true, renderRowDetails: info => React.createElement("div", { "data-testid": "fix-detail-" + info.id }, "Details for " + info.id), rowExpandHeight: 140 };
    ${scenario}
  `,
  });
  await expect(
    grid(page).locator('[data-slot="grid-row"]').first()
  ).toBeVisible();
}

const grid = (page: Page) => page.locator("#hierarchy-fixes-root");
const row = (page: Page, id: string) =>
  grid(page).locator(`[data-slot="grid-row"][data-row-id="${id}"]`);
const cell = (page: Page, id: string, column: string) =>
  row(page, id).locator(`[data-column-id="${column}"]`);

async function sameColumn(first: Locator, second: Locator) {
  await expect
    .poll(async () => {
      const [a, b] = await Promise.all([
        first.boundingBox(),
        second.boundingBox(),
      ]);
      return a && b ? Math.abs(a.x - b.x) + Math.abs(a.width - b.width) : 999;
    })
    .toBeLessThanOrEqual(1);
}

for (const virtualized of [false, true]) {
  test(`expanded details preserve spanning column alignment with virtualized=${virtualized}`, async ({
    page,
  }) => {
    await mount(
      page,
      `fixture.patch({ ...details, virtualized: ${virtualized},
      columns: [{ name: "group", header: "Group", width: 180, rowspan: ({ rowIndex }) => rowIndex === 0 ? 2 : 1 }, { name: "name", header: "Name", width: 260 }],
      dataSource: [{ id: "a", group: "One", name: "Alpha" }, { id: "b", group: "One", name: "Beta" }, { id: "c", group: "Two", name: "Gamma" }],
    });`
    );
    await sameColumn(cell(page, "a", "name"), cell(page, "b", "name"));
    await row(page, "a")
      .getByRole("button", { name: "Expand row details", exact: true })
      .click();
    await expect(cell(page, "a", "group")).toHaveAttribute("rowspan", "3");
    await sameColumn(cell(page, "a", "name"), cell(page, "b", "name"));
    const detailCell = grid(page)
      .getByTestId("fix-detail-a")
      .locator("xpath=../..");
    await sameColumn(detailCell, cell(page, "a", "name"));
    await expect(cell(page, "b", "group")).toHaveCount(0);
    await row(page, "a")
      .getByRole("button", { name: "Collapse row details", exact: true })
      .click();
    await expect(cell(page, "a", "group")).toHaveAttribute("rowspan", "2");
    await sameColumn(cell(page, "a", "name"), cell(page, "b", "name"));
  });

  test(`all-column rowspans retain visible details without an expander column with virtualized=${virtualized}`, async ({
    page,
  }) => {
    await mount(
      page,
      `fixture.patch({ ...details, virtualized: ${virtualized}, rowExpandColumn: false, defaultExpandedRows: { a: true },
      columns: [{ name: "name", header: "Name", width: 350, rowspan: ({ rowIndex }) => rowIndex === 0 ? 2 : 1 }],
    });`
    );
    await expect(grid(page).getByTestId("fix-detail-a")).toBeVisible();
    await expect(cell(page, "a", "name")).toHaveAttribute("rowspan", "1");
    await expect(cell(page, "b", "name")).toBeEmpty();
    await sameColumn(cell(page, "a", "name"), cell(page, "b", "name"));
    await sameColumn(
      cell(page, "a", "name"),
      grid(page).getByTestId("fix-detail-a").locator("xpath=../..")
    );
  });
}

for (const flag of ["absent", "false"] as const) {
  test(`${flag} feature flags leave tree-looking records and master renderers inactive`, async ({
    page,
  }) => {
    await mount(
      page,
      `fixture.patch({
      ${flag === "false" ? "treeEnabled: false, enableRowExpand: false," : ""}
      treeColumn: "name", expandedNodes: { a: true }, expandedRows: true,
      renderRowDetails: () => React.createElement("div", null, "Hidden detail content"),
      onRenderRow: row => fixture.rowFields = Object.keys(row),
      dataSource: [{ id: "a", name: "Alpha", nodes: [{ id: "child", name: "Child" }] }, { id: "b", name: "Beta" }],
      columns: [{ name: "name", header: "Name", width: 350, rowspan: ({ rowIndex }) => rowIndex === 0 ? 2 : 1,
        render: cell => { fixture.cellFields = Object.keys(cell); return cell.value; } }],
    });`
    );
    await expect(grid(page).locator('[data-slot="grid-row"]')).toHaveCount(2);
    await expect(
      grid(page).locator(
        '[data-slot="tree-toggle"], [data-slot="row-detail-toggle"], [data-slot="row-details"]'
      )
    ).toHaveCount(0);
    await expect(cell(page, "a", "name")).toHaveAttribute("rowspan", "2");
    await expect(cell(page, "b", "name")).toHaveCount(0);
    const fields = await page.evaluate(() => {
      const fixture = (window as FixesWindow).__hierarchyFixes;
      return { row: fixture.rowFields, cell: fixture.cellFields };
    });
    expect(fields.row).not.toContain("nodeProps");
    for (const field of [
      "nodeProps",
      "leafNode",
      "nodeCollapsed",
      "nodeLoading",
      "toggleNodeExpand",
      "rowExpanded",
      "toggleRowExpand",
    ]) {
      expect(fields.cell).not.toContain(field);
    }
    await expect(
      grid(page).getByText("Hidden detail content", { exact: true })
    ).toHaveCount(0);
  });

  test(`${flag} detail flag preserves a consumer __row_expander__ field in mobile cards`, async ({
    page,
  }) => {
    await mount(
      page,
      `fixture.patch({ ${flag === "false" ? "enableRowExpand: false," : ""}
      renderRowDetails: () => "Inactive", expandedRows: true,
      columns: [{ name: "name", header: "Name", width: 180 }, { name: "__row_expander__", header: "Legacy value", width: 180 }],
      dataSource: [{ id: "a", name: "Alpha", __row_expander__: "Consumer value remains visible" }],
    });`,
      true
    );
    await expect(grid(page).locator(".tdg-root")).toHaveAttribute(
      "data-layout",
      "mobile-list"
    );
    await expect(
      grid(page).getByText("Consumer value remains visible", { exact: true })
    ).toBeVisible();
    await expect(
      grid(page).locator(
        '[data-slot="row-detail-toggle"], [data-slot="row-details"]'
      )
    ).toHaveCount(0);
  });
}

test("imperative scrollToIndex and scrollToCell include expanded detail heights", async ({
  page,
}) => {
  await mount(
    page,
    `fixture.patch({ ...details, defaultExpandedRows: true, rowExpandHeight: 180,
    dataSource: Array.from({ length: 80 }, (_, id) => ({ id, name: "Row " + id })),
  });`
  );
  await page.evaluate(() =>
    (window as FixesWindow).__hierarchyFixes.api.current.scrollToIndex?.(40)
  );
  await expect(row(page, "40")).toBeVisible();
  await expect
    .poll(() =>
      grid(page)
        .locator(".tdg-body-viewport")
        .evaluate((element) => element.scrollTop)
    )
    .toBeCloseTo(7200, 0);
  await page.evaluate(() =>
    (window as FixesWindow).__hierarchyFixes.api.current.scrollToCell?.({
      rowIndex: 60,
      columnIndex: 1,
    })
  );
  await expect(row(page, "60")).toBeVisible();
});

const nestedScenario = `fixture.source = [{ id: "root", name: "Parent", children: [{ id: "child", name: "Original child" }, { id: "sibling", name: "Sibling" }] }, { id: "last", name: "Last" }];
fixture.patch({
  treeEnabled: true, treeColumn: "name", nodesProperty: "children", generateIdFromPath: true,
  defaultExpandedNodes: { root: true }, editable: true,
  columns: [{ name: "name", header: "Name", width: 350, editable: true }],
  dataSource: fixture.source,
});`;

test("editing a visible child emits its path ID and accepts published nested updates", async ({
  page,
}) => {
  await mount(page, nestedScenario);
  await cell(page, "root/child", "name").dblclick();
  const editor = grid(page).getByRole("textbox", { name: "Name", exact: true });
  await expect(editor).toBeVisible();
  await editor.fill("Edited child");
  await editor.press("Enter");
  await expect
    .poll(() =>
      page.evaluate(() => (window as FixesWindow).__hierarchyFixes.events)
    )
    .toEqual([{ rowId: "root/child", value: "Edited child" }]);
  await expect(cell(page, "root/child", "name")).toContainText(
    "Original child"
  );
  await page.evaluate(() =>
    (window as FixesWindow).__hierarchyFixes.api.current.setItemPropertyForId?.(
      "root/child",
      "name",
      "Edited child"
    )
  );
  await expect(cell(page, "root/child", "name")).toContainText("Edited child");
  await row(page, "root")
    .getByRole("button", { name: "Collapse node root", exact: true })
    .click();
  await row(page, "root")
    .getByRole("button", { name: "Expand node root", exact: true })
    .click();
  await expect(cell(page, "root/child", "name")).toContainText("Edited child");
  await page.evaluate(() =>
    (window as FixesWindow).__hierarchyFixes.api.current.reload()
  );
  await expect(cell(page, "root/child", "name")).toContainText(
    "Original child"
  );
  await expect(grid(page).locator('[data-slot="grid-row"]')).toHaveCount(4);
});

test("tree row setters preserve siblings and batching, and reload replaces external data", async ({
  page,
}) => {
  await mount(page, nestedScenario);
  await page.evaluate(() => {
    const api = (window as FixesWindow).__hierarchyFixes.api.current;
    api.setItemPropertyForId?.("root/child", "name", "Setter child");
    api.setItemPropertyAt?.(2, "name", "Setter sibling");
  });
  await expect(cell(page, "root/child", "name")).toContainText("Setter child");
  await expect(cell(page, "root/sibling", "name")).toContainText(
    "Setter sibling"
  );
  await page.evaluate(() =>
    (window as FixesWindow).__hierarchyFixes.api.current.setItemsAt?.(
      { 1: { name: "Batch child" }, 2: { name: "Batch sibling" } },
      { replace: false }
    )
  );
  await expect(cell(page, "root/child", "name")).toContainText("Batch child");
  await expect(cell(page, "root/sibling", "name")).toContainText(
    "Batch sibling"
  );
  await page.evaluate(() =>
    (window as FixesWindow).__hierarchyFixes.api.current.reload()
  );
  await expect(cell(page, "root/child", "name")).toContainText(
    "Original child"
  );
  await expect(cell(page, "root/sibling", "name")).toContainText("Sibling");
  await page.evaluate(() => {
    const fixture = (window as FixesWindow).__hierarchyFixes;
    fixture.source[0].children![0].name = "External nested update";
    fixture.api.current.reload();
  });
  await expect(cell(page, "root/child", "name")).toContainText(
    "External nested update"
  );
  await page.evaluate(() =>
    (window as FixesWindow).__hierarchyFixes.patch({
      dataSource: [
        {
          id: "root",
          name: "Replacement parent",
          children: [{ id: "child", name: "Replacement child" }],
        },
      ],
    })
  );
  await expect(cell(page, "root/child", "name")).toContainText(
    "Replacement child"
  );
  await expect(row(page, "root/sibling")).toHaveCount(0);
});
