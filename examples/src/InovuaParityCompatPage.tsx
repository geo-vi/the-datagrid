import * as React from "react";
import {
  Columns3,
  Paintbrush,
  PencilLine,
  RotateCcw,
  Rows3,
  ShieldCheck,
} from "lucide-react";

import ReactDataGrid, {
  type CellProps,
  type TypeColumnEditorProps,
  type TypeColumnResizeContext,
  type TypeColumnResizeInfo,
  type TypeColumns,
  type TypeComputedProps,
  type TypeDataGridProps,
  type TypeEditInfo,
} from "../../src/main";
import { Button } from "../../src/components/ui/button";
import { useExamplesUi } from "./App";

type ParityScenario =
  | "natural-height"
  | "function-row-height"
  | "bounded-row-height"
  | "natural-resize"
  | "resize-callback"
  | "zebra-default"
  | "zebra-disabled"
  | "editing-default"
  | "editing-click"
  | "editing-custom"
  | "editing-async"
  | "editing-completion"
  | "editing-navigation"
  | "editing-imperative"
  | "editing-mobile"
  | "row-style"
  | "row-style-static"
  | "row-style-contract"
  | "flex"
  | "controlled-width";

const scenarios = new Set<ParityScenario>([
  "natural-height",
  "function-row-height",
  "bounded-row-height",
  "natural-resize",
  "resize-callback",
  "zebra-default",
  "zebra-disabled",
  "editing-default",
  "editing-click",
  "editing-custom",
  "editing-async",
  "editing-completion",
  "editing-navigation",
  "editing-imperative",
  "editing-mobile",
  "row-style",
  "row-style-static",
  "row-style-contract",
  "flex",
  "controlled-width",
]);

type ScenarioGroupId = "rows" | "columns" | "appearance" | "editing";

type ScenarioDefinition = {
  id: ParityScenario;
  label: string;
  summary: string;
  instructions: string;
};

type ScenarioGroup = {
  id: ScenarioGroupId;
  label: string;
  description: string;
  scenarios: ScenarioDefinition[];
};

const scenarioGroups: ScenarioGroup[] = [
  {
    id: "rows",
    label: "Row sizing",
    description: "Natural measurement, minimums, and per-row heights.",
    scenarios: [
      {
        id: "natural-height",
        label: "Natural height",
        summary: "Content-sized virtual rows with a minimum height.",
        instructions:
          "Capture the measurements, compare each DOM height with its virtual height and next offset, then smooth-scroll to row 11 using those measured offsets.",
      },
      {
        id: "function-row-height",
        label: "Height function",
        summary: "A deterministic height returned for every row index.",
        instructions:
          "Compare the first 88px row with the following 48px rows while scrolling the virtualized grid.",
      },
      {
        id: "bounded-row-height",
        label: "Height bounds",
        summary: "Function heights clamped by minimum and maximum bounds.",
        instructions:
          "Capture both rows. The 140px proposal must clamp to 80px and the 20px proposal to 40px in both the DOM and virtual offsets.",
      },
      {
        id: "natural-resize",
        label: "Resize remeasurement",
        summary: "Natural rows remeasure after controlled width changes.",
        instructions:
          "Capture the narrow layout, widen Description, then capture again. The wrapped row and total virtual height should shrink.",
      },
    ],
  },
  {
    id: "columns",
    label: "Column sizing",
    description: "Resize events, flex allocation, and controlled widths.",
    scenarios: [
      {
        id: "resize-callback",
        label: "Resize callback",
        summary: "The original resize payload and viewport context.",
        instructions:
          "Drag the Description header edge and compare the latest callback width with the rendered header width.",
      },
      {
        id: "flex",
        label: "Flex allocation",
        summary: "Remaining width split through flex and defaultFlex.",
        instructions:
          "Resize the browser, drag or autosize Flex one, and try the imperative button. Its defaultFlex becomes width while controlled Flex two remains authoritative.",
      },
      {
        id: "controlled-width",
        label: "Controlled width",
        summary: "A supplied width remains authoritative during drag.",
        instructions:
          "Drag Controlled to a proposed width and inspect the clamped callback payload—it should render at 180px until the button supplies 300px.",
      },
    ],
  },
  {
    id: "appearance",
    label: "Row appearance",
    description: "Zebra defaults and data-dependent whole-row styles.",
    scenarios: [
      {
        id: "zebra-default",
        label: "Default zebra rows",
        summary: "Alternating rows are visibly distinct by default.",
        instructions:
          "Compare adjacent rows in the default theme, then use the page-level theme controls to check other themes.",
      },
      {
        id: "zebra-disabled",
        label: "Zebra rows off",
        summary: "Per-grid disabling wins over parity theme tokens.",
        instructions:
          "Both rows should keep the same background even though the lab injects deliberately different odd/even tokens.",
      },
      {
        id: "row-style",
        label: "Row style callback",
        summary: "Row data controls style on the row element itself.",
        instructions:
          "Compare the blocked and ready outlines and heights. The custom status variable belongs to each row, not each cell.",
      },
      {
        id: "row-style-static",
        label: "Static row style",
        summary: "One style object is applied to every row element.",
        instructions:
          "Every row should have the same inset outline, minimum height, and custom variable on the row element itself.",
      },
      {
        id: "row-style-contract",
        label: "Row style contract",
        summary: "Mutable base style and audited paged-row metadata.",
        instructions:
          "Capture the first paged row. The callback mutates its supplied base style and returns undefined while preserving numeric IDs, absolute indexes, dimensions, direction, and unlocked sentinels.",
      },
    ],
  },
  {
    id: "editing",
    label: "Inline editing",
    description: "Activation, lifecycle payloads, navigation, and cancel.",
    scenarios: [
      {
        id: "editing-default",
        label: "Double-click editing",
        summary: "Default activation, completion, and Enter navigation.",
        instructions:
          "Double-click a Name, type a draft, and press Enter. Check the lifecycle log and the editor opened in the next row.",
      },
      {
        id: "editing-click",
        label: "Click and cancel",
        summary: "Click activation, Escape cancellation, and locked cells.",
        instructions:
          "Click a Name, type a draft, and press Escape. Then click the non-editable ID cell and confirm no editor opens.",
      },
      {
        id: "editing-custom",
        label: "Custom editor contract",
        summary: "Inovua editor props, cell shim, and renderEditor arguments.",
        instructions:
          "Double-click a Name and inspect the contract report. Click inside the custom input to verify its compatibility click handler stops propagation.",
      },
      {
        id: "editing-async",
        label: "Async editability",
        summary: "Stale, rejected, falsy, and allowed editability checks.",
        instructions:
          "Start Deferred, immediately try Falsy, then resolve Deferred. Rejected and falsy rows stay closed; Allowed opens normally.",
      },
      {
        id: "editing-completion",
        label: "Async completion",
        summary: "Deferred session isolation and rejected completion.",
        instructions:
          "Complete Deferred, open a newer edit, then resolve the old promise. The newer editor must remain. Rejected completion stops cleanly.",
      },
      {
        id: "editing-navigation",
        label: "Editor navigation",
        summary: "Enter/Tab directions and stop-only custom navigation.",
        instructions:
          "Use Enter, Shift+Enter, Tab, and Shift+Tab in the input. The two Stop-only buttons navigate without complete or cancel lifecycle events.",
      },
      {
        id: "editing-imperative",
        label: "Imperative API",
        summary: "Start, try-start, complete, cancel, and live edit refs.",
        instructions:
          "Use the buttons in order and capture state between calls. The output shows return values, current edit information, and ref state.",
      },
      {
        id: "editing-mobile",
        label: "Column-only mobile edit",
        summary: "Column editability keeps the table editor available.",
        instructions:
          "At a mobile viewport, this grid must remain in table layout because Name is editable even though root editable is false.",
      },
    ],
  },
];

const scenarioById = new Map(
  scenarioGroups.flatMap((group) =>
    group.scenarios.map((scenario) => [scenario.id, scenario] as const)
  )
);

const baseRows = [
  { id: "row-1", name: "Ada Lovelace", city: "London" },
  { id: "row-2", name: "Grace Hopper", city: "New York" },
  { id: "row-3", name: "Katherine Johnson", city: "White Sulphur Springs" },
];

const baseColumns: TypeColumns = [
  { name: "id", header: "ID", width: 100 },
  { name: "name", header: "Name", width: 180 },
  { name: "city", header: "City", width: 220 },
];

function readScenario(): ParityScenario {
  if (typeof window === "undefined") return "natural-height";

  const value = new URLSearchParams(window.location.search).get("scenario");
  return scenarios.has(value as ParityScenario)
    ? (value as ParityScenario)
    : "natural-height";
}

function useParityScenario(): {
  scenario: ParityScenario;
  selectScenario: (scenario: ParityScenario) => void;
} {
  const [scenario, setScenario] = React.useState<ParityScenario>(readScenario);

  React.useEffect(() => {
    const handlePopState = () => setScenario(readScenario());
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const selectScenario = React.useCallback((nextScenario: ParityScenario) => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("scenario", nextScenario);
      window.history.pushState({}, "", url);
    }
    setScenario(nextScenario);
  }, []);

  return { scenario, selectScenario };
}

function ScenarioGroupIcon(props: { groupId: ScenarioGroupId }) {
  switch (props.groupId) {
    case "rows":
      return <Rows3 aria-hidden="true" />;
    case "columns":
      return <Columns3 aria-hidden="true" />;
    case "appearance":
      return <Paintbrush aria-hidden="true" />;
    case "editing":
      return <PencilLine aria-hidden="true" />;
    default:
      return null;
  }
}

function FixtureFrame(props: {
  children: React.ReactNode;
  className?: string;
}): React.ReactNode {
  return (
    <div
      className={`h-[360px] w-[720px] max-w-full min-w-0 overflow-hidden rounded-2xl border bg-background shadow-sm ${props.className ?? ""}`}
      data-testid="parity-grid-frame"
    >
      {props.children}
    </div>
  );
}

function CommonGrid(props: TypeDataGridProps): React.ReactNode {
  const { gridTheme, i18n, resizable, showCellBorders } = useExamplesUi();
  const scenarioResizable = props.resizable;

  return (
    <ReactDataGrid
      enableColumnFilterContextMenu={false}
      enableColumnAutosize={false}
      skipHeaderOnAutoSize={false}
      enableFiltering={false}
      columnUserSelect="text"
      showColumnMenuTool={false}
      {...props}
      theme={gridTheme}
      i18n={i18n}
      resizable={scenarioResizable === false ? false : resizable}
      showCellBorders={showCellBorders}
    />
  );
}

function MetricOutput(props: {
  children: React.ReactNode;
  label: string;
  testId: string;
  wrap?: boolean;
}) {
  return (
    <div className="min-w-0 space-y-1.5 rounded-xl border bg-muted/25 p-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {props.label}
      </div>
      <output
        className={
          props.wrap
            ? "block max-h-48 min-h-5 overflow-auto whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-foreground"
            : "block min-h-5 overflow-x-auto whitespace-nowrap font-mono text-xs text-foreground"
        }
        data-testid={props.testId}
      >
        {props.children}
      </output>
    </div>
  );
}

type NaturalMeasurement = {
  domHeight: number | null;
  virtualHeight: number | null;
  virtualStart: number | null;
  virtualEnd: number | null;
  nextVirtualStart: number | null;
  totalVirtualHeight: number | null;
};

const emptyNaturalMeasurement: NaturalMeasurement = {
  domHeight: null,
  virtualHeight: null,
  virtualStart: null,
  virtualEnd: null,
  nextVirtualStart: null,
  totalVirtualHeight: null,
};

function NaturalHeightScenario(): React.ReactNode {
  const apiRef = React.useRef<TypeComputedProps | null>(null);
  const scopeRef = React.useRef<HTMLDivElement | null>(null);
  const [measurements, setMeasurements] = React.useState<{
    tall: NaturalMeasurement;
    short: NaturalMeasurement;
  }>({ tall: emptyNaturalMeasurement, short: emptyNaturalMeasurement });

  const rows = React.useMemo(
    () => [
      { id: "natural-tall", label: "Tall content", contentHeight: 104 },
      { id: "natural-short", label: "Short content", contentHeight: 4 },
      ...Array.from({ length: 18 }, (_, index) => ({
        id: `natural-${index + 3}`,
        label: `Natural row ${index + 3}`,
        contentHeight: 12,
      })),
    ],
    []
  );

  const columns = React.useMemo<TypeColumns>(
    () => [
      { name: "label", header: "Label", width: 180 },
      {
        name: "contentHeight",
        header: "Measured content",
        width: 260,
        render: ({ data }: CellProps) => {
          const row = data as (typeof rows)[number];
          return (
            <div
              data-testid={`natural-content-${row.id}`}
              style={{ height: row.contentHeight, width: "100%" }}
            />
          );
        },
      },
    ],
    []
  );

  const captureMeasurements = React.useCallback(() => {
    const virtualList = apiRef.current?.getVirtualList();
    const virtualRows = virtualList?.getRows() ?? [];

    const captureAt = (rowId: string, rowIndex: number): NaturalMeasurement => {
      const node = scopeRef.current?.querySelector<HTMLElement>(
        `[data-slot="grid-row"][data-row-id="${rowId}"]`
      );
      const virtualRow = virtualRows.find(
        (candidate) => candidate.rowIndex === rowIndex
      );
      const nextVirtualRow = virtualRows.find(
        (candidate) => candidate.rowIndex === rowIndex + 1
      );

      return {
        domHeight: node
          ? Math.round(node.getBoundingClientRect().height)
          : null,
        virtualHeight:
          typeof virtualRow?.height === "number"
            ? Math.round(virtualRow.height)
            : null,
        virtualStart:
          typeof virtualRow?.start === "number"
            ? Math.round(virtualRow.start)
            : null,
        virtualEnd:
          typeof virtualRow?.end === "number"
            ? Math.round(virtualRow.end)
            : null,
        nextVirtualStart:
          typeof nextVirtualRow?.start === "number"
            ? Math.round(nextVirtualRow.start)
            : null,
        totalVirtualHeight:
          typeof virtualList?.getTotalRowHeight() === "number"
            ? Math.round(virtualList.getTotalRowHeight())
            : null,
      };
    };

    setMeasurements({
      tall: captureAt("natural-tall", 0),
      short: captureAt("natural-short", 1),
    });
  }, []);

  return (
    <div ref={scopeRef} className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          data-testid="capture-natural-height"
          onClick={captureMeasurements}
        >
          Capture natural heights
        </Button>
        <Button
          type="button"
          variant="outline"
          data-testid="smooth-scroll-natural"
          onClick={() =>
            apiRef.current
              ?.getVirtualList()
              .smoothScrollTo(10, { direction: "top" })
          }
        >
          Smooth-scroll to row 11
        </Button>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        <MetricOutput label="Tall row" testId="natural-tall-measurement">
          {JSON.stringify(measurements.tall)}
        </MetricOutput>
        <MetricOutput label="Short row" testId="natural-short-measurement">
          {JSON.stringify(measurements.short)}
        </MetricOutput>
      </div>
      <FixtureFrame className="h-[320px] w-[560px]">
        <CommonGrid
          idProperty="id"
          columns={columns}
          dataSource={rows}
          columnOrder={["label", "contentHeight"]}
          virtualized
          rowHeight={null}
          minRowHeight={52}
          onReady={(ref) => {
            apiRef.current = ref.current;
          }}
        />
      </FixtureFrame>
    </div>
  );
}

function FunctionRowHeightScenario(): React.ReactNode {
  return (
    <FixtureFrame className="h-[320px] w-[560px]">
      <CommonGrid
        idProperty="id"
        columns={baseColumns}
        dataSource={[
          ...baseRows,
          ...Array.from({ length: 12 }, (_, index) => ({
            id: `function-${index + 4}`,
            name: `Function row ${index + 4}`,
            city: "Sofia",
          })),
        ]}
        columnOrder={["id", "name", "city"]}
        virtualized
        rowHeight={(rowIndex) => (rowIndex === 0 ? 88 : 48)}
        minRowHeight={32}
      />
    </FixtureFrame>
  );
}

function BoundedRowHeightScenario(): React.ReactNode {
  const apiRef = React.useRef<TypeComputedProps | null>(null);
  const scopeRef = React.useRef<HTMLDivElement | null>(null);
  const [measurements, setMeasurements] = React.useState<{
    maximum: NaturalMeasurement;
    minimum: NaturalMeasurement;
  }>({
    maximum: emptyNaturalMeasurement,
    minimum: emptyNaturalMeasurement,
  });
  const rows = React.useMemo(
    () =>
      Array.from({ length: 12 }, (_, index) => ({
        id: `bounded-${index + 1}`,
        label: index === 0 ? "Maximum clamp" : `Bounded row ${index + 1}`,
      })),
    []
  );

  const captureMeasurements = React.useCallback(() => {
    const virtualList = apiRef.current?.getVirtualList();
    const virtualRows = virtualList?.getRows() ?? [];
    const captureAt = (rowIndex: number): NaturalMeasurement => {
      const node = scopeRef.current?.querySelector<HTMLElement>(
        `[data-slot="grid-row"][data-row-id="bounded-${rowIndex + 1}"]`
      );
      const virtualRow = virtualRows.find(
        (candidate) => candidate.rowIndex === rowIndex
      );
      const nextVirtualRow = virtualRows.find(
        (candidate) => candidate.rowIndex === rowIndex + 1
      );

      return {
        domHeight: node
          ? Math.round(node.getBoundingClientRect().height)
          : null,
        virtualHeight:
          typeof virtualRow?.height === "number"
            ? Math.round(virtualRow.height)
            : null,
        virtualStart:
          typeof virtualRow?.start === "number"
            ? Math.round(virtualRow.start)
            : null,
        virtualEnd:
          typeof virtualRow?.end === "number"
            ? Math.round(virtualRow.end)
            : null,
        nextVirtualStart:
          typeof nextVirtualRow?.start === "number"
            ? Math.round(nextVirtualRow.start)
            : null,
        totalVirtualHeight:
          typeof virtualList?.getTotalRowHeight() === "number"
            ? Math.round(virtualList.getTotalRowHeight())
            : null,
      };
    };

    setMeasurements({ maximum: captureAt(0), minimum: captureAt(1) });
  }, []);

  return (
    <div ref={scopeRef} className="space-y-3">
      <Button
        type="button"
        data-testid="capture-bounded-height"
        onClick={captureMeasurements}
      >
        Capture bounded heights
      </Button>
      <div className="grid gap-2 md:grid-cols-2">
        <MetricOutput label="Maximum clamp" testId="bounded-maximum">
          {JSON.stringify(measurements.maximum)}
        </MetricOutput>
        <MetricOutput label="Minimum clamp" testId="bounded-minimum">
          {JSON.stringify(measurements.minimum)}
        </MetricOutput>
      </div>
      <FixtureFrame className="h-[320px] w-[560px]">
        <CommonGrid
          idProperty="id"
          columns={[{ name: "label", header: "Label", width: 360 }]}
          dataSource={rows}
          columnOrder={["label"]}
          virtualized
          rowHeight={(rowIndex) => (rowIndex === 0 ? 140 : 20)}
          minRowHeight={40}
          maxRowHeight={80}
          onReady={(ref) => {
            apiRef.current = ref.current;
          }}
        />
      </FixtureFrame>
    </div>
  );
}

function NaturalResizeScenario(): React.ReactNode {
  const apiRef = React.useRef<TypeComputedProps | null>(null);
  const scopeRef = React.useRef<HTMLDivElement | null>(null);
  const [descriptionWidth, setDescriptionWidth] = React.useState(140);
  const [measurement, setMeasurement] = React.useState<NaturalMeasurement>(
    emptyNaturalMeasurement
  );

  const rows = React.useMemo(
    () =>
      Array.from({ length: 16 }, (_, index) => ({
        id: `resize-natural-${index + 1}`,
        description:
          index === 0
            ? "Natural row height must be recalculated whenever a controlled column width changes and this deliberately long sentence wraps onto a different number of lines in the resized column."
            : `Compact row ${index + 2}`,
        filler: `Filler ${index + 1}`,
      })),
    []
  );

  const columns = React.useMemo<TypeColumns>(
    () => [
      {
        name: "description",
        header: "Description",
        width: descriptionWidth,
        minWidth: 100,
        maxWidth: 420,
        render: ({ value }: CellProps) => (
          <span
            className="block w-full whitespace-normal break-words"
            style={{ lineHeight: "20px" }}
          >
            {String(value)}
          </span>
        ),
      },
      { name: "filler", header: "Filler", width: 500 },
    ],
    [descriptionWidth]
  );

  const captureMeasurement = React.useCallback(() => {
    const node = scopeRef.current?.querySelector<HTMLElement>(
      '[data-slot="grid-row"][data-row-id="resize-natural-1"]'
    );
    const virtualList = apiRef.current?.getVirtualList();
    const virtualRows = virtualList?.getRows() ?? [];
    const virtualRow = virtualRows.find(
      (candidate) => candidate.rowIndex === 0
    );
    const nextVirtualRow = virtualRows.find(
      (candidate) => candidate.rowIndex === 1
    );

    setMeasurement({
      domHeight: node ? Math.round(node.getBoundingClientRect().height) : null,
      virtualHeight:
        typeof virtualRow?.height === "number"
          ? Math.round(virtualRow.height)
          : null,
      virtualStart:
        typeof virtualRow?.start === "number"
          ? Math.round(virtualRow.start)
          : null,
      virtualEnd:
        typeof virtualRow?.end === "number" ? Math.round(virtualRow.end) : null,
      nextVirtualStart:
        typeof nextVirtualRow?.start === "number"
          ? Math.round(nextVirtualRow.start)
          : null,
      totalVirtualHeight:
        typeof virtualList?.getTotalRowHeight() === "number"
          ? Math.round(virtualList.getTotalRowHeight())
          : null,
    });
  }, []);

  return (
    <div ref={scopeRef} className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          data-testid="widen-natural-column"
          onClick={() => setDescriptionWidth(360)}
        >
          Widen description
        </Button>
        <Button
          type="button"
          data-testid="capture-natural-resize"
          onClick={captureMeasurement}
        >
          Capture resized height
        </Button>
      </div>
      <div className="grid gap-2 md:grid-cols-[11rem_minmax(0,1fr)]">
        <MetricOutput label="Description width" testId="natural-resize-width">
          {descriptionWidth}
        </MetricOutput>
        <MetricOutput
          label="Virtual measurement"
          testId="natural-resize-measurement"
        >
          {JSON.stringify(measurement)}
        </MetricOutput>
      </div>
      <FixtureFrame className="h-[320px] w-[620px]">
        <CommonGrid
          idProperty="id"
          columns={columns}
          dataSource={rows}
          columnOrder={["description", "filler"]}
          virtualized
          rowHeight={null}
          minRowHeight={36}
          onReady={(ref) => {
            apiRef.current = ref.current;
          }}
        />
      </FixtureFrame>
    </div>
  );
}

type ResizeEvent = {
  columnId: string;
  width: number | null;
  flex: number | null;
  reservedViewportWidth: number | null;
};

function sanitizeResizeEvent(
  info: TypeColumnResizeInfo,
  context: TypeColumnResizeContext
): ResizeEvent {
  return {
    columnId: String(info.column.id ?? info.column.name ?? ""),
    width: typeof info.width === "number" ? Math.round(info.width) : null,
    flex: typeof info.flex === "number" ? info.flex : null,
    reservedViewportWidth:
      typeof context?.reservedViewportWidth === "number"
        ? Math.round(context.reservedViewportWidth)
        : null,
  };
}

function ResizeCallbackScenario(): React.ReactNode {
  const [events, setEvents] = React.useState<ResizeEvent[]>([]);
  const columns = React.useMemo<TypeColumns>(
    () => [
      {
        name: "description",
        header: "Description",
        defaultWidth: 180,
        minWidth: 100,
        maxWidth: 420,
      },
      { name: "filler", header: "Filler", width: 520 },
    ],
    []
  );

  return (
    <div className="space-y-3">
      <div className="grid gap-2 md:grid-cols-[9rem_minmax(0,1fr)]">
        <MetricOutput label="Event count" testId="column-resize-event-count">
          {events.length}
        </MetricOutput>
        <MetricOutput label="Latest payload" testId="column-resize-last-event">
          {events.length ? JSON.stringify(events.at(-1)) : "none"}
        </MetricOutput>
      </div>
      <FixtureFrame className="h-[280px] w-[560px]">
        <CommonGrid
          idProperty="id"
          columns={columns}
          dataSource={baseRows.map((row) => ({
            ...row,
            description: `${row.name} description`,
            filler: row.city,
          }))}
          columnOrder={["description", "filler"]}
          virtualized={false}
          resizable
          onColumnResize={(info, context) => {
            const event = sanitizeResizeEvent(info, context);
            setEvents((current) => [...current, event]);
          }}
        />
      </FixtureFrame>
    </div>
  );
}

function ZebraScenario(props: { disabled: boolean }): React.ReactNode {
  return (
    <div
      className={props.disabled ? "inovua-parity-zebra-disabled" : ""}
      data-testid={
        props.disabled ? "zebra-disabled-scope" : "zebra-default-scope"
      }
    >
      {props.disabled ? (
        <style>{`
          .inovua-parity-zebra-disabled .tdg-root {
            --tdg-row-odd-bg: rgb(254 202 202);
            --tdg-row-even-bg: rgb(191 219 254);
          }
        `}</style>
      ) : null}
      <FixtureFrame className="h-[260px] w-[560px]">
        <CommonGrid
          idProperty="id"
          columns={baseColumns}
          dataSource={baseRows}
          columnOrder={["id", "name", "city"]}
          virtualized={false}
          showZebraRows={props.disabled ? false : undefined}
        />
      </FixtureFrame>
    </div>
  );
}

type EditEvent = {
  type: "start" | "stop" | "complete" | "cancel" | "value";
  rowId: string | number;
  rowIndex: number;
  columnId: string;
  columnIndex: number;
  value: unknown;
};

function sanitizeEditEvent(
  type: EditEvent["type"],
  info: TypeEditInfo
): EditEvent {
  return {
    type,
    rowId: info.rowId,
    rowIndex: info.rowIndex,
    columnId: String(info.columnId),
    columnIndex: info.columnIndex,
    value: info.value ?? null,
  };
}

function EditingScenario(props: { clickToEdit: boolean }): React.ReactNode {
  const [events, setEvents] = React.useState<EditEvent[]>([]);
  const appendEvent = React.useCallback(
    (type: EditEvent["type"], info: TypeEditInfo) => {
      const event = sanitizeEditEvent(type, info);
      setEvents((current) => [...current, event]);
    },
    []
  );
  const columns = React.useMemo<TypeColumns>(
    () => [
      { name: "id", header: "ID", width: 100, editable: false },
      { name: "name", header: "Name", width: 220 },
      { name: "city", header: "City", width: 220 },
    ],
    []
  );

  return (
    <div className="space-y-3">
      <MetricOutput label="Lifecycle event log" testId="edit-events" wrap>
        {JSON.stringify(events, null, 2)}
      </MetricOutput>
      <FixtureFrame className="h-[280px] w-[620px]">
        <CommonGrid
          idProperty="id"
          columns={columns}
          dataSource={baseRows}
          columnOrder={["id", "name", "city"]}
          virtualized={false}
          editable
          editStartEvent={props.clickToEdit ? "click" : undefined}
          onEditStart={(info) => appendEvent("start", info)}
          onEditStop={(info) => appendEvent("stop", info)}
          onEditComplete={(info) => appendEvent("complete", info)}
          onEditCancel={(info) => appendEvent("cancel", info)}
          onEditValueChange={(info) => appendEvent("value", info)}
        />
      </FixtureFrame>
    </div>
  );
}

type CompatEditorCell = {
  getDOMNode?: () => HTMLElement | null;
};

type InovuaCompatEditorProps = TypeColumnEditorProps & {
  customMarker?: string;
  editorProps?: Record<string, unknown>;
  theme?: string;
  rtl?: boolean;
  nativeScroll?: boolean;
  cell?: CompatEditorCell;
  gotoNext?: () => void;
  gotoPrev?: () => void;
  onClick?: React.MouseEventHandler<HTMLElement>;
};

type CustomEditorContractReport = {
  topLevelMarker: unknown;
  nestedMarker: unknown;
  theme: unknown;
  rtl: unknown;
  nativeScroll: unknown;
  hasCell: boolean;
  hasCellProps: boolean;
  getDOMNodeColumnId: string | null;
  secondCellPropsSame: boolean;
  thirdCellSame: boolean;
  hasGotoNext: boolean;
  hasGotoPrev: boolean;
  hasClickHandler: boolean;
};

function ContractEditor(
  props: InovuaCompatEditorProps & {
    onContract: (report: CustomEditorContractReport) => void;
    secondCellPropsSame: boolean;
    thirdCellSame: boolean;
  }
): React.ReactNode {
  const reportedRef = React.useRef(false);
  React.useLayoutEffect(() => {
    if (reportedRef.current) return;
    reportedRef.current = true;
    window.requestAnimationFrame(() => {
      const domNode = props.cell?.getDOMNode?.() ?? null;
      props.onContract({
        topLevelMarker: props.customMarker ?? null,
        nestedMarker: props.editorProps?.customMarker ?? null,
        theme: props.theme ?? null,
        rtl: props.rtl ?? null,
        nativeScroll: props.nativeScroll ?? null,
        hasCell: Boolean(props.cell),
        hasCellProps: Boolean(props.cellProps),
        getDOMNodeColumnId: domNode?.getAttribute("data-column-id") ?? null,
        secondCellPropsSame: props.secondCellPropsSame,
        thirdCellSame: props.thirdCellSame,
        hasGotoNext: typeof props.gotoNext === "function",
        hasGotoPrev: typeof props.gotoPrev === "function",
        hasClickHandler: typeof props.onClick === "function",
      });
    });
  }, [props]);

  return (
    <input
      autoFocus={props.autoFocus}
      className="h-9 w-full rounded-md border bg-background px-2 text-sm"
      data-testid="compat-custom-editor"
      value={String(props.value ?? "")}
      onChange={(event) => props.onChange(event.target.value)}
      onClick={props.onClick as React.MouseEventHandler<HTMLInputElement>}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          props.onCancel();
        }
      }}
    />
  );
}

function CustomEditorScenario(): React.ReactNode {
  const [contract, setContract] =
    React.useState<CustomEditorContractReport | null>(null);
  const [bubbleCount, setBubbleCount] = React.useState(0);
  const columns = React.useMemo(
    () =>
      [
        { name: "id", header: "ID", width: 100, editable: false },
        {
          name: "name",
          header: "Name",
          width: 280,
          editable: true,
          editorProps: { customMarker: "column-editor-props" },
          renderEditor: (
            rawEditorProps: TypeColumnEditorProps,
            secondCellProps?: CellProps,
            thirdCell?: CompatEditorCell
          ) => {
            const editorProps = rawEditorProps as InovuaCompatEditorProps;
            const { key: editorKey, ...contractEditorProps } = editorProps;
            return (
              <ContractEditor
                key={String(editorKey ?? "editor")}
                {...contractEditorProps}
                onContract={setContract}
                secondCellPropsSame={secondCellProps === editorProps.cellProps}
                thirdCellSame={thirdCell === editorProps.cell}
              />
            );
          },
        },
        { name: "city", header: "City", width: 220, editable: false },
      ] as unknown as TypeColumns,
    []
  );

  return (
    <div className="space-y-3">
      <div className="grid gap-2 md:grid-cols-[9rem_minmax(0,1fr)]">
        <MetricOutput label="Outer click count" testId="custom-editor-bubbles">
          {bubbleCount}
        </MetricOutput>
        <MetricOutput
          label="Editor contract"
          testId="custom-editor-contract"
          wrap
        >
          {contract ? JSON.stringify(contract, null, 2) : "none"}
        </MetricOutput>
      </div>
      <div onClick={() => setBubbleCount((current) => current + 1)}>
        <FixtureFrame className="h-[280px] w-[620px]">
          <CommonGrid
            idProperty="id"
            columns={columns}
            dataSource={baseRows}
            columnOrder={["id", "name", "city"]}
            virtualized={false}
            editable
          />
        </FixtureFrame>
      </div>
    </div>
  );
}

function AsyncEditableScenario(): React.ReactNode {
  const deferredResolveRef = React.useRef<((allowed: boolean) => void) | null>(
    null
  );
  const [checks, setChecks] = React.useState<string[]>([]);
  const [starts, setStarts] = React.useState<string[]>([]);
  const [cellPropsReport, setCellPropsReport] = React.useState<Record<
    string,
    unknown
  > | null>(null);
  const rows = React.useMemo(
    () => [
      { id: "editable-deferred", name: "Deferred" },
      { id: "editable-falsy", name: "Falsy" },
      { id: "editable-rejected", name: "Rejected" },
      { id: "editable-allowed", name: "Allowed" },
    ],
    []
  );
  const columns = React.useMemo<TypeColumns>(
    () => [
      { name: "id", header: "ID", width: 190, editable: false },
      {
        name: "name",
        header: "Name",
        width: 260,
        editable: (_value, cellProps) => {
          const rowId = String(cellProps.data.id);
          setChecks((current) => [...current, rowId]);
          setCellPropsReport({
            rowId: cellProps.rowId,
            rowIndex: cellProps.rowIndex,
            rowRenderIndex: cellProps.rowRenderIndex,
            remoteRowIndex: cellProps.remoteRowIndex,
            id: cellProps.id,
            name: cellProps.name,
            columnId: cellProps.columnId,
            columnIndex: cellProps.columnIndex,
            computedAbsoluteIndex: cellProps.computedAbsoluteIndex,
            computedVisibleIndex: cellProps.computedVisibleIndex,
            computedVisibleCount: cellProps.computedVisibleCount,
            computedWidth: cellProps.computedWidth,
            editableIsPredicate: typeof cellProps.editable === "function",
            computedEditableIsPredicate:
              typeof cellProps.computedEditable === "function",
            hasEditValue: "editValue" in cellProps,
            hasInEdit: "inEdit" in cellProps,
            rowActive: cellProps.rowActive,
            rowSelected: cellProps.rowSelected,
            multiSelect: cellProps.multiSelect,
            naturalRowHeight: cellProps.naturalRowHeight,
            rowHeight: cellProps.rowHeight,
            minRowHeight: cellProps.minRowHeight,
            initialRowHeight: cellProps.initialRowHeight,
            totalDataCount: cellProps.totalDataCount,
            theme: cellProps.theme,
            nativeScroll: cellProps.nativeScroll,
            rtl: cellProps.rtl,
            virtualizeColumns: cellProps.virtualizeColumns,
          });

          if (rowId === "editable-deferred") {
            return new Promise<boolean>((resolve) => {
              deferredResolveRef.current = resolve;
            });
          }
          if (rowId === "editable-falsy") return undefined;
          if (rowId === "editable-rejected") {
            return Promise.reject(new Error("compat editable rejection"));
          }
          return true;
        },
      },
    ],
    []
  );

  return (
    <div className="space-y-3">
      <Button
        type="button"
        data-testid="resolve-deferred-editable"
        onClick={() => {
          deferredResolveRef.current?.(true);
          deferredResolveRef.current = null;
        }}
      >
        Resolve deferred as editable
      </Button>
      <div className="grid gap-2 md:grid-cols-3">
        <MetricOutput
          label="Editable checks"
          testId="async-editable-checks"
          wrap
        >
          {JSON.stringify(checks)}
        </MetricOutput>
        <MetricOutput label="Edit starts" testId="async-editable-starts" wrap>
          {JSON.stringify(starts)}
        </MetricOutput>
        <MetricOutput
          label="Pointer CellProps"
          testId="async-editable-cell-props"
          wrap
        >
          {cellPropsReport ? JSON.stringify(cellPropsReport) : "null"}
        </MetricOutput>
      </div>
      <FixtureFrame className="h-[320px] w-[560px]">
        <CommonGrid
          idProperty="id"
          columns={columns}
          dataSource={rows}
          columnOrder={["id", "name"]}
          virtualized={false}
          onEditStart={(info) =>
            setStarts((current) => [...current, String(info.rowId)])
          }
        />
      </FixtureFrame>
    </div>
  );
}

type AsyncCompletionStatus = "idle" | "pending" | "resolved" | "rejected";

function AsyncCompletionScenario(): React.ReactNode {
  const deferredRef = React.useRef<{
    resolve: () => void;
    reject: () => void;
  } | null>(null);
  const [status, setStatus] = React.useState<AsyncCompletionStatus>("idle");
  const [events, setEvents] = React.useState<EditEvent[]>([]);
  const appendEvent = React.useCallback(
    (type: EditEvent["type"], info: TypeEditInfo) => {
      setEvents((current) => [...current, sanitizeEditEvent(type, info)]);
    },
    []
  );
  const rows = React.useMemo(
    () => [
      { id: "complete-deferred", name: "Deferred completion" },
      { id: "complete-rejected", name: "Rejected completion" },
      { id: "complete-newer", name: "Newer edit session" },
    ],
    []
  );
  const columns = React.useMemo<TypeColumns>(
    () => [
      { name: "id", header: "ID", width: 190, editable: false },
      { name: "name", header: "Name", width: 300, editable: true },
    ],
    []
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          data-testid="resolve-deferred-completion"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            deferredRef.current?.resolve();
            deferredRef.current = null;
            setStatus("resolved");
          }}
        >
          Resolve old completion
        </Button>
        <Button
          type="button"
          variant="outline"
          data-testid="reject-deferred-completion"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            deferredRef.current?.reject();
            deferredRef.current = null;
            setStatus("rejected");
          }}
        >
          Reject old completion
        </Button>
      </div>
      <div className="grid gap-2 md:grid-cols-[9rem_minmax(0,1fr)]">
        <MetricOutput label="Promise state" testId="completion-status">
          {status}
        </MetricOutput>
        <MetricOutput label="Lifecycle events" testId="completion-events" wrap>
          {JSON.stringify(events, null, 2)}
        </MetricOutput>
      </div>
      <FixtureFrame className="h-[300px] w-[620px]">
        <CommonGrid
          idProperty="id"
          columns={columns}
          dataSource={rows}
          columnOrder={["id", "name"]}
          virtualized={false}
          editable
          onEditStart={(info) => appendEvent("start", info)}
          onEditStop={(info) => appendEvent("stop", info)}
          onEditCancel={(info) => appendEvent("cancel", info)}
          onEditValueChange={(info) => appendEvent("value", info)}
          onEditComplete={(info) => {
            appendEvent("complete", info);
            if (info.rowId === "complete-deferred") {
              setStatus("pending");
              return new Promise<void>((resolve, reject) => {
                deferredRef.current = { resolve, reject };
              });
            }
            if (info.rowId === "complete-rejected") {
              setStatus("rejected");
              return Promise.reject(new Error("compat completion rejection"));
            }
            return undefined;
          }}
        />
      </FixtureFrame>
    </div>
  );
}

function NavigationEditor(props: InovuaCompatEditorProps): React.ReactNode {
  const [pendingStaticFallback, setPendingStaticFallback] =
    React.useState(false);
  const onStaticFallback = props.editorProps?.onStaticFallback;
  const { onEnterNavigation } = props;

  React.useEffect(() => {
    if (!pendingStaticFallback) return;

    setPendingStaticFallback(false);
    onEnterNavigation(true, 1);
  }, [onEnterNavigation, pendingStaticFallback]);

  return (
    <div className="flex min-w-0 items-center gap-1" onClick={props.onClick}>
      <input
        autoFocus={props.autoFocus}
        className="h-8 min-w-0 flex-1 rounded-md border bg-background px-2 text-sm"
        data-testid="navigation-editor"
        value={String(props.value ?? "")}
        onChange={(event) => props.onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            props.onCancel();
          } else if (event.key === "Enter") {
            event.preventDefault();
            props.onEnterNavigation(
              true,
              event.shiftKey ? -1 : 1,
              event.nativeEvent
            );
          } else if (event.key === "Tab") {
            event.preventDefault();
            props.onTabNavigation(
              true,
              event.shiftKey ? -1 : 1,
              event.nativeEvent
            );
          }
        }}
      />
      <button
        type="button"
        className="rounded border px-1 text-[10px]"
        data-testid="stop-only-enter"
        onClick={() => props.onEnterNavigation(false, 1)}
      >
        Stop ↓
      </button>
      <button
        type="button"
        className="rounded border px-1 text-[10px]"
        data-testid="stop-only-tab"
        onClick={() => props.onTabNavigation(false, 1)}
      >
        Stop →
      </button>
      <button
        type="button"
        className="rounded border px-1 text-[10px]"
        data-testid="static-fallback-enter"
        onClick={() => {
          // Simulate a controlled column update while this editor is open.
          // Enter must skip the now-static non-editable column on the next
          // row and use the next eligible column in the same direction.
          if (typeof onStaticFallback === "function") {
            onStaticFallback();
          }
          setPendingStaticFallback(true);
        }}
      >
        Static fallback ↓
      </button>
    </div>
  );
}

function EditingNavigationScenario(): React.ReactNode {
  const [events, setEvents] = React.useState<EditEvent[]>([]);
  const [nameEditable, setNameEditable] = React.useState(true);
  const appendEvent = React.useCallback(
    (type: EditEvent["type"], info: TypeEditInfo) =>
      setEvents((current) => [...current, sanitizeEditEvent(type, info)]),
    []
  );
  const columns = React.useMemo(
    () =>
      [
        { name: "id", header: "ID", width: 100, editable: false },
        {
          name: "name",
          header: "Name",
          width: 300,
          editable: nameEditable,
          editor: NavigationEditor,
          editorProps: {
            onStaticFallback: () => setNameEditable(false),
          },
        },
        {
          name: "city",
          header: "City",
          width: 300,
          editable: true,
          editor: NavigationEditor,
        },
      ] as unknown as TypeColumns,
    [nameEditable]
  );

  return (
    <div className="space-y-3">
      <MetricOutput
        label="Navigation lifecycle"
        testId="navigation-events"
        wrap
      >
        {JSON.stringify(events, null, 2)}
      </MetricOutput>
      <FixtureFrame className="h-[340px] w-[720px]">
        <CommonGrid
          idProperty="id"
          columns={columns}
          dataSource={baseRows}
          columnOrder={["id", "name", "city"]}
          virtualized={false}
          editable
          rowHeight={64}
          onEditStart={(info) => appendEvent("start", info)}
          onEditStop={(info) => appendEvent("stop", info)}
          onEditComplete={(info) => appendEvent("complete", info)}
          onEditCancel={(info) => appendEvent("cancel", info)}
          onEditValueChange={(info) => appendEvent("value", info)}
        />
      </FixtureFrame>
    </div>
  );
}

type ImperativeSnapshot = {
  info: Pick<
    TypeEditInfo,
    "rowId" | "rowIndex" | "columnId" | "columnIndex" | "value"
  > | null;
  isInEdit: boolean;
  hasCompletionPromise: boolean;
};

function ImperativeFocusOnlyEditor(
  props: TypeColumnEditorProps
): React.ReactNode {
  return (
    <input
      autoFocus={props.autoFocus}
      aria-label="Custom"
      className="h-8 min-w-0 w-full rounded-md border bg-background px-2 text-sm"
      data-testid="imperative-focus-only-editor"
      value={String(props.value ?? "")}
      onChange={(event) => props.onChange(event.target.value)}
      onClick={(event) => event.stopPropagation()}
    />
  );
}

function ImperativeEditingScenario(): React.ReactNode {
  const apiRef = React.useRef<TypeComputedProps | null>(null);
  const scopeRef = React.useRef<HTMLDivElement | null>(null);
  const [calls, setCalls] = React.useState<string[]>([]);
  const [snapshot, setSnapshot] = React.useState<ImperativeSnapshot>({
    info: null,
    isInEdit: false,
    hasCompletionPromise: false,
  });
  const [events, setEvents] = React.useState<EditEvent[]>([]);
  const appendCall = React.useCallback((value: string) => {
    setCalls((current) => [...current, value]);
  }, []);
  const captureState = React.useCallback(() => {
    const api = apiRef.current;
    const currentInfo = api?.getCurrentEditInfo?.() as TypeEditInfo | null;
    const isInEditValue = api?.isInEdit;
    const completionPromiseValue = api?.currentEditCompletePromise;
    const info = currentInfo
      ? {
          rowId: currentInfo.rowId,
          rowIndex: currentInfo.rowIndex,
          columnId: currentInfo.columnId,
          columnIndex: currentInfo.columnIndex,
          value: currentInfo.value,
        }
      : null;

    setSnapshot({
      info,
      isInEdit: Boolean(
        isInEditValue && typeof isInEditValue === "object"
          ? isInEditValue.current
          : isInEditValue
      ),
      hasCompletionPromise: Boolean(
        completionPromiseValue && typeof completionPromiseValue === "object"
          ? completionPromiseValue.current
          : completionPromiseValue
      ),
    });
  }, []);
  const columns = React.useMemo<TypeColumns>(
    () => [
      { name: "id", header: "ID", width: 100, editable: false },
      { name: "name", header: "Name", width: 220, editable: true },
      { name: "city", header: "City", width: 220, editable: true },
      {
        name: "custom",
        header: "Custom",
        width: 220,
        editable: true,
        editor: ImperativeFocusOnlyEditor,
      },
    ],
    []
  );
  const [rows, setRows] = React.useState(() => [
    {
      id: 101,
      name: "Ada Lovelace",
      city: "London",
      custom: "Default custom editor",
    },
    {
      id: 102,
      name: "Grace Hopper",
      city: "New York",
      custom: "Second custom editor",
    },
    {
      id: 103,
      name: "Katherine Johnson",
      city: "White Sulphur Springs",
      custom: "Third custom editor",
    },
    ...Array.from({ length: 37 }, (_, index) => ({
      id: 104 + index,
      name: `Virtual row ${104 + index}`,
      city: `City ${104 + index}`,
      custom: `Custom ${104 + index}`,
    })),
  ]);
  const [columnOrder, setColumnOrder] = React.useState([
    "id",
    "name",
    "city",
    "custom",
  ]);

  return (
    <div ref={scopeRef} className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          data-testid="api-start-edit"
          onMouseDown={(event) => event.preventDefault()}
          onClick={async () => {
            try {
              const result = await apiRef.current?.startEdit?.({
                rowIndex: 0,
                columnId: 1,
                value: "Imperative seed",
              });
              appendCall(`startEdit:${String(result)}`);
            } catch (error) {
              appendCall(`startEdit:error:${String(error)}`);
            }
          }}
        >
          startEdit row 1 Name
        </Button>
        <Button
          type="button"
          data-testid="api-start-replace"
          onMouseDown={(event) => event.preventDefault()}
          onClick={async () => {
            try {
              const result = await apiRef.current?.startEdit?.({
                rowIndex: 2,
                columnId: 1,
                value: "Start replacement",
              });
              appendCall(`startEditReplace:${String(result)}`);
            } catch (error) {
              appendCall(`startEditReplace:error:${String(error)}`);
            }
          }}
        >
          startEdit replaces with row 3 Name
        </Button>
        <Button
          type="button"
          data-testid="api-try-start-edit"
          onMouseDown={(event) => event.preventDefault()}
          onClick={async () => {
            try {
              const result = await apiRef.current?.tryStartEdit?.({
                rowIndex: 1,
                columnId: 2,
              });
              appendCall(`tryStartEdit:${String(result)}`);
            } catch (error) {
              appendCall(`tryStartEdit:error:${String(error)}`);
            }
          }}
        >
          tryStartEdit row 2 City
        </Button>
        <Button
          type="button"
          data-testid="api-start-custom-edit"
          onMouseDown={(event) => event.preventDefault()}
          onClick={async () => {
            try {
              const result = await apiRef.current?.startEdit?.({
                rowIndex: 0,
                columnId: "custom",
              });
              appendCall(`startCustomEdit:${String(result)}`);
            } catch (error) {
              appendCall(`startCustomEdit:error:${String(error)}`);
            }
          }}
        >
          startEdit custom editor
        </Button>
        <Button
          type="button"
          variant="outline"
          data-testid="api-complete-edit"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            const result = apiRef.current?.completeEdit?.({
              value: "Completed by API",
            });
            appendCall(`completeEdit:${String(result)}`);
          }}
        >
          completeEdit
        </Button>
        <Button
          type="button"
          variant="outline"
          data-testid="api-complete-live-value"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            apiRef.current?.completeEdit?.({
              rowIndex: 0,
              columnId: "name",
            });
            window.setTimeout(() => {
              const input = scopeRef.current?.querySelector<HTMLInputElement>(
                '[data-column-id="name"] input'
              );
              const valueSetter = Object.getOwnPropertyDescriptor(
                HTMLInputElement.prototype,
                "value"
              )?.set;
              if (!input || !valueSetter) return;
              valueSetter.call(input, "Live delayed draft");
              input.dispatchEvent(new Event("input", { bubbles: true }));
            }, 10);
          }}
        >
          completeEdit with live draft
        </Button>
        <Button
          type="button"
          variant="outline"
          data-testid="api-complete-live-identity"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            apiRef.current?.completeEdit?.({
              rowIndex: 0,
              columnId: "name",
            });
            window.setTimeout(() => {
              const input = scopeRef.current?.querySelector<HTMLInputElement>(
                '[data-column-id="name"] input'
              );
              const valueSetter = Object.getOwnPropertyDescriptor(
                HTMLInputElement.prototype,
                "value"
              )?.set;
              if (input && valueSetter) {
                valueSetter.call(input, "Live identity draft");
                input.dispatchEvent(new Event("input", { bubbles: true }));
              }

              setRows((current) =>
                current.map((row, index) =>
                  index === 0 ? { ...row, id: 901 } : row
                )
              );
              setColumnOrder(["id", "city", "name", "custom"]);
            }, 10);
          }}
        >
          completeEdit after live identity change
        </Button>
        <Button
          type="button"
          variant="outline"
          data-testid="api-cancel-edit"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            const result = apiRef.current?.cancelEdit?.();
            appendCall(`cancelEdit:${String(result)}`);
          }}
        >
          cancelEdit
        </Button>
        <Button
          type="button"
          variant="outline"
          data-testid="api-complete-target"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            apiRef.current?.completeEdit?.({
              rowId: "0102",
              columnId: "city",
            });
          }}
        >
          completeEdit row 102 City
        </Button>
        <Button
          type="button"
          variant="outline"
          data-testid="api-complete-fallback"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            apiRef.current?.completeEdit?.({
              rowIndex: 1,
              columnId: "missing-column",
              value: "Fallback completion",
            });
          }}
        >
          completeEdit invalid column
        </Button>
        <Button
          type="button"
          variant="outline"
          data-testid="api-complete-noneditable"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            apiRef.current?.completeEdit?.({
              rowIndex: 1,
              columnId: 0,
              value: "Must not dispatch",
            });
          }}
        >
          completeEdit non-editable ID
        </Button>
        <Button
          type="button"
          variant="outline"
          data-testid="api-cancel-target"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            apiRef.current?.cancelEdit?.({ rowIndex: 1, columnId: 2 });
          }}
        >
          cancelEdit row 102 City
        </Button>
        <Button
          type="button"
          variant="outline"
          data-testid="api-cancel-noneditable"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            apiRef.current?.cancelEdit?.({ rowIndex: 1, columnId: "id" });
          }}
        >
          cancelEdit non-editable ID
        </Button>
        <Button
          type="button"
          variant="outline"
          data-testid="api-cancel-offscreen"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            apiRef.current?.cancelEdit?.({ rowIndex: 39, columnId: "city" });
          }}
        >
          cancelEdit offscreen row 140
        </Button>
        <Button
          type="button"
          variant="outline"
          data-testid="api-cancel-missing-row"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            apiRef.current?.cancelEdit?.({ columnId: "city" });
          }}
        >
          cancelEdit City without row
        </Button>
        <Button
          type="button"
          variant="outline"
          data-testid="api-cancel-zero-column"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            apiRef.current?.cancelEdit?.({ rowIndex: 1, columnId: 0 });
          }}
        >
          cancelEdit numeric column 0
        </Button>
        <Button
          type="button"
          variant="secondary"
          data-testid="api-capture-state"
          onMouseDown={(event) => event.preventDefault()}
          onClick={captureState}
        >
          Read editing state
        </Button>
      </div>
      <div className="grid gap-2 lg:grid-cols-3">
        <MetricOutput label="Calls" testId="imperative-calls" wrap>
          {JSON.stringify(calls)}
        </MetricOutput>
        <MetricOutput label="Current state" testId="imperative-state" wrap>
          {JSON.stringify(snapshot, null, 2)}
        </MetricOutput>
        <MetricOutput label="Lifecycle" testId="imperative-events" wrap>
          {JSON.stringify(events, null, 2)}
        </MetricOutput>
      </div>
      <FixtureFrame className="h-[300px] w-[620px]">
        <CommonGrid
          idProperty="id"
          columns={columns}
          dataSource={rows}
          columnOrder={columnOrder}
          virtualized
          editable
          onReady={(ref) => {
            apiRef.current = ref.current;
          }}
          onEditStart={(info) =>
            setEvents((current) => [
              ...current,
              sanitizeEditEvent("start", info),
            ])
          }
          onEditStop={(info) =>
            setEvents((current) => [
              ...current,
              sanitizeEditEvent("stop", info),
            ])
          }
          onEditComplete={(info) =>
            setEvents((current) => [
              ...current,
              sanitizeEditEvent("complete", info),
            ])
          }
          onEditCancel={(info) =>
            setEvents((current) => [
              ...current,
              sanitizeEditEvent("cancel", info),
            ])
          }
        />
      </FixtureFrame>
    </div>
  );
}

function MobileColumnEditingScenario(): React.ReactNode {
  const columns = React.useMemo<TypeColumns>(
    () => [
      { name: "id", header: "ID", width: 100, editable: false },
      { name: "name", header: "Name", width: 240, editable: true },
      { name: "city", header: "City", width: 220, editable: false },
    ],
    []
  );

  return (
    <FixtureFrame className="h-[300px] w-[620px]">
      <CommonGrid
        idProperty="id"
        columns={columns}
        dataSource={baseRows}
        columnOrder={["id", "name", "city"]}
        virtualized={false}
        allowMobileTransform
      />
    </FixtureFrame>
  );
}

function RowStyleScenario(): React.ReactNode {
  const rows = [
    { id: "style-blocked", task: "Blocked migration", status: "blocked" },
    { id: "style-ready", task: "Ready migration", status: "ready" },
  ];
  const columns: TypeColumns = [
    { name: "task", header: "Task", width: 260 },
    { name: "status", header: "Status", width: 160 },
  ];

  return (
    <FixtureFrame className="h-[260px] w-[520px]">
      <CommonGrid
        idProperty="id"
        columns={columns}
        dataSource={rows}
        columnOrder={["task", "status"]}
        virtualized={false}
        rowStyle={({ data, props }) =>
          ({
            "--inovua-parity-row-status": String(data.status),
            "--inovua-parity-row-index": String(props.rowIndex),
            "--inovua-parity-remote-row-index": String(props.remoteRowIndex),
            "--inovua-parity-column-count": String(props.columns.length),
            "--inovua-parity-last-row": String(props.last),
            minHeight: data.status === "blocked" ? 72 : 40,
            outline:
              data.status === "blocked"
                ? "3px solid rgb(220, 38, 38)"
                : "1px solid rgb(22, 163, 74)",
          }) as React.CSSProperties
        }
      />
    </FixtureFrame>
  );
}

function StaticRowStyleScenario(): React.ReactNode {
  return (
    <FixtureFrame className="h-[260px] w-[520px]">
      <CommonGrid
        idProperty="id"
        columns={baseColumns}
        dataSource={baseRows}
        columnOrder={["id", "name", "city"]}
        virtualized={false}
        rowStyle={
          {
            "--inovua-parity-static-row": "applied",
            minHeight: 58,
            boxShadow: "inset 4px 0 rgb(124, 58, 237)",
          } as React.CSSProperties
        }
      />
    </FixtureFrame>
  );
}

function RowStyleContractScenario(): React.ReactNode {
  const scopeRef = React.useRef<HTMLDivElement | null>(null);
  const [capturedStyle, setCapturedStyle] = React.useState<
    Record<string, string>
  >({});
  const rows = React.useMemo(
    () => [
      { id: 101, task: "Page one A", status: "hidden" },
      { id: 102, task: "Page one B", status: "hidden" },
      { id: 103, task: "Page two A", status: "ready" },
      { id: 104, task: "Page two B", status: "ready" },
    ],
    []
  );
  const columns = React.useMemo<TypeColumns>(
    () => [
      { name: "task", header: "Task", width: 240 },
      { name: "status", header: "Status", width: 160 },
    ],
    []
  );
  const captureStyle = React.useCallback(() => {
    const element = scopeRef.current?.querySelector<HTMLElement>(
      '[data-slot="grid-row"][data-row-id="103"]'
    );
    if (!element) return;

    setCapturedStyle({
      marker: element.style.getPropertyValue("--row-contract-marker"),
      id: element.style.getPropertyValue("--row-contract-id"),
      idType: element.style.getPropertyValue("--row-contract-id-type"),
      rowIndex: element.style.getPropertyValue("--row-contract-row-index"),
      remoteRowIndex: element.style.getPropertyValue(
        "--row-contract-remote-index"
      ),
      baseHeight: element.style.getPropertyValue("--row-contract-base-height"),
      baseWidth: element.style.getPropertyValue("--row-contract-base-width"),
      baseMinWidth: element.style.getPropertyValue(
        "--row-contract-base-min-width"
      ),
      baseDirection: element.style.getPropertyValue(
        "--row-contract-base-direction"
      ),
      firstUnlocked: element.style.getPropertyValue(
        "--row-contract-first-unlocked"
      ),
      lastUnlocked: element.style.getPropertyValue(
        "--row-contract-last-unlocked"
      ),
      firstLockedStart: element.style.getPropertyValue(
        "--row-contract-first-locked-start"
      ),
      lastLockedEnd: element.style.getPropertyValue(
        "--row-contract-last-locked-end"
      ),
      height: element.style.height,
      width: element.style.width,
      minWidth: element.style.minWidth,
      direction: element.style.direction,
      backgroundColor: element.style.backgroundColor,
    });
  }, []);

  return (
    <div ref={scopeRef} className="space-y-3">
      <Button
        type="button"
        data-testid="capture-row-style-contract"
        onClick={captureStyle}
      >
        Capture rowStyle contract
      </Button>
      <MetricOutput
        label="Captured callback contract"
        testId="row-style-contract-output"
        wrap
      >
        {JSON.stringify(capturedStyle, null, 2)}
      </MetricOutput>
      <FixtureFrame className="h-[300px] w-[520px]">
        <CommonGrid
          idProperty="id"
          columns={columns}
          dataSource={rows}
          columnOrder={["task", "status"]}
          virtualized={false}
          pagination="local"
          skip={2}
          limit={2}
          rowHeight={54}
          rowStyle={({ props, style }) => {
            const mutableStyle = style as React.CSSProperties &
              Record<string, string | number>;
            mutableStyle["--row-contract-marker"] = "mutated";
            mutableStyle["--row-contract-id"] = String(props.id);
            mutableStyle["--row-contract-id-type"] = typeof props.id;
            mutableStyle["--row-contract-row-index"] = String(props.rowIndex);
            mutableStyle["--row-contract-remote-index"] = String(
              props.remoteRowIndex
            );
            mutableStyle["--row-contract-base-height"] = String(style.height);
            mutableStyle["--row-contract-base-width"] = String(style.width);
            mutableStyle["--row-contract-base-min-width"] = String(
              style.minWidth
            );
            mutableStyle["--row-contract-base-direction"] = String(
              style.direction
            );
            mutableStyle["--row-contract-first-unlocked"] = String(
              props.firstUnlockedIndex
            );
            mutableStyle["--row-contract-last-unlocked"] = String(
              props.lastUnlockedIndex
            );
            mutableStyle["--row-contract-first-locked-start"] = String(
              props.firstLockedStartIndex
            );
            mutableStyle["--row-contract-last-locked-end"] = String(
              props.lastLockedEndIndex
            );
            style.backgroundColor = "rgb(254, 249, 195)";
            return undefined;
          }}
        />
      </FixtureFrame>
    </div>
  );
}

function FlexScenario(): React.ReactNode {
  const apiRef = React.useRef<TypeComputedProps | null>(null);
  const [events, setEvents] = React.useState<ResizeEvent[]>([]);
  const columns: TypeColumns = [
    { name: "fixed", header: "Fixed", width: 120 },
    { name: "one", header: "Flex one", defaultFlex: 1, minWidth: 60 },
    { name: "two", header: "Flex two", flex: 2, minWidth: 60 },
  ];
  const rows = [{ id: "flex-row", fixed: "Fixed", one: "One", two: "Two" }];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          data-testid="imperative-resize-default-flex"
          onClick={() =>
            apiRef.current?.computedOnColumnResize?.({ index: 1, diff: 60 })
          }
        >
          Imperatively grow defaultFlex
        </Button>
      </div>
      <div className="grid gap-2 md:grid-cols-[9rem_minmax(0,1fr)]">
        <MetricOutput label="Event count" testId="flex-resize-event-count">
          {events.length}
        </MetricOutput>
        <MetricOutput label="Resize payloads" testId="flex-resize-events" wrap>
          {JSON.stringify(events)}
        </MetricOutput>
      </div>
      <FixtureFrame className="h-[240px] w-[720px]">
        <CommonGrid
          idProperty="id"
          columns={columns}
          dataSource={rows}
          columnOrder={["fixed", "one", "two"]}
          virtualized={false}
          resizable
          onReady={(ref) => {
            apiRef.current = ref.current;
          }}
          onColumnResize={(info, context) => {
            const event = sanitizeResizeEvent(info, context);
            setEvents((current) => [...current, event]);
          }}
        />
      </FixtureFrame>
      <div data-testid="flex-constrained">
        <FixtureFrame className="h-[180px] !w-[60px]">
          <CommonGrid
            idProperty="id"
            columns={[
              { name: "defaultMin", header: "", flex: 1 },
              { name: "zeroMin", header: "", flex: 1, minWidth: 0 },
            ]}
            dataSource={[{ id: "constrained", defaultMin: "", zeroMin: "" }]}
            columnOrder={["defaultMin", "zeroMin"]}
            virtualized={false}
          />
        </FixtureFrame>
      </div>
      <div className="max-w-full overflow-x-auto" data-testid="flex-unbounded">
        <FixtureFrame className="!h-[160px] !w-[10050px] !max-w-none">
          <CommonGrid
            idProperty="id"
            columns={[{ name: "wide", header: "", flex: 1 }]}
            dataSource={[{ id: "unbounded", wide: "" }]}
            columnOrder={["wide"]}
            virtualized={false}
          />
        </FixtureFrame>
      </div>
    </div>
  );
}

function ControlledWidthScenario(): React.ReactNode {
  const [controlledWidth, setControlledWidth] = React.useState(180);
  const [events, setEvents] = React.useState<ResizeEvent[]>([]);
  const columns = React.useMemo<TypeColumns>(
    () => [
      {
        name: "controlled",
        header: "Controlled",
        width: controlledWidth,
        minWidth: 100,
        maxWidth: 420,
      },
      { name: "filler", header: "Filler", width: 520 },
    ],
    [controlledWidth]
  );
  const rows = baseRows.map((row) => ({
    ...row,
    controlled: row.name,
    filler: row.city,
  }));

  return (
    <div className="space-y-3">
      <Button
        type="button"
        data-testid="set-controlled-width"
        onClick={() => setControlledWidth(300)}
      >
        Set controlled width to 300
      </Button>
      <div className="grid gap-2 md:grid-cols-[9rem_minmax(0,1fr)]">
        <MetricOutput label="Controlled value" testId="controlled-width-value">
          {controlledWidth}
        </MetricOutput>
        <MetricOutput
          label="Resize proposals"
          testId="controlled-resize-events"
          wrap
        >
          {JSON.stringify(events, null, 2)}
        </MetricOutput>
      </div>
      <FixtureFrame className="h-[280px] w-[560px]">
        <CommonGrid
          idProperty="id"
          columns={columns}
          dataSource={rows}
          columnOrder={["controlled", "filler"]}
          virtualized={false}
          resizable
          onColumnResize={(info, context) => {
            const event = sanitizeResizeEvent(info, context);
            setEvents((current) => [...current, event]);
          }}
        />
      </FixtureFrame>
    </div>
  );
}

function ScenarioContent(props: { scenario: ParityScenario }): React.ReactNode {
  switch (props.scenario) {
    case "natural-height":
      return <NaturalHeightScenario />;
    case "function-row-height":
      return <FunctionRowHeightScenario />;
    case "bounded-row-height":
      return <BoundedRowHeightScenario />;
    case "natural-resize":
      return <NaturalResizeScenario />;
    case "resize-callback":
      return <ResizeCallbackScenario />;
    case "zebra-default":
      return <ZebraScenario disabled={false} />;
    case "zebra-disabled":
      return <ZebraScenario disabled />;
    case "editing-default":
      return <EditingScenario clickToEdit={false} />;
    case "editing-click":
      return <EditingScenario clickToEdit />;
    case "editing-custom":
      return <CustomEditorScenario />;
    case "editing-async":
      return <AsyncEditableScenario />;
    case "editing-completion":
      return <AsyncCompletionScenario />;
    case "editing-navigation":
      return <EditingNavigationScenario />;
    case "editing-imperative":
      return <ImperativeEditingScenario />;
    case "editing-mobile":
      return <MobileColumnEditingScenario />;
    case "row-style":
      return <RowStyleScenario />;
    case "row-style-static":
      return <StaticRowStyleScenario />;
    case "row-style-contract":
      return <RowStyleContractScenario />;
    case "flex":
      return <FlexScenario />;
    case "controlled-width":
      return <ControlledWidthScenario />;
    default:
      return null;
  }
}

function ScenarioNavigation(props: {
  activeScenario: ParityScenario;
  onSelect: (scenario: ParityScenario) => void;
}) {
  return (
    <section
      className="space-y-4 rounded-2xl border bg-muted/15 p-4"
      aria-labelledby="parity-scenario-picker"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h3 id="parity-scenario-picker" className="text-base font-semibold">
            Choose a compatibility checkpoint
          </h3>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Each button loads one isolated behavior. The URL updates too, so a
            particular checkpoint can be shared or reopened directly.
          </p>
        </div>
        <div className="shrink-0 rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
          {scenarios.size} manual checks
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        {scenarioGroups.map((group) => (
          <div
            key={group.id}
            className="min-w-0 space-y-3 rounded-2xl border bg-background/80 p-3 shadow-sm"
          >
            <div className="flex items-start gap-3 px-1 pt-1">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border bg-muted/45 text-muted-foreground [&_svg]:size-4">
                <ScenarioGroupIcon groupId={group.id} />
              </div>
              <div className="min-w-0 space-y-0.5">
                <h4 className="text-sm font-semibold">{group.label}</h4>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {group.description}
                </p>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {group.scenarios.map((scenario) => {
                const active = scenario.id === props.activeScenario;

                return (
                  <Button
                    key={scenario.id}
                    type="button"
                    variant={active ? "secondary" : "outline"}
                    aria-pressed={active}
                    className="h-auto min-h-16 w-full justify-start whitespace-normal rounded-xl px-3 py-2.5 text-left shadow-none"
                    onClick={() => props.onSelect(scenario.id)}
                  >
                    <span className="block min-w-0 space-y-1">
                      <span className="block text-sm font-semibold leading-tight">
                        {scenario.label}
                      </span>
                      <span className="block text-xs font-normal leading-snug text-muted-foreground">
                        {scenario.summary}
                      </span>
                    </span>
                  </Button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

type InovuaParityCompatPageProps = {
  compactFixture?: boolean;
};

export default function InovuaParityCompatPage({
  compactFixture = false,
}: InovuaParityCompatPageProps): React.ReactNode {
  const { scenario, selectScenario } = useParityScenario();
  const [scenarioRevision, setScenarioRevision] = React.useState(0);
  const scenarioDefinition = scenarioById.get(scenario);

  if (compactFixture) {
    return (
      <main
        className="flex min-w-0 flex-col gap-5 rounded-3xl border bg-background/95 p-6 shadow-sm"
        data-testid="inovua-parity-scenario"
        data-scenario={scenario}
      >
        <h2 className="text-2xl font-semibold tracking-tight">
          Inovua parity: {scenario}
        </h2>
        <ScenarioContent scenario={scenario} />
      </main>
    );
  }

  return (
    <main
      className="flex min-w-0 flex-col gap-5 rounded-3xl border bg-background/95 p-4 shadow-sm sm:p-6"
      data-testid="inovua-parity-scenario"
      data-scenario={scenario}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border bg-muted/35 px-3 py-1 text-xs font-medium text-muted-foreground">
            <ShieldCheck className="size-3.5" aria-hidden="true" />
            Inovua Community 5.10.2 contract lab
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Backwards-compatibility lab
            </h2>
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
              Work through row sizing, column sizing, appearance, and editing
              without assembling one-off fixtures. Every checkpoint is the same
              implementation exercised by the focused browser suite.
            </p>
          </div>
        </div>

        <div className="grid shrink-0 grid-cols-2 gap-2 rounded-2xl border bg-muted/20 p-3 text-center">
          <div className="rounded-xl bg-background px-4 py-3 shadow-sm">
            <div className="text-2xl font-semibold tabular-nums">
              {scenarios.size}
            </div>
            <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Scenarios
            </div>
          </div>
          <div className="rounded-xl bg-background px-4 py-3 shadow-sm">
            <div className="text-2xl font-semibold tabular-nums">
              {scenarioGroups.length}
            </div>
            <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Areas
            </div>
          </div>
        </div>
      </div>

      <ScenarioNavigation
        activeScenario={scenario}
        onSelect={(nextScenario) => {
          selectScenario(nextScenario);
          setScenarioRevision(0);
        }}
      />

      <section className="min-w-0 space-y-4 rounded-2xl border bg-card/45 p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Active checkpoint · {scenarioDefinition?.label ?? scenario}
            </p>
            <h2 className="text-xl font-semibold tracking-tight">
              Inovua parity: {scenario}
            </h2>
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
              {scenarioDefinition?.instructions}
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => setScenarioRevision((current) => current + 1)}
          >
            <RotateCcw aria-hidden="true" />
            Reset checkpoint
          </Button>
        </div>

        <div className="min-w-0 overflow-x-auto pb-1">
          <ScenarioContent
            key={`${scenario}-${scenarioRevision}`}
            scenario={scenario}
          />
        </div>
      </section>
    </main>
  );
}
