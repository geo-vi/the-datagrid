import { expect, test } from "@playwright/test";

// GitHub issue #61: switching from one custom theme to another left stale row
// colors behind. The old runtime bridge scraped Inovua's rules out of
// `document.styleSheets` and wrote them back as inline `--tdg-*` styles on the
// grid root; anything it could not find kept the previous theme's value, so
// `--tdg-row-odd-bg` / `--tdg-row-even-bg` did not follow a custom-to-custom
// switch. Custom themes now resolve through the same CSS cascade the built-in
// themes use, so every switch is a pure stylesheet swap with no inline state.

type ThemeCase = {
  /** Label of the theme button in the examples toolbar. */
  button: string;
  /** Expected `data-theme` on the grid root. */
  theme: string;
  /** Authored `--tdg-row-odd-bg` / `--tdg-row-even-bg`, as declared by the theme. */
  rowOddBg: string;
  rowEvenBg: string;
  /**
   * Authored `--tdg-row-active-border-color` / `--tdg-row-active-color`. Both
   * are pinned per theme rather than derived: the border used to follow
   * `--tdg-color-accent`, which these themes set to a pale hover tint, so it
   * resolved to a near-invisible near-white.
   */
  rowActiveBorderColor: string;
  rowActiveColor: string;
};

// Values come straight from examples/src/themes/*.scss. HF Dark deliberately
// paints odd and even rows the same color: coming from Ikarus Light (where they
// differ, #f8f8f8 vs #ffffff) a stale token shows up as visibly striped rows.
const THEME_SEQUENCE: ThemeCase[] = [
  {
    button: "Ikarus Dark",
    theme: "ikarus-dark",
    rowOddBg: "#282828",
    rowEvenBg: "#343434",
    rowActiveBorderColor: "#252525",
    rowActiveColor: "#c5cae9",
  },
  {
    button: "Ikarus Light",
    theme: "ikarus-light",
    rowOddBg: "#f8f8f8",
    rowEvenBg: "#ffffff",
    rowActiveBorderColor: "#caae53",
    rowActiveColor: "#555e68",
  },
  {
    button: "HF Dark",
    theme: "hf-dark",
    rowOddBg: "#191919",
    rowEvenBg: "#191919",
    rowActiveBorderColor: "#26324a",
    rowActiveColor: "#c5cae9",
  },
  // Re-entering the first theme catches a switch that only works on the way out.
  {
    button: "Ikarus Dark",
    theme: "ikarus-dark",
    rowOddBg: "#282828",
    rowEvenBg: "#343434",
    rowActiveBorderColor: "#252525",
    rowActiveColor: "#c5cae9",
  },
];

// The only `--tdg-*` custom properties the grid legitimately writes inline come
// from props or runtime layout rather than from a theme: two from
// `columnResizeHandleWidth` / `columnResizeProxyWidth`, one from the measured
// scrollbar footprint, and one from the header block's height, which the CSS
// needs to inset the vertical scrollbar's track. Asserting the exact set (not
// just "no row tokens") means a reintroduced runtime theme bridge fails this
// test whichever token it decides to inline. Kept sorted, since the assertion
// sorts.
const PROP_DRIVEN_INLINE_TOKENS = [
  "--tdg-column-resize-handle-width",
  "--tdg-column-resize-proxy-width",
  "--tdg-header-block-height",
  "--tdg-scroll-vertical-footprint",
];

function hexToRgb(hex: string): string {
  const value = hex.replace("#", "");
  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);

  return `rgb(${red}, ${green}, ${blue})`;
}

test("GitHub issue #61: custom-to-custom theme switches update row tokens", async ({
  page,
}) => {
  await page.goto("/basic");

  const grid = page.locator(".InovuaReactDataGrid.tdg-root").first();
  await expect(grid).toHaveAttribute("data-theme", "default");

  const readRowState = () =>
    grid.evaluate((root) => {
      const oddRow = root.querySelector(".InovuaReactDataGrid__row--odd");
      const evenRow = root.querySelector(".InovuaReactDataGrid__row--even");
      const rootStyle = getComputedStyle(root);
      const inlineTokens: string[] = [];

      for (let index = 0; index < root.style.length; index += 1) {
        const property = root.style.item(index);

        if (property.startsWith("--tdg-")) {
          inlineTokens.push(property);
        }
      }

      return {
        theme: root.getAttribute("data-theme"),
        inlineTokens,
        rowOddVar: rootStyle.getPropertyValue("--tdg-row-odd-bg").trim(),
        rowEvenVar: rootStyle.getPropertyValue("--tdg-row-even-bg").trim(),
        rowActiveBorderVar: rootStyle
          .getPropertyValue("--tdg-row-active-border-color")
          .trim(),
        rowActiveColorVar: rootStyle
          .getPropertyValue("--tdg-row-active-color")
          .trim(),
        oddRowBackgroundColor: oddRow
          ? getComputedStyle(oddRow).backgroundColor
          : null,
        evenRowBackgroundColor: evenRow
          ? getComputedStyle(evenRow).backgroundColor
          : null,
      };
    });

  for (const themeCase of THEME_SEQUENCE) {
    await page
      .getByRole("button", { name: themeCase.button, exact: true })
      .click();
    await expect(grid).toHaveAttribute("data-theme", themeCase.theme);

    // The rows repaint on the next frame after the attribute flips.
    await expect
      .poll(async () => (await readRowState()).oddRowBackgroundColor)
      .toBe(hexToRgb(themeCase.rowOddBg));

    const rowState = await readRowState();

    expect(rowState.rowOddVar, `${themeCase.theme} --tdg-row-odd-bg`).toBe(
      themeCase.rowOddBg
    );
    expect(rowState.rowEvenVar, `${themeCase.theme} --tdg-row-even-bg`).toBe(
      themeCase.rowEvenBg
    );
    expect(
      rowState.oddRowBackgroundColor,
      `${themeCase.theme} odd row background`
    ).toBe(hexToRgb(themeCase.rowOddBg));
    expect(
      rowState.evenRowBackgroundColor,
      `${themeCase.theme} even row background`
    ).toBe(hexToRgb(themeCase.rowEvenBg));
    expect(
      rowState.rowActiveBorderVar,
      `${themeCase.theme} --tdg-row-active-border-color`
    ).toBe(themeCase.rowActiveBorderColor);
    expect(
      rowState.rowActiveColorVar,
      `${themeCase.theme} --tdg-row-active-color`
    ).toBe(themeCase.rowActiveColor);

    // No inline theme state means nothing can go stale on the next switch.
    expect(
      [...rowState.inlineTokens].sort(),
      `${themeCase.theme} inline tokens on the grid root`
    ).toEqual(PROP_DRIVEN_INLINE_TOKENS);
  }
});

test("GitHub issue #61: --tdg-font-size drives the rendered cell type scale", async ({
  page,
}) => {
  await page.goto("/basic");

  const grid = page.locator(".InovuaReactDataGrid.tdg-root").first();
  const cell = grid.locator(".InovuaReactDataGrid__cell").first();
  const headerContent = grid
    .locator(".InovuaReactDataGrid__column-header__content")
    .first();

  await expect(cell).toBeVisible();
  await expect(cell).toHaveCSS("font-size", "14px");
  await expect(headerContent).toHaveCSS("font-size", "14px");

  // A consumer override, authored the way a theme would author it.
  await page.addStyleTag({
    content: `.tdg-root.InovuaReactDataGrid { --tdg-font-size: 1.25rem; }`,
  });

  await expect(cell).toHaveCSS("font-size", "20px");
  // The header keeps its own token, so it is unaffected by the grid font size.
  await expect(headerContent).toHaveCSS("font-size", "14px");

  await page.addStyleTag({
    content: `.tdg-root.InovuaReactDataGrid { --tdg-header-font-size: 0.75rem; }`,
  });

  await expect(headerContent).toHaveCSS("font-size", "12px");
  await expect(cell).toHaveCSS("font-size", "20px");
});

test("GitHub issue #61: --tdg-cell-border-color paints both body-cell gridlines", async ({
  page,
}) => {
  await page.goto("/basic");

  const grid = page.locator(".InovuaReactDataGrid.tdg-root").first();
  await expect(
    grid.locator(".InovuaReactDataGrid__cell").first()
  ).toBeVisible();

  const CELL_BORDER = "rgb(255, 0, 0)";
  const GENERIC_BORDER = "rgb(0, 0, 255)";

  // Deliberately different values: when the two match, a gridline that falls
  // back to --tdg-color-border looks correct while ignoring its own token.
  await page.addStyleTag({
    content: `.tdg-root.InovuaReactDataGrid {
      --tdg-color-border: ${GENERIC_BORDER};
      --tdg-cell-border-color: ${CELL_BORDER};
    }`,
  });

  // The examples toolbar defaults to `showCellBorders: true`, so body cells
  // carry both the vertical and the horizontal gridline.
  const borderedCell = grid
    .locator(
      ".InovuaReactDataGrid__cell--show-border-bottom.InovuaReactDataGrid__cell--show-border-right:not(.InovuaReactDataGrid__cell--last)"
    )
    .first();
  await expect(borderedCell).toBeVisible();

  const cellBorders = await borderedCell.evaluate((element) => {
    const style = getComputedStyle(element);

    return {
      bottomColor: style.borderBottomColor,
      bottomWidth: style.borderBottomWidth,
      rightColor: style.borderRightColor,
      rightWidth: style.borderRightWidth,
    };
  });

  expect(cellBorders).toEqual({
    bottomColor: CELL_BORDER,
    bottomWidth: "1px",
    rightColor: CELL_BORDER,
    rightWidth: "1px",
  });

  // Proof the override actually diverged: chrome that is not a body gridline
  // still resolves through the generic border token.
  const headerBorderColor = await grid
    .locator(".InovuaReactDataGrid__column-header")
    .first()
    .evaluate((element) => getComputedStyle(element).borderBottomColor);

  expect(headerBorderColor).toBe(GENERIC_BORDER);
});
