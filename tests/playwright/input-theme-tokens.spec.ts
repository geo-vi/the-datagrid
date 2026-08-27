import { expect, test, type Locator, type Page } from "@playwright/test";

// The field's declarations are all !important, so the `--tdg-input-*` tokens are
// the only supported way into it. Each test pins one: a token nothing consumes
// looks, to a theme author, exactly like a token that never existed — which is
// what `--tdg-input-border-color-hover` / `-focus` were.

type FieldBox = {
  borderWidth: string;
  borderColor: string;
  radius: string;
  shadow: string;
  bg: string;
  color: string;
};

async function openEditingExample(page: Page): Promise<void> {
  await page.goto("/examples/editing");
  await page.locator(".tdg-root .InovuaReactDataGrid__cell").first().waitFor();
  // The field transitions its colors; an unwaited read lands mid-interpolation.
  await page.addStyleTag({
    content: `*, *::before, *::after { transition: none !important }`,
  });
}

async function setTokens(
  page: Page,
  tokens: Record<string, string>
): Promise<void> {
  await page.evaluate((entries) => {
    const root = document.querySelector<HTMLElement>(".tdg-root");
    if (!root) throw new Error("No grid root on the page");
    for (const [name, value] of Object.entries(entries)) {
      root.style.setProperty(name, value);
    }
  }, tokens);
}

function readBox(target: Locator): Promise<FieldBox> {
  return target.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      borderWidth: style.borderTopWidth,
      borderColor: style.borderTopColor,
      radius: style.borderTopLeftRadius,
      shadow: style.boxShadow,
      bg: style.backgroundColor,
      color: style.color,
    };
  });
}

/** The filter row's field: the standalone shape, ring and all. */
function filterField(page: Page): Locator {
  return page.locator(".tdg-root .inovua-react-toolkit-text-input").first();
}

function ownerCell(page: Page): Locator {
  return page
    .locator('.tdg-root [data-slot="grid-cell"][data-column-id="owner"]')
    .first();
}

test("the field's box follows the --tdg-input-* geometry tokens", async ({
  page,
}) => {
  await openEditingExample(page);
  const field = filterField(page);

  expect(await readBox(field)).toMatchObject({
    borderWidth: "1px",
    radius: "10px",
    shadow: "rgba(0, 0, 0, 0.05) 0px 1px 2px 0px",
  });

  // The legacy toolkit's field: square, two-pixel border, no drop shadow.
  await setTokens(page, {
    "--tdg-input-border-width": "2px",
    "--tdg-input-radius": "2px",
    "--tdg-input-shadow": "none",
    "--tdg-input-bg": "rgb(10, 20, 30)",
    "--tdg-input-color": "rgb(200, 100, 50)",
    "--tdg-input-border-color": "rgb(1, 2, 3)",
  });

  expect(await readBox(field)).toMatchObject({
    borderWidth: "2px",
    borderColor: "rgb(1, 2, 3)",
    radius: "2px",
    shadow: "none",
    bg: "rgb(10, 20, 30)",
    color: "rgb(200, 100, 50)",
  });
});

test("hover and focus border colors follow their own tokens", async ({
  page,
}) => {
  await openEditingExample(page);
  const field = filterField(page);
  await setTokens(page, {
    "--tdg-input-border-color": "rgb(1, 2, 3)",
    "--tdg-input-border-color-hover": "rgb(0, 255, 0)",
    "--tdg-input-border-color-focus": "rgb(255, 0, 255)",
    "--tdg-input-shadow-focus": "0 0 0 2px rgb(0, 0, 255)",
  });

  expect((await readBox(field)).borderColor).toBe("rgb(1, 2, 3)");

  await field.hover();
  expect((await readBox(field)).borderColor).toBe("rgb(0, 255, 0)");

  // Move the pointer off the field, or hover keeps winning over focus.
  await page.mouse.move(0, 0);
  await field.locator("input").focus();
  expect(await readBox(field)).toMatchObject({
    borderColor: "rgb(255, 0, 255)",
    shadow: "rgb(0, 0, 255) 0px 0px 0px 2px",
  });
});

test("the select trigger's hover and focus borders follow their tokens", async ({
  page,
}) => {
  await openEditingExample(page);
  await setTokens(page, {
    "--tdg-select-border-color": "rgb(1, 2, 3)",
    "--tdg-select-border-color-hover": "rgb(0, 255, 0)",
    "--tdg-select-border-color-focus": "rgb(255, 0, 255)",
  });

  const trigger = page.locator(".tdg-root .tdg-select-trigger").first();
  await trigger.waitFor();
  expect((await readBox(trigger)).borderColor).toBe("rgb(1, 2, 3)");

  await trigger.hover();
  expect((await readBox(trigger)).borderColor).toBe("rgb(0, 255, 0)");

  await page.mouse.move(0, 0);
  await trigger.focus();
  expect((await readBox(trigger)).borderColor).toBe("rgb(255, 0, 255)");
});

test("the bordered in-cell editor takes the focus border and stays ringless", async ({
  page,
}) => {
  await openEditingExample(page);
  await setTokens(page, {
    "--tdg-input-border-color": "rgb(1, 2, 3)",
    "--tdg-input-border-color-focus": "rgb(255, 0, 255)",
    "--tdg-input-shadow-focus": "0 0 0 2px rgb(0, 0, 255)",
  });

  await page.getByRole("button", { name: "Bordered" }).click();
  const cell = ownerCell(page);
  await cell.dblclick({ delay: 0 });

  const shell = page.locator(".tdg-root .tdg-cell-editor-shell").first();
  await shell.waitFor();
  await expect(cell).toHaveAttribute("data-editor-surface", "shell");

  // One border, and no ring drawn at the same width over the cell.
  expect(await readBox(shell)).toMatchObject({
    borderWidth: "1px",
    borderColor: "rgb(255, 0, 255)",
    shadow: "none",
  });
});

test("the seamless overlay ignores the field box entirely", async ({
  page,
}) => {
  await openEditingExample(page);
  await setTokens(page, {
    "--tdg-input-border-width": "2px",
    "--tdg-input-radius": "2px",
    "--tdg-input-shadow": "0 0 0 3px rgb(0, 255, 0)",
    "--tdg-input-shadow-focus": "0 0 0 2px rgb(0, 0, 255)",
  });

  const cell = ownerCell(page);
  await cell.dblclick({ delay: 0 });
  const overlay = page.locator(".tdg-root .tdg-text-editor").first();
  await overlay.waitFor();
  await expect(cell).toHaveAttribute("data-editor-surface", "seamless");

  // It stands in for the cell's own text, so it draws no box of its own.
  expect(await readBox(overlay)).toMatchObject({
    borderWidth: "0px",
    radius: "0px",
    shadow: "none",
    bg: "rgba(0, 0, 0, 0)",
  });
});

test("the clear button follows --tdg-input-clear-* and resets the host's button chrome", async ({
  page,
}) => {
  await openEditingExample(page);
  const cell = ownerCell(page);
  await cell.dblclick({ delay: 0 });

  const clear = page.locator(".tdg-text-editor__clear").first();
  await clear.waitFor();

  const readClear = () =>
    clear.evaluate((element) => {
      const style = getComputedStyle(element);
      const box = element.getBoundingClientRect();
      const glyph = element.querySelector("svg")!.getBoundingClientRect();
      return {
        size: [Math.round(box.width), Math.round(box.height)],
        glyph: [Math.round(glyph.width), Math.round(glyph.height)],
        color: style.color,
        borderWidth: style.borderTopWidth,
        bg: style.backgroundColor,
        padding: style.paddingTop,
      };
    });

  // A host stylesheet's own `button` rules must not dress this up.
  await page.addStyleTag({
    content: `button { border: 2px solid rgb(255, 0, 0); background: rgb(0, 128, 0); padding: 6px; border-radius: 9px }`,
  });
  expect(await readClear()).toMatchObject({
    size: [20, 20],
    glyph: [10, 10],
    borderWidth: "0px",
    bg: "rgba(0, 0, 0, 0)",
    padding: "0px",
  });

  await setTokens(page, {
    "--tdg-input-clear-size": "2rem",
    "--tdg-input-clear-color": "rgb(255, 128, 0)",
  });
  expect(await readClear()).toMatchObject({
    size: [32, 32],
    glyph: [16, 16],
    color: "rgb(255, 128, 0)",
  });
});
