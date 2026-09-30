import { expect, test, type Page } from "@playwright/test";

// The fixture's columns: `name` opens always, `recipients` has a custom body
// and copy text, `note` has no copy footer, `comment` holds a long multi-line
// value, and `city` has no `cellTooltip` at all. Row 2's `name` and `note` are
// cut off; row 1's `note` fits.
const CLOSED_SETTLE_MS = 700;

const cell = (page: Page, columnId: string, rowIndex: number) =>
  page
    .getByTestId("cell-tooltip-grid")
    .locator(`[data-slot="grid-cell"][data-column-id="${columnId}"]`)
    .nth(rowIndex);

const tooltip = (page: Page) => page.locator('[data-slot="cell-tooltip"]');
const tooltipBody = (page: Page) =>
  page.locator('[data-slot="cell-tooltip-body"]');

async function moveAway(page: Page) {
  await page
    .getByTestId("cell-tooltip-scenario")
    .getByRole("heading", { level: 1 })
    .hover();
  await expect(tooltip(page)).toHaveCount(0);
}

const bottomOf = (rect: { y: number; height: number }) => rect.y + rect.height;

async function box(locator: ReturnType<Page["locator"]>) {
  const rect = await locator.boundingBox();
  if (!rect) throw new Error("element has no box");
  return rect;
}

test.beforeEach(async ({ page }) => {
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
          (window as { __lastCopiedText?: string }).__lastCopiedText = text;
        },
      },
    });
  });
  await page.goto("/compat/cell-tooltip");
  await expect(cell(page, "name", 0)).toBeVisible();
});

test("opens only on a cut-off cell unless the column says always", async ({
  page,
}) => {
  await cell(page, "note", 0).hover();
  await page.waitForTimeout(CLOSED_SETTLE_MS);
  await expect(tooltip(page)).toHaveCount(0);

  await cell(page, "city", 0).hover();
  await page.waitForTimeout(CLOSED_SETTLE_MS);
  await expect(tooltip(page)).toHaveCount(0);

  await cell(page, "note", 1).hover();
  await expect(tooltipBody(page)).toHaveText(
    "A note long enough to be cut off by its column"
  );
  await expect(tooltip(page).locator("button")).toHaveCount(0);
  await expect(tooltip(page)).toHaveAttribute("role", "tooltip");

  await moveAway(page);
  await cell(page, "name", 0).hover();
  await expect(tooltipBody(page)).toHaveText("Sam Sample");
});

test("copies the cell text, or the column's copy text, on click", async ({
  page,
}) => {
  await cell(page, "comment", 0).hover();
  await expect(tooltipBody(page)).toContainText("Checklist item 12: done");
  await tooltip(page).getByRole("button").click();
  await expect(tooltip(page)).toContainText("Copied");
  const copiedComment = await page.evaluate(
    () => (window as { __lastCopiedText?: string }).__lastCopiedText
  );
  expect(copiedComment).toContain("Monday.\n\nForwarding");

  await moveAway(page);
  await cell(page, "recipients", 0).hover();
  await expect(tooltipBody(page)).toHaveText(
    "first.recipient@long-example-domain.example.com\nsecond.recipient@example.com"
  );
  await tooltip(page).getByRole("button").click();
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as { __lastCopiedText?: string }).__lastCopiedText
      )
    )
    .toBe(
      "first.recipient@long-example-domain.example.com, second.recipient@example.com"
    );
});

test("follows the hovered cell and keeps it while the pointer crosses to the tooltip", async ({
  page,
}) => {
  await cell(page, "name", 0).hover();
  await expect(tooltipBody(page)).toHaveText("Sam Sample");
  const firstCell = await box(cell(page, "name", 0));
  expect(
    Math.abs((await box(tooltip(page))).y - bottomOf(firstCell))
  ).toBeLessThan(8);

  // Straight down: through the top of row 2's cell, onto the tooltip.
  const x = firstCell.x + 12;
  await page.mouse.move(x, firstCell.y + firstCell.height + 2);
  const tip = await box(tooltip(page));
  await page.mouse.move(x, tip.y + tip.height / 2);
  await page.waitForTimeout(CLOSED_SETTLE_MS);
  await expect(tooltipBody(page)).toHaveText("Sam Sample");

  await cell(page, "note", 1).hover();
  await expect(tooltipBody(page)).toHaveText(
    "A note long enough to be cut off by its column"
  );
  const noteCell = await box(cell(page, "note", 1));
  const moved = await box(tooltip(page));
  expect(Math.abs(moved.y - bottomOf(noteCell))).toBeLessThan(8);
  expect(Math.abs(moved.x - noteCell.x)).toBeLessThan(16);
});
