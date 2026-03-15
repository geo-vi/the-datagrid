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
  if (dir === 1) return <IconChevronUp className="ml-1 size-3" />;
  if (dir === -1) return <IconChevronDown className="ml-1 size-3" />;
  return <IconArrowsSort className="ml-1 size-3 opacity-60" />;
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
    i18n,
    canDrag,
    onDragStart,
    onDragOver,
    onDrop,
  } = props;

  const canSort = (col?.sortable ?? true) && header.column.getCanSort();
  const sortName = col ? getColumnSortName(col) : colId;
  const dir = getSortDir(sortInfo, sortName);

  const headerAlign = col?.headerAlign ?? col?.textAlign;

  return (
    <TableHead
      key={header.id}
      colSpan={header.colSpan}
      className={cn(
        "tdg-header-cell InovuaReactDataGrid__column-header sticky top-0 z-20 border-b bg-[var(--tdg-header-bg)] [border-color:var(--tdg-header-border-color)] [color:var(--tdg-header-color)] [font-size:var(--tdg-header-font-size)] [font-weight:var(--tdg-header-font-weight)]",
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
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center">
          {header.isPlaceholder ? null : canSort ? (
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
              <span className="truncate">{flexRender(header.column.columnDef.header, header.getContext())}</span>
              {sortIcon(dir)}
            </Button>
          ) : (
            <span className="truncate">{flexRender(header.column.columnDef.header, header.getContext())}</span>
          )}
        </div>

        {showColumnMenuTool && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" size="icon" className="size-7" aria-label="Column menu">
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
