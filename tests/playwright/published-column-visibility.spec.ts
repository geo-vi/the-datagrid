import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

function viteFsUrl(filePath: string): string {
  return `/@fs${resolve(process.cwd(), filePath)}`;
}

test("published core and column-visibility entries hide and show a column", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  const columnVisibilityUrl = viteFsUrl("dist/column-visibility.js");
  const coreUrl = viteFsUrl("dist/index.js");
  const reactDomUrl = viteFsUrl("node_modules/.vite/deps/react-dom_client.js");
  const reactUrl = viteFsUrl("node_modules/.vite/deps/react.js");

  await page.goto("/");
  await page.setContent('<div id="published-column-visibility-root"></div>');
  await page.addScriptTag({
    type: "module",
    content: `
      import React from ${JSON.stringify(reactUrl)};
      import ReactDOMClient from ${JSON.stringify(reactDomUrl)};
      import ReactDataGrid from ${JSON.stringify(coreUrl)};
      import {
        RDGColumnVisibilityProvider,
        RDGColumnVisibilityToolbar,
      } from ${JSON.stringify(columnVisibilityUrl)};

      const columns = [
        { name: "name", header: "Name" },
        { name: "city", header: "City", defaultVisible: false },
      ];
      const rows = [
        { id: 1, name: "Ada", city: "London" },
        { id: 2, name: "Grace", city: "New York" },
      ];

      function PublishedColumnVisibilitySmoke() {
        return React.createElement(
          RDGColumnVisibilityProvider,
          null,
          React.createElement(RDGColumnVisibilityToolbar, {
            title: "Visible columns",
          }),
          React.createElement(ReactDataGrid, {
            columns,
            dataSource: rows,
            idProperty: "id",
            showColumnMenuTool: false,
            virtualized: false,
          })
        );
      }

      ReactDOMClient.createRoot(
        document.getElementById("published-column-visibility-root")
      ).render(React.createElement(PublishedColumnVisibilitySmoke));
    `,
  });

  const toolbar = page.locator('[data-slot="rdg-column-visibility"]');
  const cityToggle = toolbar.locator(
    '[data-slot="rdg-column-toggle"][data-column-id="city"]'
  );
  const cityHeader = page.locator(
    '[data-slot="grid-header-cell"][data-column-id="city"]'
  );

  await expect(toolbar).toBeVisible();
  await expect(cityToggle).toHaveAccessibleName("City");
  await expect(cityToggle).toHaveAttribute("aria-pressed", "false");
  await expect(cityHeader).toHaveCount(0);

  await cityToggle.click();

  await expect(cityToggle).toHaveAttribute("aria-pressed", "true");
  await expect(cityHeader).toBeVisible();

  await cityToggle.click();

  await expect(cityToggle).toHaveAttribute("aria-pressed", "false");
  await expect(cityHeader).toHaveCount(0);
  expect(pageErrors).toEqual([]);
});
