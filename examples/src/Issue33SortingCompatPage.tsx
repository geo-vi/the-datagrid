import * as React from "react";

import ReactDataGrid, {
  type TypeColumns,
  type TypeComputedProps,
  type TypeDataSource,
  type TypeDataSourceArgs,
  type TypeSortFunctions,
  type TypeSortInfo,
} from "../../src/main";
import { Button } from "../../src/components/ui/button";

type SortRow = {
  id: string;
  group: string;
  score: number;
  code: string;
  priority: string;
};

const ownershipRows: SortRow[] = [
  { id: "row-a2", group: "A", score: 2, code: "10", priority: "low" },
  { id: "row-b1", group: "B", score: 1, code: "2", priority: "high" },
  { id: "row-a1", group: "A", score: 1, code: "1", priority: "medium" },
];

function GridShell(props: {
  testId: string;
  children: React.ReactNode;
  height?: number;
}): React.ReactElement {
  return (
    <section className="space-y-2" data-testid={props.testId}>
      <h2 className="text-sm font-semibold">{props.testId}</h2>
      <div
        className="min-h-0 w-[720px] max-w-full overflow-hidden rounded-lg border"
        style={{ height: props.height ?? 210 }}
      >
        {props.children}
      </div>
    </section>
  );
}

function OwnershipScenario(): React.ReactElement {
  const columns = React.useMemo<TypeColumns>(
    () => [
      { name: "id", header: "ID", width: 130 },
      { name: "group", header: "Group", width: 130, type: "string" },
      { name: "score", header: "Score", width: 130, type: "number" },
      { name: "code", header: "Code", width: 130, type: "string" },
    ],
    []
  );
  const [multiEvents, setMultiEvents] = React.useState<TypeSortInfo[]>([]);
  const [controlledEvents, setControlledEvents] = React.useState<
    TypeSortInfo[]
  >([]);
  const controlledSort = React.useMemo<TypeSortInfo>(
    () => ({ name: "score", dir: 1 }),
    []
  );

  return (
    <main
      className="space-y-6 p-6"
      data-testid="issue-33-ownership"
      aria-label="Issue 33 sorting ownership"
    >
      <output data-testid="issue-33-multi-events">
        {JSON.stringify(multiEvents)}
      </output>
      <GridShell testId="issue-33-persistent-multi">
        <ReactDataGrid
          idProperty="id"
          columns={columns}
          dataSource={ownershipRows}
          defaultSortInfo={[
            { name: "group", dir: 1 },
            { name: "score", dir: 1 },
          ]}
          allowUnsort={false}
          allowMobileTransform
          virtualized={false}
          enableFiltering={false}
          showColumnMenuTool={false}
          onSortInfoChange={(next) =>
            setMultiEvents((current) => [...current, next])
          }
        />
      </GridShell>

      <output data-testid="issue-33-controlled-events">
        {JSON.stringify(controlledEvents)}
      </output>
      <GridShell testId="issue-33-controlled-local">
        <ReactDataGrid
          idProperty="id"
          columns={columns}
          dataSource={ownershipRows}
          sortInfo={controlledSort}
          virtualized={false}
          enableFiltering={false}
          showColumnMenuTool={false}
          onSortInfoChange={(next) =>
            setControlledEvents((current) => [...current, next])
          }
        />
      </GridShell>
    </main>
  );
}

function ComparatorsScenario(): React.ReactElement {
  const numericColumns = React.useMemo<TypeColumns>(
    () => [
      { name: "id", header: "ID", width: 130 },
      { name: "code", header: "Numeric code", width: 180, type: "number" },
    ],
    []
  );
  const stringColumns = React.useMemo<TypeColumns>(
    () => [
      { name: "id", header: "ID", width: 130 },
      { name: "code", header: "String code", width: 180, type: "string" },
    ],
    []
  );
  const priorityColumns = React.useMemo<TypeColumns>(
    () => [
      { name: "id", header: "ID", width: 130 },
      {
        name: "priority",
        header: "Priority",
        width: 180,
        type: "priority",
      },
    ],
    []
  );
  const sortFunctions = React.useMemo<TypeSortFunctions>(
    () => ({
      priority: (value1, value2, column) => {
        const rank: Record<string, number> = { high: 0, medium: 1, low: 2 };
        if (column.name !== "priority") return 0;
        return rank[String(value1)]! - rank[String(value2)]!;
      },
    }),
    []
  );
  const [namedCall, setNamedCall] = React.useState<Record<
    string,
    unknown
  > | null>(null);
  const namedColumns = React.useMemo<TypeColumns>(
    () => [
      { name: "id", header: "ID", width: 130 },
      {
        id: "score-column",
        name: "score",
        sortName: "score",
        header: "Named comparator",
        width: 190,
        sort: (value1, value2, column, data1, data2, sortInfo) => {
          setNamedCall(
            (current) =>
              current ?? {
                value1,
                value2,
                columnId: column.id,
                data1: (data1 as SortRow).id,
                data2: (data2 as SortRow).id,
                sortName: sortInfo.name,
                sortId: sortInfo.id,
              }
          );
          return Number(value1) - Number(value2);
        },
      },
    ],
    []
  );
  const [idOnlyCall, setIdOnlyCall] = React.useState<Record<
    string,
    unknown
  > | null>(null);
  const idOnlyColumns = React.useMemo<TypeColumns>(
    () => [
      { name: "id", header: "ID", width: 130, sortable: false },
      {
        id: "whole-row",
        header: "Whole-row comparator",
        width: 220,
        render: ({ data }) => (data as SortRow).score,
        sort: (value1, value2, column, data1, data2, sortInfo) => {
          setIdOnlyCall(
            (current) =>
              current ?? {
                value1: (value1 as SortRow).id,
                value2: (value2 as SortRow).id,
                sameFirstRow: value1 === data1,
                sameSecondRow: value2 === data2,
                columnId: column.id,
                sortName: sortInfo.name,
                sortId: sortInfo.id,
              }
          );
          return (value1 as SortRow).score - (value2 as SortRow).score;
        },
      },
    ],
    []
  );
  const [descriptorCall, setDescriptorCall] = React.useState<Record<
    string,
    unknown
  > | null>(null);
  const descriptorSort = React.useMemo<TypeSortInfo>(
    () => ({
      name: "score",
      dir: -1,
      fn: (value1, value2, data1, data2, sortInfo) => {
        setDescriptorCall(
          (current) =>
            current ?? {
              value1,
              value2,
              data1: (data1 as SortRow).id,
              data2: (data2 as SortRow).id,
              sortName: sortInfo.name,
            }
        );
        return Number(value1) - Number(value2);
      },
    }),
    []
  );

  const common = {
    idProperty: "id",
    dataSource: ownershipRows,
    virtualized: false,
    enableFiltering: false,
    showColumnMenuTool: false,
  };

  return (
    <main
      className="grid gap-6 p-6 lg:grid-cols-2"
      data-testid="issue-33-comparators"
      aria-label="Issue 33 comparator contracts"
    >
      <GridShell testId="issue-33-number-type">
        <ReactDataGrid
          {...common}
          columns={numericColumns}
          defaultSortInfo={{ name: "code", dir: 1 }}
        />
      </GridShell>
      <GridShell testId="issue-33-string-type">
        <ReactDataGrid
          {...common}
          columns={stringColumns}
          defaultSortInfo={{ name: "code", dir: 1 }}
        />
      </GridShell>
      <GridShell testId="issue-33-sort-functions">
        <ReactDataGrid
          {...common}
          columns={priorityColumns}
          sortFunctions={sortFunctions}
          defaultSortInfo={{ name: "priority", dir: 1 }}
        />
      </GridShell>
      <GridShell testId="issue-33-column-sort">
        <output data-testid="issue-33-named-call">
          {JSON.stringify(namedCall)}
        </output>
        <ReactDataGrid
          {...common}
          columns={namedColumns}
          defaultSortInfo={{ name: "score", dir: 1 }}
        />
      </GridShell>
      <GridShell testId="issue-33-id-only-sort">
        <output data-testid="issue-33-id-only-call">
          {JSON.stringify(idOnlyCall)}
        </output>
        <ReactDataGrid
          {...common}
          columns={idOnlyColumns}
          defaultSortInfo={{ id: "whole-row", name: "", dir: 1 }}
        />
      </GridShell>
      <GridShell testId="issue-33-descriptor-sort">
        <output data-testid="issue-33-descriptor-call">
          {JSON.stringify(descriptorCall)}
        </output>
        <ReactDataGrid
          {...common}
          columns={namedColumns.map((column) =>
            column.name === "score" ? { ...column, sort: undefined } : column
          )}
          defaultSortInfo={descriptorSort}
        />
      </GridShell>
    </main>
  );
}

function ScrollGrid(props: {
  testId: string;
  mode: boolean | "always";
}): React.ReactElement {
  const [rows, setRows] = React.useState(() =>
    Array.from({ length: 80 }, (_, index) => ({
      id: `${props.testId}-${index}`,
      name: `Row ${String(80 - index).padStart(2, "0")}`,
    }))
  );
  const columns = React.useMemo<TypeColumns>(
    () => [
      { name: "id", header: "ID", width: 180 },
      { name: "name", header: "Name", width: 220, type: "string" },
    ],
    []
  );
  const apiRef = React.useRef<TypeComputedProps | null>(null);

  return (
    <GridShell testId={props.testId} height={230}>
      <Button
        type="button"
        size="sm"
        data-testid={`${props.testId}-sort`}
        onClick={() => apiRef.current?.toggleColumnSort?.("name")}
      >
        Sort rows
      </Button>
      {props.mode === "always" ? (
        <Button
          type="button"
          size="sm"
          data-testid="issue-33-always-refresh"
          onClick={() =>
            setRows((current) => current.map((row) => ({ ...row })))
          }
        >
          Refresh rows
        </Button>
      ) : null}
      <ReactDataGrid
        idProperty="id"
        columns={columns}
        dataSource={rows}
        virtualized={false}
        rowHeight={32}
        enableFiltering={false}
        showColumnMenuTool={false}
        scrollTopOnSort={props.mode}
        handle={(computedPropsRef) => {
          if (!computedPropsRef) return;
          apiRef.current = computedPropsRef.current;
        }}
      />
    </GridShell>
  );
}

function ControlsScenario(): React.ReactElement {
  const [sortableEvents, setSortableEvents] = React.useState<TypeSortInfo[]>(
    []
  );
  const sortableColumns = React.useMemo<TypeColumns>(
    () => [
      { name: "id", header: "ID", width: 130 },
      { name: "group", header: "Blocked", width: 160, type: "string" },
      {
        name: "score",
        header: "Allowed override",
        width: 180,
        type: "number",
        sortable: true,
      },
    ],
    []
  );
  const toolColumns = React.useMemo<TypeColumns>(
    () => [
      { name: "id", header: "ID", width: 130 },
      {
        name: "group",
        header: "Column tool",
        width: 180,
        renderSortTool: (direction, props) => (
          <span
            data-testid={`issue-33-column-tool-${props.columnId}`}
            data-direction={direction}
          >
            column:{direction}
          </span>
        ),
      },
      { name: "score", header: "Root tool", width: 180, type: "number" },
    ],
    []
  );

  return (
    <main
      className="space-y-6 p-6"
      data-testid="issue-33-controls"
      aria-label="Issue 33 sorting controls"
    >
      <output data-testid="issue-33-sortable-events">
        {JSON.stringify(sortableEvents)}
      </output>
      <GridShell testId="issue-33-root-sortable">
        <ReactDataGrid
          idProperty="id"
          columns={sortableColumns}
          dataSource={ownershipRows}
          sortable={false}
          virtualized={false}
          enableFiltering={false}
          showColumnMenuTool
          onSortInfoChange={(next) =>
            setSortableEvents((current) => [...current, next])
          }
        />
      </GridShell>

      <GridShell testId="issue-33-sort-tools">
        <ReactDataGrid
          idProperty="id"
          columns={toolColumns}
          dataSource={ownershipRows}
          virtualized={false}
          enableFiltering={false}
          showColumnMenuTool={false}
          renderSortTool={(direction, props) => (
            <span
              data-testid={`issue-33-root-tool-${props.columnId}`}
              data-direction={direction}
            >
              root:{direction}
            </span>
          )}
        />
      </GridShell>

      <div className="grid gap-6 lg:grid-cols-2">
        <ScrollGrid testId="issue-33-scroll-true" mode />
        <ScrollGrid testId="issue-33-scroll-false" mode={false} />
        <ScrollGrid testId="issue-33-scroll-always" mode="always" />
      </div>
    </main>
  );
}

function RemoteScenario(): React.ReactElement {
  const [events, setEvents] = React.useState<Record<string, unknown>[]>([]);
  const columns = React.useMemo<TypeColumns>(
    () => [
      { name: "id", header: "ID", width: 130 },
      { name: "name", header: "Name", width: 220, type: "string" },
    ],
    []
  );
  const source = React.useCallback<TypeDataSource>(
    (args: TypeDataSourceArgs) => {
      const descriptors = args.sortInfo
        ? Array.isArray(args.sortInfo)
          ? args.sortInfo
          : [args.sortInfo]
        : [];
      setEvents((current) => [
        ...current,
        {
          kind: "load",
          skip: args.skip ?? null,
          sort: descriptors.map((entry) => ({
            id: entry.id,
            name: entry.name,
            dir: entry.dir,
            type: entry.type,
            fn: typeof entry.fn,
          })),
        },
      ]);

      const rows = Array.from({ length: 24 }, (_, index) => ({
        id: `remote-${index}`,
        name: `Remote ${String(index).padStart(2, "0")}`,
      }));
      if (descriptors[0]?.dir === -1) rows.reverse();
      const skip = args.skip ?? 0;
      const limit = args.limit ?? rows.length;
      return { data: rows.slice(skip, skip + limit), count: rows.length };
    },
    []
  );

  return (
    <main
      className="space-y-4 p-6"
      data-testid="issue-33-remote"
      aria-label="Issue 33 remote sorting"
    >
      <Button
        type="button"
        size="sm"
        data-testid="issue-33-clear-remote-events"
        onClick={() => setEvents([])}
      >
        Clear events
      </Button>
      <output data-testid="issue-33-remote-events">
        {JSON.stringify(events)}
      </output>
      <GridShell testId="issue-33-remote-grid">
        <ReactDataGrid
          idProperty="id"
          columns={columns}
          dataSource={source}
          pagination
          defaultSkip={10}
          defaultLimit={5}
          defaultSortInfo={[{ name: "name", dir: 1 }]}
          virtualized={false}
          enableFiltering={false}
          showColumnMenuTool={false}
          onSkipChange={(skip) =>
            setEvents((current) => [...current, { kind: "skip", skip }])
          }
          onSortInfoChange={(sortInfo) =>
            setEvents((current) => [...current, { kind: "sort", sortInfo }])
          }
        />
      </GridShell>
    </main>
  );
}

function PerformanceScenario(): React.ReactElement {
  const rowCount = 10_000;
  const rows = React.useMemo(
    () =>
      Array.from({ length: rowCount }, (_, index) => ({
        id: `performance-${index}`,
        bucket: `Bucket ${String(index % 25).padStart(2, "0")}`,
        score: (index * 7_919) % rowCount,
        label: `Row ${String(index).padStart(5, "0")}`,
      })),
    []
  );
  const columns = React.useMemo<TypeColumns>(
    () => [
      { name: "id", header: "ID", width: 190, type: "string" },
      { name: "bucket", header: "Bucket", width: 150, type: "string" },
      { name: "score", header: "Score", width: 140, type: "number" },
      { name: "label", header: "Label", width: 180, type: "string" },
    ],
    []
  );
  const apiRef = React.useRef<TypeComputedProps | null>(null);
  const startedAtRef = React.useRef(0);
  const dispatchDurationRef = React.useRef(0);
  const runRef = React.useRef(0);
  const [metrics, setMetrics] = React.useState<Record<string, unknown> | null>(
    null
  );

  const recordSettledSort = React.useCallback(() => {
    if (!startedAtRef.current) return;

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const scope = document.querySelector(
          '[data-testid="issue-33-performance-grid"]'
        );
        const renderedRows = scope?.querySelectorAll('[data-slot="grid-row"]');
        const firstRow = renderedRows?.[0]?.getAttribute("data-row-id") ?? null;
        const finishedAt = performance.now();
        const run = runRef.current;

        setMetrics({
          run,
          rowCount,
          runtimeMode: import.meta.env.PROD ? "production" : "development",
          dispatchDuration: dispatchDurationRef.current,
          settledDuration: finishedAt - startedAtRef.current,
          renderedRowCount: renderedRows?.length ?? 0,
          firstRow,
        });
        startedAtRef.current = 0;
      });
    });
  }, []);

  const runSort = React.useCallback(() => {
    const startedAt = performance.now();
    runRef.current += 1;
    startedAtRef.current = startedAt;
    apiRef.current?.toggleColumnSort?.("score");
    dispatchDurationRef.current = performance.now() - startedAt;
  }, []);

  return (
    <main
      className="space-y-4 p-6"
      data-testid="issue-33-performance"
      aria-label="Issue 33 sorting performance"
    >
      <div className="flex items-center gap-3">
        <Button
          type="button"
          size="sm"
          data-testid="issue-33-performance-run"
          onClick={runSort}
        >
          Benchmark sort
        </Button>
        <output data-testid="issue-33-performance-metrics">
          {JSON.stringify(metrics)}
        </output>
      </div>
      <GridShell testId="issue-33-performance-grid" height={420}>
        <ReactDataGrid
          idProperty="id"
          columns={columns}
          dataSource={rows}
          defaultSortInfo={[
            { name: "bucket", dir: 1 },
            { name: "score", dir: 1 },
          ]}
          rowHeight={36}
          virtualized
          enableFiltering={false}
          showColumnMenuTool={false}
          handle={(computedPropsRef) => {
            if (!computedPropsRef) return;
            apiRef.current = computedPropsRef.current;
          }}
          onSortInfoChange={recordSettledSort}
        />
      </GridShell>
    </main>
  );
}

function readScenario():
  | "ownership"
  | "comparators"
  | "controls"
  | "remote"
  | "performance" {
  if (typeof window === "undefined") return "ownership";
  const scenario = new URLSearchParams(window.location.search).get("scenario");
  if (
    scenario === "comparators" ||
    scenario === "controls" ||
    scenario === "remote" ||
    scenario === "performance"
  ) {
    return scenario;
  }
  return "ownership";
}

export default function Issue33SortingCompatPage(): React.ReactElement {
  const scenario = readScenario();

  if (scenario === "comparators") return <ComparatorsScenario />;
  if (scenario === "controls") return <ControlsScenario />;
  if (scenario === "remote") return <RemoteScenario />;
  if (scenario === "performance") return <PerformanceScenario />;
  return <OwnershipScenario />;
}
