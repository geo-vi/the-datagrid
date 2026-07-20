import fs from "node:fs";
import path from "node:path";

const distDirectory = path.resolve(process.cwd(), "dist");
const coreRuntimePath = path.join(distDirectory, "index.js");
const coreStylesheetPath = path.join(distDirectory, "index.css");
const runtimePath = path.join(distDirectory, "column-visibility.js");
const stylesheetPath = path.join(distDirectory, "column-visibility.css");
const declarationPath = path.join(
  distDirectory,
  "column-visibility",
  "index.d.ts"
);
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
    `Missing column-visibility build output:\n${missingFiles
      .map((filePath) => `- ${path.relative(process.cwd(), filePath)}`)
      .join("\n")}`
  );
  process.exit(1);
}

const coreRuntime = fs.readFileSync(coreRuntimePath, "utf8");
const coreStylesheet = fs.readFileSync(coreStylesheetPath, "utf8");
const runtime = fs.readFileSync(runtimePath, "utf8");
const stylesheet = fs.readFileSync(stylesheetPath, "utf8");
const expectedPrefix = '"use client";\nimport "./column-visibility.css";';

if (!runtime.startsWith(expectedPrefix)) {
  console.error(
    'The optional column-visibility entry must preserve "use client" before importing ./column-visibility.css.'
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
    `The optional column-visibility entry must depend only on ./index.js; found:\n${Array.from(
      relativeJavaScriptImports
    )
      .map((specifier) => `- ${specifier}`)
      .join("\n")}`
  );
  process.exit(1);
}

const publicRuntimeExports = [
  "RDGColumnVisibilityProvider",
  "RDGColumnVisibilityToolbar",
  "RDGColumnVisibilityTarget",
];
const missingRuntimeExports = publicRuntimeExports.filter(
  (name) => !runtime.includes(name)
);
if (missingRuntimeExports.length > 0) {
  console.error(
    `The optional column-visibility entry is missing runtime exports: ${missingRuntimeExports.join(
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
    `Optional column-visibility exports leaked into dist/index.js: ${leakedCoreExports.join(
      ", "
    )}`
  );
  process.exit(1);
}

if (coreStylesheet.includes(".tdg-column-visibility-root")) {
  console.error(
    "Optional column-visibility styles leaked into dist/index.css."
  );
  process.exit(1);
}

if (
  !stylesheet.includes(".tdg-column-visibility-root") ||
  stylesheet.includes(".tdg-root") ||
  stylesheet.includes(".tdg-search-root")
) {
  console.error(
    "The column-visibility stylesheet is missing its scope or contains another entry's root selector."
  );
  process.exit(1);
}

const runtimeBytes = Buffer.byteLength(runtime);
const stylesheetBytes = Buffer.byteLength(stylesheet);
if (runtimeBytes > 96 * 1024 || stylesheetBytes > 48 * 1024) {
  console.error(
    `Column-visibility optional bundle exceeded its boundary: ${runtimeBytes} B JS, ${stylesheetBytes} B CSS.`
  );
  process.exit(1);
}

console.log(
  `Optional column-visibility boundary verified: ${runtimeBytes} B JS, ${stylesheetBytes} B CSS.`
);
