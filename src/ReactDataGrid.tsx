"use client";

import * as React from "react";
import type {
  TypeCheckboxColumn,
  TypeCheckboxProps,
  TypeColumn,
  TypeComputedProps,
  TypeDataGridProps,
  TypeFilterValue,
  TypeRowSelection,
  TypeSingleFilterValue,
  TypeSortInfo,
} from "./types";

import type { ColumnDef } from "@tanstack/react-table";
import { flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";

import {
  IconArrowsSort,
  IconCheck,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronUp,
  IconChevronsLeft,
  IconChevronsRight,
  IconDotsVertical,
  IconFilter,
} from "@tabler/icons-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { getColumnId, getColumnSortName } from "./utils/column";
import { t, coerceUserSelect, estimateAutoWidth } from "./utils/helpers";
import { useControllableState } from "./hooks/useControllableState";
import {
  DEFAULT_FILTER_TYPES,
  normalizeFilterValue,
  getFilterEntry,
  upsertFilterEntry,
  setFilterOperator,
  clearFilter,
  applyLocalFilter,
} from "./filters/utils";
import { getSortDir, toggleSortInfo, toTanstackSorting, applyLocalSort } from "./sorting/utils";

function sortIcon(dir: 0 | 1 | -1): React.ReactNode {
  if (dir === 1) return <IconChevronUp className="ml-1 size-3" />;
  if (dir === -1) return <IconChevronDown className="ml-1 size-3" />;
  return <IconArrowsSort className="ml-1 size-3 opacity-60" />;
}

/**
 * Optional compat export: Inovua exports `plugins`. We export an empty list.
 */
export const plugins: readonly unknown[] = [] as const;

function isPlainObject(v: unknown): v is Record<string, any> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function toSelectionMap(sel: TypeRowSelection): Record<string, any> {
  if (sel == null) return {};
  if (isPlainObject(sel)) return sel as Record<string, any>;
  return { [String(sel)]: true };
}

function stripFromOrder(order: string[], id: string): string[] {
  return order.filter((x) => x !== id);
}

function injectIntoOrder(order: string[] | undefined, id: string): string[] | undefined {
  if (!order) return order;
  if (order.includes(id)) return order;
  return [id, ...order];
}

function isInteractiveClickTarget(target: HTMLElement | null): boolean {
  if (!target) return false;
  const el = target.closest(
    [
      "button",
      "a",
      "input",
      "select",
      "textarea",
      "[role='button']",
      "[data-rdg-stop-selection]",
      "[data-no-row-select]",
    ].join(",")
  );
  return Boolean(el);
}

function isColumnVisible(c: TypeColumn): boolean {
  if (c.visible === false) return false;
  if (c.visible === true) return true;

  if ((c as any).defaultVisible === false) return false;
  if ((c as any).defaultHidden === true) return false;

  return true;
}

function normalizeEditorOutput(next: unknown): unknown {
  if (next && typeof next === "object" && "value" in (next as any)) return (next as any).value;
  return next;
}

function humanizeOperatorName(name: string): string {
  // "afterOrOn" -> "After Or On", "notinlist" -> "Notinlist" (fallback)
  const spaced = name
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim();
  return spaced.length ? spaced.charAt(0).toUpperCase() + spaced.slice(1) : name;
}

function isEmptyLikeUI(v: unknown): boolean {
  if (v == null) return true;
  if (typeof v === "string") return v.trim().length === 0;
  if (Array.isArray(v)) {
    if (v.length === 0) return true;
    if (v.length === 2) return isEmptyLikeUI(v[0]) && isEmptyLikeUI(v[1]);
    return false;
  }
  if (isPlainObject(v) && ("start" in v || "end" in v)) {
    return isEmptyLikeUI((v as any).start) && isEmptyLikeUI((v as any).end);
  }
  return false;
}

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

  /** ---------------- selection / checkbox column ---------------- */

  const checkboxColumnProp: TypeCheckboxColumn | undefined = props.checkboxColumn;
  const checkboxEnabled = Boolean(checkboxColumnProp);

  const checkboxColId = React.useMemo(() => {
    if (!checkboxEnabled) return "__checkbox__";
    if (typeof checkboxColumnProp === "object") {
      return checkboxColumnProp.id ?? checkboxColumnProp.name ?? "__checkbox__";
    }
    return "__checkbox__";
  }, [checkboxEnabled, checkboxColumnProp]);

  const multiSelect = props.multiSelect ?? checkboxEnabled;
  const checkboxOnlyRowSelect = props.checkboxOnlyRowSelect ?? checkboxEnabled;
  const checkboxSelectEnableShiftKey = props.checkboxSelectEnableShiftKey ?? false;

  const controlledSelected = props.selected !== undefined;
  const [internalSelected, setInternalSelected] = React.useState<TypeRowSelection>(() => {
    if (props.defaultSelected !== undefined) return props.defaultSelected;
    return multiSelect ? {} : null;
  });

  const selected: TypeRowSelection = controlledSelected ? (props.selected as TypeRowSelection) : internalSelected;
  const selectedMap = React.useMemo(() => toSelectionMap(selected), [selected]);

  const lastSelectedIndexRef = React.useRef<number | null>(null);
  const lastPointerRef = React.useRef<{ shiftKey: boolean }>({ shiftKey: false });

  const emitSelectionChange = React.useCallback(
    (nextMap: Record<string, any>, meta?: { data?: unknown; unselected?: TypeRowSelection }) => {
      const nextSelected: TypeRowSelection = nextMap;

      if (!controlledSelected) setInternalSelected(nextSelected);

      props.onSelectionChange?.({
        selected: nextSelected,
        data: meta?.data,
        unselected: meta?.unselected,
        originalData: dataSource,
      });
    },
    [controlledSelected, dataSource, props]
  );

  /** ---------------- filter types ---------------- */

  const filterTypes = React.useMemo(() => {
    return { ...DEFAULT_FILTER_TYPES, ...(props.filterTypes ?? {}) };
  }, [props.filterTypes]);

  /** ---------------- columns / order ---------------- */

  const checkboxColumn: TypeColumn | null = React.useMemo(() => {
    if (!checkboxEnabled) return null;

    const hasAlready = inputColumns.some((c) => getColumnId(c) === checkboxColId);
    if (hasAlready) return null;

    const cfg = typeof checkboxColumnProp === "object" ? checkboxColumnProp : undefined;
    const width = (cfg?.width ?? cfg?.defaultWidth ?? 44) as number;

    return {
      ...(cfg ?? {}),
      id: checkboxColId,
      name: checkboxColId,
      sortable: false,
      filterable: false,
      draggable: false,
      hideable: false,
      width,
      defaultWidth: width,
      minWidth: cfg?.minWidth ?? width,
      maxWidth: cfg?.maxWidth ?? width,
    } as TypeColumn;
  }, [checkboxColId, checkboxColumnProp, checkboxEnabled, inputColumns]);

  const allInputColumns = React.useMemo(() => {
    return checkboxColumn ? [checkboxColumn, ...inputColumns] : inputColumns;
  }, [checkboxColumn, inputColumns]);

  const defaultColumnOrder = React.useMemo(() => {
    const base = inputColumns.map((c) => getColumnId(c));
    return checkboxEnabled ? [checkboxColId, ...base] : base;
  }, [checkboxColId, checkboxEnabled, inputColumns]);

  const [columnOrder, setColumnOrder] = useControllableState<string[]>({
    value: checkboxEnabled ? injectIntoOrder(props.columnOrder, checkboxColId) : props.columnOrder,
    defaultValue:
      checkboxEnabled
        ? injectIntoOrder(props.columnOrder ?? defaultColumnOrder, checkboxColId) ?? defaultColumnOrder
        : props.columnOrder ?? defaultColumnOrder,
    onChange: (next) => {
      const userNext = checkboxEnabled ? stripFromOrder(next, checkboxColId) : next;
      props.onColumnOrderChange?.(userNext);
    },
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
    for (const c of allInputColumns) colById.set(getColumnId(c), c);

    const ordered: TypeColumn[] = [];
    for (const id of columnOrder) {
      const col = colById.get(id);
      if (col) ordered.push(col);
    }

    for (const c of allInputColumns) {
      const id = getColumnId(c);
      if (!ordered.find((x) => getColumnId(x) === id)) ordered.push(c);
    }

    return ordered.filter(isColumnVisible);
  }, [allInputColumns, columnOrder]);

  const tanstackSorting = React.useMemo(() => toTanstackSorting(sortInfo, orderedColumns), [sortInfo, orderedColumns]);

  /** ---------------- data loading ---------------- */

  const [rows, setRows] = React.useState<any[]>([]);
  const [count, setCount] = React.useState<number>(0);
  const [internalLoading, setInternalLoading] = React.useState(false);
  const loading = props.loading ?? internalLoading;

  const computedFilterForFetch = filterValue;
  const computedSortForFetch = sortInfo;

  const columnsForDs = React.useMemo(() => {
    return checkboxEnabled ? orderedColumns.filter((c) => getColumnId(c) !== checkboxColId) : orderedColumns;
  }, [checkboxColId, checkboxEnabled, orderedColumns]);

  const columnOrderForDs = React.useMemo(() => {
    return checkboxEnabled ? stripFromOrder(columnOrder, checkboxColId) : columnOrder;
  }, [checkboxColId, checkboxEnabled, columnOrder]);

  const loadData = React.useCallback(async () => {
    if (Array.isArray(dataSource)) {
      let data = dataSource;

      if (enableFiltering && computedFilterForFetch) {
        data = applyLocalFilter(data, computedFilterForFetch, { filterTypes, columns: orderedColumns });
      }
      if (computedSortForFetch) {
        data = applyLocalSort(data, computedSortForFetch, orderedColumns);
      }

      const totalCount = data.length;

      const paginationMode = props.pagination ?? true;
      const doPage = paginationMode !== false && paginationMode !== "remote";

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
        columnOrder: columnOrderForDs,
        columns: columnsForDs,
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
    columnOrderForDs,
    columnsForDs,
    filterTypes,
  ]);

  React.useEffect(() => {
    void loadData();
  }, [loadData]);

  React.useEffect(() => {
    if (filterControlled) return;

    const handle = window.setTimeout(() => {
      setFilterValue(draftFilterValue);
    }, 300);

    return () => window.clearTimeout(handle);
  }, [draftFilterValue, filterControlled, setFilterValue]);

  /** ---------------- column autosize heuristic ---------------- */

  const [autoWidths, setAutoWidths] = React.useState<Record<string, number>>({});

  React.useEffect(() => {
    if (!enableColumnAutosize) return;

    const next: Record<string, number> = {};

    const sample = rows.slice(0, 25);
    for (const c of orderedColumns) {
      const id = getColumnId(c);

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

  /** ---------------- selection helpers ---------------- */

  const selectionEnabled = checkboxEnabled || Boolean(props.onSelectionChange);

  const getRowKey = React.useCallback(
    (row: any, index: number) => {
      const v = row?.[idProperty];
      return v == null ? String(index) : String(v);
    },
    [idProperty]
  );

  /** ---------------- filter operator menu state ---------------- */

  const [openFilterMenuColId, setOpenFilterMenuColId] = React.useState<string | null>(null);

  /** ---------------- columnDefs (TanStack) ---------------- */

  const columnDefs = React.useMemo<ColumnDef<any, any>[]>(() => {
    return orderedColumns.map((c) => {
      const colId = getColumnId(c);

      if (checkboxEnabled && colId === checkboxColId) {
        const cfg = typeof checkboxColumnProp === "object" ? checkboxColumnProp : undefined;
        const renderCheckbox = cfg?.renderCheckbox;

        return {
          id: colId,
          accessorFn: () => null,
          enableSorting: false,
          header: () => {
            const pageRowIds = rows.map((r, idx) => getRowKey(r, idx));
            const selectedOnPage = pageRowIds.reduce((acc, id) => acc + (selectedMap[id] ? 1 : 0), 0);
            const allSelected = pageRowIds.length > 0 && selectedOnPage === pageRowIds.length;
            const someSelected = selectedOnPage > 0 && !allSelected;

            const onChange = (checked: boolean) => {
              if (!multiSelect) {
                const next: Record<string, any> = {};
                if (checked && rows[0]) next[getRowKey(rows[0], 0)] = rows[0];
                emitSelectionChange(next, { data: rows[0] });
                return;
              }

              const next = { ...selectedMap };
              if (checked) {
                rows.forEach((r, idx) => {
                  next[getRowKey(r, idx)] = r;
                });
              } else {
                rows.forEach((r, idx) => {
                  delete next[getRowKey(r, idx)];
                });
              }
              emitSelectionChange(next, { data: rows });
            };

            const checkboxProps: TypeCheckboxProps = {
              checked: allSelected,
              indeterminate: someSelected,
              disabled: rows.length === 0,
              onChange,
            };

            const node = renderCheckbox
              ? renderCheckbox(checkboxProps, { headerCell: true, data: rows })
              : (
                  <Checkbox
                    checked={checkboxProps.indeterminate ? "indeterminate" : checkboxProps.checked}
                    disabled={checkboxProps.disabled}
                    onCheckedChange={(v) => checkboxProps.onChange(v === true, v)}
                    onClick={(e) => e.stopPropagation()}
                  />
                );

            return (
              <div
                className="flex items-center justify-center"
                onMouseDown={(e) => {
                  lastPointerRef.current.shiftKey = (e as any).shiftKey === true;
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {node}
              </div>
            );
          },
          cell: (ctx) => {
            const rowData = ctx.row.original;
            const rowIndex = ctx.row.index;
            const rowId = ctx.row.id;

            const isSelected = Boolean(selectedMap[rowId]);

            const onChange = (checked: boolean) => {
              if (!selectionEnabled) return;

              const shiftKey = checkboxSelectEnableShiftKey && lastPointerRef.current.shiftKey === true;
              const next = { ...selectedMap };

              const rowModel = ctx.table.getRowModel().rows;

              if (shiftKey && multiSelect && lastSelectedIndexRef.current != null) {
                const from = Math.min(lastSelectedIndexRef.current, rowIndex);
                const to = Math.max(lastSelectedIndexRef.current, rowIndex);

                for (let i = from; i <= to; i++) {
                  const r = rowModel[i];
                  if (!r) continue;
                  if (checked) next[r.id] = r.original;
                  else delete next[r.id];
                }
              } else {
                if (checked) {
                  if (!multiSelect) {
                    Object.keys(next).forEach((k) => delete next[k]);
                  }
                  next[rowId] = rowData;
                } else {
                  delete next[rowId];
                }
              }

              lastSelectedIndexRef.current = rowIndex;
              emitSelectionChange(next, { data: rowData, unselected: checked ? null : { [rowId]: rowData } });
            };

            const checkboxProps: TypeCheckboxProps = {
              checked: isSelected,
              disabled: false,
              onChange,
            };

            const node = renderCheckbox
              ? renderCheckbox(checkboxProps, { headerCell: false, data: rowData, rowIndex })
              : (
                  <Checkbox
                    checked={checkboxProps.checked}
                    disabled={checkboxProps.disabled}
                    onCheckedChange={(v) => checkboxProps.onChange(v === true, v)}
                    onClick={(e) => e.stopPropagation()}
                  />
                );

            return (
              <div
                className="flex items-center justify-center"
                onMouseDown={(e) => {
                  lastPointerRef.current.shiftKey = (e as any).shiftKey === true;
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {node}
              </div>
            );
          },
          meta: {
            __column: c,
          },
        } satisfies ColumnDef<any, any>;
      }

      return {
        id: colId,
        accessorFn: (row) => (row as any)?.[colId],
        enableSorting: c.sortable ?? true,
        header: () => c.renderHeader?.({ column: c, columnId: colId }) ?? c.header ?? c.name ?? c.id ?? colId,
        cell: (ctx) => {
          const value = ctx.getValue();
          const rowData = ctx.row.original;
          const rowIndex = ctx.row.index;

          if (c.render) {
            const cellProps = {
              column: c,
              columnId: colId,
              rowIndex,
              dateFormat: (c as any).dateFormat,
              ...(typeof (c as any).cellProps === "object" ? (c as any).cellProps : {}),
            };

            if (c.render.length <= 1) {
              return c.render({
                value,
                data: rowData,
                rowIndex,
                column: c,
                columnId: colId,
                cellProps,
              } as any);
            }

            return c.render(value, {
              data: rowData,
              rowIndex,
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
  }, [
    checkboxColId,
    checkboxColumnProp,
    checkboxEnabled,
    emitSelectionChange,
    getRowKey,
    multiSelect,
    orderedColumns,
    rows,
    selectedMap,
    selectionEnabled,
    checkboxSelectEnableShiftKey,
  ]);

  const table = useReactTable({
    data: rows,
    columns: columnDefs,
    state: { sorting: tanstackSorting },
    manualSorting: true,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row, index) => {
      const v = (row as any)?.[idProperty];
      return v == null ? String(index) : String(v);
    },
  });

  /** ---------------- virtualization ---------------- */

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

  /** ---------------- imperative API ---------------- */

  const apiRef = React.useRef<TypeComputedProps | null>(null);

  React.useEffect(() => {
    apiRef.current = {
      reload: () => void loadData(),

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

      getColumnOrder: () => columnOrderForDs,
      setColumnOrder: (next) => {
        const internalNext = checkboxEnabled ? injectIntoOrder(next, checkboxColId) ?? next : next;
        setColumnOrder(internalNext);
      },
    };

    props.handle?.(apiRef);
    props.onReady?.(apiRef);
  }, [
    checkboxColId,
    checkboxEnabled,
    columnOrderForDs,
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

  /** ---------------- pagination derived ---------------- */

  const safeLimit = Math.max(1, limit);
  const pageIndex = Math.floor(skip / safeLimit);
  const pageCount = Math.max(1, Math.ceil(count / safeLimit) || 1);

  const canPrev = skip > 0;
  const canNext = skip + safeLimit < count;

  const userSelectClass = coerceUserSelect(columnUserSelect) === "none" ? "select-none" : "select-text";

  /** ---------------- header drag/drop reorder ---------------- */

  const dragIdRef = React.useRef<string | null>(null);

  const allowColumnReorder = (props.reorderColumns ?? true) && Boolean(props.onColumnOrderChange);

  function onHeaderDragStart(e: React.DragEvent, columnId: string) {
    if (!allowColumnReorder) return;
    if (checkboxEnabled && columnId === checkboxColId) return;

    dragIdRef.current = columnId;
    try {
      e.dataTransfer.setData("text/plain", columnId);
    } catch {}
    e.dataTransfer.effectAllowed = "move";
  }

  function onHeaderDrop(e: React.DragEvent, targetId: string) {
    if (!allowColumnReorder) return;
    if (checkboxEnabled && (targetId === checkboxColId || dragIdRef.current === checkboxColId)) return;

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
    if (!allowColumnReorder) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  /** ---------------- filter helpers ---------------- */

  function isColumnFilterable(col: TypeColumn | undefined, colId: string): boolean {
    if (!enableFiltering) return false;
    if (checkboxEnabled && colId === checkboxColId) return false;
    if (col?.filterable === false) return false;
    if (col?.filterable === true) return true;

    const current = filterControlled ? filterValue : draftFilterValue;
    const hasEntry = Boolean(getFilterEntry(current, colId));
    if (hasEntry) return true;

    if (col?.filterEditor) return true;

    return false;
  }

  function resolveFilterType(col: TypeColumn | undefined, entry?: TypeSingleFilterValue): string {
    return (
      entry?.type ??
      col?.filterType ??
      (typeof (col as any)?.type === "string" ? ((col as any).type as string) : undefined) ??
      "string"
    );
  }

  function resolveOperator(filterType: string, entry?: TypeSingleFilterValue): string {
    if (entry?.operator) return entry.operator;

    if (filterType === "number") return "gte";
    if (filterType === "select") return "eq";
    if (filterType === "date" || filterType === "time") return "afterOrOn";

    return "contains";
  }

  function applyFilterNow(next: TypeFilterValue) {
    setSkip(0);
    if (filterControlled) {
      setFilterValue(next);
    } else {
      // apply immediately + keep draft in sync
      setDraftFilterValue(next);
      setFilterValue(next);
    }
  }

  /** ---------------- render ---------------- */

  return (
    <div className={cn("flex flex-col gap-2 lg:gap-6", className)} data-theme={theme}>
      <div
        ref={scrollRef}
        className={cn("relative overflow-auto rounded-lg border border-border", virtualized ? "max-h-[560px]" : "")}
        style={style}
      >
        <table className="w-full table-fixed caption-bottom text-sm">
          <TableHeader>
            {/* Header row */}
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="bg-muted/50" style={{ height: headerHeight }}>
                {hg.headers.map((h) => {
                  const colDef = h.column.columnDef as any;
                  const col: TypeColumn | undefined = colDef?.meta?.__column;
                  const colId = h.column.id;

                  const canSort = (col?.sortable ?? true) && h.column.getCanSort();
                  const sortName = col ? getColumnSortName(col) : colId;
                  const dir = getSortDir(sortInfo, sortName);

                  const width = autoWidths[colId];
                  const headerAlign = col?.headerAlign ?? col?.textAlign;

                  const canDrag =
                    allowColumnReorder &&
                    colId !== checkboxColId &&
                    (col?.draggable ?? true) &&
                    Boolean(props.onColumnOrderChange);

                  return (
                    <TableHead
                      key={h.id}
                      colSpan={h.colSpan}
                      className={cn(
                        "sticky top-0 z-20 bg-muted/50",
                        headerAlign === "right" || headerAlign === "end" ? "text-right" : "",
                        col?.headerProps?.className
                      )}
                      style={{
                        width,
                        minWidth: col?.minWidth,
                        maxWidth: col?.maxWidth,
                        height: headerHeight,
                        ...col?.headerProps?.style,
                      }}
                      draggable={Boolean(canDrag)}
                      onDragStart={(e) => canDrag && onHeaderDragStart(e, colId)}
                      onDragOver={(e) => canDrag && onHeaderDragOver(e)}
                      onDrop={(e) => canDrag && onHeaderDrop(e, colId)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center">
                          {h.isPlaceholder ? null : canSort ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="-ml-3 h-8 px-2"
                              onClick={(e) => {
                                const next = toggleSortInfo({
                                  sortInfo,
                                  col: col ?? { name: colId },
                                  allowUnsort,
                                  defaultDir: defaultSortDir,
                                  multi: (e as any).shiftKey === true,
                                });

                                setSkip(0);
                                setSortInfo(next);
                              }}
                            >
                              <span className="truncate">{flexRender(h.column.columnDef.header, h.getContext())}</span>
                              {sortIcon(dir)}
                            </Button>
                          ) : (
                            <span className="truncate">{flexRender(h.column.columnDef.header, h.getContext())}</span>
                          )}
                        </div>

                        {showColumnMenuTool && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                type="button"
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
                                onSelect={() => {
                                  const next: TypeSortInfo = { name: sortName, dir: 1 };
                                  setSkip(0);
                                  setSortInfo(next);
                                }}
                              >
                                {t(i18n, "sortAsc", "Sort A→Z")}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onSelect={() => {
                                  const next: TypeSortInfo = { name: sortName, dir: -1 };
                                  setSkip(0);
                                  setSortInfo(next);
                                }}
                              >
                                {t(i18n, "sortDesc", "Sort Z→A")}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onSelect={() => {
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

            {/* Filter row (with filter icon + operator dropdown) */}
            {enableFiltering &&
              table.getHeaderGroups().map((hg) => (
                <TableRow
                  key={`${hg.id}-filters`}
                  className="bg-background/95 supports-[backdrop-filter]:bg-background/60"
                  style={{ height: filterRowHeight }}
                >
                  {hg.headers.map((h) => {
                    const colDef = h.column.columnDef as any;
                    const col: TypeColumn | undefined = colDef?.meta?.__column;
                    const colId = h.column.id;

                    const filterable = isColumnFilterable(col, colId);

                    const currentFilter = filterControlled ? filterValue : draftFilterValue;
                    const entry = getFilterEntry(currentFilter, colId);

                    const filterTypeName = resolveFilterType(col, entry);
                    const operator = resolveOperator(filterTypeName, entry);

                    const typeDef = (filterTypes as any)[filterTypeName] ?? filterTypes.string;
                    const operators = Array.isArray(typeDef?.operators) ? typeDef.operators : [];
                    const opDef = operators.find((o: any) => o?.name === operator);

                    const editorDisabled = Boolean(opDef?.disableFilterEditor);

                    const active =
                      Boolean(entry) &&
                      entry?.active !== false &&
                      (Boolean(opDef?.filterOnEmptyValue) || Boolean(opDef?.disableFilterEditor) || !isEmptyLikeUI(entry?.value));

                    const width = autoWidths[colId];

                    // Editor prop resolver (supports function form)
                    const resolvedEditorProps =
                      typeof col?.filterEditorProps === "function"
                        ? (col.filterEditorProps as any)({ column: col, columnId: colId }, { index: 0 })
                        : col?.filterEditorProps;

                    const setEntryValue = (nextValueRaw: unknown) => {
                      const nextValue = normalizeEditorOutput(nextValueRaw);

                      const nextEntry: TypeSingleFilterValue = {
                        name: colId,
                        operator,
                        type: filterTypeName,
                        value: nextValue,
                        active: undefined,
                      };

                      setSkip(0);
                      if (filterControlled) {
                        setFilterValue(upsertFilterEntry(filterValue, nextEntry, { filterTypes }));
                      } else {
                        setDraftFilterValue(upsertFilterEntry(draftFilterValue, nextEntry, { filterTypes }));
                      }
                    };

                    const operatorMenuEnabled = enableColumnFilterContextMenu && filterable;

                    const onClear = () => {
                      applyFilterNow(clearFilter(filterValue, colId, { filterTypes }));
                    };

                    const onSelectOperator = (nextOp: string) => {
                      const next = setFilterOperator(filterValue, colId, nextOp, { filterTypes, type: filterTypeName });
                      applyFilterNow(next);
                    };

                    // Built-in select support (single + multi)
                    const options = Array.isArray((resolvedEditorProps as any)?.options)
                      ? ((resolvedEditorProps as any).options as any[])
                      : [];

                    const multiple =
                      Boolean((resolvedEditorProps as any)?.multiple) ||
                      operator === "inlist" ||
                      operator === "notinlist";

                    const value = entry?.value ?? (multiple ? [] : "");

                    return (
                      <TableHead
                        key={`${h.id}-filter`}
                        className={cn(
                          "sticky z-10 bg-background/95 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/60"
                        )}
                        style={{
                          top: headerHeight,
                          width,
                          minWidth: col?.minWidth,
                          maxWidth: col?.maxWidth,
                          height: filterRowHeight,
                        }}
                        onContextMenu={(e) => {
                          if (!operatorMenuEnabled) return;
                          e.preventDefault();
                          setOpenFilterMenuColId(colId);
                        }}
                      >
                        {h.isPlaceholder || !filterable ? null : (
                          <div className="flex items-center gap-1">
                            <div className="min-w-0 flex-1">
                              {col?.filterEditor ? (
                                React.createElement(col.filterEditor as any, {
                                  filterValue: {
                                    name: colId,
                                    operator,
                                    type: filterTypeName,
                                    value: entry?.value ?? null,
                                    emptyValue: entry?.emptyValue,
                                    active: entry?.active,
                                  },
                                  value: entry?.value ?? null,
                                  onChange: (next: unknown) => setEntryValue(next),
                                  column: col,
                                  columnId: colId,
                                  disabled: editorDisabled,
                                  ...(isPlainObject(resolvedEditorProps) ? resolvedEditorProps : {}),
                                })
                              ) : filterTypeName === "select" && options.length > 0 ? (
                                multiple ? (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-8 w-full justify-between px-2"
                                        disabled={editorDisabled}
                                      >
                                        <span className="truncate">
                                          {Array.isArray(value) && value.length > 0
                                            ? `${value.length} ${t(i18n, "selected", "selected")}`
                                            : String(t(i18n, "clearAll", "All"))}
                                        </span>
                                        <IconChevronDown className="ml-2 size-3 opacity-60" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start" className="w-56">
                                      <DropdownMenuItem
                                        onSelect={(e) => {
                                          e.preventDefault();
                                          setEntryValue([]);
                                        }}
                                      >
                                        {t(i18n, "clearAll", "All")}
                                      </DropdownMenuItem>
                                      {options.map((o: any) => {
                                        const optValue = o?.value ?? o;
                                        const optLabel = o?.label ?? o?.value ?? String(o);

                                        const arr = Array.isArray(value) ? value : [];
                                        const checked = arr.some((x) => String(x) === String(optValue));

                                        return (
                                          <DropdownMenuItem
                                            key={String(optValue)}
                                            onSelect={(e) => {
                                              e.preventDefault();
                                              const next = checked
                                                ? arr.filter((x) => String(x) !== String(optValue))
                                                : [...arr, optValue];
                                              setEntryValue(next);
                                            }}
                                            className="flex items-center gap-2"
                                          >
                                            <Checkbox checked={checked} onCheckedChange={() => {}} />
                                            <span className="truncate">{String(optLabel)}</span>
                                          </DropdownMenuItem>
                                        );
                                      })}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                ) : (
                                  <Select
                                    value={String(value === "" || value == null ? "__all__" : value)}
                                    onValueChange={(v: string) => {
                                      const nextValue = v === "__all__" ? "" : v;
                                      setEntryValue(nextValue);
                                    }}
                                    disabled={editorDisabled}
                                  >
                                    <SelectTrigger className="h-8 w-full">
                                      <SelectValue placeholder={String(t(i18n, "clearAll", "All"))} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="__all__">{t(i18n, "clearAll", "All")}</SelectItem>
                                      {options.map((o: any) => {
                                        const optValue = o?.value ?? o;
                                        const optLabel = o?.label ?? o?.value ?? String(o);

                                        return (
                                          <SelectItem key={String(optValue)} value={String(optValue)}>
                                            {String(optLabel)}
                                          </SelectItem>
                                        );
                                      })}
                                    </SelectContent>
                                  </Select>
                                )
                              ) : (
                                <Input
                                  value={String(value ?? "")}
                                  disabled={editorDisabled}
                                  onChange={(e) => setEntryValue(e.target.value)}
                                  className="h-8 w-full"
                                  placeholder={String(t(i18n, operator, humanizeOperatorName(operator)))}
                                />
                              )}
                            </div>

                            {/* Filter icon + operator dropdown */}
                            {operatorMenuEnabled && (
                              <DropdownMenu
                                open={openFilterMenuColId === colId}
                                onOpenChange={(open) => setOpenFilterMenuColId(open ? colId : null)}
                              >
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="size-7 shrink-0"
                                    aria-label={String(t(i18n, "filter", "Filter"))}
                                    title={String(t(i18n, operator, humanizeOperatorName(operator)))}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <IconFilter className={cn("size-4", active ? "" : "opacity-50")} />
                                  </Button>
                                </DropdownMenuTrigger>

                                <DropdownMenuContent align="end" className="w-56">
                                  <div className="px-3 py-2 text-xs font-medium text-muted-foreground">
                                    {String(t(i18n, "filter", "Filter"))}
                                  </div>

                                  <DropdownMenuItem
                                    onSelect={(e) => {
                                      e.preventDefault();
                                      onClear();
                                    }}
                                  >
                                    {String(t(i18n, "clear", "Clear"))}
                                  </DropdownMenuItem>

                                  <div className="px-3 py-2 text-xs font-medium text-muted-foreground">
                                    {String(t(i18n, "operator", "Operator"))}
                                  </div>

                                  {operators.map((opItem: any) => {
                                    const opName = String(opItem?.name ?? "");
                                    if (!opName) return null;

                                    const label = String(t(i18n, opName, humanizeOperatorName(opName)));
                                    const isCurrent = opName === operator;

                                    return (
                                      <DropdownMenuItem
                                        key={opName}
                                        onSelect={(e) => {
                                          e.preventDefault();
                                          onSelectOperator(opName);
                                        }}
                                      >
                                        <div className="flex w-full items-center justify-between gap-3">
                                          <span className="truncate">{label}</span>
                                          {isCurrent ? <IconCheck className="size-4 opacity-80" /> : null}
                                        </div>
                                      </DropdownMenuItem>
                                    );
                                  })}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
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
                <TableCell colSpan={orderedColumns.length} className="h-24 text-center">
                  Loading…
                </TableCell>
              </TableRow>
            ) : rowModel.length === 0 ? (
              <TableRow>
                <TableCell colSpan={orderedColumns.length} className="h-24 text-center">
                  {t(i18n, "noRecords", "No records")}
                </TableCell>
              </TableRow>
            ) : virtualized ? (
              <>
                {paddingTop > 0 && (
                  <TableRow>
                    <TableCell colSpan={orderedColumns.length} style={{ height: paddingTop }} />
                  </TableRow>
                )}

                {virtualItems.map((vi) => {
                  const row = rowModel[vi.index]!;
                  const rowIsSelected = Boolean(selectedMap[row.id]);

                  return (
                    <TableRow
                      key={row.id}
                      className={cn("hover:bg-muted/40", rowIsSelected ? "bg-muted/30" : "")}
                      style={{ height: vi.size }}
                      onClick={(e) => {
                        if (!selectionEnabled) return;
                        if (checkboxOnlyRowSelect) return;
                        if (isInteractiveClickTarget(e.target as any)) return;

                        const next = { ...selectedMap };
                        if (multiSelect) {
                          if (next[row.id]) delete next[row.id];
                          else next[row.id] = row.original;
                        } else {
                          Object.keys(next).forEach((k) => delete next[k]);
                          next[row.id] = row.original;
                        }

                        emitSelectionChange(next, { data: row.original });
                      }}
                    >
                      {row.getVisibleCells().map((cell) => {
                        const colId = cell.column.id;
                        const col = (cell.column.columnDef as any)?.meta?.__column as TypeColumn | undefined;

                        const width = autoWidths[colId];
                        const align = col?.textAlign;

                        return (
                          <TableCell
                            key={cell.id}
                            className={cn(
                              userSelectClass,
                              align === "right" || align === "end" ? "text-right" : "",
                              col?.className
                            )}
                            style={{
                              width,
                              minWidth: col?.minWidth,
                              maxWidth: col?.maxWidth,
                              ...(typeof col?.style === "object" && col?.style ? col.style : {}),
                            }}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}

                {paddingBottom > 0 && (
                  <TableRow>
                    <TableCell colSpan={orderedColumns.length} style={{ height: paddingBottom }} />
                  </TableRow>
                )}
              </>
            ) : (
              rowModel.map((row) => {
                const rowIsSelected = Boolean(selectedMap[row.id]);

                return (
                  <TableRow
                    key={row.id}
                    className={cn("hover:bg-muted/40", rowIsSelected ? "bg-muted/30" : "")}
                    onClick={(e) => {
                      if (!selectionEnabled) return;
                      if (checkboxOnlyRowSelect) return;
                      if (isInteractiveClickTarget(e.target as any)) return;

                      const next = { ...selectedMap };
                      if (multiSelect) {
                        if (next[row.id]) delete next[row.id];
                        else next[row.id] = row.original;
                      } else {
                        Object.keys(next).forEach((k) => delete next[k]);
                        next[row.id] = row.original;
                      }

                      emitSelectionChange(next, { data: row.original });
                    }}
                  >
                    {row.getVisibleCells().map((cell) => {
                      const colId = cell.column.id;
                      const col = (cell.column.columnDef as any)?.meta?.__column as TypeColumn | undefined;

                      const width = autoWidths[colId];
                      const align = col?.textAlign;

                      return (
                        <TableCell
                          key={cell.id}
                          className={cn(
                            userSelectClass,
                            align === "right" || align === "end" ? "text-right" : "",
                            col?.className
                          )}
                          style={{
                            width,
                            minWidth: col?.minWidth,
                            maxWidth: col?.maxWidth,
                            ...(typeof col?.style === "object" && col?.style ? col.style : {}),
                          }}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </table>
      </div>

      {/* Pagination footer */}
      <div className="flex items-center justify-between px-4">
        <div className="hidden flex-1 text-sm text-muted-foreground md:block">
          {t(i18n, "showingText", "Showing")} <span className="font-mono">{count === 0 ? 0 : skip + 1}</span>–
          <span className="font-mono">{Math.min(skip + limit, count)}</span> {t(i18n, "ofText", "of")}{" "}
          <span className="font-mono">{count}</span>
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
                <SelectValue placeholder={`${limit}`} />
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
            {t(i18n, "pageText", "Page")} {pageIndex + 1} {t(i18n, "ofText", "of")} {pageCount}
          </div>

          <div className="ml-auto flex items-center gap-2 md:ml-0">
            <Button
              type="button"
              variant="outline"
              className="hidden h-8 w-8 p-0 md:flex"
              onClick={() => setSkip(0)}
              disabled={!canPrev}
            >
              <span className="sr-only">Go to first page</span>
              <IconChevronsLeft className="size-4" />
            </Button>

            <Button
              type="button"
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
              type="button"
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
              type="button"
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
    </div>
  );
}

export { ReactDataGrid };
export default ReactDataGrid;
