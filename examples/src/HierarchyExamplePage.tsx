// Hierarchy showcase and browser fixtures: owned by the hierarchy demo/test task.
import * as React from "react";
import { FolderTree, Layers, Search } from "lucide-react";

import ReactDataGrid from "../../src/ReactDataGrid";
import type {
  CellProps,
  TypeColumns,
  TypeComputedProps,
  TypeDataGridProps,
  TypeFilterValue,
} from "../../src/types";
import { Button } from "../../src/components/ui/button";

type Unit = {
  id: string;
  name: string;
  owner: string;
  status: string;
  members: number;
  nodes?: Unit[];
};

const units: Unit[] = [
  {
    id: "engineering",
    name: "Engineering",
    owner: "Alex Morgan",
    status: "Active",
    members: 24,
    nodes: [
      {
        id: "platform",
        name: "Platform",
        owner: "Sam Rivera",
        status: "Active",
        members: 12,
        nodes: [
          {
            id: "api",
            name: "API Gateway",
            owner: "Casey Lee",
            status: "Active",
            members: 7,
          },
          {
            id: "design",
            name: "Design System",
            owner: "Robin Park",
            status: "Review",
            members: 5,
          },
        ],
      },
      {
        id: "applications",
        name: "Applications",
        owner: "Jamie Chen",
        status: "Active",
        members: 12,
        nodes: [
          {
            id: "portal",
            name: "Customer Portal",
            owner: "Drew Taylor",
            status: "Active",
            members: 12,
          },
        ],
      },
    ],
  },
  {
    id: "operations",
    name: "Operations",
    owner: "Jordan Blake",
    status: "Active",
    members: 16,
    nodes: [
      {
        id: "delivery",
        name: "Delivery",
        owner: "Avery Quinn",
        status: "Active",
        members: 10,
        nodes: [
          {
            id: "release",
            name: "Release Automation",
            owner: "Riley Brooks",
            status: "Review",
            members: 10,
          },
        ],
      },
      {
        id: "security",
        name: "Security",
        owner: "Morgan Ellis",
        status: "Active",
        members: 6,
      },
    ],
  },
  {
    id: "research",
    name: "Research",
    owner: "Taylor Reed",
    status: "Planning",
    members: 8,
    nodes: [
      {
        id: "ai",
        name: "Applied AI",
        owner: "Emery Lane",
        status: "Planning",
        members: 8,
        nodes: [
          {
            id: "ranking",
            name: "Search Ranking",
            owner: "Finley Shaw",
            status: "Planning",
            members: 8,
          },
        ],
      },
    ],
  },
];

const statusColumn: TypeColumns[number] = {
  name: "status",
  header: "Status",
  defaultWidth: 130,
  filterable: false,
  render: ({ value }: CellProps) => (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-2 py-0.5 text-xs font-medium">
      <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
      {String(value)}
    </span>
  ),
};

const treeColumns: TypeColumns = [
  { name: "name", header: "Team / project", defaultFlex: 2, minWidth: 260 },
  {
    name: "owner",
    header: "Team lead",
    defaultFlex: 1,
    minWidth: 160,
    filterable: false,
  },
  statusColumn,
  {
    name: "members",
    header: "Members",
    type: "number",
    width: 180,
    textAlign: "end",
    filterable: false,
  },
];

type Project = {
  id: string;
  name: string;
  owner: string;
  status: string;
  milestone: string;
  description: string;
  tasks: { id: string; name: string; status: string }[];
};

const projects: Project[] = [
  {
    id: "atlas",
    name: "Atlas workspace",
    owner: "Platform",
    status: "Active",
    milestone: "September 18",
    description:
      "One workspace for teams, projects and shared delivery. The next release brings a unified navigation experience.",
    tasks: [
      { id: "atlas-1", name: "Navigation foundations", status: "Complete" },
      { id: "atlas-2", name: "Workspace permissions", status: "In progress" },
    ],
  },
  {
    id: "beacon",
    name: "Beacon observability",
    owner: "Operations",
    status: "Review",
    milestone: "September 25",
    description:
      "A shared view of service health, with clear ownership and actionable alerts for every team.",
    tasks: [
      { id: "beacon-1", name: "Service health dashboard", status: "Review" },
      { id: "beacon-2", name: "Alert ownership", status: "In progress" },
    ],
  },
  {
    id: "compass",
    name: "Compass discovery",
    owner: "Research",
    status: "Planning",
    milestone: "October 2",
    description:
      "Find the right project with relevance signals and team context.",
    tasks: [
      { id: "compass-1", name: "Relevance evaluation", status: "Planning" },
      { id: "compass-2", name: "Discovery prototype", status: "Planning" },
    ],
  },
  {
    id: "archive",
    name: "Archived initiative",
    owner: "Platform",
    status: "Archived",
    milestone: "Complete",
    description: "This record has no expandable details.",
    tasks: [],
  },
];

const projectColumns: TypeColumns = [
  { name: "name", header: "Project", defaultFlex: 2, minWidth: 220 },
  { name: "owner", header: "Team", defaultFlex: 1, minWidth: 130 },
  statusColumn,
  { name: "milestone", header: "Next milestone", width: 200 },
];
const taskColumns: TypeColumns = [
  { name: "name", header: "Work item", defaultFlex: 1, minWidth: 175 },
  { name: "status", header: "Progress", width: 140 },
];
const initialFilters: TypeFilterValue = [
  { name: "name", type: "string", operator: "contains", value: "" },
];

function ProjectDetails({ project }: { project: Project }) {
  return (
    <div
      data-testid={`project-details-${project.id}`}
      className="grid h-full min-h-0 gap-4 overflow-auto bg-muted/20 p-4 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]"
    >
      <div className="min-w-0 space-y-2">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Project brief
        </p>
        <h4 className="text-base font-semibold">{project.name}</h4>
        <p className="max-w-lg text-sm leading-relaxed text-muted-foreground">
          {project.description}
        </p>
        <p className="text-xs text-muted-foreground">
          Next milestone{" "}
          <span className="font-medium text-foreground">
            {project.milestone}
          </span>
        </p>
      </div>
      <div
        className="h-[154px] min-w-0 overflow-hidden rounded-lg border border-border bg-background"
        data-testid={`project-tasks-${project.id}`}
      >
        <ReactDataGrid
          theme="default-light"
          idProperty="id"
          columns={taskColumns}
          dataSource={project.tasks}
          virtualized={false}
          rowHeight={46}
          headerHeight={40}
          showColumnMenuTool={false}
          enableFiltering={false}
        />
      </div>
    </div>
  );
}

export default function HierarchyExamplePage() {
  const [virtualized, setVirtualized] = React.useState(true);
  const [controlled, setControlled] = React.useState(false);
  const [acceptChanges, setAcceptChanges] = React.useState(true);
  const [multiRowExpand, setMultiRowExpand] = React.useState(true);
  const [query, setQuery] = React.useState("");
  const [filteredCount, setFilteredCount] = React.useState(13);
  const [expandedNodes, setExpandedNodes] = React.useState<
    NonNullable<TypeDataGridProps["expandedNodes"]>
  >({});
  const [expandedRows, setExpandedRows] = React.useState<
    NonNullable<TypeDataGridProps["expandedRows"]>
  >({});
  const [collapsedRows, setCollapsedRows] = React.useState<
    NonNullable<TypeDataGridProps["collapsedRows"]>
  >({});
  const [nodeProposalCount, setNodeProposalCount] = React.useState(0);
  const [rowProposalCount, setRowProposalCount] = React.useState(0);
  const treeApi = React.useRef<TypeComputedProps | null>(null);

  const updateQuery = (value: string) => {
    setQuery(value);
    treeApi.current?.setFilterValue([
      { name: "name", type: "string", operator: "contains", value },
    ]);
  };

  return (
    <div
      data-testid="hierarchy-showcase"
      className="mx-auto w-full max-w-[1440px] space-y-6 [--tdg-color-background:var(--background)] [--tdg-color-foreground:var(--foreground)] [--tdg-color-card:var(--card)] [--tdg-color-muted:var(--muted)] [--tdg-color-muted-foreground:var(--muted-foreground)] [--tdg-color-primary:var(--primary)] [--tdg-color-primary-foreground:var(--primary-foreground)] [--tdg-color-accent:var(--accent)] [--tdg-color-accent-foreground:var(--accent-foreground)] [--tdg-color-border:var(--border)] [--tdg-color-input:var(--input)] [--tdg-color-ring:var(--ring)] [--tdg-radius-sm:calc(var(--radius)-4px)] [--tdg-radius-md:calc(var(--radius)-2px)] [--tdg-radius-lg:var(--radius)]"
    >
      <section className="space-y-5 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl space-y-2">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Hierarchy & context
            </p>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Tree rows. Rich details.
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Explore teams from the top down, find a project at any depth, and
              open the context behind a record.
            </p>
          </div>
          <span className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium">
            Compatibility preview
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-border pt-4 text-sm">
          <label className="inline-flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              className="size-4 accent-primary"
              checked={virtualized}
              onChange={(event) => setVirtualized(event.target.checked)}
            />
            Virtualized rows
          </label>
          <label className="inline-flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              className="size-4 accent-primary"
              checked={controlled}
              onChange={(event) => {
                setControlled(event.target.checked);
                setQuery("");
                setExpandedNodes({});
                setExpandedRows({});
                setCollapsedRows({});
              }}
            />
            Controlled expansion
          </label>
          {controlled ? (
            <label className="inline-flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={acceptChanges}
                onChange={(event) => setAcceptChanges(event.target.checked)}
              />
              Accept expansion changes
            </label>
          ) : null}
          <span className="text-xs text-muted-foreground">
            {virtualized ? "TanStack Virtual" : "Standard rows"} ·{" "}
            {controlled ? "Consumer owns expansion" : "Grid owns expansion"}
          </span>
        </div>
      </section>

      <section
        data-testid="tree-section"
        className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border p-5">
          <div className="flex items-center gap-3">
            <span className="rounded-lg border border-border bg-muted p-2.5">
              <FolderTree className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h3 className="font-semibold">Organization explorer</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                3 levels · collapsed by default
              </p>
            </div>
          </div>
          <output
            data-testid="tree-filtered-count"
            className="rounded-full bg-muted px-3 py-1 text-xs font-medium"
          >
            {filteredCount} nodes
          </output>
        </div>
        <div className="flex flex-wrap items-end gap-3 p-4 sm:px-5">
          <label className="min-w-0 flex-1 space-y-1.5 text-xs font-medium">
            <span>Find a team or project</span>
            <span className="flex h-10 items-center gap-2 rounded-md border border-input bg-background px-3 focus-within:ring-2 focus-within:ring-ring">
              <Search
                className="size-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                type="search"
                value={query}
                placeholder="Try API Gateway…"
                onChange={(event) => updateQuery(event.target.value)}
                className="min-w-0 flex-1 bg-transparent text-sm font-normal outline-none placeholder:text-muted-foreground"
              />
            </span>
          </label>
          <Button
            variant="outline"
            onClick={() => updateQuery("")}
            disabled={!query}
          >
            Clear search
          </Button>
        </div>
        <p className="px-5 pb-4 text-xs text-muted-foreground">
          A matching descendant reveals its parent path. Clearing search
          restores your open branches.
        </p>
        <div
          data-testid="hierarchy-tree-grid"
          className="h-[360px] min-w-0 border-t border-border"
        >
          <ReactDataGrid
            key={`tree-${controlled}`}
            theme="default-light"
            idProperty="id"
            columns={treeColumns}
            dataSource={units}
            treeEnabled
            nodesProperty="nodes"
            treeColumn="name"
            generateIdFromPath
            allowMobileTransform
            defaultExpandedNodes={{}}
            {...(controlled ? { expandedNodes } : {})}
            onExpandedNodesChange={({ expandedNodes: next }) => {
              setNodeProposalCount((count) => count + 1);
              if (acceptChanges) setExpandedNodes(next ?? {});
            }}
            enableFiltering
            defaultFilterValue={initialFilters}
            onFilterValueChange={(filters) =>
              setQuery(
                String(
                  filters?.find((filter) => filter.name === "name")?.value ?? ""
                )
              )
            }
            filteredRowsCount={setFilteredCount}
            onReady={(ref) => {
              treeApi.current = ref.current;
            }}
            virtualized={virtualized}
            rowHeight={52}
            headerHeight={44}
            filterRowHeight={44}
            showColumnMenuTool
          />
        </div>
      </section>

      <section
        data-testid="detail-section"
        className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border p-5">
          <div className="flex items-center gap-3">
            <span className="rounded-lg border border-border bg-muted p-2.5">
              <Layers className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h3 className="font-semibold">Project portfolio</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Open a record for its brief and work items
              </p>
            </div>
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 text-xs">
            <input
              type="checkbox"
              className="size-4 accent-primary"
              checked={multiRowExpand}
              onChange={(event) => setMultiRowExpand(event.target.checked)}
            />
            Allow multiple details
          </label>
        </div>
        <div
          data-testid="hierarchy-detail-grid"
          className="h-[630px] min-w-0 sm:h-[450px]"
        >
          <ReactDataGrid
            key={`details-${controlled}`}
            theme="default-light"
            idProperty="id"
            columns={projectColumns}
            dataSource={projects}
            renderRowDetails={({ data }) => (
              <ProjectDetails project={data as Project} />
            )}
            enableRowExpand
            allowMobileTransform
            defaultExpandedRows={{}}
            {...(controlled ? { expandedRows, collapsedRows } : {})}
            onExpandedRowsChange={({
              expandedRows: nextExpanded,
              collapsedRows: nextCollapsed,
            }) => {
              setRowProposalCount((count) => count + 1);
              if (acceptChanges) {
                setExpandedRows(nextExpanded ?? {});
                setCollapsedRows(
                  nextCollapsed === true ? {} : (nextCollapsed ?? {})
                );
              }
            }}
            isRowExpandable={({ data }) => data.id !== "archive"}
            multiRowExpand={multiRowExpand}
            rowExpandHeight={260}
            rowHeight={52}
            headerHeight={44}
            virtualized={virtualized}
            showColumnMenuTool
          />
        </div>
      </section>
      {controlled ? (
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
          <output data-testid="tree-expansion-proposals">
            {nodeProposalCount} node expansion proposals
          </output>
          <output data-testid="detail-expansion-proposals">
            {rowProposalCount} detail expansion proposals
          </output>
        </div>
      ) : null}
    </div>
  );
}
