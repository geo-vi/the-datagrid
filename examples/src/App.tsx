import * as React from "react";
import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";

import type { TypeI18n, TypeShowCellBorders } from "../../src/main";
import { Button } from "../../src/components/ui/button";
import { ButtonGroup } from "../../src/components/ui/button-group";
import { examplePages } from "./exampleMeta";
import GlobalSearch from "./GlobalSearch";

const gridThemes = [
  { value: "default", label: "Default" },
  { value: "dark", label: "Dark" },
  { value: "hf-dark", label: "HF Dark" },
  { value: "hf-light", label: "HF Light" },
  { value: "ikarus-dark", label: "Ikarus Dark" },
  { value: "ikarus-light", label: "Ikarus Light" },
] as const;

const siteRoutes = [
  { to: "/", label: "Docs" },
  { to: "/examples", label: "Examples" },
] as const;

export type GridTheme = (typeof gridThemes)[number]["value"];

type ExamplesUiContextValue = {
  gridTheme: GridTheme;
  showCellBorders: TypeShowCellBorders;
  resizable: boolean;
  i18n: TypeI18n;
};

const ExamplesUiContext = React.createContext<ExamplesUiContextValue | null>(
  null
);

export function useExamplesUi(): ExamplesUiContextValue {
  const context = React.useContext(ExamplesUiContext);

  if (!context) {
    throw new Error("Examples UI context is missing");
  }

  return context;
}

function AppHeader(props: {
  gridTheme: GridTheme;
  setGridTheme: React.Dispatch<React.SetStateAction<GridTheme>>;
  showCellBorders: TypeShowCellBorders;
  setShowCellBorders: React.Dispatch<React.SetStateAction<TypeShowCellBorders>>;
  resizable: boolean;
  setResizable: React.Dispatch<React.SetStateAction<boolean>>;
}): ReactNode {
  const {
    gridTheme,
    setGridTheme,
    showCellBorders,
    setShowCellBorders,
    resizable,
    setResizable,
  } = props;
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const isExampleDetail = examplePages.some(
    (route) => route.to === pathname || route.legacyTo === pathname
  );
  const isExamplesSection = pathname === "/examples" || isExampleDetail;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border bg-background/95 p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="m-0 text-xl font-semibold">the-datagrid</h1>
          <ButtonGroup
            aria-label="Site section buttons"
            className="max-w-full flex-wrap"
          >
            {siteRoutes.map((route) => {
              const active =
                route.to === "/"
                  ? pathname === "/" ||
                    pathname === "/docs" ||
                    pathname.startsWith("/docs/")
                  : isExamplesSection;

              return (
                <Button
                  key={route.to}
                  asChild
                  variant={active ? "secondary" : "outline"}
                  size="sm"
                  className="rounded-none"
                >
                  <Link to={route.to}>{route.label}</Link>
                </Button>
              );
            })}
          </ButtonGroup>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <GlobalSearch />
          <Button asChild variant="outline" size="sm">
            <a
              href="https://github.com/geo-vi/the-datagrid"
              target="_blank"
              rel="noreferrer"
            >
              GitHub
            </a>
          </Button>
        </div>
      </div>

      {isExamplesSection && isExampleDetail ? (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border bg-background/95 p-4 shadow-sm">
          <ButtonGroup
            aria-label="Grid theme buttons"
            className="max-w-full flex-wrap"
          >
            {gridThemes.map((gridThemeOption) => (
              <Button
                key={gridThemeOption.value}
                type="button"
                variant={
                  gridTheme === gridThemeOption.value ? "secondary" : "outline"
                }
                size="sm"
                className="rounded-none font-medium leading-none tracking-normal normal-case"
                onClick={() => setGridTheme(gridThemeOption.value)}
              >
                {gridThemeOption.label}
              </Button>
            ))}
          </ButtonGroup>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setShowCellBorders((current) =>
                current === true ? "horizontal" : true
              )
            }
          >
            Vertical separators {showCellBorders === true ? "on" : "off"}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setResizable((current) => !current)}
          >
            Resizable {resizable ? "on" : "off"}
          </Button>
        </div>
      ) : null}
    </>
  );
}

export default function App() {
  const [gridTheme, setGridTheme] = useState<GridTheme>("default");
  const [showCellBorders, setShowCellBorders] =
    useState<TypeShowCellBorders>(true);
  const [resizable, setResizable] = useState(true);

  const i18n: TypeI18n = useMemo(
    () => ({
      noRecords: "No records",
      clear: "Clear",
      contains: "Contains",
      startsWith: "Starts with",
      endsWith: "Ends with",
      eq: "Equals",
      neq: "Not equals",
      empty: "Empty",
      notEmpty: "Not empty",
      sortAsc: "Sort asc",
      sortDesc: "Sort desc",
      unsort: "Unsort",
      perPageText: "Rows",
      pageText: "Page",
      ofText: "of",
      showingText: "Showing",
      columns: "Column",
      clearAll: "All",
    }),
    []
  );

  const contextValue = useMemo(
    () => ({
      gridTheme,
      showCellBorders,
      resizable,
      i18n,
    }),
    [gridTheme, i18n, resizable, showCellBorders]
  );

  return (
    <ExamplesUiContext.Provider value={contextValue}>
      <div className="min-h-screen flex flex-col gap-4 p-4">
        <AppHeader
          gridTheme={gridTheme}
          setGridTheme={setGridTheme}
          showCellBorders={showCellBorders}
          setShowCellBorders={setShowCellBorders}
          resizable={resizable}
          setResizable={setResizable}
        />
        <Outlet />
      </div>
    </ExamplesUiContext.Provider>
  );
}
