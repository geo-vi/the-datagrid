import ReactDataGrid, { type TypeColumns } from "../../src/main";

// Fixture for the root `columnDefaultHeaderAlign` fallback. The grid below
// centres every header from the root prop; the columns cover each way a
// column-level field takes precedence over it, plus the two header layouts
// (sortable, with a sort indicator beside the label, and not) and the checkbox
// column, which the default deliberately leaves alone.
const columns: TypeColumns = [
  // Inherits the root default, sortable — label and sort indicator centre
  // together.
  { name: "id", header: "ID", width: 100 },
  // Inherits the root default, not sortable — the label is a block filling the
  // header, so `text-align` places it.
  { name: "name", header: "Name", width: 220, sortable: false },
  // `headerAlign` wins over the root default.
  { name: "city", header: "City", width: 180, headerAlign: "start" },
  // `textAlign` also wins: it drives the header when `headerAlign` is absent,
  // and that column-level statement beats the root fallback.
  { name: "amount", header: "Amount", width: 160, textAlign: "end" },
];
const columnOrder = ["id", "name", "city", "amount"];
// Wider than the checkbox needs, so the header checkbox has room to drift if
// the root default were applied to this column. At the stock 44px the box fills
// the cell and the exemption would be unobservable.
const checkboxColumn = { width: 120 };
const rows = [
  { id: 1, name: "Ada Lovelace", city: "London", amount: 1200 },
  { id: 2, name: "Grace Hopper", city: "New York", amount: 940 },
  { id: 3, name: "Katherine Johnson", city: "Hampton", amount: 1785 },
];

export default function ColumnDefaultHeaderAlignPage() {
  return (
    <main
      data-testid="column-default-header-align-scenario"
      className="mx-auto flex w-full max-w-4xl flex-col gap-4"
    >
      <header className="space-y-1">
        <p className="text-sm font-medium text-muted-foreground">
          Root header alignment fixture
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          columnDefaultHeaderAlign centres every header
        </h1>
      </header>
      <div
        data-testid="default-centered-grid"
        className="h-[220px] min-h-0 rounded-lg border"
      >
        <ReactDataGrid
          idProperty="id"
          columns={columns}
          dataSource={rows}
          columnOrder={columnOrder}
          columnDefaultHeaderAlign="center"
          checkboxColumn={checkboxColumn}
          virtualized={false}
          // Off so the trailing gap measured in the header is the label's own,
          // not the menu tool's.
          showColumnMenuTool={false}
        />
      </div>
      {/* Same columns with the root prop absent: the reference the centred
          grid's headers are measured against. */}
      <div
        data-testid="baseline-grid"
        className="h-[220px] min-h-0 rounded-lg border"
      >
        <ReactDataGrid
          idProperty="id"
          columns={columns}
          dataSource={rows}
          columnOrder={columnOrder}
          checkboxColumn={checkboxColumn}
          virtualized={false}
          showColumnMenuTool={false}
        />
      </div>
    </main>
  );
}
