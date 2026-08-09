import type { TypeColumn } from "../../types";
import { getColumnId } from "../../utils/column";
import { clamp, estimateAutoWidth } from "../../utils/helpers";

export function getColumnHeaderText(
  column: TypeColumn,
  skipHeaderOnAutoSize: boolean
): string {
  if (skipHeaderOnAutoSize) return "";
  if (typeof column.header === "string") return column.header;
  if (typeof column.name === "string") return column.name;
  if (typeof column.id === "string") return column.id;
  return "";
}

export function getKnownTextColumnHeader(column: TypeColumn): string {
  if (
    typeof (column as { renderHeader?: unknown }).renderHeader === "function"
  ) {
    return "";
  }
  if (typeof column.header === "string") return column.header;
  if (column.header != null) return "";
  if (typeof column.name === "string") return column.name;
  if (typeof column.id === "string") return column.id;
  return "";
}

export function getColumnWidthBounds(
  column: TypeColumn,
  defaultMinWidth = 40,
  defaultMaxWidth: number | null = null
): {
  minWidth: number;
  maxWidth: number;
} {
  const minWidth =
    typeof column.minWidth === "number" &&
    Number.isFinite(column.minWidth) &&
    column.minWidth >= 0
      ? column.minWidth
      : defaultMinWidth;
  const normalizedDefaultMaxWidth =
    typeof defaultMaxWidth === "number" &&
    Number.isFinite(defaultMaxWidth) &&
    defaultMaxWidth >= minWidth
      ? defaultMaxWidth
      : Number.MAX_SAFE_INTEGER;
  const maxWidth =
    typeof column.maxWidth === "number" &&
    Number.isFinite(column.maxWidth) &&
    column.maxWidth > 0
      ? Math.max(minWidth, column.maxWidth)
      : normalizedDefaultMaxWidth;

  return { minWidth, maxWidth };
}

export function estimateColumnContentWidth(args: {
  column: TypeColumn;
  rows: any[];
  skipHeaderOnAutoSize: boolean;
  columnMinWidth?: number;
  columnMaxWidth?: number | null;
}): number {
  const { column, rows, skipHeaderOnAutoSize, columnMinWidth, columnMaxWidth } =
    args;
  const columnId = getColumnId(column);
  const { minWidth, maxWidth } = getColumnWidthBounds(
    column,
    columnMinWidth,
    columnMaxWidth
  );
  const header = getColumnHeaderText(column, skipHeaderOnAutoSize);
  const values = rows.map((row) => (row as any)?.[columnId]);

  return clamp(estimateAutoWidth({ header, values }), minWidth, maxWidth);
}

export function resolveBaseColumnWidth(args: {
  column: TypeColumn;
  rows: any[];
  enableColumnAutosize: boolean;
  skipHeaderOnAutoSize: boolean;
  columnDefaultWidth: number;
  columnMinWidth: number;
  columnMaxWidth: number | null;
}): number {
  const {
    column,
    rows,
    enableColumnAutosize,
    skipHeaderOnAutoSize,
    columnDefaultWidth,
    columnMinWidth,
    columnMaxWidth,
  } = args;
  const explicit = column.width ?? column.defaultWidth;
  const { minWidth, maxWidth } = getColumnWidthBounds(
    column,
    columnMinWidth,
    columnMaxWidth
  );

  if (
    typeof explicit === "number" &&
    Number.isFinite(explicit) &&
    explicit > 0
  ) {
    return clamp(explicit, minWidth, maxWidth);
  }

  if (enableColumnAutosize) {
    return estimateColumnContentWidth({
      column,
      rows,
      skipHeaderOnAutoSize,
      columnMinWidth,
      columnMaxWidth,
    });
  }

  return clamp(columnDefaultWidth, minWidth, maxWidth);
}

export function ensureLastColumnHeaderFits(args: {
  column: TypeColumn;
  baseWidth: number;
  showColumnMenuTool: boolean;
  columnMinWidth: number;
  columnMaxWidth: number | null;
}): number {
  const {
    column,
    baseWidth,
    showColumnMenuTool,
    columnMinWidth,
    columnMaxWidth,
  } = args;
  const header = getKnownTextColumnHeader(column);
  if (!header) return baseWidth;

  const { minWidth, maxWidth } = getColumnWidthBounds(
    column,
    columnMinWidth,
    columnMaxWidth
  );
  const sortControlWidth = column.sortable === false ? 0 : 24;
  const menuControlWidth = showColumnMenuTool ? 36 : 0;
  const headerWidth =
    estimateAutoWidth({ header, values: [] }) +
    sortControlWidth +
    menuControlWidth;

  return clamp(Math.max(baseWidth, headerWidth), minWidth, maxWidth);
}
