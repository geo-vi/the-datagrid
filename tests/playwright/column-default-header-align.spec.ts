import { expect, test } from "@playwright/test";

// `columnDefaultHeaderAlign` fills in for a column that states neither
// `headerAlign` nor `textAlign`, so a grid can centre or end-align every header
// once instead of per column.
//
// A sortable header's label is a flex item that hugs its own text, so the
// element box says nothing about where the text landed — these measure the text
// itself with a Range, the same way the `/basic` alignment test does.
//
// The fixture renders the same columns twice: once with
// `columnDefaultHeaderAlign="center"`, once without it. `id` and `name` state
// no alignment and take the default (`id` sortable, `name` not, which are two
// different header layouts). `city` sets `headerAlign` and `amount` sets only
// `textAlign`; both are column-level statements and must beat the root
// fallback.
type Gaps = { left: number; right: number };
type Placement = {
  header: Gaps | null;
  body: Gaps | null;
  headerCheckbox: Gaps | null;
  bodyCheckbox: Gaps | null;
};

const CHECKBOX_COL_ID = "__checkbox__";

async function measure(page: import("@playwright/test").Page, testId: string) {
  const grid = page.locator(`[data-testid="${testId}"] .tdg-root`).first();
  await expect(grid.locator("tbody td").first()).toBeVisible();

  return grid.evaluate((root) => {
    const gapsOf = (box: DOMRect, target: DOMRect) => ({
      left: Math.round(target.left - box.left),
      right: Math.round(box.right - target.right),
    });

    // The widest text run inside the cell, measured as a Range so the number is
    // the glyphs' position rather than their container's.
    const textGaps = (cell: Element) => {
      const walker = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT);
      let node: Node | null;
      let widest: DOMRect | null = null;
      while ((node = walker.nextNode())) {
        if (!node.textContent?.trim()) continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        const rect = range.getBoundingClientRect();
        if (rect.width && (!widest || rect.width > widest.width)) widest = rect;
      }
      if (!widest) return null;
      return gapsOf(cell.getBoundingClientRect(), widest);
    };

    const checkboxGaps = (cell: Element | null | undefined) => {
      const box = cell?.querySelector(".tdg-checkbox");
      if (!box || !cell) return null;
      return gapsOf(cell.getBoundingClientRect(), box.getBoundingClientRect());
    };

    const row = root.querySelector("tbody .tdg-row");
    const out: Record<string, unknown> = {};
    for (const header of root.querySelectorAll(
      ".tdg-header-row > .tdg-header-cell"
    )) {
      const id = (header as HTMLElement).dataset.columnId;
      if (!id) continue;
      const cell = row?.querySelector(`td[data-column-id="${id}"]`);
      out[id] = {
        header: textGaps(header),
        body: cell ? textGaps(cell) : null,
        headerCheckbox: checkboxGaps(header),
        bodyCheckbox: checkboxGaps(cell),
      };
    }
    return out as Record<string, Placement>;
  });
}

test("columnDefaultHeaderAlign centres the headers that state no alignment", async ({
  page,
}) => {
  await page.goto("/compat/column-default-header-align");

  const centred = await measure(page, "default-centered-grid");
  const baseline = await measure(page, "baseline-grid");

  for (const id of ["id", "name", "city", "amount"]) {
    expect(centred[id]?.header, `${id} header text`).not.toBeNull();
    expect(centred[id]?.body, `${id} body text`).not.toBeNull();
  }

  // Without the prop, the same columns keep the label on the leading padding.
  // This is what the centred grid is being compared against.
  for (const id of ["id", "name"]) {
    expect(
      baseline[id]!.header!.left,
      `${id} header starts without the prop`
    ).toBeLessThan(12);
  }

  // `name` is not sortable, so its label is a block filling the header and
  // `text-align` centres the text exactly.
  const name = centred.name!;
  expect(
    Math.abs(name.header!.left - name.header!.right),
    "name header text is centred"
  ).toBeLessThanOrEqual(2);

  // `id` is sortable: the label and its sort indicator centre as one group, so
  // the label itself sits a little inside. Bounded rather than pinned, since
  // the offset tracks the indicator's width.
  const idCol = centred.id!;
  expect(
    idCol.header!.left,
    "id header text is off the leading padding"
  ).toBeGreaterThan(12);
  expect(
    Math.abs(idCol.header!.left - idCol.header!.right),
    "id header text is near the centre"
  ).toBeLessThanOrEqual(40);

  // A column-level `headerAlign` beats the root fallback.
  const city = centred.city!;
  expect(
    city.header!.left,
    "city header keeps headerAlign: start"
  ).toBeLessThan(12);
  expect(city.header!.left).toBeCloseTo(baseline.city!.header!.left, 0);

  // So does a column-level `textAlign`, which drives the header when
  // `headerAlign` is absent.
  const amount = centred.amount!;
  expect(
    amount.header!.right,
    "amount header keeps textAlign: end"
  ).toBeLessThan(12);
  expect(amount.header!.right).toBeLessThan(amount.header!.left);

  // Header-only: the body cells are untouched by the root prop.
  for (const id of ["id", "name", "city"]) {
    expect(centred[id]!.body!.left, `${id} body still starts`).toBeLessThan(12);
  }
  expect(centred.amount!.body!.right, "amount cell still ends").toBeLessThan(
    12
  );

  // The checkbox column opts out. Its header is deliberately wider than the box
  // needs, so a drift would show: the checkbox stays where it sits without the
  // prop, lined up with the checkboxes below it.
  const checkbox = centred[CHECKBOX_COL_ID]!;
  const baselineCheckbox = baseline[CHECKBOX_COL_ID]!;
  expect(checkbox.headerCheckbox, "header checkbox measured").not.toBeNull();
  expect(checkbox.bodyCheckbox, "body checkbox measured").not.toBeNull();
  expect(checkbox.headerCheckbox!.left).toBeCloseTo(
    baselineCheckbox.headerCheckbox!.left,
    0
  );
  expect(
    Math.abs(checkbox.headerCheckbox!.left - checkbox.bodyCheckbox!.left),
    "header checkbox lines up with the row checkboxes"
  ).toBeLessThanOrEqual(1);

  // The class contract follows the opt-out: the checkbox header must not claim
  // an alignment the prop did not give it. This is what the exemption in
  // `HeaderCell` actually guards — the geometry above is already immune,
  // because the checkbox sits in a centring flex box.
  const checkboxHeader = page
    .locator('[data-testid="default-centered-grid"] .tdg-header-row')
    .locator(`.tdg-header-cell[data-column-id="${CHECKBOX_COL_ID}"]`);
  await expect(checkboxHeader).toHaveClass(
    /InovuaReactDataGrid__column-header--align-start/
  );
  await expect(checkboxHeader).not.toHaveClass(
    /InovuaReactDataGrid__column-header--align-center/
  );

  // The columns that do take the default say so in the DOM too.
  for (const id of ["id", "name"]) {
    await expect(
      page
        .locator('[data-testid="default-centered-grid"] .tdg-header-row')
        .locator(`.tdg-header-cell[data-column-id="${id}"]`)
    ).toHaveClass(/InovuaReactDataGrid__column-header--align-center/);
  }
});
