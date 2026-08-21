import { useMemo, useState } from "react";

import {
  RDGToolbarProvider,
  RDGToolbarTarget,
  RDGToolbar,
} from "../../src/toolbar";
import ReactDataGrid, { type TypeColumns } from "../../src/main";
import {
  RDGToolbar as CombinedToolbar,
  RDGProvider,
  RDGSearchBar as CombinedSearchBar,
  RDGTarget,
} from "../../src/providers";
import { RDGSearchBar as LegacySearchBar } from "../../src/search";

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
    defaultVisible: false,
    defaultWidth: 180,
  },
];

const combinedRows = [
  {
    id: "combined-1",
    name: "Ada Lovelace",
    city: "London",
    role: "Mathematician",
  },
  {
    id: "combined-2",
    name: "Grace Hopper",
    city: "New York",
    role: "Rear admiral",
  },
  {
    id: "combined-3",
    name: "Katherine Johnson",
    city: "Paris",
    role: "Research mathematician",
  },
];

const combinedColumns: TypeColumns = [
  { name: "name", header: "Name", defaultWidth: 220 },
  { name: "city", header: "City", defaultWidth: 180 },
  { name: "role", header: "Role", defaultWidth: 220 },
];

export default function ToolbarCompatPage() {
  const columns = useMemo<TypeColumns>(
    () => [
      { name: "id", header: "ID", width: 100 },
      { name: "name", header: "Name", defaultWidth: 220 },
      {
        name: "city",
        header: "City",
        defaultWidth: 180,
        defaultVisible: false,
      },
    ],
    []
  );
  const [columnOrder, setColumnOrder] = useState(["id", "name", "city"]);
  const [gridKey, setGridKey] = useState(0);

  return (
    <main
      className="flex min-h-screen flex-col gap-4 bg-background p-6 text-foreground"
      data-testid="toolbar-compat"
    >
      <div className="flex gap-2">
        <button
          type="button"
          data-testid="toolbar-reverse-order"
          onClick={() => setColumnOrder((current) => [...current].reverse())}
        >
          Reverse order
        </button>
        <button
          type="button"
          data-testid="toolbar-remount-grid"
          onClick={() => setGridKey((current) => current + 1)}
        >
          Remount grid
        </button>
      </div>

      <section data-testid="toolbar-nested-target">
        <RDGToolbarProvider>
          <RDGToolbar title="Fixture columns" />

          <div className="h-80 min-h-0">
            <RDGToolbarTarget>
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
            </RDGToolbarTarget>
          </div>
        </RDGToolbarProvider>
      </section>

      <section data-testid="toolbar-direct-target">
        <RDGToolbarProvider>
          <RDGToolbar title="Direct target columns" />
          <ReactDataGrid
            idProperty="id"
            columns={directColumns}
            dataSource={directRows}
            virtualized={false}
            showColumnMenuTool={false}
            style={{ height: 240 }}
          />
        </RDGToolbarProvider>
      </section>

      <section data-testid="toolbar-collapsible">
        <RDGToolbarProvider>
          <RDGToolbar
            collapsible
            title="Collapsible columns"
            description="Reveal the complete toolbar without reserving its full height."
            showExport
            showFilterToggle
            showClearFilters
            labels={{
              hideToolbar: "Hide table controls",
              showToolbar: "Show table controls",
            }}
          />
          <div className="h-80 min-h-0">
            <RDGToolbarTarget>
              <ReactDataGrid
                idProperty="id"
                columns={directColumns}
                dataSource={directRows}
                virtualized={false}
                showColumnMenuTool={false}
              />
            </RDGToolbarTarget>
          </div>
        </RDGToolbarProvider>
      </section>

      <section
        className="flex flex-col gap-3"
        data-testid="combined-provider-direct-target"
      >
        <RDGProvider>
          <CombinedSearchBar
            ariaLabel="Search direct combined grid"
            debounceMs={0}
          />
          <CombinedToolbar title="Direct combined columns" />
          <ReactDataGrid
            idProperty="id"
            columns={combinedColumns}
            dataSource={combinedRows}
            allowMobileTransform
            virtualized={false}
            showColumnMenuTool={false}
            style={{ height: 320 }}
          />
        </RDGProvider>
      </section>

      <section
        className="flex flex-col gap-3"
        data-testid="combined-provider-nested-target"
      >
        <RDGProvider defaultSearchValue="London">
          <LegacySearchBar
            ariaLabel="Search nested combined grid"
            debounceMs={0}
          />
          <RDGToolbar title="Nested mixed-import columns" />
          <div className="h-80 min-h-0">
            <RDGTarget>
              <ReactDataGrid
                idProperty="id"
                columns={combinedColumns}
                dataSource={combinedRows}
                virtualized={false}
                showColumnMenuTool={false}
              />
            </RDGTarget>
          </div>
        </RDGProvider>
      </section>
    </main>
  );
}
