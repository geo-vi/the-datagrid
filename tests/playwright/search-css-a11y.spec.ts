import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

const SEARCH_PACKAGE_CSS = readFileSync(
  resolve(process.cwd(), "dist/search.css"),
  "utf8"
);

test.describe("optional search CSS and accessibility regressions", () => {
  test("owns its box model and inherits the host radius without Preflight", async ({
    page,
  }) => {
    await page.setContent(`
      <style>
        :root {
          --radius-md: 19px;
        }

        #host-radius-probe {
          border-radius: var(--radius-md);
        }

        #search-shell {
          width: 240px;
        }
      </style>

      <div id="host-radius-probe">Host</div>
      <div id="search-shell">
        <div
          id="standalone-search"
          class="tdg-search-root tdg-search-bar relative w-full rounded-md"
        >
          <div
            id="standalone-control"
            class="inovua-react-toolkit-text-input flex h-10 w-full items-center rounded-md border px-3 py-1"
          >
            <input
              id="standalone-input"
              class="inovua-react-toolkit-text-input__input min-w-0 flex-1 border-0 p-0"
            />
          </div>
        </div>
      </div>
    `);
    await page.addStyleTag({ content: SEARCH_PACKAGE_CSS });

    const layout = await page.locator("#search-shell").evaluate((shell) => {
      const root = shell.querySelector<HTMLElement>("#standalone-search");
      const control = shell.querySelector<HTMLElement>("#standalone-control");
      const input = shell.querySelector<HTMLInputElement>("#standalone-input");
      const hostProbe =
        document.querySelector<HTMLElement>("#host-radius-probe");
      if (!root || !control || !input || !hostProbe) return null;

      const rootStyle = getComputedStyle(root);
      const controlStyle = getComputedStyle(control);
      const inputStyle = getComputedStyle(input);

      return {
        controlBoxSizing: controlStyle.boxSizing,
        controlHeight: control.getBoundingClientRect().height,
        controlRadius: controlStyle.borderRadius,
        controlWidth: control.getBoundingClientRect().width,
        hostRadius: getComputedStyle(hostProbe).borderRadius,
        inputBoxSizing: inputStyle.boxSizing,
        rootBoxSizing: rootStyle.boxSizing,
        rootRadius: rootStyle.borderRadius,
        rootWidth: root.getBoundingClientRect().width,
        shellWidth: shell.getBoundingClientRect().width,
      };
    });

    expect(layout).toEqual({
      controlBoxSizing: "border-box",
      controlHeight: 40,
      controlRadius: "19px",
      controlWidth: 240,
      hostRadius: "19px",
      inputBoxSizing: "border-box",
      rootBoxSizing: "border-box",
      rootRadius: "19px",
      rootWidth: 240,
      shellWidth: 240,
    });
  });

  test("names sibling search landmarks and aligns a clipped bold prefix with the caret", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/compat/search-data-source");

    const scope = page.getByTestId("promise-search-scope");
    const primarySearchLandmark = scope.getByRole("search", {
      name: "Search all fields",
      exact: true,
    });
    await expect(primarySearchLandmark).toHaveCount(1);
    await expect(
      scope.getByRole("search", { name: "Mirror search", exact: true })
    ).toHaveCount(1);

    const search = scope.getByRole("searchbox", {
      name: "Search all fields",
      exact: true,
    });
    await search.fill("private:analytical");

    const highlight = primarySearchLandmark.locator(
      '[data-slot="rdg-search-query-highlight"]'
    );
    await expect(
      highlight.locator('[data-slot="rdg-search-column-prefix"]')
    ).toHaveText("private:");
    await expect(
      highlight.locator('[data-slot="rdg-search-query-value"]')
    ).toHaveText("analytical");

    const prefixEnd = "private:".length;
    await search.evaluate((input, offset) => {
      input.focus();
      input.setSelectionRange(offset, offset);
      input.dispatchEvent(new Event("select", { bubbles: true }));
    }, prefixEnd);

    const readAlignment = (
      selectionOffset: number,
      queryEdge: "left" | "right"
    ) =>
      primarySearchLandmark.evaluate(
        (element, { queryEdge, selectionOffset }) => {
          const input =
            element.querySelector<HTMLInputElement>('[role="searchbox"]');
          const prefix = element.querySelector<HTMLElement>(
            '[data-slot="rdg-search-column-prefix"]'
          );
          const prefixSlot = element.querySelector<HTMLElement>(
            '[data-slot="rdg-search-column-prefix-slot"]'
          );
          const query = element.querySelector<HTMLElement>(
            '[data-slot="rdg-search-query-value"]'
          );
          if (!input || !prefix || !prefixSlot || !query) return null;

          const inputStyle = getComputedStyle(input);
          const mirror = document.createElement("span");
          mirror.style.position = "fixed";
          mirror.style.left = "-10000px";
          mirror.style.visibility = "hidden";
          mirror.style.whiteSpace = "pre";
          mirror.style.fontFamily = inputStyle.fontFamily;
          mirror.style.fontSize = inputStyle.fontSize;
          mirror.style.fontStyle = inputStyle.fontStyle;
          mirror.style.fontVariant = inputStyle.fontVariant;
          mirror.style.fontWeight = inputStyle.fontWeight;
          mirror.style.fontStretch = inputStyle.fontStretch;
          mirror.style.letterSpacing = inputStyle.letterSpacing;
          mirror.style.textTransform = inputStyle.textTransform;
          mirror.style.setProperty(
            "font-feature-settings",
            inputStyle.getPropertyValue("font-feature-settings")
          );
          mirror.style.setProperty(
            "font-kerning",
            inputStyle.getPropertyValue("font-kerning")
          );
          mirror.style.setProperty(
            "font-variation-settings",
            inputStyle.getPropertyValue("font-variation-settings")
          );
          mirror.textContent = input.value.slice(0, selectionOffset);
          document.body.appendChild(mirror);

          const inputRect = input.getBoundingClientRect();
          const prefixRect = prefix.getBoundingClientRect();
          const prefixSlotRect = prefixSlot.getBoundingClientRect();
          const queryRect = query.getBoundingClientRect();
          const textWidth = mirror.getBoundingClientRect().width;
          mirror.remove();

          const prefixText = prefix.firstChild;
          const lastGlyphRange = document.createRange();
          if (!prefixText || prefixText.nodeType !== Node.TEXT_NODE)
            return null;
          const lastGlyphStart = Math.max(
            0,
            prefixText.textContent!.length - 1
          );
          lastGlyphRange.setStart(prefixText, lastGlyphStart);
          lastGlyphRange.setEnd(prefixText, prefixText.textContent!.length);
          const lastGlyphRect = lastGlyphRange.getBoundingClientRect();

          const caretX =
            inputRect.left +
            Number.parseFloat(inputStyle.borderLeftWidth) +
            Number.parseFloat(inputStyle.paddingLeft) +
            textWidth -
            input.scrollLeft;
          const queryX =
            queryEdge === "left" ? queryRect.left : queryRect.right;

          return {
            delta: queryX - caretX,
            lastGlyphRight: lastGlyphRect.right,
            lastGlyphWidth: lastGlyphRect.width,
            prefixRight: prefixRect.right,
            prefixSlotOverflowX: getComputedStyle(prefixSlot).overflowX,
            prefixSlotRight: prefixSlotRect.right,
            prefixWidth: prefixRect.width,
            queryLeft: queryRect.left,
            scrollLeft: input.scrollLeft,
            slotWidth: prefixSlotRect.width,
          };
        },
        { queryEdge, selectionOffset }
      );

    await expect
      .poll(async () =>
        Math.abs((await readAlignment(prefixEnd, "left"))?.delta ?? 100)
      )
      .toBeLessThan(0.75);

    const positions = await readAlignment(prefixEnd, "left");
    expect(positions).not.toBeNull();
    expect(positions!.prefixSlotOverflowX).toBe("hidden");
    expect(positions!.prefixWidth).toBeGreaterThan(0);
    expect(positions!.prefixWidth).toBeLessThanOrEqual(
      positions!.slotWidth + 0.25
    );
    expect(positions!.lastGlyphWidth).toBeGreaterThan(0);
    expect(positions!.lastGlyphRight).toBeLessThanOrEqual(
      positions!.prefixSlotRight + 0.25
    );
    expect(positions!.queryLeft + 0.01).toBeGreaterThanOrEqual(
      positions!.prefixRight
    );

    const longQuery = `private:${"analytical".repeat(20)}`;
    await search.fill(longQuery);
    await expect
      .poll(() => search.evaluate((input) => input.scrollLeft))
      .toBeGreaterThan(0);
    await expect
      .poll(async () =>
        Math.abs((await readAlignment(longQuery.length, "right"))?.delta ?? 100)
      )
      .toBeLessThan(0.75);

    const overflowAlignment = await readAlignment(longQuery.length, "right");
    expect(overflowAlignment).not.toBeNull();
    expect(overflowAlignment!.scrollLeft).toBeGreaterThan(0);
  });
});
