import { useRouter } from "@tanstack/react-router";
import { BookOpenText, FileCode2, Search } from "lucide-react";
import * as React from "react";
import { useDeferredValue, useMemo, useState } from "react";

import { Button } from "../../src/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../../src/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "../../src/components/ui/dialog";
import { cn } from "../../src/lib/utils";
import type { SearchDocument } from "./search/searchDocuments";

type DocfindSearchModule = {
  default: (query: string, limit?: number) => Promise<SearchDocument[]>;
  init?: () => Promise<unknown>;
};

let docfindModulePromise: Promise<DocfindSearchModule> | null = null;
let docfindReadyPromise: Promise<DocfindSearchModule> | null = null;

function getDocfindModuleUrl() {
  return new URL(
    `${import.meta.env.BASE_URL}search/docfind.js`,
    window.location.origin
  ).toString();
}

async function loadDocfindModule() {
  if (!docfindModulePromise) {
    docfindModulePromise = import(
      /* @vite-ignore */ getDocfindModuleUrl()
    ) as Promise<DocfindSearchModule>;
  }

  return docfindModulePromise;
}

async function ensureDocfindReady() {
  if (!docfindReadyPromise) {
    docfindReadyPromise = loadDocfindModule().then(async (module) => {
      await module.init?.();
      return module;
    });
  }

  return docfindReadyPromise;
}

function getShortcutLabel() {
  if (typeof navigator === "undefined") {
    return "Cmd/Ctrl K";
  }

  return /mac|iphone|ipad/i.test(navigator.platform) ? "Cmd K" : "Ctrl K";
}

function SearchResultRow(props: {
  result: SearchDocument;
  onSelect: (result: SearchDocument) => void;
}) {
  const { onSelect, result } = props;
  const isDocsResult = result.href.startsWith("/docs");

  return (
    <CommandItem
      value={result.href}
      onSelect={() => onSelect(result)}
      className="items-start gap-3 rounded-2xl px-3 py-3"
    >
      <div className="mt-0.5 rounded-xl border bg-muted/40 p-2 text-muted-foreground">
        {isDocsResult ? (
          <BookOpenText className="h-4 w-4" aria-hidden="true" />
        ) : (
          <FileCode2 className="h-4 w-4" aria-hidden="true" />
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-foreground">{result.title}</span>
          <span className="rounded-full border bg-muted/50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {result.category}
          </span>
        </div>
        <p className="line-clamp-2 text-sm text-muted-foreground">
          {result.body}
        </p>
        <div className="font-mono text-[11px] text-muted-foreground">
          {result.href}
        </div>
      </div>
    </CommandItem>
  );
}

export default function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const deferredQuery = useDeferredValue(query.trim());
  const shortcutLabel = useMemo(() => getShortcutLabel(), []);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  React.useEffect(() => {
    if (!open) {
      return;
    }

    void ensureDocfindReady().catch((error: unknown) => {
      console.error("Failed to initialize Docfind search", error);
      setErrorMessage("Search assets are unavailable right now.");
    });
  }, [open]);

  React.useEffect(() => {
    if (!open) {
      return;
    }

    if (!deferredQuery) {
      setResults([]);
      setLoading(false);
      setErrorMessage(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void ensureDocfindReady()
      .then((module) => module.default(deferredQuery, 12))
      .then((nextResults) => {
        if (cancelled) {
          return;
        }

        setResults(nextResults);
        setErrorMessage(null);
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }

        console.error("Docfind search failed", error);
        setResults([]);
        setErrorMessage("Search failed. Try again in a moment.");
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [deferredQuery, open]);

  const docsResults = results.filter((result) => result.href.startsWith("/docs"));
  const exampleResults = results.filter((result) =>
    result.href.startsWith("/examples")
  );

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);

    if (!nextOpen) {
      setQuery("");
      setResults([]);
      setLoading(false);
      setErrorMessage(null);
    }
  };

  const handleSelect = (result: SearchDocument) => {
    const [path, hash] = result.href.split("#");

    handleOpenChange(false);
    void router.navigate({
      to: path as never,
      hash: hash || undefined,
    });
  };

  const emptyState = (() => {
    if (errorMessage) {
      return errorMessage;
    }

    if (!deferredQuery) {
      return "Search prop names, type aliases, guides, or example source code.";
    }

    if (loading) {
      return "Searching docs and examples…";
    }

    return "No matching docs or examples.";
  })();

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-10 min-w-[220px] justify-between rounded-2xl border bg-background/95 px-3 text-muted-foreground shadow-sm"
        aria-label="Open global search"
        onClick={() => setOpen(true)}
      >
        <span className="flex items-center gap-2">
          <Search className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">Search docs and examples</span>
          <span className="sm:hidden">Search</span>
        </span>
        <span className="rounded-lg border bg-muted/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {shortcutLabel}
        </span>
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-3xl overflow-hidden rounded-3xl border bg-background p-0 shadow-2xl">
          <div className="border-b px-5 py-4">
            <DialogTitle className="text-base">Global search</DialogTitle>
            <DialogDescription className="mt-1">
              Search every docs page, prop reference, and live example from one
              place.
            </DialogDescription>
          </div>

          <Command
            shouldFilter={false}
            className="rounded-none bg-transparent"
          >
            <CommandInput
              value={query}
              onValueChange={setQuery}
              autoFocus
              placeholder="Try columnOrder, TypeI18n, selection, or remote data"
              aria-label="Global search input"
            />
            <CommandList className="max-h-[60vh] px-3 py-3">
              <CommandEmpty className={cn(loading && deferredQuery ? "animate-pulse" : "")}>
                {emptyState}
              </CommandEmpty>

              {docsResults.length > 0 ? (
                <CommandGroup heading="Docs">
                  {docsResults.map((result) => (
                    <SearchResultRow
                      key={`${result.href}:${result.title}`}
                      result={result}
                      onSelect={handleSelect}
                    />
                  ))}
                </CommandGroup>
              ) : null}

              {exampleResults.length > 0 ? (
                <CommandGroup heading="Examples">
                  {exampleResults.map((result) => (
                    <SearchResultRow
                      key={`${result.href}:${result.title}`}
                      result={result}
                      onSelect={handleSelect}
                    />
                  ))}
                </CommandGroup>
              ) : null}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}
