"use client";

import * as React from "react";

import type { TypeDataGridProps } from "../types";
import { isMarkedGridType } from "./runtime";
import { RDGToolbarTarget } from "./RDGToolbarTarget";
import { createRDGToolbarStore, RDGToolbarContext } from "./store";

export type RDGToolbarProviderProps = {
  children: React.ReactNode;
};

export function RDGToolbarProvider(
  props: RDGToolbarProviderProps
): React.ReactElement {
  const { children } = props;
  const [store] = React.useState(createRDGToolbarStore);

  React.useEffect(() => () => store.dispose(), [store]);

  const targets = React.useMemo(
    () =>
      React.Children.map(children, (child) =>
        React.isValidElement(child) && isMarkedGridType(child.type) ? (
          <RDGToolbarTarget>
            {child as React.ReactElement<TypeDataGridProps>}
          </RDGToolbarTarget>
        ) : (
          child
        )
      ),
    [children]
  );

  return (
    <RDGToolbarContext.Provider value={store}>
      {targets}
    </RDGToolbarContext.Provider>
  );
}
