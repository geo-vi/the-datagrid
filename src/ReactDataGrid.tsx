"use client";

import * as React from "react";
import type {
  TypeColumn,
  TypeComputedProps,
  TypeDataGridProps,
  TypeFilterValue,
  TypeSingleFilterValue,
  TypeSortInfo,
} from "./types";

import type { ColumnDef } from "@tanstack/react-table";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";

import {
  IconArrowsSort,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronUp,
  IconChevronsLeft,
  IconChevronsRight,
  IconDotsVertical,
} from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { getColumnId, getColumnSortName } from "./utils/column";
import { t, coerceUserSelect, estimateAutoWidth } from "./utils/helpers";
import { useControllableState } from "./hooks/useControllableState";
import {
  normalizeFilterValue,
  getFilterEntry,
  upsertFilterEntry,
  setFilterOperator,
  clearFilter,
  applyLocalFilter,
  STRING_OPERATORS,
} from "./filters/utils";
import {
  getSortDir,
  toggleSortInfo,
  toTanstackSorting,
  applyLocalSort,
} from "./sorting/utils";

function sortIcon(dir: 0 | 1 | -1): React.ReactNode {
  if (dir === 1) return <IconChevronUp className="ml-1 size-3" />;
  if (dir === -1) return <IconChevronDown className="ml-1 size-3" />;
  return <IconArrowsSort className="ml-1 size-3 opacity-60" />;
}

/**
 * Optional compat export: Inovua exports `plugins`. We export an empty list.
 */
export const plugins: readonly unknown[] = [] as const;


type FilterMenuState = {
  open: boolean;
  x: number;
  y: number;
  columnId: string;
};

function ReactDataGrid(props: TypeDataGridProps) {
  const {
    theme = "default",
    idProperty,
    columns: inputColumns,
    dataSource,

    enableColumnFilterContextMenu = false,

    enableColumnAutosize = true,
    skipHeaderOnAutoSize = false,

    enableFiltering = true,

    filteredRowsCount,

    virtualized = true,
    columnUserSelect = true,

    i18n,
    showColumnMenuTool = false,

    rowHeight = 44,
    headerHeight = 40,
    filterRowHeight = 44,

    className,
    style,
  } = props;

  const defaultColumnOrder = React.useMemo(
    () => inputColumns.map((c) => getColumnId(c)),
    [inputColumns]
  );

  const [columnOrder, setColumnOrder] = useControllableState<string[]>({
    value: props.columnOrder,
    defaultValue: props.columnOrder ?? defaultColumnOrder,
    onChange: props.onColumnOrderChange,
  });

  const [sortInfo, setSortInfo] = useControllableState<TypeSortInfo>({
    value: props.sortInfo,
    defaultValue: props.defaultSortInfo ?? null,
    onChange: props.onSortInfoChange,
  });

  const [filterValue, setFilterValue, filterControlled] = useControllableState<TypeFilterValue>({
    value: props.filterValue,
    defaultValue: normalizeFilterValue(props.defaultFilterValue) ?? null,
    onChange: props.onFilterValueChange,
  });

  // Draft filter for debounce when uncontrolled
  const [draftFilterValue, setDraftFilterValue] = React.useState<TypeFilterValue>(filterValue);
  React.useEffect(() => setDraftFilterValue(filterValue), [filterValue]);

  const [skip, setSkip] = useControllableState<number>({
    value: props.skip,
    defaultValue: props.defaultSkip ?? 0,
    onChange: props.onSkipChange,
  });

  const [limit, setLimit] = useControllableState<number>({
    value: props.limit,
    defaultValue: props.defaultLimit ?? 10,
    onChange: props.onLimitChange,
  });

  const pageSizes = props.pageSizes ?? [10, 20, 30, 40, 50];

  const allowUnsort = props.allowUnsort ?? true;
  const defaultSortingDirection = props.defaultSortingDirection ?? "asc";
  const defaultSortDir: 1 | -1 = defaultSortingDirection === "desc" ? -1 : 1;

  const orderedColumns = React.useMemo(() => {
    const colById = new Map<string, TypeColumn>();
    for (const c of inputColumns) colById.set(getColumnId(c), c);

    const ordered: TypeColumn[] = [];
    for (const id of columnOrder) {
      const col = colById.get(id);
      if (col) ordered.push(col);
    }

    // append any new columns not in order yet
    for (const c of inputColumns) {
      const id = getColumnId(c);
      if (!ordered.find((x) => getColumnId(x) === id)) ordered.push(c);
    }

    // visibility
    return ordered.filter((c) => c.visible !== false);
  }, [inputColumns, columnOrder]);

  const tanstackSorting = React.useMemo(
    () => toTanstackSorting(sortInfo, orderedColumns),
    [sortInfo, orderedColumns]
  );

  const [rows, setRows] = React.useState<any[]>([]);
  const [count, setCount] = React.useState<number>(0);
  const [internalLoading, setInternalLoading] = React.useState(false);
  const loading = props.loading ?? internalLoading;

  const computedFilterForFetch = filterControlled ? filterValue : filterValue;
  const computedSortForFetch = sortInfo;

  // const remote = React.useMemo(() => isRemoteDataSource(dataSource), [dataSource]);

  const loadData = React.useCallback(async () => {
    // For local array dataSource: apply local filter/sort/pagination.
    if (Array.isArray(dataSource)) {
      let data = dataSource;

      if (enableFiltering && computedFilterForFetch)
        data = applyLocalFilter(data, computedFilterForFetch);
      if (computedSortForFetch) data = applyLocalSort(data, computedSortForFetch);

      const totalCount = data.length;

      const paginationMode = props.pagination ?? true;
      const doPage = paginationMode !== false;

      const sliced = doPage ? data.slice(skip, skip + limit) : data;

      setRows(sliced);
      setCount(totalCount);
      filteredRowsCount?.(totalCount);
      return;
    }

    setInternalLoading(true);

    try {
      const ds = dataSource;

      const dsArg = {
        skip,
        limit,
        sortInfo: computedSortForFetch,
        filterValue: computedFilterForFetch,
        columnOrder,
        columns: orderedColumns,
        idProperty,
        theme,
      };

      let result: any = ds;

      if (typeof ds === "function") {
        result = ds(dsArg);
      }

      if (result && typeof result.then === "function") {
        result = await result;
      }

      if (result && typeof result === "object" && Array.isArray(result.data)) {
        setRows(result.data);
        setCount(Number(result.count ?? result.data.length));
        filteredRowsCount?.(Number(result.count ?? result.data.length));
      } else if (Array.isArray(result)) {
        setRows(result);
        setCount(result.length);
        filteredRowsCount?.(result.length);
      } else {
        setRows([]);
        setCount(0);
        filteredRowsCount?.(0);
      }
    } finally {
      setInternalLoading(false);
    }
  }, [
    dataSource,
    enableFiltering,
    computedFilterForFetch,
    computedSortForFetch,
    filteredRowsCount,
    idProperty,
    limit,
    orderedColumns,
    props.pagination,
    skip,
    theme,
    columnOrder,
  ]);

  // Load on state changes that should affect backend queries.
  React.useEffect(() => {
    void loadData();
  }, [loadData]);

  // Debounce filter apply when uncontrolled (to avoid request per keypress)
  React.useEffect(() => {
    if (filterControlled) return;

    const handle = window.setTimeout(() => {
      setFilterValue(draftFilterValue);
    }, 300);

    return () => window.clearTimeout(handle);
  }, [draftFilterValue, filterControlled, setFilterValue]);

  // Column autosize heuristic
  const [autoWidths, setAutoWidths] = React.useState<Record<string, number>>({});

  React.useEffect(() => {
    if (!enableColumnAutosize) return;

    const next: Record<string, number> = {};

    const sample = rows.slice(0, 25);
    for (const c of orderedColumns) {
      const id = getColumnId(c);

      // respect explicit widths
      const explicit = c.width ?? c.defaultWidth;
      if (typeof explicit === "number" && Number.isFinite(explicit) && explicit > 0) {
        next[id] = explicit;
        continue;
      }

      const headerText = skipHeaderOnAutoSize
        ? ""
        : typeof c.header === "string"
          ? c.header
          : typeof c.name === "string"
            ? c.name
            : "";

      const values = sample.map((r) => (r as any)?.[id]);
      next[id] = estimateAutoWidth({ header: headerText, values });
    }

    setAutoWidths(next);
  }, [enableColumnAutosize, orderedColumns, rows, skipHeaderOnAutoSize]);

  // Convert our TypeColumn[] to TanStack ColumnDef[]
  const columnDefs = React.useMemo<ColumnDef<any, any>[]>(() => {
    return orderedColumns.map((c) => {
      const colId = getColumnId(c);

      return {
        id: colId,
        accessorFn: (row) => (row as any)?.[colId],
        enableSorting: c.sortable ?? true,
        header: () => {
          const content =
            c.renderHeader?.({ column: c }) ?? c.header ?? c.name ?? c.id ?? colId;

          return content;
        },
        cell: (ctx) => {
          const value = ctx.getValue();
          if (c.render) {
            return c.render(value, {
              data: ctx.row.original,
              rowIndex: ctx.row.index,
              column: c,
              columnId: colId,
            });
          }
          return value == null ? "" : String(value);
        },
        meta: {
          __column: c,
        },
      } satisfies ColumnDef<any, any>;
    });
  }, [orderedColumns]);

  const table = useReactTable({
    data: rows,
    columns: columnDefs,
    state: {
      sorting: tanstackSorting,
    },
    manualSorting: true,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row, index) => {
      const v = (row as any)?.[idProperty];
      return v == null ? String(index) : String(v);
    },
  });

  // Virtualization
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const rowModel = table.getRowModel().rows;

  const rowVirtualizer = useVirtualizer({
    count: rowModel.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => rowHeight,
    overscan: 10,
  });

  const virtualItems = virtualized ? rowVirtualizer.getVirtualItems() : [];
  const paddingTop = virtualized && virtualItems.length ? virtualItems[0]!.start : 0;
  const paddingBottom =
    virtualized && virtualItems.length
      ? rowVirtualizer.getTotalSize() - virtualItems[virtualItems.length - 1]!.end
      : 0;

  // Filter context menu
  const [filterMenu, setFilterMenu] = React.useState<FilterMenuState | null>(null);

  React.useEffect(() => {
    if (!filterMenu?.open) return;

    const onAnyClick = () => setFilterMenu(null);
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFilterMenu(null);
    };

    window.addEventListener("mousedown", onAnyClick);
    window.addEventListener("keydown", onEsc);

    return () => {
      window.removeEventListener("mousedown", onAnyClick);
      window.removeEventListener("keydown", onEsc);
    };
  }, [filterMenu]);

  // Imperative API
  const apiRef = React.useRef<TypeComputedProps | null>(null);

  React.useEffect(() => {
    apiRef.current = {
      reload: () => {
        void loadData();
      },
      getData: () => rows,
      getCount: () => count,

      getSkip: () => skip,
      getLimit: () => limit,
      setSkip: (next) => setSkip(next),
      setLimit: (next) => {
        setSkip(0);
        setLimit(next);
      },

      getSortInfo: () => sortInfo,
      setSortInfo: (next) => {
        setSkip(0);
        setSortInfo(next);
      },

      getFilterValue: () => filterValue,
      setFilterValue: (next) => {
        setSkip(0);
        setFilterValue(next);
      },

      getColumnOrder: () => columnOrder,
      setColumnOrder: (next) => setColumnOrder(next),
    };

    props.handle?.(apiRef);
    props.onReady?.(apiRef);
  }, [
    columnOrder,
    count,
    filterValue,
    limit,
    loadData,
    props,
    rows,
    setColumnOrder,
    setFilterValue,
    setLimit,
    setSkip,
    setSortInfo,
    skip,
    sortInfo,
  ]);

  // Pagination derived
  const safeLimit = Math.max(1, limit);
  const pageIndex = Math.floor(skip / safeLimit);
  const pageCount = Math.max(1, Math.ceil(count / safeLimit) || 1);

  const canPrev = skip > 0;
  const canNext = skip + safeLimit < count;

  const userSelectClass =
    coerceUserSelect(columnUserSelect) === "none" ? "select-none" : "select-text";

  // Header drag/drop reorder (simple HTML DnD)
  const dragIdRef = React.useRef<string | null>(null);

  function onHeaderDragStart(e: React.DragEvent, columnId: string) {
    dragIdRef.current = columnId;
    try {
      e.dataTransfer.setData("text/plain", columnId);
    } catch {
      // ignore
    }
    e.dataTransfer.effectAllowed = "move";
  }

  function onHeaderDrop(e: React.DragEvent, targetId: string) {
    e.preventDefault();
    const sourceId = dragIdRef.current ?? e.dataTransfer.getData("text/plain");
    dragIdRef.current = null;
    if (!sourceId || sourceId === targetId) return;

    const next = [...columnOrder];
    const from = next.indexOf(sourceId);
    const to = next.indexOf(targetId);
    if (from < 0 || to < 0) return;

    next.splice(from, 1);
    next.splice(to, 0, sourceId);
    setColumnOrder(next);
  }

  function onHeaderDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  // Render
  return (
    <div
      className={["flex flex-col gap-2 lg:gap-6", className].filter(Boolean).join(" ")}
      data-theme={theme}
    >
      <div
        ref={scrollRef}
        className={[
          "overflow-auto rounded-lg border",
          // if virtualized, prefer an internal scroller; default height if none provided
          virtualized ? "max-h-[560px]" : "",
        ].join(" ")}
        style={style}
      >
        <Table>
          <TableHeader className="bg-background sticky top-0 z-10">
            {/* Header row */}
            {table.getHeaderGroups().map((hg) => (
              <TableRow
                key={hg.id}
                className="bg-muted"
                style={{ height: headerHeight }}
              >
                {hg.headers.map((h) => {
                  const colDef = h.column.columnDef as any;
                  const col: TypeColumn | undefined = colDef?.meta?.__column;
                  const colId = h.column.id;

                  const canSort =
                    (col?.sortable ?? true) && h.column.getCanSort();
                  const sortName = col ? getColumnSortName(col) : colId;
                  const dir = getSortDir(sortInfo, sortName);

                  const width = autoWidths[colId];
                  const headerAlign = col?.headerAlign ?? col?.textAlign;

                  return (
                    <TableHead
                      key={h.id}
                      colSpan={h.colSpan}
                      className={[
                        headerAlign === "right" || headerAlign === "end"
                          ? "text-right"
                          : "",
                        col?.headerProps?.className ?? "",
                      ].join(" ")}
                      style={{
                        width,
                        minWidth: col?.minWidth,
                        maxWidth: col?.maxWidth,
                        height: headerHeight,
                        ...col?.headerProps?.style,
                      }}
                      draggable={Boolean(props.onColumnOrderChange)}
                      onDragStart={(e) => onHeaderDragStart(e, colId)}
                      onDragOver={onHeaderDragOver}
                      onDrop={(e) => onHeaderDrop(e, colId)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center">
                          {h.isPlaceholder ? null : canSort ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="-ml-3 h-8 px-2"
                              onClick={(e) => {
                                const next = toggleSortInfo({
                                  sortInfo,
                                  col: col ?? { name: colId },
                                  allowUnsort,
                                  defaultDir: defaultSortDir,
                                  multi:
                                    (e as any).shiftKey === true,
                                });

                                setSkip(0);
                                setSortInfo(next);
                              }}
                            >
                              <span className="truncate">
                                {flexRender(
                                  h.column.columnDef.header,
                                  h.getContext()
                                )}
                              </span>
                              {sortIcon(dir)}
                            </Button>
                          ) : (
                            <span className="truncate">
                              {flexRender(
                                h.column.columnDef.header,
                                h.getContext()
                              )}
                            </span>
                          )}
                        </div>

                        {showColumnMenuTool && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7"
                                aria-label="Column menu"
                              >
                                <IconDotsVertical className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem
                                onClick={() => {
                                  const next: TypeSortInfo = {
                                    name: sortName,
                                    dir: 1,
                                  };
                                  setSkip(0);
                                  setSortInfo(next);
                                }}
                              >
                                {t(i18n, "sortAsc", "Sort A→Z")}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  const next: TypeSortInfo = {
                                    name: sortName,
                                    dir: -1,
                                  };
                                  setSkip(0);
                                  setSortInfo(next);
                                }}
                              >
                                {t(i18n, "sortDesc", "Sort Z→A")}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSkip(0);
                                  setSortInfo(null);
                                }}
                              >
                                {t(i18n, "unsort", "Unsort")}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}

            {/* Filter row */}
            {enableFiltering &&
              table.getHeaderGroups().map((hg) => (
                <TableRow
                  key={`${hg.id}-filters`}
                  className="bg-muted/40"
                  style={{ height: filterRowHeight }}
                >
                  {hg.headers.map((h) => {
                    const colDef = h.column.columnDef as any;
                    const col: TypeColumn | undefined = colDef?.meta?.__column;
                    const colId = h.column.id;

                    const filterable = col?.filterable ?? false;

                    const entry = getFilterEntry(
                      filterControlled ? filterValue : draftFilterValue,
                      colId
                    );
                    const value = entry?.value ?? "";

                    const openMenu = (e: React.MouseEvent) => {
                      if (!enableColumnFilterContextMenu) return;
                      e.preventDefault();
                      setFilterMenu({
                        open: true,
                        x: (e as any).clientX ?? 0,
                        y: (e as any).clientY ?? 0,
                        columnId: colId,
                      });
                    };

                    const width = autoWidths[colId];

                    return (
                      <TableHead
                        key={`${h.id}-filter`}
                        className="py-2"
                        style={{
                          width,
                          minWidth: col?.minWidth,
                          maxWidth: col?.maxWidth,
                          height: filterRowHeight,
                        }}
                        onContextMenu={openMenu}
                      >
                        {h.isPlaceholder || !filterable ? null : col?.filterEditor ? (
                          <col.filterEditor
                            filterValue={{
                              name: colId,
                              operator: entry?.operator ?? "contains",
                              type:
                                entry?.type ?? col.filterType ?? "string",
                              value: entry?.value ?? null,
                              filterEditorProps: col.filterEditorProps,
                            }}
                            onChange={(next: unknown) => {
                              const nextEntry: TypeSingleFilterValue = {
                                name: colId,
                                operator: entry?.operator ?? "contains",
                                type: entry?.type ?? col.filterType ?? "string",
                                value: next,
                                active: true,
                              };

                              setSkip(0);
                              if (filterControlled)
                                setFilterValue(
                                  upsertFilterEntry(filterValue, nextEntry)
                                );
                              else
                                setDraftFilterValue(
                                  upsertFilterEntry(draftFilterValue, nextEntry)
                                );
                            }}
                          />
                        ) : col?.filterType === "select" &&
                          Array.isArray((col.filterEditorProps as any)?.options) ? (
                          <Select
                            value={String(value || "__all__")}
                            onValueChange={(v: string) => {
                              const nextValue = v === "__all__" ? "" : v;

                              const nextEntry: TypeSingleFilterValue = {
                                name: colId,
                                operator: entry?.operator ?? "eq",
                                type: entry?.type ?? "string",
                                value: nextValue,
                                active: true,
                              };

                              setSkip(0);
                              if (filterControlled)
                                setFilterValue(
                                  upsertFilterEntry(filterValue, nextEntry)
                                );
                              else
                                setDraftFilterValue(
                                  upsertFilterEntry(draftFilterValue, nextEntry)
                                );
                            }}
                          >
                            <SelectTrigger className="h-8 w-full">
                              <SelectValue
                                placeholder={t(i18n, "contains", "All")}
                              />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__all__">
                                {t(i18n, "clearAll", "All")}
                              </SelectItem>
                              {((col.filterEditorProps as any)?.options || []).map((o: any) => (
                                <SelectItem
                                  key={String(o.value)}
                                  value={String(o.value)}
                                >
                                  {String(o.label ?? o.value)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            value={String(value ?? "")}
                            onChange={(e) => {
                              const next = e.target.value;

                              const nextEntry: TypeSingleFilterValue = {
                                name: colId,
                                operator: entry?.operator ?? "contains",
                                type: entry?.type ?? "string",
                                value: next,
                                active: true,
                              };

                              setSkip(0);
                              if (filterControlled)
                                setFilterValue(
                                  upsertFilterEntry(filterValue, nextEntry)
                                );
                              else
                                setDraftFilterValue(
                                  upsertFilterEntry(draftFilterValue, nextEntry)
                                );
                            }}
                            className="h-8 w-full"
                            placeholder={String(t(i18n, "contains", "Filter…"))}
                          />
                        )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
          </TableHeader>

          <TableBody>
            {loading && rowModel.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={orderedColumns.length}
                  className="h-24 text-center"
                >
                  Loading…
                </TableCell>
              </TableRow>
            ) : rowModel.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={orderedColumns.length}
                  className="h-24 text-center"
                >
                  {t(i18n, "noRecords", "No records")}
                </TableCell>
              </TableRow>
            ) : virtualized ? (
              <>
                {paddingTop > 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={orderedColumns.length}
                      style={{ height: paddingTop }}
                    />
                  </TableRow>
                )}

                {virtualItems.map((vi) => {
                  const row = rowModel[vi.index]!;
                  return (
                    <TableRow key={row.id} style={{ height: vi.size }}>
                      {row.getVisibleCells().map((cell) => {
                        const colId = cell.column.id;
                        const col = (cell.column.columnDef as any)?.meta
                          ?.__column as TypeColumn | undefined;

                        const width = autoWidths[colId];
                        const align = col?.textAlign;

                        return (
                          <TableCell
                            key={cell.id}
                            className={[
                              userSelectClass,
                              align === "right" || align === "end"
                                ? "text-right"
                                : "",
                              col?.className ?? "",
                            ].join(" ")}
                          style={{
                            width,
                            minWidth: col?.minWidth,
                            maxWidth: col?.maxWidth,
                            ...(typeof col?.style === 'object' && col?.style ? col.style : {}),
                          }}
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}

                {paddingBottom > 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={orderedColumns.length}
                      style={{ height: paddingBottom }}
                    />
                  </TableRow>
                )}
              </>
            ) : (
              rowModel.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => {
                    const colId = cell.column.id;
                    const col = (cell.column.columnDef as any)?.meta
                      ?.__column as TypeColumn | undefined;

                    const width = autoWidths[colId];
                    const align = col?.textAlign;

                    return (
                      <TableCell
                        key={cell.id}
                        className={[
                          userSelectClass,
                          align === "right" || align === "end"
                            ? "text-right"
                            : "",
                          col?.className ?? "",
                        ].join(" ")}
                        style={{
                          width,
                          minWidth: col?.minWidth,
                          maxWidth: col?.maxWidth,
                          ...(typeof col?.style === 'object' && col?.style ? col.style : {}),
                        }}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination footer */}
      <div className="flex items-center justify-between px-4">
        <div className="text-muted-foreground hidden flex-1 text-sm md:block">
          {t(i18n, "showingText", "Showing")}{" "}
          <span className="font-mono">{count === 0 ? 0 : skip + 1}</span>–
          <span className="font-mono">{Math.min(skip + limit, count)}</span>{" "}
          {t(i18n, "ofText", "of")} <span className="font-mono">{count}</span>
        </div>

        <div className="flex w-full items-center gap-4 md:w-auto">
          <div className="hidden items-center gap-2 md:flex">
            <Label htmlFor="rows-per-page" className="text-sm font-medium">
              {t(i18n, "perPageText", "Rows")}
            </Label>

            <Select
              value={`${limit}`}
              onValueChange={(value) => {
                setSkip(0);
                setLimit(Number(value));
              }}
            >
              <SelectTrigger className="h-9 w-20" id="rows-per-page">
                <SelectValue placeholder={limit} />
              </SelectTrigger>
              <SelectContent side="top">
                {pageSizes.map((size) => (
                  <SelectItem key={size} value={`${size}`}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-center text-sm font-medium">
            {t(i18n, "pageText", "Page")} {pageIndex + 1}{" "}
            {t(i18n, "ofText", "of")} {pageCount}
          </div>

          <div className="ml-auto flex items-center gap-2 md:ml-0">
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 md:flex"
              onClick={() => setSkip(0)}
              disabled={!canPrev}
            >
              <span className="sr-only">Go to first page</span>
              <IconChevronsLeft className="size-4" />
            </Button>

            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => setSkip(Math.max(0, skip - limit))}
              disabled={!canPrev}
            >
              <span className="sr-only">Go to previous page</span>
              <IconChevronLeft className="size-4" />
            </Button>

            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => setSkip(skip + limit)}
              disabled={!canNext}
            >
              <span className="sr-only">Go to next page</span>
              <IconChevronRight className="size-4" />
            </Button>

            <Button
              variant="outline"
              size="icon"
              className="hidden size-8 md:flex"
              onClick={() => setSkip(Math.max(0, (pageCount - 1) * limit))}
              disabled={!canNext}
            >
              <span className="sr-only">Go to last page</span>
              <IconChevronsRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Filter context menu (cursor anchored) */}
      {filterMenu?.open && enableColumnFilterContextMenu && (
        <div
          className="bg-popover text-popover-foreground fixed z-50 w-56 overflow-hidden rounded-md border shadow-md"
          style={{ left: filterMenu.x, top: filterMenu.y }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="text-muted-foreground px-3 py-2 text-xs font-medium">
            Filter
          </div>

          <button
            className="hover:bg-accent w-full px-3 py-2 text-left text-sm"
            onClick={() => {
              const colId = filterMenu.columnId;
              setSkip(0);
              setFilterValue(clearFilter(filterValue, colId));
              setFilterMenu(null);
            }}
          >
            {t(i18n, "clear", "Clear")}
          </button>

          <div className="text-muted-foreground px-3 py-2 text-xs font-medium">
            Operator
          </div>

          {STRING_OPERATORS.map((op) => (
            <button
              key={op.value}
              className="hover:bg-accent w-full px-3 py-2 text-left text-sm"
              onClick={() => {
                const colId = filterMenu.columnId;
                setSkip(0);
                setFilterValue(setFilterOperator(filterValue, colId, op.value));
                setFilterMenu(null);
              }}
            >
              {op.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export { ReactDataGrid }
export default ReactDataGrid
