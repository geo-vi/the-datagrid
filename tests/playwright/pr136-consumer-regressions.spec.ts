import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Locator, type Page } from "@playwright/test";

import { viteFsUrl } from "./helpers/vite-fs-url";

// PR #136 consumer regressions: the regression-tests agent owns this fixture;
// the coordinating task owns the implementation it exercises.
const HOST_CSS = `
  @layer theme, base, components, utilities;
  @layer base {
    button { background: transparent; border: 0; padding: 0; }
  }
  @layer utilities {
    .host-button {
      background: rgb(25 88 220);
      color: rgb(255 255 255);
      border: 2px solid rgb(16 54 139);
      padding: 8px 16px;
    }
    .host-button:hover { background: rgb(16 54 139); }
  }
`;

async function mountConsumer(
  page: Page,
  gridProps: string,
  options: { hostOrder?: "before" | "after"; extraCss?: string } = {}
) {
  const packageCss = readFileSync(
    resolve(process.cwd(), "dist/index.css"),
    "utf8"
  );
  const hostStyle = options.hostOrder ? `<style>${HOST_CSS}</style>` : "";
  const packageStyle = `<style>${packageCss}</style>`;
  const styles =
    options.hostOrder === "before"
      ? hostStyle + packageStyle
      : packageStyle + hostStyle;

  // Starting with the examples page would leave its global Tailwind CSS and
  // layer declarations behind, hiding the consumer stylesheet-order regression.
  await page.route("**/__pr136-consumer", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<!doctype html><html><head>${styles}
      <style>${options.extraCss ?? ""}</style></head><body>
      <button id="outside-grid" class="host-button">Host action</button>
      <div id="consumer-grid" style="height:600px"></div>
      <output id="action-result"></output>
    </body></html>`,
    })
  );
  await page.goto("/__pr136-consumer");
  await page.addScriptTag({
    type: "module",
    content: `
      import React from ${JSON.stringify(viteFsUrl("node_modules/.vite/deps/react.js"))};
      import ReactDOMClient from ${JSON.stringify(viteFsUrl("node_modules/.vite/deps/react-dom_client.js"))};
      import ReactDataGrid from ${JSON.stringify(viteFsUrl("dist/index.js"))};

      ReactDOMClient.createRoot(document.getElementById("consumer-grid")).render(
        React.createElement(ReactDataGrid, ${gridProps})
      );
    `,
  });
  await expect(page.locator("#consumer-grid .tdg-root")).toBeVisible();
}

async function buttonStyles(button: Locator) {
  return button.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      background: style.backgroundColor,
      color: style.color,
      border: style.borderTopWidth,
      borderStyle: style.borderTopStyle,
      paddingInline: style.paddingLeft,
      paddingBlock: style.paddingTop,
    };
  });
}

for (const hostOrder of ["before", "after"] as const) {
  test(`consumer button styles survive host Tailwind layers ${hostOrder} package CSS`, async ({
    page,
  }) => {
    await mountConsumer(
      page,
      `{
      idProperty: "id",
      columns: [
        { name: "name", header: "Name" },
        { name: "actions", header: "Actions", render: () => React.createElement(
          "button", { className: "host-button" }, "Grid action"
        ) },
      ],
      dataSource: [{ id: 1, name: "Ada" }],
      virtualized: false,
    }`,
      { hostOrder }
    );

    const gridButton = page.getByRole("button", {
      name: "Grid action",
      exact: true,
    });
    const hostButton = page.getByRole("button", {
      name: "Host action",
      exact: true,
    });
    const expected = {
      background: "rgb(25, 88, 220)",
      color: "rgb(255, 255, 255)",
      border: "2px",
      borderStyle: "solid",
      paddingInline: "16px",
      paddingBlock: "8px",
    };

    await expect(gridButton).toBeVisible();
    expect(await buttonStyles(gridButton)).toEqual(expected);
    expect(await buttonStyles(hostButton)).toEqual(expected);
    await gridButton.hover();
    await expect(gridButton).toHaveCSS("background-color", "rgb(16, 54, 139)");
    expect(await buttonStyles(hostButton)).toEqual(expected);
    await hostButton.hover();
    await expect(hostButton).toHaveCSS("background-color", "rgb(16, 54, 139)");
    expect(await buttonStyles(gridButton)).toEqual(expected);
  });
}

test("mobile detail exclusion preserves the explicitly selected summary field", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mountConsumer(
    page,
    `{
    idProperty: "id",
    columns: [
      { name: "name", header: "Name", mobileRole: "primary" },
      { name: "zone", header: "Zone", mobileDetail: "never" },
      { name: "city", header: "City" },
    ],
    dataSource: [{ id: 1, name: "Ada", zone: "North region", city: "London" }],
    allowMobileTransform: true,
    mobileTransform: {
      variant: "list", listFieldIds: ["zone"], listExpand: "chevron",
    },
    virtualized: false,
  }`
  );

  const row = page.locator("#consumer-grid .tdg-mobile-row").first();
  const summary = row.locator(".tdg-mobile-row-summary");
  await expect(summary).toContainText("North region");
  await row.locator(".tdg-mobile-row-expand").click();
  const detail = row.locator('[data-slot="mobile-row-fields"]');
  await expect(detail).toBeVisible();
  await expect(detail.locator("dt")).toHaveText(["Name", "City"]);
  await expect(detail.locator("dd")).toHaveText(["Ada", "London"]);
  await expect(summary).toContainText("North region");
});

async function primaryColors(button: Locator) {
  return button.evaluate((element) => {
    const context = document.createElement("canvas").getContext("2d")!;
    const rgba = (color: string) => {
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = color;
      context.fillRect(0, 0, 1, 1);
      return Array.from(context.getImageData(0, 0, 1, 1).data);
    };
    const style = getComputedStyle(element);
    return {
      foreground: rgba(style.color),
      background: rgba(style.backgroundColor),
    };
  });
}

function contrast(foreground: number[], background: number[]) {
  const luminance = (rgb: number[]) =>
    rgb.slice(0, 3).reduce((sum, channel, index) => {
      const value = channel / 255;
      const linear =
        value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
      return sum + linear * [0.2126, 0.7152, 0.0722][index]!;
    }, 0);
  const values = [luminance(foreground), luminance(background)].sort(
    (a, b) => b - a
  );
  return (values[0]! + 0.05) / (values[1]! + 0.05);
}

for (const theme of ["blue-dark", "default-dark"]) {
  test(`${theme} keeps readable primary text and accepts a consumer foreground override`, async ({
    page,
  }) => {
    await mountConsumer(
      page,
      `{
      theme: ${JSON.stringify(theme)},
      idProperty: "id",
      columns: [{ name: "actions", header: "Actions", render: () => React.createElement(
        "button", { className: "bg-primary text-primary-foreground px-4 py-2" }, "Primary action"
      ) }],
      dataSource: [{ id: 1 }],
      virtualized: false,
    }`
    );
    const button = page.getByRole("button", {
      name: "Primary action",
      exact: true,
    });
    await expect(button).toBeVisible();
    const colors = await primaryColors(button);
    expect(colors.foreground[3]).toBe(255);
    expect(colors.background[3]).toBe(255);
    if (theme === "blue-dark") {
      expect(Math.min(...colors.foreground.slice(0, 3))).toBeGreaterThan(240);
    } else {
      expect(Math.max(...colors.foreground.slice(0, 3))).toBeLessThan(60);
    }
    expect(
      contrast(colors.foreground, colors.background)
    ).toBeGreaterThanOrEqual(4.5);

    await page.addStyleTag({
      content: `
      .tdg-root[data-theme="${theme}"] { --tdg-color-primary-foreground: rgb(255 240 180); }
    `,
    });
    await expect(button).toHaveCSS("color", "rgb(255, 240, 180)");
  });
}

test("mobile toolbar actions render and work through mobileTransform", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mountConsumer(
    page,
    `{
    idProperty: "id",
    columns: [{ name: "name", header: "Name" }],
    dataSource: [{ id: 1, name: "Ada" }],
    allowMobileTransform: true,
    mobileTransform: {
      variant: "list",
      toolbarActions: React.createElement("button", {
        type: "button",
        onClick: () => { document.getElementById("action-result").textContent = "Exported"; },
      }, "Export records"),
    },
    virtualized: false,
  }`
  );
  const toolbar = page.locator('[data-slot="mobile-toolbar"]');
  const action = toolbar.getByRole("button", {
    name: "Export records",
    exact: true,
  });
  await expect(action).toBeVisible();
  await action.click();
  await expect(page.locator("#action-result")).toHaveText("Exported");
});
