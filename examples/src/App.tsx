import { useMemo, useState, useEffect, useCallback } from "react";
import ReactDataGrid, { type TypeColumns, type TypeI18n } from "../../src/main";
import { Button } from "../../src/components/ui/button";
import { Moon, Sun } from "lucide-react";

type ThemeMode = "light" | "dark";

const THEME_KEY = "theme";

function readInitialTheme(): ThemeMode {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(THEME_KEY);
  if (stored === "light" || stored === "dark") return stored;
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? false;
  return prefersDark ? "dark" : "light";
}

function applyTheme(mode: ThemeMode) {
  document.documentElement.classList.toggle("dark", mode === "dark");
}

export default function App() {
  const [theme, setTheme] = useState<ThemeMode>(() => readInitialTheme());

  useEffect(() => {
    applyTheme(theme);
    try {
      window.localStorage.setItem(THEME_KEY, theme);
    } catch {}
  }, [theme]);

  // Optional: if user never explicitly chose a theme, follow OS changes.
  useEffect(() => {
    const stored = window.localStorage.getItem(THEME_KEY);
    if (stored === "light" || stored === "dark") return;

    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!mq) return;

    const onChange = () => setTheme(mq.matches ? "dark" : "light");

    // Safari compat
    if ("addEventListener" in mq) mq.addEventListener("change", onChange);
    else mq.addListener(onChange);

    return () => {
      if ("removeEventListener" in mq) mq.removeEventListener("change", onChange);
      else mq.removeListener(onChange);
    };
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }, []);

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
      { name: "city", header: "City", sortable: true, filterable: true },
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
        <Button type="button" variant="outline" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>

      <div className="text-xs text-muted-foreground">
        Filtered rows: <span className="font-mono">{filteredCount}</span>
      </div>

      <ReactDataGrid
        theme="default"
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
        i18n={i18n}
        showColumnMenuTool={false}
      />
    </div>
  );
}
