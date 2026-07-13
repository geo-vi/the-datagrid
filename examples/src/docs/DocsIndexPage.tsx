import { DocsRouteLink } from "./docsContent";
import { docsNavigationSections } from "./docsNavigation";

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
            Start with a task, explore the feature area, then use the API and
            compatibility references when you need exact behavior.
          </p>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {docsNavigationSections.map((section) => (
          <section
            key={section.id}
            className="rounded-3xl border bg-background/95 p-5 shadow-sm"
          >
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                {section.label}
              </p>
              <div className="space-y-3">
                {section.items.map((item) => (
                  <DocsRouteLink
                    key={`${item.group}/${item.slug}`}
                    group={item.group}
                    slug={item.slug}
                    className="block rounded-2xl border bg-card/70 px-4 py-3 transition-colors hover:bg-muted/30"
                  >
                    <div className="text-sm font-semibold">{item.label}</div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {item.page.summary}
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
