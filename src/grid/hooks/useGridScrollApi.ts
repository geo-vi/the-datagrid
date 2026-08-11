import * as React from "react";
import type { Row } from "@tanstack/react-table";

import type { TypeComputedColumn } from "../../types";
import { getLogicalScrollLeft, setLogicalScrollLeft } from "../utils/rtlScroll";

/** Only the virtualizer surface this hook needs; keeps the param type narrow. */
type ScrollRowVirtualizer = {
  scrollToIndex: (
    index: number,
    options?: { align?: "start" | "center" | "end" | "auto" }
  ) => void;
};

export type UseGridScrollApiParams = {
  columnWidthPrefixSums: number[];
  lastImperativeScrollAtRef: React.MutableRefObject<number>;
  lockedColumnMetrics: {
    totalLockedStartWidth: number;
    totalLockedEndWidth: number;
  };
  resolveRowHeight: (rowIndex: number) => number;
  rowHeight: number | ((rowIndex: number) => number) | null | undefined;
  rowModel: Row<any>[];
  rowVirtualizer: ScrollRowVirtualizer;
  rtl: boolean;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  stickyHeaderOffset: number;
  surfaceRef: React.RefObject<HTMLDivElement | null>;
  virtualItems: readonly { index: number }[];
  virtualized: boolean;
  visibleComputedColumns: TypeComputedColumn[];
};

/**
 * Imperative scrolling surface (scrollLeft/Top, scrollToIndex/Column/Cell and
 * the render-range probes). Extracted so these callbacks close over this
 * parameter list rather than the whole grid render scope.
 */
export function useGridScrollApi(params: UseGridScrollApiParams) {
  const {
    columnWidthPrefixSums,
    lastImperativeScrollAtRef,
    lockedColumnMetrics,
    resolveRowHeight,
    rowHeight,
    rowModel,
    rowVirtualizer,
    rtl,
    scrollRef,
    stickyHeaderOffset,
    surfaceRef,
    virtualItems,
    virtualized,
    visibleComputedColumns,
  } = params;

  const getScrollingElement = React.useCallback(
    () => scrollRef.current,
    [scrollRef]
  );

  const getScrollLeftCompat = React.useCallback(() => {
    const viewport = scrollRef.current;
    return viewport ? getLogicalScrollLeft(viewport, rtl) : 0;
  }, [rtl, scrollRef]);

  const setScrollLeftCompat = React.useCallback(
    (nextScrollLeft: number) => {
      if (!scrollRef.current) return;
      lastImperativeScrollAtRef.current = window.performance.now();
      setLogicalScrollLeft(scrollRef.current, nextScrollLeft, rtl);
    },
    [rtl, lastImperativeScrollAtRef, scrollRef]
  );

  const incrementScrollLeftCompat = React.useCallback(
    (delta: number) => {
      if (!scrollRef.current) return;
      lastImperativeScrollAtRef.current = window.performance.now();
      setLogicalScrollLeft(
        scrollRef.current,
        getLogicalScrollLeft(scrollRef.current, rtl) + delta,
        rtl
      );
    },
    [rtl, lastImperativeScrollAtRef, scrollRef]
  );

  const setScrollTopCompat = React.useCallback(
    (nextScrollTop: number) => {
      if (!scrollRef.current) return;
      lastImperativeScrollAtRef.current = window.performance.now();
      scrollRef.current.scrollTop = nextScrollTop;
    },
    [lastImperativeScrollAtRef, scrollRef]
  );

  const incrementScrollTopCompat = React.useCallback(
    (delta: number) => {
      if (!scrollRef.current) return;
      lastImperativeScrollAtRef.current = window.performance.now();
      scrollRef.current.scrollTop += delta;
    },
    [lastImperativeScrollAtRef, scrollRef]
  );

  const scrollToIndexCompat = React.useCallback(
    (
      index: number,
      config?: {
        top?: boolean;
        direction?: "top" | "bottom";
        force?: boolean;
        duration?: number;
        offset?: number;
      },
      callback?: (...args: unknown[]) => void
    ) => {
      if (index < 0) return;
      lastImperativeScrollAtRef.current = window.performance.now();

      if (virtualized) {
        const viewport = scrollRef.current;
        if (
          viewport &&
          typeof rowHeight === "number" &&
          Number.isFinite(rowHeight)
        ) {
          let rowStart = 0;
          for (
            let rowIndex = 0;
            rowIndex < Math.min(index, rowModel.length);
            rowIndex += 1
          ) {
            rowStart += resolveRowHeight(rowIndex);
          }
          const resolvedHeight = resolveRowHeight(index);
          viewport.scrollTop =
            config?.direction === "bottom"
              ? stickyHeaderOffset +
                rowStart +
                resolvedHeight -
                viewport.clientHeight
              : rowStart;
        } else {
          rowVirtualizer.scrollToIndex(index, {
            align: config?.direction === "bottom" ? "end" : "start",
          });
        }
      } else {
        const rowNode = surfaceRef.current?.querySelector<HTMLElement>(
          `[data-slot="grid-row"][data-row-index="${index}"]`
        );
        rowNode?.scrollIntoView({
          block: config?.direction === "bottom" ? "end" : "start",
        });
      }

      if (config?.offset && scrollRef.current) {
        scrollRef.current.scrollTop += config.offset;
      }

      callback?.();
    },
    [
      resolveRowHeight,
      rowHeight,
      rowModel.length,
      rowVirtualizer,
      stickyHeaderOffset,
      virtualized,
      lastImperativeScrollAtRef,
      scrollRef,
      surfaceRef,
    ]
  );

  const scrollToColumnCompat = React.useCallback(
    (
      index: number,
      config?: {
        offset?: number;
        duration?: number;
        force?: boolean;
        direction?: "left" | "right" | null;
      },
      callback?: (...args: unknown[]) => void
    ) => {
      const viewport = scrollRef.current;
      const column = visibleComputedColumns[index];
      if (!viewport || !column) return;
      if (column.computedLocked) {
        callback?.();
        return;
      }
      const columnStart =
        index === 0 ? 0 : (columnWidthPrefixSums[index - 1] ?? 0);
      const columnEnd = columnWidthPrefixSums[index] ?? columnStart;
      const offset = config?.offset ?? 0;
      const lockedStartWidth = lockedColumnMetrics.totalLockedStartWidth;
      const lockedEndWidth = lockedColumnMetrics.totalLockedEndWidth;
      const logicalScrollLeft = getLogicalScrollLeft(viewport, rtl);
      const visibleStart = logicalScrollLeft + lockedStartWidth + offset;
      const visibleEnd =
        logicalScrollLeft + viewport.clientWidth - lockedEndWidth - offset;
      let nextScrollLeft = logicalScrollLeft;

      if (config?.direction === "left" || columnStart < visibleStart) {
        nextScrollLeft = columnStart - lockedStartWidth - offset;
      } else if (config?.direction === "right" || columnEnd > visibleEnd) {
        nextScrollLeft =
          columnEnd - viewport.clientWidth + lockedEndWidth + offset;
      }

      setLogicalScrollLeft(
        viewport,
        Math.min(
          Math.max(0, viewport.scrollWidth - viewport.clientWidth),
          Math.max(0, nextScrollLeft)
        ),
        rtl
      );

      callback?.();
    },
    [
      columnWidthPrefixSums,
      lockedColumnMetrics,
      rtl,
      visibleComputedColumns,
      scrollRef,
    ]
  );

  const scrollToCellCompat = React.useCallback(
    (
      cell: { rowIndex: number; columnIndex: number },
      config?: {
        offset?: number;
        left?: boolean;
        right?: boolean;
        top?: boolean;
      }
    ) => {
      scrollToIndexCompat(cell.rowIndex, {
        direction: config?.top === false ? "bottom" : "top",
        offset: config?.offset,
      });

      window.requestAnimationFrame(() => {
        scrollToColumnCompat(cell.columnIndex, {
          offset: config?.offset,
          direction: config?.left ? "left" : config?.right ? "right" : null,
        });
      });
    },
    [scrollToColumnCompat, scrollToIndexCompat]
  );

  const getRenderRangeCompat = React.useCallback(() => {
    if (!virtualized) {
      return {
        from: 0,
        to: Math.max(0, rowModel.length - 1),
      };
    }

    if (virtualItems.length === 0) {
      return { from: 0, to: 0 };
    }

    return {
      from: virtualItems[0]!.index,
      to: virtualItems[virtualItems.length - 1]!.index,
    };
  }, [rowModel.length, virtualItems, virtualized]);

  const isRowRenderedCompat = React.useCallback(
    (rowIndex: number) => {
      return Boolean(
        surfaceRef.current?.querySelector(
          `[data-slot="grid-row"][data-row-index="${rowIndex}"]`
        )
      );
    },
    [surfaceRef]
  );

  const isRowFullyVisibleCompat = React.useCallback(
    (rowIndex: number) => {
      const viewport = scrollRef.current;
      const rowNode = surfaceRef.current?.querySelector<HTMLElement>(
        `[data-slot="grid-row"][data-row-index="${rowIndex}"]`
      );
      if (!viewport || !rowNode) return false;

      const viewportRect = viewport.getBoundingClientRect();
      const rowRect = rowNode.getBoundingClientRect();

      return (
        rowRect.top >= viewportRect.top && rowRect.bottom <= viewportRect.bottom
      );
    },
    [scrollRef, surfaceRef]
  );
  return {
    getRenderRangeCompat,
    getScrollLeftCompat,
    getScrollingElement,
    incrementScrollLeftCompat,
    incrementScrollTopCompat,
    isRowFullyVisibleCompat,
    isRowRenderedCompat,
    scrollToCellCompat,
    scrollToColumnCompat,
    scrollToIndexCompat,
    setScrollLeftCompat,
    setScrollTopCompat,
  };
}
