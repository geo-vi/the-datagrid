import { useMemo, useState } from "react";

import ReactDataGrid, { type TypeColumns } from "../../src/main";
import { useExamplesUi } from "./App";

const issue20Columns: TypeColumns = [
  {
    name: "ticket",
    header: "Ticket",
    defaultWidth: 120,
    sortable: true,
    filterable: true,
  },
  {
    name: "owner",
    header: "Owner",
    defaultWidth: 180,
    sortable: true,
    filterable: true,
  },
  {
    name: "status",
    header: "Status",
    defaultWidth: 160,
    sortable: true,
    filterable: true,
    filterType: "select",
    filterEditorProps: {
      options: ["Open", "In progress", "Review", "Done"],
    },
  },
  {
    name: "priority",
    header: "Priority",
    defaultWidth: 140,
    sortable: true,
    filterable: true,
    filterType: "select",
    filterEditorProps: {
      options: ["Low", "Medium", "High", "Critical"],
    },
  },
  {
    name: "product",
    header: "Product area",
    defaultWidth: 220,
    sortable: true,
    filterable: true,
  },
  {
    name: "updated",
    header: "Updated",
    defaultWidth: 160,
    sortable: true,
    filterable: true,
  },
  {
    name: "effort",
    header: "Effort",
    defaultWidth: 120,
    sortable: true,
    filterable: true,
    textAlign: "end",
    headerAlign: "end",
  },
];

const issue20Rows = Array.from({ length: 160 }, (_, index) => {
  const statuses = ["Open", "In progress", "Review", "Done"];
  const priorities = ["Low", "Medium", "High", "Critical"];
  const products = ["Billing", "Accounts", "Analytics", "Platform"];

  return {
    ticket: `TDG-${(index + 1).toString().padStart(4, "0")}`,
    owner: ["Ada Lovelace", "Grace Hopper", "Katherine Johnson", "Mary Ross"][
      index % 4
    ],
    status: statuses[index % statuses.length],
    priority: priorities[(index + 1) % priorities.length],
    product: products[(index + 2) % products.length],
    updated: `2026-07-${((index % 28) + 1).toString().padStart(2, "0")}`,
    effort: (index * 7) % 34,
  };
});

type Issue20GridProps = {
  label: string;
  shellTestId: string;
};

function Issue20Grid(props: Issue20GridProps) {
  const { label, shellTestId } = props;
  const { gridTheme, i18n } = useExamplesUi();
  const columns = useMemo(() => issue20Columns, []);
  const rows = useMemo(() => issue20Rows, []);
  const [columnOrder, setColumnOrder] = useState(() =>
    columns.map((column) => column.name ?? "")
  );
  const [filteredCount, setFilteredCount] = useState(rows.length);

  return (
    <div
      data-testid={shellTestId}
      className="flex h-full min-h-0 flex-col gap-2"
    >
      <div className="flex items-center justify-between gap-3 text-sm">
        <h3 className="font-medium text-foreground">{label}</h3>
        <div className="text-xs text-muted-foreground">
          Filtered rows: <span className="font-mono">{filteredCount}</span>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border bg-background/95 p-3 shadow-sm">
        <ReactDataGrid
          theme={gridTheme}
          idProperty="ticket"
          columns={columns}
          dataSource={rows}
          columnOrder={columnOrder}
          enableColumnFilterContextMenu
          enableColumnAutosize
          skipHeaderOnAutoSize={false}
          enableFiltering
          defaultFilterValue={null}
          filteredRowsCount={setFilteredCount}
          onColumnOrderChange={setColumnOrder}
          virtualized
          columnUserSelect
          i18n={i18n}
          showColumnMenuTool
        />
      </div>
    </div>
  );
}

export default function Issue20HeightExample() {
  return (
    <section className="flex flex-col gap-5 rounded-2xl border bg-background/95 p-4 shadow-sm">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Issue 20 height example</h2>
        <p className="text-sm text-muted-foreground">
          The same virtualized grid is rendered inside a short parent and a tall
          parent to verify that the scroll viewport tracks available height.
        </p>
      </div>

      <div className="grid min-h-0 gap-5 xl:grid-cols-2">
        <div className="h-[320px] min-h-0">
          <Issue20Grid
            label="Constrained parent"
            shellTestId="issue-20-small-container"
          />
        </div>

        <div className="h-[760px] min-h-0">
          <Issue20Grid
            label="Expanded parent"
            shellTestId="issue-20-tall-container"
          />
        </div>
      </div>
    </section>
  );
}
