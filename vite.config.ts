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

function scopeUtilitySelector(selector: string): string {
  if (isDatagridOwnedSelector(selector)) return selector;
  if (selector === "*")
    return `${DATAGRID_SCOPE_SELECTOR}, ${DATAGRID_SCOPE_SELECTOR} *`;
  return `${DATAGRID_SCOPE_SELECTOR}${selector}, ${DATAGRID_SCOPE_SELECTOR} ${selector}`;
}

function scopeLibraryCss(css: string): string {
  const root = postcss.parse(css);

  root.walkRules((rule) => {
    if (isInsideKeyframes(rule)) return;

    if (isRootThemeSelector(rule.selector)) {
      rule.selector = DATAGRID_SCOPE_SELECTOR;
      return;
    }

    const selectors = splitSelectorList(rule.selector);
    if (selectors.length === 0) return;

    rule.selector = selectors.map(scopeUtilitySelector).join(", ");
  });

  return root.toString();
}

function injectLibraryCssEntry() {
  return {
    name: "inject-library-css-entry",
    apply: "build" as const,
    enforce: "post" as const,
    generateBundle(_: unknown, bundle: OutputBundle) {
      for (const item of Object.values(bundle)) {
        if (
          item?.type !== "chunk" ||
          item.isEntry !== true ||
          item.fileName !== "index.js"
        )
          continue;
        if (
          typeof item.code === "string" &&
          !item.code.startsWith('import "./index.css";')
        ) {
          item.code = `import "./index.css";\n${item.code}`;
        }
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
      const cssAsset = bundle["index.css"];
      if (!cssAsset || cssAsset.type !== "asset") return;

      const source = String(cssAsset.source ?? "");
      cssAsset.source = scopeLibraryCss(source);
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const isDev = command === "serve";
  const isSiteBuild = command === "build" && mode === "site";
  const resolveAlias = {
    "@": path.resolve(__dirname, "./src"),
  };
  const examplesRoot = path.resolve(__dirname, "./examples");
  const siteBase = process.env.SITE_BASE ?? "/the-datagrid/";

  // In dev mode, serve the examples/docs app.
  // In site mode, build the same app for GitHub Pages.
  if (isDev || isSiteBuild) {
    return {
      plugins: [react(), tailwindcss()],
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

  // In build mode, build the library
  return {
    plugins: [
      react(),
      tailwindcss(),
      dts({
        include: ["src/**/*"],
        exclude: ["src/**/*.test.*", "src/**/__tests__/**"],
        tsconfigPath: "./tsconfig-build.json",
      }),
      scopeLibraryCssBundle(),
      injectLibraryCssEntry(),
    ],
    resolve: {
      alias: resolveAlias,
    },
    build: {
      copyPublicDir: false,
      lib: {
        entry: fileURLToPath(new URL("./src/main.ts", import.meta.url)),
        formats: ["es"],
        fileName: "index",
      },
      rollupOptions: {
        external: [
          "react",
          "react-dom",
          "react/jsx-runtime",
          "@tanstack/react-table",
          "@tanstack/react-virtual",
          "@tabler/icons-react",
          "@radix-ui/react-dropdown-menu",
          "@radix-ui/react-select",
          "@radix-ui/react-label",
        ],
        output: {
          preserveModules: false,
        },
      },
    },
  };
});
