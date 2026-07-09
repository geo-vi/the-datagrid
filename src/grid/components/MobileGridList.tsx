import * as React from "react";
import { flexRender, type Row } from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Search, X } from "lucide-react";

import type { TypeColumn, TypeDataGridProps } from "../../types";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { cn } from "../../lib/utils";
import { getColumnId } from "../../utils/column";
import { t } from "../../utils/helpers";
import {
  buildMobileSearchText,
  matchesMobileSearch,
} from "../utils/mobileSearch";

type MobileGridListProps = {
  rows: Row<Record<string, unknown>>[];
  columns: TypeColumn[];
  checkboxColumnId: string;
  loading: boolean;
  selectedMap: Record<string, unknown>;
  i18n: TypeDataGridProps["i18n"];
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
  checkboxColumnId,
  loading,
  selectedMap,
  i18n,
  onFilteredRowsCountChange,
  onRowClick,
}: MobileGridListProps) {
  const [query, setQuery] = React.useState("");
  const deferredQuery = React.useDeferredValue(query);
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const searchIndex = React.useMemo(
    () =>
      rows.map((row) => ({ row, text: buildMobileSearchText(row.original) })),
    [rows]
  );
  const filteredRows = React.useMemo(
    () =>
      searchIndex
        .filter((entry) => matchesMobileSearch(entry.text, deferredQuery))
        .map((entry) => entry.row),
    [deferredQuery, searchIndex]
  );
  React.useEffect(() => {
    onFilteredRowsCountChange?.(filteredRows.length);
  }, [filteredRows.length, onFilteredRowsCountChange]);
  const columnMap = React.useMemo(
    () => new Map(columns.map((column) => [getColumnId(column), column])),
    [columns]
  );
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
      <div className="flex shrink-0 items-center gap-2 border-b bg-background p-3 [border-color:var(--tdg-grid-border-color)]">
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            className="pl-7 pr-8"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search all fields"
            aria-label="Search all fields"
            type="text"
            role="searchbox"
          />
          {query ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-9 w-9"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              title="Clear search"
            >
              <X />
            </Button>
          ) : null}
        </div>
        <output
          className="shrink-0 text-xs tabular-nums text-muted-foreground"
          aria-live="polite"
        >
          {filteredRows.length}{" "}
          {filteredRows.length === 1 ? "result" : "results"}
        </output>
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
                (cell) => cell.column.id !== checkboxColumnId
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
