import * as React from "react";

import type { TypeColumn, TypeDataGridProps } from "../../types";
import { getColumnId } from "../../utils/column";
import { clamp } from "../../utils/helpers";
import {
  getColumnGroupSegmentKey,
  resizeColumnWidthsProportionally,
  type GroupHeaderRenderItem,
  type TypeColumnGroupHeaderRenderItem,
} from "../utils/columnGroups";
import {
  ensureLastColumnHeaderFits,
  estimateColumnContentWidth,
  getColumnWidthBounds,
} from "../utils/columnWidthEstimation";
import {
  applyLiveColumnResizePreview,
  captureLiveColumnResizePreview,
  restoreLiveColumnResizePreview,
  type ColumnResizeSession,
  type GroupResizeSession,
} from "../utils/liveColumnResize";
import { GRID_SLACK_FILLER_ID } from "../utils/lockedColumns";
import { getLogicalScrollLeft, setLogicalScrollLeft } from "../utils/rtlScroll";

export type GridColumnResizeEntry = {
  column: TypeColumn;
  width?: number;
  flex?: number;
};

export type UseGridColumnResizeParams = {
  autosizeSample: any[];
  columnGroupHeaderRows: readonly TypeColumnGroupHeaderRenderItem[][];
  columnWidths: Readonly<Record<string, number>>;
  computedColumnDefaultWidth: number;
  computedColumnMaxWidth: number | null;
  computedColumnMinWidth: number;
  flexWeights: Readonly<Record<string, number>>;
  hasManualColumnWidths: boolean;
  headerScrollRef: React.RefObject<HTMLDivElement | null>;
  liveColumnResize: boolean;
  mobileTransformActive: boolean;
  onBatchColumnResize: TypeDataGridProps["onBatchColumnResize"];
  onColumnResize: TypeDataGridProps["onColumnResize"];
  orderedColumns: readonly TypeColumn[];
  renderedColumnLayout: readonly { id: string; width: number }[];
  reservedViewportWidthRef: React.MutableRefObject<number>;
  resizable: boolean;
  rtl: boolean;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  setManualColumnFlexes: React.Dispatch<
    React.SetStateAction<Record<string, number | null>>
  >;
  setManualColumnWidths: React.Dispatch<
    React.SetStateAction<Record<string, number>>
  >;
  setReservedViewportWidth: React.Dispatch<React.SetStateAction<number>>;
  shareSpaceOnResize: boolean;
  showColumnMenuTool: boolean;
  showHeader: boolean;
  skipHeaderOnAutoSize: boolean;
  surfaceRef: React.RefObject<HTMLDivElement | null>;
  /** The table's rendered width: the columns' total plus any slack filler. */
  tableRenderWidth: number | undefined;
  gridSlackWidth: number;
};

/**
 * Owns every column/group resize gesture. Keeping the pointer sessions, the
 * live preview scheduling and the width commit paths in this module means the
 * long-lived listener closures capture this hook's parameters instead of the
 * whole `ReactDataGrid` render scope.
 */
export function useGridColumnResize(params: UseGridColumnResizeParams) {
  const {
    autosizeSample,
    columnGroupHeaderRows,
    columnWidths,
    computedColumnDefaultWidth,
    computedColumnMaxWidth,
    computedColumnMinWidth,
    flexWeights,
    hasManualColumnWidths,
    headerScrollRef,
    liveColumnResize,
    mobileTransformActive,
    onBatchColumnResize,
    onColumnResize,
    orderedColumns,
    renderedColumnLayout,
    reservedViewportWidthRef,
    resizable,
    rtl,
    scrollRef,
    setManualColumnFlexes,
    setManualColumnWidths,
    setReservedViewportWidth,
    shareSpaceOnResize,
    showColumnMenuTool,
    showHeader,
    skipHeaderOnAutoSize,
    surfaceRef,
    tableRenderWidth,
    gridSlackWidth,
  } = params;

  const [resizeProxyLeft, setResizeProxyLeft] = React.useState<number | null>(
    null
  );
  const resizeProxyElementRef = React.useRef<HTMLDivElement | null>(null);
  const resizeProxyFrameRef = React.useRef<number | null>(null);
  const resizeProxyNextLeftRef = React.useRef<number | null>(null);
  const liveColumnResizeFrameRef = React.useRef<number | null>(null);
  const liveColumnResizeNextWidthRef = React.useRef<number | null>(null);
  const [resizingColumnId, setResizingColumnId] = React.useState<string | null>(
    null
  );
  const [resizingGroupKey, setResizingGroupKey] = React.useState<string | null>(
    null
  );
  const resizeSessionRef = React.useRef<ColumnResizeSession | null>(null);
  const resizeCleanupRef = React.useRef<(() => void) | null>(null);
  const groupResizeSessionRef = React.useRef<GroupResizeSession | null>(null);
  const groupResizeCleanupRef = React.useRef<(() => void) | null>(null);

  const cancelResizeProxyFrame = React.useCallback(() => {
    if (resizeProxyFrameRef.current != null) {
      window.cancelAnimationFrame(resizeProxyFrameRef.current);
      resizeProxyFrameRef.current = null;
    }
    resizeProxyNextLeftRef.current = null;
  }, []);

  const scheduleResizeProxyPosition = React.useCallback((nextLeft: number) => {
    resizeProxyNextLeftRef.current = nextLeft;
    if (resizeProxyFrameRef.current != null) return;

    resizeProxyFrameRef.current = window.requestAnimationFrame(() => {
      resizeProxyFrameRef.current = null;
      const proxy = resizeProxyElementRef.current;
      const left = resizeProxyNextLeftRef.current;
      if (!proxy || left == null) return;

      proxy.style.transform = `translate3d(${left}px, 0, 0)`;
    });
  }, []);

  const cancelLiveColumnResizeFrame = React.useCallback(() => {
    if (liveColumnResizeFrameRef.current != null) {
      window.cancelAnimationFrame(liveColumnResizeFrameRef.current);
      liveColumnResizeFrameRef.current = null;
    }
    liveColumnResizeNextWidthRef.current = null;
  }, []);

  const scheduleLiveColumnResizePreview = React.useCallback(
    (nextWidth: number) => {
      liveColumnResizeNextWidthRef.current = nextWidth;
      if (liveColumnResizeFrameRef.current != null) return;

      liveColumnResizeFrameRef.current = window.requestAnimationFrame(() => {
        liveColumnResizeFrameRef.current = null;
        const activeSession = resizeSessionRef.current;
        const width = liveColumnResizeNextWidthRef.current;
        liveColumnResizeNextWidthRef.current = null;
        if (!activeSession?.liveColumnResize || width == null) return;

        applyLiveColumnResizePreview(activeSession, width);
      });
    },
    []
  );

  React.useLayoutEffect(() => {
    const activeSession = resizeSessionRef.current;
    const preview = activeSession?.preview;
    if (!activeSession?.liveColumnResize || !preview) return;

    const latestColumn = renderedColumnLayout.find(
      (column) => column.id === activeSession.columnId
    );
    if (!latestColumn) return;

    // React can receive a newer controlled width while a pointer gesture is
    // still active. Keep that latest React-owned geometry as the cancellation
    // baseline, then place the transient pointer preview back on top before
    // paint. This prevents cleanup from restoring a stale drag-start width.
    preview.baseColumnWidth = latestColumn.width;
    for (const column of preview.columns) {
      column.inlineWidth = `${latestColumn.width}px`;
    }

    const latestTableInlineWidth = tableRenderWidth
      ? `${tableRenderWidth}px`
      : "";
    for (const table of preview.tables) {
      table.inlineWidth = latestTableInlineWidth;
      table.renderedWidth =
        tableRenderWidth ?? table.element.getBoundingClientRect().width;
    }
    // Re-collect the fillers, then re-baseline the slack. The first drag starts
    // in stretch mode, where no filler is mounted at all; seeding the manual
    // widths flips to fixed mode and mounts one, and without re-querying here
    // this drag would keep believing there is nothing to move width into.
    const surface = surfaceRef.current;
    if (surface) {
      preview.fillers = Array.from(
        surface.querySelectorAll<HTMLTableColElement>("col[data-column-id]")
      )
        .filter(
          (element) => element.dataset.columnId === GRID_SLACK_FILLER_ID
        )
        .map((element) => ({ element, inlineWidth: element.style.width }));
    }
    preview.baseSlackWidth = gridSlackWidth;
    for (const filler of preview.fillers) {
      filler.inlineWidth = gridSlackWidth > 0 ? `${gridSlackWidth}px` : "";
    }
    for (const lockedColumn of preview.lockedColumns) {
      for (const cell of lockedColumn.cells) {
        cell.inlineOffset = cell.element.style.getPropertyValue(
          "--tdg-locked-column-offset"
        );
      }
    }

    const appliedPreviewWidth = activeSession.appliedPreviewWidth;
    if (appliedPreviewWidth == null) return;

    activeSession.appliedPreviewWidth = null;
    applyLiveColumnResizePreview(activeSession, appliedPreviewWidth);
  }, [gridSlackWidth, renderedColumnLayout, surfaceRef, tableRenderWidth]);

  const captureRenderedColumnWidths = React.useCallback(() => {
    const headerCells = Array.from(
      headerScrollRef.current?.querySelectorAll<HTMLElement>(
        ".tdg-header-cell"
      ) ?? []
    );
    if (headerCells.length === 0) return null;

    const next: Record<string, number> = {};

    for (const headerCell of headerCells) {
      const columnId = headerCell.dataset.columnId;
      if (!columnId) continue;
      const column = orderedColumns.find(
        (candidate) => getColumnId(candidate) === columnId
      );
      if (!column) continue;
      const { minWidth, maxWidth } = getColumnWidthBounds(
        column,
        computedColumnMinWidth,
        computedColumnMaxWidth
      );
      next[columnId] = clamp(
        Math.round(headerCell.getBoundingClientRect().width),
        minWidth,
        maxWidth
      );
    }

    return Object.keys(next).length > 0 ? next : null;
  }, [
    computedColumnMaxWidth,
    computedColumnMinWidth,
    orderedColumns,
    headerScrollRef,
  ]);

  const seedManualColumnWidthsFromDom = React.useCallback(() => {
    if (hasManualColumnWidths) return null;

    const measuredWidths = captureRenderedColumnWidths();
    if (!measuredWidths) return null;

    setManualColumnWidths((current) => {
      if (Object.keys(current).length > 0) {
        return current;
      }

      return measuredWidths;
    });

    return measuredWidths;
  }, [
    captureRenderedColumnWidths,
    hasManualColumnWidths,
    setManualColumnWidths,
  ]);

  const commitColumnResizeEntries = React.useCallback(
    (
      entries: {
        column: TypeColumn;
        width?: number;
        flex?: number;
      }[],
      nextReservedViewportWidth = reservedViewportWidthRef.current
    ) => {
      const normalizedEntries = entries.flatMap((entry) => {
        const width =
          typeof entry.width === "number" &&
          Number.isFinite(entry.width) &&
          entry.width > 0
            ? entry.width
            : undefined;
        const flex =
          typeof entry.flex === "number" &&
          Number.isFinite(entry.flex) &&
          entry.flex > 0
            ? entry.flex
            : undefined;
        if (width === undefined && flex === undefined) return [];

        const { minWidth, maxWidth } = getColumnWidthBounds(
          entry.column,
          computedColumnMinWidth,
          computedColumnMaxWidth
        );
        return [
          {
            column: entry.column,
            width:
              width === undefined
                ? undefined
                : clamp(Math.round(width), minWidth, maxWidth),
            // Flex entries are weights, not pixel widths. The rendered
            // allocation applies the column bounds after resolving the weight.
            flex,
          },
        ];
      });
      if (normalizedEntries.length === 0) return;

      const normalizedReservedViewportWidth = Number.isFinite(
        nextReservedViewportWidth
      )
        ? Math.round(nextReservedViewportWidth)
        : reservedViewportWidthRef.current;

      if (
        normalizedReservedViewportWidth !== reservedViewportWidthRef.current
      ) {
        reservedViewportWidthRef.current = normalizedReservedViewportWidth;
        setReservedViewportWidth(normalizedReservedViewportWidth);
      }

      setManualColumnWidths((current) => {
        let changed = false;
        const next = { ...current };

        for (const entry of normalizedEntries) {
          const columnId = getColumnId(entry.column);
          const controlledWidth =
            typeof entry.column.width === "number" &&
            Number.isFinite(entry.column.width) &&
            entry.column.width > 0;
          const controlledFlex =
            !controlledWidth &&
            typeof entry.column.flex === "number" &&
            Number.isFinite(entry.column.flex) &&
            entry.column.flex > 0;

          if (
            typeof entry.flex === "number" &&
            Number.isFinite(entry.flex) &&
            entry.flex > 0
          ) {
            if (!controlledWidth && !controlledFlex && columnId in next) {
              delete next[columnId];
              changed = true;
            }
            continue;
          }

          if (
            typeof entry.width === "number" &&
            Number.isFinite(entry.width) &&
            !controlledWidth &&
            !controlledFlex &&
            next[columnId] !== entry.width
          ) {
            next[columnId] = entry.width;
            changed = true;
          }
        }

        return changed ? next : current;
      });

      setManualColumnFlexes((current) => {
        let changed = false;
        const next = { ...current };

        for (const entry of normalizedEntries) {
          const columnId = getColumnId(entry.column);
          const controlledWidth =
            typeof entry.column.width === "number" &&
            Number.isFinite(entry.column.width) &&
            entry.column.width > 0;
          const controlledFlex =
            !controlledWidth && entry.column.flex !== undefined;

          if (controlledWidth || controlledFlex) continue;

          if (
            typeof entry.flex === "number" &&
            Number.isFinite(entry.flex) &&
            entry.flex > 0
          ) {
            if (next[columnId] !== entry.flex) {
              next[columnId] = entry.flex;
              changed = true;
            }
          } else if (
            typeof entry.width === "number" &&
            Number.isFinite(entry.width) &&
            next[columnId] !== null
          ) {
            // A width proposal explicitly turns off an uncontrolled
            // defaultFlex value. keepFlex/share-space paths emit `flex`.
            next[columnId] = null;
            changed = true;
          }
        }

        return changed ? next : current;
      });

      const context = {
        reservedViewportWidth: normalizedReservedViewportWidth,
      };
      for (const entry of normalizedEntries) {
        onColumnResize?.(entry, context);
      }
      onBatchColumnResize?.(normalizedEntries, context);
    },
    [
      computedColumnMaxWidth,
      computedColumnMinWidth,
      onBatchColumnResize,
      onColumnResize,
      reservedViewportWidthRef,
      setManualColumnFlexes,
      setManualColumnWidths,
      setReservedViewportWidth,
    ]
  );

  const commitColumnPixelResize = React.useCallback(
    (column: TypeColumn, requestedWidth: number) => {
      const columnId = getColumnId(column);
      const columnBounds = getColumnWidthBounds(
        column,
        computedColumnMinWidth,
        computedColumnMaxWidth
      );
      const nextWidth = clamp(
        requestedWidth,
        columnBounds.minWidth,
        columnBounds.maxWidth
      );
      const currentWidth = columnWidths[columnId] ?? nextWidth;
      const controlledWidth =
        typeof column.width === "number" &&
        Number.isFinite(column.width) &&
        column.width > 0;
      const controlledFlex =
        !controlledWidth &&
        typeof column.flex === "number" &&
        Number.isFinite(column.flex) &&
        column.flex > 0;
      const effectiveFlex = Boolean(flexWeights[columnId]);
      const resizeIsGridOwned = !controlledWidth && !controlledFlex;
      const flexColumnCount = Object.keys(flexWeights).length;
      const diff = nextWidth - currentWidth;
      if (diff === 0) return;

      const makeResizeEntry = (
        targetColumn: TypeColumn,
        targetWidth: number,
        keepTargetFlex: boolean
      ) => {
        const targetColumnId = getColumnId(targetColumn);
        const targetIsFlex = Boolean(flexWeights[targetColumnId]);
        return targetIsFlex && keepTargetFlex
          ? {
              column: targetColumn,
              width: undefined,
              flex: targetWidth,
            }
          : {
              column: targetColumn,
              width: targetWidth,
              flex: undefined,
            };
      };

      const columnIndex = orderedColumns.findIndex(
        (candidate) => getColumnId(candidate) === columnId
      );
      const rightColumn = orderedColumns[columnIndex + 1];
      if (shareSpaceOnResize && rightColumn?.resizable !== false) {
        const rightColumnId = getColumnId(rightColumn);
        const rightCurrentWidth =
          columnWidths[rightColumnId] ??
          rightColumn.width ??
          rightColumn.defaultWidth ??
          computedColumnDefaultWidth;
        const rightBounds = getColumnWidthBounds(
          rightColumn,
          computedColumnMinWidth,
          computedColumnMaxWidth
        );
        let rightNextWidth = clamp(
          rightCurrentWidth - diff,
          rightBounds.minWidth,
          rightBounds.maxWidth
        );
        let leftNextWidth = clamp(
          currentWidth + (rightCurrentWidth - rightNextWidth),
          columnBounds.minWidth,
          columnBounds.maxWidth
        );
        rightNextWidth = clamp(
          rightCurrentWidth - (leftNextWidth - currentWidth),
          rightBounds.minWidth,
          rightBounds.maxWidth
        );
        leftNextWidth = currentWidth + (rightCurrentWidth - rightNextWidth);

        const resizeEntries = [
          makeResizeEntry(column, leftNextWidth, true),
          makeResizeEntry(rightColumn, rightNextWidth, true),
        ];
        const resizedPairHasFlex = Boolean(
          flexWeights[columnId] || flexWeights[rightColumnId]
        );
        if (resizedPairHasFlex) {
          const resizedIds = new Set([columnId, rightColumnId]);
          for (const flexColumn of orderedColumns) {
            const flexColumnId = getColumnId(flexColumn);
            if (resizedIds.has(flexColumnId) || !flexWeights[flexColumnId]) {
              continue;
            }

            resizeEntries.push(
              makeResizeEntry(
                flexColumn,
                columnWidths[flexColumnId] ??
                  flexColumn.defaultWidth ??
                  computedColumnDefaultWidth,
                true
              )
            );
          }
        }

        commitColumnResizeEntries(resizeEntries);
        return;
      }

      const keepResizedColumnFlex =
        effectiveFlex && resizeIsGridOwned && column.keepFlex !== false;
      const adjustsAvailableWidth =
        resizeIsGridOwned &&
        ((!effectiveFlex && flexColumnCount > 0) ||
          (effectiveFlex && (flexColumnCount > 1 || keepResizedColumnFlex)));
      const nextReservedViewportWidth = adjustsAvailableWidth
        ? reservedViewportWidthRef.current - diff
        : reservedViewportWidthRef.current;
      const resizeEntries: {
        column: TypeColumn;
        width?: number;
        flex?: number;
      }[] = [makeResizeEntry(column, nextWidth, keepResizedColumnFlex)];

      if (
        resizeIsGridOwned &&
        flexColumnCount > 0 &&
        (!effectiveFlex || flexColumnCount > 1)
      ) {
        for (const flexColumn of orderedColumns) {
          const flexColumnId = getColumnId(flexColumn);
          if (flexColumnId === columnId || !flexWeights[flexColumnId]) {
            continue;
          }

          const currentFlexWidth = columnWidths[flexColumnId];
          if (
            typeof currentFlexWidth === "number" &&
            Number.isFinite(currentFlexWidth) &&
            currentFlexWidth > 0
          ) {
            resizeEntries.push({
              column: flexColumn,
              width: undefined,
              flex: currentFlexWidth,
            });
          }
        }
      }

      // A no-share pixel resize keeps an uncontrolled flex by default;
      // keepFlex=false converts it. Controlled width/flex remains prop-owned,
      // so only the fixed-width proposal is emitted.
      commitColumnResizeEntries(resizeEntries, nextReservedViewportWidth);
    },
    [
      flexWeights,
      columnWidths,
      commitColumnResizeEntries,
      computedColumnDefaultWidth,
      computedColumnMaxWidth,
      computedColumnMinWidth,
      orderedColumns,
      shareSpaceOnResize,
      reservedViewportWidthRef,
    ]
  );

  const resizeColumnBy = React.useCallback(
    (columnId: string, diff: number) => {
      const column = orderedColumns.find(
        (candidate) => getColumnId(candidate) === columnId
      );
      if (!column || !Number.isFinite(diff) || diff === 0) return;

      const currentWidth =
        columnWidths[columnId] ??
        column.width ??
        column.defaultWidth ??
        computedColumnDefaultWidth;
      commitColumnPixelResize(column, currentWidth + diff);
    },
    [
      columnWidths,
      commitColumnPixelResize,
      computedColumnDefaultWidth,
      orderedColumns,
    ]
  );

  const getResizableGroupColumns = React.useCallback(
    (
      item: GroupHeaderRenderItem,
      widthOverrides?: Readonly<Record<string, number>>
    ) =>
      item.columnIds.flatMap((columnId) => {
        const column = orderedColumns.find(
          (candidate) => getColumnId(candidate) === columnId
        );
        if (!column || column.resizable === false) return [];

        const { minWidth, maxWidth } = getColumnWidthBounds(
          column,
          computedColumnMinWidth,
          computedColumnMaxWidth
        );
        const width =
          widthOverrides?.[columnId] ??
          columnWidths[columnId] ??
          column.width ??
          column.defaultWidth ??
          computedColumnDefaultWidth;
        return [
          {
            column,
            id: columnId,
            width,
            minWidth,
            maxWidth,
          },
        ];
      }),
    [
      columnWidths,
      computedColumnDefaultWidth,
      computedColumnMaxWidth,
      computedColumnMinWidth,
      orderedColumns,
    ]
  );

  const resizeGroupBy = React.useCallback(
    (item: GroupHeaderRenderItem, diff: number) => {
      if (!Number.isFinite(diff) || diff === 0) return;
      const columns = getResizableGroupColumns(item);
      const startTotalWidth = columns.reduce(
        (total, column) => total + column.width,
        0
      );
      if (startTotalWidth <= 0) return;

      const nextWidths = resizeColumnWidthsProportionally({
        columns,
        requestedTotalWidth: startTotalWidth + diff,
      });
      commitColumnResizeEntries(
        columns.map(({ column, id }) => ({
          column,
          width: nextWidths[id],
        }))
      );
    },
    [commitColumnResizeEntries, getResizableGroupColumns]
  );

  const autosizeColumn = React.useCallback(
    (columnId: string) => {
      const column = orderedColumns.find(
        (candidate) => getColumnId(candidate) === columnId
      );
      if (!column || column.resizable === false) return;

      const seededWidths = seedManualColumnWidthsFromDom();

      const nextWidth = estimateColumnContentWidth({
        column,
        rows: autosizeSample,
        skipHeaderOnAutoSize,
        columnMinWidth: computedColumnMinWidth,
        columnMaxWidth: computedColumnMaxWidth,
      });
      const bodyViewport = scrollRef.current;
      const restoreTrailingEdge = Boolean(
        getColumnId(orderedColumns[orderedColumns.length - 1]!) === columnId &&
        bodyViewport &&
        bodyViewport.scrollWidth -
          bodyViewport.clientWidth -
          getLogicalScrollLeft(bodyViewport, rtl) <=
          1
      );

      if (seededWidths) {
        setManualColumnWidths((current) =>
          Object.keys(current).length > 0 ? current : seededWidths
        );
      }
      commitColumnPixelResize(column, nextWidth);

      if (restoreTrailingEdge && bodyViewport) {
        window.requestAnimationFrame(() => {
          setLogicalScrollLeft(bodyViewport, bodyViewport.scrollWidth, rtl);
        });
      }
    },
    [
      autosizeSample,
      commitColumnPixelResize,
      computedColumnMaxWidth,
      computedColumnMinWidth,
      orderedColumns,
      rtl,
      seedManualColumnWidthsFromDom,
      skipHeaderOnAutoSize,
      scrollRef,
      setManualColumnWidths,
    ]
  );

  const stopColumnResize = React.useCallback(() => {
    const session = resizeSessionRef.current;
    const cleanup = resizeCleanupRef.current;
    resizeCleanupRef.current = null;
    resizeSessionRef.current = null;
    cancelResizeProxyFrame();
    cancelLiveColumnResizeFrame();
    restoreLiveColumnResizePreview(session);
    cleanup?.();
    setResizeProxyLeft(null);
    setResizingColumnId(null);
  }, [cancelLiveColumnResizeFrame, cancelResizeProxyFrame]);

  const stopGroupResize = React.useCallback(() => {
    const cleanup = groupResizeCleanupRef.current;
    groupResizeCleanupRef.current = null;
    groupResizeSessionRef.current = null;
    cancelResizeProxyFrame();
    cleanup?.();
    setResizeProxyLeft(null);
    setResizingGroupKey(null);
  }, [cancelResizeProxyFrame]);

  const startGroupResize = React.useCallback(
    (
      event: React.MouseEvent<HTMLElement> | React.PointerEvent<HTMLElement>,
      item: GroupHeaderRenderItem
    ) => {
      event.preventDefault();
      event.stopPropagation();

      const isPointerEvent = "pointerId" in event;
      const resizeHandle = event.currentTarget;
      const pointerId = isPointerEvent ? event.pointerId : null;
      if (
        event.button !== 0 ||
        (isPointerEvent && !event.isPrimary) ||
        resizeSessionRef.current ||
        groupResizeSessionRef.current
      ) {
        return;
      }

      const surfaceElement = surfaceRef.current;
      const headerCell = resizeHandle.closest("th");
      if (!surfaceElement || !(headerCell instanceof HTMLTableCellElement)) {
        return;
      }

      const seededWidths = seedManualColumnWidthsFromDom();
      const columns = getResizableGroupColumns(item, seededWidths ?? undefined);
      if (columns.length === 0) return;
      const surfaceRect = surfaceElement.getBoundingClientRect();
      const headerRect = headerCell.getBoundingClientRect();
      const startTotalWidth = columns.reduce(
        (total, column) => total + column.width,
        0
      );
      const minTotalWidth = columns.reduce(
        (total, column) => total + column.minWidth,
        0
      );
      const maxTotalWidth = columns.reduce(
        (total, column) => total + column.maxWidth,
        0
      );
      const key = getColumnGroupSegmentKey(item);
      const groupRight = headerRect.right - surfaceRect.left;
      const previousDraggable = headerCell.draggable;

      headerCell.draggable = false;
      groupResizeSessionRef.current = {
        key,
        inputType: isPointerEvent ? "pointer" : "mouse",
        pointerId,
        startX: event.clientX,
        startTotalWidth,
        nextTotalWidth: startTotalWidth,
        groupRight,
        minTotalWidth,
        maxTotalWidth,
        columns,
      };

      const previousCursor = document.body.style.cursor;
      const previousUserSelect = document.body.style.userSelect;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      const updateResize = (clientX: number) => {
        const activeSession = groupResizeSessionRef.current;
        if (!activeSession) return;

        const nextTotalWidth = clamp(
          activeSession.startTotalWidth +
            (clientX - activeSession.startX) * (rtl ? -1 : 1),
          activeSession.minTotalWidth,
          activeSession.maxTotalWidth
        );
        activeSession.nextTotalWidth = nextTotalWidth;
        scheduleResizeProxyPosition(
          activeSession.groupRight +
            (nextTotalWidth - activeSession.startTotalWidth)
        );
      };

      const completeResize = () => {
        const completedSession = groupResizeSessionRef.current;
        if (
          completedSession &&
          completedSession.nextTotalWidth !== completedSession.startTotalWidth
        ) {
          const widths = resizeColumnWidthsProportionally({
            columns: completedSession.columns,
            requestedTotalWidth: completedSession.nextTotalWidth,
          });
          commitColumnResizeEntries(
            completedSession.columns.map(({ column, id }) => ({
              column,
              width: widths[id],
            }))
          );
        }
        stopGroupResize();
      };

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const activeSession = groupResizeSessionRef.current;
        if (!activeSession || activeSession.inputType !== "mouse") return;
        updateResize(moveEvent.clientX);
      };
      const handleMouseUp = (upEvent: MouseEvent) => {
        const activeSession = groupResizeSessionRef.current;
        if (
          !activeSession ||
          activeSession.inputType !== "mouse" ||
          upEvent.button !== 0
        ) {
          return;
        }
        completeResize();
      };
      const handlePointerMove = (moveEvent: PointerEvent) => {
        const activeSession = groupResizeSessionRef.current;
        if (
          !activeSession ||
          activeSession.inputType !== "pointer" ||
          activeSession.pointerId !== moveEvent.pointerId
        ) {
          return;
        }
        moveEvent.preventDefault();
        updateResize(moveEvent.clientX);
      };
      const handlePointerUp = (upEvent: PointerEvent) => {
        const activeSession = groupResizeSessionRef.current;
        if (
          !activeSession ||
          activeSession.inputType !== "pointer" ||
          activeSession.pointerId !== upEvent.pointerId
        ) {
          return;
        }
        completeResize();
      };
      const handlePointerCancel = (cancelEvent: PointerEvent) => {
        const activeSession = groupResizeSessionRef.current;
        if (
          !activeSession ||
          activeSession.inputType !== "pointer" ||
          activeSession.pointerId !== cancelEvent.pointerId
        ) {
          return;
        }
        stopGroupResize();
      };
      const handleLostPointerCapture = (lostEvent: PointerEvent) => {
        const activeSession = groupResizeSessionRef.current;
        if (
          !activeSession ||
          activeSession.inputType !== "pointer" ||
          activeSession.pointerId !== lostEvent.pointerId
        ) {
          return;
        }
        stopGroupResize();
      };
      const handleWindowBlur = () => stopGroupResize();

      groupResizeCleanupRef.current?.();
      groupResizeCleanupRef.current = () => {
        if (pointerId != null && resizeHandle.hasPointerCapture(pointerId)) {
          resizeHandle.releasePointerCapture(pointerId);
        }
        headerCell.draggable = previousDraggable;
        document.body.style.cursor = previousCursor;
        document.body.style.userSelect = previousUserSelect;
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
        window.removeEventListener("pointercancel", handlePointerCancel);
        resizeHandle.removeEventListener(
          "lostpointercapture",
          handleLostPointerCapture
        );
        window.removeEventListener("blur", handleWindowBlur);
      };

      if (isPointerEvent) {
        window.addEventListener("pointermove", handlePointerMove, {
          passive: false,
        });
        window.addEventListener("pointerup", handlePointerUp);
        window.addEventListener("pointercancel", handlePointerCancel);
        resizeHandle.addEventListener(
          "lostpointercapture",
          handleLostPointerCapture
        );
        try {
          resizeHandle.setPointerCapture(event.pointerId);
        } catch {
          // Window listeners keep the group gesture functional when pointer
          // capture is unavailable.
        }
      } else {
        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);
      }
      window.addEventListener("blur", handleWindowBlur);

      setResizingGroupKey(key);
      setResizingColumnId(null);
      cancelResizeProxyFrame();
      const initialProxyLeft = groupRight;
      resizeProxyNextLeftRef.current = initialProxyLeft;
      setResizeProxyLeft(initialProxyLeft);
    },
    [
      cancelResizeProxyFrame,
      commitColumnResizeEntries,
      getResizableGroupColumns,
      rtl,
      scheduleResizeProxyPosition,
      seedManualColumnWidthsFromDom,
      stopGroupResize,
      surfaceRef,
    ]
  );

  const startColumnResize = React.useCallback(
    (
      event: React.MouseEvent<HTMLElement> | React.PointerEvent<HTMLElement>,
      columnId: string
    ) => {
      event.preventDefault();
      event.stopPropagation();

      const isPointerEvent = "pointerId" in event;
      const resizeHandle = event.currentTarget;
      const pointerId = isPointerEvent ? event.pointerId : null;
      if (
        event.button !== 0 ||
        (isPointerEvent && !event.isPrimary) ||
        // A real mouse interaction emits pointerdown followed by mousedown.
        // The pointer session owns that gesture, so the compatibility
        // mousedown must not register a second set of listeners or commit it
        // twice.
        resizeSessionRef.current ||
        groupResizeSessionRef.current
      ) {
        return;
      }

      const column = orderedColumns.find(
        (candidate) => getColumnId(candidate) === columnId
      );
      const surfaceElement = surfaceRef.current;
      const headerCell = event.currentTarget.closest("th");

      if (
        !column ||
        !surfaceElement ||
        !(headerCell instanceof HTMLTableCellElement)
      ) {
        return;
      }

      const surfaceRect = surfaceElement.getBoundingClientRect();
      const headerRect = headerCell.getBoundingClientRect();
      const seededWidths = seedManualColumnWidthsFromDom();
      const startWidth =
        seededWidths?.[columnId] ?? Math.round(headerRect.width);
      const columnLeft = headerRect.left - surfaceRect.left;
      const previousDraggable = headerCell.draggable;
      const bodyViewport = scrollRef.current;
      const isLastColumn =
        getColumnId(orderedColumns[orderedColumns.length - 1]!) === columnId;
      const columnWidthBounds = getColumnWidthBounds(
        column,
        computedColumnMinWidth,
        computedColumnMaxWidth
      );
      const minWidth = isLastColumn
        ? ensureLastColumnHeaderFits({
            column,
            baseWidth: columnWidthBounds.minWidth,
            showColumnMenuTool,
            columnMinWidth: computedColumnMinWidth,
            columnMaxWidth: computedColumnMaxWidth,
          })
        : columnWidthBounds.minWidth;
      const { maxWidth } = columnWidthBounds;
      const restoreTrailingEdge = Boolean(
        isLastColumn &&
        bodyViewport &&
        bodyViewport.scrollWidth -
          bodyViewport.clientWidth -
          getLogicalScrollLeft(bodyViewport, rtl) <=
          1
      );
      const preview = liveColumnResize
        ? captureLiveColumnResizePreview(surfaceElement, columnId, startWidth)
        : null;

      headerCell.draggable = false;

      resizeSessionRef.current = {
        columnId,
        column,
        inputType: isPointerEvent ? "pointer" : "mouse",
        pointerId,
        startX: event.clientX,
        startWidth,
        nextWidth: startWidth,
        columnLeft,
        minWidth,
        maxWidth,
        liveColumnResize,
        appliedPreviewWidth: null,
        preview,
      };

      resizeCleanupRef.current?.();

      const previousCursor = document.body.style.cursor;
      const previousUserSelect = document.body.style.userSelect;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      const updateResize = (clientX: number) => {
        const activeSession = resizeSessionRef.current;
        if (!activeSession) return;

        const nextWidth = clamp(
          activeSession.startWidth +
            (clientX - activeSession.startX) * (rtl ? -1 : 1),
          activeSession.minWidth,
          activeSession.maxWidth
        );

        activeSession.nextWidth = nextWidth;
        if (activeSession.liveColumnResize) {
          scheduleLiveColumnResizePreview(nextWidth);
        } else {
          scheduleResizeProxyPosition(activeSession.columnLeft + nextWidth);
        }
      };

      const completeResize = () => {
        const completedSession = resizeSessionRef.current;
        const shouldCommit = Boolean(
          completedSession &&
          completedSession.nextWidth !== completedSession.startWidth
        );
        if (completedSession && shouldCommit) {
          // Settle the imperative preview before entering the existing commit
          // path. React applies the grid-owned result in the same event turn;
          // controlled widths therefore return to their prop value unless the
          // consumer supplies the proposal back from `onColumnResize`.
          cancelLiveColumnResizeFrame();
          restoreLiveColumnResizePreview(completedSession);
          commitColumnPixelResize(
            completedSession.column,
            completedSession.nextWidth
          );
        }
        stopColumnResize();

        if (restoreTrailingEdge && bodyViewport) {
          window.requestAnimationFrame(() => {
            setLogicalScrollLeft(bodyViewport, bodyViewport.scrollWidth, rtl);
          });
        }
      };
      const handleMouseMove = (moveEvent: MouseEvent) => {
        const activeSession = resizeSessionRef.current;
        if (!activeSession || activeSession.inputType !== "mouse") return;
        updateResize(moveEvent.clientX);
      };
      const handleMouseUp = (upEvent: MouseEvent) => {
        const activeSession = resizeSessionRef.current;
        if (
          !activeSession ||
          activeSession.inputType !== "mouse" ||
          upEvent.button !== 0
        ) {
          return;
        }
        completeResize();
      };
      const handlePointerMove = (moveEvent: PointerEvent) => {
        const activeSession = resizeSessionRef.current;
        if (
          !activeSession ||
          activeSession.inputType !== "pointer" ||
          activeSession.pointerId !== moveEvent.pointerId
        ) {
          return;
        }
        moveEvent.preventDefault();
        updateResize(moveEvent.clientX);
      };
      const handlePointerUp = (upEvent: PointerEvent) => {
        const activeSession = resizeSessionRef.current;
        if (
          !activeSession ||
          activeSession.inputType !== "pointer" ||
          activeSession.pointerId !== upEvent.pointerId
        ) {
          return;
        }
        completeResize();
      };
      const handlePointerCancel = (cancelEvent: PointerEvent) => {
        const activeSession = resizeSessionRef.current;
        if (
          !activeSession ||
          activeSession.inputType !== "pointer" ||
          activeSession.pointerId !== cancelEvent.pointerId
        ) {
          return;
        }
        stopColumnResize();
      };
      const handleLostPointerCapture = (lostEvent: PointerEvent) => {
        const activeSession = resizeSessionRef.current;
        if (
          !activeSession ||
          activeSession.inputType !== "pointer" ||
          activeSession.pointerId !== lostEvent.pointerId
        ) {
          return;
        }
        stopColumnResize();
      };
      const handleWindowBlur = () => {
        stopColumnResize();
      };

      resizeCleanupRef.current = () => {
        if (pointerId != null && resizeHandle.hasPointerCapture(pointerId)) {
          resizeHandle.releasePointerCapture(pointerId);
        }
        headerCell.draggable = previousDraggable;
        document.body.style.cursor = previousCursor;
        document.body.style.userSelect = previousUserSelect;
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
        window.removeEventListener("pointercancel", handlePointerCancel);
        resizeHandle.removeEventListener(
          "lostpointercapture",
          handleLostPointerCapture
        );
        window.removeEventListener("blur", handleWindowBlur);
      };

      if (isPointerEvent) {
        window.addEventListener("pointermove", handlePointerMove, {
          passive: false,
        });
        window.addEventListener("pointerup", handlePointerUp);
        window.addEventListener("pointercancel", handlePointerCancel);
        resizeHandle.addEventListener(
          "lostpointercapture",
          handleLostPointerCapture
        );
        // Capturing keeps a touch/pen drag alive when the pointer leaves the
        // narrow handle. Window listeners remain the fallback for browsers
        // which reject capture for a synthetic pointer event.
        try {
          resizeHandle.setPointerCapture(event.pointerId);
        } catch {
          // The gesture can still be tracked by the window listeners.
        }
      } else {
        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);
      }
      window.addEventListener("blur", handleWindowBlur);
      setResizingColumnId(columnId);
      cancelResizeProxyFrame();
      cancelLiveColumnResizeFrame();
      if (liveColumnResize) {
        setResizeProxyLeft(null);
      } else {
        const initialProxyLeft = columnLeft + startWidth;
        resizeProxyNextLeftRef.current = initialProxyLeft;
        setResizeProxyLeft(initialProxyLeft);
      }
    },
    [
      cancelLiveColumnResizeFrame,
      cancelResizeProxyFrame,
      commitColumnPixelResize,
      computedColumnMaxWidth,
      computedColumnMinWidth,
      liveColumnResize,
      orderedColumns,
      rtl,
      scheduleLiveColumnResizePreview,
      scheduleResizeProxyPosition,
      seedManualColumnWidthsFromDom,
      showColumnMenuTool,
      stopColumnResize,
      scrollRef,
      surfaceRef,
    ]
  );

  React.useLayoutEffect(() => {
    return () => {
      const session = resizeSessionRef.current;
      const cleanup = resizeCleanupRef.current;
      const groupCleanup = groupResizeCleanupRef.current;
      resizeCleanupRef.current = null;
      groupResizeCleanupRef.current = null;
      resizeSessionRef.current = null;
      groupResizeSessionRef.current = null;
      cancelResizeProxyFrame();
      cancelLiveColumnResizeFrame();
      restoreLiveColumnResizePreview(session);
      cleanup?.();
      groupCleanup?.();
    };
  }, [cancelLiveColumnResizeFrame, cancelResizeProxyFrame]);

  React.useEffect(() => {
    if (!resizingColumnId) return;

    const activeSession = resizeSessionRef.current;
    const resizingColumnExists = orderedColumns.some(
      (column) => getColumnId(column) === resizingColumnId
    );

    if (
      mobileTransformActive ||
      !resizable ||
      !showHeader ||
      !resizingColumnExists ||
      activeSession?.liveColumnResize !== liveColumnResize
    ) {
      stopColumnResize();
    }
  }, [
    liveColumnResize,
    mobileTransformActive,
    orderedColumns,
    resizable,
    resizingColumnId,
    showHeader,
    stopColumnResize,
  ]);

  React.useEffect(() => {
    if (!resizingGroupKey) return;

    const activeSession = groupResizeSessionRef.current;
    const segmentStillExists = columnGroupHeaderRows.some((row) =>
      row.some(
        (item) =>
          item.type === "group" &&
          getColumnGroupSegmentKey(item) === resizingGroupKey
      )
    );
    const columnsStillExist = activeSession?.columns.every(({ id }) =>
      orderedColumns.some((column) => getColumnId(column) === id)
    );

    if (
      mobileTransformActive ||
      !resizable ||
      !showHeader ||
      !segmentStillExists ||
      !columnsStillExist
    ) {
      stopGroupResize();
    }
  }, [
    columnGroupHeaderRows,
    mobileTransformActive,
    orderedColumns,
    resizable,
    resizingGroupKey,
    showHeader,
    stopGroupResize,
  ]);
  return {
    autosizeColumn,
    commitColumnPixelResize,
    commitColumnResizeEntries,
    resizeColumnBy,
    resizeGroupBy,
    resizeProxyElementRef,
    resizeProxyLeft,
    resizingColumnId,
    resizingGroupKey,
    startColumnResize,
    startGroupResize,
  };
}
