import { expect, test, type Locator, type Page } from "@playwright/test";

// The grid's trailing edge — the region between the last column and the
// viewport's right edge — used to be handled by three separate ad-hoc
// mechanisms, each of which was a bug. These assertions are deliberately about
// rendered geometry: the logic behind the filler is unit-tested in
// `tests/engine/grid-slack-filler.test.ts`, and every defect that actually
// shipped here was a pixel one that logic tests could not see.
//
// Only three cases, chosen because each one caught a real regression:
//   1. the locked-end column and the row it belongs to, after a resize
//   2. where the column-boundary indicator paints
//   3. that merely pressing a resize handle does not change the layout mode

// Adjacent-cell measurements can drift a subpixel on fractional device ratios.
const MAX_TILING_DRIFT_PX = 1.5;
// These two must be exact. The separator arithmetic cancels out to a whole
// number regardless of device ratio, and every defect here was worth exactly
// 1px — a looser bound silently stops catching them. Verified by mutation: with
// the separator offset removed, this bound fails and 1.5 does not.
const MAX_EXACT_DRIFT_PX = 0.5;

async function resizeBy(page: Page, grid: Locator, columnId: string, dx: number) {
  const resizer = grid.locator(
    `[data-slot="grid-header-cell"][data-column-id="${columnId}"] [data-slot="column-resizer"]`
  );
  const box = await resizer.boundingBox();
  if (!box) throw new Error(`no resize handle for ${columnId}`);

  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y, { steps: 12 });
  await page.mouse.up();
}

test("a resize leaves no gap beside a locked-end column, and the active row stays one rectangle", async ({
  page,
}) => {
  await page.goto("/actions");

  // Ikarus Light is the theme that draws the active-row indicator, at a 2px
  // width no other token in it shares.
  await page.getByRole("button", { name: "Ikarus Light", exact: true }).click();
  const grid = page.locator(".InovuaReactDataGrid.tdg-root").first();
  await expect(grid).toHaveAttribute("data-theme", "ikarus-light");

  const row = grid.locator('[data-slot="grid-row"]').nth(2);
  await row.locator("td").nth(3).click();
  await expect(row).toHaveClass(/tdg-row--active-indicator/);

  // Shrink the column in front of the locked section, which is what leaves the
  // table narrower than the viewport.
  await resizeBy(page, grid, "openedAt", -140);
  await expect(grid).toHaveAttribute("data-column-width-mode", "fixed");

  const geometry = await row.evaluate((element) => {
    const cells = [...element.children] as HTMLElement[];
    const read = (cell: HTMLElement) => {
      const style = getComputedStyle(cell);
      const after = getComputedStyle(cell, "::after");
      const rect = cell.getBoundingClientRect();
      return {
        id: cell.dataset.columnId ?? null,
        filler: cell.dataset.fillerVariant ?? null,
        left: rect.left,
        right: rect.right,
        transform: style.transform,
        ringLeft: after.borderLeftWidth,
        ringRight: after.borderRightWidth,
        ringTop: after.borderTopWidth,
        ringBottom: after.borderBottomWidth,
        // The indicator is an absolutely positioned `::after` at `inset: 0`,
        // which resolves against the padding box. A cell with a bottom border
        // has its padding box lifted by that border, so a neighbour without one
        // paints its segment of the ring lower than the rest of the row.
        ringBottomY: rect.bottom - (parseFloat(style.borderBottomWidth) || 0),
      };
    };

    return { cells: cells.map(read), rowRight: element.getBoundingClientRect().right };
  });

  const lockedEnd = geometry.cells.at(-1)!;

  // The locked column used to be translated back to the viewport edge. It is
  // sticky, so it kept its in-flow slot and only its paint moved — leaving an
  // empty phantom column, exactly as wide as itself, inside the row.
  expect(lockedEnd.transform, "locked-end column is not transformed").toBe(
    "none"
  );

  // A filler absorbs the slack instead, and with a locked section present it has
  // to sit *interior* to it so the locked column stays the row's last cell.
  const filler = geometry.cells.find((cell) => cell.filler !== null);
  expect(filler?.filler, "slack is absorbed interior to the locked section").toBe(
    "interior"
  );
  expect(geometry.cells.at(-1)?.filler, "locked column is still last").toBeNull();

  // No hole anywhere: every cell starts where the previous one ended.
  for (let index = 1; index < geometry.cells.length; index += 1) {
    const previous = geometry.cells[index - 1]!;
    const current = geometry.cells[index]!;
    expect(
      Math.abs(current.left - previous.right),
      `no gap between ${previous.id ?? previous.filler} and ${current.id ?? current.filler}`
    ).toBeLessThanOrEqual(MAX_TILING_DRIFT_PX);
  }

  // And the indicator reads as one rectangle rather than two: closed at the
  // outer edges only, continuous top and bottom across everything between,
  // including the filler, which is row content.
  expect(geometry.cells[0]!.ringLeft, "ring closes on the left").not.toBe("0px");
  expect(lockedEnd.ringRight, "ring closes on the right").not.toBe("0px");
  for (const [index, cell] of geometry.cells.entries()) {
    const label = cell.id ?? `filler:${cell.filler}`;
    expect(cell.ringTop, `${label} carries the top segment`).not.toBe("0px");
    expect(cell.ringBottom, `${label} carries the bottom segment`).not.toBe(
      "0px"
    );
    if (index > 0) {
      expect(cell.ringLeft, `${label} does not close mid-row`).toBe("0px");
    }
    if (index < geometry.cells.length - 1) {
      expect(cell.ringRight, `${label} does not close mid-row`).toBe("0px");
    }
    // ...and the bottom segment is level across the whole row, filler included.
    expect(
      Math.abs(cell.ringBottomY - geometry.cells[0]!.ringBottomY),
      `${label} bottom segment is level with the rest of the row`
    ).toBeLessThanOrEqual(MAX_EXACT_DRIFT_PX);
  }
});

test("the column-boundary indicator paints on the column boundary, trailing column included", async ({
  page,
}) => {
  await page.goto("/examples/basic");
  const grid = page.locator(".InovuaReactDataGrid.tdg-root").first();
  await expect(grid).toBeVisible();

  // The indicator lived on the resize handle's own `::before`, centred in a box
  // that deliberately shifts inboard on the trailing column. It moved with the
  // box and painted ~12px adrift, so the pointer and the drag proxy disagreed
  // for the whole drag. `right` also resolves against the *padding* box, which
  // stops inside the cell's 1px separator — worth 1px on every bordered column.
  const offsets = await grid.evaluate((element) => {
    const cells = [
      ...element.querySelectorAll<HTMLElement>(
        '.tdg-header-row > [data-slot="grid-header-cell"]'
      ),
    ];

    return cells.map((cell, index) => {
      // The indicator hangs off `__inner`, whose padding box stops short of the
      // cell's outer edge by the cell's padding plus its separator border.
      const inner = cell.querySelector<HTMLElement>(".tdg-header-cell__inner");
      const innerRight = inner?.getBoundingClientRect().right ?? 0;
      const indicatorRight = inner
        ? innerRight - (parseFloat(getComputedStyle(inner, "::after").right) || 0)
        : Number.NaN;

      return {
        id: cell.dataset.columnId ?? null,
        trailing: index === cells.length - 1,
        offsetFromBoundary: indicatorRight - cell.getBoundingClientRect().right,
      };
    });
  });

  expect(offsets.length).toBeGreaterThan(1);
  for (const column of offsets) {
    expect(
      Math.abs(column.offsetFromBoundary),
      `${column.id}${column.trailing ? " (trailing)" : ""} indicator sits on the boundary`
    ).toBeLessThanOrEqual(MAX_EXACT_DRIFT_PX);
  }

  // The behavioural half: aiming at the boundary is what has to reveal the
  // indicator and start a drag.
  //
  // Checked on an interior column deliberately. The trailing target is pulled
  // inboard of an overlay vertical scrollbar, which owns that strip and wins
  // hit-testing — GitHub issue #43 pins exactly that with an `elementFromPoint`
  // assertion. So on the trailing column the line marks the boundary while the
  // grab zone stops a scrollbar-footprint short of it, and the two cannot both
  // be satisfied until the bar stops covering the header.
  const interior = offsets.at(-2)!;
  const interiorHeader = grid.locator(
    `[data-slot="grid-header-cell"][data-column-id="${interior.id}"]`
  );
  const box = await interiorHeader.boundingBox();
  if (!box) throw new Error("no interior header cell");
  await page.mouse.move(box.x + box.width - 1, box.y + box.height / 2);

  await expect
    .poll(() =>
      interiorHeader.evaluate((cell) => {
        const inner = cell.querySelector(".tdg-header-cell__inner");
        return inner ? getComputedStyle(inner, "::after").opacity : null;
      })
    )
    .toBe("1");
});

test("pressing a resize handle without moving leaves the layout mode alone", async ({
  page,
}) => {
  await page.goto("/examples/basic");
  const grid = page.locator(".InovuaReactDataGrid.tdg-root").first();
  await expect(grid).toHaveAttribute("data-column-width-mode", "stretch");

  const readWidths = () =>
    grid.evaluate((element) =>
      [
        ...element.querySelectorAll<HTMLElement>(
          '.tdg-header-row > [data-slot="grid-header-cell"]'
        ),
      ].map((cell) => Math.round(cell.getBoundingClientRect().width))
    );

  const before = await readWidths();

  // Snapshotting the rendered widths is what switches the grid out of stretch
  // mode, and it used to happen on pointerdown — so a click that resized
  // nothing permanently changed how the grid lays itself out from then on.
  await resizeBy(page, grid, "city", 0);

  await expect(grid).toHaveAttribute("data-column-width-mode", "stretch");
  expect(await readWidths(), "widths are untouched").toEqual(before);

  // A real drag must still switch modes, or this test would pass on a grid that
  // simply stopped resizing.
  await resizeBy(page, grid, "city", -60);
  await expect(grid).toHaveAttribute("data-column-width-mode", "fixed");
});
