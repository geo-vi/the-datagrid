"use client";

import * as React from "react";

import {
  findTargetGridElement,
  markOptionalTargetType,
  RDG_COLUMN_VISIBILITY_TARGET_COMPONENT_MARKER,
} from "../optional-target";
import type { TypeDataGridProps } from "../types";
import { isMarkedGridType } from "./runtime";
import { useRDGColumnVisibilityStore } from "./store";

export type RDGColumnVisibilityTargetProps = {
  children: React.ReactElement<TypeDataGridProps>;
};

export function RDGColumnVisibilityTarget(
  props: RDGColumnVisibilityTargetProps
): React.ReactElement {
  const { children } = props;
  const forwardedSearchController = (
    props as RDGColumnVisibilityTargetProps & {
      __rdgSearchController?: unknown;
    }
  ).__rdgSearchController;
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

  if (!findTargetGridElement(children, isMarkedGridType)) {
    throw new Error("RDGColumnVisibilityTarget expects a ReactDataGrid child.");
  }

  const injectedProps: Record<string, unknown> = {
    __rdgColumnVisibilityController: registration.controller,
  };
  if (forwardedSearchController !== undefined) {
    injectedProps.__rdgSearchController = forwardedSearchController;
  }

  return React.cloneElement(
    children as React.ReactElement<Record<string, unknown>>,
    injectedProps
  );
}

markOptionalTargetType(
  RDGColumnVisibilityTarget,
  RDG_COLUMN_VISIBILITY_TARGET_COMPONENT_MARKER
);
