import { expect, test } from "@playwright/test";

test("navigates between docs and dedicated example pages", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "the-datagrid" })
  ).toBeVisible();
  await expect(page.locator(".InovuaReactDataGrid.tdg-root")).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Start with installation" })
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Browse examples" })
  ).toBeVisible();
  await page
    .getByLabel("Site section buttons")
    .getByRole("link", { name: "Examples", exact: true })
    .click();
  await expect(page).toHaveURL(/\/examples$/);
  await expect(page.getByRole("link", { name: "the-datagrid" })).toBeVisible();
  await page.getByRole("link", { name: "the-datagrid" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page
    .getByLabel("Site section buttons")
    .getByRole("link", { name: "Examples", exact: true })
    .click();
  await expect(page).toHaveURL(/\/examples$/);
  await expect(page.getByRole("heading", { name: "Examples" })).toBeVisible();
  await expect(
    page.getByText(
      "Use the catalog as an index, then open a dedicated example page to inspect the running grid beside its source file."
    )
  ).toHaveCount(0);
  const examplesSearch = page.getByLabel("Search examples");
  await expect(examplesSearch).toBeVisible();
  await expect(examplesSearch).toHaveClass(/rounded-2xl/);
  await expect(examplesSearch).toHaveCSS("padding-left", "40px");

  const basicCard = page.locator("article", {
    has: page.getByRole("heading", { name: "Basic example" }),
  });
  await expect(basicCard).toBeVisible();
  await expect(
    basicCard.getByText(
      "The compact baseline grid used by the visual regression suite."
    )
  ).toBeVisible();

  await examplesSearch.fill("selection");
  await expect(
    page.locator("article", {
      has: page.getByRole("heading", { name: "Selection example" }),
    })
  ).toBeVisible();
  await expect(
    page.locator("article", {
      has: page.getByRole("heading", { name: "Basic example" }),
    })
  ).toHaveCount(0);
  await examplesSearch.clear();

  await basicCard.getByRole("link", { name: "Open example" }).click();
  await expect(page).toHaveURL(/\/examples\/basic$/);
  await expect(page.getByTestId("example-preview-panel")).toBeVisible();
  await expect(page.getByTestId("example-source-panel")).toBeVisible();
  await expect(
    page.getByText("examples/src/BasicGridExample.tsx")
  ).toBeVisible();
  await expect(
    page.getByTestId("example-source-panel").getByLabel("Copy tsx code button")
  ).toBeVisible();
  await expect(page.getByLabel("Grid theme buttons")).toBeVisible();
  await expect(page.getByLabel("Search examples")).toHaveCount(0);

  await page.getByRole("link", { name: "Back to examples" }).click();
  await expect(page).toHaveURL(/\/examples$/);
  await page
    .locator("article", {
      has: page.getByRole("heading", { name: "Selection example" }),
    })
    .getByRole("link", { name: "Open example" })
    .click();
  await expect(page).toHaveURL(/\/examples\/selection$/);
  await expect(
    page
      .getByTestId("example-preview-panel")
      .getByRole("heading", { name: "Selection example" })
  ).toBeVisible();
  await expect(
    page.getByText("examples/src/SelectionGridExample.tsx")
  ).toBeVisible();

  await page.getByRole("link", { name: "Back to examples" }).click();
  await expect(page).toHaveURL(/\/examples$/);
  await page
    .locator("article", {
      has: page.getByRole("heading", { name: "Users-style example" }),
    })
    .getByRole("link", { name: "Open example" })
    .click();
  await expect(page).toHaveURL(/\/examples\/users$/);
  await expect(
    page
      .getByTestId("example-preview-panel")
      .getByRole("heading", { name: "Users-style example" })
  ).toBeVisible();
  await expect(
    page.getByText("examples/src/UsersGridExample.tsx")
  ).toBeVisible();

  await page
    .getByLabel("Site section buttons")
    .getByRole("link", { name: "Docs", exact: true })
    .click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/docs/reference/reactdatagrid");
  await expect(
    page.getByRole("heading", { name: "ReactDataGrid prop reference" })
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Core props" })).toBeVisible();

  await page.goto("/docs/getting-started/quickstart");
  await expect(
    page
      .locator('[data-testid="copy-code-block-tsx"] code span[style*="color"]')
      .first()
  ).toBeVisible();

  await page.goto("/docs/guides/ai-skills");
  await expect(
    page.getByRole("heading", { name: "Guide: AI assistant skills" })
  ).toBeVisible();
  await expect(
    page.getByText("the-datagrid-consumer", { exact: true })
  ).toBeVisible();
});

test("docs home quick install snippets are one-click copy targets", async ({
  page,
}) => {
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

  await page.goto("/");

  await expect(page.getByText("Quick install")).toBeVisible();
  await expect(page.getByText("npm install @geovi/the-datagrid")).toBeVisible();
  await expect(page.getByText("yarn add @geovi/the-datagrid")).toBeVisible();
  await expect(page.getByText("pnpm add @geovi/the-datagrid")).toBeVisible();

  await page.getByLabel("Copy pnpm code button").click();

  await expect
    .poll(async () => {
      return page.evaluate(
        () => (window as { __lastCopiedText: string }).__lastCopiedText
      );
    })
    .toBe("pnpm add @geovi/the-datagrid");
});

test("toggles the site theme from the header", async ({ page }) => {
  await page.goto("/");

  const initialThemeIsDark = await page.evaluate(() =>
    document.documentElement.classList.contains("dark")
  );

  await page.getByRole("button", { name: "Switch site theme" }).click();

  await expect
    .poll(async () => {
      return page.evaluate(() => ({
        isDark: document.documentElement.classList.contains("dark"),
        savedTheme: window.localStorage.getItem("tdg-site-theme"),
      }));
    })
    .toEqual({
      isDark: !initialThemeIsDark,
      savedTheme: initialThemeIsDark ? "light" : "dark",
    });
});
