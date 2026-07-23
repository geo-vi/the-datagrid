import { expect, test, type Locator, type Page } from "@playwright/test";

const fixturePath = "/compat/disabled-rows";

async function openFixture(
  page: Page,
  mode:
    | "basic"
    | "custom-checkbox"
    | "filter"
    | "mobile"
    | "pagination"
    | "virtual" = "basic"
) {
  await page.goto(`${fixturePath}?mode=${mode}`);
  const scope = page.getByTestId("disabled-rows-fixture");
  await expect(scope).toHaveAttribute("data-mode", mode);
  return scope;
}

function rowAt(scope: Locator, index: number) {
  return scope.locator(`[data-slot="grid-row"][data-row-index="${index}"]`);
}

async function clickCenter(page: Page, locator: Locator, count = 1) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  if (!box) return;

  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, {
    clickCount: count,
  });
}

test("disabledRows maps displayed indexes and exposes the Inovua disabled row contract", async ({
  page,
}) => {
  const scope = await openFixture(page);
  const disabledRow = rowAt(scope, 1);
  const enabledRow = rowAt(scope, 0);
  const falseEntryRow = rowAt(scope, 3);

  await expect(disabledRow).toHaveAttribute("data-row-id", "person-a");
  await expect(disabledRow).toHaveClass(/\btdg-row--disabled\b/);
  await expect(disabledRow).toHaveClass(
    /\bInovuaReactDataGrid__row--disabled\b/
  );
  await expect(disabledRow).toHaveAttribute("data-disabled", "true");
  await expect(disabledRow).toHaveAttribute("aria-disabled", "true");
  await expect(disabledRow).toHaveCSS("opacity", "0.5");
  await expect(disabledRow).toHaveCSS("pointer-events", "none");
  await expect(scope.getByTestId("disabled-row-render-1")).toHaveAttribute(
    "data-disabled-row",
    "true"
  );
  await expect
    .poll(() =>
      disabledRow.evaluate((element) =>
        element.style.getPropertyValue("--fixture-disabled-row")
      )
    )
    .toBe("1");

  await expect(enabledRow).not.toHaveClass(/\btdg-row--disabled\b/);
  await expect(enabledRow).not.toHaveAttribute("data-disabled");
  await expect(scope.getByTestId("disabled-row-render-0")).toHaveAttribute(
    "data-disabled-row",
    "undefined"
  );
  await expect(falseEntryRow).not.toHaveClass(/\btdg-row--disabled\b/);
  await expect(scope.getByTestId("disabled-row-render-3")).toHaveAttribute(
    "data-disabled-row",
    "false"
  );

  await scope.getByTestId("clear-disabled-rows").click();
  await expect(disabledRow).not.toHaveClass(/\btdg-row--disabled\b/);
  await expect(disabledRow).not.toHaveAttribute("aria-disabled");
  await expect(scope.getByTestId("disabled-row-render-1")).toHaveAttribute(
    "data-disabled-row",
    "null"
  );
  await expect
    .poll(() =>
      disabledRow.evaluate((element) =>
        element.style.getPropertyValue("--fixture-disabled-row")
      )
    )
    .toBe("0");
});

test("disabled rows suppress real pointer selection and editing while enabled rows remain interactive", async ({
  page,
}) => {
  const scope = await openFixture(page);
  const disabledNameCell = rowAt(scope, 1).locator('[data-column-id="name"]');
  const disabledCheckbox = rowAt(scope, 1).getByRole("checkbox");

  await expect(disabledCheckbox).toHaveAttribute("tabindex", "-1");
  await clickCenter(page, disabledCheckbox);
  await clickCenter(page, disabledNameCell);
  await clickCenter(page, disabledNameCell, 2);
  await expect(scope.getByTestId("disabled-selected-keys")).toHaveText("[]");
  await expect(scope.getByTestId("disabled-selection-events")).toHaveText("0");
  await expect(scope.getByTestId("disabled-edit-start-events")).toHaveText("0");
  await expect(
    disabledNameCell.locator('[data-slot="cell-editor"]')
  ).toHaveCount(0);

  const enabledNameCell = rowAt(scope, 0).locator('[data-column-id="name"]');
  await clickCenter(page, enabledNameCell);
  await expect(scope.getByTestId("disabled-selected-keys")).toHaveText(
    '["person-c"]'
  );
  await clickCenter(page, enabledNameCell, 2);
  await expect(scope.getByTestId("disabled-edit-start-events")).not.toHaveText(
    "0"
  );
  await expect(
    enabledNameCell.locator('[data-slot="cell-editor"]')
  ).toBeVisible();
});

test("custom renderCheckbox receives the raw disabledRow metadata", async ({
  page,
}) => {
  const scope = await openFixture(page, "custom-checkbox");

  await expect(
    scope.getByTestId("disabled-header-checkbox-metadata")
  ).toHaveAttribute("data-disabled-row", "undefined");
  await expect(
    scope.getByTestId("disabled-row-checkbox-metadata-0")
  ).toHaveAttribute("data-disabled-row", "undefined");
  await expect(
    scope.getByTestId("disabled-row-checkbox-metadata-1")
  ).toHaveAttribute("data-disabled-row", "true");
  await expect(
    scope.getByTestId("disabled-row-checkbox-metadata-3")
  ).toHaveAttribute("data-disabled-row", "false");

  await scope.getByTestId("clear-disabled-rows").click();
  await expect(
    scope.getByTestId("disabled-row-checkbox-metadata-1")
  ).toHaveAttribute("data-disabled-row", "null");
});

test("disabled rows remain selectable and editable through upstream-compatible APIs", async ({
  page,
}) => {
  const scope = await openFixture(page);
  const disabledRow = rowAt(scope, 1);

  await scope.getByTestId("select-row-one").click();
  await expect(scope.getByTestId("disabled-selected-keys")).toHaveText(
    '["person-a"]'
  );
  await expect(disabledRow).toHaveAttribute("data-selected", "true");
  await expect(disabledRow).toHaveClass(/\btdg-row--disabled\b/);

  await scope.locator("thead").getByRole("checkbox").click();
  await expect(scope.getByTestId("disabled-selected-keys")).toHaveText(
    '["person-a","person-b","person-c","person-d","person-e","person-f"]'
  );

  await scope.getByTestId("start-edit-row-one").click();
  await expect(scope.getByTestId("disabled-edit-start-events")).toHaveText("1");
  await expect(
    disabledRow
      .locator('[data-column-id="name"]')
      .locator('[data-slot="cell-editor"]')
  ).toBeVisible();
});

test("disabledRows follows the current sorted view index instead of idProperty", async ({
  page,
}) => {
  const scope = await openFixture(page);
  const grid = scope.locator(".tdg-root");

  await expect(rowAt(scope, 1)).toHaveAttribute("data-row-id", "person-a");
  await grid
    .locator('[data-slot="grid-header-cell"][data-column-id="name"]')
    .click();

  await expect(rowAt(scope, 0)).toHaveAttribute("data-row-id", "person-a");
  await expect(rowAt(scope, 0)).not.toHaveClass(/\btdg-row--disabled\b/);
  await expect(rowAt(scope, 1)).toHaveAttribute("data-row-id", "person-b");
  await expect(rowAt(scope, 1)).toHaveClass(/\btdg-row--disabled\b/);
});

test("disabledRows follows the current locally filtered view index", async ({
  page,
}) => {
  const scope = await openFixture(page, "filter");

  await expect(rowAt(scope, 0)).toHaveAttribute("data-row-id", "person-a");
  await expect(rowAt(scope, 0)).not.toHaveClass(/\btdg-row--disabled\b/);
  await expect(rowAt(scope, 1)).toHaveAttribute("data-row-id", "person-d");
  await expect(rowAt(scope, 1)).toHaveClass(/\btdg-row--disabled\b/);
});

test("disabledRows indexes restart on each locally paginated page", async ({
  page,
}) => {
  const scope = await openFixture(page, "pagination");

  await expect(rowAt(scope, 0)).toHaveAttribute("data-row-id", "person-c");
  await expect(rowAt(scope, 0)).toHaveClass(/\btdg-row--disabled\b/);

  await scope.getByRole("button", { name: "Go to next page" }).click();
  await expect(rowAt(scope, 0)).toHaveAttribute("data-row-id", "person-d");
  await expect(rowAt(scope, 0)).toHaveClass(/\btdg-row--disabled\b/);
  await expect(rowAt(scope, 1)).not.toHaveClass(/\btdg-row--disabled\b/);
});

test("virtual row recycling does not leak disabled state", async ({ page }) => {
  const scope = await openFixture(page, "virtual");

  await expect(rowAt(scope, 1)).toHaveAttribute("data-row-id", "virtual-1");
  await expect(rowAt(scope, 1)).toHaveClass(/\btdg-row--disabled\b/);

  await scope.getByTestId("scroll-to-row-sixty").click();
  await expect(rowAt(scope, 60)).toHaveAttribute("data-row-id", "virtual-60");
  await expect(rowAt(scope, 60)).toHaveClass(/\btdg-row--disabled\b/);
  await expect(rowAt(scope, 59)).not.toHaveClass(/\btdg-row--disabled\b/);

  await scope.getByTestId("move-virtual-disabled-row").click();
  await expect(rowAt(scope, 60)).not.toHaveClass(/\btdg-row--disabled\b/);
  await expect(rowAt(scope, 61)).toHaveClass(/\btdg-row--disabled\b/);

  const viewport = scope.locator('[data-slot="scroll-area-viewport"]');
  await viewport.evaluate((element) => {
    element.scrollTop = 0;
    element.dispatchEvent(new Event("scroll"));
  });
  await expect(rowAt(scope, 1)).not.toHaveClass(/\btdg-row--disabled\b/);

  await scope.getByTestId("restore-disabled-rows").click();
  await expect(rowAt(scope, 1)).toHaveClass(/\btdg-row--disabled\b/);
});

test("mobile transformed rows retain disabled pointer and visual semantics", async ({
  page,
}) => {
  await page.setViewportSize({ width: 700, height: 900 });
  const scope = await openFixture(page, "mobile");
  const grid = scope.locator(".tdg-root");

  await expect(grid).toHaveAttribute("data-layout", "mobile-list");
  const disabledCard = scope.locator('article[data-row-id="person-a"]');
  const enabledCard = scope.locator('article[data-row-id="person-c"]');

  await expect(disabledCard).toHaveAttribute("data-row-index", "1");
  await expect(disabledCard).toHaveAttribute("aria-disabled", "true");
  await expect(disabledCard).toHaveCSS("opacity", "0.5");
  await expect(disabledCard).toHaveCSS("pointer-events", "none");

  await clickCenter(page, disabledCard);
  await expect(scope.getByTestId("disabled-selected-keys")).toHaveText("[]");

  await clickCenter(page, enabledCard);
  await expect(scope.getByTestId("disabled-selected-keys")).toHaveText(
    '["person-c"]'
  );
});
