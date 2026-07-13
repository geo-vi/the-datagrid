import * as React from "react";
import { flexRender, type Row } from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ArrowDown, ArrowUp, ArrowUpDown, Columns3 } from "lucide-react";

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
import { resolveEmptyText } from "../utils/emptyText";
import {
  DataGridSearchBar,
  type DataGridSearchBarChange,
} from "./DataGridSearchBar";
import {
  buildDataGridSearchIndex,
  filterDataGridSearchIndex,
  normalizeDataGridSearchText,
  type DataGridSearchIndex,
} from "../utils/search";

type MobileGridListProps = {
  rows: Row<Record<string, unknown>>[];
  columns: TypeColumn[];
  searchColumns: TypeColumn[];
  checkboxColumnId: string;
  loading: boolean;
  selectedMap: Record<string, unknown>;
  i18n: TypeDataGridProps["i18n"];
  emptyText: TypeDataGridProps["emptyText"];
  sortInfo: TypeSortInfo;
  defaultSortDirection: 1 | -1;
  searchEnabled?: boolean;
  authoritativeResultCount?: number;
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

export function MobileGridList({
  rows,
  columns,
  searchColumns,
  checkboxColumnId,
  loading,
  selectedMap,
  i18n,
  emptyText,
  sortInfo,
  defaultSortDirection,
  searchEnabled = true,
  authoritativeResultCount,
  onSortInfoChange,
  onFilteredRowsCountChange,
  onRowClick,
}: MobileGridListProps) {
  const [query, setQuery] = React.useState("");
  const [committedQuery, setCommittedQuery] = React.useState("");
  const [sortPanelOpen, setSortPanelOpen] = React.useState(false);
  const [draftSortColumnId, setDraftSortColumnId] = React.useState("");
  const [draftSortDirection, setDraftSortDirection] = React.useState<1 | -1>(
    defaultSortDirection
  );
  const deferredQuery = React.useDeferredValue(committedQuery);
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const searchIndexCache = React.useRef<{
    columns: TypeColumn[];
    index: DataGridSearchIndex<Row<Record<string, unknown>>>;
    rows: Row<Record<string, unknown>>[];
  } | null>(null);
  const sortPanelId = React.useId();
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

  const emptyContent =
    !loading && filteredRows.length === 0
      ? resolveEmptyText(emptyText, i18n)
      : null;

  return (
    <div
      className="tdg-mobile flex min-h-0 flex-1 flex-col bg-muted/30"
      data-slot="mobile-grid-list"
    >
      <div className="shrink-0 border-b bg-background p-3 [border-color:var(--tdg-grid-border-color)]">
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
            {displayedResultCount}{" "}
            {displayedResultCount === 1 ? "result" : "results"}
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
          emptyContent == null ? null : (
            <div className="p-6 text-center text-sm text-muted-foreground">
              {emptyContent}
            </div>
          )
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
