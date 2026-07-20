import * as React from "react";

import ReactDataGrid, {
  type TypeColumns,
  type TypeDataGridProps,
} from "../../src/main";
import { Button } from "../../src/components/ui/button";

type UntypedGridProps = TypeDataGridProps & Record<string, unknown>;

const UntypedReactDataGrid = ReactDataGrid as React.ComponentType<
  Partial<UntypedGridProps>
>;

const columns: TypeColumns = [
  { name: "id", header: "ID", width: 100 },
  { name: "name", header: "Name", width: 220, filterable: true },
];

const defaultRows = [
  { id: "row-1", name: "Ada Lovelace" },
  { id: "row-2", name: "Grace Hopper" },
];

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
};

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });

  return { promise, resolve };
}

function Issue31Probe() {
  const [rootClicks, setRootClicks] = React.useState(0);
  const defaults = ReactDataGrid.defaultProps as Record<string, unknown>;
  const observedDefaults = {
    idProperty: defaults.idProperty ?? null,
    theme: defaults.theme ?? null,
    rowHeight: defaults.rowHeight ?? null,
    filterRowHeight: defaults.filterRowHeight ?? null,
    enableColumnFilterContextMenu:
      defaults.enableColumnFilterContextMenu ?? null,
    columnUserSelect: defaults.columnUserSelect ?? null,
    showColumnMenuTool: defaults.showColumnMenuTool ?? null,
  };

  return (
    <section className="space-y-4" data-testid="github-issue-31-probe">
      <output data-testid="issue-31-default-props">
        {JSON.stringify(observedDefaults)}
      </output>
      <output data-testid="issue-31-root-clicks">{rootClicks}</output>

      <div
        className="h-[260px] min-h-0 rounded-lg border"
        data-testid="issue-31-default-grid-shell"
      >
        <UntypedReactDataGrid
          columns={columns}
          dataSource={defaultRows}
          virtualized={false}
          data-host-attribute="forwarded"
          onClick={() => setRootClicks((current) => current + 1)}
        />
      </div>

      <div
        className="h-[260px] min-h-0 rounded-lg border"
        data-testid="issue-31-inferred-filter-grid-shell"
      >
        <UntypedReactDataGrid
          columns={columns}
          dataSource={defaultRows}
          defaultFilterValue={[
            {
              name: "name",
              type: "string",
              operator: "contains",
              value: "",
            },
          ]}
          virtualized={false}
        />
      </div>
    </section>
  );
}

type Issue32Result = {
  data: Array<{ id: string; name: string }>;
  count: number;
};

function Issue32Probe() {
  const [deferred] = React.useState(() => createDeferred<Issue32Result>());
  const [loadingEvents, setLoadingEvents] = React.useState<boolean[]>([]);
  const resolvePage = React.useCallback(() => {
    deferred.resolve({
      data: [
        { id: "remote-3", name: "Remote row 3" },
        { id: "remote-4", name: "Remote row 4" },
      ],
      count: 6,
    });
  }, [deferred]);
  const handleLoadingChange = React.useCallback((loading: boolean) => {
    setLoadingEvents((current) => [...current, loading]);
  }, []);

  return (
    <section className="space-y-4" data-testid="github-issue-32-probe">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          data-testid="issue-32-resolve-static-promise"
          onClick={resolvePage}
        >
          Resolve static Promise page
        </Button>
        <output data-testid="issue-32-loading-events">
          {JSON.stringify(loadingEvents)}
        </output>
      </div>

      <div
        className="h-[320px] min-h-0 rounded-lg border"
        data-testid="issue-32-grid-shell"
      >
        <UntypedReactDataGrid
          idProperty="id"
          columns={columns}
          dataSource={deferred.promise}
          pagination
          skip={2}
          limit={2}
          virtualized={false}
          loadingText="Fetching issue 32 rows"
          onLoadingChange={handleLoadingChange}
          renderLoadMask={(loadMaskProps: {
            visible: boolean;
            loadingText: React.ReactNode | (() => React.ReactNode);
          }) => {
            if (!loadMaskProps.visible) return null;
            const loadingText =
              typeof loadMaskProps.loadingText === "function"
                ? loadMaskProps.loadingText()
                : loadMaskProps.loadingText;

            return (
              <div data-testid="issue-32-custom-load-mask">{loadingText}</div>
            );
          }}
          renderPaginationToolbar={() => (
            <div data-testid="issue-32-custom-pagination-toolbar">
              Custom pagination toolbar
            </div>
          )}
        />
      </div>
    </section>
  );
}

export default function GitHubIssues31And32CompatPage() {
  return (
    <main className="flex flex-col gap-8 p-6">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          GitHub compatibility contracts
        </p>
        <h1 className="text-2xl font-semibold">Issues #31 and #32</h1>
      </header>
      <Issue31Probe />
      <Issue32Probe />
    </main>
  );
}
