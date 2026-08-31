import type {
  TypeMobileListActions,
  TypeMobileListRows,
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
  showVariantToggle: boolean;
  showToolbar: boolean;
  onVariantChange?: (variant: TypeMobileTransformVariant) => void;
  overflow: TypeMobileTransformOverflow;
  pageSize: number;
  pageSizes: number[];
  showMoreStep: number;
  chrome: "card" | "plain";
  releaseHeightConstraint: boolean;
  estimatedCardHeight: number;
  estimatedListHeight: number;
};

function toMediaQuery(breakpoint: number | string | undefined): string {
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

function normalizePageSizes(pageSizes: number[] | undefined, pageSize: number) {
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
}): ResolvedMobileTransform {
  const { allowMobileTransform, gridPaginationEnabled } = params;
  const config = params.mobileTransform ?? {};
  const scroll = config.scroll ?? "container";
  const pageSize = Math.max(
    1,
    Math.floor(config.pageSize ?? MOBILE_TRANSFORM_DEFAULT_PAGE_SIZE)
  );

  // Container scrolling bounds the rows with its own scrollport, and a grid that
  // already pages the data needs no second pager.
  const overflow: TypeMobileTransformOverflow =
    config.overflow ??
    (scroll === "page" && !gridPaginationEnabled ? "show-more" : "none");

  return {
    enabled: config.enabled ?? allowMobileTransform,
    mediaQuery: toMediaQuery(config.breakpoint),
    scroll,
    variant: config.variant,
    defaultVariant: config.defaultVariant ?? "cards",
    listRows: config.listRows ?? "divided",
    listActions: config.listActions ?? "inline",
    showVariantToggle: config.showVariantToggle ?? true,
    showToolbar: config.showToolbar ?? true,
    onVariantChange: config.onVariantChange,
    overflow,
    pageSize,
    pageSizes: normalizePageSizes(config.pageSizes, pageSize),
    showMoreStep: Math.max(1, Math.floor(config.showMoreStep ?? pageSize)),
    chrome: config.chrome ?? (scroll === "page" ? "plain" : "card"),
    releaseHeightConstraint:
      config.releaseHeightConstraint ?? scroll === "page",
    estimatedCardHeight: 224,
    estimatedListHeight: 76,
  };
}
