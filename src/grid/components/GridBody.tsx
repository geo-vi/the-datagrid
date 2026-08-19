"use client";

import * as React from "react";
import { flexRender } from "@tanstack/react-table";

import type {
  CellProps,
  TypeActiveCell,
  TypeColumn,
  TypeCellProps,
  TypeColumnEditorCell,
  TypeColumnEditorProps,
  TypeComputedColumn,
  TypeComputedColumnsMap,
  TypeDataGridProps,
  TypeI18n,
  TypeRowSelection,
  TypeRowProps,
  TypeRowStyle,
  TypeShowCellBorders,
} from "../../types";
import { cn } from "../../lib/utils";
import { buildEditCellProps } from "../utils/editing";
import { resolveEmptyText } from "../utils/emptyText";
import { resolveConfiguredRowHeight } from "../utils/rowHeight";
import type {
  TypeGridColumnRenderItem,
  TypeLockedColumnLayout,
} from "../utils/lockedColumns";
import {
  resolveColumnLock,
  resolveColumnRenderEdges,
} from "../utils/lockedColumns";

import { TableBody, TableCell, TableRow } from "../../components/ui/table";

export type GridEditingCell = {
  sessionId: number;
  rowId: string | number;
  rowIndex: number;
  columnId: string;
  columnIndex: number;
  originalValue: unknown;
  value: unknown;
  data: any;
  column: TypeColumn;
  cellProps: CellProps;
  initialCellHeight: number | null;
};

export type GridCellEditStartArgs = {
  rowId: string | number;
  rowIndex: number;
  columnId: string;
  columnIndex: number;
  value: unknown;
  data: any;
  column: TypeColumn;
  cellProps: CellProps;
  initialCellHeight: number | null;
  /**
   * When true, `column.getEditStartValue` resolves the initial editor value.
   * Imperative callers that supplied an explicit value set this to false.
   */
  useEditStartValue?: boolean;
};

export type GridEditNavigation = {
  type: "enter" | "tab";
  direction: -1 | 1;
};

type GridContextCell = {
  column: { id: string };
  getValue: () => unknown;
};

type GridContextRow = {
  id: string;
  original: unknown;
  getVisibleCells: () => GridContextCell[];
};

function normalizeEditorValue(value: unknown): unknown {
  if (
    value &&
    typeof value === "object" &&
    "target" in value &&
    (value as { target?: { value?: unknown } }).target
  ) {
    return (value as { target: { value?: unknown } }).target.value;
  }

  return value;
}

function getCompatRowId(
  row: { id: string; original: any },
  getItemId: (data: any) => unknown
): string | number {
  const itemId = getItemId(row.original);
  return typeof itemId === "string" || typeof itemId === "number"
    ? itemId
    : row.id;
}

function DefaultCellEditor(props: {
  value: unknown;
  ariaLabel: string;
  onChange: (value: unknown) => void;
  onComplete: (navigation?: GridEditNavigation, value?: unknown) => void;
  onCancel: () => void;
}) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  React.useLayoutEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  return (
    <input
      ref={inputRef}
      aria-label={props.ariaLabel}
      className="tdg-cell-editor InovuaReactDataGrid__cell__editor InovuaReactDataGrid__cell__editor--text"
      data-slot="cell-editor"
      value={props.value == null ? "" : String(props.value)}
      onChange={(event) => props.onChange(event.target.value)}
      onBlur={() => props.onComplete()}
      onClick={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          props.onCancel();
          return;
        }

        if (event.key === "Enter") {
          event.preventDefault();
          event.stopPropagation();
          props.onComplete({
            type: "enter",
            direction: event.shiftKey ? -1 : 1,
          });
          return;
        }

        if (event.key === "Tab") {
          event.preventDefault();
          event.stopPropagation();
          props.onComplete({
            type: "tab",
            direction: event.shiftKey ? -1 : 1,
          });
        }
      }}
    />
  );
}

const SEAMLESS_CELL_EDITOR_SELECTOR =
  '.tdg-cell-editor[data-slot="cell-editor"], .InovuaReactDataGrid__cell__editor';

function CellEditorSurfaceSync(props: {
  cellKey: string;
  cellNodesRef: React.MutableRefObject<Map<string, HTMLTableCellElement>>;
}) {
  React.useLayoutEffect(() => {
    const cell = props.cellNodesRef.current.get(props.cellKey);
    const content = cell
      ? Array.from(cell.children).find(
          (child): child is HTMLElement =>
            child instanceof HTMLElement &&
            child.classList.contains("tdg-cell-content")
        )
      : undefined;
    if (!cell || !content) return;

    const syncSurface = () => {
      if (content.querySelector(SEAMLESS_CELL_EDITOR_SELECTOR)) {
        cell.dataset.editorSurface = "seamless";
      } else if (cell.dataset.editorSurface === "seamless") {
        delete cell.dataset.editorSurface;
      }
    };

    syncSurface();
    const observer = new MutationObserver(syncSurface);
    observer.observe(content, {
      attributes: true,
      attributeFilter: ["class", "data-slot"],
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
      if (cell.dataset.editorSurface === "seamless") {
        delete cell.dataset.editorSurface;
      }
    };
  }, [props.cellKey, props.cellNodesRef]);

  return null;
}

export type GridBodyProps = {
  rowModel: any[];
  orderedColumns: TypeColumn[];
  columnWidths: Record<string, number>;
  userSelectClass: string;
  showHorizontalCellBorders: boolean;
  showVerticalCellBorders: boolean;

  virtualized: boolean;
  virtualizeColumns: boolean;
  columnRenderItems: TypeGridColumnRenderItem[];
  lockedColumnLayout: Record<string, TypeLockedColumnLayout>;
  virtualItems: any[];
  paddingTop: number;
  paddingBottom: number;
  stickyHeaderOffset: number;

  loading: boolean;
  i18n?: TypeI18n;
  emptyText: TypeDataGridProps["emptyText"];

  selectedMap: Record<string, any>;
  activeIndex: number;
  gridFocused: boolean;
  selectionEnabled: boolean;
  cellSelectionEnabled: boolean;
  activeCell: TypeActiveCell;
  isCellSelected: (rowIndex: number, columnIndex: number) => boolean;
  onCellSelectionPointer: (
    rowIndex: number,
    columnIndex: number,
    event: Pick<
      React.PointerEvent<HTMLTableCellElement>,
      "button" | "ctrlKey" | "metaKey" | "shiftKey"
    >
  ) => void;
  rowIdPrefix: string;
  rowFocusClassName?: string;
  showActiveRowIndicator: boolean;
  activeRowIndicatorClassName?: string;
  getDisabledRowState: (rowIndex: number) => boolean | null | undefined;
  onRowClick?: (
    rowId: string,
    rowData: any,
    rowIndex: number,
    e: React.MouseEvent
  ) => void;
  publicOnRowClick?: TypeDataGridProps["onRowClick"];
  publicOnRowDoubleClick?: TypeDataGridProps["onRowDoubleClick"];
  publicOnCellClick?: TypeDataGridProps["onCellClick"];
  publicOnCellDoubleClick?: TypeDataGridProps["onCellDoubleClick"];
  rowProps?: TypeDataGridProps["rowProps"];
  rowClassName?: TypeDataGridProps["rowClassName"];
  renderRow?: TypeDataGridProps["renderRow"];
  onRenderRow?: TypeDataGridProps["onRenderRow"];
  cellDOMProps?: TypeDataGridProps["cellDOMProps"];
  showHoverRows: boolean;
  showEmptyRows: boolean;
  onRowContextMenu?: (
    rowProps: TypeRowProps,
    cellProps: TypeCellProps | undefined,
    event:
      | React.MouseEvent<HTMLElement>
      | React.KeyboardEvent<HTMLElement>
      | React.PointerEvent<HTMLElement>,
    alignTo: HTMLElement | { left: number; top: number }
  ) => void;

  rowHeight: number | ((rowIndex: number) => number) | null;
  resolveRowHeight?: (rowIndex: number) => number;
  minRowHeight: number;
  maxRowHeight?: number;
  measureElement?: (element: Element | null) => void;
  rowStyle?: TypeRowStyle;
  rowStyleMetadata: {
    availableWidth: number;
    totalComputedWidth: number;
    remoteRowOffset: number;
    columns: TypeComputedColumn[];
    columnRenderCount: number;
    totalColumnCount: number;
    virtualizeColumns: boolean;
    columnsMap: TypeComputedColumnsMap;
    dataSourceArray: any[];
    totalCount: number;
    theme: string;
    rtl: boolean;
    nativeScroll: boolean;
    multiSelect: boolean;
    selection: TypeRowSelection;
    maxVisibleRows: number;
    computedShowCellBorders: TypeShowCellBorders;
    editable: boolean;
    getItemId: (data: any) => unknown;
    firstUnlockedIndex: number;
    lastUnlockedIndex: number;
    firstLockedStartIndex: number;
    lastLockedStartIndex: number;
    firstLockedEndIndex: number;
    lastLockedEndIndex: number;
    hasLockedStart: boolean;
    hasLockedEnd: boolean;
    totalUnlockedWidth: number;
    totalLockedStartWidth: number;
    totalLockedEndWidth: number;
  };
  showZebraRows: boolean;

  editingCell: GridEditingCell | null;
  cellNodesRef: React.MutableRefObject<Map<string, HTMLTableCellElement>>;
  editStartEvent: string;
  onCellEditStart: (args: GridCellEditStartArgs) => Promise<boolean>;
  onEditValueChange: (value: unknown) => void;
  onEditComplete: (
    navigation?: GridEditNavigation,
    value?: unknown
  ) => Promise<void>;
  onEditStop: (
    navigation?: GridEditNavigation,
    value?: unknown
  ) => Promise<void>;
  onEditCancel: () => void;
};

export function GridBody(props: GridBodyProps) {
  const {
    rowModel,
    orderedColumns,
    columnWidths,
    userSelectClass,
    showHorizontalCellBorders,
    showVerticalCellBorders,
    virtualized,
    virtualizeColumns,
    columnRenderItems,
    lockedColumnLayout,
    virtualItems,
    paddingTop,
    paddingBottom,
    stickyHeaderOffset,
    loading,
    i18n,
    emptyText,
    selectedMap,
    activeIndex,
    gridFocused,
    selectionEnabled,
    cellSelectionEnabled,
    activeCell,
    isCellSelected,
    onCellSelectionPointer,
    rowIdPrefix,
    rowFocusClassName,
    showActiveRowIndicator,
    activeRowIndicatorClassName,
    getDisabledRowState,
    onRowClick,
    publicOnRowClick,
    publicOnRowDoubleClick,
    publicOnCellClick,
    publicOnCellDoubleClick,
    rowProps,
    rowClassName,
    renderRow,
    onRenderRow,
    cellDOMProps,
    showHoverRows,
    showEmptyRows,
    onRowContextMenu,
    rowHeight,
    resolveRowHeight,
    minRowHeight,
    maxRowHeight,
    measureElement,
    rowStyle,
    rowStyleMetadata,
    showZebraRows,
    editingCell,
    cellNodesRef,
    editStartEvent,
    onCellEditStart,
    onEditValueChange,
    onEditComplete,
    onEditStop,
    onEditCancel,
  } = props;
  const [hoveredCellId, setHoveredCellId] = React.useState<string | null>(null);
  const draggingCellSelectionRef = React.useRef(false);
  const rowLongPressTimerRef = React.useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const rowLongPressStartRef = React.useRef<{ x: number; y: number } | null>(
    null
  );
  const suppressRowClickUntilRef = React.useRef(0);
  const measureNaturalRow = React.useCallback(
    (element: HTMLTableRowElement | null) => {
      measureElement?.(element);
    },
    [measureElement]
  );
  const renderedTableColumnCount = columnRenderItems.length;
  const columnRenderEdges = resolveColumnRenderEdges(columnRenderItems);
  /** Where the active-row indicator closes its left and right sides. */
  const rowEdgeClassName = (renderItemIndex: number) =>
    cn(
      renderItemIndex === columnRenderEdges.rowStartItemIndex
        ? "tdg-row-edge--start"
        : "",
      renderItemIndex === columnRenderEdges.rowEndItemIndex
        ? "tdg-row-edge--end"
        : ""
    );

  const cancelRowLongPress = React.useCallback(() => {
    if (rowLongPressTimerRef.current) {
      clearTimeout(rowLongPressTimerRef.current);
    }
    rowLongPressTimerRef.current = null;
    rowLongPressStartRef.current = null;
  }, []);

  React.useEffect(() => cancelRowLongPress, [cancelRowLongPress]);
  React.useEffect(() => {
    const stopDragging = () => {
      draggingCellSelectionRef.current = false;
    };
    const extendDragging = (event: PointerEvent) => {
      if (!draggingCellSelectionRef.current) return;
      const target = document
        .elementFromPoint(event.clientX, event.clientY)
        ?.closest<HTMLElement>('[data-slot="grid-cell"]');
      const row = target?.closest<HTMLElement>('[data-slot="grid-row"]');
      const rowIndex = Number(row?.dataset.rowIndex);
      const columnIndex = Number(target?.dataset.columnIndex);
      if (!Number.isInteger(rowIndex) || !Number.isInteger(columnIndex)) return;
      onCellSelectionPointer(rowIndex, columnIndex, {
        button: 0,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        shiftKey: true,
      });
    };
    window.addEventListener("pointermove", extendDragging);
    window.addEventListener("pointerup", stopDragging);
    window.addEventListener("pointercancel", stopDragging);
    return () => {
      window.removeEventListener("pointermove", extendDragging);
      window.removeEventListener("pointerup", stopDragging);
      window.removeEventListener("pointercancel", stopDragging);
    };
  }, [onCellSelectionPointer]);

  function getContextRowProps(
    row: GridContextRow,
    rowIndex: number,
    rowIsSelected: boolean,
    rowIsActive: boolean,
    disabledRow: boolean | null | undefined
  ): TypeRowProps {
    const resolvedHeight = getResolvedRowHeight(rowIndex);
    return {
      data: row.original,
      dataSourceArray: rowStyleMetadata.dataSourceArray,
      id: getCompatRowId(row, rowStyleMetadata.getItemId),
      index: rowIndex,
      rowIndex,
      realIndex: rowIndex,
      remoteRowIndex: rowStyleMetadata.remoteRowOffset + rowIndex,
      selected: rowIsSelected,
      rowSelected: rowIsSelected,
      active: rowIsActive,
      disabledRow,
      selection: rowStyleMetadata.selection,
      multiSelect: rowStyleMetadata.multiSelect,
      even: rowIndex % 2 === 1,
      odd: rowIndex % 2 === 0,
      last: rowIndex === rowModel.length - 1,
      lastNonEmpty: rowIndex === rowModel.length - 1,
      columns: rowStyleMetadata.columns,
      columnsMap: rowStyleMetadata.columnsMap,
      columnRenderCount: rowStyleMetadata.columnRenderCount,
      totalColumnCount: rowStyleMetadata.totalColumnCount,
      firstUnlockedIndex: rowStyleMetadata.firstUnlockedIndex,
      lastUnlockedIndex: rowStyleMetadata.lastUnlockedIndex,
      firstLockedStartIndex: rowStyleMetadata.firstLockedStartIndex,
      lastLockedStartIndex: rowStyleMetadata.lastLockedStartIndex,
      firstLockedEndIndex: rowStyleMetadata.firstLockedEndIndex,
      lastLockedEndIndex: rowStyleMetadata.lastLockedEndIndex,
      hasLockedStart: rowStyleMetadata.hasLockedStart,
      hasLockedEnd: rowStyleMetadata.hasLockedEnd,
      availableWidth: rowStyleMetadata.availableWidth,
      width: rowStyleMetadata.totalComputedWidth,
      minWidth: rowStyleMetadata.totalComputedWidth,
      totalComputedWidth: rowStyleMetadata.totalComputedWidth,
      totalUnlockedWidth: rowStyleMetadata.totalUnlockedWidth,
      totalLockedStartWidth: rowStyleMetadata.totalLockedStartWidth,
      totalLockedEndWidth: rowStyleMetadata.totalLockedEndWidth,
      totalDataCount: rowStyleMetadata.dataSourceArray.length,
      maxVisibleRows: rowStyleMetadata.maxVisibleRows,
      rowHeight: resolvedHeight ?? minRowHeight,
      defaultRowHeight: resolvedHeight ?? minRowHeight,
      initialRowHeight: resolvedHeight ?? minRowHeight,
      height: resolvedHeight,
      minRowHeight,
      ...(maxRowHeight === undefined ? {} : { maxRowHeight }),
      naturalRowHeight: rowHeight == null,
      computedShowZebraRows: showZebraRows,
      computedShowCellBorders: rowStyleMetadata.computedShowCellBorders,
      showHorizontalCellBorders,
      showVerticalCellBorders,
      editable: rowStyleMetadata.editable,
      editing:
        editingCell != null &&
        String(editingCell.rowId) === String(row.id) &&
        editingCell.rowIndex === rowIndex,
      editStartEvent,
      virtualizeColumns: rowStyleMetadata.virtualizeColumns,
      theme: rowStyleMetadata.theme,
      rtl: rowStyleMetadata.rtl,
      nativeScroll: rowStyleMetadata.nativeScroll,
      getItemId: rowStyleMetadata.getItemId,
    };
  }

  function getContextCellProps(
    row: GridContextRow,
    rowIndex: number,
    target: EventTarget | null
  ): TypeCellProps | undefined {
    const element = target instanceof HTMLElement ? target : null;
    const cellElement = element?.closest<HTMLElement>("[data-column-id]");
    const columnId = cellElement?.dataset.columnId;
    if (!columnId) return undefined;

    const cellIndex = orderedColumns.findIndex(
      (column) => (column.id ?? column.name) === columnId
    );
    const column = orderedColumns[cellIndex];
    const cell = row
      .getVisibleCells()
      .find((candidate) => candidate.column.id === columnId);
    if (!column || !cell) return undefined;

    return getDataCellProps({
      row,
      rowIndex,
      column,
      columnId,
      columnIndex: cellIndex,
      value: cell.getValue(),
      width: columnWidths[columnId],
    }) as TypeCellProps;
  }

  function getRowContextMenuHandlers(args: {
    row: GridContextRow;
    rowIndex: number;
    rowIsSelected: boolean;
    rowIsActive: boolean;
    disabledRow: boolean | null | undefined;
  }): React.HTMLAttributes<HTMLTableRowElement> {
    if (!onRowContextMenu) return {};
    const { row, rowIndex, rowIsSelected, rowIsActive, disabledRow } = args;
    const open = (
      event:
        | React.MouseEvent<HTMLElement>
        | React.KeyboardEvent<HTMLElement>
        | React.PointerEvent<HTMLElement>,
      alignTo: HTMLElement | { left: number; top: number }
    ) => {
      onRowContextMenu(
        getContextRowProps(
          row,
          rowIndex,
          rowIsSelected,
          rowIsActive,
          disabledRow
        ),
        getContextCellProps(row, rowIndex, event.target),
        event,
        alignTo
      );
    };

    return {
      onClickCapture: (event) => {
        if (Date.now() > suppressRowClickUntilRef.current) return;
        suppressRowClickUntilRef.current = 0;
        event.preventDefault();
        event.stopPropagation();
      },
      onContextMenu: (event) => {
        open(event, { left: event.clientX, top: event.clientY });
      },
      onPointerDown: (event) => {
        if (event.pointerType !== "touch") return;
        event.persist();
        cancelRowLongPress();
        suppressRowClickUntilRef.current = 0;
        rowLongPressStartRef.current = {
          x: event.clientX,
          y: event.clientY,
        };
        const currentTarget = event.currentTarget;
        rowLongPressTimerRef.current = setTimeout(() => {
          rowLongPressTimerRef.current = null;
          suppressRowClickUntilRef.current = Date.now() + 800;
          open(event, { left: event.clientX, top: event.clientY });
          currentTarget.focus?.({ preventScroll: true });
        }, 500);
      },
      onPointerMove: (event) => {
        const start = rowLongPressStartRef.current;
        if (
          start &&
          Math.hypot(event.clientX - start.x, event.clientY - start.y) > 8
        ) {
          cancelRowLongPress();
        }
      },
      onPointerUp: cancelRowLongPress,
      onPointerCancel: cancelRowLongPress,
    };
  }

  function getRowThemeClasses(
    rowIndex: number,
    rowIsSelected: boolean,
    rowIsDisabled: boolean,
    rowIsActive: boolean
  ): string {
    const odd = rowIndex % 2 === 0;
    return cn(
      "tdg-row InovuaReactDataGrid__row",
      showZebraRows
        ? odd
          ? cn(
              "tdg-row--odd InovuaReactDataGrid__row--odd bg-[var(--tdg-row-odd-bg)]",
              showHoverRows &&
                "hover:bg-[var(--tdg-row-odd-hover-bg)] hover:[color:var(--tdg-row-active-color)]"
            )
          : cn(
              "tdg-row--even InovuaReactDataGrid__row--even bg-[var(--tdg-row-even-bg)]",
              showHoverRows &&
                "hover:bg-[var(--tdg-row-even-hover-bg)] hover:[color:var(--tdg-row-active-color)]"
            )
        : cn(
            "tdg-row--no-zebra InovuaReactDataGrid__row--no-zebra bg-[var(--tdg-grid-bg)]",
            showHoverRows &&
              "hover:bg-[var(--tdg-row-odd-hover-bg)] hover:[color:var(--tdg-row-active-color)]"
          ),
      rowIsSelected
        ? showZebraRows
          ? odd
            ? cn(
                "tdg-row--selected InovuaReactDataGrid__row--selected bg-[var(--tdg-row-odd-selected-bg)] [color:var(--tdg-row-active-color)]",
                showHoverRows &&
                  "hover:bg-[var(--tdg-row-odd-selected-hover-bg)] hover:[color:var(--tdg-row-active-color)]"
              )
            : cn(
                "tdg-row--selected InovuaReactDataGrid__row--selected bg-[var(--tdg-row-even-selected-bg)] [color:var(--tdg-row-active-color)]",
                showHoverRows &&
                  "hover:bg-[var(--tdg-row-even-selected-hover-bg)] hover:[color:var(--tdg-row-active-color)]"
              )
          : cn(
              "tdg-row--selected InovuaReactDataGrid__row--selected bg-[var(--tdg-row-selected-bg)] [color:var(--tdg-row-active-color)]",
              showHoverRows && "hover:bg-[var(--tdg-row-selected-hover-bg)]"
            )
        : "",
      rowIsActive
        ? "tdg-row--active InovuaReactDataGrid__row--active [color:var(--tdg-row-active-color)]"
        : "",
      rowIsActive && gridFocused
        ? cn(
            "tdg-row--focused InovuaReactDataGrid__row--focused",
            rowFocusClassName,
            showActiveRowIndicator ? "tdg-row--active-indicator" : "",
            showActiveRowIndicator ? activeRowIndicatorClassName : ""
          )
        : "",
      rowIsDisabled
        ? "tdg-row--disabled InovuaReactDataGrid__row--disabled pointer-events-none opacity-50"
        : ""
    );
  }

  function getResolvedRowHeight(rowIndex: number): number | null {
    if (resolveRowHeight) return resolveRowHeight(rowIndex);
    if (rowHeight == null) return null;

    return resolveConfiguredRowHeight({
      rowHeight,
      rowIndex,
      minRowHeight,
      maxRowHeight,
    });
  }

  function getDataCellProps(args: {
    row: any;
    rowIndex: number;
    column: TypeColumn;
    columnId: string;
    columnIndex: number;
    value: unknown;
    width?: number;
    empty?: boolean;
    inEdit?: boolean;
    editValue?: unknown;
  }): CellProps {
    const rowId = getCompatRowId(args.row, rowStyleMetadata.getItemId);
    return buildEditCellProps({
      value: args.value,
      data: args.row.original,
      rowIndex: args.rowIndex,
      remoteRowIndex: rowStyleMetadata.remoteRowOffset + args.rowIndex,
      rowId,
      rowSelected: Boolean(selectedMap[String(args.row.id)]),
      rowActive: args.rowIndex === activeIndex,
      cellSelected: isCellSelected(args.rowIndex, args.columnIndex),
      cellActive:
        activeCell?.[0] === args.rowIndex &&
        activeCell?.[1] === args.columnIndex,
      empty: args.empty ?? false,
      disabledRow: getDisabledRowState(args.rowIndex),
      selection: rowStyleMetadata.selection,
      multiSelect: rowStyleMetadata.multiSelect,
      naturalRowHeight: rowHeight == null,
      resolvedRowHeight: getResolvedRowHeight(args.rowIndex) ?? minRowHeight,
      minRowHeight,
      column: args.column,
      columnId: args.columnId,
      columnIndex: args.columnIndex,
      columnCount: orderedColumns.length,
      computedWidth: args.width,
      editValue: args.editValue,
      inEdit: args.inEdit,
      editable: rowStyleMetadata.editable,
      editStartEvent,
      theme: rowStyleMetadata.theme,
      totalDataCount: rowStyleMetadata.dataSourceArray.length,
      totalCount: rowStyleMetadata.totalCount,
      virtualizeColumns,
    });
  }

  function resolveCellDOMProps(
    config: TypeDataGridProps["cellDOMProps"] | TypeColumn["cellDOMProps"],
    cellProps: CellProps
  ): React.TdHTMLAttributes<HTMLTableCellElement> {
    if (!config) return {};
    return typeof config === "function" ? (config(cellProps) ?? {}) : config;
  }

  function getRowStyle(
    row: any,
    rowIndex: number,
    rowIsSelected: boolean,
    disabledRow: boolean | null | undefined,
    virtualSize?: number
  ): React.CSSProperties {
    const resolvedHeight = getResolvedRowHeight(rowIndex);
    const baseStyle: React.CSSProperties = {
      // Match the style object Inovua gives rowStyle callbacks. Natural rows
      // expose a null height while minHeight still protects our measured table
      // layout; fixed/function rows expose their resolved virtual height.
      height:
        rowHeight == null
          ? (null as unknown as React.CSSProperties["height"])
          : (virtualSize ?? resolvedHeight ?? minRowHeight),
      ...(rowHeight == null ? { minHeight: minRowHeight } : {}),
      width: rowStyleMetadata.totalComputedWidth,
      minWidth: rowStyleMetadata.totalComputedWidth,
      direction: rowStyleMetadata.rtl ? "rtl" : "ltr",
      ...(typeof rowHeight !== "number" &&
      typeof maxRowHeight === "number" &&
      Number.isFinite(maxRowHeight)
        ? { maxHeight: maxRowHeight }
        : {}),
    };

    const configuredStyle =
      typeof rowStyle === "function"
        ? rowStyle({
            data: row.original,
            props: {
              data: row.original,
              dataSourceArray: rowStyleMetadata.dataSourceArray,
              id: rowStyleMetadata.getItemId(row.original) as string | number,
              index: rowIndex,
              rowIndex,
              realIndex: rowIndex,
              remoteRowIndex: rowStyleMetadata.remoteRowOffset + rowIndex,
              selected: rowIsSelected,
              disabledRow,
              selection: rowStyleMetadata.selection,
              multiSelect: rowStyleMetadata.multiSelect,
              even: rowIndex % 2 === 1,
              odd: rowIndex % 2 === 0,
              last: rowIndex === rowModel.length - 1,
              lastNonEmpty: rowIndex === rowModel.length - 1,
              columns: rowStyleMetadata.columns,
              columnsMap: rowStyleMetadata.columnsMap,
              columnRenderCount: rowStyleMetadata.columnRenderCount,
              totalColumnCount: rowStyleMetadata.totalColumnCount,
              firstUnlockedIndex: rowStyleMetadata.firstUnlockedIndex,
              lastUnlockedIndex: rowStyleMetadata.lastUnlockedIndex,
              firstLockedStartIndex: rowStyleMetadata.firstLockedStartIndex,
              lastLockedStartIndex: rowStyleMetadata.lastLockedStartIndex,
              firstLockedEndIndex: rowStyleMetadata.firstLockedEndIndex,
              lastLockedEndIndex: rowStyleMetadata.lastLockedEndIndex,
              hasLockedStart: rowStyleMetadata.hasLockedStart,
              hasLockedEnd: rowStyleMetadata.hasLockedEnd,
              availableWidth: rowStyleMetadata.availableWidth,
              width: rowStyleMetadata.totalComputedWidth,
              minWidth: rowStyleMetadata.totalComputedWidth,
              totalComputedWidth: rowStyleMetadata.totalComputedWidth,
              totalUnlockedWidth: rowStyleMetadata.totalUnlockedWidth,
              totalLockedStartWidth: rowStyleMetadata.totalLockedStartWidth,
              totalLockedEndWidth: rowStyleMetadata.totalLockedEndWidth,
              totalDataCount: rowStyleMetadata.dataSourceArray.length,
              maxVisibleRows: rowStyleMetadata.maxVisibleRows,
              rowHeight: resolvedHeight ?? minRowHeight,
              defaultRowHeight: resolvedHeight ?? minRowHeight,
              initialRowHeight: resolvedHeight ?? minRowHeight,
              height: resolvedHeight,
              minRowHeight,
              ...(maxRowHeight === undefined ? {} : { maxRowHeight }),
              naturalRowHeight: rowHeight == null,
              computedShowZebraRows: showZebraRows,
              computedShowCellBorders: rowStyleMetadata.computedShowCellBorders,
              showHorizontalCellBorders,
              showVerticalCellBorders,
              editable: rowStyleMetadata.editable,
              editing:
                editingCell != null &&
                String(editingCell.rowId) === String(row.id) &&
                editingCell.rowIndex === rowIndex,
              editStartEvent,
              ...(editingCell != null &&
              String(editingCell.rowId) === String(row.id) &&
              editingCell.rowIndex === rowIndex
                ? {
                    editValue: editingCell.value,
                    editColumnIndex: editingCell.columnIndex,
                    editColumnId: editingCell.columnId,
                  }
                : {}),
              virtualizeColumns: rowStyleMetadata.virtualizeColumns,
              theme: rowStyleMetadata.theme,
              getItemId: rowStyleMetadata.getItemId,
            },
            style: baseStyle as React.CSSProperties &
              Record<string, string | number | undefined>,
          })
        : rowStyle;

    const mergedStyle = configuredStyle
      ? { ...baseStyle, ...configuredStyle }
      : baseStyle;

    // Inovua exposes `height: null` to a natural-row style callback. A native
    // table row does not honor minHeight, though, so keep that callback
    // contract while applying the minimum only to the final rendered style
    // when the callback did not choose a concrete height.
    if (rowHeight == null && mergedStyle.height == null) {
      return { ...mergedStyle, height: minRowHeight };
    }

    return mergedStyle;
  }

  function renderEditor(
    row: any,
    rowIndex: number,
    cellIndex: number,
    column: TypeColumn,
    columnId: string
  ): React.ReactNode {
    const rowId = getCompatRowId(row, rowStyleMetadata.getItemId);
    if (
      !editingCell ||
      String(editingCell.rowId) !== String(rowId) ||
      editingCell.columnId !== columnId
    ) {
      return null;
    }

    const configuredEditorProps = column.editorProps ?? {};
    const cellKey = `${String(row.id)}\u0000${columnId}`;
    const cellProps = getDataCellProps({
      row,
      rowIndex,
      column,
      columnId,
      columnIndex: cellIndex,
      value: editingCell.originalValue,
      width: columnWidths[columnId],
      editValue: editingCell.value,
      inEdit: true,
    });

    const toNavigation = (
      type: GridEditNavigation["type"],
      direction?: number
    ): GridEditNavigation | undefined => {
      if (!direction) return undefined;
      return { type, direction: direction < 0 ? -1 : 1 };
    };
    const getEditable = async (
      editValue: unknown = editingCell.value,
      propsForEdit: CellProps = cellProps
    ): Promise<boolean> => {
      const configuredEditable =
        column.editable === undefined
          ? rowStyleMetadata.editable
          : column.editable;
      if (typeof configuredEditable !== "function") {
        return Boolean(configuredEditable);
      }

      try {
        return Boolean(await configuredEditable(editValue, propsForEdit));
      } catch {
        return false;
      }
    };
    const compatCell: TypeColumnEditorCell = {
      getProps: () => cellProps,
      getDOMNode: () => cellNodesRef.current.get(cellKey) ?? null,
      isInEdit: () =>
        String(editingCell.rowId) === String(rowId) &&
        editingCell.columnId === columnId,
      getEditable,
      startEdit: async (editValue, errBack) => {
        const nextValue =
          editValue === undefined ? editingCell.value : editValue;
        try {
          const started = await onCellEditStart({
            rowId,
            rowIndex,
            columnId,
            columnIndex: cellIndex,
            value: nextValue,
            data: row.original,
            column,
            cellProps,
            initialCellHeight: editingCell.initialCellHeight,
            useEditStartValue: false,
          });
          if (!started) return errBack?.(false);
          return nextValue;
        } catch (error) {
          return errBack?.(error);
        }
      },
      stopEdit: (value) => {
        void onEditStop(undefined, value);
      },
      cancelEdit: onEditCancel,
      completeEdit: (value) => {
        void onEditComplete(undefined, value);
      },
      getCurrentEditValue: () => editingCell.value,
      getEditStartValue: (propsForEdit = cellProps) =>
        Promise.resolve(
          typeof column.getEditStartValue === "function"
            ? column.getEditStartValue(propsForEdit.value, propsForEdit)
            : propsForEdit.value
        ),
      gotoNextEditor: () => onEditStop({ type: "tab", direction: 1 }),
      gotoPrevEditor: () => onEditStop({ type: "tab", direction: -1 }),
      onEditorEnterNavigation: (complete = true, direction = 0) => {
        const navigation = toNavigation("enter", direction);
        if (complete) void onEditComplete(navigation);
        else void onEditStop(navigation);
      },
      onEditorTabNavigation: (complete = true, direction = 0) => {
        const navigation = toNavigation("tab", direction);
        if (complete) void onEditComplete(navigation);
        else void onEditStop(navigation);
      },
      onEditorClick: (event) => event.stopPropagation(),
      get domRef() {
        return cellNodesRef.current.get(cellKey) ?? null;
      },
      props: cellProps,
    };
    const editorProps: TypeColumnEditorProps = {
      ...configuredEditorProps,
      nativeScroll: rowStyleMetadata.nativeScroll,
      editorProps: configuredEditorProps,
      cell: compatCell,
      value: editingCell.value,
      theme: rowStyleMetadata.theme,
      rtl: rowStyleMetadata.rtl,
      autoFocus: true,
      cellProps,
      column,
      onChange: (value) => onEditValueChange(normalizeEditorValue(value)),
      onComplete: (value) =>
        onEditComplete(
          undefined,
          value === undefined ? undefined : normalizeEditorValue(value)
        ),
      onCancel: onEditCancel,
      onEnterNavigation: (complete = true, direction = 0) => {
        compatCell.onEditorEnterNavigation(complete, direction);
      },
      onTabNavigation: (complete = true, direction = 0) => {
        compatCell.onEditorTabNavigation(complete, direction);
      },
      gotoNext: compatCell.gotoNextEditor,
      gotoPrev: compatCell.gotoPrevEditor,
      key: "editor",
      onClick: compatCell.onEditorClick,
    };

    if (React.isValidElement(column.editor)) {
      return React.cloneElement(column.editor, editorProps);
    }

    if (column.editor) {
      return React.createElement(
        column.editor as React.ElementType<any>,
        editorProps
      );
    }

    if (typeof column.renderEditor === "function") {
      return column.renderEditor(editorProps, cellProps, compatCell);
    }

    return (
      <DefaultCellEditor
        value={editingCell.value}
        ariaLabel={
          typeof column.header === "string" || typeof column.header === "number"
            ? String(column.header)
            : String(column.name ?? column.id ?? columnId)
        }
        onChange={onEditValueChange}
        onComplete={onEditComplete}
        onCancel={onEditCancel}
      />
    );
  }

  type SpanEntry = {
    covered: boolean;
    rowSpan: number;
    colSpan: number;
  };
  const spanDataSourceArray = rowStyleMetadata.dataSourceArray;
  const spanEditable = rowStyleMetadata.editable;
  const spanGetItemId = rowStyleMetadata.getItemId;
  const spanMultiSelect = rowStyleMetadata.multiSelect;
  const spanRemoteRowOffset = rowStyleMetadata.remoteRowOffset;
  const spanSelection = rowStyleMetadata.selection;
  const spanTheme = rowStyleMetadata.theme;
  const spanTotalCount = rowStyleMetadata.totalCount;
  const spanPlan = React.useMemo(() => {
    if (
      !orderedColumns.some(
        (column) => column.rowspan != null || column.colspan != null
      )
    ) {
      return null;
    }

    const plan = new Map<string, SpanEntry>();
    const spanRows = spanDataSourceArray;
    for (let rowIndex = 0; rowIndex < spanRows.length; rowIndex += 1) {
      const data = spanRows[rowIndex];
      const resolvedRowId = spanGetItemId(data);
      const row = {
        id: resolvedRowId == null ? String(rowIndex) : String(resolvedRowId),
        original: data,
      };
      for (
        let columnIndex = 0;
        columnIndex < orderedColumns.length;
        columnIndex += 1
      ) {
        const key = `${rowIndex},${columnIndex}`;
        if (plan.get(key)?.covered) continue;
        const column = orderedColumns[columnIndex]!;
        const columnId = getColumnIdCompat(column);
        const value = data?.[columnId];
        const resolvedSpanRowHeight =
          rowHeight == null
            ? null
            : resolveConfiguredRowHeight({
                rowHeight,
                rowIndex,
                minRowHeight,
                maxRowHeight,
              });
        const cellPropsForSpan = buildEditCellProps({
          value,
          data,
          rowIndex,
          remoteRowIndex: spanRemoteRowOffset + rowIndex,
          rowId: getCompatRowId(row, spanGetItemId),
          rowSelected: Boolean(selectedMap[String(row.id)]),
          rowActive: rowIndex === activeIndex,
          cellSelected: isCellSelected(rowIndex, columnIndex),
          cellActive:
            activeCell?.[0] === rowIndex && activeCell?.[1] === columnIndex,
          empty: false,
          disabledRow: getDisabledRowState(rowIndex),
          selection: spanSelection,
          multiSelect: spanMultiSelect,
          naturalRowHeight: rowHeight == null,
          resolvedRowHeight: resolvedSpanRowHeight ?? minRowHeight,
          minRowHeight,
          column,
          columnId,
          columnIndex,
          columnCount: orderedColumns.length,
          computedWidth: columnWidths[columnId],
          editable: spanEditable,
          editStartEvent,
          theme: spanTheme,
          totalDataCount: spanRows.length,
          totalCount: spanTotalCount,
          virtualizeColumns,
        });
        const configuredRowSpan =
          typeof column.rowspan === "function"
            ? column.rowspan(cellPropsForSpan)
            : column.rowspan;
        const configuredColSpan =
          typeof column.colspan === "function"
            ? column.colspan(cellPropsForSpan)
            : column.colspan;
        const rowSpan = clampSpan(
          configuredRowSpan,
          spanRows.length - rowIndex
        );
        let colSpan = clampSpan(
          configuredColSpan,
          orderedColumns.length - columnIndex
        );
        const lockedSide = resolveColumnLock(column);
        while (
          colSpan > 1 &&
          resolveColumnLock(orderedColumns[columnIndex + colSpan - 1]!) !==
            lockedSide
        ) {
          colSpan -= 1;
        }
        plan.set(key, { covered: false, rowSpan, colSpan });
        for (let rowOffset = 0; rowOffset < rowSpan; rowOffset += 1) {
          for (
            let columnOffset = 0;
            columnOffset < colSpan;
            columnOffset += 1
          ) {
            if (rowOffset === 0 && columnOffset === 0) continue;
            plan.set(`${rowIndex + rowOffset},${columnIndex + columnOffset}`, {
              covered: true,
              rowSpan: 1,
              colSpan: 1,
            });
          }
        }
      }
    }
    return plan;
  }, [
    activeCell,
    activeIndex,
    columnWidths,
    editStartEvent,
    getDisabledRowState,
    isCellSelected,
    maxRowHeight,
    minRowHeight,
    orderedColumns,
    rowHeight,
    selectedMap,
    spanDataSourceArray,
    spanEditable,
    spanGetItemId,
    spanMultiSelect,
    spanRemoteRowOffset,
    spanSelection,
    spanTheme,
    spanTotalCount,
    virtualizeColumns,
  ]);

  function getColumnIdCompat(column: TypeColumn): string {
    return String(column.id ?? column.name);
  }

  function clampSpan(value: unknown, available: number): number {
    const numeric =
      typeof value === "number" && Number.isFinite(value)
        ? Math.trunc(value)
        : 1;
    return Math.max(1, Math.min(available, numeric));
  }

  function renderCells(
    row: any,
    rowIndex: number,
    virtualRowHeight?: number
  ): React.ReactNode {
    const resolvedRowHeight = getResolvedRowHeight(rowIndex);
    const contentHeightLimit =
      rowHeight == null ? maxRowHeight : resolvedRowHeight;
    const contentStyle =
      typeof contentHeightLimit === "number" &&
      Number.isFinite(contentHeightLimit)
        ? { maxHeight: Math.max(0, contentHeightLimit - 16) }
        : undefined;

    const allCells = row.getVisibleCells();
    return (
      <>
        {columnRenderItems.map((renderItem, renderItemIndex) => {
          if (renderItem.type === "spacer") {
            return (
              <TableCell
                key={renderItem.id}
                aria-hidden="true"
                className={cn(
                  "pointer-events-none !p-0",
                  rowEdgeClassName(renderItemIndex)
                )}
                style={{
                  width: renderItem.width,
                  minWidth: renderItem.width,
                  maxWidth: renderItem.width,
                }}
              />
            );
          }

          if (renderItem.type === "filler") {
            return (
              <TableCell
                key={renderItem.id}
                aria-hidden="true"
                data-slot="grid-filler-cell"
                data-filler-variant={renderItem.variant}
                data-horizontal-borders={
                  showHorizontalCellBorders ? "true" : "false"
                }
                className={cn(
                  "tdg-filler-cell pointer-events-none !p-0",
                  `tdg-filler-cell--${renderItem.variant}`,
                  rowEdgeClassName(renderItemIndex)
                )}
                style={{
                  width: renderItem.width,
                  minWidth: renderItem.width,
                  maxWidth: renderItem.width,
                }}
              />
            );
          }

          const cellIndex = renderItem.index;
          const cell = allCells[cellIndex];
          if (!cell) return null;

          const columnId = cell.column.id;
          const column = (cell.column.columnDef as any)?.meta?.__column as
            | TypeColumn
            | undefined;
          const width = cell.column.getSize();
          const lockedLayout = lockedColumnLayout[columnId];
          const cellKey = `${String(row.id)}\u0000${columnId}`;
          const align = column?.textAlign;
          // The content wrapper is a flex row, so its child hugs itself and
          // `text-align` cannot place it. This also aligns a custom `render`.
          const contentAlignClass =
            align === "right" || align === "end"
              ? "justify-end"
              : align === "center"
                ? "justify-center"
                : "";
          /*
           * `--last` drops the right border because nothing follows. That means
           * "at the table's trailing edge", not "the last column": with a filler
           * after it, the final column does need its border — that border is the
           * rule between the data and the gap.
           */
          const isLastCell =
            columnId === columnRenderEdges.trailingEdgeColumnId;
          const rowId = getCompatRowId(row, rowStyleMetadata.getItemId);
          const isEditingThisCell = Boolean(
            editingCell &&
            String(editingCell.rowId) === String(rowId) &&
            editingCell.columnId === columnId
          );
          const cellProps = column
            ? getDataCellProps({
                row,
                rowIndex,
                column,
                columnId,
                columnIndex: cellIndex,
                value: cell.getValue(),
                width,
                ...(isEditingThisCell
                  ? {
                      inEdit: true,
                      editValue: editingCell?.value,
                    }
                  : {}),
              })
            : null;
          let lastInlineStartSucceeded = false;
          const startInlineEdit = async (
            editValue?: unknown,
            errBack?: (...args: any[]) => any
          ) => {
            lastInlineStartSucceeded = false;
            if (!column || !cellProps) return errBack?.(false);
            try {
              const started = await onCellEditStart({
                rowId,
                rowIndex,
                columnId,
                columnIndex: cellIndex,
                value: editValue === undefined ? cell.getValue() : editValue,
                data: row.original,
                column,
                cellProps,
                initialCellHeight:
                  cellNodesRef.current.get(cellKey)?.getBoundingClientRect()
                    .height ?? null,
                useEditStartValue: editValue === undefined,
              });
              if (!started) return errBack?.(false);
              lastInlineStartSucceeded = true;
              return (
                editingCell?.value ??
                (editValue === undefined ? cell.getValue() : editValue)
              );
            } catch (error) {
              return errBack?.(error);
            }
          };
          let rendersInlineEditor = false;
          if (column?.rendersInlineEditor && cellProps) {
            try {
              rendersInlineEditor =
                typeof column.rendersInlineEditor === "function"
                  ? Boolean(column.rendersInlineEditor(cellProps))
                  : true;
            } catch {
              rendersInlineEditor = false;
            }
          }
          if (rendersInlineEditor && cellProps) {
            const ensureEditing = async (value?: unknown) => {
              if (isEditingThisCell) return true;
              await startInlineEdit(value);
              return lastInlineStartSucceeded;
            };
            cellProps.rendersInlineEditor = column?.rendersInlineEditor;
            cellProps.editProps = {
              inEdit: isEditingThisCell,
              value: isEditingThisCell ? editingCell?.value : cell.getValue(),
              startEdit: startInlineEdit,
              onClick: (event) => event.stopPropagation(),
              onChange: (value) => {
                const normalized = normalizeEditorValue(value);
                void (async () => {
                  if (await ensureEditing()) onEditValueChange(normalized);
                })();
              },
              onComplete: (value) => {
                const normalized =
                  value === undefined ? undefined : normalizeEditorValue(value);
                void (async () => {
                  if (await ensureEditing(normalized)) {
                    await onEditComplete(undefined, normalized);
                  }
                })();
              },
              onCancel: () => {
                if (isEditingThisCell) onEditCancel();
              },
              onEnterNavigation: (complete = true, direction = 0) => {
                const navigation =
                  direction === 0
                    ? undefined
                    : ({
                        type: "enter",
                        direction: direction < 0 ? -1 : 1,
                      } as const);
                void (async () => {
                  if (!(await ensureEditing())) return;
                  if (complete) await onEditComplete(navigation);
                  else await onEditStop(navigation);
                })();
              },
              onTabNavigation: (complete = true, direction = 0) => {
                const navigation =
                  direction === 0
                    ? undefined
                    : ({
                        type: "tab",
                        direction: direction < 0 ? -1 : 1,
                      } as const);
                void (async () => {
                  if (!(await ensureEditing())) return;
                  if (complete) await onEditComplete(navigation);
                  else await onEditStop(navigation);
                })();
              },
              gotoNext: () => {
                void (async () => {
                  if (await ensureEditing()) {
                    await onEditStop({ type: "tab", direction: 1 });
                  }
                })();
              },
              gotoPrev: () => {
                void (async () => {
                  if (await ensureEditing()) {
                    await onEditStop({ type: "tab", direction: -1 });
                  }
                })();
              },
            };
          }
          const editor =
            column && !rendersInlineEditor
              ? renderEditor(row, rowIndex, cellIndex, column, columnId)
              : null;
          const spanEntry = spanPlan?.get(`${rowIndex},${cellIndex}`);
          if (spanEntry?.covered) return null;
          const rootCellDOMProps = cellProps
            ? resolveCellDOMProps(cellDOMProps, cellProps)
            : {};
          const columnCellDOMProps =
            cellProps && column
              ? resolveCellDOMProps(column.cellDOMProps, cellProps)
              : {};
          const inheritedCellDOMProps = {
            ...rootCellDOMProps,
            ...columnCellDOMProps,
          };
          const configuredClassName =
            typeof column?.className === "function" && cellProps
              ? column.className(cellProps)
              : column?.className;
          const configuredStyle =
            typeof column?.style === "function" && cellProps
              ? column.style(cellProps)
              : column?.style;

          const startEdit = () => {
            // The editor's own click/double-click events can bubble through
            // the cell. Inovua only starts when this cell is not already in
            // edit, so repeated activation must be idempotent.
            if (!column || isEditingThisCell) return;
            const value = cell.getValue();
            if (!cellProps) return;

            onCellEditStart({
              rowId,
              rowIndex,
              columnId,
              columnIndex: cellIndex,
              value,
              data: row.original,
              column,
              cellProps,
              initialCellHeight:
                cellNodesRef.current.get(cellKey)?.getBoundingClientRect()
                  .height ?? null,
              useEditStartValue: true,
            });
          };
          const normalizedStartEvent = editStartEvent.toLowerCase();
          const cellIsSelected = isCellSelected(rowIndex, cellIndex);
          const cellIsActive =
            activeCell?.[0] === rowIndex && activeCell?.[1] === cellIndex;
          const renderCellContent = () => {
            if (!column?.render || !cellProps) {
              return flexRender(cell.column.columnDef.cell, cell.getContext());
            }
            const render = column.render as (
              valueOrCellProps: unknown,
              args?: CellProps
            ) => React.ReactNode;
            if (render.length <= 1) return render(cellProps);
            return render(cell.getValue(), cellProps);
          };

          return (
            <TableCell
              {...inheritedCellDOMProps}
              ref={(node) => {
                if (node) cellNodesRef.current.set(cellKey, node);
                else cellNodesRef.current.delete(cellKey);
              }}
              key={cell.id}
              data-slot="grid-cell"
              data-column-id={columnId}
              data-column-index={cellIndex}
              data-editing={isEditingThisCell ? "true" : "false"}
              data-cell-active={cellIsActive ? "true" : "false"}
              data-cell-selected={cellIsSelected ? "true" : "false"}
              aria-selected={cellSelectionEnabled ? cellIsSelected : undefined}
              tabIndex={
                cellSelectionEnabled
                  ? cellIsActive
                    ? 0
                    : -1
                  : inheritedCellDOMProps.tabIndex
              }
              rowSpan={spanEntry?.rowSpan}
              colSpan={spanEntry?.colSpan}
              className={cn(
                userSelectClass,
                "InovuaReactDataGrid__cell",
                "InovuaReactDataGrid__cell--direction-ltr",
                rowEdgeClassName(renderItemIndex),
                lockedLayout
                  ? [
                      "tdg-locked-column",
                      `tdg-locked-column--${lockedLayout.side}`,
                      `InovuaReactDataGrid__cell--locked-${lockedLayout.side}`,
                      lockedLayout.boundary
                        ? `tdg-locked-column--${lockedLayout.side}-boundary`
                        : "",
                    ]
                  : "",
                showHorizontalCellBorders
                  ? "InovuaReactDataGrid__cell--show-border-bottom"
                  : "",
                showVerticalCellBorders
                  ? "InovuaReactDataGrid__cell--show-border-right"
                  : "",
                isLastCell ? "InovuaReactDataGrid__cell--last" : "",
                showHoverRows && hoveredCellId === cell.id
                  ? "InovuaReactDataGrid__cell--over"
                  : "",
                cellIsSelected ? "tdg-cell--selected bg-accent/50" : "",
                cellIsActive
                  ? "tdg-cell--active outline outline-2 -outline-offset-2 outline-ring"
                  : "",
                showHorizontalCellBorders
                  ? "border-b [border-bottom-color:var(--tdg-cell-border-color)]"
                  : "",
                showVerticalCellBorders
                  ? "border-r last:border-r-0 [border-right-color:var(--tdg-cell-border-color)]"
                  : "",
                align === "right" || align === "end"
                  ? "text-right"
                  : align === "center"
                    ? "text-center"
                    : "",
                configuredClassName,
                inheritedCellDOMProps.className
              )}
              style={{
                width,
                minWidth: column?.minWidth,
                maxWidth: column?.maxWidth,
                ...(configuredStyle ?? {}),
                ...(inheritedCellDOMProps.style ?? {}),
                ...(lockedLayout
                  ? ({
                      "--tdg-locked-column-offset": `${lockedLayout.offset}px`,
                    } as React.CSSProperties)
                  : {}),
                ...(isEditingThisCell && rowHeight == null
                  ? {
                      height:
                        editingCell?.initialCellHeight ?? virtualRowHeight,
                    }
                  : {}),
              }}
              onPointerDown={(event) => {
                rootCellDOMProps.onPointerDown?.(event);
                columnCellDOMProps.onPointerDown?.(event);
                if (!event.defaultPrevented) {
                  onCellSelectionPointer(rowIndex, cellIndex, event);
                }
              }}
              onClick={(event) => {
                rootCellDOMProps.onClick?.(event);
                columnCellDOMProps.onClick?.(event);
                if (cellProps) publicOnCellClick?.(event, cellProps);
                if (
                  !event.defaultPrevented &&
                  (normalizedStartEvent === "click" ||
                    normalizedStartEvent === "onclick")
                ) {
                  startEdit();
                }
              }}
              onDoubleClick={(event) => {
                rootCellDOMProps.onDoubleClick?.(event);
                columnCellDOMProps.onDoubleClick?.(event);
                if (cellProps) publicOnCellDoubleClick?.(event, cellProps);
                if (
                  !event.defaultPrevented &&
                  (normalizedStartEvent === "dblclick" ||
                    normalizedStartEvent === "doubleclick" ||
                    normalizedStartEvent === "ondoubleclick")
                ) {
                  startEdit();
                }
              }}
              onMouseEnter={(event) => {
                rootCellDOMProps.onMouseEnter?.(event);
                columnCellDOMProps.onMouseEnter?.(event);
                if (showHoverRows) setHoveredCellId(cell.id);
                if (draggingCellSelectionRef.current) {
                  onCellSelectionPointer(rowIndex, cellIndex, {
                    button: 0,
                    ctrlKey: false,
                    metaKey: false,
                    shiftKey: true,
                  });
                }
              }}
              onMouseLeave={(event) => {
                rootCellDOMProps.onMouseLeave?.(event);
                columnCellDOMProps.onMouseLeave?.(event);
                setHoveredCellId((current) =>
                  current === cell.id ? null : current
                );
              }}
            >
              <div
                className={cn("tdg-cell-content", contentAlignClass)}
                style={contentStyle}
              >
                {editor != null ? (
                  <>
                    <CellEditorSurfaceSync
                      cellKey={cellKey}
                      cellNodesRef={cellNodesRef}
                    />
                    {editor}
                  </>
                ) : (
                  <>
                    {renderCellContent()}
                    {cellSelectionEnabled && cellIsActive && cellIsSelected ? (
                      <button
                        type="button"
                        data-slot="cell-selection-drag-handle"
                        aria-label="Extend cell selection"
                        className="absolute bottom-0 right-0 z-10 size-2.5 translate-x-1/2 translate-y-1/2 cursor-crosshair rounded-full border border-background bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        onPointerDown={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          draggingCellSelectionRef.current = true;
                        }}
                      />
                    ) : null}
                  </>
                )}
              </div>
            </TableCell>
          );
        })}
      </>
    );
  }

  function renderDataRow(
    row: any,
    rowIndex: number,
    virtualSize?: number,
    measure = false
  ): React.ReactNode {
    const rowIsSelected = Boolean(selectedMap[row.id]);
    const rowIsActive = rowIndex === activeIndex;
    const disabledRow = getDisabledRowState(rowIndex);
    const rowIsDisabled = Boolean(disabledRow);
    const compatibilityRowProps = getContextRowProps(
      row,
      rowIndex,
      rowIsSelected,
      rowIsActive,
      disabledRow
    );
    onRenderRow?.(compatibilityRowProps);
    const inheritedRowProps =
      typeof rowProps === "function"
        ? (rowProps(compatibilityRowProps) ?? {})
        : (rowProps ?? {});
    const configuredRowClassName =
      typeof rowClassName === "function"
        ? rowClassName(compatibilityRowProps)
        : rowClassName;
    const contextHandlers = getRowContextMenuHandlers({
      row,
      rowIndex,
      rowIsSelected,
      rowIsActive,
      disabledRow,
    });
    const children = renderCells(row, rowIndex, virtualSize);
    const renderedRowProps = {
      ...inheritedRowProps,
      ref: measure ? measureNaturalRow : undefined,
      className: cn(
        getRowThemeClasses(rowIndex, rowIsSelected, rowIsDisabled, rowIsActive),
        showHorizontalCellBorders
          ? "InovuaReactDataGrid__row--show-horizontal-borders"
          : "",
        rowIndex === 0 ? "InovuaReactDataGrid__row--first" : "",
        configuredRowClassName,
        inheritedRowProps.className
      ),
      id: `${rowIdPrefix}-${rowIndex}`,
      "data-selected": rowIsSelected ? "true" : "false",
      "data-active": rowIsActive ? "true" : "false",
      "data-disabled": rowIsDisabled ? "true" : undefined,
      "data-row-parity": rowIndex % 2 === 0 ? "odd" : "even",
      "data-row-id": row.id,
      "data-row-index": rowIndex,
      "data-index": rowIndex,
      "data-slot": "grid-row",
      "aria-disabled": rowIsDisabled || undefined,
      "aria-current": rowIsActive || undefined,
      "aria-selected": selectionEnabled ? rowIsSelected : undefined,
      style: {
        ...getRowStyle(row, rowIndex, rowIsSelected, disabledRow, virtualSize),
        ...(inheritedRowProps.style ?? {}),
      },
      onClick: (event: React.MouseEvent<HTMLTableRowElement>) => {
        inheritedRowProps.onClick?.(event);
        if (event.defaultPrevented || rowIsDisabled) return;
        onRowClick?.(row.id, row.original, rowIndex, event);
        publicOnRowClick?.(compatibilityRowProps, event);
      },
      onDoubleClick: (event: React.MouseEvent<HTMLTableRowElement>) => {
        inheritedRowProps.onDoubleClick?.(event);
        if (event.defaultPrevented || rowIsDisabled) return;
        publicOnRowDoubleClick?.(event, compatibilityRowProps);
      },
      onClickCapture: (event: React.MouseEvent<HTMLTableRowElement>) => {
        inheritedRowProps.onClickCapture?.(event);
        contextHandlers.onClickCapture?.(event);
      },
      onContextMenu: (event: React.MouseEvent<HTMLTableRowElement>) => {
        inheritedRowProps.onContextMenu?.(event);
        if (!event.defaultPrevented) contextHandlers.onContextMenu?.(event);
      },
      onPointerDown: (event: React.PointerEvent<HTMLTableRowElement>) => {
        inheritedRowProps.onPointerDown?.(event);
        if (!event.defaultPrevented) contextHandlers.onPointerDown?.(event);
      },
      onPointerMove: (event: React.PointerEvent<HTMLTableRowElement>) => {
        inheritedRowProps.onPointerMove?.(event);
        if (!event.defaultPrevented) contextHandlers.onPointerMove?.(event);
      },
      onPointerUp: (event: React.PointerEvent<HTMLTableRowElement>) => {
        inheritedRowProps.onPointerUp?.(event);
        contextHandlers.onPointerUp?.(event);
      },
      onPointerCancel: (event: React.PointerEvent<HTMLTableRowElement>) => {
        inheritedRowProps.onPointerCancel?.(event);
        contextHandlers.onPointerCancel?.(event);
      },
      children,
      rowProps: compatibilityRowProps,
    };

    if (renderRow) {
      return (
        <React.Fragment key={row.id}>
          {renderRow(renderedRowProps)}
        </React.Fragment>
      );
    }

    const { rowProps: _compatibilityRowProps, ...nativeRowProps } =
      renderedRowProps;
    void _compatibilityRowProps;
    return (
      <TableRow key={row.id} {...nativeRowProps}>
        {children}
      </TableRow>
    );
  }

  function renderEmptyRow(emptyIndex: number): React.ReactNode {
    const rowIndex = rowModel.length + emptyIndex;
    const row = {
      id: `__empty-${emptyIndex}`,
      original: {},
    };
    const compatibilityRowProps: TypeRowProps = {
      data: row.original,
      rowIndex,
      index: rowIndex,
      realIndex: rowIndex,
      remoteRowIndex: rowStyleMetadata.remoteRowOffset + rowIndex,
      id: row.id,
      empty: true,
      active: false,
      selected: false,
      rowSelected: false,
    };
    onRenderRow?.(compatibilityRowProps);
    const inheritedRowProps =
      typeof rowProps === "function"
        ? (rowProps(compatibilityRowProps) ?? {})
        : (rowProps ?? {});
    const configuredRowClassName =
      typeof rowClassName === "function"
        ? rowClassName(compatibilityRowProps)
        : rowClassName;
    const children = columnRenderItems.map((renderItem, renderItemIndex) => {
      if (renderItem.type === "spacer") {
        return (
          <TableCell
            key={`empty-${emptyIndex}-${renderItem.id}`}
            aria-hidden="true"
            className={cn(
              "pointer-events-none !p-0",
              rowEdgeClassName(renderItemIndex)
            )}
            style={{
              width: renderItem.width,
              minWidth: renderItem.width,
              maxWidth: renderItem.width,
            }}
          />
        );
      }

      if (renderItem.type === "filler") {
        return (
          <TableCell
            key={`empty-${emptyIndex}-${renderItem.id}`}
            aria-hidden="true"
            data-slot="grid-filler-cell"
            data-filler-variant={renderItem.variant}
            data-horizontal-borders={
              showHorizontalCellBorders ? "true" : "false"
            }
            className={cn(
              "tdg-filler-cell pointer-events-none !p-0",
              `tdg-filler-cell--${renderItem.variant}`,
              rowEdgeClassName(renderItemIndex)
            )}
            style={{
              width: renderItem.width,
              minWidth: renderItem.width,
              maxWidth: renderItem.width,
            }}
          />
        );
      }

      const columnIndex = renderItem.index;
      const column = orderedColumns[columnIndex];
      if (!column) return null;
      const columnId = getColumnIdCompat(column);
      const cellPropsForEmpty = getDataCellProps({
        row,
        rowIndex,
        column,
        columnId,
        columnIndex,
        value: undefined,
        width: columnWidths[columnId],
        empty: true,
      });
      const rootCellDOMProps = resolveCellDOMProps(
        cellDOMProps,
        cellPropsForEmpty
      );
      const columnCellDOMProps = resolveCellDOMProps(
        column.cellDOMProps,
        cellPropsForEmpty
      );
      const domProps = { ...rootCellDOMProps, ...columnCellDOMProps };
      const configuredClassName =
        typeof column.className === "function"
          ? column.className(cellPropsForEmpty)
          : column.className;
      const configuredStyle =
        typeof column.style === "function"
          ? column.style(cellPropsForEmpty)
          : column.style;
      const render = column.render as
        | ((valueOrCellProps: unknown, args?: CellProps) => React.ReactNode)
        | undefined;
      const content = render
        ? render.length <= 1
          ? render(cellPropsForEmpty)
          : render(undefined, cellPropsForEmpty)
        : null;

      return (
        <TableCell
          {...domProps}
          key={`empty-${emptyIndex}-${columnId}`}
          data-slot="grid-cell"
          data-empty="true"
          data-column-id={columnId}
          data-column-index={columnIndex}
          aria-hidden="true"
          className={cn(
            "InovuaReactDataGrid__cell InovuaReactDataGrid__cell--empty",
            rowEdgeClassName(renderItemIndex),
            configuredClassName,
            domProps.className
          )}
          style={{
            width: columnWidths[columnId],
            minWidth: column.minWidth,
            maxWidth: column.maxWidth,
            ...(configuredStyle ?? {}),
            ...(domProps.style ?? {}),
          }}
        >
          <div className="tdg-cell-content">{content}</div>
        </TableCell>
      );
    });
    const renderedRowProps = {
      ...inheritedRowProps,
      className: cn(
        "tdg-row tdg-row--empty InovuaReactDataGrid__row InovuaReactDataGrid__row--empty",
        configuredRowClassName,
        inheritedRowProps.className
      ),
      "data-slot": "grid-empty-row",
      "data-row-index": rowIndex,
      "data-empty": "true",
      "aria-hidden": true,
      style: {
        height: getResolvedRowHeight(rowIndex) ?? minRowHeight,
        ...(inheritedRowProps.style ?? {}),
      },
      children,
      rowProps: compatibilityRowProps,
    };
    if (renderRow) {
      return (
        <React.Fragment key={row.id}>
          {renderRow(renderedRowProps)}
        </React.Fragment>
      );
    }
    const { rowProps: _compatibilityRowProps, ...nativeRowProps } =
      renderedRowProps;
    void _compatibilityRowProps;
    return <TableRow key={row.id} {...nativeRowProps} />;
  }

  const emptyRowCount = showEmptyRows
    ? Math.max(0, rowStyleMetadata.maxVisibleRows - rowModel.length)
    : 0;
  const renderedEmptyRows = Array.from(
    { length: emptyRowCount },
    (_, emptyIndex) => renderEmptyRow(emptyIndex)
  );

  if (loading && rowModel.length === 0) {
    return (
      <TableBody>
        {stickyHeaderOffset > 0 ? (
          <TableRow aria-hidden="true">
            <TableCell
              colSpan={renderedTableColumnCount}
              style={{ height: stickyHeaderOffset }}
            />
          </TableRow>
        ) : null}
      </TableBody>
    );
  }

  if (rowModel.length === 0) {
    const emptyContent = resolveEmptyText(emptyText, i18n);

    return (
      <TableBody>
        {stickyHeaderOffset > 0 ? (
          <TableRow aria-hidden="true">
            <TableCell
              colSpan={renderedTableColumnCount}
              style={{ height: stickyHeaderOffset }}
            />
          </TableRow>
        ) : null}
        {emptyContent == null ? null : (
          <TableRow>
            <TableCell
              colSpan={renderedTableColumnCount}
              className={cn(
                "h-24 text-center",
                showHorizontalCellBorders
                  ? "border-b [border-bottom-color:var(--tdg-cell-border-color)]"
                  : ""
              )}
            >
              {emptyContent}
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    );
  }

  return (
    <TableBody>
      {virtualized ? (
        <>
          {paddingTop > 0 && (
            <TableRow>
              <TableCell
                colSpan={renderedTableColumnCount}
                style={{ height: paddingTop }}
              />
            </TableRow>
          )}

          {virtualItems.map((vi) => {
            const row = rowModel[vi.index]!;
            return renderDataRow(row, vi.index, vi.size, rowHeight == null);
          })}

          {paddingBottom > 0 && (
            <TableRow>
              <TableCell
                colSpan={renderedTableColumnCount}
                style={{ height: paddingBottom }}
              />
            </TableRow>
          )}
          {renderedEmptyRows}
        </>
      ) : (
        <>
          {stickyHeaderOffset > 0 ? (
            <TableRow aria-hidden="true">
              <TableCell
                colSpan={renderedTableColumnCount}
                style={{ height: stickyHeaderOffset }}
              />
            </TableRow>
          ) : null}
          {rowModel.map((row, displayIndex) => {
            return renderDataRow(row, displayIndex);
          })}
          {renderedEmptyRows}
        </>
      )}
    </TableBody>
  );
}
