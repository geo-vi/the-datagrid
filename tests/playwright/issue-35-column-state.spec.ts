import { expect, test, type Locator, type Page } from "@playwright/test";

const fixturePath = "/compat/issue-35-column-state";

function grid(scope: Locator, testId: string) {
  return scope.getByTestId(testId).locator(".tdg-root");
}

function header(gridLocator: Locator, columnId: string) {
  return gridLocator.locator(
    `[data-slot="grid-header-cell"][data-column-id="${columnId}"]`
  );
}

function cell(gridLocator: Locator, columnId: string) {
  return gridLocator
    .locator(`[data-slot="grid-row"][data-row-id]`)
    .first()
    .locator(`.InovuaReactDataGrid__cell[data-column-id="${columnId}"]`);
}

async function headerIds(gridLocator: Locator) {
  return gridLocator
    .locator('[data-slot="grid-header-cell"][data-column-id]')
    .evaluateAll((elements) =>
      elements.map((element) => (element as HTMLElement).dataset.columnId)
    );
}

async function openColumnsMenu(
  page: Page,
  gridLocator: Locator,
  columnId: string
) {
  await header(gridLocator, columnId)
    .getByRole("button", { name: "Column menu" })
    .click();
  await page.getByRole("menuitem", { name: "Columns", exact: true }).click();
  await expect(page.getByRole("menuitemcheckbox").first()).toBeVisible();
}

async function resizeBy(
  page: Page,
  gridLocator: Locator,
  columnId: string,
  diff: number,
  beforeMouseUp?: () => Promise<void>
) {
  const resizer = header(gridLocator, columnId).locator(
    '[data-slot="column-resizer"]'
  );
  const box = await resizer.boundingBox();
  if (!box) throw new Error(`Missing resize handle for ${columnId}`);
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  const pointerId = 35;
  await resizer.dispatchEvent("pointerdown", {
    bubbles: true,
    cancelable: true,
    button: 0,
    buttons: 1,
    clientX: x,
    clientY: y,
    isPrimary: true,
    pointerId,
    pointerType: "mouse",
  });
  await expect(gridLocator).toHaveAttribute("data-column-resizing", "true");
  await page.evaluate(
    ({ clientX, clientY, pointerId: activePointerId }) => {
      window.dispatchEvent(
        new PointerEvent("pointermove", {
          bubbles: true,
          cancelable: true,
          button: -1,
          buttons: 1,
          clientX,
          clientY,
          isPrimary: true,
          pointerId: activePointerId,
          pointerType: "mouse",
        })
      );
    },
    { clientX: x + diff, clientY: y, pointerId }
  );
  await beforeMouseUp?.();
  await page.evaluate(
    ({ clientX, clientY, pointerId: activePointerId }) => {
      window.dispatchEvent(
        new PointerEvent("pointerup", {
          bubbles: true,
          cancelable: true,
          button: 0,
          buttons: 0,
          clientX,
          clientY,
          isPrimary: true,
          pointerId: activePointerId,
          pointerType: "mouse",
        })
      );
    },
    { clientX: x + diff, clientY: y, pointerId }
  );
  await expect(gridLocator).toHaveAttribute("data-column-resizing", "false");
}

test.beforeEach(async ({ page }) => {
  await page.goto(fixturePath);
  await expect(page.getByTestId("issue-35-page")).toBeVisible();
});

test("uncontrolled order and visibility persist without ownership callbacks", async ({
  page,
}) => {
  const scope = page.getByTestId("uncontrolled-ownership");
  const dataGrid = grid(scope, "uncontrolled-grid");

  await expect(header(dataGrid, "secret")).toHaveCount(0);
  await expect(header(dataGrid, "note")).toHaveCount(0);
  await expect.poll(() => headerIds(dataGrid)).toEqual(["city", "id", "name"]);

  await header(dataGrid, "name").dragTo(header(dataGrid, "city"));
  await expect.poll(() => headerIds(dataGrid)).toEqual(["name", "city", "id"]);

  await openColumnsMenu(page, dataGrid, "name");
  const idItem = page.getByRole("menuitemcheckbox", {
    name: "ID",
    exact: true,
  });
  const secretItem = page.getByRole("menuitemcheckbox", {
    name: "Secret",
    exact: true,
  });
  await expect(idItem).toBeDisabled();
  await secretItem.click();

  await expect(header(dataGrid, "secret")).toBeVisible();
  await expect(
    scope.getByTestId("uncontrolled-visibility-events")
  ).toContainText("secret:true");

  await scope.getByTestId("control-secret-hidden").click();
  await expect(header(dataGrid, "secret")).toHaveCount(0);
  await scope.getByTestId("release-secret-visibility").click();
  await expect(header(dataGrid, "secret")).toHaveCount(0);
  await openColumnsMenu(page, dataGrid, "id");
  await page
    .getByRole("menuitemcheckbox", { name: "Secret", exact: true })
    .click();
  await expect(header(dataGrid, "secret")).toBeVisible();

  await openColumnsMenu(page, dataGrid, "id");
  await page
    .getByRole("menuitemcheckbox", { name: "City", exact: true })
    .click();
  await expect(header(dataGrid, "city")).toHaveCount(0);
});

test("controlled order and visibility emit proposals and remain prop-owned", async ({
  page,
}) => {
  const scope = page.getByTestId("controlled-ownership");
  const dataGrid = grid(scope, "controlled-grid");

  await header(dataGrid, "city").dragTo(header(dataGrid, "name"));
  await expect(scope.getByTestId("controlled-order-proposals")).toContainText(
    '["id","city","name"]'
  );
  expect(await headerIds(dataGrid)).toEqual(["id", "name", "city"]);

  await scope.getByTestId("apply-order-proposal").click();
  await expect.poll(() => headerIds(dataGrid)).toEqual(["id", "city", "name"]);

  await openColumnsMenu(page, dataGrid, "id");
  await page
    .getByRole("menuitemcheckbox", {
      name: "Controlled City",
      exact: true,
    })
    .click();
  await expect(
    scope.getByTestId("controlled-visibility-proposals")
  ).toContainText('"columnId":"city","visible":false');
  await expect(header(dataGrid, "city")).toBeVisible();

  await scope.getByTestId("apply-visibility-proposal").click();
  await expect(header(dataGrid, "city")).toHaveCount(0);
});

test("root and per-column sizing precedence is deterministic", async ({
  page,
}) => {
  const scope = page.getByTestId("root-sizing-precedence");
  const widths = JSON.parse(
    (await scope.getByTestId("root-sizing-column-sizes").textContent()) || "{}"
  );

  expect(widths).toEqual({
    id: 165,
    name: 210,
    city: 190,
    note: 130,
  });
});

test("share-space resize preserves pair width and emits one coherent batch", async ({
  page,
}) => {
  const scope = page.getByTestId("sizing-ownership");
  const dataGrid = grid(scope, "sizing-grid");
  const idHeader = header(dataGrid, "id");
  await scope.getByTestId("snapshot-column-api").click();
  const initial = JSON.parse(
    (await scope.getByTestId("column-api-snapshot").textContent()) || "{}"
  ).columnSizes as Record<string, number>;

  const handleWidth = await idHeader
    .locator('[data-slot="column-resizer"]')
    .evaluate((element) => element.getBoundingClientRect().width);
  expect(handleWidth).toBe(32);

  await resizeBy(page, dataGrid, "id", 45, async () => {
    const proxy = dataGrid.locator(".InovuaReactDataGrid__resize-proxy");
    await expect(proxy).toBeVisible();
    expect((await proxy.boundingBox())?.width).toBe(7);
  });

  await scope.getByTestId("snapshot-column-api").click();
  const resized = JSON.parse(
    (await scope.getByTestId("column-api-snapshot").textContent()) || "{}"
  ).columnSizes as Record<string, number>;
  expect(resized.id).toBeGreaterThan(initial.id + 20);
  expect(
    Math.abs(resized.id + resized.name - initial.id - initial.name)
  ).toBeLessThanOrEqual(1);
  await expect(scope.getByTestId("batch-events")).toContainText('"entries":2');
  await expect(scope.getByTestId("resize-events")).toContainText('"id":"id"');
  await expect(scope.getByTestId("resize-events")).toContainText('"id":"name"');
});

test("default keepFlex, explicit conversion, batch sizing, auto sizing, and fit APIs mutate owned state", async ({
  page,
}) => {
  const scope = page.getByTestId("sizing-ownership");
  const dataGrid = grid(scope, "sizing-grid");

  await scope.getByTestId("toggle-share-space").click();
  await expect(scope.getByTestId("toggle-share-space")).toHaveText(
    "Share space: false"
  );

  await resizeBy(page, dataGrid, "city", -35);
  await expect
    .poll(async () => {
      await scope.getByTestId("snapshot-column-api").click();
      const current = JSON.parse(
        (await scope.getByTestId("column-api-snapshot").textContent()) || "{}"
      );
      return current.columnFlexes.city ?? 0;
    })
    .toBeGreaterThan(10);

  await resizeBy(page, dataGrid, "note", -30);
  await expect
    .poll(async () => {
      await scope.getByTestId("snapshot-column-api").click();
      const current = JSON.parse(
        (await scope.getByTestId("column-api-snapshot").textContent()) || "{}"
      );
      return current.columnFlexes.note ?? null;
    })
    .toBeNull();
  const snapshot = JSON.parse(
    (await scope.getByTestId("column-api-snapshot").textContent()) || "{}"
  );
  expect(snapshot.columnSizes.note).toBeGreaterThan(120);

  await scope.getByTestId("imperative-batch").click();
  await expect
    .poll(async () =>
      Math.round((await header(dataGrid, "id").boundingBox())!.width)
    )
    .toBe(190);
  await scope.getByTestId("snapshot-column-api").click();
  let nextSnapshot = JSON.parse(
    (await scope.getByTestId("column-api-snapshot").textContent()) || "{}"
  );
  expect(nextSnapshot.columnFlexes.city).toBe(2);
  await expect(scope.getByTestId("batch-events")).toContainText(
    '"entries":3,"reservedViewportWidth":7'
  );

  await scope.getByTestId("set-column-sizes").click();
  await expect
    .poll(async () =>
      Math.round((await header(dataGrid, "id").boundingBox())!.width)
    )
    .toBe(175);

  await scope.getByTestId("set-column-flexes").click();
  await scope.getByTestId("snapshot-column-api").click();
  nextSnapshot = JSON.parse(
    (await scope.getByTestId("column-api-snapshot").textContent()) || "{}"
  );
  expect(nextSnapshot.columnFlexes.city).toBe(3);
  expect(nextSnapshot.columnFlexes.note).toBe(1);

  await scope.getByTestId("auto-size-city").click();
  await scope.getByTestId("auto-size-all").click();
  await scope.getByTestId("size-to-fit").click();
  const totalWidth = await dataGrid
    .locator('[data-slot="grid-header-cell"][data-column-id]')
    .evaluateAll((elements) =>
      elements.reduce(
        (sum, element) =>
          sum + (element as HTMLElement).getBoundingClientRect().width,
        0
      )
    );
  const viewportWidth = await dataGrid
    .locator('[data-slot="scroll-area-viewport"]')
    .evaluate((element) => element.clientWidth);
  expect(Math.abs(totalWidth - viewportWidth)).toBeLessThanOrEqual(1);
});

test("column virtualization keeps header/filter/body geometry and editing coherent", async ({
  page,
}) => {
  const scope = page.getByTestId("issue-35-stress");
  const dataGrid = grid(scope, "stress-grid");
  const viewport = dataGrid.locator('[data-slot="scroll-area-viewport"]');

  await expect(header(dataGrid, "field35")).toBeVisible();
  expect(
    await dataGrid
      .locator('[data-slot="grid-header-cell"][data-column-id]')
      .count()
  ).toBeLessThan(36);

  const editableCell = cell(dataGrid, "field1");
  await editableCell.dblclick();
  await expect(editableCell.getByRole("textbox")).toBeFocused();

  await header(dataGrid, "field2").dragTo(header(dataGrid, "field1"));
  await expect(editableCell.getByRole("textbox")).toHaveCount(0);
  await expect(editableCell).toBeVisible();

  await resizeBy(page, dataGrid, "field2", 30);
  const geometry = await dataGrid.evaluate((element) => {
    const columnId = "field2";
    const headerCell = element.querySelector<HTMLElement>(
      `[data-slot="grid-header-cell"][data-column-id="${columnId}"]`
    );
    const filterCell = element.querySelector<HTMLElement>(
      `.tdg-filter-cell[data-column-id="${columnId}"]`
    );
    const bodyCell = element.querySelector<HTMLElement>(
      `.InovuaReactDataGrid__cell[data-column-id="${columnId}"]`
    );
    return {
      header: Math.round(headerCell?.getBoundingClientRect().width ?? 0),
      filter: Math.round(filterCell?.getBoundingClientRect().width ?? 0),
      body: Math.round(bodyCell?.getBoundingClientRect().width ?? 0),
    };
  });
  expect(geometry.header).toBeGreaterThan(140);
  expect(geometry.filter).toBe(geometry.header);
  expect(geometry.body).toBe(geometry.header);

  await viewport.evaluate((element) => {
    element.scrollLeft = element.scrollWidth;
    element.dispatchEvent(new Event("scroll"));
  });
  await expect(header(dataGrid, "field35")).toBeVisible();
});

test("10k x 36 column-state bursts stay within production frame budgets @production-performance", async ({
  page,
}) => {
  await page.goto(`${fixturePath}?scenario=performance`);
  const scope = page.getByTestId("issue-35-stress");
  const dataGrid = grid(scope, "stress-grid");
  await expect(scope).toHaveAttribute("data-row-count", "10000");
  await expect(dataGrid).toBeVisible();

  const metrics = await page.evaluate(async () => {
    const targetWindow = window as typeof window & {
      __issue35StressApi?: {
        getColumnBy?: (id: string, config?: { initial?: boolean }) => unknown;
        getColumnOrder: () => string[];
        onBatchColumnResize?: (
          entries: { column: unknown; width?: number }[]
        ) => void;
        setColumnOrder: (order: string[]) => void;
        setColumnVisible?: (id: string, visible: boolean) => void;
      };
    };
    const api = targetWindow.__issue35StressApi;
    if (!api) throw new Error("Issue #35 stress API was not ready");
    const resizeColumn = api.getColumnBy?.("field6", { initial: true });
    if (!resizeColumn) throw new Error("Resize column was unavailable");

    const longTasks: number[] = [];
    const observer =
      typeof PerformanceObserver === "function" &&
      PerformanceObserver.supportedEntryTypes.includes("longtask")
        ? new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              longTasks.push(entry.duration);
            }
          })
        : null;
    observer?.observe({ entryTypes: ["longtask"] });

    const originalOrder = api.getColumnOrder();
    const swappedOrder = [...originalOrder];
    [swappedOrder[1], swappedOrder[2]] = [swappedOrder[2]!, swappedOrder[1]!];
    const startedAt = performance.now();
    for (let index = 0; index < 40; index += 1) {
      api.setColumnOrder(index % 2 === 0 ? swappedOrder : originalOrder);
      api.setColumnVisible?.("field5", index % 2 === 1);
      api.onBatchColumnResize?.([
        { column: resizeColumn, width: index % 2 === 0 ? 150 : 140 },
      ]);
    }
    const dispatchDuration = performance.now() - startedAt;
    const firstFrameAt = await new Promise<number>((resolve) =>
      requestAnimationFrame(resolve)
    );
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve())
    );
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    observer?.disconnect();

    const gridElement = document.querySelector<HTMLElement>(
      '[data-testid="stress-grid"] .tdg-root'
    );
    return {
      dispatchDuration,
      firstFrameDelay: firstFrameAt - startedAt,
      maxLongTask: Math.max(0, ...longTasks),
      mountedRows:
        gridElement?.querySelectorAll('[data-slot="grid-row"][data-row-id]')
          .length ?? 0,
      mountedColumns:
        gridElement?.querySelectorAll(
          '[data-slot="grid-header-cell"][data-column-id]'
        ).length ?? 0,
    };
  });

  expect(metrics.dispatchDuration).toBeLessThan(50);
  expect(metrics.firstFrameDelay).toBeLessThan(100);
  expect(metrics.maxLongTask).toBeLessThan(100);
  expect(metrics.mountedRows).toBeLessThan(80);
  expect(metrics.mountedColumns).toBeLessThan(20);
});
