import * as React from "react";

import ReactDataGrid, {
  type TypeColumns,
  type TypeComputedProps,
  type TypeDataSourceArgs,
  type TypeOnSelectionChangeArg,
} from "../../src/main";
import {
  RDGSearchBar,
  RDGSearchProvider,
  RDGSearchTarget,
} from "../../src/search";

const columns: TypeColumns = [
  { name: "id", header: "ID", defaultWidth: 72 },
  { name: "name", header: "Name", defaultWidth: 190 },
  { name: "city", header: "City", defaultWidth: 150 },
  { name: "privateCode", header: "Private", visible: false },
  {
    name: "excludedCode",
    header: "Excluded",
    visible: false,
    searchable: false,
  },
];

const columnOrder = ["id", "name", "city"];

const remoteRows = Array.from({ length: 18 }, (_, index) => ({
  id: index + 1,
  name:
    index === 1 || index === 7 || index === 13
      ? "Target account " + (index + 1)
      : "Account " + (index + 1),
  city: ["Sofia", "Berlin", "Paris"][index % 3],
}));

const promisedRows = Promise.resolve([
  {
    id: "promise-1",
    name: "Ada Lovelace",
    city: "London",
    privateCode: "analytical-engine",
    excludedCode: "do-not-find",
  },
  {
    id: "promise-2",
    name: "Grace Hopper",
    city: "New York",
    privateCode: "compiler",
    excludedCode: "do-not-find",
  },
  {
    id: "promise-3",
    name: "Katherine Johnson",
    city: "White Sulphur Springs",
    privateCode: "orbital-mechanics",
    excludedCode: "do-not-find",
  },
]);

const composedRows = [
  {
    id: "composed-1",
    name: "Alpha Candidate",
    city: "London",
  },
  {
    id: "composed-2",
    name: "Beta Candidate",
    city: "London",
  },
  {
    id: "composed-3",
    name: "Gamma Candidate",
    city: "Paris",
  },
  {
    id: "composed-4",
    name: "Delta Engineer",
    city: "London",
  },
];

const composedPromisedRows = Promise.resolve({
  data: composedRows,
  count: 40,
});
const composedPromisedArrayRows = Promise.resolve(composedRows);

type RemoteCall = {
  keys: string[];
  limit: number | null;
  searchValue: string | null;
  skip: number | null;
};

export default function SearchDataSourceCompatPage() {
  const [remoteCalls, setRemoteCalls] = React.useState<RemoteCall[]>([]);
  const [remoteFilteredCount, setRemoteFilteredCount] = React.useState(0);
  const [promiseFilteredCount, setPromiseFilteredCount] = React.useState(0);
  const [composedPromiseFilteredCount, setComposedPromiseFilteredCount] =
    React.useState(0);
  const [
    composedPromiseArrayFilteredCount,
    setComposedPromiseArrayFilteredCount,
  ] = React.useState(0);
  const [privateBridgeExposed, setPrivateBridgeExposed] = React.useState<
    boolean | null
  >(null);
  const [, setRequestedRemoteSkip] = React.useState<number | null>(null);
  const [originalDataPreserved, setOriginalDataPreserved] = React.useState<
    boolean | null
  >(null);

  const remoteDataSource = React.useCallback(
    async (args: TypeDataSourceArgs) => {
      const searchValue = args.searchValue?.trim().toLocaleLowerCase() ?? "";
      const matchingRows = searchValue
        ? remoteRows.filter((row) =>
            [row.id, row.name, row.city]
              .join(" ")
              .toLocaleLowerCase()
              .includes(searchValue)
          )
        : remoteRows;
      const skip = args.skip ?? 0;
      const limit = args.limit ?? matchingRows.length;

      setRemoteCalls((current) => [
        ...current,
        {
          keys: Object.keys(args).sort(),
          limit: args.limit ?? null,
          searchValue: args.searchValue ?? null,
          skip: args.skip ?? null,
        },
      ]);

      return {
        data: matchingRows.slice(skip, skip + limit),
        count: matchingRows.length,
      };
    },
    []
  );

  const reportSelection = React.useCallback(
    (config: TypeOnSelectionChangeArg) => {
      setOriginalDataPreserved(config.originalData === remoteDataSource);
    },
    [remoteDataSource]
  );

  const inspectPromiseApi = React.useCallback(
    (apiRef: React.MutableRefObject<TypeComputedProps | null> | null) => {
      if (!apiRef) return;
      const api = apiRef.current;
      const privateKey = "__rdgSearchController";
      const initialProps = api?.initialProps;
      const virtualListProps = api?.getVirtualList().props;

      setPrivateBridgeExposed(
        Boolean(
          api &&
          (privateKey in api ||
            (typeof initialProps === "object" &&
              initialProps != null &&
              privateKey in initialProps) ||
            (typeof virtualListProps === "object" &&
              virtualListProps != null &&
              privateKey in virtualListProps))
        )
      );
    },
    []
  );

  const lastRemoteCall = remoteCalls.at(-1);

  return (
    <main className="grid gap-6 xl:grid-cols-2">
      <section
        className="flex h-[520px] min-h-0 flex-col gap-3 rounded-lg border bg-background p-4"
        data-testid="remote-search-scope"
      >
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span>
            Calls:{" "}
            <output data-testid="search-remote-call-count">
              {remoteCalls.length}
            </output>
          </span>
          <span>
            Last skip:{" "}
            <output data-testid="search-remote-skip">
              {lastRemoteCall?.skip ?? "pending"}
            </output>
          </span>
          <span>
            Last search:{" "}
            <output data-testid="search-remote-value">
              {lastRemoteCall?.searchValue ?? ""}
            </output>
          </span>
          <span>
            Filtered:{" "}
            <output data-testid="search-remote-filtered-count">
              {remoteFilteredCount}
            </output>
          </span>
          <output className="sr-only" data-testid="search-remote-keys">
            {lastRemoteCall?.keys.join(",") ?? ""}
          </output>
          <output data-testid="search-original-data-preserved">
            {originalDataPreserved == null
              ? "pending"
              : String(originalDataPreserved)}
          </output>
        </div>

        <RDGSearchProvider>
          <RDGSearchBar />
          <ReactDataGrid
            theme="dark"
            idProperty="id"
            columns={columns}
            dataSource={remoteDataSource}
            columnOrder={columnOrder}
            pagination="remote"
            skip={5}
            defaultLimit={5}
            onSkipChange={setRequestedRemoteSkip}
            pageSizes={[5]}
            filteredRowsCount={setRemoteFilteredCount}
            checkboxColumn
            virtualized={false}
            allowMobileTransform
            enableFiltering={false}
            onSelectionChange={reportSelection}
          />
        </RDGSearchProvider>
      </section>

      <section
        className="flex h-[520px] min-h-0 flex-col gap-3 rounded-lg border bg-background p-4"
        data-testid="promise-search-scope"
      >
        <div className="text-xs text-muted-foreground">
          Filtered:{" "}
          <output data-testid="search-promise-filtered-count">
            {promiseFilteredCount}
          </output>
          <output className="sr-only" data-testid="search-private-api-leak">
            {privateBridgeExposed == null
              ? "pending"
              : String(privateBridgeExposed)}
          </output>
        </div>

        <RDGSearchProvider>
          <RDGSearchBar debounceMs={0} />
          <RDGSearchBar ariaLabel="Mirror search" debounceMs={250} />
          <div className="min-h-0 flex-1">
            <RDGSearchTarget>
              <ReactDataGrid
                idProperty="id"
                columns={columns}
                dataSource={promisedRows}
                columnOrder={columnOrder}
                pagination="local"
                defaultSkip={2}
                defaultLimit={1}
                pageSizes={[1]}
                filteredRowsCount={setPromiseFilteredCount}
                handle={inspectPromiseApi}
                virtualized={false}
                enableFiltering={false}
              />
            </RDGSearchTarget>
          </div>
        </RDGSearchProvider>
      </section>

      <section
        className="flex h-[520px] min-h-0 flex-col gap-3 rounded-lg border bg-background p-4"
        data-testid="composed-promise-search-scope"
      >
        <div className="text-xs text-muted-foreground">
          Filtered:{" "}
          <output data-testid="search-composed-promise-filtered-count">
            {composedPromiseFilteredCount}
          </output>
        </div>

        <RDGSearchProvider>
          <RDGSearchBar debounceMs={0} />
          <div className="min-h-0 flex-1">
            <RDGSearchTarget>
              <ReactDataGrid
                idProperty="id"
                columns={columns}
                dataSource={composedPromisedRows}
                columnOrder={columnOrder}
                pagination="local"
                defaultLimit={1}
                pageSizes={[1]}
                defaultFilterValue={[
                  {
                    name: "name",
                    operator: "contains",
                    type: "string",
                    value: "a",
                    active: true,
                  },
                  {
                    name: "city",
                    operator: "contains",
                    type: "string",
                    value: "London",
                    active: true,
                  },
                ]}
                defaultSortInfo={{ name: "name", dir: -1 }}
                filteredRowsCount={setComposedPromiseFilteredCount}
                virtualized={false}
                enableFiltering
              />
            </RDGSearchTarget>
          </div>
        </RDGSearchProvider>
      </section>

      <section
        className="flex h-[520px] min-h-0 flex-col gap-3 rounded-lg border bg-background p-4"
        data-testid="composed-promise-array-search-scope"
      >
        <div className="text-xs text-muted-foreground">
          Filtered:{" "}
          <output data-testid="search-composed-promise-array-filtered-count">
            {composedPromiseArrayFilteredCount}
          </output>
        </div>

        <RDGSearchProvider>
          <RDGSearchBar debounceMs={0} />
          <div className="min-h-0 flex-1">
            <RDGSearchTarget>
              <ReactDataGrid
                idProperty="id"
                columns={columns}
                dataSource={composedPromisedArrayRows}
                columnOrder={columnOrder}
                pagination="local"
                defaultLimit={1}
                pageSizes={[1]}
                defaultFilterValue={[
                  {
                    name: "city",
                    operator: "contains",
                    type: "string",
                    value: "London",
                    active: true,
                  },
                ]}
                defaultSortInfo={{ name: "name", dir: -1 }}
                filteredRowsCount={setComposedPromiseArrayFilteredCount}
                virtualized={false}
                enableFiltering
              />
            </RDGSearchTarget>
          </div>
        </RDGSearchProvider>
      </section>
    </main>
  );
}
