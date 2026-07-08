import { useMemo, useState } from "react";

import ReactDataGrid, { type TypeColumns, type TypeI18n } from "../../src/main";
import { Button } from "../../src/components/ui/button";
import { cn } from "../../src/lib/utils";
import { useExamplesUi } from "./App";

type Issue17Status = "Supported" | "Column-level" | "Internal";

type Issue17Row = {
  id: string;
  request: string;
  supportedPath: string;
  status: Issue17Status;
  impact: number;
  note: string;
  internalNote: string;
};

const issue17Rows: Issue17Row[] = [
  {
    id: "issue-17-empty",
    request: "emptyText",
    supportedPath: "i18n.noRecords",
    status: "Supported",
    impact: 1,
    note: "Empty-state copy belongs in i18n.",
    internalNote: "Do not add emptyText to TypeDataGridProps.",
  },
  {
    id: "issue-17-column-style",
    request: "rowStyle",
    supportedPath: "TypeColumn render/style",
    status: "Column-level",
    impact: 2,
    note: "Cell presentation stays on column definitions.",
    internalNote: "No root-level rowStyle prop.",
  },
  {
    id: "issue-17-resize",
    request: "onColumnResize",
    supportedPath: "width/defaultWidth/minWidth/maxWidth",
    status: "Column-level",
    impact: 3,
    note: "Column sizing is deterministic and internally managed.",
    internalNote: "No resize callback in the fixed public contract.",
  },
  {
    id: "issue-17-zebra",
    request: "showZebraRows",
    supportedPath: "built-in row parity tokens",
    status: "Internal",
    impact: 4,
    note: "Rows expose odd/even state through grid classes and attributes.",
    internalNote: "No root-level showZebraRows prop.",
  },
];

function statusClassName(status: Issue17Status): string {
  switch (status) {
    case "Supported":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200";
    case "Column-level":
      return "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-200";
    case "Internal":
      return "border-violet-500/20 bg-violet-500/10 text-violet-700 dark:border-violet-400/20 dark:bg-violet-400/10 dark:text-violet-200";
    default:
      return "border-border bg-muted/40 text-muted-foreground";
  }
}

export default function Issue17FixedContractExample() {
  const { gridTheme } = useExamplesUi();
  const [showEmpty, setShowEmpty] = useState(false);
  const [filteredRows, setFilteredRows] = useState(issue17Rows.length);
  const [columnOrder, setColumnOrder] = useState<string[]>([
    "request",
    "supportedPath",
    "status",
    "impact",
    "note",
    "internalNote",
  ]);

  const i18n = useMemo<TypeI18n>(
    () => ({
      noRecords: "No issue #17 rows match the current view",
      columns: "Columns",
      clear: "Clear",
      clearAll: "Clear all",
      contains: "Contains",
      startsWith: "Starts with",
      endsWith: "Ends with",
      eq: "Equals",
      neq: "Does not equal",
      empty: "Empty",
      notEmpty: "Not empty",
      sortAsc: "Sort ascending",
      sortDesc: "Sort descending",
      unsort: "Clear sort",
    }),
    []
  );

  const columns = useMemo<TypeColumns>(
    () => [
      {
        name: "request",
        header: "Requested prop",
        defaultWidth: 180,
        minWidth: 140,
        maxWidth: 260,
        sortable: true,
        filterable: true,
      },
      {
        name: "supportedPath",
        header: "Supported path",
        defaultWidth: 260,
        minWidth: 200,
        maxWidth: 360,
        sortable: true,
        filterable: true,
        render: (_value: unknown, args: { data: Issue17Row }) => (
          <span className="font-medium text-foreground">
            {args.data.supportedPath}
          </span>
        ),
      },
      {
        name: "status",
        header: "Status",
        defaultWidth: 150,
        minWidth: 130,
        maxWidth: 180,
        sortable: true,
        filterable: true,
        filterType: "select",
        filterEditorProps: {
          options: ["Supported", "Column-level", "Internal"],
        },
        render: (_value: unknown, args: { data: Issue17Row }) => (
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
              statusClassName(args.data.status)
            )}
          >
            {args.data.status}
          </span>
        ),
      },
      {
        name: "impact",
        header: "Order",
        defaultWidth: 100,
        minWidth: 90,
        maxWidth: 120,
        sortable: true,
        filterable: true,
        textAlign: "end",
        headerAlign: "end",
        style: { fontVariantNumeric: "tabular-nums" },
        render: (value: unknown) => (
          <span className="font-mono text-muted-foreground">
            {String(value)}
          </span>
        ),
      },
      {
        name: "note",
        header: "Contract note",
        defaultWidth: 340,
        minWidth: 260,
        maxWidth: 480,
        sortable: false,
        filterable: true,
      },
      {
        name: "internalNote",
        header: "Internal note",
        visible: false,
      },
    ],
    []
  );

  const rows = showEmpty ? [] : issue17Rows;

  return (
    <section className="flex flex-col gap-4 rounded-2xl border bg-background/95 p-4 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">
            Issue 17 fixed-prop alternatives
          </h2>
          <p className="max-w-3xl text-sm text-muted-foreground">
            The root grid props stay fixed; empty-state copy is supplied through
            i18n and presentation-specific behavior stays on column definitions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            data-testid="issue17-toggle-empty"
            onClick={() => setShowEmpty((current) => !current)}
          >
            {showEmpty ? "Show rows" : "Show empty state"}
          </Button>
          <div className="text-xs text-muted-foreground">
            Filtered rows:{" "}
            <span className="font-mono" data-testid="issue17-filtered-count">
              {filteredRows}
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div
          className="rounded-2xl border bg-muted/30 p-3"
          data-testid="issue17-empty-alternative"
        >
          <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Empty state
          </div>
          <div className="mt-2 text-sm font-medium">i18n.noRecords</div>
        </div>
        <div
          className="rounded-2xl border bg-muted/30 p-3"
          data-testid="issue17-column-alternative"
        >
          <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Column config
          </div>
          <div className="mt-2 text-sm font-medium">
            render, alignment, sizing, visible
          </div>
        </div>
        <div
          className="rounded-2xl border bg-muted/30 p-3"
          data-testid="issue17-unsupported-props"
        >
          <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Not added
          </div>
          <div className="mt-2 text-sm font-medium">
            minRowHeight, rowStyle, onColumnResize, editable, editStartEvent,
            showZebraRows, emptyText
          </div>
        </div>
      </div>

      <div data-testid="issue17-grid-shell">
        <ReactDataGrid
          theme={gridTheme}
          idProperty="id"
          columns={columns}
          dataSource={rows}
          columnOrder={columnOrder}
          enableColumnFilterContextMenu
          enableColumnAutosize
          skipHeaderOnAutoSize={false}
          enableFiltering
          defaultFilterValue={null}
          filteredRowsCount={setFilteredRows}
          onColumnOrderChange={setColumnOrder}
          virtualized
          columnUserSelect
          i18n={i18n}
          showColumnMenuTool={false}
        />
      </div>
    </section>
  );
}
