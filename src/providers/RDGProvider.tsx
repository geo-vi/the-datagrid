"use client";

import * as React from "react";

import { RDGColumnVisibilityProvider } from "../column-visibility/index";
import { RDGSearchProvider } from "../search/index";
import { isMarkedGridType } from "../search/marker";
import type { TypeDataGridProps } from "../types";
import { RDGTarget } from "./RDGTarget";

export type RDGProviderProps = {
  children: React.ReactNode;
  defaultSearchValue?: string;
};

export function RDGProvider(props: RDGProviderProps): React.ReactElement {
  const { children, defaultSearchValue = "" } = props;
  const targets = React.useMemo(
    () =>
      React.Children.map(children, (child) =>
        React.isValidElement(child) && isMarkedGridType(child.type) ? (
          <RDGTarget>
            {child as React.ReactElement<TypeDataGridProps>}
          </RDGTarget>
        ) : (
          child
        )
      ),
    [children]
  );

  return (
    <RDGSearchProvider defaultValue={defaultSearchValue}>
      <RDGColumnVisibilityProvider>{targets}</RDGColumnVisibilityProvider>
    </RDGSearchProvider>
  );
}
