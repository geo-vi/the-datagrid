import { expect, test } from "@playwright/test";

// The active-row indicator was an outline on the row element. Locked columns are
// sticky cells that open their own stacking context and inherit an opaque row
// background, so they painted over anything the row drew beneath them: the
// border vanished behind the checkbox and action columns and showed through only
// on hover, where the hover token is a translucent color-mix. It is drawn per
// cell now, so every cell paints its own segment above its own background.
//
// These assertions are deliberately about rendering. The issue #38 coverage
// already pins the active-row *state* (`data-active-index`, `aria-current`,
// `data-active` and the caller's class names), and all of it stayed green
// throughout the regression, because none of it looks at what is painted.

// Ikarus Light declares `--tdg-row-active-border-color: #caae53` at 2px, a value
// no other token in that theme shares, so a segment picking up the wrong token
// cannot coincidentally match.
const AMBER = "rgb(202, 174, 83)";

// The actions example is the one that locks a column at each edge: a checkbox
// column at the start and the action buttons at the end.
async function activateMiddleRow(page: import("@playwright/test").Page) {
  await page.goto("/actions");
  await page.getByRole("button", { name: "Ikarus Light", exact: true }).click();

  const grid = page.locator(".InovuaReactDataGrid.tdg-root").first();
  await expect(grid).toHaveAttribute("data-theme", "ikarus-light");

  const row = grid.locator('[data-slot="grid-row"]').nth(2);
  await row.scrollIntoViewIfNeeded();
  // A plain data cell, so no editor or action control swallows the click.
  await row.locator("td").nth(3).click();

  return { grid, row };
}

test("the active-row indicator paints on the locked cells at both edges", async ({
  page,
}) => {
  const { row } = await activateMiddleRow(page);
  await expect(row).toHaveClass(/tdg-row--active-indicator/);

  const segments = await row.evaluate((element) => {
    const cells = [...element.children] as HTMLElement[];
    const read = (cell: HTMLElement) => {
      const after = getComputedStyle(cell, "::after");

      return {
        position: getComputedStyle(cell).position,
        top: `${after.borderTopWidth} ${after.borderTopStyle} ${after.borderTopColor}`,
        bottomWidth: after.borderBottomWidth,
        leftWidth: after.borderLeftWidth,
        rightWidth: after.borderRightWidth,
      };
    };

    return {
      lockedStart: read(cells[0]),
      middle: read(cells[Math.floor(cells.length / 2)]),
      lockedEnd: read(cells[cells.length - 1]),
    };
  });

  // Guards the premise: if these stop being sticky the regression this test
  // describes can no longer happen, and a passing run would mean nothing.
  expect(segments.lockedStart.position, "start cell is locked").toBe("sticky");
  expect(segments.lockedEnd.position, "end cell is locked").toBe("sticky");

  for (const [name, segment] of Object.entries(segments)) {
    expect(segment.top, `${name} top segment`).toBe(`2px solid ${AMBER}`);
    expect(segment.bottomWidth, `${name} bottom segment`).toBe("2px");
  }

  // Only the outer edges close, so the row reads as one rectangle rather than a
  // box drawn around every individual cell.
  expect(segments.lockedStart.leftWidth, "start cell closes the left edge").toBe(
    "2px"
  );
  expect(segments.lockedEnd.rightWidth, "end cell closes the right edge").toBe(
    "2px"
  );
  expect(segments.middle.leftWidth, "middle cell stays open").toBe("0px");
  expect(segments.middle.rightWidth, "middle cell stays open").toBe("0px");
});

test("clicking a row activates it without flashing the indicator elsewhere", async ({
  page,
}) => {
  await page.goto("/actions");

  const grid = page.locator(".InovuaReactDataGrid.tdg-root").first();
  await expect(grid).toHaveAttribute("data-active-index", "none");

  // Record every write synchronously. A polled assertion samples between frames
  // and would step straight over an index that is replaced a commit later.
  await grid.evaluate((root) => {
    const writes: (string | null)[] = [];
    (window as Window & { __activeIndexWrites?: (string | null)[] })
      .__activeIndexWrites = writes;

    new MutationObserver(() =>
      writes.push(root.getAttribute("data-active-index"))
    ).observe(root, {
      attributes: true,
      attributeFilter: ["data-active-index"],
    });
  });

  const row = grid.locator('[data-slot="grid-row"]').nth(3);
  await row.scrollIntoViewIfNeeded();
  await row.locator("td").nth(3).click();
  await expect(grid).toHaveAttribute("data-active-index", "3");

  // Pressing a row focuses the grid surface before the row's click handler runs.
  // activateRowOnFocus used to claim the first visible row in that window, so
  // the indicator painted on row 0 and only then jumped to the pressed row.
  const writes = await page.evaluate(
    () =>
      (window as Window & { __activeIndexWrites?: (string | null)[] })
        .__activeIndexWrites
  );
  expect(writes, "data-active-index writes for a single click").toEqual(["3"]);
});

test("keyboard focus still activates a row on entry", async ({ page }) => {
  await page.goto("/actions");

  const grid = page.locator(".InovuaReactDataGrid.tdg-root").first();
  await expect(grid).toHaveAttribute("data-active-index", "none");

  // The pointer-intent flag above must not leak into focus that no press
  // caused, which is what activateRowOnFocus exists to serve.
  await grid.locator('[data-slot="grid-surface"]').focus();
  await expect(grid).toHaveAttribute("data-focused", "true");
  await expect(grid).toHaveAttribute("data-active-index", "0");
});
