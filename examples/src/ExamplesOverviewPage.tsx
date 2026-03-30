import { Link } from "@tanstack/react-router";

import { Button } from "../../src/components/ui/button";
import { examplePages } from "./exampleMeta";

export default function ExamplesOverviewPage() {
  return (
    <section className="flex flex-col gap-6">
      <div className="max-w-3xl space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">
          Example catalog
        </h2>
        <p className="text-sm text-muted-foreground">
          Each example has its own route. Open one to see the running preview
          beside the source code used to build it.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {examplePages.map((example) => (
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
    </section>
  );
}
