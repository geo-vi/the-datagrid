import { expect, test } from "@playwright/test";

test("keeps the grid contained inside a constrained parent shell", async ({
  page,
}) => {
  await page.goto("/basic");

  const preview = page.getByTestId("example-preview-panel");
  await expect(preview).toBeVisible();

  const shell = preview.locator("section").first();
  const grid = shell.locator(".InovuaReactDataGrid.tdg-root").first();

  await shell.evaluate((node) => {
    node.style.width = "420px";
    node.style.maxWidth = "420px";
    node.style.minWidth = "420px";
  });

  await expect(shell).toBeVisible();
  await expect(grid).toBeVisible();

  const layout = await shell.evaluate((shell) => {
    const grid = shell.querySelector<HTMLElement>(
      ".InovuaReactDataGrid.tdg-root"
    );
    const headerViewport = shell?.querySelector<HTMLElement>(
      '[data-slot="grid-header-viewport"]'
    );
    const bodyViewport = shell?.querySelector<HTMLElement>(
      '[data-slot="scroll-area-viewport"]'
    );

    if (!shell || !grid || !headerViewport || !bodyViewport) return null;

    const shellRect = shell.getBoundingClientRect();
    const gridRect = grid.getBoundingClientRect();

    return {
      shellClientWidth: shell.clientWidth,
      shellScrollWidth: shell.scrollWidth,
      shellRectWidth: Math.round(shellRect.width * 100) / 100,
      gridClientWidth: grid.clientWidth,
      gridScrollWidth: grid.scrollWidth,
      gridRectWidth: Math.round(gridRect.width * 100) / 100,
      gridComputedMaxWidth: getComputedStyle(grid).maxWidth,
      headerViewportClientWidth: headerViewport.clientWidth,
      headerViewportScrollWidth: headerViewport.scrollWidth,
      bodyViewportClientWidth: bodyViewport.clientWidth,
      bodyViewportScrollWidth: bodyViewport.scrollWidth,
      rootOverflowsParent: gridRect.width > shellRect.width + 0.5,
      shellHasHorizontalOverflow: shell.scrollWidth > shell.clientWidth + 0.5,
      headerViewportHasHorizontalOverflow:
        headerViewport.scrollWidth > headerViewport.clientWidth + 0.5,
      bodyViewportHasHorizontalOverflow:
        bodyViewport.scrollWidth > bodyViewport.clientWidth + 0.5,
    };
  });

  expect(layout).not.toBeNull();
  expect(layout?.rootOverflowsParent).toBe(false);
  expect(layout?.shellHasHorizontalOverflow).toBe(false);
  expect(layout?.headerViewportHasHorizontalOverflow).toBe(true);
  expect(
    Boolean(layout?.headerViewportHasHorizontalOverflow) ||
      Boolean(layout?.bodyViewportHasHorizontalOverflow)
  ).toBe(true);
});

test("keeps the horizontal scrollbar above cells and draggable", async ({
  page,
}) => {
  await page.goto("/users");

  const preview = page.getByTestId("example-preview-panel");
  await expect(preview).toBeVisible();

  const shell = preview.locator("section").first();
  await shell.evaluate((node) => {
    node.style.width = "760px";
    node.style.maxWidth = "760px";
    node.style.minWidth = "760px";
  });

  for (const columnName of [
    "Failed logins",
    "Last login",
    "Password changed",
    "Language",
  ]) {
    await preview.getByRole("button", { name: columnName }).click();
  }

  const grid = preview.locator(".InovuaReactDataGrid.tdg-root").first();
  const scrollArea = grid.locator('[data-slot="scroll-area"]').first();
  const viewport = grid.locator('[data-slot="scroll-area-viewport"]').first();
  const horizontalScrollbar = grid
    .locator(
      '[data-slot="scroll-area-scrollbar"][data-orientation="horizontal"]'
    )
    .first();
  const horizontalThumb = horizontalScrollbar
    .locator('[data-slot="scroll-area-thumb"]')
    .first();

  await expect.poll(async () => {
    return viewport.evaluate((element) => {
      return element.scrollWidth > element.clientWidth;
    });
  }).toBe(true);

  await scrollArea.hover({
    position: {
      x: 24,
      y: Math.max(4, (await scrollArea.boundingBox())?.height ?? 12) - 4,
    },
  });

  await expect(horizontalScrollbar).toBeVisible();
  await expect(horizontalThumb).toBeVisible();

  const hitTest = await page.evaluate(() => {
    const scrollbar = document.querySelector<HTMLElement>(
      '[data-slot="scroll-area-scrollbar"][data-orientation="horizontal"]'
    );
    if (!scrollbar) return null;

    const rect = scrollbar.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const target = document.elementFromPoint(x, y) as HTMLElement | null;

    return {
      slot: target?.dataset.slot ?? null,
      insideCell: Boolean(target?.closest(".InovuaReactDataGrid__cell")),
    };
  });

  expect(hitTest).not.toBeNull();
  expect(hitTest?.insideCell).toBe(false);
  expect(["scroll-area-scrollbar", "scroll-area-thumb"]).toContain(
    hitTest?.slot ?? ""
  );

  const thumbBox = await horizontalThumb.boundingBox();
  expect(thumbBox).not.toBeNull();

  const beforeScrollLeft = await viewport.evaluate((element) => {
    return element.scrollLeft;
  });

  await page.mouse.move(
    (thumbBox?.x ?? 0) + (thumbBox?.width ?? 0) / 2,
    (thumbBox?.y ?? 0) + (thumbBox?.height ?? 0) / 2
  );
  await page.mouse.down();
  await page.mouse.move(
    (thumbBox?.x ?? 0) + (thumbBox?.width ?? 0) / 2 + 120,
    (thumbBox?.y ?? 0) + (thumbBox?.height ?? 0) / 2,
    { steps: 8 }
  );
  await page.mouse.up();

  await expect.poll(async () => {
    return viewport.evaluate((element) => element.scrollLeft);
  }).toBeGreaterThan(beforeScrollLeft + 20);
});
