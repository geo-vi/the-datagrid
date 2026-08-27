import ReactDataGrid, { type TypeColumns } from "../../src/main";

// Fixture for `sortIconVisibility`. Both grids below render the same columns
// with the same initial sort, so the specs can diff one against the other:
// `id` is sorted, `name` is sortable and unsorted, `city` is not sortable, and
// `amount` brings its own `renderSortTool`, which the prop leaves alone.
const columns: TypeColumns = [
  { name: "id", header: "ID", width: 120 },
  { name: "name", header: "Name", width: 220 },
  { name: "city", header: "City", width: 180, sortable: false },
  { name: "region", header: "Region", width: 200, headerAlign: "center" },
  {
    name: "amount",
    header: "Amount",
    width: 160,
    renderSortTool: (dir) => (
      <span data-testid={`custom-sort-tool-${dir}`}>{dir === 0 ? "-" : dir}</span>
    ),
  },
];
const columnOrder = ["id", "name", "city", "region", "amount"];
const rows = [
  { id: 1, name: "Ada Lovelace", city: "London", region: "EMEA", amount: 1200 },
  { id: 2, name: "Grace Hopper", city: "New York", region: "AMER", amount: 940 },
  { id: 3, name: "Katherine Johnson", city: "Hampton", region: "AMER", amount: 1785 },
];
const sortInfo = { name: "id", dir: 1 as const };

export default function SortIconVisibilityPage() {
  return (
    <main
      data-testid="sort-icon-visibility-scenario"
      className="mx-auto flex w-full max-w-4xl flex-col gap-4"
    >
      <header className="space-y-1">
        <p className="text-sm font-medium text-muted-foreground">
          Sort indicator visibility fixture
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          sortIconVisibility hides the neutral sort indicator
        </h1>
      </header>
      <div
        data-testid="sort-icon-always-grid"
        className="h-[220px] min-h-0 rounded-lg border"
      >
        <ReactDataGrid
          idProperty="id"
          columns={columns}
          dataSource={rows}
          columnOrder={columnOrder}
          defaultSortInfo={sortInfo}
        />
      </div>
      <div
        data-testid="sort-icon-sorted-grid"
        className="h-[220px] min-h-0 rounded-lg border"
      >
        <ReactDataGrid
          idProperty="id"
          columns={columns}
          dataSource={rows}
          columnOrder={columnOrder}
          defaultSortInfo={sortInfo}
          sortIconVisibility="sorted"
        />
      </div>
    </main>
  );
}
