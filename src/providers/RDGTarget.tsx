"use client";

import * as React from "react";

import { RDGColumnVisibilityTarget } from "../column-visibility/index";
import { RDGSearchTarget } from "../search/index";
import type { TypeDataGridProps } from "../types";

export type RDGTargetProps = {
  children: React.ReactElement<TypeDataGridProps>;
};

export function RDGTarget(props: RDGTargetProps): React.ReactElement {
  const columnVisibilityTarget = (
    <RDGColumnVisibilityTarget>{props.children}</RDGColumnVisibilityTarget>
  ) as unknown as React.ReactElement<TypeDataGridProps>;

  return <RDGSearchTarget>{columnVisibilityTarget}</RDGSearchTarget>;
}
