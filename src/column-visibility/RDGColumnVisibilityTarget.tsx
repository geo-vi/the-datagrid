"use client";

import * as React from "react";

import type { TypeDataGridProps } from "../types";
import { isMarkedGridType } from "./runtime";
import { useRDGColumnVisibilityStore } from "./store";

export type RDGColumnVisibilityTargetProps = {
  children: React.ReactElement<TypeDataGridProps>;
};

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

export function RDGColumnVisibilityTarget(
  props: RDGColumnVisibilityTargetProps
) {
  const { children } = props;
  const store = useRDGColumnVisibilityStore();
  const registration = React.useMemo(
    () => store.createTargetRegistration(),
    [store]
  );

  React.useEffect(() => registration.attach(), [registration]);

  if (!React.isValidElement(children)) {
    throw new Error(
      "RDGColumnVisibilityTarget expects exactly one ReactDataGrid child."
    );
  }

  if (!isMarkedGridType(children.type) && !looksLikeGridElement(children)) {
    throw new Error("RDGColumnVisibilityTarget expects a ReactDataGrid child.");
  }

  return React.cloneElement(
    children as React.ReactElement<Record<string, unknown>>,
    { __rdgColumnVisibilityController: registration.controller }
  );
}
