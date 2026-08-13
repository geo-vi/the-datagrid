import type { TypeColumn } from "../types";
import { createXlsxContent, XLSX_MIME_TYPE } from "./xlsx";

/**
 * Formats the built-in toolbar export can write. Adding a format means adding
 * an entry to `RDG_TOOLBAR_EXPORT_FORMATS`; the toolbar menu is generated from
 * that registry.
 *
 * `"xlsx"` needs the optional `xlsx` peer dependency and is therefore not
 * offered by default.
 */
export type RDGToolbarExportFormat = "csv" | "json" | "xlsx";

/** Rows the export reads: the current grid view, or the whole data source. */
export type RDGToolbarExportScope = "view" | "all";

export type RDGToolbarExportTable = {
  /** Header labels, in export order. */
  headers: string[];
  /** Data field names, in export order. */
  fields: string[];
  /**
   * Row-major cell values, already passed through `column.exportValue`.
   *
   * Values keep their JavaScript type. Text formats stringify them; the
   * spreadsheet format maps them onto typed cells.
   */
  rows: unknown[][];
};

/** Options a format may honour, threaded through from the toolbar props. */
export type RDGToolbarExportOptions = {
  /** Excel number format for date cells. */
  dateFormat?: string;
  /** Worksheet name for spreadsheet formats. */
  sheetName?: string;
};

export type RDGToolbarExportFormatDefinition = {
  label: string;
  extension: string;
  mimeType: string;
  /**
   * Builds the file body. Asynchronous so a format can load its writer on
   * demand instead of adding weight to this entry.
   */
  createContent: (
    table: RDGToolbarExportTable,
    options: RDGToolbarExportOptions
  ) => BlobPart | Promise<BlobPart>;
};

const CSV_ROW_SEPARATOR = "\r\n";
const CSV_BYTE_ORDER_MARK = String.fromCharCode(0xfeff);

function getColumnId(column: TypeColumn): string {
  return String(column.id ?? column.name ?? "");
}

/** The row property this column reads. `name` is the data field; `id` is identity. */
function getColumnField(column: TypeColumn): string {
  return String(column.name ?? column.id ?? "");
}

function getColumnLabel(column: TypeColumn): string {
  if (typeof column.header === "string" && column.header.trim()) {
    return column.header;
  }
  if (typeof column.header === "number") return String(column.header);
  return getColumnId(column);
}

/**
 * Export order follows the grid's column order. A column is exported when it
 * is `exportable` (the default) and either visible or explicitly marked
 * `exportWhenHidden`. `exportable: false` always wins.
 */
export function resolveExportColumns(snapshot: {
  columns: readonly TypeColumn[];
  columnOrder: readonly string[];
  columnVisibilityMap: Readonly<Record<string, boolean>>;
}): TypeColumn[] {
  const { columns, columnOrder, columnVisibilityMap } = snapshot;
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

  return ordered.filter((column) => {
    if (column.exportable === false) return false;
    if (!getColumnField(column)) return false;
    if (column.exportWhenHidden) return true;
    return columnVisibilityMap[getColumnId(column)] !== false;
  });
}

function readRowValue(row: unknown, field: string): unknown {
  if (typeof row !== "object" || row == null) return undefined;
  return (row as Record<string, unknown>)[field];
}

/**
 * `column.render` is deliberately ignored: it returns React nodes, which is
 * exactly why `exportValue` exists. A throwing `exportValue` falls back to the
 * raw value instead of failing the whole export.
 */
export function resolveExportValue(column: TypeColumn, row: unknown): unknown {
  const value = readRowValue(row, getColumnField(column));
  if (typeof column.exportValue !== "function") return value;

  try {
    return column.exportValue({ value, data: row, column });
  } catch {
    return value;
  }
}

export function buildExportTable(
  columns: readonly TypeColumn[],
  rows: readonly unknown[]
): RDGToolbarExportTable {
  return {
    headers: columns.map(getColumnLabel),
    fields: columns.map(getColumnField),
    rows: rows.map((row) =>
      columns.map((column) => resolveExportValue(column, row))
    ),
  };
}

function toCsvText(value: unknown): string {
  if (value == null) return "";
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? "" : value.toISOString();
  }
  if (typeof value === "object") return JSON.stringify(value) ?? "";
  return String(value);
}

function escapeCsv(value: unknown): string {
  const text = toCsvText(value);
  if (!/["\n\r,]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

/**
 * RFC 4180 line endings plus a BOM, so spreadsheet apps open the file as UTF-8
 * instead of guessing a local codepage.
 */
export function serializeExportCsv(table: RDGToolbarExportTable): string {
  const lines = [
    table.headers.map(escapeCsv).join(","),
    ...table.rows.map((row) => row.map(escapeCsv).join(",")),
  ];
  return `${CSV_BYTE_ORDER_MARK}${lines.join(CSV_ROW_SEPARATOR)}`;
}

export function serializeExportJson(table: RDGToolbarExportTable): string {
  const records = table.rows.map((row) =>
    Object.fromEntries(
      row.map((value, index) => [
        table.fields[index],
        value === undefined ? null : value,
      ])
    )
  );
  return JSON.stringify(records, null, 2);
}

export const RDG_TOOLBAR_EXPORT_FORMATS: Record<
  RDGToolbarExportFormat,
  RDGToolbarExportFormatDefinition
> = {
  csv: {
    label: "CSV",
    extension: "csv",
    mimeType: "text/csv;charset=utf-8",
    createContent: (table) => serializeExportCsv(table),
  },
  json: {
    label: "JSON",
    extension: "json",
    mimeType: "application/json;charset=utf-8",
    createContent: (table) => serializeExportJson(table),
  },
  xlsx: {
    label: "Excel",
    extension: "xlsx",
    mimeType: XLSX_MIME_TYPE,
    createContent: (table, options) => createXlsxContent(table, options),
  },
};

export const DEFAULT_TOOLBAR_EXPORT_FORMATS: readonly RDGToolbarExportFormat[] =
  ["csv", "json"];

/** Returns the written size in bytes, or 0 when there is no document. */
export function downloadExportFile(
  filename: string,
  content: BlobPart,
  mimeType: string
): number {
  if (typeof document === "undefined" || typeof URL === "undefined") return 0;

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  return blob.size;
}
