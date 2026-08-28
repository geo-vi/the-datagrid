import { RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";

import ReactDataGrid, {
  filterTypes,
  type CellProps,
  type TypeColumns,
  type TypeFilterTypes,
  type TypeFilterValue,
} from "../../src/main";
import { Button } from "../../src/components/ui/button";
import { cn } from "../../src/lib/utils";
import { useExamplesUi } from "./App";

const statuses = ["In progress", "Review", "Ready", "Blocked"] as const;
const priorities = ["High", "Medium", "Low", "Urgent"] as const;

type WorkStatus = (typeof statuses)[number];
type WorkPriority = (typeof priorities)[number];

type WorkItem = {
  id: number;
  ticket: string;
  title: string;
  owner: string;
  team: string;
  status: WorkStatus;
  priority: WorkPriority;
  product: string;
  updatedAt: string;
  effort: number;
  internalNote: string;
};

const owners = [
  { name: "Ada Lovelace", team: "Grid foundations" },
  { name: "Grace Hopper", team: "Developer experience" },
  { name: "Katherine Johnson", team: "Design systems" },
  { name: "Mary Ross", team: "Runtime performance" },
] as const;

const titles = [
  "Refine column autosizing",
  "Add keyboard-friendly menus",
  "Polish select filter states",
  "Verify virtualized overflow",
  "Align numeric summaries",
  "Document typed cell renderers",
  "Tune wide table navigation",
  "Review hidden field behavior",
] as const;

const products = [
  "Data platform",
  "Billing",
  "Account security",
  "Analytics",
] as const;

const workItems: WorkItem[] = Array.from({ length: 160 }, (_, index) => {
  const owner = owners[index % owners.length];

  return {
    id: index + 1,
    ticket: `TDG-${String(index + 1001).padStart(4, "0")}`,
    title: titles[index % titles.length],
    owner: owner.name,
    team: owner.team,
    status: statuses[index % statuses.length],
    priority: priorities[index % priorities.length],
    product: products[(index + 1) % products.length],
    updatedAt: `Jul ${String((index % 28) + 1).padStart(2, "0")}, 2026`,
    effort: [2, 3, 5, 8, 13][index % 5],
    internalNote: `Internal planning note ${index + 1}`,
  };
});

const exportedFilterTypes: TypeFilterTypes = filterTypes;

const initialColumnOrder = [
  "title",
  "owner",
  "status",
  "priority",
  "product",
  "updatedAt",
  "effort",
  "internalNote",
];

const statusClassNames: Record<WorkStatus, string> = {
  "In progress":
    "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-200",
  Review:
    "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-200",
  Ready:
    "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200",
  Blocked: "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-200",
};

const priorityClassNames: Record<WorkPriority, string> = {
  High: "text-orange-700 dark:text-orange-200",
  Medium: "text-sky-700 dark:text-sky-200",
  Low: "text-muted-foreground",
  Urgent: "text-rose-700 dark:text-rose-200",
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);
}

function renderWorkItem(cellProps: CellProps) {
  const row = cellProps.data as WorkItem;

  return (
    <span
      data-testid={`columns-work-item-${row.id}`}
      className="flex min-w-0 items-center gap-3"
    >
      <span className="inline-flex h-7 shrink-0 items-center rounded-md border border-border bg-muted/50 px-2 font-mono text-[11px] font-semibold text-muted-foreground">
        {row.ticket}
      </span>
      <span className="truncate font-medium text-foreground">{row.title}</span>
    </span>
  );
}

function renderOwner(cellProps: CellProps) {
  const row = cellProps.data as WorkItem;

  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-[10px] font-semibold text-muted-foreground">
        {getInitials(row.owner)}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">{row.owner}</span>
        <span className="block truncate text-[11px] text-muted-foreground">
          {row.team}
        </span>
      </span>
    </span>
  );
}

function renderStatus(cellProps: CellProps) {
  const row = cellProps.data as WorkItem;

  return (
    <span
      data-testid={`columns-status-${row.id}`}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium",
        statusClassNames[row.status]
      )}
    >
      <span className="size-1.5 rounded-full bg-current opacity-70" />
      {row.status}
    </span>
  );
}

function renderPriority(cellProps: CellProps) {
  const priority = cellProps.value as WorkPriority;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 text-xs font-semibold",
        priorityClassNames[priority]
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {priority}
    </span>
  );
}

export default function ColumnsGridExample() {
  const { gridTheme, i18n, resizable, showCellBorders } = useExamplesUi();
  const [columnOrder, setColumnOrder] = useState(() => [...initialColumnOrder]);
  const [filteredRows, setFilteredRows] = useState(workItems.length);
  const [naturalHeight, setNaturalHeight] = useState(false);
  const [sortIconsWhenSorted, setSortIconsWhenSorted] = useState(false);
  const displayedWorkItems = useMemo(
    () => (naturalHeight ? workItems.slice(0, 3) : workItems),
    [naturalHeight]
  );

  const columns = useMemo<TypeColumns>(
    () => [
      {
        name: "title",
        header: "Work item",
        defaultWidth: 330,
        minWidth: 260,
        maxWidth: 420,
        sortable: true,
        filterable: true,
        filterType: exportedFilterTypes.string.type,
        render: renderWorkItem,
      },
      {
        name: "owner",
        header: "Owner",
        defaultWidth: 230,
        minWidth: 190,
        maxWidth: 300,
        sortable: true,
        filterable: true,
        filterType: exportedFilterTypes.string.type,
        render: renderOwner,
      },
      {
        name: "status",
        header: "Status",
        minWidth: 140,
        maxWidth: 190,
        sortable: true,
        filterable: true,
        filterType: exportedFilterTypes.select.type,
        filterEditorProps: { options: statuses },
        render: renderStatus,
      },
      {
        name: "priority",
        header: "Priority",
        defaultWidth: 140,
        minWidth: 120,
        maxWidth: 170,
        sortable: true,
        filterable: true,
        filterType: exportedFilterTypes.select.type,
        filterEditorProps: { options: priorities },
        render: renderPriority,
      },
      {
        name: "product",
        header: "Product area",
        width: 220,
        minWidth: 180,
        maxWidth: 280,
        sortable: true,
        filterable: true,
        filterType: exportedFilterTypes.string.type,
      },
      {
        name: "updatedAt",
        header: "Last updated",
        defaultWidth: 180,
        minWidth: 150,
        maxWidth: 210,
        sortable: true,
        filterable: true,
        filterType: exportedFilterTypes.string.type,
      },
      {
        name: "effort",
        header: "Effort (pts)",
        defaultWidth: 120,
        minWidth: 100,
        maxWidth: 150,
        sortable: true,
        filterable: true,
        filterType: exportedFilterTypes.number.type,
        textAlign: "end",
        headerAlign: "end",
        style: { fontVariantNumeric: "tabular-nums" },
        render: ({ value }: CellProps) => (
          <span className="font-mono text-sm text-muted-foreground">
            {String(value)} pts
          </span>
        ),
      },
      {
        name: "internalNote",
        header: "Internal note",
        visible: false,
      },
    ],
    []
  );

  const defaultFilterValue = useMemo<TypeFilterValue>(
    () => [
      {
        name: "title",
        type: exportedFilterTypes.string.type,
        operator: "contains",
        value: "",
      },
      {
        name: "status",
        type: exportedFilterTypes.select.type,
        operator: "eq",
        value: null,
      },
      {
        name: "priority",
        type: exportedFilterTypes.select.type,
        operator: "eq",
        value: null,
      },
    ],
    []
  );

  const orderHasChanged = columnOrder.some(
    (columnId, index) => columnId !== initialColumnOrder[index]
  );

  return (
    <section className="flex flex-col gap-4 rounded-2xl border bg-background/95 p-4 shadow-sm">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Column configuration
          </p>
          <h2 className="text-lg font-semibold">Columns example</h2>
          <p className="max-w-3xl text-sm text-muted-foreground">
            A wide, virtualized work queue with typed renderers, bounded sizing,
            select filters, alignment, visibility, and controlled reordering.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-full border bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground">
            <span className="font-mono font-semibold text-foreground">
              {filteredRows}
            </span>{" "}
            matching rows
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-pressed={naturalHeight}
            data-testid="columns-height-toggle"
            onClick={() => setNaturalHeight((current) => !current)}
          >
            {naturalHeight ? "Use fixed height" : "Use natural height"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-pressed={sortIconsWhenSorted}
            data-testid="columns-sort-icon-toggle"
            onClick={() => setSortIconsWhenSorted((current) => !current)}
          >
            {sortIconsWhenSorted
              ? "Show every sort icon"
              : "Sort icons only when sorted"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!orderHasChanged}
            onClick={() => setColumnOrder([...initialColumnOrder])}
          >
            <RotateCcw className="size-3.5" aria-hidden="true" />
            Reset order
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border bg-muted/25 p-3">
          <div className="text-xs font-medium text-muted-foreground">
            Typed renderers
          </div>
          <div className="mt-1 text-sm font-semibold">
            Composite cells and badges
          </div>
        </div>
        <div className="rounded-xl border bg-muted/25 p-3">
          <div className="text-xs font-medium text-muted-foreground">
            Filter metadata
          </div>
          <div className="mt-1 text-sm font-semibold">
            String, select, and number
          </div>
        </div>
        <div className="rounded-xl border bg-muted/25 p-3">
          <div className="text-xs font-medium text-muted-foreground">
            Layout controls
          </div>
          <div className="mt-1 text-sm font-semibold">
            Widths, alignment, and visibility
          </div>
        </div>
      </div>

      <div
        data-testid="columns-grid-shell"
        className={cn(
          "min-h-0 overflow-hidden rounded-2xl border bg-background shadow-sm",
          naturalHeight ? "h-auto" : "h-[560px]"
        )}
      >
        <ReactDataGrid
          theme={gridTheme}
          idProperty="id"
          columns={columns}
          dataSource={displayedWorkItems}
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
          rowHeight={naturalHeight ? null : 56}
          minRowHeight={52}
          columnUserSelect
          showCellBorders={showCellBorders}
          i18n={i18n}
          showColumnMenuTool
          sortIconVisibility={sortIconsWhenSorted ? "sorted" : "always"}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        Drag headers to reorder them, resize from a column edge, or double-click
        the edge to autosize. Switch to natural height to see the same grid fit
        three rows without a fixed parent. Toggle the sort icons to leave the
        indicator only on the columns actually ordering the rows. The internal
        note column stays hidden through its column definition.
      </p>
    </section>
  );
}
