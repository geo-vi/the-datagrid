"use client";

import * as React from "react";
import type {
  TypeColumn,
  TypeColumnFilterValueChangeArg,
  TypeFilterTypes,
  TypeFilterValue,
  TypeI18n,
  TypeSortInfo,
} from "../../types";

import { TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { HeaderCell } from "./HeaderCell";
import { FilterCell } from "./FilterCell";

export type GridHeaderProps = {
  headerGroups: any[];

  headerHeight: number;
  filterRowHeight: number;
  columnWidths: Record<string, number>;

  // sorting
  sortInfo: TypeSortInfo;
  setSortInfo: (s: TypeSortInfo) => void;
  setSkip: (n: number) => void;
  allowUnsort: boolean;
  defaultSortDir: 1 | -1;

  showColumnMenuTool: boolean;
  showHorizontalCellBorders: boolean;
  showVerticalCellBorders: boolean;
  i18n?: TypeI18n;

  // DnD reorder
  allowColumnReorder: boolean;
  allowColumnResize: boolean;
  checkboxEnabled: boolean;
  checkboxColId: string;
  onHeaderDragStart: (e: React.DragEvent, columnId: string) => void;
  onHeaderDragOver: (e: React.DragEvent) => void;
  onHeaderDrop: (e: React.DragEvent, targetId: string) => void;
  resizingColumnId: string | null;
  onColumnResizeStart: (
    event: React.MouseEvent<HTMLElement> | React.PointerEvent<HTMLElement>,
    columnId: string
  ) => void;
  onColumnAutoResize: (columnId: string) => void;

  // filtering
  enableFiltering: boolean;
  enableColumnFilterContextMenu: boolean;
  filterControlled: boolean;
  filterValue: TypeFilterValue;
  draftFilterValue: TypeFilterValue;
  setFilterValue: (v: TypeFilterValue) => void;
  setDraftFilterValue: React.Dispatch<React.SetStateAction<TypeFilterValue>>;
  onColumnFilterValueChange?: (event: TypeColumnFilterValueChangeArg) => void;
  filterTypes: TypeFilterTypes;

  openFilterMenuColId: string | null;
  setOpenFilterMenuColId: (id: string | null) => void;

  virtualizeColumns: boolean;
  columnRenderRange: {
    firstIndex: number;
    lastIndex: number;
    beforeWidth: number;
    afterWidth: number;
  };
};

function ColumnSpacerHeader(props: { width: number }) {
  if (props.width <= 0) return null;

  return (
    <TableHead
      aria-hidden="true"
      className="pointer-events-none !p-0"
      style={{
        width: props.width,
        minWidth: props.width,
        maxWidth: props.width,
      }}
    />
  );
}

export function GridHeader(props: GridHeaderProps) {
  const {
    headerGroups,
    headerHeight,
    filterRowHeight,
    columnWidths,
    sortInfo,
    setSortInfo,
    setSkip,
    allowUnsort,
    defaultSortDir,
    showColumnMenuTool,
    showHorizontalCellBorders,
    showVerticalCellBorders,
    i18n,
    allowColumnReorder,
    allowColumnResize,
    checkboxEnabled,
    checkboxColId,
    onHeaderDragStart,
    onHeaderDragOver,
    onHeaderDrop,
    resizingColumnId,
    onColumnResizeStart,
    onColumnAutoResize,
    enableFiltering,
    enableColumnFilterContextMenu,
    filterControlled,
    filterValue,
    draftFilterValue,
    setFilterValue,
    setDraftFilterValue,
    onColumnFilterValueChange,
    filterTypes,
    openFilterMenuColId,
    setOpenFilterMenuColId,
    virtualizeColumns,
    columnRenderRange,
  } = props;

  return (
    <TableHeader className="InovuaReactDataGrid__header [&_tr]:!border-b-0">
      {/* Header row */}
      {headerGroups.map((hg) => (
        <TableRow
          key={hg.id}
          className="tdg-header-row InovuaReactDataGrid__header-row bg-[var(--tdg-header-bg)]"
          style={{ height: headerHeight }}
        >
          <ColumnSpacerHeader
            width={virtualizeColumns ? columnRenderRange.beforeWidth : 0}
          />
          {hg.headers
            .slice(
              virtualizeColumns ? columnRenderRange.firstIndex : 0,
              virtualizeColumns
                ? columnRenderRange.lastIndex + 1
                : hg.headers.length
            )
            .map((h: any, renderedIndex: number) => {
              const columnIndex = virtualizeColumns
                ? columnRenderRange.firstIndex + renderedIndex
                : renderedIndex;
              const colDef = h.column.columnDef as any;
              const col: TypeColumn | undefined = colDef?.meta?.__column;
              const colId = h.column.id;

              const width = columnWidths[colId];

              const canDrag =
                allowColumnReorder &&
                (!checkboxEnabled || colId !== checkboxColId) &&
                (col?.draggable ?? true);
              const canResize =
                allowColumnResize &&
                (!checkboxEnabled || colId !== checkboxColId) &&
                (col?.resizable ?? true);

              return (
                <HeaderCell
                  key={h.id}
                  header={h}
                  col={col}
                  colId={colId}
                  columnIndex={columnIndex}
                  width={width}
                  headerHeight={headerHeight}
                  sortInfo={sortInfo}
                  setSortInfo={setSortInfo}
                  setSkip={setSkip}
                  allowUnsort={allowUnsort}
                  defaultSortDir={defaultSortDir}
                  showColumnMenuTool={showColumnMenuTool}
                  showHorizontalCellBorders={showHorizontalCellBorders}
                  showVerticalCellBorders={showVerticalCellBorders}
                  i18n={i18n}
                  canDrag={Boolean(canDrag)}
                  onDragStart={onHeaderDragStart}
                  onDragOver={onHeaderDragOver}
                  onDrop={onHeaderDrop}
                  canResize={canResize}
                  isResizing={resizingColumnId === colId}
                  onResizeStart={onColumnResizeStart}
                  onAutoResize={onColumnAutoResize}
                />
              );
            })}
          <ColumnSpacerHeader
            width={virtualizeColumns ? columnRenderRange.afterWidth : 0}
          />
        </TableRow>
      ))}

      {/* Filter row */}
      {enableFiltering &&
        headerGroups.map((hg) => (
          <TableRow
            key={`${hg.id}-filters`}
            className="tdg-filter-row InovuaReactDataGrid__filter-row bg-[var(--tdg-filter-bg)]"
            style={{ height: filterRowHeight }}
          >
            <ColumnSpacerHeader
              width={virtualizeColumns ? columnRenderRange.beforeWidth : 0}
            />
            {hg.headers
              .slice(
                virtualizeColumns ? columnRenderRange.firstIndex : 0,
                virtualizeColumns
                  ? columnRenderRange.lastIndex + 1
                  : hg.headers.length
              )
              .map((h: any, renderedIndex: number) => {
                const columnIndex = virtualizeColumns
                  ? columnRenderRange.firstIndex + renderedIndex
                  : renderedIndex;
                const colDef = h.column.columnDef as any;
                const col: TypeColumn | undefined = colDef?.meta?.__column;
                const colId = h.column.id;

                const width = columnWidths[colId];

                return (
                  <FilterCell
                    key={`${h.id}-filter`}
                    header={h}
                    col={col}
                    colId={colId}
                    columnIndex={columnIndex}
                    width={width}
                    headerHeight={headerHeight}
                    filterRowHeight={filterRowHeight}
                    enableFiltering={enableFiltering}
                    enableColumnFilterContextMenu={
                      enableColumnFilterContextMenu
                    }
                    checkboxEnabled={checkboxEnabled}
                    checkboxColId={checkboxColId}
                    filterControlled={filterControlled}
                    filterValue={filterValue}
                    draftFilterValue={draftFilterValue}
                    setFilterValue={setFilterValue}
                    setDraftFilterValue={setDraftFilterValue}
                    onColumnFilterValueChange={onColumnFilterValueChange}
                    setSkip={setSkip}
                    filterTypes={filterTypes}
                    i18n={i18n}
                    showHorizontalCellBorders={showHorizontalCellBorders}
                    showVerticalCellBorders={showVerticalCellBorders}
                    openFilterMenuColId={openFilterMenuColId}
                    setOpenFilterMenuColId={setOpenFilterMenuColId}
                  />
                );
              })}
            <ColumnSpacerHeader
              width={virtualizeColumns ? columnRenderRange.afterWidth : 0}
            />
          </TableRow>
        ))}
    </TableHeader>
  );
}
