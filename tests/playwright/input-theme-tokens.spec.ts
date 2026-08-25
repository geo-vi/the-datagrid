import { expect, test, type Page } from "@playwright/test";

// The button carries placement utilities and no reset, so anything a host app
// declares on `button` used to apply to it.

async function openEditingExample(page: Page): Promise<void> {
  await page.goto("/examples/editing");
  await page.locator(".tdg-root .InovuaReactDataGrid__cell").first().waitFor();
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

test("the clear button follows --tdg-input-clear-* and resets the host's button chrome", async ({
  page,
}) => {
  await openEditingExample(page);
  await page
    .locator('.tdg-root [data-slot="grid-cell"][data-column-id="owner"]')
    .first()
    .dblclick({ delay: 0 });

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
