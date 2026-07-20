"use client";

import * as React from "react";
import { IconChevronDown } from "@tabler/icons-react";
import { X } from "lucide-react";

import type {
  TypeCellProps,
  TypeColumn,
  TypeColumnFilterValueChangeArg,
  TypeFilterTypes,
  TypeFilterValue,
  TypeI18n,
  TypeSingleFilterValue,
} from "../../types";

import { t } from "../../utils/helpers";
import { cn } from "../../lib/utils";

import { Button } from "../../components/ui/button";
import { Checkbox } from "../../components/ui/checkbox";
import { Input } from "../../components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { TableHead } from "../../components/ui/table";

import {
  clearAllFilters,
  clearFilter,
  getFilterEntry,
  isFilterEntryEmptyValue,
  setFilterOperator,
  upsertFilterEntry,
} from "../../filters/utils";

import {
  humanizeOperatorName,
  isEmptyLikeUI,
  isPlainObject,
  normalizeEditorOutput,
} from "../utils/gridUtils";
import { FilterOperatorMenu } from "./FilterOperatorMenu";

const DEFAULT_FILTER_CELL_PADDING = "0 0.25rem";

export type FilterCellProps = {
  header: any; // tanstack header
  col?: TypeColumn;
  colId: string;
  columnIndex: number;

  headerHeight: number;
  filterRowHeight: number;

  width?: number;

  enableFiltering: boolean;
  enableColumnFilterContextMenu: boolean;

  checkboxEnabled: boolean;
  checkboxColId: string;

  filterControlled: boolean;
  filterValue: TypeFilterValue;
  draftFilterValue: TypeFilterValue;
  setFilterValue: (v: TypeFilterValue) => void;
  setDraftFilterValue: React.Dispatch<React.SetStateAction<TypeFilterValue>>;
  onColumnFilterValueChange?: (event: TypeColumnFilterValueChangeArg) => void;

  setSkip: (n: number) => void;

  filterTypes: TypeFilterTypes;
  showHorizontalCellBorders: boolean;
  showVerticalCellBorders: boolean;
  i18n?: TypeI18n;

  openFilterMenuColId: string | null;
  setOpenFilterMenuColId: (id: string | null) => void;
};

function resolveFilterType(
  col: TypeColumn | undefined,
  entry?: TypeSingleFilterValue
): string {
  return (
    entry?.type ??
    col?.filterType ??
    (typeof (col as any)?.type === "string"
      ? ((col as any).type as string)
      : undefined) ??
    "string"
  );
}

function resolveOperator(
  filterType: string,
  entry?: TypeSingleFilterValue
): string {
  if (entry?.operator) return entry.operator;

  if (filterType === "number") return "gte";
  if (filterType === "select") return "eq";
  if (filterType === "date" || filterType === "time") return "afterOrOn";

  return "contains";
}

function isColumnFilterable(
  args: Pick<
    FilterCellProps,
    "enableFiltering" | "checkboxEnabled" | "checkboxColId"
  >,
  col: TypeColumn | undefined,
  colId: string
): boolean {
  if (!args.enableFiltering) return false;
  if (args.checkboxEnabled && colId === args.checkboxColId) return false;

  if (col?.filterable === false) return false;
  return true;
}

function normalizeFilterCellPadding(
  padding: TypeColumn["filterCellPadding"] | undefined
): string {
  if (typeof padding === "number") return `${padding}px`;
  if (typeof padding === "string" && padding.trim()) return padding;

  return DEFAULT_FILTER_CELL_PADDING;
}

export function FilterCell(props: FilterCellProps) {
  const {
    header,
    col,
    colId,
    columnIndex,
    filterRowHeight,
    width,
    enableFiltering,
    enableColumnFilterContextMenu,
    checkboxEnabled,
    checkboxColId,
    filterControlled,
    filterValue,
    draftFilterValue,
    setFilterValue,
    setDraftFilterValue,
    onColumnFilterValueChange,
    setSkip,
    filterTypes,
    showHorizontalCellBorders,
    showVerticalCellBorders,
    i18n,
    openFilterMenuColId,
    setOpenFilterMenuColId,
  } = props;

  const filterable = isColumnFilterable(
    {
      enableFiltering,
      checkboxEnabled,
      checkboxColId,
    },
    col,
    colId
  );

  const currentFilter = filterControlled ? filterValue : draftFilterValue;
  const entry = getFilterEntry(currentFilter, colId);

  const filterTypeName = resolveFilterType(col, entry);
  const operator = resolveOperator(filterTypeName, entry);

  const typeDef =
    (filterTypes as any)[filterTypeName] ?? (filterTypes as any).string;
  const operators = Array.isArray(typeDef?.operators) ? typeDef.operators : [];
  const opDef = operators.find((o: any) => o?.name === operator);

  const entryEnabled = Boolean(entry) && entry?.active !== false;
  const editorDisabled = !entryEnabled || Boolean(opDef?.disableFilterEditor);
  const clearLabel = String(t(i18n, "clear", "Clear"));

  const active =
    Boolean(entry) &&
    entry?.active !== false &&
    (Boolean(opDef?.filterOnEmptyValue) ||
      Boolean(opDef?.disableFilterEditor) ||
      !isEmptyLikeUI(entry?.value));

  const operatorMenuEnabled =
    enableColumnFilterContextMenu && filterable && Boolean(entry);
  const filterCellPadding = normalizeFilterCellPadding(col?.filterCellPadding);
  const filterCellContext = React.useMemo<TypeCellProps>(
    () => ({
      rowIndex: -1,
      columnIndex,
      computedVisibleIndex: columnIndex,
      id: colId,
      name: colId,
      columnId: colId,
      column: col,
    }),
    [col, colId, columnIndex]
  );

  // Resolve filterEditorProps (supports function form)
  const filterEditorPropsAny = (col as any)?.filterEditorProps;
  const resolvedEditorProps =
    typeof filterEditorPropsAny === "function"
      ? filterEditorPropsAny({ column: col, columnId: colId }, { index: 0 })
      : filterEditorPropsAny;

  function applyFilterNow(next: TypeFilterValue) {
    setSkip(0);
    if (filterControlled) {
      setFilterValue(next);
    } else {
      setDraftFilterValue(next);
      setFilterValue(next);
    }
  }

  function emitColumnFilterValueChange(nextEntry: TypeSingleFilterValue) {
    onColumnFilterValueChange?.({
      filterValue: nextEntry,
      columnId: colId,
      columnIndex,
      cellProps: filterCellContext,
    });
  }

  const onClear = () => {
    const next = clearFilter(currentFilter, colId, { filterTypes });
    const clearedEntry = getFilterEntry(next, colId);

    if (clearedEntry) {
      emitColumnFilterValueChange(clearedEntry);
    }

    applyFilterNow(next);
  };

  const onClearAll = () => {
    applyFilterNow(clearAllFilters(currentFilter, { filterTypes }));
  };

  const onSetEnabled = (enabled: boolean) => {
    if (!entry) return;

    const nextEntry: TypeSingleFilterValue = {
      ...entry,
      active: enabled,
    };
    const next = upsertFilterEntry(currentFilter, nextEntry, { filterTypes });

    emitColumnFilterValueChange(nextEntry);
    applyFilterNow(next);
  };

  const onSelectOperator = (nextOp: string) => {
    const next = setFilterOperator(currentFilter, colId, nextOp, {
      filterTypes,
      type: filterTypeName,
    });
    const nextEntry = getFilterEntry(next, colId);

    if (nextEntry) {
      emitColumnFilterValueChange({
        ...nextEntry,
        active: entry?.active,
      });
    }

    applyFilterNow(next);
  };

  const setEntryValue = (nextValueRaw: unknown) => {
    const nextValue = normalizeEditorOutput(nextValueRaw);

    const nextEntry: TypeSingleFilterValue = {
      name: colId,
      operator,
      type: filterTypeName,
      value: nextValue,
      active: entry?.active,
    };

    emitColumnFilterValueChange(nextEntry);
    setSkip(0);
    if (filterControlled) {
      setFilterValue(
        upsertFilterEntry(filterValue, nextEntry, { filterTypes })
      );
    } else {
      setDraftFilterValue(
        upsertFilterEntry(draftFilterValue, nextEntry, { filterTypes })
      );
    }
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
      key={`${header.id}-filter`}
      data-column-id={colId}
      className={cn(
        "tdg-filter-cell InovuaReactDataGrid__filter-cell InovuaReactDataGrid__column-header__filter-wrapper bg-[var(--tdg-filter-bg)] [color:var(--tdg-filter-color)]",
        showVerticalCellBorders
          ? "InovuaReactDataGrid__filter-cell--show-border-right"
          : "",
        showHorizontalCellBorders
          ? "InovuaReactDataGrid__filter-cell--show-border-bottom border-b [border-bottom-color:var(--tdg-filter-border-color)]"
          : "",
        showVerticalCellBorders
          ? "border-r last:border-r-0 [border-right-color:var(--tdg-filter-border-color)]"
          : ""
      )}
      style={
        {
          width,
          minWidth: col?.minWidth,
          maxWidth: col?.maxWidth,
          height: filterRowHeight,
          "--tdg-filter-cell-padding": filterCellPadding,
        } as React.CSSProperties
      }
      onContextMenu={(e) => {
        if (!operatorMenuEnabled) return;
        e.preventDefault();
        setOpenFilterMenuColId(colId);
      }}
    >
      {header.isPlaceholder || !filterable || !entry ? null : (
        <div
          className="tdg-filter-cell__inner flex h-full items-center gap-0"
          style={{ zIndex: columnIndex + 1 }}
        >
          <div className="InovuaReactDataGrid__column-header__filter min-w-0 flex-1">
            {col?.filterEditor ? (
              React.createElement(col.filterEditor as any, {
                ...(isPlainObject(resolvedEditorProps)
                  ? resolvedEditorProps
                  : {}),
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
                      onSelect={(e: Event) => {
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
                      const checked = arr.some(
                        (x) => String(x) === String(optValue)
                      );

                      return (
                        <DropdownMenuItem
                          key={String(optValue)}
                          onSelect={(e: Event) => {
                            e.preventDefault();
                            const next = checked
                              ? arr.filter(
                                  (x) => String(x) !== String(optValue)
                                )
                              : [...arr, optValue];
                            setEntryValue(next);
                          }}
                          className="flex items-center gap-2"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => {}}
                          />
                          <span className="truncate">{String(optLabel)}</span>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Select
                  value={String(
                    value === "" || value == null ? "__all__" : value
                  )}
                  onValueChange={(v: string) => {
                    const nextValue = v === "__all__" ? "" : v;
                    setEntryValue(nextValue);
                  }}
                  disabled={editorDisabled}
                >
                  <SelectTrigger className="h-8 w-full">
                    <SelectValue
                      placeholder={String(t(i18n, "clearAll", "All"))}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">
                      {t(i18n, "clearAll", "All")}
                    </SelectItem>
                    {options.map((o: any) => {
                      const optValue = o?.value ?? o;
                      const optLabel = o?.label ?? o?.value ?? String(o);

                      return (
                        <SelectItem
                          key={String(optValue)}
                          value={String(optValue)}
                        >
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
                placeholder={String(
                  t(i18n, operator, humanizeOperatorName(operator))
                )}
              />
            )}
          </div>

          {active && !editorDisabled ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="InovuaReactDataGrid__column-header__filter-clear size-6 shrink-0 rounded-none border-0 bg-transparent p-0 text-[var(--tdg-filter-tool-color)] shadow-none hover:bg-transparent hover:text-[var(--tdg-filter-tool-hover-color)]"
              aria-label={clearLabel}
              title={clearLabel}
              onMouseDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                onClear();
              }}
            >
              <X className="size-4" />
            </Button>
          ) : null}

          {operatorMenuEnabled && (
            <FilterOperatorMenu
              open={openFilterMenuColId === colId}
              onOpenChange={(open) =>
                setOpenFilterMenuColId(open ? colId : null)
              }
              active={active}
              enabled={entryEnabled}
              clearDisabled={isFilterEntryEmptyValue(entry, filterTypes)}
              clearAllDisabled={
                !currentFilter?.some(
                  (filterEntry) =>
                    !isFilterEntryEmptyValue(filterEntry, filterTypes)
                )
              }
              operator={operator}
              operators={operators}
              i18n={i18n}
              onClear={onClear}
              onClearAll={onClearAll}
              onEnable={() => onSetEnabled(true)}
              onDisable={() => onSetEnabled(false)}
              onSelectOperator={onSelectOperator}
              title={String(t(i18n, operator, humanizeOperatorName(operator)))}
            />
          )}
        </div>
      )}
    </TableHead>
  );
}
