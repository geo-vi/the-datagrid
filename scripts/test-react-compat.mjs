import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDirectory, "..");
const fixtureSourceDirectory = path.join(repoRoot, "tests", "react-compat");
const isWindows = process.platform === "win32";
const npmCommand = isWindows ? "npm.cmd" : "npm";
const tscPath = require.resolve("typescript/bin/tsc");
// GNU tar (bundled with Git on Windows) misreads "C:\..." as a remote host and
// chokes on backslash paths; forward slashes are accepted by GNU tar, bsdtar,
// and npm's file: specifiers alike.
const toPosixPath = (value) => (isWindows ? value.replace(/\\/g, "/") : value);
const completeMatrix = [
  {
    react: "16.8.0",
    reactDom: "16.8.0",
    reactTypes: "16.8.25",
    reactDomTypes: "16.8.5",
  },
  {
    react: "17.0.0",
    reactDom: "17.0.0",
    reactTypes: "17.0.0",
    reactDomTypes: "17.0.0",
  },
  {
    react: "18.0.0",
    reactDom: "18.0.0",
    reactTypes: "18.0.0",
    reactDomTypes: "18.0.0",
  },
  {
    react: "19.0.0",
    reactDom: "19.0.0",
    reactTypes: "19.0.0",
    reactDomTypes: "19.0.0",
  },
];
const requestedVersions = new Set(
  (process.env.TDG_REACT_MATRIX ?? "")
    .split(",")
    .map((version) => version.trim())
    .filter(Boolean)
);
const matrix =
  requestedVersions.size === 0
    ? completeMatrix
    : completeMatrix.filter((version) => requestedVersions.has(version.react));

if (matrix.length === 0) {
  throw new Error(
    `TDG_REACT_MATRIX did not match a supported version: ${Array.from(
      requestedVersions
    ).join(", ")}`
  );
}

function run(command, args, options = {}) {
  const { quiet = false, ...spawnOptions } = options;
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: "pipe",
    ...spawnOptions,
  });

  if (!quiet && result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) {
    const failureDetail = result.error
      ? `: ${result.error.message}`
      : result.signal
        ? ` (signal ${result.signal})`
        : "";
    throw new Error(
      `${command} ${args.join(" ")} failed (exit ${result.status ?? 1})${failureDetail}.`
    );
  }

  return result;
}

// Node's post-CVE-2024-27980 hardening refuses to spawn .cmd/.bat files (npm.cmd)
// without `shell: true`. Under a shell, arguments are not auto-quoted, so quote
// any that contain whitespace ourselves.
function runNpm(args, options = {}) {
  const finalArgs = isWindows
    ? args.map((arg) => (/\s/.test(arg) ? `"${arg}"` : arg))
    : args;
  return run(npmCommand, finalArgs, { ...options, shell: isWindows });
}

function copyFixtureFiles(targetDirectory) {
  for (const filename of [
    "consumer.tsx",
    "css-loader.mjs",
    "runtime.mjs",
    "tsconfig.json",
  ]) {
    fs.copyFileSync(
      path.join(fixtureSourceDirectory, filename),
      path.join(targetDirectory, filename)
    );
  }
}

function walkJavaScriptFiles(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkJavaScriptFiles(entryPath));
    } else if (entry.name.endsWith(".js")) {
      files.push(entryPath);
    }
  }
  return files;
}

if (!fs.existsSync(path.join(repoRoot, "dist", "index.js"))) {
  throw new Error("Missing dist/index.js. Build the packed library first.");
}

const temporaryParent = path.join(repoRoot, ".tmp");
fs.mkdirSync(temporaryParent, { recursive: true });
const temporaryRoot = fs.mkdtempSync(
  path.join(temporaryParent, "react-compat-")
);

try {
  const packResult = runNpm(
    ["pack", "--ignore-scripts", "--json", "--pack-destination", temporaryRoot],
    { cwd: repoRoot, quiet: true }
  );
  const packEntries = JSON.parse(packResult.stdout);
  const archiveFilename = packEntries?.[0]?.filename;
  if (typeof archiveFilename !== "string") {
    throw new Error("npm pack did not report a package archive.");
  }

  const archivePath = path.join(temporaryRoot, archiveFilename);
  const inspectionDirectory = path.join(temporaryRoot, "packed");
  fs.mkdirSync(inspectionDirectory);
  run(
    "tar",
    [
      "-xzf",
      path.basename(archiveFilename),
      "-C",
      toPosixPath(inspectionDirectory),
    ],
    {
      cwd: temporaryRoot,
    }
  );

  const packedPackageDirectory = path.join(inspectionDirectory, "package");
  const packedManifest = JSON.parse(
    fs.readFileSync(path.join(packedPackageDirectory, "package.json"), "utf8")
  );
  if (!packedManifest.dependencies?.["use-sync-external-store"]) {
    throw new Error(
      "The packed package must declare use-sync-external-store for React 16/17."
    );
  }

  const jsxRuntimeImports = walkJavaScriptFiles(
    path.join(packedPackageDirectory, "dist")
  ).filter((filename) => {
    const source = fs.readFileSync(filename, "utf8");
    return (
      source.includes("react/jsx-runtime") ||
      source.includes("react/jsx-dev-runtime")
    );
  });
  if (jsxRuntimeImports.length > 0) {
    throw new Error(
      `React 16.8 cannot load packed files that import a React JSX runtime:\n${jsxRuntimeImports
        .map((filename) => path.relative(packedPackageDirectory, filename))
        .join("\n")}`
    );
  }

  const coreBundleSource = fs.readFileSync(
    path.join(packedPackageDirectory, "dist", "index.js"),
    "utf8"
  );
  for (const optionalExport of ["useInsertionEffect", "use"]) {
    if (
      !new RegExp(`\\b${optionalExport}:\\s*[A-Za-z_$]`).test(coreBundleSource)
    ) {
      throw new Error(
        `The React facade must expose optional ${optionalExport} when the host React runtime provides it.`
      );
    }
  }

  for (const version of matrix) {
    const fixtureDirectory = path.join(
      temporaryRoot,
      `react-${version.react.replaceAll(".", "-")}`
    );
    fs.mkdirSync(fixtureDirectory);
    copyFixtureFiles(fixtureDirectory);
    fs.writeFileSync(
      path.join(fixtureDirectory, "package.json"),
      `${JSON.stringify(
        {
          name: `the-datagrid-react-${version.react}-consumer`,
          private: true,
          type: "module",
          dependencies: {
            "@geovi/the-datagrid": `file:${toPosixPath(archivePath)}`,
            jsdom: "26.1.0",
            // jsdom permits newer nwsapi releases, but 2.2.27 recurses while
            // Radix probes :modal/:fullscreen in this fixture. Pin the version
            // jsdom 26.1.0 shipped against so the matrix tests React behavior.
            nwsapi: "2.2.16",
            react: version.react,
            "react-dom": version.reactDom,
          },
          devDependencies: {
            "@types/react": version.reactTypes,
            "@types/react-dom": version.reactDomTypes,
            "@types/scheduler": "0.16.8",
          },
        },
        null,
        2
      )}\n`
    );

    console.log(`\nTesting packed package with React ${version.react}...`);
    runNpm(
      [
        "install",
        "--ignore-scripts",
        "--strict-peer-deps",
        "--no-audit",
        "--no-fund",
      ],
      { cwd: fixtureDirectory }
    );
    run(
      process.execPath,
      [tscPath, "-p", path.join(fixtureDirectory, "tsconfig.json"), "--noEmit"],
      { cwd: fixtureDirectory }
    );
    run(
      process.execPath,
      [
        "--no-warnings",
        // Node parses the --loader value as a URL; on Windows a bare "C:\..."
        // path is read as an unsupported "c:" scheme, so pass a file:// URL.
        "--loader",
        pathToFileURL(path.join(fixtureDirectory, "css-loader.mjs")).href,
        path.join(fixtureDirectory, "runtime.mjs"),
      ],
      {
        cwd: fixtureDirectory,
        env: { ...process.env, TDG_REACT_VERSION: version.react },
        timeout: 30_000,
      }
    );
  }

  console.log(
    `\nPacked React compatibility matrix passed (${matrix
      .map((version) => version.react)
      .join(", ")}).`
  );
} finally {
  if (!process.env.KEEP_REACT_COMPAT_FIXTURES) {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  } else {
    console.log(`Kept compatibility fixtures at ${temporaryRoot}`);
  }
}
