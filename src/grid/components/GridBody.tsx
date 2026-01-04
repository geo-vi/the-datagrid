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
                className={cn("hover:bg-muted/40", rowIsSelected ? "bg-muted/30" : "")}
                style={{ height: vi.size }}
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
              className={cn("hover:bg-muted/40", rowIsSelected ? "bg-muted/30" : "")}
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
