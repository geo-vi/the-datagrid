import * as React from "react";

import ReactDataGrid, {
  type TypeColumns,
  type TypeComputedProps,
  type TypeDataSource,
  type TypeFilterValue,
} from "../../src/main";
import { Button } from "../../src/components/ui/button";

const CALLBACK_CAP = 8;
const columns: TypeColumns = [
  { name: "id", header: "ID", defaultWidth: 80, filterable: true },
  { name: "name", header: "Name", defaultWidth: 200, filterable: true },
  { name: "team", header: "Team", defaultWidth: 160, filterable: true },
];
const columnOrder = ["id", "name", "team"];
const emptyFilterValue: TypeFilterValue = [
  { name: "id", type: "number", operator: "gte", value: null },
  { name: "name", type: "string", operator: "contains", value: "" },
  { name: "team", type: "string", operator: "contains", value: "" },
];
const smallRows = [
  { id: 1, name: "Ada Lovelace", team: "Analytics" },
  { id: 2, name: "Grace Hopper", team: "Platform" },
  { id: 3, name: "Katherine Johnson", team: "Research" },
];
const virtualRows = Array.from({ length: 2_000 }, (_, index) => ({
  id: index + 1,
  name: `Memory row ${index + 1}`,
  team: ["Analytics", "Platform", "Research"][index % 3],
}));

function ScenarioShell(props: {
  controls?: React.ReactNode;
  metrics?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main className="flex flex-col gap-4">
      <section className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-4 shadow-sm">
        {props.controls}
        <dl className="flex flex-wrap gap-4 text-sm">{props.metrics}</dl>
      </section>
      <section className="h-[560px] min-h-0 rounded-lg border bg-background p-4 shadow-sm">
        {props.children}
      </section>
    </main>
  );
}

function Metric(props: {
  label: string;
  testId: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-muted-foreground">{props.label}</dt>
      <dd data-testid={props.testId}>{props.children}</dd>
    </div>
  );
}

function ReadyScenario() {
  const readyCallsRef = React.useRef(0);
  const handleCallsRef = React.useRef(0);
  const readyRefRef = React.useRef<
    React.MutableRefObject<TypeComputedProps | null> | undefined
  >(undefined);
  const handledRefRef = React.useRef<
    React.MutableRefObject<TypeComputedProps | null> | undefined
  >(undefined);
  const firstApiRef = React.useRef<TypeComputedProps | null>(null);
  const [readyCalls, setReadyCalls] = React.useState(0);
  const [handleCalls, setHandleCalls] = React.useState(0);
  const [scrollChecks, setScrollChecks] = React.useState(0);

  const reportReady = React.useCallback(
    (ref: React.MutableRefObject<TypeComputedProps | null>) => {
      readyRefRef.current = ref;
      firstApiRef.current ??= ref.current;
      if (readyCallsRef.current >= CALLBACK_CAP) return;
      readyCallsRef.current += 1;
      setReadyCalls(readyCallsRef.current);
    },
    []
  );

  const reportHandle = React.useCallback(
    (ref: React.MutableRefObject<TypeComputedProps | null> | null) => {
      if (!ref) return;
      if (handledRefRef.current === ref) return;
      handledRefRef.current = ref;
      if (handleCallsRef.current >= CALLBACK_CAP) return;
      handleCallsRef.current += 1;
      setHandleCalls(handleCallsRef.current);
      readyRefRef.current ??= ref;
    },
    []
  );

  const apiStable = Boolean(
    firstApiRef.current && readyRefRef.current?.current === firstApiRef.current
  );

  return (
    <ScenarioShell
      controls={
        <Button
          type="button"
          data-testid="ready-scroll"
          onClick={() => {
            readyRefRef.current?.current?.scrollToIndex(1_500);
            setScrollChecks((current) => current + 1);
          }}
        >
          Scroll API
        </Button>
      }
      metrics={
        <>
          <Metric label="onReady calls" testId="ready-calls">
            {readyCalls}
          </Metric>
          <Metric label="handle calls" testId="handle-calls">
            {handleCalls}
          </Metric>
          <Metric label="API stable" testId="api-stable">
            {String(apiStable)}
          </Metric>
          <Metric label="API live" testId="api-live">
            {String(Boolean(readyRefRef.current?.current))}
          </Metric>
          <Metric label="Scroll checks" testId="ready-scroll-checks">
            {scrollChecks}
          </Metric>
        </>
      }
    >
      <ReactDataGrid
        idProperty="id"
        columns={columns}
        dataSource={virtualRows}
        columnOrder={columnOrder}
        enableFiltering
        onReady={reportReady}
        handle={reportHandle}
        virtualized
      />
    </ScenarioShell>
  );
}

function FilterScenario() {
  const callsRef = React.useRef(0);
  const [calls, setCalls] = React.useState(0);

  React.useLayoutEffect(() => {
    (
      window as typeof window & { __tdgFilterCallbackCalls?: number }
    ).__tdgFilterCallbackCalls = 0;
  }, []);

  function reportFilterChange() {
    if (callsRef.current >= CALLBACK_CAP) return;
    callsRef.current += 1;
    (
      window as typeof window & { __tdgFilterCallbackCalls?: number }
    ).__tdgFilterCallbackCalls = callsRef.current;
    setCalls(callsRef.current);
  }

  return (
    <ScenarioShell
      metrics={
        <Metric label="Filter callbacks" testId="filter-calls">
          {calls}
        </Metric>
      }
    >
      <ReactDataGrid
        idProperty="id"
        columns={columns}
        dataSource={smallRows}
        columnOrder={columnOrder}
        enableFiltering
        defaultFilterValue={emptyFilterValue}
        onFilterValueChange={reportFilterChange}
        virtualized={false}
      />
    </ScenarioShell>
  );
}

function VolatileCountScenario() {
  const armedRef = React.useRef(false);
  const callsRef = React.useRef(0);
  const timerRef = React.useRef<number | null>(null);
  const [rowLimit, setRowLimit] = React.useState(smallRows.length);
  const [liveCalls, setLiveCalls] = React.useState(0);
  const [settledCalls, setSettledCalls] = React.useState<number | null>(null);

  React.useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    },
    []
  );

  const volatileColumns: TypeColumns = [
    { name: "id", header: "ID", defaultWidth: 80 },
    { name: "name", header: "Name", defaultWidth: 200 },
  ];
  const volatileRows = smallRows.slice(0, rowLimit);
  const volatileOrder = ["id", "name"];

  function reportCount() {
    if (!armedRef.current || callsRef.current >= CALLBACK_CAP) return;
    callsRef.current += 1;
    setLiveCalls(callsRef.current);

    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    if (callsRef.current >= CALLBACK_CAP) {
      armedRef.current = false;
      setSettledCalls(callsRef.current);
      return;
    }

    setSettledCalls(null);
    timerRef.current = window.setTimeout(() => {
      armedRef.current = false;
      setSettledCalls(callsRef.current);
    }, 250);
  }

  return (
    <ScenarioShell
      controls={
        <>
          <Button
            type="button"
            data-testid="arm-volatile-count"
            onClick={() => {
              if (timerRef.current !== null) {
                window.clearTimeout(timerRef.current);
                timerRef.current = null;
              }
              callsRef.current = 0;
              armedRef.current = true;
              setLiveCalls(0);
              setSettledCalls(null);
            }}
          >
            Arm count observer
          </Button>
          <Button
            type="button"
            variant="outline"
            data-testid="trigger-volatile-count"
            onClick={() =>
              setRowLimit((current) =>
                current === smallRows.length ? 0 : smallRows.length
              )
            }
          >
            Change rows
          </Button>
        </>
      }
      metrics={
        <>
          <Metric label="Live count calls" testId="volatile-live-count">
            {liveCalls}
          </Metric>
          <Metric label="Settled count calls" testId="volatile-settled-count">
            {settledCalls ?? "pending"}
          </Metric>
        </>
      }
    >
      <ReactDataGrid
        idProperty="id"
        columns={volatileColumns}
        dataSource={volatileRows}
        columnOrder={volatileOrder}
        enableFiltering
        filteredRowsCount={reportCount}
        virtualized={false}
      />
    </ScenarioShell>
  );
}

type RemoteMode = "initial" | "invalid-count" | "pending" | "race" | "reject";

function RemoteScenario() {
  const modeRef = React.useRef<RemoteMode>("initial");
  const raceCallRef = React.useRef(0);
  const pendingResolveRef = React.useRef<
    ((value: { data: unknown[]; count: number }) => void) | null
  >(null);
  const apiRef = React.useRef<
    React.MutableRefObject<TypeComputedProps | null> | undefined
  >(undefined);
  const observerCallsRef = React.useRef(0);
  const [mounted, setMounted] = React.useState(true);
  const [observerCalls, setObserverCalls] = React.useState(0);

  const dataSource = React.useCallback<TypeDataSource>(() => {
    const mode = modeRef.current;

    if (mode === "reject") {
      modeRef.current = "initial";
      return Promise.reject(new Error("bounded remote rejection"));
    }

    if (mode === "invalid-count") {
      modeRef.current = "initial";
      return Promise.resolve({
        data: [{ id: 204, name: "Invalid count response", team: "Remote" }],
        count: Number.NaN,
      });
    }

    if (mode === "pending") {
      return new Promise((resolve) => {
        pendingResolveRef.current = resolve;
      });
    }

    if (mode === "race") {
      raceCallRef.current += 1;
      const latest = raceCallRef.current > 1;
      return new Promise((resolve) => {
        window.setTimeout(
          () =>
            resolve({
              data: [
                {
                  id: latest ? 202 : 201,
                  name: latest ? "Latest response" : "Stale response",
                  team: "Remote",
                },
              ],
              count: 1,
            }),
          latest ? 20 : 180
        );
      });
    }

    return Promise.resolve({
      data: [{ id: 200, name: "Initial response", team: "Remote" }],
      count: 1,
    });
  }, []);

  const captureApi = React.useCallback(
    (ref: React.MutableRefObject<TypeComputedProps | null>) => {
      apiRef.current = ref;
      (
        window as typeof window & {
          __tdgRemoteApiRef?: React.MutableRefObject<TypeComputedProps | null>;
        }
      ).__tdgRemoteApiRef = ref;
    },
    []
  );

  return (
    <ScenarioShell
      controls={
        <>
          <Button
            type="button"
            data-testid="remote-race"
            onClick={() => {
              modeRef.current = "race";
              raceCallRef.current = 0;
              apiRef.current?.current?.reload();
              apiRef.current?.current?.reload();
            }}
          >
            Race requests
          </Button>
          <Button
            type="button"
            variant="outline"
            data-testid="remote-reject"
            onClick={() => {
              modeRef.current = "reject";
              apiRef.current?.current?.reload();
            }}
          >
            Reject request
          </Button>
          <Button
            type="button"
            variant="outline"
            data-testid="remote-invalid-count"
            onClick={() => {
              modeRef.current = "invalid-count";
              apiRef.current?.current?.reload();
            }}
          >
            Invalid count
          </Button>
          <Button
            type="button"
            variant="outline"
            data-testid="remote-pending-unmount"
            onClick={() => {
              modeRef.current = "pending";
              apiRef.current?.current?.reload();
              setMounted(false);
            }}
          >
            Pending then unmount
          </Button>
          <Button
            type="button"
            variant="outline"
            data-testid="remote-resolve"
            onClick={() => {
              modeRef.current = "initial";
              pendingResolveRef.current?.({
                data: [{ id: 203, name: "Late response", team: "Remote" }],
                count: 1,
              });
              pendingResolveRef.current = null;
            }}
          >
            Resolve pending
          </Button>
          <Button
            type="button"
            variant="outline"
            data-testid="remote-toggle"
            onClick={() => setMounted((current) => !current)}
          >
            Toggle remote grid
          </Button>
        </>
      }
      metrics={
        <>
          <Metric label="Observer calls" testId="remote-observer-calls">
            {observerCalls}
          </Metric>
          <Metric label="Mounted" testId="remote-mounted">
            {String(mounted)}
          </Metric>
        </>
      }
    >
      {mounted ? (
        <ReactDataGrid
          idProperty="id"
          columns={columns}
          dataSource={dataSource}
          columnOrder={columnOrder}
          enableFiltering
          filteredRowsCount={() => {
            if (observerCallsRef.current >= CALLBACK_CAP) return;
            observerCallsRef.current += 1;
            setObserverCalls(observerCallsRef.current);
          }}
          onReady={captureApi}
          virtualized={false}
        />
      ) : null}
    </ScenarioShell>
  );
}

function LifecycleScenario() {
  const [mounted, setMounted] = React.useState(true);
  const captureApi = React.useCallback(
    (ref: React.MutableRefObject<TypeComputedProps | null>) => {
      (
        window as typeof window & {
          __tdgLifecycleApiRef?: React.MutableRefObject<TypeComputedProps | null>;
        }
      ).__tdgLifecycleApiRef = ref;
    },
    []
  );

  return (
    <ScenarioShell
      controls={
        <Button
          type="button"
          data-testid="lifecycle-toggle"
          onClick={() => setMounted((current) => !current)}
        >
          Toggle grid
        </Button>
      }
      metrics={
        <Metric label="Mounted" testId="lifecycle-mounted">
          {String(mounted)}
        </Metric>
      }
    >
      {mounted ? (
        <ReactDataGrid
          idProperty="id"
          columns={columns}
          dataSource={virtualRows}
          columnOrder={columnOrder}
          enableFiltering
          allowMobileTransform
          showColumnMenuTool
          onReady={captureApi}
          virtualized
        />
      ) : null}
    </ScenarioShell>
  );
}

export default function MemorySafetyCompatPage() {
  const scenario = new URLSearchParams(window.location.search).get("scenario");

  if (scenario === "filter") return <FilterScenario />;
  if (scenario === "volatile-count") return <VolatileCountScenario />;
  if (scenario === "remote") return <RemoteScenario />;
  if (scenario === "lifecycle") return <LifecycleScenario />;
  return <ReadyScenario />;
}
