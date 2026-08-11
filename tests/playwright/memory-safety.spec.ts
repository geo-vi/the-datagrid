import { expect, test, type Page } from "@playwright/test";

type LifecycleSnapshot = {
  windowListeners: Record<string, number>;
  windowListenerAdds: Record<string, number>;
  windowListenerRemoves: Record<string, number>;
  mediaQueryListeners: number;
  mutationObservers: number;
  resizeObservers: number;
};

async function installLifecycleAudit(page: Page) {
  await page.addInitScript(() => {
    const audit = {
      windowListeners: {
        blur: new Set<EventListenerOrEventListenerObject>(),
        mousemove: new Set<EventListenerOrEventListenerObject>(),
        mouseup: new Set<EventListenerOrEventListenerObject>(),
      },
      windowListenerAdds: { blur: 0, mousemove: 0, mouseup: 0 },
      windowListenerRemoves: { blur: 0, mousemove: 0, mouseup: 0 },
      mediaQueryListeners: 0,
      mutationObservers: 0,
      resizeObservers: 0,
    };

    const originalWindowAdd = window.addEventListener.bind(window);
    const originalWindowRemove = window.removeEventListener.bind(window);

    window.addEventListener = ((type, listener, options) => {
      const tracked =
        audit.windowListeners[type as keyof typeof audit.windowListeners];
      tracked?.add(listener);
      if (tracked) {
        audit.windowListenerAdds[
          type as keyof typeof audit.windowListenerAdds
        ] += 1;
      }
      originalWindowAdd(type, listener, options);
    }) as typeof window.addEventListener;

    window.removeEventListener = ((type, listener, options) => {
      const tracked =
        audit.windowListeners[type as keyof typeof audit.windowListeners];
      tracked?.delete(listener);
      if (tracked) {
        audit.windowListenerRemoves[
          type as keyof typeof audit.windowListenerRemoves
        ] += 1;
      }
      originalWindowRemove(type, listener, options);
    }) as typeof window.removeEventListener;

    const originalMatchMedia = window.matchMedia.bind(window);
    window.matchMedia = ((query: string) => {
      const mediaQuery = originalMatchMedia(query);
      const originalAdd = mediaQuery.addEventListener.bind(mediaQuery);
      const originalRemove = mediaQuery.removeEventListener.bind(mediaQuery);
      const activeListeners = new Set<EventListenerOrEventListenerObject>();

      mediaQuery.addEventListener = ((type, listener, options) => {
        if (type === "change" && !activeListeners.has(listener)) {
          activeListeners.add(listener);
          audit.mediaQueryListeners += 1;
        }
        originalAdd(type, listener, options);
      }) as typeof mediaQuery.addEventListener;

      mediaQuery.removeEventListener = ((type, listener, options) => {
        if (type === "change" && activeListeners.delete(listener)) {
          audit.mediaQueryListeners -= 1;
        }
        originalRemove(type, listener, options);
      }) as typeof mediaQuery.removeEventListener;

      return mediaQuery;
    }) as typeof window.matchMedia;

    const NativeMutationObserver = window.MutationObserver;
    window.MutationObserver = class extends NativeMutationObserver {
      private auditActive = false;

      observe(target: Node, options?: MutationObserverInit) {
        if (!this.auditActive) {
          this.auditActive = true;
          audit.mutationObservers += 1;
        }
        super.observe(target, options);
      }

      disconnect() {
        if (this.auditActive) {
          this.auditActive = false;
          audit.mutationObservers -= 1;
        }
        super.disconnect();
      }
    };

    if (window.ResizeObserver) {
      const NativeResizeObserver = window.ResizeObserver;
      window.ResizeObserver = class extends NativeResizeObserver {
        private auditTargets = new Set<Element>();

        observe(target: Element, options?: ResizeObserverOptions) {
          if (this.auditTargets.size === 0) {
            audit.resizeObservers += 1;
          }
          this.auditTargets.add(target);
          super.observe(target, options);
        }

        unobserve(target: Element) {
          const removed = this.auditTargets.delete(target);
          if (removed && this.auditTargets.size === 0) {
            audit.resizeObservers -= 1;
          }
          super.unobserve(target);
        }

        disconnect() {
          if (this.auditTargets.size > 0) audit.resizeObservers -= 1;
          this.auditTargets.clear();
          super.disconnect();
        }
      };
    }

    Object.defineProperty(window, "__tdgLifecycleAudit", {
      configurable: false,
      value: audit,
    });
  });
}

async function readLifecycleAudit(page: Page): Promise<LifecycleSnapshot> {
  return page.evaluate(() => {
    const audit = (
      window as typeof window & {
        __tdgLifecycleAudit: {
          windowListeners: Record<
            string,
            Set<EventListenerOrEventListenerObject>
          >;
          windowListenerAdds: Record<string, number>;
          windowListenerRemoves: Record<string, number>;
          mediaQueryListeners: number;
          mutationObservers: number;
          resizeObservers: number;
        };
      }
    ).__tdgLifecycleAudit;

    return {
      windowListeners: Object.fromEntries(
        Object.entries(audit.windowListeners).map(([type, listeners]) => [
          type,
          listeners.size,
        ])
      ),
      windowListenerAdds: { ...audit.windowListenerAdds },
      windowListenerRemoves: { ...audit.windowListenerRemoves },
      mediaQueryListeners: audit.mediaQueryListeners,
      mutationObservers: audit.mutationObservers,
      resizeObservers: audit.resizeObservers,
    };
  });
}

function monitorBrowserHealth(page: Page) {
  const errors: string[] = [];
  let crashed = false;

  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("crash", () => {
    crashed = true;
  });

  return () => {
    expect(crashed, "the Chromium renderer crashed").toBe(false);
    expect(errors, "uncaught page errors or promise rejections").toEqual([]);
  };
}

test.describe("browser memory safety", () => {
  test.describe.configure({ mode: "serial" });

  test("bounds ready, filter, and volatile-input callback feedback", async ({
    page,
  }) => {
    const assertHealthy = monitorBrowserHealth(page);

    await page.goto("/compat/memory-safety?scenario=ready");
    await expect(page.locator(".tdg-root")).toBeVisible();
    await page.waitForTimeout(400);
    expect(Number(await page.getByTestId("ready-calls").textContent())).toBe(1);
    expect(Number(await page.getByTestId("handle-calls").textContent())).toBe(
      1
    );
    await expect(page.getByTestId("api-stable")).toHaveText("true");
    await expect(page.getByTestId("api-live")).toHaveText("true");

    await page.getByTestId("ready-scroll").click();
    await expect(page.getByTestId("ready-scroll-checks")).toHaveText("1");
    await expect(
      page.locator('[data-slot="grid-row"][data-row-index="1500"]')
    ).toBeVisible();
    await page.waitForTimeout(300);
    expect(Number(await page.getByTestId("ready-calls").textContent())).toBe(1);
    expect(Number(await page.getByTestId("handle-calls").textContent())).toBe(
      1
    );
    await expect(page.getByTestId("api-stable")).toHaveText("true");

    await page.goto("/compat/memory-safety?scenario=filter");
    await page.waitForTimeout(650);
    expect(Number(await page.getByTestId("filter-calls").textContent())).toBe(
      0
    );
    await page
      .locator(".tdg-filter-cell")
      .nth(1)
      .getByRole("textbox")
      .fill("Grace");
    await page.waitForTimeout(700);
    expect(Number(await page.getByTestId("filter-calls").textContent())).toBe(
      1
    );
    await page.waitForTimeout(450);
    expect(Number(await page.getByTestId("filter-calls").textContent())).toBe(
      1
    );

    await page.reload();
    await page
      .locator(".tdg-filter-cell")
      .nth(1)
      .getByRole("textbox")
      .fill("Ada");
    await page.getByRole("link", { name: "Docs", exact: true }).click();
    await expect(page.locator(".tdg-root")).toHaveCount(0);
    await page.waitForTimeout(450);
    expect(
      await page.evaluate(
        () =>
          (window as typeof window & { __tdgFilterCallbackCalls?: number })
            .__tdgFilterCallbackCalls
      )
    ).toBe(0);

    await page.goto("/compat/memory-safety?scenario=volatile-count");
    await page.getByTestId("arm-volatile-count").click();
    await page.getByTestId("trigger-volatile-count").click();
    const settled = page.getByTestId("volatile-settled-count");
    await expect(settled).toHaveText(/^\d+$/);
    expect(Number(await settled.textContent())).toBe(1);
    await expect(page.getByTestId("volatile-live-count")).toHaveText("1");

    await page.getByTestId("arm-volatile-count").click();
    await expect(settled).toHaveText("pending");
    await page.getByTestId("trigger-volatile-count").click();
    await expect(settled).toHaveText(/^\d+$/);
    expect(Number(await settled.textContent())).toBe(1);
    await expect(page.getByTestId("volatile-live-count")).toHaveText("1");
    assertHealthy();
  });

  test("discards stale, rejected, and post-unmount remote completions", async ({
    page,
  }) => {
    const assertHealthy = monitorBrowserHealth(page);
    await page.goto("/compat/memory-safety?scenario=remote");

    const grid = page.locator(".tdg-root");
    await expect(
      grid.getByText("Initial response", { exact: true })
    ).toBeVisible();
    const observerCallsBeforeRace = Number(
      await page.getByTestId("remote-observer-calls").textContent()
    );

    await page.getByTestId("remote-race").click();
    await expect(
      grid.getByText("Latest response", { exact: true })
    ).toBeVisible();
    await page.waitForTimeout(250);
    await expect(
      grid.getByText("Latest response", { exact: true })
    ).toBeVisible();
    await expect(grid.getByText("Stale response", { exact: true })).toHaveCount(
      0
    );

    await page.getByTestId("remote-reject").click();
    await page.waitForTimeout(100);
    await expect(
      grid.getByText("Latest response", { exact: true })
    ).toBeVisible();

    await page.getByTestId("remote-invalid-count").click();
    await expect(
      grid.getByText("Invalid count response", { exact: true })
    ).toBeVisible();
    await expect(grid).not.toContainText("NaN");
    expect(
      Number(await page.getByTestId("remote-observer-calls").textContent())
    ).toBe(observerCallsBeforeRace);

    const observerCallsBeforeUnmount = Number(
      await page.getByTestId("remote-observer-calls").textContent()
    );
    expect(observerCallsBeforeUnmount).toBe(observerCallsBeforeRace);
    await page.getByTestId("remote-pending-unmount").click();
    await expect(page.getByTestId("remote-mounted")).toHaveText("false");
    await expect(grid).toHaveCount(0);
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            !(
              window as typeof window & {
                __tdgRemoteApiRef?: { current: unknown };
              }
            ).__tdgRemoteApiRef?.current
        )
      )
      .toBe(true);

    await page.getByTestId("remote-resolve").click();
    await page.waitForTimeout(100);
    expect(
      Number(await page.getByTestId("remote-observer-calls").textContent())
    ).toBe(observerCallsBeforeUnmount);
    await page.getByTestId("remote-toggle").click();
    await expect(page.getByTestId("remote-mounted")).toHaveText("true");
    await expect(
      page.locator(".tdg-root").getByText("Initial response", { exact: true })
    ).toBeVisible();
    assertHealthy();
  });

  test("plateaus retained DOM, listeners, observers, APIs, and portals", async ({
    context,
    page,
  }) => {
    await installLifecycleAudit(page);
    const assertHealthy = monitorBrowserHealth(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/compat/memory-safety?scenario=lifecycle");

    const toggle = page.getByTestId("lifecycle-toggle");
    const grid = page.locator(".tdg-root");
    await expect(grid).toBeVisible();
    await toggle.click();
    await expect(grid).toHaveCount(0);

    const cdp = await context.newCDPSession(page);
    const collectMemory = async () => {
      await cdp.send("HeapProfiler.collectGarbage");
      await page.evaluate(
        () =>
          new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
      );
      await cdp.send("HeapProfiler.collectGarbage");
      const [dom, heap] = await Promise.all([
        cdp.send("Memory.getDOMCounters"),
        cdp.send("Runtime.getHeapUsage"),
      ]);
      return { dom, heap };
    };
    const runBatch = async () => {
      for (let iteration = 0; iteration < 6; iteration += 1) {
        await toggle.click();
        await expect(grid).toBeVisible();
        const menuButton = grid
          .getByRole("button", { name: "Column menu" })
          .first();
        const menuContent = page.locator('[data-slot="dropdown-menu-content"]');
        await expect(menuButton).toBeVisible();
        await expect
          .poll(async () => {
            if (await menuContent.isVisible()) return true;

            await menuButton.click();
            return menuContent.isVisible();
          })
          .toBe(true);
        await toggle.dispatchEvent("click");
        await expect(grid).toHaveCount(0);
        await expect(
          page.locator('[data-slot="dropdown-menu-content"]')
        ).toHaveCount(0);
      }
      await expect
        .poll(() =>
          page.evaluate(
            () =>
              !(
                window as typeof window & {
                  __tdgLifecycleApiRef?: { current: unknown };
                }
              ).__tdgLifecycleApiRef?.current
          )
        )
        .toBe(true);
      return {
        audit: await readLifecycleAudit(page),
        memory: await collectMemory(),
      };
    };

    await collectMemory();
    await runBatch();
    const afterFirstBatch = await runBatch();
    const afterSecondBatch = await runBatch();

    expect(
      afterSecondBatch.memory.dom.nodes - afterFirstBatch.memory.dom.nodes
    ).toBeLessThanOrEqual(100);
    expect(
      afterSecondBatch.memory.dom.jsEventListeners -
        afterFirstBatch.memory.dom.jsEventListeners
    ).toBeLessThanOrEqual(5);
    expect(
      afterSecondBatch.memory.dom.documents -
        afterFirstBatch.memory.dom.documents
    ).toBeLessThanOrEqual(1);
    expect(
      afterSecondBatch.memory.heap.usedSize -
        afterFirstBatch.memory.heap.usedSize
    ).toBeLessThanOrEqual(4 * 1024 * 1024);
    expect(
      afterSecondBatch.audit.mediaQueryListeners -
        afterFirstBatch.audit.mediaQueryListeners
    ).toBe(0);
    expect(
      afterSecondBatch.audit.mutationObservers -
        afterFirstBatch.audit.mutationObservers
    ).toBeLessThanOrEqual(1);
    expect(
      afterSecondBatch.audit.resizeObservers -
        afterFirstBatch.audit.resizeObservers
    ).toBeLessThanOrEqual(2);
    for (const type of ["blur", "mousemove", "mouseup"]) {
      expect(
        (afterSecondBatch.audit.windowListeners[type] ?? 0) -
          (afterFirstBatch.audit.windowListeners[type] ?? 0)
      ).toBeLessThanOrEqual(1);
    }
    assertHealthy();
  });

  test("cleans an interrupted resize on responsive transition and blur", async ({
    page,
  }) => {
    await installLifecycleAudit(page);
    const assertHealthy = monitorBrowserHealth(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/examples/mobile-transform");

    const grid = page.locator(".tdg-root");
    const baseline = await readLifecycleAudit(page);
    const startResize = async () => {
      const resizer = grid.locator('[data-slot="column-resizer"]').first();
      const box = await resizer.boundingBox();
      expect(box).not.toBeNull();
      await resizer.dispatchEvent("mousedown", {
        button: 0,
        clientX: (box?.x ?? 0) + (box?.width ?? 0) / 2,
        clientY: (box?.y ?? 0) + (box?.height ?? 0) / 2,
      });
      await expect(grid).toHaveAttribute("data-column-resizing", "true");
      await expect
        .poll(() =>
          page.evaluate(() => ({
            cursor: document.body.style.cursor,
            userSelect: document.body.style.userSelect,
          }))
        )
        .toEqual({ cursor: "col-resize", userSelect: "none" });
    };

    await startResize();
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(grid).toHaveAttribute("data-layout", "mobile-list");
    await expect(grid).toHaveAttribute("data-column-resizing", "false");
    await expect(
      grid.locator(".InovuaReactDataGrid__resize-proxy")
    ).toHaveCount(0);
    await expect
      .poll(async () => (await readLifecycleAudit(page)).windowListeners.blur)
      .toBe(baseline.windowListeners.blur);
    const mobileListeners = (await readLifecycleAudit(page)).windowListeners;
    expect(mobileListeners.mousemove ?? 0).toBeLessThanOrEqual(
      (baseline.windowListeners.mousemove ?? 0) + 1
    );
    expect(mobileListeners.mouseup ?? 0).toBeLessThanOrEqual(
      (baseline.windowListeners.mouseup ?? 0) + 1
    );
    const afterMobileCleanup = await readLifecycleAudit(page);
    for (const type of ["blur", "mousemove", "mouseup"]) {
      expect(
        (afterMobileCleanup.windowListenerRemoves[type] ?? 0) -
          (baseline.windowListenerRemoves[type] ?? 0)
      ).toBeGreaterThanOrEqual(1);
    }
    await expect
      .poll(() =>
        page.evaluate(() => ({
          cursor: document.body.style.cursor,
          userSelect: document.body.style.userSelect,
        }))
      )
      .toEqual({ cursor: "", userSelect: "" });

    await page.setViewportSize({ width: 1280, height: 900 });
    await expect(grid).toHaveAttribute("data-layout", "table");
    const beforeBlurResize = await readLifecycleAudit(page);
    await startResize();
    await page.evaluate(() => window.dispatchEvent(new Event("blur")));
    await expect(grid).toHaveAttribute("data-column-resizing", "false");
    await expect
      .poll(async () => (await readLifecycleAudit(page)).windowListeners.blur)
      .toBe(baseline.windowListeners.blur);
    const afterBlurCleanup = await readLifecycleAudit(page);
    for (const type of ["blur", "mousemove", "mouseup"]) {
      expect(
        (afterBlurCleanup.windowListenerRemoves[type] ?? 0) -
          (beforeBlurResize.windowListenerRemoves[type] ?? 0)
      ).toBeGreaterThanOrEqual(1);
    }
    await expect
      .poll(() =>
        page.evaluate(() => ({
          cursor: document.body.style.cursor,
          userSelect: document.body.style.userSelect,
        }))
      )
      .toEqual({ cursor: "", userSelect: "" });
    assertHealthy();
  });

  test("keeps responsive virtualization and menu observers bounded", async ({
    page,
  }) => {
    await installLifecycleAudit(page);
    const assertHealthy = monitorBrowserHealth(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/examples/mobile-transform");

    const grid = page.locator(".tdg-root");
    await expect(grid).toHaveAttribute("data-layout", "mobile-list");
    const baseline = await readLifecycleAudit(page);

    for (let iteration = 0; iteration < 8; iteration += 1) {
      await grid.getByRole("button", { name: "Display columns" }).click();
      await expect(
        grid.locator('[data-slot="dropdown-menu-content"]')
      ).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(
        grid.locator('[data-slot="dropdown-menu-content"]')
      ).toHaveCount(0);

      const search = grid.getByRole("searchbox", {
        name: "Search all fields",
      });
      await search.fill(`no-such-customer-${iteration}`);
      const resultCount = grid
        .locator('[data-slot="mobile-grid-list"] output')
        .first();
      await expect(resultCount).toHaveText("0 results");
      await grid.getByRole("button", { name: "Clear search" }).click();
      await expect(resultCount).not.toHaveText("0 results");

      await page.setViewportSize({ width: 1025, height: 900 });
      await expect(grid).toHaveAttribute("data-layout", "table");
      await expect
        .poll(() => grid.locator('[data-slot="grid-row"]').count())
        .toBeGreaterThan(0);
      expect(await grid.locator('[data-slot="grid-row"]').count()).toBeLessThan(
        100
      );

      await page.setViewportSize({ width: 1024, height: 900 });
      await expect(grid).toHaveAttribute("data-layout", "mobile-list");
      await expect
        .poll(() => grid.getByRole("listitem").count())
        .toBeGreaterThan(0);
      expect(await grid.getByRole("listitem").count()).toBeLessThan(20);
    }

    await expect(
      grid.locator('[data-slot="dropdown-menu-content"]')
    ).toHaveCount(0);
    const finalAudit = await readLifecycleAudit(page);
    expect(finalAudit.windowListeners).toEqual(baseline.windowListeners);
    expect(finalAudit.mediaQueryListeners).toBe(baseline.mediaQueryListeners);
    expect(finalAudit.mutationObservers).toBe(baseline.mutationObservers);
    expect(finalAudit.resizeObservers).toBe(baseline.resizeObservers);
    assertHealthy();
  });

  // Regression gate for the render-generation leak: ReactDataGrid used to be one
  // ~10k-line component scope, so a memoised callback from an older render kept
  // that whole render alive, and each generation chained on to the previous one.
  // Sorting with a large dataSource grew the heap monotonically until Chrome
  // killed the tab. Splitting the component into per-feature hooks broke the
  // chain. If that regresses, the heap stops plateauing here.
  test("releases past render generations across repeated sorts", async ({
    context,
    page,
  }) => {
    test.setTimeout(180_000);
    const assertHealthy = monitorBrowserHealth(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/compat/memory-safety?scenario=generations");
    await expect(page.locator(".tdg-root")).toBeVisible();

    const sortButton = page.getByTestId("generations-sort");
    const cdp = await context.newCDPSession(page);

    const measureHeap = async () => {
      await cdp.send("HeapProfiler.collectGarbage");
      await page.evaluate(
        () =>
          new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
      );
      await cdp.send("HeapProfiler.collectGarbage");
      const heap = await cdp.send("Runtime.getHeapUsage");
      return heap.usedSize;
    };

    // Sorting and a parent re-render, together. Measured separately, each of
    // these is flat across six batches; only the combination retains. Keep both
    // clicks in the loop or this stops testing anything.
    const rerenderButton = page.getByTestId("generations-rerender");
    const runBatch = async () => {
      for (let iteration = 0; iteration < 8; iteration += 1) {
        await sortButton.click();
        await rerenderButton.click();
        await page.waitForTimeout(120);
      }
      return measureHeap();
    };

    // The first batch settles caches and lazily-built structures, so it is a
    // warm-up rather than a baseline. Compare the two batches after it: a grid
    // that releases its generations plateaus, a leaking one keeps climbing.
    const mb = (bytes: number) => (bytes / (1024 * 1024)).toFixed(1);
    await runBatch();
    const afterFirstBatch = await runBatch();
    const afterSecondBatch = await runBatch();
    const growth = afterSecondBatch - afterFirstBatch;

    expect(
      growth,
      `heap grew ${mb(growth)} MB across 8 sorts (${mb(afterFirstBatch)} MB -> ` +
        `${mb(afterSecondBatch)} MB); past render generations are being retained`
    ).toBeLessThanOrEqual(12 * 1024 * 1024);
    assertHealthy();
  });
});
