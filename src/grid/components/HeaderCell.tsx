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
  TypeCellProps,
  TypeColumn,
  TypeComputedProps,
  TypeDataGridProps,
  TypeRenderSortTool,
  TypeSortFunctions,
  TypeSortInfo,
} from "../../types";

import { cn } from "../../lib/utils";
import { isInteractiveClickTarget } from "../utils/gridUtils";
import {
  getColumnSortInfo,
  getSortDir,
  toggleSortInfo,
} from "../../sorting/utils";
import type { TypeLockedColumnLayout } from "../utils/lockedColumns";

import { Button } from "../../components/ui/button";
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
  sortFunctions?: TypeSortFunctions | null;
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
  sortFunctions?: TypeSortFunctions | null;
  renderSortTool?: TypeRenderSortTool;

  showColumnMenuTool: boolean;
  columnMenuOpen: boolean;
  onOpenColumnContextMenu: (
    alignTo: HTMLElement | { left: number; top: number },
    cellProps: TypeCellProps,
    restoreFocusTo: HTMLElement
  ) => void;
  showHorizontalCellBorders: boolean;
  showVerticalCellBorders: boolean;

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
  headerDOMProps?: TypeDataGridProps["headerDOMProps"];
  gridProps: TypeComputedProps;
  theme: string;
  rtl: boolean;
  isCheckboxColumn: boolean;
  columnDefaultHeaderAlign?: TypeDataGridProps["columnDefaultHeaderAlign"];
  /**
   * Drives the resize-handle clamp. Separate flags rather than one union: a
   * single-column grid is both edges at once.
   */
  isLeadingEdge?: boolean;
  isTrailingEdge?: boolean;
};

function humanizeColumnName(value: string): string {
  const words = value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim();
  return words
    ? `${words.charAt(0).toUpperCase()}${words.slice(1).toLowerCase()}`
    : value;
}

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
    columnMenuOpen,
    onOpenColumnContextMenu,
    showHorizontalCellBorders,
    showVerticalCellBorders,
    canDrag,
    onDragStart,
    onDragOver,
    onDrop,
    canResize,
    isResizing,
    onResizeStart,
    onResizeBy,
    onAutoResize,
    headerDOMProps,
    gridProps,
    theme,
    rtl,
    isCheckboxColumn,
    columnDefaultHeaderAlign,
    isLeadingEdge,
    isTrailingEdge,
  } = props;

  const canSort = (col?.sortable ?? sortable) && header.column.getCanSort();
  const sortColumn = React.useMemo<TypeColumn>(
    () => col ?? { name: colId },
    [col, colId]
  );
  const dir = getSortDir(sortInfo, sortColumn);
  const columnSortInfo = getColumnSortInfo(sortInfo, sortColumn);
  const [hovered, setHovered] = React.useState(false);
  const longPressTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const longPressStartRef = React.useRef<{ x: number; y: number } | null>(null);
  const suppressClickUntilRef = React.useRef(0);
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

  // A column that states either field wins; the root default only fills in for
  // one that states neither.
  //
  // The checkbox column opts out. Its header holds an affordance, not heading
  // text, and it already centres itself in a flex box that `text-align` cannot
  // reach — so this changes no geometry today. What it keeps honest is the
  // emitted `--align-*` class, which consumers style against: a column the
  // prop does not place should not claim to be placed.
  const headerAlign =
    col?.headerAlign ??
    col?.textAlign ??
    (isCheckboxColumn ? undefined : columnDefaultHeaderAlign);
  const alignsEnd = headerAlign === "right" || headerAlign === "end";
  const alignsCenter = headerAlign === "center";
  const headerAlignClass = alignsEnd
    ? "InovuaReactDataGrid__column-header--align-end"
    : alignsCenter
      ? "InovuaReactDataGrid__column-header--align-center"
      : "InovuaReactDataGrid__column-header--align-start";
  // Only reaches a column that cannot sort, whose label is a block filling the
  // cell. A sortable one aligns via `--align-*` in `runtime.css`.
  const headerTextAlignClass = alignsEnd
    ? "text-right"
    : alignsCenter
      ? "text-center"
      : "";

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

  const cellProps = React.useMemo<TypeCellProps>(
    () => ({
      rowIndex: -1,
      columnIndex,
      computedVisibleIndex: columnIndex,
      id: colId,
      name: col?.name ?? colId,
      columnId: colId,
      column: col,
      header: col?.header,
      headerCell: true,
      computedWidth: width,
      computedLocked: lockedLayout?.side ?? false,
      computedSortable: canSort,
      computedSortInfo: columnSortInfo,
      sortInfo,
      grid: gridProps,
      theme,
      rtl,
    }),
    [
      canSort,
      col,
      colId,
      columnIndex,
      columnSortInfo,
      gridProps,
      lockedLayout?.side,
      sortInfo,
      theme,
      rtl,
      width,
    ]
  );
  const rootHeaderDOMProps = headerDOMProps
    ? typeof headerDOMProps === "function"
      ? (headerDOMProps(cellProps) ?? {})
      : headerDOMProps
    : {};
  const columnHeaderDOMProps = col?.headerDOMProps
    ? typeof col.headerDOMProps === "function"
      ? (col.headerDOMProps(cellProps) ?? {})
      : col.headerDOMProps
    : {};
  const inheritedHeaderDOMProps = {
    ...rootHeaderDOMProps,
    ...columnHeaderDOMProps,
  };
  const headerContent = isCheckboxColumn
    ? flexRender(header.column.columnDef.header, header.getContext())
    : (col?.renderHeader?.(cellProps) ??
      (typeof col?.header === "function"
        ? col.header(cellProps)
        : col?.header) ??
      humanizeColumnName(String(col?.name ?? col?.id ?? colId)));

  const cancelLongPress = React.useCallback(() => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = null;
    longPressStartRef.current = null;
  }, []);

  React.useEffect(() => cancelLongPress, [cancelLongPress]);

  return (
    <TableHead
      {...inheritedHeaderDOMProps}
      key={header.id}
      colSpan={header.colSpan}
      data-slot="grid-header-cell"
      data-column-id={colId}
      data-column-index={columnIndex}
      className={cn(
        "tdg-header-cell InovuaReactDataGrid__column-header bg-[var(--tdg-header-bg)] text-[color:var(--tdg-header-color)] [font-size:var(--tdg-header-font-size)] [font-weight:var(--tdg-header-font-weight)]",
        "InovuaReactDataGrid__column-header--direction-ltr",
        isLeadingEdge ? "tdg-header-cell--leading-edge" : "",
        isTrailingEdge ? "tdg-header-cell--trailing-edge" : "",
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
        headerTextAlignClass,
        col?.headerProps?.className,
        inheritedHeaderDOMProps.className
      )}
      style={{
        width,
        minWidth: col?.minWidth,
        maxWidth: col?.maxWidth,
        height: headerHeight,
        ...col?.headerProps?.style,
        ...inheritedHeaderDOMProps.style,
        ...(lockedLayout
          ? ({
              "--tdg-locked-column-offset": `${lockedLayout.offset}px`,
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
      tabIndex={canSort || showColumnMenuTool ? 0 : undefined}
      aria-sort={dir === 1 ? "ascending" : dir === -1 ? "descending" : "none"}
      aria-haspopup={showColumnMenuTool ? "menu" : undefined}
      aria-expanded={showColumnMenuTool ? columnMenuOpen : undefined}
      onContextMenu={(event) => {
        rootHeaderDOMProps.onContextMenu?.(event);
        columnHeaderDOMProps.onContextMenu?.(event);
        if (event.defaultPrevented) return;
        if (!showColumnMenuTool) return;
        event.preventDefault();
        event.stopPropagation();
        onOpenColumnContextMenu(
          { left: event.clientX, top: event.clientY },
          cellProps,
          event.currentTarget
        );
      }}
      onClick={(event) => {
        rootHeaderDOMProps.onClick?.(event);
        columnHeaderDOMProps.onClick?.(event);
        if (event.defaultPrevented) return;
        if (Date.now() <= suppressClickUntilRef.current) {
          suppressClickUntilRef.current = 0;
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        if (!canSort) return;
        if (isInteractiveClickTarget(event.target as HTMLElement | null))
          return;
        handleSort();
      }}
      onKeyDown={(event) => {
        rootHeaderDOMProps.onKeyDown?.(event);
        columnHeaderDOMProps.onKeyDown?.(event);
        if (event.defaultPrevented) return;
        if (
          showColumnMenuTool &&
          (event.key === "ContextMenu" ||
            (event.key === "F10" && event.shiftKey))
        ) {
          event.preventDefault();
          event.stopPropagation();
          onOpenColumnContextMenu(
            event.currentTarget,
            cellProps,
            event.currentTarget
          );
          return;
        }
        if (!canSort) return;
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        handleSort();
      }}
      onPointerDown={(event) => {
        rootHeaderDOMProps.onPointerDown?.(event);
        columnHeaderDOMProps.onPointerDown?.(event);
        if (event.defaultPrevented) return;
        if (
          !showColumnMenuTool ||
          event.pointerType !== "touch" ||
          isInteractiveClickTarget(event.target as HTMLElement | null)
        ) {
          return;
        }
        cancelLongPress();
        suppressClickUntilRef.current = 0;
        const point = { x: event.clientX, y: event.clientY };
        longPressStartRef.current = point;
        const currentTarget = event.currentTarget;
        longPressTimerRef.current = setTimeout(() => {
          longPressTimerRef.current = null;
          suppressClickUntilRef.current = Date.now() + 800;
          onOpenColumnContextMenu(
            { left: point.x, top: point.y },
            cellProps,
            currentTarget
          );
        }, 500);
      }}
      onPointerMove={(event) => {
        const start = longPressStartRef.current;
        if (
          start &&
          Math.hypot(event.clientX - start.x, event.clientY - start.y) > 8
        ) {
          cancelLongPress();
        }
      }}
      onPointerUp={cancelLongPress}
      onPointerCancel={cancelLongPress}
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
              {/* Leads when right-aligned, so the label ends on the trailing
                  padding and lines up with the cells. */}
              {alignsEnd ? renderedSortTool : null}
              <span className="truncate text-inherit">{headerContent}</span>
              {alignsEnd ? null : renderedSortTool}
            </div>
          ) : (
            <div className="tdg-header-cell__label min-w-0 flex-1">
              <span className="truncate">{headerContent}</span>
            </div>
          )}

          {showColumnMenuTool && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="InovuaReactDataGrid__column-header__menu-tool size-7 shrink-0 rounded-none border-0 bg-transparent shadow-none hover:bg-transparent"
              aria-label="Column menu"
              aria-haspopup="menu"
              aria-expanded={columnMenuOpen}
              onKeyDown={(event) => {
                // Keep the header's Enter/Space sorting shortcut from
                // cancelling the native button activation.
                if (event.key === "Enter" || event.key === " ") {
                  event.stopPropagation();
                }
              }}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onOpenColumnContextMenu(
                  event.currentTarget,
                  cellProps,
                  event.currentTarget
                );
              }}
            >
              <IconDotsVertical className="size-4" />
            </Button>
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
              const direction =
                (event.key === "ArrowRight" ? 1 : -1) * (rtl ? -1 : 1);
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
