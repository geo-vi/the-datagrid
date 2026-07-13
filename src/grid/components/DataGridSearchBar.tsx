"use client";

import * as React from "react";
import { Search, X } from "lucide-react";

import type { TypeColumn } from "../../types";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { cn } from "../../lib/utils";
import {
  DatagridThemeProvider,
  normalizeThemeName,
  resolveThemeBase,
  toThemeClassSuffix,
  useDatagridPortalContainer,
  useDatagridThemeBase,
  useDatagridThemeName,
} from "../../theme/context";
import {
  createDataGridSearchColumns,
  parseDataGridSearchQuery,
} from "../utils/search";

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? React.useEffect : React.useLayoutEffect;

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
  theme?: string;
  value: string;
  onValueChange: (value: string, change: DataGridSearchBarChange) => void;
};

export function DataGridSearchBar(props: DataGridSearchBarProps) {
  const inheritedThemeName = useDatagridThemeName();
  const inheritedThemeBase = useDatagridThemeBase();
  const portalContainer = useDatagridPortalContainer();
  const themeName =
    props.theme === undefined
      ? inheritedThemeName
      : normalizeThemeName(props.theme);
  const themeBase =
    props.theme === undefined
      ? inheritedThemeBase
      : resolveThemeBase(themeName);

  return (
    <DatagridThemeProvider
      theme={themeName}
      themeBase={themeBase}
      portalContainer={portalContainer}
    >
      <DataGridSearchBarControl {...props} />
    </DatagridThemeProvider>
  );
}

function DataGridSearchBarControl(props: DataGridSearchBarProps) {
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
  const themeName = useDatagridThemeName();
  const themeBase = useDatagridThemeBase();
  const themeClassSuffix = toThemeClassSuffix(themeName);
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const prefixSlotRef = React.useRef<HTMLSpanElement | null>(null);
  const prefixTextRef = React.useRef<HTMLElement | null>(null);
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
  const prefixValue =
    highlightPrefix && parsedQuery.prefixEnd !== null
      ? value.slice(0, parsedQuery.prefixEnd)
      : "";

  useIsomorphicLayoutEffect(() => {
    const slot = prefixSlotRef.current;
    const text = prefixTextRef.current;
    if (!slot || !text || !prefixValue) return;

    let cancelled = false;
    const fitPrefix = () => {
      if (cancelled) return;

      text.style.setProperty("--tdg-search-prefix-scale", "1");
      const slotWidth = slot.getBoundingClientRect().width;
      const textWidth = text.getBoundingClientRect().width;
      if (slotWidth <= 0 || textWidth <= 0) return;

      text.style.setProperty(
        "--tdg-search-prefix-scale",
        String(Math.min(1, slotWidth / textWidth))
      );
    };

    fitPrefix();

    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(fitPrefix);
    observer?.observe(slot);
    observer?.observe(text);
    void document.fonts?.ready.then(fitPrefix);

    return () => {
      cancelled = true;
      observer?.disconnect();
    };
  }, [prefixValue, themeName]);

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
        standalone ? "tdg-search-root w-full shrink-0" : "min-w-0 flex-1",
        standalone ? `tdg-search-root--theme-${themeClassSuffix}` : "",
        standalone && themeBase === "dark" ? "dark" : ""
      )}
      role="search"
      aria-label={ariaLabel}
      data-slot="rdg-search-bar"
      data-theme={standalone ? themeName : undefined}
      data-theme-base={standalone ? themeBase : undefined}
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
            !isComposing &&
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
          className="pointer-events-none absolute inset-y-0 left-[calc(1px+var(--spacing)*7)] right-[calc(1px+var(--spacing)*9)] z-0 flex items-center overflow-hidden text-base text-[var(--tdg-input-color,var(--foreground))] md:text-sm"
          data-slot="rdg-search-query-highlight"
          aria-hidden="true"
        >
          <span
            className="inline-flex min-w-max whitespace-pre font-normal"
            style={{ transform: `translateX(${-scrollLeft}px)` }}
          >
            <span
              ref={prefixSlotRef}
              className="relative inline-block overflow-hidden whitespace-pre"
              data-slot="rdg-search-column-prefix-slot"
            >
              <span className="invisible">
                {value.slice(0, parsedQuery.prefixEnd)}
              </span>
              <strong
                ref={prefixTextRef}
                className="absolute left-0 top-0 w-max origin-left whitespace-pre font-bold"
                data-slot="rdg-search-column-prefix"
                style={{
                  transform: "scaleX(var(--tdg-search-prefix-scale, 0.8))",
                  transformOrigin: "left center",
                }}
              >
                {prefixValue}
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
