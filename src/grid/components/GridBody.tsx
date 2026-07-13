"use client";

import * as React from "react";
import { flexRender } from "@tanstack/react-table";

import type {
  CellProps,
  TypeColumn,
  TypeColumnEditorCell,
  TypeColumnEditorProps,
  TypeComputedColumn,
  TypeComputedColumnsMap,
  TypeDataGridProps,
  TypeI18n,
  TypeRowSelection,
  TypeRowStyle,
  TypeShowCellBorders,
} from "../../types";
import { cn } from "../../lib/utils";
import { buildEditCellProps } from "../utils/editing";
import { resolveEmptyText } from "../utils/emptyText";

import { Input } from "../../components/ui/input";
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
};

export type GridEditNavigation = {
  type: "enter" | "tab";
  direction: -1 | 1;
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
    <Input
      ref={inputRef}
      aria-label={props.ariaLabel}
      className="tdg-cell-editor h-8 min-w-0 rounded-md px-2 py-1 text-sm"
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

export type GridBodyProps = {
  rowModel: any[];
  orderedColumns: TypeColumn[];
  columnWidths: Record<string, number>;
  userSelectClass: string;
  showHorizontalCellBorders: boolean;
  showVerticalCellBorders: boolean;

  virtualized: boolean;
  virtualizeColumns: boolean;
  columnRenderRange: {
    firstIndex: number;
    lastIndex: number;
    beforeWidth: number;
    afterWidth: number;
    columnRenderCount: number;
  };
  virtualItems: any[];
  paddingTop: number;
  paddingBottom: number;
  stickyHeaderOffset: number;

  loading: boolean;
  i18n?: TypeI18n;
  emptyText: TypeDataGridProps["emptyText"];

  selectedMap: Record<string, any>;
  onRowClick?: (rowId: string, rowData: any, e: React.MouseEvent) => void;

  rowHeight: number | ((rowIndex: number) => number) | null;
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
    theme: string;
    multiSelect: boolean;
    selection: TypeRowSelection;
    maxVisibleRows: number;
    computedShowCellBorders: TypeShowCellBorders;
    editable: boolean;
    getItemId: (data: any) => unknown;
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
    columnRenderRange,
    virtualItems,
    paddingTop,
    paddingBottom,
    stickyHeaderOffset,
    loading,
    i18n,
    emptyText,
    selectedMap,
    onRowClick,
    rowHeight,
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
  const renderedTableColumnCount = virtualizeColumns
    ? columnRenderRange.columnRenderCount +
      (columnRenderRange.beforeWidth > 0 ? 1 : 0) +
      (columnRenderRange.afterWidth > 0 ? 1 : 0)
    : orderedColumns.length;

  function getRowThemeClasses(
    rowIndex: number,
    rowIsSelected: boolean
  ): string {
    const odd = rowIndex % 2 === 0;
    return cn(
      "tdg-row InovuaReactDataGrid__row",
      showZebraRows
        ? odd
          ? "tdg-row--odd InovuaReactDataGrid__row--odd bg-[var(--tdg-row-odd-bg)] hover:bg-[var(--tdg-row-odd-hover-bg)] hover:[color:var(--tdg-row-active-color)]"
          : "tdg-row--even InovuaReactDataGrid__row--even bg-[var(--tdg-row-even-bg)] hover:bg-[var(--tdg-row-even-hover-bg)] hover:[color:var(--tdg-row-active-color)]"
        : "tdg-row--no-zebra InovuaReactDataGrid__row--no-zebra bg-[var(--tdg-grid-bg)] hover:bg-[var(--tdg-row-odd-hover-bg)] hover:[color:var(--tdg-row-active-color)]",
      rowIsSelected
        ? showZebraRows
          ? odd
            ? "tdg-row--selected InovuaReactDataGrid__row--selected tdg-row--active InovuaReactDataGrid__row--active bg-[var(--tdg-row-odd-selected-bg)] [color:var(--tdg-row-active-color)] hover:bg-[var(--tdg-row-odd-selected-hover-bg)] hover:[color:var(--tdg-row-active-color)]"
            : "tdg-row--selected InovuaReactDataGrid__row--selected tdg-row--active InovuaReactDataGrid__row--active bg-[var(--tdg-row-even-selected-bg)] [color:var(--tdg-row-active-color)] hover:bg-[var(--tdg-row-even-selected-hover-bg)] hover:[color:var(--tdg-row-active-color)]"
          : "tdg-row--selected InovuaReactDataGrid__row--selected tdg-row--active InovuaReactDataGrid__row--active bg-[var(--tdg-row-selected-bg)] [color:var(--tdg-row-active-color)] hover:bg-[var(--tdg-row-selected-hover-bg)]"
        : ""
    );
  }

  function getRowThemeStyle(
    rowIsSelected: boolean
  ): React.CSSProperties | undefined {
    if (!rowIsSelected) return undefined;

    return {
      outline:
        "var(--tdg-row-active-border-width) var(--tdg-row-active-border-style) var(--tdg-row-active-border-color)",
      outlineOffset: "-1px",
    };
  }

  function getResolvedRowHeight(rowIndex: number): number | null {
    if (rowHeight == null) return null;

    const requestedHeight =
      typeof rowHeight === "function" ? rowHeight(rowIndex) : rowHeight;
    const finiteHeight = Number.isFinite(requestedHeight)
      ? requestedHeight
      : minRowHeight;
    const upperBound =
      typeof maxRowHeight === "number" && Number.isFinite(maxRowHeight)
        ? Math.max(minRowHeight, maxRowHeight)
        : Number.POSITIVE_INFINITY;

    return Math.min(Math.max(finiteHeight, minRowHeight), upperBound);
  }

  function getRowStyle(
    row: any,
    rowIndex: number,
    rowIsSelected: boolean,
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
      direction: "ltr",
      ...(typeof maxRowHeight === "number" && Number.isFinite(maxRowHeight)
        ? { maxHeight: maxRowHeight }
        : {}),
      ...getRowThemeStyle(rowIsSelected),
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
              firstUnlockedIndex: rowStyleMetadata.columns.length > 0 ? 0 : -1,
              lastUnlockedIndex: rowStyleMetadata.columns.length - 1,
              firstLockedStartIndex: -1,
              lastLockedStartIndex: -1,
              firstLockedEndIndex: -1,
              lastLockedEndIndex: -1,
              hasLockedStart: false,
              hasLockedEnd: false,
              availableWidth: rowStyleMetadata.availableWidth,
              width: rowStyleMetadata.totalComputedWidth,
              minWidth: rowStyleMetadata.totalComputedWidth,
              totalComputedWidth: rowStyleMetadata.totalComputedWidth,
              totalUnlockedWidth: rowStyleMetadata.totalComputedWidth,
              totalLockedStartWidth: 0,
              totalLockedEndWidth: 0,
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
    const cellProps = buildEditCellProps({
      value: editingCell.originalValue,
      data: row.original,
      rowIndex,
      remoteRowIndex: rowStyleMetadata.remoteRowOffset + rowIndex,
      rowId,
      rowSelected: Boolean(selectedMap[String(row.id)]),
      selection: rowStyleMetadata.selection,
      multiSelect: rowStyleMetadata.multiSelect,
      naturalRowHeight: rowHeight == null,
      resolvedRowHeight: getResolvedRowHeight(rowIndex) ?? minRowHeight,
      minRowHeight,
      column,
      columnId,
      columnIndex: cellIndex,
      columnCount: orderedColumns.length,
      computedWidth: columnWidths[columnId],
      editValue: editingCell.value,
      inEdit: true,
      editable: rowStyleMetadata.editable,
      editStartEvent,
      theme: rowStyleMetadata.theme,
      totalDataCount: rowStyleMetadata.dataSourceArray.length,
      virtualizeColumns,
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
      nativeScroll: true,
      editorProps: configuredEditorProps,
      cell: compatCell,
      value: editingCell.value,
      theme: rowStyleMetadata.theme,
      rtl: false,
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

  function renderCells(row: any, rowIndex: number): React.ReactNode {
    const resolvedRowHeight = getResolvedRowHeight(rowIndex);
    const contentHeightLimit =
      rowHeight == null ? maxRowHeight : resolvedRowHeight;
    const contentStyle =
      typeof contentHeightLimit === "number" &&
      Number.isFinite(contentHeightLimit)
        ? { maxHeight: Math.max(0, contentHeightLimit - 16) }
        : undefined;

    const allCells = row.getVisibleCells();
    const renderedCells = virtualizeColumns
      ? allCells.slice(
          columnRenderRange.firstIndex,
          columnRenderRange.lastIndex + 1
        )
      : allCells;

    return (
      <>
        {columnRenderRange.beforeWidth > 0 && virtualizeColumns ? (
          <TableCell
            aria-hidden="true"
            className="pointer-events-none !p-0"
            style={{
              width: columnRenderRange.beforeWidth,
              minWidth: columnRenderRange.beforeWidth,
              maxWidth: columnRenderRange.beforeWidth,
            }}
          />
        ) : null}
        {renderedCells.map((cell: any, renderedIndex: number) => {
          const cellIndex = virtualizeColumns
            ? columnRenderRange.firstIndex + renderedIndex
            : renderedIndex;
          const columnId = cell.column.id;
          const column = (cell.column.columnDef as any)?.meta?.__column as
            | TypeColumn
            | undefined;
          const width = columnWidths[columnId];
          const align = column?.textAlign;
          const isLastCell = cellIndex === allCells.length - 1;
          const editor = column
            ? renderEditor(row, rowIndex, cellIndex, column, columnId)
            : null;

          const startEdit = () => {
            if (!column) return;
            const value = cell.getValue();
            const rowId = getCompatRowId(row, rowStyleMetadata.getItemId);
            const cellProps = buildEditCellProps({
              value,
              data: row.original,
              rowIndex,
              remoteRowIndex: rowStyleMetadata.remoteRowOffset + rowIndex,
              rowId,
              rowSelected: Boolean(selectedMap[String(row.id)]),
              selection: rowStyleMetadata.selection,
              multiSelect: rowStyleMetadata.multiSelect,
              naturalRowHeight: rowHeight == null,
              resolvedRowHeight: getResolvedRowHeight(rowIndex) ?? minRowHeight,
              minRowHeight,
              column,
              columnId,
              columnIndex: cellIndex,
              columnCount: orderedColumns.length,
              computedWidth: width,
              editable: rowStyleMetadata.editable,
              editStartEvent,
              theme: rowStyleMetadata.theme,
              totalDataCount: rowStyleMetadata.dataSourceArray.length,
              virtualizeColumns,
            });

            onCellEditStart({
              rowId,
              rowIndex,
              columnId,
              columnIndex: cellIndex,
              value,
              data: row.original,
              column,
              cellProps,
            });
          };
          const normalizedStartEvent = editStartEvent.toLowerCase();

          return (
            <TableCell
              ref={(node) => {
                const key = `${String(row.id)}\u0000${columnId}`;
                if (node) cellNodesRef.current.set(key, node);
                else cellNodesRef.current.delete(key);
              }}
              key={cell.id}
              data-column-id={columnId}
              data-column-index={cellIndex}
              data-editing={editor ? "true" : "false"}
              className={cn(
                userSelectClass,
                "InovuaReactDataGrid__cell",
                "InovuaReactDataGrid__cell--direction-ltr",
                showHorizontalCellBorders
                  ? "InovuaReactDataGrid__cell--show-border-bottom"
                  : "",
                showVerticalCellBorders
                  ? "InovuaReactDataGrid__cell--show-border-right"
                  : "",
                isLastCell ? "InovuaReactDataGrid__cell--last" : "",
                hoveredCellId === cell.id
                  ? "InovuaReactDataGrid__cell--over"
                  : "",
                showHorizontalCellBorders
                  ? "border-b [border-bottom-color:var(--tdg-cell-border-color)]"
                  : "",
                showVerticalCellBorders
                  ? "border-r last:border-r-0 [border-right-color:var(--tdg-cell-border-color)]"
                  : "",
                align === "right" || align === "end" ? "text-right" : "",
                column?.className
              )}
              style={{
                width,
                minWidth: column?.minWidth,
                maxWidth: column?.maxWidth,
                ...(typeof column?.style === "object" && column?.style
                  ? column.style
                  : {}),
              }}
              onClick={() => {
                if (
                  normalizedStartEvent === "click" ||
                  normalizedStartEvent === "onclick"
                ) {
                  startEdit();
                }
              }}
              onDoubleClick={() => {
                if (
                  normalizedStartEvent === "dblclick" ||
                  normalizedStartEvent === "doubleclick" ||
                  normalizedStartEvent === "ondoubleclick"
                ) {
                  startEdit();
                }
              }}
              onMouseEnter={() => setHoveredCellId(cell.id)}
              onMouseLeave={() => {
                setHoveredCellId((current) =>
                  current === cell.id ? null : current
                );
              }}
            >
              <div className="tdg-cell-content" style={contentStyle}>
                {editor ??
                  flexRender(cell.column.columnDef.cell, cell.getContext())}
              </div>
            </TableCell>
          );
        })}
        {columnRenderRange.afterWidth > 0 && virtualizeColumns ? (
          <TableCell
            aria-hidden="true"
            className="pointer-events-none !p-0"
            style={{
              width: columnRenderRange.afterWidth,
              minWidth: columnRenderRange.afterWidth,
              maxWidth: columnRenderRange.afterWidth,
            }}
          />
        ) : null}
      </>
    );
  }

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
            Loading…
          </TableCell>
        </TableRow>
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
            const rowIsSelected = Boolean(selectedMap[row.id]);

            return (
              <TableRow
                ref={
                  rowHeight == null
                    ? (element) => measureElement?.(element)
                    : undefined
                }
                key={row.id}
                className={cn(
                  getRowThemeClasses(vi.index, rowIsSelected),
                  showHorizontalCellBorders
                    ? "InovuaReactDataGrid__row--show-horizontal-borders"
                    : "",
                  vi.index === 0 ? "InovuaReactDataGrid__row--first" : ""
                )}
                data-selected={rowIsSelected ? "true" : "false"}
                data-row-parity={vi.index % 2 === 0 ? "odd" : "even"}
                data-row-id={row.id}
                data-row-index={vi.index}
                data-index={vi.index}
                data-slot="grid-row"
                style={getRowStyle(row, vi.index, rowIsSelected, vi.size)}
                onClick={(e) => onRowClick?.(row.id, row.original, e)}
              >
                {renderCells(row, vi.index)}
              </TableRow>
            );
          })}

          {paddingBottom > 0 && (
            <TableRow>
              <TableCell
                colSpan={renderedTableColumnCount}
                style={{ height: paddingBottom }}
              />
            </TableRow>
          )}
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
          {rowModel.map((row) => {
            const rowIsSelected = Boolean(selectedMap[row.id]);

            return (
              <TableRow
                key={row.id}
                className={cn(
                  getRowThemeClasses(row.index, rowIsSelected),
                  showHorizontalCellBorders
                    ? "InovuaReactDataGrid__row--show-horizontal-borders"
                    : "",
                  row.index === 0 ? "InovuaReactDataGrid__row--first" : ""
                )}
                data-selected={rowIsSelected ? "true" : "false"}
                data-row-parity={row.index % 2 === 0 ? "odd" : "even"}
                data-row-id={row.id}
                data-row-index={row.index}
                data-slot="grid-row"
                style={getRowStyle(row, row.index, rowIsSelected)}
                onClick={(e) => onRowClick?.(row.id, row.original, e)}
              >
                {renderCells(row, row.index)}
              </TableRow>
            );
          })}
        </>
      )}
    </TableBody>
  );
}
