import { DocsRouteLink, docsNavGroups } from "./docsContent";

export default function DocsIndexPage() {
  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-3xl border bg-background/95 p-6 shadow-sm">
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
            Docs index
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Browse the documentation by topic.
          </h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            The docs are grouped into getting started pages, practical guides,
            reference pages, and migration notes.
          </p>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {docsNavGroups.map((group) => (
          <section
            key={group.key}
            className="rounded-3xl border bg-background/95 p-5 shadow-sm"
          >
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                {group.label}
              </p>
              <div className="space-y-3">
                {group.pages.map((page) => (
                  <DocsRouteLink
                    key={page.slug}
                    group={page.group}
                    slug={page.slug}
                    className="block rounded-2xl border bg-card/70 px-4 py-3 transition-colors hover:bg-muted/30"
                  >
                    <div className="text-sm font-semibold">{page.title}</div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {page.summary}
                    </p>
                  </DocsRouteLink>
                ))}
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
