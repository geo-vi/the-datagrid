import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";

import type {
  TypeCheckboxColumn,
  TypeCheckboxProps,
  TypeColumn,
} from "../../types";
import { Checkbox } from "../../components/ui/checkbox";
import { getColumnId } from "../../utils/column";
import { getColumnWidthBounds } from "../utils/columnWidthEstimation";

export type UseGridColumnDefsParams = {
  allInputColumns: TypeColumn[];
  checkboxColId: string;
  checkboxColumnProp: TypeCheckboxColumn | undefined;
  checkboxEnabled: boolean;
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
  computedColumnMaxWidth: number | null;
  computedColumnMinWidth: number;
  deselectAllRows: () => void;
  disabledRowsRef: React.MutableRefObject<
    Record<number, boolean> | undefined | null
  >;
  getRowKey: (row: any, index: number) => string;
  lastPointerRef: React.MutableRefObject<{ shiftKey: boolean }>;
  multiSelect: boolean | undefined;
  resizable: boolean;
  rows: any[];
  selectAllRows: () => void;
  selectedMap: Record<string, any>;
  selectionEnabled: boolean;
  setActiveIndexCompat: (nextActiveIndex: number) => void;
  sortable: boolean;
};

/**
 * Builds the TanStack column definitions, including the checkbox column.
 *
 * The cell/header renderers are long-lived (TanStack caches them per column
 * def), so they read live selection state through `selectionRuntimeRef` rather
 * than capturing it. Owning that ref here keeps the whole arrangement out of
 * the grid render scope.
 */
export function useGridColumnDefs(params: UseGridColumnDefsParams) {
  const {
    allInputColumns,
    checkboxColId,
    checkboxColumnProp,
    checkboxEnabled,
    commitRowSelection,
    computedColumnMaxWidth,
    computedColumnMinWidth,
    deselectAllRows,
    disabledRowsRef,
    getRowKey,
    lastPointerRef,
    multiSelect,
    resizable,
    rows,
    selectAllRows,
    selectedMap,
    selectionEnabled,
    setActiveIndexCompat,
    sortable,
  } = params;

  const selectionRuntimeRef = React.useRef({
    rows,
    selectedMap,
    selectionEnabled,
    multiSelect,
    getRowKey,
    commitRowSelection,
    selectAllRows,
    deselectAllRows,
    setActiveIndexCompat,
  });
  selectionRuntimeRef.current = {
    rows,
    selectedMap,
    selectionEnabled,
    multiSelect,
    getRowKey,
    commitRowSelection,
    selectAllRows,
    deselectAllRows,
    setActiveIndexCompat,
  };

  const columnDefs = React.useMemo<ColumnDef<any, any>[]>(() => {
    return allInputColumns.map((c) => {
      const colId = getColumnId(c);
      const { minWidth, maxWidth } = getColumnWidthBounds(
        c,
        computedColumnMinWidth,
        computedColumnMaxWidth
      );
      const configuredSize =
        typeof c.width === "number" && Number.isFinite(c.width)
          ? c.width
          : typeof c.defaultWidth === "number" &&
              Number.isFinite(c.defaultWidth)
            ? c.defaultWidth
            : undefined;

      if (checkboxEnabled && colId === checkboxColId) {
        const cfg =
          typeof checkboxColumnProp === "object"
            ? checkboxColumnProp
            : undefined;
        const renderCheckbox = (cfg as any)?.renderCheckbox as
          | ((props: TypeCheckboxProps, ctx: any) => React.ReactNode)
          | undefined;

        return {
          id: colId,
          accessorFn: () => null,
          enableSorting: false,
          enableColumnFilter: false,
          enableHiding: false,
          enableResizing: false,
          size: configuredSize,
          minSize: minWidth,
          maxSize: maxWidth,

          header: () => {
            const runtime = selectionRuntimeRef.current;
            const pageRowIds = runtime.rows.map((r, idx) =>
              runtime.getRowKey(r, idx)
            );
            const selectedOnPage = pageRowIds.reduce(
              (acc, id) => acc + (runtime.selectedMap[id] ? 1 : 0),
              0
            );
            const allSelected =
              pageRowIds.length > 0 && selectedOnPage === pageRowIds.length;
            const someSelected = selectedOnPage > 0 && !allSelected;

            const onChange = (checked: boolean) => {
              const current = selectionRuntimeRef.current;
              if (!current.selectionEnabled) return;

              if (checked) current.selectAllRows();
              else current.deselectAllRows();
            };

            const checkboxProps: TypeCheckboxProps = {
              checked: allSelected,
              indeterminate: someSelected,
              disabled: !runtime.selectionEnabled || runtime.rows.length === 0,
              onChange,
            };

            const node = renderCheckbox ? (
              renderCheckbox(checkboxProps, {
                headerCell: true,
                data: runtime.rows,
              })
            ) : (
              <Checkbox
                checked={
                  checkboxProps.indeterminate
                    ? "indeterminate"
                    : checkboxProps.checked
                }
                disabled={checkboxProps.disabled}
                onCheckedChange={(v) => checkboxProps.onChange(v === true, v)}
                onClick={(e) => e.stopPropagation()}
              />
            );

            return (
              <div
                className="tdg-checkbox-cell__content flex h-full w-full items-center justify-center"
                onMouseDown={(e) => {
                  lastPointerRef.current.shiftKey =
                    (e as any).shiftKey === true;
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {node}
              </div>
            );
          },

          cell: (ctx) => {
            const rowData = ctx.row.original;
            const rowIndex = ctx.row.index;
            const rowId = ctx.row.id;
            const runtime = selectionRuntimeRef.current;
            const disabledRow = disabledRowsRef.current
              ? disabledRowsRef.current[rowIndex]
              : null;

            const isSelected = Boolean(runtime.selectedMap[rowId]);

            const onChange = (checked: boolean) => {
              const current = selectionRuntimeRef.current;
              if (!current.selectionEnabled) return;
              current.setActiveIndexCompat(rowIndex);
              current.commitRowSelection(rowIndex, {
                checked,
                shiftKey: lastPointerRef.current.shiftKey,
                fromCheckbox: true,
              });
            };

            const checkboxProps: TypeCheckboxProps = {
              checked: isSelected,
              disabled: !runtime.selectionEnabled,
              onChange,
            };

            const node = renderCheckbox ? (
              renderCheckbox(checkboxProps, {
                headerCell: false,
                data: rowData,
                rowIndex,
                disabledRow,
              })
            ) : (
              <Checkbox
                checked={checkboxProps.checked}
                disabled={checkboxProps.disabled}
                tabIndex={disabledRow ? -1 : undefined}
                onCheckedChange={(v) => checkboxProps.onChange(v === true, v)}
                onClick={(e) => e.stopPropagation()}
              />
            );

            return (
              <div
                className="tdg-checkbox-cell__content flex h-full w-full items-center justify-center"
                onMouseDown={(e) => {
                  lastPointerRef.current.shiftKey =
                    (e as any).shiftKey === true;
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {node}
              </div>
            );
          },

          meta: { __column: c },
        } satisfies ColumnDef<any, any>;
      }

      return {
        id: colId,
        accessorFn: (row) => (row as any)?.[colId],
        enableSorting: c.sortable ?? sortable,
        enableColumnFilter: c.filterable ?? true,
        enableHiding: c.hideable ?? true,
        enableResizing: resizable && (c.resizable ?? true),
        size: configuredSize,
        minSize: minWidth,
        maxSize: maxWidth,

        header: () =>
          (c as any).renderHeader?.({ column: c, columnId: colId }) ??
          c.header ??
          c.name ??
          c.id ??
          colId,

        cell: (ctx) => {
          const value = ctx.getValue();
          const rowData = ctx.row.original;
          const rowIndex = ctx.row.index;
          const disabledRow = disabledRowsRef.current
            ? disabledRowsRef.current[rowIndex]
            : null;

          if (c.render) {
            const renderCell = c.render as (
              valueOrCellProps: unknown,
              args?: {
                data: unknown;
                rowIndex: number;
                column: TypeColumn;
                columnId: string;
                disabledRow?: boolean | null;
              }
            ) => React.ReactNode;
            const cellProps = {
              column: c,
              columnId: colId,
              rowIndex,
              disabledRow,
              dateFormat: (c as any).dateFormat,
              ...(typeof (c as any).cellProps === "object"
                ? (c as any).cellProps
                : {}),
            };

            if (c.render.length <= 1) {
              return renderCell({
                value,
                data: rowData,
                rowIndex,
                column: c,
                columnId: colId,
                disabledRow,
                cellProps,
              } as any);
            }

            return renderCell(value, {
              data: rowData,
              rowIndex,
              column: c,
              columnId: colId,
              disabledRow,
            });
          }

          return value == null ? (
            ""
          ) : (
            <span className="block min-w-0 max-w-full truncate">
              {String(value)}
            </span>
          );
        },

        meta: { __column: c },
      } satisfies ColumnDef<any, any>;
    });
  }, [
    checkboxColId,
    checkboxColumnProp,
    checkboxEnabled,
    allInputColumns,
    computedColumnMaxWidth,
    computedColumnMinWidth,
    resizable,
    sortable,
    disabledRowsRef,
    lastPointerRef,
  ]);
  return columnDefs;
}
