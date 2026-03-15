import { useMemo, useState, useEffect, useCallback } from "react";
import ReactDataGrid, { type TypeColumns, type TypeI18n, type TypeShowCellBorders } from "../../src/main";
import { Button } from "../../src/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../src/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../../src/components/ui/command";
import { Label } from "../../src/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "../../src/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "../../src/components/ui/radio-group";
import { Check, ChevronsUpDown, Moon, Sun } from "lucide-react";

type ThemeMode = "light" | "dark";

const gridThemes = [
  { value: "default", label: "Default" },
  { value: "dark", label: "Dark" },
  { value: "hf-dark", label: "HF Dark" },
  { value: "hf-light", label: "HF Light" },
  { value: "ikarus-dark", label: "Ikarus Dark" },
  { value: "ikarus-light", label: "Ikarus Light" },
] as const;

type GridTheme = (typeof gridThemes)[number]["value"];

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
  const [gridTheme, setGridTheme] = useState<GridTheme>("default");
  const [showCellBorders, setShowCellBorders] = useState<TypeShowCellBorders>(true);
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [comboboxValue, setComboboxValue] = useState("");
  const [radioValue, setRadioValue] = useState("option-one");

  useEffect(() => {
    applyTheme(theme);
    try {
      window.localStorage.setItem(THEME_KEY, theme);
    } catch {
      // Ignore storage failures in private browsing or restricted environments.
    }
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

  const frameworks = useMemo(() => ["Next.js", "SvelteKit", "Nuxt.js", "Remix", "Astro"], []);

  const [columnOrder, setColumnOrder] = useState(() => columns.map((c) => c.name ?? ""));
  const [filteredCount, setFilteredCount] = useState(rows.length);

  return (
    <div className="min-h-screen p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h1 className="m-0 text-lg font-semibold">the-datagrid demo</h1>
        <div className="flex items-center gap-2">
          <div className="flex flex-wrap items-center gap-1">
            {gridThemes.map((gridThemeOption) => (
              <Button
                key={gridThemeOption.value}
                type="button"
                variant={gridTheme === gridThemeOption.value ? "secondary" : "outline"}
                size="sm"
                onClick={() => setGridTheme(gridThemeOption.value)}
              >
                {gridThemeOption.label}
              </Button>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowCellBorders((current) => (current === true ? "horizontal" : true))}
          >
            Vertical separators {showCellBorders === true ? "on" : "off"}
          </Button>

          <Dialog>
            <DialogTrigger asChild>
              <Button type="button" variant="outline" size="sm">
                Open Dialog
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Profile</DialogTitle>
                <DialogDescription>
                  A simple dialog used to verify the shadcn shell stays intact under global legacy CSS.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button type="button" variant="secondary">
                  Cancel
                </Button>
                <Button type="button">Save changes</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                role="combobox"
                aria-expanded={comboboxOpen}
                aria-label="Framework combobox"
                className="w-[220px] justify-between"
              >
                {comboboxValue || "Select framework"}
                <ChevronsUpDown className="opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[220px] p-0">
              <Command>
                <CommandInput placeholder="Search framework..." />
                <CommandList>
                  <CommandEmpty>No framework found.</CommandEmpty>
                  <CommandGroup>
                    {frameworks.map((framework) => (
                      <CommandItem
                        key={framework}
                        value={framework}
                        onSelect={(currentValue) => {
                          const nextValue = currentValue === comboboxValue ? "" : currentValue;
                          setComboboxValue(nextValue);
                          setComboboxOpen(false);
                        }}
                      >
                        <Check className={comboboxValue === framework ? "opacity-100" : "opacity-0"} />
                        {framework}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          <RadioGroup
            aria-label="Example radio group"
            value={radioValue}
            onValueChange={setRadioValue}
            className="grid gap-2"
          >
            <div className="flex items-center gap-3">
              <RadioGroupItem value="option-one" id="option-one" />
              <Label htmlFor="option-one">Option One</Label>
            </div>
            <div className="flex items-center gap-3">
              <RadioGroupItem value="option-two" id="option-two" />
              <Label htmlFor="option-two">Option Two</Label>
            </div>
          </RadioGroup>

          <Button type="button" variant="outline" size="icon" onClick={toggleTheme} aria-label="Toggle page theme">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
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
