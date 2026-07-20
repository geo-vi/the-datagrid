"use client";

import * as React from "react";

import type { TypeDataGridProps } from "../types";
import { isMarkedGridType } from "./runtime";
import { RDGColumnVisibilityTarget } from "./RDGColumnVisibilityTarget";
import {
  createRDGColumnVisibilityStore,
  RDGColumnVisibilityContext,
} from "./store";

export type RDGColumnVisibilityProviderProps = {
  children: React.ReactNode;
};

export function RDGColumnVisibilityProvider(
  props: RDGColumnVisibilityProviderProps
) {
  const { children } = props;
  const [store] = React.useState(createRDGColumnVisibilityStore);

  React.useEffect(() => () => store.dispose(), [store]);

  const targets = React.useMemo(
    () =>
      React.Children.map(children, (child) =>
        React.isValidElement(child) && isMarkedGridType(child.type) ? (
          <RDGColumnVisibilityTarget>
            {child as React.ReactElement<TypeDataGridProps>}
          </RDGColumnVisibilityTarget>
        ) : (
          child
        )
      ),
    [children]
  );

  return (
    <RDGColumnVisibilityContext.Provider value={store}>
      {targets}
    </RDGColumnVisibilityContext.Provider>
  );
}
