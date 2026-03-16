"use client";

import * as React from "react";
import { flexRender } from "@tanstack/react-table";
import {
  IconArrowsSort,
  IconChevronDown,
  IconChevronUp,
  IconDotsVertical,
} from "@tabler/icons-react";

import type { TypeColumn, TypeI18n, TypeSortInfo } from "../../types";

import { cn } from "../../lib/utils";
import { t } from "../../utils/helpers";
import { getColumnSortName } from "../../utils/column";
import { isInteractiveClickTarget } from "../utils/gridUtils";
import { getSortDir, toggleSortInfo } from "../../sorting/utils";

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

function applySort(
  event: React.MouseEvent | React.KeyboardEvent,
  options: {
    sortInfo: TypeSortInfo;
    col?: TypeColumn;
    colId: string;
    allowUnsort: boolean;
    defaultSortDir: 1 | -1;
    setSkip: (n: number) => void;
    setSortInfo: (s: TypeSortInfo) => void;
  },
) {
  const { sortInfo, col, colId, allowUnsort, defaultSortDir, setSkip, setSortInfo } = options;

  const next = toggleSortInfo({
    sortInfo,
    col: col ?? { name: colId },
    allowUnsort,
    defaultDir: defaultSortDir,
    multi: (event as React.MouseEvent).shiftKey === true,
  });

  setSkip(0);
  setSortInfo(next);
}

export type HeaderCellProps = {
  header: any; // tanstack header
  col?: TypeColumn;
  colId: string;

  headerHeight: number;
  width?: number;

  sortInfo: TypeSortInfo;
  setSortInfo: (s: TypeSortInfo) => void;
  setSkip: (n: number) => void;
  allowUnsort: boolean;
  defaultSortDir: 1 | -1;

  showColumnMenuTool: boolean;
  showHorizontalCellBorders: boolean;
  showVerticalCellBorders: boolean;
  i18n?: TypeI18n;

  canDrag: boolean;
  onDragStart: (e: React.DragEvent, columnId: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, targetId: string) => void;
};

export function HeaderCell(props: HeaderCellProps) {
  const {
    header,
    col,
    colId,
    headerHeight,
    width,
    sortInfo,
    setSortInfo,
    setSkip,
    allowUnsort,
    defaultSortDir,
    showColumnMenuTool,
    showHorizontalCellBorders,
    showVerticalCellBorders,
    i18n,
    canDrag,
    onDragStart,
    onDragOver,
    onDrop,
  } = props;

  const canSort = (col?.sortable ?? true) && header.column.getCanSort();
  const sortName = col ? getColumnSortName(col) : colId;
  const dir = getSortDir(sortInfo, sortName);
  const [hovered, setHovered] = React.useState(false);

  const headerAlign = col?.headerAlign ?? col?.textAlign;
  const headerAlignClass =
    headerAlign === "right" || headerAlign === "end"
      ? "InovuaReactDataGrid__column-header--align-end"
      : headerAlign === "center"
        ? "InovuaReactDataGrid__column-header--align-center"
        : "InovuaReactDataGrid__column-header--align-start";

  const handleSort = React.useCallback(
    (event: React.MouseEvent | React.KeyboardEvent) => {
      applySort(event, {
        sortInfo,
        col,
        colId,
        allowUnsort,
        defaultSortDir,
        setSkip,
        setSortInfo,
      });
    },
    [allowUnsort, col, colId, defaultSortDir, setSkip, setSortInfo, sortInfo],
  );

  return (
    <TableHead
      key={header.id}
      colSpan={header.colSpan}
      className={cn(
        "tdg-header-cell InovuaReactDataGrid__column-header bg-[var(--tdg-header-bg)] [color:var(--tdg-header-color)] [font-size:var(--tdg-header-font-size)] [font-weight:var(--tdg-header-font-weight)]",
        "InovuaReactDataGrid__column-header--direction-ltr",
        headerAlignClass,
        canSort ? "cursor-default select-none outline-none focus-visible:ring-1 focus-visible:ring-ring/50" : "",
        hovered ? "InovuaReactDataGrid__column-header--over" : "",
        showVerticalCellBorders ? "InovuaReactDataGrid__column-header--show-border-right" : "",
        showHorizontalCellBorders ? "border-b [border-bottom-color:var(--tdg-header-border-color)]" : "",
        showVerticalCellBorders ? "border-r last:border-r-0 [border-right-color:var(--tdg-header-border-color)]" : "",
        headerAlign === "right" || headerAlign === "end" ? "text-right" : "",
        col?.headerProps?.className,
      )}
      style={{
        width,
        minWidth: col?.minWidth,
        maxWidth: col?.maxWidth,
        height: headerHeight,
        ...col?.headerProps?.style,
      }}
      draggable={Boolean(canDrag)}
      onDragStart={(e) => canDrag && onDragStart(e, colId)}
      onDragOver={(e) => canDrag && onDragOver(e)}
      onDrop={(e) => canDrag && onDrop(e, colId)}
      tabIndex={canSort ? 0 : undefined}
      aria-sort={dir === 1 ? "ascending" : dir === -1 ? "descending" : "none"}
      onClick={(event) => {
        if (!canSort) return;
        if (isInteractiveClickTarget(event.target as HTMLElement | null)) return;
        handleSort(event);
      }}
      onKeyDown={(event) => {
        if (!canSort) return;
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        handleSort(event);
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="InovuaReactDataGrid__column-header__content flex h-full items-center justify-between gap-2">
        {header.isPlaceholder ? null : canSort ? (
          <div className="InovuaReactDataGrid__column-header__sort-button flex min-w-0 flex-1 items-center justify-between px-2">
            <span className="truncate text-inherit">
              {flexRender(header.column.columnDef.header, header.getContext())}
            </span>
            {sortIcon(dir)}
          </div>
        ) : (
          <div className="flex min-w-0 flex-1 items-center px-2">
            <span className="truncate">{flexRender(header.column.columnDef.header, header.getContext())}</span>
          </div>
        )}

        {showColumnMenuTool && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="InovuaReactDataGrid__column-header__menu-tool size-7 shrink-0 rounded-none border-0 bg-transparent shadow-none hover:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                aria-label="Column menu"
              >
                <IconDotsVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onSelect={() => {
                  setSkip(0);
                  setSortInfo({ name: sortName, dir: 1 });
                }}
              >
                {t(i18n, "sortAsc", "Sort A→Z")}
              </DropdownMenuItem>

              <DropdownMenuItem
                onSelect={() => {
                  setSkip(0);
                  setSortInfo({ name: sortName, dir: -1 });
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
}
