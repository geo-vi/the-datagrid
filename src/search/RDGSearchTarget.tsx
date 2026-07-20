"use client";

import * as React from "react";
import type { TypeColumn, TypeDataGridProps } from "../types";
import {
  findTargetGridElement,
  markOptionalTargetType,
  RDG_SEARCH_TARGET_COMPONENT_MARKER,
} from "../optional-target";
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

export function RDGSearchTarget(props: RDGSearchTargetProps) {
  const { children } = props;
  const forwardedColumnVisibilityController = (
    props as RDGSearchTargetProps & {
      __rdgColumnVisibilityController?: unknown;
    }
  ).__rdgColumnVisibilityController;
  const store = useRDGSearchStore();
  const committedValue = useRDGSearchSnapshot();
  const query = committedValue.trim();

  if (!React.isValidElement(children)) {
    throw new Error("RDGSearchTarget expects exactly one ReactDataGrid child.");
  }

  const gridElement = findTargetGridElement(children, isMarkedGridType);
  if (!gridElement) {
    throw new Error("RDGSearchTarget expects a ReactDataGrid child.");
  }

  const targetColumns = gridElement.props.columns;
  const targetTheme = gridElement.props.theme;
  React.useEffect(
    () => store.registerTarget(targetColumns, targetTheme),
    [store, targetColumns, targetTheme]
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

  const injectedProps: Record<string, unknown> = {
    __rdgSearchController: controller,
  };
  if (forwardedColumnVisibilityController !== undefined) {
    injectedProps.__rdgColumnVisibilityController =
      forwardedColumnVisibilityController;
  }

  return React.cloneElement(
    children as React.ReactElement<Record<string, unknown>>,
    injectedProps
  );
}

markOptionalTargetType(RDGSearchTarget, RDG_SEARCH_TARGET_COMPONENT_MARKER);
