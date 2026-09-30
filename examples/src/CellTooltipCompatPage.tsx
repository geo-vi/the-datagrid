import ReactDataGrid, { type TypeColumns } from "../../src/main";

const columns: TypeColumns = [
  { name: "id", header: "ID", width: 80, cellTooltip: true },
  {
    name: "name",
    header: "Name (always)",
    width: 160,
    cellTooltip: { showWhen: "always" },
  },
  {
    name: "recipients",
    header: "Recipients",
    width: 220,
    cellTooltip: {
      theme: "dark",
      render: ({ value }) => (value as string[]).join("\n"),
      copyText: ({ value }) => (value as string[]).join(", "),
    },
    render: ({ value }) => (
      <span className="block min-w-0 truncate">
        {(value as string[]).join(", ")}
      </span>
    ),
  },
  {
    name: "note",
    header: "Note (no copy)",
    width: 200,
    cellTooltip: { clickToCopy: false },
  },
  { name: "comment", header: "Comment", width: 200, cellTooltip: true },
  // No `cellTooltip`: cut off like the others, but never opens a tooltip.
  { name: "city", header: "City (no tooltip)", width: 140 },
];
const rows = [
  {
    id: 1,
    name: "Sam Sample",
    recipients: [
      "first.recipient@long-example-domain.example.com",
      "second.recipient@example.com",
    ],
    note: "Short",
    comment: [
      "Mailbox moved to the new tenant on Monday.",
      "",
      "Forwarding stays active until the customer confirms the MX change,",
      "then remove the old route and the catch-all alias.",
      "",
      ...Array.from(
        { length: 12 },
        (_, index) => `Checklist item ${index + 1}: done`
      ),
    ].join("\n"),
    city: "Somewhere with a very long city name",
  },
  {
    id: 2,
    name: "Alexandra Maximiliane Testperson",
    recipients: ["office@example.com"],
    note: "A note long enough to be cut off by its column",
    comment: "One line",
    city: "Hampton",
  },
];

export default function CellTooltipCompatPage() {
  return (
    <main
      data-testid="cell-tooltip-scenario"
      className="mx-auto flex w-full max-w-4xl flex-col gap-4"
    >
      <header className="space-y-1">
        <p className="text-sm font-medium text-muted-foreground">
          Cell tooltip fixture
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          cellTooltip shows the full content of a cut-off cell
        </h1>
      </header>
      <div
        data-testid="cell-tooltip-grid"
        className="h-[200px] min-h-0 rounded-lg border"
      >
        <ReactDataGrid idProperty="id" columns={columns} dataSource={rows} />
      </div>
      <div
        data-testid="cell-tooltip-dark-grid"
        className="h-[200px] min-h-0 rounded-lg border"
      >
        <ReactDataGrid
          idProperty="id"
          theme="default-dark"
          columns={columns}
          dataSource={rows}
        />
      </div>
    </main>
  );
}
