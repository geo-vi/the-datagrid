"use client";

import * as React from "react";

import { RDGSearchTarget } from "../search/index";
import { RDGToolbarTarget } from "../toolbar/index";
import type { TypeDataGridProps } from "../types";

export type RDGTargetProps = {
  children: React.ReactElement<TypeDataGridProps>;
};

export function RDGTarget(props: RDGTargetProps): React.ReactElement {
  const toolbarTarget = (
    <RDGToolbarTarget>{props.children}</RDGToolbarTarget>
  ) as unknown as React.ReactElement<TypeDataGridProps>;

  return <RDGSearchTarget>{toolbarTarget}</RDGSearchTarget>;
}
