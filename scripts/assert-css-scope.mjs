import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import postcss from "postcss";

const cssPaths = [
  path.resolve(process.cwd(), "dist/index.css"),
  path.resolve(process.cwd(), "dist/search.css"),
];
const datagridOwnedMarkers = [
  ".tdg-",
  ".InovuaReactDataGrid",
  ".inovua-react-toolkit",
];
const shadcnCollisionUtilityMarkers = [
  ".bg-background",
  ".bg-background\\/",
  ".bg-card",
  ".bg-popover",
  ".bg-primary",
  ".border-border",
  ".border-border\\/",
  ".border-input",
  ".rounded-md",
  ".rounded-lg",
  ".rounded-sm",
  ".text-foreground",
  ".text-muted-foreground",
  ".text-primary",
  ".text-primary-foreground",
];
const globalThemeVariablePattern =
  /--(?:tdg-|font-sans|tracking-tight|color-[a-z0-9-]+|radius-[a-z0-9-]+)/i;

function splitSelectorList(selector) {
  const selectors = [];
  let current = "";
  let depth = 0;
  let quote = null;
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

function isDatagridOwnedSelector(selector) {
  return datagridOwnedMarkers.some((marker) => selector.includes(marker));
}

function isRootOrHostSelector(selector) {
  return selector === ":root" || selector === ":host";
}

function containsShadcnCollisionUtility(selector) {
  return shadcnCollisionUtilityMarkers.some((marker) =>
    selector.includes(marker)
  );
}

const missingCssPaths = cssPaths.filter((cssPath) => !fs.existsSync(cssPath));
if (missingCssPaths.length > 0) {
  console.error(
    `Missing CSS bundle(s): ${missingCssPaths.join(", ")}. Run the library build first.`
  );
  process.exit(1);
}

const css = cssPaths
  .map((cssPath) => fs.readFileSync(cssPath, "utf8"))
  .join("\n");
const failures = [];

const root = postcss.parse(css);

root.walkRules((rule) => {
  const selectors = splitSelectorList(rule.selector);
  if (selectors.length === 0) return;

  const globalThemeSelectors = selectors.filter(isRootOrHostSelector);
  if (
    globalThemeSelectors.length > 0 &&
    globalThemeVariablePattern.test(rule.toString())
  ) {
    failures.push(
      `Global theme variables are emitted by selector(s): ${globalThemeSelectors.join(
        ", "
      )}`
    );
  }

  const containsDatagridTokens = rule.toString().includes("--tdg-");
  const unscopedSelectors = selectors.filter(
    (selector) => !isDatagridOwnedSelector(selector)
  );

  if (containsDatagridTokens && unscopedSelectors.length > 0) {
    failures.push(
      `Datagrid tokens are used by unscoped selector(s): ${unscopedSelectors.join(
        ", "
      )}`
    );
  }

  const leakedUtilitySelectors = unscopedSelectors.filter(
    containsShadcnCollisionUtility
  );
  if (leakedUtilitySelectors.length > 0) {
    failures.push(
      `Shadcn/Tailwind utility selector(s) are emitted globally: ${leakedUtilitySelectors.join(
        ", "
      )}`
    );
  }
});

if (failures.length > 0) {
  console.error("CSS scope validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("CSS scope validation passed.");
