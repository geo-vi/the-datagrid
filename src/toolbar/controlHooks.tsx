"use client";

import * as React from "react";

import type { TypeColumn } from "../types";
import { normalizeThemeName, resolveThemeBase } from "../theme/context";
import { getColumnId, orderColumns } from "./columns";
import { getCoreMenuRuntime } from "./runtime";
import { useRDGToolbarSnapshot } from "./store";

/**
 * The theme attributes and portal host every toolbar surface needs. Menus
 * portal into the surface's own node rather than the document body, because
 * `toolbar.css` is scoped to it and a menu anywhere else renders unstyled. The
 * node is not a clipping ancestor and the menu positions itself fixed, so this
 * costs none of what portalling is for.
 */
export function useToolbarSurfaceRoot(): {
  rootProps: {
    ref: (node: HTMLDivElement | null) => void;
    "data-theme": string;
    "data-theme-base": string;
  };
  wrap: (children: React.ReactNode) => React.ReactElement;
} {
  const menu = getCoreMenuRuntime();
  const [portalContainer, setPortalContainer] =
    React.useState<HTMLDivElement | null>(null);
  const snapshot = useRDGToolbarSnapshot();
  const theme = normalizeThemeName(snapshot.theme);
  const themeBase = resolveThemeBase(theme);
  const attach = React.useCallback((node: HTMLDivElement | null) => {
    setPortalContainer(node);
  }, []);

  return {
    rootProps: {
      ref: attach,
      "data-theme": theme,
      "data-theme-base": themeBase,
    },
    wrap: (children) => (
      <menu.ThemeProvider
        theme={theme}
        themeBase={themeBase}
        portalContainer={portalContainer}
      >
        {children}
      </menu.ThemeProvider>
    ),
  };
}

type ColumnToggleItem = {
  columnId: string;
  disabled: boolean;
  label: React.ReactNode;
  onToggle: () => void;
  visible: boolean;
};

function getColumnLabel(column: TypeColumn): React.ReactNode {
  if (typeof column.header === "string" && column.header.trim()) {
    return column.header;
  }
  if (typeof column.header === "number") return column.header;
  return getColumnId(column);
}

/**
 * One entry per hideable column, in the grid's own column order. The last
 * visible column is disabled rather than hidden, so a grid cannot be emptied.
 */
export function useRDGColumnToggleItems(): readonly ColumnToggleItem[] {
  const snapshot = useRDGToolbarSnapshot();
  const orderedColumns = React.useMemo(
    () => orderColumns(snapshot.columns, snapshot.columnOrder),
    [snapshot.columnOrder, snapshot.columns]
  );
  const visibleColumnCount = orderedColumns.reduce(
    (count, column) =>
      count +
      (snapshot.columnVisibilityMap[getColumnId(column)] === false ? 0 : 1),
    0
  );

  return orderedColumns
    .filter((column) => column.hideable !== false)
    .map((column) => {
      const columnId = getColumnId(column);
      const visible = snapshot.columnVisibilityMap[columnId] !== false;

      return {
        columnId,
        disabled: visible && visibleColumnCount <= 1,
        label: getColumnLabel(column),
        onToggle: () => snapshot.setColumnVisible(columnId, !visible),
        visible,
      };
    });
}
