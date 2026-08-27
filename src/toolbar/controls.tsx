"use client";

import * as React from "react";

import {
  ChevronDownIcon,
  ColumnsIcon,
  ExportIcon,
  FilterIcon,
  FilterOffIcon,
  ResetIcon,
} from "./icons";
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
import { DEFAULT_TOOLBAR_LABELS } from "./labels";
import { useRDGColumnToggleItems, useToolbarSurfaceRoot } from "./controlHooks";
import { getCoreMenuRuntime } from "./runtime";
import { useRDGToolbarSnapshot, useRDGToolbarStore } from "./store";

/** Keeps an open menu clear of the edges it is measured against. */
const MENU_VIEWPORT_MARGIN = 8;

/** Appended, never replaced: the slot styles key off the built-in class. */
function joinClassName(...parts: Array<string | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export type RDGToolbarSurfaceProps = {
  children?: React.ReactNode;
  /**
   * Drops the card - padding, border, background, shadow and column layout -
   * leaving only what the controls need: the stylesheet's scope, the grid's
   * theme, and the container its menus portal into.
   */
  bare?: boolean;
  className?: string;
  style?: React.CSSProperties;
  ariaLabel?: string;
};

/**
 * The element the toolbar's controls have to live inside: `toolbar.css` is
 * scoped to `.tdg-toolbar-root`, and a menu portals into this node and reads
 * its theme from here. `RDGToolbar` is one of these; use this directly to lay
 * the controls out yourself.
 */
export function RDGToolbarSurface(
  props: RDGToolbarSurfaceProps
): React.ReactElement {
  const { children, bare = false, className, style, ariaLabel } = props;
  const { rootProps, wrap } = useToolbarSurfaceRoot();

  return (
    <div
      {...rootProps}
      className={joinClassName("tdg-toolbar-root", className)}
      style={style}
      data-slot="rdg-toolbar-surface"
      data-bare={bare ? "true" : undefined}
      aria-label={ariaLabel}
    >
      {wrap(children)}
    </div>
  );
}

export type RDGColumnToggleListProps = {
  ariaLabel?: string;
  describedById?: string;
  className?: string;
};

/** Inline on/off buttons, one per hideable column. */
export function RDGColumnToggleList(
  props: RDGColumnToggleListProps
): React.ReactElement {
  const {
    ariaLabel = "Visible column toggles",
    describedById,
    className,
  } = props;
  const items = useRDGColumnToggleItems();

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      aria-describedby={describedById}
      className={className}
      data-slot="rdg-column-toggle-list"
    >
      {items.map((item) => (
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
  );
}

export type RDGColumnsButtonProps = {
  label?: React.ReactNode;
  ariaLabel?: string;
  describedById?: string;
  className?: string;
};

/**
 * The same toggles behind one dropdown. Placement, collision handling, focus
 * and typeahead belong to the grid's menu; this names the parts and keeps the
 * `data-slot` contract on them, so consumer styles still land.
 */
export function RDGColumnsButton(
  props: RDGColumnsButtonProps
): React.ReactElement {
  const {
    label = DEFAULT_TOOLBAR_LABELS.columns,
    ariaLabel = "Visible column toggles",
    describedById,
    className,
  } = props;
  const items = useRDGColumnToggleItems();
  const menu = getCoreMenuRuntime();

  return (
    <div className={className} data-slot="rdg-toolbar-column-toggle-wrapper">
      {/*
       * Not modal: a modal menu marks the rest of the page `aria-hidden` and
       * locks its scrolling, which is the wrong trade for choosing columns
       * against the grid the choice is changing.
       */}
      <menu.Root modal={false}>
        <menu.Trigger
          data-slot="rdg-toolbar-column-toggle-trigger"
          aria-describedby={describedById}
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
          // quietly outrank `ariaLabel` - `aria-labelledby` wins over
          // `aria-label` wherever both are present.
          aria-labelledby={undefined}
          aria-label={ariaLabel}
          aria-describedby={describedById}
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

export type RDGExportButtonProps = {
  /** Menu order. `"xlsx"` needs the optional `xlsx` peer dependency. */
  formats?: readonly RDGToolbarExportFormat[];
  /** `"view"` exports the filtered, searched and sorted rows; `"all"` the source. */
  scope?: RDGToolbarExportScope;
  /** File name without extension. A function is called per export. */
  fileName?: string | ((info: RDGToolbarExportInfo) => string);
  dateFormat?: string;
  sheetName?: string;
  label?: React.ReactNode;
  formatLabels?: Partial<Record<RDGToolbarExportFormat, React.ReactNode>>;
  singleLabels?: Partial<Record<RDGToolbarExportFormat, React.ReactNode>>;
  onExportSuccess?: (result: RDGToolbarExportResult) => void;
  onExportError?: (error: unknown) => void;
  className?: string;
};

/** One button per format, or a menu when more than one format is offered. */
export function RDGExportButton(
  props: RDGExportButtonProps
): React.ReactElement {
  const {
    formats = DEFAULT_TOOLBAR_EXPORT_FORMATS,
    scope,
    fileName,
    dateFormat,
    sheetName,
    label = DEFAULT_TOOLBAR_LABELS.export,
    formatLabels = DEFAULT_TOOLBAR_LABELS.exportFormats,
    singleLabels = DEFAULT_TOOLBAR_LABELS.exportSingle,
    onExportSuccess,
    onExportError,
    className,
  } = props;
  const menu = getCoreMenuRuntime();
  const snapshot = useRDGToolbarSnapshot();
  const store = useRDGToolbarStore();
  const [exporting, setExporting] = React.useState(false);

  const availableFormats = React.useMemo(
    () =>
      formats.filter((format) => RDG_TOOLBAR_EXPORT_FORMATS[format] != null),
    [formats]
  );
  const exportColumnCount = React.useMemo(
    () => resolveExportColumns(snapshot).length,
    [snapshot]
  );
  const disabled =
    exporting || exportColumnCount === 0 || availableFormats.length === 0;

  const runExport = React.useCallback(
    async (format: RDGToolbarExportFormat) => {
      setExporting(true);
      try {
        // Read now, not at render: the provider sets its defaults in an effect.
        const result = await performExport(
          snapshot,
          format,
          mergeExportSettings(
            { scope, fileName, dateFormat, sheetName },
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
      dateFormat,
      fileName,
      onExportError,
      onExportSuccess,
      scope,
      sheetName,
      snapshot,
      store,
    ]
  );

  const formatLabel = (format: RDGToolbarExportFormat): React.ReactNode =>
    formatLabels[format] ?? RDG_TOOLBAR_EXPORT_FORMATS[format].label;
  const singleFormat =
    availableFormats.length === 1 ? availableFormats[0] : null;

  if (singleFormat) {
    return (
      <button
        type="button"
        className={className}
        data-slot="rdg-toolbar-export"
        data-export-format={singleFormat}
        disabled={disabled}
        onClick={() => {
          void runExport(singleFormat);
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
    <div className={className} data-slot="rdg-toolbar-export-wrapper">
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
          {availableFormats.map((format) => (
            <menu.Item
              key={format}
              data-slot="rdg-toolbar-export-format"
              data-export-format={format}
              onSelect={() => {
                void runExport(format);
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

export type RDGFilterToggleButtonProps = {
  showFiltersLabel?: React.ReactNode;
  hideFiltersLabel?: React.ReactNode;
  /** Title when the grid owns its filter row through `enableFiltering`. */
  controlledHint?: string;
  className?: string;
};

/** Shows or hides the grid's filter row. */
export function RDGFilterToggleButton(
  props: RDGFilterToggleButtonProps
): React.ReactElement {
  const {
    showFiltersLabel = DEFAULT_TOOLBAR_LABELS.showFilters,
    hideFiltersLabel = DEFAULT_TOOLBAR_LABELS.hideFilters,
    controlledHint = DEFAULT_TOOLBAR_LABELS.filteringControlledHint,
    className,
  } = props;
  const snapshot = useRDGToolbarSnapshot();

  return (
    <button
      type="button"
      className={className}
      aria-pressed={snapshot.filteringEnabled}
      data-state={snapshot.filteringEnabled ? "on" : "off"}
      data-slot="rdg-toolbar-filter-toggle"
      disabled={!snapshot.canToggleFiltering}
      title={snapshot.canToggleFiltering ? undefined : controlledHint}
      onClick={() => snapshot.setFilteringEnabled(!snapshot.filteringEnabled)}
    >
      {snapshot.filteringEnabled ? <FilterOffIcon /> : <FilterIcon />}
      {snapshot.filteringEnabled ? hideFiltersLabel : showFiltersLabel}
    </button>
  );
}

export type RDGClearFiltersButtonProps = {
  label?: React.ReactNode;
  className?: string;
};

/** Clears every column filter value. Disabled while nothing is filtered. */
export function RDGClearFiltersButton(
  props: RDGClearFiltersButtonProps
): React.ReactElement {
  const { label = DEFAULT_TOOLBAR_LABELS.clearFilters, className } = props;
  const snapshot = useRDGToolbarSnapshot();

  return (
    <button
      type="button"
      className={className}
      data-slot="rdg-toolbar-clear-filters"
      disabled={!snapshot.filtered}
      onClick={() => snapshot.clearAllFilters()}
    >
      <ResetIcon />
      {label}
    </button>
  );
}
