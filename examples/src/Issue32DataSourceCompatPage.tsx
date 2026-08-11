import * as React from "react";

import ReactDataGrid, {
  type TypeColumns,
  type TypeComputedProps,
  type TypeDataSource,
  type TypeDataSourceArgs,
  type TypePaginationProps,
} from "../../src/main";
import { Button } from "../../src/components/ui/button";

type Row = {
  id: string;
  name: string;
};

const columns: TypeColumns = [
  { name: "id", header: "ID", width: 100, sortable: true },
  {
    name: "name",
    header: "Name",
    width: 240,
    sortable: true,
    filterable: true,
  },
];

const allRows: Row[] = Array.from({ length: 12 }, (_, index) => ({
  id: `row-${index + 1}`,
  name: `Row ${index + 1}`,
}));

function GridShell(props: {
  testId: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <section className="space-y-2" data-testid={props.testId}>
      <h2 className="text-sm font-semibold">{props.testId}</h2>
      <div className="h-[230px] min-h-0 rounded-lg border">
        {props.children}
      </div>
    </section>
  );
}

function OwnershipScenario(): React.ReactElement {
  const [promiseArray] = React.useState(() =>
    Promise.resolve<Row[]>([
      { id: "remote-array-3", name: "Remote array row 3" },
      { id: "remote-array-4", name: "Remote array row 4" },
    ])
  );
  const [promiseObject] = React.useState(() =>
    Promise.resolve({
      data: [
        { id: "remote-object-3", name: "Remote object row 3" },
        { id: "remote-object-4", name: "Remote object row 4" },
      ],
      count: 12,
    })
  );
  const [localPromiseArray] = React.useState(() =>
    Promise.resolve<Row[]>(allRows)
  );
  const [localPromiseObject] = React.useState(() =>
    Promise.resolve({ data: allRows, count: allRows.length })
  );
  const [callLog, setCallLog] = React.useState<Record<string, unknown>>({});

  const recordArgs = React.useCallback(
    (name: string, args: TypeDataSourceArgs) => {
      setCallLog((current) => ({
        ...current,
        [name]: {
          skip: args.skip ?? null,
          limit: args.limit ?? null,
          signal: args.signal instanceof AbortSignal,
          keys: Object.keys(args).sort(),
        },
      }));
    },
    []
  );
  const syncArraySource = React.useCallback<TypeDataSource>(
    (args: TypeDataSourceArgs) => {
      recordArgs("sync-array", args);
      const start = args.skip ?? 0;
      return allRows.slice(start, start + (args.limit ?? allRows.length));
    },
    [recordArgs]
  );
  const syncObjectSource = React.useCallback<TypeDataSource>(
    (args: TypeDataSourceArgs) => {
      recordArgs("sync-object", args);
      const start = args.skip ?? 0;
      return {
        data: allRows.slice(start, start + (args.limit ?? allRows.length)),
        count: allRows.length,
      };
    },
    [recordArgs]
  );
  const localFunctionSource = React.useCallback<TypeDataSource>(
    (args: TypeDataSourceArgs) => {
      recordArgs("local-function", args);
      return allRows;
    },
    [recordArgs]
  );

  const common = {
    idProperty: "id",
    columns,
    pagination: true as const,
    defaultSkip: 2,
    defaultLimit: 2,
    virtualized: false,
  };

  return (
    <main
      className="grid gap-4 p-6 lg:grid-cols-2"
      data-testid="issue-32-ownership"
    >
      <output data-testid="issue-32-ownership-call-log">
        {JSON.stringify(callLog)}
      </output>

      <GridShell testId="ownership-local-array">
        <ReactDataGrid {...common} dataSource={allRows} />
      </GridShell>
      <GridShell testId="ownership-remote-promise-array">
        <ReactDataGrid {...common} dataSource={promiseArray} />
      </GridShell>
      <GridShell testId="ownership-remote-promise-object">
        <ReactDataGrid {...common} dataSource={promiseObject} />
      </GridShell>
      <GridShell testId="ownership-remote-function-array">
        <ReactDataGrid {...common} dataSource={syncArraySource} />
      </GridShell>
      <GridShell testId="ownership-remote-function-object">
        <ReactDataGrid {...common} dataSource={syncObjectSource} />
      </GridShell>
      <GridShell testId="ownership-local-promise-array">
        <ReactDataGrid
          {...common}
          dataSource={localPromiseArray}
          pagination="local"
        />
      </GridShell>
      <GridShell testId="ownership-local-promise-object">
        <ReactDataGrid
          {...common}
          dataSource={localPromiseObject}
          pagination="local"
        />
      </GridShell>
      <GridShell testId="ownership-local-function">
        <ReactDataGrid
          {...common}
          dataSource={localFunctionSource}
          pagination="local"
        />
      </GridShell>
    </main>
  );
}

type PendingRequest = {
  id: number;
  args: TypeDataSourceArgs;
  settled: boolean;
  aborted: boolean;
  resolve: (value: { data: Row[]; count: number }) => void;
  reject: (reason: unknown) => void;
};

type LifecycleMetrics = {
  requests: number;
  aborted: number;
  signals: number;
  burstDuration: number | null;
  profilerCommits: number;
  profilerDuration: number;
  profilerMaxDuration: number;
};

function LifecycleScenario(): React.ReactElement {
  const apiRef = React.useRef<TypeComputedProps | null>(null);
  const pendingRef = React.useRef<PendingRequest[]>([]);
  const loadingEventsRef = React.useRef<boolean[]>([]);
  const loadingEventsOutputRef = React.useRef<HTMLOutputElement | null>(null);
  const metricsOutputRef = React.useRef<HTMLOutputElement | null>(null);
  const syncOutputsRef = React.useRef<() => void>(() => undefined);
  const metricsRef = React.useRef<LifecycleMetrics>({
    requests: 0,
    aborted: 0,
    signals: 0,
    burstDuration: null,
    profilerCommits: 0,
    profilerDuration: 0,
    profilerMaxDuration: 0,
  });

  const dataSource = React.useCallback<TypeDataSource>(
    (args: TypeDataSourceArgs) =>
      new Promise<{ data: Row[]; count: number }>((resolve, reject) => {
        const id = ++metricsRef.current.requests;
        if (args.signal instanceof AbortSignal) {
          metricsRef.current.signals += 1;
        }
        const request: PendingRequest = {
          id,
          args,
          settled: false,
          aborted: false,
          resolve,
          reject,
        };
        pendingRef.current.push(request);
        args.signal?.addEventListener(
          "abort",
          () => {
            if (request.settled) return;
            request.aborted = true;
            metricsRef.current.aborted += 1;
          },
          { once: true }
        );
        queueMicrotask(() => syncOutputsRef.current());
      }),
    []
  );

  const latestPending = React.useCallback(
    () =>
      [...pendingRef.current]
        .reverse()
        .find((request) => !request.settled && !request.aborted) ?? null,
    []
  );
  const resolveStale = React.useCallback(() => {
    const request = pendingRef.current.find(
      (candidate) => candidate.aborted && !candidate.settled
    );
    if (!request) return;
    request.settled = true;
    request.resolve({
      data: [
        {
          id: `stale-${request.id}`,
          name: `Stale request ${request.id}`,
        },
      ],
      count: 100,
    });
    queueMicrotask(() => syncOutputsRef.current());
  }, []);
  const resolveLatest = React.useCallback(() => {
    const request = latestPending();
    if (!request) return;
    request.settled = true;
    request.resolve({
      data: [
        {
          id: `request-${request.id}`,
          name: `Committed request ${request.id}`,
        },
      ],
      count: 100,
    });
    queueMicrotask(() => syncOutputsRef.current());
  }, [latestPending]);
  const rejectLatest = React.useCallback(() => {
    const request = latestPending();
    if (!request) return;
    request.settled = true;
    request.reject(new Error(`Rejected request ${request.id}`));
    queueMicrotask(() => syncOutputsRef.current());
  }, [latestPending]);
  const reloadOnce = React.useCallback(() => {
    apiRef.current?.reload();
    queueMicrotask(() => syncOutputsRef.current());
  }, []);
  const reloadBurst = React.useCallback(() => {
    const startedAt = performance.now();
    for (let index = 0; index < 50; index += 1) {
      apiRef.current?.reload();
    }
    metricsRef.current.burstDuration = performance.now() - startedAt;
    queueMicrotask(() => syncOutputsRef.current());
  }, []);
  const onLoadingChange = React.useCallback((nextLoading: boolean) => {
    loadingEventsRef.current.push(nextLoading);
    queueMicrotask(() => syncOutputsRef.current());
  }, []);
  const onProfilerRender = React.useCallback(
    (
      _id: string,
      _phase: "mount" | "update" | "nested-update",
      actualDuration: number
    ) => {
      metricsRef.current.profilerCommits += 1;
      metricsRef.current.profilerDuration += actualDuration;
      metricsRef.current.profilerMaxDuration = Math.max(
        metricsRef.current.profilerMaxDuration,
        actualDuration
      );
      queueMicrotask(() => syncOutputsRef.current());
    },
    []
  );

  const serializeMetrics = React.useCallback(() => {
    const latest = latestPending();
    return JSON.stringify({
      ...metricsRef.current,
      active: pendingRef.current.filter(
        (request) => !request.settled && !request.aborted
      ).length,
      stale: pendingRef.current.filter(
        (request) => !request.settled && request.aborted
      ).length,
      latestRequest: latest?.id ?? null,
      latestSkip: latest?.args.skip ?? null,
      latestLimit: latest?.args.limit ?? null,
      computedLoading: apiRef.current?.computedLoading ?? null,
      isLoading: apiRef.current?.isLoading?.() ?? null,
    });
  }, [latestPending]);
  const syncOutputs = React.useCallback(() => {
    if (loadingEventsOutputRef.current) {
      loadingEventsOutputRef.current.textContent = JSON.stringify(
        loadingEventsRef.current
      );
    }
    if (metricsOutputRef.current) {
      metricsOutputRef.current.textContent = serializeMetrics();
    }
  }, [serializeMetrics]);
  React.useLayoutEffect(() => {
    syncOutputsRef.current = syncOutputs;
    syncOutputs();

    return () => {
      syncOutputsRef.current = () => undefined;
    };
  }, [syncOutputs]);

  return (
    <main className="space-y-4 p-6" data-testid="issue-32-lifecycle">
      <div className="flex flex-wrap gap-2">
        <Button data-testid="lifecycle-resolve" onClick={resolveLatest}>
          Resolve latest
        </Button>
        <Button data-testid="lifecycle-reject" onClick={rejectLatest}>
          Reject latest
        </Button>
        <Button data-testid="lifecycle-resolve-stale" onClick={resolveStale}>
          Resolve stale
        </Button>
        <Button data-testid="lifecycle-reload" onClick={reloadOnce}>
          Reload
        </Button>
        <Button data-testid="lifecycle-burst" onClick={reloadBurst}>
          Reload 50 times
        </Button>
      </div>
      <output
        ref={loadingEventsOutputRef}
        data-testid="lifecycle-loading-events"
      >
        []
      </output>
      <output ref={metricsOutputRef} data-testid="lifecycle-metrics">
        {"{}"}
      </output>

      <div className="h-[320px] min-h-0 rounded-lg border">
        <React.Profiler id="issue-32-grid" onRender={onProfilerRender}>
          <ReactDataGrid
            idProperty="id"
            columns={columns}
            dataSource={dataSource}
            pagination
            defaultLimit={10}
            virtualized={false}
            onLoadingChange={onLoadingChange}
            loadingText={() => "Loading authoritative page"}
            onReady={(ref) => {
              apiRef.current = ref.current;
            }}
          />
        </React.Profiler>
      </div>
    </main>
  );
}

function ControlledScenario(): React.ReactElement {
  const apiRef = React.useRef<TypeComputedProps | null>(null);
  const [skip, setSkip] = React.useState(4);
  const [limit, setLimit] = React.useState(2);
  const [events, setEvents] = React.useState<string[]>([]);

  const dataSource = React.useCallback<TypeDataSource>(
    (args: TypeDataSourceArgs) => {
      const activeFilter = args.filterValue?.find(
        (entry) => entry.name === "name"
      );
      const sort = Array.isArray(args.sortInfo)
        ? args.sortInfo[0]
        : args.sortInfo;
      setEvents((current) => [
        ...current,
        `load:skip=${args.skip ?? "none"}:limit=${args.limit ?? "none"}:sort=${
          sort ? `${sort.name}:${sort.dir}` : "none"
        }:filter=${String(activeFilter?.value ?? "none")}`,
      ]);
      const start = args.skip ?? 0;
      const requestLimit = args.limit ?? allRows.length;
      return {
        data: allRows.slice(start, start + requestLimit),
        count: allRows.length,
      };
    },
    []
  );
  const onSkipChange = React.useCallback((nextSkip: number) => {
    setEvents((current) => [...current, `skip:${nextSkip}`]);
    setSkip(nextSkip);
  }, []);
  const onLimitChange = React.useCallback((nextLimit: number) => {
    setEvents((current) => [...current, `limit:${nextLimit}`]);
    setLimit(nextLimit);
  }, []);

  const renderPaginationToolbar = React.useCallback(
    (pagination: TypePaginationProps) => (
      <div
        className="flex items-center gap-2 px-3"
        data-testid="controlled-toolbar"
        data-remote={String(pagination.remotePagination)}
        data-local={String(pagination.localPagination)}
        data-count={pagination.count}
        data-total-count={pagination.totalCount}
        data-skip={pagination.skip}
        data-limit={pagination.limit}
      >
        <Button
          data-testid="controlled-goto-last"
          onClick={pagination.gotoLastPage}
        >
          Last
        </Button>
        <Button
          data-testid="controlled-goto-first"
          onClick={pagination.gotoFirstPage}
        >
          First
        </Button>
        <Button
          data-testid="controlled-limit"
          onClick={() => pagination.onLimitChange(3)}
        >
          Three per page
        </Button>
        <Button data-testid="controlled-reload" onClick={pagination.reload}>
          Reload
        </Button>
      </div>
    ),
    []
  );

  return (
    <main className="space-y-4 p-6" data-testid="issue-32-controlled">
      <Button
        data-testid="controlled-clear-events"
        onClick={() => setEvents([])}
      >
        Clear events
      </Button>
      <Button
        data-testid="controlled-filter"
        onClick={() =>
          apiRef.current?.setFilterValue([
            {
              name: "name",
              type: "string",
              operator: "contains",
              value: "Row 1",
            },
          ])
        }
      >
        Filter Row 1
      </Button>
      <output data-testid="controlled-events">{JSON.stringify(events)}</output>
      <div className="h-[340px] min-h-0 rounded-lg border">
        <ReactDataGrid
          idProperty="id"
          columns={columns}
          dataSource={dataSource}
          pagination
          skip={skip}
          limit={limit}
          onSkipChange={onSkipChange}
          onLimitChange={onLimitChange}
          enableFiltering
          virtualized={false}
          renderPaginationToolbar={renderPaginationToolbar}
          onReady={(ref) => {
            apiRef.current = ref.current;
          }}
        />
      </div>
    </main>
  );
}

function ReloadContractsScenario(): React.ReactElement {
  const localApiRef = React.useRef<TypeComputedProps | null>(null);
  const [localRows] = React.useState<Row[]>(() => [
    { id: "local-1", name: "Local original" },
    { id: "local-2", name: "Local second" },
  ]);
  const [theme, setTheme] = React.useState("default-light");
  const [remoteCalls, setRemoteCalls] = React.useState(0);

  const remoteDataSource = React.useCallback(
    (args: TypeDataSourceArgs): Row[] => {
      setRemoteCalls((current) => current + 1);
      return [
        {
          id: "remote-theme",
          name: `Remote theme ${args.theme}`,
        },
      ];
    },
    []
  );
  const captureLocalApi = React.useCallback(
    (ref: React.MutableRefObject<TypeComputedProps | null>) => {
      localApiRef.current = ref.current;
    },
    []
  );
  const mutateAndReloadLocalRows = React.useCallback(() => {
    // Deliberately model an imperative consumer that mutates stable row
    // objects and then asks the grid to publish the newly evaluated page.
    // eslint-disable-next-line react-hooks/immutability
    localRows[0]!.name = "Local mutated";
    localApiRef.current?.reload();
  }, [localRows]);

  return (
    <main
      className="grid gap-4 p-6 lg:grid-cols-2"
      data-testid="issue-32-reload-contracts"
    >
      <GridShell testId="reload-remote-theme">
        <div className="flex h-full min-h-0 flex-col gap-2">
          <Button
            data-testid="reload-toggle-theme"
            onClick={() =>
              setTheme((current) =>
                current === "default-light" ? "default-dark" : "default-light"
              )
            }
          >
            Toggle theme
          </Button>
          <output data-testid="reload-remote-calls">{remoteCalls}</output>
          <div className="min-h-0 flex-1">
            <ReactDataGrid
              idProperty="id"
              columns={columns}
              dataSource={remoteDataSource}
              theme={theme}
              virtualized={false}
            />
          </div>
        </div>
      </GridShell>

      <GridShell testId="reload-local-mutation">
        <div className="flex h-full min-h-0 flex-col gap-2">
          <Button
            data-testid="reload-mutate-local"
            onClick={mutateAndReloadLocalRows}
          >
            Mutate and reload
          </Button>
          <div className="min-h-0 flex-1">
            <ReactDataGrid
              idProperty="id"
              columns={columns}
              dataSource={localRows}
              pagination="local"
              defaultLimit={1}
              onReady={captureLocalApi}
              virtualized={false}
            />
          </div>
        </div>
      </GridShell>
    </main>
  );
}

export default function Issue32DataSourceCompatPage(): React.ReactElement {
  const scenario =
    new URLSearchParams(window.location.search).get("scenario") ?? "ownership";

  if (scenario === "lifecycle") return <LifecycleScenario />;
  if (scenario === "controlled") return <ControlledScenario />;
  if (scenario === "reload-contracts") return <ReloadContractsScenario />;
  return <OwnershipScenario />;
}
