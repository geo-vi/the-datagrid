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
  fs.mkdirSync(installedPackageDirectory, { recursive: true });
  fs.copyFileSync(
    path.join(repoRoot, "package.json"),
    path.join(installedPackageDirectory, "package.json")
  );
  fs.cpSync(
    path.join(repoRoot, "dist"),
    path.join(installedPackageDirectory, "dist"),
    { recursive: true }
  );

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

    console.log(`Published types resolved with ${configuration}.`);
  }
} finally {
  fs.rmSync(fixtureDirectory, { recursive: true, force: true });
}
