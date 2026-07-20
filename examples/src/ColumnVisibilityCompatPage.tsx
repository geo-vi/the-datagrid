import { useMemo, useState } from "react";

import {
  RDGColumnVisibilityProvider,
  RDGColumnVisibilityTarget,
  RDGColumnVisibilityToolbar,
} from "../../src/column-visibility";
import ReactDataGrid, { type TypeColumns } from "../../src/main";

const rows = [
  { id: 1, name: "Ada Lovelace", city: "London" },
  { id: 2, name: "Grace Hopper", city: "New York" },
];

const directRows = [{ id: 1, locked: "Always present", optional: "Optional" }];

const directColumns: TypeColumns = [
  {
    name: "locked",
    header: "Locked",
    hideable: false,
    defaultWidth: 180,
  },
  {
    name: "optional",
    header: "Optional",
    visible: false,
    defaultWidth: 180,
  },
];

export default function ColumnVisibilityCompatPage() {
  const columns = useMemo<TypeColumns>(
    () => [
      { name: "id", header: "ID", width: 100 },
      { name: "name", header: "Name", defaultWidth: 220 },
      { name: "city", header: "City", defaultWidth: 180, visible: false },
    ],
    []
  );
  const [columnOrder, setColumnOrder] = useState(["id", "name", "city"]);
  const [gridKey, setGridKey] = useState(0);

  return (
    <main
      className="flex min-h-screen flex-col gap-4 bg-background p-6 text-foreground"
      data-testid="column-visibility-compat"
    >
      <div className="flex gap-2">
        <button
          type="button"
          data-testid="column-visibility-reverse-order"
          onClick={() => setColumnOrder((current) => [...current].reverse())}
        >
          Reverse order
        </button>
        <button
          type="button"
          data-testid="column-visibility-remount-grid"
          onClick={() => setGridKey((current) => current + 1)}
        >
          Remount grid
        </button>
      </div>

      <section data-testid="column-visibility-nested-target">
        <RDGColumnVisibilityProvider>
          <RDGColumnVisibilityToolbar title="Fixture columns" />

          <div className="h-80 min-h-0">
            <RDGColumnVisibilityTarget>
              <ReactDataGrid
                key={gridKey}
                idProperty="id"
                columns={columns}
                dataSource={rows}
                columnOrder={columnOrder}
                onColumnOrderChange={setColumnOrder}
                virtualized={false}
                showColumnMenuTool={false}
              />
            </RDGColumnVisibilityTarget>
          </div>
        </RDGColumnVisibilityProvider>
      </section>

      <section data-testid="column-visibility-direct-target">
        <RDGColumnVisibilityProvider>
          <RDGColumnVisibilityToolbar title="Direct target columns" />
          <ReactDataGrid
            idProperty="id"
            columns={directColumns}
            dataSource={directRows}
            virtualized={false}
            showColumnMenuTool={false}
            style={{ height: 240 }}
          />
        </RDGColumnVisibilityProvider>
      </section>
    </main>
  );
}
