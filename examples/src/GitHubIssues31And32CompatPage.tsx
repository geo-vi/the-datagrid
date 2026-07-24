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

const activeNameFilter = [
  {
    name: "name",
    type: "string",
    operator: "contains",
    value: "Ada",
  },
];

const inactiveNameFilter = [
  {
    ...activeNameFilter[0],
    active: false,
  },
];

const cyrillicGlyphFilter = [
  {
    ...activeNameFilter[0],
    value: "ЙЁЩЦДЪ gjpqy",
  },
];

const glyphRows = [
  { id: "latin", name: "ÁÉÍÓÚ ÂĂÅÇÑ ĞŐŰÝ gjpqy" },
  {
    id: "cyrillic",
    name: "ЙЁЩЦДЪ ФЫВАПРОЛДЖЭ ЯЧСМИТЬБЮ йцурфдщ",
  },
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

function Issue31FilterGrid({
  testId,
  ...filterProps
}: { testId: string } & Record<string, unknown>) {
  return (
    <div className="h-[180px] min-h-0 rounded-lg border" data-testid={testId}>
      <UntypedReactDataGrid
        idProperty="id"
        columns={columns}
        dataSource={defaultRows}
        virtualized={false}
        {...filterProps}
      />
    </div>
  );
}

function Issue31Probe() {
  const [rootLifecycle, setRootLifecycle] = React.useState({
    focus: 0,
    blur: 0,
    keyDown: [] as string[],
  });
  const defaults = ReactDataGrid.defaultProps as Record<string, unknown>;
  const observedDefaults = {
    idProperty: defaults.idProperty ?? null,
    theme: defaults.theme ?? null,
    rowHeight: defaults.rowHeight ?? null,
    filterRowHeight: defaults.filterRowHeight ?? null,
    enableColumnFilterContextMenu:
      defaults.enableColumnFilterContextMenu ?? null,
    enableFiltering: defaults.enableFiltering ?? null,
    columnUserSelect: defaults.columnUserSelect ?? null,
    showColumnMenuTool: defaults.showColumnMenuTool ?? null,
  };

  return (
    <section className="space-y-4" data-testid="github-issue-31-probe">
      <output data-testid="issue-31-default-props">
        {JSON.stringify(observedDefaults)}
      </output>
      <output data-testid="issue-31-root-lifecycle">
        {JSON.stringify(rootLifecycle)}
      </output>

      <div
        className="h-[260px] min-h-0 rounded-lg border"
        data-testid="issue-31-default-grid-shell"
      >
        <UntypedReactDataGrid
          columns={columns}
          dataSource={defaultRows}
          virtualized={false}
          className="issue-31-consumer-root"
          style={{
            height: "211px",
            width: "calc(100% - 17px)",
            scrollMarginTop: "13px",
          }}
          onFocus={() =>
            setRootLifecycle((current) => ({
              ...current,
              focus: current.focus + 1,
            }))
          }
          onBlur={() =>
            setRootLifecycle((current) => ({
              ...current,
              blur: current.blur + 1,
            }))
          }
          onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>) =>
            setRootLifecycle((current) => ({
              ...current,
              keyDown: [...current.keyDown, event.key],
            }))
          }
        />
      </div>

      <button type="button" data-testid="issue-31-lifecycle-focus-sink">
        Move focus outside the grid
      </button>

      <div
        className="h-[260px] min-h-0 rounded-lg border"
        data-testid="issue-31-inferred-filter-grid-shell"
      >
        <UntypedReactDataGrid
          columns={columns}
          dataSource={defaultRows}
          defaultFilterValue={activeNameFilter}
          virtualized={false}
        />
      </div>

      <section
        className="dark grid gap-4 rounded-lg p-4 lg:grid-cols-2"
        data-testid="issue-31-dark-theme-host"
        style={
          {
            "--background": "rgb(12 18 24)",
            "--foreground": "rgb(238 242 246)",
            "--popover": "rgb(17 24 39)",
            "--popover-foreground": "rgb(238 242 246)",
            "--muted": "rgb(31 41 55)",
            "--muted-foreground": "rgb(203 213 225)",
            "--border": "rgb(71 85 105)",
            "--input": "rgb(71 85 105)",
            "--ring": "rgb(148 163 184)",
          } as React.CSSProperties
        }
      >
        <Issue31FilterGrid
          testId="issue-31-default-light-in-dark-host"
          theme="default-light"
          defaultFilterValue={activeNameFilter}
        />
        <Issue31FilterGrid
          testId="issue-31-adaptive-default-in-dark-host"
          theme="default"
          defaultFilterValue={activeNameFilter}
        />
      </section>

      <section
        className="grid gap-4 lg:grid-cols-2"
        data-testid="issue-31-filter-precedence"
      >
        <Issue31FilterGrid testId="issue-31-filter-omitted" />
        <Issue31FilterGrid
          testId="issue-31-filter-default-active"
          defaultFilterValue={activeNameFilter}
        />
        <Issue31FilterGrid
          testId="issue-31-filter-controlled"
          filterValue={activeNameFilter}
        />
        <Issue31FilterGrid
          testId="issue-31-filter-explicit-true"
          enableFiltering
        />
        <Issue31FilterGrid
          testId="issue-31-filter-explicit-false-default"
          enableFiltering={false}
          defaultFilterValue={activeNameFilter}
        />
        <Issue31FilterGrid
          testId="issue-31-filter-explicit-false-controlled"
          enableFiltering={false}
          filterValue={activeNameFilter}
        />
        <Issue31FilterGrid
          testId="issue-31-filter-empty-default"
          defaultFilterValue={[]}
        />
        <Issue31FilterGrid
          testId="issue-31-filter-inactive-default"
          defaultFilterValue={inactiveNameFilter}
        />
      </section>

      <div
        className="h-[180px] min-h-0 rounded-lg border"
        data-testid="issue-31-40px-glyph-grid-shell"
      >
        <UntypedReactDataGrid
          idProperty="id"
          columns={columns}
          dataSource={glyphRows}
          rowHeight={40}
          virtualized={false}
        />
      </div>

      <div
        className="h-[180px] min-h-0 rounded-lg border"
        data-testid="issue-31-40px-filter-glyph-grid-shell"
      >
        <UntypedReactDataGrid
          idProperty="id"
          columns={columns}
          dataSource={glyphRows}
          defaultFilterValue={cyrillicGlyphFilter}
          filterRowHeight={40}
          rowHeight={40}
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
  const resolvePage = React.useCallback(() => {
    deferred.resolve({
      data: [
        { id: "remote-3", name: "Remote row 3" },
        { id: "remote-4", name: "Remote row 4" },
      ],
      count: 6,
    });
  }, [deferred]);

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
