import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const distDirectory = path.resolve(
  process.cwd(),
  "dist",
  "packages",
  "TextInput"
);
const runtimePath = path.join(distDirectory, "index.js");
const stylesheetPath = path.join(distDirectory, "style.css");
const declarationPath = path.join(distDirectory, "index.d.ts");
const requiredFiles = [runtimePath, stylesheetPath, declarationPath];
const missingFiles = requiredFiles.filter(
  (filePath) => !fs.existsSync(filePath)
);

if (missingFiles.length > 0) {
  console.error(
    `Missing TextInput build output:\n${missingFiles
      .map((filePath) => `- ${path.relative(process.cwd(), filePath)}`)
      .join("\n")}`
  );
  process.exit(1);
}

const runtime = fs.readFileSync(runtimePath, "utf8");
const stylesheet = fs.readFileSync(stylesheetPath, "utf8");
const expectedPrefix = '"use client";\nimport "./style.css";';

if (!runtime.startsWith(expectedPrefix)) {
  console.error(
    'The standalone TextInput entry must preserve "use client" before importing ./style.css.'
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

if (relativeJavaScriptImports.size > 0) {
  console.error(
    `The standalone TextInput entry imports local JavaScript chunks:\n${Array.from(
      relativeJavaScriptImports
    )
      .map((specifier) => `- ${specifier}`)
      .join("\n")}`
  );
  process.exit(1);
}

const staticImportPatterns = [
  /\bimport\s+["']([^"']+)["']/g,
  /\bimport\s+[^;]+?\s+from\s+["']([^"']+)["']/g,
];
const staticImports = new Set();
for (const pattern of staticImportPatterns) {
  for (const match of runtime.matchAll(pattern)) {
    if (match[1]) staticImports.add(match[1]);
  }
}

const allowedImports = new Set(["./style.css", "react", "react/jsx-runtime"]);
const unexpectedImports = Array.from(staticImports).filter(
  (specifier) => !allowedImports.has(specifier)
);
if (unexpectedImports.length > 0) {
  console.error(
    `The standalone TextInput entry has unexpected runtime imports:\n${unexpectedImports
      .map((specifier) => `- ${specifier}`)
      .join("\n")}`
  );
  process.exit(1);
}

if (runtime.includes("../../index.js") || runtime.includes("ReactDataGrid")) {
  console.error("The standalone TextInput entry leaked the core grid runtime.");
  process.exit(1);
}

const runtimeBytes = Buffer.byteLength(runtime);
const stylesheetBytes = Buffer.byteLength(stylesheet);
if (runtimeBytes > 64 * 1024 || stylesheetBytes > 16 * 1024) {
  console.error(
    `TextInput standalone bundle exceeded its boundary: ${runtimeBytes} B JS, ${stylesheetBytes} B CSS.`
  );
  process.exit(1);
}

if (
  !runtime.includes("inovua-react-toolkit-text-input") ||
  !stylesheet.includes(".tdg-text-input")
) {
  console.error("The TextInput runtime or standalone styles are incomplete.");
  process.exit(1);
}

if (stylesheet.includes(".tdg-root")) {
  console.error("Core grid selectors leaked into the TextInput stylesheet.");
  process.exit(1);
}

console.log(
  `Standalone TextInput boundary verified: ${runtimeBytes} B JS, ${stylesheetBytes} B CSS.`
);
