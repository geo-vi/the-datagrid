import { expect, test, type Locator, type Page } from "@playwright/test";

type RemoteProjectionSnapshot = {
  filter: {
    name: string;
    type: string | null;
    operator: string;
    value: unknown;
    hasGetter: boolean;
  } | null;
  columnOrder: string[];
  columns: string[];
};

type EditorPropsSnapshot = {
  filterEditorPropsType: string;
  hasI18n: boolean;
  hasTheme: boolean;
  hasRender: boolean;
  hasCellProps: boolean;
  hasCell: boolean;
  hasEmptyValue: boolean;
  hasFilterType: boolean;
  hasOnChange: boolean;
  filterDelay: number | null;
  active: boolean | null;
  operator: string | null;
};

type NumberEditorPropsCall = {
  index: number | null;
  value: unknown;
  hasFilterValue: boolean;
  hasColumn: boolean;
  hasCellProps: boolean;
};

type FilterLogEvent = {
  kind: "column" | "aggregate";
  columnId?: string;
  filterValue: unknown;
};

const operatorExpectations = {
  string: {
    contains: ["alpha", "alphabet"],
    notContains: ["empty", "null", "number-zero", "text-zero", "false", "beta"],
    eq: ["text-zero"],
    neq: ["empty", "null", "number-zero", "false", "alpha", "alphabet", "beta"],
    empty: ["empty"],
    notEmpty: [
      "null",
      "number-zero",
      "text-zero",
      "false",
      "alpha",
      "alphabet",
      "beta",
    ],
    startsWith: ["alpha", "alphabet"],
    endsWith: ["alpha", "beta"],
    falsyNumberFilter: [
      "empty",
      "null",
      "number-zero",
      "text-zero",
      "false",
      "alpha",
      "alphabet",
      "beta",
    ],
    falsyBooleanFilter: [
      "empty",
      "null",
      "number-zero",
      "text-zero",
      "false",
      "alpha",
      "alphabet",
      "beta",
    ],
  },
  number: {
    gt: ["two", "text-two", "three"],
    gte: ["two", "text-two", "three"],
    lt: ["null", "empty", "zero", "one"],
    lte: ["null", "empty", "zero", "one", "two", "text-two"],
    eq: ["two"],
    neq: ["null", "empty", "zero", "one", "text-two", "three"],
    inrange: ["one", "two", "text-two"],
    notinrange: ["null", "empty", "zero", "three"],
    emptyStringEq: ["empty"],
    nullEq: ["null", "empty", "zero", "one", "two", "text-two", "three"],
  },
  bool: {
    eq: ["true"],
    neq: ["null", "false", "zero", "one"],
    nullEq: ["null", "false", "true", "zero", "one"],
  },
  boolean: {
    eq: ["true"],
    neq: ["null", "false", "zero", "one"],
    nullEq: ["null", "false", "true", "zero", "one"],
  },
  select: {
    inlist: ["a", "c"],
    notinlist: ["null", "empty", "b", "zero", "false"],
    eq: ["a"],
    neq: ["null", "empty", "b", "c", "zero", "false"],
    emptyList: ["null", "empty", "a", "b", "c", "zero", "false"],
    nullEq: ["null", "empty", "a", "b", "c", "zero", "false"],
    scalarList: ["empty", "a", "b"],
  },
  date: {
    after: ["end", "outside"],
    afterOrOn: ["middle", "end", "outside"],
    before: ["start"],
    beforeOrOn: ["start", "middle"],
    eq: ["middle"],
    neq: ["start", "end", "outside"],
    inrange: ["start", "middle", "end"],
    notinrange: ["outside"],
    emptyEq: ["start", "middle", "end", "outside"],
  },
} as const;

async function readJson<T>(locator: Locator): Promise<T> {
  return JSON.parse((await locator.textContent())?.trim() || "null") as T;
}

async function rowIds(scope: Locator): Promise<(string | null)[]> {
  return scope
    .locator('[data-slot="grid-row"]')
    .evaluateAll((rows) => rows.map((row) => row.getAttribute("data-row-id")));
}

function filterCell(scope: Locator, columnId: string): Locator {
  return scope.locator(`.tdg-filter-cell[data-column-id="${columnId}"]`);
}

async function openScenario(page: Page, scenario: string): Promise<Locator> {
  await page.goto(`/compat/issue-34-filtering?scenario=${scenario}`);
  const scope = page.getByTestId(`issue-34-${scenario}`);
  await expect(scope).toBeVisible();
  return scope;
}

test.describe("issue #34 complete filtering parity", () => {
  test("retains filter-row inference and explicit visibility precedence", async ({
    page,
  }) => {
    await page.goto("/compat/github-issues-31-32");
    const probe = page.getByTestId("github-issue-31-probe");

    const snapshots = await Promise.all(
      [
        "issue-31-filter-omitted",
        "issue-31-filter-default-active",
        "issue-31-filter-controlled",
        "issue-31-filter-explicit-true",
        "issue-31-filter-explicit-false-default",
        "issue-31-filter-explicit-false-controlled",
        "issue-31-filter-empty-default",
        "issue-31-filter-inactive-default",
      ].map(async (testId) => {
        const grid = probe.getByTestId(testId).locator(".tdg-root");
        await expect(grid).toBeVisible();
        return grid.evaluate((element) => ({
          filterRows: element.querySelectorAll(".tdg-filter-row").length,
          dataRows: element.querySelectorAll('[data-slot="grid-row"]').length,
        }));
      })
    );

    expect(snapshots).toEqual([
      { filterRows: 0, dataRows: 2 },
      { filterRows: 1, dataRows: 1 },
      { filterRows: 1, dataRows: 2 },
      { filterRows: 1, dataRows: 2 },
      { filterRows: 0, dataRows: 1 },
      { filterRows: 0, dataRows: 2 },
      { filterRows: 0, dataRows: 2 },
      { filterRows: 1, dataRows: 2 },
    ]);
  });

  test("uses column.filterName and column.getFilterValue for local rows", async ({
    page,
  }) => {
    const scope = await openScenario(page, "projection");
    await expect
      .poll(() => rowIds(scope.getByTestId("issue-34-local-alias")))
      .toEqual(["alias-ada"]);
  });

  test("projects filter aliases, inferred types, and getters into remote args", async ({
    page,
  }) => {
    const scope = await openScenario(page, "projection");
    const output = scope.getByTestId("issue-34-remote-snapshot");

    await expect
      .poll(async () => {
        const snapshot = await readJson<RemoteProjectionSnapshot | null>(
          output
        );
        return snapshot?.filter ?? null;
      })
      .toEqual({
        name: "profileName",
        type: "string",
        operator: "contains",
        value: "Ada",
        hasGetter: true,
      });
  });

  test("applies defaultVisible/defaultHidden before deriving remote columns", async ({
    page,
  }) => {
    const scope = await openScenario(page, "projection");
    await expect
      .poll(() =>
        readJson<RemoteProjectionSnapshot | null>(
          scope.getByTestId("issue-34-remote-snapshot")
        )
      )
      .not.toBeNull();

    const remote = await readJson<RemoteProjectionSnapshot>(
      scope.getByTestId("issue-34-remote-snapshot")
    );
    expect(remote.columns).toEqual(["id", "displayName", "visibleMeta"]);
  });

  test("keeps default-hidden IDs out of remote rendered column order", async ({
    page,
  }) => {
    const scope = await openScenario(page, "projection");
    await expect
      .poll(() =>
        readJson<RemoteProjectionSnapshot | null>(
          scope.getByTestId("issue-34-remote-snapshot")
        )
      )
      .not.toBeNull();
    const remote = await readJson<RemoteProjectionSnapshot>(
      scope.getByTestId("issue-34-remote-snapshot")
    );

    expect(remote.columnOrder).toEqual(["id", "displayName", "visibleMeta"]);
  });

  test("honors descriptor-level getFilterValue for local filtering", async ({
    page,
  }) => {
    const scope = await openScenario(page, "descriptors");
    await expect
      .poll(() => rowIds(scope.getByTestId("issue-34-descriptor-getter")))
      .toEqual(["getter-ada"]);
  });

  test("honors descriptor-level fn before registered operators", async ({
    page,
  }) => {
    const scope = await openScenario(page, "descriptors");
    await expect
      .poll(() => rowIds(scope.getByTestId("issue-34-descriptor-function")))
      .toEqual(["fn-keep"]);
  });

  test("passes the complete Inovua filter-editor contract to custom editors", async ({
    page,
  }) => {
    const scope = await openScenario(page, "editors");
    await expect
      .poll(() =>
        readJson<EditorPropsSnapshot>(
          scope.getByTestId("issue-34-custom-editor-props")
        )
      )
      .toEqual({
        filterEditorPropsType: "function",
        hasI18n: true,
        hasTheme: true,
        hasRender: true,
        hasCellProps: true,
        hasCell: true,
        hasEmptyValue: true,
        hasFilterType: true,
        hasOnChange: true,
        filterDelay: 250,
        active: true,
        operator: "contains",
      });
  });

  test("accepts full-descriptor onChange output from a custom editor", async ({
    page,
  }) => {
    const scope = await openScenario(page, "editors");
    await scope.getByTestId("issue-34-custom-editor-change").click();
    await expect
      .poll(async () => {
        const events = await readJson<unknown[]>(
          scope.getByTestId("issue-34-editor-filter-events")
        );
        return events.at(-1);
      })
      .toEqual([
        expect.objectContaining({
          name: "name",
          type: "string",
          operator: "contains",
          value: "Grace",
        }),
        expect.objectContaining({
          name: "score",
          type: "number",
          operator: "inrange",
        }),
      ]);
  });

  test("invokes functional NumberFilter editor props for both range inputs", async ({
    page,
  }) => {
    const scope = await openScenario(page, "editors");
    await scope.getByTestId("issue-34-capture-number-editor-calls").click();
    const calls = await readJson<NumberEditorPropsCall[]>(
      scope.getByTestId("issue-34-number-editor-calls")
    );
    const latestByIndex = new Map<number | null, NumberEditorPropsCall>();
    for (const call of calls) latestByIndex.set(call.index, call);

    expect([...latestByIndex.keys()].sort()).toEqual([0, 1]);
    expect(latestByIndex.get(0)).toMatchObject({
      value: 1,
      hasFilterValue: true,
      hasColumn: true,
      hasCellProps: true,
    });
    expect(latestByIndex.get(1)).toMatchObject({
      value: 5,
      hasFilterValue: true,
      hasColumn: true,
      hasCellProps: true,
    });
  });

  test("initializes both boolean type aliases with eq", async ({ page }) => {
    const scope = await openScenario(page, "booleans");
    await expect(scope.getByTestId("issue-34-boolValue-operator")).toHaveText(
      "eq"
    );
    await expect(
      scope.getByTestId("issue-34-booleanValue-operator").first()
    ).toHaveText("eq");
    await expect
      .poll(() => rowIds(scope.getByTestId("issue-34-bool-default")))
      .toEqual(["bool-true"]);
    await expect
      .poll(() => rowIds(scope.getByTestId("issue-34-boolean-default")))
      .toEqual(["boolean-true"]);
  });

  test("preserves null as the empty boolean value", async ({ page }) => {
    const scope = await openScenario(page, "booleans");
    await expect
      .poll(() => rowIds(scope.getByTestId("issue-34-boolean-empty")))
      .toEqual(["boolean-empty-true", "boolean-empty-false"]);
  });

  test("uses column.filterDelay instead of the fixed aggregate delay", async ({
    page,
  }) => {
    const scope = await openScenario(page, "delay");
    const input = filterCell(
      scope.getByTestId("issue-34-delay-grid"),
      "name"
    ).locator("input");
    await input.evaluate((element) => {
      element.addEventListener(
        "input",
        () => {
          (
            window as typeof window & {
              __issue34FilterInputAt?: number;
            }
          ).__issue34FilterInputAt = performance.now();
        },
        { once: true }
      );
    });
    await input.fill("Ada");
    await expect
      .poll(async () => {
        const times = await readJson<number[]>(
          scope.getByTestId("issue-34-delay-event-times")
        );
        return times.length;
      })
      .toBeGreaterThan(0);
    const times = await readJson<number[]>(
      scope.getByTestId("issue-34-delay-event-times")
    );
    const startedAt = await page.evaluate(
      () =>
        (
          window as typeof window & {
            __issue34FilterInputAt?: number;
          }
        ).__issue34FilterInputAt ?? 0
    );

    // Explicit 25 ms debounce plus React rendering should remain well below
    // the current hard-coded 300 ms path.
    expect(times.at(-1)! - startedAt).toBeLessThan(225);
  });

  test("resets vertical scroll when scrollTopOnFilter is enabled", async ({
    page,
  }) => {
    const scope = await openScenario(page, "scroll");
    const enabled = scope.getByTestId("issue-34-scroll-enabled");
    const enabledViewport = enabled.locator(".tdg-body-viewport");

    await enabledViewport.evaluate((element) => {
      element.scrollTop = 640;
      element.dispatchEvent(new Event("scroll"));
    });
    await expect
      .poll(() => enabledViewport.evaluate((element) => element.scrollTop))
      .toBeGreaterThan(0);

    await enabled
      .getByRole("textbox", { name: "issue-34-scroll-enabled filter" })
      .fill("Row 1");

    await expect
      .poll(() => enabledViewport.evaluate((element) => element.scrollTop))
      .toBe(0);
  });

  test("retains vertical scroll when scrollTopOnFilter is disabled", async ({
    page,
  }) => {
    const scope = await openScenario(page, "scroll");
    const disabled = scope.getByTestId("issue-34-scroll-disabled");
    const disabledViewport = disabled.locator(".tdg-body-viewport");

    await disabledViewport.evaluate((element) => {
      element.scrollTop = 640;
      element.dispatchEvent(new Event("scroll"));
    });
    await expect
      .poll(() => disabledViewport.evaluate((element) => element.scrollTop))
      .toBeGreaterThan(0);

    await disabled
      .getByRole("textbox", { name: "issue-34-scroll-disabled filter" })
      .fill("Row 1");
    await page.waitForTimeout(450);
    await expect
      .poll(() => disabledViewport.evaluate((element) => element.scrollTop))
      .toBeGreaterThan(0);
  });

  test("keeps the standard operator menu keyboard focus contract", async ({
    page,
  }) => {
    const scope = await openScenario(page, "menu");
    const trigger = scope
      .getByTestId("issue-34-standard-menu")
      .getByRole("button", { name: "Filter" });
    await trigger.click();
    const activeOperator = page.getByRole("menuitemradio", {
      name: "contains",
      exact: true,
    });
    await expect(activeOperator).toBeVisible();
    await expect(activeOperator).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("menu")).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });

  test("supports custom filter-menu rendering, constraints, and positioning", async ({
    page,
  }) => {
    const scope = await openScenario(page, "menu");
    await scope
      .getByTestId("issue-34-custom-menu")
      .getByRole("button", { name: "Filter" })
      .click();
    const menu = page.getByTestId("issue-34-custom-filter-menu");

    await expect(menu).toBeVisible();
    await expect(menu).toHaveAttribute("data-position", "fixed");
    await expect(menu).toHaveAttribute("data-has-cell-props", "true");
    await expect(menu).toHaveAttribute("data-has-grid", "true");
    await expect(menu).toHaveAttribute("data-has-grid-props", "true");
    await expect(menu).toHaveAttribute("data-has-constrain-to", "true");
    await expect(menu).toHaveAttribute(
      "data-update-position-on-scroll",
      "false"
    );
    await expect(menu).toHaveAttribute("data-align-positions", '["tl-bl"]');
  });

  test("matches exact string falsy semantics", async ({ page }) => {
    const scope = await openScenario(page, "operators");
    await expect
      .poll(() => rowIds(scope.getByTestId("issue-34-string-falsy")))
      .toEqual(["string-text-zero"]);
  });

  test("keeps number equality strict instead of coercing numeric strings", async ({
    page,
  }) => {
    const scope = await openScenario(page, "operators");
    await expect
      .poll(() => rowIds(scope.getByTestId("issue-34-number-equality")))
      .toEqual(["number-native"]);
  });

  test("distinguishes the number empty value null from an empty string", async ({
    page,
  }) => {
    const scope = await openScenario(page, "operators");
    await expect
      .poll(() => rowIds(scope.getByTestId("issue-34-number-empty")))
      .toEqual(["number-empty-string"]);
  });

  test("keeps number/date ranges and select lists inclusive and exact", async ({
    page,
  }) => {
    const scope = await openScenario(page, "operators");
    await expect
      .poll(() => rowIds(scope.getByTestId("issue-34-number-range")))
      .toEqual(["range-one", "range-two"]);
    await expect
      .poll(() => rowIds(scope.getByTestId("issue-34-select-list")))
      .toEqual(["select-a", "select-c"]);
    await expect
      .poll(() => rowIds(scope.getByTestId("issue-34-date-range")))
      .toEqual(["date-start", "date-middle"]);
  });

  for (const [filterType, expected] of Object.entries(operatorExpectations)) {
    test(`matches every documented ${filterType} operator`, async ({
      page,
    }) => {
      const scope = await openScenario(page, "operator-matrix");
      const matrix = await readJson<Record<string, Record<string, string[]>>>(
        scope.getByTestId("issue-34-operator-matrix-output")
      );

      expect(matrix[filterType]).toEqual(expected);
    });
  }

  test("preserves PR #30 per-column callback ordering", async ({ page }) => {
    await page.goto("/compat/inovua-pending-parity?scenario=filter-callback");
    const scope = page.getByTestId("inovua-pending-parity-scenario");
    await scope.getByTestId("pending-name-filter").fill("Grace");
    await expect
      .poll(async () => {
        const events = await readJson<FilterLogEvent[]>(
          scope.getByTestId("filter-event-log")
        );
        return events.map((event) => event.kind);
      })
      .toEqual(["column", "aggregate"]);
  });

  test("keeps repeated 10k-row local filters responsive and virtualized @production-performance", async ({
    page,
  }) => {
    await page.goto("/compat/issue-34-filtering?scenario=performance");
    const scope = page.getByTestId("issue-34-performance");
    const run = scope.getByTestId("issue-34-performance-run");
    const output = scope.getByTestId("issue-34-performance-metrics");
    const samples: Array<{
      run: number;
      rowCount: number;
      filteredCount: number;
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
      expect(sample.filteredCount).toBe(500);
      expect(sample.runtimeMode).toBe("production");
      expect(sample.dispatchDuration).toBeLessThan(16);
      expect(sample.settledDuration).toBeLessThan(250);
      expect(sample.renderedRowCount).toBeGreaterThan(0);
      expect(sample.renderedRowCount).toBeLessThan(100);
      expect(sample.firstRow).toMatch(/^filter-performance-/);
    }

    const settledDurations = samples
      .map((sample) => sample.settledDuration)
      .sort((first, second) => first - second);
    expect(settledDurations[2]).toBeLessThan(175);
  });
});
