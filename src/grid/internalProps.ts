import type * as React from "react";

import type {
  TypeCellProps,
  TypeColumn,
  TypeDataGridProps,
  TypeRowProps,
  TypeSingleFilterValue,
} from "../types";

export type OpenColumnContextMenu = {
  alignTo: HTMLElement | { left: number; top: number };
  cellProps: TypeCellProps;
  restoreFocusTo: HTMLElement | null;
  onHide?: () => void;
};

export type OpenRowContextMenu = {
  alignTo: HTMLElement | { left: number; top: number };
  rowProps: TypeRowProps;
  cellProps?: TypeCellProps;
  restoreFocusTo: HTMLElement | null;
  onHide?: () => void;
};

export type InternalSearchController = {
  value: string;
  filterRows: <Row>(rows: Row[], columns: TypeColumn[]) => Row[];
};

export type InternalColumnVisibilitySnapshot = {
  columns: readonly TypeColumn[];
  columnOrder: readonly string[];
  columnVisibilityMap: Readonly<Record<string, boolean>>;
  theme: string;
  setColumnVisible: (columnId: string, visible: boolean) => void;
};

export type InternalColumnVisibilityController = {
  publish: (snapshot: InternalColumnVisibilitySnapshot) => void;
};

export type InternalDataGridProps = TypeDataGridProps & {
  /** Injected by the optional search package; intentionally not public API. */
  __rdgSearchController?: InternalSearchController;
  /** Injected by the optional column-visibility package; not public API. */
  __rdgColumnVisibilityController?: InternalColumnVisibilityController;
};

let publicPropsCache:
  | WeakMap<InternalDataGridProps, InternalDataGridProps>
  | undefined;

export function getPublicProps(
  internalProps: InternalDataGridProps
): InternalDataGridProps {
  const cache =
    publicPropsCache ??
    (publicPropsCache = new WeakMap<
      InternalDataGridProps,
      InternalDataGridProps
    >());
  const cached = cache.get(internalProps);
  if (cached) return cached;

  const publicProps = { ...internalProps };
  delete publicProps.__rdgSearchController;
  delete publicProps.__rdgColumnVisibilityController;
  cache.set(internalProps, publicProps);
  return publicProps;
}

let nextGridId = 1;

export function allocateGridId(): number {
  return nextGridId++;
}

export function resolveStateAction<T>(
  action: React.SetStateAction<T>,
  previous: T
): T {
  return typeof action === "function"
    ? (action as (prevState: T) => T)(previous)
    : action;
}

export function resolveFilterTypeName(
  column: TypeColumn | undefined,
  entry?: TypeSingleFilterValue
): string {
  return (
    entry?.type ??
    column?.filterType ??
    (typeof (column as any)?.type === "string"
      ? ((column as any).type as string)
      : undefined) ??
    "string"
  );
}

export function resolveDefaultFilterOperator(
  filterType: string,
  entry?: TypeSingleFilterValue
): string {
  if (entry?.operator) return entry.operator;
  if (filterType === "number") return "gte";
  if (filterType === "select") return "eq";
  if (filterType === "bool" || filterType === "boolean") return "eq";
  if (filterType === "date" || filterType === "time") return "afterOrOn";
  return "contains";
}
