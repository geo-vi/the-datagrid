import * as React from "react";

import ReactDataGrid, {
  type TypeColumns,
  type TypeComputedProps,
  type TypeDataGridProps,
  type TypeEditInfo,
  type TypeFilterValue,
  type TypeOnSelectionChangeArg,
  type TypeRowStyleArgs,
  type TypeSingleFilterValue,
} from "../../src/main";
import { Button } from "../../src/components/ui/button";
import { useExamplesUi } from "./App";

type PendingScenario =
  | "filter-callback"
  | "selection-enable"
  | "selection-derived"
  | "selection-disable"
  | "selection-disable-controlled"
  | "selection-callback-only"
  | "columns-default-15"
  | "columns-default-14"
  | "columns-threshold-at"
  | "columns-threshold-below"
  | "columns-force-on"
  | "columns-force-off"
  | "columns-function-height"
  | "columns-natural-height"
  | "columns-scroll"
  | "empty-literal"
  | "empty-key"
  | "empty-node"
  | "empty-function"
  | "empty-null"
  | "empty-false"
  | "empty-string"
  | "empty-loading"
  | "empty-filtered"
  | "empty-remote"
  | "empty-mobile"
  | "row-height-authority"
  | "editing-column-coordinate"
  | "editing-row-coordinate"
  | "zebra-imperative";

const scenarios = new Set<PendingScenario>([
  "filter-callback",
  "selection-enable",
  "selection-derived",
  "selection-disable",
  "selection-disable-controlled",
  "selection-callback-only",
  "columns-default-15",
  "columns-default-14",
  "columns-threshold-at",
  "columns-threshold-below",
  "columns-force-on",
  "columns-force-off",
  "columns-function-height",
  "columns-natural-height",
  "columns-scroll",
  "empty-literal",
  "empty-key",
  "empty-node",
  "empty-function",
  "empty-null",
  "empty-false",
  "empty-string",
  "empty-loading",
  "empty-filtered",
  "empty-remote",
  "empty-mobile",
  "row-height-authority",
  "editing-column-coordinate",
  "editing-row-coordinate",
  "zebra-imperative",
]);

type PendingColumnFilterValueChange = {
  filterValue: TypeSingleFilterValue;
  columnId: string;
  columnIndex: number;
  cellProps?: Record<string, unknown>;
};

type PendingCompatGridProps = TypeDataGridProps & {
  onColumnFilterValueChange?: (event: PendingColumnFilterValueChange) => void;
  enableSelection?: boolean;
  virtualizeColumnsThreshold?: number;
  virtualizeColumns?: boolean;
  emptyText?: React.ReactNode | (() => React.ReactNode);
};

const PendingCompatGrid =
  ReactDataGrid as React.ComponentType<PendingCompatGridProps>;

const baseRows = [
  { id: "row-1", name: "Ada Lovelace", team: "Analytics" },
  { id: "row-2", name: "Grace Hopper", team: "Compilers" },
  { id: "row-3", name: "Katherine Johnson", team: "Flight" },
];

const baseColumns: TypeColumns = [
  { name: "id", header: "ID", width: 110 },
  { name: "name", header: "Name", width: 220 },
  { name: "team", header: "Team", width: 180 },
];

function readScenario(): PendingScenario {
  if (typeof window === "undefined") return "filter-callback";
  const value = new URLSearchParams(window.location.search).get("scenario");
  return scenarios.has(value as PendingScenario)
    ? (value as PendingScenario)
    : "filter-callback";
}

function FixtureFrame(props: {
  children: React.ReactNode;
  className?: string;
  testId?: string;
}) {
  return (
    <div
      className={`h-[320px] w-[620px] max-w-full min-w-0 overflow-hidden rounded-xl border bg-background ${props.className ?? ""}`}
      data-testid={props.testId ?? "pending-grid-frame"}
    >
      {props.children}
    </div>
  );
}

function CommonPendingGrid(props: PendingCompatGridProps) {
  const { gridTheme, i18n, resizable, showCellBorders } = useExamplesUi();

  return (
    <PendingCompatGrid
      enableColumnFilterContextMenu={false}
      enableColumnAutosize={false}
      skipHeaderOnAutoSize={false}
      enableFiltering={false}
      columnUserSelect="text"
      showColumnMenuTool={false}
      {...props}
      theme={props.theme ?? gridTheme}
      i18n={props.i18n ?? i18n}
      resizable={props.resizable ?? resizable}
      showCellBorders={props.showCellBorders ?? showCellBorders}
    />
  );
}

function JsonOutput(props: { testId: string; value: unknown }) {
  return (
    <output
      className="block max-h-52 overflow-auto whitespace-pre-wrap rounded-lg border bg-muted/25 p-3 font-mono text-xs"
      data-testid={props.testId}
    >
      {JSON.stringify(props.value, null, 2)}
    </output>
  );
}

function PendingNameFilterEditor(props: Record<string, unknown>) {
  const onChange = props.onChange as ((value: unknown) => void) | undefined;

  return (
    <input
      className="h-8 w-full rounded-md border bg-background px-2 text-sm"
      data-testid="pending-name-filter"
      disabled={Boolean(props.disabled)}
      value={String(props.value ?? "")}
      onChange={(event) => onChange?.(event.target.value)}
    />
  );
}

type FilterLogEvent =
  | {
      kind: "column";
      columnId: string;
      columnIndex: number;
      filterValue: Pick<
        TypeSingleFilterValue,
        "name" | "type" | "operator" | "value"
      > & { active: boolean | null };
      cellPropsPresent: boolean;
      cellPropsId: string | null;
      cellPropsColumnIndex: number | null;
    }
  | { kind: "aggregate"; filterValue: TypeFilterValue };

function sanitizeColumnFilterEvent(
  event: PendingColumnFilterValueChange
): FilterLogEvent {
  const cellProps = event.cellProps;
  const nestedColumn = cellProps?.column as Record<string, unknown> | undefined;
  const rawId =
    cellProps?.id ??
    cellProps?.columnId ??
    nestedColumn?.id ??
    nestedColumn?.name;
  const rawIndex =
    cellProps?.computedVisibleIndex ?? cellProps?.columnIndex ?? null;

  return {
    kind: "column",
    columnId: String(event.columnId),
    columnIndex: event.columnIndex,
    filterValue: {
      name: event.filterValue.name,
      type: event.filterValue.type,
      operator: event.filterValue.operator,
      value: event.filterValue.value,
      active: event.filterValue.active ?? null,
    },
    cellPropsPresent: Boolean(cellProps),
    cellPropsId: rawId == null ? null : String(rawId),
    cellPropsColumnIndex: typeof rawIndex === "number" ? rawIndex : null,
  };
}

const defaultNameFilter: TypeSingleFilterValue = {
  name: "name",
  type: "string",
  operator: "contains",
  value: "Ada",
};

function FilterCallbackScenario() {
  const apiRef = React.useRef<TypeComputedProps | null>(null);
  const [events, setEvents] = React.useState<FilterLogEvent[]>([]);
  const columns = React.useMemo<TypeColumns>(
    () => [
      baseColumns[0]!,
      {
        ...baseColumns[1]!,
        filterable: true,
        filterEditor: PendingNameFilterEditor,
      },
      { ...baseColumns[2]!, filterable: true },
    ],
    []
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          data-testid="set-column-filter"
          onClick={() =>
            apiRef.current?.setColumnFilterValue?.("name", "Grace")
          }
        >
          Set Name filter
        </Button>
        <Button
          type="button"
          data-testid="clear-column-filter"
          onClick={() => apiRef.current?.clearColumnFilter?.("name")}
        >
          Clear Name filter
        </Button>
      </div>
      <JsonOutput testId="filter-event-log" value={events} />
      <FixtureFrame>
        <CommonPendingGrid
          idProperty="id"
          columns={columns}
          dataSource={baseRows}
          columnOrder={["id", "name", "team"]}
          virtualized={false}
          enableFiltering
          enableColumnFilterContextMenu
          defaultFilterValue={[defaultNameFilter]}
          onColumnFilterValueChange={(event) =>
            setEvents((current) => [
              ...current,
              sanitizeColumnFilterEvent(event),
            ])
          }
          onFilterValueChange={(filterValue) =>
            setEvents((current) => [
              ...current,
              { kind: "aggregate", filterValue },
            ])
          }
          i18n={{
            noRecords: "No matching rows",
            filter: "Filter",
            clear: "Clear",
            contains: "Contains",
            eq: "Equals",
            operator: "Operator",
          }}
          onReady={(ref) => {
            apiRef.current = ref.current;
          }}
        />
      </FixtureFrame>
    </div>
  );
}

type SelectionMode =
  | "enable"
  | "derived"
  | "disable"
  | "disable-controlled"
  | "callback-only";

function SelectionScenario(props: { mode: SelectionMode }) {
  const [events, setEvents] = React.useState<TypeOnSelectionChangeArg[]>([]);
  const common: PendingCompatGridProps = {
    idProperty: "id",
    columns: baseColumns,
    dataSource: baseRows,
    columnOrder: ["id", "name", "team"],
    virtualized: false,
  };

  if (props.mode === "enable") {
    common.enableSelection = true;
  } else if (props.mode === "derived") {
    common.defaultSelected = {};
  } else if (props.mode === "disable") {
    common.enableSelection = false;
    common.checkboxColumn = true;
    common.checkboxOnlyRowSelect = false;
    common.onSelectionChange = (event) =>
      setEvents((current) => [...current, event]);
  } else if (props.mode === "disable-controlled") {
    common.enableSelection = false;
    common.selected = { "row-1": baseRows[0] };
    common.onSelectionChange = (event) =>
      setEvents((current) => [...current, event]);
  } else {
    common.onSelectionChange = (event) =>
      setEvents((current) => [...current, event]);
  }

  return (
    <div className="space-y-3">
      <JsonOutput testId="selection-event-log" value={events} />
      <FixtureFrame>
        <CommonPendingGrid {...common} />
      </FixtureFrame>
    </div>
  );
}

function LastColumnFilterEditor(props: Record<string, unknown>) {
  const onChange = props.onChange as ((value: unknown) => void) | undefined;

  return (
    <input
      className="h-8 w-full rounded-md border bg-background px-2 text-sm"
      data-testid="last-column-filter"
      value={String(props.value ?? "")}
      onChange={(event) => onChange?.(event.target.value)}
    />
  );
}

type ColumnScenarioConfig = {
  count: number;
  threshold?: number;
  force?: boolean;
  rowHeight: number | ((rowIndex: number) => number) | null;
  interactive?: boolean;
};

function getColumnScenarioConfig(
  scenario: PendingScenario
): ColumnScenarioConfig {
  switch (scenario) {
    case "columns-default-15":
      return { count: 15, rowHeight: 40 };
    case "columns-default-14":
      return { count: 14, rowHeight: 40 };
    case "columns-threshold-at":
      return { count: 20, threshold: 20, rowHeight: 40 };
    case "columns-threshold-below":
      return { count: 20, threshold: 21, rowHeight: 40 };
    case "columns-force-on":
      return { count: 14, threshold: 99, force: true, rowHeight: 40 };
    case "columns-force-off":
      return { count: 20, threshold: 1, force: false, rowHeight: 40 };
    case "columns-function-height":
      return {
        count: 20,
        threshold: 1,
        force: true,
        rowHeight: () => 40,
      };
    case "columns-natural-height":
      return { count: 20, threshold: 1, force: true, rowHeight: null };
    case "columns-scroll":
      return {
        count: 24,
        threshold: 1,
        rowHeight: 40,
        interactive: true,
      };
    default:
      return { count: 20, threshold: 20, rowHeight: 40 };
  }
}

type ColumnStateSnapshot = {
  computedVirtualizeColumns: boolean | null;
  rowStyleVirtualizeColumns: boolean | null;
  rowStyleColumnRenderCount: number | null;
  rowStyleTotalColumnCount: number | null;
};

type EditorVirtualizationSnapshot = {
  columnId: string;
  columnIndex: number;
  virtualizeColumns: boolean | null;
};

function ColumnVirtualizationScenario(props: { scenario: PendingScenario }) {
  const config = getColumnScenarioConfig(props.scenario);
  const apiRef = React.useRef<TypeComputedProps | null>(null);
  const rowStyleSnapshotRef = React.useRef<{
    virtualizeColumns: boolean;
    columnRenderCount: number;
    totalColumnCount: number;
  } | null>(null);
  const [snapshot, setSnapshot] = React.useState<ColumnStateSnapshot>({
    computedVirtualizeColumns: null,
    rowStyleVirtualizeColumns: null,
    rowStyleColumnRenderCount: null,
    rowStyleTotalColumnCount: null,
  });
  const [editorSnapshot, setEditorSnapshot] =
    React.useState<EditorVirtualizationSnapshot | null>(null);

  const columns = React.useMemo<TypeColumns>(
    () =>
      Array.from({ length: config.count }, (_, index) => {
        const columnId = `col-${String(index).padStart(2, "0")}`;
        return {
          name: columnId,
          header: `Column ${String(index).padStart(2, "0")}`,
          width: 140,
          editable: Boolean(config.interactive),
          filterable: Boolean(config.interactive),
          ...(config.interactive && index === config.count - 1
            ? { filterEditor: LastColumnFilterEditor }
            : {}),
        };
      }),
    [config.count, config.interactive]
  );
  const rows = React.useMemo(
    () =>
      Array.from({ length: 4 }, (_, rowIndex) =>
        Object.fromEntries([
          ["id", `virtual-row-${rowIndex + 1}`],
          ...columns.map((column, columnIndex) => [
            String(column.name),
            rowIndex === 0 && columnIndex === columns.length - 1
              ? "needle"
              : `r${rowIndex + 1}-c${columnIndex}`,
          ]),
        ])
      ),
    [columns]
  );
  const lastColumnIndex = config.count - 1;

  const rowStyle = React.useCallback((args: TypeRowStyleArgs) => {
    rowStyleSnapshotRef.current = {
      virtualizeColumns: Boolean(args.props.virtualizeColumns),
      columnRenderCount: args.props.columnRenderCount,
      totalColumnCount: args.props.totalColumnCount,
    };
    return undefined;
  }, []);

  const captureState = React.useCallback(() => {
    const rowStyleState = rowStyleSnapshotRef.current;

    setSnapshot({
      computedVirtualizeColumns:
        typeof apiRef.current?.virtualizeColumns === "boolean"
          ? apiRef.current.virtualizeColumns
          : null,
      rowStyleVirtualizeColumns: rowStyleState?.virtualizeColumns ?? null,
      rowStyleColumnRenderCount: rowStyleState?.columnRenderCount ?? null,
      rowStyleTotalColumnCount: rowStyleState?.totalColumnCount ?? null,
    });
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          data-testid="capture-column-state"
          onClick={captureState}
        >
          Capture column state
        </Button>
        <Button
          type="button"
          data-testid="scroll-last-column"
          onClick={() => apiRef.current?.scrollToColumn?.(lastColumnIndex)}
        >
          Scroll to last column
        </Button>
        <Button
          type="button"
          data-testid="scroll-first-column"
          onClick={() => apiRef.current?.scrollToColumn?.(0)}
        >
          Scroll to first column
        </Button>
      </div>
      <JsonOutput testId="column-state" value={snapshot} />
      <JsonOutput testId="column-editor-state" value={editorSnapshot} />
      <FixtureFrame className="h-[330px] w-[560px]">
        <CommonPendingGrid
          idProperty="id"
          columns={columns}
          dataSource={rows}
          columnOrder={columns.map((column) => String(column.name))}
          virtualized={false}
          rowHeight={config.rowHeight}
          virtualizeColumnsThreshold={config.threshold}
          virtualizeColumns={config.force}
          enableFiltering={Boolean(config.interactive)}
          editable={Boolean(config.interactive)}
          rowStyle={rowStyle}
          onEditStart={(info) => {
            const cellProps = info.cellProps as Record<string, unknown>;
            setEditorSnapshot({
              columnId: String(info.columnId),
              columnIndex: info.columnIndex,
              virtualizeColumns:
                typeof cellProps.virtualizeColumns === "boolean"
                  ? cellProps.virtualizeColumns
                  : null,
            });
          }}
          onReady={(ref) => {
            apiRef.current = ref.current;
          }}
        />
      </FixtureFrame>
    </div>
  );
}

type EmptyScenarioConfig = {
  content?: React.ReactNode | (() => React.ReactNode);
  loading?: boolean;
  filtered?: boolean;
  remote?: boolean;
  mobile?: boolean;
};

function EmptyTextScenario(props: { scenario: PendingScenario }) {
  const [actionCount, setActionCount] = React.useState(0);
  const remoteResolverRef = React.useRef<(() => void) | null>(null);
  const [loadingActive, setLoadingActive] = React.useState(
    props.scenario === "empty-loading"
  );
  const handleAction = React.useCallback(
    () => setActionCount((current) => current + 1),
    []
  );
  const remoteSource = React.useCallback(() => {
    return new Promise<unknown[]>((resolve) => {
      remoteResolverRef.current = () => resolve([]);
    });
  }, []);

  const config = React.useMemo<EmptyScenarioConfig>(() => {
    switch (props.scenario) {
      case "empty-literal":
        return { content: "Literal empty state" };
      case "empty-key":
        return { content: "customEmptyKey" };
      case "empty-node":
        return {
          content: (
            <button
              type="button"
              data-testid="empty-node-action"
              onClick={handleAction}
            >
              Node empty action
            </button>
          ),
        };
      case "empty-function":
        return {
          content: () => (
            <button
              type="button"
              data-testid="empty-function-action"
              onClick={handleAction}
            >
              Function empty action
            </button>
          ),
        };
      case "empty-null":
        return { content: null };
      case "empty-false":
        return { content: false };
      case "empty-string":
        return { content: "" };
      case "empty-loading":
        return {
          content: () => (
            <span data-testid="loading-empty-content">Loaded empty state</span>
          ),
          loading: true,
        };
      case "empty-filtered":
        return {
          content: (
            <span data-testid="filtered-empty-content">
              No filtered matches
            </span>
          ),
          filtered: true,
        };
      case "empty-remote":
        return {
          content: (
            <span data-testid="remote-empty-content">Remote empty state</span>
          ),
          remote: true,
        };
      case "empty-mobile":
        return {
          content: (
            <span data-testid="mobile-empty-content">Mobile empty state</span>
          ),
          mobile: true,
        };
      default:
        return {};
    }
  }, [handleAction, props.scenario]);

  const rows = config.filtered ? baseRows : [];
  const dataSource = config.remote ? remoteSource : rows;
  const emptyTextProps = {
    emptyText: config.content,
  } as Pick<PendingCompatGridProps, "emptyText">;

  return (
    <div className="space-y-3">
      {props.scenario === "empty-loading" ? (
        <Button
          type="button"
          data-testid="finish-empty-loading"
          onClick={() => setLoadingActive(false)}
        >
          Finish loading
        </Button>
      ) : null}
      {props.scenario === "empty-remote" ? (
        <Button
          type="button"
          data-testid="resolve-remote-empty"
          onClick={() => remoteResolverRef.current?.()}
        >
          Resolve remote empty data
        </Button>
      ) : null}
      <output data-testid="empty-action-count">{actionCount}</output>
      <FixtureFrame className="h-[280px] w-[560px]">
        <CommonPendingGrid
          idProperty="id"
          columns={baseColumns}
          dataSource={dataSource}
          columnOrder={["id", "name", "team"]}
          virtualized={false}
          loading={config.loading ? loadingActive : undefined}
          allowMobileTransform={Boolean(config.mobile)}
          enableFiltering={Boolean(config.filtered)}
          defaultFilterValue={
            config.filtered
              ? [
                  {
                    name: "name",
                    type: "string",
                    operator: "contains",
                    value: "does-not-exist",
                  },
                ]
              : undefined
          }
          i18n={{
            noRecords: "Localized empty fallback",
            customEmptyKey: "Localized custom empty",
          }}
          {...emptyTextProps}
        />
      </FixtureFrame>
    </div>
  );
}

type RowHeightSnapshot = {
  domHeight: number | null;
  virtualHeight: number | null;
  totalHeight: number | null;
};

function RowHeightAuthorityScenario() {
  const scopeRef = React.useRef<HTMLDivElement | null>(null);
  const apiRef = React.useRef<TypeComputedProps | null>(null);
  const [snapshot, setSnapshot] = React.useState<RowHeightSnapshot>({
    domHeight: null,
    virtualHeight: null,
    totalHeight: null,
  });
  const rows = React.useMemo(
    () =>
      Array.from({ length: 20 }, (_, index) => ({
        id: `height-row-${index + 1}`,
        name: `Height row ${index + 1}`,
        team: "Sizing",
      })),
    []
  );

  const capture = React.useCallback(() => {
    const firstRow = scopeRef.current?.querySelector<HTMLElement>(
      '[data-slot="grid-row"][data-row-id="height-row-1"]'
    );
    const virtualList = apiRef.current?.getVirtualList();
    const virtualRow = virtualList?.getRows().find((row) => row.rowIndex === 0);

    setSnapshot({
      domHeight: firstRow
        ? Math.round(firstRow.getBoundingClientRect().height)
        : null,
      virtualHeight:
        typeof virtualRow?.height === "number"
          ? Math.round(virtualRow.height)
          : null,
      totalHeight:
        typeof virtualList?.getTotalRowHeight() === "number"
          ? Math.round(virtualList.getTotalRowHeight())
          : null,
    });
  }, []);

  return (
    <div ref={scopeRef} className="space-y-3">
      <Button
        type="button"
        data-testid="capture-row-height-authority"
        onClick={capture}
      >
        Capture row height
      </Button>
      <JsonOutput testId="row-height-authority-state" value={snapshot} />
      <FixtureFrame className="h-[300px] w-[560px]">
        <CommonPendingGrid
          idProperty="id"
          columns={baseColumns}
          dataSource={rows}
          columnOrder={["id", "name", "team"]}
          virtualized
          rowHeight={60}
          minRowHeight={80}
          onReady={(ref) => {
            apiRef.current = ref.current;
          }}
        />
      </FixtureFrame>
    </div>
  );
}

type EditingCoordinateMode = "column" | "row";

function EditingCoordinateScenario(props: { mode: EditingCoordinateMode }) {
  const [columnOrder, setColumnOrder] = React.useState(["name", "team"]);
  const [rows, setRows] = React.useState([
    { id: "edit-r1", name: "Name one", team: "Team one" },
    { id: "edit-r2", name: "Name two", team: "Team two" },
  ]);
  const [events, setEvents] = React.useState<
    Array<{
      type: "stop" | "complete";
      rowId: string | number;
      rowIndex: number;
      columnId: string;
      columnIndex: number;
      value: unknown;
    }>
  >([]);
  const columns = React.useMemo<TypeColumns>(
    () => [
      { name: "name", header: "Name", width: 220 },
      { name: "team", header: "Team", width: 220 },
    ],
    []
  );

  const appendEvent = React.useCallback(
    (type: "stop" | "complete", info: TypeEditInfo) => {
      setEvents((current) => [
        ...current,
        {
          type,
          rowId: info.rowId,
          rowIndex: info.rowIndex,
          columnId: String(info.columnId),
          columnIndex: info.columnIndex,
          value: info.value ?? null,
        },
      ]);
    },
    []
  );

  return (
    <div className="space-y-3">
      <Button
        type="button"
        data-testid={
          props.mode === "column" ? "reorder-edit-columns" : "reorder-edit-rows"
        }
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          if (props.mode === "column") {
            setColumnOrder(["team", "name"]);
          } else {
            setRows((current) => [current[1]!, current[0]!]);
          }
        }}
      >
        Reorder while editing
      </Button>
      <JsonOutput testId="editing-coordinate-events" value={events} />
      <FixtureFrame className="h-[280px] w-[560px]">
        <CommonPendingGrid
          idProperty="id"
          columns={columns}
          dataSource={rows}
          columnOrder={columnOrder}
          virtualized={false}
          editable
          onEditStop={(info) => appendEvent("stop", info)}
          onEditComplete={(info) => appendEvent("complete", info)}
        />
      </FixtureFrame>
    </div>
  );
}

function ZebraImperativeScenario() {
  const apiRef = React.useRef<TypeComputedProps | null>(null);
  const [hasSetter, setHasSetter] = React.useState<boolean | null>(null);

  return (
    <div className="space-y-3">
      <Button
        type="button"
        data-testid="disable-zebra-imperatively"
        onClick={() => {
          const setter = apiRef.current?.setShowZebraRows;
          setHasSetter(typeof setter === "function");
          setter?.((current: boolean) => !current);
        }}
      >
        Disable zebra rows
      </Button>
      <output data-testid="zebra-setter-present">
        {hasSetter == null ? "unknown" : String(hasSetter)}
      </output>
      <FixtureFrame className="h-[260px] w-[560px]">
        <CommonPendingGrid
          idProperty="id"
          columns={baseColumns}
          dataSource={baseRows}
          columnOrder={["id", "name", "team"]}
          virtualized={false}
          defaultShowZebraRows
          onReady={(ref) => {
            apiRef.current = ref.current;
          }}
        />
      </FixtureFrame>
    </div>
  );
}

function ScenarioContent(props: { scenario: PendingScenario }) {
  switch (props.scenario) {
    case "filter-callback":
      return <FilterCallbackScenario />;
    case "selection-enable":
      return <SelectionScenario mode="enable" />;
    case "selection-derived":
      return <SelectionScenario mode="derived" />;
    case "selection-disable":
      return <SelectionScenario mode="disable" />;
    case "selection-disable-controlled":
      return <SelectionScenario mode="disable-controlled" />;
    case "selection-callback-only":
      return <SelectionScenario mode="callback-only" />;
    case "columns-default-15":
    case "columns-default-14":
    case "columns-threshold-at":
    case "columns-threshold-below":
    case "columns-force-on":
    case "columns-force-off":
    case "columns-function-height":
    case "columns-natural-height":
    case "columns-scroll":
      return <ColumnVirtualizationScenario scenario={props.scenario} />;
    case "empty-literal":
    case "empty-key":
    case "empty-node":
    case "empty-function":
    case "empty-null":
    case "empty-false":
    case "empty-string":
    case "empty-loading":
    case "empty-filtered":
    case "empty-remote":
    case "empty-mobile":
      return <EmptyTextScenario scenario={props.scenario} />;
    case "row-height-authority":
      return <RowHeightAuthorityScenario />;
    case "editing-column-coordinate":
      return <EditingCoordinateScenario mode="column" />;
    case "editing-row-coordinate":
      return <EditingCoordinateScenario mode="row" />;
    case "zebra-imperative":
      return <ZebraImperativeScenario />;
    default:
      return null;
  }
}

export default function InovuaPendingParityCompatPage() {
  const scenario = readScenario();

  return (
    <main
      className="flex min-w-0 flex-col gap-4 rounded-2xl border bg-background p-5"
      data-testid="inovua-pending-parity-scenario"
      data-scenario={scenario}
    >
      <h1 className="text-xl font-semibold">
        Pending Inovua parity: {scenario}
      </h1>
      <ScenarioContent scenario={scenario} />
    </main>
  );
}
