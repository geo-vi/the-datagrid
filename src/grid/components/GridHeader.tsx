"use client";

import * as React from "react";
import type { TypeColumn, TypeFilterTypes, TypeFilterValue, TypeI18n, TypeSortInfo } from "../../types";

import { TableHeader, TableRow } from "../../components/ui/table";
import { HeaderCell } from "./HeaderCell";
import { FilterCell } from "./FilterCell";

export type GridHeaderProps = {
  headerGroups: any[];

  headerHeight: number;
  filterRowHeight: number;
  autoWidths: Record<string, number>;

  // sorting
  sortInfo: TypeSortInfo;
  setSortInfo: (s: TypeSortInfo) => void;
  setSkip: (n: number) => void;
  allowUnsort: boolean;
  defaultSortDir: 1 | -1;

  showColumnMenuTool: boolean;
  i18n?: TypeI18n;

  // DnD reorder
  allowColumnReorder: boolean;
  checkboxEnabled: boolean;
  checkboxColId: string;
  onHeaderDragStart: (e: React.DragEvent, columnId: string) => void;
  onHeaderDragOver: (e: React.DragEvent) => void;
  onHeaderDrop: (e: React.DragEvent, targetId: string) => void;

  // filtering
  enableFiltering: boolean;
  enableColumnFilterContextMenu: boolean;
  filterControlled: boolean;
  filterValue: TypeFilterValue;
  draftFilterValue: TypeFilterValue;
  setFilterValue: (v: TypeFilterValue) => void;
  setDraftFilterValue: React.Dispatch<React.SetStateAction<TypeFilterValue>>;
  filterTypes: TypeFilterTypes;

  openFilterMenuColId: string | null;
  setOpenFilterMenuColId: (id: string | null) => void;
};

export function GridHeader(props: GridHeaderProps) {
  const {
    headerGroups,
    headerHeight,
    filterRowHeight,
    autoWidths,
    sortInfo,
    setSortInfo,
    setSkip,
    allowUnsort,
    defaultSortDir,
    showColumnMenuTool,
    i18n,
    allowColumnReorder,
    checkboxEnabled,
    checkboxColId,
    onHeaderDragStart,
    onHeaderDragOver,
    onHeaderDrop,
    enableFiltering,
    enableColumnFilterContextMenu,
    filterControlled,
    filterValue,
    draftFilterValue,
    setFilterValue,
    setDraftFilterValue,
    filterTypes,
    openFilterMenuColId,
    setOpenFilterMenuColId,
  } = props;

  return (
    <TableHeader className="[&_tr]:!border-b-0">
      {/* Header row */}
      {headerGroups.map((hg) => (
        <TableRow key={hg.id} className="bg-muted" style={{ height: headerHeight }}>
          {hg.headers.map((h: any) => {
            const colDef = h.column.columnDef as any;
            const col: TypeColumn | undefined = colDef?.meta?.__column;
            const colId = h.column.id;

            const width = autoWidths[colId];

            const canDrag =
              allowColumnReorder &&
              (!checkboxEnabled || colId !== checkboxColId) &&
              (col?.draggable ?? true);

            return (
              <HeaderCell
                key={h.id}
                header={h}
                col={col}
                colId={colId}
                width={width}
                headerHeight={headerHeight}
                sortInfo={sortInfo}
                setSortInfo={setSortInfo}
                setSkip={setSkip}
                allowUnsort={allowUnsort}
                defaultSortDir={defaultSortDir}
                showColumnMenuTool={showColumnMenuTool}
                i18n={i18n}
                canDrag={Boolean(canDrag)}
                onDragStart={onHeaderDragStart}
                onDragOver={onHeaderDragOver}
                onDrop={onHeaderDrop}
              />
            );
          })}
        </TableRow>
      ))}

      {/* Filter row */}
      {enableFiltering &&
        headerGroups.map((hg) => (
          <TableRow
            key={`${hg.id}-filters`}
            className="bg-background"
            style={{ height: filterRowHeight }}
          >
            {hg.headers.map((h: any) => {
              const colDef = h.column.columnDef as any;
              const col: TypeColumn | undefined = colDef?.meta?.__column;
              const colId = h.column.id;

              const width = autoWidths[colId];

              return (
                <FilterCell
                  key={`${h.id}-filter`}
                  header={h}
                  col={col}
                  colId={colId}
                  width={width}
                  headerHeight={headerHeight}
                  filterRowHeight={filterRowHeight}
                  enableFiltering={enableFiltering}
                  enableColumnFilterContextMenu={enableColumnFilterContextMenu}
                  checkboxEnabled={checkboxEnabled}
                  checkboxColId={checkboxColId}
                  filterControlled={filterControlled}
                  filterValue={filterValue}
                  draftFilterValue={draftFilterValue}
                  setFilterValue={setFilterValue}
                  setDraftFilterValue={setDraftFilterValue}
                  setSkip={setSkip}
                  filterTypes={filterTypes}
                  i18n={i18n}
                  openFilterMenuColId={openFilterMenuColId}
                  setOpenFilterMenuColId={setOpenFilterMenuColId}
                />
              );
            })}
          </TableRow>
        ))}
    </TableHeader>
  );
}
