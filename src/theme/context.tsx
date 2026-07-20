/* eslint-disable react-refresh/only-export-components */
import * as React from "react";

const DEFAULT_THEME = "default";
export type DatagridThemeBase = "default" | "light" | "dark";

type DatagridThemeContextValue = {
  themeName: string;
  themeBase: DatagridThemeBase;
  portalContainer: HTMLElement | null;
};

const DatagridThemeContext = React.createContext<DatagridThemeContextValue>({
  themeName: DEFAULT_THEME,
  themeBase: DEFAULT_THEME,
  portalContainer: null,
});

export function normalizeThemeName(theme: string | null | undefined): string {
  const next = String(theme ?? DEFAULT_THEME).trim();
  return next.length > 0 ? next : DEFAULT_THEME;
}

export function toThemeClassSuffix(theme: string | null | undefined): string {
  return (
    normalizeThemeName(theme)
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "") || DEFAULT_THEME
  );
}

export function resolveThemeBase(
  theme: string | null | undefined
): DatagridThemeBase {
  const suffix = toThemeClassSuffix(theme);

  if (suffix === DEFAULT_THEME) return DEFAULT_THEME;
  if (
    suffix === "dark" ||
    suffix.endsWith("-dark") ||
    suffix.endsWith("_dark")
  ) {
    return "dark";
  }
  if (
    suffix === "light" ||
    suffix.endsWith("-light") ||
    suffix.endsWith("_light")
  ) {
    return "light";
  }

  return DEFAULT_THEME;
}

export function DatagridThemeProvider(props: {
  theme: string;
  themeBase?: DatagridThemeBase;
  portalContainer?: HTMLElement | null;
  children: React.ReactNode;
}): React.ReactElement {
  const {
    theme,
    themeBase = resolveThemeBase(theme),
    portalContainer = null,
    children,
  } = props;
  return (
    <DatagridThemeContext.Provider
      value={{
        themeName: normalizeThemeName(theme),
        themeBase,
        portalContainer,
      }}
    >
      {children}
    </DatagridThemeContext.Provider>
  );
}

export function useDatagridThemeName(): string {
  return React.useContext(DatagridThemeContext).themeName;
}

export function useDatagridThemeClassSuffix(): string {
  return toThemeClassSuffix(useDatagridThemeName());
}

export function useDatagridPortalContainer(): HTMLElement | null {
  return React.useContext(DatagridThemeContext).portalContainer;
}

export function useDatagridThemeBase(): DatagridThemeBase {
  return React.useContext(DatagridThemeContext).themeBase;
}
