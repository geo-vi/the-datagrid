import * as React from "react";
import type { TreeGridController } from "../hierarchy/useTreeGrid";
import type { UseMasterDetailResult } from "../hierarchy/useMasterDetail";
import { flexRender, type Cell, type Row } from "@tanstack/react-table";
import { useVirtualizer, useWindowVirtualizer } from "@tanstack/react-virtual";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Columns3,
  LayoutGrid,
  Rows3,
} from "lucide-react";

import type {
  CellProps,
  TypeColumn,
  TypeDataGridProps,
  TypeMobileListActions,
  TypeMobileListRows,
  TypeMobileTransformOverflow,
  TypeMobileTransformScroll,
  TypeMobileTransformVariant,
  TypeSortFunctions,
  TypeSortInfo,
} from "../../types";
import { Button } from "../../components/ui/button";
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

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? React.useEffect : React.useLayoutEffect;

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
  const bottomListActions = listActions === "bottom";
  // A boxed group inside its own scrollport is cropped flush at both ends, so
  // nothing reads as the start or the end of the run. Page scroll ends against
  // the document instead, and the other row styles have their own gaps.
  const boxedListEndGutters =
    !pageScroll && activeVariant === "list" && boxedListRows && !plainChrome;
  const deferredQuery = useDeferredValueCompat(committedQuery);
  const sortButtonRef = React.useRef<HTMLButtonElement | null>(null);
  const toolbarRef = React.useRef<HTMLDivElement | null>(null);
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
  const hasDeferredQuery =
    normalizeDataGridSearchText(deferredQuery).length > 0;
  const searchIndex = React.useMemo(() => {
    if (!searchEnabled || !hasDeferredQuery) return null;

    const cachedIndex = searchIndexCache.current;
    if (cachedIndex?.rows === rows && cachedIndex.columns === searchColumns) {
      return cachedIndex.index;
    }

    const index = buildDataGridSearchIndex(
      rows,
      searchColumns,
      (row) => row.original
    );
    searchIndexCache.current = { columns: searchColumns, index, rows };
    return index;
  }, [hasDeferredQuery, rows, searchColumns, searchEnabled]);
  const filteredRows = React.useMemo(() => {
    if (!searchEnabled || !searchIndex) return rows;
    return filterDataGridSearchIndex(searchIndex, deferredQuery);
  }, [deferredQuery, rows, searchEnabled, searchIndex]);
  const displayedResultCount =
    !searchEnabled && authoritativeResultCount != null
      ? authoritativeResultCount
      : filteredRows.length;
  React.useEffect(() => {
    if (searchEnabled) {
      onFilteredRowsCountChange?.(filteredRows.length);
    }
  }, [filteredRows.length, onFilteredRowsCountChange, searchEnabled]);

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
  const visibleRows = React.useMemo(
    () => (showMoreEnabled ? pageRows.slice(0, revealed) : pageRows),
    [pageRows, revealed, showMoreEnabled]
  );
  const canShowMore = showMoreEnabled && revealed < pageRows.length;
  // Whichever pager is on screen, its page is what the scroll effect follows.
  const pagerPageIndex = gridPaging ? gridPaging.pageIndex : safePageIndex;

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
    const toolbar = toolbarRef.current;
    const observer =
      typeof ResizeObserver === "undefined" || !toolbar
        ? null
        : new ResizeObserver(measure);
    if (toolbar) observer?.observe(toolbar);
    return () => {
      window.removeEventListener("resize", measure);
      observer?.disconnect();
    };
  }, [pageScroll, sortPanelOpen, activeVariant, plainChrome, visibleRows]);

  const containerVirtualizer = useVirtualizer({
    count: visibleRows.length,
    enabled: !pageScroll,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => estimatedRowHeight,
    overscan: 5,
  });
  const windowVirtualizer = useWindowVirtualizer({
    count: visibleRows.length,
    enabled: pageScroll,
    estimateSize: () => estimatedRowHeight,
    overscan: 5,
    scrollMargin,
  });
  const virtualizer = pageScroll ? windowVirtualizer : containerVirtualizer;
  const virtualOffset = pageScroll ? scrollMargin : 0;

  React.useEffect(() => {
    if (pageScroll) return;
    containerVirtualizer.scrollToOffset(0);
  }, [containerVirtualizer, deferredQuery, pageScroll]);

  // Deferred to after the rows swap in: measured against the outgoing page, the
  // smooth scroll aims at the wrong offset and is then cut short.
  const pendingPageScrollRef = React.useRef(false);
  React.useEffect(() => {
    if (!pendingPageScrollRef.current) return;
    pendingPageScrollRef.current = false;
    if (!pageScroll) {
      containerVirtualizer.scrollToOffset(0);
      return;
    }
    const list = listRef.current;
    if (!list) return;
    window.scrollTo({
      top: Math.max(0, list.getBoundingClientRect().top + window.scrollY - 16),
      behavior: "smooth",
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
    const detailCells = contentCells.filter((cell) => cell !== primaryCell);
    return { actionCells, checkboxCell, detailCells, primaryCell };
  };

  const cellLabel = (cell: GridCell) =>
    labelForColumn(
      columnMap.get(cell.column.id) ?? ({ name: cell.column.id } as TypeColumn)
    );

  // `mobileRender` is the escape for renderers built around a table cell's
  // geometry; everything else reuses the renderer TanStack has cached.
  const renderCellContent = (cell: GridCell) => {
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
      cellProps:
        typeof column.cellProps === "object" && column.cellProps !== null
          ? (column.cellProps as Record<string, unknown>)
          : {},
    } as CellProps);
  };

  const renderDetailList = (cells: GridCell[], className: string) => (
    <dl
      className={cn(
        "grid grid-cols-1 gap-x-5 gap-y-3 min-[540px]:grid-cols-2",
        className
      )}
    >
      {cells.map((cell) => (
        <div key={cell.id} className="min-w-0">
          <dt className="text-xs font-medium text-muted-foreground">
            {cellLabel(cell)}
          </dt>
          <dd
            className={cn(
              "tdg-mobile-cell mt-0.5 min-w-0 break-words text-sm [&_.truncate]:overflow-visible [&_.truncate]:whitespace-normal",
              typeof cell.getValue() === "number" && "tabular-nums"
            )}
            data-slot="mobile-cell"
            data-cell-role="detail"
          >
            {renderCellContent(cell)}
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
    const rowIndex = row.index;
    const rowIsDisabled = isRowDisabled(rowIndex);
    const rowIsSelected = Boolean(selectedMap[row.id]);
    const rowIsActive = rowIndex === activeIndex;
    const { actionCells, checkboxCell, detailCells, primaryCell } =
      splitRowCells(row);
    const visibleDetailCells = detailCells.slice(0, 6);
    const overflowDetailCells = detailCells.slice(6);
    const listDetailCells = detailCells.slice(0, 3);

    const stateClassName = cn(
      rowIsSelected && "ring-2 ring-ring",
      rowIsActive && "tdg-row--active InovuaReactDataGrid__row--active",
      rowIsActive &&
        gridFocused &&
        cn(
          "tdg-row--focused InovuaReactDataGrid__row--focused",
          rowFocusClassName,
          showActiveRowIndicator &&
            "outline outline-2 outline-offset-[-2px] outline-ring",
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
    const hierarchyControls = (
      <>
        {tree.renderToggle(row.original, rowIndex)}
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
        className="mt-2 w-full basis-full overflow-auto border-t border-border pt-3"
        style={{
          height: masterDetail.getDetailHeight(row.original, rowIndex, 52),
        }}
      >
        {masterDetail.renderDetails(row.original, rowIndex)}
      </div>
    ) : null;

    if (activeVariant === "list") {
      return (
        <article
          className={cn(
            "tdg-mobile-row min-w-0 px-3 py-3",
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
              "rounded-b-[var(--tdg-mobile-list-radius,0.5rem)]",
            stateClassName
          )}
          {...rowAttributes}
          {...rowHandlers}
        >
          <div
            className={cn(
              "flex min-w-0 items-center gap-3",
              bottomListActions ? "w-full" : "contents"
            )}
          >
            {hierarchyControls}
            {checkboxCell ? (
              <div className="shrink-0">
                {flexRender(
                  checkboxCell.column.columnDef.cell,
                  checkboxCell.getContext()
                )}
              </div>
            ) : null}
            <div className="min-w-0 flex-1">
              {primaryCell ? (
                <div
                  className="tdg-mobile-cell min-w-0 truncate text-sm font-semibold text-foreground"
                  data-slot="mobile-cell"
                  data-cell-role="primary"
                >
                  {renderCellContent(primaryCell)}
                </div>
              ) : null}
              {listDetailCells.length ? (
                <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  {listDetailCells.map((cell) => (
                    <span
                      key={cell.id}
                      className="inline-flex min-w-0 items-center gap-1 truncate"
                    >
                      <span className="shrink-0 opacity-70">
                        {cellLabel(cell)}
                      </span>
                      <span
                        className="tdg-mobile-cell min-w-0 truncate text-foreground/80"
                        data-slot="mobile-cell"
                        data-cell-role="detail"
                      >
                        {renderCellContent(cell)}
                      </span>
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
          {actionCells.length ? (
            <div
              className={cn(
                "tdg-mobile-row-actions flex items-center gap-1",
                bottomListActions ? "w-full flex-wrap justify-end" : "shrink-0"
              )}
            >
              {actionCells.map((cell) => (
                <div
                  key={cell.id}
                  className="tdg-mobile-cell"
                  data-slot="mobile-cell"
                  data-cell-role="action"
                >
                  {renderCellContent(cell)}
                </div>
              ))}
            </div>
          ) : null}
          {detailsPanel}
        </article>
      );
    }

    return (
      <article
        className={cn(
          "tdg-mobile-card rounded-md border bg-background p-4 shadow-sm [border-color:var(--tdg-grid-border-color)]",
          stateClassName
        )}
        {...rowAttributes}
        {...rowHandlers}
      >
        <header className="flex min-w-0 items-start gap-3">
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
                  {renderCellContent(primaryCell)}
                </div>
              </>
            ) : null}
          </div>
        </header>
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
                overflowDetailCells.length === 1 ? "more field" : "more fields"
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
                {renderCellContent(cell)}
              </div>
            ))}
          </footer>
        ) : null}
        {detailsPanel}
      </article>
    );
  };

  // Rendered even when empty: it is the list landmark, and the page-scroll
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
                "pb-3"
            )}
            style={{
              transform: `translateY(${virtualRow.start - virtualOffset}px)`,
            }}
            role="listitem"
          >
            {renderRow(virtualRow.index)}
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
            <span className="ml-1 tabular-nums opacity-70">
              ({Math.min(showMoreStep, pageRows.length - revealed)})
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
      <div className="flex items-center gap-2">
        {searchEnabled ? (
          <DataGridSearchBar
            value={query}
            columns={searchColumns}
            onValueChange={setMobileSearchValue}
          />
        ) : (
          <div className="min-w-0 flex-1" aria-hidden="true" />
        )}
        {showVariantToggle ? (
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
        {sortableColumns.length ? (
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
        {columnPickerEnabled && displayColumns.length ? (
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
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>{mobileColumnsValue}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {displayColumns.map((column) => {
                const columnId = getColumnId(column);
                const displayed = !hiddenMobileColumnIds.has(columnId);
                const disableHidingLastColumn =
                  displayed && visibleDisplayColumnCount <= 1;

                return (
                  <DropdownMenuCheckboxItem
                    key={columnId}
                    checked={displayed}
                    disabled={
                      column.hideable === false || disableHidingLastColumn
                    }
                    onCheckedChange={(checked) =>
                      setMobileColumnDisplayed(columnId, checked === true)
                    }
                    onSelect={(event) => event.preventDefault()}
                  >
                    {labelForColumn(column)}
                  </DropdownMenuCheckboxItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
      <div className="mt-2 flex min-h-5 items-center justify-between gap-3 text-xs text-muted-foreground">
        <output className="shrink-0 tabular-nums" aria-live="polite">
          {displayedResultCount} {resultsLabel}
        </output>
        {activeSortSummary ? (
          <span className="min-w-0 truncate text-right">
            {label("mobileSortedBy", "Sorted by")} {activeSortSummary}
          </span>
        ) : null}
      </div>
      {sortPanelOpen ? (
        <div
          id={sortPanelId}
          className="mt-3 rounded-md border bg-muted/30 p-3 [border-color:var(--tdg-grid-border-color)]"
          data-slot="mobile-sort-panel"
        >
          <div className="grid gap-3 min-[540px]:grid-cols-[minmax(0,1fr)_auto] min-[540px]:items-end">
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
          <div className="mt-3 flex items-center justify-end gap-2">
            {activeSort ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-10 flex-1 min-[540px]:flex-none"
                onClick={clearMobileSort}
              >
                {t(i18n, "mobileClearSort", "Clear sort")}
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              className="h-10 flex-1 min-[540px]:flex-none"
              disabled={!draftSortColumn}
              onClick={applyMobileSort}
            >
              {t(i18n, "mobileApplySort", "Apply sort")}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );

  const handleEscape = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Escape" || event.defaultPrevented || !sortPanelOpen) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    closeSortPanel();
  };

  if (pageScroll) {
    return (
      <div
        className={cn(
          "tdg-mobile tdg-mobile--page-scroll flex w-full flex-col",
          plainChrome ? "" : "bg-muted/30"
        )}
        data-slot="mobile-grid-list"
        data-scroll-mode="page"
        data-chrome={chrome}
        data-variant={activeVariant}
        data-list-rows={listRows}
        data-list-actions={listActions}
        onKeyDown={handleEscape}
      >
        {/* Scopes the sticky toolbar to the rows, so it slides away with the
            last one instead of overlaying the controls beneath. */}
        <div className="relative flex w-full flex-col">
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
      data-slot="mobile-grid-list"
      data-scroll-mode="container"
      data-chrome={chrome}
      data-variant={activeVariant}
      data-list-rows={listRows}
      data-list-actions={listActions}
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
