import * as React from "react";
import { flexRender, type Row } from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Columns3,
  Search,
  X,
} from "lucide-react";

import type { TypeColumn, TypeDataGridProps, TypeSortInfo } from "../../types";
import { Button } from "../../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { Input } from "../../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { cn } from "../../lib/utils";
import { getColumnId, getColumnSortName } from "../../utils/column";
import { t } from "../../utils/helpers";
import {
  buildMobileSearchText,
  matchesMobileSearchTokens,
  parseMobileSearchQuery,
  tokenizeMobileSearchQuery,
  type MobileSearchColumn,
} from "../utils/mobileSearch";

type MobileGridListProps = {
  rows: Row<Record<string, unknown>>[];
  columns: TypeColumn[];
  checkboxColumnId: string;
  loading: boolean;
  selectedMap: Record<string, unknown>;
  i18n: TypeDataGridProps["i18n"];
  sortInfo: TypeSortInfo;
  defaultSortDirection: 1 | -1;
  searchEnabled?: boolean;
  onSortInfoChange: (sortInfo: TypeSortInfo) => void;
  onFilteredRowsCountChange?: (count: number) => void;
  onRowClick: (
    id: string,
    data: Record<string, unknown>,
    event: React.MouseEvent
  ) => void;
};

const ACTION_COLUMN =
  /(^|[-_\s])(action|actions|menu|tool|tools|command|commands|option|options)($|[-_\s])/i;
const ID_COLUMN = /(^|[-_\s])(id|uuid|key|code|number|no)($|[-_\s])/i;

function labelForColumn(column: TypeColumn): string {
  if (typeof column.header === "string") return column.header;
  return column.name ?? column.id ?? "Value";
}

function searchAliasesForColumn(column: TypeColumn): string[] {
  const aliases = [
    getColumnId(column),
    column.id,
    column.name,
    typeof column.header === "string" ? column.header : undefined,
  ];

  return Array.from(
    new Set(
      aliases
        .map((alias) => alias?.trim() ?? "")
        .filter((alias) => alias.length > 0)
    )
  );
}

export function MobileGridList({
  rows,
  columns,
  checkboxColumnId,
  loading,
  selectedMap,
  i18n,
  sortInfo,
  defaultSortDirection,
  searchEnabled = true,
  onSortInfoChange,
  onFilteredRowsCountChange,
  onRowClick,
}: MobileGridListProps) {
  const [query, setQuery] = React.useState("");
  const [sortPanelOpen, setSortPanelOpen] = React.useState(false);
  const [draftSortColumnId, setDraftSortColumnId] = React.useState("");
  const [draftSortDirection, setDraftSortDirection] = React.useState<1 | -1>(
    defaultSortDirection
  );
  const deferredQuery = React.useDeferredValue(query);
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const searchInputRef = React.useRef<HTMLInputElement | null>(null);
  const sortPanelId = React.useId();
  const [isSearchComposing, setIsSearchComposing] = React.useState(false);
  const [searchScrollLeft, setSearchScrollLeft] = React.useState(0);
  const [hiddenMobileColumnIds, setHiddenMobileColumnIds] = React.useState<
    Set<string>
  >(() => new Set());
  const columnMap = React.useMemo(
    () => new Map(columns.map((column) => [getColumnId(column), column])),
    [columns]
  );
  const displayColumns = React.useMemo(
    () => columns.filter((column) => getColumnId(column) !== checkboxColumnId),
    [checkboxColumnId, columns]
  );
  const mobileSearchColumns = React.useMemo<MobileSearchColumn[]>(
    () =>
      displayColumns.map((column) => ({
        id: getColumnId(column),
        aliases: searchAliasesForColumn(column),
      })),
    [displayColumns]
  );
  const parsedQuery = React.useMemo(
    () => parseMobileSearchQuery(query, mobileSearchColumns),
    [mobileSearchColumns, query]
  );
  const parsedDeferredQuery = React.useMemo(
    () => parseMobileSearchQuery(deferredQuery, mobileSearchColumns),
    [deferredQuery, mobileSearchColumns]
  );
  const deferredSearchTokens = React.useMemo(
    () => tokenizeMobileSearchQuery(parsedDeferredQuery.searchQuery),
    [parsedDeferredQuery.searchQuery]
  );
  const searchIndex = React.useMemo(
    () =>
      searchEnabled
        ? rows.map((row) => ({
            row,
            text: buildMobileSearchText(row.original),
          }))
        : [],
    [rows, searchEnabled]
  );
  const scopedColumnIdsKey =
    parsedDeferredQuery.columnIds.length > 0 && deferredSearchTokens.length > 0
      ? JSON.stringify(parsedDeferredQuery.columnIds)
      : "[]";
  const scopedSearchIndex = React.useMemo(() => {
    const columnIds = JSON.parse(scopedColumnIdsKey) as string[];
    if (columnIds.length === 0) return null;

    return searchIndex.map((entry) => ({
      row: entry.row,
      texts: columnIds.map((columnId) =>
        buildMobileSearchText(entry.row.getValue(columnId))
      ),
    }));
  }, [scopedColumnIdsKey, searchIndex]);
  const filteredRows = React.useMemo(() => {
    if (!searchEnabled) return rows;

    if (parsedDeferredQuery.columnIds.length > 0) {
      if (deferredSearchTokens.length === 0) {
        return searchIndex.map((entry) => entry.row);
      }

      return (scopedSearchIndex ?? [])
        .filter((entry) =>
          entry.texts.some((text) =>
            matchesMobileSearchTokens(text, deferredSearchTokens)
          )
        )
        .map((entry) => entry.row);
    }

    return searchIndex
      .filter((entry) =>
        matchesMobileSearchTokens(entry.text, deferredSearchTokens)
      )
      .map((entry) => entry.row);
  }, [
    deferredSearchTokens,
    parsedDeferredQuery.columnIds.length,
    scopedSearchIndex,
    searchIndex,
    searchEnabled,
    rows,
  ]);
  React.useEffect(() => {
    if (searchEnabled) {
      onFilteredRowsCountChange?.(filteredRows.length);
    }
  }, [filteredRows.length, onFilteredRowsCountChange, searchEnabled]);

  React.useEffect(() => {
    if (!searchEnabled && query) {
      setQuery("");
      setIsSearchComposing(false);
      setSearchScrollLeft(0);
    }
  }, [query, searchEnabled]);
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
          column.sortable !== false &&
          !ACTION_COLUMN.test(`${columnId} ${labelForColumn(column)}`)
        );
      }),
    [checkboxColumnId, columns]
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
            (column) => getColumnSortName(column) === activeSort.name
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
  const mobileSortValue = t(i18n, "mobileSort", "Sort");
  const mobileColumnsValue = t(i18n, "mobileColumns", "Display columns");
  const mobileSortByValue = t(i18n, "mobileSortBy", "Sort by");
  const mobileSortAscValue = t(i18n, "mobileSortAsc", "Ascending");
  const mobileSortDescValue = t(i18n, "mobileSortDesc", "Descending");
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
  const activeSortSummary = activeSortColumn
    ? `${labelForColumn(activeSortColumn)} ${activeSort?.dir === -1 ? mobileSortDescLabel : mobileSortAscLabel}`
    : null;
  const draftSortColumn = sortableColumns.find(
    (column) => getColumnId(column) === draftSortColumnId
  );
  const highlightSearchQuery =
    parsedQuery.prefixEnd !== null && !isSearchComposing;

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

  const applyMobileSort = () => {
    if (!draftSortColumn) return;
    onSortInfoChange({
      name: getColumnSortName(draftSortColumn),
      dir: draftSortDirection,
    });
    setSortPanelOpen(false);
  };

  const clearMobileSort = () => {
    onSortInfoChange(null);
    setSortPanelOpen(false);
  };
  const virtualizer = useVirtualizer({
    count: filteredRows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 224,
    overscan: 5,
  });

  React.useEffect(() => {
    virtualizer.scrollToOffset(0);
  }, [deferredQuery, virtualizer]);

  return (
    <div
      className="tdg-mobile flex min-h-0 flex-1 flex-col bg-muted/30"
      data-slot="mobile-grid-list"
    >
      <div className="shrink-0 border-b bg-background p-3 [border-color:var(--tdg-grid-border-color)]">
        <div className="flex items-center gap-2">
          {searchEnabled ? (
            <div className="relative min-w-0 flex-1 rounded-md bg-[var(--tdg-input-bg)]">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 z-20 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                ref={searchInputRef}
                className={cn(
                  "h-10 pl-7 pr-9",
                  highlightSearchQuery && "relative z-10 !bg-transparent"
                )}
                inputClassName={cn(
                  highlightSearchQuery &&
                    "!text-transparent caret-[var(--tdg-input-color)]"
                )}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setSearchScrollLeft(event.currentTarget.scrollLeft);
                }}
                onScroll={(event) =>
                  setSearchScrollLeft(event.currentTarget.scrollLeft)
                }
                onSelect={(event) =>
                  setSearchScrollLeft(event.currentTarget.scrollLeft)
                }
                onCompositionStart={() => setIsSearchComposing(true)}
                onCompositionEnd={(event) => {
                  setIsSearchComposing(false);
                  setSearchScrollLeft(event.currentTarget.scrollLeft);
                }}
                placeholder="Search all fields"
                aria-label="Search all fields"
                type="text"
                role="searchbox"
              />
              {highlightSearchQuery && parsedQuery.prefixEnd !== null ? (
                <div
                  className="pointer-events-none absolute inset-y-0 left-7 right-9 z-0 flex items-center overflow-hidden text-base text-[var(--tdg-input-color)] md:text-sm"
                  data-slot="mobile-search-query-highlight"
                  aria-hidden="true"
                >
                  <span
                    className="inline-flex min-w-max whitespace-pre font-normal"
                    style={{ transform: `translateX(${-searchScrollLeft}px)` }}
                  >
                    <span className="relative inline-block">
                      <span className="invisible">
                        {query.slice(0, parsedQuery.prefixEnd)}
                      </span>
                      <strong
                        className="absolute inset-0 whitespace-pre font-bold"
                        data-slot="mobile-search-column-prefix"
                      >
                        {query.slice(0, parsedQuery.prefixEnd)}
                      </strong>
                    </span>
                    <span
                      className="font-normal"
                      data-slot="mobile-search-query-value"
                    >
                      {query.slice(parsedQuery.prefixEnd)}
                    </span>
                  </span>
                </div>
              ) : null}
              {query ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 z-20 h-10 w-10"
                  onClick={() => {
                    setQuery("");
                    setIsSearchComposing(false);
                    setSearchScrollLeft(0);
                    searchInputRef.current?.focus();
                  }}
                  aria-label="Clear search"
                  title="Clear search"
                >
                  <X />
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="min-w-0 flex-1" aria-hidden="true" />
          )}
          {sortableColumns.length ? (
            <Button
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
          {displayColumns.length ? (
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
            {filteredRows.length}{" "}
            {filteredRows.length === 1 ? "result" : "results"}
          </output>
          {activeSortSummary ? (
            <span className="min-w-0 truncate text-right">
              Sorted by {activeSortSummary}
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
                    <SelectValue placeholder="Choose a column" />
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
                aria-label="Sort direction"
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

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-auto"
        role="list"
        aria-label="Grid results"
      >
        {loading ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            Loading...
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            {t(i18n, "noRecords", "No records")}
          </div>
        ) : (
          <div
            className="relative w-full"
            style={{ height: virtualizer.getTotalSize() }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const row = filteredRows[virtualRow.index]!;
              const cells = row.getVisibleCells();
              const checkboxCell = cells.find(
                (cell) => cell.column.id === checkboxColumnId
              );
              const dataCells = cells.filter(
                (cell) =>
                  cell.column.id !== checkboxColumnId &&
                  !hiddenMobileColumnIds.has(cell.column.id)
              );
              const actionCells = dataCells.filter((cell) =>
                ACTION_COLUMN.test(
                  `${cell.column.id} ${labelForColumn(columnMap.get(cell.column.id) ?? ({ name: cell.column.id } as TypeColumn))}`
                )
              );
              const contentCells = dataCells.filter(
                (cell) => !actionCells.includes(cell)
              );
              const primaryCell =
                contentCells.find(
                  (cell) =>
                    !ID_COLUMN.test(cell.column.id) &&
                    typeof cell.getValue() === "string"
                ) ?? contentCells[0];
              const detailCells = contentCells.filter(
                (cell) => cell !== primaryCell
              );
              const visibleDetailCells = detailCells.slice(0, 6);
              const overflowDetailCells = detailCells.slice(6);

              return (
                <div
                  key={row.id}
                  ref={virtualizer.measureElement}
                  data-index={virtualRow.index}
                  className="absolute left-0 top-0 w-full px-3 py-1.5"
                  style={{ transform: `translateY(${virtualRow.start}px)` }}
                  role="listitem"
                >
                  <article
                    className={cn(
                      "rounded-md border bg-background p-4 shadow-sm [border-color:var(--tdg-grid-border-color)]",
                      Boolean(selectedMap[row.id]) && "ring-2 ring-ring"
                    )}
                    data-row-id={row.id}
                    onClick={(event) => onRowClick(row.id, row.original, event)}
                  >
                    <header className="flex min-w-0 items-start gap-3">
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
                              {labelForColumn(
                                columnMap.get(primaryCell.column.id) ??
                                  ({
                                    name: primaryCell.column.id,
                                  } as TypeColumn)
                              )}
                            </div>
                            <div className="min-w-0 break-words text-base font-semibold text-foreground">
                              {flexRender(
                                primaryCell.column.columnDef.cell,
                                primaryCell.getContext()
                              )}
                            </div>
                          </>
                        ) : null}
                      </div>
                    </header>
                    {detailCells.length ? (
                      <dl className="mt-4 grid grid-cols-1 gap-x-5 gap-y-3 min-[540px]:grid-cols-2">
                        {visibleDetailCells.map((cell) => (
                          <div key={cell.id} className="min-w-0">
                            <dt className="text-xs font-medium text-muted-foreground">
                              {labelForColumn(
                                columnMap.get(cell.column.id) ??
                                  ({ name: cell.column.id } as TypeColumn)
                              )}
                            </dt>
                            <dd
                              className={cn(
                                "mt-0.5 min-w-0 break-words text-sm [&_.truncate]:overflow-visible [&_.truncate]:whitespace-normal",
                                typeof cell.getValue() === "number" &&
                                  "tabular-nums"
                              )}
                            >
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext()
                              )}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    ) : null}
                    {overflowDetailCells.length ? (
                      <details
                        className="mt-3 border-t pt-3 [border-color:var(--tdg-grid-border-color)]"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <summary className="cursor-pointer text-sm font-medium text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                          {overflowDetailCells.length} more{" "}
                          {overflowDetailCells.length === 1
                            ? "field"
                            : "fields"}
                        </summary>
                        <dl className="mt-3 grid grid-cols-1 gap-x-5 gap-y-3 min-[540px]:grid-cols-2">
                          {overflowDetailCells.map((cell) => (
                            <div key={cell.id} className="min-w-0">
                              <dt className="text-xs font-medium text-muted-foreground">
                                {labelForColumn(
                                  columnMap.get(cell.column.id) ??
                                    ({ name: cell.column.id } as TypeColumn)
                                )}
                              </dt>
                              <dd className="mt-0.5 min-w-0 break-words text-sm [&_.truncate]:overflow-visible [&_.truncate]:whitespace-normal">
                                {flexRender(
                                  cell.column.columnDef.cell,
                                  cell.getContext()
                                )}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      </details>
                    ) : null}
                    {actionCells.length ? (
                      <footer className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t pt-3 [border-color:var(--tdg-grid-border-color)]">
                        {actionCells.map((cell) => (
                          <div key={cell.id}>
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </div>
                        ))}
                      </footer>
                    ) : null}
                  </article>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
