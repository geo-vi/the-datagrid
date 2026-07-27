import { expect, test, type Locator } from "@playwright/test";

async function rowIds(scope: Locator): Promise<(string | null)[]> {
  return scope
    .locator('[data-slot="grid-row"]')
    .evaluateAll((rows) => rows.map((row) => row.getAttribute("data-row-id")));
}

async function readJson<T>(locator: Locator): Promise<T> {
  return JSON.parse((await locator.textContent())?.trim() || "null") as T;
}

function header(scope: Locator, columnId: string): Locator {
  return scope.locator(
    `[data-slot="grid-header-cell"][data-column-id="${columnId}"]`
  );
}

test.describe("issue #33 complete sorting parity", () => {
  test("keeps array-valued multi-sort persistent without Shift and preserves descriptor priority", async ({
    page,
  }) => {
    await page.goto("/compat/issue-33-sorting?scenario=ownership");
    const pageScope = page.getByTestId("issue-33-ownership");
    const multi = pageScope.getByTestId("issue-33-persistent-multi");
    const events = pageScope.getByTestId("issue-33-multi-events");

    await expect
      .poll(() => rowIds(multi))
      .toEqual(["row-a1", "row-a2", "row-b1"]);

    await header(multi, "score").click();
    await expect
      .poll(() => rowIds(multi))
      .toEqual(["row-a2", "row-a1", "row-b1"]);
    await expect
      .poll(async () => {
        const history =
          await readJson<Array<Array<{ name: string; dir: number }>>>(events);
        return history.at(-1)?.map(({ name, dir }) => ({ name, dir }));
      })
      .toEqual([
        { name: "group", dir: 1 },
        { name: "score", dir: -1 },
      ]);

    // Multi-sort always permits removing one descriptor, even when the root
    // allowUnsort value is false.
    await header(multi, "score").press("Space");
    await expect
      .poll(async () => {
        const history =
          await readJson<Array<Array<{ name: string; dir: number }>>>(events);
        return history.at(-1)?.map(({ name, dir }) => ({ name, dir }));
      })
      .toEqual([{ name: "group", dir: 1 }]);

    await header(multi, "code").press("Enter");
    await expect
      .poll(async () => {
        const history =
          await readJson<Array<Array<{ name: string; dir: number }>>>(events);
        return history.at(-1)?.map(({ name, dir }) => ({ name, dir }));
      })
      .toEqual([
        { name: "group", dir: 1 },
        { name: "code", dir: 1 },
      ]);
  });

  test("keeps controlled indicators and callbacks external without reordering local rows", async ({
    page,
  }) => {
    await page.goto("/compat/issue-33-sorting?scenario=ownership");
    const pageScope = page.getByTestId("issue-33-ownership");
    const controlled = pageScope.getByTestId("issue-33-controlled-local");
    const scoreHeader = header(controlled, "score");

    await expect(scoreHeader).toHaveAttribute("aria-sort", "ascending");
    await expect
      .poll(() => rowIds(controlled))
      .toEqual(["row-a2", "row-b1", "row-a1"]);

    await scoreHeader.click();
    await expect(scoreHeader).toHaveAttribute("aria-sort", "ascending");
    await expect
      .poll(() => rowIds(controlled))
      .toEqual(["row-a2", "row-b1", "row-a1"]);
    await scoreHeader.click();
    await expect(scoreHeader).toHaveAttribute("aria-sort", "ascending");
    await expect
      .poll(() =>
        readJson<Array<{ name: string; dir: number }>>(
          pageScope.getByTestId("issue-33-controlled-events")
        )
      )
      .toEqual([
        expect.objectContaining({
          name: "score",
          dir: -1,
        }),
        expect.objectContaining({
          name: "score",
          dir: -1,
        }),
      ]);
  });

  test("keeps array-valued multi-sort mode after clearing from the mobile UI", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/compat/issue-33-sorting?scenario=ownership");

    const scope = page.getByTestId("issue-33-ownership");
    const multi = scope.getByTestId("issue-33-persistent-multi");
    const events = scope.getByTestId("issue-33-multi-events");
    await expect(multi.locator(".tdg-root")).toHaveAttribute(
      "data-layout",
      "mobile-list"
    );

    await multi.getByRole("button", { name: /^Sort:/ }).click();
    await multi.getByRole("button", { name: "Clear sort" }).click();
    await expect
      .poll(async () => {
        const history = await readJson<unknown[]>(events);
        return history.at(-1);
      })
      .toEqual([]);

    await multi.getByRole("button", { name: "Sort", exact: true }).click();
    await multi.getByRole("combobox", { name: "Sort by" }).click();
    await page.getByRole("option", { name: "Code" }).click();
    await multi.getByRole("button", { name: "Apply sort" }).click();

    await expect
      .poll(async () => {
        const history =
          await readJson<Array<Array<{ name: string; dir: number }>>>(events);
        return history.at(-1)?.map(({ name, dir }) => ({ name, dir }));
      })
      .toEqual([{ name: "code", dir: 1 }]);
  });

  test("uses type, registered, column, descriptor, and id-only comparators with exact arguments", async ({
    page,
  }) => {
    await page.goto("/compat/issue-33-sorting?scenario=comparators");
    const scope = page.getByTestId("issue-33-comparators");

    await expect
      .poll(() => rowIds(scope.getByTestId("issue-33-number-type")))
      .toEqual(["row-a1", "row-b1", "row-a2"]);
    await expect
      .poll(() => rowIds(scope.getByTestId("issue-33-string-type")))
      .toEqual(["row-a1", "row-a2", "row-b1"]);
    await expect
      .poll(() => rowIds(scope.getByTestId("issue-33-sort-functions")))
      .toEqual(["row-b1", "row-a1", "row-a2"]);
    await expect
      .poll(() => rowIds(scope.getByTestId("issue-33-column-sort")))
      .toEqual(["row-b1", "row-a1", "row-a2"]);
    await expect
      .poll(() => rowIds(scope.getByTestId("issue-33-id-only-sort")))
      .toEqual(["row-b1", "row-a1", "row-a2"]);
    await expect
      .poll(() => rowIds(scope.getByTestId("issue-33-descriptor-sort")))
      .toEqual(["row-a2", "row-b1", "row-a1"]);

    await expect
      .poll(() =>
        readJson<Record<string, unknown>>(
          scope.getByTestId("issue-33-named-call")
        )
      )
      .toMatchObject({
        columnId: "score-column",
        sortName: "score",
        sortId: "score-column",
      });
    await expect
      .poll(() =>
        readJson<Record<string, unknown>>(
          scope.getByTestId("issue-33-id-only-call")
        )
      )
      .toMatchObject({
        sameFirstRow: true,
        sameSecondRow: true,
        columnId: "whole-row",
        sortName: "",
        sortId: "whole-row",
      });
    await expect
      .poll(() =>
        readJson<Record<string, unknown>>(
          scope.getByTestId("issue-33-descriptor-call")
        )
      )
      .toMatchObject({ sortName: "score" });
  });

  test("honors root sortable with column overrides and root/column sort tools", async ({
    page,
  }) => {
    await page.goto("/compat/issue-33-sorting?scenario=controls");
    const scope = page.getByTestId("issue-33-controls");
    const sortableGrid = scope.getByTestId("issue-33-root-sortable");
    const events = scope.getByTestId("issue-33-sortable-events");

    await header(sortableGrid, "group").click();
    await expect(events).toHaveText("[]");
    await expect
      .poll(() => rowIds(sortableGrid))
      .toEqual(["row-a2", "row-b1", "row-a1"]);

    await header(sortableGrid, "group")
      .getByRole("button", { name: "Column menu" })
      .click();
    await expect(
      page.getByRole("menuitem", { name: "Sort A→Z" })
    ).toHaveAttribute("aria-disabled", "true");
    await expect(
      page.getByRole("menuitem", { name: "Sort Z→A" })
    ).toHaveAttribute("aria-disabled", "true");
    await page.keyboard.press("Escape");

    await header(sortableGrid, "score").click();
    await expect
      .poll(() => readJson<unknown[]>(events).then((history) => history.length))
      .toBe(1);
    await expect
      .poll(() => rowIds(sortableGrid))
      .toEqual(["row-b1", "row-a1", "row-a2"]);

    const tools = scope.getByTestId("issue-33-sort-tools");
    const columnTool = tools.getByTestId("issue-33-column-tool-group");
    const rootTool = tools.getByTestId("issue-33-root-tool-score");
    await expect(columnTool).toHaveAttribute("data-direction", "0");
    await expect(rootTool).toHaveAttribute("data-direction", "0");

    await header(tools, "group").click();
    await expect(columnTool).toHaveAttribute("data-direction", "1");
    await header(tools, "score").click();
    await expect(rootTool).toHaveAttribute("data-direction", "1");
    await expect(columnTool).toHaveAttribute("data-direction", "0");
  });

  test("implements true, false, and always scrollTopOnSort behavior", async ({
    page,
  }) => {
    await page.goto("/compat/issue-33-sorting?scenario=controls");
    const scope = page.getByTestId("issue-33-controls");
    const enabled = scope.getByTestId("issue-33-scroll-true");
    const disabled = scope.getByTestId("issue-33-scroll-false");
    const always = scope.getByTestId("issue-33-scroll-always");

    for (const grid of [enabled, disabled, always]) {
      await grid.locator(".tdg-body-viewport").evaluate((element) => {
        element.scrollTop = 640;
      });
      await expect
        .poll(() =>
          grid
            .locator(".tdg-body-viewport")
            .evaluate((element) => element.scrollTop)
        )
        .toBeGreaterThan(0);
    }

    await enabled.getByTestId("issue-33-scroll-true-sort").click();
    await disabled.getByTestId("issue-33-scroll-false-sort").click();

    await expect
      .poll(() =>
        enabled
          .locator(".tdg-body-viewport")
          .evaluate((element) => element.scrollTop)
      )
      .toBe(0);
    await expect
      .poll(() =>
        disabled
          .locator(".tdg-body-viewport")
          .evaluate((element) => element.scrollTop)
      )
      .toBeGreaterThan(0);

    await always.getByTestId("issue-33-always-refresh").click();
    await expect
      .poll(() =>
        always
          .locator(".tdg-body-viewport")
          .evaluate((element) => element.scrollTop)
      )
      .toBe(0);
  });

  test("forwards persistent sort state to function sources after ordered paging callbacks", async ({
    page,
  }) => {
    await page.goto("/compat/issue-33-sorting?scenario=remote");
    const scope = page.getByTestId("issue-33-remote");
    const grid = scope.getByTestId("issue-33-remote-grid");
    const events = scope.getByTestId("issue-33-remote-events");

    await expect
      .poll(() => readJson<unknown[]>(events).then((history) => history.length))
      .toBeGreaterThan(0);
    await scope.getByTestId("issue-33-clear-remote-events").click();
    await expect(events).toHaveText("[]");

    await header(grid, "name").click();
    await expect
      .poll(() => readJson<unknown[]>(events).then((history) => history.length))
      .toBeGreaterThanOrEqual(3);

    const history = await readJson<
      Array<{
        kind: string;
        skip?: number;
        sortInfo?: Array<{
          id: string;
          name: string;
          dir: number;
          type?: string;
        }>;
        sort?: Array<{
          id: string;
          name: string;
          dir: number;
          type?: string;
          fn: string;
        }>;
      }>
    >(events);

    expect(history[0]).toEqual({ kind: "skip", skip: 0 });
    expect(history[1]).toMatchObject({
      kind: "sort",
      sortInfo: [
        {
          id: "name",
          name: "name",
          dir: -1,
          type: "string",
        },
      ],
    });
    expect(history.at(-1)).toMatchObject({
      kind: "load",
      skip: 0,
      sort: [
        {
          id: "name",
          name: "name",
          dir: -1,
          type: "string",
          fn: "undefined",
        },
      ],
    });
    await expect
      .poll(() => rowIds(grid))
      .toEqual([
        "remote-23",
        "remote-22",
        "remote-21",
        "remote-20",
        "remote-19",
      ]);
  });

  test("keeps repeated 10k-row local multi-sorts responsive and virtualized @production-performance", async ({
    page,
  }) => {
    await page.goto("/compat/issue-33-sorting?scenario=performance");
    const scope = page.getByTestId("issue-33-performance");
    const run = scope.getByTestId("issue-33-performance-run");
    const output = scope.getByTestId("issue-33-performance-metrics");
    const samples: Array<{
      run: number;
      rowCount: number;
      runtimeMode: string;
      dispatchDuration: number;
      settledDuration: number;
      renderedRowCount: number;
      firstRow: string;
    }> = [];

    for (let index = 1; index <= 5; index += 1) {
      await run.click();
      await expect
        .poll(async () => {
          const metrics = await readJson<{ run?: number }>(output);
          return metrics?.run ?? 0;
        })
        .toBe(index);
      samples.push(await readJson<(typeof samples)[number]>(output));
    }

    for (const sample of samples) {
      expect(sample.rowCount).toBe(10_000);
      expect(sample.runtimeMode).toBe("production");
      expect(sample.dispatchDuration).toBeLessThan(16);
      expect(sample.settledDuration).toBeLessThan(250);
      expect(sample.renderedRowCount).toBeGreaterThan(0);
      expect(sample.renderedRowCount).toBeLessThan(100);
      expect(sample.firstRow).toMatch(/^performance-/);
    }

    const settledDurations = samples
      .map((sample) => sample.settledDuration)
      .sort((first, second) => first - second);
    expect(settledDurations[2]).toBeLessThan(175);
  });
});
