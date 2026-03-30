import { Link } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "../../src/components/ui/button";
import { Input } from "../../src/components/ui/input";
import { examplePages } from "./exampleMeta";

export default function ExamplesOverviewPage() {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const filteredExamples = useMemo(() => {
    if (!normalizedQuery) {
      return examplePages;
    }

    return examplePages.filter((example) => {
      const haystack = [
        example.label,
        example.title,
        example.summary,
        example.details,
        example.sourcePath,
        ...example.tags,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [normalizedQuery]);

  return (
    <section className="flex flex-col gap-6">
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight">Examples</h2>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative max-w-xl flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search examples, tags, or scenarios"
              aria-label="Search examples"
              className="pl-9"
            />
          </div>

          <div className="text-sm text-muted-foreground">
            {filteredExamples.length} example
            {filteredExamples.length === 1 ? "" : "s"}
          </div>
        </div>
      </div>

      {filteredExamples.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {filteredExamples.map((example) => (
            <article
              key={example.to}
              className="flex h-full flex-col gap-4 rounded-3xl border bg-background/95 p-5 shadow-sm"
            >
              <div className="space-y-3">
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                    {example.label}
                  </p>
                  <h3 className="text-xl font-semibold">{example.title}</h3>
                </div>

                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>{example.summary}</p>
                  <p>{example.details}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {example.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border bg-muted/40 px-2.5 py-1 text-xs font-medium text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="mt-auto flex items-center justify-between gap-3 border-t pt-4">
                <div className="font-mono text-xs text-muted-foreground">
                  {example.sourcePath}
                </div>

                <Button asChild size="sm">
                  <Link to={example.to}>Open example</Link>
                </Button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border bg-background/95 p-8 text-center shadow-sm">
          <div className="text-lg font-semibold">No matching examples</div>
          <p className="mt-2 text-sm text-muted-foreground">
            Try a different keyword or clear the search to see the full catalog.
          </p>
        </div>
      )}
    </section>
  );
}
