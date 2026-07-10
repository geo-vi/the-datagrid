import fs from "node:fs";
import path from "node:path";

const distDir = path.resolve(process.cwd(), "dist");
const indexJsPath = path.join(distDir, "index.js");
const searchJsPath = path.join(distDir, "search.js");
const indexCssPath = path.join(distDir, "index.css");
const searchCssPath = path.join(distDir, "search.css");

const requiredFiles = [indexJsPath, searchJsPath, indexCssPath, searchCssPath];

const missingFiles = requiredFiles.filter(
  (filePath) => !fs.existsSync(filePath)
);

if (missingFiles.length > 0) {
  console.error(
    `Missing optional-entry build output:\n${missingFiles
      .map((filePath) => `- ${path.relative(process.cwd(), filePath)}`)
      .join("\n")}`
  );
  process.exit(1);
}

const indexCode = fs.readFileSync(indexJsPath, "utf8");
const searchCode = fs.readFileSync(searchJsPath, "utf8");
const indexCss = fs.readFileSync(indexCssPath, "utf8");
const searchCss = fs.readFileSync(searchCssPath, "utf8");

for (const [entryName, code, cssFileName] of [
  ["core", indexCode, "index.css"],
  ["search", searchCode, "search.css"],
]) {
  const expectedPrefix = `"use client";\nimport "./${cssFileName}";`;
  if (!code.startsWith(expectedPrefix)) {
    console.error(
      `The ${entryName} entry must preserve \"use client\" before its CSS import.`
    );
    process.exit(1);
  }
}

// CSS is intentionally loaded by the core entry. Any relative JavaScript
// dependency means Rollup extracted code shared with the optional search
// entry, adding a request to consumers that only import the grid.
const relativeJsImportPatterns = [
  /\bimport\s+(?:[^"']+?\s+from\s+)?["'](\.\.?\/[^"']+\.js)["']/g,
  /\bexport\s+[^"']+?\s+from\s+["'](\.\.?\/[^"']+\.js)["']/g,
  /\bimport\(\s*["'](\.\.?\/[^"']+\.js)["']\s*\)/g,
];

function collectRelativeJsImports(code) {
  const imports = new Set();

  for (const pattern of relativeJsImportPatterns) {
    pattern.lastIndex = 0;
    for (const match of code.matchAll(pattern)) {
      if (match[1]) imports.add(match[1]);
    }
  }

  return imports;
}

for (const [entryName, code] of [
  ["core", indexCode],
  ["search", searchCode],
]) {
  const relativeJsImports = collectRelativeJsImports(code);
  if (relativeJsImports.size > 0) {
    console.error(
      `The ${entryName} entry imports local JavaScript chunks:\n${Array.from(
        relativeJsImports
      )
        .map((specifier) => `- ${specifier}`)
        .join(
          "\n"
        )}\nKeep the optional search graph disjoint from the core graph.`
    );
    process.exit(1);
  }
}

if (indexCss.includes(".tdg-search-root")) {
  console.error("Optional search styles leaked into dist/index.css.");
  process.exit(1);
}

if (searchCss.includes(".tdg-root")) {
  console.error("Core grid scope selectors leaked into dist/search.css.");
  process.exit(1);
}

const optionalRuntimeExports = [
  "RDGSearchBar",
  "RDGSearchProvider",
  "RDGSearchTarget",
];
const leakedRuntimeExports = optionalRuntimeExports.filter((name) =>
  indexCode.includes(name)
);

if (leakedRuntimeExports.length > 0) {
  console.error(
    `Optional search runtime leaked into dist/index.js: ${leakedRuntimeExports.join(
      ", "
    )}`
  );
  process.exit(1);
}

console.log(
  "Optional search boundary verified: core and search entries are independently loadable."
);
