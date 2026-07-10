import * as React from "react";

import ReactDataGrid, { type TypeColumns } from "../../src/main";
import { Button } from "../../src/components/ui/button";

const MAX_OBSERVER_CALLS = 8;
const OBSERVER_QUIET_WINDOW_MS = 250;

const columns: TypeColumns = [
  { name: "id", header: "ID", defaultWidth: 72 },
  { name: "name", header: "Name", defaultWidth: 180 },
  { name: "team", header: "Team", defaultWidth: 160 },
];

const columnOrder = ["id", "name", "team"];

const rows = [
  { id: 1, name: "Ada Lovelace", team: "Analytics" },
  { id: 2, name: "Grace Hopper", team: "Platform" },
  { id: 3, name: "Katherine Johnson", team: "Research" },
];

export default function FilteredRowsCountCompatPage() {
  const observerArmedRef = React.useRef(false);
  const observerCallsRef = React.useRef(0);
  const settleTimerRef = React.useRef<number | null>(null);
  const [filtersVisible, setFiltersVisible] = React.useState(true);
  const [liveObserverCalls, setLiveObserverCalls] = React.useState(0);
  const [lastReportedCount, setLastReportedCount] = React.useState<
    number | null
  >(null);
  const [settledObserverCalls, setSettledObserverCalls] = React.useState<
    number | null
  >(null);

  React.useEffect(
    () => () => {
      if (settleTimerRef.current !== null) {
        window.clearTimeout(settleTimerRef.current);
      }
    },
    []
  );

  const armObserver = () => {
    observerCallsRef.current = 0;
    observerArmedRef.current = true;
  };

  // Intentionally render-local: issue #26 is caused by consumers passing an
  // otherwise valid callback whose identity changes after a parent update.
  function reportFilteredRows(count: number) {
    if (!observerArmedRef.current) return;

    const nextCallCount = observerCallsRef.current + 1;
    observerCallsRef.current = nextCallCount;
    setLiveObserverCalls(nextCallCount);
    setLastReportedCount(count);

    if (settleTimerRef.current !== null) {
      window.clearTimeout(settleTimerRef.current);
    }

    if (nextCallCount >= MAX_OBSERVER_CALLS) {
      observerArmedRef.current = false;
      setSettledObserverCalls(nextCallCount);
      return;
    }

    settleTimerRef.current = window.setTimeout(() => {
      observerArmedRef.current = false;
      setSettledObserverCalls(observerCallsRef.current);
    }, OBSERVER_QUIET_WINDOW_MS);
  }

  return (
    <main className="flex flex-col gap-4">
      <section className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-4 shadow-sm">
        <Button
          type="button"
          data-testid="arm-filtered-callback"
          onClick={armObserver}
        >
          Arm observer
        </Button>
        <Button
          type="button"
          variant="outline"
          data-testid="toggle-filter-feedback"
          onClick={() => setFiltersVisible((visible) => !visible)}
        >
          Toggle filters
        </Button>
        <dl className="flex flex-wrap gap-4 text-sm">
          <div>
            <dt className="text-muted-foreground">Live calls</dt>
            <dd data-testid="filtered-callback-live-count">
              {liveObserverCalls}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Settled calls</dt>
            <dd data-testid="filtered-callback-settled-count">
              {settledObserverCalls ?? "pending"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Reported rows</dt>
            <dd data-testid="filtered-reported-row-count">
              {lastReportedCount ?? "pending"}
            </dd>
          </div>
        </dl>
      </section>

      <section className="h-[520px] min-h-0 rounded-lg border bg-background p-4 shadow-sm">
        <ReactDataGrid
          idProperty="id"
          columns={columns}
          dataSource={rows}
          columnOrder={columnOrder}
          enableColumnFilterContextMenu
          enableColumnAutosize
          skipHeaderOnAutoSize={false}
          enableFiltering={filtersVisible}
          filteredRowsCount={reportFilteredRows}
          virtualized={false}
          allowMobileTransform
          columnUserSelect
          showColumnMenuTool={false}
        />
      </section>
    </main>
  );
}
