import { expect, test, type Locator } from "@playwright/test";

async function readJson<T>(locator: Locator): Promise<T> {
  return JSON.parse((await locator.textContent())?.trim() || "null") as T;
}

async function rowIds(scope: Locator): Promise<(string | null)[]> {
  return scope
    .locator('[data-slot="grid-row"]')
    .evaluateAll((rows) => rows.map((row) => row.getAttribute("data-row-id")));
}

test.describe("issue #32 complete data-source ownership", () => {
  test("infers local arrays and authoritative Promise/function pages without double slicing", async ({
    page,
  }) => {
    await page.goto("/compat/issue-32-data-source?scenario=ownership");
    const scope = page.getByTestId("issue-32-ownership");
    await expect(
      scope.getByTestId("ownership-local-array").getByText("Row 3", {
        exact: true,
      })
    ).toBeVisible();
    await expect(
      scope
        .getByTestId("ownership-remote-promise-array")
        .getByText("Remote array row 3", { exact: true })
    ).toBeVisible();

    const expectedRows: Record<string, string[]> = {
      "ownership-local-array": ["row-3", "row-4"],
      "ownership-remote-promise-array": ["remote-array-3", "remote-array-4"],
      "ownership-remote-promise-object": ["remote-object-3", "remote-object-4"],
      "ownership-remote-function-array": ["row-3", "row-4"],
      "ownership-remote-function-object": ["row-3", "row-4"],
      "ownership-local-promise-array": ["row-3", "row-4"],
      "ownership-local-promise-object": ["row-3", "row-4"],
      "ownership-local-function": ["row-3", "row-4"],
    };

    for (const [testId, expected] of Object.entries(expectedRows)) {
      await expect
        .poll(() => rowIds(scope.getByTestId(testId)))
        .toEqual(expected);
    }

    await expect
      .poll(async () => {
        const log = await readJson<
          Record<
            string,
            { skip: number | null; limit: number | null; signal: boolean }
          >
        >(scope.getByTestId("issue-32-ownership-call-log"));
        return Object.keys(log).length;
      })
      .toBe(3);
    const callLog = await readJson<
      Record<
        string,
        {
          skip: number | null;
          limit: number | null;
          signal: boolean;
          keys: string[];
        }
      >
    >(scope.getByTestId("issue-32-ownership-call-log"));

    expect(callLog["sync-array"]).toMatchObject({
      skip: 2,
      limit: 2,
      signal: true,
    });
    expect(callLog["sync-object"]).toMatchObject({
      skip: 2,
      limit: 2,
      signal: true,
    });
    expect(callLog["local-function"]).toMatchObject({
      skip: null,
      limit: null,
      signal: true,
    });
    expect(callLog["sync-object"]?.keys).toEqual([
      "columnOrder",
      "columns",
      "filterValue",
      "idProperty",
      "limit",
      "skip",
      "sortInfo",
      "theme",
    ]);
  });

  test("keeps replacement rows mounted, rejects safely, aborts replaced requests, and ignores stale resolutions", async ({
    page,
  }) => {
    await page.goto("/compat/issue-32-data-source?scenario=lifecycle");
    const scope = page.getByTestId("issue-32-lifecycle");
    const grid = scope.locator(".tdg-root");
    const metricsOutput = scope.getByTestId("lifecycle-metrics");
    const eventsOutput = scope.getByTestId("lifecycle-loading-events");

    await expect(
      grid.getByText("Loading authoritative page", { exact: true })
    ).toBeVisible();
    await expect(grid.locator('[data-slot="grid-surface"]')).toHaveAttribute(
      "aria-busy",
      "true"
    );
    await expect.poll(() => readJson(eventsOutput)).toEqual([true]);
    await expect
      .poll(async () => {
        const metrics = await readJson<{
          computedLoading: boolean;
          isLoading: boolean;
        }>(metricsOutput);
        return {
          computedLoading: metrics.computedLoading,
          isLoading: metrics.isLoading,
        };
      })
      .toEqual({ computedLoading: true, isLoading: true });

    const initial = await readJson<{ latestRequest: number }>(metricsOutput);
    await scope.getByTestId("lifecycle-resolve").click();
    await expect(
      grid.getByText(`Committed request ${initial.latestRequest}`, {
        exact: true,
      })
    ).toBeVisible();
    await expect(grid.locator('[data-slot="grid-surface"]')).toHaveAttribute(
      "aria-busy",
      "false"
    );
    await expect.poll(() => readJson(eventsOutput)).toEqual([true, false]);
    await expect
      .poll(async () => {
        const metrics = await readJson<{
          computedLoading: boolean;
          isLoading: boolean;
        }>(metricsOutput);
        return {
          computedLoading: metrics.computedLoading,
          isLoading: metrics.isLoading,
        };
      })
      .toEqual({ computedLoading: false, isLoading: false });

    await scope.getByTestId("lifecycle-reload").click();
    await expect(
      grid.getByText("Loading authoritative page", { exact: true })
    ).toBeVisible();
    await expect(
      grid.getByText(`Committed request ${initial.latestRequest}`, {
        exact: true,
      })
    ).toBeVisible();
    await scope.getByTestId("lifecycle-reject").click();
    await expect(
      grid.getByText("Loading authoritative page", { exact: true })
    ).toHaveCount(0);
    await expect(
      grid.getByText(`Committed request ${initial.latestRequest}`, {
        exact: true,
      })
    ).toBeVisible();
    await expect
      .poll(() => readJson(eventsOutput))
      .toEqual([true, false, true, false]);

    const beforeReplacement = await readJson<{
      stale: number;
      aborted: number;
    }>(metricsOutput);
    await scope.getByTestId("lifecycle-reload").click();
    await scope.getByTestId("lifecycle-reload").click();
    await expect
      .poll(async () => {
        const metrics = await readJson<{
          active: number;
          stale: number;
          aborted: number;
        }>(metricsOutput);
        return {
          active: metrics.active,
          stale: metrics.stale - beforeReplacement.stale,
          aborted: metrics.aborted - beforeReplacement.aborted,
        };
      })
      .toMatchObject({ active: 1, stale: 1, aborted: 1 });

    await scope.getByTestId("lifecycle-resolve-stale").click();
    await expect(grid.getByText("Stale request", { exact: false })).toHaveCount(
      0
    );
    await expect(
      grid.getByText("Loading authoritative page", { exact: true })
    ).toBeVisible();

    const beforeResolve = await readJson<{ latestRequest: number }>(
      metricsOutput
    );
    await scope.getByTestId("lifecycle-resolve").click();
    await expect(
      grid.getByText(`Committed request ${beforeResolve.latestRequest}`, {
        exact: true,
      })
    ).toBeVisible();
    await expect(
      grid.getByText("Loading authoritative page", { exact: true })
    ).toHaveCount(0);
  });

  test("passes upstream-compatible pagination controls and resets controlled paging before sort/filter requests", async ({
    page,
  }) => {
    await page.goto("/compat/issue-32-data-source?scenario=controlled");
    const scope = page.getByTestId("issue-32-controlled");
    const grid = scope.locator(".tdg-root");
    const toolbar = scope.getByTestId("controlled-toolbar");
    const eventsOutput = scope.getByTestId("controlled-events");

    await expect(grid.locator('[data-row-id="row-5"]')).toBeVisible();
    await expect(toolbar).toHaveAttribute("data-remote", "true");
    await expect(toolbar).toHaveAttribute("data-local", "false");
    await expect(toolbar).toHaveAttribute("data-count", "2");
    await expect(toolbar).toHaveAttribute("data-total-count", "12");
    await expect(toolbar).toHaveAttribute("data-skip", "4");
    await expect(toolbar).toHaveAttribute("data-limit", "2");

    await scope.getByTestId("controlled-clear-events").click();
    await grid
      .locator('[data-slot="grid-header-cell"][data-column-id="name"]')
      .click();
    await expect(grid.locator('[data-row-id="row-1"]')).toBeVisible();
    await expect
      .poll(() => readJson<string[]>(eventsOutput))
      .toEqual(["skip:0", "load:skip=0:limit=2:sort=name:1:filter=none"]);

    await scope.getByTestId("controlled-goto-last").click();
    await expect(grid.locator('[data-row-id="row-11"]')).toBeVisible();
    await expect(toolbar).toHaveAttribute("data-skip", "10");

    await scope.getByTestId("controlled-clear-events").click();
    await scope.getByTestId("controlled-limit").click();
    await expect(grid.locator('[data-row-id="row-11"]')).toBeVisible();
    await expect(toolbar).toHaveAttribute("data-skip", "10");
    await expect(toolbar).toHaveAttribute("data-limit", "3");
    await expect
      .poll(() => readJson<string[]>(eventsOutput))
      .toEqual(["limit:3", "load:skip=10:limit=3:sort=name:1:filter=none"]);

    await scope.getByTestId("controlled-goto-first").click();
    await expect(grid.locator('[data-row-id="row-1"]')).toBeVisible();
    await expect(toolbar).toHaveAttribute("data-skip", "0");
    await scope.getByTestId("controlled-goto-last").click();
    await expect(toolbar).toHaveAttribute("data-skip", "9");
    await scope.getByTestId("controlled-clear-events").click();
    await scope.getByTestId("controlled-filter").click();
    await expect
      .poll(() => readJson<string[]>(eventsOutput), { timeout: 2_000 })
      .toEqual(["skip:0", "load:skip=0:limit=3:sort=name:1:filter=Row 1"]);

    const requestsBeforeReload = (await readJson<string[]>(eventsOutput))
      .length;
    await scope.getByTestId("controlled-reload").click();
    await expect
      .poll(async () => (await readJson<string[]>(eventsOutput)).length)
      .toBe(requestsBeforeReload + 1);
  });

  test("reloads a function data source when its theme argument changes", async ({
    page,
  }) => {
    await page.goto("/compat/issue-32-data-source?scenario=reload-contracts");
    const scope = page.getByTestId("issue-32-reload-contracts");
    const remote = scope.getByTestId("reload-remote-theme");
    const calls = scope.getByTestId("reload-remote-calls");

    await expect(
      remote.getByText("Remote theme default-light", { exact: true })
    ).toBeVisible();
    await expect
      .poll(async () => Number(await calls.textContent()))
      .toBeGreaterThan(0);
    const callsBeforeThemeChange = Number(await calls.textContent());

    await scope.getByTestId("reload-toggle-theme").click();
    await expect(
      remote.getByText("Remote theme default-dark", { exact: true })
    ).toBeVisible();
    await expect(calls).toHaveText(String(callsBeforeThemeChange + 1));
  });

  test("an explicit local reload refreshes rows reused by reference", async ({
    page,
  }) => {
    await page.goto("/compat/issue-32-data-source?scenario=reload-contracts");
    const scope = page.getByTestId("issue-32-reload-contracts");
    const local = scope.getByTestId("reload-local-mutation");

    await expect(
      local.getByText("Local original", { exact: true })
    ).toBeVisible();
    await scope.getByTestId("reload-mutate-local").click();
    await expect(
      local.getByText("Local mutated", { exact: true })
    ).toBeVisible();
  });
});

test("replacement performance stays within a frame budget and commits only the latest request", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const performanceWindow = window as typeof window & {
      __issue32LongTasks?: Array<{ startTime: number; duration: number }>;
    };
    performanceWindow.__issue32LongTasks = [];
    if (typeof PerformanceObserver === "undefined") return;

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        performanceWindow.__issue32LongTasks?.push({
          startTime: entry.startTime,
          duration: entry.duration,
        });
      }
    });
    try {
      observer.observe({ type: "longtask", buffered: true });
    } catch {
      // Older Chromium builds can omit the longtask entry type.
    }
  });
  await page.goto("/compat/issue-32-data-source?scenario=lifecycle");
  const scope = page.getByTestId("issue-32-lifecycle");
  const grid = scope.locator(".tdg-root");
  const metricsOutput = scope.getByTestId("lifecycle-metrics");

  const initial = await readJson<{ latestRequest: number }>(metricsOutput);
  await scope.getByTestId("lifecycle-resolve").click();
  await expect(
    grid.getByText(`Committed request ${initial.latestRequest}`, {
      exact: true,
    })
  ).toBeVisible();

  let committedRequest = initial.latestRequest;
  for (let iteration = 0; iteration < 5; iteration += 1) {
    const before = await readJson<{
      requests: number;
      aborted: number;
      profilerCommits: number;
      profilerDuration: number;
    }>(metricsOutput);
    const burstStart = await page.evaluate(() => performance.now());
    await scope.getByTestId("lifecycle-burst").click();
    await expect
      .poll(async () => {
        const metrics = await readJson<{
          requests: number;
          aborted: number;
          active: number;
        }>(metricsOutput);
        return {
          requests: metrics.requests - before.requests,
          aborted: metrics.aborted - before.aborted,
          active: metrics.active,
        };
      })
      .toEqual({ requests: 50, aborted: 49, active: 1 });

    const during = await readJson<{
      latestRequest: number;
      burstDuration: number;
      profilerCommits: number;
      profilerDuration: number;
    }>(metricsOutput);
    expect(during.burstDuration).toBeLessThan(16);
    expect(during.profilerCommits - before.profilerCommits).toBeLessThanOrEqual(
      3
    );
    expect(during.profilerDuration - before.profilerDuration).toBeLessThan(16);
    expect(
      await page.evaluate(
        (startedAt) =>
          (
            window as typeof window & {
              __issue32LongTasks?: Array<{
                startTime: number;
                duration: number;
              }>;
            }
          ).__issue32LongTasks?.filter(
            (entry) => entry.startTime >= startedAt
          ) ?? [],
        burstStart
      )
    ).toEqual([]);
    await expect(grid.locator('[data-slot="grid-row"]')).toHaveCount(1);
    await expect(
      grid.getByText(`Committed request ${committedRequest}`, {
        exact: true,
      })
    ).toBeVisible();

    await scope.getByTestId("lifecycle-resolve").click();
    committedRequest = during.latestRequest;
    await expect(
      grid.getByText(`Committed request ${committedRequest}`, { exact: true })
    ).toBeVisible();
    await expect(grid.locator('[data-slot="grid-row"]')).toHaveCount(1);
  }
});
