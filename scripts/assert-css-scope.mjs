import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import postcss from "postcss";

const cssPath = path.resolve(process.cwd(), "dist/index.css");
const datagridOwnedMarkers = [
  ".tdg-",
  ".InovuaReactDataGrid",
  ".inovua-react-toolkit",
];

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

if (!fs.existsSync(cssPath)) {
  console.error(
    `Missing CSS bundle at ${cssPath}. Run the library build first.`
  );
  process.exit(1);
}

const css = fs.readFileSync(cssPath, "utf8");
const failures = [];

if (/:root\s*,\s*:host/.test(css)) {
  failures.push(
    "dist/index.css still contains a global :root, :host theme rule."
  );
}

const root = postcss.parse(css);

root.walkRules((rule) => {
  const containsDatagridTokens = rule.toString().includes("--tdg-");
  if (!containsDatagridTokens) return;

  const leakedSelectors = splitSelectorList(rule.selector).filter(
    (selector) => !isDatagridOwnedSelector(selector)
  );

  if (leakedSelectors.length > 0) {
    failures.push(
      `Datagrid tokens are used by unscoped selector(s): ${leakedSelectors.join(
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
