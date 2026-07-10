import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

function viteFsUrl(filePath: string): string {
  return `/@fs${resolve(process.cwd(), filePath)}`;
}

test("published core and search entries share a working search runtime", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  const coreUrl = viteFsUrl("dist/index.js");
  const reactDomUrl = viteFsUrl("node_modules/.vite/deps/react-dom_client.js");
  const reactUrl = viteFsUrl("node_modules/.vite/deps/react.js");
  const searchUrl = viteFsUrl("dist/search.js");

  await page.goto("/");
  await page.setContent('<div id="published-search-root"></div>');
  await page.addScriptTag({
    type: "module",
    content: `
      import React from ${JSON.stringify(reactUrl)};
      import ReactDOMClient from ${JSON.stringify(reactDomUrl)};
      import ReactDataGrid from ${JSON.stringify(coreUrl)};
      import {
        RDGSearchBar,
        RDGSearchProvider,
      } from ${JSON.stringify(searchUrl)};

      const rows = [
        { id: 1, name: "Ada", city: "London" },
        { id: 2, name: "Grace", city: "Paris" },
        { id: 3, name: "Linus", city: "Helsinki" },
      ];
      const columns = [
        { name: "id", header: "ID" },
        { name: "name", header: "Name" },
        { name: "city", header: "City" },
      ];

      function PublishedSearchSmoke() {
        const [count, setCount] = React.useState(rows.length);

        return React.createElement(
          RDGSearchProvider,
          null,
          React.createElement("output", { "data-testid": "published-count" }, String(count)),
          React.createElement(RDGSearchBar, { debounceMs: 0 }),
          React.createElement(ReactDataGrid, {
            columns,
            dataSource: rows,
            filteredRowsCount: setCount,
            idProperty: "id",
            virtualized: false,
          })
        );
      }

      ReactDOMClient.createRoot(document.getElementById("published-search-root")).render(
        React.createElement(PublishedSearchSmoke)
      );
    `,
  });

  const search = page.getByRole("searchbox", { name: "Search all fields" });
  const searchRoot = page.locator('[data-slot="rdg-search-bar"]');
  await expect(search).toBeVisible();
  await expect(page.getByTestId("published-count")).toHaveText("3");

  await search.fill("city:paris");
  await expect(page.getByTestId("published-count")).toHaveText("1");
  await expect(page.getByText("Grace", { exact: true })).toBeVisible();

  const publishedStyles = await searchRoot.evaluate((root) => {
    const input = root.querySelector<HTMLInputElement>('[role="searchbox"]');
    const control = input?.parentElement;
    if (!input || !control) return null;

    const inputStyle = getComputedStyle(input);
    const controlStyle = getComputedStyle(control);
    const rootStyle = getComputedStyle(root);
    return {
      appearance: inputStyle.appearance,
      backgroundColor: controlStyle.backgroundColor,
      borderWidth: inputStyle.borderLeftWidth,
      flexGrow: rootStyle.flexGrow,
    };
  });

  expect(publishedStyles).not.toBeNull();
  expect(publishedStyles?.appearance).toBe("none");
  expect(publishedStyles?.backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
  expect(publishedStyles?.borderWidth).toBe("0px");
  expect(publishedStyles?.flexGrow).toBe("0");
  expect(pageErrors).toEqual([]);
});
