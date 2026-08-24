"use client";

import * as React from "react";

import type { TypeColumn } from "../types";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { useStableId } from "../hooks/useStableId";
import {
  ChevronDownIcon,
  ColumnsIcon,
  ExportIcon,
  FilterIcon,
  FilterOffIcon,
  ResetIcon,
  ToolbarSettingsIcon,
} from "./icons";
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
import { getCoreMenuRuntime } from "./runtime";
import { useRDGToolbarSnapshot, useRDGToolbarStore } from "./store";

// Declared in ./export, where the shared export path can reach them.
export type { RDGToolbarExportInfo, RDGToolbarExportResult };

/**
 * Every string the toolbar renders itself. Values are `ReactNode`, so a
 * translation helper that returns an element works as well as one that returns
 * a string; `filteringControlledHint` is the exception and is noted below.
 *
 * The four always-available action labels are required, because a toolbar that
 * renders one of those buttons needs a word for it. The compact disclosure,
 * column-menu and format labels refine opt-in controls, so existing translation
 * objects remain valid when a consumer enables none of those features.
 */
export type RDGToolbarLabels = {
  export: React.ReactNode;
  showFilters: React.ReactNode;
  hideFilters: React.ReactNode;
  clearFilters: React.ReactNode;
  /** Trigger text for the compact column visibility dropdown. */
  columns?: React.ReactNode;
  showToolbar?: React.ReactNode;
  hideToolbar?: React.ReactNode;
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
  /** Collapses the complete toolbar surface behind one right-aligned button. */
  collapsible?: boolean;
  /** Column visibility toggles. */
  showColumnToggles?: boolean;
  /** Replaces the inline column toggles with one dropdown menu. */
  toolbarCollapsedColumnToggles?: boolean;
  /** Keeps inline column toggles at mobile widths instead of auto-collapsing them. */
  disableMobileAutoToolbarCollapsedColumns?: boolean;
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
  columns: "Columns",
  showToolbar: "Columns and filters",
  hideToolbar: "Hide columns and filters",
  exportFormats: {},
  exportSingle: {},
  filteringControlledHint:
    "The grid owns its filter row through the enableFiltering prop.",
};

/** Keeps an open menu clear of the edges it is measured against. */
const MENU_VIEWPORT_MARGIN = 8;

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
    collapsible = false,
    showColumnToggles = true,
    toolbarCollapsedColumnToggles = false,
    disableMobileAutoToolbarCollapsedColumns = false,
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
  const menu = getCoreMenuRuntime();
  /*
   * Menus portal into the toolbar's own root rather than the document body:
   * `toolbar.css` is scoped to that root, so a menu anywhere else would render
   * unstyled. The root is not a clipping ancestor, and the menu positions
   * itself fixed, so this costs none of what portalling is for.
   */
  const [portalContainer, setPortalContainer] =
    React.useState<HTMLDivElement | null>(null);
  const attachRoot = React.useCallback((node: HTMLDivElement | null) => {
    setPortalContainer(node);
  }, []);
  const store = useRDGToolbarStore();
  const titleId = useStableId("tdg-toolbar-title");
  const descriptionId = useStableId("tdg-toolbar-description");
  const collapsiblePanelId = useStableId("tdg-toolbar-collapsible-panel");
  const [expanded, setExpanded] = React.useState(false);
  const isMobileViewport = useMediaQuery("(max-width: 1024px)");
  const columnTogglesCollapsed =
    toolbarCollapsedColumnToggles ||
    (isMobileViewport && !disableMobileAutoToolbarCollapsedColumns);
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
  const columnToggleItems = toggleColumns.map((column) => {
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

  const toolbarHeading =
    title != null || description != null ? (
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
    ) : null;

  /*
   * The dropdown is one control, so it belongs with the other controls rather
   * than in the leading slot the inline toggle list occupies: on a narrow
   * toolbar a lone `Columns` button on its own row would otherwise sit a full
   * body gap below a single action button. The inline list still leads,
   * because it wraps to several rows and would push the actions far down.
   */
  const collapsedColumnToggles =
    showColumnToggles && columnTogglesCollapsed ? (
      <ColumnToggleDropdown
        ariaLabel={ariaLabel}
        descriptionId={description != null ? descriptionId : undefined}
        items={columnToggleItems}
        label={resolvedLabels.columns}
      />
    ) : null;

  const toolbarBody = (
    <div
      data-slot="rdg-toolbar-body"
      data-leading={
        showColumnToggles && !columnTogglesCollapsed ? "toggles" : "none"
      }
    >
      {showColumnToggles && !columnTogglesCollapsed ? (
        <div
          role="group"
          aria-label={ariaLabel}
          aria-describedby={description != null ? descriptionId : undefined}
          data-slot="rdg-column-toggle-list"
        >
          {columnToggleItems.map((item) => (
            <button
              key={item.columnId}
              type="button"
              aria-pressed={item.visible}
              disabled={item.disabled}
              data-state={item.visible ? "on" : "off"}
              data-slot="rdg-column-toggle"
              data-column-id={item.columnId}
              onClick={item.onToggle}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}

      {collapsedColumnToggles != null ||
      showExport ||
      showFilterToggle ||
      showClearFilters ||
      children != null ? (
        <div data-slot="rdg-toolbar-actions">
          {collapsedColumnToggles}

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
  );

  const toolbarContent = (
    <>
      {toolbarHeading}
      {toolbarBody}
    </>
  );

  return (
    <div
      ref={attachRoot}
      className={
        className ? `tdg-toolbar-root ${className}` : "tdg-toolbar-root"
      }
      data-slot="rdg-toolbar"
      data-collapsible={collapsible ? "true" : undefined}
      data-state={collapsible ? (expanded ? "open" : "closed") : undefined}
      data-theme={theme}
      data-theme-base={themeBase}
      role={title != null ? "region" : undefined}
      aria-labelledby={title != null ? titleId : undefined}
      aria-describedby={description != null ? descriptionId : undefined}
    >
      <menu.ThemeProvider
        theme={theme}
        themeBase={themeBase}
        portalContainer={portalContainer}
      >
        {collapsible ? (
          <>
            <div data-slot="rdg-toolbar-header-row">
              {toolbarHeading != null ? (
                <div data-slot="rdg-toolbar-collapsible-heading">
                  {toolbarHeading}
                </div>
              ) : null}
              <div data-slot="rdg-toolbar-disclosure-row">
                <button
                  type="button"
                  aria-controls={collapsiblePanelId}
                  aria-expanded={expanded}
                  data-state={expanded ? "open" : "closed"}
                  data-slot="rdg-toolbar-disclosure"
                  onClick={() => setExpanded((current) => !current)}
                >
                  <ToolbarSettingsIcon />
                  {expanded
                    ? resolvedLabels.hideToolbar
                    : resolvedLabels.showToolbar}
                  <ChevronDownIcon className="tdg-toolbar-disclosure-chevron" />
                </button>
              </div>
            </div>
            <div
              id={collapsiblePanelId}
              aria-hidden={!expanded}
              data-slot="rdg-toolbar-collapsible-panel"
            >
              <div data-slot="rdg-toolbar-collapsible-panel-inner">
                {toolbarBody}
              </div>
            </div>
          </>
        ) : (
          toolbarContent
        )}
      </menu.ThemeProvider>
    </div>
  );
}

type ColumnToggleItem = {
  columnId: string;
  disabled: boolean;
  label: React.ReactNode;
  onToggle: () => void;
  visible: boolean;
};

type ColumnToggleDropdownProps = {
  ariaLabel: string;
  descriptionId?: string;
  items: readonly ColumnToggleItem[];
  label: React.ReactNode;
};

/**
 * The grid's own multi-select menu, driving column state through the toolbar
 * store. Placement, collision handling, focus and typeahead all belong to the
 * menu; this only names the parts and keeps the toolbar's `data-slot` contract
 * on them, so consumer styles written against those names still land.
 */
function ColumnToggleDropdown(
  props: ColumnToggleDropdownProps
): React.ReactElement {
  const { ariaLabel, descriptionId, items, label } = props;
  const menu = getCoreMenuRuntime();

  return (
    <div data-slot="rdg-toolbar-column-toggle-wrapper">
      {/*
       * Not modal: a modal menu marks the rest of the page `aria-hidden` and
       * locks its scrolling, which is the wrong trade for choosing columns
       * against the grid the choice is changing.
       */}
      <menu.Root modal={false}>
        <menu.Trigger
          data-slot="rdg-toolbar-column-toggle-trigger"
          aria-describedby={descriptionId}
          disabled={items.length === 0}
        >
          <ColumnsIcon data-icon="inline-start" />
          {label}
          <ChevronDownIcon
            className="tdg-toolbar-column-toggle-chevron"
            data-icon="inline-end"
          />
        </menu.Trigger>

        <menu.Content
          align="start"
          loop
          // The gap is a documented token the stylesheet applies, so the menu
          // itself contributes none of its own.
          sideOffset={0}
          collisionPadding={MENU_VIEWPORT_MARGIN}
          // The menu labels itself after its trigger by default, which would
          // quietly outrank the toolbar's own `ariaLabel` - `aria-labelledby`
          // wins over `aria-label` wherever both are present.
          aria-labelledby={undefined}
          aria-label={ariaLabel}
          aria-describedby={descriptionId}
          data-slot="rdg-toolbar-column-toggle-menu"
        >
          <menu.Label data-slot="rdg-toolbar-column-toggle-menu-label">
            {label}
          </menu.Label>
          <menu.Separator data-slot="rdg-toolbar-column-toggle-menu-separator" />
          <menu.Group data-slot="rdg-toolbar-column-toggle-menu-group">
            {items.map((item) => (
              <menu.CheckboxItem
                key={item.columnId}
                checked={item.visible}
                disabled={item.disabled}
                data-slot="rdg-column-toggle"
                data-layout="menu"
                data-column-id={item.columnId}
                // Several columns are usually toggled in one visit, so the menu
                // outlives each choice instead of closing on the first.
                onSelect={(event) => event.preventDefault()}
                onCheckedChange={item.onToggle}
              >
                <span data-slot="rdg-column-toggle-label">{item.label}</span>
              </menu.CheckboxItem>
            ))}
          </menu.Group>
        </menu.Content>
      </menu.Root>
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

/** The same menu again, offering one download per configured format. */
function ExportControl(props: ExportControlProps): React.ReactElement {
  const { disabled, formats, label, formatLabels, singleLabels, onExport } =
    props;
  const menu = getCoreMenuRuntime();
  const singleFormat = formats.length === 1 ? formats[0] : null;
  const formatLabel = (format: RDGToolbarExportFormat): React.ReactNode =>
    formatLabels[format] ?? RDG_TOOLBAR_EXPORT_FORMATS[format].label;

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
    <div data-slot="rdg-toolbar-export-wrapper">
      <menu.Root modal={false}>
        <menu.Trigger data-slot="rdg-toolbar-export" disabled={disabled}>
          <ExportIcon />
          {label}
        </menu.Trigger>

        <menu.Content
          // Trailing control, so the menu opens inward from its own edge.
          align="end"
          loop
          sideOffset={0}
          collisionPadding={MENU_VIEWPORT_MARGIN}
          // Named by its trigger, which the menu arranges itself - so a
          // translated (or element) label needs no separate string form.
          data-slot="rdg-toolbar-export-menu"
        >
          {formats.map((format) => (
            <menu.Item
              key={format}
              data-slot="rdg-toolbar-export-format"
              data-export-format={format}
              onSelect={() => {
                void onExport(format);
              }}
            >
              {formatLabel(format)}
            </menu.Item>
          ))}
        </menu.Content>
      </menu.Root>
    </div>
  );
}
