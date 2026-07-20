import * as React from "react";

import ReactDataGrid, {
  plugins,
  type TypeColumns,
  type TypeComputedProps,
  type TypeDataGridProps,
  type TypeFilterValue,
  type TypeSortInfo,
} from "../../src/main";
import packageManifest from "../../package.json";

type AuditedIssue =
  | "33"
  | "34"
  | "35"
  | "36"
  | "37"
  | "38"
  | "39"
  | "40"
  | "41"
  | "42"
  | "43"
  | "44"
  | "45";

type CompatibilityGridProps = TypeDataGridProps & Record<string, unknown>;

const CompatibilityGrid =
  ReactDataGrid as React.ComponentType<CompatibilityGridProps>;

const auditedIssues = new Set<AuditedIssue>([
  "33",
  "34",
  "35",
  "36",
  "37",
  "38",
  "39",
  "40",
  "41",
  "42",
  "43",
  "44",
  "45",
]);

const baseRows = [
  { id: "row-1", name: "Ada Lovelace", city: "London" },
  { id: "row-2", name: "Grace Hopper", city: "New York" },
  { id: "row-3", name: "Katherine Johnson", city: "White Sulphur Springs" },
];

const baseColumns: TypeColumns = [
  { name: "id", header: "ID", width: 110 },
  { name: "name", header: "Name", width: 220 },
  { name: "city", header: "City", width: 220 },
];

function readIssue(): AuditedIssue {
  if (typeof window === "undefined") return "33";

  const issue = new URLSearchParams(window.location.search).get("issue");
  return auditedIssues.has(issue as AuditedIssue)
    ? (issue as AuditedIssue)
    : "33";
}

function GridFrame(props: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`h-[280px] w-[620px] max-w-full min-w-0 overflow-hidden rounded-xl border bg-background ${props.className ?? ""}`}
      data-testid="issue-grid-frame"
    >
      {props.children}
    </div>
  );
}

function Issue33ControlledSort() {
  const rows = React.useMemo(
    () => [
      { id: "sort-z", name: "Zed" },
      { id: "sort-a", name: "Ada" },
    ],
    []
  );
  const columns = React.useMemo<TypeColumns>(
    () => [
      { name: "id", header: "ID", width: 120 },
      { name: "name", header: "Name", width: 220 },
    ],
    []
  );
  const controlledSort = React.useMemo<TypeSortInfo>(
    () => ({ name: "name", dir: 1 }),
    []
  );
  const [events, setEvents] = React.useState<TypeSortInfo[]>([]);

  return (
    <>
      <output data-testid="issue-33-sort-events">
        {JSON.stringify(events)}
      </output>
      <GridFrame>
        <CompatibilityGrid
          idProperty="id"
          columns={columns}
          dataSource={rows}
          columnOrder={["id", "name"]}
          virtualized={false}
          enableFiltering={false}
          sortInfo={controlledSort}
          onSortInfoChange={(next) =>
            setEvents((current) => [...current, next])
          }
        />
      </GridFrame>
    </>
  );
}

function Issue34FilterAlias() {
  const rows = React.useMemo(
    () => [
      { id: "filter-a", profile: { name: "Ada Lovelace" } },
      { id: "filter-g", profile: { name: "Grace Hopper" } },
    ],
    []
  );
  const columns = React.useMemo<TypeColumns>(
    () => [
      { name: "id", header: "ID", width: 120 },
      {
        name: "displayName",
        header: "Display name",
        width: 260,
        filterable: true,
        filterName: "profileName",
        getFilterValue: (value: unknown) => {
          const candidate = value as {
            profile?: { name?: string };
            data?: { profile?: { name?: string } };
          };
          return candidate.profile?.name ?? candidate.data?.profile?.name;
        },
        render: ({ data }: { data: (typeof rows)[number] }) =>
          data.profile.name,
      },
    ],
    []
  );
  const initialFilter = React.useMemo<TypeFilterValue>(
    () => [
      {
        name: "profileName",
        type: "string",
        operator: "contains",
        value: "Ada",
      },
    ],
    []
  );

  return (
    <GridFrame>
      <CompatibilityGrid
        idProperty="id"
        columns={columns}
        dataSource={rows}
        columnOrder={["id", "displayName"]}
        virtualized={false}
        enableFiltering
        defaultFilterValue={initialFilter}
        i18n={{ noRecords: "No matching alias rows" }}
      />
    </GridFrame>
  );
}

function Issue35DefaultVisibility() {
  const columns = React.useMemo<TypeColumns>(
    () => [
      baseColumns[0]!,
      baseColumns[1]!,
      {
        name: "secret",
        header: "Secret",
        width: 180,
        defaultVisible: false,
      },
    ],
    []
  );
  const rows = React.useMemo(
    () => baseRows.map((row) => ({ ...row, secret: `secret-${row.id}` })),
    []
  );

  return (
    <GridFrame>
      <CompatibilityGrid
        idProperty="id"
        columns={columns}
        dataSource={rows}
        columnOrder={["id", "name", "secret"]}
        virtualized={false}
        enableFiltering={false}
      />
    </GridFrame>
  );
}

function Issue36ColumnGroups() {
  const columns = React.useMemo<TypeColumns>(
    () => [
      { ...baseColumns[0]!, group: "identity" },
      { ...baseColumns[1]!, group: "identity" },
      { ...baseColumns[2]!, group: "location" },
    ],
    []
  );

  return (
    <GridFrame>
      <CompatibilityGrid
        idProperty="id"
        columns={columns}
        dataSource={baseRows}
        columnOrder={["id", "name", "city"]}
        virtualized={false}
        enableFiltering={false}
        groups={[
          { name: "identity", header: "Identity" },
          { name: "location", header: "Location" },
        ]}
      />
    </GridFrame>
  );
}

function Issue37RowContextMenu() {
  return (
    <GridFrame>
      <CompatibilityGrid
        idProperty="id"
        columns={baseColumns}
        dataSource={baseRows}
        columnOrder={["id", "name", "city"]}
        virtualized={false}
        enableFiltering={false}
        renderRowContextMenu={() => (
          <div
            role="menu"
            aria-label="Issue 37 row actions"
            data-testid="issue-37-row-menu"
          >
            <button type="button" role="menuitem">
              Inspect row
            </button>
          </div>
        )}
      />
    </GridFrame>
  );
}

function Issue38ActiveRowNavigation() {
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);

  return (
    <>
      <output data-testid="issue-38-active-index">
        {activeIndex == null ? "none" : activeIndex}
      </output>
      <GridFrame>
        <CompatibilityGrid
          idProperty="id"
          columns={baseColumns}
          dataSource={baseRows}
          columnOrder={["id", "name", "city"]}
          virtualized={false}
          enableFiltering={false}
          enableSelection
          enableKeyboardNavigation
          defaultActiveIndex={0}
          onActiveIndexChange={(next: unknown) => {
            if (typeof next === "number") {
              setActiveIndex(next);
              return;
            }

            const candidate = next as {
              activeIndex?: number;
              index?: number;
            } | null;
            setActiveIndex(candidate?.activeIndex ?? candidate?.index ?? null);
          }}
        />
      </GridFrame>
    </>
  );
}

function Issue39CellSelection() {
  const [activeCell, setActiveCell] = React.useState<unknown>(null);
  const [cellSelection, setCellSelection] = React.useState<
    Record<string, boolean>
  >({});

  return (
    <>
      <output data-testid="issue-39-active-cell">
        {activeCell == null ? "none" : JSON.stringify(activeCell)}
      </output>
      <output data-testid="issue-39-cell-selection">
        {JSON.stringify(cellSelection)}
      </output>
      <GridFrame>
        <CompatibilityGrid
          idProperty="id"
          columns={baseColumns}
          dataSource={baseRows}
          columnOrder={["id", "name", "city"]}
          virtualized={false}
          enableFiltering={false}
          cellSelection={cellSelection}
          defaultActiveCell={[0, 0]}
          onActiveCellChange={(next: unknown) => setActiveCell(next)}
          onCellSelectionChange={(next: unknown) =>
            setCellSelection(next as Record<string, boolean>)
          }
        />
      </GridFrame>
    </>
  );
}

function Issue40CellDomProps() {
  return (
    <GridFrame>
      <CompatibilityGrid
        idProperty="id"
        columns={baseColumns}
        dataSource={baseRows}
        columnOrder={["id", "name", "city"]}
        virtualized={false}
        enableFiltering={false}
        cellDOMProps={(cell: unknown) => {
          const candidate = cell as {
            data?: { id?: string };
            name?: string;
            rowIndex?: number;
            columnIndex?: number;
          };
          return {
            "data-issue-40-cell": JSON.stringify([
              candidate.data?.id ?? null,
              candidate.name ?? null,
              candidate.rowIndex ?? null,
              candidate.columnIndex ?? null,
            ]),
          };
        }}
      />
    </GridFrame>
  );
}

function Issue41EditStartValue() {
  const columns = React.useMemo<TypeColumns>(
    () => [
      baseColumns[0]!,
      {
        ...baseColumns[1]!,
        editable: true,
        getEditStartValue: async () => "seeded-by-getEditStartValue",
      },
    ],
    []
  );

  return (
    <GridFrame>
      <CompatibilityGrid
        idProperty="id"
        columns={columns}
        dataSource={baseRows}
        columnOrder={["id", "name"]}
        virtualized={false}
        enableFiltering={false}
        editable
      />
    </GridFrame>
  );
}

function Issue42PerRowHeights() {
  const apiRef = React.useRef<TypeComputedProps | null>(null);
  const [ready, setReady] = React.useState(false);
  const [rowHeights, setRowHeights] = React.useState<Record<string, number>>({
    "row-2": 88,
  });
  const [heightEvents, setHeightEvents] = React.useState<unknown[]>([]);

  return (
    <>
      <button
        type="button"
        data-testid="issue-42-set-row-height"
        disabled={!ready}
        onClick={() => {
          const api = apiRef.current as
            | (TypeComputedProps & {
                setRowHeightById?: (
                  rowHeight: number | null,
                  id: string | number
                ) => void;
              })
            | null;
          api?.setRowHeightById?.(96, "row-3");
        }}
      >
        Set row 3 height
      </button>
      <output data-testid="issue-42-height-events">
        {JSON.stringify(heightEvents)}
      </output>
      <GridFrame>
        <CompatibilityGrid
          idProperty="id"
          columns={baseColumns}
          dataSource={baseRows}
          columnOrder={["id", "name", "city"]}
          virtualized={false}
          enableFiltering={false}
          rowHeight={40}
          rowHeights={rowHeights}
          onRowHeightsChange={(next: unknown) => {
            setHeightEvents((current) => [...current, next]);
            setRowHeights(next as Record<string, number>);
          }}
          onReady={(ref) => {
            apiRef.current = ref.current;
            setReady(Boolean(ref.current));
          }}
        />
      </GridFrame>
    </>
  );
}

function Issue43InitialScroll() {
  const columns = React.useMemo<TypeColumns>(
    () =>
      Array.from({ length: 6 }, (_, index) => ({
        name: `column-${index}`,
        header: `Column ${index}`,
        width: 180,
      })),
    []
  );
  const rows = React.useMemo(
    () =>
      Array.from({ length: 40 }, (_, rowIndex) =>
        Object.fromEntries([
          ["id", `scroll-row-${rowIndex}`],
          ...columns.map((column, columnIndex) => [
            String(column.name),
            `row-${rowIndex}-column-${columnIndex}`,
          ]),
        ])
      ),
    [columns]
  );

  return (
    <GridFrame className="h-[260px] w-[460px]">
      <CompatibilityGrid
        idProperty="id"
        columns={columns}
        dataSource={rows}
        columnOrder={columns.map((column) => String(column.name))}
        virtualized={false}
        enableFiltering={false}
        initialScrollTop={120}
        initialScrollLeft={90}
      />
    </GridFrame>
  );
}

type PackageExportValue =
  | string
  | {
      browser?: string;
      import?: string;
      default?: string;
    };

type PackageProbeResult = Record<string, string>;

type PackageArtifactLoader = () => Promise<unknown>;

const packageModuleLoaders = import.meta.glob("../../dist/**/*.js") as Record<
  string,
  PackageArtifactLoader
>;
const packageStylesheetLoaders = import.meta.glob("../../dist/**/*.css", {
  query: "?raw",
  import: "default",
}) as Record<string, PackageArtifactLoader>;

function resolveBrowserExportTarget(value: PackageExportValue | undefined) {
  if (typeof value === "string") return value;
  return value?.browser ?? value?.import ?? value?.default;
}

function toPackageArtifactKey(target: string) {
  return target.startsWith("./") ? `../../${target.slice(2)}` : target;
}

function Issue44PackageBrowserConsumer() {
  const [results, setResults] = React.useState<PackageProbeResult | null>(null);

  React.useEffect(() => {
    let active = true;

    void (async () => {
      const next: PackageProbeResult = {};
      const manifest = packageManifest as {
        exports?: Record<string, PackageExportValue>;
      };
      try {
        const moduleEntries = [
          ".",
          "./BoolEditor",
          "./DateEditor",
          "./NumericEditor",
          "./StringFilter",
          "./BoolFilter",
        ];
        const stylesheetEntries = [
          "./index.css",
          "./base.css",
          "./style/theme/default-light/index.css",
          "./style/theme/default-dark/index.css",
        ];

        for (const entry of moduleEntries) {
          const target = resolveBrowserExportTarget(manifest.exports?.[entry]);
          if (!target) {
            next[entry] = "missing-export";
            continue;
          }

          try {
            const loader = packageModuleLoaders[toPackageArtifactKey(target)];
            const imported = loader ? await loader() : null;
            next[entry] =
              imported && Object.keys(imported).length > 0
                ? "loaded"
                : loader
                  ? "empty-module"
                  : "missing-artifact";
          } catch (error) {
            next[entry] =
              `load-error:${error instanceof Error ? error.name : "unknown"}`;
          }
        }

        for (const entry of stylesheetEntries) {
          const target = resolveBrowserExportTarget(manifest.exports?.[entry]);
          if (!target) {
            next[entry] = "missing-export";
            continue;
          }

          try {
            const loader =
              packageStylesheetLoaders[toPackageArtifactKey(target)];
            const css = loader ? await loader() : null;
            next[entry] =
              typeof css === "string" && css.trim()
                ? "loaded"
                : loader
                  ? "empty-stylesheet"
                  : "missing-artifact";
          } catch (error) {
            next[entry] =
              `load-error:${error instanceof Error ? error.name : "unknown"}`;
          }
        }
      } catch (error) {
        next.manifest = `load-error:${error instanceof Error ? error.name : "unknown"}`;
      }

      if (active) setResults(next);
    })();

    return () => {
      active = false;
    };
  }, []);

  return (
    <output data-testid="issue-44-package-results">
      {results == null ? "pending" : JSON.stringify(results)}
    </output>
  );
}

function Issue45UnknownComputedMethod() {
  const apiRef = React.useRef<TypeComputedProps | null>(null);
  const [ready, setReady] = React.useState(false);
  const [result, setResult] = React.useState("not-run");

  return (
    <>
      <output data-testid="issue-45-public-plugins">
        {JSON.stringify(
          plugins.map((plugin) =>
            typeof plugin === "object" &&
            plugin != null &&
            "name" in plugin &&
            typeof plugin.name === "string"
              ? plugin.name
              : null
          )
        )}
      </output>
      <button
        type="button"
        data-testid="issue-45-call-unknown"
        disabled={!ready}
        onClick={() => {
          const unknownMethod = (
            apiRef.current as TypeComputedProps & {
              getDefinitelyMissingCommunityContract?: () => unknown;
            }
          )?.getDefinitelyMissingCommunityContract;

          if (typeof unknownMethod !== "function") {
            setResult(`${typeof unknownMethod}:not-callable`);
            return;
          }

          try {
            unknownMethod();
            setResult(`${typeof unknownMethod}:succeeded`);
          } catch {
            setResult(`${typeof unknownMethod}:threw`);
          }
        }}
      >
        Call unknown computed method
      </button>
      <output data-testid="issue-45-unknown-result">{result}</output>
      <GridFrame>
        <CompatibilityGrid
          idProperty="id"
          columns={baseColumns}
          dataSource={baseRows}
          columnOrder={["id", "name", "city"]}
          virtualized={false}
          enableFiltering={false}
          onReady={(ref) => {
            apiRef.current = ref.current;
            setReady(Boolean(ref.current));
          }}
        />
      </GridFrame>
    </>
  );
}

function IssueScenario(props: { issue: AuditedIssue }) {
  switch (props.issue) {
    case "33":
      return <Issue33ControlledSort />;
    case "34":
      return <Issue34FilterAlias />;
    case "35":
      return <Issue35DefaultVisibility />;
    case "36":
      return <Issue36ColumnGroups />;
    case "37":
      return <Issue37RowContextMenu />;
    case "38":
      return <Issue38ActiveRowNavigation />;
    case "39":
      return <Issue39CellSelection />;
    case "40":
      return <Issue40CellDomProps />;
    case "41":
      return <Issue41EditStartValue />;
    case "42":
      return <Issue42PerRowHeights />;
    case "43":
      return <Issue43InitialScroll />;
    case "44":
      return <Issue44PackageBrowserConsumer />;
    case "45":
      return <Issue45UnknownComputedMethod />;
    default:
      return null;
  }
}

export default function GitHubIssues33To48CompatPage() {
  const issue = readIssue();

  return (
    <main
      className="flex min-w-0 flex-col gap-4 rounded-2xl border bg-background p-5"
      data-testid="github-issues-33-48-scenario"
      data-issue={issue}
    >
      <h1 className="text-xl font-semibold">
        GitHub issue #{issue} compatibility
      </h1>
      <IssueScenario issue={issue} />
    </main>
  );
}
