import * as React from "react";
import type { Row } from "@tanstack/react-table";

import type {
  TypeCancelEditArgs,
  TypeColumn,
  TypeCompleteEditArgs,
  TypeDataGridProps,
  TypeEditInfo,
  TypeStartEditArgs,
  TypeTryStartEditArgs,
} from "../../types";
import { getColumnId } from "../../utils/column";
import { buildEditCellProps } from "../utils/editing";
import type {
  GridCellEditStartArgs,
  GridEditingCell,
  GridEditNavigation,
} from "../components/GridBody";

/** Only the virtualizer surface this hook needs; keeps the param type narrow. */
type EditRowScroller = {
  scrollToIndex: (
    index: number,
    options?: { align?: "start" | "center" | "end" | "auto" }
  ) => void;
};

export type UseGridEditingParams = {
  autoFocusOnEditComplete: boolean;
  autoFocusOnEditEscape: boolean;
  columnWidths: Readonly<Record<string, number>>;
  computedMinRowHeight: number;
  computedVirtualizeColumns: boolean;
  editStartEvent: string;
  editable: boolean;
  getDisabledRowState: (rowIndex: number) => boolean | null | undefined;
  idProperty: string;
  loadSkip: number;
  multiSelect: boolean | undefined;
  onEditCancel: TypeDataGridProps["onEditCancel"];
  onEditComplete: TypeDataGridProps["onEditComplete"];
  onEditStart: TypeDataGridProps["onEditStart"];
  onEditStop: TypeDataGridProps["onEditStop"];
  onEditValueChange: TypeDataGridProps["onEditValueChange"];
  orderedColumns: TypeColumn[];
  resolveRowHeight: (rowIndex: number) => number;
  rowHeight: number | ((rowIndex: number) => number) | null | undefined;
  rowModel: Row<any>[];
  rowVirtualizer: EditRowScroller;
  rowsCount: number;
  selected: unknown;
  selectedMap: Readonly<Record<string, boolean>>;
  surfaceRef: React.RefObject<HTMLDivElement | null>;
  themeName: string;
  virtualized: boolean;
};

/**
 * Owns the cell edit session: lifecycle callbacks, coordinate reconciliation
 * and the Inovua-compatible imperative edit API. Isolating it here keeps the
 * long-lived edit closures (promises, timeouts, editor callbacks) from
 * capturing the whole `ReactDataGrid` render scope.
 */
export function useGridEditing(params: UseGridEditingParams) {
  const {
    autoFocusOnEditComplete,
    autoFocusOnEditEscape,
    columnWidths,
    computedMinRowHeight,
    computedVirtualizeColumns,
    editStartEvent,
    editable,
    getDisabledRowState,
    idProperty,
    loadSkip,
    multiSelect,
    onEditCancel,
    onEditComplete,
    onEditStart,
    onEditStop,
    onEditValueChange,
    orderedColumns,
    resolveRowHeight,
    rowHeight,
    rowModel,
    rowVirtualizer,
    rowsCount,
    selected,
    selectedMap,
    surfaceRef,
    themeName,
    virtualized,
  } = params;

  const editCellNodesRef = React.useRef(
    new Map<string, HTMLTableCellElement>()
  );
  const [editingCell, setEditingCellState] =
    React.useState<GridEditingCell | null>(null);
  const editingCellRef = React.useRef<GridEditingCell | null>(null);
  const editingRowsRef = React.useRef(rowModel);
  const editingColumnsRef = React.useRef(orderedColumns);
  editingRowsRef.current = rowModel;
  editingColumnsRef.current = orderedColumns;

  const editAttemptRef = React.useRef(0);
  const editSessionIdRef = React.useRef(0);
  const editEndingSessionRef = React.useRef<number | null>(null);
  const isInEditRef = React.useRef(false);
  const currentEditCompletePromiseRef = React.useRef<Promise<unknown>>(
    Promise.resolve(true)
  );

  const setEditingCell = React.useCallback((next: GridEditingCell | null) => {
    editingCellRef.current = next;
    isInEditRef.current = next != null;
    setEditingCellState(next);
  }, []);

  const toEditInfo = React.useCallback(
    (
      cell: GridEditingCell,
      options: { includeValue: boolean; value?: unknown }
    ): TypeEditInfo => ({
      rowId: cell.rowId,
      rowIndex: cell.rowIndex,
      columnId: cell.columnId,
      columnIndex: cell.columnIndex,
      ...(options.includeValue
        ? { value: options.value === undefined ? cell.value : options.value }
        : {}),
      data: cell.data,
      column: cell.column,
      cellProps: cell.cellProps,
    }),
    []
  );

  const tryStartCellEdit = React.useCallback(
    async (
      args: GridCellEditStartArgs,
      options?: { replaceActive?: boolean }
    ): Promise<boolean> => {
      const attempt = ++editAttemptRef.current;
      const replaceActive = options?.replaceActive === true;

      const current = editingCellRef.current;
      if (
        !replaceActive &&
        current &&
        String(current.rowId) === String(args.rowId) &&
        current.columnId === args.columnId
      ) {
        return true;
      }
      if (current && !replaceActive) return false;

      let initialEditValue = args.value;
      if (
        args.useEditStartValue !== false &&
        typeof args.column.getEditStartValue === "function"
      ) {
        try {
          initialEditValue = await Promise.resolve(
            args.column.getEditStartValue(args.value, args.cellProps)
          );
        } catch {
          return false;
        }

        if (attempt !== editAttemptRef.current) return false;
      }

      const initialCellProps = args.cellProps;
      const configuredEditable =
        args.column.editable === undefined ? editable : args.column.editable;
      if (!configuredEditable) return false;

      if (typeof configuredEditable === "function") {
        let allowed: boolean | void;
        try {
          allowed = await Promise.resolve(
            configuredEditable(initialEditValue, initialCellProps)
          );
        } catch {
          return false;
        }

        if (attempt !== editAttemptRef.current || !allowed) {
          return false;
        }
      }

      const latestRow = editingRowsRef.current[args.rowIndex];
      const latestColumn = editingColumnsRef.current[args.columnIndex];
      if (
        attempt !== editAttemptRef.current ||
        String(latestRow?.id) !== String(args.rowId) ||
        !latestColumn ||
        getColumnId(latestColumn) !== args.columnId
      ) {
        return false;
      }

      const next: GridEditingCell = {
        sessionId: ++editSessionIdRef.current,
        rowId: args.rowId,
        rowIndex: args.rowIndex,
        columnId: args.columnId,
        columnIndex: args.columnIndex,
        originalValue: initialEditValue,
        value: initialEditValue,
        data: args.data,
        column: args.column,
        initialCellHeight: args.initialCellHeight,
        cellProps: {
          ...initialCellProps,
          editValue: initialEditValue,
          inEdit: true,
        },
      };

      editEndingSessionRef.current = null;
      currentEditCompletePromiseRef.current = Promise.resolve(true);
      setEditingCell(next);
      onEditStart?.(
        toEditInfo(
          { ...next, cellProps: initialCellProps },
          { includeValue: true, value: initialEditValue }
        )
      );
      return true;
    },
    [editable, onEditStart, setEditingCell, toEditInfo]
  );

  // Inovua treats a UI activation on another cell as a direct coordinate
  // replacement. The previous custom editor is not implicitly completed or
  // cancelled; editors that want blur completion call their supplied
  // `onComplete` handler. Keeping this path separate preserves the guarded
  // behavior used by post-completion keyboard navigation.
  const handleUiCellEditStart = React.useCallback(
    (args: GridCellEditStartArgs) =>
      tryStartCellEdit(args, { replaceActive: true }),
    [tryStartCellEdit]
  );

  const getEditStartArgs = React.useCallback(
    (
      rowIndex: number,
      columnIndex: number,
      editValue?: unknown
    ): GridCellEditStartArgs | null => {
      const row = rowModel[rowIndex];
      const column = orderedColumns[columnIndex];
      const cell = row?.getVisibleCells()[columnIndex];
      if (!row || !column || !cell) return null;

      const columnId = getColumnId(column);
      const value = cell.getValue();
      const initialEditValue = editValue === undefined ? value : editValue;
      const itemId = (row.original as any)?.[idProperty];
      const rowId =
        typeof itemId === "string" || typeof itemId === "number"
          ? itemId
          : row.id;
      const cellProps = buildEditCellProps({
        value,
        data: row.original,
        rowIndex,
        remoteRowIndex: loadSkip + rowIndex,
        rowId,
        rowSelected: Boolean(selectedMap[String(row.id)]),
        disabledRow: getDisabledRowState(rowIndex),
        selection: selected,
        multiSelect: Boolean(multiSelect),
        naturalRowHeight: rowHeight == null,
        resolvedRowHeight: resolveRowHeight(rowIndex),
        minRowHeight: computedMinRowHeight,
        column,
        columnId,
        columnIndex,
        columnCount: orderedColumns.length,
        computedWidth: columnWidths[columnId],
        editable,
        editStartEvent,
        theme: themeName,
        totalDataCount: rowsCount,
        virtualizeColumns: computedVirtualizeColumns,
      });

      return {
        rowId,
        rowIndex,
        columnId,
        columnIndex,
        value: initialEditValue,
        useEditStartValue: editValue === undefined,
        data: row.original,
        column,
        cellProps,
        initialCellHeight:
          editCellNodesRef.current
            .get(`${String(row.id)}\u0000${columnId}`)
            ?.getBoundingClientRect().height ?? null,
      };
    },
    [
      columnWidths,
      computedMinRowHeight,
      computedVirtualizeColumns,
      editStartEvent,
      editable,
      idProperty,
      getDisabledRowState,
      loadSkip,
      multiSelect,
      orderedColumns,
      resolveRowHeight,
      rowModel,
      rowHeight,
      rowsCount,
      selected,
      selectedMap,
      themeName,
    ]
  );
  const getEditStartArgsRef = React.useRef(getEditStartArgs);
  getEditStartArgsRef.current = getEditStartArgs;

  // Inovua anchors an active edit session to its visible coordinates. If a
  // controlled row or column model changes, preserve the session and draft
  // while resolving identity and callback metadata from the new occupant.
  // Model reconciliation itself must not emit edit lifecycle callbacks.
  const reconcileEditingCellToCoordinate = React.useCallback(
    (cell: GridEditingCell | null): GridEditingCell | null => {
      if (!cell) return null;

      const args = getEditStartArgsRef.current(cell.rowIndex, cell.columnIndex);
      if (!args) return cell;

      const targetChanged =
        String(cell.rowId) !== String(args.rowId) ||
        cell.columnId !== args.columnId;

      return {
        ...cell,
        rowId: args.rowId,
        rowIndex: args.rowIndex,
        columnId: args.columnId,
        columnIndex: args.columnIndex,
        originalValue: targetChanged ? args.value : cell.originalValue,
        data: args.data,
        column: args.column,
        initialCellHeight: targetChanged
          ? args.initialCellHeight
          : cell.initialCellHeight,
        cellProps: {
          ...args.cellProps,
          editValue: cell.value,
          inEdit: true,
        },
      };
    },
    []
  );

  const getEditingCellAtCurrentCoordinate = React.useCallback(() => {
    const current = editingCellRef.current;
    const reconciled = reconcileEditingCellToCoordinate(current);

    if (current && reconciled && current.sessionId === reconciled.sessionId) {
      editingCellRef.current = reconciled;
    }

    return reconciled;
  }, [reconcileEditingCellToCoordinate]);

  const coordinateEditingCell = reconcileEditingCellToCoordinate(editingCell);

  React.useLayoutEffect(() => {
    if (
      coordinateEditingCell &&
      editingCellRef.current?.sessionId === coordinateEditingCell.sessionId
    ) {
      editingCellRef.current = coordinateEditingCell;
    }
  }, [coordinateEditingCell]);

  const resolveEditRowIndex = React.useCallback(
    (rowIndex?: number, rowId?: string | number): number => {
      if (rowIndex !== undefined) {
        return typeof rowIndex === "number" &&
          Number.isInteger(rowIndex) &&
          rowIndex >= 0 &&
          rowIndex < rowModel.length
          ? rowIndex
          : -1;
      }

      if (rowId === undefined) return -1;
      return rowModel.findIndex((row) => {
        const itemId = (row.original as any)?.[idProperty];
        const parsedRowId = typeof itemId === "number" ? Number(rowId) : rowId;
        return itemId === parsedRowId;
      });
    },
    [idProperty, rowModel]
  );

  const resolveEditColumnIndex = React.useCallback(
    (columnId: string | number | undefined): number => {
      if (columnId === undefined) return -1;
      if (typeof columnId === "number") {
        return Number.isInteger(columnId) &&
          columnId >= 0 &&
          columnId < orderedColumns.length
          ? columnId
          : -1;
      }
      const normalizedColumnId = String(columnId);
      return orderedColumns.findIndex(
        (column) => getColumnId(column) === normalizedColumnId
      );
    },
    [orderedColumns]
  );

  const getRenderedEditingTarget = React.useCallback(
    (
      rowIndex: number,
      columnIndex: number,
      sessionId: number
    ): GridEditingCell | null => {
      const row = editingRowsRef.current[rowIndex];
      const column = editingColumnsRef.current[columnIndex];
      if (!row || !column) return null;

      const configuredEditable =
        column.editable === undefined ? editable : column.editable;
      if (!configuredEditable) return null;

      const columnId = getColumnId(column);
      const cellKey = `${String(row.id)}\u0000${columnId}`;
      if (!editCellNodesRef.current.has(cellKey)) return null;

      const args = getEditStartArgsRef.current(rowIndex, columnIndex);
      if (!args) return null;

      const liveEdit = getEditingCellAtCurrentCoordinate();
      if (
        liveEdit?.rowIndex === rowIndex &&
        liveEdit.columnIndex === columnIndex
      ) {
        return {
          ...liveEdit,
          rowId: args.rowId,
          rowIndex: args.rowIndex,
          columnId: args.columnId,
          columnIndex: args.columnIndex,
          data: args.data,
          column: args.column,
          cellProps: {
            ...args.cellProps,
            editValue: liveEdit.value,
            inEdit: true,
          },
        };
      }

      return {
        sessionId,
        rowId: args.rowId,
        rowIndex: args.rowIndex,
        columnId: args.columnId,
        columnIndex: args.columnIndex,
        originalValue: args.value,
        value: undefined,
        data: args.data,
        column: args.column,
        cellProps: args.cellProps,
        initialCellHeight: args.initialCellHeight,
      };
    },
    [editable, getEditingCellAtCurrentCoordinate]
  );

  const navigateAfterEdit = React.useCallback(
    async (cell: GridEditingCell, navigation: GridEditNavigation) => {
      const candidates: Array<{ rowIndex: number; columnIndex: number }> = [];

      if (navigation.type === "enter") {
        for (
          let rowIndex = cell.rowIndex + navigation.direction;
          rowIndex >= 0 && rowIndex < rowModel.length;
          rowIndex += navigation.direction
        ) {
          for (
            let columnIndex = cell.columnIndex;
            columnIndex >= 0 && columnIndex < orderedColumns.length;
            columnIndex += navigation.direction
          ) {
            const column = orderedColumns[columnIndex];
            if (
              column &&
              (Boolean(column.editable) ||
                (editable && column.editable !== false))
            ) {
              candidates.push({ rowIndex, columnIndex });
              // Enter uses the first statically eligible column on each row.
              // If its async predicate rejects, Inovua advances to the next
              // row instead of trying another column on this row.
              break;
            }
          }
        }
      } else {
        const columnCount = orderedColumns.length;
        const cellCount = rowModel.length * columnCount;
        let linearIndex =
          cell.rowIndex * columnCount + cell.columnIndex + navigation.direction;

        while (linearIndex >= 0 && linearIndex < cellCount) {
          candidates.push({
            rowIndex: Math.floor(linearIndex / columnCount),
            columnIndex: linearIndex % columnCount,
          });
          linearIndex += navigation.direction;
        }
      }

      for (const candidate of candidates) {
        const args = getEditStartArgs(
          candidate.rowIndex,
          candidate.columnIndex
        );
        if (!args) continue;

        if (virtualized) {
          rowVirtualizer.scrollToIndex(candidate.rowIndex, { align: "auto" });
        }
        if (await tryStartCellEdit(args)) return;
      }

      surfaceRef.current?.focus();
    },
    [
      getEditStartArgs,
      editable,
      orderedColumns,
      rowModel.length,
      rowVirtualizer,
      tryStartCellEdit,
      virtualized,
      surfaceRef,
    ]
  );

  const handleEditValueChange = React.useCallback(
    (value: unknown) => {
      const current = getEditingCellAtCurrentCoordinate();
      if (!current || editEndingSessionRef.current != null) return;

      const next = {
        ...current,
        value,
        cellProps: {
          ...current.cellProps,
          editValue: value,
          inEdit: true,
        },
      };
      setEditingCell(next);
      onEditValueChange?.(toEditInfo(next, { includeValue: true, value }));
    },
    [
      getEditingCellAtCurrentCoordinate,
      onEditValueChange,
      setEditingCell,
      toEditInfo,
    ]
  );

  const handleEditComplete = React.useCallback(
    async (
      navigation?: GridEditNavigation,
      value?: unknown,
      targetCell?: GridEditingCell
    ) => {
      const current = getEditingCellAtCurrentCoordinate();
      if (
        !current ||
        editEndingSessionRef.current === current.sessionId ||
        editEndingSessionRef.current != null
      ) {
        return;
      }

      editAttemptRef.current += 1;
      const sessionId = current.sessionId;
      editEndingSessionRef.current = sessionId;
      const completedCell = {
        ...(targetCell ?? current),
        sessionId,
        value: value === undefined ? (targetCell ?? current).value : value,
      };
      const info = toEditInfo(completedCell, { includeValue: true });
      let resolveCompletion!: (value: unknown) => void;
      let rejectCompletion!: (reason?: unknown) => void;
      const completionPromise = new Promise<unknown>((resolve, reject) => {
        resolveCompletion = resolve;
        rejectCompletion = reject;
      });
      currentEditCompletePromiseRef.current = completionPromise;

      let stopError: unknown;
      try {
        onEditStop?.(info);
      } catch (error) {
        stopError = error;
      }

      if (editingCellRef.current?.sessionId === sessionId) {
        setEditingCell(null);
      }
      if (autoFocusOnEditComplete) {
        surfaceRef.current?.focus();
      }

      if (stopError !== undefined) {
        rejectCompletion(stopError);
      } else {
        try {
          Promise.resolve(onEditComplete?.(info)).then(
            resolveCompletion,
            rejectCompletion
          );
        } catch (error) {
          rejectCompletion(error);
        }
      }

      let completed = false;
      try {
        await completionPromise;
        completed = true;
      } catch {
        completed = false;
      } finally {
        if (editEndingSessionRef.current === sessionId) {
          editEndingSessionRef.current = null;
        }
      }

      if (
        completed &&
        navigation &&
        editSessionIdRef.current === sessionId &&
        editingCellRef.current == null
      ) {
        await navigateAfterEdit(completedCell, navigation);
      }
    },
    [
      getEditingCellAtCurrentCoordinate,
      navigateAfterEdit,
      onEditComplete,
      onEditStop,
      autoFocusOnEditComplete,
      setEditingCell,
      toEditInfo,
      surfaceRef,
    ]
  );

  const handleEditStop = React.useCallback(
    async (navigation?: GridEditNavigation, value?: unknown) => {
      const current = getEditingCellAtCurrentCoordinate();
      editAttemptRef.current += 1;
      if (!current || editEndingSessionRef.current != null) return;

      const sessionId = current.sessionId;
      editEndingSessionRef.current = sessionId;
      const stoppedCell = {
        ...current,
        value: value === undefined ? current.value : value,
      };

      try {
        onEditStop?.(toEditInfo(stoppedCell, { includeValue: true }));
      } finally {
        if (editingCellRef.current?.sessionId === sessionId) {
          setEditingCell(null);
        }
        editEndingSessionRef.current = null;
        currentEditCompletePromiseRef.current = Promise.resolve(true);
      }

      if (navigation) {
        await navigateAfterEdit(stoppedCell, navigation);
      } else {
        surfaceRef.current?.focus();
      }
    },
    [
      getEditingCellAtCurrentCoordinate,
      navigateAfterEdit,
      onEditStop,
      setEditingCell,
      toEditInfo,
      surfaceRef,
    ]
  );

  const handleEditCancel = React.useCallback(
    (targetCell?: GridEditingCell) => {
      editAttemptRef.current += 1;
      const current = getEditingCellAtCurrentCoordinate();
      if (!current || editEndingSessionRef.current != null) return;

      const sessionId = current.sessionId;
      const cancelledCell = targetCell ?? current;
      editEndingSessionRef.current = sessionId;
      try {
        onEditStop?.(toEditInfo(cancelledCell, { includeValue: true }));
        onEditCancel?.(toEditInfo(cancelledCell, { includeValue: false }));
      } finally {
        if (editingCellRef.current?.sessionId === sessionId) {
          setEditingCell(null);
        }
        editEndingSessionRef.current = null;
        currentEditCompletePromiseRef.current = Promise.resolve(true);
      }
      if (autoFocusOnEditEscape) {
        surfaceRef.current?.focus();
      }
    },
    [
      getEditingCellAtCurrentCoordinate,
      onEditCancel,
      onEditStop,
      autoFocusOnEditEscape,
      setEditingCell,
      toEditInfo,
      surfaceRef,
    ]
  );

  const handleCrossTargetEditComplete = React.useCallback(
    (targetCell: GridEditingCell, value?: unknown) => {
      const completedCell = {
        ...targetCell,
        value: value === undefined ? targetCell.value : value,
      };
      isInEditRef.current = false;

      try {
        currentEditCompletePromiseRef.current = Promise.resolve(
          onEditComplete?.(toEditInfo(completedCell, { includeValue: true }))
        );
      } catch (error) {
        const rejectedPromise = Promise.reject(error);
        currentEditCompletePromiseRef.current = rejectedPromise;
        void rejectedPromise.catch(() => undefined);
      }
    },
    [onEditComplete, toEditInfo]
  );

  const handleCrossTargetEditCancel = React.useCallback(
    (targetCell: GridEditingCell) => {
      onEditCancel?.(toEditInfo(targetCell, { includeValue: false }));
      window.setTimeout(() => {
        if (editingCellRef.current) isInEditRef.current = false;
      }, 50);
    },
    [onEditCancel, toEditInfo]
  );

  const startEditCompat = React.useCallback(
    async (args: TypeStartEditArgs): Promise<any> => {
      const columnIndex = resolveEditColumnIndex(args?.columnId);
      if (columnIndex < 0) {
        throw new Error(
          `No column found for columnId: ${String(args?.columnId)}`
        );
      }

      const rowIndex = resolveEditRowIndex(args?.rowIndex, args?.rowId);
      if (rowIndex < 0) throw null;

      if (virtualized) {
        rowVirtualizer.scrollToIndex(rowIndex, { align: "auto" });
      }
      await new Promise<void>((resolve) => window.setTimeout(resolve, 50));

      const liveStartArgs = getEditStartArgsRef.current(
        rowIndex,
        columnIndex,
        args?.value
      );
      if (!liveStartArgs) throw null;

      return (await tryStartCellEdit(liveStartArgs, { replaceActive: true }))
        ? liveStartArgs.value
        : undefined;
    },
    [
      resolveEditColumnIndex,
      resolveEditRowIndex,
      rowVirtualizer,
      tryStartCellEdit,
      virtualized,
    ]
  );

  const tryStartEditCompat = React.useCallback(
    async (args: TypeTryStartEditArgs): Promise<any> => {
      const columnIndex = resolveEditColumnIndex(args?.columnId);
      if (columnIndex < 0) {
        throw new Error(
          `No column found for columnId: ${String(args?.columnId)}`
        );
      }

      const rowIndex = resolveEditRowIndex(args?.rowIndex, args?.rowId);
      if (rowIndex < 0) throw null;

      const direction = args?.dir === 1 || !args?.dir ? 1 : -1;
      if (virtualized) {
        rowVirtualizer.scrollToIndex(rowIndex, { align: "auto" });
      }
      await new Promise<void>((resolve) => window.setTimeout(resolve, 50));

      const columnCount = editingColumnsRef.current.length;
      const cellCount = editingRowsRef.current.length * columnCount;
      let linearIndex = rowIndex * columnCount + columnIndex;

      while (linearIndex >= 0 && linearIndex < cellCount) {
        const candidateRowIndex = Math.floor(linearIndex / columnCount);
        const candidateColumnIndex = linearIndex % columnCount;
        const startArgs = getEditStartArgsRef.current(
          candidateRowIndex,
          candidateColumnIndex
        );

        if (startArgs) {
          if (virtualized) {
            rowVirtualizer.scrollToIndex(candidateRowIndex, { align: "auto" });
          }
          if (await tryStartCellEdit(startArgs, { replaceActive: true })) {
            return startArgs.value;
          }
        }

        linearIndex += direction;
      }

      throw null;
    },
    [
      resolveEditColumnIndex,
      resolveEditRowIndex,
      rowVirtualizer,
      tryStartCellEdit,
      virtualized,
    ]
  );

  const completeEditCompat = React.useCallback(
    (args?: TypeCompleteEditArgs): void => {
      const current = getEditingCellAtCurrentCoordinate();
      if (!current) return;

      let columnIndex = resolveEditColumnIndex(args?.columnId);
      let rowIndex: number | undefined;
      if (columnIndex < 0) {
        columnIndex = current.columnIndex;
        rowIndex = current.rowIndex;
      } else if (args?.rowIndex !== undefined) {
        rowIndex = args.rowIndex;
      } else {
        const resolvedRowIndex = resolveEditRowIndex(undefined, args?.rowId);
        rowIndex = resolvedRowIndex < 0 ? undefined : resolvedRowIndex;
      }

      if (
        rowIndex === undefined ||
        rowIndex < 0 ||
        rowIndex >= editingRowsRef.current.length
      ) {
        return;
      }

      // 5.10.2 accepts `dir` but does not use it. Calling with no object uses
      // its historical empty-string completion value; omitting only `value`
      // from an object preserves the current editor value.
      const value = args === undefined ? "" : args.value;

      if (virtualized) {
        rowVirtualizer.scrollToIndex(rowIndex, { align: "auto" });
      }

      window.setTimeout(() => {
        const target = getRenderedEditingTarget(
          rowIndex,
          columnIndex,
          current.sessionId
        );
        if (!target) return;

        const liveEditBeforeFocus = getEditingCellAtCurrentCoordinate();
        const targetsAnotherCell = Boolean(
          liveEditBeforeFocus &&
          (target.rowIndex !== liveEditBeforeFocus.rowIndex ||
            target.columnIndex !== liveEditBeforeFocus.columnIndex)
        );

        // Inovua focuses the grid before dispatching a completion to another
        // valid cell. Its default text editor completes itself on blur, so
        // this focus produces the current cell's stop + complete lifecycle
        // before the requested target completion. Custom editors without
        // blur completion merely lose focus and remain mounted.
        if (targetsAnotherCell) {
          surfaceRef.current?.focus();
        }

        const liveEdit = getEditingCellAtCurrentCoordinate();
        if (
          !liveEdit ||
          target.rowIndex !== liveEdit.rowIndex ||
          target.columnIndex !== liveEdit.columnIndex
        ) {
          handleCrossTargetEditComplete(target, value);
          return;
        }
        void handleEditComplete(undefined, value, target);
      }, 50);
    },
    [
      getRenderedEditingTarget,
      getEditingCellAtCurrentCoordinate,
      handleCrossTargetEditComplete,
      handleEditComplete,
      resolveEditColumnIndex,
      resolveEditRowIndex,
      rowVirtualizer,
      virtualized,
      surfaceRef,
    ]
  );

  const cancelEditCompat = React.useCallback(
    (args?: TypeCancelEditArgs): void => {
      const current = getEditingCellAtCurrentCoordinate();
      if (!current) return;

      // Inovua's 5.10.2 truthy column check makes numeric index 0 use the
      // current-edit fallback. Other numbers are visible-column indices.
      let columnIndex = args?.columnId
        ? resolveEditColumnIndex(args.columnId)
        : -1;
      let rowIndex = args?.rowIndex;
      if (columnIndex < 0) {
        columnIndex = current.columnIndex;
        rowIndex = current.rowIndex;
      }

      if (rowIndex === undefined) return;
      const target = getRenderedEditingTarget(
        rowIndex,
        columnIndex,
        current.sessionId
      );
      if (!target) return;
      if (
        target.rowIndex !== current.rowIndex ||
        target.columnIndex !== current.columnIndex
      ) {
        handleCrossTargetEditCancel(target);
        return;
      }
      handleEditCancel(target);
    },
    [
      getRenderedEditingTarget,
      getEditingCellAtCurrentCoordinate,
      handleCrossTargetEditCancel,
      handleEditCancel,
      resolveEditColumnIndex,
    ]
  );

  const getCurrentEditInfoCompat =
    React.useCallback((): TypeEditInfo | null => {
      const current = getEditingCellAtCurrentCoordinate();
      return current ? toEditInfo(current, { includeValue: true }) : null;
    }, [getEditingCellAtCurrentCoordinate, toEditInfo]);
  return {
    cancelEditCompat,
    completeEditCompat,
    coordinateEditingCell,
    currentEditCompletePromiseRef,
    editCellNodesRef,
    editingCell,
    getCurrentEditInfoCompat,
    handleEditCancel,
    handleEditComplete,
    handleEditStop,
    handleEditValueChange,
    handleUiCellEditStart,
    isInEditRef,
    startEditCompat,
    tryStartEditCompat,
  };
}
