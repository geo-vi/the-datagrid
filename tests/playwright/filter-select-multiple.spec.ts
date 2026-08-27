import { expect, test } from "@playwright/test";

const SINGLE = '.tdg-filter-cell[data-column-id="csrolename"]';
const MULTIPLE = '.tdg-filter-cell[data-column-id="disabled"]';

test("a multiple select filter is styled as the single one, not as a button", async ({
  page,
}) => {
  await page.goto("/examples/users");
  await page.getByRole("button", { name: "Ikarus Dark" }).click();

  const single = page.locator(SINGLE).locator("button").first();
  const multiple = page.locator(MULTIPLE).locator("button").first();
  await expect(single).toBeVisible();
  await expect(multiple).toBeVisible();

  // `.tdg-button` armours justify-content: center and a transparent background
  // with !important, so a Button here reads as centred against its chevron and
  // never takes the select surface — plainly wrong on ikarus-dark, where that
  // surface is several shades lighter than the filter row behind it. Both
  // triggers are read in one pass and polled, because switching theme animates
  // the colours and they would otherwise be sampled mid-transition.
  const readBoth = () =>
    page.evaluate(
      ([singleSel, multipleSel]) => {
        const read = (selector: string) => {
          const el = document.querySelector(`${selector} button`);
          if (!el) throw new Error(`no trigger in ${selector}`);
          const cs = getComputedStyle(el);
          return {
            backgroundColor: cs.backgroundColor,
            color: cs.color,
            borderColor: cs.borderColor,
            justifyContent: cs.justifyContent,
            fontSize: cs.fontSize,
            height: cs.height,
            padding: `${cs.paddingLeft}/${cs.paddingRight}`,
            borderRadius: cs.borderRadius,
          };
        };
        return { single: read(singleSel), multiple: read(multipleSel) };
      },
      [SINGLE, MULTIPLE]
    );

  await expect
    .poll(async () => {
      const { single: a, multiple: b } = await readBoth();
      return JSON.stringify(a) === JSON.stringify(b)
        ? "match"
        : `single=${JSON.stringify(a)} multiple=${JSON.stringify(b)}`;
    })
    .toBe("match");

  const { multiple: painted } = await readBoth();
  // The select surface, not a transparent button letting the filter row show.
  expect(painted.backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
  // Label left, chevron right, rather than the pair centred together.
  expect(painted.justifyContent).toBe("space-between");

  // The trigger's two wells, same as a single select has.
  await expect(multiple.locator(".tdg-select-value")).toHaveCount(1);
  await expect(multiple.locator(".tdg-select-tools")).toHaveCount(1);
});

test("a multiple select filter opens and toggles its options", async ({
  page,
}) => {
  await page.goto("/examples/users");

  const trigger = page.locator(MULTIPLE).locator("button").first();
  await expect(trigger).toHaveText("All states");

  await trigger.click();
  const menu = page.getByRole("menu");
  await expect(menu).toBeVisible();

  await menu.getByRole("menuitem", { name: "Yes" }).click();
  await expect(trigger).toHaveText("Yes");

  await menu.getByRole("menuitem", { name: "No" }).click();
  await expect(trigger).toHaveText("Yes, No");

  await menu.getByRole("menuitem", { name: "Yes" }).click();
  await expect(trigger).toHaveText("No");
});

// A DropdownMenuItem repaints any icon that does not name its own colour,
// which is how the tick stopped following the token it inherits.
test("the tick in a multiple select filter follows --tdg-checkbox-checked-color", async ({
  page,
}) => {
  await page.goto("/examples/users");
  await page.addStyleTag({
    content: ".tdg-root { --tdg-checkbox-checked-color: rgb(255, 0, 0); }",
  });

  const trigger = page.locator(MULTIPLE).locator("button").first();
  await trigger.click();
  const menu = page.getByRole("menu");
  await menu.getByRole("menuitem", { name: "Yes" }).click();

  const tick = menu
    .locator('[data-state="checked"].tdg-checkbox .tdg-checkbox__check-icon')
    .first();
  await expect(tick).toBeVisible();
  await expect(tick).toHaveCSS("color", "rgb(255, 0, 0)");
});
