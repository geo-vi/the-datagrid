import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import dts from "vite-plugin-dts";
import path from "path";
import tailwindcss from "@tailwindcss/vite";
import postcss from "postcss";
import type { ChildNode } from "postcss";
import type { OutputBundle } from "rollup";

const DATAGRID_SCOPE_SELECTOR = ".tdg-root";
const REACT_EXTERNAL_ID = "the-datagrid:react-external";
const REACT_DOM_EXTERNAL_ID = "the-datagrid:react-dom-external";
const REACT_RUNTIME_DEDUPE = ["react", "react-dom"];
const XLSX_EXTERNAL_ID = "xlsx";
const DATAGRID_OWNED_SELECTOR_MARKERS = [
  ".tdg-",
  ".InovuaReactDataGrid",
  ".inovua-react-toolkit",
];

function splitSelectorList(selector: string): string[] {
  const selectors: string[] = [];
  let current = "";
  let depth = 0;
  let quote: string | null = null;
  let escaped = false;

  for (const char of selector) {
    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }

    if (char === "\\") {
      current += char;
      escaped = true;
      continue;
    }

    if (quote) {
      current += char;
      if (char === quote) quote = null;
      continue;
    }

    if (char === '"' || char === "'") {
      current += char;
      quote = char;
      continue;
    }

    if (char === "(" || char === "[") {
      current += char;
      depth += 1;
      continue;
    }

    if (char === ")" || char === "]") {
      current += char;
      depth = Math.max(0, depth - 1);
      continue;
    }

    if (char === "," && depth === 0) {
      if (current.trim()) selectors.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  if (current.trim()) selectors.push(current.trim());
  return selectors;
}

function isDatagridOwnedSelector(selector: string): boolean {
  return DATAGRID_OWNED_SELECTOR_MARKERS.some((marker) =>
    selector.includes(marker)
  );
}

function isInsideKeyframes(node: ChildNode): boolean {
  let parent = node.parent;

  while (parent) {
    if (
      parent.type === "atrule" &&
      parent.name.toLowerCase().endsWith("keyframes")
    ) {
      return true;
    }

    parent = parent.parent;
  }

  return false;
}

function isRootThemeSelector(selector: string): boolean {
  const selectors = splitSelectorList(selector);
  return (
    selectors.length > 0 &&
    selectors.every((part) => part === ":root" || part === ":host")
  );
}

function scopeUtilitySelector(selector: string, scopeSelector: string): string {
  if (isDatagridOwnedSelector(selector)) return selector;
  if (selector === "*") return `${scopeSelector}, ${scopeSelector} *`;
  return `${scopeSelector}${selector}, ${scopeSelector} ${selector}`;
}

function scopeLibraryCss(
  css: string,
  scopeSelector = DATAGRID_SCOPE_SELECTOR
): string {
  const root = postcss.parse(css);

  root.walkRules((rule) => {
    if (isInsideKeyframes(rule)) return;

    if (isRootThemeSelector(rule.selector)) {
      rule.selector = scopeSelector;
      return;
    }

    const selectors = splitSelectorList(rule.selector);
    if (selectors.length === 0) return;

    rule.selector = selectors
      .map((selector) => scopeUtilitySelector(selector, scopeSelector))
      .join(", ");
  });

  return root.toString();
}

function injectLibraryCssEntry() {
  const cssEntryByJsEntry: Record<string, string> = {
    "index.js": "index.css",
    "search.js": "search.css",
    "toolbar.js": "toolbar.css",
    "packages/TextInput/index.js": "packages/TextInput/style.css",
  };
  const clientEntriesWithoutCss = new Set(["components.js"]);

  return {
    name: "inject-library-css-entry",
    apply: "build" as const,
    enforce: "post" as const,
    generateBundle(_: unknown, bundle: OutputBundle) {
      for (const item of Object.values(bundle)) {
        if (item?.type !== "chunk" || item.isEntry !== true) continue;

        const isCommonJsEntry = item.fileName.endsWith(".cjs");
        const cssFileName = cssEntryByJsEntry[item.fileName];
        const hasCssAsset =
          cssFileName != null && bundle[cssFileName]?.type === "asset";
        if (
          !isCommonJsEntry &&
          !hasCssAsset &&
          !clientEntriesWithoutCss.has(item.fileName)
        ) {
          continue;
        }

        if (typeof item.code !== "string") continue;
        const withoutClientDirective = item.code.replace(
          /^\s*["']use client["'];\s*/,
          ""
        );

        if (isCommonJsEntry || !hasCssAsset || !cssFileName) {
          item.code = `"use client";\n${withoutClientDirective}`;
          continue;
        }

        const relativeCssPath = path.posix.relative(
          path.posix.dirname(item.fileName),
          cssFileName
        );
        const cssImport = `import "${
          relativeCssPath.startsWith(".")
            ? relativeCssPath
            : `./${relativeCssPath}`
        }";`;
        const withoutInjectedCss = withoutClientDirective.replace(
          new RegExp(
            `^${cssImport.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*`
          ),
          ""
        );
        item.code = `"use client";\n${cssImport}\n${withoutInjectedCss}`;
      }
    },
  };
}

function scopeLibraryCssBundle() {
  return {
    name: "scope-library-css-bundle",
    apply: "build" as const,
    enforce: "post" as const,
    generateBundle(_: unknown, bundle: OutputBundle) {
      for (const cssAsset of Object.values(bundle)) {
        if (
          !cssAsset ||
          cssAsset.type !== "asset" ||
          !cssAsset.fileName.endsWith(".css")
        ) {
          continue;
        }

        const source = String(cssAsset.source ?? "");
        const scopeSelector =
          cssAsset.fileName === "search.css"
            ? ".tdg-search-root"
            : cssAsset.fileName === "toolbar.css"
              ? ".tdg-toolbar-root"
              : DATAGRID_SCOPE_SELECTOR;
        cssAsset.source = scopeLibraryCss(source, scopeSelector);
      }
    },
  };
}

function scopeOptionalCssForSite() {
  const optionalStyleScopes = new Map([
    ["/src/search/style.css", ".tdg-search-root"],
    ["/src/toolbar/style.css", ".tdg-toolbar-root"],
  ]);

  return {
    name: "scope-optional-css-for-site",
    // Tailwind's generator is also `pre`; placing this plugin after it scopes
    // the generated CSS before Vite turns the stylesheet into a JS module.
    enforce: "pre" as const,
    transform(code: string, id: string) {
      const cleanId = id.split("?", 1)[0].replaceAll("\\", "/");
      const scopeEntry = Array.from(optionalStyleScopes.entries()).find(
        ([styleSuffix]) => cleanId.endsWith(styleSuffix)
      );
      if (!scopeEntry) return null;

      return {
        code: scopeLibraryCss(code, scopeEntry[1]),
        map: null,
      };
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const isDev = command === "serve";
  const isSiteBuild = command === "build" && mode === "site";
  const isSearchLibraryBuild = command === "build" && mode === "library-search";
  const isToolbarLibraryBuild =
    command === "build" && mode === "library-toolbar";
  const isComponentsLibraryBuild =
    command === "build" && mode === "library-components";
  const isTextInputLibraryBuild =
    command === "build" && mode === "library-text-input";
  const communityLibraryEntries = {
    "library-bool-editor": {
      name: "BoolEditor",
      source: "./src/editors/BoolEditor.tsx",
    },
    "library-date-editor": {
      name: "DateEditor",
      source: "./src/editors/DateEditor.tsx",
    },
    "library-numeric-editor": {
      name: "NumericEditor",
      source: "./src/editors/NumericEditor.tsx",
    },
    "library-select-editor": {
      name: "SelectEditor",
      source: "./src/editors/SelectEditor.tsx",
    },
    "library-text-editor": {
      name: "TextEditor",
      source: "./src/editors/TextEditor.tsx",
    },
    "library-string-filter": {
      name: "StringFilter",
      source: "./src/filters/editors/StringFilter.tsx",
    },
    "library-bool-filter": {
      name: "BoolFilter",
      source: "./src/filters/editors/BoolFilter.tsx",
    },
    "library-date-filter": {
      name: "DateFilter",
      source: "./src/filters/editors/DateFilter.tsx",
    },
    "library-number-filter": {
      name: "NumberFilter",
      source: "./src/filters/editors/NumberFilter.tsx",
    },
    "library-select-filter": {
      name: "SelectFilter",
      source: "./src/filters/editors/SelectFilter.tsx",
    },
    "library-community-types": {
      name: "types/index",
      source: "./src/types/index.ts",
    },
  } as const;
  const communityLibraryEntry =
    communityLibraryEntries[mode as keyof typeof communityLibraryEntries];
  const isCommunityLibraryBuild =
    command === "build" && communityLibraryEntry != null;
  const isSupplementalLibraryBuild =
    isSearchLibraryBuild ||
    isToolbarLibraryBuild ||
    isComponentsLibraryBuild ||
    isTextInputLibraryBuild ||
    isCommunityLibraryBuild;
  const isCoreDependentSupplementalBuild =
    isSearchLibraryBuild || isToolbarLibraryBuild;
  const resolveAlias = {
    "@": path.resolve(__dirname, "./src"),
  };
  const libraryResolveAlias = {
    ...resolveAlias,
    "react/jsx-runtime": path.resolve(
      __dirname,
      "./src/compat/react-jsx-runtime.ts"
    ),
    "react/jsx-dev-runtime": path.resolve(
      __dirname,
      "./src/compat/react-jsx-runtime.ts"
    ),
    "react-dom": path.resolve(
      __dirname,
      "./src/compat/react-dom-flush-sync.ts"
    ),
    react: path.resolve(__dirname, "./src/compat/react.ts"),
  };
  const examplesRoot = path.resolve(__dirname, "./examples");
  const siteBase = process.env.SITE_BASE ?? "/the-datagrid/";

  // In dev mode, serve the examples/docs app.
  // In site mode, build the same app for GitHub Pages.
  if (isDev || isSiteBuild) {
    return {
      plugins: [react(), tailwindcss(), scopeOptionalCssForSite()],
      resolve: {
        alias: resolveAlias,
        // Keep the examples/docs application, linked source files, and UI
        // dependencies on one hook dispatcher. This is intentionally scoped
        // to the site runtime; library builds use the React 16.8 compatibility
        // aliases below before externalizing React for consumers.
        dedupe: REACT_RUNTIME_DEDUPE,
      },
      root: examplesRoot,
      base: isSiteBuild ? siteBase : "/",
      build: isSiteBuild
        ? {
            outDir: path.resolve(__dirname, "./dist-site"),
            emptyOutDir: true,
          }
        : undefined,
    };
  }

  const libraryEntryName = isSearchLibraryBuild
    ? "search"
    : isToolbarLibraryBuild
      ? "toolbar"
      : isComponentsLibraryBuild
        ? "components"
        : isTextInputLibraryBuild
          ? "packages/TextInput/index"
          : (communityLibraryEntry?.name ?? "index");
  const coreLibraryEntry = fileURLToPath(
    new URL("./src/main.ts", import.meta.url)
  );
  const coreLibraryModuleId = coreLibraryEntry.replace(/\.ts$/, "");
  const searchLibraryEntry = fileURLToPath(
    new URL("./src/search/index.ts", import.meta.url)
  );
  const toolbarLibraryEntry = fileURLToPath(
    new URL("./src/toolbar/index.ts", import.meta.url)
  );
  const componentsLibraryEntry = fileURLToPath(
    new URL("./src/providers/index.ts", import.meta.url)
  );
  const libraryEntry = isSearchLibraryBuild
    ? searchLibraryEntry
    : isToolbarLibraryBuild
      ? toolbarLibraryEntry
      : isComponentsLibraryBuild
        ? componentsLibraryEntry
        : isTextInputLibraryBuild
          ? fileURLToPath(
              new URL("./src/packages/TextInput/index.tsx", import.meta.url)
            )
          : communityLibraryEntry
            ? fileURLToPath(
                new URL(communityLibraryEntry.source, import.meta.url)
              )
            : coreLibraryEntry;
  const externalDependencies = new Set([
    REACT_EXTERNAL_ID,
    REACT_DOM_EXTERNAL_ID,
    // SheetJS is an optional peer dependency several times the size of the
    // toolbar entry. It stays external and dynamically imported, so consumers
    // who never export a spreadsheet never load it.
    XLSX_EXTERNAL_ID,
  ]);
  const componentsSearchEntryIds = new Set([
    "../search",
    "../search/index",
    "../search/index.js",
    "../search/index.ts",
    searchLibraryEntry,
    searchLibraryEntry.replace(/\.ts$/, ""),
  ]);
  const componentsToolbarEntryIds = new Set([
    "../toolbar",
    "../toolbar/index",
    "../toolbar/index.js",
    "../toolbar/index.ts",
    toolbarLibraryEntry,
    toolbarLibraryEntry.replace(/\.ts$/, ""),
  ]);

  // Build core, optional UI entries, and the legacy TextInput path
  // independently. Search and toolbar externalize the already
  // required core runtime. Components composes those exact optional module
  // instances instead of bundling duplicate provider contexts. TextInput stays
  // standalone.
  return {
    plugins: [
      react({ jsxRuntime: "classic" }),
      tailwindcss(),
      ...(isSupplementalLibraryBuild
        ? []
        : [
            dts({
              include: ["src/**/*"],
              exclude: ["src/**/*.test.*", "src/**/__tests__/**"],
              tsconfigPath: "./tsconfig-build.json",
            }),
          ]),
      scopeLibraryCssBundle(),
      injectLibraryCssEntry(),
    ],
    resolve: {
      alias: libraryResolveAlias,
    },
    build: {
      copyPublicDir: false,
      cssCodeSplit: !isTextInputLibraryBuild,
      emptyOutDir: !isSupplementalLibraryBuild,
      lib: {
        entry: {
          [libraryEntryName]: libraryEntry,
        },
        formats:
          isSearchLibraryBuild ||
          isToolbarLibraryBuild ||
          isComponentsLibraryBuild ||
          isTextInputLibraryBuild
            ? ["es"]
            : ["es", "cjs"],
        fileName: (format, entryName) =>
          `${entryName}.${format === "cjs" ? "cjs" : "js"}`,
        cssFileName: isTextInputLibraryBuild
          ? "packages/TextInput/style"
          : libraryEntryName,
      },
      rollupOptions: {
        external: (id) =>
          externalDependencies.has(id) ||
          (isCoreDependentSupplementalBuild &&
            (id === "../main" || id === coreLibraryEntry)) ||
          (isComponentsLibraryBuild &&
            (componentsSearchEntryIds.has(id) ||
              componentsToolbarEntryIds.has(id))),
        output: {
          inlineDynamicImports: true,
          paths: (id) => {
            if (id === REACT_EXTERNAL_ID) return "react";
            if (id === REACT_DOM_EXTERNAL_ID) return "react-dom";
            if (
              isCoreDependentSupplementalBuild &&
              (id === "../main" ||
                id === coreLibraryEntry ||
                id === coreLibraryModuleId)
            ) {
              return "./index.js";
            }
            if (isComponentsLibraryBuild && componentsSearchEntryIds.has(id)) {
              return "./search.js";
            }
            if (
              isComponentsLibraryBuild &&
              componentsToolbarEntryIds.has(id)
            ) {
              return "./toolbar.js";
            }
            return id;
          },
          preserveModules: false,
        },
      },
    },
  };
});
