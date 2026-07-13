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
  };

  return {
    name: "inject-library-css-entry",
    apply: "build" as const,
    enforce: "post" as const,
    generateBundle(_: unknown, bundle: OutputBundle) {
      for (const item of Object.values(bundle)) {
        if (item?.type !== "chunk" || item.isEntry !== true) continue;

        const cssFileName = cssEntryByJsEntry[item.fileName];
        if (!cssFileName || bundle[cssFileName]?.type !== "asset") continue;

        const cssImport = `import "./${cssFileName}";`;
        if (typeof item.code !== "string") continue;

        const withoutClientDirective = item.code.replace(
          /^\s*["']use client["'];\s*/,
          ""
        );
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
            : DATAGRID_SCOPE_SELECTOR;
        cssAsset.source = scopeLibraryCss(source, scopeSelector);
      }
    },
  };
}

function scopeSearchCssForSite() {
  const searchStyleSuffix = "/src/search/style.css";

  return {
    name: "scope-search-css-for-site",
    // Tailwind's generator is also `pre`; placing this plugin after it scopes
    // the generated CSS before Vite turns the stylesheet into a JS module.
    enforce: "pre" as const,
    transform(code: string, id: string) {
      const cleanId = id.split("?", 1)[0].replaceAll("\\", "/");
      if (!cleanId.endsWith(searchStyleSuffix)) return null;

      return {
        code: scopeLibraryCss(code, ".tdg-search-root"),
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
  const resolveAlias = {
    "@": path.resolve(__dirname, "./src"),
  };
  const examplesRoot = path.resolve(__dirname, "./examples");
  const siteBase = process.env.SITE_BASE ?? "/the-datagrid/";

  // In dev mode, serve the examples/docs app.
  // In site mode, build the same app for GitHub Pages.
  if (isDev || isSiteBuild) {
    return {
      plugins: [react(), tailwindcss(), scopeSearchCssForSite()],
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

  const libraryEntryName = isSearchLibraryBuild ? "search" : "index";
  const coreLibraryEntry = fileURLToPath(
    new URL("./src/main.ts", import.meta.url)
  );
  const coreLibraryModuleId = coreLibraryEntry.replace(/\.ts$/, "");
  const libraryEntry = isSearchLibraryBuild
    ? fileURLToPath(new URL("./src/search/index.ts", import.meta.url))
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

  // Build core and search independently. Search externalizes the already
  // required core entry, giving it one shared component/engine at runtime
  // without extracting a chunk that plain core consumers would need to fetch.
  return {
    plugins: [
      react(),
      tailwindcss(),
      ...(isSearchLibraryBuild
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
      cssCodeSplit: true,
      emptyOutDir: !isSearchLibraryBuild,
      lib: {
        entry: {
          [libraryEntryName]: libraryEntry,
        },
        formats: ["es"],
        fileName: (_format, entryName) => `${entryName}.js`,
        cssFileName: libraryEntryName,
      },
      rollupOptions: {
        external: (id) =>
          externalDependencies.has(id) ||
          (isSearchLibraryBuild &&
            (id === "../main" || id === coreLibraryEntry)),
        output: {
          inlineDynamicImports: true,
          paths: (id) =>
            isSearchLibraryBuild &&
            (id === "../main" ||
              id === coreLibraryEntry ||
              id === coreLibraryModuleId)
              ? "./index.js"
              : id,
          preserveModules: false,
        },
      },
    },
  };
});
