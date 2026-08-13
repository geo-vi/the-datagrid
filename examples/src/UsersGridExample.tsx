import { Pencil, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import ReactDataGrid, {
  DateFilter,
  NumberFilter,
  SelectFilter,
  type TypeColumns,
  type TypeFilterValue,
  type TypeI18n,
  type TypeShowCellBorders,
} from "../../src/main";
import {
  RDGToolbar,
  RDGToolbarProvider,
  RDGToolbarTarget,
} from "../../src/toolbar";
import { Button } from "../../src/components/ui/button";

const roleOptions = [
  "Administrator",
  "Security Analyst",
  "Read Only",
  "Billing Manager",
];

const languageOptions = ["en", "de", "fr", "it"];
const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

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
  showCellBorders: TypeShowCellBorders;
};

function extractCellValue(valueOrCellProps: unknown): unknown {
  if (
    typeof valueOrCellProps === "object" &&
    valueOrCellProps !== null &&
    "value" in valueOrCellProps
  ) {
    return (valueOrCellProps as { value?: unknown }).value;
  }

  return valueOrCellProps;
}

function extractRowData(valueOrCellProps: unknown): ExampleUser | null {
  if (
    typeof valueOrCellProps === "object" &&
    valueOrCellProps !== null &&
    "data" in valueOrCellProps
  ) {
    return (valueOrCellProps as { data?: ExampleUser }).data ?? null;
  }

  return null;
}

function formatDateTime(value: unknown): string {
  if (value == null || value === "") return "Never";

  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);

  return dateTimeFormatter.format(date);
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
      date_last_successful_login: new Date(
        Date.UTC(2026, 1, 10 + (index % 18), 8 + (index % 9), 15)
      ).toISOString(),
      date_pwdchanged: new Date(
        Date.UTC(2026, 0, 2 + (index % 24), 6 + (index % 7), 45)
      ).toISOString(),
      lang: language,
      disabled,
      tfa_enabled: tfaEnabled,
    };
  });
}

export default function UsersGridExample({
  theme,
  i18n,
  resizable,
  showCellBorders,
}: UsersGridExampleProps) {
  const rows = useMemo(() => createUsers(), []);

  const defaultFilterValue = useMemo<TypeFilterValue>(
    () => [
      { name: "csuserid", operator: "eq", type: "string", value: "" },
      { name: "csrolename", operator: "eq", type: "select", value: null },
      { name: "csemail", operator: "contains", type: "string", value: "" },
      {
        name: "failed_login_attempts",
        operator: "eq",
        type: "number",
        value: null,
      },
      {
        name: "date_last_successful_login",
        operator: "afterOrOn",
        type: "date",
        value: null,
      },
      {
        name: "date_pwdchanged",
        operator: "afterOrOn",
        type: "date",
        value: null,
      },
      { name: "lang", operator: "eq", type: "select", value: null },
      { name: "disabled", operator: "eq", type: "select", value: null },
      { name: "tfa_enabled", operator: "eq", type: "select", value: null },
    ],
    []
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
        // Hidden in the grid, but still interesting in an export.
        exportWhenHidden: true,
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
        render: (valueOrCellProps: unknown) =>
          formatDateTime(extractCellValue(valueOrCellProps)),
        exportValue: ({ value }) => formatDateTime(value),
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
        render: (valueOrCellProps: unknown) =>
          formatDateTime(extractCellValue(valueOrCellProps)),
        exportValue: ({ value }) => formatDateTime(value),
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
          dataSource: languageOptions.map((language) => ({
            id: language,
            label: language.toUpperCase(),
          })),
        },
        render: (valueOrCellProps: unknown) =>
          String(extractCellValue(valueOrCellProps) ?? "").toUpperCase(),
        exportValue: ({ value }) => String(value ?? "").toUpperCase(),
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
        render: (valueOrCellProps: unknown) =>
          formatBooleanPill(Boolean(extractCellValue(valueOrCellProps))),
        exportValue: ({ value }) => (value ? "Yes" : "No"),
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
        render: (valueOrCellProps: unknown) =>
          formatBooleanPill(Boolean(extractCellValue(valueOrCellProps))),
        exportValue: ({ value }) => (value ? "Enabled" : "Disabled"),
      },
      {
        name: "actions",
        header: "Actions",
        defaultWidth: 120,
        sortable: false,
        filterable: false,
        // Row buttons have no exportable representation.
        exportable: false,
        render: (valueOrCellProps: unknown) => {
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
    []
  );

  const [columnOrder, setColumnOrder] = useState<string[]>(() =>
    baseColumns.map((column) => String(column.id ?? column.name ?? ""))
  );
  const [filteredRows, setFilteredRows] = useState(rows.length);

  return (
    <section className="flex flex-col gap-4 rounded-2xl border bg-background/95 p-4 shadow-sm">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Users-style example</h2>
        <p className="text-sm text-muted-foreground">
          A fuller integration example with optional columns, export actions,
          row actions, and mixed string, select, number, and date filters.
        </p>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Filtered users: <span className="font-mono">{filteredRows}</span> /{" "}
          {rows.length}
        </span>
        <span>
          Reorder columns directly in the grid to update the toolbar order.
        </span>
      </div>

      <RDGToolbarProvider>
        <RDGToolbar
          title="Visible columns"
          description="Toggle columns, export the current view, and show or hide the filter row."
          showExport
          showFilterToggle
          showClearFilters
          exportFileName="users-grid"
        />

        <div className="h-[32rem] min-h-0" data-testid="users-grid-viewport">
          <RDGToolbarTarget>
            <ReactDataGrid
              theme={theme}
              idProperty="csuserid"
              columns={baseColumns}
              dataSource={rows}
              columnOrder={columnOrder}
              enableColumnFilterContextMenu
              enableColumnAutosize
              skipHeaderOnAutoSize={false}
              resizable={resizable}
              defaultFilterValue={defaultFilterValue}
              filteredRowsCount={setFilteredRows}
              onColumnOrderChange={setColumnOrder}
              virtualized
              columnUserSelect
              showCellBorders={showCellBorders}
              i18n={i18n}
              showColumnMenuTool={false}
            />
          </RDGToolbarTarget>
        </div>
      </RDGToolbarProvider>
    </section>
  );
}
