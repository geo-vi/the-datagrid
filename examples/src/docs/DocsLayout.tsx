import { Outlet, useRouterState } from "@tanstack/react-router";

import { DocsRouteLink, docsNavGroups, getDocsPageHref } from "./docsContent";

export default function DocsLayout() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  return (
    <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="min-w-0">
        <div className="sticky top-4 space-y-4 rounded-3xl border bg-background/95 p-4 shadow-sm">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
              Documentation
            </p>
            <h2 className="text-lg font-semibold tracking-tight">
              Library reference
            </h2>
            <p className="text-sm text-muted-foreground">
              Guides, API reference, and migration notes for the published
              library surface.
            </p>
          </div>

          <nav className="space-y-4">
            {docsNavGroups.map((group) => (
              <section key={group.key} className="space-y-2">
                <h3 className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
                  {group.label}
                </h3>
                <div className="space-y-1">
                  {group.pages.map((page) => {
                    const href = getDocsPageHref(page);
                    const isActive = pathname === href;

                    return (
                      <DocsRouteLink
                        key={href}
                        group={page.group}
                        slug={page.slug}
                        className={
                          isActive
                            ? "block rounded-2xl border bg-muted/70 px-3 py-2 text-sm font-medium text-foreground"
                            : "block rounded-2xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
                        }
                      >
                        {page.title}
                      </DocsRouteLink>
                    );
                  })}
                </div>
              </section>
            ))}
          </nav>
        </div>
      </aside>

      <div className="min-w-0">
        <Outlet />
      </div>
    </div>
  );
}
