import fs from "node:fs";
import path from "node:path";

const distDirectory = path.resolve(process.cwd(), "dist");
const runtimePath = path.join(distDirectory, "components.js");
const unexpectedStylesheetPath = path.join(distDirectory, "components.css");
const declarationPath = path.join(distDirectory, "providers", "index.d.ts");
const coreRuntimePath = path.join(distDirectory, "index.js");
const searchRuntimePath = path.join(distDirectory, "search.js");
const toolbarRuntimePath = path.join(distDirectory, "toolbar.js");
const requiredFiles = [
  runtimePath,
  declarationPath,
  coreRuntimePath,
  searchRuntimePath,
  toolbarRuntimePath,
];
const missingFiles = requiredFiles.filter(
  (filePath) => !fs.existsSync(filePath)
);

if (missingFiles.length > 0) {
  console.error(
    `Missing components build output:\n${missingFiles
      .map((filePath) => `- ${path.relative(process.cwd(), filePath)}`)
      .join("\n")}`
  );
  process.exit(1);
}

const runtime = fs.readFileSync(runtimePath, "utf8");
const coreRuntime = fs.readFileSync(coreRuntimePath, "utf8");
const searchRuntime = fs.readFileSync(searchRuntimePath, "utf8");
const toolbarRuntime = fs.readFileSync(toolbarRuntimePath, "utf8");
const expectedPrefix = '"use client";\n';

if (!runtime.startsWith(expectedPrefix)) {
  console.error(
    'The optional components entry must preserve its leading "use client" directive.'
  );
  process.exit(1);
}

if (fs.existsSync(unexpectedStylesheetPath)) {
  console.error(
    "The components entry must reuse search.css and toolbar.css through their existing JavaScript entries, not emit duplicate components.css rules."
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

const expectedRuntimeImports = new Set(["./toolbar.js", "./search.js"]);
if (
  relativeJavaScriptImports.size !== expectedRuntimeImports.size ||
  Array.from(expectedRuntimeImports).some(
    (specifier) => !relativeJavaScriptImports.has(specifier)
  )
) {
  console.error(
    `The optional components entry must compose only the existing search and toolbar entries; found:\n${Array.from(
      relativeJavaScriptImports
    )
      .map((specifier) => `- ${specifier}`)
      .join("\n")}`
  );
  process.exit(1);
}

const publicRuntimeExports = [
  "RDGProvider",
  "RDGTarget",
  "RDGSearchBar",
  "RDGSearchProvider",
  "RDGSearchTarget",
  "RDGToolbar",
  "RDGToolbarProvider",
  "RDGToolbarTarget",
];
const missingRuntimeExports = publicRuntimeExports.filter(
  (name) => !runtime.includes(name)
);
if (missingRuntimeExports.length > 0) {
  console.error(
    `The optional components entry is missing runtime exports: ${missingRuntimeExports.join(
      ", "
    )}`
  );
  process.exit(1);
}

for (const [entryName, entryRuntime] of [
  ["core", coreRuntime],
  ["search", searchRuntime],
  ["toolbar", toolbarRuntime],
]) {
  const leakedUnifiedExports = ["RDGProvider", "RDGTarget"].filter((name) =>
    entryRuntime.includes(name)
  );
  if (leakedUnifiedExports.length > 0) {
    console.error(
      `Unified components exports leaked into the ${entryName} entry: ${leakedUnifiedExports.join(
        ", "
      )}`
    );
    process.exit(1);
  }
}

const runtimeBytes = Buffer.byteLength(runtime);
if (runtimeBytes > 48 * 1024) {
  console.error(
    `Components optional bundle exceeded its boundary: ${runtimeBytes} B JS.`
  );
  process.exit(1);
}

console.log(
  `Optional components boundary verified: ${runtimeBytes} B JS with shared optional styles.`
);
