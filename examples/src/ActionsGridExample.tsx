import { useCallback, useMemo, useState } from "react";

import ReactDataGrid, {
  type TypeColumns,
  type TypeFilterValue,
  type TypeRowSelection,
} from "../../src/main";
import { Button } from "../../src/components/ui/button";
import { cn } from "../../src/lib/utils";
import { useExamplesUi } from "./App";

type WorkflowStage = "Queued" | "Reviewing" | "Blocked" | "Approved";
type WorkflowPriority = "P0" | "P1" | "P2";

type WorkflowRow = {
  id: string;
  sample: string;
  owner: string;
  priority: WorkflowPriority;
  stage: WorkflowStage;
  openedAt: string;
};

const stageOrder: WorkflowStage[] = [
  "Queued",
  "Reviewing",
  "Blocked",
  "Approved",
];

const defaultFilterValue: TypeFilterValue = [
  {
    name: "sample",
    type: "string",
    operator: "contains",
    value: "",
  },
  {
    name: "owner",
    type: "string",
    operator: "contains",
    value: "",
  },
  {
    name: "priority",
    type: "select",
    operator: "eq",
    value: null,
  },
  {
    name: "stage",
    type: "select",
    operator: "eq",
    value: null,
  },
  {
    name: "openedAt",
    type: "date",
    operator: "afterOrOn",
    value: null,
  },
];

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

function formatShortDate(value: string): string {
  return dateFormatter.format(new Date(value));
}

function extractSelectedMap(
  selectedRows: TypeRowSelection
): Record<string, WorkflowRow> {
  if (
    selectedRows &&
    typeof selectedRows === "object" &&
    !Array.isArray(selectedRows) &&
    "selected" in selectedRows &&
    ("data" in selectedRows ||
      "unselected" in selectedRows ||
      "originalData" in selectedRows)
  ) {
    return extractSelectedMap(
      (selectedRows as { selected?: TypeRowSelection }).selected ?? null
    );
  }

  if (
    selectedRows &&
    typeof selectedRows === "object" &&
    !Array.isArray(selectedRows)
  ) {
    return selectedRows as Record<string, WorkflowRow>;
  }

  return {};
}

function stagePillClasses(stage: WorkflowStage): string {
  switch (stage) {
    case "Queued":
      return "border-slate-500/20 bg-slate-500/10 text-slate-700 dark:border-slate-400/20 dark:bg-slate-400/10 dark:text-slate-200";
    case "Reviewing":
      return "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-200";
    case "Blocked":
      return "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200";
    case "Approved":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200";
    default:
      return "border-border bg-muted/40 text-muted-foreground";
  }
}

const initialRows: WorkflowRow[] = [
  {
    id: "wf-201",
    sample: "Northwind Health",
    owner: "Ava Patel",
    priority: "P0",
    stage: "Queued",
    openedAt: "2026-03-04",
  },
  {
    id: "wf-202",
    sample: "Atlas Freight",
    owner: "Noah Fischer",
    priority: "P1",
    stage: "Reviewing",
    openedAt: "2026-03-06",
  },
  {
    id: "wf-203",
    sample: "Solstice Power",
    owner: "Lina Rahman",
    priority: "P0",
    stage: "Blocked",
    openedAt: "2026-03-08",
  },
  {
    id: "wf-204",
    sample: "Harbor Retail Group",
    owner: "Miles Carter",
    priority: "P2",
    stage: "Queued",
    openedAt: "2026-03-11",
  },
  {
    id: "wf-205",
    sample: "Everline Education",
    owner: "Sara Kim",
    priority: "P1",
    stage: "Approved",
    openedAt: "2026-03-14",
  },
];

export default function ActionsGridExample() {
  const { gridTheme, i18n, resizable, showCellBorders } = useExamplesUi();
  const [rows, setRows] = useState<WorkflowRow[]>(initialRows);
  const [selectedRows, setSelectedRows] = useState<TypeRowSelection>({});
  const [filteredRows, setFilteredRows] = useState(initialRows.length);
  const [eventLog, setEventLog] = useState<string[]>([
    "Ready: use the row actions or bulk controls to mutate the queue.",
  ]);
  const [nextRowNumber, setNextRowNumber] = useState(206);
  const [columnOrder, setColumnOrder] = useState<string[]>([
    "sample",
    "owner",
    "priority",
    "stage",
    "openedAt",
    "actions",
  ]);

  const appendEvent = useCallback((message: string) => {
    setEventLog((current) => [message, ...current].slice(0, 6));
  }, []);

  const advanceRow = useCallback(
    (rowId: string) => {
      const row = rows.find((entry) => entry.id === rowId);
      if (!row) return;

      const nextStage =
        stageOrder[(stageOrder.indexOf(row.stage) + 1) % stageOrder.length];

      setRows((current) =>
        current.map((row) => {
          if (row.id !== rowId) return row;

          return {
            ...row,
            stage: nextStage,
          };
        })
      );
      appendEvent(`Advanced ${row.sample} to ${nextStage}.`);
    },
    [appendEvent, rows]
  );

  const deleteRow = useCallback(
    (rowId: string) => {
      const row = rows.find((entry) => entry.id === rowId);
      if (!row) return;

      setRows((current) => current.filter((entry) => entry.id !== rowId));
      setSelectedRows((current) => {
        if (!current || typeof current !== "object" || Array.isArray(current)) {
          return current;
        }

        const next = { ...(current as Record<string, WorkflowRow>) };
        delete next[rowId];
        return next;
      });
      appendEvent(`Deleted ${row.sample}.`);
    },
    [appendEvent, rows]
  );

  const insertRow = useCallback(() => {
    const created: WorkflowRow = {
      id: `wf-${nextRowNumber}`,
      sample: `Inserted sample ${nextRowNumber}`,
      owner: "Ops queue",
      priority: "P2",
      stage: "Queued",
      openedAt: "2026-03-31",
    };

    setRows((current) => [created, ...current]);
    setNextRowNumber((current) => current + 1);
    appendEvent(`Inserted ${created.sample}.`);
  }, [appendEvent, nextRowNumber]);

  const selectedMap = useMemo(
    () => extractSelectedMap(selectedRows),
    [selectedRows]
  );
  const selectedIds = useMemo(() => Object.keys(selectedMap), [selectedMap]);

  const deleteSelectedRows = useCallback(() => {
    if (selectedIds.length === 0) return;

    setRows((current) =>
      current.filter((row) => !selectedIds.includes(String(row.id)))
    );
    appendEvent(`Deleted ${selectedIds.length} selected rows.`);
    setSelectedRows({});
  }, [appendEvent, selectedIds]);

  const columns: TypeColumns = useMemo(
    () => [
      {
        name: "sample",
        header: "Sample",
        defaultWidth: 220,
        sortable: true,
        filterable: true,
        render: ({ data }: { data: WorkflowRow }) => (
          <div className="flex min-w-0 flex-col">
            <span className="truncate font-medium text-foreground">
              {data.sample}
            </span>
            <span className="truncate text-xs text-muted-foreground">
              Opened {formatShortDate(data.openedAt)}
            </span>
          </div>
        ),
      },
      {
        name: "owner",
        header: "Owner",
        defaultWidth: 160,
        sortable: true,
        filterable: true,
      },
      {
        name: "priority",
        header: "Priority",
        defaultWidth: 110,
        sortable: true,
        filterable: true,
        filterType: "select",
        filterEditorProps: {
          options: ["P0", "P1", "P2"],
        },
      },
      {
        name: "stage",
        header: "Stage",
        defaultWidth: 150,
        sortable: true,
        filterable: true,
        filterType: "select",
        filterEditorProps: {
          options: stageOrder,
        },
        render: ({
          data,
          value,
        }: {
          data: WorkflowRow;
          value: WorkflowStage;
        }) => (
          <span
            data-testid={`actions-stage-${data.id}`}
            className={cn(
              "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
              stagePillClasses(value)
            )}
          >
            {value}
          </span>
        ),
      },
      {
        name: "openedAt",
        header: "Opened",
        defaultWidth: 120,
        sortable: true,
        filterable: true,
        render: ({ value }: { value: string }) => formatShortDate(value),
      },
      {
        name: "actions",
        header: "Actions",
        defaultWidth: 210,
        sortable: false,
        filterable: false,
        textAlign: "end",
        headerAlign: "end",
        render: ({ data }: { data: WorkflowRow }) => (
          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label={`Advance ${data.sample}`}
              onClick={() => advanceRow(data.id)}
            >
              Advance
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label={`Delete ${data.sample}`}
              onClick={() => deleteRow(data.id)}
            >
              Delete
            </Button>
          </div>
        ),
      },
    ],
    [advanceRow, deleteRow]
  );

  return (
    <section className="flex flex-col gap-4 rounded-2xl border bg-background/95 p-4 shadow-sm">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Actions example</h2>
        <p className="text-sm text-muted-foreground">
          A focused actions grid with controlled checkbox selection, row-level
          mutations, and bulk insert/delete operations.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div
          data-testid="actions-rows-card"
          className="rounded-2xl border bg-card/80 p-4 shadow-sm"
        >
          <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Rows in queue
          </div>
          <div className="mt-2 text-3xl font-semibold">{rows.length}</div>
        </div>
        <div
          data-testid="actions-selected-card"
          className="rounded-2xl border bg-card/80 p-4 shadow-sm"
        >
          <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Selected rows
          </div>
          <div className="mt-2 text-3xl font-semibold">
            {selectedIds.length}
          </div>
        </div>
        <div
          data-testid="actions-filtered-card"
          className="rounded-2xl border bg-card/80 p-4 shadow-sm"
        >
          <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Filtered rows
          </div>
          <div className="mt-2 text-3xl font-semibold">{filteredRows}</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button type="button" onClick={insertRow}>
          Insert row
        </Button>
        <Button
          type="button"
          variant="destructive"
          onClick={deleteSelectedRows}
          disabled={selectedIds.length === 0}
        >
          Delete selected
        </Button>
        <div className="flex items-center text-sm text-muted-foreground">
          First click should fire immediately, even when the grid is unfocused.
        </div>
      </div>

      <ReactDataGrid
        theme={gridTheme}
        idProperty="id"
        columns={columns}
        dataSource={rows}
        columnOrder={columnOrder}
        enableColumnFilterContextMenu
        enableColumnAutosize
        skipHeaderOnAutoSize={false}
        resizable={resizable}
        enableFiltering
        defaultFilterValue={defaultFilterValue}
        filteredRowsCount={setFilteredRows}
        onColumnOrderChange={setColumnOrder}
        virtualized
        columnUserSelect
        i18n={i18n}
        showColumnMenuTool={false}
        checkboxColumn
        selected={selectedRows}
        onSelectionChange={setSelectedRows}
        showCellBorders={showCellBorders}
      />

      <section
        data-testid="actions-log"
        className="rounded-2xl border bg-card/70 p-4 shadow-sm"
      >
        <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Latest actions
        </div>
        <ul className="mt-3 space-y-2 text-sm text-foreground">
          {eventLog.map((entry) => (
            <li key={entry} className="rounded-xl bg-muted/40 px-3 py-2">
              {entry}
            </li>
          ))}
        </ul>
      </section>
    </section>
  );
}
