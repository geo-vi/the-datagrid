import { Link } from "@tanstack/react-router";

import CopyableCodeBlock from "./CopyableCodeBlock";
import {
  DocsRouteLink,
  docsNavGroups,
  getDocsHomeCards,
  getDocsLinkTarget,
} from "./docsContent";

const installCommands = [
  { label: "npm", code: "npm install @geovi/the-datagrid" },
  { label: "yarn", code: "yarn add @geovi/the-datagrid" },
  { label: "pnpm", code: "pnpm add @geovi/the-datagrid" },
] as const;

export default function DocsHomePage() {
  const docsCards = getDocsHomeCards();

  return (
    <div className="flex flex-col gap-8">
      <section className="relative overflow-hidden rounded-[32px] border bg-background/95 p-6 shadow-sm md:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.12),transparent_35%),radial-gradient(circle_at_80%_20%,rgba(16,185,129,0.12),transparent_28%)]" />
        <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_320px]">
          <div className="space-y-5">
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-[0.28em] text-muted-foreground">
                the-datagrid
              </p>
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight md:text-5xl">
                Documentation and examples for the React data grid library.
              </h1>
              <p className="max-w-3xl text-base text-muted-foreground md:text-lg">
                A shadcn-aligned grid with Inovua-style naming, practical
                compatibility, and a smaller runtime surface. Use the docs for
                the API contract and the examples for live behavior.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                {...getDocsLinkTarget("getting-started", "installation")}
                className="inline-flex rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
              >
                Start with installation
              </Link>
              <Link
                to="/examples"
                className="inline-flex rounded-full border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted/50"
              >
                Browse examples
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border bg-card/80 p-5">
            <div className="text-sm font-semibold">Quick install</div>
            <div className="mt-3 space-y-3">
              {installCommands.map((command) => (
                <CopyableCodeBlock
                  key={command.label}
                  label={command.label}
                  language="bash"
                  code={command.code}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {docsCards.map((card) =>
          card.kind === "docs" ? (
            <DocsRouteLink
              key={`${card.group}/${card.slug}`}
              group={card.group}
              slug={card.slug}
              className="rounded-3xl border bg-background/95 p-5 shadow-sm transition-colors hover:bg-muted/30"
            >
              <div className="space-y-3">
                <h2 className="text-xl font-semibold tracking-tight">
                  {card.title}
                </h2>
                <p className="text-sm text-muted-foreground">{card.summary}</p>
              </div>
            </DocsRouteLink>
          ) : (
            <Link
              key={card.to}
              to={card.to}
              className="rounded-3xl border bg-background/95 p-5 shadow-sm transition-colors hover:bg-muted/30"
            >
              <div className="space-y-3">
                <h2 className="text-xl font-semibold tracking-tight">
                  {card.title}
                </h2>
                <p className="text-sm text-muted-foreground">{card.summary}</p>
              </div>
            </Link>
          )
        )}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-3xl border bg-background/95 p-6 shadow-sm">
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
              Explore the docs
            </p>
            <h2 className="text-2xl font-semibold tracking-tight">
              Everything is organized around real integration tasks.
            </h2>
            <p className="text-sm text-muted-foreground">
              Start with installation and quickstart, then move into guides for
              local or remote data. The reference section is structured for
              direct lookups while you build.
            </p>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {docsNavGroups.map((group) => (
              <div
                key={group.key}
                className="rounded-2xl border bg-card/70 p-4"
              >
                <div className="text-sm font-semibold">{group.label}</div>
                <div className="mt-3 space-y-2">
                  {group.pages.map((page) => (
                    <DocsRouteLink
                      key={page.slug}
                      group={page.group}
                      slug={page.slug}
                      className="block text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {page.title}
                    </DocsRouteLink>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border bg-background/95 p-6 shadow-sm">
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
              Live examples
            </p>
            <h2 className="text-2xl font-semibold tracking-tight">
              Validate the docs against running code.
            </h2>
            <p className="text-sm text-muted-foreground">
              The examples section uses the same app shell and keeps the source
              visible next to each running grid instance.
            </p>
          </div>

          <div className="mt-6 space-y-3">
            <Link
              to="/examples/basic"
              className="block rounded-2xl border bg-card/70 p-4 transition-colors hover:bg-muted/30"
            >
              <div className="text-sm font-semibold">Basic</div>
              <p className="mt-1 text-sm text-muted-foreground">
                Compact baseline grid for the core feature set.
              </p>
            </Link>
            <Link
              to="/examples/selection"
              className="block rounded-2xl border bg-card/70 p-4 transition-colors hover:bg-muted/30"
            >
              <div className="text-sm font-semibold">Selection</div>
              <p className="mt-1 text-sm text-muted-foreground">
                Controlled checkbox selection with external state and summaries.
              </p>
            </Link>
            <Link
              to="/examples/users"
              className="block rounded-2xl border bg-card/70 p-4 transition-colors hover:bg-muted/30"
            >
              <div className="text-sm font-semibold">Users</div>
              <p className="mt-1 text-sm text-muted-foreground">
                Fuller product-style screen with optional columns and row
                actions.
              </p>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
