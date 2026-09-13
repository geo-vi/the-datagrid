import type {
  TypeMobileCardColumns,
  TypeMobileCardFields,
  TypeMobileListActions,
  TypeMobileListActionsSide,
  TypeMobileSettingsSurface,
  TypeMobileListExpand,
  TypeMobileListRows,
  TypeMobileListSummaryWhenOpen,
  TypeMobileTransformOverflow,
  TypeMobileTransformProps,
  TypeMobileTransformVariant,
} from "../../types";

export const MOBILE_TRANSFORM_DEFAULT_BREAKPOINT = 1024;
export const MOBILE_TRANSFORM_DEFAULT_PAGE_SIZE = 25;

export type ResolvedMobileTransform = {
  enabled: boolean;
  mediaQuery: string;
  scroll: "container" | "page";
  variant?: TypeMobileTransformVariant;
  defaultVariant: TypeMobileTransformVariant;
  listRows: TypeMobileListRows;
  listActions: TypeMobileListActions;
  listActionsSide: TypeMobileListActionsSide;
  listFieldIds?: string[];
  listFieldLimit: number;
  listSummaryWhenOpen: TypeMobileListSummaryWhenOpen;
  listExpand: TypeMobileListExpand;
  showRowExpandToggle: boolean;
  cardFields: TypeMobileCardFields;
  cardColumns: TypeMobileCardColumns;
  cardLabelWidth?: string;
  cardFieldLimit: number;
  showVariantToggle: boolean;
  showToolbar: boolean;
  toolbarActions?: TypeMobileTransformProps["toolbarActions"];
  showSearch?: boolean;
  showSort: boolean;
  showColumnPicker?: boolean;
  showResultCount: boolean;
  showSettings: boolean;
  settingsSurface: TypeMobileSettingsSurface;
  searchColumnIds?: string[];
  defaultSearchColumnIds?: string[];
  onSearchColumnIdsChange?: (columnIds: string[]) => void;
  stickyOffset?: string;
  onVariantChange?: (variant: TypeMobileTransformVariant) => void;
  overflow: TypeMobileTransformOverflow;
  pageSize: number;
  pageSizes: number[];
  showMoreStep: number;
  chrome: "card" | "plain";
  estimatedCardHeight: number;
  estimatedListHeight: number;
};

export function toMobileTransformMediaQuery(
  breakpoint: number | string | undefined
): string {
  if (breakpoint == null) {
    return `(max-width: ${MOBILE_TRANSFORM_DEFAULT_BREAKPOINT}px)`;
  }
  if (typeof breakpoint === "number") {
    return `(max-width: ${breakpoint}px)`;
  }
  const trimmed = breakpoint.trim();
  // Passed through so the layout can key off anything matchMedia understands.
  if (trimmed.startsWith("(") || trimmed.includes(":")) return trimmed;
  return `(max-width: ${trimmed})`;
}

function toCssLength(offset: number | string | undefined) {
  if (offset == null) return undefined;
  if (typeof offset === "number") {
    return Number.isFinite(offset) ? `${offset}px` : undefined;
  }
  const trimmed = offset.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

const MOBILE_CARD_DEFAULT_FIELD_LIMIT = 6;
const MOBILE_LIST_DEFAULT_FIELD_LIMIT = 3;

function toFieldLimit(limit: number | "all" | undefined, fallback: number) {
  if (limit === "all") return Number.POSITIVE_INFINITY;
  if (limit == null || !Number.isFinite(limit)) return fallback;
  return Math.max(1, Math.floor(limit));
}

function toFieldIds(ids: string[] | undefined) {
  const kept = ids?.filter((id) => typeof id === "string" && id.length > 0);
  return kept && kept.length > 0 ? kept : undefined;
}

export function normalizePageSizes(
  pageSizes: number[] | undefined,
  pageSize: number
) {
  const candidates = (pageSizes ?? [10, 25, 50, 100])
    .filter((size) => Number.isFinite(size) && size > 0)
    .map((size) => Math.floor(size));
  if (!candidates.includes(pageSize)) candidates.push(pageSize);
  return [...new Set(candidates)].sort((a, b) => a - b);
}

export function resolveMobileTransform(params: {
  allowMobileTransform: boolean;
  mobileTransform?: TypeMobileTransformProps;
  gridPaginationEnabled: boolean;
  treeEnabled: boolean;
}): ResolvedMobileTransform {
  const { allowMobileTransform, gridPaginationEnabled, treeEnabled } = params;
  const hasMobileTransformConfig = params.mobileTransform != null;
  const config = params.mobileTransform ?? {};
  const scroll = config.scroll ?? "container";
  const pageSize = Math.max(
    1,
    Math.floor(config.pageSize ?? MOBILE_TRANSFORM_DEFAULT_PAGE_SIZE)
  );

  /*
   * A budget of its own could only walk the page the grid already loaded, while
   * the pager holding `skip`/`limit` and the authoritative count is the grid's.
   * So a paginated grid keeps that pager and the mobile layout renders it.
   * Container scrolling bounds the rows with its own scrollport either way.
   */
  const listFieldIds = toFieldIds(config.listFieldIds);

  const requestedOverflow: TypeMobileTransformOverflow = gridPaginationEnabled
    ? "none"
    : (config.overflow ?? (scroll === "page" ? "show-more" : "none"));

  // A numbered page over a tree cuts mid-branch, and the boundary moves as the
  // viewer expands.
  const overflow: TypeMobileTransformOverflow =
    treeEnabled &&
    (requestedOverflow === "pagination" || requestedOverflow === "both")
      ? "show-more"
      : requestedOverflow;

  return {
    enabled: config.enabled ?? allowMobileTransform,
    mediaQuery: toMobileTransformMediaQuery(config.breakpoint),
    scroll,
    // A card's border reads as the unit, so it cannot carry indentation.
    variant: treeEnabled ? "list" : config.variant,
    // `allowMobileTransform` shipped as a cards-only layout. Preserve that
    // behavior until the new configuration object explicitly opts into the
    // cards/list feature.
    defaultVariant: treeEnabled
      ? "list"
      : (config.defaultVariant ??
        (hasMobileTransformConfig ? "list" : "cards")),
    listRows: config.listRows ?? "divided",
    listActions: config.listActions ?? "inline",
    listActionsSide: config.listActionsSide ?? "end",
    listFieldIds,
    listFieldLimit: toFieldLimit(
      config.listFieldLimit,
      listFieldIds ? listFieldIds.length : MOBILE_LIST_DEFAULT_FIELD_LIMIT
    ),
    listSummaryWhenOpen: config.listSummaryWhenOpen ?? "keep",
    // Both follow the configuration object rather than the old
    // `allowMobileTransform` path, which keeps its original behaviour.
    listExpand:
      config.listExpand ??
      (treeEnabled || hasMobileTransformConfig ? "click" : "none"),
    // On a tree the one chevron belongs to the branch; a tap reaches the fields.
    showRowExpandToggle:
      config.showRowExpandToggle ?? (treeEnabled ? false : true),
    cardFields:
      config.cardFields ?? (hasMobileTransformConfig ? "auto" : "stacked"),
    cardColumns: config.cardColumns ?? "auto",
    cardLabelWidth: toCssLength(config.cardLabelWidth),
    cardFieldLimit: toFieldLimit(
      config.cardFieldLimit,
      MOBILE_CARD_DEFAULT_FIELD_LIMIT
    ),
    showVariantToggle: treeEnabled
      ? false
      : (config.showVariantToggle ?? hasMobileTransformConfig),
    showToolbar: config.showToolbar ?? true,
    toolbarActions: config.toolbarActions,
    // Left undefined where the default belongs to the grid, which is the only
    // place that knows about a search box or a toolbar mounted outside it.
    showSearch: config.showSearch,
    showSort: config.showSort ?? true,
    showColumnPicker: config.showColumnPicker,
    showResultCount: config.showResultCount ?? true,
    showSettings: config.showSettings ?? hasMobileTransformConfig,
    settingsSurface: config.settingsSurface ?? "drawer",
    searchColumnIds: config.searchColumnIds,
    defaultSearchColumnIds: config.defaultSearchColumnIds,
    onSearchColumnIdsChange: config.onSearchColumnIdsChange,
    stickyOffset: toCssLength(config.stickyOffset),
    onVariantChange: config.onVariantChange,
    overflow,
    pageSize,
    pageSizes: normalizePageSizes(config.pageSizes, pageSize),
    showMoreStep: Math.max(1, Math.floor(config.showMoreStep ?? pageSize)),
    chrome: config.chrome ?? (scroll === "page" ? "plain" : "card"),
    estimatedCardHeight: 224,
    estimatedListHeight: 76,
  };
}
