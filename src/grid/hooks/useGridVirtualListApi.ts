import * as React from "react";
import type { Row } from "@tanstack/react-table";

import type {
  TypeComputedVirtualList,
  TypeComputedVirtualListRow,
} from "../../types";
import { getLogicalScrollLeft, setLogicalScrollLeft } from "../utils/rtlScroll";

/** Only the virtualizer surface this hook needs; keeps the param type narrow. */
type VirtualListRowVirtualizer = {
  getVirtualItems: () => { index: number; start: number; size: number }[];
  getTotalSize: () => number;
  measure: () => void;
  resizeItem: (index: number, size: number) => void;
};

export type UseGridVirtualListApiParams = {
  columnWidthPrefixSums: number[];
  getScrollLeftCompat: () => number;
  getScrollingElement: () => HTMLDivElement | null;
  isRowRenderedCompat: (rowIndex: number) => boolean;
  lastImperativeScrollAtRef: React.MutableRefObject<number>;
  publicProps: unknown;
  resolveRowHeight: (rowIndex: number) => number;
  rowHeight: number | ((rowIndex: number) => number) | null | undefined;
  rowModel: Row<any>[];
  rowVirtualizer: VirtualListRowVirtualizer;
  rtl: boolean;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  scrollToIndexCompat: (
    index: number,
    config?: { direction?: "top" | "bottom" }
  ) => void;
  smoothScrollFrameIdsRef: React.MutableRefObject<Set<number>>;
  stickyHeaderOffset: number;
  surfaceRef: React.RefObject<HTMLDivElement | null>;
  virtualized: boolean;
};

/**
 * The Inovua-compatible `virtualList` object and its measurement getters. It is
 * rebuilt on most renders, so keeping it out of the component scope stops each
 * generation of the object from pinning the previous render's callbacks.
 */
export function useGridVirtualListApi(params: UseGridVirtualListApiParams) {
  const {
    columnWidthPrefixSums,
    getScrollLeftCompat,
    getScrollingElement,
    isRowRenderedCompat,
    lastImperativeScrollAtRef,
    publicProps,
    resolveRowHeight,
    rowHeight,
    rowModel,
    rowVirtualizer,
    rtl,
    scrollRef,
    scrollToIndexCompat,
    smoothScrollFrameIdsRef,
    stickyHeaderOffset,
    surfaceRef,
    virtualized,
  } = params;

  // Non-virtual rows still participate in Inovua's virtual-list compatibility
  // API. Keep their explicit DOM measurements outside React state: the table
  // already lays those rows out naturally, while the imperative getters need
  // to report the same measured sizes immediately after `adjustHeights()`.
  const nonVirtualRowHeightOverridesRef = React.useRef(
    new Map<string, number>()
  );
  React.useEffect(() => {
    const overrides = nonVirtualRowHeightOverridesRef.current;
    if (typeof rowHeight === "number" || virtualized) {
      overrides.clear();
      return;
    }
    if (overrides.size === 0) return;

    const currentRowIds = new Set(rowModel.map((row) => row.id));
    for (const rowId of overrides.keys()) {
      if (!currentRowIds.has(rowId)) overrides.delete(rowId);
    }
  }, [rowHeight, rowModel, virtualized]);
  const getResolvedRowHeightLayout = React.useCallback(() => {
    let start = 0;
    return rowModel.map((row, index) => {
      const size =
        (typeof rowHeight !== "number"
          ? nonVirtualRowHeightOverridesRef.current.get(row.id)
          : undefined) ?? resolveRowHeight(index);
      const item = { index, start, end: start + size, size };
      start += size;
      return item;
    });
  }, [resolveRowHeight, rowHeight, rowModel]);

  const getVirtualListRowsCompat =
    React.useCallback((): TypeComputedVirtualListRow[] => {
      const virtualRows = virtualized
        ? rowVirtualizer.getVirtualItems()
        : getResolvedRowHeightLayout();

      return virtualRows.map((virtualRow) => {
        const row = rowModel[virtualRow.index];
        const start = Math.max(
          0,
          virtualRow.start - (virtualized ? stickyHeaderOffset : 0)
        );
        const end = start + virtualRow.size;

        return {
          id: row?.id ?? virtualRow.index,
          index: virtualRow.index,
          rowIndex: virtualRow.index,
          data: row?.original,
          top: start,
          height: virtualRow.size,
          start,
          end,
        };
      });
    }, [
      getResolvedRowHeightLayout,
      rowModel,
      rowVirtualizer,
      stickyHeaderOffset,
      virtualized,
    ]);

  const getTotalRowHeightCompat = React.useCallback(() => {
    if (virtualized) return rowVirtualizer.getTotalSize();

    const resolvedRowHeightLayout = getResolvedRowHeightLayout();
    return (
      resolvedRowHeightLayout[resolvedRowHeightLayout.length - 1]?.end ?? 0
    );
  }, [getResolvedRowHeightLayout, rowVirtualizer, virtualized]);

  const getScrollHeightCompat = React.useCallback(() => {
    return Math.max(
      scrollRef.current?.scrollHeight ?? 0,
      getTotalRowHeightCompat()
    );
  }, [getTotalRowHeightCompat, scrollRef]);

  const getScrollSizeCompat = React.useCallback(() => {
    return {
      width:
        scrollRef.current?.scrollWidth ??
        columnWidthPrefixSums[columnWidthPrefixSums.length - 1] ??
        0,
      height: getScrollHeightCompat(),
    };
  }, [columnWidthPrefixSums, getScrollHeightCompat, scrollRef]);

  const getClientSizeCompat = React.useCallback(() => {
    return {
      width:
        scrollRef.current?.clientWidth ?? surfaceRef.current?.clientWidth ?? 0,
      height:
        scrollRef.current?.clientHeight ??
        surfaceRef.current?.clientHeight ??
        0,
    };
  }, [scrollRef, surfaceRef]);

  const getVirtualListRangeCompat = React.useCallback(() => {
    const virtualRows = getVirtualListRowsCompat();
    if (virtualRows.length === 0) return { from: 0, to: 0 };

    return {
      from: virtualRows[0]!.index,
      to: virtualRows[virtualRows.length - 1]!.index,
    };
  }, [getVirtualListRowsCompat]);

  const getVirtualListVisibleCountCompat = React.useCallback(() => {
    return getVirtualListRowsCompat().length;
  }, [getVirtualListRowsCompat]);

  const getVirtualListRenderedIndexesCompat = React.useCallback(() => {
    return getVirtualListRowsCompat().map((row) => row.index);
  }, [getVirtualListRowsCompat]);

  const smoothScrollToCompat = React.useCallback<
    TypeComputedVirtualList["smoothScrollTo"]
  >(
    (value, configOrCallback, callback) => {
      const viewport = scrollRef.current;
      if (!viewport || !Number.isFinite(value)) return;

      const config =
        typeof configOrCallback === "function"
          ? undefined
          : (configOrCallback ?? undefined);
      const resolvedCallback =
        typeof configOrCallback === "function" ? configOrCallback : callback;
      const horizontal = config?.orientation === "horizontal";
      const duration = config?.duration ?? 100;
      const initialValue = horizontal
        ? getLogicalScrollLeft(viewport, rtl)
        : viewport.scrollTop;
      const writeValue = (nextValue: number) => {
        lastImperativeScrollAtRef.current = window.performance.now();
        if (horizontal) {
          setLogicalScrollLeft(viewport, nextValue, rtl);
        } else {
          viewport.scrollTop = nextValue;
        }
      };

      if (
        !Number.isFinite(duration) ||
        duration <= 0 ||
        initialValue === value
      ) {
        writeValue(value);
        resolvedCallback?.(value);
        return;
      }

      const scheduleFrame = (frameCallback: FrameRequestCallback) => {
        let frameId = 0;
        frameId = window.requestAnimationFrame((now) => {
          smoothScrollFrameIdsRef.current.delete(frameId);
          frameCallback(now);
        });
        smoothScrollFrameIdsRef.current.add(frameId);
      };
      const startedAt = window.performance.now();
      const difference = value - initialValue;
      const animate = (now: number) => {
        const progress = Math.min(1, (now - startedAt) / duration);
        writeValue(initialValue + difference * progress);

        if (progress < 1) {
          scheduleFrame(animate);
          return;
        }

        writeValue(value);
        resolvedCallback?.(value);
      };

      scheduleFrame(animate);
    },
    [rtl, lastImperativeScrollAtRef, scrollRef, smoothScrollFrameIdsRef]
  );

  const refreshVirtualListLayoutCompat = React.useCallback(() => {
    if (virtualized) {
      rowVirtualizer.measure();
    }
  }, [rowVirtualizer, virtualized]);

  const adjustVirtualListHeightsCompat = React.useCallback((): void => {
    // Inovua only performs manual measurement when row height is variable.
    // A numeric value, including a non-finite one, selects fixed-height mode.
    if (typeof rowHeight === "number") return;

    const rowContainer = scrollRef.current ?? surfaceRef.current;
    rowContainer
      ?.querySelectorAll<HTMLElement>('[data-slot="grid-row"][data-row-index]')
      .forEach((element) => {
        const rowIndex = Number(element.dataset.rowIndex);
        const measuredHeight = element.scrollHeight;
        if (
          !Number.isInteger(rowIndex) ||
          rowIndex < 0 ||
          rowIndex >= rowModel.length ||
          !Number.isFinite(measuredHeight) ||
          measuredHeight <= 0
        ) {
          return;
        }

        if (virtualized) {
          // `measureElement()` also registers the node with TanStack's
          // ResizeObserver/cache. Calling it imperatively for function-height
          // rows (which have no ref cleanup) can retain disconnected DOM nodes
          // after scrolling. Inovua reads `scrollHeight`; `resizeItem()` gives
          // us the same explicit measurement without creating an observer.
          rowVirtualizer.resizeItem(rowIndex, measuredHeight);
          return;
        }

        const row = rowModel[rowIndex];
        if (row) {
          nonVirtualRowHeightOverridesRef.current.set(row.id, measuredHeight);
        }
      });
  }, [rowHeight, rowModel, rowVirtualizer, virtualized, scrollRef, surfaceRef]);

  const virtualListCompat = React.useMemo<TypeComputedVirtualList>(
    () => ({
      props: publicProps as Record<string, unknown>,
      context: {
        rowHeight,
        virtualized,
      },
      refs: {
        container: surfaceRef as React.MutableRefObject<HTMLElement | null>,
        scroller: scrollRef as React.MutableRefObject<HTMLElement | null>,
      },
      get size() {
        return getClientSizeCompat();
      },
      get rows() {
        return getVirtualListRowsCompat();
      },
      get row() {
        return getVirtualListRowsCompat()[0] ?? null;
      },
      get scrollTopPos() {
        return scrollRef.current?.scrollTop ?? 0;
      },
      get scrollLeftPos() {
        return getScrollLeftCompat();
      },
      get prevScrollTopPos() {
        return scrollRef.current?.scrollTop ?? 0;
      },
      get prevScrollLeftPos() {
        return getScrollLeftCompat();
      },
      get visibleCount() {
        return getVirtualListVisibleCountCompat();
      },
      getContainerNode: () => surfaceRef.current,
      getScrollerNode: () => scrollRef.current,
      getScrollingElement,
      getTotalRowHeight: getTotalRowHeightCompat,
      getScrollHeight: getScrollHeightCompat,
      getScrollSize: getScrollSizeCompat,
      getClientSize: getClientSizeCompat,
      getRows: getVirtualListRowsCompat,
      forEachRow: (callback) => {
        getVirtualListRowsCompat().forEach(callback);
      },
      getRowAt: (index) => {
        const virtualRows = getVirtualListRowsCompat();
        return virtualRows.find((row) => row.index === index);
      },
      getVisibleCount: getVirtualListVisibleCountCompat,
      getVisibleRange: getVirtualListRangeCompat,
      setRowIndex: (index) => scrollToIndexCompat(index),
      scrollToIndex: scrollToIndexCompat,
      smoothScrollTo: smoothScrollToCompat,
      adjustHeights: adjustVirtualListHeightsCompat,
      refreshLayout: refreshVirtualListLayoutCompat,
      updateVisibleCount: getVirtualListVisibleCountCompat,
      isRowRendered: isRowRenderedCompat,
      isRowVisible: (rowIndex) => {
        const range = getVirtualListRangeCompat();
        return rowIndex >= range.from && rowIndex <= range.to;
      },
      getRenderedIndexes: getVirtualListRenderedIndexesCompat,
      getMaxRenderCount: getVirtualListVisibleCountCompat,
    }),
    [
      adjustVirtualListHeightsCompat,
      getClientSizeCompat,
      getScrollLeftCompat,
      getScrollingElement,
      getScrollHeightCompat,
      getScrollSizeCompat,
      getTotalRowHeightCompat,
      getVirtualListRangeCompat,
      getVirtualListRenderedIndexesCompat,
      getVirtualListRowsCompat,
      getVirtualListVisibleCountCompat,
      isRowRenderedCompat,
      publicProps,
      refreshVirtualListLayoutCompat,
      rowHeight,
      scrollToIndexCompat,
      smoothScrollToCompat,
      virtualized,
      scrollRef,
      surfaceRef,
    ]
  );
  return {
    adjustVirtualListHeightsCompat,
    getClientSizeCompat,
    getScrollHeightCompat,
    getScrollSizeCompat,
    getTotalRowHeightCompat,
    getVirtualListRangeCompat,
    getVirtualListRenderedIndexesCompat,
    getVirtualListRowsCompat,
    getVirtualListVisibleCountCompat,
    refreshVirtualListLayoutCompat,
    smoothScrollToCompat,
    virtualListCompat,
  };
}
