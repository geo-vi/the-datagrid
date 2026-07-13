import { expect, test } from "@playwright/test";

const examplesWithSharedGridControls = [
  "basic",
  "actions",
  "columns",
  "selection",
  "users",
  "mobile-transform",
] as const;

const removedExamplePaths = [
  "/examples/issue-16-css-scope",
  "/examples/issue-17",
  "/examples/issue-20-height",
  "/examples/issue-21-missing-imports",
  "/issue-16-css-scope",
  "/issue-17",
  "/issue-20-height",
  "/issue-21-missing-imports",
] as const;

test("redirects removed issue examples to the consolidated columns page", async ({
  page,
}) => {
  for (const path of removedExamplePaths) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/examples\/columns$/);
    await expect(
      page
        .getByTestId("example-preview-panel")
        .getByRole("heading", { name: "Columns example" })
    ).toBeVisible();
  }
});

test("applies the shared vertical separator control to every example grid", async ({
  page,
}) => {
  for (const example of examplesWithSharedGridControls) {
    await page.goto(`/examples/${example}`);

    const grid = page.locator(".InovuaReactDataGrid.tdg-root").first();
    const headerCell = grid.locator(".tdg-header-cell").first();
    const bodyCell = grid.locator(".InovuaReactDataGrid__cell").first();

    await expect(headerCell).toHaveCSS("border-right-width", "1px");
    await expect(bodyCell).toHaveCSS("border-right-width", "1px");

    await page.getByRole("button", { name: "Vertical separators on" }).click();
    await expect(
      page.getByRole("button", { name: "Vertical separators off" })
    ).toBeVisible();
    await expect(headerCell).toHaveCSS("border-right-width", "0px");
    await expect(bodyCell).toHaveCSS("border-right-width", "0px");
  }
});

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
      has: page.getByRole("heading", { name: "Actions example" }),
    })
    .getByRole("link", { name: "Open example" })
    .click();
  await expect(page).toHaveURL(/\/examples\/actions$/);
  await expect(
    page
      .getByTestId("example-preview-panel")
      .getByRole("heading", { name: "Actions example" })
  ).toBeVisible();
  await expect(
    page.getByText("examples/src/ActionsGridExample.tsx")
  ).toBeVisible();

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
  for (const propName of [
    "onColumnFilterValueChange",
    "enableSelection",
    "virtualizeColumnsThreshold",
    "virtualizeColumns",
    "emptyText",
  ]) {
    await expect(
      page.getByRole("cell", { name: propName, exact: true })
    ).toBeVisible();
  }

  await page.goto("/docs/migration/inovua-status");
  for (const feature of [
    "Per-column filter change callback",
    "Selection enablement and precedence",
    "Horizontal column virtualization",
    "Empty-state content",
  ]) {
    await expect(
      page.getByRole("rowheader", { name: feature, exact: true })
    ).toBeVisible();
  }

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

test("keeps the compatibility lab source bounded and internally scrollable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1200, height: 800 });
  await page.goto("/examples/inovua-parity");

  const sourcePanel = page.getByTestId("example-source-panel");
  const sourceViewport = sourcePanel.locator(
    '[data-slot="scroll-area-viewport"]'
  );
  const scenarioButtons = page
    .getByRole("region", { name: "Choose a compatibility checkpoint" })
    .getByRole("button");

  await expect(sourcePanel).toBeVisible();
  await expect(scenarioButtons).toHaveCount(20);
  await expect
    .poll(async () => sourcePanel.evaluate((element) => element.clientHeight))
    .toBeLessThanOrEqual(640);
  await expect
    .poll(async () =>
      sourceViewport.evaluate(
        (element) => element.scrollHeight > element.clientHeight
      )
    )
    .toBe(true);
  await expect
    .poll(async () =>
      page.evaluate(() => document.documentElement.scrollHeight)
    )
    .toBeLessThan(5000);

  await scenarioButtons.filter({ hasText: "Custom editor contract" }).click();
  await expect(page).toHaveURL(/scenario=editing-custom/);
  await expect(
    scenarioButtons.filter({ hasText: "Custom editor contract" })
  ).toHaveAttribute("aria-pressed", "true");
});

test("keeps desktop docs navigation and content independently scrollable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/docs/reference/reactdatagrid");

  const sidebar = page.getByTestId("docs-sidebar");
  const sidebarViewport = sidebar
    .getByTestId("docs-sidebar-scroll")
    .locator('[data-slot="scroll-area-viewport"]');
  const content = page.getByTestId("docs-content");

  await expect(sidebar).toBeVisible();
  await expect
    .poll(async () =>
      content.evaluate((element) => element.scrollHeight > element.clientHeight)
    )
    .toBe(true);

  const initialSidebarTop = await sidebar.evaluate(
    (element) => element.getBoundingClientRect().top
  );
  await content.evaluate((element) => {
    element.scrollTop = 600;
  });
  await expect
    .poll(async () => content.evaluate((element) => element.scrollTop))
    .toBeGreaterThan(0);
  await expect
    .poll(async () => sidebarViewport.evaluate((element) => element.scrollTop))
    .toBe(0);

  const collapsedSections = sidebar.locator('button[aria-expanded="false"]');
  while ((await collapsedSections.count()) > 0) {
    await collapsedSections.first().click();
  }
  await expect
    .poll(async () =>
      sidebarViewport.evaluate(
        (element) => element.scrollHeight > element.clientHeight
      )
    )
    .toBe(true);

  const contentScrollTop = await content.evaluate(
    (element) => element.scrollTop
  );
  await sidebarViewport.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await expect
    .poll(async () => sidebarViewport.evaluate((element) => element.scrollTop))
    .toBeGreaterThan(0);
  expect(await content.evaluate((element) => element.scrollTop)).toBe(
    contentScrollTop
  );
  expect(
    await sidebar.evaluate((element) => element.getBoundingClientRect().top)
  ).toBeCloseTo(initialSidebarTop, 1);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
});

test("navigates from the mobile docs drawer and closes it", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/docs/getting-started/installation");

  await expect(page.getByTestId("docs-sidebar")).toBeHidden();
  await page
    .getByRole("button", { name: "Open documentation navigation" })
    .click();

  const dialog = page.getByRole("dialog", {
    name: "Documentation navigation",
  });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Core features" }).click();
  await dialog.getByRole("link", { name: "Selection", exact: true }).click();

  await expect(page).toHaveURL(/\/docs\/guides\/selection$/);
  await expect(dialog).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Open documentation navigation" })
  ).toContainText("Selection");
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
