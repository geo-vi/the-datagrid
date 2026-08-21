import { expect, test, type Locator, type Page } from "@playwright/test";

function fixture(page: Page) {
  return page.getByTestId("toolbar-collapsible");
}

function toolbar(scope: Locator) {
  return scope.locator('[data-slot="rdg-toolbar"]');
}

test.beforeEach(async ({ page }) => {
  await page.goto("/compat/toolbar");
});

test("reveals the complete toolbar from one right-aligned disclosure", async ({
  page,
}) => {
  const scope = fixture(page);
  const bar = toolbar(scope);
  const disclosure = bar.locator('[data-slot="rdg-toolbar-disclosure"]');
  const panel = bar.locator('[data-slot="rdg-toolbar-collapsible-panel"]');
  const optionalToggle = bar.locator(
    '[data-slot="rdg-column-toggle"][data-column-id="optional"]'
  );
  const optionalHeader = scope.locator(
    '[data-slot="grid-header-cell"][data-column-id="optional"]'
  );

  await expect(scope).toBeVisible();
  await expect(bar).toHaveRole("region");
  await expect(bar).toHaveAccessibleName("Collapsible columns");
  await expect(bar).toHaveAttribute("data-state", "closed");
  await expect(disclosure).toHaveText("Show table controls");
  await expect(disclosure).toHaveAttribute("aria-expanded", "false");
  await expect(panel).toHaveAttribute("aria-hidden", "true");
  await expect(panel).toBeHidden();
  await expect(optionalToggle).toBeHidden();

  const panelId = await panel.getAttribute("id");
  expect(panelId).toBeTruthy();
  await expect(disclosure).toHaveAttribute("aria-controls", panelId!);

  const rootBox = await bar.boundingBox();
  const disclosureBox = await disclosure.boundingBox();
  expect(rootBox).not.toBeNull();
  expect(disclosureBox).not.toBeNull();
  expect(
    rootBox!.x + rootBox!.width - (disclosureBox!.x + disclosureBox!.width)
  ).toBeLessThanOrEqual(16);

  const closedOffset = await panel.evaluate((element) => {
    const matrix = new DOMMatrix(getComputedStyle(element).transform);
    return { x: matrix.m41, y: matrix.m42 };
  });
  expect(closedOffset.x).toBeGreaterThan(0);
  expect(closedOffset.y).toBeLessThan(0);

  await disclosure.press("Enter");

  await expect(bar).toHaveAttribute("data-state", "open");
  await expect(disclosure).toHaveAttribute("aria-expanded", "true");
  await expect(disclosure).toHaveText("Hide table controls");
  await expect(panel).toHaveAttribute("aria-hidden", "false");
  await expect(panel).toBeVisible();
  await expect(
    bar.getByRole("heading", { level: 2, name: "Collapsible columns" })
  ).toBeVisible();
  await expect(optionalToggle).toBeVisible();

  await expect
    .poll(() =>
      panel.evaluate((element) => {
        const matrix = new DOMMatrix(getComputedStyle(element).transform);
        return { x: matrix.m41, y: matrix.m42 };
      })
    )
    .toEqual({ x: 0, y: 0 });

  const transitionProperties = await panel.evaluate(
    (element) => getComputedStyle(element).transitionProperty
  );
  expect(transitionProperties).toContain("grid-template-rows");
  expect(transitionProperties).toContain("transform");

  await optionalToggle.click();
  await expect(optionalToggle).toHaveAttribute("aria-pressed", "true");
  await expect(optionalHeader).toBeVisible();

  await disclosure.click();
  await expect(disclosure).toHaveAttribute("aria-expanded", "false");
  await expect(panel).toHaveAttribute("aria-hidden", "true");
  await expect(panel).toBeHidden();
  await expect(optionalHeader).toBeVisible();
});

test("keeps the disclosure and expanded controls inside a narrow viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });

  const scope = fixture(page);
  const bar = toolbar(scope);
  const disclosure = bar.locator('[data-slot="rdg-toolbar-disclosure"]');

  await expect(disclosure).toBeVisible();
  await disclosure.click();
  await expect(
    bar.locator('[data-slot="rdg-column-toggle-list"]')
  ).toBeVisible();
  await expect(bar.locator('[data-slot="rdg-toolbar-actions"]')).toBeVisible();

  const overflow = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);

  const rootBox = await bar.boundingBox();
  const disclosureBox = await disclosure.boundingBox();
  expect(rootBox).not.toBeNull();
  expect(disclosureBox).not.toBeNull();
  expect(disclosureBox!.x).toBeGreaterThanOrEqual(rootBox!.x);
  expect(disclosureBox!.x + disclosureBox!.width).toBeLessThanOrEqual(
    rootBox!.x + rootBox!.width
  );
});
