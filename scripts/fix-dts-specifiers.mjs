import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const distDir = path.resolve(process.cwd(), "dist");

function collectDeclarationFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectDeclarationFiles(entryPath);
    return entry.isFile() && entry.name.endsWith(".d.ts") ? [entryPath] : [];
  });
}

function runtimeSpecifierFor(declarationFile, specifier) {
  if (/\.[a-z0-9]+$/i.test(specifier)) return specifier;

  const resolved = path.resolve(path.dirname(declarationFile), specifier);
  if (fs.existsSync(`${resolved}.d.ts`)) return `${specifier}.js`;
  if (fs.existsSync(path.join(resolved, "index.d.ts"))) {
    return `${specifier}/index.js`;
  }

  throw new Error(
    `Cannot resolve declaration specifier ${specifier} from ${path.relative(
      process.cwd(),
      declarationFile
    )}`
  );
}

if (!fs.existsSync(distDir)) {
  console.error("Missing dist directory. Run the library build first.");
  process.exit(1);
}

const declarationFiles = collectDeclarationFiles(distDir);
const relativeImportPattern =
  /(\bfrom\s+|\bimport\s*\(\s*)(["'])(\.\.?\/[^"']+)\2/g;

for (const declarationFile of declarationFiles) {
  const source = fs.readFileSync(declarationFile, "utf8");
  const rewritten = source.replace(
    relativeImportPattern,
    (match, prefix, quote, specifier) =>
      `${prefix}${quote}${runtimeSpecifierFor(
        declarationFile,
        specifier
      )}${quote}`
  );

  if (rewritten !== source) {
    fs.writeFileSync(declarationFile, rewritten);
  }
}

console.log(
  `Rewrote relative specifiers in ${declarationFiles.length} declaration files for NodeNext resolution.`
);
