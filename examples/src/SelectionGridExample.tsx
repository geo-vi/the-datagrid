import { useMemo, useState } from "react";

import ReactDataGrid, {
  type TypeColumns,
  type TypeRowSelection,
} from "../../src/main";
import { Button } from "../../src/components/ui/button";
import { cn } from "../../src/lib/utils";
import { useExamplesUi } from "./App";

type AccountHealth = "Healthy" | "Expansion" | "Renewal" | "At risk";

type AccountRow = {
  id: string;
  account: string;
  region: "North America" | "Europe" | "Middle East" | "APAC";
  owner: string;
  plan: "Enterprise" | "Growth" | "Scale";
  health: AccountHealth;
  seats: number;
  arr: number;
  renewalDate: string;
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

function formatDate(value: string): string {
  return dateFormatter.format(new Date(value));
}

function extractSelectedMap(
  selectedRows: TypeRowSelection
): Record<string, AccountRow> {
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
    return selectedRows as Record<string, AccountRow>;
  }

  return {};
}

function healthPillClasses(health: AccountHealth): string {
  switch (health) {
    case "Healthy":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200";
    case "Expansion":
      return "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-200";
    case "Renewal":
      return "border-violet-500/20 bg-violet-500/10 text-violet-700 dark:border-violet-400/20 dark:bg-violet-400/10 dark:text-violet-200";
    case "At risk":
      return "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200";
    default:
      return "border-border bg-muted/40 text-muted-foreground";
  }
}

export default function SelectionGridExample() {
  const { gridTheme, i18n, resizable, showCellBorders } = useExamplesUi();
  const [selectedRows, setSelectedRows] = useState<TypeRowSelection>({});

  const columns: TypeColumns = useMemo(
    () => [
      {
        name: "account",
        header: "Account",
        defaultWidth: 240,
        sortable: true,
        filterable: true,
        render: (_value, args) => {
          const row = args?.data as AccountRow | undefined;

          if (!row) return null;

          return (
            <div className="flex min-w-0 flex-col">
              <span className="truncate font-medium text-foreground">
                {row.account}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {row.plan} plan
              </span>
            </div>
          );
        },
      },
      {
        name: "owner",
        header: "Owner",
        defaultWidth: 170,
        sortable: true,
        filterable: true,
      },
      {
        name: "region",
        header: "Region",
        defaultWidth: 160,
        sortable: true,
        filterable: true,
        filterType: "select",
        filterEditorProps: {
          options: ["North America", "Europe", "Middle East", "APAC"],
        },
      },
      {
        name: "health",
        header: "Health",
        defaultWidth: 140,
        sortable: true,
        filterable: true,
        filterType: "select",
        filterEditorProps: {
          options: ["Healthy", "Expansion", "Renewal", "At risk"],
        },
        render: (value, _args) => {
          const health = String(value) as AccountHealth;

          return (
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
                healthPillClasses(health)
              )}
            >
              {health}
            </span>
          );
        },
      },
      {
        name: "seats",
        header: "Seats",
        defaultWidth: 110,
        sortable: true,
        filterable: true,
        textAlign: "end",
        headerAlign: "end",
        render: (value, _args) => {
          const seats = typeof value === "number" ? value : Number(value);
          return Number.isFinite(seats)
            ? seats.toLocaleString("en-US")
            : String(value ?? "");
        },
      },
      {
        name: "arr",
        header: "ARR",
        defaultWidth: 130,
        sortable: true,
        filterable: true,
        textAlign: "end",
        headerAlign: "end",
        render: (value, _args) => {
          const amount = typeof value === "number" ? value : Number(value);
          return Number.isFinite(amount)
            ? formatCurrency(amount)
            : String(value ?? "");
        },
      },
      {
        name: "renewalDate",
        header: "Renewal",
        defaultWidth: 150,
        sortable: true,
        filterable: true,
        render: ({ value }: { value: string }) => formatDate(value),
      },
    ],
    []
  );

  const rows = useMemo<AccountRow[]>(
    () => [
      {
        id: "acct-101",
        account: "Northwind Health",
        region: "North America",
        owner: "Ava Patel",
        plan: "Enterprise",
        health: "Healthy",
        seats: 420,
        arr: 128000,
        renewalDate: "2026-06-14",
      },
      {
        id: "acct-102",
        account: "Atlas Freight",
        region: "Europe",
        owner: "Noah Fischer",
        plan: "Growth",
        health: "Expansion",
        seats: 180,
        arr: 64000,
        renewalDate: "2026-05-29",
      },
      {
        id: "acct-103",
        account: "Solstice Power",
        region: "Middle East",
        owner: "Lina Rahman",
        plan: "Enterprise",
        health: "Renewal",
        seats: 260,
        arr: 92000,
        renewalDate: "2026-04-18",
      },
      {
        id: "acct-104",
        account: "Harbor Retail Group",
        region: "North America",
        owner: "Mason Brooks",
        plan: "Scale",
        health: "At risk",
        seats: 96,
        arr: 28000,
        renewalDate: "2026-04-06",
      },
      {
        id: "acct-105",
        account: "Blueleaf Hotels",
        region: "APAC",
        owner: "Sofia Nguyen",
        plan: "Growth",
        health: "Healthy",
        seats: 154,
        arr: 47000,
        renewalDate: "2026-08-02",
      },
      {
        id: "acct-106",
        account: "Kite Commerce",
        region: "Europe",
        owner: "Jonas Meyer",
        plan: "Scale",
        health: "Expansion",
        seats: 212,
        arr: 71000,
        renewalDate: "2026-07-09",
      },
      {
        id: "acct-107",
        account: "Cinder Labs",
        region: "North America",
        owner: "Priya Shah",
        plan: "Growth",
        health: "At risk",
        seats: 88,
        arr: 26000,
        renewalDate: "2026-04-27",
      },
      {
        id: "acct-108",
        account: "Everline Education",
        region: "APAC",
        owner: "Marcus Lee",
        plan: "Enterprise",
        health: "Renewal",
        seats: 305,
        arr: 104000,
        renewalDate: "2026-05-12",
      },
    ],
    []
  );

  const [columnOrder, setColumnOrder] = useState(() =>
    columns.map((column) => column.name ?? "")
  );
  const [filteredCount, setFilteredCount] = useState(rows.length);
  const selectedMap = useMemo(() => extractSelectedMap(selectedRows), [selectedRows]);

  const selectedAccounts = useMemo(() => {
    return Object.values(selectedMap);
  }, [selectedMap]);

  const selectedArr = useMemo(
    () => selectedAccounts.reduce((sum, row) => sum + row.arr, 0),
    [selectedAccounts]
  );

  const selectionHeadline =
    selectedAccounts.length > 0
      ? selectedAccounts.map((row) => row.account).join(", ")
      : "Select accounts to build a review batch.";

  return (
    <section
      data-testid="selection-example-shell"
      className="flex flex-col gap-4 rounded-2xl border bg-background/95 p-4 shadow-sm"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Selection example</h2>
          <p className="max-w-3xl text-sm text-muted-foreground">
            A revenue review queue with realistic account data. It demonstrates
            controlled checkbox selection, direct setter compatibility for
            <code className="mx-1 rounded bg-muted px-1 py-0.5 text-xs">
              onSelectionChange
            </code>
            , external summary metrics, and a compact selection column that
            stays aligned from header to rows.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={selectedAccounts.length === 0}
          onClick={() => setSelectedRows({})}
        >
          Clear selection
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div
          data-testid="selection-count-card"
          className="rounded-2xl border bg-card/70 p-4"
        >
          <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Selected accounts
          </div>
          <div className="mt-2 text-2xl font-semibold">
            {selectedAccounts.length}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {filteredCount} matching rows in the current view.
          </p>
        </div>

        <div
          data-testid="selection-arr-card"
          className="rounded-2xl border bg-card/70 p-4"
        >
          <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Selected ARR
          </div>
          <div className="mt-2 text-2xl font-semibold">
            {formatCurrency(selectedArr)}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Useful for approval and renewal review workflows.
          </p>
        </div>

        <div
          data-testid="selection-review-card"
          className="rounded-2xl border bg-card/70 p-4"
        >
          <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Review batch
          </div>
          <div className="mt-2 truncate text-sm font-medium">
            {selectedAccounts.length > 0
              ? selectedAccounts[0]?.owner
              : "No owner selected"}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {selectionHeadline}
          </p>
        </div>
      </div>

      <div className="max-w-full">
        <ReactDataGrid
          theme={gridTheme}
          idProperty="id"
          columns={columns}
          dataSource={rows}
          columnOrder={columnOrder}
          enableColumnFilterContextMenu
          enableFiltering
          defaultFilterValue={null}
          filteredRowsCount={setFilteredCount}
          onColumnOrderChange={setColumnOrder}
          virtualized={false}
          columnUserSelect
          enableColumnAutosize={false}
          skipHeaderOnAutoSize={false}
          checkboxColumn
          selected={selectedRows}
          // Mirrors the direct React setter wiring many Inovua consumers use.
          onSelectionChange={setSelectedRows}
          resizable={resizable}
          showCellBorders={showCellBorders}
          i18n={i18n}
          showColumnMenuTool={false}
        />
      </div>

      <div
        data-testid="selection-chip-list"
        className="rounded-2xl border bg-muted/20 p-4"
      >
        <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Current selection
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {selectedAccounts.length > 0 ? (
            selectedAccounts.map((row) => (
              <span
                key={row.id}
                className="inline-flex items-center rounded-full border bg-background px-3 py-1 text-sm"
              >
                {row.account}
              </span>
            ))
          ) : (
            <span className="text-sm text-muted-foreground">
              No accounts selected yet.
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
