"use client";

import * as React from "react";
import type {
  TypeColumn,
  TypeCellProps,
  TypeColumnFilterValueChangeArg,
  TypeComputedProps,
  TypeFilterTypes,
  TypeFilterValue,
  TypeI18n,
  TypeRenderColumnFilterContextMenu,
  TypeRenderSortTool,
  TypeSortFunctions,
  TypeSortInfo,
} from "../../types";

import { TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { HeaderCell } from "./HeaderCell";
import { FilterCell } from "./FilterCell";
import { ColumnGroupHeaderCell } from "./ColumnGroupHeaderCell";
import { cn } from "../../lib/utils";
import type { TypeColumnGroupHeaderRenderItem } from "../utils/columnGroups";
import { getColumnGroupSegmentKey } from "../utils/columnGroups";
import type {
  TypeGridColumnRenderItem,
  TypeLockedColumnLayout,
} from "../utils/lockedColumns";

export type GridHeaderProps = {
  headerGroups: any[];
  groupHeaderRows: TypeColumnGroupHeaderRenderItem[][];
  orderedColumns: TypeColumn[];

  headerHeight: number;
  filterRowHeight: number;

  // sorting
  sortInfo: TypeSortInfo;
  setSortInfo: (s: TypeSortInfo) => void;
  setSkip: (n: number) => void;
  allowUnsort: boolean;
  defaultSortDir: 1 | -1;
  sortable: boolean;
  sortFunctions?: TypeSortFunctions | null;
  renderSortTool?: TypeRenderSortTool;

  showColumnMenuTool: boolean;
  openColumnContextMenuColumnId?: string | null;
  onOpenColumnContextMenu: (
    alignTo: HTMLElement | { left: number; top: number },
    cellProps: TypeCellProps,
    restoreFocusTo: HTMLElement
  ) => void;
  showHorizontalCellBorders: boolean;
  showVerticalCellBorders: boolean;
  i18n?: TypeI18n;
  theme: string;
  gridRef: React.MutableRefObject<TypeComputedProps | null>;
  gridProps: TypeComputedProps;

  // DnD reorder
  allowColumnReorder: boolean;
  allowColumnResize: boolean;
  checkboxEnabled: boolean;
  checkboxColId: string;
  onHeaderDragStart: (e: React.DragEvent, columnId: string) => void;
  onHeaderDragOver: (e: React.DragEvent) => void;
  onHeaderDrop: (e: React.DragEvent, targetId: string) => void;
  onGroupHeaderDragStart: (
    e: React.DragEvent,
    item: Extract<TypeColumnGroupHeaderRenderItem, { type: "group" }>
  ) => void;
  onGroupHeaderDrop: (
    e: React.DragEvent,
    item: Extract<TypeColumnGroupHeaderRenderItem, { type: "group" }>
  ) => void;
  resizingColumnId: string | null;
  resizingGroupKey: string | null;
  onColumnResizeStart: (
    event: React.MouseEvent<HTMLElement> | React.PointerEvent<HTMLElement>,
    columnId: string
  ) => void;
  onColumnResizeBy: (columnId: string, diff: number) => void;
  onColumnAutoResize: (columnId: string) => void;
  onGroupResizeStart: (
    event: React.MouseEvent<HTMLElement> | React.PointerEvent<HTMLElement>,
    item: Extract<TypeColumnGroupHeaderRenderItem, { type: "group" }>
  ) => void;
  onGroupResizeBy: (
    item: Extract<TypeColumnGroupHeaderRenderItem, { type: "group" }>,
    diff: number
  ) => void;

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
  renderColumnFilterContextMenu?: TypeRenderColumnFilterContextMenu;
  columnFilterContextMenuAlignPositions?: string[];
  columnFilterContextMenuConstrainTo?:
    | boolean
    | HTMLElement
    | string
    | ((...args: unknown[]) => HTMLElement | null);
  columnFilterContextMenuPosition?: string;
  updateMenuPositionOnScroll: boolean;

  openFilterMenuColId: string | null;
  setOpenFilterMenuColId: (id: string | null) => void;

  columnRenderItems: TypeGridColumnRenderItem[];
  lockedColumnLayout: Record<string, TypeLockedColumnLayout>;
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

function resolveSegmentLockedLayout(
  columnIds: readonly string[],
  lockedColumnLayout: Record<string, TypeLockedColumnLayout>
): TypeLockedColumnLayout | undefined {
  const layouts = columnIds.flatMap((columnId) => {
    const layout = lockedColumnLayout[columnId];
    return layout ? [layout] : [];
  });
  if (
    layouts.length !== columnIds.length ||
    layouts.length === 0 ||
    layouts.some((layout) => layout.side !== layouts[0]!.side)
  ) {
    return undefined;
  }

  const side = layouts[0]!.side;
  const edgeLayout =
    side === "start" ? layouts[0]! : layouts[layouts.length - 1]!;
  const boundaryLayout =
    side === "start" ? layouts[layouts.length - 1]! : layouts[0]!;

  return {
    side,
    offset: edgeLayout.offset,
    viewportOffset: edgeLayout.viewportOffset,
    boundary: boundaryLayout.boundary,
  };
}

export function GridHeader(props: GridHeaderProps) {
  const {
    headerGroups,
    groupHeaderRows,
    orderedColumns,
    headerHeight,
    filterRowHeight,
    sortInfo,
    setSortInfo,
    setSkip,
    allowUnsort,
    defaultSortDir,
    sortable,
    sortFunctions,
    renderSortTool,
    showColumnMenuTool,
    openColumnContextMenuColumnId,
    onOpenColumnContextMenu,
    showHorizontalCellBorders,
    showVerticalCellBorders,
    i18n,
    theme,
    gridRef,
    gridProps,
    allowColumnReorder,
    allowColumnResize,
    checkboxEnabled,
    checkboxColId,
    onHeaderDragStart,
    onHeaderDragOver,
    onHeaderDrop,
    onGroupHeaderDragStart,
    onGroupHeaderDrop,
    resizingColumnId,
    resizingGroupKey,
    onColumnResizeStart,
    onColumnResizeBy,
    onColumnAutoResize,
    onGroupResizeStart,
    onGroupResizeBy,
    enableFiltering,
    enableColumnFilterContextMenu,
    filterControlled,
    filterValue,
    draftFilterValue,
    setFilterValue,
    setDraftFilterValue,
    onColumnFilterValueChange,
    filterTypes,
    renderColumnFilterContextMenu,
    columnFilterContextMenuAlignPositions,
    columnFilterContextMenuConstrainTo,
    columnFilterContextMenuPosition,
    updateMenuPositionOnScroll,
    openFilterMenuColId,
    setOpenFilterMenuColId,
    columnRenderItems,
    lockedColumnLayout,
  } = props;
  const leafHeaderGroup = headerGroups[headerGroups.length - 1];
  if (!leafHeaderGroup) return null;
  const orderedColumnsMap = new Map(
    orderedColumns.map((column) => [column.id ?? column.name ?? "", column])
  );

  return (
    <TableHeader className="InovuaReactDataGrid__header [&_tr]:!border-b-0">
      {groupHeaderRows.map((row, depth) => (
        <TableRow
          key={`group-row-${depth}`}
          className="tdg-header-row tdg-header-group-row InovuaReactDataGrid__header-row InovuaReactDataGrid__header-group-row bg-[var(--tdg-header-bg)]"
          data-slot="grid-header-group-row"
          data-group-depth={depth}
          style={{ height: headerHeight }}
        >
          {row.map((item) => {
            if (item.type === "spacer") {
              return <ColumnSpacerHeader key={item.key} width={item.width} />;
            }

            const lockedLayout = resolveSegmentLockedLayout(
              item.columnIds,
              lockedColumnLayout
            );
            if (item.type === "placeholder") {
              return (
                <TableHead
                  key={item.key}
                  aria-hidden="true"
                  colSpan={item.colSpan}
                  data-slot="grid-header-group-placeholder"
                  className={cn(
                    "tdg-header-cell tdg-header-group-placeholder pointer-events-none !p-0 bg-[var(--tdg-header-bg)]",
                    lockedLayout
                      ? [
                          "tdg-locked-column",
                          `tdg-locked-column--${lockedLayout.side}`,
                          lockedLayout.boundary
                            ? `tdg-locked-column--${lockedLayout.side}-boundary`
                            : "",
                        ]
                      : "",
                    showHorizontalCellBorders
                      ? "border-b [border-bottom-color:var(--tdg-header-border-color)]"
                      : "",
                    showVerticalCellBorders
                      ? "border-r [border-right-color:var(--tdg-header-border-color)]"
                      : ""
                  )}
                  style={{
                    width: item.width,
                    height: headerHeight,
                    ...(lockedLayout
                      ? ({
                          "--tdg-locked-column-offset": `${lockedLayout.offset}px`,
                          "--tdg-locked-column-viewport-offset": `${lockedLayout.viewportOffset}px`,
                        } as React.CSSProperties)
                      : {}),
                  }}
                />
              );
            }

            const columns = item.columnIds.flatMap((columnId) => {
              const column = orderedColumnsMap.get(columnId);
              return column ? [column] : [];
            });

            return (
              <ColumnGroupHeaderCell
                key={item.key}
                item={item}
                columns={columns}
                headerHeight={headerHeight}
                showHorizontalCellBorders={showHorizontalCellBorders}
                showVerticalCellBorders={showVerticalCellBorders}
                allowColumnReorder={allowColumnReorder}
                allowColumnResize={allowColumnResize}
                resizing={resizingGroupKey === getColumnGroupSegmentKey(item)}
                lockedLayout={lockedLayout}
                gridRef={gridRef}
                gridProps={gridProps}
                onDragStart={onGroupHeaderDragStart}
                onDragOver={onHeaderDragOver}
                onDrop={onGroupHeaderDrop}
                onResizeStart={onGroupResizeStart}
                onResizeBy={onGroupResizeBy}
              />
            );
          })}
        </TableRow>
      ))}

      {/* Leaf column header row */}
      {[leafHeaderGroup].map((hg) => (
        <TableRow
          key={hg.id}
          className="tdg-header-row InovuaReactDataGrid__header-row bg-[var(--tdg-header-bg)]"
          style={{ height: headerHeight }}
        >
          {columnRenderItems.map((renderItem) => {
            if (renderItem.type === "spacer") {
              return (
                <ColumnSpacerHeader
                  key={`${hg.id}-${renderItem.id}`}
                  width={renderItem.width}
                />
              );
            }

            const h = hg.headers[renderItem.index];
            if (!h) return null;

            const columnIndex = renderItem.index;
            const colDef = h.column.columnDef as any;
            const col: TypeColumn | undefined = colDef?.meta?.__column;
            const colId = h.column.id;

            const width = h.getSize();

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
                lockedLayout={lockedColumnLayout[colId]}
                headerHeight={headerHeight}
                sortInfo={sortInfo}
                setSortInfo={setSortInfo}
                setSkip={setSkip}
                allowUnsort={allowUnsort}
                defaultSortDir={defaultSortDir}
                sortable={sortable}
                sortFunctions={sortFunctions}
                renderSortTool={renderSortTool}
                showColumnMenuTool={showColumnMenuTool}
                columnMenuOpen={openColumnContextMenuColumnId === colId}
                onOpenColumnContextMenu={onOpenColumnContextMenu}
                showHorizontalCellBorders={showHorizontalCellBorders}
                showVerticalCellBorders={showVerticalCellBorders}
                canDrag={Boolean(canDrag)}
                onDragStart={onHeaderDragStart}
                onDragOver={onHeaderDragOver}
                onDrop={onHeaderDrop}
                canResize={canResize}
                isResizing={resizingColumnId === colId}
                onResizeStart={onColumnResizeStart}
                onResizeBy={onColumnResizeBy}
                onAutoResize={onColumnAutoResize}
              />
            );
          })}
        </TableRow>
      ))}

      {/* Filter row */}
      {enableFiltering &&
        [leafHeaderGroup].map((hg) => (
          <TableRow
            key={`${hg.id}-filters`}
            className="tdg-filter-row InovuaReactDataGrid__filter-row bg-[var(--tdg-filter-bg)]"
            style={{ height: filterRowHeight }}
          >
            {columnRenderItems.map((renderItem) => {
              if (renderItem.type === "spacer") {
                return (
                  <ColumnSpacerHeader
                    key={`${hg.id}-filters-${renderItem.id}`}
                    width={renderItem.width}
                  />
                );
              }

              const h = hg.headers[renderItem.index];
              if (!h) return null;

              const columnIndex = renderItem.index;
              const colDef = h.column.columnDef as any;
              const col: TypeColumn | undefined = colDef?.meta?.__column;
              const colId = h.column.id;

              const width = h.getSize();

              return (
                <FilterCell
                  key={`${h.id}-filter`}
                  header={h}
                  col={col}
                  colId={colId}
                  columnIndex={columnIndex}
                  width={width}
                  lockedLayout={lockedColumnLayout[colId]}
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
                  onColumnFilterValueChange={onColumnFilterValueChange}
                  setSkip={setSkip}
                  filterTypes={filterTypes}
                  i18n={i18n}
                  theme={theme}
                  gridRef={gridRef}
                  gridProps={gridProps}
                  renderColumnFilterContextMenu={renderColumnFilterContextMenu}
                  columnFilterContextMenuAlignPositions={
                    columnFilterContextMenuAlignPositions
                  }
                  columnFilterContextMenuConstrainTo={
                    columnFilterContextMenuConstrainTo
                  }
                  columnFilterContextMenuPosition={
                    columnFilterContextMenuPosition
                  }
                  updateMenuPositionOnScroll={updateMenuPositionOnScroll}
                  showHorizontalCellBorders={showHorizontalCellBorders}
                  showVerticalCellBorders={showVerticalCellBorders}
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
