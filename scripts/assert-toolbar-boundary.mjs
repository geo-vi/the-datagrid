import fs from "node:fs";
import path from "node:path";

const distDirectory = path.resolve(process.cwd(), "dist");
const coreRuntimePath = path.join(distDirectory, "index.js");
const coreStylesheetPath = path.join(distDirectory, "index.css");
const runtimePath = path.join(distDirectory, "toolbar.js");
const stylesheetPath = path.join(distDirectory, "toolbar.css");
const declarationPath = path.join(distDirectory, "toolbar", "index.d.ts");
const requiredFiles = [
  coreRuntimePath,
  coreStylesheetPath,
  runtimePath,
  stylesheetPath,
  declarationPath,
];
const missingFiles = requiredFiles.filter(
  (filePath) => !fs.existsSync(filePath)
);

if (missingFiles.length > 0) {
  console.error(
    `Missing toolbar build output:\n${missingFiles
      .map((filePath) => `- ${path.relative(process.cwd(), filePath)}`)
      .join("\n")}`
  );
  process.exit(1);
}

const coreRuntime = fs.readFileSync(coreRuntimePath, "utf8");
const coreStylesheet = fs.readFileSync(coreStylesheetPath, "utf8");
const runtime = fs.readFileSync(runtimePath, "utf8");
const stylesheet = fs.readFileSync(stylesheetPath, "utf8");
const expectedPrefix = '"use client";\nimport "./toolbar.css";';

if (!runtime.startsWith(expectedPrefix)) {
  console.error(
    'The optional toolbar entry must preserve "use client" before importing ./toolbar.css.'
  );
  process.exit(1);
}

const relativeJavaScriptImportPatterns = [
  /\bimport\s+(?:[^"']+?\s+from\s+)?["'](\.\.?\/[^"']+\.js)["']/g,
  /\bexport\s+[^"']+?\s+from\s+["'](\.\.?\/[^"']+\.js)["']/g,
  /\bimport\(\s*["'](\.\.?\/[^"']+\.js)["']\s*\)/g,
];
const relativeJavaScriptImports = new Set();

for (const pattern of relativeJavaScriptImportPatterns) {
  for (const match of runtime.matchAll(pattern)) {
    if (match[1]) relativeJavaScriptImports.add(match[1]);
  }
}

if (
  relativeJavaScriptImports.size !== 1 ||
  !relativeJavaScriptImports.has("./index.js")
) {
  console.error(
    `The optional toolbar entry must depend only on ./index.js; found:\n${Array.from(
      relativeJavaScriptImports
    )
      .map((specifier) => `- ${specifier}`)
      .join("\n")}`
  );
  process.exit(1);
}

// XLSX support is an optional peer dependency an order of magnitude larger
// than this entry. It must stay external and dynamically imported, so consumers
// who never export a spreadsheet never download SheetJS.
const staticXlsxImport = /\bimport\s+(?:[^"']+?\s+from\s+)?["']xlsx["']/.test(
  runtime
);
const dynamicXlsxImport = /\bimport\(\s*["']xlsx["']\s*\)/.test(runtime);

if (staticXlsxImport) {
  console.error(
    'The optional toolbar entry must not import "xlsx" statically; the peer dependency has to stay lazy.'
  );
  process.exit(1);
}

if (!dynamicXlsxImport) {
  console.error(
    'The optional toolbar entry lost its dynamic import("xlsx"); XLSX export would no longer load its writer.'
  );
  process.exit(1);
}

// Markers that only occur inside SheetJS's own source, never in a call site
// here: its banner string and its codepage table. `book_append_sheet` and
// friends are deliberately absent from this list, since this entry calls them.
const bundledSheetJsMarkers = ["SheetJS", "cptable"];
const inlinedSheetJs = bundledSheetJsMarkers.filter((marker) =>
  runtime.includes(marker)
);
if (inlinedSheetJs.length > 0) {
  console.error(
    `SheetJS appears to be bundled into dist/toolbar.js: ${inlinedSheetJs.join(
      ", "
    )}`
  );
  process.exit(1);
}

const publicRuntimeExports = [
  "RDGToolbarProvider",
  "RDGToolbar",
  "RDGToolbarTarget",
  "RDGToolbarSurface",
  "RDGColumnToggleList",
  "RDGColumnsButton",
  "RDGExportButton",
  "RDGFilterToggleButton",
  "RDGClearFiltersButton",
];
const missingRuntimeExports = publicRuntimeExports.filter(
  (name) => !runtime.includes(name)
);
if (missingRuntimeExports.length > 0) {
  console.error(
    `The optional toolbar entry is missing runtime exports: ${missingRuntimeExports.join(
      ", "
    )}`
  );
  process.exit(1);
}

const leakedCoreExports = publicRuntimeExports.filter((name) =>
  coreRuntime.includes(name)
);
if (leakedCoreExports.length > 0) {
  console.error(
    `Optional toolbar exports leaked into dist/index.js: ${leakedCoreExports.join(
      ", "
    )}`
  );
  process.exit(1);
}

if (coreStylesheet.includes(".tdg-toolbar-root")) {
  console.error(
    "Optional toolbar styles leaked into dist/index.css."
  );
  process.exit(1);
}

if (
  !stylesheet.includes(".tdg-toolbar-root") ||
  stylesheet.includes(".tdg-root") ||
  stylesheet.includes(".tdg-search-root")
) {
  console.error(
    "The toolbar stylesheet is missing its scope or contains another entry's root selector."
  );
  process.exit(1);
}

const runtimeBytes = Buffer.byteLength(runtime);
const stylesheetBytes = Buffer.byteLength(stylesheet);
if (runtimeBytes > 96 * 1024 || stylesheetBytes > 48 * 1024) {
  console.error(
    `Toolbar optional bundle exceeded its boundary: ${runtimeBytes} B JS, ${stylesheetBytes} B CSS.`
  );
  process.exit(1);
}

console.log(
  `Optional toolbar boundary verified: ${runtimeBytes} B JS, ${stylesheetBytes} B CSS.`
);
