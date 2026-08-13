"use client";

import * as React from "react";

import type { TypeColumn } from "../types";
import { useStableId } from "../hooks/useStableId";
import { ExportIcon, FilterIcon, FilterOffIcon, ResetIcon } from "./icons";
import { normalizeThemeName, resolveThemeBase } from "../theme/context";
import {
  buildExportTable,
  DEFAULT_TOOLBAR_EXPORT_FORMATS,
  downloadExportFile,
  RDG_TOOLBAR_EXPORT_FORMATS,
  resolveExportColumns,
  type RDGToolbarExportFormat,
  type RDGToolbarExportScope,
} from "./export";
import { DEFAULT_XLSX_DATE_FORMAT } from "./xlsx";
import { useRDGToolbarSnapshot } from "./store";

export type RDGToolbarLabels = {
  export: string;
  showFilters: string;
  hideFilters: string;
  clearFilters: string;
};

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

export type RDGToolbarProps = {
  children?: React.ReactNode;
  ariaLabel?: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** Column visibility toggles. */
  showColumnToggles?: boolean;
  /** Downloads the grid's rows in one of `exportFormats`. */
  showExport?: boolean;
  /** Shows or hides the grid's filter row. */
  showFilterToggle?: boolean;
  /** Clears every column filter value. */
  showClearFilters?: boolean;
  /** `"view"` exports the filtered, searched and sorted rows; `"all"` the whole data source. */
  exportScope?: RDGToolbarExportScope;
  /**
   * Formats offered by the export control, in menu order. `"xlsx"` needs the
   * optional `xlsx` peer dependency installed.
   */
  exportFormats?: readonly RDGToolbarExportFormat[];
  /**
   * Downloaded file name without extension. A function is called per export, so
   * a name that embeds the date or the chosen format stays accurate.
   */
  exportFileName?: string | ((info: RDGToolbarExportInfo) => string);
  /** Excel number format for date cells in spreadsheet exports. */
  exportDateFormat?: string;
  /** Worksheet name for spreadsheet exports. Defaults to the file name. */
  exportSheetName?: string;
  /** Called after an export has been handed to the browser. */
  onExportSuccess?: (result: RDGToolbarExportResult) => void;
  /** Called when an export fails, e.g. when the xlsx peer is missing. */
  onExportError?: (error: unknown) => void;
  labels?: Partial<RDGToolbarLabels>;
  /** Appended to the toolbar root's class list, for scoped consumer styling. */
  className?: string;
};

const DEFAULT_LABELS: RDGToolbarLabels = {
  export: "Export",
  showFilters: "Show filters",
  hideFilters: "Hide filters",
  clearFilters: "Clear filters",
};

const CONTROLLED_FILTERING_HINT =
  "The grid owns its filter row through the enableFiltering prop.";

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

export function RDGToolbar(props: RDGToolbarProps): React.ReactElement {
  const {
    children,
    ariaLabel = "Visible column toggles",
    title = "Visible columns",
    description = "Choose which columns are visible in the grid.",
    showColumnToggles = true,
    showExport = false,
    showFilterToggle = false,
    showClearFilters = false,
    exportScope = "view",
    exportFormats = DEFAULT_TOOLBAR_EXPORT_FORMATS,
    exportFileName = "grid-export",
    exportDateFormat = DEFAULT_XLSX_DATE_FORMAT,
    exportSheetName,
    onExportSuccess,
    onExportError,
    labels,
    className,
  } = props;
  const [exporting, setExporting] = React.useState(false);
  const titleId = useStableId("tdg-toolbar-title");
  const descriptionId = useStableId("tdg-toolbar-description");
  const snapshot = useRDGToolbarSnapshot();
  const theme = normalizeThemeName(snapshot.theme);
  const themeBase = resolveThemeBase(theme);
  const resolvedLabels = React.useMemo(
    () => ({ ...DEFAULT_LABELS, ...labels }),
    [labels]
  );
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

  const availableFormats = React.useMemo(
    () =>
      exportFormats.filter(
        (format) => RDG_TOOLBAR_EXPORT_FORMATS[format] != null
      ),
    [exportFormats]
  );
  const exportColumnCount = React.useMemo(
    () => (showExport ? resolveExportColumns(snapshot).length : 0),
    [showExport, snapshot]
  );
  const exportDisabled =
    exportColumnCount === 0 || availableFormats.length === 0;

  const runExport = React.useCallback(
    async (format: RDGToolbarExportFormat) => {
      const definition = RDG_TOOLBAR_EXPORT_FORMATS[format];
      if (!definition) return;

      const columns = resolveExportColumns(snapshot);
      if (columns.length === 0) return;

      const rows =
        exportScope === "all" ? snapshot.getAllRows() : snapshot.getViewRows();
      const table = buildExportTable(columns, rows);
      const info: RDGToolbarExportInfo = {
        format,
        scope: exportScope,
        rowCount: table.rows.length,
        columnCount: table.headers.length,
      };
      const name =
        typeof exportFileName === "function"
          ? exportFileName(info)
          : exportFileName;

      setExporting(true);
      try {
        // A format may load its writer on demand, so this can suspend.
        const content = await definition.createContent(table, {
          dateFormat: exportDateFormat,
          sheetName: exportSheetName ?? name,
        });

        const fileName = `${name}.${definition.extension}`;
        const byteLength = downloadExportFile(
          fileName,
          content,
          definition.mimeType
        );

        onExportSuccess?.({ ...info, fileName, byteLength });
      } catch (error) {
        onExportError?.(error);
        if (!onExportError) console.error(error);
      } finally {
        setExporting(false);
      }
    },
    [
      exportDateFormat,
      exportFileName,
      exportScope,
      exportSheetName,
      onExportError,
      onExportSuccess,
      snapshot,
    ]
  );

  return (
    <div
      className={
        className ? `tdg-toolbar-root ${className}` : "tdg-toolbar-root"
      }
      data-slot="rdg-toolbar"
      data-theme={theme}
      data-theme-base={themeBase}
      role={title != null ? "region" : undefined}
      aria-labelledby={title != null ? titleId : undefined}
      aria-describedby={description != null ? descriptionId : undefined}
    >
      {title != null || description != null ? (
        <div data-slot="rdg-toolbar-heading">
          {title != null ? (
            <div
              id={titleId}
              data-slot="rdg-toolbar-title"
              role="heading"
              aria-level={2}
            >
              {title}
            </div>
          ) : null}
          {description != null ? (
            <div id={descriptionId} data-slot="rdg-toolbar-description">
              {description}
            </div>
          ) : null}
        </div>
      ) : null}

      <div data-slot="rdg-toolbar-body">
        {showColumnToggles ? (
          <div
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
        ) : null}

        {showExport ||
        showFilterToggle ||
        showClearFilters ||
        children != null ? (
          <div data-slot="rdg-toolbar-actions">
            {showExport ? (
              <ExportControl
                disabled={exportDisabled || exporting}
                formats={availableFormats}
                label={resolvedLabels.export}
                onExport={runExport}
              />
            ) : null}

            {showFilterToggle ? (
              <button
                type="button"
                aria-pressed={snapshot.filteringEnabled}
                data-state={snapshot.filteringEnabled ? "on" : "off"}
                data-slot="rdg-toolbar-filter-toggle"
                disabled={!snapshot.canToggleFiltering}
                title={
                  snapshot.canToggleFiltering
                    ? undefined
                    : CONTROLLED_FILTERING_HINT
                }
                onClick={() =>
                  snapshot.setFilteringEnabled(!snapshot.filteringEnabled)
                }
              >
                {snapshot.filteringEnabled ? <FilterOffIcon /> : <FilterIcon />}
                {snapshot.filteringEnabled
                  ? resolvedLabels.hideFilters
                  : resolvedLabels.showFilters}
              </button>
            ) : null}

            {showClearFilters ? (
              <button
                type="button"
                data-slot="rdg-toolbar-clear-filters"
                disabled={!snapshot.filtered}
                onClick={() => snapshot.clearAllFilters()}
              >
                <ResetIcon />
                {resolvedLabels.clearFilters}
              </button>
            ) : null}

            {children}
          </div>
        ) : null}
      </div>
    </div>
  );
}

type ExportControlProps = {
  disabled: boolean;
  formats: readonly RDGToolbarExportFormat[];
  label: string;
  onExport: (format: RDGToolbarExportFormat) => void | Promise<void>;
};

/**
 * A dependency-free format menu. The optional entry stays inside its bundle
 * boundary, so this deliberately does not reach for a popover library.
 */
function ExportControl(props: ExportControlProps): React.ReactElement {
  const { disabled, formats, label, onExport } = props;
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const menuId = useStableId("tdg-toolbar-export-menu");
  const singleFormat = formats.length === 1 ? formats[0] : null;

  React.useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent | MouseEvent) => {
      const container = containerRef.current;
      if (container && !container.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", onPointerDown, true);
    return () =>
      document.removeEventListener("pointerdown", onPointerDown, true);
  }, [open]);

  const closeAndRestoreFocus = React.useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  const moveFocus = (from: HTMLElement, delta: number) => {
    const items = Array.from(
      containerRef.current?.querySelectorAll<HTMLButtonElement>(
        '[data-slot="rdg-toolbar-export-format"]'
      ) ?? []
    );
    if (items.length === 0) return;
    const currentIndex = items.indexOf(from as HTMLButtonElement);
    const nextIndex =
      currentIndex < 0
        ? 0
        : (currentIndex + delta + items.length) % items.length;
    items[nextIndex]?.focus();
  };

  if (singleFormat) {
    return (
      <button
        type="button"
        data-slot="rdg-toolbar-export"
        data-export-format={singleFormat}
        disabled={disabled}
        onClick={() => {
          void onExport(singleFormat);
        }}
      >
        <ExportIcon />
        {`${label} ${RDG_TOOLBAR_EXPORT_FORMATS[singleFormat].label}`}
      </button>
    );
  }

  return (
    <div data-slot="rdg-toolbar-export-wrapper" ref={containerRef}>
      <button
        type="button"
        ref={triggerRef}
        data-slot="rdg-toolbar-export"
        data-state={open ? "on" : "off"}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <ExportIcon />
        {label}
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label={label}
          data-slot="rdg-toolbar-export-menu"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.stopPropagation();
              closeAndRestoreFocus();
              return;
            }
            if (event.key === "ArrowDown") {
              event.preventDefault();
              moveFocus(event.target as HTMLElement, 1);
              return;
            }
            if (event.key === "ArrowUp") {
              event.preventDefault();
              moveFocus(event.target as HTMLElement, -1);
            }
          }}
        >
          {formats.map((format, index) => (
            <button
              key={format}
              type="button"
              role="menuitem"
              autoFocus={index === 0}
              data-slot="rdg-toolbar-export-format"
              data-export-format={format}
              onClick={() => {
                closeAndRestoreFocus();
                void onExport(format);
              }}
            >
              {RDG_TOOLBAR_EXPORT_FORMATS[format].label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
