"use client";

import * as React from "react";
import type { DataGridSearchBarChange } from "../grid/components/DataGridSearchBar";
import {
  useRDGSearchColumnsSnapshot,
  useRDGSearchDraftSnapshot,
  useRDGSearchStore,
  useRDGSearchThemeSnapshot,
} from "./store";
import { getCoreSearchRuntime } from "./runtime";

const CoreSearchBar = getCoreSearchRuntime().SearchBar;

export type RDGSearchBarProps = {
  ariaLabel?: string;
  autoFocus?: boolean;
  clearLabel?: string;
  debounceMs?: number;
  placeholder?: string;
};

export function RDGSearchBar(props: RDGSearchBarProps) {
  const {
    ariaLabel = "Search all fields",
    autoFocus = false,
    clearLabel = "Clear search",
    debounceMs = 150,
    placeholder = "Search all fields",
  } = props;
  const store = useRDGSearchStore();
  const draftValue = useRDGSearchDraftSnapshot();
  const columns = useRDGSearchColumnsSnapshot();
  const theme = useRDGSearchThemeSnapshot();
  const setSearchValue = React.useCallback(
    (nextValue: string, change: DataGridSearchBarChange) => {
      if (change.immediate) {
        store.setValue(nextValue);
        return;
      }

      store.setDraftValue(nextValue, change.commit ? debounceMs : null);
    },
    [debounceMs, store]
  );

  return (
    <CoreSearchBar
      value={draftValue}
      columns={columns}
      ariaLabel={ariaLabel}
      autoFocus={autoFocus}
      clearLabel={clearLabel}
      placeholder={placeholder}
      standalone
      theme={theme}
      onValueChange={setSearchValue}
    />
  );
}
