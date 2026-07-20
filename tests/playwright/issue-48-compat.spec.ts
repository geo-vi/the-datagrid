import { expect, test, type Locator, type Page } from "@playwright/test";

type Issue48Scenario =
  | "text-input"
  | "did-mount"
  | "did-mount-zero-width"
  | "did-mount-async"
  | "adjust-natural"
  | "adjust-fixed"
  | "adjust-function"
  | "adjust-nonvirtual"
  | "adjust-safe";

type MountEvent = {
  type: "didMount" | "handle" | "ready";
  refId: number;
  callbackVersion: number;
  apiLive: boolean;
  domConnected: boolean;
  rowCount: number | null;
};

type HeightSnapshot = {
  height: number | null;
  start: number | null;
  end: number | null;
  nextStart: number | null;
  total: number | null;
};

type AdjustReport = {
  methodExists: boolean;
  returnedUndefined: boolean;
  error: string | null;
  mode: string;
  before: HeightSnapshot;
  stale: HeightSnapshot;
  after: HeightSnapshot;
  domHeight: number | null;
  totalRows: number;
  mountedIndexes: number[];
  measuredIndexes: number[];
};

async function openScenario(page: Page, scenario: Issue48Scenario) {
  await page.goto(`/compat/issue-48?scenario=${scenario}`);

  const scope = page.getByTestId("issue-48-scenario");
  await expect(scope).toHaveAttribute("data-scenario", scenario);
  await expect(scope.getByRole("heading", { name: scenario })).toBeVisible();
  return scope;
}

async function readJson<T>(locator: Locator): Promise<T> {
  return JSON.parse((await locator.textContent())?.trim() || "null") as T;
}

async function readMountEvents(locator: Locator): Promise<MountEvent[]> {
  return readJson<MountEvent[]>(locator);
}

test.describe("issue #48 TextInput compatibility", () => {
  test("supports uncontrolled value-first callbacks, callback ordering, propagation and clear", async ({
    page,
  }) => {
    const scope = await openScenario(page, "text-input");
    const availability = scope.getByTestId("text-input-availability");
    await expect(availability).toHaveAttribute("data-available", "true");

    const input = scope.getByTestId("uncontrolled-input");
    await expect(input).toHaveValue("seed");
    await input.fill("changed");

    await expect
      .poll(async () =>
        readJson<string[]>(scope.getByTestId("text-input-events"))
      )
      .toEqual(["input:changed", "root:changed"]);
    await expect(scope.getByTestId("text-input-outer-changes")).toHaveText("0");

    await scope.getByTestId("propagating-input").fill("bubbles");
    await expect(scope.getByTestId("text-input-outer-changes")).toHaveText("1");
    await expect
      .poll(async () =>
        readJson<string[]>(scope.getByTestId("text-input-events"))
      )
      .toContain("propagating:bubbles");

    const clear = scope.locator("button.issue48-uncontrolled-clear");
    await expect(clear).toBeVisible();
    await clear.click();
    await expect(input).toHaveValue("");
    await expect(input).toBeFocused();
    await expect(clear).toBeHidden();

    const events = await readJson<string[]>(
      scope.getByTestId("text-input-events")
    );
    expect(events.slice(-2)).toEqual(["input:", "root:"]);
    await expect(scope.getByTestId("text-input-outer-changes")).toHaveText("1");
  });

  test("keeps controlled ownership and exposes focus/setValue through its ref", async ({
    page,
  }) => {
    const scope = await openScenario(page, "text-input");
    await expect(scope.getByTestId("text-input-availability")).toHaveAttribute(
      "data-available",
      "true"
    );

    const controlled = scope.getByTestId("controlled-input");
    await controlled.fill("consumer proposal");
    await expect(scope.getByTestId("controlled-candidate")).toHaveText(
      "consumer proposal"
    );
    await expect(controlled).toHaveValue("locked");
    await scope.getByTestId("apply-controlled").click();
    await expect(controlled).toHaveValue("consumer proposal");

    const uncontrolled = scope.getByTestId("uncontrolled-input");
    await scope.getByTestId("imperative-focus").click();
    await expect(uncontrolled).toBeFocused();
    await scope.getByTestId("imperative-set-value").click();
    await expect(uncontrolled).toHaveValue("imperative");

    const events = await readJson<string[]>(
      scope.getByTestId("text-input-events")
    );
    expect(events.slice(-2)).toEqual(["input:imperative", "root:imperative"]);

    await scope.getByTestId("call-detached-clear-renderer").click();
    await expect(scope.getByTestId("detached-render-status")).toHaveText(
      "rendered"
    );
  });

  test("keeps the legacy state classes and suppresses clear for disabled/read-only fields", async ({
    page,
  }) => {
    const scope = await openScenario(page, "text-input");
    await expect(scope.getByTestId("text-input-availability")).toHaveAttribute(
      "data-available",
      "true"
    );

    const root = scope.getByTestId("uncontrolled-root");
    await expect(root).toHaveClass(/inovua-react-toolkit-text-input/);
    await expect(root).toHaveClass(
      /inovua-react-toolkit-text-input--theme-default-light/
    );
    await expect(root).toHaveClass(/inovua-react-toolkit-text-input--ltr/);
    await expect(root).toHaveClass(
      /inovua-react-toolkit-text-input--enable-clear-button/
    );

    await scope.getByTestId("uncontrolled-input").focus();
    await expect(root).toHaveClass(/inovua-react-toolkit-text-input--focused/);
    await expect(scope.getByTestId("disabled-root")).toHaveClass(
      /inovua-react-toolkit-text-input--disabled/
    );
    await expect(scope.locator("button.issue48-disabled-clear")).toBeHidden();
    await expect(scope.locator("button.issue48-readonly-clear")).toBeHidden();
    await expect(
      scope.locator("button.issue48-uncontrolled-clear")
    ).toHaveAttribute("tabindex", "-1");
    await expect(
      scope.locator("button.issue48-focusable-clear")
    ).toHaveAttribute("tabindex", "0");

    const customRoot = scope.getByTestId("custom-theme-root");
    await expect(customRoot).toHaveClass(/issue48-custom-text-input/);
    await expect(customRoot).toHaveClass(/issue48-custom-text-input--rtl/);
    await expect(customRoot).toHaveClass(
      /issue48-custom-text-input--theme-midnight/
    );
    await expect(customRoot).toHaveAttribute(
      "data-theme",
      "consumer-theme-hook"
    );
    await expect(customRoot).toHaveAttribute(
      "data-disabled",
      "consumer-disabled-hook"
    );
    await expect(customRoot).toHaveAttribute(
      "data-focused",
      "consumer-focused-hook"
    );
    await expect(customRoot).toHaveAttribute("dir", "auto");
    await expect(
      scope.getByTestId("focusable-clear-input")
    ).not.toHaveAttribute("stopchangepropagation");

    const subclassClear = scope.getByTestId("subclass-clear-button");
    await expect(subclassClear).toHaveClass(/issue48-subclass-clear/);
    await expect(subclassClear).toHaveAttribute(
      "data-clear-color",
      "rgb(10, 20, 30)"
    );
    await expect(subclassClear).toHaveAttribute("data-clear-size", "[13,17]");
    await expect(subclassClear).toHaveAttribute(
      "data-clear-style",
      '{"opacity":0.75}'
    );

    // The examples app also loads an Inovua theme for migration demos. Probe
    // the custom BEM root so the geometry can only come from our standalone
    // tdg-text-input styling, never from an upstream legacy selector.
    const standaloneGeometry = await customRoot.evaluate((element) => {
      const input = element.querySelector("input");
      const clear = element.querySelector("button");
      if (!input || !clear) return null;
      const rootRect = element.getBoundingClientRect();
      const inputRect = input.getBoundingClientRect();
      const clearRect = clear.getBoundingClientRect();
      const rootStyle = getComputedStyle(element);
      const inputStyle = getComputedStyle(input);
      return {
        display: rootStyle.display,
        borderWidth: Number.parseFloat(rootStyle.borderTopWidth),
        inputBorderWidth: Number.parseFloat(inputStyle.borderTopWidth),
        rootWidth: rootRect.width,
        rootHeight: rootRect.height,
        inputVisible: inputRect.width > 0 && inputRect.height > 0,
        inputContained:
          inputRect.left >= rootRect.left - 1 &&
          inputRect.right <= rootRect.right + 1 &&
          inputRect.top >= rootRect.top - 1 &&
          inputRect.bottom <= rootRect.bottom + 1,
        clearCenterContained:
          clearRect.left + clearRect.width / 2 >= rootRect.left &&
          clearRect.right - clearRect.width / 2 <= rootRect.right &&
          clearRect.top + clearRect.height / 2 >= rootRect.top &&
          clearRect.bottom - clearRect.height / 2 <= rootRect.bottom,
      };
    });
    expect(standaloneGeometry).not.toBeNull();
    expect(standaloneGeometry?.display).toBe("inline-flex");
    expect(standaloneGeometry?.borderWidth ?? 0).toBeGreaterThan(0);
    expect(standaloneGeometry?.inputBorderWidth).toBe(0);
    expect(standaloneGeometry?.rootWidth ?? 0).toBeGreaterThan(100);
    expect(standaloneGeometry?.rootHeight ?? 0).toBeGreaterThanOrEqual(28);
    expect(standaloneGeometry?.inputVisible).toBe(true);
    expect(standaloneGeometry?.inputContained).toBe(true);
    expect(standaloneGeometry?.clearCenterContained).toBe(true);
  });

  test("accepts null legacy options and keeps Inovua's falsey clear semantics", async ({
    page,
  }) => {
    const scope = await openScenario(page, "text-input");

    const nullPropsRoot = scope.getByTestId("null-input-props-root");
    await expect(nullPropsRoot.locator("input")).toHaveValue("null-safe");

    await expect(scope.getByTestId("numeric-zero-input")).toHaveValue("0");
    await expect(
      scope.locator("button.issue48-numeric-zero-clear")
    ).toBeHidden();

    const zeroSizeClear = scope.locator("button.issue48-zero-size-clear");
    await expect(zeroSizeClear).toBeVisible();
    const zeroSizeIcon = await zeroSizeClear.locator("svg").evaluate((icon) => {
      const rect = icon.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    });
    expect(zeroSizeIcon.width).toBe(20);
    expect(zeroSizeIcon.height).toBe(20);

    await scope.getByTestId("null-propagation-input").fill("still bubbles");
    await expect(scope.getByTestId("text-input-outer-changes")).toHaveText("1");
  });
});

test.describe("issue #48 onDidMount compatibility", () => {
  test("runs after the DOM/API commit, before handle/onReady, and shares their stable ref", async ({
    page,
  }) => {
    const scope = await openScenario(page, "did-mount");
    const output = scope.getByTestId("did-mount-events");

    await expect
      .poll(async () => {
        const events = await readMountEvents(output);
        return ["didMount", "handle", "ready"].every((type) =>
          events.some((event) => event.type === type)
        );
      })
      .toBe(true);

    const events = await readMountEvents(output);
    const didMountEvents = events.filter((event) => event.type === "didMount");
    const firstDidMount = events.findIndex(
      (event) => event.type === "didMount"
    );
    const firstHandle = events.findIndex((event) => event.type === "handle");
    const firstReady = events.findIndex((event) => event.type === "ready");

    expect(firstDidMount).toBeGreaterThanOrEqual(0);
    expect(firstDidMount).toBeLessThan(firstHandle);
    expect(firstHandle).toBeLessThan(firstReady);
    expect(new Set(events.map((event) => event.refId))).toEqual(
      new Set([didMountEvents[0]!.refId])
    );
    expect(
      didMountEvents.every(
        (event) =>
          event.apiLive && event.domConnected && event.rowCount !== null
      )
    ).toBe(true);
    expect(didMountEvents[0]!.rowCount).toBe(0);
  });

  test("does not rerun for callback replacement/rerender and gets a new ref on a real remount", async ({
    page,
  }) => {
    const scope = await openScenario(page, "did-mount");
    const output = scope.getByTestId("did-mount-events");

    await expect
      .poll(
        async () =>
          (await readMountEvents(output)).filter(
            (event) => event.type === "didMount"
          ).length
      )
      .toBeGreaterThan(0);

    // Let StrictMode's deliberate development-only effect replay settle, then
    // compare counts instead of assuming either one or two raw mount calls.
    await page.waitForTimeout(100);
    const before = await readMountEvents(output);
    const beforeDidMount = before.filter((event) => event.type === "didMount");
    const firstRefId = beforeDidMount[0]!.refId;
    const firstRefRawCalls = beforeDidMount.filter(
      (event) => event.refId === firstRefId
    ).length;

    await scope.getByTestId("did-mount-rerender").click();
    await page.waitForTimeout(100);
    const rerendered = await readMountEvents(output);
    expect(rerendered.filter((event) => event.type === "didMount").length).toBe(
      beforeDidMount.length
    );

    await scope.getByTestId("did-mount-remount").click();
    await expect
      .poll(async () => {
        const events = await readMountEvents(output);
        return new Set(
          events
            .filter((event) => event.type === "didMount")
            .map((event) => event.refId)
        ).size;
      })
      .toBe(2);

    await page.waitForTimeout(100);
    const remounted = await readMountEvents(output);
    const remountDidEvents = remounted.filter(
      (event) => event.type === "didMount"
    );
    const secondRefId = remountDidEvents.find(
      (event) => event.refId !== firstRefId
    )!.refId;
    expect(
      remountDidEvents.filter((event) => event.refId === secondRefId).length
    ).toBe(firstRefRawCalls);
    expect(
      remountDidEvents
        .filter((event) => event.refId === secondRefId)
        .every((event) => event.callbackVersion === 1)
    ).toBe(true);
  });

  test("fires for a committed zero-width grid", async ({ page }) => {
    const scope = await openScenario(page, "did-mount-zero-width");
    await expect(scope.getByTestId("zero-width-host")).toHaveCSS(
      "width",
      "0px"
    );

    const output = scope.getByTestId("did-mount-zero-events");
    await expect
      .poll(async () => (await readMountEvents(output)).length)
      .toBeGreaterThan(0);

    const events = await readMountEvents(output);
    expect(events.every((event) => event.apiLive && event.domConnected)).toBe(
      true
    );
  });

  test("fires before an async data source resolves and does not repeat on load", async ({
    page,
  }) => {
    const scope = await openScenario(page, "did-mount-async");
    const calls = scope.getByTestId("did-mount-async-calls");

    await expect
      .poll(async () => Number((await calls.textContent()) ?? 0))
      .toBeGreaterThan(0);
    const settledMountCalls = Number(await calls.textContent());

    await scope.getByTestId("resolve-async-data").click();
    const grid = scope.locator(".InovuaReactDataGrid.tdg-root");
    await expect(
      grid.locator('[data-slot="grid-row"][data-row-id="1"]')
    ).toBeVisible();
    await page.waitForTimeout(100);
    await expect(calls).toHaveText(String(settledMountCalls));
  });
});

test.describe("issue #48 virtualList.adjustHeights compatibility", () => {
  test("remeasures only mounted natural-height rows and rebuilds offsets", async ({
    page,
  }) => {
    const scope = await openScenario(page, "adjust-natural");
    await scope.getByTestId("run-adjust-heights").click();
    const output = scope.getByTestId("adjust-heights-report");
    await expect
      .poll(async () => {
        const report = await readJson<AdjustReport | null>(output);
        return Boolean(
          report &&
          report.domHeight != null &&
          report.after.height != null &&
          report.after.height >= report.domHeight - 1
        );
      })
      .toBe(true);
    const report = await readJson<AdjustReport>(output);

    expect(report.methodExists).toBe(true);
    expect(report.returnedUndefined).toBe(true);
    expect(report.error).toBeNull();
    expect(report.before.height).not.toBeNull();
    expect(report.stale.height).toBe(report.before.height);
    expect(report.domHeight ?? 0).toBeGreaterThan(report.before.height ?? 0);
    expect(report.after.height ?? 0).toBeGreaterThanOrEqual(
      (report.domHeight ?? 0) - 1
    );
    expect(report.after.nextStart).toBe(report.after.end);
    expect((report.after.total ?? 0) - (report.before.total ?? 0)).toBe(
      (report.after.height ?? 0) - (report.before.height ?? 0)
    );

    expect(report.mountedIndexes.length).toBeGreaterThan(1);
    expect(report.mountedIndexes.length).toBeLessThan(report.totalRows);
    expect(new Set(report.measuredIndexes)).toEqual(
      new Set(report.mountedIndexes)
    );
  });

  test("keeps a numeric rowHeight authoritative", async ({ page }) => {
    const scope = await openScenario(page, "adjust-fixed");
    await scope.getByTestId("run-adjust-heights").click();
    const report = await readJson<AdjustReport>(
      scope.getByTestId("adjust-heights-report")
    );

    expect(report.methodExists).toBe(true);
    expect(report.returnedUndefined).toBe(true);
    expect(report.error).toBeNull();
    expect(report.before.height).toBe(48);
    expect(report.stale.height).toBe(48);
    expect(report.after.height).toBe(48);
    expect(report.after.nextStart).toBe(report.after.end);
    expect(report.after.total).toBe(report.before.total);
    expect(report.measuredIndexes).toEqual([]);
  });

  test("remeasures function-valued row heights like Inovua 5.10.2", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const observedRowIndexes: string[] = [];
      Object.defineProperty(window, "__issue48ObservedRowIndexes", {
        configurable: true,
        value: observedRowIndexes,
      });

      const originalObserve = ResizeObserver.prototype.observe;
      ResizeObserver.prototype.observe = function (
        target: Element,
        options?: ResizeObserverOptions
      ) {
        if (
          target instanceof HTMLElement &&
          target.dataset.slot === "grid-row"
        ) {
          observedRowIndexes.push(target.dataset.rowIndex ?? "");
        }
        return originalObserve.call(this, target, options);
      };
    });

    const scope = await openScenario(page, "adjust-function");
    await page.evaluate(() => {
      const trackedWindow = window as Window & {
        __issue48ObservedRowIndexes?: string[];
      };
      if (trackedWindow.__issue48ObservedRowIndexes) {
        trackedWindow.__issue48ObservedRowIndexes.length = 0;
      }
    });
    await scope.getByTestId("run-adjust-heights").click();
    const output = scope.getByTestId("adjust-heights-report");
    await expect
      .poll(async () => {
        const report = await readJson<AdjustReport | null>(output);
        return (report?.after.height ?? 0) > 48;
      })
      .toBe(true);
    const report = await readJson<AdjustReport>(output);

    expect(report.methodExists).toBe(true);
    expect(report.returnedUndefined).toBe(true);
    expect(report.error).toBeNull();
    expect(report.before.height).toBe(48);
    expect(report.stale.height).toBe(48);
    expect(report.domHeight ?? 0).toBeGreaterThan(48);
    expect(report.after.height ?? 0).toBeGreaterThan(48);
    expect(report.after.nextStart).toBe(report.after.end);
    expect(report.after.total ?? 0).toBeGreaterThan(report.before.total ?? 0);
    expect(new Set(report.measuredIndexes)).toEqual(
      new Set(report.mountedIndexes)
    );

    // Function-height rows do not carry TanStack's measureElement ref. The
    // imperative compatibility method must not register them with a
    // ResizeObserver, otherwise scrolled-out nodes remain cached/observed.
    await page.waitForTimeout(50);
    const observedRows = await page.evaluate(() => {
      const trackedWindow = window as Window & {
        __issue48ObservedRowIndexes?: string[];
      };
      return trackedWindow.__issue48ObservedRowIndexes ?? [];
    });
    expect(observedRows).toEqual([]);
  });

  test("remeasures every instantiated row in non-virtual natural layout", async ({
    page,
  }) => {
    const scope = await openScenario(page, "adjust-nonvirtual");
    await scope.getByTestId("run-adjust-heights").click();
    const output = scope.getByTestId("adjust-heights-report");
    await expect
      .poll(async () => {
        const report = await readJson<AdjustReport | null>(output);
        return Boolean(
          report &&
          report.domHeight != null &&
          report.after.height != null &&
          report.after.height >= report.domHeight - 1
        );
      })
      .toBe(true);
    const report = await readJson<AdjustReport>(output);

    expect(report.methodExists).toBe(true);
    expect(report.returnedUndefined).toBe(true);
    expect(report.error).toBeNull();
    expect(report.mountedIndexes).toHaveLength(report.totalRows);
    expect(new Set(report.measuredIndexes)).toEqual(
      new Set(report.mountedIndexes)
    );
    expect(report.after.nextStart).toBe(report.after.end);
    expect((report.after.total ?? 0) - (report.before.total ?? 0)).toBe(
      (report.after.height ?? 0) - (report.before.height ?? 0)
    );
  });

  test("is a safe void no-op for an empty non-virtual grid", async ({
    page,
  }) => {
    const scope = await openScenario(page, "adjust-safe");
    await scope.getByTestId("run-safe-adjust-heights").click();
    const report = await readJson<{
      methodExists: boolean;
      returnedUndefined: boolean;
      error: string | null;
    }>(scope.getByTestId("adjust-safe-report"));

    expect(report).toEqual({
      methodExists: true,
      returnedUndefined: true,
      error: null,
    });
  });
});
