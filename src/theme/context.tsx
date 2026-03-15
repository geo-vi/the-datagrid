/* eslint-disable react-refresh/only-export-components */
import * as React from "react";

const DEFAULT_THEME = "default";

const DatagridThemeContext = React.createContext<string>(DEFAULT_THEME);

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
  children: React.ReactNode;
}) {
  const { theme, children } = props;
  return (
    <DatagridThemeContext.Provider value={normalizeThemeName(theme)}>
      {children}
    </DatagridThemeContext.Provider>
  );
}

export function useDatagridThemeName(): string {
  return React.useContext(DatagridThemeContext);
}
