import * as React from "react";

import type { TypeRowSelection } from "../../types";
import { unwrapSelectionState } from "../utils/gridUtils";

export type UseGridRowApiParams = {
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
  deselectAllRows: () => void;
  emitSelectionChange: (
    nextSelected: TypeRowSelection,
    meta?: { data?: unknown; unselected?: TypeRowSelection }
  ) => void;
  getRowKey: (row: any, index: number) => string;
  hierarchyRowId?: (row: unknown, index: number) => string | number;
  idProperty: string;
  rows: any[];
  selectAllRows: () => void;
  setRows: React.Dispatch<React.SetStateAction<any[]>>;
  unselected: Record<string, any> | null | undefined;
};

/**
 * Inovua-compatible row API: selection setters plus the in-place row mutation
 * helpers (`setItemAt`, `setItemsAt`, …).
 */
export function useGridRowApi(params: UseGridRowApiParams) {
  const {
    commitRowSelection,
    deselectAllRows,
    emitSelectionChange,
    getRowKey,
    hierarchyRowId,
    idProperty,
    rows,
    selectAllRows,
    setRows,
    unselected,
  } = params;

  const setSelectedCompat = React.useCallback(
    (nextSelected: TypeRowSelection) => {
      const normalized = unwrapSelectionState(nextSelected);
      emitSelectionChange(normalized, {
        unselected: normalized === true ? unselected : null,
      });
    },
    [emitSelectionChange, unselected]
  );

  const selectAllCompat = selectAllRows;
  const deselectAllCompat = deselectAllRows;

  const setSelectedByIdCompat = React.useCallback(
    (id: string, nextSelected: boolean) => {
      const rowIndex = rows.findIndex(
        (candidate, index) => getRowKey(candidate, index) === id
      );
      if (rowIndex < 0) return;
      commitRowSelection(rowIndex, {
        checked: nextSelected,
        fromCheckbox: true,
      });
    },
    [commitRowSelection, getRowKey, rows]
  );

  const setSelectedAtCompat = React.useCallback(
    (index: number, nextSelected: boolean) => {
      if (!rows[index]) return;
      commitRowSelection(index, {
        checked: nextSelected,
        fromCheckbox: true,
      });
    },
    [commitRowSelection, rows]
  );

  const getItemIndexByIdCompat = React.useCallback(
    (rowId: string | number, data?: unknown[]) => {
      const source = Array.isArray(data) ? data : rows;
      const idAsString = String(rowId);

      return source.findIndex((candidate, index) => {
        const value = hierarchyRowId
          ? hierarchyRowId(candidate, index)
          : (candidate as any)?.[idProperty];
        return String(value == null ? index : value) === idAsString;
      });
    },
    [hierarchyRowId, idProperty, rows]
  );
  const setItemAtCompat = React.useCallback(
    (
      index: number,
      item: unknown,
      config?: {
        replace?: boolean;
        property?: string;
        value?: unknown;
      }
    ) => {
      if (!Number.isInteger(index) || index < 0) return;
      setRows((current) => {
        if (index >= current.length) return current;
        const existing = current[index];
        let nextItem = item;
        if (config?.property) {
          nextItem = {
            ...(existing && typeof existing === "object" ? existing : {}),
            [config.property]: config.value,
          };
        } else if (
          config?.replace === false &&
          existing &&
          typeof existing === "object" &&
          item &&
          typeof item === "object"
        ) {
          nextItem = { ...existing, ...item };
        }
        if (Object.is(existing, nextItem)) return current;
        const next = [...current];
        next[index] = nextItem;
        return next;
      });
    },
    [setRows]
  );
  const setItemPropertyAtCompat = React.useCallback(
    (index: number, property: string, value: unknown) => {
      setItemAtCompat(index, undefined, { property, value });
    },
    [setItemAtCompat]
  );
  const setItemPropertyForIdCompat = React.useCallback(
    (id: string | number, property: string, value: unknown) => {
      const index = getItemIndexByIdCompat(id);
      if (index >= 0) setItemPropertyAtCompat(index, property, value);
    },
    [getItemIndexByIdCompat, setItemPropertyAtCompat]
  );
  const setItemsAtCompat = React.useCallback(
    (
      items: unknown[] | Record<number, unknown>,
      config?: { replace?: boolean }
    ) => {
      const entries = Array.isArray(items)
        ? items.map((item, index) => [index, item] as const)
        : Object.entries(items).flatMap(([index, item]) => {
            const numericIndex = Number(index);
            return Number.isInteger(numericIndex)
              ? ([[numericIndex, item]] as const)
              : [];
          });
      setRows((current) => {
        let changed = false;
        const next = [...current];
        for (const [index, item] of entries) {
          if (index < 0 || index >= next.length) continue;
          const existing = next[index];
          const nextItem =
            config?.replace === false &&
            existing &&
            typeof existing === "object" &&
            item &&
            typeof item === "object"
              ? { ...existing, ...item }
              : item;
          if (Object.is(existing, nextItem)) continue;
          next[index] = nextItem;
          changed = true;
        }
        return changed ? next : current;
      });
    },
    [setRows]
  );
  return {
    deselectAllCompat,
    getItemIndexByIdCompat,
    selectAllCompat,
    setItemAtCompat,
    setItemPropertyAtCompat,
    setItemPropertyForIdCompat,
    setItemsAtCompat,
    setSelectedAtCompat,
    setSelectedByIdCompat,
    setSelectedCompat,
  };
}
