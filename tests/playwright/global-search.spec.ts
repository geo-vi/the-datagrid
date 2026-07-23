import { expect, test } from "@playwright/test";

const INVALID_HOOK_RUNTIME_ERROR =
  /Invalid hook call|Cannot read properties of null \(reading ['"]use(?:Callback|Context|Effect|Id|ImperativeHandle|InsertionEffect|LayoutEffect|Memo|Reducer|Ref|State|SyncExternalStore)['"]\)/i;

test("keeps one React hook runtime across desktop and mobile dialogs", async ({
  page,
}) => {
  const hookRuntimeErrors: string[] = [];

  page.on("pageerror", (error) => {
    if (INVALID_HOOK_RUNTIME_ERROR.test(error.message)) {
      hookRuntimeErrors.push(error.message);
    }
  });
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      INVALID_HOOK_RUNTIME_ERROR.test(message.text())
    ) {
      hookRuntimeErrors.push(message.text());
    }
  });

  await page.goto("/examples");

  await page.getByRole("button", { name: "Open global search" }).click();
  await expect(
    page.getByRole("combobox", { name: "Global search input" })
  ).toBeVisible();
  await page.keyboard.press("Escape");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Open navigation menu" }).click();
  await expect(
    page.getByRole("navigation", { name: "Mobile navigation" })
  ).toBeVisible();
  await page.keyboard.press("Escape");

  const runtimeResources = await page.evaluate(() =>
    performance
      .getEntriesByType("resource")
      .map((entry) => entry.name)
      .filter((name) => name.startsWith("http"))
  );
  const optimizedReactResources = runtimeResources.filter((name) =>
    new URL(name).pathname.endsWith("/node_modules/.vite/deps/react.js")
  );

  expect(new Set(optimizedReactResources).size).toBe(1);
  expect(
    runtimeResources.some((name) =>
      new URL(name).pathname.endsWith("/src/compat/react.ts")
    )
  ).toBe(false);
  expect(hookRuntimeErrors).toEqual([]);
});

test("searches docs keys and example content from the shared header", async ({
  page,
}) => {
  await page.goto("/examples");

  await expect(
    page.getByRole("button", { name: "Open global search" })
  ).toBeVisible();

  await page.getByRole("button", { name: "Open global search" }).click();
  const searchInput = page.getByRole("combobox", {
    name: "Global search input",
  });
  await expect(searchInput).toBeVisible();
  await expect
    .poll(async () => {
      return page.evaluate(() => {
        const content = document.querySelector('[data-slot="dialog-content"]');
        const overlay = document.querySelector('[data-slot="dialog-overlay"]');

        if (!content || !overlay) {
          return null;
        }

        const contentRect = content.getBoundingClientRect();
        const contentStyle = getComputedStyle(content);
        const overlayStyle = getComputedStyle(overlay);

        return (
          contentStyle.position === "fixed" &&
          overlayStyle.position === "fixed" &&
          Math.abs(
            Math.round(contentRect.left + contentRect.width / 2) -
              Math.round(window.innerWidth / 2)
          ) <= 4 &&
          Math.abs(
            Math.round(contentRect.top + contentRect.height / 2) -
              Math.round(window.innerHeight / 2)
          ) <= 4
        );
      });
    })
    .toBe(true);
  await searchInput.fill("onColumnOrderChange");

  await expect(
    page.getByText("ReactDataGrid prop reference · onColumnOrderChange")
  ).toBeVisible();

  await page
    .getByText("ReactDataGrid prop reference · onColumnOrderChange")
    .click();

  await expect(page).toHaveURL(/\/docs\/reference\/reactdatagrid#core-props$/);
  await expect(
    page.getByRole("heading", { name: "ReactDataGrid prop reference" })
  ).toBeVisible();

  await page.getByRole("button", { name: "Open global search" }).click();
  await expect(searchInput).toBeVisible();
  await searchInput.fill("mobileApplySort");

  await expect(
    page.getByText("Internationalization (i18n) · mobileApplySort")
  ).toBeVisible();
  await page.getByText("Internationalization (i18n) · mobileApplySort").click();

  await expect(page).toHaveURL(/\/docs\/reference\/i18n#mobile-keys$/);
  await expect(
    page.getByRole("heading", { name: "Internationalization (i18n)" })
  ).toBeVisible();

  await page.getByRole("button", { name: "Open global search" }).click();
  await expect(searchInput).toBeVisible();
  await searchInput.fill("Selection example");

  await expect(
    page.getByText("Selection example", { exact: true })
  ).toBeVisible();
  await page.getByText("Selection example", { exact: true }).click();

  await expect(page).toHaveURL(/\/examples\/selection$/);
  await expect(
    page
      .getByTestId("example-preview-panel")
      .getByRole("heading", { name: "Selection example" })
  ).toBeVisible();
});

test("opens search from the mobile navigation menu", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/examples");

  await expect(
    page.getByRole("button", { name: "Open navigation menu" })
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Open global search" })
  ).toBeHidden();

  await page.getByRole("button", { name: "Open navigation menu" }).click();
  await expect(
    page.getByRole("navigation", { name: "Mobile navigation" })
  ).toBeVisible();
  await expect
    .poll(async () => {
      return page.evaluate(() => {
        const content = document.querySelector('[data-slot="dialog-content"]');

        if (!content) {
          return null;
        }

        const rect = content.getBoundingClientRect();
        return {
          left: Math.round(rect.left),
          top: Math.round(rect.top),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
        };
      });
    })
    .toEqual({
      left: 0,
      top: 0,
      width: 390,
      height: 844,
      viewportWidth: 390,
      viewportHeight: 844,
    });

  await page.getByRole("button", { name: "Search docs and examples" }).click();

  const searchInput = page.getByRole("combobox", {
    name: "Global search input",
  });
  await expect(searchInput).toBeVisible();
  await searchInput.fill("Users-style example");
  await expect(
    page
      .getByLabel("Suggestions")
      .getByText("Users-style example", { exact: true })
  ).toBeVisible();
});
