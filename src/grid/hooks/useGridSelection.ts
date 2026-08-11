import * as React from "react";

import type {
  TypeActiveCell,
  TypeCellSelection,
  TypeColumn,
  TypeDataGridProps,
  TypeRowSelection,
} from "../../types";
import { getColumnId } from "../../utils/column";
import { clamp } from "../../utils/helpers";
import { isInteractiveClickTarget } from "../utils/gridUtils";

export type UseGridSelectionParams = {
  activeCellState: TypeActiveCell;
  activeCellThrottle: number | undefined;
  activeCellThrottleTimerRef: React.MutableRefObject<number | null>;
  activeIndexState: number;
  activeIndexThrottle: number | undefined;
  activeIndexThrottleTimerRef: React.MutableRefObject<number | null>;
  cellMultiSelect: boolean;
  cellSelectionAnchorRef: React.MutableRefObject<TypeActiveCell>;
  cellSelectionByIndex: boolean;
  cellSelectionEnabled: boolean;
  cellSelectionState: TypeCellSelection;
  checkboxColId: string;
  checkboxOnlyRowSelect: boolean;
  checkboxSelectEnableShiftKey: boolean;
  dataSource: TypeDataGridProps["dataSource"];
  emitSelectionChange: (
    nextSelected: TypeRowSelection,
    meta?: { data?: unknown; unselected?: TypeRowSelection }
  ) => void;
  enableKeyboardNavigation: boolean;
  getRowKey: (row: any, index: number) => string;
  lastSelectedIndexRef: React.MutableRefObject<number | null>;
  multiSelect: boolean | undefined;
  normalizedSelected: TypeRowSelection;
  orderedColumns: TypeColumn[];
  paginationMode: TypeDataGridProps["pagination"];
  pendingActiveCellRef: React.MutableRefObject<TypeActiveCell>;
  pendingActiveIndexRef: React.MutableRefObject<number | null>;
  rows: any[];
  selectedMap: Record<string, any>;
  selectionEnabled: boolean;
  selectionRangeBaseRef: React.MutableRefObject<Record<string, any> | null>;
  setActiveCellState: (next: TypeActiveCell) => void;
  setActiveIndexState: (next: number) => void;
  setCellSelectionState: (next: TypeCellSelection) => void;
  surfaceRef: React.RefObject<HTMLDivElement | null>;
  toggleCellSelectOnClick: boolean;
  toggleRowSelectOnClick: boolean;
  unselected: Record<string, any> | null | undefined;
};

/**
 * Owns active cell / cell selection / row selection. These callbacks form the
 * `incrementActiveIndex -> setActiveIndexCompat -> ...` chains that previously
 * captured the whole grid scope, so they get their own module and an explicit
 * parameter list.
 */
export function useGridSelection(params: UseGridSelectionParams) {
  const {
    activeCellState,
    activeCellThrottle,
    activeCellThrottleTimerRef,
    activeIndexState,
    activeIndexThrottle,
    activeIndexThrottleTimerRef,
    cellMultiSelect,
    cellSelectionAnchorRef,
    cellSelectionByIndex,
    cellSelectionEnabled,
    cellSelectionState,
    checkboxColId,
    checkboxOnlyRowSelect,
    checkboxSelectEnableShiftKey,
    dataSource,
    emitSelectionChange,
    enableKeyboardNavigation,
    getRowKey,
    lastSelectedIndexRef,
    multiSelect,
    normalizedSelected,
    orderedColumns,
    paginationMode,
    pendingActiveCellRef,
    pendingActiveIndexRef,
    rows,
    selectedMap,
    selectionEnabled,
    selectionRangeBaseRef,
    setActiveCellState,
    setActiveIndexState,
    setCellSelectionState,
    surfaceRef,
    toggleCellSelectOnClick,
    toggleRowSelectOnClick,
    unselected,
  } = params;

  const selectableCellColumnIndexes = React.useMemo(
    () =>
      orderedColumns.flatMap((column, columnIndex) =>
        getColumnId(column) !== checkboxColId && column.cellSelectable !== false
          ? [columnIndex]
          : []
      ),
    [checkboxColId, orderedColumns]
  );
  const normalizeActiveCell = React.useCallback(
    (cell: TypeActiveCell): TypeActiveCell => {
      if (
        !cellSelectionEnabled ||
        cell == null ||
        rows.length === 0 ||
        selectableCellColumnIndexes.length === 0
      ) {
        return null;
      }

      const rowIndex = clamp(Math.trunc(cell[0]), 0, rows.length - 1);
      const requestedColumnIndex = clamp(
        Math.trunc(cell[1]),
        0,
        orderedColumns.length - 1
      );
      const columnIndex = selectableCellColumnIndexes.reduce(
        (best, candidate) =>
          Math.abs(candidate - requestedColumnIndex) <
          Math.abs(best - requestedColumnIndex)
            ? candidate
            : best,
        selectableCellColumnIndexes[0]!
      );
      return [rowIndex, columnIndex];
    },
    [
      cellSelectionEnabled,
      orderedColumns.length,
      rows.length,
      selectableCellColumnIndexes,
    ]
  );
  const normalizedActiveCell = React.useMemo(
    () => normalizeActiveCell(activeCellState),
    [activeCellState, normalizeActiveCell]
  );
  const previousActiveCellStateRef =
    React.useRef<TypeActiveCell>(activeCellState);
  const getCellSelectionKey = React.useCallback(
    (rowIndex: number, columnIndex: number) => {
      if (cellSelectionByIndex) return `${rowIndex},${columnIndex}`;
      const row = rows[rowIndex];
      const column = orderedColumns[columnIndex];
      if (!row || !column) return "";
      return `${getRowKey(row, rowIndex)},${getColumnId(column)}`;
    },
    [cellSelectionByIndex, getRowKey, orderedColumns, rows]
  );
  const isCellSelected = React.useCallback(
    (rowIndex: number, columnIndex: number) => {
      const key = getCellSelectionKey(rowIndex, columnIndex);
      return Boolean(key && cellSelectionState?.[key]);
    },
    [cellSelectionState, getCellSelectionKey]
  );
  const activeCellIdentityRef = React.useRef<{
    rowId: string;
    columnId: string;
  } | null>(null);
  const setActiveCellCompat = React.useCallback(
    (nextCell: TypeActiveCell) => {
      const next = normalizeActiveCell(nextCell);
      pendingActiveCellRef.current = next;
      if (next) {
        const row = rows[next[0]];
        const column = orderedColumns[next[1]];
        activeCellIdentityRef.current =
          row && column
            ? {
                rowId: getRowKey(row, next[0]),
                columnId: getColumnId(column),
              }
            : null;
      } else {
        activeCellIdentityRef.current = null;
      }
      if (
        next?.[0] === normalizedActiveCell?.[0] &&
        next?.[1] === normalizedActiveCell?.[1]
      ) {
        return;
      }
      setActiveCellState(next);
    },
    [
      getRowKey,
      normalizeActiveCell,
      normalizedActiveCell,
      orderedColumns,
      rows,
      setActiveCellState,
      pendingActiveCellRef,
    ]
  );
  const queueActiveCell = React.useCallback(
    (nextCell: TypeActiveCell) => {
      const next = normalizeActiveCell(nextCell);
      pendingActiveCellRef.current = next;
      const delay =
        typeof activeCellThrottle === "number" &&
        Number.isFinite(activeCellThrottle)
          ? Math.max(0, activeCellThrottle)
          : 0;
      if (delay === 0) {
        setActiveCellCompat(next);
        return;
      }
      if (activeCellThrottleTimerRef.current != null) return;
      activeCellThrottleTimerRef.current = window.setTimeout(() => {
        activeCellThrottleTimerRef.current = null;
        setActiveCellCompat(pendingActiveCellRef.current);
      }, delay);
    },
    [
      activeCellThrottle,
      normalizeActiveCell,
      setActiveCellCompat,
      activeCellThrottleTimerRef,
      pendingActiveCellRef,
    ]
  );
  const selectCellRange = React.useCallback(
    (
      start: Exclude<TypeActiveCell, null>,
      end: Exclude<TypeActiveCell, null>,
      preserveCurrent = false
    ) => {
      const next: Record<string, boolean> = preserveCurrent
        ? { ...(cellSelectionState ?? {}) }
        : {};
      const fromRow = Math.min(start[0], end[0]);
      const toRow = Math.max(start[0], end[0]);
      const fromColumn = Math.min(start[1], end[1]);
      const toColumn = Math.max(start[1], end[1]);

      for (let rowIndex = fromRow; rowIndex <= toRow; rowIndex += 1) {
        for (
          let columnIndex = fromColumn;
          columnIndex <= toColumn;
          columnIndex += 1
        ) {
          if (!selectableCellColumnIndexes.includes(columnIndex)) continue;
          const key = getCellSelectionKey(rowIndex, columnIndex);
          if (key) next[key] = true;
        }
      }
      setCellSelectionState(next);
    },
    [
      cellSelectionState,
      getCellSelectionKey,
      selectableCellColumnIndexes,
      setCellSelectionState,
    ]
  );
  const getCellSelectionBetweenCompat = React.useCallback(
    (
      start: Exclude<TypeActiveCell, null> | null = normalizedActiveCell,
      end: Exclude<TypeActiveCell, null> | null = normalizedActiveCell
    ) => {
      if (!start || !end) return {};

      const selection: Record<string, boolean> = {};
      const fromRow = Math.min(start[0], end[0]);
      const toRow = Math.max(start[0], end[0]);
      const fromColumn = Math.min(start[1], end[1]);
      const toColumn = Math.max(start[1], end[1]);

      for (let rowIndex = fromRow; rowIndex <= toRow; rowIndex += 1) {
        for (
          let columnIndex = fromColumn;
          columnIndex <= toColumn;
          columnIndex += 1
        ) {
          if (!selectableCellColumnIndexes.includes(columnIndex)) continue;
          const key = getCellSelectionKey(rowIndex, columnIndex);
          if (key) selection[key] = true;
        }
      }

      return selection;
    },
    [getCellSelectionKey, normalizedActiveCell, selectableCellColumnIndexes]
  );
  const incrementActiveCellCompat = React.useCallback(
    (direction: [number, number]) => {
      const current =
        normalizedActiveCell ??
        (rows.length > 0 && selectableCellColumnIndexes.length > 0
          ? ([0, selectableCellColumnIndexes[0]!] as const)
          : null);
      if (!current) return;
      setActiveCellCompat([
        current[0] + (direction[0] ?? 0),
        current[1] + (direction[1] ?? 0),
      ]);
    },
    [
      normalizedActiveCell,
      rows.length,
      selectableCellColumnIndexes,
      setActiveCellCompat,
    ]
  );
  const toggleActiveCellSelectionCompat = React.useCallback(
    (
      event: {
        shiftKey?: boolean;
        ctrlKey?: boolean;
        metaKey?: boolean;
      } = {}
    ) => {
      if (!normalizedActiveCell) return;

      const preserveCurrent =
        cellMultiSelect && Boolean(event.ctrlKey || event.metaKey);
      if (cellMultiSelect && event.shiftKey && cellSelectionAnchorRef.current) {
        const range = getCellSelectionBetweenCompat(
          cellSelectionAnchorRef.current,
          normalizedActiveCell
        );
        setCellSelectionState(
          preserveCurrent ? { ...(cellSelectionState ?? {}), ...range } : range
        );
        return;
      }

      const key = getCellSelectionKey(
        normalizedActiveCell[0],
        normalizedActiveCell[1]
      );
      if (!key) return;
      const next = preserveCurrent ? { ...(cellSelectionState ?? {}) } : {};
      if (cellSelectionState?.[key]) delete next[key];
      else next[key] = true;
      cellSelectionAnchorRef.current = normalizedActiveCell;
      setCellSelectionState(next);
    },
    [
      cellMultiSelect,
      cellSelectionState,
      getCellSelectionBetweenCompat,
      getCellSelectionKey,
      normalizedActiveCell,
      setCellSelectionState,
      cellSelectionAnchorRef,
    ]
  );
  const handleCellSelectionPointer = React.useCallback(
    (
      rowIndex: number,
      columnIndex: number,
      event: Pick<
        React.PointerEvent<HTMLTableCellElement>,
        "button" | "ctrlKey" | "metaKey" | "shiftKey"
      >
    ) => {
      if (!cellSelectionEnabled || event.button !== 0) return;
      if (!selectableCellColumnIndexes.includes(columnIndex)) return;
      const next = normalizeActiveCell([rowIndex, columnIndex]);
      if (!next) return;

      const additive = cellMultiSelect && (event.ctrlKey || event.metaKey);
      if (cellMultiSelect && event.shiftKey && cellSelectionAnchorRef.current) {
        selectCellRange(cellSelectionAnchorRef.current, next, additive);
      } else {
        const key = getCellSelectionKey(next[0], next[1]);
        const currentSelected = Boolean(key && cellSelectionState?.[key]);
        const selection = additive ? { ...(cellSelectionState ?? {}) } : {};
        if (currentSelected && toggleCellSelectOnClick) {
          delete selection[key];
        } else {
          selection[key] = true;
        }
        setCellSelectionState(selection);
        cellSelectionAnchorRef.current = next;
      }
      queueActiveCell(next);
    },
    [
      cellSelectionEnabled,
      cellSelectionState,
      cellMultiSelect,
      getCellSelectionKey,
      normalizeActiveCell,
      queueActiveCell,
      selectCellRange,
      selectableCellColumnIndexes,
      setCellSelectionState,
      toggleCellSelectOnClick,
      cellSelectionAnchorRef,
    ]
  );

  React.useLayoutEffect(() => {
    const previousState = previousActiveCellStateRef.current;
    const stateCoordinatesChanged =
      previousState?.[0] !== activeCellState?.[0] ||
      previousState?.[1] !== activeCellState?.[1];
    previousActiveCellStateRef.current = activeCellState;

    if (!normalizedActiveCell) {
      activeCellIdentityRef.current = null;
      return;
    }
    const [rowIndex, columnIndex] = normalizedActiveCell;
    const row = rows[rowIndex];
    const column = orderedColumns[columnIndex];
    if (!row || !column) return;
    const currentIdentity = {
      rowId: getRowKey(row, rowIndex),
      columnId: getColumnId(column),
    };
    const stateNeedsNormalization =
      activeCellState?.[0] !== normalizedActiveCell[0] ||
      activeCellState?.[1] !== normalizedActiveCell[1];
    // Controlled consumers can intentionally move the active cell. Treat an
    // explicit coordinate change as authoritative; identity preservation below
    // is reserved for data and column transformations.
    if (stateCoordinatesChanged) {
      activeCellIdentityRef.current = currentIdentity;
      if (stateNeedsNormalization) {
        setActiveCellState(normalizedActiveCell);
      }
      return;
    }
    const previousIdentity = activeCellIdentityRef.current;
    if (!previousIdentity) {
      activeCellIdentityRef.current = currentIdentity;
      return;
    }
    if (
      previousIdentity.rowId === currentIdentity.rowId &&
      previousIdentity.columnId === currentIdentity.columnId
    ) {
      if (stateNeedsNormalization) {
        setActiveCellState(normalizedActiveCell);
      }
      return;
    }
    const nextRowIndex = rows.findIndex(
      (candidate, index) =>
        getRowKey(candidate, index) === previousIdentity.rowId
    );
    const nextColumnIndex = orderedColumns.findIndex(
      (candidate) => getColumnId(candidate) === previousIdentity.columnId
    );
    if (nextRowIndex >= 0 && nextColumnIndex >= 0) {
      setActiveCellState([nextRowIndex, nextColumnIndex]);
      return;
    }
    activeCellIdentityRef.current = currentIdentity;
    if (stateNeedsNormalization) {
      setActiveCellState(normalizedActiveCell);
    }
  }, [
    activeCellState,
    getRowKey,
    normalizedActiveCell,
    orderedColumns,
    rows,
    setActiveCellState,
  ]);

  const normalizedActiveIndex =
    enableKeyboardNavigation && rows.length > 0
      ? clamp(activeIndexState, -1, rows.length - 1)
      : -1;

  const setActiveIndexCompat = React.useCallback(
    (nextActiveIndex: number) => {
      if (!enableKeyboardNavigation || Number.isNaN(nextActiveIndex)) return;

      const normalized =
        rows.length === 0
          ? -1
          : nextActiveIndex < 0
            ? -1
            : clamp(Math.trunc(nextActiveIndex), 0, rows.length - 1);
      pendingActiveIndexRef.current = normalized;
      if (normalized === normalizedActiveIndex) return;
      setActiveIndexState(normalized);
    },
    [
      enableKeyboardNavigation,
      normalizedActiveIndex,
      rows.length,
      setActiveIndexState,
      pendingActiveIndexRef,
    ]
  );

  const incrementActiveIndex = React.useCallback(
    (increment: number) => {
      if (!enableKeyboardNavigation || rows.length === 0) return;

      const base = pendingActiveIndexRef.current ?? normalizedActiveIndex;
      const next = clamp(base + increment, 0, rows.length - 1);
      const delay =
        typeof activeIndexThrottle === "number" &&
        Number.isFinite(activeIndexThrottle)
          ? Math.max(0, activeIndexThrottle)
          : 0;

      pendingActiveIndexRef.current = next;
      if (delay === 0) {
        setActiveIndexCompat(next);
        return;
      }

      if (activeIndexThrottleTimerRef.current != null) return;
      activeIndexThrottleTimerRef.current = window.setTimeout(() => {
        activeIndexThrottleTimerRef.current = null;
        const pending = pendingActiveIndexRef.current;
        if (pending != null) setActiveIndexCompat(pending);
      }, delay);
    },
    [
      activeIndexThrottle,
      enableKeyboardNavigation,
      normalizedActiveIndex,
      rows.length,
      setActiveIndexCompat,
      activeIndexThrottleTimerRef,
      pendingActiveIndexRef,
    ]
  );

  React.useEffect(() => {
    pendingActiveIndexRef.current = normalizedActiveIndex;
  }, [normalizedActiveIndex, pendingActiveIndexRef]);

  const clearSelectionRange = React.useCallback(() => {
    selectionRangeBaseRef.current = null;
  }, [selectionRangeBaseRef]);

  const commitRowSelection = React.useCallback(
    (
      rowIndex: number,
      options: {
        checked?: boolean;
        ctrlKey?: boolean;
        metaKey?: boolean;
        shiftKey?: boolean;
        fromCheckbox?: boolean;
      } = {}
    ) => {
      if (!selectionEnabled) return;
      const row = rows[rowIndex];
      if (!row) return;

      const rowId = getRowKey(row, rowIndex);
      const isSelected = Boolean(selectedMap[rowId]);
      const ctrlKey = Boolean(options.ctrlKey || options.metaKey);
      const shiftKey = Boolean(options.shiftKey);

      if (!multiSelect) {
        const shouldSelect =
          options.checked ??
          (isSelected && (ctrlKey || toggleRowSelectOnClick) ? false : true);
        emitSelectionChange(shouldSelect ? rowId : null, { data: row });
        lastSelectedIndexRef.current = shouldSelect ? rowIndex : null;
        clearSelectionRange();
        return;
      }

      if (
        shiftKey &&
        lastSelectedIndexRef.current != null &&
        (!options.fromCheckbox || checkboxSelectEnableShiftKey)
      ) {
        const base =
          selectionRangeBaseRef.current ??
          (normalizedSelected === true ? {} : { ...selectedMap });
        selectionRangeBaseRef.current = { ...base };
        const next = { ...base };
        const from = Math.min(lastSelectedIndexRef.current, rowIndex);
        const to = Math.max(lastSelectedIndexRef.current, rowIndex);
        const checked = options.checked ?? true;

        for (let index = from; index <= to; index += 1) {
          const rangeRow = rows[index];
          if (!rangeRow) continue;
          const rangeId = getRowKey(rangeRow, index);
          if (checked) next[rangeId] = rangeRow;
          else delete next[rangeId];
        }

        emitSelectionChange(next, {
          data: rows.slice(from, to + 1),
        });
        return;
      }

      clearSelectionRange();
      lastSelectedIndexRef.current = rowIndex;

      const shouldToggle =
        options.checked === undefined &&
        (ctrlKey ||
          (toggleRowSelectOnClick &&
            Object.keys(selectedMap).length === 1 &&
            isSelected));
      const shouldSelect =
        options.checked ?? (shouldToggle ? !isSelected : true);

      if (normalizedSelected === true && (ctrlKey || options.fromCheckbox)) {
        const nextUnselected = { ...(unselected ?? {}) };
        if (shouldSelect) delete nextUnselected[rowId];
        else nextUnselected[rowId] = true;
        emitSelectionChange(true, {
          data: row,
          unselected: nextUnselected,
        });
        return;
      }

      const next =
        shouldToggle || options.fromCheckbox ? { ...selectedMap } : {};
      if (shouldSelect) next[rowId] = row;
      else delete next[rowId];
      emitSelectionChange(next, { data: row });
    },
    [
      checkboxSelectEnableShiftKey,
      clearSelectionRange,
      emitSelectionChange,
      getRowKey,
      multiSelect,
      rows,
      normalizedSelected,
      selectedMap,
      selectionEnabled,
      toggleRowSelectOnClick,
      unselected,
      lastSelectedIndexRef,
      selectionRangeBaseRef,
    ]
  );

  const selectAllRows = React.useCallback(() => {
    if (!selectionEnabled || rows.length === 0) return;

    if (!multiSelect) {
      emitSelectionChange(getRowKey(rows[0], 0), { data: rows[0] });
      return;
    }

    clearSelectionRange();
    if (paginationMode !== false || !Array.isArray(dataSource)) {
      emitSelectionChange(true, { data: rows, unselected: null });
      return;
    }

    const next: Record<string, any> = {};
    rows.forEach((row, index) => {
      next[getRowKey(row, index)] = row;
    });
    emitSelectionChange(next, { data: rows });
  }, [
    clearSelectionRange,
    dataSource,
    emitSelectionChange,
    getRowKey,
    multiSelect,
    paginationMode,
    rows,
    selectionEnabled,
  ]);

  const deselectAllRows = React.useCallback(() => {
    if (!selectionEnabled) return;
    clearSelectionRange();
    lastSelectedIndexRef.current = null;
    emitSelectionChange(multiSelect ? {} : null, {
      data: rows,
      unselected: null,
    });
  }, [
    clearSelectionRange,
    emitSelectionChange,
    multiSelect,
    rows,
    selectionEnabled,
    lastSelectedIndexRef,
  ]);

  const handleRowClick = React.useCallback(
    (
      rowId: string,
      rowData: any,
      rowIndex: number,
      event: React.MouseEvent
    ) => {
      void rowId;
      void rowData;

      const interactiveTarget = isInteractiveClickTarget(event.target as any);
      if (!interactiveTarget) {
        surfaceRef.current?.focus({ preventScroll: true });
      }
      setActiveIndexCompat(rowIndex);

      if (!selectionEnabled || checkboxOnlyRowSelect || interactiveTarget) {
        return;
      }

      commitRowSelection(rowIndex, {
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        shiftKey: event.shiftKey,
      });
    },
    [
      checkboxOnlyRowSelect,
      commitRowSelection,
      selectionEnabled,
      setActiveIndexCompat,
      surfaceRef,
    ]
  );
  return {
    commitRowSelection,
    deselectAllRows,
    getCellSelectionBetweenCompat,
    getCellSelectionKey,
    handleCellSelectionPointer,
    handleRowClick,
    incrementActiveCellCompat,
    incrementActiveIndex,
    isCellSelected,
    normalizedActiveCell,
    normalizedActiveIndex,
    queueActiveCell,
    selectAllRows,
    selectCellRange,
    selectableCellColumnIndexes,
    setActiveCellCompat,
    setActiveIndexCompat,
    toggleActiveCellSelectionCompat,
  };
}
