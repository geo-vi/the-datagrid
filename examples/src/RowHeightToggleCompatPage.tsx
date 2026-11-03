import * as React from "react";

import ReactDataGrid, { type TypeColumns } from "../../src/main";

const columns: TypeColumns = [
  { name: "id", header: "ID", width: 100 },
  { name: "name", header: "Name", width: 220 },
  { name: "team", header: "Team", width: 160 },
];
const rows = Array.from({ length: 100_000 }, (_, index) => ({
  id: index + 1,
  name: `Row ${index + 1}`,
  team: ["Analytics", "Platform", "Research"][index % 3],
}));

export default function RowHeightToggleCompatPage() {
  const [condensed, setCondensed] = React.useState(false);

  return (
    <main
      data-testid="row-height-toggle-scenario"
      className="mx-auto flex w-full max-w-4xl flex-col gap-4"
    >
      <header className="space-y-1">
        <p className="text-sm font-medium text-muted-foreground">
          Row height toggle fixture
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          minRowHeight changes on 100,000 natural-height rows
        </h1>
      </header>
      <button
        type="button"
        data-testid="row-height-toggle"
        className="w-fit rounded-md border px-3 py-1 text-sm"
        onClick={() => setCondensed((value) => !value)}
      >
        {condensed ? "Condensed" : "Comfortable"}
      </button>
      <div
        data-testid="row-height-toggle-grid"
        className="h-[480px] min-h-0 rounded-lg border"
      >
        <ReactDataGrid
          idProperty="id"
          columns={columns}
          dataSource={rows}
          rowHeight={null}
          minRowHeight={condensed ? 30 : 55}
          virtualized
        />
      </div>
    </main>
  );
}
