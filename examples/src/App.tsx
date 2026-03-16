import { useMemo, useState } from "react";
import ReactDataGrid, { type TypeColumns, type TypeI18n, type TypeShowCellBorders } from "../../src/main";
import { Button } from "../../src/components/ui/button";
import { ButtonGroup } from "../../src/components/ui/button-group";

const gridThemes = [
  { value: "default", label: "Default" },
  { value: "dark", label: "Dark" },
  { value: "hf-dark", label: "HF Dark" },
  { value: "hf-light", label: "HF Light" },
  { value: "ikarus-dark", label: "Ikarus Dark" },
  { value: "ikarus-light", label: "Ikarus Light" },
] as const;

type GridTheme = (typeof gridThemes)[number]["value"];

export default function App() {
  const [gridTheme, setGridTheme] = useState<GridTheme>("default");
  const [showCellBorders, setShowCellBorders] = useState<TypeShowCellBorders>(true);

  const i18n: TypeI18n = useMemo(
    () => ({
      noRecords: "No records",
      clear: "Clear",
      contains: "Contains",
      startsWith: "Starts with",
      endsWith: "Ends with",
      eq: "Equals",
      neq: "Not equals",
      empty: "Empty",
      notEmpty: "Not empty",
      sortAsc: "Sort asc",
      sortDesc: "Sort desc",
      unsort: "Unsort",
      perPageText: "Rows",
      pageText: "Page",
      ofText: "of",
      showingText: "Showing",
      columns: "Column",
      clearAll: "All",
    }),
    [],
  );

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
    [],
  );

  const rows = useMemo(
    () =>
      Array.from({ length: 1000 }, (_, index) => ({
        cldomnr: index + 1,
        name: `Row ${index + 1}`,
        city: ["London", "Berlin", "Paris", "Rome"][index % 4],
        amount: (index * 13) % 1000,
      })),
    [],
  );

  const [columnOrder, setColumnOrder] = useState(() => columns.map((c) => c.name ?? ""));
  const [filteredCount, setFilteredCount] = useState(rows.length);

  return (
    <div className="min-h-screen p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h1 className="m-0 text-lg font-semibold">the-datagrid demo</h1>
        <div className="flex items-center gap-2">
          <ButtonGroup aria-label="Grid theme buttons" className="max-w-full flex-wrap">
            {gridThemes.map((gridThemeOption) => (
              <Button
                key={gridThemeOption.value}
                type="button"
                variant={gridTheme === gridThemeOption.value ? "secondary" : "outline"}
                size="sm"
                className="rounded-none font-medium leading-none tracking-normal normal-case"
                onClick={() => setGridTheme(gridThemeOption.value)}
              >
                {gridThemeOption.label}
              </Button>
            ))}
          </ButtonGroup>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowCellBorders((current) => (current === true ? "horizontal" : true))}
          >
            Vertical separators {showCellBorders === true ? "on" : "off"}
          </Button>
        </div>
      </div>

      <div className="text-xs text-muted-foreground">
        Filtered rows: <span className="font-mono">{filteredCount}</span>
      </div>

      <ReactDataGrid
        theme={gridTheme}
        idProperty="cldomnr"
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
        showCellBorders={showCellBorders}
        i18n={i18n}
        showColumnMenuTool={false}
      />
    </div>
  );
}
