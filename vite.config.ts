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
    "column-visibility.js": "column-visibility.css",
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

        const cssFileName = cssEntryByJsEntry[item.fileName];
        const hasCssAsset =
          cssFileName != null && bundle[cssFileName]?.type === "asset";
        if (!hasCssAsset && !clientEntriesWithoutCss.has(item.fileName)) {
          continue;
        }

        if (typeof item.code !== "string") continue;
        const withoutClientDirective = item.code.replace(
          /^\s*["']use client["'];\s*/,
          ""
        );

        if (!hasCssAsset || !cssFileName) {
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
            : cssAsset.fileName === "column-visibility.css"
              ? ".tdg-column-visibility-root"
              : DATAGRID_SCOPE_SELECTOR;
        cssAsset.source = scopeLibraryCss(source, scopeSelector);
      }
    },
  };
}

function scopeOptionalCssForSite() {
  const optionalStyleScopes = new Map([
    ["/src/search/style.css", ".tdg-search-root"],
    ["/src/column-visibility/style.css", ".tdg-column-visibility-root"],
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
  const isColumnVisibilityLibraryBuild =
    command === "build" && mode === "library-column-visibility";
  const isComponentsLibraryBuild =
    command === "build" && mode === "library-components";
  const isTextInputLibraryBuild =
    command === "build" && mode === "library-text-input";
  const isSupplementalLibraryBuild =
    isSearchLibraryBuild ||
    isColumnVisibilityLibraryBuild ||
    isComponentsLibraryBuild ||
    isTextInputLibraryBuild;
  const isCoreDependentSupplementalBuild =
    isSearchLibraryBuild || isColumnVisibilityLibraryBuild;
  const resolveAlias = {
    "@": path.resolve(__dirname, "./src"),
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
    : isColumnVisibilityLibraryBuild
      ? "column-visibility"
      : isComponentsLibraryBuild
        ? "components"
        : isTextInputLibraryBuild
          ? "packages/TextInput/index"
          : "index";
  const coreLibraryEntry = fileURLToPath(
    new URL("./src/main.ts", import.meta.url)
  );
  const coreLibraryModuleId = coreLibraryEntry.replace(/\.ts$/, "");
  const searchLibraryEntry = fileURLToPath(
    new URL("./src/search/index.ts", import.meta.url)
  );
  const columnVisibilityLibraryEntry = fileURLToPath(
    new URL("./src/column-visibility/index.ts", import.meta.url)
  );
  const componentsLibraryEntry = fileURLToPath(
    new URL("./src/providers/index.ts", import.meta.url)
  );
  const libraryEntry = isSearchLibraryBuild
    ? searchLibraryEntry
    : isColumnVisibilityLibraryBuild
      ? columnVisibilityLibraryEntry
      : isComponentsLibraryBuild
        ? componentsLibraryEntry
        : isTextInputLibraryBuild
          ? fileURLToPath(
              new URL("./src/packages/TextInput/index.tsx", import.meta.url)
            )
          : coreLibraryEntry;
  const externalDependencies = new Set([
    "react",
    "react-dom",
    "react/jsx-runtime",
    "@tanstack/react-table",
    "@tanstack/react-virtual",
    "@tabler/icons-react",
    "@radix-ui/react-dropdown-menu",
    "@radix-ui/react-select",
    "@radix-ui/react-label",
  ]);
  const componentsSearchEntryIds = new Set([
    "../search",
    "../search/index",
    "../search/index.js",
    "../search/index.ts",
    searchLibraryEntry,
    searchLibraryEntry.replace(/\.ts$/, ""),
  ]);
  const componentsColumnVisibilityEntryIds = new Set([
    "../column-visibility",
    "../column-visibility/index",
    "../column-visibility/index.js",
    "../column-visibility/index.ts",
    columnVisibilityLibraryEntry,
    columnVisibilityLibraryEntry.replace(/\.ts$/, ""),
  ]);

  // Build core, optional UI entries, and the legacy TextInput path
  // independently. Search and column visibility externalize the already
  // required core runtime. Components composes those exact optional module
  // instances instead of bundling duplicate provider contexts. TextInput stays
  // standalone.
  return {
    plugins: [
      react(),
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
      alias: resolveAlias,
    },
    build: {
      copyPublicDir: false,
      cssCodeSplit: !isTextInputLibraryBuild,
      emptyOutDir: !isSupplementalLibraryBuild,
      lib: {
        entry: {
          [libraryEntryName]: libraryEntry,
        },
        formats: ["es"],
        fileName: (_format, entryName) => `${entryName}.js`,
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
              componentsColumnVisibilityEntryIds.has(id))),
        output: {
          inlineDynamicImports: true,
          paths: (id) => {
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
              componentsColumnVisibilityEntryIds.has(id)
            ) {
              return "./column-visibility.js";
            }
            return id;
          },
          preserveModules: false,
        },
      },
    },
  };
});
