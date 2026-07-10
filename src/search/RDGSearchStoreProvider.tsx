"use client";

import * as React from "react";
import { createRDGSearchStore, RDGSearchContext } from "./store";

export function RDGSearchStoreProvider(props: {
  children: React.ReactNode;
  defaultValue: string;
}) {
  const { children, defaultValue } = props;
  const [store] = React.useState(() => createRDGSearchStore(defaultValue));

  React.useEffect(() => () => store.dispose(), [store]);

  return (
    <RDGSearchContext.Provider value={store}>
      {children}
    </RDGSearchContext.Provider>
  );
}
