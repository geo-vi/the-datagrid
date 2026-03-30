import * as React from "react";
import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";

import type { TypeI18n, TypeShowCellBorders } from "../../src/main";
import { Button } from "../../src/components/ui/button";
import { ButtonGroup } from "../../src/components/ui/button-group";
import { examplePages } from "./exampleMeta";

const gridThemes = [
  { value: "default", label: "Default" },
  { value: "dark", label: "Dark" },
  { value: "hf-dark", label: "HF Dark" },
  { value: "hf-light", label: "HF Light" },
  { value: "ikarus-dark", label: "Ikarus Dark" },
  { value: "ikarus-light", label: "Ikarus Light" },
] as const;

const exampleRoutes = [
  { to: "/", label: "Overview" },
  ...examplePages.map((example) => ({
    to: example.to,
    label: example.label,
  })),
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

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <h1 className="m-0 text-lg font-semibold">the-datagrid demo</h1>
        <div className="flex items-center gap-2">
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
      </div>

      <div className="flex flex-col gap-2 rounded-2xl border bg-background/95 p-4 shadow-sm">
        <div className="space-y-1">
          <div className="text-sm font-medium">Example pages</div>
          <p className="text-sm text-muted-foreground">
            Use the overview as a catalog, then open a dedicated example page to
            inspect its live preview next to the source file.
          </p>
        </div>

        <ButtonGroup
          aria-label="Example page buttons"
          className="max-w-full flex-wrap"
        >
          {exampleRoutes.map((route) => {
            const isActive = pathname === route.to;

            return (
              <Button
                key={route.to}
                asChild
                variant={isActive ? "secondary" : "outline"}
                size="sm"
                className="rounded-none"
              >
                <Link to={route.to}>{route.label}</Link>
              </Button>
            );
          })}
        </ButtonGroup>
      </div>
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
