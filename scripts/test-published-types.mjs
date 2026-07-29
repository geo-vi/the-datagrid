import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDirectory, "..");
const sourceDirectory = path.join(repoRoot, "tests", "published-types");
const isWindows = process.platform === "win32";
const npmCommand = isWindows ? "npm.cmd" : "npm";
// Node's post-CVE-2024-27980 hardening refuses to spawn .cmd/.bat files
// unless `shell: true`, so npm.cmd must run through the shell on Windows.
// With a shell, arguments are not auto-quoted, so quote paths that may
// contain spaces ourselves.
const npmSpawnOptions = isWindows ? { shell: true } : {};
const shellQuote = (value) => (isWindows ? `"${value}"` : value);

if (!fs.existsSync(path.join(repoRoot, "dist", "main.d.ts"))) {
  console.error("Missing dist declarations. Run the library build first.");
  process.exit(1);
}

const fixtureParentDirectory = path.join(repoRoot, ".tmp");
fs.mkdirSync(fixtureParentDirectory, { recursive: true });
const fixtureDirectory = fs.mkdtempSync(
  path.join(fixtureParentDirectory, "published-types-")
);
const installedPackageDirectory = path.join(
  fixtureDirectory,
  "node_modules",
  "@geovi",
  "the-datagrid"
);
const tscPath = require.resolve("typescript/bin/tsc");
const configurations = ["tsconfig.json", "tsconfig.node10.json"];

try {
  const packResult = spawnSync(
    npmCommand,
    ["pack", "--json", "--pack-destination", shellQuote(fixtureDirectory)],
    { cwd: repoRoot, encoding: "utf8", ...npmSpawnOptions }
  );

  if (packResult.stderr) process.stderr.write(packResult.stderr);
  if (packResult.status !== 0) {
    if (packResult.stdout) process.stdout.write(packResult.stdout);
    throw new Error(`npm pack failed (exit ${packResult.status ?? 1}).`);
  }

  let packEntries;
  try {
    packEntries = JSON.parse(packResult.stdout);
  } catch (error) {
    throw new Error("Could not parse npm pack output.", { cause: error });
  }

  const archiveFilename = packEntries?.[0]?.filename;
  if (typeof archiveFilename !== "string") {
    throw new Error("npm pack did not report a package archive.");
  }

  fs.mkdirSync(installedPackageDirectory, { recursive: true });
  // GNU tar (shipped with Git on Windows) misreads a drive-letter path like
  // "C:\..." as a remote host, and also chokes on backslash paths passed to
  // -C. Run tar from the archive's directory with a relative archive name and
  // a forward-slash destination, which both GNU tar and bsdtar accept.
  const toTarPath = (p) => (isWindows ? p.replace(/\\/g, "/") : p);
  const extractResult = spawnSync(
    "tar",
    [
      "-xzf",
      path.basename(archiveFilename),
      "-C",
      toTarPath(installedPackageDirectory),
      "--strip-components=1",
    ],
    { cwd: fixtureDirectory, encoding: "utf8" }
  );

  if (extractResult.stdout) process.stdout.write(extractResult.stdout);
  if (extractResult.stderr) process.stderr.write(extractResult.stderr);
  if (extractResult.status !== 0) {
    throw new Error(
      `Could not extract the packed package (exit ${extractResult.status ?? 1}).`
    );
  }

  for (const relativePath of [
    "LICENSE",
    "THIRD_PARTY_NOTICES.md",
    "dist/index.js",
    "dist/index.cjs",
    "dist/index.css",
    "dist/base.css",
    "dist/BoolEditor.js",
    "dist/BoolEditor.cjs",
    "dist/editors/BoolEditor.d.ts",
    "dist/DateEditor.js",
    "dist/DateEditor.cjs",
    "dist/NumericEditor.js",
    "dist/NumericEditor.cjs",
    "dist/StringFilter.js",
    "dist/StringFilter.cjs",
    "dist/BoolFilter.js",
    "dist/BoolFilter.cjs",
    "dist/DateFilter.js",
    "dist/DateFilter.cjs",
    "dist/NumberFilter.js",
    "dist/NumberFilter.cjs",
    "dist/SelectFilter.js",
    "dist/SelectFilter.cjs",
    "dist/types/index.js",
    "dist/types/index.cjs",
    "dist/types/index.d.ts",
    "dist/community-api-manifest.json",
    "dist/style/theme/amber-dark/index.css",
    "dist/style/theme/amber-light/index.css",
    "dist/style/theme/blue-dark/index.css",
    "dist/style/theme/blue-light/index.css",
    "dist/style/theme/default-light/index.css",
    "dist/style/theme/default-dark/index.css",
    "dist/style/theme/green-dark/index.css",
    "dist/style/theme/green-light/index.css",
    "dist/style/theme/pink-dark/index.css",
    "dist/style/theme/pink-light/index.css",
    "dist/column-visibility.js",
    "dist/column-visibility.css",
    "dist/column-visibility/index.d.ts",
    "dist/components.js",
    "dist/providers/index.d.ts",
    "dist/packages/TextInput/index.js",
    "dist/packages/TextInput/index.d.ts",
    "dist/packages/TextInput/style.css",
  ]) {
    const publishedPath = path.join(installedPackageDirectory, relativePath);
    if (!fs.existsSync(publishedPath)) {
      throw new Error(`Packed package is missing ${relativePath}.`);
    }
  }

  const commonJsProbe = spawnSync(
    process.execPath,
    [
      "-e",
      [
        'const grid = require("@geovi/the-datagrid");',
        'const BoolEditor = require("@geovi/the-datagrid/BoolEditor");',
        'const StringFilter = require("@geovi/the-datagrid/StringFilter");',
        "const defaultExport = (value) => value.default ?? value;",
        'if (typeof grid.default !== "function") throw new Error("missing CJS grid");',
        'if (typeof defaultExport(BoolEditor) !== "function") throw new Error("missing CJS BoolEditor");',
        'if (typeof defaultExport(StringFilter) !== "function") throw new Error("missing CJS StringFilter");',
      ].join("\n"),
    ],
    { cwd: fixtureDirectory, encoding: "utf8" }
  );
  if (commonJsProbe.stdout) process.stdout.write(commonJsProbe.stdout);
  if (commonJsProbe.stderr) process.stderr.write(commonJsProbe.stderr);
  if (commonJsProbe.status !== 0) {
    throw new Error(
      `Packed CommonJS runtime failed (exit ${commonJsProbe.status ?? 1}).`
    );
  }

  const esmProbe = spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      [
        'import BoolEditor from "@geovi/the-datagrid/BoolEditor";',
        'import StringFilter from "@geovi/the-datagrid/StringFilter";',
        'import DateFilter from "@geovi/the-datagrid/DateFilter";',
        'if (typeof BoolEditor !== "function") throw new Error("missing ESM BoolEditor");',
        'if (typeof StringFilter !== "function") throw new Error("missing ESM StringFilter");',
        'if (typeof DateFilter !== "function") throw new Error("missing ESM DateFilter");',
      ].join("\n"),
    ],
    { cwd: fixtureDirectory, encoding: "utf8" }
  );
  if (esmProbe.stdout) process.stdout.write(esmProbe.stdout);
  if (esmProbe.stderr) process.stderr.write(esmProbe.stderr);
  if (esmProbe.status !== 0) {
    throw new Error(
      `Packed ESM runtime failed (exit ${esmProbe.status ?? 1}).`
    );
  }

  console.log("Packed CommonJS and ESM runtime entrypoints loaded.");

  fs.writeFileSync(
    path.join(fixtureDirectory, "package.json"),
    `${JSON.stringify(
      {
        name: "the-datagrid-published-types-consumer",
        private: true,
        type: "module",
      },
      null,
      2
    )}\n`
  );
  fs.copyFileSync(
    path.join(sourceDirectory, "consumer.ts"),
    path.join(fixtureDirectory, "consumer.ts")
  );

  for (const configuration of configurations) {
    fs.copyFileSync(
      path.join(sourceDirectory, configuration),
      path.join(fixtureDirectory, configuration)
    );

    const result = spawnSync(
      process.execPath,
      [tscPath, "-p", path.join(fixtureDirectory, configuration), "--noEmit"],
      { cwd: fixtureDirectory, encoding: "utf8" }
    );

    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    if (result.status !== 0) {
      throw new Error(
        `Published type resolution failed with ${configuration} (exit ${
          result.status ?? 1
        }).`
      );
    }

    console.log(
      `Packed root, Community editors/filters/types, search, column-visibility, components, and TextInput types resolved with ${configuration}.`
    );
  }
} finally {
  fs.rmSync(fixtureDirectory, { recursive: true, force: true });
}
