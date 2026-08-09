import * as React from "react";
import type { Row } from "@tanstack/react-table";

import type {
  TypeActiveCell,
  TypeCellSelection,
  TypeColumn,
  TypeComputedProps,
  TypeDataGridProps,
  TypeTryStartEditArgs,
} from "../../types";
import { getColumnId } from "../../utils/column";
import { clamp } from "../../utils/helpers";
import { isInteractiveClickTarget } from "../utils/gridUtils";
import { REACT_DATA_GRID_DEFAULT_PROPS } from "../gridDefaultProps";

export type UseGridKeyboardNavigationParams = {
  activateRowOnFocus: boolean;
  allowRowTabNavigation: boolean;
  apiRef: React.MutableRefObject<TypeComputedProps | null>;
  cellMultiSelect: boolean;
  cellSelectionAnchorRef: React.MutableRefObject<TypeActiveCell>;
  cellSelectionEnabled: boolean;
  cellSelectionState: TypeCellSelection;
  commitRowSelection: (
    rowIndex: number,
    options?: {
      checked?: boolean;
      ctrlKey?: boolean;
      metaKey?: boolean;
      shiftKey?: boolean;
      fromCheckbox?: boolean;
    }
  ) => void;
  enableKeyboardNavigation: boolean;
  getCellSelectionKey: (rowIndex: number, columnIndex: number) => string;
  getRenderRangeCompat: () => { from: number; to: number };
  gridFocused: boolean;
  incrementActiveIndex: (increment: number) => void;
  incrementScrollLeftCompat: (delta: number) => void;
  isRowFullyVisibleCompat: (rowIndex: number) => boolean;
  isStartEditKeyPressed: NonNullable<
    TypeDataGridProps["isStartEditKeyPressed"]
  >;
  keyPageStep: number;
  lastActiveIndexRef: React.MutableRefObject<number | null>;
  moveActiveCellQueue: (nextCell: TypeActiveCell) => void;
  normalizedActiveCell: TypeActiveCell;
  normalizedActiveIndex: number;
  onBlurProp: React.FocusEventHandler<HTMLDivElement> | undefined;
  onFocusProp: React.FocusEventHandler<HTMLDivElement> | undefined;
  onKeyDownProp: React.KeyboardEventHandler<HTMLDivElement> | undefined;
  onRowContextMenu: TypeDataGridProps["onRowContextMenu"];
  orderedColumns: TypeColumn[];
  pendingActiveCellRef: React.MutableRefObject<TypeActiveCell>;
  renderRowContextMenu: TypeDataGridProps["renderRowContextMenu"];
  resolveRowHeight: (rowIndex: number) => number;
  rootRef: React.RefObject<HTMLDivElement | null>;
  rowModel: Row<any>[];
  rows: any[];
  rtl: boolean;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  scrollToCellCompat: (
    cell: { rowIndex: number; columnIndex: number },
    config?: { offset?: number; left?: boolean; right?: boolean; top?: boolean }
  ) => void;
  scrollToIndexCompat: (
    index: number,
    config?: { direction?: "top" | "bottom" }
  ) => void;
  selectCellRange: (
    start: Exclude<TypeActiveCell, null>,
    end: Exclude<TypeActiveCell, null>,
    preserveCurrent?: boolean
  ) => void;
  selectableCellColumnIndexes: number[];
  selectionEnabled: boolean;
  setActiveIndexCompat: (nextActiveIndex: number) => void;
  setCellSelectionState: (next: TypeCellSelection) => void;
  setGridFocused: React.Dispatch<React.SetStateAction<boolean>>;
  surfaceRef: React.RefObject<HTMLDivElement | null>;
  toggleCellSelectOnClick: boolean;
  tryStartEditCompat: (args: TypeTryStartEditArgs) => Promise<any>;
};

/**
 * Focus, keyboard navigation and the focus-follows-active scroll sync.
 *
 * `handleGridKeyDown` reaches almost every other feature of the grid, so it is
 * the single closure most likely to pin a whole render generation. Giving it
 * its own module bounds what it can capture to the parameters below.
 */
export function useGridKeyboardNavigation(
  params: UseGridKeyboardNavigationParams
) {
  const {
    activateRowOnFocus,
    allowRowTabNavigation,
    apiRef,
    cellMultiSelect,
    cellSelectionAnchorRef,
    cellSelectionEnabled,
    cellSelectionState,
    commitRowSelection,
    enableKeyboardNavigation,
    getCellSelectionKey,
    getRenderRangeCompat,
    gridFocused,
    incrementActiveIndex,
    incrementScrollLeftCompat,
    isRowFullyVisibleCompat,
    isStartEditKeyPressed,
    keyPageStep,
    lastActiveIndexRef,
    moveActiveCellQueue: queueActiveCell,
    normalizedActiveCell,
    normalizedActiveIndex,
    onBlurProp,
    onFocusProp,
    onKeyDownProp,
    onRowContextMenu,
    orderedColumns,
    pendingActiveCellRef,
    renderRowContextMenu,
    resolveRowHeight,
    rootRef,
    rowModel,
    rows,
    rtl,
    scrollRef,
    scrollToCellCompat,
    scrollToIndexCompat,
    selectCellRange,
    selectableCellColumnIndexes,
    selectionEnabled,
    setActiveIndexCompat,
    setCellSelectionState,
    setGridFocused,
    surfaceRef,
    toggleCellSelectOnClick,
    tryStartEditCompat,
  } = params;

  /**
   * Pressing a row focuses the surface on pointerdown, before the row's own
   * click handler runs, so activateRowOnFocus would light up the first visible
   * row and the click would immediately move it — a flash on the wrong row.
   * Scoped to the press in flight: a press while already focused fires no focus
   * event to consume it, and a stale flag would swallow the next focus restore.
   */
  const pointerActivatesRowRef = React.useRef(false);

  const handleGridPointerDownCapture = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const target = event.target;
      pointerActivatesRowRef.current =
        target instanceof Element &&
        Boolean(target.closest('[data-slot="grid-row"]'));
    },
    []
  );

  const clearPointerActivatesRow = React.useCallback(() => {
    pointerActivatesRowRef.current = false;
  }, []);

  const handleGridFocus = React.useCallback(
    (event: React.FocusEvent<HTMLDivElement>) => {
      onFocusProp?.(event);
      if (event.defaultPrevented) return;

      const relatedTarget = event.relatedTarget;
      if (
        relatedTarget instanceof Node &&
        rootRef.current?.contains(relatedTarget)
      ) {
        return;
      }

      const pressedRow = pointerActivatesRowRef.current;
      pointerActivatesRowRef.current = false;

      setGridFocused(true);
      if (
        !pressedRow &&
        enableKeyboardNavigation &&
        activateRowOnFocus &&
        normalizedActiveIndex < 0 &&
        rows.length > 0
      ) {
        const visibleIndex = getRenderRangeCompat().from;
        const restoredIndex = lastActiveIndexRef.current;
        setActiveIndexCompat(
          restoredIndex != null &&
            restoredIndex >= 0 &&
            restoredIndex < rows.length
            ? restoredIndex
            : clamp(visibleIndex, 0, rows.length - 1)
        );
      }
    },
    [
      activateRowOnFocus,
      enableKeyboardNavigation,
      getRenderRangeCompat,
      normalizedActiveIndex,
      onFocusProp,
      rows.length,
      setActiveIndexCompat,
      lastActiveIndexRef,
      rootRef,
      setGridFocused,
    ]
  );

  const handleGridBlur = React.useCallback(
    (event: React.FocusEvent<HTMLDivElement>) => {
      const relatedTarget = event.relatedTarget;
      if (
        relatedTarget instanceof Node &&
        rootRef.current?.contains(relatedTarget)
      ) {
        return;
      }

      // A press that released outside the grid never reached the pointer-up.
      pointerActivatesRowRef.current = false;

      onBlurProp?.(event);
      if (event.defaultPrevented) return;

      if (normalizedActiveIndex >= 0) {
        lastActiveIndexRef.current = normalizedActiveIndex;
      }
      setGridFocused(false);
      setActiveIndexCompat(-1);
    },
    [
      normalizedActiveIndex,
      onBlurProp,
      setActiveIndexCompat,
      lastActiveIndexRef,
      rootRef,
      setGridFocused,
    ]
  );

  const moveActiveCell = React.useCallback(
    (
      event: Pick<
        React.KeyboardEvent<HTMLDivElement>,
        "key" | "shiftKey" | "ctrlKey" | "metaKey"
      >
    ): boolean => {
      if (
        !cellSelectionEnabled ||
        rows.length === 0 ||
        selectableCellColumnIndexes.length === 0
      ) {
        return false;
      }
      const current =
        pendingActiveCellRef.current ??
        normalizedActiveCell ??
        ([0, selectableCellColumnIndexes[0]!] as const);
      let rowIndex = current[0];
      let selectableIndex = Math.max(
        0,
        selectableCellColumnIndexes.indexOf(current[1])
      );
      const pageStep =
        typeof keyPageStep === "number" && Number.isFinite(keyPageStep)
          ? Math.max(1, Math.trunc(keyPageStep))
          : REACT_DATA_GRID_DEFAULT_PROPS.keyPageStep;

      switch (event.key) {
        case "ArrowUp":
          rowIndex -= 1;
          break;
        case "ArrowDown":
          rowIndex += 1;
          break;
        case "ArrowLeft":
          selectableIndex -= 1;
          break;
        case "ArrowRight":
          selectableIndex += 1;
          break;
        case "Home":
          if (event.ctrlKey || event.metaKey) rowIndex = 0;
          selectableIndex = 0;
          break;
        case "End":
          if (event.ctrlKey || event.metaKey) rowIndex = rows.length - 1;
          selectableIndex = selectableCellColumnIndexes.length - 1;
          break;
        case "PageUp":
          rowIndex -= pageStep;
          break;
        case "PageDown":
          rowIndex += pageStep;
          break;
        case "Tab":
          selectableIndex += event.shiftKey ? -1 : 1;
          if (selectableIndex < 0) {
            if (rowIndex === 0) return false;
            rowIndex -= 1;
            selectableIndex = selectableCellColumnIndexes.length - 1;
          } else if (selectableIndex >= selectableCellColumnIndexes.length) {
            if (rowIndex === rows.length - 1) return false;
            rowIndex += 1;
            selectableIndex = 0;
          }
          break;
        case "Enter": {
          const key = getCellSelectionKey(current[0], current[1]);
          const next = cellMultiSelect ? { ...(cellSelectionState ?? {}) } : {};
          if (next[key] && toggleCellSelectOnClick) delete next[key];
          else next[key] = true;
          setCellSelectionState(next);
          return true;
        }
        default:
          return false;
      }

      rowIndex = clamp(rowIndex, 0, rows.length - 1);
      selectableIndex = clamp(
        selectableIndex,
        0,
        selectableCellColumnIndexes.length - 1
      );
      const next: Exclude<TypeActiveCell, null> = [
        rowIndex,
        selectableCellColumnIndexes[selectableIndex]!,
      ];
      if (cellMultiSelect && event.shiftKey && event.key !== "Tab") {
        const anchor = cellSelectionAnchorRef.current ?? current;
        selectCellRange(anchor, next);
      } else {
        cellSelectionAnchorRef.current = next;
      }
      queueActiveCell(next);
      return true;
    },
    [
      cellSelectionEnabled,
      cellSelectionState,
      cellMultiSelect,
      getCellSelectionKey,
      keyPageStep,
      normalizedActiveCell,
      queueActiveCell,
      rows.length,
      selectCellRange,
      selectableCellColumnIndexes,
      setCellSelectionState,
      toggleCellSelectOnClick,
      cellSelectionAnchorRef,
      pendingActiveCellRef,
    ]
  );

  const scrollViewportFromKeyboard = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const viewport = scrollRef.current;
      if (!viewport) return false;

      const verticalStep = Math.max(24, resolveRowHeight(0));
      const horizontalStep = Math.max(24, Math.round(viewport.clientWidth / 8));
      switch (event.key) {
        case "ArrowUp":
          viewport.scrollTop -= verticalStep;
          return true;
        case "ArrowDown":
          viewport.scrollTop += verticalStep;
          return true;
        case "ArrowLeft":
          incrementScrollLeftCompat(rtl ? horizontalStep : -horizontalStep);
          return true;
        case "ArrowRight":
          incrementScrollLeftCompat(rtl ? -horizontalStep : horizontalStep);
          return true;
        case "PageUp":
          viewport.scrollTop -= Math.max(verticalStep, viewport.clientHeight);
          return true;
        case "PageDown":
          viewport.scrollTop += Math.max(verticalStep, viewport.clientHeight);
          return true;
        case "Home":
          viewport.scrollTop = 0;
          return true;
        case "End":
          viewport.scrollTop = viewport.scrollHeight;
          return true;
        default:
          return false;
      }
    },
    [incrementScrollLeftCompat, resolveRowHeight, rtl, scrollRef]
  );

  const handleGridKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      onKeyDownProp?.(event);
      const eventTarget = event.target as HTMLElement | null;
      if (
        !event.defaultPrevented &&
        eventTarget === surfaceRef.current &&
        rowModel.length > 0 &&
        orderedColumns.length > 0
      ) {
        const rowIndex =
          normalizedActiveCell?.[0] ??
          (normalizedActiveIndex < 0 ? 0 : normalizedActiveIndex);
        const columnIndex = normalizedActiveCell?.[1] ?? 0;
        const activeItem = rowModel[rowIndex]?.original;
        let requestsEdit = false;
        try {
          requestsEdit = Boolean(
            isStartEditKeyPressed({
              event,
              data: activeItem,
              index: rowIndex,
              activeItem,
              activeIndex: rowIndex,
              handle: apiRef,
              rowSelectionEnabled: selectionEnabled,
            })
          );
        } catch {
          requestsEdit = false;
        }

        if (requestsEdit) {
          const column = orderedColumns[columnIndex] ?? orderedColumns[0];
          if (column) {
            event.preventDefault();
            void tryStartEditCompat({
              rowIndex,
              columnId: getColumnId(column),
              dir: 1,
            }).catch(() => undefined);
            return;
          }
        }
      }
      const requestsContextMenu =
        event.key === "ContextMenu" || (event.key === "F10" && event.shiftKey);
      if (
        !event.defaultPrevented &&
        requestsContextMenu &&
        (renderRowContextMenu || onRowContextMenu) &&
        rows.length > 0 &&
        !isInteractiveClickTarget(event.target as HTMLElement | null)
      ) {
        const rowIndex = normalizedActiveIndex < 0 ? 0 : normalizedActiveIndex;
        const rowNode = rootRef.current?.querySelector<HTMLElement>(
          `[data-slot="grid-row"][data-row-index="${rowIndex}"]`
        );
        if (rowNode) {
          const rect = rowNode.getBoundingClientRect();
          event.preventDefault();
          rowNode.dispatchEvent(
            new MouseEvent("contextmenu", {
              bubbles: true,
              cancelable: true,
              clientX: rect.left + Math.min(24, rect.width / 2),
              clientY: rect.top + Math.min(24, rect.height / 2),
            })
          );
          return;
        }
      }
      if (
        event.defaultPrevented ||
        rows.length === 0 ||
        isInteractiveClickTarget(event.target as HTMLElement | null)
      ) {
        return;
      }

      if (moveActiveCell(event)) {
        event.preventDefault();
        return;
      }

      if (!enableKeyboardNavigation) {
        if (scrollViewportFromKeyboard(event)) event.preventDefault();
        return;
      }

      const currentIndex =
        normalizedActiveIndex < 0 ? 0 : normalizedActiveIndex;
      const pageStep =
        typeof keyPageStep === "number" && Number.isFinite(keyPageStep)
          ? Math.max(1, Math.trunc(keyPageStep))
          : REACT_DATA_GRID_DEFAULT_PROPS.keyPageStep;
      let handled = true;

      switch (event.key) {
        case "ArrowUp":
          incrementActiveIndex(-1);
          break;
        case "ArrowDown":
          incrementActiveIndex(1);
          break;
        case "Home":
          setActiveIndexCompat(0);
          break;
        case "End":
          setActiveIndexCompat(rows.length - 1);
          break;
        case "PageUp":
          incrementActiveIndex(-pageStep);
          break;
        case "PageDown":
          incrementActiveIndex(pageStep);
          break;
        case "Enter":
          commitRowSelection(currentIndex, {
            ctrlKey: event.ctrlKey,
            metaKey: event.metaKey,
            shiftKey: event.shiftKey,
          });
          break;
        case "Tab": {
          if (!allowRowTabNavigation) {
            handled = false;
            break;
          }

          const nextIndex = currentIndex + (event.shiftKey ? -1 : 1);
          if (nextIndex < 0 || nextIndex >= rows.length) {
            handled = false;
            break;
          }
          setActiveIndexCompat(nextIndex);
          break;
        }
        default:
          handled = false;
      }

      if (handled) event.preventDefault();
    },
    [
      allowRowTabNavigation,
      commitRowSelection,
      enableKeyboardNavigation,
      incrementActiveIndex,
      keyPageStep,
      isStartEditKeyPressed,
      moveActiveCell,
      normalizedActiveCell,
      normalizedActiveIndex,
      onKeyDownProp,
      onRowContextMenu,
      orderedColumns,
      renderRowContextMenu,
      rowModel,
      rows.length,
      selectionEnabled,
      setActiveIndexCompat,
      scrollViewportFromKeyboard,
      tryStartEditCompat,
      apiRef,
      rootRef,
      surfaceRef,
    ]
  );

  const previousScrolledActiveIndexRef = React.useRef(-1);
  React.useLayoutEffect(() => {
    if (!gridFocused || normalizedActiveIndex < 0) return;

    const previousIndex = previousScrolledActiveIndexRef.current;
    previousScrolledActiveIndexRef.current = normalizedActiveIndex;
    if (isRowFullyVisibleCompat(normalizedActiveIndex)) return;

    scrollToIndexCompat(normalizedActiveIndex, {
      direction:
        previousIndex >= 0 && normalizedActiveIndex < previousIndex
          ? "top"
          : "bottom",
    });
  }, [
    gridFocused,
    isRowFullyVisibleCompat,
    normalizedActiveIndex,
    scrollToIndexCompat,
  ]);

  const previousScrolledActiveCellRef = React.useRef<TypeActiveCell>(null);
  React.useLayoutEffect(() => {
    if (!gridFocused || !normalizedActiveCell) return;
    const previous = previousScrolledActiveCellRef.current;
    previousScrolledActiveCellRef.current = normalizedActiveCell;
    scrollToCellCompat(
      {
        rowIndex: normalizedActiveCell[0],
        columnIndex: normalizedActiveCell[1],
      },
      {
        top: previous == null || normalizedActiveCell[0] <= previous[0],
        left: previous == null || normalizedActiveCell[1] <= previous[1],
        right: previous != null && normalizedActiveCell[1] > previous[1],
      }
    );
  }, [gridFocused, normalizedActiveCell, scrollToCellCompat]);
  return {
    clearPointerActivatesRow,
    handleGridBlur,
    handleGridFocus,
    handleGridKeyDown,
    handleGridPointerDownCapture,
    moveActiveCell,
    scrollViewportFromKeyboard,
  };
}
