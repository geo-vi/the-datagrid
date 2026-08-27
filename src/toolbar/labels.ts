import type * as React from "react";

import type { RDGToolbarExportFormat } from "./export";

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

// Required, so a label added to the type above must be given a default here
// rather than silently resolving to undefined at the point it is rendered.
export const DEFAULT_TOOLBAR_LABELS: Required<RDGToolbarLabels> = {
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

export function resolveToolbarLabels(
  labels: Partial<RDGToolbarLabels> | undefined
): Required<RDGToolbarLabels> {
  return {
    ...DEFAULT_TOOLBAR_LABELS,
    ...labels,
    // A caller passing `exportFormats: undefined` out of a conditional would
    // otherwise defeat the spread and leave the lookups without a map.
    exportFormats:
      labels?.exportFormats ?? DEFAULT_TOOLBAR_LABELS.exportFormats,
    exportSingle: labels?.exportSingle ?? DEFAULT_TOOLBAR_LABELS.exportSingle,
    filteringControlledHint:
      labels?.filteringControlledHint ??
      DEFAULT_TOOLBAR_LABELS.filteringControlledHint,
  };
}
