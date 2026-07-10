"use client";

import * as React from "react";
import { useRDGSearchDraftSnapshot, useRDGSearchStore } from "./store";

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function ClearIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

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
    placeholder = "Search all fields…",
  } = props;
  const store = useRDGSearchStore();
  const draftValue = useRDGSearchDraftSnapshot();
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const isComposingRef = React.useRef(false);

  const clear = React.useCallback(() => {
    isComposingRef.current = false;
    store.setValue("");
    inputRef.current?.focus();
  }, [store]);

  return (
    <div
      className="tdg-search-root tdg-search-bar relative flex w-full items-center rounded-md text-foreground"
      role="search"
      data-slot="rdg-search-bar"
    >
      <span className="pointer-events-none absolute left-3 text-muted-foreground">
        <SearchIcon />
      </span>
      <input
        ref={inputRef}
        type="search"
        role="searchbox"
        value={draftValue}
        autoFocus={autoFocus}
        aria-label={ariaLabel}
        placeholder={placeholder}
        className="flex h-10 w-full rounded-md border border-input bg-background py-2 pl-9 pr-10 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 [&::-webkit-search-cancel-button]:hidden"
        onChange={(event) => {
          const nextValue = event.currentTarget.value;
          store.setDraftValue(
            nextValue,
            isComposingRef.current ? null : debounceMs
          );
        }}
        onCompositionStart={(event) => {
          isComposingRef.current = true;
          store.setDraftValue(event.currentTarget.value, null);
        }}
        onCompositionEnd={(event) => {
          isComposingRef.current = false;
          const nextValue = event.currentTarget.value;
          store.setDraftValue(nextValue, debounceMs);
        }}
        onKeyDown={(event) => {
          if (
            event.key === "Escape" &&
            !event.nativeEvent.isComposing &&
            draftValue
          ) {
            event.preventDefault();
            clear();
          }
        }}
      />
      {draftValue ? (
        <button
          type="button"
          className="absolute right-1 inline-flex h-8 w-8 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
          aria-label={clearLabel}
          title={clearLabel}
          onClick={clear}
        >
          <ClearIcon />
        </button>
      ) : null}
    </div>
  );
}
