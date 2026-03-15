"use client";

import * as React from "react";
import { flexRender } from "@tanstack/react-table";

import type { TypeColumn, TypeI18n } from "../../types";
import { cn } from "../../lib/utils";
import { t } from "../../utils/helpers";

import { TableBody, TableCell, TableRow } from "../../components/ui/table";

export type GridBodyProps = {
  rowModel: any[];
  orderedColumns: TypeColumn[];
  autoWidths: Record<string, number>;
  userSelectClass: string;

  virtualized: boolean;
  virtualItems: any[];
  paddingTop: number;
  paddingBottom: number;

  loading: boolean;
  i18n?: TypeI18n;

  selectedMap: Record<string, any>;
  onRowClick?: (rowId: string, rowData: any, e: React.MouseEvent) => void;
};

export function GridBody(props: GridBodyProps) {
  const {
    rowModel,
    orderedColumns,
    autoWidths,
    userSelectClass,
    virtualized,
    virtualItems,
    paddingTop,
    paddingBottom,
    loading,
    i18n,
    selectedMap,
    onRowClick,
  } = props;

  function getRowThemeClasses(rowIndex: number, rowIsSelected: boolean): string {
    const odd = rowIndex % 2 === 0;
    return cn(
      "tdg-row InovuaReactDataGrid__row",
      odd
        ? "tdg-row--odd InovuaReactDataGrid__row--odd bg-[var(--tdg-row-odd-bg)] hover:bg-[var(--tdg-row-odd-hover-bg)] hover:[color:var(--tdg-row-active-color)]"
        : "tdg-row--even InovuaReactDataGrid__row--even bg-[var(--tdg-row-even-bg)] hover:bg-[var(--tdg-row-even-hover-bg)] hover:[color:var(--tdg-row-active-color)]",
      rowIsSelected
        ? odd
          ? "tdg-row--selected InovuaReactDataGrid__row--selected tdg-row--active InovuaReactDataGrid__row--active bg-[var(--tdg-row-odd-selected-bg)] [color:var(--tdg-row-active-color)] hover:bg-[var(--tdg-row-odd-selected-hover-bg)] hover:[color:var(--tdg-row-active-color)]"
          : "tdg-row--selected InovuaReactDataGrid__row--selected tdg-row--active InovuaReactDataGrid__row--active bg-[var(--tdg-row-even-selected-bg)] [color:var(--tdg-row-active-color)] hover:bg-[var(--tdg-row-even-selected-hover-bg)] hover:[color:var(--tdg-row-active-color)]"
        : "",
    );
  }

  function getRowThemeStyle(rowIsSelected: boolean): React.CSSProperties | undefined {
    if (!rowIsSelected) return undefined;

    return {
      outline:
        "var(--tdg-row-active-border-width) var(--tdg-row-active-border-style) var(--tdg-row-active-border-color)",
      outlineOffset: "-1px",
    };
  }

  if (loading && rowModel.length === 0) {
    return (
      <TableBody>
        <TableRow>
          <TableCell colSpan={orderedColumns.length} className="h-24 text-center">
            Loading…
          </TableCell>
        </TableRow>
      </TableBody>
    );
  }

  if (rowModel.length === 0) {
    return (
      <TableBody>
        <TableRow>
          <TableCell colSpan={orderedColumns.length} className="h-24 text-center">
            {t(i18n, "noRecords", "No records")}
          </TableCell>
        </TableRow>
      </TableBody>
    );
  }

  return (
    <TableBody>
      {virtualized ? (
        <>
          {paddingTop > 0 && (
            <TableRow>
              <TableCell colSpan={orderedColumns.length} style={{ height: paddingTop }} />
            </TableRow>
          )}

          {virtualItems.map((vi) => {
            const row = rowModel[vi.index]!;
            const rowIsSelected = Boolean(selectedMap[row.id]);

            return (
              <TableRow
                key={row.id}
                className={getRowThemeClasses(vi.index, rowIsSelected)}
                data-selected={rowIsSelected ? "true" : "false"}
                data-row-parity={vi.index % 2 === 0 ? "odd" : "even"}
                style={{ height: vi.size, ...getRowThemeStyle(rowIsSelected) }}
                onClick={(e) => onRowClick?.(row.id, row.original, e)}
              >
                {row.getVisibleCells().map((cell: any) => {
                  const colId = cell.column.id;
                  const col = (cell.column.columnDef as any)?.meta?.__column as TypeColumn | undefined;

                  const width = autoWidths[colId];
                  const align = col?.textAlign;

                  return (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        userSelectClass,
                        align === "right" || align === "end" ? "text-right" : "",
                        col?.className,
                      )}
                      style={{
                        width,
                        minWidth: col?.minWidth,
                        maxWidth: col?.maxWidth,
                        ...(typeof col?.style === "object" && col?.style ? col.style : {}),
                      }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  );
                })}
              </TableRow>
            );
          })}

          {paddingBottom > 0 && (
            <TableRow>
              <TableCell colSpan={orderedColumns.length} style={{ height: paddingBottom }} />
            </TableRow>
          )}
        </>
      ) : (
        rowModel.map((row) => {
          const rowIsSelected = Boolean(selectedMap[row.id]);

          return (
            <TableRow
              key={row.id}
              className={getRowThemeClasses(row.index, rowIsSelected)}
              data-selected={rowIsSelected ? "true" : "false"}
              data-row-parity={row.index % 2 === 0 ? "odd" : "even"}
              style={getRowThemeStyle(rowIsSelected)}
              onClick={(e) => onRowClick?.(row.id, row.original, e)}
            >
              {row.getVisibleCells().map((cell: any) => {
                const colId = cell.column.id;
                const col = (cell.column.columnDef as any)?.meta?.__column as TypeColumn | undefined;

                const width = autoWidths[colId];
                const align = col?.textAlign;

                return (
                  <TableCell
                    key={cell.id}
                    className={cn(
                      userSelectClass,
                      align === "right" || align === "end" ? "text-right" : "",
                      col?.className,
                    )}
                    style={{
                      width,
                      minWidth: col?.minWidth,
                      maxWidth: col?.maxWidth,
                      ...(typeof col?.style === "object" && col?.style ? col.style : {}),
                    }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                );
              })}
            </TableRow>
          );
        })
      )}
    </TableBody>
  );
}
