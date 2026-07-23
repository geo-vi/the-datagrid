"use client";

import * as React from "react";

import type { TypeColumn } from "../types";
import { useStableId } from "../hooks/useStableId";
import { normalizeThemeName, resolveThemeBase } from "../theme/context";
import { useRDGColumnVisibilitySnapshot } from "./store";

export type RDGColumnVisibilityToolbarProps = {
  children?: React.ReactNode;
  ariaLabel?: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
};

function getColumnId(column: TypeColumn): string {
  return String(column.id ?? column.name ?? "");
}

function getColumnLabel(column: TypeColumn): React.ReactNode {
  if (typeof column.header === "string" && column.header.trim()) {
    return column.header;
  }
  if (typeof column.header === "number") return column.header;
  return getColumnId(column);
}

function orderColumns(
  columns: readonly TypeColumn[],
  columnOrder: readonly string[]
): TypeColumn[] {
  const columnsById = new Map<string, TypeColumn>();
  for (const column of columns) {
    const columnId = getColumnId(column);
    if (columnId && !columnsById.has(columnId)) {
      columnsById.set(columnId, column);
    }
  }

  const ordered: TypeColumn[] = [];
  for (const columnId of columnOrder) {
    const column = columnsById.get(columnId);
    if (!column) continue;
    ordered.push(column);
    columnsById.delete(columnId);
  }
  ordered.push(...columnsById.values());
  return ordered;
}

export function RDGColumnVisibilityToolbar(
  props: RDGColumnVisibilityToolbarProps
): React.ReactElement {
  const {
    children,
    ariaLabel = "Visible column toggles",
    title = "Visible columns",
    description = "Choose which columns are visible in the grid.",
  } = props;
  const titleId = useStableId("tdg-column-visibility-title");
  const descriptionId = useStableId("tdg-column-visibility-description");
  const snapshot = useRDGColumnVisibilitySnapshot();
  const theme = normalizeThemeName(snapshot.theme);
  const themeBase = resolveThemeBase(theme);
  const orderedColumns = React.useMemo(
    () => orderColumns(snapshot.columns, snapshot.columnOrder),
    [snapshot.columnOrder, snapshot.columns]
  );
  const toggleColumns = React.useMemo(
    () => orderedColumns.filter((column) => column.hideable !== false),
    [orderedColumns]
  );
  const visibleColumnCount = orderedColumns.reduce(
    (count, column) =>
      count +
      (snapshot.columnVisibilityMap[getColumnId(column)] === false ? 0 : 1),
    0
  );

  return (
    <div
      className="tdg-column-visibility-root flex flex-col gap-3 rounded-xl border bg-card/60 p-3 text-foreground shadow-sm"
      data-slot="rdg-column-visibility"
      data-theme={theme}
      data-theme-base={themeBase}
      role={title != null ? "region" : undefined}
      aria-labelledby={title != null ? titleId : undefined}
      aria-describedby={description != null ? descriptionId : undefined}
    >
      {title != null || description != null ? (
        <div className="flex flex-col gap-1">
          {title != null ? (
            <div
              id={titleId}
              className="text-sm font-medium"
              role="heading"
              aria-level={2}
            >
              {title}
            </div>
          ) : null}
          {description != null ? (
            <div id={descriptionId} className="text-xs text-muted-foreground">
              {description}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div
          className="flex max-w-full flex-wrap gap-2"
          role="group"
          aria-label={ariaLabel}
          aria-describedby={description != null ? descriptionId : undefined}
          data-slot="rdg-column-toggle-list"
        >
          {toggleColumns.map((column) => {
            const columnId = getColumnId(column);
            const visible = snapshot.columnVisibilityMap[columnId] !== false;
            const disabled = visible && visibleColumnCount <= 1;

            return (
              <button
                key={columnId}
                type="button"
                className="inline-flex h-8 shrink-0 items-center justify-center rounded-md border px-3 text-sm font-medium whitespace-nowrap transition-colors outline-none hover:bg-accent hover:text-accent-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 data-[state=on]:border-transparent data-[state=on]:bg-secondary data-[state=on]:text-secondary-foreground"
                aria-pressed={visible}
                disabled={disabled}
                data-state={visible ? "on" : "off"}
                data-slot="rdg-column-toggle"
                data-column-id={columnId}
                onClick={() => snapshot.setColumnVisible(columnId, !visible)}
              >
                {getColumnLabel(column)}
              </button>
            );
          })}
        </div>

        {children != null ? (
          <div
            className="flex shrink-0 flex-wrap items-center gap-2"
            data-slot="rdg-column-visibility-actions"
          >
            {children}
          </div>
        ) : null}
      </div>
    </div>
  );
}
