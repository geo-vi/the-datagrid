import { Link } from "@tanstack/react-router";
import { Pencil, Trash2 } from "lucide-react";
import { useMemo, useState, type ReactNode, type Ref } from "react";

import ReactDataGrid, {
  DateFilter,
  NumberFilter,
  SelectFilter,
  type TypeColumns,
  type TypeFilterValue,
  type TypeI18n,
  type TypeShowCellBorders,
} from "../../src/main";
import {
  RDGToolbar,
  RDGToolbarProvider,
  RDGToolbarTarget,
  useRDGToolbarApiState,
  type RDGToolbarApi,
  type RDGToolbarExportFormat,
  type RDGToolbarExportScope,
} from "../../src/toolbar";
import { Button } from "../../src/components/ui/button";
import { ButtonGroup } from "../../src/components/ui/button-group";
import CopyableCodeBlock from "./docs/CopyableCodeBlock";

type FilteringOwner = "toolbar" | "always" | "never";

const FORMAT_ORDER: RDGToolbarExportFormat[] = ["csv", "json", "xlsx"];
const FORMAT_LABELS: Record<RDGToolbarExportFormat, string> = {
  csv: "CSV",
  json: "JSON",
  xlsx: "Excel",
};

type ExampleOrder = {
  orderId: string;
  customer: string;
  region: string;
  items: number;
  total: number;
  placedAt: string;
  fulfilled: boolean;
  internalNote: string;
};

type ToolbarGridExampleProps = {
  theme: string;
  i18n: TypeI18n;
  resizable: boolean;
  showCellBorders: TypeShowCellBorders;
};

const regionOptions = ["EMEA", "AMER", "APAC"];
const customers = [
  "Northwind Traders",
  "Contoso Retail",
  "Fabrikam Logistics",
  "Tailspin Toys",
  "Wide World Importers",
];

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  year: "numeric",
  month: "short",
  day: "2-digit",
});
const currencyFormatter = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

function extractCellValue(valueOrCellProps: unknown): unknown {
  if (
    typeof valueOrCellProps === "object" &&
    valueOrCellProps !== null &&
    "value" in valueOrCellProps
  ) {
    return (valueOrCellProps as { value?: unknown }).value;
  }

  return valueOrCellProps;
}

function extractRowData(valueOrCellProps: unknown): ExampleOrder | null {
  if (
    typeof valueOrCellProps === "object" &&
    valueOrCellProps !== null &&
    "data" in valueOrCellProps
  ) {
    return (valueOrCellProps as { data?: ExampleOrder }).data ?? null;
  }

  return null;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} kB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: unknown): string {
  if (value == null || value === "") return "";

  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);

  return dateFormatter.format(date);
}

function formatFulfilledPill(value: boolean) {
  return (
    <span
      className={
        value
          ? "inline-flex rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-200"
          : "inline-flex rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-400/10 dark:text-amber-200"
      }
    >
      {value ? "Fulfilled" : "Open"}
    </span>
  );
}

function createOrders(): ExampleOrder[] {
  return Array.from({ length: 36 }, (_, index) => {
    const region = regionOptions[index % regionOptions.length];
    const customer = customers[index % customers.length];

    return {
      orderId: `SO-${4200 + index}`,
      customer,
      region,
      items: 1 + (index % 9),
      total: 1250 + index * 435,
      placedAt: new Date(
        Date.UTC(2026, 4, 2 + (index % 21), 9 + (index % 8), 30)
      ).toISOString(),
      fulfilled: index % 3 !== 0,
      internalNote: `Priced from tier ${1 + (index % 4)} for ${region}.`,
    };
  });
}

function buildSnippet(config: {
  disableMobileAutoToolbarCollapsedColumns: boolean;
  filteringOwner: FilteringOwner;
  formats: RDGToolbarExportFormat[];
  heading: boolean;
  exportScope: RDGToolbarExportScope;
  showClearFilters: boolean;
  showColumnToggles: boolean;
  showExport: boolean;
  showFilterToggle: boolean;
  toolbarCollapsedColumnToggles: boolean;
}): string {
  const toolbarProps = [
    config.heading ? null : "  title={null}",
    config.heading ? null : "  description={null}",
    config.showColumnToggles ? null : "  showColumnToggles={false}",
    config.toolbarCollapsedColumnToggles
      ? "  toolbarCollapsedColumnToggles"
      : null,
    config.disableMobileAutoToolbarCollapsedColumns
      ? "  disableMobileAutoToolbarCollapsedColumns"
      : null,
    config.showExport ? "  showExport" : null,
    config.showFilterToggle ? "  showFilterToggle" : null,
    config.showClearFilters ? "  showClearFilters" : null,
    config.showExport && config.exportScope !== "view"
      ? `  exportScope="${config.exportScope}"`
      : null,
    config.showExport
      ? `  exportFormats={${JSON.stringify(config.formats)}}`
      : null,
    config.showExport ? '  exportFileName="orders"' : null,
    config.showExport && config.formats.includes("xlsx")
      ? '  exportSheetName="Orders"'
      : null,
  ].filter((line): line is string => line !== null);

  const gridFilteringProp =
    config.filteringOwner === "toolbar"
      ? ""
      : `\n    enableFiltering={${config.filteringOwner === "always"}}`;

  return `<RDGToolbarProvider>
  <RDGToolbar
${toolbarProps.join("\n")}
  />

  <ReactDataGrid
    idProperty="orderId"
    columns={columns}
    dataSource={orders}
    defaultFilterValue={defaultFilterValue}${gridFilteringProp}
  />
</RDGToolbarProvider>`;
}

const apiSnippet = `import {
  RDGToolbarProvider,
  RDGToolbar,
  type RDGToolbarApi,
} from "@geovi/the-datagrid/toolbar";

// The shared wrapper every screen already renders. It owns the provider and
// forwards the ref, so the page above it never has to.
function GridCard({ apiRef, ...gridProps }) {
  return (
    <RDGToolbarProvider apiRef={apiRef} exportDefaults={{ fileName: "orders" }}>
      <RDGToolbar showExport showFilterToggle />
      <ReactDataGrid idProperty="orderId" {...gridProps} />
    </RDGToolbarProvider>
  );
}

function OrdersPage() {
  const grid = useRef<RDGToolbarApi>(null);

  return (
    <>
      <button onClick={() => grid.current?.exportGrid("xlsx", { scope: "all" })}>
        Export all orders
      </button>
      <GridCard apiRef={grid} columns={columns} dataSource={orders} />
    </>
  );
}`;

/**
 * One captioned card of playground controls. The panel configures three
 * unrelated things - which parts render, what the export writes, and who owns
 * the filter row - and a single flat row of buttons gave no clue where one
 * concern ended and the next began.
 */
function ControlGroup({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div
      className="flex min-w-0 flex-col gap-2 rounded-xl border bg-muted/20 p-3"
      role="group"
      aria-label={label}
    >
      <span className="flex flex-wrap items-baseline gap-x-2 text-xs font-medium text-muted-foreground">
        {label}
        {hint ? <span className="font-normal opacity-70">{hint}</span> : null}
      </span>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

type ExternalActionsProps = {
  api: RDGToolbarApi;
  onNotice: (notice: { kind: "ok" | "error"; text: string } | null) => void;
};

/** Rendered above the provider, holding nothing but the ref it was handed. */
function ExternalActions({ api, onNotice }: ExternalActionsProps) {
  const state = useRDGToolbarApiState(api);

  const runExport = async (
    format: RDGToolbarExportFormat,
    settings?: Parameters<RDGToolbarApi["exportGrid"]>[1]
  ) => {
    onNotice(null);
    try {
      const result = await api.exportGrid(format, settings);
      onNotice(
        result
          ? {
              kind: "ok",
              text: `Wrote ${result.rowCount} rows to ${
                result.fileName
              } (${formatBytes(result.byteLength)}).`,
            }
          : { kind: "error", text: "Nothing to export." }
      );
    } catch (error) {
      onNotice({
        kind: "error",
        text: error instanceof Error ? error.message : String(error),
      });
    }
  };

  return (
    <div
      className="flex flex-wrap items-start gap-3"
      role="group"
      aria-label="External grid controls"
      data-testid="toolbar-api-controls"
    >
      <ControlGroup label="Export" hint="provider names the file">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void runExport("csv")}
        >
          Export CSV
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void runExport("xlsx", { scope: "all" })}
        >
          Export all as Excel
        </Button>
      </ControlGroup>

      <ControlGroup label="Columns">
        {state.columns
          .filter((column) => column.hideable !== false)
          .slice(0, 3)
          .map((column) => {
            const columnId = String(column.id ?? column.name);
            const visible = state.columnVisibilityMap[columnId] !== false;

            return (
              <Button
                key={columnId}
                type="button"
                variant={visible ? "secondary" : "outline"}
                size="sm"
                aria-pressed={visible}
                onClick={() => api.setColumnVisible(columnId, !visible)}
              >
                {String(column.header ?? columnId)}
              </Button>
            );
          })}
      </ControlGroup>

      <ControlGroup label="Filters">
        <Button
          type="button"
          variant={state.filteringEnabled ? "secondary" : "outline"}
          size="sm"
          aria-pressed={state.filteringEnabled}
          disabled={!state.canToggleFiltering}
          onClick={() => api.setFilteringEnabled(!state.filteringEnabled)}
        >
          Filter row {state.filteringEnabled ? "on" : "off"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!state.filtered}
          onClick={() => api.clearAllFilters()}
        >
          Clear filters
        </Button>
      </ControlGroup>
    </div>
  );
}

type ApiGridCardProps = {
  apiRef: Ref<RDGToolbarApi>;
  columns: TypeColumns;
  dataSource: ExampleOrder[];
  defaultFilterValue: TypeFilterValue;
  theme: string;
  i18n: TypeI18n;
  resizable: boolean;
  showCellBorders: TypeShowCellBorders;
};

/** Stands in for a shared wrapper: it owns the provider and forwards one ref. */
function ApiGridCard({
  apiRef,
  columns,
  dataSource,
  defaultFilterValue,
  theme,
  i18n,
  resizable,
  showCellBorders,
}: ApiGridCardProps) {
  return (
    <RDGToolbarProvider
      apiRef={apiRef}
      exportDefaults={{ fileName: "orders", sheetName: "Orders" }}
    >
      <div className="h-80 min-h-0" data-testid="toolbar-api-viewport">
        <RDGToolbarTarget>
          <ReactDataGrid
            theme={theme}
            idProperty="orderId"
            columns={columns}
            dataSource={dataSource}
            defaultFilterValue={defaultFilterValue}
            enableColumnFilterContextMenu
            resizable={resizable}
            showCellBorders={showCellBorders}
            i18n={i18n}
            showColumnMenuTool={false}
            virtualized
            columnUserSelect
          />
        </RDGToolbarTarget>
      </div>
    </RDGToolbarProvider>
  );
}

export default function ToolbarGridExample({
  theme,
  i18n,
  resizable,
  showCellBorders,
}: ToolbarGridExampleProps) {
  const orders = useMemo(() => createOrders(), []);

  const [showColumnToggles, setShowColumnToggles] = useState(true);
  const [toolbarCollapsedColumnToggles, setToolbarCollapsedColumnToggles] =
    useState(false);
  const [disableMobileAutoToolbarCollapsedColumns, setDisableMobileAuto] =
    useState(false);
  const [showExport, setShowExport] = useState(true);
  const [showFilterToggle, setShowFilterToggle] = useState(true);
  const [showClearFilters, setShowClearFilters] = useState(true);
  const [heading, setHeading] = useState(true);
  const [exportScope, setExportScope] = useState<RDGToolbarExportScope>("view");
  const [formats, setFormats] = useState<RDGToolbarExportFormat[]>(() => [
    ...FORMAT_ORDER,
  ]);
  const [filteringOwner, setFilteringOwner] =
    useState<FilteringOwner>("toolbar");
  const [filteredRows, setFilteredRows] = useState(orders.length);
  const [exportNotice, setExportNotice] = useState<{
    kind: "ok" | "error";
    text: string;
  } | null>(null);
  const [toolbarApi, setToolbarApi] = useState<RDGToolbarApi | null>(null);
  const [apiNotice, setApiNotice] = useState<{
    kind: "ok" | "error";
    text: string;
  } | null>(null);

  const defaultFilterValue = useMemo<TypeFilterValue>(
    () => [
      { name: "orderId", operator: "contains", type: "string", value: "" },
      { name: "customer", operator: "contains", type: "string", value: "" },
      { name: "region", operator: "eq", type: "select", value: null },
      { name: "items", operator: "gte", type: "number", value: null },
      { name: "total", operator: "gte", type: "number", value: null },
      { name: "placedAt", operator: "afterOrOn", type: "date", value: null },
      { name: "fulfilled", operator: "eq", type: "select", value: null },
    ],
    []
  );

  const columns = useMemo<TypeColumns>(
    () => [
      {
        name: "orderId",
        header: "Order",
        defaultWidth: 120,
        type: "string",
      },
      {
        name: "customer",
        header: "Customer",
        defaultFlex: 1,
        minWidth: 180,
        type: "string",
      },
      {
        name: "region",
        header: "Region",
        defaultWidth: 120,
        filterType: "select",
        filterEditor: SelectFilter,
        filterEditorProps: {
          placeholder: "All regions",
          dataSource: regionOptions.map((region) => ({
            id: region,
            label: region,
          })),
        },
      },
      {
        name: "items",
        header: "Items",
        defaultWidth: 100,
        textAlign: "end",
        type: "number",
        filterType: "number",
        filterEditor: NumberFilter,
      },
      {
        name: "total",
        header: "Total",
        defaultWidth: 140,
        textAlign: "end",
        type: "number",
        filterType: "number",
        filterEditor: NumberFilter,
        render: (valueOrCellProps: unknown) =>
          currencyFormatter.format(
            Number(extractCellValue(valueOrCellProps) ?? 0)
          ),
        // The cell is formatted for people; the export stays a raw number so
        // spreadsheets can still sum the column.
        exportValue: ({ value }) => Number(value ?? 0),
      },
      {
        name: "placedAt",
        header: "Placed",
        defaultWidth: 140,
        filterType: "date",
        filterEditor: DateFilter,
        filterEditorProps: { placeholder: "Pick a date" },
        render: (valueOrCellProps: unknown) =>
          formatDate(extractCellValue(valueOrCellProps)),
        // A Date survives as a real date cell in Excel, and as ISO-8601 in CSV.
        exportValue: ({ value }) => new Date(String(value)),
      },
      {
        name: "fulfilled",
        header: "Status",
        defaultWidth: 130,
        filterType: "select",
        filterEditor: SelectFilter,
        filterEditorProps: {
          placeholder: "Any status",
          dataSource: [
            { id: true, label: "Fulfilled" },
            { id: false, label: "Open" },
          ],
        },
        // render returns a React node, so the export needs its own value.
        render: (valueOrCellProps: unknown) =>
          formatFulfilledPill(Boolean(extractCellValue(valueOrCellProps))),
        exportValue: ({ value }) => (value ? "Fulfilled" : "Open"),
      },
      {
        name: "internalNote",
        header: "Internal note",
        defaultWidth: 260,
        defaultHidden: true,
        filterable: false,
        // Hidden in the grid, still written to every export.
        exportWhenHidden: true,
      },
      {
        name: "actions",
        header: "Actions",
        defaultWidth: 110,
        sortable: false,
        filterable: false,
        // Row buttons have no exportable representation.
        exportable: false,
        render: (valueOrCellProps: unknown) => {
          const row = extractRowData(valueOrCellProps);
          if (!row) return null;

          return (
            <div className="flex items-center justify-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Edit ${row.orderId}`}
                title={`Edit ${row.orderId}`}
                onClick={() => {
                  console.info("Edit order", row.orderId);
                }}
              >
                <Pencil className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Delete ${row.orderId}`}
                title={`Delete ${row.orderId}`}
                onClick={() => {
                  console.info("Delete order", row.orderId);
                }}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          );
        },
      },
    ],
    []
  );

  const exportedRowCount = exportScope === "all" ? orders.length : filteredRows;
  const snippet = buildSnippet({
    disableMobileAutoToolbarCollapsedColumns,
    exportScope,
    filteringOwner,
    formats,
    heading,
    showClearFilters,
    showColumnToggles,
    showExport,
    showFilterToggle,
    toolbarCollapsedColumnToggles,
  });

  return (
    <>
      <section
        className="flex flex-col gap-4 rounded-2xl border bg-background/95 p-4 shadow-sm"
        data-testid="toolbar-playground"
      >
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Toolbar playground</h2>
          <p className="text-sm text-muted-foreground">
            Switch the built-in toolbar actions on and off, choose what the
            export writes, and hand filter-row ownership back to the grid to
            watch the toggle disable itself.
          </p>
          <p className="text-sm text-muted-foreground">
            Appearance is not configured here: the toolbar is styled entirely
            through <code>--tdg-toolbar-*</code> custom properties. See the{" "}
            <Link
              to="/docs/$group/$slug"
              params={{ group: "reference", slug: "toolbar" }}
              hash="toolbar-styling"
              className="font-medium text-foreground underline underline-offset-4"
            >
              styling and theme tokens reference
            </Link>{" "}
            for the full token list and the override rules.
          </p>
        </div>

        <div
          className="flex flex-wrap items-start gap-3"
          role="group"
          aria-label="Toolbar playground controls"
          data-testid="toolbar-playground-controls"
        >
          {/* Ordered to match the toolbar top to bottom. */}
          <ControlGroup label="Parts">
            <Button
              type="button"
              variant={heading ? "secondary" : "outline"}
              size="sm"
              aria-pressed={heading}
              onClick={() => setHeading((current) => !current)}
            >
              Heading {heading ? "on" : "off"}
            </Button>
            <Button
              type="button"
              variant={showColumnToggles ? "secondary" : "outline"}
              size="sm"
              aria-pressed={showColumnToggles}
              onClick={() => setShowColumnToggles((current) => !current)}
            >
              Column toggles {showColumnToggles ? "on" : "off"}
            </Button>
            <Button
              type="button"
              variant={toolbarCollapsedColumnToggles ? "secondary" : "outline"}
              size="sm"
              aria-pressed={toolbarCollapsedColumnToggles}
              disabled={!showColumnToggles}
              onClick={() =>
                setToolbarCollapsedColumnToggles((current) => !current)
              }
            >
              Column dropdown {toolbarCollapsedColumnToggles ? "on" : "off"}
            </Button>
            <Button
              type="button"
              variant={
                disableMobileAutoToolbarCollapsedColumns
                  ? "outline"
                  : "secondary"
              }
              size="sm"
              aria-pressed={!disableMobileAutoToolbarCollapsedColumns}
              onClick={() => setDisableMobileAuto((current) => !current)}
            >
              Mobile auto dropdown{" "}
              {disableMobileAutoToolbarCollapsedColumns ? "off" : "on"}
            </Button>
            <Button
              type="button"
              variant={showExport ? "secondary" : "outline"}
              size="sm"
              aria-pressed={showExport}
              onClick={() => setShowExport((current) => !current)}
            >
              Export {showExport ? "on" : "off"}
            </Button>
            <Button
              type="button"
              variant={showFilterToggle ? "secondary" : "outline"}
              size="sm"
              aria-pressed={showFilterToggle}
              onClick={() => setShowFilterToggle((current) => !current)}
            >
              Filter toggle {showFilterToggle ? "on" : "off"}
            </Button>
            <Button
              type="button"
              variant={showClearFilters ? "secondary" : "outline"}
              size="sm"
              aria-pressed={showClearFilters}
              onClick={() => setShowClearFilters((current) => !current)}
            >
              Clear filters {showClearFilters ? "on" : "off"}
            </Button>
          </ControlGroup>

          <ControlGroup
            label="Export writes"
            hint={showExport ? undefined : "needs Export on"}
          >
            <ButtonGroup
              aria-label="Export scope buttons"
              className="max-w-full flex-wrap"
            >
              {(["view", "all"] as const).map((scope) => (
                <Button
                  key={scope}
                  type="button"
                  variant={exportScope === scope ? "secondary" : "outline"}
                  size="sm"
                  className="rounded-none font-medium normal-case"
                  aria-pressed={exportScope === scope}
                  disabled={!showExport}
                  onClick={() => setExportScope(scope)}
                >
                  {scope === "view" ? "Scope: view" : "Scope: all rows"}
                </Button>
              ))}
            </ButtonGroup>

            <ButtonGroup
              aria-label="Export format buttons"
              className="max-w-full flex-wrap"
            >
              {FORMAT_ORDER.map((format) => {
                const selected = formats.includes(format);

                return (
                  <Button
                    key={format}
                    type="button"
                    variant={selected ? "secondary" : "outline"}
                    size="sm"
                    className="rounded-none font-medium normal-case"
                    aria-pressed={selected}
                    // One format has to stay selected for the control to do anything.
                    disabled={!showExport || (selected && formats.length === 1)}
                    onClick={() =>
                      setFormats((current) =>
                        FORMAT_ORDER.filter((candidate) =>
                          candidate === format
                            ? !current.includes(format)
                            : current.includes(candidate)
                        )
                      )
                    }
                  >
                    {FORMAT_LABELS[format]}
                  </Button>
                );
              })}
            </ButtonGroup>
          </ControlGroup>

          <ControlGroup label="Filter row owner">
            <ButtonGroup
              aria-label="Filter row ownership buttons"
              className="max-w-full flex-wrap"
            >
              {(
                [
                  ["toolbar", "Filters: toolbar-owned"],
                  ["always", "Filters: enableFiltering={true}"],
                  ["never", "Filters: enableFiltering={false}"],
                ] as const
              ).map(([owner, label]) => (
                <Button
                  key={owner}
                  type="button"
                  variant={filteringOwner === owner ? "secondary" : "outline"}
                  size="sm"
                  className="rounded-none font-medium normal-case"
                  aria-pressed={filteringOwner === owner}
                  onClick={() => setFilteringOwner(owner)}
                >
                  {label}
                </Button>
              ))}
            </ButtonGroup>
          </ControlGroup>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span data-testid="toolbar-playground-row-summary">
            Filtered orders: <span className="font-mono">{filteredRows}</span> /{" "}
            {orders.length} · export writes{" "}
            <span className="font-mono">{exportedRowCount}</span> rows
          </span>
          <span>
            <code>internalNote</code> stays hidden but is exported;{" "}
            <code>Actions</code> is never exported.
          </span>
        </div>

        {exportNotice ? (
          <p
            className={
              exportNotice.kind === "ok"
                ? "rounded-lg border bg-muted/30 p-2 text-xs text-muted-foreground"
                : "rounded-lg border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive"
            }
            role="status"
            data-testid={`toolbar-playground-export-${exportNotice.kind}`}
          >
            {exportNotice.text}
          </p>
        ) : null}

        <RDGToolbarProvider>
          <RDGToolbar
            title={heading ? "Order columns" : null}
            description={
              heading
                ? "Toggle columns, export the orders, and control the filter row."
                : null
            }
            showColumnToggles={showColumnToggles}
            toolbarCollapsedColumnToggles={toolbarCollapsedColumnToggles}
            disableMobileAutoToolbarCollapsedColumns={
              disableMobileAutoToolbarCollapsedColumns
            }
            showExport={showExport}
            showFilterToggle={showFilterToggle}
            showClearFilters={showClearFilters}
            exportScope={exportScope}
            exportFormats={formats}
            exportFileName="orders"
            exportSheetName="Orders"
            onExportSuccess={({ fileName, rowCount, byteLength }) => {
              setExportNotice({
                kind: "ok",
                text: `Wrote ${rowCount} rows to ${fileName} (${formatBytes(
                  byteLength
                )}).`,
              });
            }}
            onExportError={(error) => {
              // A failed export is worth surfacing; the toolbar stays usable.
              setExportNotice({
                kind: "error",
                text: error instanceof Error ? error.message : String(error),
              });
            }}
          />

          <div
            className="h-[26rem] min-h-0"
            data-testid="toolbar-grid-viewport"
          >
            <RDGToolbarTarget>
              <ReactDataGrid
                theme={theme}
                idProperty="orderId"
                columns={columns}
                dataSource={orders}
                defaultFilterValue={defaultFilterValue}
                {...(filteringOwner === "toolbar"
                  ? {}
                  : { enableFiltering: filteringOwner === "always" })}
                filteredRowsCount={setFilteredRows}
                enableColumnFilterContextMenu
                resizable={resizable}
                showCellBorders={showCellBorders}
                i18n={i18n}
                showColumnMenuTool={false}
                virtualized
                columnUserSelect
              />
            </RDGToolbarTarget>
          </div>
        </RDGToolbarProvider>

        <div className="space-y-2">
          <h3 className="text-sm font-medium">Matching props</h3>
          <CopyableCodeBlock code={snippet} language="tsx" label="tsx" />
        </div>
      </section>

      <section
        className="flex flex-col gap-4 rounded-2xl border bg-background/95 p-4 shadow-sm"
        data-testid="toolbar-api-demo"
      >
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">
            Trigger the toolbar from outside the provider
          </h2>
          <p className="text-sm text-muted-foreground">
            The grid below renders no toolbar at all. Every button above it sits
            outside <code>RDGToolbarProvider</code>, in a component that only
            holds the <code>apiRef</code> the provider filled in - which is how
            a page reaches a grid that a shared wrapper component owns.
          </p>
          <p className="text-sm text-muted-foreground">
            The provider sets <code>exportDefaults</code>, so both export
            buttons write <code>orders</code> without naming the file, and the
            Excel button still overrides the scope for its own export.
          </p>
        </div>

        {toolbarApi ? (
          <ExternalActions api={toolbarApi} onNotice={setApiNotice} />
        ) : null}

        {apiNotice ? (
          <p
            className={
              apiNotice.kind === "ok"
                ? "rounded-lg border bg-muted/30 p-2 text-xs text-muted-foreground"
                : "rounded-lg border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive"
            }
            role="status"
            data-testid={`toolbar-api-export-${apiNotice.kind}`}
          >
            {apiNotice.text}
          </p>
        ) : null}

        <ApiGridCard
          apiRef={setToolbarApi}
          columns={columns}
          dataSource={orders}
          defaultFilterValue={defaultFilterValue}
          theme={theme}
          i18n={i18n}
          resizable={resizable}
          showCellBorders={showCellBorders}
        />

        <div className="space-y-2">
          <h3 className="text-sm font-medium">Matching props</h3>
          <CopyableCodeBlock code={apiSnippet} language="tsx" label="tsx" />
        </div>
      </section>
    </>
  );
}
