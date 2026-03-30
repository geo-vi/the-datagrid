import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { fileURLToPath } from "node:url"
import dts from "vite-plugin-dts"
import path from "path"
import tailwindcss from "@tailwindcss/vite"

function injectLibraryCssEntry() {
  return {
    name: "inject-library-css-entry",
    apply: "build" as const,
    enforce: "post" as const,
    generateBundle(_: unknown, bundle: Record<string, any>) {
      for (const item of Object.values(bundle)) {
        if (item?.type !== "chunk" || item.isEntry !== true || item.fileName !== "index.js") continue
        if (typeof item.code === "string" && !item.code.startsWith('import "./index.css";')) {
          item.code = `import "./index.css";\n${item.code}`
        }
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const isDev = command === "serve"
  const isSiteBuild = command === "build" && mode === "site"
  const resolveAlias = {
    "@": path.resolve(__dirname, "./src"),
  }
  const examplesRoot = path.resolve(__dirname, "./examples")
  const siteBase = process.env.SITE_BASE ?? "/the-datagrid/"
  
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
    }
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
  }
})
