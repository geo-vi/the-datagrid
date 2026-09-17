import * as React from "react";
import type { TreeGridController } from "../hierarchy/useTreeGrid";
import type { UseMasterDetailResult } from "../hierarchy/useMasterDetail";
import type { TreeRecord } from "../hierarchy/treeData";
import { flexRender, type Cell, type Row } from "@tanstack/react-table";
import { useVirtualizer, useWindowVirtualizer } from "@tanstack/react-virtual";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  Columns3,
  LayoutGrid,
  Rows3,
  SlidersHorizontal,
} from "lucide-react";

import type {
  CellProps,
  TypeColumn,
  TypeDataGridProps,
  TypeMobileCardColumns,
  TypeMobileCardFields,
  TypeMobileListActions,
  TypeMobileListActionsSide,
  TypeMobileListExpand,
  TypeMobileSettingsSurface,
  TypeMobileListRows,
  TypeMobileListSummaryWhenOpen,
  TypeMobileListSummaryFlow,
  TypeMobileListSummaryLabels,
  TypeMobileListSummarySeparator,
  TypeMobileListSummaryInfo,
  TypeMobileCellSurface,
  TypeMobileTransformOverflow,
  TypeMobileTransformScroll,
  TypeMobileTransformVariant,
  TypeSortFunctions,
  TypeSortInfo,
} from "../../types";
import { Button } from "../../components/ui/button";
import { Checkbox } from "../../components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { ScrollArea } from "../../components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { cn } from "../../lib/utils";
import { useDeferredValueCompat } from "../../hooks/useDeferredValueCompat";
import { useStableId } from "../../hooks/useStableId";
import { getColumnId, getColumnSortName } from "../../utils/column";
import { setColumnSortInfo } from "../../sorting/utils";
import { t } from "../../utils/helpers";
import { resolveEmptyText } from "../utils/emptyText";
import {
  DataGridSearchBar,
  type DataGridSearchBarChange,
} from "./DataGridSearchBar";
import {
  MobileGridPagination,
  type MobileGridPaginationProps,
} from "./MobileGridPagination";
import {
  buildDataGridSearchIndex,
  filterDataGridSearchIndex,
  normalizeDataGridSearchText,
  type DataGridSearchIndex,
} from "../utils/search";

type SettingsToggle = {
  id: string;
  label: string;
  checked: boolean;
  disabled: boolean;
  setChecked: (next: boolean) => void;
};

type GridRow = Row<Record<string, unknown>>;
type GridCell = Cell<Record<string, unknown>, unknown>;

type MobileGridListProps = {
  tree: TreeGridController;
  masterDetail: UseMasterDetailResult;
  detailColumnId?: string;
  rows: GridRow[];
  columns: TypeColumn[];
  searchColumns: TypeColumn[];
  checkboxColumnId: string;
  loading: boolean;
  selectedMap: Record<string, unknown>;
  activeIndex: number;
  gridFocused: boolean;
  selectionEnabled: boolean;
  rowIdPrefix: string;
  rowFocusClassName?: string;
  showActiveRowIndicator: boolean;
  activeRowIndicatorClassName?: string;
  isRowDisabled: (rowIndex: number) => boolean;
  i18n: TypeDataGridProps["i18n"];
  emptyText: TypeDataGridProps["emptyText"];
  sortInfo: TypeSortInfo;
  defaultSortDirection: 1 | -1;
  sortable: boolean;
  sortFunctions?: TypeSortFunctions | null;
  searchEnabled?: boolean;
  columnPickerEnabled?: boolean;
  sortEnabled?: boolean;
  resultCountEnabled?: boolean;
  showSettings?: boolean;
  settingsSurface?: TypeMobileSettingsSurface;
  /** Columns the search reads. Undefined searches every searchable column. */
  searchColumnIds?: string[];
  /** Reports the committed query so the grid can search behind the layout. */
  onQueryChange?: (query: string) => void;
  /** The grid already searched and revealed; filtering again would undo it. */
  searchHandledUpstream?: boolean;
  onSearchColumnIdsChange?: (columnIds: string[]) => void;
  /** Rest position of the sticky toolbar, as a CSS length. */
  stickyOffset?: string;
  /** Consumer controls for the toolbar row, between search and settings. */
  mobileToolbarActions?: React.ReactNode;
  authoritativeResultCount?: number;
  onSortInfoChange: (sortInfo: TypeSortInfo) => void;
  onFilteredRowsCountChange?: (count: number) => void;
  scrollRef: React.MutableRefObject<HTMLDivElement | null>;
  nativeScroll: boolean;
  scrollProps: NonNullable<TypeDataGridProps["scrollProps"]>;
  rtl: boolean;
  onScroll?: TypeDataGridProps["onScroll"];
  /** Which element the rows virtualize against. */
  scrollMode: TypeMobileTransformScroll;
  /** Drops the surrounding border/background so rows sit directly on the page. */
  chrome: "card" | "plain";
  variant?: TypeMobileTransformVariant;
  defaultVariant: TypeMobileTransformVariant;
  listRows: TypeMobileListRows;
  listActions: TypeMobileListActions;
  listActionsSide: TypeMobileListActionsSide;
  /** Column ids under a list row's main label, in this order. */
  listFieldIds?: string[];
  listFieldLimit: number;
  listSummaryWhenOpen: TypeMobileListSummaryWhenOpen;
  listSummaryFlow: TypeMobileListSummaryFlow;
  listSummaryLabels: TypeMobileListSummaryLabels;
  listSummarySeparator: TypeMobileListSummarySeparator;
  renderListSummary?: (info: TypeMobileListSummaryInfo) => React.ReactNode;
  listExpand: TypeMobileListExpand;
  showRowExpandToggle: boolean;
  cardFields: TypeMobileCardFields;
  cardColumns: TypeMobileCardColumns;
  /** Label track under `cardFields: "inline"`: a CSS length or percentage. */
  cardLabelWidth?: string;
  cardFieldLimit: number;
  showVariantToggle: boolean;
  showToolbar: boolean;
  onVariantChange?: (variant: TypeMobileTransformVariant) => void;
  overflow: TypeMobileTransformOverflow;
  /** The grid's own paging, rendered in place of a budget over one page of it. */
  gridPaging?: Omit<MobileGridPaginationProps, "i18n">;
  pageSize: number;
  pageSizes: number[];
  showMoreStep: number;
  estimatedCardHeight: number;
  estimatedListHeight: number;
  onRowClick: (
    id: string,
    data: Record<string, unknown>,
    rowIndex: number,
    event: React.MouseEvent
  ) => void;
  onRowContextMenu?: (
    id: string,
    data: Record<string, unknown>,
    rowIndex: number,
    event: React.MouseEvent<HTMLElement> | React.PointerEvent<HTMLElement>,
    alignTo: HTMLElement | { left: number; top: number }
  ) => void;
};

const ACTION_COLUMN =
  /(^|[-_\s])(action|actions|menu|tool|tools|command|commands|option|options)($|[-_\s])/i;
const ID_COLUMN = /(^|[-_\s])(id|uuid|key|code|number|no)($|[-_\s])/i;

// One shared label track is what aligns the values down a card: with `auto`
// each label would stop where its own text ended. The default is a share of
// the field's own width rather than a length, so two columns on a phone narrow
// the labels instead of pushing the values out of the card.
/*
 * The menu scrolls, so a section heading has to stay put to say which list the
 * checkboxes underneath belong to. It pins into the menu's own 4px padding
 * band and spans the full width, or items scroll through the gap above and
 * beside it.
 */
/* Smaller steps than the desktop's 22px a level, or a label has no room. */
const MOBILE_TREE_TOGGLE_SIZE = "2.25rem";
const MOBILE_CHECKBOX_SIZE = "var(--tdg-mobile-row-checkbox-size, 1rem)";
const MOBILE_TREE_TOGGLE = {
  nestingSize: "var(--tdg-mobile-tree-indent, 1rem)",
  buttonClassName: "size-9",
} as const;

/** Where a node's title starts: indent, toggle, and the row's gap after it. */
function mobileTreeContentOffset(depth: number) {
  return `calc(var(--tdg-mobile-tree-indent, 1rem) * ${depth} + ${MOBILE_TREE_TOGGLE_SIZE} + var(--tdg-mobile-row-gap, 0.75rem))`;
}

function mobileTreeIndentOffset(depth: number) {
  return `calc(var(--tdg-mobile-tree-indent, 1rem) * ${depth})`;
}

const SETTINGS_DRAWER_EXIT_MS = 180;

const SETTINGS_SECTION_LABEL =
  "sticky -top-2 z-10 -mx-1 bg-popover px-3 pb-1 pt-3.5";

/*
 * A grid with two dozen columns makes a menu taller than a phone. Radix hands
 * the room it actually has to a variable rather than shrinking the menu, so
 * the cap has to read it or the list runs off the bottom of a short viewport.
 * Inline because the primitive's own class sets `overflow: hidden`, which a
 * class of ours cannot reliably outrank.
 */
const MENU_SCROLL_BOUND: React.CSSProperties = {
  maxHeight:
    "min(70vh, 30rem, var(--radix-dropdown-menu-content-available-height, 100vh))",
  overflowY: "auto",
};

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? React.useEffect : React.useLayoutEffect;

function resolveStickyOffset(
  toolbar: HTMLElement | null,
  host: HTMLElement
): number {
  if (typeof window === "undefined") return 0;
  // `top` on the sticky toolbar resolves whatever the custom property holds,
  // so a consumer can hand it a `var()` that tracks a host header's height.
  const stuckTop = toolbar
    ? Number.parseFloat(window.getComputedStyle(toolbar).top)
    : Number.NaN;
  if (Number.isFinite(stuckTop)) return Math.max(0, stuckTop);
  const declared = Number.parseFloat(
    window
      .getComputedStyle(host)
      .getPropertyValue("--tdg-mobile-toolbar-top")
      .trim()
  );
  return Number.isFinite(declared) ? Math.max(0, declared) : 0;
}

// A tap that lands on something operable belongs to that control, never to
// the row's own expansion.
function isOperableTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    target.closest(
      'button, a, input, select, textarea, label, [role="button"], [data-cell-role="action"]'
    ) != null
  );
}

function labelForColumn(column: TypeColumn): string {
  if (typeof column.header === "string") return column.header;
  return column.name ?? column.id ?? "Value";
}

export function MobileGridList({
  tree,
  masterDetail,
  detailColumnId,
  rows,
  columns,
  searchColumns,
  checkboxColumnId,
  loading,
  selectedMap,
  activeIndex,
  gridFocused,
  selectionEnabled,
  rowIdPrefix,
  rowFocusClassName,
  showActiveRowIndicator,
  activeRowIndicatorClassName,
  isRowDisabled,
  i18n,
  emptyText,
  sortInfo,
  defaultSortDirection,
  sortable,
  sortFunctions,
  searchEnabled = true,
  columnPickerEnabled = true,
  sortEnabled = true,
  resultCountEnabled = true,
  showSettings = false,
  settingsSurface = "drawer",
  searchColumnIds,
  onQueryChange,
  searchHandledUpstream = false,
  onSearchColumnIdsChange,
  stickyOffset,
  mobileToolbarActions,
  authoritativeResultCount,
  onSortInfoChange,
  onFilteredRowsCountChange,
  scrollRef,
  nativeScroll,
  scrollProps,
  rtl,
  onScroll,
  scrollMode,
  chrome,
  variant: controlledVariant,
  defaultVariant,
  listRows,
  listActions,
  listActionsSide,
  listFieldIds,
  listFieldLimit,
  listSummaryWhenOpen,
  listSummaryFlow,
  listSummaryLabels,
  listSummarySeparator,
  renderListSummary,
  listExpand,
  showRowExpandToggle,
  cardFields,
  cardColumns,
  cardLabelWidth,
  cardFieldLimit,
  showVariantToggle,
  showToolbar,
  onVariantChange,
  overflow,
  gridPaging,
  pageSize: pageSizeProp,
  pageSizes,
  showMoreStep,
  estimatedCardHeight,
  estimatedListHeight,
  onRowClick,
  onRowContextMenu,
}: MobileGridListProps): React.ReactElement {
  const [query, setQuery] = React.useState("");
  const [committedQuery, setCommittedQuery] = React.useState("");
  const [sortPanelOpen, setSortPanelOpen] = React.useState(false);
  const [expandedRowIds, setExpandedRowIds] = React.useState<
    ReadonlySet<string>
  >(() => new Set());
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  /*
   * The dialog shell unmounts its portal with the open state, taking any
   * closing animation down with it, so the drawer holds `open` for the length
   * of its own exit and marks itself closing while it plays.
   */
  const [drawerClosing, setSettingsClosing] = React.useState(false);
  const drawerCloseTimerRef = React.useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  React.useEffect(
    () => () => {
      if (drawerCloseTimerRef.current) {
        clearTimeout(drawerCloseTimerRef.current);
      }
    },
    []
  );
  const [openSettingsSection, setOpenSettingsSection] = React.useState<
    "sort" | "columns" | "search" | null
  >(null);
  const [columnFilter, setColumnFilter] = React.useState("");
  const [searchColumnFilter, setSearchColumnFilter] = React.useState("");
  const [draftSortColumnId, setDraftSortColumnId] = React.useState("");
  const [draftSortDirection, setDraftSortDirection] = React.useState<1 | -1>(
    defaultSortDirection
  );
  const [uncontrolledVariant, setUncontrolledVariant] =
    React.useState<TypeMobileTransformVariant>(defaultVariant);
  const activeVariant = controlledVariant ?? uncontrolledVariant;
  const pageScroll = scrollMode === "page";
  const plainChrome = chrome === "plain";
  const boxedListRows = listRows === "boxed";
  const rootStyle =
    stickyOffset || cardLabelWidth
      ? ({
          "--tdg-mobile-toolbar-top": stickyOffset,
          "--tdg-mobile-card-label-width": cardLabelWidth,
        } as React.CSSProperties)
      : undefined;
  const bottomListActions = listActions === "bottom";
  const titleListActions = listActions === "title";
  const leadingListActions = listActionsSide === "start";
  const rowsExpandable = listExpand !== "none";
  const cardFieldColumnsClass =
    cardColumns === 2
      ? "grid-cols-2"
      : cardColumns === 1
        ? "grid-cols-1"
        : "grid-cols-1 min-[640px]:grid-cols-2";
  // A boxed group inside its own scrollport is cropped flush at both ends, so
  // nothing reads as the start or the end of the run. Page scroll ends against
  // the document instead, and the other row styles have their own gaps.
  const boxedListEndGutters =
    !pageScroll && activeVariant === "list" && boxedListRows && !plainChrome;
  const deferredQuery = useDeferredValueCompat(committedQuery);
  React.useEffect(() => {
    onQueryChange?.(committedQuery);
  }, [committedQuery, onQueryChange]);
  const sortButtonRef = React.useRef<HTMLButtonElement | null>(null);
  const toolbarRef = React.useRef<HTMLDivElement | null>(null);
  const pageBodyRef = React.useRef<HTMLDivElement | null>(null);
  const listRef = React.useRef<HTMLDivElement | null>(null);
  const longPressTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const longPressStartRef = React.useRef<{ x: number; y: number } | null>(null);
  const suppressClickUntilRef = React.useRef(0);
  const searchIndexCache = React.useRef<{
    columns: TypeColumn[];
    index: DataGridSearchIndex<GridRow>;
    rows: GridRow[];
  } | null>(null);
  const sortPanelId = useStableId("tdg-mobile-sort-panel");
  const settingsPanelId = useStableId("tdg-mobile-settings-panel");
  const settingsPanelRef = React.useRef<HTMLDivElement | null>(null);
  const [hiddenMobileColumnIds, setHiddenMobileColumnIds] = React.useState<
    Set<string>
  >(() => new Set());
  const cancelLongPress = React.useCallback(() => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = null;
    longPressStartRef.current = null;
  }, []);
  React.useEffect(() => cancelLongPress, [cancelLongPress]);
  const columnMap = React.useMemo(
    () => new Map(columns.map((column) => [getColumnId(column), column])),
    [columns]
  );
  const displayColumns = React.useMemo(
    () => columns.filter((column) => getColumnId(column) !== checkboxColumnId),
    [checkboxColumnId, columns]
  );
  const searchableColumns = React.useMemo(
    () =>
      searchColumns.filter(
        (column) =>
          column.searchable !== false &&
          getColumnId(column) !== checkboxColumnId &&
          // Only the declared role, never the name heuristic: a column called
          // "options" can still hold text worth searching.
          column.mobileRole !== "action" &&
          column.mobileRole !== "hidden"
      ),
    [checkboxColumnId, searchColumns]
  );
  const activeSearchColumns = React.useMemo(() => {
    if (!searchColumnIds) return searchableColumns;
    const wanted = new Set(searchColumnIds);
    const kept = searchableColumns.filter((column) =>
      wanted.has(getColumnId(column))
    );
    // An empty scope would search nothing at all, which no consumer means by
    // handing over an empty array.
    return kept.length ? kept : searchableColumns;
  }, [searchColumnIds, searchableColumns]);
  const searchedColumnIds = React.useMemo(
    () => new Set(activeSearchColumns.map((column) => getColumnId(column))),
    [activeSearchColumns]
  );
  const setSearchColumnSearched = React.useCallback(
    (columnId: string, searched: boolean) => {
      const next = new Set(searchedColumnIds);
      if (searched) next.add(columnId);
      else next.delete(columnId);
      if (next.size === 0) return;
      onSearchColumnIdsChange?.(
        searchableColumns
          .map((column) => getColumnId(column))
          .filter((id) => next.has(id))
      );
    },
    [onSearchColumnIdsChange, searchableColumns, searchedColumnIds]
  );
  const hasDeferredQuery =
    normalizeDataGridSearchText(deferredQuery).length > 0;
  const searchIndex = React.useMemo(() => {
    if (!searchEnabled || !hasDeferredQuery || searchHandledUpstream)
      return null;

    const cachedIndex = searchIndexCache.current;
    if (
      cachedIndex?.rows === rows &&
      cachedIndex.columns === activeSearchColumns
    ) {
      return cachedIndex.index;
    }

    const index = buildDataGridSearchIndex(
      rows,
      activeSearchColumns,
      (row) => row.original
    );
    searchIndexCache.current = { columns: activeSearchColumns, index, rows };
    return index;
  }, [
    activeSearchColumns,
    hasDeferredQuery,
    rows,
    searchEnabled,
    searchHandledUpstream,
  ]);
  const filteredRows = React.useMemo(() => {
    if (!searchEnabled || !searchIndex) return rows;
    return filterDataGridSearchIndex(searchIndex, deferredQuery);
  }, [deferredQuery, rows, searchEnabled, searchIndex]);
  // Only a search this component actually ran moves the count. With no query,
  // or one the loader answered, the count already reported upstream stands --
  // on a tree that is the retained records, not the capped rows on screen.
  const countOwnedHere = searchEnabled && searchIndex != null;
  const displayedResultCount = countOwnedHere
    ? filteredRows.length
    : (authoritativeResultCount ?? filteredRows.length);
  React.useEffect(() => {
    if (countOwnedHere) onFilteredRowsCountChange?.(filteredRows.length);
  }, [countOwnedHere, filteredRows.length, onFilteredRowsCountChange]);

  React.useEffect(() => {
    if (!searchEnabled && (query || committedQuery)) {
      setQuery("");
      setCommittedQuery("");
    }
  }, [committedQuery, query, searchEnabled]);
  const setMobileSearchValue = React.useCallback(
    (nextValue: string, change: DataGridSearchBarChange) => {
      setQuery(nextValue);
      if (change.commit) setCommittedQuery(nextValue);
    },
    []
  );

  /** ---------------- row budget ---------------- */

  const paginationEnabled = overflow === "pagination" || overflow === "both";
  const showMoreEnabled = overflow === "show-more" || overflow === "both";
  const [pageIndex, setPageIndex] = React.useState(0);
  const [pageSize, setPageSize] = React.useState(pageSizeProp);
  React.useEffect(() => setPageSize(pageSizeProp), [pageSizeProp]);

  const pageCount = paginationEnabled
    ? Math.max(1, Math.ceil(filteredRows.length / pageSize) || 1)
    : 1;
  const safePageIndex = Math.min(Math.max(0, pageIndex), pageCount - 1);
  React.useEffect(() => {
    if (pageIndex !== safePageIndex) setPageIndex(safePageIndex);
  }, [pageIndex, safePageIndex]);
  const pageStart = paginationEnabled ? safePageIndex * pageSize : 0;
  const pageRows = React.useMemo(
    () =>
      paginationEnabled
        ? filteredRows.slice(pageStart, pageStart + pageSize)
        : filteredRows,
    [filteredRows, pageSize, pageStart, paginationEnabled]
  );

  // Without a pager alongside it, the first batch is a full page.
  const initialReveal = paginationEnabled ? showMoreStep : pageSize;
  const [revealed, setRevealed] = React.useState(initialReveal);
  React.useEffect(() => {
    setRevealed(initialReveal);
  }, [deferredQuery, initialReveal, safePageIndex, sortInfo]);

  // Slicing a tree here too would cut a branch's own reveal control off the end.
  const visibleRows = React.useMemo(
    () =>
      showMoreEnabled && !tree.enabled ? pageRows.slice(0, revealed) : pageRows,
    [pageRows, revealed, showMoreEnabled, tree.enabled]
  );
  // A tree offers every cut branch its own control, this one included.
  const canShowMore =
    showMoreEnabled && !tree.enabled && revealed < pageRows.length;
  const branchTruncationByRowId = React.useMemo(() => {
    const byRow = new Map<string, (typeof tree.branchTruncations)[number]>();
    for (const truncation of tree.branchTruncations)
      byRow.set(truncation.afterRowId, truncation);
    return byRow;
  }, [tree.branchTruncations]);
  const pagerPageIndex = gridPaging ? gridPaging.pageIndex : safePageIndex;
  // Through a ref: the controller rebuilds it every render.
  const getTreeMetadataRef = React.useRef(tree.getMetadata);
  getTreeMetadataRef.current = tree.getMetadata;

  const visibleDisplayColumnCount = displayColumns.reduce(
    (count, column) =>
      count + (hiddenMobileColumnIds.has(getColumnId(column)) ? 0 : 1),
    0
  );

  React.useEffect(() => {
    const availableColumns = new Map(
      displayColumns.map((column) => [getColumnId(column), column])
    );

    setHiddenMobileColumnIds((current) => {
      const next = new Set(
        [...current].filter((columnId) => {
          const column = availableColumns.get(columnId);
          return Boolean(column && column.hideable !== false);
        })
      );
      let changed = next.size !== current.size;

      if (
        displayColumns.length > 0 &&
        displayColumns.every((column) => next.has(getColumnId(column)))
      ) {
        next.delete(getColumnId(displayColumns[0]!));
        changed = true;
      }

      return changed ? next : current;
    });
  }, [displayColumns]);

  const setMobileColumnDisplayed = React.useCallback(
    (columnId: string, displayed: boolean) => {
      setHiddenMobileColumnIds((current) => {
        const column = displayColumns.find(
          (candidate) => getColumnId(candidate) === columnId
        );
        if (!column || column.hideable === false) return current;

        const currentlyDisplayed = !current.has(columnId);
        if (currentlyDisplayed === displayed) return current;

        if (!displayed) {
          const displayedCount = displayColumns.reduce(
            (count, candidate) =>
              count + (current.has(getColumnId(candidate)) ? 0 : 1),
            0
          );
          if (displayedCount <= 1) return current;
        }

        const next = new Set(current);
        if (displayed) next.delete(columnId);
        else next.add(columnId);
        return next;
      });
    },
    [displayColumns]
  );
  const sortableColumns = React.useMemo(
    () =>
      columns.filter((column) => {
        const columnId = getColumnId(column);
        return (
          columnId !== checkboxColumnId &&
          (column.sortable ?? sortable) &&
          !ACTION_COLUMN.test(`${columnId} ${labelForColumn(column)}`)
        );
      }),
    [checkboxColumnId, columns, sortable]
  );
  const activeSort = React.useMemo(() => {
    const sortList = sortInfo
      ? Array.isArray(sortInfo)
        ? sortInfo
        : [sortInfo]
      : [];
    return sortList.find((entry) => entry.dir !== 0);
  }, [sortInfo]);
  const activeSortColumn = React.useMemo(
    () =>
      activeSort
        ? sortableColumns.find(
            (column) =>
              getColumnSortName(column) === activeSort.name ||
              getColumnId(column) === activeSort.id
          )
        : undefined,
    [activeSort, sortableColumns]
  );
  const recommendedSortColumn = React.useMemo(
    () =>
      activeSortColumn ??
      sortableColumns.find((column) => !ID_COLUMN.test(getColumnId(column))) ??
      sortableColumns[0],
    [activeSortColumn, sortableColumns]
  );
  const label = (key: string, fallback: string) => {
    const value = t(i18n, key, fallback);
    return typeof value === "string" ? value : fallback;
  };
  const mobileSortValue = t(i18n, "mobileSort", "Sort");
  const mobileColumnsValue = t(i18n, "mobileColumns", "Display columns");
  const mobileSortByValue = t(i18n, "mobileSortBy", "Sort by");
  const mobileSortAscValue = t(i18n, "mobileSortAsc", "Ascending");
  const mobileSortDescValue = t(i18n, "mobileSortDesc", "Descending");
  const mobileCardsValue = t(i18n, "mobileCardsView", "Card view");
  const mobileListValue = t(i18n, "mobileListView", "List view");
  const mobileShowMoreValue = t(i18n, "mobileShowMore", "Show more");
  const expandRowLabel = label("mobileExpandRow", "Show details");
  const mobileSettingsValue = t(i18n, "mobileSettings", "Settings");
  const mobileSettingsLabel =
    typeof mobileSettingsValue === "string" ? mobileSettingsValue : "Settings";
  const mobileSearchColumnsValue = t(
    i18n,
    "mobileSearchColumns",
    "Searched columns"
  );
  const mobileRowViewValue = t(i18n, "mobileRowView", "Row view");
  /* The search bar takes its own labels as props and defaults them to English,
     so without these it stays English whatever `i18n` says. */
  const mobileSearchLabel = label("mobileSearch", "Search all fields");
  const mobileSearchPlaceholder = label(
    "mobileSearchPlaceholder",
    mobileSearchLabel
  );
  const mobileSearchClearLabel = label("mobileSearchClear", "Clear search");
  const collapseRowLabel = label("mobileCollapseRow", "Hide details");
  const mobileSortLabel =
    typeof mobileSortValue === "string" ? mobileSortValue : "Sort";
  const mobileColumnsLabel =
    typeof mobileColumnsValue === "string"
      ? mobileColumnsValue
      : "Display columns";
  const mobileSortByLabel =
    typeof mobileSortByValue === "string" ? mobileSortByValue : "Sort by";
  const mobileSortAscLabel =
    typeof mobileSortAscValue === "string" ? mobileSortAscValue : "Ascending";
  const mobileSortDescLabel =
    typeof mobileSortDescValue === "string"
      ? mobileSortDescValue
      : "Descending";
  const mobileCardsLabel =
    typeof mobileCardsValue === "string" ? mobileCardsValue : "Card view";
  const mobileListLabel =
    typeof mobileListValue === "string" ? mobileListValue : "List view";
  const resultsLabel = label(
    displayedResultCount === 1 ? "mobileResult" : "mobileResults",
    displayedResultCount === 1 ? "result" : "results"
  );
  const activeSortSummary = activeSortColumn
    ? `${labelForColumn(activeSortColumn)} ${activeSort?.dir === -1 ? mobileSortDescLabel : mobileSortAscLabel}`
    : null;
  const draftSortColumn = sortableColumns.find(
    (column) => getColumnId(column) === draftSortColumnId
  );
  const toggleSortPanel = () => {
    if (!sortPanelOpen) {
      setDraftSortColumnId(
        activeSortColumn
          ? getColumnId(activeSortColumn)
          : recommendedSortColumn
            ? getColumnId(recommendedSortColumn)
            : ""
      );
      setDraftSortDirection(
        activeSort?.dir === -1 || activeSort?.dir === 1
          ? activeSort.dir
          : defaultSortDirection
      );
    }
    setSortPanelOpen((open) => !open);
  };

  const closeSortPanel = React.useCallback(() => {
    setSortPanelOpen(false);
    requestAnimationFrame(() => sortButtonRef.current?.focus());
  }, []);

  const applyMobileSort = () => {
    if (!draftSortColumn) return;
    onSortInfoChange(
      setColumnSortInfo({
        sortInfo,
        col: draftSortColumn,
        dir: draftSortDirection,
        sortFunctions,
      })
    );
    closeSortPanel();
  };

  const clearMobileSort = () => {
    onSortInfoChange(Array.isArray(sortInfo) ? [] : null);
    closeSortPanel();
  };

  const selectVariant = (next: TypeMobileTransformVariant) => {
    if (next === activeVariant) return;
    if (controlledVariant === undefined) setUncontrolledVariant(next);
    onVariantChange?.(next);
  };

  /** ---------------- virtualization ---------------- */

  const hasActionColumns = React.useMemo(
    () =>
      columns.some((column) => {
        if (column.mobileRole) return column.mobileRole === "action";
        const columnId = getColumnId(column);
        return ACTION_COLUMN.test(`${columnId} ${labelForColumn(column)}`);
      }),
    [columns]
  );
  const estimatedRowHeight =
    activeVariant === "list"
      ? estimatedListHeight + (bottomListActions && hasActionColumns ? 48 : 0)
      : estimatedCardHeight;

  // The window virtualizer positions items in document space, so it needs the
  // list's document offset. Only the toolbar can change that without the list
  // moving, so it is what gets observed.
  const [scrollMargin, setScrollMargin] = React.useState(0);
  useIsomorphicLayoutEffect(() => {
    if (!pageScroll) return;
    const list = listRef.current;
    if (!list) return;

    const measure = () => {
      const next = Math.round(
        list.getBoundingClientRect().top + window.scrollY
      );
      setScrollMargin((current) => (current === next ? current : next));
    };

    measure();
    window.addEventListener("resize", measure);
    const observed = [toolbarRef.current, settingsPanelRef.current].filter(
      (element): element is HTMLDivElement => element != null
    );
    const observer =
      typeof ResizeObserver === "undefined" || observed.length === 0
        ? null
        : new ResizeObserver(measure);
    for (const element of observed) observer?.observe(element);
    return () => {
      window.removeEventListener("resize", measure);
      observer?.disconnect();
    };
  }, [
    pageScroll,
    sortPanelOpen,
    settingsOpen,
    openSettingsSection,
    activeVariant,
    plainChrome,
    visibleRows,
  ]);

  /*
   * Measured heights are cached against this key. Without it the cache is keyed
   * by index, so collapsing a branch shifts every row after it onto a
   * neighbour's measurement and an open row's height is left behind as a gap.
   */
  const getItemKey = React.useCallback(
    (index: number) => visibleRows[index]?.id ?? index,
    [visibleRows]
  );

  const containerVirtualizer = useVirtualizer({
    count: visibleRows.length,
    enabled: !pageScroll,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => estimatedRowHeight,
    getItemKey,
    overscan: 5,
  });
  const windowVirtualizer = useWindowVirtualizer({
    count: visibleRows.length,
    enabled: pageScroll,
    estimateSize: () => estimatedRowHeight,
    getItemKey,
    overscan: 5,
    scrollMargin,
  });
  const virtualizer = pageScroll ? windowVirtualizer : containerVirtualizer;
  const virtualOffset = pageScroll ? scrollMargin : 0;

  React.useEffect(() => {
    if (pageScroll) return;
    containerVirtualizer.scrollToOffset(0);
  }, [containerVirtualizer, deferredQuery, pageScroll]);

  /*
   * Deferred to after the rows swap in: measured against the outgoing page, the
   * scroll aims at the wrong offset.
   *
   * Instant, not smooth. The new page's rows measure while an animation would
   * still be running, and the resulting layout change aborts it: from 1642px
   * the scroll reliably died at 1533px, one row short of a journey to 193px,
   * while the same smooth scroll with no page change underneath it completed
   * every time. A page change is a jump anyway.
   */
  const pendingPageScrollRef = React.useRef(false);
  React.useEffect(() => {
    if (!pendingPageScrollRef.current) return;
    pendingPageScrollRef.current = false;
    if (!pageScroll) {
      containerVirtualizer.scrollToOffset(0);
      return;
    }
    // The wrapper rather than the list: the toolbar between them is sticky, so
    // its own box is already offset and cannot say where the page starts.
    const anchor = pageBodyRef.current ?? listRef.current;
    if (!anchor) return;
    const clearance = resolveStickyOffset(toolbarRef.current, anchor) + 16;
    window.scrollTo({
      top: Math.max(
        0,
        anchor.getBoundingClientRect().top + window.scrollY - clearance
      ),
      behavior: "instant" as ScrollBehavior,
    });
  }, [containerVirtualizer, pageScroll, pagerPageIndex]);

  // Focusing the grid activates a row by itself, and page scroll would move the
  // document to it — out from under the pointer that just did the focusing, so
  // its mouseup lands elsewhere and the control is never actually clicked. Only
  // a later change, which is real navigation, scrolls.
  const scrolledToActiveIndexRef = React.useRef<number | null>(null);
  React.useLayoutEffect(() => {
    if (!gridFocused || activeIndex < 0) return;
    const previous = scrolledToActiveIndexRef.current;
    scrolledToActiveIndexRef.current = activeIndex;
    if (previous === activeIndex) return;
    if (pageScroll && previous === null) return;
    const displayIndex = visibleRows.findIndex(
      (row) => row.index === activeIndex
    );
    if (displayIndex < 0) return;
    virtualizer.scrollToIndex(displayIndex, { align: "auto" });
  }, [activeIndex, visibleRows, gridFocused, pageScroll, virtualizer]);

  const emptyContent =
    !loading && filteredRows.length === 0
      ? resolveEmptyText(emptyText, i18n)
      : null;

  /** ---------------- rows ---------------- */

  const splitRowCells = (row: GridRow) => {
    const cells = row.getVisibleCells() as GridCell[];
    const checkboxCell = cells.find(
      (cell) => cell.column.id === checkboxColumnId
    );
    const roleOf = (cell: GridCell) =>
      columnMap.get(cell.column.id)?.mobileRole;
    const dataCells = cells.filter(
      (cell) =>
        cell.column.id !== checkboxColumnId &&
        (detailColumnId === undefined || cell.column.id !== detailColumnId) &&
        !hiddenMobileColumnIds.has(cell.column.id) &&
        roleOf(cell) !== "hidden"
    );
    const actionCells = dataCells.filter((cell) => {
      const role = roleOf(cell);
      if (role) return role === "action";
      return ACTION_COLUMN.test(
        `${cell.column.id} ${labelForColumn(columnMap.get(cell.column.id) ?? ({ name: cell.column.id } as TypeColumn))}`
      );
    });
    const contentCells = dataCells.filter(
      (cell) => !actionCells.includes(cell)
    );
    // Reversed so the last explicit "primary" wins.
    const primaryCell =
      [...contentCells].reverse().find((cell) => roleOf(cell) === "primary") ??
      contentCells.find(
        (cell) =>
          roleOf(cell) !== "detail" &&
          !ID_COLUMN.test(cell.column.id) &&
          typeof cell.getValue() === "string"
      ) ??
      contentCells.find((cell) => roleOf(cell) !== "detail") ??
      contentCells[0];
    const detailCells = contentCells.filter((cell) => {
      const mode = columnMap.get(cell.column.id)?.mobileDetail;
      if (mode === "never") return false;
      if (mode === "always") return true;
      // A list row's headline carries no label, so leaving it out of the panel
      // makes the row's own subject the one value an open row cannot name. A
      // card labels its headline in the header, where repeating it says
      // nothing.
      if (cell === primaryCell) return activeVariant === "list";
      return true;
    });
    return { actionCells, checkboxCell, contentCells, detailCells, primaryCell };
  };

  const toggleExpandedRow = React.useCallback((rowId: string) => {
    setExpandedRowIds((current) => {
      const next = new Set(current);
      if (!next.delete(rowId)) next.add(rowId);
      return next;
    });
  }, []);

  /*
   * Collapsing a branch takes its descendants off the list, and an open one
   * would come back open when the branch reopens. The tree already forgets a
   * descendant's own expansion (`collapseChildrenRecursive`), so the panel
   * follows it. Scoped to a tree: a flat list has nothing that can take a row
   * away and give it back.
   */
  React.useEffect(() => {
    if (!tree.enabled) return;
    setExpandedRowIds((current) => {
      if (current.size === 0) return current;
      const onList = new Set(visibleRows.map((row) => row.id));
      const next = new Set([...current].filter((id) => onList.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [tree.enabled, visibleRows]);

  const columnFor = (cell: GridCell) =>
    columnMap.get(cell.column.id) ?? ({ name: cell.column.id } as TypeColumn);

  const cellLabel = (cell: GridCell) => labelForColumn(columnFor(cell));

  // `mobileRender` is the escape for renderers built around a table cell's
  // geometry; everything else reuses the renderer TanStack has cached.
  const renderCellContent = (
    cell: GridCell,
    mobileSurface: TypeMobileCellSurface,
    mobileLabelShown = false
  ) => {
    const column = columnMap.get(cell.column.id);
    const mobileRender = column?.mobileRender;
    if (!mobileRender) {
      return flexRender(cell.column.columnDef.cell, cell.getContext());
    }

    return mobileRender({
      value: cell.getValue(),
      data: cell.row.original,
      rowIndex: cell.row.index,
      column,
      columnId: cell.column.id,
      mobileSurface,
      mobileLabelShown,
      cellProps:
        typeof column.cellProps === "object" && column.cellProps !== null
          ? (column.cellProps as Record<string, unknown>)
          : {},
    } as CellProps);
  };

  const valueClassName = (cell: GridCell) =>
    cn(
      "tdg-mobile-cell min-w-0 break-words text-sm [&_.truncate]:overflow-visible [&_.truncate]:whitespace-normal",
      typeof cell.getValue() === "number" && "tabular-nums"
    );

  const renderDetailList = (cells: GridCell[], className: string) => (
    <dl
      className={cn(
        "tdg-mobile-card-fields grid",
        cardFieldColumnsClass,
        className
      )}
      data-card-fields={cardFields}
      data-card-columns={cardColumns}
    >
      {cells.map((cell) => (
        <div key={cell.id} className="tdg-mobile-card-field min-w-0">
          <dt className="text-xs font-medium text-muted-foreground">
            {cellLabel(cell)}
          </dt>
          <dd
            className={valueClassName(cell)}
            data-slot="mobile-cell"
            data-cell-role="detail"
          >
            {renderCellContent(cell, "panel", true)}
          </dd>
        </div>
      ))}
    </dl>
  );

  const renderRow = (virtualIndex: number) => {
    const row = visibleRows[virtualIndex]!;
    // Separators sit between rows, so the last one carries no rule.
    const isFirstRow = virtualIndex === 0;
    const isLastRow = virtualIndex === visibleRows.length - 1;
    // A branch control after the row is what closes the group, not the row.
    const branchMoreFollows = branchTruncationByRowId.has(row.id);
    const rowIndex = row.index;
    const rowIsDisabled = isRowDisabled(rowIndex);
    const rowIsSelected = Boolean(selectedMap[row.id]);
    const rowIsActive = rowIndex === activeIndex;
    const { actionCells, checkboxCell, contentCells, detailCells, primaryCell } =
      splitRowCells(row);
    const visibleDetailCells = detailCells.slice(0, cardFieldLimit);
    const overflowDetailCells = detailCells.slice(cardFieldLimit);
    const listDetailCells = (
      listFieldIds
        ? listFieldIds
            .map((columnId) =>
              contentCells.find((cell) => cell.column.id === columnId)
            )
            .filter((cell): cell is GridCell => cell != null)
        : // The summary sits directly under the headline, so the headline in it
          // is the same value twice on one row. The open panel still carries it,
          // where it is the only place the value gets a name. Naming it in
          // `listFieldIds` is still honoured, since that is a deliberate ask.
          contentCells.filter((cell) => cell !== primaryCell)
    ).slice(0, listFieldLimit);

    const stateClassName = cn(
      rowIsActive && "tdg-row--active InovuaReactDataGrid__row--active",
      rowIsActive &&
        gridFocused &&
        cn(
          "tdg-row--focused InovuaReactDataGrid__row--focused",
          rowFocusClassName,
          showActiveRowIndicator ? activeRowIndicatorClassName : ""
        ),
      rowIsDisabled &&
        "tdg-row--disabled InovuaReactDataGrid__row--disabled pointer-events-none opacity-50"
    );

    const rowHandlers = {
      onClick: rowIsDisabled
        ? undefined
        : (event: React.MouseEvent) =>
            onRowClick(row.id, row.original, rowIndex, event),
      onContextMenu: onRowContextMenu
        ? (event: React.MouseEvent<HTMLElement>) => {
            onRowContextMenu(row.id, row.original, rowIndex, event, {
              left: event.clientX,
              top: event.clientY,
            });
          }
        : undefined,
      onClickCapture: (event: React.MouseEvent) => {
        if (Date.now() > suppressClickUntilRef.current) return;
        suppressClickUntilRef.current = 0;
        event.preventDefault();
        event.stopPropagation();
      },
      onPointerDown: onRowContextMenu
        ? (event: React.PointerEvent<HTMLElement>) => {
            if (event.pointerType !== "touch") return;
            event.persist();
            cancelLongPress();
            suppressClickUntilRef.current = 0;
            longPressStartRef.current = { x: event.clientX, y: event.clientY };
            const currentTarget = event.currentTarget;
            longPressTimerRef.current = setTimeout(() => {
              longPressTimerRef.current = null;
              suppressClickUntilRef.current = Date.now() + 800;
              onRowContextMenu(row.id, row.original, rowIndex, event, {
                left: event.clientX,
                top: event.clientY,
              });
              currentTarget.focus?.({ preventScroll: true });
            }, 500);
          }
        : undefined,
      onPointerMove: (event: React.PointerEvent<HTMLElement>) => {
        const start = longPressStartRef.current;
        if (
          start &&
          Math.hypot(event.clientX - start.x, event.clientY - start.y) > 8
        ) {
          cancelLongPress();
        }
      },
      onPointerUp: cancelLongPress,
      onPointerCancel: cancelLongPress,
    };

    const rowAttributes = {
      id: `${rowIdPrefix}-${rowIndex}`,
      "data-slot": "grid-row",
      "data-row-id": row.id,
      "data-row-index": rowIndex,
      "data-selected": rowIsSelected ? "true" : "false",
      "data-active": rowIsActive ? "true" : "false",
      "data-first": isFirstRow ? "true" : undefined,
      "data-last": isLastRow ? "true" : undefined,
      "data-disabled": rowIsDisabled ? "true" : undefined,
      "aria-disabled": rowIsDisabled || undefined,
      "aria-current": rowIsActive ? "true" : undefined,
      "aria-selected": selectionEnabled ? rowIsSelected : undefined,
    } as const;
    const treeDepth = tree.enabled
      ? (getTreeMetadataRef.current(row.original as TreeRecord)?.depth ?? 0)
      : undefined;
    // A card's body sits outside its header, so it clears the header's controls
    // by hand. The card's toggle is its only way in, so it always shows.
    const cardGap = "var(--tdg-mobile-card-gap, 0.75rem)";
    const cardIndentParts: string[] = [];
    if (treeDepth != null) {
      cardIndentParts.push(
        `var(--tdg-mobile-tree-indent, 1rem) * ${treeDepth}`,
        `${MOBILE_TREE_TOGGLE_SIZE} + ${cardGap}`
      );
    }
    if (
      masterDetail.showColumn &&
      masterDetail.isExpandable(row.original, rowIndex)
    ) {
      cardIndentParts.push(`1.75rem + ${cardGap}`);
    }
    if (checkboxCell) {
      cardIndentParts.push(`${MOBILE_CHECKBOX_SIZE} + ${cardGap}`);
    }
    const cardBodyIndent = cardIndentParts.length
      ? `calc(${cardIndentParts.join(" + ")})`
      : undefined;
    const hierarchyControls = (
      <>
        {tree.renderToggle(row.original, rowIndex, MOBILE_TREE_TOGGLE)}
        {masterDetail.showColumn
          ? masterDetail.renderToggle(row.original, rowIndex)
          : null}
      </>
    );
    const detailsPanel = masterDetail.isExpanded(row.original, rowIndex) ? (
      <div
        id={masterDetail.getPanelId(row.original, rowIndex)}
        data-slot="row-details"
        data-row-id={row.id}
        onClick={(event) => event.stopPropagation()}
        onDoubleClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
        role="region"
        aria-label={`Details for ${row.id}`}
        /* Content-sized, as in the list variant: `rowExpandHeight` is the
           height of a table row plus its panel, and a card has no such band
           to measure against. */
        className="mt-2 w-full basis-full border-t border-border pt-3"
      >
        {masterDetail.renderDetails(row.original, rowIndex)}
      </div>
    ) : null;

    if (activeVariant === "list") {
      // One open region, not two. Master-detail owns the state where it applies,
      // so a consumer's `expandedRows` and callbacks stay authoritative.
      const briefActive =
        masterDetail.enabled &&
        masterDetail.isExpandable(row.original, rowIndex);
      // On a tree the chevron beside it owns the branch, so this is the only way
      // into the details and cannot be hidden.
      const briefToggleShown =
        briefActive && (tree.enabled || showRowExpandToggle);
      const expandable =
        rowsExpandable && (detailCells.length > 0 || briefActive);
      const rowExpanded = briefActive
        ? masterDetail.isExpanded(row.original, rowIndex)
        : expandable && expandedRowIds.has(row.id);
      const fieldsPanelId = `${rowIdPrefix}-${rowIndex}-fields`;
      const toggleFields = briefActive
        ? () => masterDetail.toggle(row.original, rowIndex)
        : () => toggleExpandedRow(row.id);

      const summaryLabelsShown = listSummaryLabels === "show";
      const labelShownFor = (cell: GridCell) =>
        columnFor(cell).mobileSummaryLabel ?? summaryLabelsShown;
      const renderSummaryFields = () =>
        listDetailCells.map((cell) => (
          <span
            key={cell.id}
            className="tdg-mobile-row-field flex min-w-0 items-center"
          >
            <span
              className={cn(
                "shrink-0 opacity-70",
                // Off the screen rather than out of the document: the label is
                // the only thing naming the value to a screen reader.
                !labelShownFor(cell) && "sr-only"
              )}
            >
              {cellLabel(cell)}
            </span>
            {/* Wrapping rather than clipping: a field can hold a
                button or a row of icons, and neither ellipses. */}
            <span
              /* The cell's own renderer ellipsises to fit a table
                 column; here the column is a share of the row, so
                 the value wraps and stays readable in full. */
              className="tdg-mobile-cell min-w-0 break-words text-foreground/80 [&_.truncate]:overflow-visible [&_.truncate]:whitespace-normal"
              data-slot="mobile-cell"
              data-cell-role="summary"
            >
              {renderCellContent(cell, "summary", labelShownFor(cell))}
            </span>
          </span>
        ));
      const summaryContent =
        rowExpanded && listSummaryWhenOpen === "hide"
          ? null
          : renderListSummary
            ? renderListSummary({
                data: row.original,
                rowId: row.id,
                rowIndex,
                expanded: rowExpanded,
                fields: listDetailCells.map((cell) => ({
                  columnId: cell.column.id,
                  column: columnFor(cell),
                  label: cellLabel(cell),
                  value: cell.getValue(),
                  labelShown: labelShownFor(cell),
                  node: renderCellContent(cell, "summary", labelShownFor(cell)),
                })),
                renderDefault: () => <>{renderSummaryFields()}</>,
              })
            : listDetailCells.length
              ? renderSummaryFields()
              : null;

      // Clears the row's leading controls so the panel lines up with the title.
      const rowGap = "var(--tdg-mobile-row-gap, 0.75rem)";
      const openIndentParts: string[] = [];
      if (treeDepth != null) {
        openIndentParts.push(
          `var(--tdg-mobile-tree-indent, 1rem) * ${treeDepth}`,
          `${MOBILE_TREE_TOGGLE_SIZE} + ${rowGap}`
        );
      }
      if (briefToggleShown) openIndentParts.push(`1.75rem + ${rowGap}`);
      if (checkboxCell) {
        openIndentParts.push(`${MOBILE_CHECKBOX_SIZE} + ${rowGap}`);
      }
      const openRegionIndent = openIndentParts.length
        ? `calc(${openIndentParts.join(" + ")})`
        : undefined;

      const opensOnTap = expandable && listExpand === "click" && !rowIsDisabled;
      // A tap alone reaches neither a keyboard nor a switch, so where no
      // toggle is rendered the row's own title carries the control instead.
      const rowTitleOpens =
        opensOnTap &&
        !briefToggleShown &&
        !(expandable && showRowExpandToggle && !briefActive);
      const listRowHandlers = opensOnTap
        ? {
            ...rowHandlers,
            onClick: (event: React.MouseEvent) => {
              if (!isOperableTarget(event.target)) toggleFields();
              rowHandlers.onClick?.(event);
            },
          }
        : rowHandlers;
      const listHierarchyControls = (
        <>
          {tree.renderToggle(row.original, rowIndex, MOBILE_TREE_TOGGLE)}
          {briefToggleShown
            ? masterDetail.renderToggle(row.original, rowIndex)
            : null}
        </>
      );

      return (
        <article
          className={cn(
            "tdg-mobile-row min-w-0",
            bottomListActions
              ? "flex flex-col gap-2"
              : "flex flex-wrap items-center gap-3",
            "[border-color:var(--tdg-mobile-list-border-color,var(--tdg-grid-border-color))]",
            boxedListRows
              ? "border-x border-b bg-[var(--tdg-mobile-list-bg,var(--tdg-grid-bg))]"
              : cn(
                  !isLastRow && "border-b",
                  plainChrome
                    ? "bg-[var(--tdg-mobile-list-bg,transparent)]"
                    : "bg-[var(--tdg-mobile-list-bg,var(--tdg-grid-bg))]"
                ),
            boxedListRows &&
              isFirstRow &&
              "rounded-t-[var(--tdg-mobile-list-radius,0.5rem)] border-t",
            boxedListRows &&
              isLastRow &&
              !branchMoreFollows &&
              "rounded-b-[var(--tdg-mobile-list-radius,0.5rem)]",
            stateClassName
          )}
          {...rowAttributes}
          data-tappable={opensOnTap ? "true" : undefined}
          style={
            treeDepth == null
              ? undefined
              : ({
                  "--tdg-mobile-row-indent-inset":
                    mobileTreeIndentOffset(treeDepth),
                } as React.CSSProperties)
          }
          data-expanded={rowExpanded ? "true" : undefined}
          {...listRowHandlers}
        >
          <div
            className={cn(
              "tdg-mobile-row-line flex min-w-0 items-center",
              bottomListActions ? "w-full" : "contents"
            )}
          >
            {listHierarchyControls}
            {checkboxCell ? (
              <div className="shrink-0">
                {flexRender(
                  checkboxCell.column.columnDef.cell,
                  checkboxCell.getContext()
                )}
              </div>
            ) : null}
            {/* Stood down under `title`, so the headline and the summary become
                flex items of the row itself and the actions can sit between
                them. */}
            <div className={titleListActions ? "contents" : "min-w-0 flex-1"}>
              {primaryCell ? (
                rowTitleOpens ? (
                  <button
                    type="button"
                    className={cn(
                      "tdg-mobile-cell block w-full min-w-0 truncate rounded-sm text-left text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      titleListActions && "flex-1"
                    )}
                    data-slot="mobile-cell"
                    data-cell-role="primary"
                    aria-expanded={rowExpanded}
                    aria-controls={fieldsPanelId}
                    onClick={() => toggleFields()}
                  >
                    {renderCellContent(primaryCell, "title")}
                  </button>
                ) : (
                  <div
                    className={cn(
                      "tdg-mobile-cell min-w-0 truncate text-sm font-semibold text-foreground",
                      titleListActions && "flex-1"
                    )}
                    data-slot="mobile-cell"
                    data-cell-role="primary"
                  >
                    {renderCellContent(primaryCell, "title")}
                  </div>
                )
              ) : null}
              {summaryContent ? (
                <div
                  className={cn(
                    "tdg-mobile-row-summary flex min-w-0 text-xs text-muted-foreground",
                    listSummaryFlow === "column"
                      ? "flex-col items-start"
                      : "flex-wrap items-center",
                    // Past the controls and the full width of the row, so they
                    // stay up on the headline's line and this wraps under them.
                    // Ordered rather than last: the open fields panel is a row
                    // item too, and has to stay below this.
                    titleListActions && "order-1 w-full"
                  )}
                  data-summary-flow={listSummaryFlow}
                  data-summary-separator={listSummarySeparator}
                  // Spanning the row, it would otherwise start under the
                  // checkbox rather than under the title it belongs to.
                  style={
                    titleListActions && openRegionIndent
                      ? { paddingInlineStart: openRegionIndent }
                      : undefined
                  }
                >
                  {summaryContent}
                </div>
              ) : null}
            </div>
            {expandable && showRowExpandToggle && !briefActive ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="tdg-mobile-row-expand h-8 w-8 shrink-0 text-muted-foreground"
                aria-expanded={rowExpanded}
                aria-controls={fieldsPanelId}
                /* A disabled row's `aria-disabled` is handed down the
                   accessibility tree. Reading a row is not acting on it. */
                aria-disabled={false}
                aria-label={rowExpanded ? collapseRowLabel : expandRowLabel}
                title={rowExpanded ? collapseRowLabel : expandRowLabel}
                onClick={(event) => {
                  event.stopPropagation();
                  toggleFields();
                }}
              >
                <ChevronDown
                  className={cn(
                    "transition-transform",
                    rowExpanded && "rotate-180"
                  )}
                />
              </Button>
            ) : null}
          </div>
          {actionCells.length ? (
            <div
              className={cn(
                "tdg-mobile-row-actions flex items-center gap-1",
                bottomListActions
                  ? cn(
                      "w-full flex-wrap",
                      leadingListActions ? "justify-start" : "justify-end"
                    )
                  : cn("shrink-0", leadingListActions && "order-first")
              )}
              // On its own row it starts at the row's edge, under the checkbox
              // and the toggles rather than under the title it belongs to.
              style={
                bottomListActions && openRegionIndent
                  ? { paddingInlineStart: openRegionIndent }
                  : undefined
              }
            >
              {actionCells.map((cell) => (
                <div
                  key={cell.id}
                  className="tdg-mobile-cell"
                  data-slot="mobile-cell"
                  data-cell-role="action"
                >
                  {renderCellContent(cell, "action")}
                </div>
              ))}
            </div>
          ) : null}
          {rowExpanded ? (
            <div
              id={fieldsPanelId}
              data-slot="mobile-row-fields"
              /* Fade and a nudge rather than a height transition: the rows are
                 virtualized, and animating the height makes the virtualizer
                 re-measure every frame and shove the rows below around. */
              className={cn(
                "tdg-mobile-row-fields mt-1 w-full basis-full animate-in duration-150 fade-in-0 slide-in-from-top-1",
                titleListActions && "order-2"
              )}
              onClick={(event) => event.stopPropagation()}
            >
              {detailCells.length ? (
                <div
                  style={
                    openRegionIndent
                      ? { paddingInlineStart: openRegionIndent }
                      : undefined
                  }
                >
                  {renderDetailList(detailCells, "gap-y-2")}
                </div>
              ) : null}
              {briefActive ? (
                <div
                  id={masterDetail.getPanelId(row.original, rowIndex)}
                  data-slot="row-details"
                  data-row-id={row.id}
                  role="region"
                  aria-label={`Details for ${row.id}`}
                  /* Content-sized: `rowExpandHeight` would nest a scroll
                     region inside the page's own scroll. */
                  style={{
                    paddingInlineStart: `var(--tdg-mobile-row-details-inset, ${openRegionIndent ?? "0px"})`,
                  }}
                  className={cn(
                    "w-full",
                    detailCells.length && "mt-3 border-t border-border pt-3"
                  )}
                >
                  {masterDetail.renderDetails(row.original, rowIndex)}
                </div>
              ) : null}
            </div>
          ) : null}
        </article>
      );
    }

    return (
      <article
        className={cn(
          "tdg-mobile-card rounded-md border bg-background shadow-sm [border-color:var(--tdg-grid-border-color)]",
          stateClassName
        )}
        {...rowAttributes}
        {...rowHandlers}
      >
        <header className="tdg-mobile-card-header flex min-w-0 items-start">
          {hierarchyControls}
          {checkboxCell ? (
            <div className="mt-0.5 shrink-0">
              {flexRender(
                checkboxCell.column.columnDef.cell,
                checkboxCell.getContext()
              )}
            </div>
          ) : null}
          <div className="min-w-0 flex-1">
            {primaryCell ? (
              <>
                <div className="text-xs font-medium text-muted-foreground">
                  {cellLabel(primaryCell)}
                </div>
                <div
                  className="tdg-mobile-cell min-w-0 break-words text-base font-semibold text-foreground"
                  data-slot="mobile-cell"
                  data-cell-role="primary"
                >
                  {renderCellContent(primaryCell, "title")}
                </div>
              </>
            ) : null}
          </div>
        </header>
        <div
          style={
            cardBodyIndent ? { paddingInlineStart: cardBodyIndent } : undefined
          }
        >
          {detailCells.length
            ? renderDetailList(visibleDetailCells, "mt-4")
            : null}
          {overflowDetailCells.length ? (
            <details
              className="mt-3 border-t pt-3 [border-color:var(--tdg-grid-border-color)]"
              onClick={(event) => event.stopPropagation()}
            >
              <summary className="cursor-pointer text-sm font-medium text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                {overflowDetailCells.length}{" "}
                {label(
                  overflowDetailCells.length === 1
                    ? "mobileMoreField"
                    : "mobileMoreFields",
                  overflowDetailCells.length === 1
                    ? "more field"
                    : "more fields"
                )}
              </summary>
              {renderDetailList(overflowDetailCells, "mt-3")}
            </details>
          ) : null}
          {actionCells.length ? (
            <footer className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t pt-3 [border-color:var(--tdg-grid-border-color)]">
              {actionCells.map((cell) => (
                <div
                  key={cell.id}
                  className="tdg-mobile-cell"
                  data-slot="mobile-cell"
                  data-cell-role="action"
                >
                  {renderCellContent(cell, "action")}
                </div>
              ))}
            </footer>
          ) : null}
          {detailsPanel}
        </div>
      </article>
    );
  };

  // Rendered even when empty: it is the list landmark, and the page-scroll
  // Inside the row it follows, so the virtualizer keeps one item per row.
  const renderBranchMore = (index: number) => {
    const row = visibleRows[index];
    const truncation = row ? branchTruncationByRowId.get(row.id) : undefined;
    if (!truncation) return null;
    return (
      <div
        className={cn(
          // Padded so the hover fill stops short of the rules above and below.
          "tdg-mobile-branch-more flex w-full py-1.5",
          // Boxed rows are one bordered group, so this joins it.
          boxedListRows &&
            cn(
              "border-x border-b bg-[var(--tdg-mobile-list-bg,var(--tdg-grid-bg))]",
              "[border-color:var(--tdg-mobile-list-border-color,var(--tdg-grid-border-color))]",
              index === visibleRows.length - 1 &&
                "rounded-b-[var(--tdg-mobile-list-radius,0.5rem)]"
            )
        )}
        style={{
          paddingInlineStart: mobileTreeContentOffset(truncation.depth),
        }}
        data-slot="mobile-branch-more"
        data-depth={truncation.depth}
      >
        <Button
          type="button"
          variant="ghost"
          className="h-9 justify-start px-2 text-sm text-muted-foreground"
          onClick={() => tree.revealBranch(truncation.branchKey, showMoreStep)}
        >
          {mobileShowMoreValue}
          {/* What is left in this branch, not what one press reveals. */}
          <span className="ml-1 tabular-nums opacity-70">
            ({truncation.hidden})
          </span>
        </Button>
      </div>
    );
  };

  // virtualizer measures its document offset through `listRef`.
  const listBody = (
    <div
      ref={listRef}
      className="tdg-mobile-list relative w-full"
      style={
        visibleRows.length ? { height: virtualizer.getTotalSize() } : undefined
      }
      role="list"
      aria-label={label("mobileResultsListLabel", "Grid results")}
    >
      {visibleRows.length === 0 ? (
        loading || emptyContent == null ? null : (
          <div className="p-6 text-center text-sm text-muted-foreground">
            {emptyContent}
          </div>
        )
      ) : (
        virtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={visibleRows[virtualRow.index]!.id}
            ref={virtualizer.measureElement}
            data-index={virtualRow.index}
            className={cn(
              "absolute left-0 top-0 w-full",
              activeVariant === "list"
                ? boxedListRows && !plainChrome
                  ? "px-3"
                  : ""
                : plainChrome
                  ? "py-1.5"
                  : "px-3 py-1.5",
              boxedListEndGutters && virtualRow.index === 0 && "pt-3",
              boxedListEndGutters &&
                virtualRow.index === visibleRows.length - 1 &&
                "pb-3",
              // 6px under the last card against 12px at its sides reads as cut off.
              activeVariant === "cards" &&
                !plainChrome &&
                virtualRow.index === visibleRows.length - 1 &&
                "pb-3"
            )}
            style={{
              transform: `translateY(${virtualRow.start - virtualOffset}px)`,
            }}
            role="listitem"
          >
            {renderRow(virtualRow.index)}
            {renderBranchMore(virtualRow.index)}
          </div>
        ))
      )}
    </div>
  );

  const overflowControls =
    (canShowMore || paginationEnabled || gridPaging) &&
    filteredRows.length > 0 ? (
      <div
        className={cn(
          "tdg-mobile-overflow flex shrink-0 flex-col gap-3",
          plainChrome
            ? "pt-3"
            : "border-t bg-background p-3 [border-color:var(--tdg-grid-border-color)]"
        )}
        data-slot="mobile-overflow"
      >
        {canShowMore ? (
          <Button
            type="button"
            variant="outline"
            className="tdg-mobile-show-more h-11 w-full"
            onClick={() =>
              setRevealed((current) =>
                Math.min(current + showMoreStep, pageRows.length)
              )
            }
          >
            {mobileShowMoreValue}
            {/* What is left to reveal, not what one press reveals. */}
            <span className="ml-1 tabular-nums opacity-70">
              ({pageRows.length - revealed})
            </span>
          </Button>
        ) : null}
        {gridPaging ? (
          <MobileGridPagination
            {...gridPaging}
            i18n={i18n}
            onPageIndexChange={(next) => {
              pendingPageScrollRef.current = true;
              gridPaging.onPageIndexChange(next);
            }}
            onPageSizeChange={(next) => {
              pendingPageScrollRef.current = true;
              gridPaging.onPageSizeChange(next);
            }}
          />
        ) : paginationEnabled ? (
          <MobileGridPagination
            pageIndex={safePageIndex}
            pageCount={pageCount}
            pageSize={pageSize}
            pageSizes={pageSizes}
            rangeStart={pageStart}
            rangeEnd={Math.min(
              pageStart + pageRows.length,
              filteredRows.length
            )}
            total={filteredRows.length}
            i18n={i18n}
            onPageIndexChange={(next) => {
              pendingPageScrollRef.current = true;
              setPageIndex(next);
            }}
            onPageSizeChange={(next) => {
              pendingPageScrollRef.current = true;
              setPageSize(next);
              setPageIndex(0);
            }}
          />
        ) : null}
      </div>
    ) : null;

  // The two surfaces draw the same toggles, so they share the data and not the
  // markup: a menu needs menu items, the drawer and the panel need rows a thumb can hit.
  const displayToggles: SettingsToggle[] = displayColumns.map((column) => {
    const columnId = getColumnId(column);
    const checked = !hiddenMobileColumnIds.has(columnId);

    return {
      checked,
      disabled:
        column.hideable === false ||
        (checked && visibleDisplayColumnCount <= 1),
      id: columnId,
      label: labelForColumn(column),
      setChecked: (next) => setMobileColumnDisplayed(columnId, next),
    };
  });

  const searchToggles: SettingsToggle[] = searchableColumns.map((column) => {
    const columnId = getColumnId(column);
    const checked = searchedColumnIds.has(columnId);

    return {
      checked,
      disabled: checked && searchedColumnIds.size <= 1,
      id: columnId,
      label: labelForColumn(column),
      setChecked: (next) => setSearchColumnSearched(columnId, next),
    };
  });

  const toMenuItems = (toggles: SettingsToggle[]) =>
    toggles.map((toggle) => (
      <DropdownMenuCheckboxItem
        key={toggle.id}
        checked={toggle.checked}
        disabled={toggle.disabled}
        onCheckedChange={(checked) => toggle.setChecked(checked === true)}
        onSelect={(event) => event.preventDefault()}
      >
        {toggle.label}
      </DropdownMenuCheckboxItem>
    ));

  const columnToggleItems = toMenuItems(displayToggles);

  const columnPickerShown = columnPickerEnabled && displayColumns.length > 0;
  const searchScopeShown =
    searchEnabled &&
    onSearchColumnIdsChange != null &&
    searchToggles.length > 1;
  const settingsShown =
    showSettings &&
    (showVariantToggle || columnPickerShown || searchScopeShown);

  const settingsTrigger = (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="tdg-mobile-settings h-10 w-10 shrink-0 data-[state=open]:bg-secondary"
      aria-label={mobileSettingsLabel}
      title={mobileSettingsLabel}
    >
      <SlidersHorizontal />
    </Button>
  );

  const renderSortControls = (stacked: boolean) => (
    <>
      <div
        className={cn(
          "grid gap-3",
          // A media query would read the viewport, and these surfaces are
          // narrow whatever the viewport is doing.
          !stacked &&
            "min-[540px]:grid-cols-[minmax(0,1fr)_auto] min-[540px]:items-end"
        )}
      >
        <label className="grid min-w-0 gap-1.5 text-xs font-medium text-muted-foreground">
          {mobileSortByValue}
          <Select
            value={draftSortColumnId}
            onValueChange={setDraftSortColumnId}
          >
            <SelectTrigger aria-label={mobileSortByLabel}>
              <SelectValue
                placeholder={label(
                  "mobileSortColumnPlaceholder",
                  "Choose a column"
                )}
              />
            </SelectTrigger>
            <SelectContent>
              {sortableColumns.map((column) => (
                <SelectItem
                  key={getColumnId(column)}
                  value={getColumnId(column)}
                >
                  {labelForColumn(column)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <div
          className="grid grid-cols-2 gap-1 rounded-md bg-muted p-1"
          role="group"
          aria-label={label("mobileSortDirection", "Sort direction")}
        >
          <Button
            type="button"
            size="sm"
            variant={draftSortDirection === 1 ? "secondary" : "ghost"}
            className="h-10 px-3"
            aria-pressed={draftSortDirection === 1}
            onClick={() => setDraftSortDirection(1)}
          >
            <ArrowUp />
            {mobileSortAscValue}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={draftSortDirection === -1 ? "secondary" : "ghost"}
            className="h-10 px-3"
            aria-pressed={draftSortDirection === -1}
            onClick={() => setDraftSortDirection(-1)}
          >
            <ArrowDown />
            {mobileSortDescValue}
          </Button>
        </div>
      </div>
      <div
        className={cn(
          "mt-3 flex items-center gap-2",
          stacked ? "justify-stretch" : "justify-end"
        )}
      >
        {activeSort ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn("h-10 flex-1", !stacked && "min-[540px]:flex-none")}
            onClick={clearMobileSort}
          >
            {t(i18n, "mobileClearSort", "Clear sort")}
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          className={cn("h-10 flex-1", !stacked && "min-[540px]:flex-none")}
          disabled={!draftSortColumn}
          onClick={applyMobileSort}
        >
          {t(i18n, "mobileApplySort", "Apply sort")}
        </Button>
      </div>
    </>
  );

  const defaultSettingsSection: "sort" | "columns" | "search" =
    sortEnabled && sortableColumns.length > 0
      ? "sort"
      : searchScopeShown
        ? "search"
        : "columns";

  const settingsSection = (
    key: "sort" | "columns" | "search",
    title: React.ReactNode,
    summary: React.ReactNode,
    body: React.ReactNode
  ) => {
    const open = openSettingsSection === key;
    const sectionId = `${rowIdPrefix}-settings-${key}`;

    return (
      <section
        className="border-b [border-color:var(--tdg-grid-border-color)]"
        data-slot="mobile-settings-section"
        data-open={open ? "true" : undefined}
      >
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
          aria-expanded={open}
          aria-controls={sectionId}
          onClick={() => setOpenSettingsSection(open ? null : key)}
        >
          <span className="text-sm font-medium">{title}</span>
          <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
            {summary}
            <ChevronDown
              className={cn("transition-transform", open && "rotate-180")}
            />
          </span>
        </button>
        {open ? (
          <div id={sectionId} className="pb-2">
            {body}
          </div>
        ) : null}
      </section>
    );
  };

  const settingsRows = (toggles: SettingsToggle[], filter: string) => {
    const needle = normalizeDataGridSearchText(filter);
    const shown = needle
      ? toggles.filter((toggle) =>
          normalizeDataGridSearchText(toggle.label).includes(needle)
        )
      : toggles;

    if (shown.length === 0) {
      return (
        <p className="px-4 py-3 text-sm text-muted-foreground">
          {label("mobileNoColumnsMatch", "No columns match")}
        </p>
      );
    }

    return shown.map((toggle) => (
      <label
        key={toggle.id}
        className={cn(
          "flex items-center gap-3 px-4 py-2.5 text-sm",
          toggle.disabled && "opacity-60"
        )}
      >
        <Checkbox
          checked={toggle.checked}
          disabled={toggle.disabled}
          onCheckedChange={(checked) => toggle.setChecked(checked === true)}
        />
        <span className="min-w-0 flex-1 truncate">{toggle.label}</span>
      </label>
    ));
  };

  const settingsFilter = (
    value: string,
    onValueChange: (next: string) => void
  ) => (
    <div className="px-4 pb-2">
      <Input
        value={value}
        placeholder={label("mobileFilterColumns", "Filter columns")}
        onChange={(event) => onValueChange(event.target.value)}
      />
    </div>
  );

  const settingsSelectAll = (
    toggles: SettingsToggle[],
    selectAll: () => void
  ) =>
    toggles.some((toggle) => !toggle.checked) ? (
      <div className="px-4 pb-1 pt-1">
        <Button type="button" variant="ghost" size="sm" onClick={selectAll}>
          {label("mobileSelectAllColumns", "Select all")}
        </Button>
      </div>
    ) : null;

  const inlineSettings = settingsSurface === "panel";
  // Both surfaces hold the sort panel, so the bar only needs a sort button of
  // its own while there is no settings button.
  const settingsHoldsSort = settingsShown;

  /* Two options, so it stays open: collapsing it would hide less than the row
     it takes. */
  const variantSection = !showVariantToggle ? null : (
    <section
      className="border-b px-4 py-3 [border-color:var(--tdg-grid-border-color)]"
      data-slot="mobile-settings-section"
      data-section="view"
      data-open="true"
    >
      <p className="text-sm font-medium">{mobileRowViewValue}</p>
      <div className="mt-1 grid grid-cols-2 gap-2">
        {(["list", "cards"] as TypeMobileTransformVariant[]).map(
          (candidate) => (
            <Button
              key={candidate}
              type="button"
              variant={activeVariant === candidate ? "secondary" : "outline"}
              className="h-10 justify-center"
              aria-pressed={activeVariant === candidate}
              onClick={() => selectVariant(candidate)}
            >
              {candidate === "cards" ? mobileCardsValue : mobileListValue}
            </Button>
          )
        )}
      </div>
    </section>
  );

  const sortSection =
    !sortEnabled || sortableColumns.length === 0
      ? null
      : settingsSection(
          "sort",
          mobileSortValue,
          activeSortSummary ?? label("mobileSortNone", "None"),
          <div className="px-4 pb-1">{renderSortControls(true)}</div>
        );

  const searchScopeSection = !searchScopeShown
    ? null
    : settingsSection(
        "search",
        mobileSearchColumnsValue,
        `${searchedColumnIds.size}/${searchToggles.length}`,
        <>
          {searchToggles.length > 12
            ? settingsFilter(searchColumnFilter, setSearchColumnFilter)
            : null}
          {settingsRows(searchToggles, searchColumnFilter)}
          {settingsSelectAll(searchToggles, () =>
            onSearchColumnIdsChange?.(
              searchableColumns.map((column) => getColumnId(column))
            )
          )}
        </>
      );

  const displayColumnsSection = !columnPickerShown
    ? null
    : settingsSection(
        "columns",
        mobileColumnsValue,
        `${visibleDisplayColumnCount}/${displayToggles.length}`,
        <>
          {displayToggles.length > 12
            ? settingsFilter(columnFilter, setColumnFilter)
            : null}
          {settingsRows(displayToggles, columnFilter)}
          {settingsSelectAll(displayToggles, () =>
            setHiddenMobileColumnIds(new Set())
          )}
        </>
      );

  const closeSettingsDrawer = () => {
    if (drawerCloseTimerRef.current) return;
    setSettingsClosing(true);
    drawerCloseTimerRef.current = setTimeout(() => {
      drawerCloseTimerRef.current = null;
      setSettingsClosing(false);
      setSettingsOpen(false);
      setOpenSettingsSection(null);
      setColumnFilter("");
      setSearchColumnFilter("");
    }, SETTINGS_DRAWER_EXIT_MS);
  };

  const settingsDrawer = !settingsShown ? null : (
    <Dialog
      open={settingsOpen}
      onOpenChange={(open) => {
        if (!open) {
          closeSettingsDrawer();
          return;
        }
        setSettingsOpen(true);
        setOpenSettingsSection(defaultSettingsSection);
      }}
    >
      <DialogTrigger asChild>{settingsTrigger}</DialogTrigger>
      {/* The shell centres itself with a translate as well as an offset: the
          offset is overruled in the stylesheet, the translate here. */}
      <DialogContent
        // Out of the grid root on purpose: it isolates its stacking layers, so
        // host chrome would otherwise paint over the sheet at any z-index.
        container={typeof document === "undefined" ? undefined : document.body}
        className="tdg-mobile-settings-drawer translate-x-0 translate-y-0 gap-0"
        data-closing={drawerClosing ? "true" : undefined}
        overlayClassName={cn(
          "tdg-mobile-settings-backdrop",
          drawerClosing && "tdg-mobile-settings-backdrop--closing"
        )}
      >
        <DialogHeader className="border-b px-4 py-3 text-left [border-color:var(--tdg-grid-border-color)]">
          <DialogTitle className="text-base">{mobileSettingsLabel}</DialogTitle>
        </DialogHeader>
        <div
          className="min-h-0 overflow-y-auto"
          data-slot="mobile-settings-body"
        >
          {variantSection}
          {sortSection}
          {searchScopeSection}
          {displayColumnsSection}
        </div>
      </DialogContent>
    </Dialog>
  );

  const settingsPanel = !settingsShown ? null : (
    <div
      ref={settingsPanelRef}
      id={settingsPanelId}
      className="mt-3 max-h-[min(60vh,26rem)] overflow-y-auto rounded-md border bg-background [border-color:var(--tdg-grid-border-color)] [&_section:last-child]:border-b-0"
      data-slot="mobile-settings-panel"
    >
      {variantSection}
      {sortSection}
      {searchScopeSection}
      {displayColumnsSection}
    </div>
  );

  const settingsPanelToggle = !settingsShown ? null : (
    <Button
      type="button"
      variant={settingsOpen ? "secondary" : "outline"}
      size="icon"
      className="tdg-mobile-settings h-10 w-10 shrink-0"
      aria-expanded={settingsOpen}
      aria-controls={settingsPanelId}
      aria-label={mobileSettingsLabel}
      title={mobileSettingsLabel}
      onClick={() =>
        setSettingsOpen((open) => {
          if (!open) setOpenSettingsSection(defaultSettingsSection);
          return !open;
        })
      }
    >
      <SlidersHorizontal />
    </Button>
  );

  const settingsControl = inlineSettings ? settingsPanelToggle : settingsDrawer;

  const toolbar = !showToolbar ? null : (
    <div
      ref={toolbarRef}
      className={cn(
        "tdg-mobile-toolbar shrink-0",
        plainChrome
          ? "pb-3"
          : "border-b bg-background p-3 [border-color:var(--tdg-grid-border-color)]",
        pageScroll &&
          "sticky top-[var(--tdg-mobile-toolbar-top,0px)] z-20 bg-[var(--tdg-mobile-toolbar-bg,var(--tdg-grid-bg))]",
        pageScroll && plainChrome && "pt-3"
      )}
      data-slot="mobile-toolbar"
    >
      {/* Wraps rather than squeezing the search field to nothing. The search
          keeps a minimum, and the controls beside it drop to their own line
          once that minimum plus their own widths no longer fit. */}
      <div className="flex flex-wrap items-center gap-2">
        {searchEnabled ? (
          <DataGridSearchBar
            value={query}
            columns={activeSearchColumns}
            onValueChange={setMobileSearchValue}
            ariaLabel={mobileSearchLabel}
            placeholder={mobileSearchPlaceholder}
            clearLabel={mobileSearchClearLabel}
          />
        ) : (
          <div className="min-w-0 flex-1" aria-hidden="true" />
        )}
        {mobileToolbarActions}
        {settingsControl}
        {showVariantToggle && !settingsShown ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="tdg-mobile-variant-toggle h-10 w-10 shrink-0"
            aria-label={
              activeVariant === "cards" ? mobileListLabel : mobileCardsLabel
            }
            title={
              activeVariant === "cards" ? mobileListLabel : mobileCardsLabel
            }
            data-variant={activeVariant}
            onClick={() =>
              selectVariant(activeVariant === "cards" ? "list" : "cards")
            }
          >
            {activeVariant === "cards" ? <Rows3 /> : <LayoutGrid />}
          </Button>
        ) : null}
        {sortEnabled && !settingsHoldsSort && sortableColumns.length ? (
          <Button
            ref={sortButtonRef}
            type="button"
            variant={sortPanelOpen ? "secondary" : "outline"}
            size="icon"
            className="h-10 w-10 shrink-0"
            aria-expanded={sortPanelOpen}
            aria-controls={sortPanelId}
            aria-label={
              activeSortSummary
                ? `${mobileSortLabel}: ${activeSortSummary}`
                : mobileSortLabel
            }
            title={
              activeSortSummary
                ? `${mobileSortLabel}: ${activeSortSummary}`
                : mobileSortLabel
            }
            onClick={toggleSortPanel}
          >
            <ArrowUpDown />
          </Button>
        ) : null}
        {columnPickerShown && !settingsShown ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-10 w-10 shrink-0 data-[state=open]:bg-secondary"
                aria-label={mobileColumnsLabel}
                title={mobileColumnsLabel}
              >
                <Columns3 />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56"
              style={MENU_SCROLL_BOUND}
            >
              <DropdownMenuLabel className={SETTINGS_SECTION_LABEL}>
                {mobileColumnsValue}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {columnToggleItems}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
      {resultCountEnabled || activeSortSummary ? (
        <div
          className={cn(
            "mt-2 flex min-h-5 items-center gap-3 text-xs text-muted-foreground",
            resultCountEnabled ? "justify-between" : "justify-end"
          )}
        >
          {resultCountEnabled ? (
            <output className="shrink-0 tabular-nums" aria-live="polite">
              {displayedResultCount} {resultsLabel}
            </output>
          ) : null}
          {activeSortSummary ? (
            <span className="min-w-0 truncate text-right">
              {label("mobileSortedBy", "Sorted by")} {activeSortSummary}
            </span>
          ) : null}
        </div>
      ) : null}
      {sortPanelOpen ? (
        <div
          id={sortPanelId}
          className="mt-3 rounded-md border bg-muted/30 p-3 [border-color:var(--tdg-grid-border-color)]"
          data-slot="mobile-sort-panel"
        >
          {renderSortControls(false)}
        </div>
      ) : null}
      {inlineSettings && settingsOpen ? settingsPanel : null}
    </div>
  );

  const handleEscape = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Escape" || event.defaultPrevented) return;

    if (sortPanelOpen) {
      event.preventDefault();
      event.stopPropagation();
      closeSortPanel();
      return;
    }

    if (inlineSettings && settingsOpen) {
      event.preventDefault();
      event.stopPropagation();
      setSettingsOpen(false);
    }
  };

  if (pageScroll) {
    return (
      <div
        className={cn(
          "tdg-mobile tdg-mobile--page-scroll flex w-full flex-col",
          plainChrome ? "" : "bg-muted/30"
        )}
        style={rootStyle}
        data-slot="mobile-grid-list"
        data-scroll-mode="page"
        data-chrome={chrome}
        data-variant={activeVariant}
        data-list-rows={listRows}
        data-list-actions={listActions}
        data-card-fields={cardFields}
        data-card-columns={cardColumns}
        data-active-indicator={showActiveRowIndicator ? "true" : undefined}
        onKeyDown={handleEscape}
      >
        {/* Scopes the sticky toolbar to the rows, so it slides away with the
            last one instead of overlaying the controls beneath. */}
        <div ref={pageBodyRef} className="relative flex w-full flex-col">
          {toolbar}
          {listBody}
        </div>
        {overflowControls}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "tdg-mobile flex min-h-0 flex-1 flex-col",
        plainChrome ? "" : "bg-muted/30"
      )}
      style={rootStyle}
      data-slot="mobile-grid-list"
      data-scroll-mode="container"
      data-chrome={chrome}
      data-variant={activeVariant}
      data-list-rows={listRows}
      data-list-actions={listActions}
      data-card-fields={cardFields}
      data-card-columns={cardColumns}
      data-active-indicator={showActiveRowIndicator ? "true" : undefined}
      onKeyDown={handleEscape}
    >
      {toolbar}
      <ScrollArea
        className="min-h-0 flex-1"
        viewportRef={scrollRef}
        viewportClassName="tdg-body-viewport min-h-0 flex-1"
        nativeScroll={nativeScroll}
        scrollProps={scrollProps}
        dir={rtl ? "rtl" : "ltr"}
        viewportProps={{
          dir: rtl ? "rtl" : "ltr",
          onScroll,
        }}
      >
        {listBody}
      </ScrollArea>
      {overflowControls}
    </div>
  );
}
