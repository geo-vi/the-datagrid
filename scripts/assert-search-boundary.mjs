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

// Core remains a single-file entry. Search has one intentional, one-way import
// of core so it can reuse the exact mobile component and engine without
// extracting a chunk that plain grid consumers would need to fetch.
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

const coreRelativeJsImports = collectRelativeJsImports(indexCode);
if (coreRelativeJsImports.size > 0) {
  console.error(
    `The core entry imports local JavaScript chunks:\n${Array.from(
      coreRelativeJsImports
    )
      .map((specifier) => `- ${specifier}`)
      .join("\n")}\nKeep plain grid consumers on a single JavaScript entry.`
  );
  process.exit(1);
}

const searchRelativeJsImports = collectRelativeJsImports(searchCode);
if (
  searchRelativeJsImports.size !== 1 ||
  !searchRelativeJsImports.has("./index.js")
) {
  console.error(
    `The optional search entry must depend only on ./index.js; found:\n${Array.from(
      searchRelativeJsImports
    )
      .map((specifier) => `- ${specifier}`)
      .join("\n")}`
  );
  process.exit(1);
}

const topLevelJavaScript = fs
  .readdirSync(distDir)
  .filter((fileName) => fileName.endsWith(".js"))
  .sort();
if (
  JSON.stringify(topLevelJavaScript) !==
  JSON.stringify(["column-visibility.js", "index.js", "search.js"])
) {
  console.error(
    `Unexpected JavaScript chunks in dist: ${topLevelJavaScript.join(", ")}`
  );
  process.exit(1);
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

const sharedCoreMarkers = ["rdg-search-query-highlight", "NFKD"];
for (const marker of sharedCoreMarkers) {
  if (!indexCode.includes(marker) || searchCode.includes(marker)) {
    console.error(
      `Shared search component/engine marker ${marker} must exist only in core.`
    );
    process.exit(1);
  }
}

console.log(
  "Optional search boundary verified: core stays single-file and search reuses it one-way."
);
