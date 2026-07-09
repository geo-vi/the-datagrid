import { expect, test, type Page } from "@playwright/test";

type GridLayout = {
  containerHeight: number;
  gridHeight: number;
  gridMinHeight: string;
  scrollAreaClassName: string;
  viewportHeight: number;
  viewportClientHeight: number;
  viewportScrollHeight: number;
  viewportClassName: string;
  gridBottomWithinContainer: boolean;
  viewportBottomWithinContainer: boolean;
  verticalScrollbarBottomWithinContainer: boolean | null;
  horizontalScrollbarBottomWithinContainer: boolean | null;
  hasVerticalOverflow: boolean;
  hasHorizontalOverflow: boolean;
};

async function readGridLayout(page: Page, testId: string) {
  return page.getByTestId(testId).evaluate((container): GridLayout | null => {
    const grid = container.querySelector<HTMLElement>(
      ".InovuaReactDataGrid.tdg-root"
    );
    const viewport = container.querySelector<HTMLElement>(
      '[data-slot="scroll-area-viewport"]'
    );
    const scrollArea = container.querySelector<HTMLElement>(
      '[data-slot="scroll-area"]'
    );
    const verticalScrollbar = container.querySelector<HTMLElement>(
      '[data-slot="scroll-area-scrollbar"][data-orientation="vertical"]'
    );
    const horizontalScrollbar = container.querySelector<HTMLElement>(
      '[data-slot="scroll-area-scrollbar"][data-orientation="horizontal"]'
    );

    if (!grid || !scrollArea || !viewport) {
      return null;
    }

    const containerRect = container.getBoundingClientRect();
    const gridRect = grid.getBoundingClientRect();
    const viewportRect = viewport.getBoundingClientRect();
    const verticalScrollbarRect = verticalScrollbar?.getBoundingClientRect();
    const horizontalScrollbarRect =
      horizontalScrollbar?.getBoundingClientRect();

    return {
      containerHeight: Math.round(containerRect.height),
      gridHeight: Math.round(gridRect.height),
      gridMinHeight: getComputedStyle(grid).minHeight,
      scrollAreaClassName: scrollArea.className,
      viewportHeight: Math.round(viewportRect.height),
      viewportClientHeight: viewport.clientHeight,
      viewportScrollHeight: viewport.scrollHeight,
      viewportClassName: viewport.className,
      gridBottomWithinContainer: gridRect.bottom <= containerRect.bottom + 1,
      viewportBottomWithinContainer:
        viewportRect.bottom <= containerRect.bottom + 1,
      verticalScrollbarBottomWithinContainer: verticalScrollbarRect
        ? verticalScrollbarRect.bottom <= containerRect.bottom + 1
        : null,
      horizontalScrollbarBottomWithinContainer: horizontalScrollbarRect
        ? horizontalScrollbarRect.bottom <= containerRect.bottom + 1
        : null,
      hasVerticalOverflow: viewport.scrollHeight > viewport.clientHeight,
      hasHorizontalOverflow: viewport.scrollWidth > viewport.clientWidth,
    };
  });
}

test("issue #20 grid viewport fills available parent height", async ({
  page,
}) => {
  await page.goto("/examples/issue-20-height");

  const smallContainer = page.getByTestId("issue-20-small-container");
  const tallContainer = page.getByTestId("issue-20-tall-container");
  const naturalContainer = page.getByTestId("issue-20-natural-container");

  await expect(smallContainer).toBeVisible();
  await expect(tallContainer).toBeVisible();
  await expect(naturalContainer).toBeVisible();

  await smallContainer.locator('[data-slot="scroll-area"]').hover();
  await tallContainer.locator('[data-slot="scroll-area"]').hover();
  await naturalContainer.locator('[data-slot="scroll-area"]').hover();

  const smallLayout = await readGridLayout(page, "issue-20-small-container");
  const tallLayout = await readGridLayout(page, "issue-20-tall-container");
  const naturalLayout = await readGridLayout(
    page,
    "issue-20-natural-container"
  );

  expect(smallLayout).not.toBeNull();
  expect(tallLayout).not.toBeNull();
  expect(naturalLayout).not.toBeNull();

  expect(smallLayout?.viewportClassName).not.toContain("h-[560px]");
  expect(tallLayout?.viewportClassName).not.toContain("h-[560px]");
  expect(smallLayout?.scrollAreaClassName).not.toContain("h-[560px]");
  expect(tallLayout?.scrollAreaClassName).not.toContain("h-[560px]");
  expect(smallLayout?.scrollAreaClassName).not.toContain("max-h-[560px]");
  expect(tallLayout?.scrollAreaClassName).not.toContain("max-h-[560px]");

  expect(smallLayout?.containerHeight).toBe(320);
  expect(smallLayout?.gridMinHeight).toBe("0px");
  expect(smallLayout?.gridBottomWithinContainer).toBe(true);
  expect(smallLayout?.viewportBottomWithinContainer).toBe(true);
  expect(smallLayout?.verticalScrollbarBottomWithinContainer).toBe(true);
  expect(smallLayout?.horizontalScrollbarBottomWithinContainer).toBe(true);
  expect(smallLayout?.gridHeight).toBeLessThanOrEqual(320);
  expect(smallLayout?.viewportClientHeight).toBeGreaterThan(180);
  expect(smallLayout?.viewportClientHeight).toBeLessThan(560);
  expect(smallLayout?.hasVerticalOverflow).toBe(true);
  expect(smallLayout?.hasHorizontalOverflow).toBe(true);

  expect(tallLayout?.containerHeight).toBe(760);
  expect(tallLayout?.gridMinHeight).toBe("0px");
  expect(tallLayout?.gridBottomWithinContainer).toBe(true);
  expect(tallLayout?.viewportBottomWithinContainer).toBe(true);
  expect(tallLayout?.viewportClientHeight).toBeGreaterThan(640);
  expect(tallLayout?.hasVerticalOverflow).toBe(true);
  expect(tallLayout?.hasHorizontalOverflow).toBe(true);

  expect(naturalLayout?.gridMinHeight).toBe("0px");
  expect(naturalLayout?.gridHeight).toBeLessThan(400);
  expect(naturalLayout?.viewportClientHeight).toBeLessThan(360);
  expect(naturalLayout?.gridBottomWithinContainer).toBe(true);
  expect(naturalLayout?.viewportBottomWithinContainer).toBe(true);
});
