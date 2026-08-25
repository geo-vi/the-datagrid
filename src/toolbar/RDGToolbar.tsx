"use client";

import * as React from "react";

import { useMediaQuery } from "../hooks/useMediaQuery";
import { useStableId } from "../hooks/useStableId";
import { ChevronDownIcon, ToolbarSettingsIcon } from "./icons";
import { useToolbarSurfaceRoot } from "./controlHooks";
import {
  RDGClearFiltersButton,
  RDGColumnsButton,
  RDGColumnToggleList,
  RDGExportButton,
  RDGFilterToggleButton,
} from "./controls";
import {
  DEFAULT_TOOLBAR_EXPORT_FORMATS,
  type RDGToolbarExportFormat,
  type RDGToolbarExportInfo,
  type RDGToolbarExportResult,
  type RDGToolbarExportScope,
} from "./export";
import { resolveToolbarLabels, type RDGToolbarLabels } from "./labels";

// Declared in ./export, where the shared export path can reach them.
export type { RDGToolbarExportInfo, RDGToolbarExportResult };
// Declared in ./labels, which the standalone controls also read their defaults
// from. Re-exported here because this is the documented import path.
export type { RDGToolbarLabels };

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
  const { rootProps, wrap } = useToolbarSurfaceRoot();
  const titleId = useStableId("tdg-toolbar-title");
  const descriptionId = useStableId("tdg-toolbar-description");
  const collapsiblePanelId = useStableId("tdg-toolbar-collapsible-panel");
  const [expanded, setExpanded] = React.useState(false);
  const isMobileViewport = useMediaQuery("(max-width: 1024px)");
  const columnTogglesCollapsed =
    toolbarCollapsedColumnToggles ||
    (isMobileViewport && !disableMobileAutoToolbarCollapsedColumns);
  const resolvedLabels = React.useMemo(
    () => resolveToolbarLabels(labels),
    [labels]
  );
  const describedById = description != null ? descriptionId : undefined;

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
      <RDGColumnsButton
        ariaLabel={ariaLabel}
        describedById={describedById}
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
        <RDGColumnToggleList
          ariaLabel={ariaLabel}
          describedById={describedById}
        />
      ) : null}

      {collapsedColumnToggles != null ||
      showExport ||
      showFilterToggle ||
      showClearFilters ||
      children != null ? (
        <div data-slot="rdg-toolbar-actions">
          {collapsedColumnToggles}

          {showExport ? (
            <RDGExportButton
              formats={exportFormats}
              scope={exportScope}
              fileName={exportFileName}
              dateFormat={exportDateFormat}
              sheetName={exportSheetName}
              label={resolvedLabels.export}
              formatLabels={resolvedLabels.exportFormats}
              singleLabels={resolvedLabels.exportSingle}
              onExportSuccess={onExportSuccess}
              onExportError={onExportError}
            />
          ) : null}

          {showFilterToggle ? (
            <RDGFilterToggleButton
              showFiltersLabel={resolvedLabels.showFilters}
              hideFiltersLabel={resolvedLabels.hideFilters}
              controlledHint={resolvedLabels.filteringControlledHint}
            />
          ) : null}

          {showClearFilters ? (
            <RDGClearFiltersButton label={resolvedLabels.clearFilters} />
          ) : null}

          {children}
        </div>
      ) : null}
    </div>
  );

  return (
    <div
      {...rootProps}
      className={
        className ? `tdg-toolbar-root ${className}` : "tdg-toolbar-root"
      }
      data-slot="rdg-toolbar"
      data-collapsible={collapsible ? "true" : undefined}
      data-state={collapsible ? (expanded ? "open" : "closed") : undefined}
      role={title != null ? "region" : undefined}
      aria-labelledby={title != null ? titleId : undefined}
      aria-describedby={describedById}
    >
      {wrap(
        collapsible ? (
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
          <>
            {toolbarHeading}
            {toolbarBody}
          </>
        )
      )}
    </div>
  );
}
