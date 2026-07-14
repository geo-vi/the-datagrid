import { expect, test, type Page } from "@playwright/test";

async function documentGeometry(page: Page) {
  return page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
    windowScrollY: window.scrollY,
  }));
}

test.describe("documentation shell UI", () => {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1024, height: 768 },
    { width: 390, height: 844 },
    { width: 320, height: 568 },
  ]) {
    test(`contains scrolling at ${viewport.width}x${viewport.height}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.goto("/docs/reference/reactdatagrid");

      const content = page.getByTestId("docs-content");
      await expect(content).toBeVisible();
      await expect
        .poll(() =>
          content.evaluate(
            (element) => element.scrollHeight > element.clientHeight
          )
        )
        .toBe(true);

      const before = await documentGeometry(page);
      expect(before.scrollWidth).toBeLessThanOrEqual(before.clientWidth);
      expect(before.clientWidth).toBeLessThanOrEqual(before.viewportWidth);
      expect(
        await page.evaluate(() => ({
          body: getComputedStyle(document.body).overflow,
          root: getComputedStyle(document.documentElement).overflow,
        }))
      ).toEqual({ body: "hidden", root: "hidden" });

      await page.evaluate(() => window.scrollTo({ top: 500 }));
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);

      await content.hover();
      await page.mouse.wheel(0, 500);
      await expect
        .poll(() => content.evaluate((element) => element.scrollTop))
        .toBeGreaterThan(0);

      if (viewport.width === 320) {
        await page.goto("/examples/basic");
        expect(
          await page.evaluate(() => ({
            body: getComputedStyle(document.body).overflow,
            root: getComputedStyle(document.documentElement).overflow,
          }))
        ).toEqual({ body: "visible", root: "visible" });
      }
    });
  }

  test("keeps short-screen mobile navigation reachable", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto("/docs/getting-started/quickstart");

    const trigger = page.getByRole("button", {
      name: "Open navigation menu",
    });
    await trigger.click();

    const navigation = page.getByRole("navigation", {
      name: "Mobile navigation",
    });
    await expect(navigation).toBeVisible();
    await expect(
      navigation.getByRole("link", { name: "GitHub", exact: true })
    ).toBeInViewport();

    await page.keyboard.press("Escape");
    await expect(navigation).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("uses one accessible copy control per code block", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, "__lastCopiedText", {
        configurable: true,
        writable: true,
        value: "",
      });
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: async (text: string) => {
            (window as { __lastCopiedText: string }).__lastCopiedText = text;
          },
        },
      });
    });
    await page.goto("/docs/getting-started/quickstart");

    const block = page.getByTestId("copy-code-block-tsx");
    const copyButton = block.getByRole("button", {
      name: "Copy tsx code button",
    });

    await expect(block).not.toHaveAttribute("role", "button");
    await expect(block).not.toHaveAttribute("tabindex", "0");
    await expect(copyButton).toHaveCount(1);
    expect(
      await copyButton.evaluate((element) =>
        Boolean(element.parentElement?.closest('[role="button"]'))
      )
    ).toBe(false);

    await copyButton.focus();
    await copyButton.press("Enter");
    await expect(copyButton.getByText("Copied")).toBeAttached();
    await expect
      .poll(() =>
        page.evaluate(
          () => (window as { __lastCopiedText: string }).__lastCopiedText
        )
      )
      .not.toBe("");
  });

  test("keeps long-form prose at a readable measure", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/docs/getting-started/styling");

    const paragraph = page.locator("#packaged-css").locator("p").first();
    await expect(paragraph).toBeVisible();
    await expect
      .poll(() =>
        paragraph.evaluate((element) => element.getBoundingClientRect().width)
      )
      .toBeLessThanOrEqual(768);
  });
});

test.describe("grid interaction UI", () => {
  test("restores a visible focus ring after closing a column menu", async ({
    page,
  }) => {
    await page.goto("/examples/columns");
    await page.addStyleTag({
      content: "button { box-shadow: none !important; }",
    });

    const trigger = page
      .getByRole("button", { name: "Column menu", exact: true })
      .first();
    await trigger.press("Enter");
    const firstItem = page
      .getByRole("menu", { name: "Column menu" })
      .getByRole("menuitem")
      .first();
    await expect(firstItem).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(firstItem).toBeHidden();
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveCSS("outline-style", "none");
    expect(
      await trigger.evaluate((element) => element.matches(":focus-visible"))
    ).toBe(true);
    await expect
      .poll(() =>
        trigger.evaluate((element) => getComputedStyle(element).boxShadow)
      )
      .toContain("inset");

    const resizeHandle = page.locator('[data-slot="column-resizer"]').first();
    const resizeHandleBox = await resizeHandle.boundingBox();
    expect(resizeHandleBox?.width).toBeGreaterThanOrEqual(24);
  });

  test("closes mobile sorting with Escape and restores focus", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/examples/mobile-transform");

    const trigger = page.getByRole("button", { name: /^Sort(?:$|:)/ });
    await trigger.click();
    const panel = page.locator('[data-slot="mobile-sort-panel"]');
    await expect(panel).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(panel).toBeHidden();
    await expect(trigger).toBeFocused();

    await trigger.click();
    const sortBy = page.getByRole("combobox", {
      name: "Sort by",
      exact: true,
    });
    await expect(panel).toBeVisible();
    await sortBy.focus();
    await page.keyboard.press("Escape");

    await expect(panel).toBeHidden();
    await expect(trigger).toBeFocused();

    await trigger.click();
    await sortBy.click();
    const listbox = page.getByRole("listbox");
    await expect(listbox).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(listbox).toBeHidden();
    await expect(panel).toBeVisible();
    await expect(sortBy).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(panel).toBeHidden();
    await expect(trigger).toBeFocused();

    await trigger.click();
    await page.getByRole("button", { name: "Apply sort", exact: true }).click();
    await expect(panel).toBeHidden();
    await expect(trigger).toBeFocused();

    await trigger.click();
    await page.getByRole("button", { name: "Clear sort", exact: true }).click();
    await expect(panel).toBeHidden();
    await expect(trigger).toBeFocused();
    const geometry = await documentGeometry(page);
    expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth);
  });

  test("keeps the narrow mobile toolbar and sort panel in bounds", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto("/examples/mobile-transform");

    const grid = page.locator('[data-slot="mobile-grid-list"]');
    const search = page.getByRole("search", { name: "Search all fields" });
    const sort = page.getByRole("button", { name: "Sort", exact: true });
    const columns = page.getByRole("button", {
      name: "Display columns",
      exact: true,
    });
    const gridBox = await grid.boundingBox();
    expect(gridBox).not.toBeNull();

    for (const control of [search, sort, columns]) {
      const box = await control.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(gridBox!.x);
      expect(box!.x + box!.width).toBeLessThanOrEqual(
        gridBox!.x + gridBox!.width
      );
      expect(box!.height).toBeGreaterThanOrEqual(36);
    }

    await sort.click();
    const panelBox = await page
      .locator('[data-slot="mobile-sort-panel"]')
      .boundingBox();
    expect(panelBox).not.toBeNull();
    expect(panelBox!.x).toBeGreaterThanOrEqual(gridBox!.x);
    expect(panelBox!.x + panelBox!.width).toBeLessThanOrEqual(
      gridBox!.x + gridBox!.width
    );

    const geometry = await documentGeometry(page);
    expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth);
  });
});
