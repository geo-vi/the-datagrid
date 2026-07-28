import * as React from "react";

import ReactDataGrid, {
  type TypeColumnResizeInfo,
  type TypeColumns,
  type TypeComputedProps,
} from "../../src/main";

type Row = Record<string, string | number> & { id: number };

const rows: Row[] = Array.from({ length: 120 }, (_, index) => ({
  id: index + 1,
  name: `Person ${String(index + 1).padStart(3, "0")}`,
  city: ["Sofia", "London", "New York", "Tokyo"][index % 4]!,
  note:
    index % 3 === 0
      ? `A deliberately longer note for deterministic auto sizing ${index + 1}`
      : `Note ${index + 1}`,
  secret: `secret-${index + 1}`,
}));

function GridFrame(props: {
  children: React.ReactNode;
  testId: string;
  width?: string;
}) {
  return (
    <div
      data-testid={props.testId}
      className="h-[300px] min-w-0 overflow-hidden rounded-lg border bg-background"
      style={{ width: props.width ?? "760px", maxWidth: "100%" }}
    >
      {props.children}
    </div>
  );
}

function UncontrolledOwnershipExample() {
  const [secretVisible, setSecretVisible] = React.useState<boolean | undefined>(
    undefined
  );
  const columns = React.useMemo<TypeColumns>(
    () => [
      {
        name: "id",
        header: "ID",
        defaultWidth: 90,
        hideable: false,
      },
      { name: "name", header: "Name", defaultWidth: 180 },
      { name: "city", header: "City", defaultWidth: 150 },
      {
        name: "secret",
        header: "Secret",
        defaultWidth: 150,
        defaultVisible: false,
        visible: secretVisible,
      },
      {
        name: "note",
        header: "Note",
        defaultWidth: 220,
        defaultHidden: true,
      },
    ],
    [secretVisible]
  );
  const [visibilityEvents, setVisibilityEvents] = React.useState<string[]>([]);

  return (
    <section className="space-y-2" data-testid="uncontrolled-ownership">
      <h2 className="text-lg font-semibold">Uncontrolled column ownership</h2>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="control-secret-hidden"
          onClick={() => setSecretVisible(false)}
        >
          Control secret hidden
        </button>
        <button
          type="button"
          data-testid="release-secret-visibility"
          onClick={() => setSecretVisible(undefined)}
        >
          Release secret visibility
        </button>
      </div>
      <output data-testid="uncontrolled-visibility-events">
        {JSON.stringify(visibilityEvents)}
      </output>
      <GridFrame testId="uncontrolled-grid">
        <ReactDataGrid
          idProperty="id"
          columns={columns}
          dataSource={rows}
          defaultColumnOrder={["city", "id", "name", "secret", "note"]}
          enableFiltering
          virtualized
          onColumnVisibleChange={({ column, visible }) =>
            setVisibilityEvents((current) => [
              ...current,
              `${column.id ?? column.name}:${visible}`,
            ])
          }
        />
      </GridFrame>
    </section>
  );
}

function ControlledOwnershipExample() {
  const [columnOrder, setColumnOrder] = React.useState(["id", "name", "city"]);
  const [cityVisible, setCityVisible] = React.useState(true);
  const [orderProposals, setOrderProposals] = React.useState<string[][]>([]);
  const [visibilityProposals, setVisibilityProposals] = React.useState<
    { columnId: string; visible: boolean }[]
  >([]);
  const columns = React.useMemo<TypeColumns>(
    () => [
      { name: "id", header: "Controlled ID", width: 110, hideable: false },
      { name: "name", header: "Controlled Name", width: 200 },
      {
        name: "city",
        header: "Controlled City",
        width: 180,
        visible: cityVisible,
      },
    ],
    [cityVisible]
  );

  return (
    <section className="space-y-2" data-testid="controlled-ownership">
      <h2 className="text-lg font-semibold">Controlled column ownership</h2>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="apply-order-proposal"
          onClick={() => {
            const proposal = orderProposals.at(-1);
            if (proposal) setColumnOrder(proposal);
          }}
        >
          Apply order proposal
        </button>
        <button
          type="button"
          data-testid="apply-visibility-proposal"
          onClick={() => {
            const proposal = visibilityProposals.at(-1);
            if (proposal?.columnId === "city") {
              setCityVisible(proposal.visible);
            }
          }}
        >
          Apply visibility proposal
        </button>
      </div>
      <output data-testid="controlled-order">
        {JSON.stringify(columnOrder)}
      </output>
      <output data-testid="controlled-order-proposals">
        {JSON.stringify(orderProposals)}
      </output>
      <output data-testid="controlled-visibility-proposals">
        {JSON.stringify(visibilityProposals)}
      </output>
      <GridFrame testId="controlled-grid">
        <ReactDataGrid
          idProperty="id"
          columns={columns}
          dataSource={rows}
          columnOrder={columnOrder}
          onColumnOrderChange={(nextOrder) =>
            setOrderProposals((current) => [...current, nextOrder])
          }
          onColumnVisibleChange={({ column, visible }) =>
            setVisibilityProposals((current) => [
              ...current,
              { columnId: column.id ?? column.name ?? "", visible },
            ])
          }
          enableFiltering={false}
          virtualized={false}
        />
      </GridFrame>
    </section>
  );
}

function SizingOwnershipExample() {
  const apiRef = React.useRef<TypeComputedProps | null>(null);
  const [shareSpace, setShareSpace] = React.useState(true);
  const [apiSnapshot, setApiSnapshot] = React.useState<Record<
    string,
    unknown
  > | null>(null);
  const [resizeEvents, setResizeEvents] = React.useState<
    { id: string; width?: number; flex?: number }[]
  >([]);
  const [batchEvents, setBatchEvents] = React.useState<
    { entries: number; reservedViewportWidth: number }[]
  >([]);
  const columns = React.useMemo<TypeColumns>(
    () => [
      {
        name: "id",
        header: "Sized ID",
        defaultWidth: 120,
        minWidth: 90,
        maxWidth: 220,
      },
      { name: "name", header: "Sized Name" },
      {
        name: "city",
        header: "Default keep-flex City",
        defaultFlex: 1,
        minWidth: 100,
      },
      {
        name: "note",
        header: "Note",
        defaultFlex: 1,
        keepFlex: false,
        minWidth: 120,
      },
    ],
    []
  );
  const run = (callback: (api: TypeComputedProps) => void) => {
    if (apiRef.current) callback(apiRef.current);
  };

  return (
    <section className="space-y-2" data-testid="sizing-ownership">
      <h2 className="text-lg font-semibold">Sizing and resize ownership</h2>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="set-column-sizes"
          onClick={() =>
            run((api) =>
              api.setColumnSizes?.({
                id: 175,
                name: 205,
                city: 160,
                note: 230,
              })
            )
          }
        >
          Set sizes
        </button>
        <button
          type="button"
          data-testid="set-column-flexes"
          onClick={() =>
            run((api) => api.setColumnFlexes?.({ city: 3, note: 1 }))
          }
        >
          Set flexes
        </button>
        <button
          type="button"
          data-testid="auto-size-city"
          onClick={() => run((api) => api.setColumnSizeAuto?.("city"))}
        >
          Auto size city
        </button>
        <button
          type="button"
          data-testid="auto-size-all"
          onClick={() => run((api) => api.setColumnsSizesAuto?.())}
        >
          Auto size all
        </button>
        <button
          type="button"
          data-testid="size-to-fit"
          onClick={() => run((api) => api.setColumnSizesToFit?.())}
        >
          Size to fit
        </button>
        <button
          type="button"
          data-testid="imperative-batch"
          onClick={() =>
            run((api) => {
              const idColumn = api.getColumnBy?.("id", { initial: true });
              const nameColumn = api.getColumnBy?.("name", { initial: true });
              const cityColumn = api.getColumnBy?.("city", { initial: true });
              if (!idColumn || !nameColumn || !cityColumn) return;
              api.onBatchColumnResize?.(
                [
                  { column: idColumn, width: 190 },
                  { column: nameColumn, width: 210 },
                  { column: cityColumn, flex: 2 },
                ],
                { reservedViewportWidth: 7 }
              );
            })
          }
        >
          Batch resize
        </button>
        <button
          type="button"
          data-testid="toggle-share-space"
          onClick={() => setShareSpace((current) => !current)}
        >
          Share space: {String(shareSpace)}
        </button>
        <button
          type="button"
          data-testid="snapshot-column-api"
          onClick={() =>
            run((api) =>
              setApiSnapshot({
                columnFlexes: api.columnFlexes,
                columnSizes: api.columnSizes,
                reservedViewportWidth: api.reservedViewportWidth,
              })
            )
          }
        >
          Snapshot API
        </button>
      </div>
      <output data-testid="resize-events">
        {JSON.stringify(resizeEvents)}
      </output>
      <output data-testid="batch-events">{JSON.stringify(batchEvents)}</output>
      <output data-testid="column-api-snapshot">
        {JSON.stringify(apiSnapshot)}
      </output>
      <GridFrame testId="sizing-grid" width="820px">
        <ReactDataGrid
          idProperty="id"
          columns={columns}
          dataSource={rows}
          columnDefaultWidth={165}
          columnMinWidth={80}
          columnMaxWidth={280}
          columnResizeHandleWidth={32}
          columnResizeProxyWidth={7}
          shareSpaceOnResize={shareSpace}
          enableFiltering={false}
          enableColumnAutosize
          virtualized={false}
          onReady={(ref) => {
            apiRef.current = ref.current;
          }}
          onColumnResize={(info: TypeColumnResizeInfo) =>
            setResizeEvents((current) => [
              ...current,
              {
                id: info.column.id ?? info.column.name ?? "",
                width: info.width,
                flex: info.flex,
              },
            ])
          }
          onBatchColumnResize={(info, context) =>
            setBatchEvents((current) => [
              ...current,
              {
                entries: info.length,
                reservedViewportWidth: context.reservedViewportWidth,
              },
            ])
          }
        />
      </GridFrame>
    </section>
  );
}

function RootSizingPrecedenceExample() {
  const [columnSizes, setColumnSizes] = React.useState<Record<
    string,
    number
  > | null>(null);
  const columns = React.useMemo<TypeColumns>(
    () => [
      { name: "id", header: "Root fallback" },
      {
        name: "name",
        header: "Column default",
        defaultWidth: 210,
      },
      {
        name: "city",
        header: "Column minimum",
        minWidth: 190,
      },
      {
        name: "note",
        header: "Column maximum",
        maxWidth: 130,
      },
    ],
    []
  );

  return (
    <section className="space-y-2" data-testid="root-sizing-precedence">
      <h2 className="text-lg font-semibold">Root sizing precedence</h2>
      <output data-testid="root-sizing-column-sizes">
        {JSON.stringify(columnSizes)}
      </output>
      <GridFrame testId="root-sizing-grid" width="760px">
        <ReactDataGrid
          idProperty="id"
          columns={columns}
          dataSource={rows}
          columnDefaultWidth={165}
          columnMinWidth={80}
          columnMaxWidth={260}
          enableColumnAutosize={false}
          enableFiltering={false}
          virtualized={false}
          onReady={(ref) => {
            setColumnSizes(ref.current?.columnSizes ?? null);
          }}
        />
      </GridFrame>
    </section>
  );
}

function VirtualizedStressExample(props: { performanceMode: boolean }) {
  const columnCount = 36;
  const rowCount = props.performanceMode ? 10_000 : 500;
  const columns = React.useMemo<TypeColumns>(
    () =>
      Array.from({ length: columnCount }, (_, index) => ({
        name: `field${index}`,
        header: `Field ${index}`,
        defaultWidth: 140,
        editable: index === 1,
        locked: index === columnCount - 1 ? ("end" as const) : false,
      })),
    []
  );
  const stressRows = React.useMemo(
    () =>
      Array.from({ length: rowCount }, (_, rowIndex) => {
        const row: Row = { id: rowIndex };
        for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
          row[`field${columnIndex}`] =
            `R${rowIndex}-C${columnIndex}-${columnIndex % 5}`;
        }
        return row;
      }),
    [rowCount]
  );

  return (
    <section
      className="space-y-2"
      data-testid="issue-35-stress"
      data-row-count={rowCount}
      data-column-count={columnCount}
    >
      <h2 className="text-lg font-semibold">
        Virtualized reorder/visibility/resize stress
      </h2>
      <GridFrame testId="stress-grid" width="980px">
        <ReactDataGrid
          idProperty="id"
          columns={columns}
          dataSource={stressRows}
          enableFiltering
          virtualized
          virtualizeColumns
          rowHeight={36}
          columnResizeHandleWidth={28}
          columnResizeProxyWidth={5}
          onReady={(ref) => {
            (
              window as typeof window & {
                __issue35StressApi?: TypeComputedProps | null;
              }
            ).__issue35StressApi = ref.current;
            performance.mark("issue-35-stress-ready");
          }}
        />
      </GridFrame>
    </section>
  );
}

export default function Issue35ColumnStateCompatPage() {
  const performanceMode =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("scenario") ===
      "performance";

  if (performanceMode) {
    return (
      <main className="min-h-screen p-4">
        <VirtualizedStressExample performanceMode />
      </main>
    );
  }

  return (
    <main className="min-h-screen space-y-8 p-4" data-testid="issue-35-page">
      <h1 className="text-2xl font-bold">Issue #35 column-state parity</h1>
      <UncontrolledOwnershipExample />
      <ControlledOwnershipExample />
      <RootSizingPrecedenceExample />
      <SizingOwnershipExample />
      <VirtualizedStressExample performanceMode={false} />
    </main>
  );
}
