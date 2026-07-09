import { useMemo, useState, type CSSProperties } from "react";

import ReactDataGrid, {
  type CellProps,
  type TypeColumns,
} from "../../src/main";

type PackageRow = {
  id: number;
  packageName: string;
  owner: string;
  status: "Scoped" | "Review" | "Blocked";
};

const hostScopeStyle = {
  "--radius": "17px",
  "--radius-md": "15px",
  "--background": "rgb(10 20 30)",
  "--foreground": "rgb(240 244 248)",
  "--card": "rgb(16 28 42)",
  "--card-foreground": "rgb(240 244 248)",
  "--muted": "rgb(28 42 58)",
  "--muted-foreground": "rgb(184 196 212)",
  "--border": "rgb(80 96 116)",
  "--ring": "rgb(97 165 255)",
  "--tdg-radius-md": "44px",
  "--tdg-color-background": "rgb(255 0 255)",
  "--tdg-color-foreground": "rgb(0 255 0)",
  "--tdg-color-border": "rgb(255 128 0)",
} as CSSProperties;

const rows: PackageRow[] = [
  {
    id: 1,
    packageName: "@geovi/the-datagrid",
    owner: "Grid package",
    status: "Scoped",
  },
  {
    id: 2,
    packageName: "Host shadcn card",
    owner: "Consumer app",
    status: "Review",
  },
  {
    id: 3,
    packageName: "Theme tokens",
    owner: "Consumer app",
    status: "Scoped",
  },
];

export default function Issue16CssScopeExample() {
  const columns: TypeColumns = useMemo(
    () => [
      { name: "packageName", header: "Package", sortable: true },
      { name: "owner", header: "Owner", sortable: true },
      {
        name: "status",
        header: "Status",
        sortable: true,
        render: ({ value }: CellProps) => (
          <span className="inline-flex rounded-md border border-border bg-background px-2 py-0.5 text-xs font-medium text-foreground">
            {String(value)}
          </span>
        ),
      },
    ],
    []
  );
  const [columnOrder, setColumnOrder] = useState(() =>
    columns.map((column) => String(column.name ?? column.id))
  );
  const [filteredCount, setFilteredCount] = useState(rows.length);

  return (
    <section
      data-testid="issue-16-css-scope-example"
      style={hostScopeStyle}
      className="flex flex-col gap-4"
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <section className="flex min-w-0 flex-col gap-3 rounded-2xl border bg-card/80 p-4 text-card-foreground shadow-sm">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Host shadcn surface</h2>
            <p className="text-sm text-muted-foreground">
              The card below uses ordinary shadcn utility names outside the grid
              root.
            </p>
          </div>

          <div
            data-testid="issue-16-host-probe"
            className="rounded-md border border-border bg-background p-4 text-foreground shadow-sm"
          >
            <div className="text-sm font-medium">Host utility probe</div>
            <div className="mt-1 font-mono text-xs text-muted-foreground">
              rounded-md border-border bg-background text-foreground
            </div>
          </div>
        </section>

        <section className="flex min-w-0 flex-col gap-3 rounded-2xl border bg-card/80 p-4 text-card-foreground shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Packaged grid CSS</h2>
              <p className="text-sm text-muted-foreground">
                Grid-owned Tailwind utilities should only apply under .tdg-root.
              </p>
            </div>

            <div className="text-xs text-muted-foreground">
              Filtered rows: <span className="font-mono">{filteredCount}</span>
            </div>
          </div>

          <ReactDataGrid
            theme="default"
            idProperty="id"
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
            virtualized={false}
            columnUserSelect
            i18n={{
              noRecords: "No package rows",
            }}
            showColumnMenuTool
          />
        </section>
      </div>
    </section>
  );
}
