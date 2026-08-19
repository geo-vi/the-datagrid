"use client";

import * as React from "react";

import type { TypeDataGridProps } from "../types";
import type { RDGToolbarApi } from "./api";
import type { RDGToolbarExportSettings } from "./export";
import { isMarkedGridType } from "./runtime";
import { RDGToolbarTarget } from "./RDGToolbarTarget";
import { createRDGToolbarStore, RDGToolbarContext } from "./store";

export type RDGToolbarProviderProps = {
  children: React.ReactNode;
  /**
   * Receives the imperative toolbar API, so a component above this provider can
   * export the grid, toggle columns or clear filters without a hook.
   */
  apiRef?: React.Ref<RDGToolbarApi>;
  /**
   * Export settings both `RDGToolbar`'s button and `apiRef` fall back to. The
   * matching toolbar prop and one export's own settings outrank these.
   */
  exportDefaults?: RDGToolbarExportSettings;
};

// An effect rather than a write during render, so StrictMode's double render
// stays idempotent. The layout phase still beats any user interaction.
const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? React.useEffect : React.useLayoutEffect;

export function RDGToolbarProvider(
  props: RDGToolbarProviderProps
): React.ReactElement {
  const { children, apiRef, exportDefaults } = props;
  const [store] = React.useState(createRDGToolbarStore);

  React.useEffect(() => () => store.dispose(), [store]);

  useIsomorphicLayoutEffect(() => {
    store.setExportDefaults(exportDefaults);
  }, [store, exportDefaults]);

  React.useImperativeHandle(apiRef, () => store.api, [store]);

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
