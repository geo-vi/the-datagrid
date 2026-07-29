import { execFile } from "node:child_process";
import { chmod, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { exampleCatalog } from "../examples/src/exampleCatalog";
import {
  buildGlobalSearchDocuments,
  type SearchDocument,
} from "../examples/src/search/searchDocuments";

const execFileAsync = promisify(execFile);
const DOCFIND_VERSION = "v0.5.1";

const platformAssetMap = {
  darwin: {
    arm64: "docfind-aarch64-apple-darwin.tar.gz",
    x64: "docfind-x86_64-apple-darwin.tar.gz",
  },
  linux: {
    arm64: "docfind-aarch64-unknown-linux-musl.tar.gz",
    x64: "docfind-x86_64-unknown-linux-musl.tar.gz",
  },
  win32: {
    x64: "docfind-x86_64-pc-windows-msvc.zip",
  },
} as const;

function getRepoRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
}

function getDocfindAssetName() {
  const platformAssets =
    platformAssetMap[os.platform() as keyof typeof platformAssetMap];

  if (!platformAssets) {
    throw new Error(
      `Docfind is not configured for platform ${os.platform()}. Supported platforms: ${Object.keys(
        platformAssetMap
      ).join(", ")}.`
    );
  }

  const assetName = platformAssets[os.arch() as keyof typeof platformAssets];

  if (!assetName) {
    throw new Error(
      `Docfind is not configured for architecture ${os.arch()} on ${os.platform()}.`
    );
  }

  return assetName;
}

async function findDocfindBinary(directory: string): Promise<string | null> {
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      const nestedBinary = await findDocfindBinary(fullPath);

      if (nestedBinary) {
        return nestedBinary;
      }

      continue;
    }

    if (/^docfind(\.exe)?$/.test(entry.name)) {
      return fullPath;
    }
  }

  return null;
}

async function extractArchive(archivePath: string, destinationDir: string) {
  if (archivePath.endsWith(".zip")) {
    // Windows ships GNU tar (via Git) on PATH which cannot read zip archives,
    // so extract with PowerShell's Expand-Archive, which is always available.
    if (os.platform() === "win32") {
      await execFileAsync("powershell", [
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        `Expand-Archive -LiteralPath '${archivePath}' -DestinationPath '${destinationDir}' -Force`,
      ]);
      return;
    }

    // bsdtar (macOS) can extract zip archives directly.
    await execFileAsync("tar", ["-xf", archivePath, "-C", destinationDir]);
    return;
  }

  await execFileAsync("tar", ["-xzf", archivePath, "-C", destinationDir]);
}

async function ensureDocfindBinary(repoRoot: string) {
  const assetName = getDocfindAssetName();
  const cacheDir = path.join(
    repoRoot,
    ".tmp",
    "docfind",
    DOCFIND_VERSION,
    `${os.platform()}-${os.arch()}`
  );

  await mkdir(cacheDir, { recursive: true });

  const existingBinary = await findDocfindBinary(cacheDir);

  if (existingBinary) {
    await chmod(existingBinary, 0o755);
    return existingBinary;
  }

  const archivePath = path.join(cacheDir, assetName);
  const assetUrl = `https://github.com/microsoft/docfind/releases/download/${DOCFIND_VERSION}/${assetName}`;
  const response = await fetch(assetUrl);

  if (!response.ok) {
    throw new Error(
      `Failed to download Docfind ${DOCFIND_VERSION} from ${assetUrl} (${response.status} ${response.statusText}).`
    );
  }

  await writeFile(archivePath, Buffer.from(await response.arrayBuffer()));
  await extractArchive(archivePath, cacheDir);

  const extractedBinary = await findDocfindBinary(cacheDir);

  if (!extractedBinary) {
    throw new Error(`Docfind archive ${assetName} did not contain a runnable binary.`);
  }

  await chmod(extractedBinary, 0o755);
  return extractedBinary;
}

async function readExampleSources(repoRoot: string) {
  const sourceByPath: Record<string, string> = {};

  await Promise.all(
    exampleCatalog.map(async (example) => {
      const absolutePath = path.join(repoRoot, example.sourcePath);
      sourceByPath[example.sourcePath] = await readFile(absolutePath, "utf8");
    })
  );

  return sourceByPath;
}

async function buildIndexDocuments(repoRoot: string) {
  const sourceByPath = await readExampleSources(repoRoot);
  const documents = buildGlobalSearchDocuments(sourceByPath);

  if (documents.length === 0) {
    throw new Error("Search index generation produced no documents.");
  }

  return documents;
}

async function writeDocumentsFile(documents: SearchDocument[], outputPath: string) {
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify(documents, null, 2));
}

async function buildDocfindIndex(
  binaryPath: string,
  documentsPath: string,
  outputDirectory: string
) {
  await rm(outputDirectory, { recursive: true, force: true });
  await mkdir(outputDirectory, { recursive: true });
  await execFileAsync(binaryPath, [documentsPath, outputDirectory]);

  const docfindJsPath = path.join(outputDirectory, "docfind.js");
  const docfindWasmPath = path.join(outputDirectory, "docfind_bg.wasm");

  const [docfindJsStats, docfindWasmStats] = await Promise.all([
    stat(docfindJsPath),
    stat(docfindWasmPath),
  ]);

  if (!docfindJsStats.isFile() || !docfindWasmStats.isFile()) {
    throw new Error("Docfind did not emit the expected search assets.");
  }
}

async function main() {
  const repoRoot = getRepoRoot();
  const documents = await buildIndexDocuments(repoRoot);
  const documentsPath = path.join(repoRoot, ".tmp", "docfind", "documents.json");
  const outputDirectory = path.join(repoRoot, "examples", "public", "search");
  const binaryPath = await ensureDocfindBinary(repoRoot);

  await writeDocumentsFile(documents, documentsPath);
  await buildDocfindIndex(binaryPath, documentsPath, outputDirectory);

  console.log(
    `Built Docfind index with ${documents.length} searchable entries at ${path.relative(
      repoRoot,
      outputDirectory
    )}.`
  );
}

await main();
