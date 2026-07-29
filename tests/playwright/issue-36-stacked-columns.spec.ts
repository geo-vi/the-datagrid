import { expect, test, type Locator, type Page } from "@playwright/test";

const fixturePath = "/compat/issue-36-stacked-columns";

function grid(page: Page) {
  return page.getByTestId("stacked-columns-grid").locator(".tdg-root");
}

function groupHeader(gridLocator: Locator, groupId: string, segment = 0) {
  return gridLocator.locator(
    `[data-slot="grid-header-group"][data-group-id="${groupId}"][data-group-segment="${segment}"]`
  );
}

function leafHeader(gridLocator: Locator, columnId: string) {
  return gridLocator.locator(
    `[data-slot="grid-header-cell"][data-column-id="${columnId}"]`
  );
}

function filterCell(gridLocator: Locator, columnId: string) {
  return gridLocator.locator(`.tdg-filter-cell[data-column-id="${columnId}"]`);
}

function firstBodyCell(gridLocator: Locator, columnId: string) {
  return gridLocator
    .locator('[data-slot="grid-row"][data-row-id]')
    .first()
    .locator(`.InovuaReactDataGrid__cell[data-column-id="${columnId}"]`);
}

async function columnOrder(page: Page): Promise<string[]> {
  return JSON.parse(
    (await page.getByTestId("stacked-column-order").textContent()) || "[]"
  );
}

async function proposalCount(page: Page): Promise<number> {
  return Number(
    await page
      .getByTestId("stacked-order-proposals")
      .getAttribute("data-proposal-count")
  );
}

async function resizeGroupBy(
  page: Page,
  gridLocator: Locator,
  groupId: string,
  diff: number
) {
  const resizer = groupHeader(gridLocator, groupId).locator(
    '[data-slot="group-resizer"]'
  );
  const box = await resizer.boundingBox();
  if (!box) throw new Error(`Missing resize handle for group ${groupId}`);
  const clientX = box.x + box.width / 2;
  const clientY = box.y + box.height / 2;
  const pointerId = 36;

  await resizer.dispatchEvent("pointerdown", {
    bubbles: true,
    cancelable: true,
    button: 0,
    buttons: 1,
    clientX,
    clientY,
    isPrimary: true,
    pointerId,
    pointerType: "mouse",
  });
  await expect(resizer).toHaveAttribute("data-resizing", "true");
  await page.evaluate(
    ({ x, y, id }) => {
      window.dispatchEvent(
        new PointerEvent("pointermove", {
          bubbles: true,
          cancelable: true,
          button: -1,
          buttons: 1,
          clientX: x,
          clientY: y,
          isPrimary: true,
          pointerId: id,
          pointerType: "mouse",
        })
      );
    },
    { x: clientX + diff, y: clientY, id: pointerId }
  );
  await expect(
    gridLocator.locator(".InovuaReactDataGrid__resize-proxy")
  ).toBeVisible();
  await page.evaluate(
    ({ x, y, id }) => {
      window.dispatchEvent(
        new PointerEvent("pointerup", {
          bubbles: true,
          cancelable: true,
          button: 0,
          buttons: 0,
          clientX: x,
          clientY: y,
          isPrimary: true,
          pointerId: id,
          pointerType: "mouse",
        })
      );
    },
    { x: clientX + diff, y: clientY, id: pointerId }
  );
  await expect(resizer).toHaveAttribute("data-resizing", "false");
}

test.beforeEach(async ({ page }) => {
  await page.goto(fixturePath);
  await expect(page.getByTestId("stacked-columns-example")).toBeVisible();
  await expect(grid(page)).toBeVisible();
});

test("publishes the stacked-column example, guide, API rows, and compatibility evidence", async ({
  page,
}) => {
  await page.goto("/examples/stacked-columns");
  await expect(
    page.getByRole("heading", { name: "Stacked and nested columns" })
  ).toBeVisible();
  await expect(
    page.getByText("examples/src/StackedColumnsExample.tsx")
  ).toBeVisible();
  await expect(page.getByTestId("stacked-columns-grid")).toBeVisible();

  await page.goto("/docs/guides/stacked-columns");
  await expect(
    page.getByRole("heading", {
      name: "Guide: stacked and nested columns",
    })
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Split groups and controlled order" })
  ).toBeVisible();

  await page.goto("/docs/reference/reactdatagrid");
  await expect(
    page.getByRole("cell", { name: "groups", exact: true })
  ).toBeVisible();
  await expect(
    page.getByRole("cell", {
      name: "allowGroupSplitOnReorder",
      exact: true,
    })
  ).toBeVisible();

  await page.goto("/docs/migration/inovua-status");
  await expect(
    page.getByRole("rowheader", {
      name: "Stacked and nested column headers",
      exact: true,
    })
  ).toBeVisible();
});

test("renders accessible static, custom, and three-level nested group headers", async ({
  page,
}) => {
  const dataGrid = grid(page);
  const groupRows = dataGrid.locator('[data-slot="grid-header-group-row"]');
  const profile = groupHeader(dataGrid, "profile");
  const identity = groupHeader(dataGrid, "identity");

  await expect(groupRows).toHaveCount(3);
  await expect(profile).toHaveAttribute("scope", "colgroup");
  await expect(profile).toHaveAttribute("aria-colspan", "6");
  await expect(profile).toHaveAttribute("data-custom-group-header", "profile");
  await expect(profile.getByTestId("profile-custom-header")).toHaveAttribute(
    "data-column-count",
    "6"
  );
  await expect(identity).toHaveAccessibleName("Identity");
  await expect(identity).toHaveAttribute(
    "data-group-column-ids",
    "id,firstName,lastName"
  );
  await expect(identity).toHaveAttribute("aria-colspan", "3");

  const heights = await groupRows.evaluateAll((rows) =>
    rows.map((row) => Math.round(row.getBoundingClientRect().height))
  );
  expect(heights).toEqual([40, 40, 40]);

  const geometry = await dataGrid.evaluate((element) => {
    const group = element.querySelector<HTMLElement>(
      '[data-slot="grid-header-group"][data-group-id="identity"]'
    );
    const leafIds = ["id", "firstName", "lastName"];
    const leafWidth = leafIds.reduce((sum, columnId) => {
      const leaf = element.querySelector<HTMLElement>(
        `[data-slot="grid-header-cell"][data-column-id="${columnId}"]`
      );
      return sum + (leaf?.getBoundingClientRect().width ?? 0);
    }, 0);
    const firstNameHeader = element.querySelector<HTMLElement>(
      '[data-slot="grid-header-cell"][data-column-id="firstName"]'
    );
    const firstNameFilter = element.querySelector<HTMLElement>(
      '.tdg-filter-cell[data-column-id="firstName"]'
    );
    const firstNameBody = element.querySelector<HTMLElement>(
      '.InovuaReactDataGrid__cell[data-column-id="firstName"]'
    );
    return {
      groupWidth: group?.getBoundingClientRect().width ?? 0,
      leafWidth,
      leaf: firstNameHeader?.getBoundingClientRect().width ?? 0,
      filter: firstNameFilter?.getBoundingClientRect().width ?? 0,
      body: firstNameBody?.getBoundingClientRect().width ?? 0,
    };
  });
  expect(
    Math.abs(geometry.groupWidth - geometry.leafWidth)
  ).toBeLessThanOrEqual(1);
  expect(Math.round(geometry.filter)).toBe(Math.round(geometry.leaf));
  expect(Math.round(geometry.body)).toBe(Math.round(geometry.leaf));
});

test("splits and rejoins separated siblings without losing logical group metadata", async ({
  page,
}) => {
  const dataGrid = grid(page);

  await page.getByTestId("split-identity").click();
  await expect(
    dataGrid.locator(
      '[data-slot="grid-header-group"][data-group-id="identity"]'
    )
  ).toHaveCount(2);
  await expect(groupHeader(dataGrid, "identity", 0)).toHaveAttribute(
    "data-group-split",
    "true"
  );
  await expect(groupHeader(dataGrid, "identity", 1)).toHaveAttribute(
    "data-group-segment-count",
    "2"
  );
  expect((await columnOrder(page)).slice(0, 5)).toEqual([
    "id",
    "status",
    "firstName",
    "lastName",
    "email",
  ]);

  await page.getByTestId("rejoin-groups").click();
  await expect(
    dataGrid.locator(
      '[data-slot="grid-header-group"][data-group-id="identity"]'
    )
  ).toHaveCount(1);
  await expect(groupHeader(dataGrid, "identity")).toHaveAttribute(
    "data-group-split",
    "false"
  );
});

test("group drag moves a whole segment and controlled ownership delays DOM order until applied", async ({
  page,
}) => {
  const dataGrid = grid(page);
  await page.getByTestId("toggle-order-ownership").click();
  await expect(page.getByTestId("toggle-order-ownership")).toHaveText(
    "Apply order proposals: false"
  );

  await groupHeader(dataGrid, "contact").dragTo(
    groupHeader(dataGrid, "profile")
  );
  await expect.poll(() => proposalCount(page)).toBe(0);

  await groupHeader(dataGrid, "contact").dragTo(
    groupHeader(dataGrid, "identity")
  );
  await expect.poll(() => proposalCount(page)).toBe(1);
  expect((await columnOrder(page)).slice(0, 6)).toEqual([
    "id",
    "firstName",
    "lastName",
    "email",
    "city",
    "region",
  ]);
  const proposedOrder = JSON.parse(
    (await page.getByTestId("stacked-order-proposals").textContent()) || "[]"
  )[0] as string[];
  expect(proposedOrder.slice(0, 6)).toEqual([
    "email",
    "city",
    "region",
    "id",
    "firstName",
    "lastName",
  ]);

  await page.getByTestId("apply-latest-order").click();
  await expect
    .poll(async () => (await columnOrder(page)).slice(0, 6))
    .toEqual(proposedOrder.slice(0, 6));
  const contactBox = await groupHeader(dataGrid, "contact").boundingBox();
  const identityBox = await groupHeader(dataGrid, "identity").boundingBox();
  expect(contactBox?.x ?? Number.MAX_SAFE_INTEGER).toBeLessThan(
    identityBox?.x ?? 0
  );
});

test("allowGroupSplitOnReorder rejects or accepts cross-group leaf moves deterministically", async ({
  page,
}) => {
  const dataGrid = grid(page);
  await page.getByTestId("toggle-group-splitting").click();
  await expect(page.getByTestId("toggle-group-splitting")).toHaveText(
    "Allow group split: false"
  );

  await leafHeader(dataGrid, "email").dragTo(leafHeader(dataGrid, "id"));
  await expect.poll(() => proposalCount(page)).toBe(0);
  expect((await columnOrder(page)).slice(0, 2)).toEqual(["id", "firstName"]);

  await page.getByTestId("toggle-group-splitting").click();
  await leafHeader(dataGrid, "email").dragTo(leafHeader(dataGrid, "id"));
  await expect.poll(() => proposalCount(page)).toBe(1);
  await expect
    .poll(async () => (await columnOrder(page)).slice(0, 2))
    .toEqual(["email", "id"]);
  await expect(
    dataGrid.locator('[data-slot="grid-header-group"][data-group-id="contact"]')
  ).toHaveCount(2);
});

test("group pointer and keyboard resizing scale child columns proportionally and emit one batch", async ({
  page,
}) => {
  const dataGrid = grid(page);
  const ids = ["id", "firstName", "lastName"];
  const readWidths = () =>
    Promise.all(
      ids.map(async (id) =>
        Math.round((await leafHeader(dataGrid, id).boundingBox())?.width ?? 0)
      )
    );
  const before = await readWidths();

  await resizeGroupBy(page, dataGrid, "identity", 78);
  const after = await readWidths();
  expect(after.reduce((sum, width) => sum + width, 0)).toBe(
    before.reduce((sum, width) => sum + width, 0) + 78
  );
  for (let index = 0; index < ids.length; index += 1) {
    expect(after[index]! / before[index]!).toBeCloseTo(1.2, 1);
  }
  await expect(page.getByTestId("stacked-resize-batches")).toContainText(
    '"ids":["id","firstName","lastName"]'
  );
  await expect(page.getByTestId("stacked-resize-batches")).toHaveAttribute(
    "data-batch-count",
    "1"
  );

  const resizer = groupHeader(dataGrid, "identity").locator(
    '[data-slot="group-resizer"]'
  );
  await resizer.focus();
  await resizer.press("ArrowRight");
  await expect
    .poll(async () =>
      (await readWidths()).reduce((sum, width) => sum + width, 0)
    )
    .toBe(after.reduce((sum, width) => sum + width, 0) + 10);
  await expect(page.getByTestId("stacked-resize-batches")).toHaveAttribute(
    "data-batch-count",
    "2"
  );
});

test("filtering, sorting, and visibility preserve group/filter/body geometry", async ({
  page,
}) => {
  const dataGrid = grid(page);
  const profileBefore = await groupHeader(dataGrid, "profile").getAttribute(
    "aria-colspan"
  );
  expect(profileBefore).toBe("6");

  await page.getByTestId("toggle-city").click();
  await expect(leafHeader(dataGrid, "city")).toHaveCount(0);
  await expect(groupHeader(dataGrid, "contact")).toHaveAttribute(
    "data-group-column-ids",
    "email,region"
  );
  await expect(groupHeader(dataGrid, "profile")).toHaveAttribute(
    "aria-colspan",
    "5"
  );

  const input = filterCell(dataGrid, "firstName").getByRole("textbox");
  await input.fill("Grace");
  await expect(firstBodyCell(dataGrid, "firstName")).toHaveText("Grace");
  await leafHeader(dataGrid, "firstName").click();
  await expect(groupHeader(dataGrid, "identity")).toBeVisible();

  const aligned = await dataGrid.evaluate((element) => {
    const ids = ["id", "firstName", "lastName"];
    const group = element.querySelector<HTMLElement>(
      '[data-slot="grid-header-group"][data-group-id="identity"]'
    );
    const childWidth = ids.reduce((total, id) => {
      const header = element.querySelector<HTMLElement>(
        `[data-slot="grid-header-cell"][data-column-id="${id}"]`
      );
      return total + (header?.getBoundingClientRect().width ?? 0);
    }, 0);
    const leaf = element.querySelector<HTMLElement>(
      '[data-slot="grid-header-cell"][data-column-id="firstName"]'
    );
    const filter = element.querySelector<HTMLElement>(
      '.tdg-filter-cell[data-column-id="firstName"]'
    );
    const body = element.querySelector<HTMLElement>(
      '.InovuaReactDataGrid__cell[data-column-id="firstName"]'
    );
    return {
      group: group?.getBoundingClientRect().width ?? 0,
      childWidth,
      leaf: leaf?.getBoundingClientRect().width ?? 0,
      filter: filter?.getBoundingClientRect().width ?? 0,
      body: body?.getBoundingClientRect().width ?? 0,
    };
  });
  expect(Math.abs(aligned.group - aligned.childWidth)).toBeLessThanOrEqual(1);
  expect(Math.round(aligned.filter)).toBe(Math.round(aligned.leaf));
  expect(Math.round(aligned.body)).toBe(Math.round(aligned.leaf));
});

test("horizontal virtualization keeps nested header/filter/body geometry aligned at both edges", async ({
  page,
}) => {
  const dataGrid = grid(page);
  const viewport = dataGrid.locator('[data-slot="scroll-area-viewport"]');

  expect(
    await dataGrid
      .locator('[data-slot="grid-header-cell"][data-column-id]')
      .count()
  ).toBeLessThan(18);
  await expect(
    dataGrid.locator('[data-slot="grid-header-group-row"]')
  ).toHaveCount(3);

  await viewport.evaluate((element) => {
    element.scrollLeft = element.scrollWidth;
    element.dispatchEvent(new Event("scroll"));
  });
  await expect(leafHeader(dataGrid, "risk")).toBeVisible();
  await expect(groupHeader(dataGrid, "quality")).toBeVisible();

  const geometry = await dataGrid.evaluate((element) => {
    const group = element.querySelector<HTMLElement>(
      '[data-slot="grid-header-group"][data-group-id="quality"]'
    );
    const ids = ["score", "risk"];
    const leafWidths = ids.map((id) => {
      const leaf = element.querySelector<HTMLElement>(
        `[data-slot="grid-header-cell"][data-column-id="${id}"]`
      );
      const filter = element.querySelector<HTMLElement>(
        `.tdg-filter-cell[data-column-id="${id}"]`
      );
      const body = element.querySelector<HTMLElement>(
        `.InovuaReactDataGrid__cell[data-column-id="${id}"]`
      );
      return {
        leaf: leaf?.getBoundingClientRect().width ?? 0,
        filter: filter?.getBoundingClientRect().width ?? 0,
        body: body?.getBoundingClientRect().width ?? 0,
      };
    });
    return {
      group: group?.getBoundingClientRect().width ?? 0,
      leafWidths,
    };
  });
  expect(Math.abs(geometry.group - 230)).toBeLessThanOrEqual(1);
  for (const widths of geometry.leafWidths) {
    expect(Math.round(widths.filter)).toBe(Math.round(widths.leaf));
    expect(Math.round(widths.body)).toBe(Math.round(widths.leaf));
  }
});

test("10k x 43 nested groups keep reorder and horizontal-scroll frames within production budgets @production-performance", async ({
  page,
}) => {
  await page.goto(`${fixturePath}?scenario=performance`);
  const dataGrid = grid(page);
  await expect(page.getByTestId("stacked-columns-example")).toHaveAttribute(
    "data-row-count",
    "10000"
  );
  await expect(dataGrid).toBeVisible();

  const metrics = await page.evaluate(async () => {
    const targetWindow = window as typeof window & {
      __issue36StackedApi?: {
        getColumnOrder: () => string[];
        setColumnOrder: (order: string[]) => void;
      };
    };
    const api = targetWindow.__issue36StackedApi;
    const viewport = document.querySelector<HTMLElement>(
      '[data-testid="stacked-columns-grid"] [data-slot="scroll-area-viewport"]'
    );
    if (!api || !viewport) throw new Error("Stacked-column fixture not ready");

    // Headless CI runners do not all expose the same presentation cadence:
    // some deliver requestAnimationFrame at 20 Hz even when the page is idle.
    // Calibrate that idle cadence first so this gate measures frames missed by
    // grid work instead of assuming a particular virtual display refresh rate.
    const idleFrameDurations: number[] = [];
    let previousIdleFrame = await new Promise<number>((resolve) =>
      requestAnimationFrame(resolve)
    );
    for (let index = 0; index < 8; index += 1) {
      const frameAt = await new Promise<number>((resolve) =>
        requestAnimationFrame(resolve)
      );
      idleFrameDurations.push(frameAt - previousIdleFrame);
      previousIdleFrame = frameAt;
    }
    idleFrameDurations.sort((a, b) => a - b);
    const baselineFrame =
      idleFrameDurations[Math.floor(idleFrameDurations.length / 2)] ?? 16.67;

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

    const original = api.getColumnOrder();
    const moved = [...original];
    const emailIndex = moved.indexOf("email");
    const [email] = moved.splice(emailIndex, 1);
    moved.splice(0, 0, email!);
    const frameDurations: number[] = [];
    const dispatchDurations: number[] = [];
    let previousFrame = previousIdleFrame;

    for (let index = 0; index < 30; index += 1) {
      const dispatchStartedAt = performance.now();
      api.setColumnOrder(index % 2 === 0 ? moved : original);
      viewport.scrollLeft =
        index % 2 === 0 ? viewport.scrollWidth : index % 3 === 0 ? 0 : 2400;
      viewport.dispatchEvent(new Event("scroll"));
      dispatchDurations.push(performance.now() - dispatchStartedAt);
      const frameAt = await new Promise<number>((resolve) =>
        requestAnimationFrame(resolve)
      );
      frameDurations.push(frameAt - previousFrame);
      previousFrame = frameAt;
    }
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve())
    );
    observer?.disconnect();
    frameDurations.sort((a, b) => a - b);
    dispatchDurations.sort((a, b) => a - b);
    const p95Frame =
      frameDurations[Math.floor(frameDurations.length * 0.95)] ?? 0;
    const maxFrame = Math.max(0, ...frameDurations);
    const p95Dispatch =
      dispatchDurations[Math.floor(dispatchDurations.length * 0.95)] ?? 0;
    const maxDispatch = Math.max(0, ...dispatchDurations);

    const root = document.querySelector<HTMLElement>(
      '[data-testid="stacked-columns-grid"] .tdg-root'
    );
    return {
      baselineFrame,
      p95Frame,
      maxFrame,
      p95FrameMultiplier: p95Frame / baselineFrame,
      maxFrameMultiplier: maxFrame / baselineFrame,
      p95Dispatch,
      maxDispatch,
      p95DispatchMultiplier: p95Dispatch / baselineFrame,
      maxDispatchMultiplier: maxDispatch / baselineFrame,
      maxLongTask: Math.max(0, ...longTasks),
      mountedRows:
        root?.querySelectorAll('[data-slot="grid-row"][data-row-id]').length ??
        0,
      mountedLeafHeaders:
        root?.querySelectorAll('[data-slot="grid-header-cell"][data-column-id]')
          .length ?? 0,
      mountedGroupHeaders:
        root?.querySelectorAll('[data-slot="grid-header-group"]').length ?? 0,
    };
  });

  const metricContext = `performance metrics: ${JSON.stringify(metrics)}`;
  // Keep the usual interaction inside one measured presentation interval,
  // while absolute limits still reject work that approaches a browser long
  // task on runners whose virtual display only presents at 20 Hz.
  expect(metrics.p95Dispatch, metricContext).toBeLessThan(50);
  expect(metrics.maxDispatch, metricContext).toBeLessThan(100);
  expect(metrics.p95DispatchMultiplier, metricContext).toBeLessThan(1);
  expect(metrics.maxDispatchMultiplier, metricContext).toBeLessThan(2);
  expect(metrics.p95FrameMultiplier, metricContext).toBeLessThan(1.5);
  expect(metrics.maxFrameMultiplier, metricContext).toBeLessThan(2.5);
  expect(metrics.maxLongTask, metricContext).toBeLessThan(100);
  expect(metrics.mountedRows).toBeLessThan(80);
  expect(metrics.mountedLeafHeaders).toBeLessThan(18);
  expect(metrics.mountedGroupHeaders).toBeLessThan(15);
});
