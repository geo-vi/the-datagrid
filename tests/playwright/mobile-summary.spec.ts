import { expect, test, type Page } from "@playwright/test";

const summary = (page: Page) =>
  page.locator(".tdg-mobile-row-summary").first();
const fields = (page: Page) =>
  summary(page).locator(".tdg-mobile-row-field");

async function openExample(page: Page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/examples/mobile-transform");
  await expect(summary(page)).toBeVisible();
}

async function choose(page: Page, testId: string, option: string) {
  await page.getByTestId(testId).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}

const separatorContent = (page: Page) =>
  fields(page)
    .first()
    .evaluate((node) => getComputedStyle(node, "::after").content);

test("a summary field is told apart from a panel field", async ({ page }) => {
  await openExample(page);
  await expect(fields(page)).toHaveCount(3);
  await expect(
    summary(page).locator('[data-cell-role="summary"]')
  ).toHaveCount(3);
  await expect(summary(page)).toHaveAttribute("data-summary-flow", "wrap");
  await expect(summary(page)).toHaveAttribute("data-summary-separator", "none");
});

test("hiding the labels keeps them for a screen reader", async ({ page }) => {
  await openExample(page);
  const label = fields(page).first().locator("span").first();
  await expect(label).toBeVisible();
  const text = (await label.textContent())?.trim();
  expect(text).toBeTruthy();

  await choose(page, "mobile-summary-labels", "Hide");
  // Still in the accessibility tree, and still the only thing naming the value.
  await expect(label).toHaveText(text!);
  await expect(label).toHaveCSS("position", "absolute");
  const box = await label.boundingBox();
  expect(box!.width).toBeLessThanOrEqual(1);
  expect(box!.height).toBeLessThanOrEqual(1);
});

test("a separator trails every field but the last, so a wrapped line never opens with one", async ({
  page,
}) => {
  await openExample(page);
  expect(await separatorContent(page)).toMatch(/none|""/);

  await choose(page, "mobile-summary-separator", "Dot");
  await expect(summary(page)).toHaveAttribute("data-summary-separator", "dot");
  expect(await separatorContent(page)).toContain("·");
  // Leading it would open a wrapped line with a dangling character.
  expect(
    await fields(page)
      .first()
      .evaluate((node) => getComputedStyle(node, "::before").content)
  ).toMatch(/none|""/);
  expect(
    await fields(page)
      .last()
      .evaluate((node) => getComputedStyle(node, "::after").content)
  ).toMatch(/none|""/);
});

test("column flow stacks the fields and drops the separator", async ({
  page,
}) => {
  await openExample(page);
  await choose(page, "mobile-summary-separator", "Pipe");
  expect(await separatorContent(page)).toContain("|");

  await choose(page, "mobile-summary-flow", "Column");
  await expect(summary(page)).toHaveAttribute("data-summary-flow", "column");
  await expect(summary(page)).toHaveCSS("flex-direction", "column");
  // A line break separates them, so the character would be noise on top of it.
  await expect(summary(page)).toHaveAttribute("data-summary-separator", "none");
  expect(await separatorContent(page)).toMatch(/none|""/);

  const [first, second] = await fields(page).evaluateAll((nodes) =>
    nodes.slice(0, 2).map((node) => node.getBoundingClientRect())
  );
  expect(second.top).toBeGreaterThanOrEqual(first.bottom - 1);
});

test("a custom summary can add to the fields rather than replace them", async ({
  page,
}) => {
  await openExample(page);
  await page.getByTestId("mobile-custom-summary-toggle").click();

  const badge = summary(page).getByTestId("custom-summary-badge");
  await expect(badge).toHaveText("3 fields");
  await expect(fields(page)).toHaveCount(3);
  const badgeComesFirst = await summary(page).evaluate((node) => {
    const children = [...node.children];
    const badgeIndex = children.findIndex(
      (child) => child.getAttribute("data-testid") === "custom-summary-badge"
    );
    const fieldIndex = children.findIndex((child) =>
      child.classList.contains("tdg-mobile-row-field")
    );
    return badgeIndex >= 0 && fieldIndex >= 0 && badgeIndex < fieldIndex;
  });
  expect(badgeComesFirst).toBe(true);
});

test("a cell renderer is told which surface it is on and whether its label shows", async ({
  page,
}) => {
  await openExample(page);
  const seats = () => summary(page).locator("[data-mobile-surface]");
  await expect(seats()).toHaveAttribute("data-mobile-surface", "summary");
  await expect(seats()).toHaveAttribute("data-mobile-label-shown", "true");
  await expect(seats()).toHaveText("1");

  await choose(page, "mobile-summary-labels", "Hide");
  await expect(seats()).toHaveAttribute("data-mobile-label-shown", "false");
  await expect(seats()).toHaveText("1 seat");

  // The open panel still labels its fields, so the same renderer leaves the
  // value bare there.
  await page.locator('[data-slot="mobile-cell"][data-cell-role="primary"]')
    .first()
    .click();
  const panelSeats = page
    .locator('[data-cell-role="detail"] [data-mobile-surface]')
    .first();
  await expect(panelSeats).toHaveAttribute("data-mobile-surface", "panel");
  await expect(panelSeats).toHaveAttribute("data-mobile-label-shown", "true");
  await expect(panelSeats).toHaveText("1");
});

test("a column can drop its own label while the rest of the row keeps theirs", async ({
  page,
}) => {
  await openExample(page);
  const labels = () =>
    fields(page).evaluateAll((nodes) =>
      nodes.map((node) => {
        const label = node.querySelector("span")!;
        return {
          text: label.textContent!.trim(),
          onScreen: getComputedStyle(label).position !== "absolute",
        };
      })
    );

  const shown = await labels();
  expect(shown.map((l) => l.text)).toEqual(["Account ID", "Status", "Seats"]);
  // Only the column that opted out; its neighbours are untouched.
  expect(shown.map((l) => l.onScreen)).toEqual([true, false, true]);

  await choose(page, "mobile-summary-labels", "Hide");
  const hidden = await labels();
  expect(hidden.map((l) => l.text)).toEqual(["Account ID", "Status", "Seats"]);
  expect(hidden.map((l) => l.onScreen)).toEqual([false, false, false]);
});
