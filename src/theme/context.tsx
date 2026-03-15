/* eslint-disable react-refresh/only-export-components */
import * as React from "react";

const DEFAULT_THEME = "default";

type DatagridThemeContextValue = {
  themeName: string;
  portalContainer: HTMLElement | null;
};

const DatagridThemeContext = React.createContext<DatagridThemeContextValue>({
  themeName: DEFAULT_THEME,
  portalContainer: null,
});

export function normalizeThemeName(theme: string | null | undefined): string {
  const next = String(theme ?? DEFAULT_THEME).trim();
  return next.length > 0 ? next : DEFAULT_THEME;
}

export function toThemeClassSuffix(theme: string | null | undefined): string {
  return normalizeThemeName(theme)
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "") || DEFAULT_THEME;
}

export function DatagridThemeProvider(props: {
  theme: string;
  portalContainer?: HTMLElement | null;
  children: React.ReactNode;
}) {
  const { theme, portalContainer = null, children } = props;
  return (
    <DatagridThemeContext.Provider
      value={{
        themeName: normalizeThemeName(theme),
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

export function useDatagridPortalContainer(): HTMLElement | null {
  return React.useContext(DatagridThemeContext).portalContainer;
}
