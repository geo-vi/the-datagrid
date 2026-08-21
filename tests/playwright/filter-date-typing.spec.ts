import { expect, test } from "@playwright/test";

// dd/mm/yyyy segment order, so the year is the last segment the user fills.
test.use({ locale: "en-GB" });

const dateFilter = (page: import("@playwright/test").Page) =>
  page
    .locator('.tdg-filter-cell[data-column-id="placedAt"] input[type="date"]')
    .first();

test("typing a date into a date filter keeps every keystroke", async ({
  page,
}) => {
  await page.goto("/examples/toolbar");

  const input = dateFilter(page);
  await expect(input).toHaveValue("");
  await input.focus();

  // Day and month fill without the input ever holding a complete date.
  await page.keyboard.type("0808");
  await expect(input).toHaveValue("");

  // The year segment, by contrast, is complete after every digit, so each one
  // round-trips through the grid's filter state and back into the input. A
  // year under 1000 has to come back zero-padded or the input rejects it and
  // blanks itself, wiping the day and month along with the half-typed year.
  const steps: Array<[string, string]> = [
    ["2", "0002-08-08"],
    ["0", "0020-08-08"],
    ["2", "0202-08-08"],
    ["6", "2026-08-08"],
  ];
  for (const [digit, expected] of steps) {
    await page.keyboard.type(digit);
    await expect(input).toHaveValue(expected);
  }
});

test("caps the year at four digits so the filter keeps applying", async ({
  page,
}) => {
  await page.goto("/examples/toolbar");

  const input = dateFilter(page);
  await expect(input).toHaveAttribute("max", "9999-12-31");

  const rows = page
    .locator(".tdg-grid, .InovuaReactDataGrid")
    .first()
    .locator("tbody tr");
  const unfiltered = await rows.count();

  await input.focus();
  await page.keyboard.type("0808");

  // Past four digits the browser cycles the year within the window instead of
  // widening it. Without the cap it would keep going to six, into a range
  // `Date` cannot represent and the input will not report — the segments would
  // still read as typed while the value went empty and the filter silently
  // cleared, showing every row behind a field that looks filled.
  const steps: Array<[string, string]> = [
    ["2", "0002-08-08"],
    ["0", "0020-08-08"],
    ["2", "0202-08-08"],
    ["6", "2026-08-08"],
    ["5", "0265-08-08"],
    ["9", "2659-08-08"],
  ];
  for (const [digit, expected] of steps) {
    await page.keyboard.type(digit);
    await expect(input).toHaveValue(expected);
  }

  // Year 2659 with the column's afterOrOn operator excludes every row.
  await expect(rows).not.toHaveCount(unfiltered);
});
