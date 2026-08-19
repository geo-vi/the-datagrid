"use client";

import * as React from "react";

import type { TypeColumn } from "../types";
import { useStableId } from "../hooks/useStableId";
import { ExportIcon, FilterIcon, FilterOffIcon, ResetIcon } from "./icons";
import { normalizeThemeName, resolveThemeBase } from "../theme/context";
import { getColumnId, orderColumns } from "./columns";
import {
  DEFAULT_TOOLBAR_EXPORT_FORMATS,
  mergeExportSettings,
  performExport,
  RDG_TOOLBAR_EXPORT_FORMATS,
  resolveExportColumns,
  type RDGToolbarExportFormat,
  type RDGToolbarExportInfo,
  type RDGToolbarExportResult,
  type RDGToolbarExportScope,
} from "./export";
import { useRDGToolbarSnapshot, useRDGToolbarStore } from "./store";

// Declared in ./export, where the shared export path can reach them.
export type { RDGToolbarExportInfo, RDGToolbarExportResult };

/**
 * Every string the toolbar renders itself. Values are `ReactNode`, so a
 * translation helper that returns an element works as well as one that returns
 * a string; `filteringControlledHint` is the exception and is noted below.
 *
 * The four button labels are required, because a toolbar that renders a button
 * needs a word for it. The rest refine text that already reads correctly on its
 * own, so translating the buttons does not oblige you to name a format map you
 * have no opinion about.
 */
export type RDGToolbarLabels = {
  export: React.ReactNode;
  showFilters: React.ReactNode;
  hideFilters: React.ReactNode;
  clearFilters: React.ReactNode;
  /**
   * Export menu entry per format, defaulting to the format's own name. Naming
   * one format leaves the rest untouched: `{ xlsx: t("excel") }`.
   */
  exportFormats?: Partial<Record<RDGToolbarExportFormat, React.ReactNode>>;
  /**
   * Whole text of the export button when `exportFormats` offers exactly one
   * format. The default joins `export` and the format name in that fixed order
   * ("Export CSV"), which no translation file can reorder - set this where the
   * verb trails the noun, as in "CSV exportieren".
   */
  exportSingle?: Partial<Record<RDGToolbarExportFormat, React.ReactNode>>;
  /**
   * Tooltip on a filter toggle the grid owns through its own `enableFiltering`
   * prop. Stays a `string`: it renders as a `title` attribute.
   */
  filteringControlledHint?: string;
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

// Required, so a label added to the type above must be given a default here
// rather than silently resolving to undefined at the point it is rendered.
const DEFAULT_LABELS: Required<RDGToolbarLabels> = {
  export: "Export",
  showFilters: "Show filters",
  hideFilters: "Hide filters",
  clearFilters: "Clear filters",
  exportFormats: {},
  exportSingle: {},
  filteringControlledHint:
    "The grid owns its filter row through the enableFiltering prop.",
};

function getColumnLabel(column: TypeColumn): React.ReactNode {
  if (typeof column.header === "string" && column.header.trim()) {
    return column.header;
  }
  if (typeof column.header === "number") return column.header;
  return getColumnId(column);
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
    // No literal defaults here: one would be indistinguishable from a passed
    // value and would outrank the provider's `exportDefaults`.
    exportScope,
    exportFormats = DEFAULT_TOOLBAR_EXPORT_FORMATS,
    exportFileName,
    exportDateFormat,
    exportSheetName,
    onExportSuccess,
    onExportError,
    labels,
    className,
  } = props;
  const [exporting, setExporting] = React.useState(false);
  const store = useRDGToolbarStore();
  const titleId = useStableId("tdg-toolbar-title");
  const descriptionId = useStableId("tdg-toolbar-description");
  const snapshot = useRDGToolbarSnapshot();
  const theme = normalizeThemeName(snapshot.theme);
  const themeBase = resolveThemeBase(theme);
  const resolvedLabels = React.useMemo<Required<RDGToolbarLabels>>(
    () => ({
      ...DEFAULT_LABELS,
      ...labels,
      // A caller passing `exportFormats: undefined` out of a conditional would
      // otherwise defeat the spread and leave the lookups below without a map.
      exportFormats: labels?.exportFormats ?? DEFAULT_LABELS.exportFormats,
      exportSingle: labels?.exportSingle ?? DEFAULT_LABELS.exportSingle,
      filteringControlledHint:
        labels?.filteringControlledHint ??
        DEFAULT_LABELS.filteringControlledHint,
    }),
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
      setExporting(true);
      try {
        // Read now, not at render: the provider sets its defaults in an effect.
        const result = await performExport(
          snapshot,
          format,
          mergeExportSettings(
            {
              scope: exportScope,
              fileName: exportFileName,
              dateFormat: exportDateFormat,
              sheetName: exportSheetName,
            },
            store.getExportDefaults()
          )
        );

        if (result) onExportSuccess?.(result);
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
      store,
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
                formatLabels={resolvedLabels.exportFormats}
                singleLabels={resolvedLabels.exportSingle}
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
                    : resolvedLabels.filteringControlledHint
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
  label: React.ReactNode;
  formatLabels: Partial<Record<RDGToolbarExportFormat, React.ReactNode>>;
  singleLabels: Partial<Record<RDGToolbarExportFormat, React.ReactNode>>;
  onExport: (format: RDGToolbarExportFormat) => void | Promise<void>;
};

/**
 * A dependency-free format menu. The optional entry stays inside its bundle
 * boundary, so this deliberately does not reach for a popover library.
 */
function ExportControl(props: ExportControlProps): React.ReactElement {
  const { disabled, formats, label, formatLabels, singleLabels, onExport } =
    props;
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const menuId = useStableId("tdg-toolbar-export-menu");
  const triggerId = useStableId("tdg-toolbar-export-trigger");
  const singleFormat = formats.length === 1 ? formats[0] : null;
  const formatLabel = (format: RDGToolbarExportFormat): React.ReactNode =>
    formatLabels[format] ?? RDG_TOOLBAR_EXPORT_FORMATS[format].label;

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
        {singleLabels[singleFormat] ?? (
          <>
            {label} {formatLabel(singleFormat)}
          </>
        )}
      </button>
    );
  }

  return (
    <div data-slot="rdg-toolbar-export-wrapper" ref={containerRef}>
      <button
        type="button"
        ref={triggerRef}
        id={triggerId}
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
          // Names the menu after the trigger's own text rather than a second
          // copy of it, so a translated (or element) label needs no string form.
          aria-labelledby={triggerId}
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
              {formatLabel(format)}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
