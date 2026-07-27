"use client";

import * as React from "react";
import { flexRender } from "@tanstack/react-table";
import {
  IconArrowsSort,
  IconChevronDown,
  IconChevronUp,
  IconDotsVertical,
} from "@tabler/icons-react";

import type {
  TypeColumn,
  TypeI18n,
  TypeRenderSortTool,
  TypeSortFunctions,
  TypeSortInfo,
} from "../../types";

import { cn } from "../../lib/utils";
import { t } from "../../utils/helpers";
import { isInteractiveClickTarget } from "../utils/gridUtils";
import {
  getColumnSortInfo,
  getSortDir,
  setColumnSortInfo,
  toggleSortInfo,
} from "../../sorting/utils";
import type { TypeLockedColumnLayout } from "../utils/lockedColumns";

import { Button } from "../../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { TableHead } from "../../components/ui/table";

function sortIcon(dir: 0 | 1 | -1): React.ReactNode {
  if (dir === 1) {
    return (
      <span className="InovuaReactDataGrid__sort-icon-wrapper">
        <IconChevronUp className="InovuaReactDataGrid__sort-icon InovuaReactDataGrid__sort-icon--asc InovuaReactDataGrid__sort-icon--active ml-1 size-3" />
      </span>
    );
  }

  if (dir === -1) {
    return (
      <span className="InovuaReactDataGrid__sort-icon-wrapper">
        <IconChevronDown className="InovuaReactDataGrid__sort-icon InovuaReactDataGrid__sort-icon--desc InovuaReactDataGrid__sort-icon--active ml-1 size-3" />
      </span>
    );
  }

  return (
    <span className="InovuaReactDataGrid__sort-icon-wrapper">
      <IconArrowsSort className="InovuaReactDataGrid__sort-icon ml-1 size-3 opacity-60" />
    </span>
  );
}

function applySort(options: {
  sortInfo: TypeSortInfo;
  col?: TypeColumn;
  colId: string;
  allowUnsort: boolean;
  defaultSortDir: 1 | -1;
  sortFunctions?: TypeSortFunctions;
  setSkip: (n: number) => void;
  setSortInfo: (s: TypeSortInfo) => void;
}) {
  const {
    sortInfo,
    col,
    colId,
    allowUnsort,
    defaultSortDir,
    sortFunctions,
    setSkip,
    setSortInfo,
  } = options;

  const next = toggleSortInfo({
    sortInfo,
    col: col ?? { name: colId },
    allowUnsort,
    defaultDir: defaultSortDir,
    sortFunctions,
  });

  setSkip(0);
  setSortInfo(next);
}

export type HeaderCellProps = {
  header: any; // tanstack header
  col?: TypeColumn;
  colId: string;
  columnIndex: number;

  headerHeight: number;
  width?: number;
  lockedLayout?: TypeLockedColumnLayout;

  sortInfo: TypeSortInfo;
  setSortInfo: (s: TypeSortInfo) => void;
  setSkip: (n: number) => void;
  allowUnsort: boolean;
  defaultSortDir: 1 | -1;
  sortable: boolean;
  sortFunctions?: TypeSortFunctions;
  renderSortTool?: TypeRenderSortTool;

  showColumnMenuTool: boolean;
  showHorizontalCellBorders: boolean;
  showVerticalCellBorders: boolean;
  i18n?: TypeI18n;

  canDrag: boolean;
  onDragStart: (e: React.DragEvent, columnId: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, targetId: string) => void;
  canResize: boolean;
  isResizing: boolean;
  onResizeStart: (
    event: React.MouseEvent<HTMLElement> | React.PointerEvent<HTMLElement>,
    columnId: string
  ) => void;
  onResizeBy: (columnId: string, diff: number) => void;
  onAutoResize: (columnId: string) => void;
};

export function HeaderCell(props: HeaderCellProps) {
  const {
    header,
    col,
    colId,
    columnIndex,
    headerHeight,
    width,
    lockedLayout,
    sortInfo,
    setSortInfo,
    setSkip,
    allowUnsort,
    defaultSortDir,
    sortable,
    sortFunctions,
    renderSortTool,
    showColumnMenuTool,
    showHorizontalCellBorders,
    showVerticalCellBorders,
    i18n,
    canDrag,
    onDragStart,
    onDragOver,
    onDrop,
    canResize,
    isResizing,
    onResizeStart,
    onResizeBy,
    onAutoResize,
  } = props;

  const canSort = (col?.sortable ?? sortable) && header.column.getCanSort();
  const sortColumn = React.useMemo<TypeColumn>(
    () => col ?? { name: colId },
    [col, colId]
  );
  const dir = getSortDir(sortInfo, sortColumn);
  const columnSortInfo = getColumnSortInfo(sortInfo, sortColumn);
  const [hovered, setHovered] = React.useState(false);
  const customSortTool = col?.renderSortTool ?? renderSortTool;
  const renderedSortTool = canSort
    ? customSortTool
      ? customSortTool(dir, {
          column: sortColumn,
          columnId: colId,
          computedSortable: canSort,
          computedSortInfo: columnSortInfo,
          sortInfo,
          headerCell: true,
        })
      : sortIcon(dir)
    : null;

  const headerAlign = col?.headerAlign ?? col?.textAlign;
  const headerAlignClass =
    headerAlign === "right" || headerAlign === "end"
      ? "InovuaReactDataGrid__column-header--align-end"
      : headerAlign === "center"
        ? "InovuaReactDataGrid__column-header--align-center"
        : "InovuaReactDataGrid__column-header--align-start";

  const handleSort = React.useCallback(() => {
    applySort({
      sortInfo,
      col,
      colId,
      allowUnsort,
      defaultSortDir,
      sortFunctions,
      setSkip,
      setSortInfo,
    });
  }, [
    allowUnsort,
    col,
    colId,
    defaultSortDir,
    setSkip,
    setSortInfo,
    sortFunctions,
    sortInfo,
  ]);

  const setColumnDirection = React.useCallback(
    (nextDir: -1 | 0 | 1) => {
      setSkip(0);
      setSortInfo(
        setColumnSortInfo({
          sortInfo,
          col: sortColumn,
          dir: nextDir,
          sortFunctions,
        })
      );
    },
    [setSkip, setSortInfo, sortColumn, sortFunctions, sortInfo]
  );

  return (
    <TableHead
      key={header.id}
      colSpan={header.colSpan}
      data-slot="grid-header-cell"
      data-column-id={colId}
      data-column-index={columnIndex}
      className={cn(
        "tdg-header-cell InovuaReactDataGrid__column-header bg-[var(--tdg-header-bg)] [color:var(--tdg-header-color)] [font-size:var(--tdg-header-font-size)] [font-weight:var(--tdg-header-font-weight)]",
        "InovuaReactDataGrid__column-header--direction-ltr",
        lockedLayout
          ? [
              "tdg-locked-column",
              `tdg-locked-column--${lockedLayout.side}`,
              `InovuaReactDataGrid__column-header--locked-${lockedLayout.side}`,
              lockedLayout.boundary
                ? `tdg-locked-column--${lockedLayout.side}-boundary`
                : "",
            ]
          : "",
        headerAlignClass,
        canSort
          ? "cursor-default select-none outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
          : "",
        hovered ? "InovuaReactDataGrid__column-header--over" : "",
        showVerticalCellBorders
          ? "InovuaReactDataGrid__column-header--show-border-right"
          : "",
        showHorizontalCellBorders
          ? "border-b [border-bottom-color:var(--tdg-header-border-color)]"
          : "",
        showVerticalCellBorders
          ? "border-r last:border-r-0 [border-right-color:var(--tdg-header-border-color)]"
          : "",
        headerAlign === "right" || headerAlign === "end" ? "text-right" : "",
        col?.headerProps?.className
      )}
      style={{
        width,
        minWidth: col?.minWidth,
        maxWidth: col?.maxWidth,
        height: headerHeight,
        ...col?.headerProps?.style,
        ...(lockedLayout
          ? ({
              "--tdg-locked-column-offset": `${lockedLayout.offset}px`,
              "--tdg-locked-column-viewport-offset": `${lockedLayout.viewportOffset}px`,
            } as React.CSSProperties)
          : {}),
      }}
      draggable={Boolean(canDrag)}
      onDragStart={(e) => {
        if (
          (e.target as HTMLElement | null)?.closest(
            '[data-slot="column-resizer"]'
          )
        ) {
          e.preventDefault();
          return;
        }

        if (canDrag) onDragStart(e, colId);
      }}
      onDragOver={(e) => canDrag && onDragOver(e)}
      onDrop={(e) => canDrag && onDrop(e, colId)}
      tabIndex={canSort ? 0 : undefined}
      aria-sort={dir === 1 ? "ascending" : dir === -1 ? "descending" : "none"}
      onClick={(event) => {
        if (!canSort) return;
        if (isInteractiveClickTarget(event.target as HTMLElement | null))
          return;
        handleSort();
      }}
      onKeyDown={(event) => {
        if (!canSort) return;
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        handleSort();
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="tdg-header-cell__inner relative flex h-full items-stretch">
        <div
          className="InovuaReactDataGrid__column-header__content flex h-full items-center justify-between gap-2"
          style={{ zIndex: columnIndex + 1 }}
        >
          {header.isPlaceholder ? null : canSort ? (
            <div className="InovuaReactDataGrid__column-header__sort-button flex min-w-0 flex-1 items-center justify-between">
              <span className="truncate text-inherit">
                {flexRender(
                  header.column.columnDef.header,
                  header.getContext()
                )}
              </span>
              {renderedSortTool}
            </div>
          ) : (
            <div className="flex min-w-0 flex-1 items-center">
              <span className="truncate">
                {flexRender(
                  header.column.columnDef.header,
                  header.getContext()
                )}
              </span>
            </div>
          )}

          {showColumnMenuTool && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="InovuaReactDataGrid__column-header__menu-tool size-7 shrink-0 rounded-none border-0 bg-transparent shadow-none hover:bg-transparent"
                  aria-label="Column menu"
                >
                  <IconDotsVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  disabled={!canSort}
                  onSelect={() => setColumnDirection(1)}
                >
                  {t(i18n, "sortAsc", "Sort A→Z")}
                </DropdownMenuItem>

                <DropdownMenuItem
                  disabled={!canSort}
                  onSelect={() => setColumnDirection(-1)}
                >
                  {t(i18n, "sortDesc", "Sort Z→A")}
                </DropdownMenuItem>

                <DropdownMenuItem
                  disabled={
                    !canSort ||
                    dir === 0 ||
                    (!allowUnsort && !Array.isArray(sortInfo))
                  }
                  onSelect={() => setColumnDirection(0)}
                >
                  {t(i18n, "unsort", "Unsort")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        {canResize ? (
          <button
            type="button"
            aria-label={`Resize ${typeof col?.header === "string" ? col.header : colId}`}
            aria-keyshortcuts="ArrowLeft ArrowRight"
            data-slot="column-resizer"
            data-resizing={isResizing ? "true" : "false"}
            className="tdg-column-resizer InovuaReactDataGrid__column-header__resize-handle"
            draggable={false}
            tabIndex={0}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            onDragStart={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            onPointerDown={(event) => onResizeStart(event, colId)}
            // Pointer events are the primary path for mouse, pen and touch.
            // Keep a mouse-only fallback for environments/tests which dispatch
            // legacy mouse events directly; the grid ignores it while the
            // corresponding pointer session is already active.
            onMouseDown={(event) => onResizeStart(event, colId)}
            onKeyDown={(event) => {
              if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
                return;
              }

              event.preventDefault();
              event.stopPropagation();
              const direction = event.key === "ArrowRight" ? 1 : -1;
              onResizeBy(colId, direction * (event.shiftKey ? 40 : 10));
            }}
            onDoubleClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onAutoResize(colId);
            }}
          />
        ) : null}
      </div>
    </TableHead>
  );
}
