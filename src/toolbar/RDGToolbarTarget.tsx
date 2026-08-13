"use client";

import * as React from "react";

import {
  findTargetGridElement,
  markOptionalTargetType,
  RDG_TOOLBAR_TARGET_COMPONENT_MARKER,
} from "../optional-target";
import type { TypeDataGridProps } from "../types";
import { isMarkedGridType } from "./runtime";
import { useRDGToolbarStore } from "./store";

export type RDGToolbarTargetProps = {
  children: React.ReactElement<TypeDataGridProps>;
};

export function RDGToolbarTarget(
  props: RDGToolbarTargetProps
): React.ReactElement {
  const { children } = props;
  const forwardedSearchController = (
    props as RDGToolbarTargetProps & {
      __rdgSearchController?: unknown;
    }
  ).__rdgSearchController;
  const store = useRDGToolbarStore();
  const registration = React.useMemo(
    () => store.createTargetRegistration(),
    [store]
  );

  React.useEffect(() => registration.attach(), [registration]);

  if (!React.isValidElement(children)) {
    throw new Error(
      "RDGToolbarTarget expects exactly one ReactDataGrid child."
    );
  }

  if (!findTargetGridElement(children, isMarkedGridType)) {
    throw new Error("RDGToolbarTarget expects a ReactDataGrid child.");
  }

  const injectedProps: Record<string, unknown> = {
    __rdgToolbarController: registration.controller,
  };
  if (forwardedSearchController !== undefined) {
    injectedProps.__rdgSearchController = forwardedSearchController;
  }

  return React.cloneElement(
    children as React.ReactElement<Record<string, unknown>>,
    injectedProps
  );
}

markOptionalTargetType(RDGToolbarTarget, RDG_TOOLBAR_TARGET_COMPONENT_MARKER);
