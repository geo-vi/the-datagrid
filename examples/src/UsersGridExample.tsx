import { Download, EyeOff, Filter, FilterX, Pencil, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import ReactDataGrid, {
  DateFilter,
  NumberFilter,
  SelectFilter,
  type TypeColumn,
  type TypeColumns,
  type TypeFilterValue,
  type TypeI18n,
} from "../../src/main";
import { Button } from "../../src/components/ui/button";
import { ButtonGroup } from "../../src/components/ui/button-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../src/components/ui/dropdown-menu";

const FILTER_RESERVED_COLNAME = "_filterColActive";

const roleOptions = [
  "Administrator",
  "Security Analyst",
  "Read Only",
  "Billing Manager",
];

const languageOptions = ["en", "de", "fr", "it"];

type ExportFormat = "csv" | "json";

type ExampleUser = {
  csuserid: string;
  csrolename: string;
  csemail: string;
  failed_login_attempts: number;
  date_last_successful_login: string;
  date_pwdchanged: string;
  lang: string;
  disabled: boolean;
  tfa_enabled: boolean;
};

type UsersGridExampleProps = {
  theme: string;
  i18n: TypeI18n;
  resizable: boolean;
};

type UsersToolbarProps = {
  columns: TypeColumns;
  selectedColumns: string[];
  order: string[];
  filtersActive: boolean;
  onSelectedColumnsChange: (columns: string[]) => void;
  onToggleFilters: () => void;
  onExport: (format: ExportFormat) => void;
};

function getColumnId(column: TypeColumn): string {
  return String(column.id ?? column.name ?? "");
}

function getColumnLabel(column: TypeColumn): string {
  return typeof column.header === "string" ? column.header : getColumnId(column);
}

function extractCellValue(valueOrCellProps: unknown): unknown {
  if (typeof valueOrCellProps === "object" && valueOrCellProps !== null && "value" in valueOrCellProps) {
    return (valueOrCellProps as { value?: unknown }).value;
  }

  return valueOrCellProps;
}

function extractRowData(valueOrCellProps: unknown): ExampleUser | null {
  if (typeof valueOrCellProps === "object" && valueOrCellProps !== null && "data" in valueOrCellProps) {
    return (valueOrCellProps as { data?: ExampleUser }).data ?? null;
  }

  return null;
}

function formatDateTime(value: unknown): string {
  if (value == null || value === "") return "Never";

  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatBooleanPill(value: boolean) {
  return (
    <span
      className={
        value
          ? "inline-flex rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-200"
          : "inline-flex rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
      }
    >
      {value ? "Yes" : "No"}
    </span>
  );
}

function getUserFieldValue(row: ExampleUser, columnId: keyof ExampleUser): ExampleUser[keyof ExampleUser] {
  return row[columnId];
}

function createUsers(): ExampleUser[] {
  return Array.from({ length: 48 }, (_, index) => {
    const id = 1000 + index;
    const role = roleOptions[index % roleOptions.length];
    const language = languageOptions[index % languageOptions.length];
    const disabled = index % 7 === 0;
    const tfaEnabled = index % 3 !== 0;

    return {
      csuserid: String(id),
      csrolename: role,
      csemail: `user.${id}@ikarus.demo`,
      failed_login_attempts: index % 5,
      date_last_successful_login: new Date(Date.UTC(2026, 1, 10 + (index % 18), 8 + (index % 9), 15)).toISOString(),
      date_pwdchanged: new Date(Date.UTC(2026, 0, 2 + (index % 24), 6 + (index % 7), 45)).toISOString(),
      lang: language,
      disabled,
      tfa_enabled: tfaEnabled,
    };
  });
}

function escapeCsv(value: unknown): string {
  const normalized = value == null ? "" : String(value);
  if (!/[",\n]/.test(normalized)) return normalized;
  return `"${normalized.replace(/"/g, '""')}"`;
}

function downloadTextFile(filename: string, content: string, mimeType: string) {
  if (typeof document === "undefined" || typeof URL === "undefined") return;

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function orderColumns(columns: TypeColumns, order: string[]) {
  const indexed = new Map(columns.map((column) => [getColumnId(column), column]));
  const ordered = order.map((columnId) => indexed.get(columnId)).filter((column): column is TypeColumn => Boolean(column));
  const remaining = columns.filter((column) => !order.includes(getColumnId(column)));
  return [...ordered, ...remaining];
}

function UsersToolbar({
  columns,
  selectedColumns,
  order,
  filtersActive,
  onSelectedColumnsChange,
  onToggleFilters,
  onExport,
}: UsersToolbarProps) {
  const orderedColumns = useMemo(() => orderColumns(columns, order), [columns, order]);

  const visibleColumnNames = selectedColumns.filter((name) => name !== FILTER_RESERVED_COLNAME);
  const visibleSet = new Set(visibleColumnNames);

  function toggleColumn(columnName: string) {
    const isVisible = visibleSet.has(columnName);

    if (isVisible && visibleColumnNames.length === 1) {
      return;
    }

    if (isVisible) {
      onSelectedColumnsChange(visibleColumnNames.filter((name) => name !== columnName));
      return;
    }

    onSelectedColumnsChange([...visibleColumnNames, columnName]);
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card/60 p-3 shadow-sm">
      <div className="flex flex-col gap-1">
        <div className="text-sm font-medium">Visible columns</div>
        <div className="text-xs text-muted-foreground">
          Toggle columns, export the current dataset shape, and show or hide the filter row.
        </div>
      </div>

      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <ButtonGroup aria-label="Visible column toggles" className="flex max-w-full flex-wrap gap-2">
          {orderedColumns.map((column) => {
            const columnId = getColumnId(column);
            const isVisible = visibleSet.has(columnId);

            return (
              <Button
                key={columnId}
                type="button"
                variant={isVisible ? "secondary" : "outline"}
                size="sm"
                className="rounded-md"
                onClick={() => toggleColumn(columnId)}
              >
                {isVisible ? null : <EyeOff className="size-3.5" />}
                {getColumnLabel(column)}
              </Button>
            );
          })}
        </ButtonGroup>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="sm">
                <Download className="size-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Download example data</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem onSelect={() => onExport("csv")}>Export CSV</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onExport("json")}>Export JSON</DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button type="button" variant={filtersActive ? "secondary" : "outline"} size="sm" onClick={onToggleFilters}>
            {filtersActive ? <FilterX className="size-4" /> : <Filter className="size-4" />}
            {filtersActive ? "Hide filters" : "Show filters"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function UsersGridExample({ theme, i18n, resizable }: UsersGridExampleProps) {
  const rows = useMemo(() => createUsers(), []);

  const defaultFilterValue = useMemo<TypeFilterValue>(
    () => [
      { name: "csuserid", operator: "eq", type: "string", value: "" },
      { name: "csrolename", operator: "eq", type: "select", value: null },
      { name: "csemail", operator: "contains", type: "string", value: "" },
      { name: "failed_login_attempts", operator: "eq", type: "number", value: null },
      { name: "date_last_successful_login", operator: "afterOrOn", type: "date", value: null },
      { name: "date_pwdchanged", operator: "afterOrOn", type: "date", value: null },
      { name: "lang", operator: "eq", type: "select", value: null },
      { name: "disabled", operator: "eq", type: "select", value: null },
      { name: "tfa_enabled", operator: "eq", type: "select", value: null },
    ],
    [],
  );

  const baseColumns = useMemo<TypeColumns>(
    () => [
      {
        name: "csuserid",
        header: "User #",
        defaultWidth: 96,
        type: "string",
      },
      {
        name: "csrolename",
        header: "Role",
        defaultWidth: 180,
        defaultFlex: 1,
        filterType: "select",
        filterEditor: SelectFilter,
        filterEditorProps: {
          placeholder: "All roles",
          dataSource: roleOptions.map((role) => ({ id: role, label: role })),
        },
      },
      {
        name: "csemail",
        header: "Email",
        defaultWidth: 240,
        defaultFlex: 2,
        type: "string",
      },
      {
        name: "failed_login_attempts",
        header: "Failed logins",
        defaultWidth: 152,
        defaultHidden: true,
        type: "number",
        filterType: "number",
        filterEditor: NumberFilter,
      },
      {
        name: "date_last_successful_login",
        header: "Last login",
        defaultHidden: true,
        defaultWidth: 212,
        filterType: "date",
        filterEditor: DateFilter,
        filterEditorProps: {
          placeholder: "Pick a date",
        },
        render: (valueOrCellProps) => formatDateTime(extractCellValue(valueOrCellProps)),
      },
      {
        name: "date_pwdchanged",
        header: "Password changed",
        defaultHidden: true,
        defaultWidth: 212,
        filterType: "date",
        filterEditor: DateFilter,
        filterEditorProps: {
          placeholder: "Pick a date",
        },
        render: (valueOrCellProps) => formatDateTime(extractCellValue(valueOrCellProps)),
      },
      {
        name: "lang",
        header: "Language",
        defaultWidth: 132,
        defaultHidden: true,
        filterType: "select",
        filterEditor: SelectFilter,
        filterEditorProps: {
          placeholder: "All languages",
          dataSource: languageOptions.map((language) => ({ id: language, label: language.toUpperCase() })),
        },
        render: (valueOrCellProps) => String(extractCellValue(valueOrCellProps) ?? "").toUpperCase(),
      },
      {
        name: "disabled",
        header: "Disabled",
        defaultWidth: 128,
        filterType: "select",
        filterEditor: SelectFilter,
        filterEditorProps: {
          placeholder: "All states",
          dataSource: [
            { id: true, label: "Yes" },
            { id: false, label: "No" },
          ],
        },
        render: (valueOrCellProps) => formatBooleanPill(Boolean(extractCellValue(valueOrCellProps))),
      },
      {
        name: "tfa_enabled",
        header: "2FA",
        defaultWidth: 116,
        filterType: "select",
        filterEditor: SelectFilter,
        filterEditorProps: {
          placeholder: "All states",
          dataSource: [
            { id: true, label: "Enabled" },
            { id: false, label: "Disabled" },
          ],
        },
        render: (valueOrCellProps) => formatBooleanPill(Boolean(extractCellValue(valueOrCellProps))),
      },
      {
        name: "actions",
        header: "Actions",
        defaultWidth: 120,
        sortable: false,
        filterable: false,
        render: (valueOrCellProps) => {
          const row = extractRowData(valueOrCellProps);
          if (!row) return null;

          return (
            <div className="flex items-center justify-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Edit ${row.csemail}`}
                title={`Edit ${row.csemail}`}
                onClick={() => {
                  console.info("Edit user", row.csuserid);
                }}
              >
                <Pencil className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Delete ${row.csemail}`}
                title={`Delete ${row.csemail}`}
                onClick={() => {
                  console.info("Delete user", row.csuserid);
                }}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          );
        },
      },
    ],
    [],
  );

  const [columnOrder, setColumnOrder] = useState<string[]>(() => baseColumns.map(getColumnId));
  const [selectedColumns, setSelectedColumns] = useState<string[]>(() => [
    ...baseColumns.filter((column) => column.defaultHidden !== true).map(getColumnId),
    FILTER_RESERVED_COLNAME,
  ]);
  const [filteredRows, setFilteredRows] = useState(rows.length);

  const filtersActive = selectedColumns.includes(FILTER_RESERVED_COLNAME);
  const visibleColumnNames = useMemo(
    () => selectedColumns.filter((name) => name !== FILTER_RESERVED_COLNAME),
    [selectedColumns],
  );

  const gridColumns = useMemo(
    () => baseColumns.filter((column) => visibleColumnNames.includes(getColumnId(column))),
    [baseColumns, visibleColumnNames],
  );
  const gridColumnOrder = useMemo(
    () =>
      orderColumns(baseColumns, columnOrder)
        .map((column) => getColumnId(column))
        .filter((columnId) => visibleColumnNames.includes(columnId)),
    [baseColumns, columnOrder, visibleColumnNames],
  );

  function handleSelectedColumnsChange(nextColumns: string[]) {
    const filtersMarker = filtersActive ? [FILTER_RESERVED_COLNAME] : [];
    setSelectedColumns([...nextColumns, ...filtersMarker]);
  }

  function handleToggleFilters() {
    setSelectedColumns((current) =>
      current.includes(FILTER_RESERVED_COLNAME)
        ? current.filter((name) => name !== FILTER_RESERVED_COLNAME)
        : [...current, FILTER_RESERVED_COLNAME],
    );
    setFilteredRows(rows.length);
  }

  function handleExport(format: ExportFormat) {
    const exportColumns = orderColumns(baseColumns, columnOrder).filter((column) => {
      const columnId = getColumnId(column);
      return selectedColumns.includes(columnId) && columnId !== "actions";
    });

    const exportedRows = rows.map((row) =>
      Object.fromEntries(
        exportColumns.map((column) => {
          const columnId = getColumnId(column);
          const value =
            columnId === "disabled" || columnId === "tfa_enabled"
              ? row[columnId as "disabled" | "tfa_enabled"]
                ? "Yes"
                : "No"
              : columnId === "date_last_successful_login" || columnId === "date_pwdchanged"
                ? formatDateTime(row[columnId as "date_last_successful_login" | "date_pwdchanged"])
                : getUserFieldValue(row, columnId as keyof ExampleUser);

          return [getColumnLabel(column), value];
        }),
      ),
    );

    if (format === "json") {
      downloadTextFile("users-grid.json", JSON.stringify(exportedRows, null, 2), "application/json;charset=utf-8");
      return;
    }

    const header = exportColumns.map((column) => escapeCsv(getColumnLabel(column))).join(",");
    const body = exportedRows
      .map((row) =>
        exportColumns
          .map((column) => {
            const key = getColumnLabel(column);
            return escapeCsv(row[key]);
          })
          .join(","),
      )
      .join("\n");

    downloadTextFile("users-grid.csv", `${header}\n${body}`, "text/csv;charset=utf-8");
  }

  return (
    <section className="flex flex-col gap-4 rounded-2xl border bg-background/95 p-4 shadow-sm">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Users-style example</h2>
        <p className="text-sm text-muted-foreground">
          A fuller integration example with optional columns, export actions, row actions, and mixed string, select,
          number, and date filters.
        </p>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Filtered users: <span className="font-mono">{filteredRows}</span> / {rows.length}
        </span>
        <span>Reorder columns directly in the grid to update the toolbar order.</span>
      </div>

      <UsersToolbar
        columns={baseColumns}
        selectedColumns={selectedColumns}
        order={columnOrder}
        filtersActive={filtersActive}
        onSelectedColumnsChange={handleSelectedColumnsChange}
        onToggleFilters={handleToggleFilters}
        onExport={handleExport}
      />

      <ReactDataGrid
        key={filtersActive ? "users-grid-filters-on" : "users-grid-filters-off"}
        theme={theme}
        idProperty="csuserid"
        columns={gridColumns}
        dataSource={rows}
        columnOrder={gridColumnOrder}
        enableColumnFilterContextMenu
        enableColumnAutosize
        skipHeaderOnAutoSize={false}
        resizable={resizable}
        enableFiltering={filtersActive}
        defaultFilterValue={defaultFilterValue}
        filteredRowsCount={setFilteredRows}
        onColumnOrderChange={setColumnOrder}
        virtualized
        columnUserSelect
        i18n={i18n}
        showColumnMenuTool={false}
      />
    </section>
  );
}
