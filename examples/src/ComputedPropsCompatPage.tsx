import * as React from "react";

import ReactDataGrid, {
  type TypeColumns,
  type TypeComputedProps,
} from "../../src/main";
import { Button } from "../../src/components/ui/button";

const columns: TypeColumns = [
  { name: "id", header: "ID", defaultWidth: 80, sortable: true },
  { name: "name", header: "Name", defaultWidth: 180, sortable: true },
  { name: "city", header: "City", defaultWidth: 160, sortable: true },
];

const baseRows = [
  { id: 1, name: "Ada Lovelace", city: "London" },
  { id: 2, name: "Grace Hopper", city: "New York" },
  { id: 3, name: "Alan Turing", city: "Manchester" },
  { id: 4, name: "Margaret Hamilton", city: "Paoli" },
  { id: 5, name: "Katherine Johnson", city: "White Sulphur Springs" },
  { id: 6, name: "Barbara Liskov", city: "Los Angeles" },
  { id: 7, name: "Radia Perlman", city: "Portsmouth" },
  { id: 8, name: "Anita Borg", city: "Chicago" },
  { id: 9, name: "Donald Knuth", city: "Milwaukee" },
  { id: 10, name: "Tim Berners-Lee", city: "London" },
  { id: 11, name: "Frances Allen", city: "Lima" },
  { id: 12, name: "Linus Torvalds", city: "Helsinki" },
];

const rows = [
  ...baseRows,
  ...Array.from({ length: 28 }, (_, index) => ({
    id: index + 13,
    name: `Data Compat ${index + 13}`,
    city: ["Sofia", "Berlin", "Prague", "Madrid"][index % 4],
  })),
];

const virtualListCompatKeys = [
  "getVisibleRange",
  "getVisibleCount",
  "getScrollSize",
  "getClientSize",
  "getScrollHeight",
  "getTotalRowHeight",
  "getRows",
  "scrollToIndex",
  "smoothScrollTo",
  "adjustHeights",
];

type CompatStatus = {
  apiReady: string;
  hasPublicApi: string;
  columnsMap: string;
  columnByName: string;
  cityVisible: string;
  visibleColumns: string;
  sortInfo: string;
  filterValue: string;
  filteredRowsCount: string;
  headerOrder: string;
  domNode: string;
  renderRange: string;
  size: string;
  scrollWorked: string;
  virtualListKeys: string;
  virtualListRange: string;
  virtualListVisibleCount: string;
  virtualListSizes: string;
  virtualListRows: string;
  virtualListScrollWorked: string;
  virtualListTanStackLeak: string;
};

const initialStatus: CompatStatus = {
  apiReady: "false",
  hasPublicApi: "false",
  columnsMap: "",
  columnByName: "",
  cityVisible: "true",
  visibleColumns: "",
  sortInfo: "",
  filterValue: "",
  filteredRowsCount: "",
  headerOrder: "",
  domNode: "",
  renderRange: "",
  size: "",
  scrollWorked: "false",
  virtualListKeys: "",
  virtualListRange: "missing",
  virtualListVisibleCount: "",
  virtualListSizes: "",
  virtualListRows: "",
  virtualListScrollWorked: "false",
  virtualListTanStackLeak: "unknown",
};

const visibilityProbeRows = [
  {
    id: "visibility-row",
    locked: "Locked column",
    alpha: "Imperative column",
    beta: "Prop-driven column",
  },
];

function VisibilityReconciliationProbe() {
  const apiRef = React.useRef<TypeComputedProps | null>(null);
  const [apiReady, setApiReady] = React.useState(false);
  const [betaVisible, setBetaVisible] = React.useState(true);
  const stableColumns = React.useMemo<TypeColumns>(
    () => [
      {
        name: "locked",
        header: "Locked",
        defaultWidth: 150,
        hideable: false,
      },
      { name: "alpha", header: "Alpha", defaultWidth: 170 },
    ],
    []
  );
  const visibilityColumns = React.useMemo<TypeColumns>(
    () => [
      ...stableColumns,
      {
        name: "beta",
        header: "Beta",
        defaultWidth: 190,
        visible: betaVisible,
      },
    ],
    [betaVisible, stableColumns]
  );

  return (
    <section
      className="rounded-3xl border bg-background/95 p-4 shadow-sm"
      data-testid="visibility-reconciliation-probe"
    >
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Button
          type="button"
          data-testid="visibility-hide-locked"
          disabled={!apiReady}
          onClick={() => apiRef.current?.setColumnVisible?.("locked", false)}
        >
          Imperatively hide locked
        </Button>
        <Button
          type="button"
          data-testid="visibility-hide-alpha"
          disabled={!apiReady}
          onClick={() => apiRef.current?.setColumnVisible?.("alpha", false)}
        >
          Imperatively hide alpha
        </Button>
        <Button
          type="button"
          data-testid="visibility-toggle-beta-prop"
          onClick={() => setBetaVisible((current) => !current)}
        >
          Toggle beta visible prop
        </Button>
        <output data-testid="visibility-beta-prop">
          {String(betaVisible)}
        </output>
      </div>
      <div className="h-[220px] min-h-0">
        <ReactDataGrid
          idProperty="id"
          columns={visibilityColumns}
          dataSource={visibilityProbeRows}
          columnOrder={["locked", "alpha", "beta"]}
          virtualized={false}
          onReady={(ref) => {
            apiRef.current = ref.current;
            setApiReady(Boolean(ref.current));
          }}
        />
      </div>
    </section>
  );
}

export default function ComputedPropsCompatPage() {
  const apiRef = React.useRef<TypeComputedProps | null>(null);
  const [apiReady, setApiReady] = React.useState(false);
  const [columnOrder, setColumnOrder] = React.useState<string[]>([
    "id",
    "name",
    "city",
  ]);
  const [filteredCount, setFilteredCount] = React.useState<number>(rows.length);
  const [status, setStatus] = React.useState<CompatStatus>(initialStatus);

  const collectStatus = React.useCallback(() => {
    const api = apiRef.current;
    if (!api) return;

    const sortInfo = api.getSortInfo();
    const filterEntry = api.getColumnFilterValue?.("name");
    const headerCells = Array.from(
      api
        .getHeader?.()
        ?.querySelectorAll<HTMLElement>('[data-slot="grid-header-cell"]') ?? []
    );
    const renderRange = api.getRenderRange?.();
    const virtualList = api.getVirtualList();
    const virtualListRange = virtualList?.getVisibleRange?.();
    const virtualListRows = virtualList?.getRows?.();
    const scrollSize = virtualList?.getScrollSize?.();
    const clientSize = virtualList?.getClientSize?.();

    setStatus({
      apiReady: "true",
      hasPublicApi: String(api.publicAPI === api),
      columnsMap: Object.keys(api.columnsMap ?? {}).join(","),
      columnByName: String(api.getColumnBy?.("name")?.name ?? ""),
      cityVisible: String(api.isColumnVisible?.("city") ?? true),
      visibleColumns: (api.visibleColumns ?? [])
        .map((column) => String(column.id ?? column.name ?? ""))
        .join(","),
      sortInfo: Array.isArray(sortInfo)
        ? sortInfo.map((entry) => `${entry.name}:${entry.dir}`).join(",")
        : sortInfo
          ? `${sortInfo.name}:${sortInfo.dir}`
          : "null",
      filterValue: String(filterEntry?.value ?? ""),
      filteredRowsCount: String(filteredCount),
      headerOrder: headerCells
        .map((cell) => cell.dataset.columnId ?? "")
        .join(","),
      domNode: String(
        api.getDOMNodeForRowIndex?.(0)?.getAttribute("data-slot") ?? ""
      ),
      renderRange: renderRange
        ? `${renderRange.from}:${renderRange.to}`
        : "missing",
      size: `${api.size?.width ?? 0}x${api.size?.height ?? 0}`,
      scrollWorked: String((api.getScrollTop?.() ?? 0) > 0),
      virtualListKeys: virtualListCompatKeys
        .filter((key) => Boolean(virtualList && key in virtualList))
        .join(","),
      virtualListRange: virtualListRange
        ? `${virtualListRange.from}:${virtualListRange.to}`
        : "missing",
      virtualListVisibleCount: String(virtualList?.getVisibleCount?.() ?? ""),
      virtualListSizes: `${scrollSize?.height ?? 0}x${clientSize?.height ?? 0}`,
      virtualListRows: String(virtualListRows?.length ?? ""),
      virtualListScrollWorked: String((virtualList?.scrollTopPos ?? 0) > 0),
      virtualListTanStackLeak: String(
        Boolean(
          virtualList &&
          ("getVirtualItems" in virtualList ||
            "measurementsCache" in virtualList)
        )
      ),
    });
  }, [filteredCount]);

  React.useEffect(() => {
    if (!apiReady) return;
    collectStatus();
  }, [apiReady, collectStatus]);

  const handleReady = React.useCallback(
    (ref: React.MutableRefObject<TypeComputedProps | null>) => {
      apiRef.current = ref.current;
      setApiReady((current) => current || Boolean(ref.current));
    },
    []
  );

  const runCompatCheck = React.useCallback(() => {
    const api = apiRef.current;
    if (!api) return;

    api.setColumnSortInfo?.("name", 1);
    api.setColumnFilterValue?.("name", "a");
    api.setColumnVisible?.("city", false);
    api.setColumnOrder?.(["name", "id"]);
    api.scrollToIndex?.(8);
    api.getVirtualList().scrollToIndex(8);
    api.getVirtualList().smoothScrollTo(8);

    window.setTimeout(() => {
      collectStatus();
    }, 100);
  }, [collectStatus]);

  return (
    <main className="flex flex-col gap-6">
      <section className="rounded-3xl border bg-background/95 p-6 shadow-sm">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Runtime compat
          </p>
          <h2 className="text-2xl font-semibold tracking-tight">
            TypeComputedProps compatibility check
          </h2>
          <p className="max-w-3xl text-sm text-muted-foreground">
            This page exercises the widened computed-props ref exposed through
            <code className="px-1"> onReady </code>
            and records a snapshot after invoking representative Inovua-style
            methods.
          </p>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button
            type="button"
            data-testid="compat-run"
            onClick={runCompatCheck}
          >
            Run compat checks
          </Button>
        </div>
      </section>

      <section
        data-testid="compat-status"
        className="grid gap-3 rounded-3xl border bg-card/80 p-6 shadow-sm md:grid-cols-2 xl:grid-cols-3"
      >
        {Object.entries(status).map(([key, value]) => (
          <div
            key={key}
            className="rounded-2xl border bg-background/70 p-3"
            data-testid={`compat-${key}`}
          >
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {key}
            </div>
            <div className="mt-2 break-all font-mono text-sm">{value}</div>
          </div>
        ))}
      </section>

      <section className="rounded-3xl border bg-background/95 p-4 shadow-sm">
        <div className="h-[360px] min-h-0">
          <ReactDataGrid
            idProperty="id"
            columns={columns}
            dataSource={rows}
            columnOrder={columnOrder}
            enableColumnFilterContextMenu
            enableColumnAutosize
            skipHeaderOnAutoSize={false}
            enableFiltering
            filteredRowsCount={setFilteredCount}
            onColumnOrderChange={setColumnOrder}
            virtualized
            columnUserSelect
            showColumnMenuTool={false}
            onReady={handleReady}
          />
        </div>
      </section>

      <VisibilityReconciliationProbe />
    </main>
  );
}
