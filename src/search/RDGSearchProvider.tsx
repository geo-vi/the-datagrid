"use client";

import * as React from "react";
import type { TypeDataGridProps } from "../types";
import { RDGSearchTarget } from "./RDGSearchTarget";
import { RDGSearchStoreProvider } from "./RDGSearchStoreProvider";
import { isMarkedGridType } from "./marker";

export type RDGSearchProviderProps = {
  children: React.ReactNode;
  defaultValue?: string;
};

export function RDGSearchProvider(
  props: RDGSearchProviderProps
): React.ReactElement {
  const { children, defaultValue = "" } = props;

  const targets = React.useMemo(
    () =>
      React.Children.map(children, (child) =>
        React.isValidElement(child) && isMarkedGridType(child.type) ? (
          <RDGSearchTarget>
            {child as React.ReactElement<TypeDataGridProps>}
          </RDGSearchTarget>
        ) : (
          child
        )
      ),
    [children]
  );

  return (
    <RDGSearchStoreProvider defaultValue={defaultValue}>
      {targets}
    </RDGSearchStoreProvider>
  );
}
