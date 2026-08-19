import type { TypeColumn } from "../types";
import {
  createXlsxContent,
  DEFAULT_XLSX_DATE_FORMAT,
  XLSX_MIME_TYPE,
} from "./xlsx";

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

/** Describes one export, for `exportFileName` callbacks. */
export type RDGToolbarExportInfo = {
  format: RDGToolbarExportFormat;
  scope: RDGToolbarExportScope;
  rowCount: number;
  columnCount: number;
};

/** Describes a finished export, for `onExportSuccess`. */
export type RDGToolbarExportResult = RDGToolbarExportInfo & {
  /** File name the browser was given, including the extension. */
  fileName: string;
  /** Size of the written file in bytes. */
  byteLength: number;
};

/**
 * Everything an export needs beyond the format. Wherever the export is
 * triggered from, the layers resolve most specific first: one export's own
 * settings, then the `RDGToolbar` prop, then the provider's `exportDefaults`,
 * then the fallbacks below.
 */
export type RDGToolbarExportSettings = {
  /** `"view"` exports the filtered, searched and sorted rows; `"all"` the whole data source. */
  scope?: RDGToolbarExportScope;
  /**
   * Downloaded file name without extension. A function is called per export, so
   * a name that embeds the date or the chosen format stays accurate.
   */
  fileName?: string | ((info: RDGToolbarExportInfo) => string);
  /** Excel number format for date cells in spreadsheet exports. */
  dateFormat?: string;
  /** Worksheet name for spreadsheet exports. Defaults to the file name. */
  sheetName?: string;
};

export const DEFAULT_EXPORT_FILE_NAME = "grid-export";
export const DEFAULT_EXPORT_SCOPE: RDGToolbarExportScope = "view";

/** The subset of the toolbar snapshot an export reads. */
export type RDGToolbarExportSource = {
  columns: readonly TypeColumn[];
  columnOrder: readonly string[];
  columnVisibilityMap: Readonly<Record<string, boolean>>;
  getViewRows: () => readonly unknown[];
  getAllRows: () => readonly unknown[];
};

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

/**
 * Folds the settings layers into one, most specific first. A layer that omits a
 * field defers to the next, per field rather than wholesale.
 */
export function mergeExportSettings(
  ...layers: readonly (RDGToolbarExportSettings | undefined)[]
): RDGToolbarExportSettings {
  const merged: RDGToolbarExportSettings = {};
  for (const layer of layers) {
    if (!layer) continue;
    merged.scope ??= layer.scope;
    merged.fileName ??= layer.fileName;
    merged.dateFormat ??= layer.dateFormat;
    merged.sheetName ??= layer.sheetName;
  }
  return merged;
}

/**
 * Writes one export and hands it to the browser. The single path behind both
 * the toolbar's button and the imperative API.
 *
 * Returns `null` when there is nothing to write: an unknown format, or no
 * exportable column - which is also a snapshot with no grid attached. A failing
 * writer rejects rather than no-opping, so the caller can report it.
 */
export async function performExport(
  source: RDGToolbarExportSource,
  format: RDGToolbarExportFormat,
  settings: RDGToolbarExportSettings = {}
): Promise<RDGToolbarExportResult | null> {
  const definition = RDG_TOOLBAR_EXPORT_FORMATS[format];
  if (!definition) return null;

  const columns = resolveExportColumns(source);
  if (columns.length === 0) return null;

  const scope = settings.scope ?? DEFAULT_EXPORT_SCOPE;
  const rows = scope === "all" ? source.getAllRows() : source.getViewRows();
  const table = buildExportTable(columns, rows);
  const info: RDGToolbarExportInfo = {
    format,
    scope,
    rowCount: table.rows.length,
    columnCount: table.headers.length,
  };
  const name =
    typeof settings.fileName === "function"
      ? settings.fileName(info)
      : (settings.fileName ?? DEFAULT_EXPORT_FILE_NAME);

  // A format may load its writer on demand, so this can suspend.
  const content = await definition.createContent(table, {
    dateFormat: settings.dateFormat ?? DEFAULT_XLSX_DATE_FORMAT,
    sheetName: settings.sheetName ?? name,
  });

  const fileName = `${name}.${definition.extension}`;
  const byteLength = downloadExportFile(fileName, content, definition.mimeType);

  return { ...info, fileName, byteLength };
}
