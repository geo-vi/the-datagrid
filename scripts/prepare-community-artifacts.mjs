import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDirectory, "..");
const distDirectory = path.join(repoRoot, "dist");
const sourceCss = path.join(distDirectory, "index.css");

if (!fs.existsSync(sourceCss)) {
  throw new Error("Missing dist/index.css. Build the core library first.");
}

const stylesheetAliases = [
  "base.css",
  ...[
    "amber-dark",
    "amber-light",
    "blue-dark",
    "blue-light",
    "default-dark",
    "default-light",
    "green-dark",
    "green-light",
    "pink-dark",
    "pink-light",
  ].map((theme) => `style/theme/${theme}/index.css`),
];

for (const relativePath of stylesheetAliases) {
  const target = path.join(distDirectory, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(sourceCss, target);
}

const manifest = {
  schemaVersion: 1,
  upstream: {
    package: "@inovua/reactdatagrid-community",
    version: "5.10.2",
  },
  moduleSystems: ["esm", "commonjs"],
  editors: [
    "BoolEditor",
    "DateEditor",
    "NumericEditor",
    "SelectEditor",
    "TextEditor",
  ],
  filters: [
    "StringFilter",
    "BoolFilter",
    "DateFilter",
    "NumberFilter",
    "SelectFilter",
  ],
  themes: [
    "amber-dark",
    "amber-light",
    "blue-dark",
    "blue-light",
    "default-dark",
    "default-light",
    "green-dark",
    "green-light",
    "pink-dark",
    "pink-light",
  ],
};

fs.writeFileSync(
  path.join(distDirectory, "community-package-manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`
);

fs.copyFileSync(
  path.join(repoRoot, "community-api-manifest.json"),
  path.join(distDirectory, "community-api-manifest.json")
);
