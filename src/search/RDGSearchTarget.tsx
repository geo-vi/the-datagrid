"use client";

import * as React from "react";
import type { TypeColumn, TypeDataGridProps } from "../types";
import { isMarkedGridType } from "./marker";
import { filterRDGSearchIndex, getCachedRDGSearchIndex } from "./utils";
import { useRDGSearchSnapshot, useRDGSearchStore } from "./store";

type SearchController = {
  value: string;
  filterRows: <Row>(rows: Row[], columns: TypeColumn[]) => Row[];
};

export type RDGSearchTargetProps = {
  children: React.ReactElement<TypeDataGridProps>;
};

function isMarkedGridElement(
  child: React.ReactElement<unknown>
): child is React.ReactElement<TypeDataGridProps> {
  return isMarkedGridType(child.type);
}

function looksLikeGridElement(
  child: React.ReactElement<unknown>
): child is React.ReactElement<TypeDataGridProps> {
  const props = child.props as Partial<TypeDataGridProps> | null;
  return Boolean(
    props &&
    typeof props.idProperty === "string" &&
    Array.isArray(props.columns) &&
    props.dataSource != null
  );
}

export function RDGSearchTarget(props: RDGSearchTargetProps) {
  const { children } = props;
  const store = useRDGSearchStore();
  const committedValue = useRDGSearchSnapshot();
  const query = committedValue.trim();

  if (!React.isValidElement(children)) {
    throw new Error("RDGSearchTarget expects exactly one ReactDataGrid child.");
  }

  if (!isMarkedGridElement(children) && !looksLikeGridElement(children)) {
    throw new Error("RDGSearchTarget expects a ReactDataGrid child.");
  }

  const targetColumns = children.props.columns;
  React.useEffect(
    () => store.registerColumns(targetColumns),
    [store, targetColumns]
  );

  const controller = React.useMemo<SearchController>(
    () => ({
      value: query,
      filterRows<Row>(rows: Row[], columns: TypeColumn[]) {
        return filterRDGSearchIndex(
          getCachedRDGSearchIndex(rows, columns),
          query
        ) as Row[];
      },
    }),
    [query]
  );

  return React.cloneElement(
    children as React.ReactElement<Record<string, unknown>>,
    { __rdgSearchController: controller }
  );
}
