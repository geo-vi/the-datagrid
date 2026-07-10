import { useMemo, useState } from "react";

import ReactDataGrid, { type TypeColumns } from "../../src/main";
import { RDGSearchBar } from "../../src/search/RDGSearchBar";
import { RDGSearchProvider } from "../../src/search/RDGSearchProvider";
import { useExamplesUi } from "./App";

export default function BasicGridExample() {
  const { gridTheme, i18n, resizable, showCellBorders } = useExamplesUi();

  const columns: TypeColumns = useMemo(
    () => [
      { name: "cldomnr", header: "ID", sortable: true, filterable: true },
      { name: "name", header: "Name", sortable: true, filterable: true },
      {
        name: "city",
        header: "City",
        sortable: true,
        filterable: true,
        filterType: "select",
        filterEditorProps: {
          options: ["London", "Berlin", "Paris", "Rome"],
        },
      },
      {
        name: "amount",
        header: "Amount",
        sortable: true,
        filterable: true,
        textAlign: "end",
        headerAlign: "end",
      },
    ],
    []
  );

  const rows = useMemo(
    () =>
      Array.from({ length: 1000 }, (_, index) => ({
        cldomnr: index + 1,
        name: `Row ${index + 1}`,
        city: ["London", "Berlin", "Paris", "Rome"][index % 4],
        amount: (index * 13) % 1000,
      })),
    []
  );

  const [columnOrder, setColumnOrder] = useState(() =>
    columns.map((column) => column.name ?? "")
  );
  const [filteredCount, setFilteredCount] = useState(rows.length);

  return (
    <section className="flex flex-col gap-3 rounded-2xl border bg-background/95 p-4 shadow-sm">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Basic example</h2>
        <p className="text-sm text-muted-foreground">
          The compact grid demo used by the visual regression suite.
        </p>
      </div>

      <div className="text-xs text-muted-foreground">
        Filtered rows:{" "}
        <span className="font-mono" data-testid="basic-filtered-count">
          {filteredCount}
        </span>
      </div>

      <div
        className="flex h-[480px] min-h-0 flex-col gap-3"
        data-testid="basic-grid-shell"
      >
        <RDGSearchProvider>
          <RDGSearchBar />
          <ReactDataGrid
            theme={gridTheme}
            idProperty="cldomnr"
            columns={columns}
            dataSource={rows}
            columnOrder={columnOrder}
            enableColumnFilterContextMenu
            enableColumnAutosize
            skipHeaderOnAutoSize={false}
            resizable={resizable}
            enableFiltering
            defaultFilterValue={null}
            filteredRowsCount={setFilteredCount}
            onColumnOrderChange={setColumnOrder}
            virtualized
            columnUserSelect
            showCellBorders={showCellBorders}
            i18n={i18n}
            showColumnMenuTool={false}
          />
        </RDGSearchProvider>
      </div>
    </section>
  );
}
