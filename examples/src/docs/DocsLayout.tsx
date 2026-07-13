import * as React from "react";
import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  Blocks,
  BookOpenText,
  Bot,
  Braces,
  ChevronDown,
  ChevronRight,
  Database,
  GitCompareArrows,
  Palette,
  PanelLeft,
  Rocket,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";

import { Button } from "../../../src/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "../../../src/components/ui/dialog";
import { ScrollArea } from "../../../src/components/ui/scroll-area";
import { getDocsLinkTarget } from "./docsContent";
import {
  docsNavigationSections,
  getActiveDocsNavigationItem,
  type DocsNavigationSection,
} from "./docsNavigation";

const sectionIcons: Record<DocsNavigationSection["id"], LucideIcon> = {
  "getting-started": Rocket,
  "data-sources": Database,
  "core-features": SlidersHorizontal,
  "styling-localization": Palette,
  "api-reference": Braces,
  components: Blocks,
  compatibility: GitCompareArrows,
  "ai-tooling": Bot,
};

function DocsSidebarNavigation(props: {
  pathname: string;
  onNavigate?: () => void;
}) {
  const { onNavigate, pathname } = props;
  const instanceId = React.useId().replaceAll(":", "");
  const activeItem = getActiveDocsNavigationItem(pathname);
  const activeSection = docsNavigationSections.find((section) =>
    section.items.some((item) => item === activeItem)
  );
  const [expandedSections, setExpandedSections] = React.useState(
    () => new Set([activeSection?.id ?? "getting-started"])
  );

  const toggleSection = (sectionId: DocsNavigationSection["id"]) => {
    setExpandedSections((current) => {
      const next = new Set(current);

      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);

      return next;
    });
  };

  const overviewActive = pathname === "/docs" || pathname === "/docs/";

  return (
    <div className="flex h-full min-h-0 flex-col bg-card/95">
      <header className="shrink-0 border-b border-border/70 px-4 py-4">
        <Link
          to="/docs"
          activeOptions={{ exact: true }}
          onClick={onNavigate}
          className="group flex items-center gap-3 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm transition-transform group-hover:scale-[1.03]">
            <BookOpenText className="size-5" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Documentation
            </span>
            <span className="block truncate text-base font-semibold tracking-tight text-foreground">
              the-datagrid
            </span>
          </span>
        </Link>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          Learn the grid by task, then reach exact API and compatibility
          details.
        </p>
      </header>

      <ScrollArea
        data-testid="docs-sidebar-scroll"
        className="min-h-0 flex-1"
        viewportClassName="overscroll-contain [&>div]:!block"
      >
        <nav
          aria-label="Documentation navigation"
          className="space-y-1 px-3 py-2"
        >
          <Link
            to="/docs"
            activeOptions={{ exact: true }}
            aria-current={overviewActive ? "page" : undefined}
            onClick={onNavigate}
            className={
              overviewActive
                ? "flex min-h-9 items-center gap-2 rounded-lg bg-accent px-2.5 text-sm font-medium text-accent-foreground shadow-sm"
                : "flex min-h-9 items-center gap-2 rounded-lg px-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/70 hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            }
          >
            <BookOpenText className="size-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0 flex-1">Docs overview</span>
            {overviewActive ? (
              <ChevronRight className="size-3.5 shrink-0" aria-hidden="true" />
            ) : null}
          </Link>

          {docsNavigationSections.map((section) => {
            const Icon = sectionIcons[section.id];
            const sectionContainsActiveItem = section === activeSection;
            const expanded = expandedSections.has(section.id);
            const contentId = `${instanceId}-${section.id}`;

            return (
              <section key={section.id} className="pt-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-expanded={expanded}
                  aria-controls={contentId}
                  className={
                    sectionContainsActiveItem
                      ? "h-8 w-full justify-start gap-2 rounded-lg px-2.5 text-xs font-semibold text-foreground hover:bg-accent/70"
                      : "h-8 w-full justify-start gap-2 rounded-lg px-2.5 text-xs font-semibold text-muted-foreground hover:bg-accent/70 hover:text-foreground"
                  }
                  onClick={() => toggleSection(section.id)}
                >
                  <Icon className="size-4 shrink-0" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate text-left">
                    {section.label}
                  </span>
                  <ChevronDown
                    className={`size-3.5 shrink-0 transition-transform ${expanded ? "rotate-0" : "-rotate-90"}`}
                    aria-hidden="true"
                  />
                </Button>

                <div
                  id={contentId}
                  hidden={!expanded}
                  className="relative ml-4 mt-0.5 space-y-0.5 border-l border-border/70 pl-3"
                >
                  {section.items.map((item) => {
                    const href = `/docs/${item.page.group}/${item.page.slug}`;
                    const active = pathname === href;

                    return (
                      <Link
                        key={href}
                        {...getDocsLinkTarget(item.group, item.slug)}
                        aria-current={active ? "page" : undefined}
                        onClick={onNavigate}
                        className={
                          active
                            ? "relative flex min-h-8 items-center gap-2 rounded-lg bg-accent px-2.5 text-sm font-medium text-accent-foreground shadow-sm before:absolute before:-left-[0.82rem] before:h-5 before:w-0.5 before:rounded-full before:bg-primary"
                            : "flex min-h-8 items-center rounded-lg px-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent/70 hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                        }
                      >
                        <span className="min-w-0 flex-1 leading-snug">
                          {item.label}
                        </span>
                        {active ? (
                          <ChevronRight
                            className="size-3.5 shrink-0"
                            aria-hidden="true"
                          />
                        ) : null}
                      </Link>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </nav>
      </ScrollArea>

      <footer className="shrink-0 border-t border-border/70 px-4 py-3">
        <div className="flex items-center justify-between gap-3 text-[0.68rem] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            Public library docs
          </span>
          <span>Community 5.10.2 baseline</span>
        </div>
      </footer>
    </div>
  );
}

function MobileDocsNavigation(props: { pathname: string }) {
  const { pathname } = props;
  const [open, setOpen] = React.useState(false);
  const activeItem = getActiveDocsNavigationItem(pathname);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div className="z-40 mb-4 shrink-0 lg:hidden">
        <DialogTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="h-12 w-full justify-between rounded-xl border-border/80 bg-background/95 px-3.5 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/85"
            aria-label="Open documentation navigation"
          >
            <span className="flex min-w-0 items-center gap-3 text-left">
              <PanelLeft className="size-4 shrink-0" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Browse documentation
                </span>
                <span className="block truncate text-sm font-medium text-foreground">
                  {activeItem?.label ?? "Docs overview"}
                </span>
              </span>
            </span>
            <ChevronRight className="size-4 shrink-0" aria-hidden="true" />
          </Button>
        </DialogTrigger>
      </div>

      <DialogContent className="!left-0 !top-0 flex !h-dvh !max-h-none !w-[min(88vw,22rem)] !max-w-none !translate-x-0 !translate-y-0 !flex-col !gap-0 overflow-hidden !rounded-none border-y-0 border-l-0 !p-0 [&_.tdg-dialog-close]:!right-2 [&_.tdg-dialog-close]:!top-2 [&_.tdg-dialog-close]:!size-11 [&_.tdg-dialog-close]:!rounded-lg [&_.tdg-dialog-close]:!p-2.5 sm:!w-[22rem] sm:!rounded-none">
        <DialogTitle className="sr-only">Documentation navigation</DialogTitle>
        <DialogDescription className="sr-only">
          Browse guides, feature documentation, API reference, and compatibility
          notes.
        </DialogDescription>
        <DocsSidebarNavigation
          pathname={pathname}
          onNavigate={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

export default function DocsLayout() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
      <MobileDocsNavigation key={pathname} pathname={pathname} />

      <div className="grid min-h-0 min-w-0 flex-1 grid-rows-[minmax(0,1fr)] gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <aside
          data-testid="docs-sidebar"
          className="hidden h-full min-h-0 min-w-0 lg:block"
        >
          <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-border/80 bg-card/95 shadow-sm">
            <DocsSidebarNavigation key={pathname} pathname={pathname} />
          </div>
        </aside>

        <main
          key={pathname}
          data-testid="docs-content"
          className="h-full min-h-0 min-w-0 overflow-y-auto overscroll-contain [scrollbar-gutter:stable]"
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
