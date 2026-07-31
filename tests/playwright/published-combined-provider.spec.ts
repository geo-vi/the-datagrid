import { expect, test } from "@playwright/test";

import { viteFsUrl } from "./helpers/vite-fs-url";

test("published combined provider shares legacy search and visibility contexts", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  const columnVisibilityUrl = viteFsUrl("dist/column-visibility.js");
  const componentsUrl = viteFsUrl("dist/components.js");
  const coreUrl = viteFsUrl("dist/index.js");
  const reactDomUrl = viteFsUrl("node_modules/.vite/deps/react-dom_client.js");
  const reactUrl = viteFsUrl("node_modules/.vite/deps/react.js");
  const searchUrl = viteFsUrl("dist/search.js");

  await page.goto("/");
  await page.setContent('<div id="published-combined-provider-root"></div>');
  await page.addScriptTag({
    type: "module",
    content: `
      import React from ${JSON.stringify(reactUrl)};
      import ReactDOMClient from ${JSON.stringify(reactDomUrl)};
      import ReactDataGrid from ${JSON.stringify(coreUrl)};
      import { RDGProvider, RDGTarget } from ${JSON.stringify(componentsUrl)};
      import { RDGSearchBar } from ${JSON.stringify(searchUrl)};
      import { RDGColumnVisibilityToolbar } from ${JSON.stringify(columnVisibilityUrl)};

      const columns = [
        { name: "name", header: "Name" },
        { name: "city", header: "City" },
      ];
      const rows = [
        { id: 1, name: "Ada Lovelace", city: "London" },
        { id: 2, name: "Grace Hopper", city: "New York" },
      ];

      function PublishedCombinedProviderSmoke() {
        return React.createElement(
          RDGProvider,
          null,
          React.createElement(RDGSearchBar, {
            ariaLabel: "Search published combined grid",
            debounceMs: 0,
          }),
          React.createElement(RDGColumnVisibilityToolbar, {
            title: "Published combined columns",
          }),
          React.createElement(
            "div",
            { style: { height: 280 } },
            React.createElement(
              RDGTarget,
              null,
              React.createElement(ReactDataGrid, {
                columns,
                dataSource: rows,
                idProperty: "id",
                showColumnMenuTool: false,
                virtualized: false,
              })
            )
          )
        );
      }

      ReactDOMClient.createRoot(
        document.getElementById("published-combined-provider-root")
      ).render(React.createElement(PublishedCombinedProviderSmoke));
    `,
  });

  const grid = page.locator(".InovuaReactDataGrid.tdg-root");
  const rows = grid.locator('[data-slot="grid-row"]');
  const search = page.getByRole("searchbox", {
    name: "Search published combined grid",
  });
  const cityToggle = page.locator(
    '[data-slot="rdg-column-toggle"][data-column-id="city"]'
  );
  const cityHeader = grid.locator(
    '[data-slot="grid-header-cell"][data-column-id="city"]'
  );
  const cityCells = grid.locator(
    '[data-slot="grid-row"] [data-column-id="city"]'
  );

  await expect(grid).toHaveCount(1);
  await expect(search).toHaveCount(1);
  await expect(cityToggle).toHaveAttribute("aria-pressed", "true");
  await expect(cityHeader).toBeVisible();
  await expect(rows).toHaveCount(2);

  await search.fill("Grace Hopper");

  await expect(rows).toHaveCount(1);
  await expect(grid.getByText("Grace Hopper", { exact: true })).toBeVisible();

  await cityToggle.click();

  await expect(cityToggle).toHaveAttribute("aria-pressed", "false");
  await expect(cityHeader).toHaveCount(0);
  await expect(cityCells).toHaveCount(0);

  await search.fill("London");

  await expect(rows).toHaveCount(1);
  await expect(grid.getByText("Ada Lovelace", { exact: true })).toBeVisible();
  await expect(grid.getByText("London", { exact: true })).toHaveCount(0);
  expect(pageErrors).toEqual([]);
});
