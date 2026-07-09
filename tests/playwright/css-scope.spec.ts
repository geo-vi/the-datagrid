import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

const PACKAGE_CSS = readFileSync(
  resolve(process.cwd(), "dist/index.css"),
  "utf8"
);

test.describe("issue #16 package CSS scope", () => {
  test("does not leak datagrid Tailwind utilities onto host shadcn classes", async ({
    page,
  }) => {
    await page.setContent(`
      <style id="host-shadcn-css">
        :root {
          --font-sans: "Host Sans", sans-serif;
          --tracking-tight: 0em;
          --radius: 17px;
          --radius-md: 15px;
          --background: rgb(10 20 30);
          --foreground: rgb(240 244 248);
          --border: rgb(80 96 116);
        }

        .bg-background {
          background-color: var(--background);
        }

        .text-foreground {
          color: var(--foreground);
        }

        .border {
          border-style: solid;
          border-width: 1px;
        }

        .border-border {
          border-color: var(--border);
        }

        .rounded-md {
          border-radius: var(--radius-md);
        }
      </style>

      <main
        id="host-shell"
        style="
          --tdg-radius-md: 44px;
          --tdg-color-background: rgb(255 0 255);
          --tdg-color-foreground: rgb(0 255 0);
          --tdg-color-border: rgb(255 128 0);
        "
      >
        <div
          id="host-probe"
          class="rounded-md border border-border bg-background text-foreground"
        >
          Host shadcn probe
        </div>
        <div class="tdg-root">
          <div
            id="grid-owned-probe"
            class="rounded-md border border-border bg-background text-foreground"
          >
            Grid-owned probe
          </div>
        </div>
      </main>
    `);

    const style = await page.addStyleTag({ content: PACKAGE_CSS });
    await style.evaluate((node) => {
      node.id = "tdg-package-css";
    });

    const cssScan = await page.evaluate(() => {
      const ownedMarkers = [
        ".tdg-",
        ".InovuaReactDataGrid",
        ".inovua-react-toolkit",
      ];
      const utilityMarkers = [
        ".bg-background",
        ".bg-background\\/",
        ".border-border",
        ".border-border\\/",
        ".rounded-md",
        ".text-foreground",
      ];
      const globalThemeVariablePattern =
        /--(?:tdg-|font-sans|tracking-tight|color-[a-z0-9-]+|radius-[a-z0-9-]+)/i;

      function splitSelectorList(selector: string): string[] {
        const selectors: string[] = [];
        let current = "";
        let depth = 0;
        let quote: string | null = null;
        let escaped = false;

        for (const char of selector) {
          if (escaped) {
            current += char;
            escaped = false;
            continue;
          }

          if (char === "\\") {
            current += char;
            escaped = true;
            continue;
          }

          if (quote) {
            current += char;
            if (char === quote) quote = null;
            continue;
          }

          if (char === '"' || char === "'") {
            current += char;
            quote = char;
            continue;
          }

          if (char === "(" || char === "[") {
            current += char;
            depth += 1;
            continue;
          }

          if (char === ")" || char === "]") {
            current += char;
            depth = Math.max(0, depth - 1);
            continue;
          }

          if (char === "," && depth === 0) {
            if (current.trim()) selectors.push(current.trim());
            current = "";
            continue;
          }

          current += char;
        }

        if (current.trim()) selectors.push(current.trim());
        return selectors;
      }

      function isDatagridOwnedSelector(selector: string): boolean {
        return ownedMarkers.some((marker) => selector.includes(marker));
      }

      function containsUtilityMarker(selector: string): boolean {
        return utilityMarkers.some((marker) => selector.includes(marker));
      }

      const packageStyle = document.getElementById(
        "tdg-package-css"
      ) as HTMLStyleElement | null;
      const packageSheet = Array.from(document.styleSheets).find(
        (sheet) => sheet.ownerNode === packageStyle
      );

      if (!packageSheet) {
        return {
          leakedUtilitySelectors: ["missing package stylesheet"],
          globalThemeSelectors: [],
          sawDatagridOwnedRule: false,
        };
      }

      const leakedUtilitySelectors: string[] = [];
      const globalThemeSelectors: string[] = [];
      let sawDatagridOwnedRule = false;

      function visitRules(ruleList: CSSRuleList): void {
        for (const rule of Array.from(ruleList)) {
          if (rule instanceof CSSStyleRule) {
            const selectors = splitSelectorList(rule.selectorText);
            const unscopedSelectors = selectors.filter(
              (selector) => !isDatagridOwnedSelector(selector)
            );

            if (selectors.some(isDatagridOwnedSelector)) {
              sawDatagridOwnedRule = true;
            }

            for (const selector of unscopedSelectors) {
              if (containsUtilityMarker(selector)) {
                leakedUtilitySelectors.push(selector);
              }

              if (
                (selector === ":root" || selector === ":host") &&
                globalThemeVariablePattern.test(rule.cssText)
              ) {
                globalThemeSelectors.push(selector);
              }
            }
          }

          const nestedRules =
            "cssRules" in rule ? (rule as CSSGroupingRule).cssRules : null;
          if (nestedRules) {
            visitRules(nestedRules);
          }
        }
      }

      visitRules(packageSheet.cssRules);

      return {
        leakedUtilitySelectors,
        globalThemeSelectors,
        sawDatagridOwnedRule,
      };
    });

    expect(cssScan.leakedUtilitySelectors).toEqual([]);
    expect(cssScan.globalThemeSelectors).toEqual([]);
    expect(cssScan.sawDatagridOwnedRule).toBe(true);

    const hostStyles = await page.locator("#host-probe").evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        backgroundColor: style.backgroundColor,
        borderRadius: style.borderRadius,
        borderTopColor: style.borderTopColor,
        color: style.color,
      };
    });

    expect(hostStyles).toEqual({
      backgroundColor: "rgb(10, 20, 30)",
      borderRadius: "15px",
      borderTopColor: "rgb(80, 96, 116)",
      color: "rgb(240, 244, 248)",
    });

    const rootTokens = await page.evaluate(() => {
      const rootStyle = getComputedStyle(document.documentElement);
      return {
        fontSans: rootStyle.getPropertyValue("--font-sans").trim(),
        trackingTight: rootStyle.getPropertyValue("--tracking-tight").trim(),
      };
    });

    expect(rootTokens).toEqual({
      fontSans: '"Host Sans", sans-serif',
      trackingTight: "0em",
    });
  });
});
