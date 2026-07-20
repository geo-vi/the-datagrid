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
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

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
    ["pack", "--json", "--pack-destination", fixtureDirectory],
    { cwd: repoRoot, encoding: "utf8" }
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

  const archivePath = path.join(fixtureDirectory, archiveFilename);
  fs.mkdirSync(installedPackageDirectory, { recursive: true });
  const extractResult = spawnSync(
    "tar",
    [
      "-xzf",
      archivePath,
      "-C",
      installedPackageDirectory,
      "--strip-components=1",
    ],
    { encoding: "utf8" }
  );

  if (extractResult.stdout) process.stdout.write(extractResult.stdout);
  if (extractResult.stderr) process.stderr.write(extractResult.stderr);
  if (extractResult.status !== 0) {
    throw new Error(
      `Could not extract the packed package (exit ${extractResult.status ?? 1}).`
    );
  }

  for (const relativePath of [
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
      `Packed root, search, column-visibility, components, and TextInput types resolved with ${configuration}.`
    );
  }
} finally {
  fs.rmSync(fixtureDirectory, { recursive: true, force: true });
}
