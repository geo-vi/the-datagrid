import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { Button } from "../../src/components/ui/button";
import { ScrollArea } from "../../src/components/ui/scroll-area";

type ExampleDetailPageProps = {
  title: string;
  summary: string;
  details: string;
  sourcePath: string;
  sourceCode: string;
  tags: string[];
  children: ReactNode;
};

export default function ExampleDetailPage(props: ExampleDetailPageProps) {
  const { children, details, sourceCode, sourcePath, summary, tags, title } =
    props;

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-3xl border bg-background/95 p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                Example detail
              </p>
              <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
            </div>

            <div className="max-w-3xl space-y-2 text-sm text-muted-foreground">
              <p>{summary}</p>
              <p>{details}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border bg-muted/40 px-2.5 py-1 text-xs font-medium text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <Button asChild variant="outline" size="sm" className="shrink-0">
            <Link to="/">Back to overview</Link>
          </Button>
        </div>
      </section>

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
        <section
          data-testid="example-preview-panel"
          className="flex min-w-0 flex-col gap-3"
        >
          <div className="space-y-1">
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Live preview
            </h3>
            <p className="text-sm text-muted-foreground">
              Interact with the running example while keeping the source visible
              alongside it.
            </p>
          </div>

          {children}
        </section>

        <section
          data-testid="example-source-panel"
          className="flex min-h-[720px] min-w-0 flex-col overflow-hidden rounded-3xl border bg-card/80 shadow-sm"
        >
          <div className="border-b bg-muted/30 px-4 py-3">
            <div className="text-sm font-semibold">Source code</div>
            <div className="font-mono text-xs text-muted-foreground">
              {sourcePath}
            </div>
          </div>

          <ScrollArea className="flex-1" viewportClassName="min-h-[720px]">
            <pre className="min-w-full px-4 py-4 text-xs leading-6 text-foreground">
              <code>{sourceCode}</code>
            </pre>
          </ScrollArea>
        </section>
      </div>
    </div>
  );
}
