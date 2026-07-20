import * as React from "react";

import ReactDataGrid, {
  type CellProps,
  type TypeColumns,
  type TypeComputedProps,
  type TypeDataGridProps,
} from "../../src/main";
import { Button } from "../../src/components/ui/button";

type Issue48Scenario =
  | "text-input"
  | "did-mount"
  | "did-mount-zero-width"
  | "did-mount-async"
  | "adjust-natural"
  | "adjust-fixed"
  | "adjust-function"
  | "adjust-nonvirtual"
  | "adjust-safe";

type TextInputHandle = {
  focus: () => void;
  renderClearButton: (
    config: TextInputClearButtonCompatConfig
  ) => React.ReactNode;
  setValue: (value: unknown, event?: unknown) => void;
};

type TextInputCompatProps = Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "onChange"
> & {
  value?: unknown;
  defaultValue?: unknown;
  type?: string;
  theme?: string;
  name?: string;
  placeholder?: string;
  autoFocus?: boolean;
  maxLength?: number;
  minLength?: number;
  required?: boolean;
  readOnly?: boolean;
  disabled?: boolean;
  hidden?: boolean;
  stopChangePropagation?: boolean | null;
  enableClearButton?: boolean;
  acceptClearToolFocus?: boolean;
  rtl?: boolean;
  rootClassName?: string;
  clearButtonSize?: number | [number, number];
  clearButtonColor?: string;
  clearButtonStyle?: React.CSSProperties;
  clearButtonClassName?: string;
  inputProps?:
    | (Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> & {
        "data-testid"?: string;
        onChange?: (value: unknown, event?: unknown) => void;
      })
    | null;
  wrapperProps?: React.HTMLAttributes<HTMLDivElement>;
  onChange?: (value: unknown, event?: unknown) => void;
};

type TextInputCompatComponent = React.ComponentType<
  TextInputCompatProps & React.RefAttributes<TextInputHandle>
>;

type TextInputClearButtonCompatConfig = {
  clearButtonClassName?: string;
  clearButtonColor?: string;
  clearButtonSize?: number | readonly [number, number] | null;
  clearButtonStyle?: React.CSSProperties;
};

type Issue48GridProps = TypeDataGridProps & {
  onDidMount?: (
    computedPropsRef: React.MutableRefObject<TypeComputedProps | null>
  ) => void;
};

type MountEvent = {
  type: "didMount" | "handle" | "ready";
  refId: number;
  callbackVersion: number;
  apiLive: boolean;
  domConnected: boolean;
  rowCount: number | null;
};

type HeightSnapshot = {
  height: number | null;
  start: number | null;
  end: number | null;
  nextStart: number | null;
  total: number | null;
};

type AdjustReport = {
  methodExists: boolean;
  returnedUndefined: boolean;
  error: string | null;
  mode: string;
  before: HeightSnapshot;
  stale: HeightSnapshot;
  after: HeightSnapshot;
  domHeight: number | null;
  totalRows: number;
  mountedIndexes: number[];
  measuredIndexes: number[];
};

const CompatGrid = ReactDataGrid as React.ComponentType<Issue48GridProps>;

// Keep this fixture runnable before the missing compatibility entry point is
// implemented. Vite eagerly discovers the source module once it exists; until
// then the visible marker makes every TextInput assertion fail for that exact
// product gap instead of failing the fixture build.
const packageModules = import.meta.glob("../../src/packages/**/*.{ts,tsx}", {
  eager: true,
}) as Record<string, { default?: unknown }>;
const textInputModule = Object.entries(packageModules).find(([path]) =>
  /\/TextInput(?:\/index)?\.(?:ts|tsx)$/.test(path)
)?.[1];
const TextInput = textInputModule?.default as
  | TextInputCompatComponent
  | undefined;
const TextInputClass = TextInput as
  | React.ComponentClass<TextInputCompatProps>
  | undefined;
const SubclassTextInput = TextInputClass
  ? class extends TextInputClass {
      renderClearButton(config: TextInputClearButtonCompatConfig) {
        return (
          <button
            type="button"
            className={config.clearButtonClassName}
            data-testid="subclass-clear-button"
            data-clear-color={config.clearButtonColor}
            data-clear-size={JSON.stringify(config.clearButtonSize)}
            data-clear-style={JSON.stringify(config.clearButtonStyle)}
          >
            Subclass clear
          </button>
        );
      }
    }
  : undefined;

const columns: TypeColumns = [
  { name: "id", header: "ID", width: 88 },
  { name: "name", header: "Name", width: 220 },
];
const columnOrder = ["id", "name"];
const rows = [
  { id: 1, name: "Ada Lovelace" },
  { id: 2, name: "Grace Hopper" },
];

function readScenario(): Issue48Scenario {
  if (typeof window === "undefined") return "text-input";

  const value = new URLSearchParams(window.location.search).get("scenario");
  switch (value) {
    case "did-mount":
    case "did-mount-zero-width":
    case "did-mount-async":
    case "adjust-natural":
    case "adjust-fixed":
    case "adjust-function":
    case "adjust-nonvirtual":
    case "adjust-safe":
    case "text-input":
      return value;
    default:
      return "text-input";
  }
}

function ScenarioShell(props: {
  scenario: Issue48Scenario;
  children: React.ReactNode;
}) {
  return (
    <main
      data-testid="issue-48-scenario"
      data-scenario={props.scenario}
      className="mx-auto flex w-full max-w-5xl flex-col gap-4"
    >
      <header className="space-y-1">
        <p className="text-sm font-medium text-muted-foreground">
          Issue #48 compatibility fixture
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          {props.scenario}
        </h1>
      </header>
      {props.children}
    </main>
  );
}

function Report(props: { testId: string; children: React.ReactNode }) {
  return (
    <output
      data-testid={props.testId}
      className="block overflow-auto rounded-lg border bg-muted/30 p-3 font-mono text-xs"
    >
      {props.children}
    </output>
  );
}

function TextInputScenario() {
  const inputRef = React.useRef<TextInputHandle | null>(null);
  const [events, setEvents] = React.useState<string[]>([]);
  const [outerChanges, setOuterChanges] = React.useState(0);
  const [controlledValue, setControlledValue] = React.useState("locked");
  const [controlledCandidate, setControlledCandidate] = React.useState("");
  const [detachedRenderStatus, setDetachedRenderStatus] =
    React.useState("idle");

  const log = React.useCallback((event: string) => {
    setEvents((current) => [...current, event]);
  }, []);

  if (!TextInput) {
    return (
      <section
        data-testid="text-input-availability"
        data-available="false"
        className="rounded-lg border border-dashed p-4"
      >
        The TextInput compatibility entry point is missing.
      </section>
    );
  }

  return (
    <section
      data-testid="text-input-availability"
      data-available="true"
      className="space-y-4 rounded-lg border bg-card p-4"
      onChange={() => setOuterChanges((current) => current + 1)}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span>Uncontrolled</span>
          <TextInput
            ref={inputRef}
            data-testid="uncontrolled-root"
            defaultValue="seed"
            inputProps={{
              "data-testid": "uncontrolled-input",
              onChange: (value) => log(`input:${String(value)}`),
            }}
            clearButtonClassName="issue48-uncontrolled-clear"
            onChange={(value) => log(`root:${String(value)}`)}
          />
        </label>

        <label className="space-y-2">
          <span>Controlled</span>
          <TextInput
            data-testid="controlled-root"
            value={controlledValue}
            inputProps={{ "data-testid": "controlled-input" }}
            clearButtonClassName="issue48-controlled-clear"
            onChange={(value) => {
              setControlledCandidate(String(value));
              log(`controlled:${String(value)}`);
            }}
          />
        </label>

        <label className="space-y-2">
          <span>Disabled</span>
          <TextInput
            data-testid="disabled-root"
            defaultValue="disabled value"
            disabled
            inputProps={{ "data-testid": "disabled-input" }}
            clearButtonClassName="issue48-disabled-clear"
          />
        </label>

        <label className="space-y-2">
          <span>Read only</span>
          <TextInput
            data-testid="readonly-root"
            defaultValue="read only value"
            readOnly
            inputProps={{ "data-testid": "readonly-input" }}
            clearButtonClassName="issue48-readonly-clear"
          />
        </label>

        <label className="space-y-2">
          <span>Propagation enabled</span>
          <TextInput
            data-testid="propagating-root"
            defaultValue="propagates"
            stopChangePropagation={false}
            inputProps={{ "data-testid": "propagating-input" }}
            clearButtonClassName="issue48-propagating-clear"
            onChange={(value) => log(`propagating:${String(value)}`)}
          />
        </label>

        <label className="space-y-2">
          <span>Focusable clear tool</span>
          <TextInput
            data-testid="focusable-clear-root"
            defaultValue="tab stop"
            acceptClearToolFocus
            inputProps={{
              "data-testid": "focusable-clear-input",
              stopChangePropagation: false,
            }}
            clearButtonClassName="issue48-focusable-clear"
          />
        </label>

        <label className="space-y-2">
          <span>Null input props</span>
          <TextInput
            data-testid="null-input-props-root"
            defaultValue="null-safe"
            inputProps={null}
          />
        </label>

        <label className="space-y-2">
          <span>Legacy numeric empty value</span>
          <TextInput
            data-testid="numeric-zero-root"
            value={0}
            clearButtonClassName="issue48-numeric-zero-clear"
            inputProps={{ "data-testid": "numeric-zero-input" }}
          />
        </label>

        <label className="space-y-2">
          <span>Falsey clear size</span>
          <TextInput
            defaultValue="size fallback"
            clearButtonSize={0}
            clearButtonClassName="issue48-zero-size-clear"
          />
        </label>

        <label className="space-y-2">
          <span>Null propagation flag</span>
          <TextInput
            data-testid="null-propagation-root"
            defaultValue="bubbles"
            stopChangePropagation={null}
            inputProps={{ "data-testid": "null-propagation-input" }}
          />
        </label>

        <label className="space-y-2">
          <span>Custom RTL theme</span>
          <TextInput
            data-testid="custom-theme-root"
            defaultValue="rtl value"
            rootClassName="issue48-custom-text-input"
            theme="midnight"
            rtl
            data-theme="consumer-theme-hook"
            data-disabled="consumer-disabled-hook"
            data-focused="consumer-focused-hook"
            dir="auto"
            inputProps={{ "data-testid": "custom-theme-input" }}
            clearButtonClassName="issue48-custom-clear"
          />
        </label>

        {SubclassTextInput ? (
          <label className="space-y-2">
            <span>Subclass clear renderer</span>
            <SubclassTextInput
              defaultValue="subclass value"
              clearButtonClassName="issue48-subclass-clear"
              clearButtonColor="rgb(10, 20, 30)"
              clearButtonSize={[13, 17]}
              clearButtonStyle={{ opacity: 0.75 }}
            />
          </label>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          data-testid="imperative-focus"
          onClick={() => inputRef.current?.focus()}
        >
          Focus uncontrolled
        </Button>
        <Button
          type="button"
          data-testid="imperative-set-value"
          onClick={() => inputRef.current?.setValue("imperative")}
        >
          Set uncontrolled
        </Button>
        <Button
          type="button"
          data-testid="apply-controlled"
          onClick={() => setControlledValue(controlledCandidate)}
        >
          Apply controlled candidate
        </Button>
        <Button
          type="button"
          data-testid="call-detached-clear-renderer"
          onClick={() => {
            try {
              const renderClearButton = inputRef.current?.renderClearButton;
              const result = renderClearButton?.({
                clearButtonClassName: "detached-clear",
                clearButtonColor: "purple",
                clearButtonSize: 9,
              });
              setDetachedRenderStatus(
                React.isValidElement(result) ? "rendered" : "missing"
              );
            } catch (error) {
              setDetachedRenderStatus(
                error instanceof Error ? `error:${error.message}` : "error"
              );
            }
          }}
        >
          Call detached clear renderer
        </Button>
      </div>

      <Report testId="text-input-events">{JSON.stringify(events)}</Report>
      <Report testId="text-input-outer-changes">{outerChanges}</Report>
      <Report testId="controlled-candidate">{controlledCandidate}</Report>
      <Report testId="detached-render-status">{detachedRenderStatus}</Report>
    </section>
  );
}

function refIdFor(
  refs: WeakMap<object, number>,
  nextId: React.MutableRefObject<number>,
  ref: React.MutableRefObject<TypeComputedProps | null>
) {
  const existing = refs.get(ref);
  if (existing != null) return existing;

  const id = nextId.current;
  nextId.current += 1;
  refs.set(ref, id);
  return id;
}

function DidMountScenario() {
  const [mountKey, setMountKey] = React.useState(0);
  const [callbackVersion, setCallbackVersion] = React.useState(0);
  const [events, setEvents] = React.useState<MountEvent[]>([]);
  const refs = React.useRef(new WeakMap<object, number>());
  const nextRefId = React.useRef(1);

  const record = React.useCallback(
    (
      type: MountEvent["type"],
      ref: React.MutableRefObject<TypeComputedProps | null>,
      version: number
    ) => {
      const api = ref.current;
      setEvents((current) => [
        ...current,
        {
          type,
          refId: refIdFor(refs.current, nextRefId, ref),
          callbackVersion: version,
          apiLive: Boolean(api && typeof api.getVirtualList === "function"),
          domConnected: Boolean(api?.getDOMNode?.()?.isConnected),
          rowCount:
            typeof api?.getCount?.() === "number" ? api.getCount() : null,
        },
      ]);
    },
    []
  );

  const didMountCallback = React.useMemo(
    () => (ref: React.MutableRefObject<TypeComputedProps | null>) =>
      record("didMount", ref, callbackVersion),
    [callbackVersion, record]
  );
  const handleCallback = React.useCallback(
    (ref: React.MutableRefObject<TypeComputedProps | null> | null) => {
      if (ref) record("handle", ref, callbackVersion);
    },
    [callbackVersion, record]
  );
  const readyCallback = React.useCallback(
    (ref: React.MutableRefObject<TypeComputedProps | null>) =>
      record("ready", ref, callbackVersion),
    [callbackVersion, record]
  );

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          data-testid="did-mount-rerender"
          onClick={() => setCallbackVersion((current) => current + 1)}
        >
          Replace callback and rerender
        </Button>
        <Button
          type="button"
          data-testid="did-mount-remount"
          onClick={() => setMountKey((current) => current + 1)}
        >
          Remount grid
        </Button>
      </div>

      <Report testId="did-mount-events">{JSON.stringify(events)}</Report>

      <div className="h-[260px] min-h-0 rounded-lg border">
        <CompatGrid
          key={mountKey}
          idProperty="id"
          columns={columns}
          dataSource={rows}
          columnOrder={columnOrder}
          virtualized
          onDidMount={didMountCallback}
          handle={handleCallback}
          onReady={readyCallback}
        />
      </div>
    </section>
  );
}

function DidMountZeroWidthScenario() {
  const [events, setEvents] = React.useState<MountEvent[]>([]);
  const refs = React.useRef(new WeakMap<object, number>());
  const nextRefId = React.useRef(1);

  return (
    <section className="space-y-4">
      <Report testId="did-mount-zero-events">{JSON.stringify(events)}</Report>
      <div
        data-testid="zero-width-host"
        className="h-[180px] w-0 overflow-hidden"
      >
        <CompatGrid
          idProperty="id"
          columns={columns}
          dataSource={rows}
          columnOrder={columnOrder}
          virtualized
          onDidMount={(ref) => {
            const api = ref.current;
            setEvents((current) => [
              ...current,
              {
                type: "didMount",
                refId: refIdFor(refs.current, nextRefId, ref),
                callbackVersion: 0,
                apiLive: Boolean(
                  api && typeof api.getVirtualList === "function"
                ),
                domConnected: Boolean(api?.getDOMNode?.()?.isConnected),
                rowCount:
                  typeof api?.getCount?.() === "number" ? api.getCount() : null,
              },
            ]);
          }}
        />
      </div>
    </section>
  );
}

function DidMountAsyncScenario() {
  const [deferred] = React.useState(() => {
    let resolvePromise: (value: typeof rows) => void = () => undefined;
    const promise = new Promise<typeof rows>((resolve) => {
      resolvePromise = resolve;
    });

    return { promise, resolve: resolvePromise };
  });
  const [calls, setCalls] = React.useState(0);

  const dataSource = React.useCallback(() => deferred.promise, [deferred]);

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <Button
          type="button"
          data-testid="resolve-async-data"
          onClick={() => deferred.resolve(rows)}
        >
          Resolve data
        </Button>
        <Report testId="did-mount-async-calls">{calls}</Report>
      </div>
      <div className="h-[260px] min-h-0 rounded-lg border">
        <CompatGrid
          idProperty="id"
          columns={columns}
          dataSource={dataSource}
          columnOrder={columnOrder}
          virtualized
          onDidMount={() => setCalls((current) => current + 1)}
        />
      </div>
    </section>
  );
}

function snapshotHeight(api: TypeComputedProps | null): HeightSnapshot {
  const virtualList = api?.getVirtualList?.();
  const first = virtualList?.getRowAt?.(0);
  const next = virtualList?.getRowAt?.(1);
  const total = virtualList?.getTotalRowHeight?.();

  return {
    height: typeof first?.height === "number" ? Math.round(first.height) : null,
    start: typeof first?.start === "number" ? Math.round(first.start) : null,
    end: typeof first?.end === "number" ? Math.round(first.end) : null,
    nextStart: typeof next?.start === "number" ? Math.round(next.start) : null,
    total: typeof total === "number" ? Math.round(total) : null,
  };
}

function AdjustHeightScenario(props: {
  mode: "natural" | "fixed" | "function" | "nonvirtual";
}) {
  const apiRef = React.useRef<TypeComputedProps | null>(null);
  const scopeRef = React.useRef<HTMLDivElement | null>(null);
  const [report, setReport] = React.useState<AdjustReport | null>(null);
  const data = React.useMemo(
    () =>
      Array.from(
        { length: props.mode === "nonvirtual" ? 12 : 400 },
        (_, index) => ({
          id: `height-${index}`,
          label: `Measured row ${index + 1}`,
        })
      ),
    [props.mode]
  );
  const heightColumns = React.useMemo<TypeColumns>(
    () => [
      { name: "id", header: "ID", width: 110 },
      {
        name: "label",
        header: "Measured content",
        width: 360,
        render: ({ value, rowIndex }: CellProps) => (
          <div data-testid={`height-content-${rowIndex}`}>{String(value)}</div>
        ),
      },
    ],
    []
  );
  const rowHeight =
    props.mode === "natural" || props.mode === "nonvirtual"
      ? null
      : props.mode === "fixed"
        ? 48
        : () => 48;
  const virtualized = props.mode !== "nonvirtual";

  const runAdjustment = React.useCallback(() => {
    const api = apiRef.current;
    const virtualList = api?.getVirtualList?.() as
      | (ReturnType<TypeComputedProps["getVirtualList"]> & {
          adjustHeights?: () => void;
        })
      | undefined;
    const adjustHeights = virtualList?.adjustHeights;
    const target = scopeRef.current?.querySelector<HTMLElement>(
      '[data-slot="grid-row"][data-row-index="0"]'
    );
    const mountedRows = Array.from(
      scopeRef.current?.querySelectorAll<HTMLElement>(
        '[data-slot="grid-row"][data-row-index]'
      ) ?? []
    );
    const mountedIndexes = mountedRows
      .map((row) => Number(row.dataset.rowIndex))
      .filter(Number.isFinite);
    const before = snapshotHeight(api);

    if (target) {
      target.style.height = "168px";
      // Force layout before calling adjustHeights. Inovua reads scrollHeight
      // synchronously, then lets its row-height manager rebuild offsets on the
      // next animation frame.
      void target.scrollHeight;
    }

    const domHeight = target ? Math.round(target.scrollHeight) : null;
    const stale = snapshotHeight(api);
    const measuredIndexes: number[] = [];
    const measuredHeights = mountedRows.map((row) => row.scrollHeight);

    mountedRows.forEach((row, index) => {
      Object.defineProperty(row, "scrollHeight", {
        configurable: true,
        get() {
          measuredIndexes.push(Number(row.dataset.rowIndex));
          return measuredHeights[index];
        },
      });
    });

    let returnedUndefined = false;
    let error: string | null = null;
    try {
      const result = adjustHeights?.call(virtualList);
      returnedUndefined = result === undefined;
    } catch (caught) {
      error = caught instanceof Error ? caught.message : String(caught);
    } finally {
      mountedRows.forEach((row) => {
        Reflect.deleteProperty(row, "scrollHeight");
      });
    }

    const nextReport: AdjustReport = {
      methodExists: typeof adjustHeights === "function",
      returnedUndefined,
      error,
      mode: props.mode,
      before,
      stale,
      // Offset reindexing is allowed to settle on the next frame, as it does
      // in the upstream row-height manager.
      after: stale,
      domHeight,
      totalRows: data.length,
      mountedIndexes,
      measuredIndexes,
    };
    setReport(nextReport);
    window.requestAnimationFrame(() => {
      setReport((current) =>
        current === nextReport
          ? { ...current, after: snapshotHeight(apiRef.current) }
          : current
      );
    });
  }, [data.length, props.mode]);

  return (
    <section ref={scopeRef} className="space-y-4">
      <Button
        type="button"
        data-testid="run-adjust-heights"
        onClick={runAdjustment}
      >
        Mutate row and adjust heights
      </Button>
      <Report testId="adjust-heights-report">{JSON.stringify(report)}</Report>
      <div className="h-[300px] w-[560px] max-w-full min-h-0 rounded-lg border">
        <ReactDataGrid
          idProperty="id"
          columns={heightColumns}
          dataSource={data}
          columnOrder={["id", "label"]}
          virtualized={virtualized}
          rowHeight={rowHeight}
          minRowHeight={40}
          onReady={(ref) => {
            apiRef.current = ref.current;
          }}
        />
      </div>
    </section>
  );
}

function AdjustSafeScenario() {
  const apiRef = React.useRef<TypeComputedProps | null>(null);
  const [report, setReport] = React.useState<{
    methodExists: boolean;
    returnedUndefined: boolean;
    error: string | null;
  } | null>(null);

  return (
    <section className="space-y-4">
      <Button
        type="button"
        data-testid="run-safe-adjust-heights"
        onClick={() => {
          const virtualList = apiRef.current?.getVirtualList?.() as
            | (ReturnType<TypeComputedProps["getVirtualList"]> & {
                adjustHeights?: () => void;
              })
            | undefined;
          let error: string | null = null;
          let returnedUndefined = false;
          try {
            const result = virtualList?.adjustHeights?.();
            returnedUndefined = result === undefined;
          } catch (caught) {
            error = caught instanceof Error ? caught.message : String(caught);
          }
          setReport({
            methodExists: typeof virtualList?.adjustHeights === "function",
            returnedUndefined,
            error,
          });
        }}
      >
        Adjust empty non-virtual grid
      </Button>
      <Report testId="adjust-safe-report">{JSON.stringify(report)}</Report>
      <div className="h-[220px] min-h-0 rounded-lg border">
        <ReactDataGrid
          idProperty="id"
          columns={columns}
          dataSource={[]}
          columnOrder={columnOrder}
          virtualized={false}
          rowHeight={null}
          onReady={(ref) => {
            apiRef.current = ref.current;
          }}
        />
      </div>
    </section>
  );
}

export default function Issue48CompatPage() {
  const scenario = readScenario();

  let content: React.ReactNode;
  switch (scenario) {
    case "did-mount":
      content = <DidMountScenario />;
      break;
    case "did-mount-zero-width":
      content = <DidMountZeroWidthScenario />;
      break;
    case "did-mount-async":
      content = <DidMountAsyncScenario />;
      break;
    case "adjust-natural":
      content = <AdjustHeightScenario mode="natural" />;
      break;
    case "adjust-fixed":
      content = <AdjustHeightScenario mode="fixed" />;
      break;
    case "adjust-function":
      content = <AdjustHeightScenario mode="function" />;
      break;
    case "adjust-nonvirtual":
      content = <AdjustHeightScenario mode="nonvirtual" />;
      break;
    case "adjust-safe":
      content = <AdjustSafeScenario />;
      break;
    default:
      content = <TextInputScenario />;
      break;
  }

  return <ScenarioShell scenario={scenario}>{content}</ScenarioShell>;
}
