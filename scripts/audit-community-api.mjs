import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const root = process.cwd();
const manifest = JSON.parse(
  fs.readFileSync(path.join(root, "community-api-manifest.json"), "utf8")
);
const upstreamPackage = JSON.parse(
  fs.readFileSync(
    path.join(
      root,
      "node_modules/@inovua/reactdatagrid-community/package.json"
    ),
    "utf8"
  )
);

const failures = [];
const fail = (message) => failures.push(message);

if (upstreamPackage.version !== manifest.upstream.version) {
  fail(
    `upstream version mismatch: installed ${upstreamPackage.version}, manifest ${manifest.upstream.version}`
  );
}

function sourceFile(file) {
  return ts.createSourceFile(
    file,
    fs.readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );
}

function propertyName(member) {
  const name = member.name;
  return name &&
    (ts.isIdentifier(name) ||
      ts.isStringLiteral(name) ||
      ts.isNumericLiteral(name))
    ? name.text
    : null;
}

function typeMembers(file, typeName) {
  const source = sourceFile(file);
  const result = [];
  const addMembers = (members) => {
    for (const member of members) {
      const name = propertyName(member);
      if (name) result.push(name);
    }
  };
  const visitType = (type) => {
    if (ts.isTypeLiteralNode(type)) addMembers(type.members);
    if (ts.isIntersectionTypeNode(type) || ts.isUnionTypeNode(type)) {
      type.types.forEach(visitType);
    }
  };
  const visit = (node) => {
    if (ts.isTypeAliasDeclaration(node) && node.name.text === typeName) {
      visitType(node.type);
    }
    if (ts.isInterfaceDeclaration(node) && node.name.text === typeName) {
      addMembers(node.members);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return [...new Set(result)];
}

function typeHasIndexSignature(file, typeName) {
  const source = sourceFile(file);
  let result = false;
  const inspectMembers = (members) => {
    if (members.some((member) => ts.isIndexSignatureDeclaration(member))) {
      result = true;
    }
  };
  const inspectType = (type) => {
    if (ts.isTypeLiteralNode(type)) inspectMembers(type.members);
    if (ts.isIntersectionTypeNode(type) || ts.isUnionTypeNode(type)) {
      type.types.forEach(inspectType);
    }
  };
  const visit = (node) => {
    if (ts.isTypeAliasDeclaration(node) && node.name.text === typeName) {
      inspectType(node.type);
    }
    if (ts.isInterfaceDeclaration(node) && node.name.text === typeName) {
      inspectMembers(node.members);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return result;
}

function objectKeys(file, variableName) {
  const source = sourceFile(file);
  const result = [];
  const visit = (node) => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === variableName &&
      node.initializer &&
      ts.isObjectLiteralExpression(node.initializer)
    ) {
      for (const property of node.initializer.properties) {
        const name = propertyName(property);
        if (name) result.push(name);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return [...new Set(result)];
}

function moduleExports(file) {
  const options = {
    jsx: ts.JsxEmit.ReactJSX,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    skipLibCheck: true,
    target: ts.ScriptTarget.ESNext,
  };
  const program = ts.createProgram([file], options);
  const resolvedFile = path.resolve(file);
  const source = program
    .getSourceFiles()
    .find((candidate) => path.resolve(candidate.fileName) === resolvedFile);
  if (!source) return [];
  const checker = program.getTypeChecker();
  const symbol = checker.getSymbolAtLocation(source);
  return symbol
    ? checker
        .getExportsOfModule(symbol)
        .map((entry) => entry.name)
        .sort()
    : [];
}

const upstreamComputedFile = path.join(
  root,
  "node_modules/@inovua/reactdatagrid-community/types/TypeDataGridProps.d.ts"
);
const upstreamTypesFile = path.join(
  root,
  "node_modules/@inovua/reactdatagrid-community/types/index.d.ts"
);
const localTypesFile = path.join(root, "src/types.ts");
const localTypesEntry = path.join(root, "src/types/index.ts");
const gridRuntimeFile = path.join(root, "src/grid/ReactDataGrid.tsx");

const upstreamComputed = typeMembers(upstreamComputedFile, "TypeComputedProps");
const localComputed = typeMembers(localTypesFile, "TypeComputedProps");
const runtimeComputed = objectKeys(gridRuntimeFile, "baseApi");
const upstreamTypeExports = moduleExports(upstreamTypesFile);
const localTypeExports = moduleExports(localTypesEntry);

for (const typeName of ["IColumn", "TypeComputedProps"]) {
  if (typeHasIndexSignature(localTypesFile, typeName)) {
    fail(`${typeName} must not use a permissive index signature`);
  }
}

if (
  upstreamComputed.length !==
  manifest.declarationAudit.upstreamComputedMemberCount
) {
  fail(
    `upstream computed count changed: ${upstreamComputed.length} !== ${manifest.declarationAudit.upstreamComputedMemberCount}`
  );
}
if (
  upstreamTypeExports.length !==
  manifest.declarationAudit.upstreamTypeExportCount
) {
  fail(
    `upstream type export count changed: ${upstreamTypeExports.length} !== ${manifest.declarationAudit.upstreamTypeExportCount}`
  );
}

const enterpriseTokens = manifest.declarationAudit.enterpriseNameTokens.map(
  (token) => token.toLowerCase()
);
const enterpriseExact = new Set(
  manifest.declarationAudit.enterpriseExactExclusions
);
const internalComputed = new Set(
  manifest.declarationAudit.computedInternalExclusions
);
const isEnterprise = (name) =>
  enterpriseExact.has(name) ||
  enterpriseTokens.some((token) => name.toLowerCase().includes(token));

for (const name of upstreamComputed) {
  if (localComputed.includes(name)) continue;
  if (isEnterprise(name) || internalComputed.has(name)) continue;
  fail(`unclassified upstream computed member: ${name}`);
}

for (const name of internalComputed) {
  if (!upstreamComputed.includes(name)) {
    fail(`stale computed internal exclusion: ${name}`);
  }
  if (localComputed.includes(name)) {
    fail(`implemented computed member remains internally excluded: ${name}`);
  }
}

for (const name of upstreamTypeExports) {
  if (localTypeExports.includes(name) || isEnterprise(name)) continue;
  fail(`unclassified upstream /types export: ${name}`);
}

for (const name of manifest.canonicalTypes) {
  if (!localTypeExports.includes(name)) {
    fail(`canonical type is not exported from /types: ${name}`);
  }
}

const seenMethods = new Set();
for (const name of manifest.computedMethods) {
  if (seenMethods.has(name)) fail(`duplicate computed method: ${name}`);
  seenMethods.add(name);
  if (!localComputed.includes(name)) {
    fail(`computed method is absent from local TypeComputedProps: ${name}`);
  }
  if (!runtimeComputed.includes(name)) {
    fail(`computed method is absent from the runtime base API: ${name}`);
  }
}

if (failures.length > 0) {
  console.error("Community API audit failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      upstreamVersion: upstreamPackage.version,
      upstreamComputedMembers: upstreamComputed.length,
      localComputedMembers: localComputed.length,
      classifiedComputedMembers: upstreamComputed.length,
      upstreamTypeExports: upstreamTypeExports.length,
      localTypeExports: localTypeExports.length,
      supportedComputedMethods: manifest.computedMethods.length,
      canonicalTypes: manifest.canonicalTypes.length,
    },
    null,
    2
  )
);
