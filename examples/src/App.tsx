import * as React from "react";
import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Menu, Moon, Search, Sun } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import type { TypeI18n, TypeShowCellBorders } from "../../src/main";
import { Button } from "../../src/components/ui/button";
import { ButtonGroup } from "../../src/components/ui/button-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "../../src/components/ui/dialog";
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
type SiteTheme = "light" | "dark";

const SITE_THEME_STORAGE_KEY = "tdg-site-theme";

function getInitialSiteTheme(): SiteTheme {
  if (typeof window === "undefined") {
    return "light";
  }

  const savedTheme = window.localStorage.getItem(SITE_THEME_STORAGE_KEY);
  if (savedTheme === "light" || savedTheme === "dark") {
    return savedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

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
  siteTheme: SiteTheme;
  setSiteTheme: React.Dispatch<React.SetStateAction<SiteTheme>>;
  showCellBorders: TypeShowCellBorders;
  setShowCellBorders: React.Dispatch<React.SetStateAction<TypeShowCellBorders>>;
  resizable: boolean;
  setResizable: React.Dispatch<React.SetStateAction<boolean>>;
}): ReactNode {
  const {
    gridTheme,
    setGridTheme,
    siteTheme,
    setSiteTheme,
    showCellBorders,
    setShowCellBorders,
    resizable,
    setResizable,
  } = props;
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);
  const isExampleDetail = examplePages.some(
    (route) => route.to === pathname || route.legacyTo === pathname
  );
  const isExamplesSection = pathname === "/examples" || isExampleDetail;
  const headerItemClass =
    "inline-flex h-full min-h-14 items-center gap-2 !rounded-none border-0 border-r border-border/70 px-4 text-sm font-medium text-muted-foreground shadow-none transition-colors hover:bg-muted/50 hover:text-foreground focus-visible:!rounded-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50";
  const activeHeaderItemClass = "bg-muted/50 text-foreground";
  const mobileMenuItemClass =
    "flex min-h-[7rem] w-full items-center gap-6 rounded-3xl border border-border/70 bg-background/70 px-8 py-6 text-left text-[2rem] font-semibold leading-tight text-foreground shadow-sm transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

  const openSearchFromMenu = () => {
    setMobileNavOpen(false);
    window.dispatchEvent(new Event("tdg-open-global-search"));
  };

  return (
    <>
      <Dialog open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <div className="flex min-h-14 items-center justify-between rounded-3xl border bg-background/95 px-4 shadow-sm lg:hidden">
          <h1 className="m-0">
            <Link
              to="/"
              className="inline-flex items-center text-xl font-semibold tracking-tight text-foreground transition-colors hover:text-foreground/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              the-datagrid
            </Link>
          </h1>

          <DialogTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="!rounded-none border-0 shadow-none"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </Button>
          </DialogTrigger>
        </div>

        <DialogContent className="tdg-mobile-nav-content !inset-0 !w-screen !max-w-none !translate-x-0 !translate-y-0 gap-0 !rounded-none border-0 bg-background/98 p-0 shadow-2xl sm:!rounded-none">
          <div className="sr-only">
            <DialogTitle>Navigation menu</DialogTitle>
            <DialogDescription>
              Browse sections, search the docs, switch theme, and open GitHub.
            </DialogDescription>
          </div>

          <div className="tdg-mobile-nav-header flex min-h-24 items-center border-b border-border/70 px-6 pr-16">
            <div className="text-3xl font-semibold tracking-tight">
              the-datagrid
            </div>
          </div>

          <nav
            className="flex flex-1 flex-col gap-4 px-4 py-5"
            aria-label="Mobile navigation"
          >
            <Button
              type="button"
              variant="ghost"
              className={mobileMenuItemClass}
              onClick={openSearchFromMenu}
            >
              <span className="flex items-center gap-4">
                <Search className="h-8 w-8 shrink-0" aria-hidden="true" />
                Search docs and examples
              </span>
            </Button>

            {siteRoutes.map((route) => {
              const active =
                route.to === "/"
                  ? pathname === "/" ||
                    pathname === "/docs" ||
                    pathname.startsWith("/docs/")
                  : isExamplesSection;

              return (
                <Button
                  key={`mobile-${route.to}`}
                  asChild
                  variant="ghost"
                  className={`${mobileMenuItemClass} justify-start ${active ? "bg-muted/50" : ""}`}
                >
                  <Link to={route.to} onClick={() => setMobileNavOpen(false)}>
                    <span>{route.label}</span>
                  </Link>
                </Button>
              );
            })}

            <Button
              type="button"
              variant="ghost"
              className={mobileMenuItemClass}
              aria-label="Switch site theme"
              onClick={() =>
                setSiteTheme((current) =>
                  current === "dark" ? "light" : "dark"
                )
              }
            >
              <span className="flex items-center gap-4">
                {siteTheme === "dark" ? (
                  <Sun className="h-8 w-8 shrink-0" aria-hidden="true" />
                ) : (
                  <Moon className="h-8 w-8 shrink-0" aria-hidden="true" />
                )}
                {siteTheme === "dark" ? "Light mode" : "Dark mode"}
              </span>
            </Button>

            <Button
              asChild
              variant="ghost"
              className={`${mobileMenuItemClass} justify-start`}
            >
              <a
                href="https://github.com/geo-vi/the-datagrid"
                target="_blank"
                rel="noreferrer"
              >
                <span>GitHub</span>
              </a>
            </Button>
          </nav>
        </DialogContent>
      </Dialog>

      <div className="hidden overflow-hidden rounded-3xl border bg-background/95 shadow-sm lg:block">
        <div className="flex flex-col lg:flex-row lg:items-stretch lg:justify-between">
          <div className="flex min-h-14 flex-wrap items-stretch">
            <h1 className="m-0">
              <Link
                to="/"
                className="inline-flex h-full min-h-14 items-center border-r border-border/70 px-5 text-xl font-semibold tracking-tight text-foreground transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50"
              >
                the-datagrid
              </Link>
            </h1>
            <nav
              aria-label="Site section buttons"
              className="flex min-h-14 flex-wrap items-stretch"
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
                    variant="ghost"
                    className={`${headerItemClass} rounded-none ${active ? activeHeaderItemClass : ""}`}
                  >
                    <Link to={route.to}>{route.label}</Link>
                  </Button>
                );
              })}
            </nav>
            <GlobalSearch />
          </div>

          <div className="flex min-h-14 flex-wrap items-stretch border-t border-border/70 lg:border-t-0 lg:border-l">
            <Button
              type="button"
              variant="ghost"
              className={`${headerItemClass} rounded-none`}
              aria-label="Switch site theme"
              title={
                siteTheme === "dark"
                  ? "Switch to light theme"
                  : "Switch to dark theme"
              }
              onClick={() =>
                setSiteTheme((current) =>
                  current === "dark" ? "light" : "dark"
                )
              }
            >
              {siteTheme === "dark" ? (
                <Sun className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Moon className="h-4 w-4" aria-hidden="true" />
              )}
              <span className="hidden sm:inline">
                {siteTheme === "dark" ? "Light mode" : "Dark mode"}
              </span>
            </Button>
            <Button
              asChild
              variant="ghost"
              className={`${headerItemClass} !border-r-0 rounded-none`}
            >
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
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const isDocsRoute = pathname === "/docs" || pathname.startsWith("/docs/");
  const [gridTheme, setGridTheme] = useState<GridTheme>("default");
  const [siteTheme, setSiteTheme] = useState<SiteTheme>(getInitialSiteTheme);
  const [showCellBorders, setShowCellBorders] =
    useState<TypeShowCellBorders>(true);
  const [resizable, setResizable] = useState(true);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", siteTheme === "dark");
    root.dataset.siteTheme = siteTheme;
    root.style.colorScheme = siteTheme;
    window.localStorage.setItem(SITE_THEME_STORAGE_KEY, siteTheme);
  }, [siteTheme]);

  useEffect(() => {
    if (!isDocsRoute) {
      return;
    }

    const root = document.documentElement;
    const body = document.body;
    const previousRootOverflow = root.style.overflow;
    const previousBodyOverflow = body.style.overflow;

    root.style.overflow = "hidden";
    body.style.overflow = "hidden";

    return () => {
      root.style.overflow = previousRootOverflow;
      body.style.overflow = previousBodyOverflow;
    };
  }, [isDocsRoute]);

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
      <div
        className={
          isDocsRoute
            ? "flex h-dvh flex-col gap-4 overflow-hidden bg-background p-4 text-foreground transition-colors"
            : "flex min-h-screen flex-col gap-4 bg-background p-4 text-foreground transition-colors"
        }
      >
        <div className={isDocsRoute ? "shrink-0" : undefined}>
          <AppHeader
            gridTheme={gridTheme}
            setGridTheme={setGridTheme}
            siteTheme={siteTheme}
            setSiteTheme={setSiteTheme}
            showCellBorders={showCellBorders}
            setShowCellBorders={setShowCellBorders}
            resizable={resizable}
            setResizable={setResizable}
          />
        </div>
        {isDocsRoute ? (
          <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
            <Outlet />
          </div>
        ) : (
          <Outlet />
        )}
      </div>
    </ExamplesUiContext.Provider>
  );
}
