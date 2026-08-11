import * as React from "react";

import type { TypeColumn } from "../../types";
import { getColumnId } from "../../utils/column";
import { clamp } from "../../utils/helpers";
import {
  estimateColumnContentWidth,
  getColumnWidthBounds,
} from "../utils/columnWidthEstimation";
import { resolveStateAction } from "../internalProps";
import type { GridColumnResizeEntry } from "./useGridColumnResize";

export type UseGridColumnSizingApiParams = {
  autosizeSample: any[];
  columnLayout: readonly { id: string; width: number }[];
  columnViewportWidth: number;
  columnWidths: Readonly<Record<string, number>>;
  commitColumnResizeEntries: (
    entries: GridColumnResizeEntry[],
    nextReservedViewportWidth?: number
  ) => void;
  computedColumnDefaultWidth: number;
  computedColumnMaxWidth: number | null;
  computedColumnMinWidth: number;
  flexWeights: Readonly<Record<string, number>>;
  manualColumnFlexes: Record<string, number | null>;
  orderedColumns: TypeColumn[];
  setManualColumnFlexes: React.Dispatch<
    React.SetStateAction<Record<string, number | null>>
  >;
  setManualColumnWidths: React.Dispatch<
    React.SetStateAction<Record<string, number>>
  >;
  skipHeaderOnAutoSize: boolean;
};

/** The imperative column sizing API (setColumnSizes/Flexes/Auto/ToFit). */
export function useGridColumnSizingApi(params: UseGridColumnSizingApiParams) {
  const {
    autosizeSample,
    columnLayout,
    columnViewportWidth,
    columnWidths,
    commitColumnResizeEntries,
    computedColumnDefaultWidth,
    computedColumnMaxWidth,
    computedColumnMinWidth,
    flexWeights,
    manualColumnFlexes,
    orderedColumns,
    setManualColumnFlexes,
    setManualColumnWidths,
    skipHeaderOnAutoSize,
  } = params;

  const columnFlexes = React.useMemo<Record<string, number>>(() => {
    return { ...flexWeights };
  }, [flexWeights]);
  const columnSizes = React.useMemo<Record<string, number>>(() => {
    return Object.fromEntries(
      columnLayout.map((column) => [column.id, Number(column.width)])
    );
  }, [columnLayout]);
  const setColumnSizesCompat = React.useCallback<
    React.Dispatch<React.SetStateAction<Record<string, number>>>
  >(
    (nextValue) => {
      const requested = resolveStateAction(nextValue, columnSizes);
      const normalized: Record<string, number> = {};

      for (const column of orderedColumns) {
        const columnId = getColumnId(column);
        const nextWidth = requested[columnId];
        if (
          typeof nextWidth !== "number" ||
          !Number.isFinite(nextWidth) ||
          nextWidth <= 0
        ) {
          continue;
        }
        if (
          (typeof column.width === "number" && Number.isFinite(column.width)) ||
          column.flex !== undefined
        ) {
          continue;
        }

        const { minWidth, maxWidth } = getColumnWidthBounds(
          column,
          computedColumnMinWidth,
          computedColumnMaxWidth
        );
        normalized[columnId] = clamp(Math.round(nextWidth), minWidth, maxWidth);
      }

      setManualColumnWidths(normalized);
    },
    [
      columnSizes,
      computedColumnMaxWidth,
      computedColumnMinWidth,
      orderedColumns,
      setManualColumnWidths,
    ]
  );
  const setColumnFlexesCompat = React.useCallback<
    React.Dispatch<React.SetStateAction<Record<string, number | null>>>
  >(
    (nextValue) => {
      const currentFlexes: Record<string, number | null> = {
        ...columnFlexes,
        ...manualColumnFlexes,
      };
      const requested = resolveStateAction(nextValue, currentFlexes);
      const normalized: Record<string, number | null> = {};

      for (const column of orderedColumns) {
        const columnId = getColumnId(column);
        if (!Object.prototype.hasOwnProperty.call(requested, columnId)) {
          continue;
        }
        if (
          (typeof column.width === "number" && Number.isFinite(column.width)) ||
          column.flex !== undefined
        ) {
          continue;
        }

        const nextFlex = requested[columnId];
        if (nextFlex === null) {
          normalized[columnId] = null;
        } else if (
          typeof nextFlex === "number" &&
          Number.isFinite(nextFlex) &&
          nextFlex > 0
        ) {
          normalized[columnId] = nextFlex;
        }
      }

      setManualColumnFlexes(normalized);
    },
    [columnFlexes, manualColumnFlexes, orderedColumns, setManualColumnFlexes]
  );
  const setColumnsSizesAutoCompat = React.useCallback(
    (config?: {
      columnIds?: string[];
      skipHeader?: boolean;
      skipSortTool?: boolean;
    }) => {
      const requestedIds = config?.columnIds ? new Set(config.columnIds) : null;
      const entries = orderedColumns.flatMap((column) => {
        const columnId = getColumnId(column);
        if (
          column.resizable === false ||
          (requestedIds && !requestedIds.has(columnId))
        ) {
          return [];
        }

        return [
          {
            column,
            width: estimateColumnContentWidth({
              column,
              rows: autosizeSample,
              skipHeaderOnAutoSize: config?.skipHeader ?? skipHeaderOnAutoSize,
              columnMinWidth: computedColumnMinWidth,
              columnMaxWidth: computedColumnMaxWidth,
            }),
          },
        ];
      });
      commitColumnResizeEntries(entries);
    },
    [
      autosizeSample,
      commitColumnResizeEntries,
      computedColumnMaxWidth,
      computedColumnMinWidth,
      orderedColumns,
      skipHeaderOnAutoSize,
    ]
  );
  const setColumnSizeAutoCompat = React.useCallback(
    (columnId: string, skipHeader?: boolean) => {
      setColumnsSizesAutoCompat({
        columnIds: [columnId],
        skipHeader,
      });
    },
    [setColumnsSizesAutoCompat]
  );
  const setColumnSizesToFitCompat = React.useCallback(() => {
    if (columnViewportWidth <= 0) return;

    const remaining = orderedColumns.filter(
      (column) => column.resizable !== false
    );
    if (remaining.length === 0) return;

    const targetWidths: Record<string, number> = {};
    let unavailableWidth = orderedColumns.reduce((sum, column) => {
      if (column.resizable !== false) return sum;
      return (
        sum + (columnWidths[getColumnId(column)] ?? computedColumnDefaultWidth)
      );
    }, 0);
    let pending = [...remaining];

    while (pending.length > 0) {
      const availableWidth = Math.max(
        0,
        columnViewportWidth - unavailableWidth
      );
      const currentWidth = pending.reduce(
        (sum, column) =>
          sum +
          (columnWidths[getColumnId(column)] ?? computedColumnDefaultWidth),
        0
      );
      const scale = currentWidth > 0 ? availableWidth / currentWidth : 1;
      const constrained = pending.find((column) => {
        const columnId = getColumnId(column);
        const current = columnWidths[columnId] ?? computedColumnDefaultWidth;
        const { minWidth, maxWidth } = getColumnWidthBounds(
          column,
          computedColumnMinWidth,
          computedColumnMaxWidth
        );
        const proposed = Math.round(current * scale);
        if (proposed >= minWidth && proposed <= maxWidth) return false;

        const width = clamp(proposed, minWidth, maxWidth);
        targetWidths[columnId] = width;
        unavailableWidth += width;
        return true;
      });

      if (constrained) {
        pending = pending.filter((column) => column !== constrained);
        continue;
      }

      let spaceLeft = availableWidth;
      pending.forEach((column, index) => {
        const columnId = getColumnId(column);
        const current = columnWidths[columnId] ?? computedColumnDefaultWidth;
        const width =
          index === pending.length - 1
            ? spaceLeft
            : Math.round(current * scale);
        targetWidths[columnId] = width;
        spaceLeft = Math.max(0, spaceLeft - width);
      });
      break;
    }

    commitColumnResizeEntries(
      remaining.map((column) => {
        const columnId = getColumnId(column);
        const width =
          targetWidths[columnId] ??
          columnWidths[columnId] ??
          computedColumnDefaultWidth;
        return flexWeights[columnId]
          ? { column, flex: width }
          : { column, width };
      }),
      0
    );
  }, [
    columnViewportWidth,
    flexWeights,
    columnWidths,
    commitColumnResizeEntries,
    computedColumnDefaultWidth,
    computedColumnMaxWidth,
    computedColumnMinWidth,
    orderedColumns,
  ]);
  return {
    columnFlexes,
    columnSizes,
    setColumnSizeAutoCompat,
    setColumnSizesCompat,
    setColumnFlexesCompat,
    setColumnSizesToFitCompat,
    setColumnsSizesAutoCompat,
  };
}
