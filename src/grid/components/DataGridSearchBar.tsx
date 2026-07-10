"use client";

import * as React from "react";
import { Search, X } from "lucide-react";

import type { TypeColumn } from "../../types";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { cn } from "../../lib/utils";
import {
  createDataGridSearchColumns,
  parseDataGridSearchQuery,
} from "../utils/search";

export type DataGridSearchBarChange = {
  commit: boolean;
  immediate: boolean;
};

export type DataGridSearchBarProps = {
  ariaLabel?: string;
  autoFocus?: boolean;
  clearLabel?: string;
  columns: readonly TypeColumn[];
  placeholder?: string;
  standalone?: boolean;
  value: string;
  onValueChange: (value: string, change: DataGridSearchBarChange) => void;
};

export function DataGridSearchBar(props: DataGridSearchBarProps) {
  const {
    ariaLabel = "Search all fields",
    autoFocus = false,
    clearLabel = "Clear search",
    columns,
    placeholder = "Search all fields",
    standalone = false,
    value,
    onValueChange,
  } = props;
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [isComposing, setIsComposing] = React.useState(false);
  const [scrollLeft, setScrollLeft] = React.useState(0);
  const searchColumns = React.useMemo(
    () => createDataGridSearchColumns(columns),
    [columns]
  );
  const parsedQuery = React.useMemo(
    () => parseDataGridSearchQuery(value, searchColumns),
    [searchColumns, value]
  );
  const highlightPrefix = parsedQuery.prefixEnd !== null && !isComposing;

  React.useEffect(() => {
    const nextScrollLeft = inputRef.current?.scrollLeft ?? 0;
    setScrollLeft((current) =>
      current === nextScrollLeft ? current : nextScrollLeft
    );
  }, [value]);

  const clear = React.useCallback(() => {
    setIsComposing(false);
    setScrollLeft(0);
    onValueChange("", { commit: true, immediate: true });
    inputRef.current?.focus();
  }, [onValueChange]);

  return (
    <div
      className={cn(
        "tdg-search-bar relative rounded-md bg-[var(--tdg-input-bg,var(--background))]",
        standalone ? "tdg-search-root w-full shrink-0" : "min-w-0 flex-1"
      )}
      role="search"
      data-slot="rdg-search-bar"
    >
      <Search
        className="pointer-events-none absolute left-3 top-1/2 z-20 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        ref={inputRef}
        className={cn(
          "h-10 pl-7 pr-9",
          highlightPrefix && "relative z-10 !bg-transparent"
        )}
        inputClassName={cn(
          "!p-0",
          highlightPrefix &&
            "!text-transparent caret-[var(--tdg-input-color,var(--foreground))]"
        )}
        value={value}
        autoFocus={autoFocus}
        onChange={(event) => {
          const nextValue = event.currentTarget.value;
          setScrollLeft(event.currentTarget.scrollLeft);
          onValueChange(nextValue, {
            commit: !isComposing,
            immediate: false,
          });
        }}
        onScroll={(event) => setScrollLeft(event.currentTarget.scrollLeft)}
        onSelect={(event) => setScrollLeft(event.currentTarget.scrollLeft)}
        onCompositionStart={(event) => {
          setIsComposing(true);
          onValueChange(event.currentTarget.value, {
            commit: false,
            immediate: false,
          });
        }}
        onCompositionEnd={(event) => {
          setIsComposing(false);
          setScrollLeft(event.currentTarget.scrollLeft);
          onValueChange(event.currentTarget.value, {
            commit: true,
            immediate: false,
          });
        }}
        onKeyDown={(event) => {
          if (
            event.key === "Escape" &&
            !event.nativeEvent.isComposing &&
            value
          ) {
            event.preventDefault();
            clear();
          }
        }}
        placeholder={placeholder}
        aria-label={ariaLabel}
        type="text"
        role="searchbox"
      />
      {highlightPrefix && parsedQuery.prefixEnd !== null ? (
        <div
          className="pointer-events-none absolute inset-y-0 left-7 right-9 z-0 flex items-center overflow-hidden text-base text-[var(--tdg-input-color,var(--foreground))] md:text-sm"
          data-slot="rdg-search-query-highlight"
          aria-hidden="true"
        >
          <span
            className="inline-flex min-w-max whitespace-pre font-normal"
            style={{ transform: `translateX(${-scrollLeft}px)` }}
          >
            <span className="relative inline-block">
              <span className="invisible">
                {value.slice(0, parsedQuery.prefixEnd)}
              </span>
              <strong
                className="absolute inset-0 whitespace-pre font-bold"
                data-slot="rdg-search-column-prefix"
              >
                {value.slice(0, parsedQuery.prefixEnd)}
              </strong>
            </span>
            <span className="font-normal" data-slot="rdg-search-query-value">
              {value.slice(parsedQuery.prefixEnd)}
            </span>
          </span>
        </div>
      ) : null}
      {value ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-0 top-0 z-20 m-0 h-10 w-10 p-0 shadow-none [background-image:none] [font-family:inherit]"
          onClick={clear}
          aria-label={clearLabel}
          title={clearLabel}
          data-slot="rdg-search-clear"
        >
          <X />
        </Button>
      ) : null}
    </div>
  );
}
