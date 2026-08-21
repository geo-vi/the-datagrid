"use client";

import * as React from "react";

import type {
  TypeColumn,
  TypeColumnGroupDOMProps,
  TypeColumnGroupHeaderProps,
  TypeComputedProps,
} from "../../types";
import { cn } from "../../lib/utils";
import { TableHead } from "../../components/ui/table";
import type {
  TypeColumnGroupHeaderRenderItem,
  TypeNormalizedColumnGroup,
} from "../utils/columnGroups";
import type { TypeLockedColumnLayout } from "../utils/lockedColumns";

type GroupItem = Extract<TypeColumnGroupHeaderRenderItem, { type: "group" }>;

export type ColumnGroupHeaderCellProps = {
  item: GroupItem;
  columns: TypeColumn[];
  headerHeight: number;
  showHorizontalCellBorders: boolean;
  showVerticalCellBorders: boolean;
  allowColumnReorder: boolean;
  allowColumnResize: boolean;
  resizing: boolean;
  lockedLayout?: TypeLockedColumnLayout;
  gridRef: React.MutableRefObject<TypeComputedProps | null>;
  gridProps: TypeComputedProps;
  rtl: boolean;
  onDragStart: (event: React.DragEvent, item: GroupItem) => void;
  onDragOver: (event: React.DragEvent) => void;
  onDrop: (event: React.DragEvent, item: GroupItem) => void;
  onResizeStart: (
    event: React.MouseEvent<HTMLElement> | React.PointerEvent<HTMLElement>,
    item: GroupItem
  ) => void;
  onResizeBy: (item: GroupItem, diff: number) => void;
};

function resolveHeaderProps(args: {
  group: TypeNormalizedColumnGroup;
  headerProps: TypeColumnGroupHeaderProps;
}): {
  className?: string;
  style?: React.CSSProperties;
  domProps: TypeColumnGroupDOMProps;
} {
  const { group, headerProps } = args;
  const domProps =
    typeof group.headerDOMProps === "function"
      ? group.headerDOMProps(headerProps)
      : group.headerDOMProps;
  const className =
    typeof group.headerClassName === "function"
      ? group.headerClassName(headerProps)
      : group.headerClassName;
  const style =
    typeof group.headerStyle === "function"
      ? group.headerStyle(headerProps)
      : group.headerStyle;

  return {
    className,
    style,
    domProps: domProps ?? {},
  };
}

export function ColumnGroupHeaderCell(props: ColumnGroupHeaderCellProps) {
  const {
    item,
    columns,
    headerHeight,
    showHorizontalCellBorders,
    showVerticalCellBorders,
    allowColumnReorder,
    allowColumnResize,
    resizing,
    lockedLayout,
    gridRef,
    gridProps,
    rtl,
    onDragStart,
    onDragOver,
    onDrop,
    onResizeStart,
    onResizeBy,
  } = props;
  const headerProps = React.useMemo<TypeColumnGroupHeaderProps>(
    () => ({
      group: item.group,
      groupName: item.groupName,
      depth: item.depth,
      computedDepth: item.group.computedDepth,
      segmentIndex: item.segmentIndex,
      segmentCount: item.segmentCount,
      split: item.split,
      width: item.width,
      fullWidth: item.fullWidth,
      columnIds: [...item.columnIds],
      columns,
      grid: gridProps,
      computedProps: gridProps,
      computedPropsRef: gridRef,
    }),
    [columns, gridProps, gridRef, item]
  );
  const resolved = resolveHeaderProps({
    group: item.group,
    headerProps,
  });
  const {
    className: domClassName,
    style: domStyle,
    onDragStart: onDOMDragStart,
    onDragOver: onDOMDragOver,
    onDrop: onDOMDrop,
    ...domProps
  } = resolved.domProps;
  const canDrag = allowColumnReorder && item.group.draggable !== false;
  const canResize =
    allowColumnResize &&
    item.resizableBoundary &&
    item.group.resizable !== false &&
    columns.some((column) => column.resizable !== false);
  const renderedHeader =
    typeof item.group.header === "function"
      ? item.group.header(headerProps)
      : (item.group.header ?? item.groupName);
  const titleId = `tdg-grid-${gridProps.gridId ?? "unknown"}-group-title-${encodeURIComponent(item.key)}`;
  const accessibleNameProps =
    resolved.domProps["aria-label"] != null
      ? { "aria-label": resolved.domProps["aria-label"] }
      : resolved.domProps["aria-labelledby"] != null
        ? { "aria-labelledby": resolved.domProps["aria-labelledby"] }
        : { "aria-labelledby": titleId };

  return (
    <TableHead
      {...domProps}
      {...accessibleNameProps}
      scope="colgroup"
      colSpan={item.colSpan}
      aria-colspan={item.columnIds.length}
      data-slot="grid-header-group"
      data-group-id={item.groupName}
      data-group-depth={item.depth}
      data-group-segment={item.segmentIndex}
      data-group-segment-count={item.segmentCount}
      data-group-split={item.split ? "true" : "false"}
      data-group-column-ids={item.columnIds.join(",")}
      data-rendered-column-ids={item.renderedColumnIds.join(",")}
      className={cn(
        "tdg-header-cell tdg-header-group-cell InovuaReactDataGrid__header-group relative bg-[var(--tdg-header-bg)] px-2 text-[color:var(--tdg-header-color)] [font-size:var(--tdg-header-font-size)] [font-weight:var(--tdg-header-font-weight)]",
        lockedLayout
          ? [
              "tdg-locked-column",
              `tdg-locked-column--${lockedLayout.side}`,
              `InovuaReactDataGrid__header-group--locked-${lockedLayout.side}`,
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
          : "",
        canDrag ? "cursor-grab select-none active:cursor-grabbing" : "",
        resolved.className,
        domClassName
      )}
      style={{
        width: item.width,
        height: headerHeight,
        ...resolved.style,
        ...domStyle,
        ...(lockedLayout
          ? ({
              "--tdg-locked-column-offset": `${lockedLayout.offset}px`,
            } as React.CSSProperties)
          : {}),
      }}
      draggable={canDrag}
      onDragStart={(event) => {
        onDOMDragStart?.(event);
        if (event.defaultPrevented) return;
        if (
          (event.target as HTMLElement | null)?.closest(
            '[data-slot="group-resizer"]'
          )
        ) {
          event.preventDefault();
          return;
        }
        if (canDrag) onDragStart(event, item);
      }}
      onDragOver={(event) => {
        onDOMDragOver?.(event);
        if (!event.defaultPrevented && allowColumnReorder) onDragOver(event);
      }}
      onDrop={(event) => {
        onDOMDrop?.(event);
        if (!event.defaultPrevented && allowColumnReorder) onDrop(event, item);
      }}
    >
      <div className="tdg-header-cell__inner relative flex h-full items-stretch">
        <div
          id={titleId}
          className="InovuaReactDataGrid__header-group__title flex h-full min-w-0 flex-1 items-center justify-center overflow-hidden"
        >
          <span className="truncate">{renderedHeader}</span>
        </div>

        {canResize ? (
          <button
            type="button"
            data-slot="group-resizer"
            data-group-id={item.groupName}
            data-group-segment={item.segmentIndex}
            data-resizing={resizing ? "true" : "false"}
            className="tdg-column-resizer InovuaReactDataGrid__header-group-resizer focus-visible:ring-1 focus-visible:ring-ring"
            aria-label={`Resize ${item.groupName} group`}
            aria-orientation="vertical"
            onPointerDown={(event) => onResizeStart(event, item)}
            onMouseDown={(event) => onResizeStart(event, item)}
            onKeyDown={(event) => {
              if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
                return;
              }
              event.preventDefault();
              event.stopPropagation();
              const direction =
                (event.key === "ArrowLeft" ? -1 : 1) * (rtl ? -1 : 1);
              onResizeBy(item, direction * 10);
            }}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
          />
        ) : null}
      </div>
    </TableHead>
  );
}
