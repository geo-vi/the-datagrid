import * as React from "react";
import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";

import CopyableCodeBlock from "./CopyableCodeBlock";

void React;

type ReferenceRow = {
  name: string;
  type: string;
  defaultValue: string;
  description: string;
};

type ReferenceSection = {
  id: string;
  title: string;
  rows?: ReferenceRow[];
  body?: ReactNode;
};

export function getReferenceRowId(sectionId: string, rowName: string): string {
  const rowSlug = rowName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${sectionId}-${rowSlug || "row"}`;
}

type CompatibilityStatus =
  | "compatible"
  | "known-gap"
  | "outside-public-baseline"
  | "verifying";

type CompatibilityRow = {
  id: string;
  feature: string;
  upstreamContract: ReactNode;
  currentBehavior: ReactNode;
  requiredOutcome: ReactNode;
  status: CompatibilityStatus;
};

export type DocsNavGroupKey =
  | "getting-started"
  | "guides"
  | "reference"
  | "migration";

export type DocsPage = {
  group: DocsNavGroupKey;
  slug: string;
  title: string;
  summary: string;
  description: string;
  tags: string[];
  sections: ReferenceSection[];
};

type DocsNavGroup = {
  key: DocsNavGroupKey;
  label: string;
  pages: DocsPage[];
};

export type DocsHomeCard =
  | {
      title: string;
      summary: string;
      kind: "docs";
      group: DocsNavGroupKey;
      slug: string;
    }
  | {
      title: string;
      summary: string;
      kind: "route";
      to: "/examples";
    };

const quickstartSnippet = `import { useMemo, useState } from "react";
import ReactDataGrid, {
  type TypeColumns,
  type TypeRowSelection,
} from "@geovi/the-datagrid";

export function AccountsGrid() {
  const [selectedRows, setSelectedRows] = useState<TypeRowSelection>({});

  const columns: TypeColumns = useMemo(
    () => [
      { name: "id", header: "ID", defaultWidth: 120, sortable: true },
      { name: "account", header: "Account", defaultWidth: 220, filterable: true },
      { name: "owner", header: "Owner", defaultWidth: 180, filterable: true },
    ],
    []
  );

  const rows = useMemo(
    () => [
      { id: "acct-101", account: "Northwind Health", owner: "Ava Patel" },
      { id: "acct-102", account: "Atlas Freight", owner: "Noah Fischer" },
    ],
    []
  );

  return (
    <ReactDataGrid
      theme="default"
      idProperty="id"
      columns={columns}
      dataSource={rows}
      columnOrder={["id", "account", "owner"]}
      enableFiltering
      defaultFilterValue={[
        {
          name: "account",
          type: "string",
          operator: "contains",
          value: "",
        },
        {
          name: "owner",
          type: "string",
          operator: "contains",
          value: "",
        },
      ]}
      enableColumnAutosize
      skipHeaderOnAutoSize={false}
      virtualized
      columnUserSelect
      showColumnMenuTool={false}
      checkboxColumn
      selected={selectedRows}
      onSelectionChange={setSelectedRows}
    />
  );
}`;

const remoteDataSnippet = `type RemoteArgs = {
  sortInfo: TypeSortInfo;
  filterValue: TypeFilterValue;
  columnOrder: string[];
  columns: TypeColumns;
  idProperty: string;
  theme: string;
  skip?: number;
  limit?: number;
  searchValue?: string;
  signal?: AbortSignal;
};

const dataSource = async (args: RemoteArgs) => {
  const { signal, ...request } = args;
  const response = await fetch("/api/accounts/search", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(request),
    signal,
  });

  return response.json() as Promise<{ data: AccountRow[]; count: number }>;
};`;

const tableSearchSnippet = `import ReactDataGrid from "@geovi/the-datagrid";
import {
  RDGSearchBar,
  RDGSearchProvider,
} from "@geovi/the-datagrid/search";

export function SearchableAccountsGrid() {
  return (
    <RDGSearchProvider>
      <RDGSearchBar />
      <ReactDataGrid
        idProperty="id"
        columns={columns}
        dataSource={rows}
        virtualized
      />
    </RDGSearchProvider>
  );
}`;

const nestedTableSearchSnippet = `import {
  RDGSearchBar,
  RDGSearchProvider,
  RDGSearchTarget,
} from "@geovi/the-datagrid/search";

<RDGSearchProvider>
  <RDGSearchBar />
  <section className="min-h-0 flex-1">
    <RDGSearchTarget>
      <ReactDataGrid
        idProperty="id"
        columns={columns}
        dataSource={rows}
      />
    </RDGSearchTarget>
  </section>
</RDGSearchProvider>;`;

const searchColumnsSnippet = `const columns: TypeColumns = [
  {
    name: "city",
    header: "Office city",
    searchAliases: ["location", "office"],
  },
  {
    name: "customer",
    searchValue: (row) => [row.customer.name, row.customer.reference],
  },
  { name: "internalNote", searchable: false },
];`;

const toolbarSnippet = `import ReactDataGrid from "@geovi/the-datagrid";
import {
  RDGToolbarProvider,
  RDGToolbar,
} from "@geovi/the-datagrid/toolbar";

export function AccountsGrid() {
  return (
    <RDGToolbarProvider>
      <RDGToolbar showExport showFilterToggle showClearFilters>
        {/* Children stay application-owned, next to the built-in actions. */}
        <button type="button" onClick={reload}>Reload</button>
      </RDGToolbar>

      <ReactDataGrid
        idProperty="id"
        columns={columns}
        dataSource={rows}
        columnOrder={columnOrder}
      />
    </RDGToolbarProvider>
  );
}`;

const nestedToolbarSnippet = `import {
  RDGToolbarProvider,
  RDGToolbarTarget,
  RDGToolbar,
} from "@geovi/the-datagrid/toolbar";

<RDGToolbarProvider>
  <RDGToolbar />
  <section className="min-h-0 flex-1">
    <RDGToolbarTarget>
      <ReactDataGrid idProperty="id" columns={columns} dataSource={rows} />
    </RDGToolbarTarget>
  </section>
</RDGToolbarProvider>;`;

const directProviderChildrenSnippet = `import ReactDataGrid from "@geovi/the-datagrid";
import {
  RDGToolbar,
  RDGProvider,
  RDGSearchBar,
} from "@geovi/the-datagrid/components";

export function SearchableConfigurableAccountsGrid() {
  return (
    <RDGProvider>
      <RDGSearchBar />
      <RDGToolbar>
        <button type="button" onClick={exportRows}>Export CSV</button>
      </RDGToolbar>

      {/* Direct provider child: RDGTarget is not required. */}
      <ReactDataGrid idProperty="id" columns={columns} dataSource={rows} />
    </RDGProvider>
  );
}`;

const requiredCombinedTargetSnippet = `import ReactDataGrid from "@geovi/the-datagrid";
import {
  RDGToolbar,
  RDGProvider,
  RDGSearchBar,
  RDGTarget,
} from "@geovi/the-datagrid/components";

<RDGProvider>
  <RDGSearchBar />
  <RDGToolbar />

  {/* The section is an intervening child, so RDGTarget is required. */}
  <section className="min-h-0 flex-1">
    <RDGTarget>
      <ReactDataGrid idProperty="id" columns={columns} dataSource={rows} />
    </RDGTarget>
  </section>
</RDGProvider>;`;

const mixedProviderImportsSnippet = `import ReactDataGrid from "@geovi/the-datagrid";
import { RDGProvider, RDGTarget } from "@geovi/the-datagrid/components";
import { RDGSearchBar } from "@geovi/the-datagrid/search";
import {
  RDGToolbar,
} from "@geovi/the-datagrid/toolbar";

<RDGProvider>
  {/* Existing feature-entry controls consume the combined provider. */}
  <RDGSearchBar />
  <RDGToolbar />
  <div className="min-h-0 flex-1">
    <RDGTarget>
      <ReactDataGrid idProperty="id" columns={columns} dataSource={rows} />
    </RDGTarget>
  </div>
</RDGProvider>;`;

const independentProviderScopesSnippet = `import ReactDataGrid from "@geovi/the-datagrid";
import {
  RDGToolbarProvider,
  RDGToolbar,
} from "@geovi/the-datagrid/toolbar";

function AccountsAndInvoices() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Providers add no DOM, so each scope gets a real layout wrapper. */}
      <section className="flex min-h-0 flex-col gap-3">
        <RDGToolbarProvider>
          <RDGToolbar title="Account columns" />
          <ReactDataGrid
            idProperty="id"
            columns={accountColumns}
            dataSource={accounts}
          />
        </RDGToolbarProvider>
      </section>

      <section className="flex min-h-0 flex-col gap-3">
        <RDGToolbarProvider>
          <RDGToolbar title="Invoice columns" />
          <ReactDataGrid
            idProperty="id"
            columns={invoiceColumns}
            dataSource={invoices}
          />
        </RDGToolbarProvider>
      </section>
    </div>
  );
}`;

const toolbarColumnsSnippet = `const columns: TypeColumns = [
  { name: "id", header: "ID", hideable: false },
  { name: "name", header: "Name" },
  { name: "city", header: "City", defaultVisible: false },
];`;

const toolbarSpreadsheetSnippet = `npm install xlsx   // optional peer dependency, only for "xlsx"

<RDGToolbar
  showExport
  exportFormats={["csv", "json", "xlsx"]}
  exportFileName={({ format }) => \`orders-\${format}-\${today()}\`}
  exportSheetName="Orders"
  exportDateFormat="dd/mm/yyyy hh:mm"
  onExportSuccess={({ fileName, rowCount }) =>
    toast.success(\`Wrote \${rowCount} rows to \${fileName}\`)
  }
  onExportError={(error) => toast.error(String(error))}
/>;

const columns: TypeColumns = [
  // Numbers stay numeric, so the column can be summed in a spreadsheet.
  { name: "total", header: "Total", exportValue: ({ value }) => Number(value) },

  // A Date becomes a real date cell carrying exportDateFormat.
  { name: "placedAt", header: "Placed", exportValue: ({ value }) => new Date(value) },

  // A boolean becomes TRUE/FALSE rather than the rendered pill.
  { name: "fulfilled", header: "Done", exportValue: ({ value }) => Boolean(value) },

  // Anything else is text: format it yourself.
  { name: "size", header: "Size", exportValue: ({ value }) => filesize(value) },
];`;

const toolbarTokenSnippet = `/* Any ancestor works; the toolbar root is the narrowest scope. */
.tdg-toolbar-root {
  --tdg-toolbar-padding: 0;
  --tdg-toolbar-radius: 0;
  --tdg-toolbar-border-width: 0;
  --tdg-toolbar-shadow: none;

  --tdg-toolbar-toggle-gap: 3px;
  --tdg-toolbar-control-padding: 6px 8px;
  --tdg-toolbar-control-radius: 4px;
  --tdg-toolbar-control-height: auto;
  --tdg-toolbar-control-border-width: 0;
  --tdg-toolbar-control-cursor: pointer;
  --tdg-toolbar-toggle-font-size: 12px;
  --tdg-toolbar-action-font-size: 12px;

  --tdg-toolbar-control-fill: #eef1f5;
  --tdg-toolbar-control-color: #12263f;
  --tdg-toolbar-control-hover-fill: #dfe4ea;
  --tdg-toolbar-control-on-fill: #1a73e8;
  --tdg-toolbar-control-on-color: #ffffff;
  --tdg-toolbar-control-on-hover-fill: #1666cf;
}`;

const toolbarThemeBridgeSnippet = `// Any theming library can drive the tokens; nothing here is React-specific.
const Themed = styled.div\`
  --tdg-toolbar-control-on-fill: \${({ theme }) => theme.baseui.buttonPrimaryFill};
  --tdg-toolbar-control-on-color: \${({ theme }) => theme.baseui.buttonPrimaryText};
  --tdg-toolbar-control-on-hover-fill: \${({ theme }) => theme.baseui.buttonPrimaryHover};
  --tdg-toolbar-control-fill: \${({ theme }) => theme.baseui.buttonSecondaryFill};
  --tdg-toolbar-control-color: \${({ theme }) => theme.baseui.buttonSecondaryText};
  --tdg-toolbar-control-hover-fill: \${({ theme }) => theme.baseui.buttonSecondaryHover};
\`;

<Themed>
  <RDGToolbarProvider>
    <RDGToolbar showExport showFilterToggle />
    <ReactDataGrid idProperty="id" columns={columns} dataSource={rows} />
  </RDGToolbarProvider>
</Themed>;`;

const toolbarOverrideSnippet = `/* Plain CSS wins too: every default rule carries a single unit of
   specificity, so one class plus one element outranks it. */
.tdg-toolbar-root button {
  background-color: var(--button-primary-fill);
  color: var(--button-primary-color);
}

.tdg-toolbar-root button:hover {
  background-color: var(--button-primary-hover);
}

.tdg-toolbar-root button[data-state="off"] {
  background-color: var(--button-secondary-fill);
  color: var(--button-secondary-color);
}`;

const toolbarExportColumnsSnippet = `const columns: TypeColumns = [
  { name: "id", header: "ID" },

  // render returns a React node, so export needs its own value.
  {
    name: "active",
    header: "Active",
    render: ({ value }) => <StatusPill active={value} />,
    exportValue: ({ value }) => (value ? "Yes" : "No"),
  },

  // Hidden in the grid, still written to the file.
  { name: "auditId", header: "Audit ID", defaultVisible: false, exportWhenHidden: true },

  // Row buttons have no exportable representation.
  { name: "actions", header: "Actions", exportable: false },
];`;

const remoteSearchSnippet = `import type { TypeDataSourceArgs } from "@geovi/the-datagrid";

const dataSource = async (args: TypeDataSourceArgs) => {
  const { signal, ...request } = args;
  const response = await fetch("/api/accounts/search", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(request),
    signal,
  });

  return response.json() as Promise<{ data: AccountRow[]; count: number }>;
};

// Inside RDGSearchProvider, args.searchValue contains the committed query.
// Remote pagination resets to skip: 0 before a new query is requested.`;

const selectionSnippet = `const [selectedRows, setSelectedRows] = useState<TypeRowSelection>({});

<ReactDataGrid
  idProperty="id"
  columns={columns}
  dataSource={rows}
  checkboxColumn
  selected={selectedRows}
  onSelectionChange={setSelectedRows}
/>;

// The grid still emits the Inovua-style config object:
// { selected, data, unselected, originalData }
// It also accepts that wrapper back through \`selected\`.`;

const i18nSnippet = `import ReactDataGrid, { type TypeI18n } from "@geovi/the-datagrid";

const i18n: TypeI18n = {
  noRecords: "Nothing to display",
  clear: "Reset filter",
  mobileColumns: "Choose fields",
};

<ReactDataGrid
  idProperty="id"
  columns={columns}
  dataSource={rows}
  i18n={i18n}
/>;

// Every omitted key keeps its built-in English fallback.`;

function CodeBlock(props: { code: string; language?: string }) {
  const { code, language = "tsx" } = props;

  return <CopyableCodeBlock code={code} language={language} />;
}

function Callout(props: {
  title: string;
  tone?: "info" | "warning";
  children: ReactNode;
}) {
  const { children, title, tone = "info" } = props;

  return (
    <div
      className={
        tone === "warning"
          ? "rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-4 dark:border-amber-400/20 dark:bg-amber-400/10"
          : "rounded-2xl border border-sky-500/25 bg-sky-500/10 px-4 py-4 dark:border-sky-400/20 dark:bg-sky-400/10"
      }
    >
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-2 space-y-3 text-sm text-muted-foreground">
        {children}
      </div>
    </div>
  );
}

function ReferenceTable(props: { rows: ReferenceRow[]; sectionId: string }) {
  const { rows, sectionId } = props;

  return (
    <div className="overflow-hidden rounded-2xl border">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="border-b px-4 py-3 font-semibold">Name</th>
              <th className="border-b px-4 py-3 font-semibold">Type</th>
              <th className="border-b px-4 py-3 font-semibold">Default</th>
              <th className="border-b px-4 py-3 font-semibold">Description</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.name}
                id={getReferenceRowId(sectionId, row.name)}
                className="scroll-mt-24 align-top"
              >
                <td className="border-b px-4 py-3 font-mono text-xs text-foreground">
                  {row.name}
                </td>
                <td className="border-b px-4 py-3 font-mono text-xs text-muted-foreground">
                  {row.type}
                </td>
                <td className="border-b px-4 py-3 font-mono text-xs text-muted-foreground">
                  {row.defaultValue}
                </td>
                <td className="border-b px-4 py-3 text-muted-foreground">
                  {row.description}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const compatibilityStatusPresentation: Record<
  CompatibilityStatus,
  { label: string; className: string }
> = {
  compatible: {
    label: "Compatible",
    className:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
  },
  "known-gap": {
    label: "Known gap",
    className:
      "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-100",
  },
  "outside-public-baseline": {
    label: "Outside public baseline",
    className: "border-border bg-muted/60 text-muted-foreground",
  },
  verifying: {
    label: "Verifying",
    className: "border-sky-500/30 bg-sky-500/10 text-sky-900 dark:text-sky-100",
  },
};

function CompatibilityTable(props: { rows: CompatibilityRow[] }) {
  const { rows } = props;

  return (
    <div className="overflow-hidden rounded-2xl border">
      <div className="overflow-x-auto">
        <table className="min-w-[1120px] border-collapse text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="border-b px-4 py-3 font-semibold">Area</th>
              <th className="border-b px-4 py-3 font-semibold">
                Inovua Community 5.10.2 contract
              </th>
              <th className="border-b px-4 py-3 font-semibold">
                Current the-datagrid behavior
              </th>
              <th className="border-b px-4 py-3 font-semibold">
                Parity requirement
              </th>
              <th className="border-b px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const status = compatibilityStatusPresentation[row.status];

              return (
                <tr
                  key={row.id}
                  className="align-top"
                  data-compat-feature={row.id}
                  data-compat-status={row.status}
                >
                  <th
                    scope="row"
                    className="border-b px-4 py-3 text-left font-semibold text-foreground"
                  >
                    {row.feature}
                  </th>
                  <td className="border-b px-4 py-3 text-muted-foreground">
                    {row.upstreamContract}
                  </td>
                  <td className="border-b px-4 py-3 text-muted-foreground">
                    {row.currentBehavior}
                  </td>
                  <td className="border-b px-4 py-3 text-muted-foreground">
                    {row.requiredOutcome}
                  </td>
                  <td className="border-b px-4 py-3">
                    <span
                      className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${status.className}`}
                    >
                      {status.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SectionBody(props: { section: ReferenceSection }) {
  const { section } = props;

  return (
    <section id={section.id} className="scroll-mt-24 space-y-4">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight">
          {section.title}
        </h2>
      </div>
      <div className="min-w-0 space-y-4 [&_ol]:max-w-prose [&_p]:max-w-prose [&_ul]:max-w-prose">
        {section.body}
      </div>
      {section.rows ? (
        <ReferenceTable rows={section.rows} sectionId={section.id} />
      ) : null}
    </section>
  );
}

export function getDocsLinkTarget(group: DocsNavGroupKey, slug: string) {
  return {
    to: "/docs/$group/$slug" as const,
    params: { group, slug },
  };
}

export function DocsRouteLink(props: {
  group: DocsNavGroupKey;
  slug: string;
  className?: string;
  children: ReactNode;
}) {
  const { children, className, group, slug } = props;

  return (
    <Link {...getDocsLinkTarget(group, slug)} className={className}>
      {children}
    </Link>
  );
}

export function DocsPageArticle(props: { page: DocsPage }) {
  const { page } = props;

  return (
    <article className="flex min-w-0 flex-col gap-8">
      <section className="rounded-3xl border bg-background/95 p-6 shadow-sm">
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
              {page.group.replace("-", " ")}
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">
              {page.title}
            </h1>
            <p className="max-w-3xl text-base text-muted-foreground">
              {page.summary}
            </p>
          </div>

          <p className="max-w-3xl text-sm text-muted-foreground">
            {page.description}
          </p>

          <div className="flex flex-wrap gap-2">
            {page.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border bg-muted/40 px-2.5 py-1 text-xs font-medium text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {page.sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
              >
                {section.title}
              </a>
            ))}
          </div>
        </div>
      </section>

      {page.sections.map((section) => (
        <SectionBody key={section.id} section={section} />
      ))}
    </article>
  );
}

const reactDataGridPropSections: ReferenceSection[] = [
  {
    id: "compatibility-status",
    title: "Compatibility status",
    body: (
      <Callout
        title="Current exports are not the completed Inovua surface"
        tone="warning"
      >
        <p>
          This table documents props shipped by the current package. The product
          target is 100% backwards compatibility with the documented public{" "}
          <code>@inovua/reactdatagrid-community@5.10.2</code> contract, but
          feasible props that are not implemented yet remain known gaps and are
          not listed here as if they worked.
        </p>
        <p>
          Read the{" "}
          <DocsRouteLink
            group="migration"
            slug="inovua-compat"
            className="font-medium text-foreground underline underline-offset-4"
          >
            compatibility contract
          </DocsRouteLink>{" "}
          and the{" "}
          <DocsRouteLink
            group="migration"
            slug="inovua-status"
            className="font-medium text-foreground underline underline-offset-4"
          >
            current parity status
          </DocsRouteLink>{" "}
          before treating this package as a drop-in runtime replacement.
        </p>
      </Callout>
    ),
  },
  {
    id: "core-props",
    title: "Core props",
    rows: [
      {
        name: "theme",
        type: "string",
        defaultValue: '"default-light"',
        description:
          "Theme hook for built-in and custom themes. The Inovua-compatible default-light name selects the light base; default follows a dark ancestor, and custom names are exposed through data-theme.",
      },
      {
        name: "idProperty",
        type: "string",
        defaultValue: '"id"',
        description:
          "Row identity field used for selection, row ids, and stable rendering. JSX callers may omit it because ReactDataGrid.defaultProps supplies id; the raw TypeDataGridProps contract keeps the field explicit for non-JSX integrations.",
      },
      {
        name: "columns",
        type: "TypeColumns",
        defaultValue: "required",
        description:
          "Column definitions. Every column should have a stable id or name.",
      },
      {
        name: "groups",
        type: "TypeColumnGroup[]",
        defaultValue: "[]",
        description:
          "Inovua-compatible stacked-header descriptors. A column joins a group through column.group, and a descriptor joins a parent through groups[].group.",
      },
      {
        name: "dataSource",
        type: "TypeDataSource",
        defaultValue: "required",
        description:
          "Array, promise, or function-backed data source. Local arrays apply uncontrolled default filters and local sorting; controlled filtering remains externally owned. Remote functions receive the current grid state.",
      },
      {
        name: "columnOrder",
        type: "string[]",
        defaultValue: "derived from columns",
        description:
          "Rendered order by resolved column id/name. Unknown ids are removed and current columns omitted from the array are appended.",
      },
      {
        name: "defaultColumnOrder",
        type: "string[]",
        defaultValue: "derived from columns",
        description:
          "Initial order for grid-owned ordering. Drag changes persist internally when columnOrder is omitted, with or without an onColumnOrderChange observer.",
      },
      {
        name: "onColumnOrderChange",
        type: "(columnOrder: string[]) => void",
        defaultValue: "-",
        description:
          "Receives the next user-column order after a drag. Without controlled columnOrder, the grid also persists that order internally; the synthetic checkbox id is never emitted.",
      },
      {
        name: "onColumnVisibleChange",
        type: "({ column, visible }) => void",
        defaultValue: "-",
        description:
          "Receives effective visibility proposals from the menu, toolbar, and imperative API. A declarative column.visible remains authoritative until the parent applies the proposal.",
      },
    ],
  },
  {
    id: "layout-props",
    title: "Layout and appearance",
    rows: [
      {
        name: "reorderColumns",
        type: "boolean",
        defaultValue: "true",
        description:
          "Disables drag-reordering when false. The grid still respects the provided columnOrder.",
      },
      {
        name: "allowGroupSplitOnReorder",
        type: "boolean",
        defaultValue: "true",
        description:
          "Allows leaf and group drag operations to separate siblings into multiple visual segments. When false, leaf drops stay within the same complete group path and group drops stay within the same parent.",
      },
      {
        name: "resizable",
        type: "boolean",
        defaultValue: "true",
        description:
          "Turns header drag-resize handles on or off. Mouse, pen, and touch use the same pointer lifecycle. Controlled column.width stays authoritative; uncontrolled defaultWidth can retain a drag result.",
      },
      {
        name: "columnDefaultWidth / columnMinWidth / columnMaxWidth",
        type: "number / number / number | null",
        defaultValue: "150 / 40 / null",
        description:
          "Root sizing fallbacks used only when the corresponding column-level width/defaultWidth/minWidth/maxWidth is absent.",
      },
      {
        name: "shareSpaceOnResize",
        type: "boolean",
        defaultValue: "false",
        description:
          "Resizes the adjacent visible resizable column in the opposite direction. Fixed/fixed, flex/flex, and mixed pairs preserve their total width while honoring both columns' bounds.",
      },
      {
        name: "columnResizeHandleWidth / columnResizeProxyWidth",
        type: "number / number",
        defaultValue: "24 / 5",
        description:
          "Configures the header pointer target and deferred resize-proxy geometry without consumer styling props.",
      },
      {
        name: "liveColumnResize",
        type: "boolean",
        defaultValue: "false",
        description:
          "the-datagrid extension that updates header and body column geometry while the resize pointer moves. Pointer events are coalesced to animation frames, and onColumnResize remains a single completion callback. When false, the grid keeps the Inovua-compatible resize proxy until drop.",
      },
      {
        name: "onColumnResize",
        type: "(info, context) => void",
        defaultValue: "-",
        description:
          "Reports mouse, pen, or touch resize proposals on gesture completion as { column, width, flex } plus { reservedViewportWidth }. Controlled consumers persist the proposed width by returning it through columns.",
      },
      {
        name: "onBatchColumnResize",
        type: "(entries, context) => void",
        defaultValue: "-",
        description:
          "Runs once after the per-column callbacks for a resize transaction, including shared-space, autosize, fit, and imperative batches.",
      },
      {
        name: "enableColumnAutosize",
        type: "boolean",
        defaultValue: "true",
        description:
          "Uses a deterministic first-25-row text heuristic when width/defaultWidth is absent. Double-clicking a resize handle autosizes only that column.",
      },
      {
        name: "skipHeaderOnAutoSize",
        type: "boolean",
        defaultValue: "false",
        description:
          "Removes header text from estimation. Values are estimated at about 8px per character plus padding, bounded to 90-520px before column min/max clamps.",
      },
      {
        name: "virtualized",
        type: "boolean",
        defaultValue: "true",
        description:
          "Enables TanStack row virtualization with overscan of 10. Numeric and functional heights are deterministic; natural rows are measured and remeasured when content or column widths change.",
      },
      {
        name: "virtualizeColumnsThreshold",
        type: "number",
        defaultValue: "15",
        description:
          "Enables horizontal column virtualization at an inclusive visible-column count. It applies only with a finite numeric rowHeight; functional and natural row heights keep every column mounted.",
      },
      {
        name: "virtualizeColumns",
        type: "boolean",
        defaultValue: "inferred from threshold",
        description:
          "Explicitly overrides the column-count threshold in either direction. A non-numeric rowHeight still disables column virtualization so row measurement and horizontal geometry cannot split.",
      },
      {
        name: "allowMobileTransform",
        type: "boolean",
        defaultValue: "false",
        description:
          "At widths up to 1024px, replaces the table with measured virtual cards, current-page search, single-sort tools, and a card-only hideable-column picker while preserving renderers, actions, and selection.",
      },
      {
        name: "columnUserSelect",
        type: 'true | false | "text" | "none"',
        defaultValue: "false",
        description:
          "Controls text selection behavior inside column cells and headers.",
      },
      {
        name: "showCellBorders",
        type: 'true | false | "vertical" | "horizontal"',
        defaultValue: "true",
        description:
          "Controls vertical and horizontal separators. Use horizontal to keep row separators while hiding column lines.",
      },
      {
        name: "rowHeight",
        type: "number | ((rowIndex: number) => number) | null",
        defaultValue: "40",
        description:
          "Sets one fixed height, computes a height per row, or enables content-driven measured height with null. A valid numeric height is authoritative and is not raised by minRowHeight or clamped by maxRowHeight.",
      },
      {
        name: "minRowHeight",
        type: "number",
        defaultValue: "20",
        description:
          "Minimum and initial estimate for natural rows, and the lower clamp for function-valued heights. It does not override a valid fixed numeric rowHeight.",
      },
      {
        name: "maxRowHeight",
        type: "number",
        defaultValue: "-",
        description:
          "Optional upper clamp for functional and naturally measured row heights.",
      },
      {
        name: "rowStyle",
        type: "CSSProperties | ({ data, props, style }) => CSSProperties",
        defaultValue: "-",
        description:
          "Merges a static or data-dependent style onto the rendered row. TypeColumn.style remains the separate cell-level hook.",
      },
      {
        name: "showZebraRows",
        type: "boolean",
        defaultValue: "true",
        description:
          "Shows visible odd/even row backgrounds. Set false per grid to use one row background while retaining selection and hover states.",
      },
      {
        name: "defaultShowZebraRows",
        type: "boolean",
        defaultValue: "true",
        description:
          "Initial uncontrolled zebra setting. A supplied showZebraRows value remains controlled and authoritative.",
      },
      {
        name: "headerHeight",
        type: "number",
        defaultValue: "40",
        description: "Header row height in pixels.",
      },
      {
        name: "filterRowHeight",
        type: "number",
        defaultValue: "40",
        description: "Filter row height in pixels when filtering is enabled.",
      },
      {
        name: "className",
        type: "string",
        defaultValue: "-",
        description: "Additional class name on the grid root.",
      },
      {
        name: "style",
        type: "React.CSSProperties",
        defaultValue: "-",
        description:
          "Inline styles merged onto the outer .tdg-root. Computed grid geometry remains on the inner surface; use rowStyle for row-level presentation.",
      },
      {
        name: "onFocus / onBlur",
        type: "React.FocusEventHandler<HTMLDivElement>",
        defaultValue: "-",
        description:
          "Root lifecycle handlers. They receive bubbling focus transitions at the outer .tdg-root, matching ordinary React container semantics.",
      },
      {
        name: "onKeyDown",
        type: "React.KeyboardEventHandler<HTMLDivElement>",
        defaultValue: "-",
        description:
          "Runs on keyboard events that bubble to the outer .tdg-root without replacing the grid's internal keyboard behavior.",
      },
    ],
  },
  {
    id: "filtering-props",
    title: "Filtering",
    rows: [
      {
        name: "enableFiltering",
        type: "boolean",
        defaultValue: "inferred",
        description:
          "Explicitly shows or hides the filter row. When omitted, a non-empty defaultFilterValue or filterValue shows it; an empty or missing state hides it. This prop controls visibility, not whether an uncontrolled default filter transforms local rows.",
      },
      {
        name: "filterValue",
        type: "TypeFilterValue",
        defaultValue: "-",
        description:
          "Controlled filter display state. Inovua 5.10.2 treats local data transformation as externally owned in this mode, so the grid does not reapply controlled descriptors to a local array.",
      },
      {
        name: "defaultFilterValue",
        type: "TypeFilterValue",
        defaultValue: "null",
        description:
          "Initial uncontrolled filter state. Active descriptors transform local array rows even when enableFiltering=false hides the filter row; active:false keeps an editor visible without filtering.",
      },
      {
        name: "onFilterValueChange",
        type: "(filterValue: TypeFilterValue) => void",
        defaultValue: "-",
        description: "Receives the next filter state after user edits.",
      },
      {
        name: "onColumnFilterValueChange",
        type: "(event: TypeColumnFilterValueChangeArg) => void",
        defaultValue: "-",
        description:
          "Runs before onFilterValueChange for editor, operator, activation, and single-filter clear changes. The payload contains filterValue, columnId, and visible columnIndex; filter-cell gestures also include cellProps, while imperative API calls omit it. Clear All intentionally emits only one aggregate callback.",
      },
      {
        name: "filterTypes",
        type: "TypeFilterTypes",
        defaultValue: "DEFAULT_FILTER_TYPES",
        description: "Extends or overrides the built-in operator registries.",
      },
      {
        name: "enableColumnFilterContextMenu",
        type: "boolean",
        defaultValue: "true",
        description:
          "Enables the filter-cell menu for operator selection, explicit Enable/Disable activation, Clear, and Clear All.",
      },
      {
        name: "filteredRowsCount",
        type: "(count: number) => void",
        defaultValue: "-",
        description:
          "Reports post-search/post-filter count before local pagination and deduplicates equal counts. Exception: standalone mobile-card search reports its displayed, already-loaded row count and may therefore be page-scoped.",
      },
    ],
  },
  {
    id: "sorting-props",
    title: "Sorting",
    rows: [
      {
        name: "sortInfo",
        type: "TypeSortInfo",
        defaultValue: "-",
        description: "Controlled sort state.",
      },
      {
        name: "defaultSortInfo",
        type: "TypeSortInfo",
        defaultValue: "null",
        description: "Initial uncontrolled sort state.",
      },
      {
        name: "onSortInfoChange",
        type: "(sortInfo: TypeSortInfo) => void",
        defaultValue: "-",
        description:
          "Called after sort toggles. Uncontrolled local arrays are sorted client-side; controlled and remote sources keep transformation ownership.",
      },
      {
        name: "sortable",
        type: "boolean",
        defaultValue: "true",
        description:
          "Root sorting switch. An explicit column.sortable value overrides it.",
      },
      {
        name: "allowUnsort",
        type: "boolean",
        defaultValue: "true",
        description: "Allows the sort cycle to return to unsorted state.",
      },
      {
        name: "defaultSortingDirection",
        type: '"asc" | "desc"',
        defaultValue: '"asc"',
        description:
          "Starting direction when a sortable header is first toggled.",
      },
      {
        name: "sortFunctions",
        type: "TypeSortFunctions",
        defaultValue: "{ date }",
        description:
          "Comparator registry addressed by column.type. Column sort callbacks and descriptor fn callbacks retain their Inovua argument contracts.",
      },
      {
        name: "renderSortTool",
        type: "TypeRenderSortTool",
        defaultValue: "built-in",
        description:
          "Root sort-indicator renderer. A column.renderSortTool callback takes precedence for that column.",
      },
      {
        name: "scrollTopOnSort",
        type: 'boolean | "always"',
        defaultValue: "true",
        description:
          'true resets vertical scroll for sort changes, false preserves it, and "always" also resets when the loaded row snapshot changes.',
      },
    ],
  },
  {
    id: "pagination-props",
    title: "Pagination",
    rows: [
      {
        name: "pagination",
        type: 'true | false | "remote" | "local"',
        defaultValue: "false",
        description:
          "Turns pagination on, and determines whether slicing happens locally or the remote source is expected to handle it.",
      },
      {
        name: "skip",
        type: "number",
        defaultValue: "-",
        description: "Controlled starting row index.",
      },
      {
        name: "defaultSkip",
        type: "number",
        defaultValue: "0",
        description: "Initial uncontrolled skip value.",
      },
      {
        name: "limit",
        type: "number",
        defaultValue: "-",
        description: "Controlled page size.",
      },
      {
        name: "defaultLimit",
        type: "number",
        defaultValue: "first pageSizes entry or 10",
        description: "Initial uncontrolled page size.",
      },
      {
        name: "onSkipChange",
        type: "(skip: number) => void",
        defaultValue: "-",
        description: "Receives the next page start index.",
      },
      {
        name: "onLimitChange",
        type: "(limit: number) => void",
        defaultValue: "-",
        description: "Receives the next page size.",
      },
      {
        name: "pageSizes",
        type: "number[]",
        defaultValue: "[10, 50, 100, 1000]",
        description: "Selectable page size options for the built-in pager.",
      },
      {
        name: "renderPaginationToolbar",
        type: "(props: TypePaginationProps) => ReactNode",
        defaultValue: "built-in toolbar",
        description:
          "Receives the upstream-compatible page state plus navigation, reload, refresh, skip, and limit helpers. Returning undefined uses the built-in toolbar; null suppresses it.",
      },
    ],
  },
  {
    id: "selection-props",
    title: "Selection",
    rows: [
      {
        name: "enableSelection",
        type: "boolean",
        defaultValue: "inferred",
        description:
          "Explicitly enables or disables selection. When omitted, selected, defaultSelected, or checkboxColumn enables it; onSelectionChange alone does not. false suppresses controlled visuals and makes row/checkbox/imperative selection actions no-ops.",
      },
      {
        name: "checkboxColumn",
        type: "boolean | TypeCheckboxColumn",
        defaultValue: "false",
        description:
          "Prepends the checkbox selection column. Pass an object to customize width or renderCheckbox behavior.",
      },
      {
        name: "selected",
        type: "TypeRowSelection",
        defaultValue: "-",
        description:
          "Controlled row selection state. The grid accepts both a raw selection map and the wrapper emitted by onSelectionChange for compatibility.",
      },
      {
        name: "defaultSelected",
        type: "TypeRowSelection",
        defaultValue: "{} for multiselect, null otherwise",
        description: "Initial uncontrolled selection state.",
      },
      {
        name: "unselected / defaultUnselected",
        type: "TypeBoolMap",
        defaultValue: "-",
        description:
          "Controlled or uncontrolled exclusions used while selected is true.",
      },
      {
        name: "onSelectionChange",
        type: "(config: TypeOnSelectionChangeArg) => void",
        defaultValue: "-",
        description:
          "Observes enabled selection but does not enable it by itself. Emissions contain selected and originalData; UI actions also include the relevant row(s) in data. selected=true toggles emit unselected exclusions. Direct React setter wiring is supported.",
      },
      {
        name: "multiSelect",
        type: "boolean",
        defaultValue: "inferred",
        description:
          "Enables multi-row semantics. When omitted, object/boolean selected or defaultSelected values and an uncontrolled checkboxColumn infer true; otherwise it is false.",
      },
      {
        name: "checkboxOnlyRowSelect",
        type: "boolean",
        defaultValue: "false",
        description:
          "Prevents plain row clicks from toggling selection when true.",
      },
      {
        name: "checkboxSelectEnableShiftKey",
        type: "boolean",
        defaultValue: "false",
        description:
          "Allows shift-range selection through the checkbox column.",
      },
      {
        name: "toggleRowSelectOnClick",
        type: "boolean",
        defaultValue: "false",
        description:
          "Makes an unmodified click on the sole selected row toggle it off.",
      },
      {
        name: "activeIndex / defaultActiveIndex",
        type: "number",
        defaultValue: "-1",
        description:
          "Controlled or uncontrolled active-row index used by focus and keyboard navigation.",
      },
      {
        name: "enableKeyboardNavigation",
        type: "boolean",
        defaultValue: "true",
        description:
          "Enables Arrow, Home, End, Page, Enter, and optional Tab row navigation.",
      },
      {
        name: "activateRowOnFocus / keyPageStep",
        type: "boolean / number",
        defaultValue: "true / 10",
        description:
          "Restores an active row when focus enters and controls Page Up/Down distance.",
      },
      {
        name: "row focus styling",
        type: "class-name hooks",
        defaultValue: "active indicator on",
        description:
          "focusedClassName, rowFocusClassName, showActiveRowIndicator, and activeRowIndicatorClassName expose focus styling hooks.",
      },
      {
        name: "disabledRows",
        type: "{ [displayedIndex: string]: boolean } | null",
        defaultValue: "-",
        description:
          "Disables pointer interaction and applies 50% opacity at truthy zero-based indexes in the current sorted, filtered, page-local view. Keys are not row IDs. Controlled, header, and imperative selection continue to include these rows. Callback metadata preserves null for an absent map, undefined for a missing key, and explicit false/true entries.",
      },
    ],
  },
  {
    id: "editing-props",
    title: "Inline editing",
    rows: [
      {
        name: "editable",
        type: "boolean",
        defaultValue: "false",
        description:
          "Enables default editing for columns without an explicit editable override. column.editable=false always opts out.",
      },
      {
        name: "editStartEvent",
        type: "string",
        defaultValue: '"dblclick"',
        description:
          "Selects double-click or compatible click activation. Supported aliases follow the Inovua click/double-click forms.",
      },
      {
        name: "onEditStart",
        type: "(info: TypeEditInfo) => void",
        defaultValue: "-",
        description:
          "Runs after editability resolves and reports the initial value plus stable row/column identity.",
      },
      {
        name: "onEditValueChange",
        type: "(info: TypeEditInfo) => void",
        defaultValue: "-",
        description: "Reports draft values while the editor remains active.",
      },
      {
        name: "onEditStop",
        type: "(info: TypeEditInfo) => void",
        defaultValue: "-",
        description:
          "Runs before either completion or cancellation with the current draft value.",
      },
      {
        name: "onEditComplete",
        type: "(info: TypeEditInfo) => void | Promise<unknown>",
        defaultValue: "-",
        description:
          "Runs after the editor stops and reports the accepted value. Active editing is anchored to the visible row/column coordinate, so a controlled row or column reorder updates payload identity without discarding the draft. Navigation waits for fulfillment and is suppressed on rejection; the application remains responsible for persisting data.",
      },
      {
        name: "onEditCancel",
        type: "(info: TypeEditInfo) => void",
        defaultValue: "-",
        description:
          "Reports Escape cancellation after onEditStop without committing the draft.",
      },
    ],
  },
  {
    id: "misc-props",
    title: "Imperative hooks and miscellaneous props",
    rows: [
      {
        name: "loading",
        type: "boolean",
        defaultValue: "internal async state",
        description:
          "Overrides the loading state shown while async data is resolving.",
      },
      {
        name: "loadingText",
        type: "ReactNode | (() => ReactNode)",
        defaultValue: '"Loading"',
        description: "Content used by the built-in and custom loading mask.",
      },
      {
        name: "renderLoadMask",
        type: "(props: TypeLoadMaskProps) => ReactNode | null",
        defaultValue: "built-in mask",
        description:
          "Receives visible, livePagination, loadingText, zIndex, and theme. Returning undefined uses the built-in mask; null suppresses it.",
      },
      {
        name: "onLoadingChange",
        type: "(loading: boolean) => void",
        defaultValue: "-",
        description:
          "Behavior-backed extension fired once for each effective automatic or controlled loading transition.",
      },
      {
        name: "i18n",
        type: "TypeI18n",
        defaultValue: "built-in fallbacks",
        description:
          "Overrides UI strings such as noRecords, clear, sort labels, and column menu text.",
      },
      {
        name: "emptyText",
        type: "ReactNode | (() => ReactNode)",
        defaultValue: '"noRecords"',
        description:
          "Renders the empty view after local filtering or remote resolution and in transformed mobile lists. Strings resolve as i18n keys first; nodes and zero-argument functions are preserved. null, false, or an empty string suppresses the content, and loading always hides it.",
      },
      {
        name: "showColumnMenuTool",
        type: "boolean",
        defaultValue: "true",
        description: "Shows the header menu trigger for per-column actions.",
      },
      {
        name: "onDidMount",
        type: "(apiRef) => void",
        defaultValue: "-",
        description:
          "Runs from the passive mount effect after the stable MutableRefObject has been hydrated, before handle and onReady. It does not repeat for grid updates or async data resolution; a real remount receives a new ref. React StrictMode can replay the mount effect in development, matching React and Inovua behavior.",
      },
      {
        name: "onReady",
        type: "(apiRef) => void",
        defaultValue: "-",
        description:
          "Receives the hydrated stable MutableRefObject after onDidMount; its TypeComputedProps target is refreshed in place as grid state changes.",
      },
      {
        name: "handle",
        type: "(apiRef) => void",
        defaultValue: "-",
        description:
          "Receives the same stable ref after onDidMount and before onReady. It is retained as a compatibility lifecycle hook rather than an alias with different timing.",
      },
    ],
  },
  {
    id: "runtime-defaults",
    title: "ReactDataGrid.defaultProps",
    body: (
      <div className="space-y-4 text-sm text-muted-foreground">
        <p>
          The component exposes its runtime defaults through the static{" "}
          <code>ReactDataGrid.defaultProps</code> compatibility object. It
          includes the defaults documented above for theme, filtering,
          autosizing, resizing, virtualization, mobile transform, selection,
          borders, column menu visibility, and row/header/filter heights.
        </p>
        <p>
          <code>defaultProps.filterTypes</code> is the built-in registry, so
          existing integrations can extend it with an object spread or{" "}
          <code>Object.assign</code>. Treat the object as a source of defaults;
          pass overrides through component props instead of mutating the shared
          registry in place.
        </p>
      </div>
    ),
  },
];

function createInovuaStatusPage(): DocsPage {
  return {
    group: "migration",
    slug: "inovua-status",
    title: "Inovua implementation status",
    summary:
      "The evidence-backed Community 5.10.2 release ledger and regression boundary.",
    description:
      "Issue 17 and Issue 31–45 are backed by executable type, runtime, browser, packed-package, and performance evidence.",
    tags: ["Migration", "Inovua", "Parity status"],
    sections: [
      {
        id: "current-status",
        title: "How to read this status",
        body: (
          <div className="space-y-4 text-sm text-muted-foreground">
            <Callout title="Community release gate complete">
              <p>
                The audited Community 5.10.2 surface is implemented. Unknown
                computed methods are absent, and every published plugin
                descriptor is executable.
              </p>
            </Callout>
            <p>
              This ledger covers Issue 17 and every Community child issue from
              Issue 31 through Issue 45. Enterprise-only features remain
              explicitly outside the Community baseline.
            </p>
            <p>
              The matching{" "}
              <a
                href="https://github.com/geo-vi/the-datagrid/blob/main/tests/playwright/inovua-parity.spec.ts"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-foreground underline underline-offset-4"
              >
                executable parity specifications
              </a>{" "}
              are permanent green regression coverage. Packed consumers also
              verify ESM, CommonJS, NodeNext, Node10, module, type, CSS, and
              license paths.
            </p>
          </div>
        ),
      },
      {
        id: "implemented-today",
        title: "Implemented today",
        body: (
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              The current package already ships local, Promise, and function
              data sources; composed search/filter/sort/pagination; column
              rendering, ordering, controlled/uncontrolled and flex sizing,
              resize reporting, selection, fixed/functional/natural row
              virtualization, zebra rows, whole-row styling, inline editing,
              transformed-mobile cards, optional table search, theme/i18n
              support, and a substantial imperative API subset.
            </p>
            <p>
              The source-backed{" "}
              <DocsRouteLink
                group="reference"
                slug="implemented-surface"
                className="font-medium text-foreground underline underline-offset-4"
              >
                implemented-surface reference
              </DocsRouteLink>{" "}
              records exact exports, defaults, timing, transform order,
              interaction rules, and method allowlists. It is deliberately
              separate from this gap ledger so “works today” is never confused
              with “verified as Inovua-compatible.”
            </p>
          </div>
        ),
      },
      {
        id: "known-gaps",
        title: "Audited compatibility ledger",
        body: <CompatibilityTable rows={inovuaCompatibilityRows} />,
      },
      {
        id: "dynamic-row-height",
        title: "Dynamic and natural row height",
        body: (
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              <strong className="text-foreground">Upstream contract.</strong>{" "}
              <code>rowHeight</code> accepts a number, a per-row function, or{" "}
              <code>null</code>. <code>{"rowHeight={null}"}</code> enables
              content-driven height; <code>minRowHeight</code> supplies a
              minimum and a virtualization estimate. Rendered heights are
              measured and offsets are updated.
            </p>
            <p>
              <strong className="text-foreground">Current behavior.</strong>{" "}
              the-datagrid now accepts numeric, functional, and{" "}
              <code>null</code> row heights. Natural rows are registered for
              element measurement;
              <code>minRowHeight</code> supplies the floor/estimate and
              <code>maxRowHeight</code> can bound the result.
            </p>
            <p>
              <strong className="text-foreground">Verified behavior.</strong>{" "}
              The parity suite checks natural DOM height against the virtual row
              model, deterministic per-row function heights, minimum bounds, and
              automatic offset repair after a column-width change rewraps text.
            </p>
            <p>
              <strong className="text-foreground">Scope.</strong> This verifies
              the Community row-height forms exercised by Issue 17. It is not a
              blanket claim about unrelated row-detail, grouping, or Enterprise
              layout features.
            </p>
          </div>
        ),
      },
      {
        id: "column-sizing-and-resize",
        title: "Column sizing and resize lifecycle",
        body: (
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              <strong className="text-foreground">Resize callback.</strong>{" "}
              Inovua reports{" "}
              <code>
                onColumnResize({"{ column, width, flex }"},{" "}
                {"{ reservedViewportWidth }"})
              </code>
              . The callback is the persistence path for controlled widths and
              can also notify consumers that wrapped content changed. The grid
              now emits the callback when a drag is committed on pointer
              release, and when autosize or the computed resize API commits a
              size, with both arguments.
            </p>
            <p>
              <strong className="text-foreground">Controlled semantics.</strong>{" "}
              Inovua treats <code>width</code>/<code>flex</code> as controlled
              and <code>defaultWidth</code>/<code>defaultFlex</code> as
              uncontrolled initial values. Dragging a controlled width must have
              no lasting effect until the consumer returns a new width through
              props, and later prop changes must render immediately. The current
              controlled path keeps <code>column.width</code> authoritative;
              <code>defaultWidth</code> owns the uncontrolled starting value.
              The default Inovua no-share behavior converts a resized{" "}
              <code>defaultFlex</code> column to a fixed width; any remaining
              flex columns are reported with flex payloads in the same commit.
            </p>
            <p>
              <strong className="text-foreground">
                Live preview extension.
              </strong>{" "}
              Inovua Community uses a resize proxy and commits on release.
              the-datagrid preserves that behavior by default and adds the
              opt-in <code>liveColumnResize</code> prop. Live mode updates the
              matching header/body column and table geometry at most once per
              animation frame without rerendering the row model for every
              pointer event. <code>onColumnResize</code> remains
              completion-only, cancellation restores the original geometry, and
              a controlled width returns to its prop value unless the consumer
              applies the proposal.
            </p>
            <p>
              <strong className="text-foreground">Flex allocation.</strong>{" "}
              Inovua uses <code>flex</code> and <code>defaultFlex</code> to
              distribute remaining viewport width by weight: subject to min/max
              clamps, a flex-2 column receives about twice the space of flex-1.
              the-datagrid now performs that weighted allocation for controlled
              <code>flex</code> and uncontrolled <code>defaultFlex</code>. The
              implicit minimum is the upstream 40px; an explicit{" "}
              <code>{"minWidth={0}"}</code> remains zero, and the absent maximum
              remains unbounded.
            </p>
            <p>
              <strong className="text-foreground">Verified behavior.</strong>{" "}
              Focused tests cover the resize payload, controlled-width
              authority, live header/body geometry, burst coalescing and
              cleanup, proportional flex allocation, and natural-row
              remeasurement after width changes.
            </p>
            <p>
              Controlled applications must still update their column definition
              from <code>onColumnResize</code> when they want the proposed width
              to persist; the grid deliberately does not mutate consumer state.
            </p>
          </div>
        ),
      },
      {
        id: "zebra-rows",
        title: "Zebra row defaults and toggle",
        body: (
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              Inovua visibly stripes alternating rows by default and supports{" "}
              <code>{"showZebraRows={false}"}</code> per grid. the-datagrid now
              provides the same visible default and per-grid toggle while
              retaining odd/even classes and theme tokens.
            </p>
            <p>
              Custom themes can assign different values to{" "}
              <code>--tdg-row-odd-bg</code> and <code>--tdg-row-even-bg</code>.
              Giving them the same value suppresses visible stripes for that
              theme; the prop remains the semantic per-grid control.
            </p>
          </div>
        ),
      },
      {
        id: "inline-editing",
        title: "Inline editing lifecycle",
        body: (
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              Inovua Community editing is a complete interaction subsystem: root{" "}
              <code>editable</code> and <code>editStartEvent</code>; column{" "}
              <code>editable</code>, <code>editor</code>, and{" "}
              <code>renderEditor</code>; and <code>onEditStart</code>,{" "}
              <code>onEditValueChange</code>, <code>onEditStop</code>,{" "}
              <code>onEditComplete</code>, and <code>onEditCancel</code>. The
              default start gesture is double-click, with click available by{" "}
              <code>editStartEvent</code>. <code>column.editable=false</code>
              blocks editing, and column editability may resolve synchronously
              or asynchronously.
            </p>
            <p>
              The observable lifecycle is start, zero or more value changes,
              stop, then complete or cancel. Callback payloads identify at least{" "}
              <code>rowId</code>, <code>rowIndex</code>, <code>columnId</code>,{" "}
              <code>columnIndex</code>, and <code>value</code>. Enter completes
              and restores/navigates focus; Escape restores the original value
              without completion; Tab and Shift+Tab complete and move between
              editable cells.
            </p>
            <p>
              the-datagrid now implements that cell-editing state machine,
              including default and custom editors, click/double-click
              activation, sync/async column editability, ordered lifecycle
              callbacks, cancellation, focus restoration, and keyboard
              traversal. A falsy or rejected async editability result refuses
              the edit, and a late result from an older attempt cannot open or
              replace a newer editor.
            </p>
            <p>
              Completion reports the draft but does not mutate application data;
              persist it in <code>onEditComplete</code>. The editor stops before
              that callback runs. Navigation waits for fulfillment, while a
              rejection leaves the editor stopped and suppresses navigation.
              Session identity prevents an older pending completion from
              clearing or navigating a newer edit. In the published 5.10.2
              types, root <code>editable</code> is boolean; conditional or async
              decisions belong on <code>column.editable</code>.
            </p>
            <p>
              Custom editors receive column <code>editorProps</code> both at the
              top level and in a nested <code>editorProps</code> object, plus{" "}
              <code>nativeScroll</code>, <code>cell</code>,{" "}
              <code>cellProps</code>, value/theme/focus metadata, completion and
              cancellation handlers, and next/previous navigation helpers.{" "}
              <code>renderEditor</code> is called as{" "}
              <code>(editorProps, cellProps, cell)</code>. The navigation
              handlers accept <code>(complete, direction)</code>;{" "}
              <code>complete=false</code> means stop and navigate without
              complete or cancel.
            </p>
            <p>
              Pointer and imperative edit starts evaluate{" "}
              <code>column.editable</code> with the same Inovua-shaped{" "}
              <code>CellProps</code>. The object includes the raw string or
              numeric row ID, local/render/remote row indices, column aliases
              and computed indices/width, selection and row-height metadata,
              theme, native-scroll state, and nested cell props.
            </p>
            <p>
              Programmatic <code>startEdit</code>/<code>tryStartEdit</code>{" "}
              replace an active editor without completing, cancelling, or
              stopping the former cell. Their deferred dispatch resolves the
              live row, column, value, and cell metadata rather than a stale
              call-time snapshot. The built-in editor derives an accessible name
              from the primitive column header, then its name/ID.
            </p>
            <p>
              The published 5.10.2 <code>TypeEditInfo</code> declaration labels
              <code>rowId</code> as <code>string</code>, even though the runtime
              preserves numeric IDs. Our compatibility declaration deliberately
              uses <code>any</code>: existing handlers written against the
              declared string contract continue to type-check, while numeric-ID
              applications also match the observable runtime.
            </p>
            <p>
              The stable <code>TypeComputedProps</code> ref also implements{" "}
              <code>startEdit</code>, <code>tryStartEdit</code>,{" "}
              <code>completeEdit</code>, <code>cancelEdit</code>,{" "}
              <code>getCurrentEditInfo</code>, <code>isInEdit</code>, and{" "}
              <code>currentEditCompletePromise</code>. The mobile card transform
              is disabled when either root or visible column-level editing is
              enabled so it cannot replace the editable table surface.
            </p>
          </div>
        ),
      },
      {
        id: "row-style",
        title: "Data-dependent whole-row styling",
        body: (
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              Inovua <code>rowStyle</code> accepts either an object or a
              function shaped like{" "}
              <code>{"({ data, props, style }) => style"}</code>, then merges
              the result onto the row. This supports styling based on row data
              and state.
            </p>
            <p>
              the-datagrid now evaluates the object or function once per row and
              merges the result onto the row element. <code>props</code>{" "}
              includes the available Inovua row metadata: local/remote indexes,
              selection and parity state, computed columns and widths,
              row-height state, totals, editing state, and theme. Unsupported
              grouping data is not fabricated. Locking metadata reflects the
              live declarative start, unlocked, and end sections, including
              their indexes, presence flags, and logical allocated widths.{" "}
              <code>TypeColumn.style</code> remains a separate cell-level API.
            </p>
            <p>
              The callback receives the live base style with Inovua-shaped{" "}
              <code>height</code>, <code>width</code>, <code>minWidth</code>,
              and <code>direction</code>. It may mutate that object and return{" "}
              <code>undefined</code>, or return an object to merge. Row IDs keep
              their original string/number type, and <code>remoteRowIndex</code>{" "}
              includes the current pagination offset while <code>rowIndex</code>{" "}
              remains page-local.
            </p>
            <p>
              Focused coverage verifies that two rows can receive different
              data-dependent styles and that the style is present on the row,
              not repeated as a cell substitute.
            </p>
          </div>
        ),
      },
      {
        id: "text-input-boundary",
        title: "Standalone TextInput compatibility",
        body: (
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              Issue 48 explicitly adopts Inovua&apos;s standalone toolkit input
              as part of the migration surface. The compatible path is the
              legacy default import{" "}
              <code>@geovi/the-datagrid/packages/TextInput</code>; a named root
              export is also available for discoverability.
            </p>
            <p>
              Compatibility includes controlled and uncontrolled values,
              value-first change callbacks, nested input-callback ordering,
              stopped change propagation by default, the clear tool, and the
              class-instance <code>focus()</code> and <code>setValue()</code>{" "}
              methods. The public clear renderer keeps its original config shape
              and remains subclassable. The legacy BEM hooks remain available
              while the shipped visual treatment uses the library&apos;s
              shadcn-compatible tokens.
            </p>
          </div>
        ),
      },
      {
        id: "source-baseline",
        title: "Primary behavior sources",
        body: (
          <ul className="list-disc space-y-3 pl-5 text-sm text-muted-foreground">
            <li>
              <a
                href="https://www.npmjs.com/package/@inovua/reactdatagrid-community/v/5.10.2"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-foreground underline underline-offset-4"
              >
                Published Community package 5.10.2
              </a>{" "}
              — package baseline and feature list.
            </li>
            <li>
              <a
                href="https://web.archive.org/web/20230321010140/https://reactdatagrid.io/docs/performance-and-virtualization"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-foreground underline underline-offset-4"
              >
                Archived performance and virtualization documentation
              </a>{" "}
              — natural/dynamic row-height behavior.
            </li>
            <li>
              <a
                href="https://web.archive.org/web/20230527235917/https://reactdatagrid.io/docs/customizing-cells-rows-headers"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-foreground underline underline-offset-4"
              >
                Archived cell, row, and header customization documentation
              </a>{" "}
              — zebra defaults and rowStyle.
            </li>
            <li>
              <a
                href="https://web.archive.org/web/20230528010546/https://reactdatagrid.io/docs/inline-edit"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-foreground underline underline-offset-4"
              >
                Archived inline-editing documentation
              </a>{" "}
              — activation, editors, lifecycle callbacks, and keyboard behavior.
            </li>
            <li>
              <a
                href="https://web.archive.org/web/20230928052216/https://reactdatagrid.io/docs/#defining-columns"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-foreground underline underline-offset-4"
              >
                Archived defining-columns and sizing documentation
              </a>{" "}
              — width/defaultWidth and flex/defaultFlex semantics.
            </li>
            <li>
              <a
                href="https://github.com/geo-vi/the-datagrid/issues/17#issuecomment-4958673318"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-foreground underline underline-offset-4"
              >
                Issue 17 compatibility analysis
              </a>{" "}
              — the technical audit behind this ledger.
            </li>
          </ul>
        ),
      },
      {
        id: "decision-history",
        title: "Decision history",
        body: (
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              An earlier implementation in{" "}
              <a
                href="https://github.com/geo-vi/the-datagrid/commit/ef4cbd9bc5b19f6a6b21109fc13aec614eb69708"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-foreground underline underline-offset-4"
              >
                commit ef4cbd9
              </a>{" "}
              mapped <code>rowStyle</code> to column styles,{" "}
              <code>onColumnResize</code> to width fields,{" "}
              <code>showZebraRows</code> to theme tokens, and{" "}
              <code>minRowHeight</code> to fixed <code>rowHeight</code>.
            </p>
            <p>
              The policy correctly recorded those mappings as non-equivalent.
              This compatibility batch replaces the substitutions with the
              actual public props and observable behavior.
            </p>
            <p>
              The associated Issue 17 example and E2E coverage were later
              removed in{" "}
              <a
                href="https://github.com/geo-vi/the-datagrid/commit/ff54963894c8a832975214c48ebab91a7d5ee233"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-foreground underline underline-offset-4"
              >
                commit ff54963
              </a>
              . The restored parity specifications now act as green regression
              coverage for this implemented batch.
            </p>
          </div>
        ),
      },
    ],
  };
}

const columnSections: ReferenceSection[] = [
  {
    id: "compatibility-status",
    title: "Compatibility status",
    body: (
      <Callout
        title="Accepted fields are not automatically behaviorally compatible"
        tone="warning"
      >
        <p>
          This page describes the current <code>IColumn</code> type and its
          implemented behavior. Controlled <code>width</code>/<code>flex</code>,
          uncontrolled <code>defaultWidth</code>/<code>defaultFlex</code>, and
          column editing fields are active runtime contracts, not reserved
          names.
        </p>
        <p>
          <code>TypeColumn.style</code> intentionally remains cell-level; use
          the separate root <code>rowStyle</code> prop for whole-row
          presentation. See the{" "}
          <DocsRouteLink
            group="migration"
            slug="inovua-status"
            className="font-medium text-foreground underline underline-offset-4"
          >
            Inovua parity ledger
          </DocsRouteLink>{" "}
          for the broader compatibility audit and remaining unverified areas.
        </p>
        <p>
          <code>column.locked</code> is an implemented, Enterprise-derived
          extension rather than part of the Inovua Community 5.10.2 parity gate.
          It supports declarative <code>true</code>,{" "}
          <code>&quot;start&quot;</code>, <code>&quot;end&quot;</code>, and{" "}
          <code>false</code>. It does not currently implement{" "}
          <code>defaultLocked</code>, <code>lockable</code>,{" "}
          <code>autoLock</code>, <code>onColumnLockedChange</code>,{" "}
          <code>showColumnMenuLockOptions</code>, <code>setColumnLocked</code>,
          lock/unlock menu actions, cross-section lock changes through dragging,
          or RTL edge mirroring.
        </p>
      </Callout>
    ),
  },
  {
    id: "identity-fields",
    title: "Identity and rendering",
    rows: [
      {
        name: "name",
        type: "string",
        defaultValue: "-",
        description: "Primary column identifier and default accessor key.",
      },
      {
        name: "id",
        type: "string",
        defaultValue: "-",
        description:
          "Explicit stable identifier. Prefer setting this when you need an id that differs from the accessor key.",
      },
      {
        name: "group",
        type: "string",
        defaultValue: "-",
        description:
          "Name of the leaf TypeColumnGroup descriptor used to build stacked and nested header rows.",
      },
      {
        name: "header",
        type: "ReactNode",
        defaultValue: "column name or id",
        description: "Header label or custom header node.",
      },
      {
        name: "renderHeader",
        type: "(cellProps) => ReactNode",
        defaultValue: "-",
        description:
          "Custom header renderer. Receives the column and columnId in the current runtime.",
      },
      {
        name: "render",
        type: "((cellProps) => ReactNode) | ((value, args) => ReactNode)",
        defaultValue: "-",
        description:
          "Cell renderer. The one-argument form receives { value, data, rowIndex, column, columnId, cellProps }; the legacy two-argument render(value, args) form is also supported.",
      },
      {
        name: "cellProps (runtime field)",
        type: "Record<string, unknown>",
        defaultValue: "-",
        description:
          "Merged into the cellProps object passed to the one-argument renderer. The runtime recognizes this through IColumn's open index signature, but it is not yet an explicit named IColumn field.",
      },
      {
        name: "dateFormat (runtime field)",
        type: "string",
        defaultValue: "-",
        description:
          "Passed through cellProps and used while parsing date/time filters. It currently relies on IColumn's open index signature rather than an explicit named field.",
      },
    ],
  },
  {
    id: "editing-fields",
    title: "Editing",
    rows: [
      {
        name: "editable",
        type: "boolean | ((value, cellProps) => boolean | Promise<boolean>)",
        defaultValue: "root editable",
        description:
          "Overrides root editing for this column. false always blocks editing; a function may make a synchronous or asynchronous decision.",
      },
      {
        name: "editor",
        type: "ElementType<TypeColumnEditorProps> | ReactElement",
        defaultValue: "default text editor",
        description:
          "Custom component type or element receiving value, theme/focus metadata, cell/cellProps, custom props, and change/complete/cancel/navigation callbacks.",
      },
      {
        name: "editorProps",
        type: "Record<string, unknown>",
        defaultValue: "-",
        description:
          "Additional props exposed both at the custom editor's top level and through its nested editorProps object. Grid-owned lifecycle values override conflicting top-level entries.",
      },
      {
        name: "renderEditor",
        type: "(editorProps, cellProps, cell) => ReactNode",
        defaultValue: "-",
        description:
          "Render-function alternative receiving the complete editor props, cell props, and compatibility cell instance. The editor field takes precedence when both are supplied.",
      },
    ],
  },
  {
    id: "sizing-fields",
    title: "Sizing",
    rows: [
      {
        name: "width",
        type: "number",
        defaultValue: "-",
        description:
          "Controlled consumer width. Dragging proposes a new value through onColumnResize; it persists only when the consumer returns it.",
      },
      {
        name: "defaultWidth",
        type: "number",
        defaultValue: "-",
        description:
          "Starting width for uncontrolled sizing; the grid may retain later drag changes internally.",
      },
      {
        name: "minWidth",
        type: "number",
        defaultValue: "40",
        description:
          "Lower clamp for autosize and manual resize. An explicit minWidth, including 0, remains authoritative.",
      },
      {
        name: "maxWidth",
        type: "number",
        defaultValue: "unbounded",
        description:
          "Optional upper clamp for autosize and manual resize; no implicit maximum is applied.",
      },
      {
        name: "flex",
        type: "number | null",
        defaultValue: "-",
        description:
          "Controlled weight for proportional remaining-space allocation, subject to min/max clamps.",
      },
      {
        name: "defaultFlex",
        type: "number | null",
        defaultValue: "-",
        description:
          "Uncontrolled initial flex weight used when a controlled flex value is absent.",
      },
    ],
  },
  {
    id: "visibility-fields",
    title: "Visibility and interaction",
    rows: [
      {
        name: "visible",
        type: "boolean",
        defaultValue: "true",
        description: "Controls whether the column is rendered.",
      },
      {
        name: "defaultVisible",
        type: "boolean",
        defaultValue: "-",
        description:
          "Seeds grid-owned visibility when false. A live visible value or an imperative visibility override takes precedence.",
      },
      {
        name: "defaultHidden",
        type: "boolean",
        defaultValue: "-",
        description:
          "Project alias that seeds grid-owned visibility when true. A live visible value or an imperative visibility override takes precedence.",
      },
      {
        name: "hideable",
        type: "boolean",
        defaultValue: "true",
        description:
          "Prevents hiding from the transformed-mobile column picker. The current desktop UI has no equivalent visibility picker.",
      },
      {
        name: "draggable",
        type: "boolean",
        defaultValue: "true",
        description: "Marks whether the column may be reordered.",
      },
      {
        name: "resizable",
        type: "boolean",
        defaultValue: "true",
        description: "Per-column resize opt-out.",
      },
      {
        name: "locked",
        type: 'true | "start" | "end" | false',
        defaultValue: "false",
        description:
          'Keeps the column mounted and sticky at the horizontal start or end edge; true aliases "start". Relative order is preserved inside each locked/unlocked section. Cross-section drops are rejected. This Enterprise-derived extension does not yet include defaultLocked, lockable, autoLock, onColumnLockedChange, showColumnMenuLockOptions, setColumnLocked, lock-menu actions, or RTL mirroring.',
      },
    ],
  },
  {
    id: "sorting-filtering-fields",
    title: "Sorting, filtering, and search",
    rows: [
      {
        name: "sortable",
        type: "boolean",
        defaultValue: "true",
        description: "Turns header sorting on or off for this column.",
      },
      {
        name: "sortName",
        type: "string",
        defaultValue: "-",
        description:
          "Alternate key stored in sortInfo and sent remotely. Local sorting maps it back to this column's resolved data field.",
      },
      {
        name: "type",
        type: "string",
        defaultValue: '"string"',
        description:
          "Selects a comparator from sortFunctions for local sorting; built-in number, date, and string behavior is available.",
      },
      {
        name: "sort",
        type: "TypeColumnSort",
        defaultValue: "-",
        description:
          "Column comparator called with value1, value2, column, data1, data2, and the effective sortInfo descriptor. Id-only columns receive whole rows as their values.",
      },
      {
        name: "renderSortTool",
        type: "TypeRenderSortTool",
        defaultValue: "root renderer",
        description:
          "Per-column sort-indicator renderer; takes precedence over the root renderSortTool.",
      },
      {
        name: "filterable",
        type: "boolean",
        defaultValue: "inferred",
        description:
          "When the filter row is visible, every non-checkbox column gets its structural cell unless filterable is false. An explicit filter descriptor is still required to render the built-in or custom editor; filterable: true and filterEditor do not invent filter state.",
      },
      {
        name: "filterType",
        type: "string",
        defaultValue: '"string"',
        description:
          "Filter type registry key, such as string, number, bool, select, or date/time-oriented custom types.",
      },
      {
        name: "filterName",
        type: "string",
        defaultValue: "-",
        description:
          "Alternate filter field. Local evaluation and remote data-source descriptors project through id/name to this alias.",
      },
      {
        name: "getFilterValue",
        type: "({ data, value }) => unknown",
        defaultValue: "-",
        description:
          "Derives the local value tested by filter operators and is attached to projected remote filter descriptors.",
      },
      {
        name: "filterEditor",
        type: "ComponentType<Record<string, unknown>>",
        defaultValue: "-",
        description: "Custom filter editor component.",
      },
      {
        name: "filterEditorProps",
        type: "object | ((columnContext, indexContext) => object)",
        defaultValue: "-",
        description:
          "Static props are merged into the editor. Function values are passed through so range editors can resolve each input with the complete editor contract and { index, value } metadata.",
      },
      {
        name: "filterDelay",
        type: "boolean | number",
        defaultValue: "250",
        description:
          "Per-column aggregate filter debounce in milliseconds. false or 0 commits immediately.",
      },
      {
        name: "filterCellPadding",
        type: "React.CSSProperties['padding']",
        defaultValue: '"0 0.25rem"',
        description:
          "Column-level padding for the filter cell, useful for compact filter controls.",
      },
      {
        name: "searchable",
        type: "boolean",
        defaultValue: "true",
        description:
          "Excludes the column from optional global search when set to false.",
      },
      {
        name: "searchAliases",
        type: "readonly string[]",
        defaultValue: "[]",
        description:
          "Adds exact normalized aliases for column-scoped queries such as location:paris.",
      },
      {
        name: "searchValue",
        type: "(row) => unknown",
        defaultValue: "row[column id/name]",
        description:
          "Supplies the raw value indexed for this column when nested data or a derived value should be searchable.",
      },
    ],
  },
  {
    id: "alignment-style-fields",
    title: "Alignment and styling",
    rows: [
      {
        name: "textAlign",
        type: '"start" | "end" | "left" | "right" | "center"',
        defaultValue: '"start"',
        description: "Body cell alignment.",
      },
      {
        name: "headerAlign",
        type: '"start" | "end" | "left" | "right" | "center"',
        defaultValue: '"start"',
        description: "Header alignment.",
      },
      {
        name: "className",
        type: "string",
        defaultValue: "-",
        description: "Additional cell class name.",
      },
      {
        name: "style",
        type: "unknown",
        defaultValue: "-",
        description:
          "Inline style object applied to cells. Use the root rowStyle object/function for whole-row styling.",
      },
      {
        name: "headerProps",
        type: "{ className?: string; style?: React.CSSProperties }",
        defaultValue: "-",
        description: "Extra header-level class and style overrides.",
      },
    ],
  },
];

const computedPropsRows: ReferenceRow[] = [
  {
    name: "Lifecycle",
    type: "onDidMount",
    defaultValue: "passive mount effect",
    description:
      "Receives the hydrated MutableRefObject<TypeComputedProps | null> before the currently implemented handle/onReady notifications. It follows React's passive mount-effect semantics, including StrictMode development replay; ordinary grid updates do not retrigger it. The ref target refreshes in place and exposes initialProps/publicAPI, so retain the ref rather than a state snapshot.",
  },
  {
    name: "Existing lifecycle adapters",
    type: "handle / onReady",
    defaultValue: "once when present",
    description:
      "Both currently receive the same stable ref after onDidMount. Issue 48 certifies onDidMount only: Inovua's handle identity cleanup and onReady nonzero-width gate remain a separately recorded compatibility gap.",
  },
  {
    name: "Data and loading",
    type: "methods and fields",
    defaultValue: "implemented",
    description:
      "reload, getData, getCount, isLoading, and setLoading, plus data, originalData, count, and dataCountAfterFilter. An explicit loading prop still wins over the imperative override.",
  },
  {
    name: "Pagination",
    type: "methods and fields",
    defaultValue: "implemented",
    description:
      "getSkip, setSkip, getLimit, setLimit, computedSkip, and computedLimit. setLimit resets skip; loadNextPage exists only while another page is available.",
  },
  {
    name: "Sorting",
    type: "methods and fields",
    defaultValue: "implemented",
    description:
      "getSortInfo, setSortInfo, toggleColumnSort, setColumnSortInfo, unsortColumn, and computedSortInfo. Imperative sort changes reset skip to zero.",
  },
  {
    name: "Filtering",
    type: "methods and fields",
    defaultValue: "implemented",
    description:
      "get/setFilterValue, clearAllFilters, clear/get/setColumnFilter, isColumnFiltered, computedFilterValue/map, and computedOnColumnFilterValueChange. Column setters accept an optional operator, emit the per-column callback before aggregate state, omit filter-cell-only cellProps, and reset skip to zero.",
  },
  {
    name: "Columns and visibility",
    type: "methods and fields",
    defaultValue: "implemented",
    description:
      "get/setColumnOrder, getColumnsInOrder, getColumnBy, is/setColumnVisible, columns maps, all/visible columns, visibility map, computed widths, and aggregate layout fields. Ordering and visibility use the same controlled/default ownership and callbacks as the rendered menu.",
  },
  {
    name: "Column sizing",
    type: "methods and fields",
    defaultValue: "implemented",
    description:
      "columnSizes/columnFlexes, setColumnSizes/setColumnFlexes, onBatchColumnResize, setColumnSizeAuto, setColumnsSizesAuto, setColumnSizesToFit, reservedViewportWidth, and its setter. Declarative width/flex remain authoritative; imperative auto/fit methods remain available when automatic initial autosizing is disabled.",
  },
  {
    name: "DOM and UI state",
    type: "methods and refs",
    defaultValue: "implemented",
    description:
      "getDOMNode, getMenuPortalContainer, getScrollingElement, getDOMNodeForRowIndex, getRows, getHeader, focus, blur, setEnableFiltering, setShowHeader, computedShowZebraRows, setShowZebraRows, domRef, and bodyRef. The zebra setter accepts values or functional updates for uncontrolled state and does not override a controlled prop.",
  },
  {
    name: "Mode, border, and layout fields",
    type: "computed fields",
    defaultValue: "implemented readout",
    description:
      "gridId, size/viewportSize, available/total column widths, column prefix sums/count, maxVisibleRows, virtualizeColumns, border flags, loading/filter/header flags, pagination mode flags, scrollbars, and remoteSort. Non-array sources are remote; pagination=true classifies their returned pages as authoritative while explicit local pagination opts into slicing.",
  },
  {
    name: "Row lookup",
    type: "methods",
    defaultValue: "implemented",
    description:
      "getItemId, getItemAt, getItemIdAt, getItemIndex, getRowIndexById, and getItemIndexById. The default lookup source is the currently loaded row set/page.",
  },
  {
    name: "Selection",
    type: "methods and fields",
    defaultValue: "implemented",
    description:
      "getSelectedMap, setSelected, selectAll, deselectAll, isRowSelected, getSelectedCount, setSelectedById, setSelectedAt, setRowSelected, and computed selected/count fields. Index/all operations use loaded rows.",
  },
  {
    name: "Scrolling and render range",
    type: "methods and fields",
    defaultValue: "implemented",
    description:
      "Horizontal/vertical get, set, and increment methods; scrollToIndex/Id/Cell/Column; scrollToIndexIfNeeded; first-visible/rendered/fully-visible checks; getRenderRange; and scrollbar flags. scrollToIndex duration/force options are accepted but are not yet acted on.",
  },
  {
    name: "Virtual-list adapter",
    type: "getVirtualList()",
    defaultValue: "implemented subset",
    description:
      "getVirtualList exposes getContainerNode/getScrollerNode/getScrollingElement, height/scroll/client-size reads, getRows/forEachRow/getRowAt, visible count/range, setRowIndex, scrollToIndex/smoothScrollTo, adjustHeights, refresh/update, visibility/rendered-index checks, and max render count. adjustHeights() synchronously reads scrollHeight from the currently instantiated variable-height rows, updates virtual or non-virtual measurements, and returns void; fixed numeric rowHeight is deliberately a no-op. Offset reindexing may settle on the next animation frame, matching the upstream manager. Inovua's smoothScrollTo(value, config, callback) pixel contract is preserved, including vertical/horizontal orientation, duration, and completion value. Ranges include overscan and measured natural rows report zero-based offsets and their current sizes.",
  },
  {
    name: "Editing",
    type: "fields and methods",
    defaultValue: "implemented",
    description:
      "computedEditable, computedEditStartEvent, computedIsEditing, isInEdit.current, getCurrentEditInfo, startEdit, tryStartEdit, completeEdit, cancelEdit, and currentEditCompletePromise reflect or control the active cell editor. Start methods return Promises, async completion is session-safe, and active drafts resolve identity from their current visible coordinate after controlled row/column reorder.",
  },
  {
    name: "Localization and filter menu",
    type: "methods and fields",
    defaultValue: "implemented",
    description:
      "i18n(key, fallback), showColumnFilterContextMenu(column), hideColumnFilterContextMenu, and columnFilterContextMenuProps. Coordinate bundles are not used by the show method.",
  },
  {
    name: "Additional compatibility methods",
    type: "open-index methods",
    defaultValue: "limited",
    description:
      "computedOnColumnResize proposes a clamped width and emits the individual/batch callbacks while respecting controlled ownership. silentSetData and setOriginalData both replace current rows only and are not a durable original-data store.",
  },
];

const typesSections: ReferenceSection[] = [
  {
    id: "typedatasource",
    title: "TypeDataSource",
    body: (
      <div className="space-y-4 text-sm text-muted-foreground">
        <p>
          <code>TypeDataSource</code> accepts local arrays, promises, and
          function-based remote sources. Remote functions receive the current
          grid state every time the grid reloads. When optional search is
          connected, that state also includes <code>searchValue</code>.
        </p>
        <CodeBlock
          code={`type TypeDataSourceArgs = {
  sortInfo: TypeSortInfo;
  filterValue: TypeFilterValue;
  columnOrder: string[];
  columns: TypeColumns;
  idProperty: string;
  theme: string;
  skip?: number;
  limit?: number;
  searchValue?: string;
  signal?: AbortSignal;
};

type TypeDataSourceResult =
  | unknown[]
  | { data: unknown[]; count: number };

type TypeDataSource =
  | unknown[]
  | Promise<TypeDataSourceResult>
  | ((props: TypeDataSourceArgs) =>
      | TypeDataSourceResult
      | Promise<TypeDataSourceResult>);`}
          language="ts"
        />
        <CodeBlock code={remoteDataSnippet} language="tsx" />
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Local arrays compose search, local filtering, sorting, count, and
            local pagination in that order. With pagination=true/remote, every
            Promise result is an authoritative remote page. Explicit local
            pagination opts Promise results into local slicing.
          </li>
          <li>
            Function sources receive the stable args object and own remote
            transforms; returned <code>{"{ data, count }"}</code> counts are
            authoritative.
          </li>
          <li>
            pagination=true/remote sends skip/limit to functions without local
            reslicing; pagination=local omits them and slices the result
            locally. columns contains visible ordered user columns and excludes
            the synthetic checkbox column.
          </li>
          <li>
            Only the latest async request may commit. Replacements abort the
            previous optional, non-enumerable signal without changing the
            established enumerable request keys. Rejections preserve the last
            rows and clear automatic loading; sources may ignore cancellation
            because the stale-result guard remains authoritative.
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: "typefiltervalue",
    title: "TypeFilterValue",
    body: (
      <div className="space-y-4 text-sm text-muted-foreground">
        <p>
          Filters are modeled as an array of entries or <code>null</code>. Each
          entry stores the target field, operator, type, value, and optional
          active/empty-value helpers.
        </p>
        <CodeBlock
          code={`type TypeSingleFilterValue = {
  name: string;
  type: string;
  operator: string;
  value: unknown;
  emptyValue?: unknown;
  fn?: (arg: unknown) => unknown;
  getFilterValue?: (...args: unknown[]) => unknown;
  active?: boolean;
};

type TypeFilterValue = TypeSingleFilterValue[] | null;`}
          language="ts"
        />
        <Callout
          title="Typed compatibility hooks that are not executed"
          tone="warning"
        >
          <p>
            <code>TypeSingleFilterValue.fn</code> and{" "}
            <code>getFilterValue</code> are accepted by the exported type, but
            the current local filter pipeline does not call them. Use a
            registered <code>TypeFilterOperator.fn</code> for executable custom
            local behavior.
          </p>
        </Callout>
      </div>
    ),
  },
  {
    id: "typesortinfo",
    title: "TypeSortInfo",
    body: (
      <div className="space-y-4 text-sm text-muted-foreground">
        <p>
          Sorting supports a single descriptor, an array of descriptors, or
          <code>null</code>. The direction is numeric for Inovua-style
          compatibility.
        </p>
        <CodeBlock
          code={`type SortDirection = 1 | -1 | 0;

type TypeSingleSortInfo = {
  dir: SortDirection;
  name: string;
  id?: string;
  type?: string;
  fn?: (...args: unknown[]) => unknown;
  columnName?: string;
};

type TypeSortInfo = TypeSingleSortInfo | TypeSingleSortInfo[] | null;`}
          language="ts"
        />
        <Callout title="Custom comparator status" tone="warning">
          <p>
            <code>TypeSingleSortInfo.fn</code> is present for type compatibility
            but is not called by the current local sort implementation. Local
            sorting compares the resolved column/sortName value using the
            built-in comparator.
          </p>
        </Callout>
      </div>
    ),
  },
  {
    id: "filter-registry-types",
    title: "Filter registry types",
    body: (
      <div className="space-y-4 text-sm text-muted-foreground">
        <CodeBlock
          code={`type TypeFilterOperator = {
  name: string;
  fn: (args: {
    value: unknown;
    filterValue: unknown;
    emptyValue?: unknown;
    data?: unknown;
    _data?: unknown;
    column?: unknown;
  }) => boolean;
  filterOnEmptyValue?: boolean;
  valueOnOperatorSelect?: unknown;
  disableFilterEditor?: boolean;
};

type TypeFilterType = {
  type: string;
  emptyValue: unknown;
  operators: TypeFilterOperator[];
};

type TypeFilterTypes = Record<string, TypeFilterType>;`}
          language="ts"
        />
        <p>
          Custom registries shallow-merge by type key. Replacing a key replaces
          that complete type definition, including its operator array.
        </p>
      </div>
    ),
  },
  {
    id: "typecomputedprops",
    title: "TypeComputedProps imperative API",
    body: (
      <div className="space-y-4 text-sm text-muted-foreground">
        <Callout
          title="Use this allowlist for feature detection"
          tone="warning"
        >
          <p>
            <code>TypeComputedProps</code> is explicit and behavior-backed.
            Unknown method-like names resolve to <code>undefined</code>, so
            ordinary function checks are valid feature detection.
          </p>
          <p>
            Row, column, and filter-context-menu show/hide methods are
            functional. Column order, visibility, width/flex maps, batch resize,
            one/all auto-size, size-to-fit, reserved-viewport setters,
            active-row/navigation state, editing, scrolling, and row-height
            methods are functional.
          </p>
          <p>
            Locked-column arrays, indexes, section widths, and presence flags
            now reflect declarative <code>column.locked</code> and its logical
            column allocation. In a fixed-layout table that underfills and
            stretches to the viewport, browser-distributed surplus space is not
            included in those compatibility widths. Live pagination remains a
            fixed compatibility field; <code>selected === true</code> and
            unselected exclusions are tracked by built-in selection.{" "}
            <code>computedShowZebraRows</code> reflects the per-grid prop, while{" "}
            <code>columnFlexes</code> and column sizes report the implemented
            allocation and their setters honor declarative ownership. Active
            index, active item, focus state, and row-navigation methods report
            and update live state. Enterprise-only methods such as{" "}
            <code>setColumnLocked</code> are outside the Community manifest and
            are absent.
          </p>
        </Callout>
        <div className="space-y-2">
          <h3 className="font-semibold text-foreground">Editing methods</h3>
          <p>
            <code>startEdit({"{ columnId, rowIndex?, rowId?, value? }"})</code>{" "}
            starts the requested editable cell. <code>tryStartEdit</code>{" "}
            accepts <code>{"{ columnId, rowIndex?, rowId?, dir? }"}</code> and
            searches in that direction for a cell that can edit. Both return
            Promises; invalid row/no-match cases reject with <code>null</code>,
            while an unknown column rejects with an Error. Either method
            replaces an active editor without firing stop, complete, or cancel
            for the former cell, and resolves live target metadata after its
            deferred dispatch.
          </p>
          <p>
            <code>completeEdit(args?)</code> and <code>cancelEdit(args?)</code>{" "}
            are synchronous triggers. For exact 5.10.2 compatibility, calling{" "}
            <code>completeEdit()</code> with no object completes with an empty
            string; passing a current-target object without <code>value</code>{" "}
            preserves the draft, while a different target has no active edit
            value and reports <code>undefined</code>. Read live state with{" "}
            <code>getCurrentEditInfo()</code>, <code>isInEdit.current</code>,
            and <code>currentEditCompletePromise.current</code>.
          </p>
          <p>
            Completion scrolls first, then dispatches after the compatibility
            delay to an actually rendered, editable cell; an omitted
            current-target value reads the live draft at that moment. Cancel is
            immediate and does not scroll. Consequently, non-editable targets
            are ignored by both methods, and an offscreen cancellation target is
            a no-op.
          </p>
          <p>
            String column IDs resolve by ID; numeric values resolve by visible
            column index. A valid complete target uses its supplied row index or
            row ID, while a missing/invalid column falls back both coordinates
            to the current edit. Cancel uses a supplied valid column and row
            index immediately; a valid column without a row is a no-op, while a
            missing/invalid column falls back to the current edit. Numeric row
            IDs stay numeric, and lookup accepts equivalent numeric strings.
          </p>
          <p>
            Exact cross-target behavior is intentionally retained: completing or
            cancelling a different valid cell reports that target without a
            target <code>onEditStop</code>, keeps the current editor/edit info,
            and sets the upstream lifecycle edit flag false.
          </p>
          <p>
            The editor is stopped before <code>onEditComplete</code> runs. A
            fulfilled Promise allows requested keyboard navigation, a rejected
            Promise suppresses it, and an older Promise settling cannot clear or
            navigate a newer editor session.
          </p>
        </div>
      </div>
    ),
    rows: computedPropsRows,
  },
  {
    id: "column-group-types",
    title: "Stacked-column group types",
    body: (
      <div className="space-y-4 text-sm text-muted-foreground">
        <CodeBlock
          code={`type TypeColumnGroup = {
  name: string;
  header?:
    | React.ReactNode
    | ((props: TypeColumnGroupHeaderProps) => React.ReactNode);
  group?: string;
  computedDepth?: number;
  draggable?: boolean;
  resizable?: boolean;
  headerClassName?: string | ((props) => string | undefined);
  headerStyle?: React.CSSProperties | ((props) => React.CSSProperties | undefined);
  headerDOMProps?: TypeColumnGroupDOMProps | ((props) => TypeColumnGroupDOMProps | undefined);
};

type TypeColumnGroupHeaderProps = {
  group: TypeColumnGroup;
  groupName: string;
  depth: number;
  computedDepth: number;
  segmentIndex: number;
  segmentCount: number;
  split: boolean;
  width: number;
  fullWidth: number;
  columnIds: string[];
  columns: TypeColumn[];
  grid: TypeComputedProps;
  computedProps: TypeComputedProps;
  computedPropsRef: React.MutableRefObject<TypeComputedProps | null>;
};`}
          language="ts"
        />
        <p>
          <code>computedDepth</code> is normalized from the live parent chain.
          Custom header and styling callbacks receive logical segment metadata,
          the complete leaf-column list, and the stable computed grid API. Split
          segments share one group name and expose distinct segment indexes.
        </p>
      </div>
    ),
  },
  {
    id: "typei18n",
    title: "TypeI18n",
    body: (
      <div className="space-y-4 text-sm text-muted-foreground">
        <p>
          <code>TypeI18n</code> is an open object map whose values may be
          strings or React nodes.
        </p>
        <CodeBlock
          code={`type TypeI18n = {
  [key: string]: string | React.ReactNode;
};`}
          language="ts"
        />
        <p>
          See the complete list of supported keys and their English fallbacks in
          the{" "}
          <DocsRouteLink
            group="reference"
            slug="i18n"
            className="font-medium text-foreground underline underline-offset-4"
          >
            internationalization reference
          </DocsRouteLink>
          .
        </p>
      </div>
    ),
  },
  {
    id: "selection-and-layout-types",
    title: "Selection, checkbox, and layout types",
    body: (
      <div className="space-y-4 text-sm text-muted-foreground">
        <CodeBlock
          code={`type TypeRowSelection =
  | string | number | boolean
  | { [key: string]: any }
  | null;

type TypeOnSelectionChangeArg = {
  selected: TypeRowSelection;
  data?: unknown;
  unselected?: TypeRowSelection;
  originalData?: TypeDataSource;
};

type DisabledRowsProp = {
  [displayedIndex: string]: boolean;
} | null;

type TypeCheckboxColumn =
  | boolean
  | (IColumn & {
      renderCheckbox?: (
        checkboxProps: TypeCheckboxProps,
        cellProps: { headerCell: boolean; data: unknown; rowIndex?: number }
      ) => React.ReactNode;
    });

type TypeCheckboxProps = {
  checked: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
  onChange: (checked: boolean, event?: unknown) => void;
  onClick?: (event: unknown) => void;
  [key: string]: unknown;
};

type TypePaginationMode = true | false | "remote" | "local";
type TypeShowCellBorders = true | false | "vertical" | "horizontal";
type TypeSize = { width: number; height: number };`}
          language="ts"
        />
        <p>
          Selection callbacks always include <code>selected</code> and{" "}
          <code>originalData</code>; built-in interactions normally include the
          affected row(s) in <code>data</code>, while <code>unselected</code>
          remains optional. <code>disabledRows</code> uses current displayed
          indexes rather than row IDs.
        </p>
      </div>
    ),
  },
  {
    id: "column-lookup-types",
    title: "Computed column and lookup types",
    body: (
      <div className="space-y-4 text-sm text-muted-foreground">
        <CodeBlock
          code={`type TypeGetColumnByParam =
  | string | number | TypeColumn
  | { id: string | number; name?: string | number }
  | { name: string | number; id?: string | number };

type TypeComputedColumn = TypeColumn & {
  computedWidth?: number;
  computedVisibleIndex?: number;
  index?: number;
};

type TypeComputedColumnsMap = Record<string, TypeComputedColumn>;`}
          language="ts"
        />
        <p>
          <code>CellProps</code> is the one-argument cell-renderer payload:
          value, data, row identity/indices, column aliases and computed
          metadata, selection and row-height state, theme/native-scroll state,
          and a nested cellProps object. Pointer editability predicates and
          programmatic edit starts receive this same compatibility shape.
        </p>
      </div>
    ),
  },
];

function i18nRow(
  name: string,
  fallback: string,
  description: string
): ReferenceRow {
  return {
    name,
    type: "string | ReactNode",
    defaultValue: `"${fallback}"`,
    description,
  };
}

function stringI18nRow(
  name: string,
  fallback: string,
  description: string
): ReferenceRow {
  return {
    ...i18nRow(name, fallback, description),
    type: "string",
  };
}

function operatorI18nRow(
  name: string,
  humanizedFallback: string
): ReferenceRow {
  return {
    name,
    type: "string",
    defaultValue: `"${humanizedFallback}" (filter cell); "${name}" (operator menu)`,
    description: `Label for the built-in ${name} filter operator. Filter cells humanize the fallback; the operator menu falls back to the raw key.`,
  };
}

const i18nSections: ReferenceSection[] = [
  {
    id: "overview",
    title: "How localization works",
    body: (
      <div className="space-y-4 text-sm text-muted-foreground">
        <p>
          The built-in language is English. The grid does not bundle language
          packs or select a locale automatically; pass an <code>i18n</code> map
          to replace the strings your application needs.
        </p>
        <p>
          Overrides are partial. When a key is omitted, the grid keeps its
          built-in English fallback. The <code>TypeI18n</code> map accepts
          strings and React nodes.
        </p>
        <p>
          Use strings for keys marked <code>string</code> below. Those values
          are reused in native attributes or menu primitives that stringify the
          supplied value; the remaining keys can render a React node directly.
        </p>
        <CodeBlock code={i18nSnippet} language="tsx" />
        <Callout title="Current localization scope">
          <p>
            The keys listed below are the strings that can currently be
            overridden. Some other interface text remains fixed in English.
          </p>
        </Callout>
      </div>
    ),
  },
  {
    id: "general-keys",
    title: "General keys",
    rows: [
      i18nRow(
        "noRecords",
        "No records",
        "Empty-state text shown when the grid or mobile list has no rows."
      ),
    ],
  },
  {
    id: "filter-keys",
    title: "Filtering keys",
    body: (
      <p className="text-sm text-muted-foreground">
        Custom filter operator names are also looked up in <code>i18n</code>
        using the operator name as the key. Like the built-ins, their fallback
        is humanized in the filter cell and uses the raw operator name in the
        operator menu. Custom operator labels must also be strings.
      </p>
    ),
    rows: [
      stringI18nRow("clear", "Clear", "Action label for clearing one filter."),
      stringI18nRow(
        "clearAll",
        "All",
        "All/no-filter option and placeholder for select filters."
      ),
      stringI18nRow(
        "selected",
        "selected",
        "Suffix shown after the selected-option count in a multi-select filter."
      ),
      stringI18nRow("filter", "Filter", "Filter tool and filter menu label."),
      stringI18nRow("operator", "Operator", "Filter operator group label."),
      operatorI18nRow("contains", "Contains"),
      operatorI18nRow("notContains", "Not Contains"),
      operatorI18nRow("containsOr", "Contains Or"),
      operatorI18nRow("eq", "Eq"),
      operatorI18nRow("neq", "Neq"),
      operatorI18nRow("empty", "Empty"),
      operatorI18nRow("notEmpty", "Not Empty"),
      operatorI18nRow("startsWith", "Starts With"),
      operatorI18nRow("endsWith", "Ends With"),
      operatorI18nRow("inlist", "Inlist"),
      operatorI18nRow("notinlist", "Notinlist"),
      operatorI18nRow("gt", "Gt"),
      operatorI18nRow("gte", "Gte"),
      operatorI18nRow("lt", "Lt"),
      operatorI18nRow("lte", "Lte"),
      operatorI18nRow("inrange", "Inrange"),
      operatorI18nRow("notinrange", "Notinrange"),
      operatorI18nRow("after", "After"),
      operatorI18nRow("afterOrOn", "After Or On"),
      operatorI18nRow("before", "Before"),
      operatorI18nRow("beforeOrOn", "Before Or On"),
    ],
  },
  {
    id: "sorting-keys",
    title: "Sorting keys",
    rows: [
      i18nRow("sortAsc", "Sort A→Z", "Ascending sort action label."),
      i18nRow("sortDesc", "Sort Z→A", "Descending sort action label."),
      i18nRow("unsort", "Unsort", "Action label for removing a sort."),
    ],
  },
  {
    id: "pagination-keys",
    title: "Pagination keys",
    rows: [
      i18nRow(
        "showingText",
        "Showing",
        "Lead-in text before the visible row range."
      ),
      i18nRow(
        "ofText",
        "of",
        "Connector between the current range or page and the total."
      ),
      i18nRow("perPageText", "Rows", "Page-size selector label."),
      i18nRow("pageText", "Page", "Current-page label."),
    ],
  },
  {
    id: "mobile-keys",
    title: "Mobile transform keys",
    rows: [
      i18nRow(
        "mobileColumns",
        "Display columns",
        "Mobile column-picker heading. String overrides also label the icon trigger; React nodes keep its English accessible name."
      ),
      stringI18nRow(
        "mobileSort",
        "Sort",
        "Accessible label and title for the icon-only mobile sort control."
      ),
      i18nRow(
        "mobileSortBy",
        "Sort by",
        "Column-selector label. String overrides also become its accessible name."
      ),
      i18nRow(
        "mobileSortAsc",
        "Ascending",
        "Ascending direction option. String overrides also appear in the active-sort summary."
      ),
      i18nRow(
        "mobileSortDesc",
        "Descending",
        "Descending direction option. String overrides also appear in the active-sort summary."
      ),
      i18nRow(
        "mobileClearSort",
        "Clear sort",
        "Action label for clearing mobile sorting."
      ),
      i18nRow(
        "mobileApplySort",
        "Apply sort",
        "Action label for applying mobile sorting."
      ),
    ],
  },
];

const dateFilterRows: ReferenceRow[] = [
  {
    name: "filterValue",
    type: "{ value?: any; operator?: string; type?: string; name?: string }",
    defaultValue: "-",
    description:
      "Current filter descriptor. Range operators switch the component into a two-input layout.",
  },
  {
    name: "value",
    type: "any",
    defaultValue: "filterValue.value",
    description: "Direct controlled value override.",
  },
  {
    name: "onChange",
    type: "(value: any) => void",
    defaultValue: "-",
    description:
      "Receives a Date, a [start, end] tuple, or null depending on the operator.",
  },
  {
    name: "placeholder / startPlaceholder / endPlaceholder",
    type: "string",
    defaultValue: '""',
    description: "Single or range-specific placeholder text.",
  },
  {
    name: "disabled",
    type: "boolean",
    defaultValue: "false",
    description: "Disables the editor.",
  },
  {
    name: "className / style",
    type: "string / React.CSSProperties",
    defaultValue: "-",
    description: "Styling hooks for the wrapper or input.",
  },
];

const numberFilterRows: ReferenceRow[] = [
  {
    name: "filterValue",
    type: "{ value?: any; operator?: string; type?: string; name?: string }",
    defaultValue: "-",
    description:
      "Current filter descriptor. Range operators render start and end inputs.",
  },
  {
    name: "value",
    type: "any",
    defaultValue: "filterValue.value",
    description: "Direct controlled value override.",
  },
  {
    name: "onChange",
    type: "(value: any) => void",
    defaultValue: "-",
    description: "Receives a number, a [start, end] tuple, or null.",
  },
  {
    name: "placeholder / startPlaceholder / endPlaceholder",
    type: "string",
    defaultValue: '""',
    description: "Single or range-specific placeholder text.",
  },
  {
    name: "step / min / max",
    type: "number",
    defaultValue: "-",
    description: "Forwarded to the numeric input element.",
  },
  {
    name: "disabled / className / style",
    type: "boolean / string / React.CSSProperties",
    defaultValue: "-",
    description: "Standard editor state and styling hooks.",
  },
];

const selectFilterRows: ReferenceRow[] = [
  {
    name: "filterValue",
    type: "{ value?: any; operator?: string; type?: string; name?: string }",
    defaultValue: "-",
    description:
      "Current filter descriptor. The operator can switch the editor into multi-select mode.",
  },
  {
    name: "value",
    type: "any",
    defaultValue: "filterValue.value",
    description: "Direct controlled value override.",
  },
  {
    name: "onChange",
    type: "(value: any) => void",
    defaultValue: "-",
    description:
      "Receives the selected raw value, an array of raw values, or null.",
  },
  {
    name: "dataSource / options",
    type: "any[]",
    defaultValue: "[]",
    description:
      "Option source. The editor accepts either Inovua-style dataSource or options.",
  },
  {
    name: "multiple",
    type: "boolean",
    defaultValue: "false unless operator === inlist",
    description: "Forces multi-select mode.",
  },
  {
    name: "wrapMultiple",
    type: "boolean",
    defaultValue: "-",
    description:
      "Compatibility field reserved for callers already using the Inovua prop shape.",
  },
  {
    name: "placeholder",
    type: "string",
    defaultValue: '"All"',
    description: "Single-select placeholder and multi-select clear label.",
  },
  {
    name: "disabled / className / style",
    type: "boolean / string / React.CSSProperties",
    defaultValue: "-",
    description: "Standard editor state and styling hooks.",
  },
];

const textInputRows: ReferenceRow[] = [
  {
    name: "value / defaultValue",
    type: "any",
    defaultValue: 'undefined / ""',
    description:
      "value makes the input controlled; otherwise defaultValue seeds its owned value. A nullish default becomes an empty string.",
  },
  {
    name: "onChange",
    type: "(value: any, event?: any) => void",
    defaultValue: "-",
    description:
      "Receives the proposed value first. inputProps.onChange runs before this callback with the same event; clearing reports an undefined event, matching Inovua.",
  },
  {
    name: "inputProps / wrapperProps",
    type: "input attributes | null / div attributes",
    defaultValue: "-",
    description:
      "Routes native input attributes and outer-wrapper attributes without replacing the compatibility callback, focus, or class behavior. Explicit null inputProps is treated like omission for legacy spread-based callers.",
  },
  {
    name: "stopChangePropagation",
    type: "boolean | null",
    defaultValue: "true",
    description:
      "Stops native input change propagation before the value-first callbacks when truthy. Set false or null when an ancestor intentionally observes change events.",
  },
  {
    name: "enableClearButton / acceptClearToolFocus",
    type: "boolean / boolean",
    defaultValue: "true / false",
    description:
      "Controls the built-in clear tool and whether it participates in tab order. Legacy falsey-empty values (including empty string, 0, false, and null), disabled fields, and read-only fields keep its wrapper hidden.",
  },
  {
    name: "clearButtonSize / clearButtonColor / renderClearIcon",
    type: "number | [number, number] / string / function",
    defaultValue: "10 / currentColor / built-in icon",
    description:
      "Configures the clear icon. renderClearIcon receives its resolved dimensions and color; undefined uses the default while null suppresses the icon.",
  },
  {
    name: "focus() / setValue(value, event?)",
    type: "instance methods",
    defaultValue: "-",
    description:
      "A class-component ref exposes the legacy imperative methods. setValue updates uncontrolled state and always follows the nested-then-root callback order.",
  },
  {
    name: "renderClearButton(config) / renderClearButtonWrapper(fieldProps)",
    type: "bound instance/subclass hooks",
    defaultValue: "built-in clear tool",
    description:
      "Preserves the public class hooks. renderClearButton receives clearButtonClassName, clearButtonColor, clearButtonSize, and clearButtonStyle, and can be detached from the ref or overridden by a subclass.",
  },
  {
    name: "theme / rtl / rootClassName",
    type: "string / boolean / string",
    defaultValue: '"default-light" / false / "inovua-react-toolkit-text-input"',
    description:
      "Preserves the legacy theme, direction, and BEM hooks while using the packaged shadcn-compatible visual tokens.",
  },
  {
    name: "standard input fields",
    type: "type, name, placeholder, lengths, required, readOnly, disabled…",
    defaultValue: 'type="text"',
    description:
      "Forwards the supported native input state. Clicking the wrapper focuses the input; focus and blur update the compatibility modifier and callbacks.",
  },
];

const checkboxRows: ReferenceRow[] = [
  {
    name: "checked",
    type: "boolean",
    defaultValue: "false",
    description: "Current checked state.",
  },
  {
    name: "indeterminate",
    type: "boolean",
    defaultValue: "false",
    description: "Shows the mixed state while still emitting boolean changes.",
  },
  {
    name: "disabled",
    type: "boolean",
    defaultValue: "false",
    description: "Disables interaction.",
  },
  {
    name: "onChange",
    type: "(checked: boolean, event?: unknown) => void",
    defaultValue: "-",
    description:
      "Receives a normalized boolean checked state plus the original Radix value.",
  },
  {
    name: "onClick",
    type: "(event: unknown) => void",
    defaultValue: "-",
    description:
      "Click hook. The component stops propagation so row clicks do not toggle selection unexpectedly.",
  },
  {
    name: "className / style",
    type: "string / React.CSSProperties",
    defaultValue: "-",
    description: "Styling hooks forwarded to the underlying Radix checkbox.",
  },
];

const inovuaCompatibilityRows: CompatibilityRow[] = [
  {
    id: "core-defaults-and-root-contract",
    feature: "Core defaults, identity, and root props",
    upstreamContract: (
      <>
        Community 5.10.2 defaults <code>idProperty</code> to <code>id</code>,
        uses the <code>default-light</code> theme, 40px data/filter rows,
        non-selectable column text, enabled filter context menus, and enabled
        column menu tools. Root class, style, focus, blur, and keyboard handlers
        attach to the component container.
      </>
    ),
    currentBehavior: (
      <>
        Runtime and <code>ReactDataGrid.defaultProps</code> expose those values.
        JSX may omit <code>idProperty</code> while the raw props type keeps it
        explicit. Consumer class/style and lifecycle handlers merge onto the
        outer <code>.tdg-root</code>; the inner surface fills the content box of
        its 1px design-system frame.
      </>
    ),
    requiredOutcome: (
      <>
        Preserve the defaults in runtime and declarations, keep required grid
        data props required, and retain root event bubbling and geometry without
        removing the packaged frame.
      </>
    ),
    status: "compatible",
  },
  {
    id: "filter-row-inference-and-local-ownership",
    feature: "Filter visibility and local ownership",
    upstreamContract: (
      <>
        Omitted <code>enableFiltering</code> infers filter-row visibility from a
        non-empty filter state. The executable 5.10.2 runtime applies
        uncontrolled default filters to local rows independently of visibility,
        while controlled <code>filterValue</code> remains externally owned.
      </>
    ),
    currentBehavior: (
      <>
        Missing and empty state hide the row; controlled, default, and inactive
        descriptors reveal their editors unless an explicit boolean overrides
        visibility. Active uncontrolled descriptors filter local data even while
        hidden; controlled and inactive descriptors do not.
      </>
    ),
    requiredOutcome: (
      <>
        Keep row visibility, editor presence/disabled state, remote args, and
        local transformation as separate, regression-tested decisions.
      </>
    ),
    status: "compatible",
  },
  {
    id: "react-peer-runtime-matrix",
    feature: "React 16.8–19 package compatibility",
    upstreamContract: (
      <>
        Community supports React 16.8 through 18, so a compatible replacement
        cannot require React 18-only hooks or the post-16.8 JSX runtime.
      </>
    ),
    currentBehavior: (
      <>
        The peer range covers 16.8, 17, 18, and 19. A packed-tarball matrix
        compiles declarations and mounts core, search, toolbar, combined
        providers, mobile layout, and menu behavior against one exact release
        from each major.
      </>
    ),
    requiredOutcome: (
      <>
        Keep newer hooks behind compatibility helpers, use the official
        external-store shim, and reject packed output that imports an
        unavailable React 16 JSX runtime.
      </>
    ),
    status: "compatible",
  },
  {
    id: "column-filter-change-callback",
    feature: "Per-column filter change callback",
    upstreamContract: (
      <>
        <code>onColumnFilterValueChange</code> runs before the aggregate filter
        callback and reports the descriptor, column identity/index, and optional
        filter-cell context.
      </>
    ),
    currentBehavior: (
      <>
        Editor, operator, enable/disable, single clear, and imperative set/clear
        paths use the same ordered callback. UI paths include{" "}
        <code>cellProps</code>; imperative calls omit it. Clear All resets every
        descriptor value while preserving activation and emits one aggregate
        callback without per-column callbacks.
      </>
    ),
    requiredOutcome: (
      <>
        Preserve callback ordering and payload identity across controlled,
        uncontrolled, and imperative filter changes.
      </>
    ),
    status: "compatible",
  },
  {
    id: "selection-enablement",
    feature: "Selection enablement and precedence",
    upstreamContract: (
      <>
        Explicit <code>enableSelection</code> wins. Otherwise{" "}
        <code>selected</code>, <code>defaultSelected</code>, or{" "}
        <code>checkboxColumn</code> enables selection; a callback alone does
        not.
      </>
    ),
    currentBehavior: (
      <>
        The same precedence controls row clicks, checkbox/header actions,
        controlled visuals, and computed selection methods. Explicit false gates
        every path.
      </>
    ),
    requiredOutcome: (
      <>
        Keep selection inference deterministic and prevent callbacks or
        controlled maps from bypassing an explicit false value.
      </>
    ),
    status: "compatible",
  },
  {
    id: "column-virtualization",
    feature: "Horizontal column virtualization",
    upstreamContract: (
      <>
        A default inclusive threshold of 15 visible columns enables horizontal
        virtualization for fixed numeric row heights;{" "}
        <code>virtualizeColumns</code> overrides the threshold.
      </>
    ),
    currentBehavior: (
      <>
        Header, filter row, body, scrolling geometry, far-column filtering, and
        edit metadata share one overscanned render range. Functional/natural row
        heights and transformed mobile layout disable it.
      </>
    ),
    requiredOutcome: (
      <>
        Preserve total scroll width and header/body alignment while mounting
        only the active horizontal range and keeping filter/edit APIs usable.
      </>
    ),
    status: "compatible",
  },
  {
    id: "stacked-column-headers",
    feature: "Stacked and nested column headers",
    upstreamContract: (
      <>
        Community 5.10.2 accepts root <code>groups</code>, leaf{" "}
        <code>column.group</code> membership, and nested{" "}
        <code>groups[].group</code> parents. Static or custom group headers
        split when reordering separates siblings; group segments can be dragged
        and proportionally resized, subject to{" "}
        <code>allowGroupSplitOnReorder</code>.
      </>
    ),
    currentBehavior: (
      <>
        The same descriptor graph produces accessible <code>colgroup</code>{" "}
        headers at every live depth. Visibility, filtering, sorting, controlled
        order, locked sections, and horizontal virtualization share leaf-width
        geometry. Split segments retain logical metadata, block drag proposals
        preserve controlled ownership, and group resize emits one coherent
        per-leaf batch.
      </>
    ),
    requiredOutcome: (
      <>
        Preserve the descriptor names, nested depth, custom callback payloads,
        split/rejoin rules, proportional min/max-clamped resizing, and
        header/filter/body alignment under horizontal virtualization.
      </>
    ),
    status: "compatible",
  },
  {
    id: "empty-text",
    feature: "Empty-state content",
    upstreamContract: (
      <>
        <code>emptyText</code> defaults to the <code>noRecords</code> i18n key,
        accepts content or a zero-argument function, and can be suppressed with
        null-like values.
      </>
    ),
    currentBehavior: (
      <>
        Desktop and transformed-mobile views share that resolver. Empty content
        appears after local filtering or remote completion and remains hidden
        while loading.
      </>
    ),
    requiredOutcome: (
      <>
        Keep literal/key precedence, React-node interactivity, suppression, and
        loading/remote timing consistent in both layouts.
      </>
    ),
    status: "compatible",
  },
  {
    id: "natural-row-height",
    feature: "Natural and dynamic row height",
    upstreamContract: (
      <>
        <code>{"rowHeight={null}"}</code> uses content-driven height, a{" "}
        <code>rowHeight</code> function can size each row, and{" "}
        <code>minRowHeight</code> supplies the floor and virtualization
        estimate.
      </>
    ),
    currentBehavior: (
      <>
        Number, function, and <code>null</code> are supported. Natural rows are
        measured and honor <code>minRowHeight</code>/<code>maxRowHeight</code>;
        a valid fixed numeric height remains authoritative over those bounds.
      </>
    ),
    requiredOutcome: (
      <>
        Support number, function, and <code>null</code>; honor{" "}
        <code>minRowHeight</code>; measure rendered rows and keep offsets
        correct.
      </>
    ),
    status: "compatible",
  },
  {
    id: "row-height-remeasurement",
    feature: "Row-height remeasurement",
    upstreamContract: (
      <>
        Rendered or wrapped content is measured, and row offsets are refreshed
        when column widths change.
      </>
    ),
    currentBehavior: (
      <>
        Natural desktop rows are registered for measurement, and width/content
        changes update virtual sizes and offsets.
      </>
    ),
    requiredOutcome: (
      <>
        Use automatic element measurement and remeasure after content or width
        changes without requiring an application callback.
      </>
    ),
    status: "compatible",
  },
  {
    id: "column-resize-callback",
    feature: "Column resize callback",
    upstreamContract: (
      <>
        <code>
          onColumnResize({"{ column, width, flex }"},{" "}
          {"{ reservedViewportWidth }"})
        </code>{" "}
        reports resize proposals.
      </>
    ),
    currentBehavior: (
      <>
        Mouse, pen, and touch dragging emit on pointer release; autosize and
        computed resize emit when committed. Cancel, blur, responsive changes,
        and unmount clean up capture/listeners. All paths use the original
        two-argument callback shape with the resolved width/flex and reserved
        viewport width.
      </>
    ),
    requiredOutcome: (
      <>
        Emit the original callback shape and timing, including the second
        viewport metadata argument.
      </>
    ),
    status: "compatible",
  },
  {
    id: "locked-columns-extension",
    feature: "Locked columns (Enterprise-derived extension)",
    upstreamContract: (
      <>
        Inovua documents locked columns as an Enterprise feature. Its shared
        column vocabulary accepts <code>locked</code> and{" "}
        <code>defaultLocked</code>, supports <code>true</code> as the{" "}
        <code>&quot;start&quot;</code> alias, and can report lock-state changes
        when reordering crosses sections.
      </>
    ),
    currentBehavior: (
      <>
        Declarative <code>column.locked</code> supports <code>true</code>,{" "}
        <code>&quot;start&quot;</code>, <code>&quot;end&quot;</code>, and{" "}
        <code>false</code>. Header, filter, and body cells use shared sticky
        offsets; locked columns stay mounted during horizontal virtualization
        and retain their section while resizing or reordering. Cross-section
        drops are rejected.
      </>
    ),
    requiredOutcome: (
      <>
        Treat this as an explicit extension outside the Community compatibility
        gate. Do not claim complete Inovua locked-column parity until{" "}
        <code>defaultLocked</code>, <code>lockable</code>, <code>autoLock</code>
        , <code>onColumnLockedChange</code>,{" "}
        <code>showColumnMenuLockOptions</code>, <code>setColumnLocked</code>,
        lock/unlock menu actions, cross-section state transitions, and RTL edge
        mirroring are implemented and covered.
      </>
    ),
    status: "outside-public-baseline",
  },
  {
    id: "controlled-column-widths",
    feature: "Controlled and uncontrolled widths",
    upstreamContract: (
      <>
        <code>width</code> and <code>flex</code> are controlled;{" "}
        <code>defaultWidth</code> and <code>defaultFlex</code> are uncontrolled
        initial values.
      </>
    ),
    currentBehavior: (
      <>
        Controlled width/flex values remain authoritative; defaultWidth and
        defaultFlex initialize grid-owned state.
      </>
    ),
    requiredOutcome: (
      <>
        Dragging cannot change a controlled column unless the consumer supplies
        the next width through the callback; later prop updates render
        immediately. Default values initialize only uncontrolled state.
      </>
    ),
    status: "compatible",
  },
  {
    id: "flex-column-sizing",
    feature: "Flex column sizing",
    upstreamContract: (
      <>
        <code>flex</code> and <code>defaultFlex</code> allocate remaining
        viewport width proportionally using controlled and uncontrolled
        semantics. Subject to clamps, flex 2 receives about twice flex 1.
      </>
    ),
    currentBehavior: (
      <>
        Remaining width is allocated by flex weight with min/max constraints;
        controlled and uncontrolled inputs retain distinct ownership. The
        implicit minimum is 40px, explicit <code>{"minWidth={0}"}</code> is
        preserved, and the absent maximum remains unbounded.
      </>
    ),
    requiredOutcome: (
      <>
        Implement weighted remaining-space allocation plus the original min/max
        constraint behavior.
      </>
    ),
    status: "compatible",
  },
  {
    id: "zebra-rows",
    feature: "Zebra rows",
    upstreamContract: (
      <>
        Alternating rows are visibly striped by default;{" "}
        <code>{"showZebraRows={false}"}</code> disables stripes per grid.
      </>
    ),
    currentBehavior: (
      <>
        Built-in themes visibly stripe by default and{" "}
        <code>showZebraRows=false</code> disables the per-grid alternation. The
        computed <code>setShowZebraRows</code> method accepts both values and
        functional updates for uncontrolled grids while controlled props remain
        authoritative.
      </>
    ),
    requiredOutcome: (
      <>
        Restore visible default stripes and the per-grid true/false toggle while
        retaining theme-token customization.
      </>
    ),
    status: "compatible",
  },
  {
    id: "inline-editing",
    feature: "Inline editing",
    upstreamContract: (
      <>
        Root <code>editable</code> and <code>editStartEvent</code>; column{" "}
        <code>editable</code>, <code>editor</code>, and{" "}
        <code>renderEditor</code>; lifecycle callbacks including{" "}
        <code>onEditStart</code>, <code>onEditValueChange</code>,{" "}
        <code>onEditStop</code>, <code>onEditComplete</code>, and{" "}
        <code>onEditCancel</code>; Enter, Escape, Tab, and Shift navigation.
      </>
    ),
    currentBehavior: (
      <>
        The grid provides default/custom editors, activation and editability
        controls, the Inovua-shaped custom-editor/cell arguments, imperative
        start/try/complete/cancel methods, ordered async callbacks, session-safe
        completion, cancellation, focus restoration, and keyboard navigation
        without mutating consumer data. An active draft remains anchored to its
        visible coordinate when controlled rows or columns reorder, and later
        callbacks report the new occupant identity without synthetic lifecycle
        events during reconciliation.
      </>
    ),
    requiredOutcome: (
      <>
        Implement default double-click and configurable click activation, sync
        or async column editability (including <code>editable=false</code>),
        default/custom editors and arguments, imperative editing methods,
        ordered lifecycle callbacks, payload identity, async race/rejection
        handling, cancellation, focus restoration, and keyboard traversal.
      </>
    ),
    status: "compatible",
  },
  {
    id: "row-style",
    feature: "Data-dependent row styling",
    upstreamContract: (
      <>
        <code>rowStyle</code> accepts an object or a{" "}
        <code>{"({ data, props, style }) => style"}</code> function and merges
        the result onto the row.
      </>
    ),
    currentBehavior: (
      <>
        The root rowStyle object/function is evaluated and merged on each row.
        Functions receive a mutable base style with height/width/minWidth/LTR
        direction, typed IDs, page-local and remote indexes, and live
        locked/unlocked section metadata; returning undefined preserves in-place
        mutations. <code>TypeColumn.style</code> remains independently
        cell-scoped.
      </>
    ),
    requiredOutcome: (
      <>
        Restore row-level object/function evaluation, base-style mutation and
        merge semantics, identity/index metadata, and unlocked sentinel values
        on the rendered row.
      </>
    ),
    status: "compatible",
  },
  {
    id: "text-input-export",
    feature: "Standalone TextInput export",
    upstreamContract: (
      <>
        Inovua exposes a default class component from the toolkit deep path{" "}
        <code>@inovua/reactdatagrid-community/packages/TextInput</code>. It owns
        uncontrolled state, keeps controlled values prop-owned, reports{" "}
        <code>(value, event)</code>, exposes <code>focus()</code> and{" "}
        <code>setValue()</code>, and supplies a clear tool.
      </>
    ),
    currentBehavior: (
      <>
        The compatible default deep import is published and the root also
        provides a named <code>TextInput</code>. Runtime behavior, callback
        ordering, propagation, imperative methods, clear visibility, disabled
        and read-only states, RTL/theme hooks, and standalone styling are
        covered by executable tests.
      </>
    ),
    requiredOutcome: (
      <>
        Preserve the deep-import entry, class-instance TypeScript shape, and
        observable interaction semantics as semver-sensitive compatibility
        behavior.
      </>
    ),
    status: "compatible",
  },
  {
    id: "on-did-mount",
    feature: "onDidMount lifecycle callback",
    upstreamContract: (
      <>
        <code>onDidMount</code> runs from a passive mount effect with the live{" "}
        <code>MutableRefObject&lt;TypeComputedProps | null&gt;</code>. It
        precedes the other imperative lifecycle notifications and is not tied to
        grid width, data resolution, or subsequent rerenders.
      </>
    ),
    currentBehavior: (
      <>
        The API ref is hydrated first, then callbacks run in{" "}
        <code>onDidMount → handle → onReady</code> order. Ordinary updates
        retain and refresh the same ref without repeating onDidMount; a real
        remount creates another lifecycle. React StrictMode development replay
        is preserved instead of hidden.
      </>
    ),
    requiredOutcome: (
      <>
        Keep the callback mount-scoped, hydrated, width-independent, ordered,
        and typed with the same mutable computed-props ref.
      </>
    ),
    status: "compatible",
  },
  {
    id: "handle-on-ready-lifecycle-details",
    feature: "handle/onReady lifecycle details",
    upstreamContract: (
      <>
        Inovua reruns <code>handle</code> when its callback identity changes and
        invokes the previous callback with <code>null</code> during cleanup. Its{" "}
        <code>onReady</code> callback waits until the measured grid width is
        nonzero.
      </>
    ),
    currentBehavior: (
      <>
        <code>handle</code> receives the live ref and its replaced/unmounted
        callback receives <code>null</code> during cleanup. <code>onReady</code>{" "}
        waits for a nonzero measured width while <code>onDidMount</code> remains
        width-independent.
      </>
    ),
    requiredOutcome: (
      <>
        Preserve callback replacement cleanup and zero-width readiness without
        callback-identity feedback loops.
      </>
    ),
    status: "compatible",
  },
  {
    id: "virtual-list-adjust-heights",
    feature: "Virtual-list adjustHeights()",
    upstreamContract: (
      <>
        <code>getVirtualList().adjustHeights()</code> is an argument-free,
        synchronous command that asks currently instantiated variable-height
        rows to remeasure themselves and returns <code>void</code>. Fixed
        numeric row heights are unaffected.
      </>
    ),
    currentBehavior: (
      <>
        The adapter reads <code>scrollHeight</code> from every instantiated row
        for natural and function-valued heights, updates virtual and non-virtual
        measurements, and leaves fixed numeric heights untouched. Virtual rows
        use explicit cache updates instead of registering extra observers, so
        scrolled-out function-height nodes are not retained.
      </>
    ),
    requiredOutcome: (
      <>
        Preserve the no-argument void signature, mounted-row scope, and fixed
        row-height no-op while keeping offsets and total virtual height
        contiguous after DOM content changes.
      </>
    ),
    status: "compatible",
  },
  {
    id: "typed-column-fields",
    feature: "Typed column defaults and filter aliases",
    upstreamContract: (
      <>
        <code>defaultVisible</code>/<code>defaultHidden</code> initialize
        visibility and <code>filterName</code> redirects the filter field when
        supplied.
      </>
    ),
    currentBehavior: (
      <>
        <code>defaultVisible=false</code> and <code>defaultHidden=true</code>{" "}
        seed grid-owned visibility. Local filtering resolves id/name/filterName
        aliases and invokes <code>{"getFilterValue({ data, value })"}</code>.
        Remote arguments receive the same alias/type/getter projection and only
        include visible rendered columns in <code>columnOrder</code>.
      </>
    ),
    requiredOutcome: (
      <>
        Preserve local and remote projection, including inferred types,
        descriptor getters, aliases, and visible rendered column order.
      </>
    ),
    status: "compatible",
  },
  {
    id: "imperative-placeholders",
    feature: "Explicit imperative API",
    upstreamContract: (
      <>
        Public computed-props methods have observable effects and can be used as
        an imperative integration contract.
      </>
    ),
    currentBehavior: (
      <>
        The public computed surface is explicitly typed and behavior-backed.
        Context menus, sizing, row/cell navigation, editing, scrolling, and
        row-height methods execute; unknown method-like names are undefined.
      </>
    ),
    requiredOutcome: (
      <>
        Keep the machine-readable manifest and executable browser probe green.
      </>
    ),
    status: "compatible",
  },
  {
    id: "remaining-community-api",
    feature: "Remaining public Community API",
    upstreamContract: (
      <>
        Every documented public Community 5.10.2 behavior belongs to the
        compatibility baseline.
      </>
    ),
    currentBehavior: (
      <>
        The Issue 17 and Issue 31–45 audit is complete. Enterprise-only APIs are
        recorded as exclusions in the machine-readable manifest.
      </>
    ),
    requiredOutcome: (
      <>
        Treat every newly discovered Community mismatch as a regression and add
        executable evidence with the fix.
      </>
    ),
    status: "compatible",
  },
];

const implementedSurfaceSections: ReferenceSection[] = [
  {
    id: "scope",
    title: "What this inventory means",
    body: (
      <div className="space-y-4 text-sm text-muted-foreground">
        <Callout title="Implemented does not mean verified Inovua parity">
          <p>
            This page is the positive inventory of behavior shipped by the
            current package. It answers “what works today.” The separate{" "}
            <DocsRouteLink
              group="migration"
              slug="inovua-status"
              className="font-medium text-foreground underline underline-offset-4"
            >
              compatibility ledger
            </DocsRouteLink>{" "}
            answers “where does that behavior still differ from Inovua Community
            5.10.2.” A feature listed here is not automatically a parity claim.
          </p>
        </Callout>
        <p>
          For signatures and every currently exported component prop/column
          field, use the{" "}
          <DocsRouteLink
            group="reference"
            slug="reactdatagrid"
            className="font-medium text-foreground underline underline-offset-4"
          >
            ReactDataGrid props
          </DocsRouteLink>{" "}
          and{" "}
          <DocsRouteLink
            group="reference"
            slug="icolumn"
            className="font-medium text-foreground underline underline-offset-4"
          >
            IColumn
          </DocsRouteLink>{" "}
          references. The inventory below records the operational semantics
          behind those declarations.
        </p>
      </div>
    ),
  },
  {
    id: "package-exports",
    title: "Package entry points and exports",
    body: (
      <p className="text-sm text-muted-foreground">
        For provider requirements, direct-child auto-connection, and explicit
        target rules, read{" "}
        <DocsRouteLink
          group="reference"
          slug="providers-and-targets"
          className="font-medium text-foreground underline underline-offset-4"
        >
          Providers and targets
        </DocsRouteLink>
        .
      </p>
    ),
    rows: [
      {
        name: "@geovi/the-datagrid",
        type: "value exports",
        defaultValue: "main entry",
        description:
          "Default and named ReactDataGrid, executable sorting/filter/menu/cell-selection descriptors, BoolEditor, DateEditor, NumericEditor, StringFilter, BoolFilter, DateFilter, NumberFilter, SelectFilter, CheckBox, TextInput, DEFAULT_FILTER_TYPES, and filterTypes.",
      },
      {
        name: "Root type exports",
        type: "TypeScript",
        defaultValue: "main entry",
        description:
          "The grid's Inovua-aligned CellProps, column, data-source, filter, sort, selection, row-style, editing, computed-props, and checkbox types, plus TextInputProps, TypeTextInputProps, and the TextInput callback/input/wrapper/clear-button helper types.",
      },
      {
        name: "@geovi/the-datagrid/packages/TextInput",
        type: "compatibility entry",
        defaultValue: "default export",
        description:
          "The Inovua-compatible standalone TextInput path. It resolves as a default class component with TypeTextInputProps and automatically loads its small standalone stylesheet without loading the grid runtime.",
      },
      {
        name: "@geovi/the-datagrid/components",
        type: "optional combined entry",
        defaultValue: "recommended for mixed controls",
        description:
          "RDGProvider, RDGTarget, RDGSearchBar, RDGToolbar, the four stable feature-specific provider/target APIs, and all corresponding prop types.",
      },
      {
        name: "@geovi/the-datagrid/search",
        type: "optional entry",
        defaultValue: "opt in",
        description:
          "RDGSearchProvider, RDGSearchBar, RDGSearchTarget, and their three prop types. Importing this entry also loads its isolated search stylesheet.",
      },
      {
        name: "@geovi/the-datagrid/toolbar",
        type: "optional entry",
        defaultValue: "opt in",
        description:
          "RDGToolbarProvider, RDGToolbar, RDGToolbarTarget, and their prop types. Built-in export, filter-row and clear-filter actions are opt-in props; toolbar children stay the independent right-side action area.",
      },
      {
        name: "CSS subpaths",
        type: "core / search / toolbar",
        defaultValue: "public",
        description:
          "Every JavaScript entry imports its required compiled CSS automatically; the combined components entry reuses search and toolbar CSS without duplicating it. Explicit ./style.css, ./search/style.css, and ./toolbar/style.css subpaths remain available for build systems that require manual CSS imports.",
      },
    ],
  },
  {
    id: "defaults",
    title: "Runtime defaults",
    body: (
      <div className="space-y-4 text-sm text-muted-foreground">
        <p>
          <code>ReactDataGrid.defaultProps</code> is an enumerable compatibility
          object and exposes this exact subset:
        </p>
        <CodeBlock
          code={`ReactDataGrid.defaultProps = {
  theme: "default-light",
  idProperty: "id",
  enableColumnFilterContextMenu: true,
  enableColumnAutosize: true,
  skipHeaderOnAutoSize: false,
  resizable: true,
  liveColumnResize: false,
  columnDefaultWidth: 150,
  columnMinWidth: 40,
  columnMaxWidth: null,
  shareSpaceOnResize: false,
  columnResizeHandleWidth: 24,
  columnResizeProxyWidth: 5,
  filterTypes: DEFAULT_FILTER_TYPES,
  virtualized: true,
  virtualizeColumnsThreshold: 15,
  allowMobileTransform: false,
  columnUserSelect: false,
  showCellBorders: true,
  showColumnMenuTool: true,
  rowHeight: 40,
  minRowHeight: 20,
  defaultShowZebraRows: true,
  editStartEvent: "dblclick",
  emptyText: "noRecords",
  headerHeight: 40,
  filterRowHeight: 40,
};`}
          language="ts"
        />
        <p>
          <code>enableFiltering</code> is intentionally absent. Inovua 5.10.2
          infers filter-row visibility from non-empty controlled or uncontrolled
          filter state unless the caller explicitly supplies the boolean.
        </p>
        <p>
          Other real fallbacks—such as <code>reorderColumns=true</code>,{" "}
          <code>allowUnsort=true</code>, ascending first sort, pagination off,
          page sizes, and selection defaults—are runtime behavior but are not
          properties of that static object.
        </p>
      </div>
    ),
  },
  {
    id: "data-sources",
    title: "Data sources and transform pipeline",
    rows: [
      {
        name: "Local arrays",
        type: "unknown[]",
        defaultValue: "client-owned rows",
        description:
          "Optional global search runs first. Active uncontrolled default filters run next; controlled filterValue remains externally owned for Inovua 5.10.2 parity. Local sorting, count calculation, and pagination slicing follow, so count is pre-slice.",
      },
      {
        name: "Static promises",
        type: "Promise<rows | { data, count }>",
        defaultValue: "pagination-mode ownership",
        description:
          "With pagination=true/remote, either result shape is an authoritative remote page. pagination=local slices the resolved full result; without pagination, bare row arrays retain local search/filter/sort composition.",
      },
      {
        name: "Function sources",
        type: "(args) => rows | Promise<rows | { data, count }>",
        defaultValue: "remote transforms",
        description:
          "Receives sortInfo, filterValue, normalized user order and visible ordered columns, idProperty, theme, optional skip/limit, optional external searchValue, and a replacement AbortSignal. It owns remote transforms/count and may return rows or { data, count } synchronously or asynchronously.",
      },
      {
        name: "Function pagination modes",
        type: "true / remote / local / false",
        defaultValue: "false",
        description:
          "true or remote sends skip/limit and does not reslice returned rows; local omits skip/limit and slices the resolved rows locally; false sends neither and renders the returned rows.",
      },
      {
        name: "Async request safety",
        type: "latest request wins",
        defaultValue: "automatic",
        description:
          "Latest-request and unmount guards ignore stale results. Replacement requests abort the previous non-enumerable signal without changing established enumerable request keys. Rejections preserve committed rows and only the matching request clears auto-loading; explicit loading overrides display state.",
      },
      {
        name: "Invalid async payloads",
        type: "runtime containment",
        defaultValue: "empty rows",
        description:
          "Unsupported resolved shapes commit an empty result. A non-finite { data, count } count falls back to data.length.",
      },
      {
        name: "filteredRowsCount",
        type: "count callback",
        defaultValue: "deduplicated",
        description:
          "Reports pre-slice post-search/filter count and only calls when the number changes; function { data, count } is authoritative. Standalone mobile search is the exception and reports displayed loaded/page rows.",
      },
    ],
  },
  {
    id: "columns-and-layout",
    title: "Columns, ordering, rendering, and sizing",
    rows: [
      {
        name: "Column identity",
        type: "id or name",
        defaultValue: "required",
        description:
          "Every column resolves a stable string id from name/id; a column with neither is rejected. That id drives access, order, filtering, search, sorting, visibility, and imperative lookup.",
      },
      {
        name: "Headers and cells",
        type: "renderers",
        defaultValue: "value rendering",
        description:
          "Headers support renderHeader/header/name/id fallback and headerAlign. Cells support textAlign plus one-argument Inovua cellProps or the legacy two-argument renderer; nullish values render empty.",
      },
      {
        name: "Visibility",
        type: "column.visible / defaults / callback",
        defaultValue: "visible",
        description:
          "visible is controlled ownership. defaultVisible=false and defaultHidden=true seed grid-owned hidden state. The built-in Columns chooser, transformed-mobile picker, optional toolbar, and imperative setter share one callback path; hideable=false disables UI toggles.",
      },
      {
        name: "External visibility toolbar",
        type: "optional provider / toolbar / target",
        defaultValue: "opt in",
        description:
          "Renders buttons in current grid order, reflects the live visibility map, honors hideable=false, and prevents hiding the final visible hideable column. Toolbar children render in a separate right-side actions region.",
      },
      {
        name: "Order normalization",
        type: "columnOrder",
        defaultValue: "column declaration order",
        description:
          "Unknown ids are removed and omitted current ids are appended in declaration order; duplicate supplied ids are not deduplicated. Dragging requires reorderColumns !== false and draggable !== false on source and target, but no callback is required for grid-owned order.",
      },
      {
        name: "Controlled order",
        type: "columnOrder / defaultColumnOrder + callback",
        defaultValue: "declaration order",
        description:
          "A controlled parent must feed the proposed order back. If columnOrder is omitted, defaultColumnOrder seeds internal order and the grid retains drag changes with or without onColumnOrderChange; no consumer array is mutated.",
      },
      {
        name: "Locked columns",
        type: 'column.locked: true | "start" | "end" | false',
        defaultValue: "false",
        description:
          'true aliases "start". The rendered model groups locked-start, unlocked, and locked-end columns while preserving relative order inside each section. Cross-section drag drops are rejected; locked header, filter, and body cells share sticky offsets and remain mounted during horizontal virtualization. This is an Enterprise-derived extension, not complete Inovua locked-column parity: defaultLocked, lockable, autoLock, onColumnLockedChange, showColumnMenuLockOptions, setColumnLocked, lock-menu actions, and RTL mirroring remain unsupported.',
      },
      {
        name: "Checkbox column ordering",
        type: "synthetic fixed column",
        defaultValue: "44px",
        description:
          "The injected checkbox column is pinned from user drag, excluded from onColumnOrderChange, and removed from function-source columns/columnOrder args.",
      },
      {
        name: "Autosizing",
        type: "deterministic estimate",
        defaultValue: "enabled",
        description:
          "When numeric width/defaultWidth is absent, samples at most 25 available raw row[columnId] strings (not rendered DOM) plus a string header/name/id unless skipped, then applies column/root min/max bounds. The computed API implements one/all auto-size and size-to-fit batches.",
      },
      {
        name: "Resize interaction",
        type: "mouse, pen, touch / double-click",
        defaultValue: "enabled",
        description:
          "Enabled handles use pointer capture, clamp drag widths, and report completion through onColumnResize plus one onBatchColumnResize. liveColumnResize opts into animation-frame-coalesced geometry; the default keeps the configurable proxy. Controlled width/flex remain prop-owned; defaultWidth/defaultFlex are grid-owned starts. A no-share flex resize retains flex by default and converts to fixed when column.keepFlex=false; shareSpaceOnResize preserves the adjacent pair.",
      },
      {
        name: "Header column menu",
        type: "showColumnMenuTool",
        defaultValue: "true",
        description:
          "Shows an accessible dropdown with sort actions, a keyboard-operable Columns checkbox submenu, and auto-size/fit actions. Visibility stays synchronized with external and imperative controls, honors hideable=false, and cannot hide the final visible column.",
      },
      {
        name: "Layout controls",
        type: "props",
        defaultValue: "documented defaults",
        description:
          "headerHeight, filterRowHeight, fixed/functional/natural rowHeight, min/max row bounds, horizontal column virtualization, rowStyle, showZebraRows, showCellBorders, columnUserSelect, root className/style, and root focus, blur, and keyboard handlers are implemented. Fixed numeric rowHeight remains authoritative over min/max; inline styles are used for computed numeric layout.",
      },
    ],
  },
  {
    id: "filtering",
    title: "Filtering and filter registry",
    body: (
      <div className="space-y-4 text-sm text-muted-foreground">
        <ReferenceTable
          rows={[
            {
              name: "string",
              type: "operators",
              defaultValue: "contains",
              description:
                "contains, notContains, containsOr, eq, neq, empty, notEmpty, startsWith, endsWith.",
            },
            {
              name: "select",
              type: "operators",
              defaultValue: "eq",
              description: "inlist, notinlist, eq, neq.",
            },
            {
              name: "bool / boolean",
              type: "operators",
              defaultValue: "eq",
              description: "eq and neq, with null as the empty value.",
            },
            {
              name: "number",
              type: "operators",
              defaultValue: "gte",
              description:
                "gt, gte, lt, lte, eq, neq, inrange, notinrange; ranges accept tuples or { start, end } with open endpoints.",
            },
            {
              name: "date / time",
              type: "operators",
              defaultValue: "afterOrOn",
              description:
                "after, afterOrOn, before, beforeOrOn, eq, neq, inrange, notinrange. dateFormat and an available global moment are used before native Date.parse fallback.",
            },
          ]}
        />
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <code>containsOr</code> is project-specific and matches when any
            whitespace/comma/semicolon-delimited token occurs.
          </li>
          <li>
            Custom <code>filterTypes</code> shallow-merge by type key over the
            default registry. Replacing <code>string</code> replaces its full
            definition, so spread the original operators when extending them.{" "}
            <code>filterTypes</code> and <code>DEFAULT_FILTER_TYPES</code> are
            the same exported object.
          </li>
          <li>
            Empty and inactive entries remain in the state model but are skipped
            locally. <code>empty</code>/<code>notEmpty</code> remain active with
            no input editor.
          </li>
          <li>
            Editor typing commits after the column&apos;s filterDelay, or 250ms
            by default; false and 0 commit immediately. Operator selection and
            clear are immediate. Every edit requests skip 0; controlled
            pagination must honor onSkipChange(0).
          </li>
          <li>
            <code>onColumnFilterValueChange</code> runs before the aggregate
            callback for editor, operator, and clear changes. It reports the
            descriptor and column identity/index; UI gestures include
            filter-cell <code>cellProps</code>, while computed API set/clear
            calls omit that DOM-specific context.
          </li>
          <li>
            The filter-cell context menu switches operators, explicitly enables
            or disables a descriptor, and clears one or all values. Clear keeps
            the descriptor&apos;s activation state; Clear All emits one
            aggregate update without per-column callbacks. Object/function{" "}
            <code>filterEditorProps</code> and custom editors are supported as
            described in IColumn. Function-valued props remain available to the
            editor, including per-input metadata for exported range editors.
            Without a custom editor, only select + filterEditorProps.options
            renders a select; other types use generic text input. Use exported
            DateFilter, NumberFilter, or SelectFilter explicitly when needed.
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: "sorting-pagination-selection",
    title: "Sorting, pagination, and selection",
    rows: [
      {
        name: "Sorting",
        type: "controlled or uncontrolled",
        defaultValue: "asc → desc → unsort",
        description:
          "Sortable-by-default headers toggle by click, Enter, or Space. Object state is single-sort; array state is persistent multi-sort without a modifier key. The cycle is initial direction, opposite, then removal when allowed.",
      },
      {
        name: "Sort priority and values",
        type: "local and remote",
        defaultValue: "descriptor order",
        description:
          "Array order is priority and toggling an existing descriptor preserves its position. sortName is stored/sent remotely and maps back locally. column.sort, descriptor fn, sortFunctions[column.type], and built-in typed comparators are supported.",
      },
      {
        name: "Sort reset and alternate UI",
        type: "pagination/menu/mobile",
        defaultValue: "skip 0",
        description:
          "Header menu, transformed-mobile, and imperative sorting preserve single versus array mode. Each sort requests skip 0; controlled pagination must apply onSkipChange(0). Root sortable and column overrides govern interactive sort entry points.",
      },
      {
        name: "Pagination",
        type: "false | true | local | remote",
        defaultValue: "false",
        description:
          "Controlled/uncontrolled skip and limit are supported. Defaults are skip 0, pageSizes [10, 50, 100, 1000], and the first valid page size as limit. The toolbar exposes first/previous/next/last navigation.",
      },
      {
        name: "Checkbox selection",
        type: "controlled or uncontrolled",
        defaultValue: "off",
        description:
          "checkboxColumn injects the fixed selection column and accepts width/renderCheckbox customization. Header select-all affects the current loaded page and exposes checked/indeterminate/disabled metadata.",
      },
      {
        name: "Selection behavior",
        type: "row-id map",
        defaultValue: "inferred unless explicitly enabled/disabled",
        description:
          "enableSelection has explicit precedence. When omitted, selected, defaultSelected, or checkboxColumn enables selection; onSelectionChange alone does not. Explicit false suppresses controlled visuals and gates row, checkbox, header, and imperative actions. Interactive descendants are ignored and the emitted wrapper can pass back to selected.",
      },
      {
        name: "Selection ranges and payload",
        type: "current loaded rows/page",
        defaultValue: "row Shift-range on",
        description:
          "Shift-click applies the inclusive last-anchor range; checkbox Shift-ranges require checkboxSelectEnableShiftKey. Local select-all emits the loaded row map, while paginated or remote select-all uses selected=true plus unselected exclusions. Emissions always include selected/originalData and usually data.",
      },
    ],
  },
  {
    id: "row-appearance-and-editing",
    title: "Row appearance and inline editing",
    rows: [
      {
        name: "Zebra rows",
        type: "showZebraRows",
        defaultValue: "true",
        description:
          "Built-in themes visibly alternate rows. false removes per-grid alternation while odd/even hooks remain available to themes. The computed setShowZebraRows method supports boolean and functional updates for uncontrolled grids; controlled showZebraRows stays authoritative.",
      },
      {
        name: "Whole-row styling",
        type: "rowStyle",
        defaultValue: "-",
        description:
          "A CSS object or ({ data, props, style }) callback is merged onto each row. The callback may mutate the Inovua-shaped base style and return undefined; IDs retain their type and remoteRowIndex includes the page offset. column.style stays cell-scoped.",
      },
      {
        name: "Disabled rows",
        type: "disabledRows index map",
        defaultValue: "-",
        description:
          "Truthy current-view indexes receive the Inovua disabled class, 50% opacity, pointer blocking, and aria-disabled. Indexes are recomputed after sorting, filtering, and page slicing. Upstream-compatible header/API selection still includes them.",
      },
      {
        name: "Editing activation",
        type: "editable + editStartEvent",
        defaultValue: "off / dblclick",
        description:
          "Root editing is opt in. Columns can opt in/out or resolve editability; click and double-click aliases select the start gesture.",
      },
      {
        name: "Editors and lifecycle",
        type: "default / editor / renderEditor",
        defaultValue: "text editor",
        description:
          "Editors receive Inovua-shaped props/cell helpers and emit start/value/stop plus complete or cancel payloads. Enter/Shift+Enter traverse rows, Tab/Shift+Tab traverse editable cells, and Escape cancels. Active drafts remain anchored to visible coordinates through controlled row/column reorder, with later payloads resolving the new occupant and no synthetic lifecycle events during reconciliation. Async completion is session-safe and never mutates consumer data.",
      },
      {
        name: "Imperative editing",
        type: "TypeComputedProps",
        defaultValue: "implemented",
        description:
          "startEdit/tryStartEdit return Promises; completeEdit/cancelEdit honor supplied row/column targets with the 5.10.2 current-edit fallback and cross-target lifecycle behavior; getCurrentEditInfo, isInEdit, and currentEditCompletePromise expose live state.",
      },
    ],
  },
  {
    id: "virtualization-mobile-search",
    title: "Virtualization, mobile transform, and optional search",
    rows: [
      {
        name: "Desktop virtualization",
        type: "TanStack Virtual",
        defaultValue: "enabled",
        description:
          "Uses fixed or functional estimates, or measures natural rows with min/max bounds and overscan 10. Resize/content changes repair measured offsets. Disabling virtualization renders all desktop rows; header and filter rows remain intact.",
      },
      {
        name: "Column virtualization",
        type: "horizontal range",
        defaultValue: "15 visible columns with numeric rowHeight",
        description:
          "The inclusive virtualizeColumnsThreshold mounts one overscanned unlocked range shared by header, filter row, and body while preserving total scroll geometry. Locked-start/end columns remain mounted outside that range. virtualizeColumns overrides the threshold. Functional/natural row heights and transformed mobile layout keep columns unvirtualized; far columns remain filterable and editable after scrolling.",
      },
      {
        name: "Mobile transform",
        type: "<= 1024px",
        defaultValue: "opt in",
        description:
          "Replaces the table with measured virtual cards, loaded-row search, one-descriptor sort, and a card-only picker honoring hideable=false/cannot-hide-last without changing desktop visibility/order. Renderers, actions, and selection persist. Root or visible column-level editing disables this transform so the editable table remains available.",
      },
      {
        name: "Standalone mobile search",
        type: "card-local filter",
        defaultValue: "immediate draft + deferred render",
        description:
          "Filters only the already-loaded row model/page. It does not send searchValue or reset outer pagination, so its result count can be page-scoped; it is not server-wide global search.",
      },
      {
        name: "External search connection",
        type: "provider/target",
        defaultValue: "opt in",
        description:
          "A direct provider child connects automatically; RDGSearchTarget marks a nested grid. In mobile mode it suppresses only the duplicate field, not sort/column tools. Its bar—not standalone mobile search—defaults to 150ms debounce.",
      },
      {
        name: "Search matching",
        type: "local index or remote arg",
        defaultValue: "150ms UI debounce",
        description:
          "External local/static search normalizes case/whitespace/diacritics, uses AND terms and exact id/name/header/alias prefixes, raw/searchValue fields, and hidden columns unless opted out. Function sources receive the trimmed query; commit resets skip.",
      },
      {
        name: "External search input behavior",
        type: "RDGSearchBar",
        defaultValue: "150ms",
        description:
          "IME composition is safe; Escape and clear commit immediately. The identity-cached local index is reused until row/column array identity changes, and remote pages are never post-filtered as server-wide results.",
      },
    ],
  },
  {
    id: "themes-ui-i18n",
    title: "Themes, UI behavior, and i18n",
    rows: [
      {
        name: "Theme model",
        type: "default-light / default / light / dark / custom",
        defaultValue: "default-light",
        description:
          "default-light preserves the Inovua-compatible default name and uses a fixed shadcn light base even below a .dark ancestor; default follows a .dark ancestor; light/dark force a base; custom names become data-theme/class hooks and may inherit a suffix-based base. Explicit --tdg-color-* and component tokens remain overrideable.",
      },
      {
        name: "Custom themes",
        type: "--tdg-* tokens under data-theme",
        defaultValue: "CSS variables",
        description:
          'Author a custom theme by assigning --tdg-* tokens under .tdg-root[data-theme="your-theme"] in your own CSS. The grid reads the variables directly, so no Inovua stylesheet or runtime bridge is required.',
      },
      {
        name: "Theme switching",
        type: "deterministic",
        defaultValue: "SSR-friendly",
        description:
          "Setting the theme prop swaps the data-theme attribute on the grid root; every --tdg-* token re-resolves through the CSS cascade with no JavaScript scanning, so switching is deterministic and SSR-safe.",
      },
      {
        name: "Menus and focus",
        type: "Radix/shadcn-style",
        defaultValue: "keyboard operable",
        description:
          "Filter/operator, column, select, and mobile menus use accessible focus, keyboard, Escape, and outside-interaction patterns; sortable headers expose tab focus and aria-sort.",
      },
      {
        name: "Internationalization",
        type: "partial TypeI18n map",
        defaultValue: "English fallbacks",
        description:
          "Known grid, filter, sort, pagination, selection, column-menu, and mobile labels can be overridden individually. Custom operator names are also looked up by key.",
      },
    ],
  },
  {
    id: "imperative-api",
    title: "Imperative API",
    body: (
      <div className="space-y-4 text-sm text-muted-foreground">
        <p>
          The implemented API covers data reload/readout, loading, pagination,
          sorting, filtering, column order/visibility, DOM/focus access, item
          lookup, selection, editing, scrolling/render ranges, localization, the
          filter operator menu, and a virtual-list compatibility adapter.
        </p>
        <p>
          The exact supported-method allowlist is in the{" "}
          <DocsRouteLink
            group="reference"
            slug="types"
            className="font-medium text-foreground underline underline-offset-4"
          >
            TypeComputedProps reference
          </DocsRouteLink>
          .
        </p>
      </div>
    ),
  },
  {
    id: "compatibility-boundary",
    title: "Compatibility boundary",
    body: (
      <Callout title="Unknown API names do not silently succeed">
        <p>
          The Community API is explicit and manifest-backed. Enterprise-only
          features remain outside this gate. See the{" "}
          <DocsRouteLink
            group="migration"
            slug="inovua-status"
            className="font-medium text-foreground underline underline-offset-4"
          >
            living parity ledger
          </DocsRouteLink>{" "}
          for the release evidence and exclusions.
        </p>
      </Callout>
    ),
  },
];

const docsPages: DocsPage[] = [
  {
    group: "getting-started",
    slug: "installation",
    title: "Installation",
    summary:
      "Install the package, understand what ships by default, and choose the right entry point for local development and preview packages.",
    description:
      "the-datagrid ships as a React component library with bundled CSS imported from the package entry. Use the scoped package for both preview and released versions.",
    tags: ["Install", "Package", "Setup"],
    sections: [
      {
        id: "install-package",
        title: "Install the package",
        body: (
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>Install the package and its peer dependencies:</p>
            <CodeBlock
              code={`npm install @geovi/the-datagrid 
yarn add @geovi/the-datagrid
pnpm add @geovi/the-datagrid`}
              language="bash"
            />
            <p>
              The package entry imports the compiled CSS for you. In most app
              setups, you only need to import the component from the package and
              render it.
            </p>
            <p>
              The peer range supports React and React DOM 16.8, 17, 18, and 19.
              CI installs the packed package against an exact release from every
              supported major, compiles its public declarations, and mounts the
              core grid, optional provider entries, mobile layout, and Radix
              menu path. Compatibility shims supply external-store snapshots,
              stable IDs, deferred values, JSX creation, and React DOM flushing
              only where an older React runtime needs them.
            </p>
            <p>
              The published JavaScript bundles its tested Radix, TanStack, icon,
              and utility implementations. Consumers therefore do not install a
              second UI dependency graph; those packages are build-time
              dependencies, while the official external-store shim is the only
              runtime dependency in the published manifest.
            </p>
          </div>
        ),
      },
      {
        id: "preview-builds",
        title: "Preview and release builds",
        body: (
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              The repository publishes preview builds on pushes to main and can
              also publish release builds. If you are testing the latest branch
              behavior, install the preview tag from the scoped package.
            </p>
            <Callout title="Package naming">
              <p>
                The public package name is <code>@geovi/the-datagrid</code>.
                Older markdown notes in the repo used unscoped names; those are
                being replaced by this site.
              </p>
            </Callout>
          </div>
        ),
      },
      {
        id: "next-steps",
        title: "Next steps",
        body: (
          <div className="grid gap-4 md:grid-cols-2">
            <Link
              {...getDocsLinkTarget("getting-started", "quickstart")}
              className="rounded-2xl border bg-background/95 p-4 shadow-sm transition-colors hover:bg-muted/30"
            >
              <div className="text-sm font-semibold">Quickstart</div>
              <p className="mt-2 text-sm text-muted-foreground">
                Build a working grid with filtering, sorting, and checkbox
                selection in one screen.
              </p>
            </Link>
            <Link
              to="/examples"
              className="rounded-2xl border bg-background/95 p-4 shadow-sm transition-colors hover:bg-muted/30"
            >
              <div className="text-sm font-semibold">Examples</div>
              <p className="mt-2 text-sm text-muted-foreground">
                Open the live examples and inspect the source beside the running
                grid.
              </p>
            </Link>
          </div>
        ),
      },
    ],
  },
  {
    group: "getting-started",
    slug: "quickstart",
    title: "Quickstart",
    summary:
      "Create a grid with the minimum stable prop surface, then layer in filtering, selection, and controlled column order.",
    description:
      "This is the shortest route from installation to a working grid. The snippet keeps the prop surface close to the compatibility contract and uses the direct selection setter flow.",
    tags: ["ReactDataGrid", "Quickstart", "Selection"],
    sections: [
      {
        id: "first-grid",
        title: "First grid",
        body: <CodeBlock code={quickstartSnippet} language="tsx" />,
      },
      {
        id: "what-this-shows",
        title: "What this setup already gives you",
        body: (
          <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            <li>
              Inferred filter-row visibility and local array filtering from an
              uncontrolled defaultFilterValue; enableFiltering can explicitly
              show or hide the row.
            </li>
            <li>Local sorting through sortable columns.</li>
            <li>
              Controlled row selection through checkboxColumn and selected.
            </li>
            <li>Predictable column order through columnOrder.</li>
            <li>
              Built-in i18n hooks and theme hooks without external styling
              props.
            </li>
          </ul>
        ),
      },
      {
        id: "useful-links",
        title: "Useful links",
        body: (
          <div className="grid gap-4 md:grid-cols-2">
            <Link
              {...getDocsLinkTarget("reference", "reactdatagrid")}
              className="rounded-2xl border bg-background/95 p-4 shadow-sm transition-colors hover:bg-muted/30"
            >
              <div className="text-sm font-semibold">
                ReactDataGrid reference
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                See every currently shipped prop, its type, and its current
                default behavior.
              </p>
            </Link>
            <Link
              {...getDocsLinkTarget("reference", "icolumn")}
              className="rounded-2xl border bg-background/95 p-4 shadow-sm transition-colors hover:bg-muted/30"
            >
              <div className="text-sm font-semibold">IColumn reference</div>
              <p className="mt-2 text-sm text-muted-foreground">
                Documented field by field, including render and filter hooks.
              </p>
            </Link>
          </div>
        ),
      },
    ],
  },
  {
    group: "getting-started",
    slug: "styling",
    title: "Styling and themes",
    summary:
      "The grid is built to sit naturally in Tailwind and shadcn-style applications while preserving a theme hook for compatibility.",
    description:
      "Use Tailwind token classes and the theme prop as a selector hook. The library is styled internally; consumers should not need extra layout props for basic theming.",
    tags: ["Tailwind", "shadcn", "Theme"],
    sections: [
      {
        id: "styling-model",
        title: "Styling model",
        body: (
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              the-datagrid uses Tailwind utility classes and shadcn-style
              interaction patterns internally. The <code>theme</code> prop is a
              hook, not a second styling system.
            </p>
            <ReferenceTable
              rows={[
                {
                  name: "default",
                  type: "theme value",
                  defaultValue: "yes",
                  description:
                    "Follows the nearest .dark ancestor when one exists.",
                },
                {
                  name: "light / dark",
                  type: "theme value",
                  defaultValue: "-",
                  description: "Force the token base to light or dark.",
                },
                {
                  name: "custom names",
                  type: "theme value",
                  defaultValue: "-",
                  description:
                    "Exposed via data-theme and data-theme-base so apps can target custom schemes.",
                },
              ]}
            />
          </div>
        ),
      },
      {
        id: "built-in-examples",
        title: "Built-in theme examples",
        body: (
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              The examples app exposes the built-in theme variations in the
              header. Use the live examples to preview theme and separator
              combinations.
            </p>
            <Link
              to="/examples/basic"
              className="inline-flex rounded-full border px-3 py-1 text-xs font-medium transition-colors hover:bg-muted/60"
            >
              Open the basic example
            </Link>
          </div>
        ),
      },
      {
        id: "packaged-css",
        title: "Packaged CSS and manual fallbacks",
        body: (
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              Importing <code>@geovi/the-datagrid</code> loads the compiled core
              stylesheet. Importing <code>@geovi/the-datagrid/search</code>
              loads the isolated optional-search stylesheet, and importing{" "}
              <code>@geovi/the-datagrid/toolbar</code> loads the isolated
              toolbar stylesheet. The combined{" "}
              <code>@geovi/the-datagrid/components</code> entry reuses both
              optional entries and their singleton contexts, so it loads both
              isolated styles without duplicating their rules. The public{" "}
              <code>@geovi/the-datagrid/style.css</code> and{" "}
              <code>@geovi/the-datagrid/search/style.css</code> and{" "}
              <code>@geovi/the-datagrid/toolbar/style.css</code>
              subpaths are available when a bundler requires explicit CSS
              imports.
            </p>
            <p>
              Main grid styling is scoped to grid-owned roots, and search styles
              and toolbar styles are scoped to their respective component roots.
              This avoids leaking generic shadcn token aliases into the host
              application.
            </p>
          </div>
        ),
      },
      {
        id: "custom-themes",
        title: "Custom themes (no Inovua)",
        body: (
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              A custom theme is just a set of <code>--tdg-*</code> variables
              scoped to a <code>data-theme</code> value. Pass any name to the{" "}
              <code>theme</code> prop and the grid exposes it on the root as{" "}
              <code>data-theme=&quot;your-theme&quot;</code>; assign the tokens
              under a matching selector in your own CSS. No Inovua stylesheet
              and no runtime bridge is involved, so switching the{" "}
              <code>theme</code> prop re-resolves every token through the CSS
              cascade.
            </p>
            <CodeBlock
              code={`/* ocean-dark.css — imported once by your app, no @inovua import */
.tdg-root[data-theme="ocean-dark"] {
  --tdg-color-background: #0b1f2a;
  --tdg-color-foreground: #e6f1f5;
  --tdg-color-border: #1c3a49;

  --tdg-header-bg: #08161d;
  --tdg-header-border-color: #1c3a49;
  --tdg-cell-border-color: #1c3a49;

  --tdg-row-odd-bg: #0b1f2a;
  --tdg-row-even-bg: #0f2a38;
  --tdg-row-odd-hover-bg: #14384a;
  --tdg-row-even-hover-bg: #14384a;
  --tdg-row-selected-bg: #17506b;
}

/* then: <ReactDataGrid theme="ocean-dark" ... /> */`}
              language="css"
            />
            <p>
              Override only the tokens you care about &mdash; anything you leave
              out falls back to the built-in light or dark base, which is picked
              from the theme-name suffix (a <code>-dark</code> name resolves a
              dark base, <code>-light</code> a light base). The example themes
              in <code>examples/src/themes</code> are authored exactly this way.
            </p>
            <p className="font-medium text-foreground">
              Migrating an Inovua SCSS theme
            </p>
            <p>
              Earlier themes were authored by setting Inovua SCSS variables and
              importing an Inovua theme partial. Delete the <code>@import</code>{" "}
              (the source of the Dart Sass deprecation warning) and the{" "}
              <code>$INOVUA_*</code> variables, and assign the matching{" "}
              <code>--tdg-*</code> tokens under your theme selector instead:
            </p>
            <CodeBlock
              code={`// Before — ikarus-dark.scss (SCSS vars + Inovua import)
$INOVUA_DATAGRID_BG_COLOR: #212121;
$INOVUA_DATAGRID_HEADER_BG: #181818;
$INOVUA_DATAGRID_BORDER_COLOR: #383838;
$INOVUA_DATAGRID_FONT_COLOR: #ffffff;
$INOVUA_DATAGRID_ROW_ODD_BG_COLOR: #282828;
$INOVUA_DATAGRID_ROW_EVEN_BG_COLOR: #343434;
@import "@inovua/reactdatagrid-community/style/theme/default-dark/index.scss";`}
              language="scss"
            />
            <CodeBlock
              code={`/* After — ikarus-dark.css (plain --tdg-* tokens, no import) */
.tdg-root[data-theme="ikarus-dark"] {
  --tdg-color-background: #212121;
  --tdg-color-foreground: #ffffff;
  --tdg-color-border: #383838;
  --tdg-header-bg: #181818;
  --tdg-row-odd-bg: #282828;
  --tdg-row-even-bg: #343434;
}`}
              language="css"
            />
            <p>The commonly used Inovua theme variables map to these tokens:</p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[34rem] border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="py-1.5 pr-4 font-medium text-foreground">
                      Inovua SCSS variable
                    </th>
                    <th className="py-1.5 font-medium text-foreground">
                      the-datagrid token
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(
                    [
                      ["$INOVUA_DATAGRID_BG_COLOR", "--tdg-color-background"],
                      ["$INOVUA_DATAGRID_FONT_COLOR", "--tdg-color-foreground"],
                      ["$INOVUA_DATAGRID_BORDER_COLOR", "--tdg-color-border"],
                      ["$INOVUA_DATAGRID_FONT_SIZE", "--tdg-font-size"],
                      [
                        "$INOVUA_DATAGRID_HEADER_FONT_SIZE",
                        "--tdg-header-font-size",
                      ],
                      [
                        "$INOVUA_DATAGRID_ACCENT_COLOR",
                        "--tdg-color-accent (hover / selection accent)",
                      ],
                      ["$INOVUA_DATAGRID_HEADER_BG", "--tdg-header-bg"],
                      [
                        "$INOVUA_DATAGRID_HEADER_BORDER_COLOR",
                        "--tdg-header-border-color",
                      ],
                      [
                        "$INOVUA_DATAGRID_HEADER_PROXY_BORDER_COLOR",
                        "--tdg-header-proxy-border-color",
                      ],
                      [
                        "$INOVUA_DATAGRID_CELL_BORDER_COLOR",
                        "--tdg-cell-border-color",
                      ],
                      ["$INOVUA_DATAGRID_ROW_ODD_BG_COLOR", "--tdg-row-odd-bg"],
                      [
                        "$INOVUA_DATAGRID_ROW_EVEN_BG_COLOR",
                        "--tdg-row-even-bg",
                      ],
                      [
                        "$INOVUA_DATAGRID_ROW_ODD_HOVER_BG_COLOR",
                        "--tdg-row-odd-hover-bg",
                      ],
                      [
                        "$INOVUA_DATAGRID_ROW_EVEN_HOVER_BG_COLOR",
                        "--tdg-row-even-hover-bg",
                      ],
                      ["$INOVUA_DATAGRID_ROW_INDEX_BG", "--tdg-row-index-bg"],
                      ["$INOVUA_TEXT_INPUT_BG_COLOR", "--tdg-input-bg"],
                      [
                        "$INOVUA_TEXT_INPUT_BORDER_COLOR",
                        "--tdg-input-border-color",
                      ],
                      [
                        "$INOVUA_TEXT_INPUT_BORDER_COLOR_HOVER",
                        "--tdg-input-border-color-hover",
                      ],
                      [
                        "$INOVUA_TEXT_INPUT_BORDER_COLOR_FOCUSED",
                        "--tdg-input-border-color-focus",
                      ],
                      ["$INOVUA_COMBO_BOX_BG", "--tdg-select-bg"],
                      ["$INOVUA_COMBO_BOX_LIST_BG", "--tdg-select-list-bg"],
                      [
                        "$INOVUA_COMBO_BOX_BORDER_COLOR",
                        "--tdg-select-border-color",
                      ],
                      [
                        "$INOVUA_COMBO_BOX_HOVER_BORDER_COLOR",
                        "--tdg-select-border-color-hover",
                      ],
                      [
                        "$INOVUA_COMBO_BOX_FOCUSED_BORDER_COLOR",
                        "--tdg-select-border-color-focus",
                      ],
                      [
                        "$INOVUA_COMBO_BOX_SELECTED_ITEM_BACKGROUND",
                        "--tdg-select-item-selected-bg",
                      ],
                      [
                        "$INOVUA_COMBO_BOX_HOVER_ITEM_BACKGROUND",
                        "--tdg-select-item-hover-bg",
                      ],
                      [
                        "$INOVUA_DATAGRID_COLUMN_HEADER_RESIZER_CONSTRAINED_COLOR",
                        "--tdg-column-header-resizer-constrained-color",
                      ],
                      [
                        "$INOVUA_CHECKBOX_PRIMARY_COLOR",
                        "--tdg-checkbox-checked-bg / --tdg-checkbox-checked-border-color",
                      ],
                      [
                        "(selected rows)",
                        "--tdg-row-selected-bg, --tdg-row-odd-selected-bg, --tdg-row-even-selected-bg",
                      ],
                      [
                        "(filter row)",
                        "--tdg-filter-bg, --tdg-filter-color, --tdg-filter-border-color",
                      ],
                      [
                        "(menus / dropdowns)",
                        "--tdg-dropdown-bg, --tdg-dropdown-color, --tdg-dropdown-border-color",
                      ],
                    ] as const
                  ).map(([from, to]) => (
                    <tr key={from} className="border-b border-border/60">
                      <td className="py-1.5 pr-4 font-mono">{from}</td>
                      <td className="py-1.5 font-mono">{to}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>
              <code>$DATAGRID_THEME_NAME</code> and one-off helper variables
              such as <code>$HEADER</code> have no token &mdash; the theme name
              is now simply the value passed to the <code>theme</code> prop
              (exposed as <code>data-theme</code>). Any color the table does not
              list can be set through the corresponding <code>--tdg-*</code>{" "}
              token from the styling reference.
            </p>
            <p className="font-medium text-foreground">
              Four things that surprise people when migrating
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong>
                  Colors your SCSS never declared still had a value.
                </strong>{" "}
                Anything a theme left unset came from the Inovua preset it
                imported, not from a default of your own. A theme that only set{" "}
                <code>$INOVUA_DATAGRID_BORDER_COLOR</code>, for example, still
                got the preset&apos;s own (different) cell gridline color. When
                porting, check the rendered result rather than only the
                variables you wrote.
              </li>
              <li>
                <strong>Hover and selection were derived, not declared.</strong>{" "}
                Inovua painted item and row hover as the accent color at{" "}
                <code>15%</code> opacity and selection at <code>25%</code>, over
                whatever surface sat beneath. The grid&apos;s tokens are opaque,
                so use the composited result (or a pre-tinted pale accent)
                &mdash; assigning the full-strength accent makes hovers far too
                heavy.
              </li>
              <li>
                <strong>
                  Gridlines and the grid frame are separate tokens.
                </strong>{" "}
                <code>--tdg-cell-border-color</code> draws the cell gridlines on
                both axes, while <code>--tdg-grid-border-color</code> draws the
                outer frame, locked-column separators, footer, and pagination.
                They are often the same color, but they do not have to be.
              </li>
              <li>
                <strong>Inputs and selects follow the grid border.</strong>{" "}
                Control borders intentionally use the grid&apos;s border chrome
                rather than the legacy toolkit&apos;s own control border, so a
                theme cannot quietly take over hover and focus rings. Set{" "}
                <code>--tdg-input-border-color</code> /{" "}
                <code>--tdg-select-border-color</code> to your grid border color
                unless you deliberately want them to differ.
              </li>
            </ul>
            <p className="font-medium text-foreground">
              Base theme defaults (copy to start a new theme)
            </p>
            <p>
              <code>light</code> and <code>dark</code> ship built in &mdash; use{" "}
              <code>theme=&quot;light&quot;</code> or{" "}
              <code>theme=&quot;dark&quot;</code> directly and skip the CSS. The
              palettes below are the same defaults, provided so you can fork one
              into your own <code>data-theme</code>. Header, filter row, and
              zebra striping derive automatically from the core{" "}
              <code>--tdg-color-*</code> tokens, so a neutral theme only needs
              these.
            </p>
            <CodeBlock
              code={`/* Light base — identical to the built-in \`light\` theme */
.tdg-root[data-theme="my-light"] {
  --tdg-color-background: oklch(1 0 0);
  --tdg-color-foreground: oklch(0.145 0 0);
  --tdg-color-card: oklch(1 0 0);
  --tdg-color-card-foreground: oklch(0.145 0 0);
  --tdg-color-popover: oklch(1 0 0);
  --tdg-color-popover-foreground: oklch(0.145 0 0);
  --tdg-color-primary: oklch(0.205 0 0);
  --tdg-color-primary-foreground: oklch(0.985 0 0);
  --tdg-color-secondary: oklch(0.97 0 0);
  --tdg-color-secondary-foreground: oklch(0.205 0 0);
  --tdg-color-muted: oklch(0.97 0 0);
  --tdg-color-muted-foreground: oklch(0.556 0 0);
  --tdg-color-accent: oklch(0.97 0 0);
  --tdg-color-accent-foreground: oklch(0.205 0 0);
  --tdg-color-destructive: oklch(0.577 0.245 27.325);
  --tdg-color-border: oklch(0.922 0 0);
  --tdg-color-input: oklch(0.922 0 0);
  --tdg-color-ring: oklch(0.708 0 0);
}`}
              language="css"
            />
            <CodeBlock
              code={`/* Dark base — identical to the built-in \`dark\` theme's fallback palette */
.tdg-root[data-theme="my-dark"] {
  --tdg-color-background: oklch(0.145 0 0);
  --tdg-color-foreground: oklch(0.985 0 0);
  --tdg-color-card: oklch(0.205 0 0);
  --tdg-color-card-foreground: oklch(0.985 0 0);
  --tdg-color-popover: oklch(0.205 0 0);
  --tdg-color-popover-foreground: oklch(0.985 0 0);
  --tdg-color-primary: oklch(0.922 0 0);
  --tdg-color-primary-foreground: oklch(0.205 0 0);
  --tdg-color-secondary: oklch(0.269 0 0);
  --tdg-color-secondary-foreground: oklch(0.985 0 0);
  --tdg-color-muted: oklch(0.269 0 0);
  --tdg-color-muted-foreground: oklch(0.708 0 0);
  --tdg-color-accent: oklch(0.269 0 0);
  --tdg-color-accent-foreground: oklch(0.985 0 0);
  --tdg-color-destructive: oklch(0.704 0.191 22.216);
  --tdg-color-border: oklch(1 0 0 / 10%);
  --tdg-color-input: oklch(1 0 0 / 15%);
  --tdg-color-ring: oklch(0.556 0 0);
}`}
              language="css"
            />
            <p>
              The <strong>amber</strong> base is the one worth copying in full:
              it is not built in, and its warm zebra rows do not derive from a
              neutral background. These values mirror Inovua&apos;s{" "}
              <code>amber-light</code> theme.
            </p>
            <CodeBlock
              code={`/* Amber base — mirrors Inovua's amber-light theme */
.tdg-root[data-theme="my-amber"] {
  --tdg-color-background: #ffffff;
  --tdg-color-foreground: #555e68;
  --tdg-color-border: #e4e3e2;
  /* pale accent drives control hovers; solid amber stays on the checkbox */
  --tdg-color-accent: #f7f3e5;

  --tdg-header-bg: #ffffff;
  --tdg-header-border-color: #e4e3e2;
  --tdg-cell-border-color: #e4e3e2;

  --tdg-row-odd-bg: #f8f8f8;
  --tdg-row-even-bg: #ffffff;
  --tdg-row-odd-hover-bg: #f7f3e5;
  --tdg-row-even-hover-bg: #f7f3e5;
  --tdg-row-selected-bg: #ece5cf;
  --tdg-row-odd-selected-bg: #ece5cf;
  --tdg-row-even-selected-bg: #ece5cf;

  /* controls follow the grid's border chrome, not their own accent */
  --tdg-input-bg: #ffffff;
  --tdg-input-border-color: #e4e3e2;
  --tdg-select-bg: #ffffff;
  --tdg-select-border-color: #e4e3e2;

  --tdg-checkbox-checked-bg: #caae53;
  --tdg-checkbox-checked-border-color: #caae53;
  --tdg-checkbox-checked-color: #e8e8e8;
}`}
              language="css"
            />
            <p className="font-medium text-foreground">Font size</p>
            <p>
              The grid&apos;s type scale is controlled by two tokens (the
              equivalents of Inovua&apos;s{" "}
              <code>$INOVUA_DATAGRID_FONT_SIZE</code> /{" "}
              <code>$INOVUA_DATAGRID_HEADER_FONT_SIZE</code>). Cells inherit{" "}
              <code>--tdg-font-size</code>; the header can be sized separately:
            </p>
            <CodeBlock
              code={`.tdg-root[data-theme="my-theme"] {
  --tdg-font-size: 0.875rem;        /* whole grid (cells, filters, controls) */
  --tdg-header-font-size: 0.875rem; /* column header only */
}`}
              language="css"
            />
          </div>
        ),
      },
    ],
  },
  {
    group: "guides",
    slug: "local-data",
    title: "Guide: local data sources",
    summary:
      "When dataSource is an array, filtering and sorting happen client-side with no extra plumbing.",
    description:
      "This is the easiest integration path and the default for most dashboards. Use it when all rows are already in memory and you want the grid to own the client-side transforms.",
    tags: ["Guide", "Local data", "Filtering"],
    sections: [
      {
        id: "local-behavior",
        title: "Behavior",
        body: (
          <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            <li>
              Active uncontrolled defaultFilterValue entries apply local filter
              operators against the array. enableFiltering controls whether the
              filter row is visible, including an explicit false that leaves an
              existing default filter active.
            </li>
            <li>
              Controlled filterValue describes externally owned state for Inovua
              5.10.2 parity and is not applied to a local array a second time.
              Apply that state in the parent or use a function-backed
              dataSource.
            </li>
            <li>
              Uncontrolled/default sortInfo applies local sorting against the
              same array. Controlled sortInfo owns indicators and callbacks
              without reordering consumer data.
            </li>
            <li>
              Optional global search runs before column filters and sorting.
            </li>
            <li>
              filteredRowsCount receives the combined post-search, post-filter
              row count before local slicing. Standalone mobile-card search is
              the exception: it filters already-loaded rows and may report a
              page-scoped displayed count.
            </li>
            <li>
              Pagination slices the filtered/sorted array when enabled locally.
            </li>
          </ul>
        ),
      },
      {
        id: "local-example",
        title: "Live example",
        body: (
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              The basic example is the compact reference for local rows plus the
              core grid features.
            </p>
            <Link
              to="/examples/basic"
              className="inline-flex rounded-full border px-3 py-1 text-xs font-medium transition-colors hover:bg-muted/60"
            >
              Open the basic example
            </Link>
          </div>
        ),
      },
    ],
  },
  {
    group: "guides",
    slug: "table-search",
    title: "Guide: optional table search",
    summary:
      "Add a global search bar to normal table layouts without putting search UI or context subscriptions into every grid.",
    description:
      "The search package is a separate provider entry point that reuses the exact core search field and engine used by mobile. Import it only for screens that need global row search, then connect direct grid children automatically or mark a nested grid explicitly.",
    tags: ["Guide", "Search", "Performance"],
    sections: [
      {
        id: "opt-in-search",
        title: "Opt in from the search entry",
        body: (
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              Import the grid from the main package and search UI from{" "}
              <code>@geovi/the-datagrid/search</code>. A plain grid does not
              render a hidden search control, subscribe to the search context,
              or load the optional provider, store, or search stylesheet. The
              entry reuses the field already present for transformed-mobile
              grids instead of shipping another component implementation.
            </p>
            <CodeBlock code={tableSearchSnippet} language="tsx" />
            <p>
              The provider recognizes a marked <code>ReactDataGrid</code> when
              it is a direct child. No search-specific prop is added to the
              public <code>TypeDataGridProps</code> surface.
            </p>
          </div>
        ),
      },
      {
        id: "nested-targets",
        title: "Target a grid through layout markup",
        body: (
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              If a section, card, suspense boundary, or other component sits
              between the provider and grid, wrap the grid in{" "}
              <code>RDGSearchTarget</code>. This makes the intended target
              explicit without moving search state into the grid props.
            </p>
            <CodeBlock code={nestedTableSearchSnippet} language="tsx" />
            <p>
              See{" "}
              <DocsRouteLink
                group="reference"
                slug="providers-and-targets"
                className="font-medium text-foreground underline underline-offset-4"
              >
                Providers and targets
              </DocsRouteLink>{" "}
              for the complete direct-child decision table, Fragment and
              Suspense rules, and multiple-grid scoping guidance.
            </p>
            <Callout title="Provider scope">
              <p>
                A search bar updates targets in its nearest provider. Use
                separate providers when two tables need independent queries.
              </p>
              <p>
                With <code>allowMobileTransform</code>, the connected external
                bar remains the single search control. The mobile list keeps its
                sort and column tools but suppresses only the second placement
                of that same shared field.
              </p>
            </Callout>
          </div>
        ),
      },
      {
        id: "matching-and-columns",
        title: "Matching and column fields",
        body: (
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              Local arrays and bare Promise snapshots under disabled or
              explicitly local pagination use the shared case-, whitespace-, and
              diacritic-insensitive matching engine. Multiple terms use AND
              semantics. Prefix a query with a column id, name, string header,
              or configured alias to scope it, such as <code>city:paris</code>.
              Function data sources receive the committed{" "}
              <code>searchValue</code> and own remote matching.
            </p>
            <CodeBlock code={searchColumnsSnippet} language="tsx" />
            <p>
              Search indexes raw column values rather than rendered DOM text.
              Configured columns remain searchable when hidden. Use{" "}
              <code>searchValue</code> for nested or derived content, and{" "}
              <code>{"searchable={false}"}</code> for fields that must be
              excluded.
            </p>
            <Callout title="Immutable inputs keep the index fast and fresh">
              <p>
                Local search builds its normalized index lazily and reuses it
                while the row and column arrays retain their identity. Replace
                those arrays when searchable row data or column configuration
                changes so the cache is invalidated naturally.
              </p>
            </Callout>
          </div>
        ),
      },
      {
        id: "search-bar-props",
        title: "RDGSearchBar props",
        body: (
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              The input commits its query after 150 ms by default. Set{" "}
              <code>{"debounceMs={0}"}</code> for an immediate commit or pass a
              different delay for a remote screen. Its Input/Button markup,
              recognized-prefix highlight, IME behavior, Escape handling, and
              clear/refocus interaction are identical to mobile because both
              placements render the same internal component.
            </p>
            <ReferenceTable
              rows={[
                {
                  name: "ariaLabel",
                  type: "string",
                  defaultValue: '"Search all fields"',
                  description: "Accessible name for the search input.",
                },
                {
                  name: "placeholder",
                  type: "string",
                  defaultValue: '"Search all fields"',
                  description: "Placeholder shown while the query is empty.",
                },
                {
                  name: "clearLabel",
                  type: "string",
                  defaultValue: '"Clear search"',
                  description:
                    "Accessible label and title for the clear action.",
                },
                {
                  name: "debounceMs",
                  type: "number",
                  defaultValue: "150",
                  description: "Delay before the draft query is committed.",
                },
                {
                  name: "autoFocus",
                  type: "boolean",
                  defaultValue: "false",
                  description: "Requests input focus when the bar mounts.",
                },
              ]}
            />
            <ReferenceTable
              rows={[
                {
                  name: "RDGSearchProvider.defaultValue",
                  type: "string",
                  defaultValue: '""',
                  description:
                    "Initial committed query for every target in this provider.",
                },
                {
                  name: "RDGSearchTarget.children",
                  type: "ReactElement<TypeDataGridProps>",
                  defaultValue: "required",
                  description:
                    "The single nested ReactDataGrid element to connect to the nearest provider.",
                },
              ]}
            />
          </div>
        ),
      },
      {
        id: "data-source-semantics",
        title: "Local, Promise, and remote semantics",
        body: (
          <div className="space-y-4 text-sm text-muted-foreground">
            <ul className="list-disc space-y-2 pl-5">
              <li>
                Local arrays are searched before ordinary column filters,
                sorting, filteredRowsCount, and local pagination.
              </li>
              <li>
                With <code>pagination=true</code> or <code>"remote"</code>,
                every Promise result is an authoritative remote page. Explicit{" "}
                <code>"local"</code> pagination opts the resolved result into
                local slicing; bare arrays retain local composition when
                pagination is disabled.
              </li>
              <li>
                Function data sources receive the committed query as the
                optional <code>searchValue</code> field and own remote search
                plus the authoritative returned count.
              </li>
              <li>
                A committed query resets local or remote pagination to{" "}
                <code>skip: 0</code> before loading the result.
              </li>
            </ul>
            <CodeBlock code={remoteSearchSnippet} language="tsx" />
            <Callout title="Server-wide search remains server-owned">
              <p>
                The grid does not post-filter one returned remote page and
                present it as a server-wide result. Implement{" "}
                <code>searchValue</code> in the function data source, or keep
                search application-owned until that backend contract exists.
              </p>
            </Callout>
          </div>
        ),
      },
      {
        id: "live-example",
        title: "Live example",
        body: (
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              The Basic example opts into search over 1,000 local rows while
              preserving the normal virtualized table layout.
            </p>
            <Link
              to="/examples/basic"
              className="inline-flex rounded-full border px-3 py-1 text-xs font-medium transition-colors hover:bg-muted/60"
            >
              Open the searchable Basic example
            </Link>
          </div>
        ),
      },
    ],
  },
  {
    group: "guides",
    slug: "remote-data",
    title: "Guide: remote data sources",
    summary:
      "Function-based data sources receive the stable grid state object so your backend can own filtering, sorting, and pagination.",
    description:
      "Use remote data sources when the server is authoritative or the row set is too large for full client-side loading.",
    tags: ["Guide", "Remote data", "API"],
    sections: [
      {
        id: "remote-args",
        title: "Remote args",
        body: (
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>The current grid state is sent to your dataSource function.</p>
            <CodeBlock code={remoteDataSnippet} language="tsx" />
            <Callout title="How remote mode is inferred">
              <p>
                the-datagrid does not use separate <code>remoteSort</code>,{" "}
                <code>remoteFilter</code>, or <code>remotePagination</code>{" "}
                flags. Remote behavior is inferred from <code>dataSource</code>
                and the active pagination mode.
              </p>
            </Callout>
          </div>
        ),
      },
      {
        id: "remote-notes",
        title: "Practical notes",
        body: (
          <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            <li>
              Function data sources always receive sortInfo and filterValue.
            </li>
            <li>
              A grid connected to RDGSearchProvider also sends the committed
              trimmed query as searchValue. The function owns search and its
              authoritative count.
            </li>
            <li>
              pagination=true or remote sends skip/limit and does not reslice
              returned rows. local omits those args and slices locally. A new
              external search requests skip 0.
            </li>
            <li>
              columns and columnOrder are passed so the server can understand
              the current user-facing grid shape: columns are visible/ordered
              and order is normalized. The synthetic checkbox column is removed
              from both values.
            </li>
            <li>
              pagination=true/remote treats both Promise arrays and
              count-bearing Promise objects as authoritative pages. Explicit
              local pagination slices the full resolved result; bare arrays
              retain local composition when pagination is disabled.
            </li>
            <li>
              A function may return rows synchronously, or a Promise of rows or
              a {`{ data, count }`} object when total count differs from the
              current slice. Synchronous {`{ data, count }`} returns are part of
              the public type.
            </li>
            <li>
              Requests are sequenced: only the latest async result may commit,
              so a slower stale response cannot overwrite newer state.
            </li>
            <li>
              Rejected functions and Promises are contained because there is no
              public error callback. The last committed rows remain visible and
              the matching automatic loading state is cleared. Function args
              receive an AbortSignal that fires on replacement/unmount; the
              latest-request guard still protects against sources that ignore
              it. An explicit loading prop overrides displayed automatic state.
            </li>
            <li>
              filteredRowsCount is deduplicated. It reports again only when the
              numeric post-filter count changes.
            </li>
            <li>
              Invalid resolved shapes become empty rows. Non-finite object
              counts fall back to data.length.
            </li>
          </ul>
        ),
      },
    ],
  },
  {
    group: "guides",
    slug: "filtering-and-sorting",
    title: "Guide: filtering and sorting",
    summary:
      "The grid separates filter state and sort state cleanly, whether data is local or remote.",
    description:
      "Use the uncontrolled defaults for simple screens or lift the state into your host app for URL sync, saved views, or server requests.",
    tags: ["Guide", "Filtering", "Sorting"],
    sections: [
      {
        id: "state-models",
        title: "State models",
        body: (
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              Filtering uses <code>TypeFilterValue</code>; sorting uses{" "}
              <code>TypeSortInfo</code>. Both support controlled and
              uncontrolled flows.
            </p>
            <CodeBlock
              code={`const [filterValue, setFilterValue] = useState<TypeFilterValue>(null);
const [sortInfo, setSortInfo] = useState<TypeSortInfo>(null);

<ReactDataGrid
  ...
  filterValue={filterValue}
  onFilterValueChange={setFilterValue}
  sortInfo={sortInfo}
  onSortInfoChange={setSortInfo}
/>;`}
              language="tsx"
            />
          </div>
        ),
      },
      {
        id: "column-level-hooks",
        title: "Column-level hooks",
        body: (
          <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            <li>
              Sorting is enabled by default. The root <code>sortable</code> prop
              sets the grid-wide policy, and an explicit{" "}
              <code>column.sortable</code> value overrides it.
            </li>
            <li>
              Use <code>filterable</code>, <code>filterType</code>, and{" "}
              <code>filterEditor</code> to shape each filter cell.
            </li>
            <li>
              Use <code>enableColumnFilterContextMenu</code> to expose operator,
              Enable/Disable, Clear, and Clear All actions.
            </li>
          </ul>
        ),
      },
      {
        id: "filter-commit-semantics",
        title: "Filter commit semantics",
        body: (
          <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            <li>
              Text/editor changes update the draft immediately and commit after
              the column&apos;s filterDelay, or 250ms by default. false and 0
              commit immediately.
            </li>
            <li>
              Operator changes and clear actions commit immediately. Every edit
              requests skip 0; controlled pagination resets only when the host
              applies onSkipChange(0).
            </li>
            <li>
              Clearing keeps the descriptor and its existing activation state
              while resetting only its value. Inactive and empty ordinary
              entries are skipped by local filtering.
            </li>
            <li>
              empty and notEmpty run without an input while their descriptor is
              enabled. Custom filterEditor components receive
              descriptor/value/change, column identity, disabled state, theme,
              localization, cell context, and the original filterEditorProps.
              Function-valued editor props can resolve individual range inputs.
              Without one, only select + options gets a select UI; use exported
              DateFilter/NumberFilter/SelectFilter explicitly.
            </li>
          </ul>
        ),
      },
      {
        id: "sort-interactions",
        title: "Sort interactions",
        body: (
          <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            <li>
              Click, Enter, and Space use the same deterministic toggle. The
              default cycle is ascending, descending, then unsorted when
              allowUnsort is true.
            </li>
            <li>
              An object-valued sort state is single-sort. An array-valued state
              remains multi-sort through click, Enter, Space, menu, mobile, and
              imperative actions without requiring Shift. Descriptor order is
              priority, and toggling an existing descriptor keeps its position.
            </li>
            <li>
              defaultSortingDirection chooses the first direction, sortName can
              redirect the field key, and every sort requests skip 0. Controlled
              pagination must honor onSkipChange(0).
            </li>
            <li>
              Local comparator priority is column.sort, descriptor fn,
              sortFunctions[column.type], then built-in number/date/string
              behavior. Named comparators receive values plus both rows and the
              effective descriptor; id-only comparators receive the complete
              rows as values.
            </li>
          </ul>
        ),
      },
      {
        id: "built-in-filter-types",
        title: "Built-in filter types",
        body: (
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              The complete operator registry, default-operator behavior,
              custom-registry merge rules, and bool/boolean defaults are
              catalogued in the{" "}
              <DocsRouteLink
                group="reference"
                slug="implemented-surface"
                className="font-medium text-foreground underline underline-offset-4"
              >
                implemented-surface filtering section
              </DocsRouteLink>
              .
            </p>
          </div>
        ),
      },
    ],
  },
  {
    group: "guides",
    slug: "locked-columns",
    title: "Guide: locked columns and row actions",
    summary:
      "Keep identity or action columns visible at a horizontal edge with the Inovua-shaped column.locked field.",
    description:
      "Use this opt-in extension for pinned row actions while keeping its deliberately narrower compatibility boundary explicit.",
    tags: ["Guide", "Columns", "Actions", "Enterprise extension"],
    sections: [
      {
        id: "locked-actions-example",
        title: "Lock an actions column to the end",
        body: (
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              Set <code>locked: &quot;end&quot;</code> on the column itself. No
              root grid prop or application CSS override is required.
            </p>
            <CodeBlock
              code={`import ReactDataGrid, { type TypeColumns } from "@geovi/the-datagrid";

const columns: TypeColumns = [
  { name: "account", header: "Account", defaultWidth: 260 },
  { name: "owner", header: "Owner", defaultWidth: 220 },
  {
    name: "actions",
    header: "Actions",
    defaultWidth: 180,
    locked: "end",
    sortable: false,
    filterable: false,
    render: ({ data }) => (
      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => openAccount(data.id)}>
          Open
        </button>
        <button type="button" onClick={() => archiveAccount(data.id)}>
          Archive
        </button>
      </div>
    ),
  },
];

<ReactDataGrid
  idProperty="id"
  columns={columns}
  dataSource={rows}
  virtualized
  virtualizeColumns
/>;`}
              language="tsx"
            />
            <p>
              <code>true</code> is an alias for <code>&quot;start&quot;</code>.
              Multiple locked columns are supported on either edge, and their
              relative declaration or <code>columnOrder</code> order is
              preserved inside that section.
            </p>
          </div>
        ),
      },
      {
        id: "runtime-behavior",
        title: "Runtime behavior",
        body: (
          <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            <li>
              Locked header, filter-row, and body cells use the same computed
              offsets and remain aligned while scrolling.
            </li>
            <li>
              Horizontal column virtualization slices only the unlocked middle
              range; locked-start and locked-end columns remain mounted.
            </li>
            <li>
              Width, min/max constraints, mouse/touch/keyboard resizing, and
              live resizing use the normal column sizing contract.
            </li>
            <li>
              Drag reordering is allowed only inside the same start, unlocked,
              or end section. A cross-section drop is rejected.
            </li>
            <li>
              Computed API and <code>rowStyle</code> metadata report the live
              locked arrays, section indexes, presence flags, and logical
              allocated widths. Browser-distributed surplus width in an
              underfilled stretched table is not included in those metrics.
            </li>
          </ul>
        ),
      },
      {
        id: "compatibility-boundary",
        title: "Compatibility boundary",
        body: (
          <div className="space-y-4 text-sm text-muted-foreground">
            <Callout
              title="Enterprise-derived extension, not complete Inovua parity"
              tone="warning"
            >
              <p>
                Inovua marks locked columns as an Enterprise feature, so this
                capability is outside this package&apos;s Community 5.10.2
                compatibility gate. The shared Inovua vocabulary is used to make
                migrations familiar, but only the declarative{" "}
                <code>column.locked</code> contract is implemented today.
              </p>
              <p>
                Unsupported: <code>column.defaultLocked</code>,{" "}
                <code>column.lockable</code>, <code>column.autoLock</code>, root{" "}
                <code>onColumnLockedChange</code> and{" "}
                <code>showColumnMenuLockOptions</code>, imperative{" "}
                <code>setColumnLocked</code>, lock/unlock menu actions,
                cross-section dragging that mutates lock state, and RTL edge
                mirroring.
              </p>
            </Callout>
            <p>
              Declare the target section in the column definition up front.
              Changing a column&apos;s locked section at runtime is not a
              supported contract yet, and a rejected cross-section drag does not
              change controlled application state.
            </p>
            <p>
              Lock grouping affects rendered order only. Controlled{" "}
              <code>columnOrder</code>, its callback, and remote data-source
              arguments retain the application-owned sequence; read each
              column&apos;s <code>locked</code> field to determine its rendered
              section.
            </p>
          </div>
        ),
      },
      {
        id: "live-example",
        title: "Live example",
        body: (
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              The Actions example combines a right-locked action column with a
              filter row, horizontal virtualization, resizing, selection, and
              real row mutations.
            </p>
            <Link
              to="/examples/actions"
              className="inline-flex rounded-full border px-3 py-1 text-xs font-medium transition-colors hover:bg-muted/60"
            >
              Open the locked actions example
            </Link>
          </div>
        ),
      },
    ],
  },
  {
    group: "guides",
    slug: "stacked-columns",
    title: "Guide: stacked and nested columns",
    summary:
      "Build Inovua-compatible multi-row headers with root groups, nested parents, custom content, controlled reordering, and proportional group resizing.",
    description:
      "Column groups are derived from the current visible leaf order, so their header depth and geometry stay coherent with filtering, sorting, visibility, resizing, and horizontal virtualization.",
    tags: ["Guide", "Columns", "Inovua", "Virtualization"],
    sections: [
      {
        id: "declare-groups",
        title: "Declare root and nested groups",
        body: (
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              A leaf column joins its nearest group with{" "}
              <code>column.group</code>. A group joins a parent with{" "}
              <code>groups[].group</code>. Parent chains may be as deep as the
              header needs; the grid derives the live row count from visible
              columns.
            </p>
            <CodeBlock
              code={`import ReactDataGrid, {
  type TypeColumnGroup,
  type TypeColumns,
} from "@geovi/the-datagrid";

const groups: TypeColumnGroup[] = [
  {
    name: "profile",
    header: ({ columnIds, split }) => (
      <span>
        Customer profile · {columnIds.length}
        {split ? " (split)" : ""}
      </span>
    ),
  },
  { name: "identity", header: "Identity", group: "profile" },
  { name: "contact", header: "Contact", group: "profile" },
];

const columns: TypeColumns = [
  { name: "id", header: "ID", group: "identity", defaultWidth: 90 },
  { name: "name", header: "Name", group: "identity", defaultWidth: 180 },
  { name: "email", header: "Email", group: "contact", defaultWidth: 240 },
  { name: "city", header: "City", group: "contact", defaultWidth: 150 },
];

<ReactDataGrid
  idProperty="id"
  columns={columns}
  groups={groups}
  dataSource={rows}
  virtualized
/>;`}
              language="tsx"
            />
            <p>
              <code>header</code> accepts a React node or callback. The callback
              receives group depth, segment index/count, split state, logical
              and rendered widths, leaf IDs/definitions, and the computed grid
              API. <code>headerClassName</code>, <code>headerStyle</code>, and{" "}
              <code>headerDOMProps</code> accept static values or the same live
              payload.
            </p>
          </div>
        ),
      },
      {
        id: "split-and-controlled-order",
        title: "Split groups and controlled order",
        body: (
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              Group headers are projections of the visible leaf order. If a
              reorder places an unrelated column between two siblings, the
              logical group renders as two segments. Moving the siblings
              together rejoins it automatically; consumer definitions are never
              mutated.
            </p>
            <CodeBlock
              code={`const [columnOrder, setColumnOrder] = useState([
  "id",
  "name",
  "email",
  "city",
]);

<ReactDataGrid
  idProperty="id"
  columns={columns}
  groups={groups}
  dataSource={rows}
  columnOrder={columnOrder}
  onColumnOrderChange={setColumnOrder}
  allowGroupSplitOnReorder
/>;`}
              language="tsx"
            />
            <p>
              Leaf dragging emits one proposed order. Dragging a group segment
              moves all of its leaf IDs as one ordered block and also emits one
              proposal. A controlled <code>columnOrder</code> remains
              authoritative: the DOM changes only after the parent returns the
              proposal.
            </p>
            <p>
              <code>allowGroupSplitOnReorder</code> defaults to true, matching
              Community 5.10.2. When false, leaf drops must stay inside the same
              complete group path, and a group segment may move only within its
              current parent at that depth.
            </p>
          </div>
        ),
      },
      {
        id: "resize-and-virtualization",
        title: "Resize and virtualize safely",
        body: (
          <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            <li>
              Drag a group&apos;s trailing-edge handle to scale its resizable
              leaf widths proportionally. Every leaf honors its own min/max
              bounds.
            </li>
            <li>
              Group resize uses the normal ownership contract: controlled column
              widths remain prop-owned, while uncontrolled widths persist
              internally. Each leaf emits <code>onColumnResize</code>, followed
              by one <code>onBatchColumnResize</code> transaction.
            </li>
            <li>
              Focus a group resize handle and use Arrow Left/Right for 10px
              total-width adjustments.
            </li>
            <li>
              Horizontal virtualization mounts only the active group fragments
              and leaf cells while spacer geometry preserves the full scroll
              width. Header, filter, and body columns share the same rendered
              range.
            </li>
            <li>
              Hiding a leaf recomputes its ancestors&apos; spans and widths.
              Sorting and filtering transform rows only and do not disturb the
              group hierarchy.
            </li>
          </ul>
        ),
      },
      {
        id: "live-example",
        title: "Live example",
        body: (
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              The stacked-columns example includes three nested levels, a custom
              header callback, split/rejoin controls, controlled-order
              inspection, visibility, pointer/keyboard group resize, filtering,
              sorting, and 43 horizontally virtualized columns.
            </p>
            <Link
              to="/examples/stacked-columns"
              className="inline-flex rounded-full border px-3 py-1 text-xs font-medium transition-colors hover:bg-muted/60"
            >
              Open the stacked columns example
            </Link>
          </div>
        ),
      },
    ],
  },
  {
    group: "guides",
    slug: "selection",
    title: "Guide: selection",
    summary:
      "Checkbox selection follows the Inovua mental model while still working cleanly with modern React state setters.",
    description:
      "The grid emits a wrapper object on selection changes, but it also accepts that wrapper back through selected so existing setter-based integrations keep working.",
    tags: ["Guide", "Selection", "Compatibility"],
    sections: [
      {
        id: "selection-flow",
        title: "Selection flow",
        body: (
          <div className="space-y-4 text-sm text-muted-foreground">
            <CodeBlock code={selectionSnippet} language="tsx" />
            <Callout title="Compatibility note">
              <p>
                This is intentionally forgiving. You can still unwrap{" "}
                <code>config.selected</code> manually if your screen wants to
                persist only the raw selection map.
              </p>
              <p>
                Row-id object maps and Inovua&apos;s{" "}
                <code>selected === true</code> plus <code>unselected</code>{" "}
                exclusions are both supported.
              </p>
            </Callout>
          </div>
        ),
      },
      {
        id: "selection-interactions",
        title: "Interaction rules",
        body: (
          <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            <li>
              enableSelection has explicit precedence. When omitted, selected,
              defaultSelected, or checkboxColumn enables selection;
              onSelectionChange alone does not. With checkboxColumn enabled,
              multiSelect defaults to true for uncontrolled state, while
              checkboxOnlyRowSelect defaults to false.
            </li>
            <li>
              Shift-click selects the contiguous range from the most recent row
              anchor through the current row. checkboxSelectEnableShiftKey
              enables the same behavior through the checkbox column.
            </li>
            <li>
              Local select-all emits the loaded row map. Paginated and remote
              select-all use selected=true, with later toggles recorded in
              unselected. The header reports checked, indeterminate, and
              disabled state to a custom renderCheckbox.
            </li>
            <li>
              Buttons, links, inputs, and other interactive descendants do not
              accidentally trigger the row-click selection handler.
            </li>
            <li>
              renderCheckbox receives normalized checkbox props plus
              headerCell/data/rowIndex metadata so a custom visual can preserve
              the built-in selection behavior.
            </li>
            <li>
              disabledRows is a zero-based current-view index map, not an ID
              map. It blocks pointer selection and pointer editing, but does not
              remove rows from controlled state, header select-all, range
              selection, or imperative selection/editing APIs. This
              intentionally preserves Inovua 5.10.2 behavior. The raw{" "}
              <code>disabledRow</code> value is available to rowStyle, cell
              renderers, custom checkboxes, and editor metadata.
            </li>
            <li>
              onSelectionChange always includes selected and originalData; UI
              actions normally include the affected row(s) in data. unselected
              contains exclusions while selected is true.
            </li>
          </ul>
        ),
      },
      {
        id: "selection-example",
        title: "Selection example",
        body: (
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              The dedicated Selection example shows the direct setter flow,
              checkbox alignment, summary cards, and sort behavior together.
            </p>
            <Link
              to="/examples/selection"
              className="inline-flex rounded-full border px-3 py-1 text-xs font-medium transition-colors hover:bg-muted/60"
            >
              Open the Selection example
            </Link>
          </div>
        ),
      },
    ],
  },
  {
    group: "guides",
    slug: "ai-skills",
    title: "Guide: AI assistant skills",
    summary:
      "Reusable prompt instructions for Codex, Claude, and other AI assistants so they generate correct the-datagrid integrations.",
    description:
      "These skill files encode the current exported surface, the remote-data model, and the distinction between the full Inovua compatibility target and today's implementation status.",
    tags: ["Guide", "AI", "Skills"],
    sections: [
      {
        id: "what-is-included",
        title: "Included skills",
        body: (
          <div className="space-y-4 text-sm text-muted-foreground">
            <ReferenceTable
              rows={[
                {
                  name: "the-datagrid-consumer",
                  type: "skills/the-datagrid-consumer/SKILL.md",
                  defaultValue: "-",
                  description:
                    "Baseline instructions for rendering ReactDataGrid correctly and avoiding invented setup steps.",
                },
                {
                  name: "the-datagrid-data-flow",
                  type: "skills/the-datagrid-data-flow/SKILL.md",
                  defaultValue: "-",
                  description:
                    "Local vs remote dataSource rules, controlled state, filtering, sorting, pagination, and selection flows.",
                },
                {
                  name: "the-datagrid-inovua-migration",
                  type: "skills/the-datagrid-inovua-migration/SKILL.md",
                  defaultValue: "-",
                  description:
                    "Migration guidance that preserves the full-compatibility target while checking current gaps before generating code.",
                },
              ]}
            />
          </div>
        ),
      },
      {
        id: "how-to-use",
        title: "How to use them",
        body: (
          <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            <li>
              Codex: copy the relevant skill into your Codex skills directory or
              attach the SKILL.md file to the task context.
            </li>
            <li>
              Claude Code: paste the relevant skill into the prompt or fold it
              into a local CLAUDE.md.
            </li>
            <li>
              Other assistants: paste the relevant skill into the system or
              developer prompt before asking for grid code.
            </li>
          </ul>
        ),
      },
      {
        id: "non-hallucination-rules",
        title: "Non-hallucination rules",
        body: (
          <div className="space-y-4 text-sm text-muted-foreground">
            <Callout title="Always prefer repo truth over AI memory">
              <p>
                The source of truth is the combination of <code>AGENTS.md</code>
                ,<code>src/main.ts</code>, <code>src/types.ts</code>, and the
                reference pages in this docs site.
              </p>
              <p>
                If a model remembers a prop or feature from another grid, it
                should verify it here before using it.
              </p>
            </Callout>
            <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
              <li>Do not invent props that are not in TypeDataGridProps.</li>
              <li>
                State the 100% Inovua Community compatibility target, but do not
                claim that current parity is complete while known gaps remain.
              </li>
              <li>
                Treat feasible unsupported Community behavior as a gap, never as
                an intentional simplification or silent exception.
              </li>
              <li>
                Do not tell consumers to install Tailwind or shadcn just to use
                the package.
              </li>
              <li>
                Do not invent separate remote mode props when the grid already
                infers remote behavior from dataSource and pagination mode.
              </li>
            </ul>
          </div>
        ),
      },
    ],
  },
  {
    group: "reference",
    slug: "implemented-surface",
    title: "Implemented surface",
    summary:
      "A source-backed inventory of package exports, defaults, data flow, interactions, responsive behavior, styling, and imperative methods that work today.",
    description:
      "Use this page as the positive current-capability reference, then consult the Inovua status ledger for behavior that is partial, different, or still being verified.",
    tags: ["Reference", "Implemented", "Capabilities"],
    sections: implementedSurfaceSections,
  },
  {
    group: "reference",
    slug: "reactdatagrid",
    title: "ReactDataGrid prop reference",
    summary:
      "Prop-by-prop reference for the main grid component's currently exported surface.",
    description:
      "This page documents the currently exported TypeDataGridProps surface, including the stable core props and the compatibility-oriented props that are present in the package today.",
    tags: ["Reference", "Props", "ReactDataGrid"],
    sections: reactDataGridPropSections,
  },
  {
    group: "reference",
    slug: "icolumn",
    title: "IColumn reference",
    summary: "Field-by-field reference for column definitions.",
    description:
      "The grid uses Inovua-aligned naming for column configuration. This page covers identity, rendering, sizing, locking, filtering, and alignment fields.",
    tags: ["Reference", "Columns", "IColumn"],
    sections: columnSections,
  },
  {
    group: "reference",
    slug: "types",
    title: "Core types reference",
    summary:
      "Reference for the main state and configuration types that shape remote integrations and controlled grids.",
    description:
      "These are the types most often used in app-level state, API requests, and migration helpers.",
    tags: ["Reference", "Types", "DataSource"],
    sections: typesSections,
  },
  {
    group: "reference",
    slug: "i18n",
    title: "Internationalization (i18n)",
    summary:
      "Complete reference for every UI string that can currently be overridden through the i18n prop.",
    description:
      "The grid uses English fallbacks and accepts partial string or React-node overrides without requiring a locale registry or bundled language pack.",
    tags: ["Reference", "i18n", "Localization"],
    sections: i18nSections,
  },
  {
    group: "reference",
    slug: "providers-and-targets",
    title: "Providers and targets",
    summary:
      "Use one RDGProvider for search and the toolbar, understand direct-grid auto-connection, and add RDGTarget only across a React layout boundary.",
    description:
      "The optional components entry coordinates search and the toolbar through one provider and one grid target. The original feature-specific providers and targets remain supported for granular imports and existing applications.",
    tags: ["Reference", "Providers", "Targets", "Composition"],
    sections: [
      {
        id: "provider-contract",
        title: "The provider contract",
        body: (
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              External contextual controls do not own a second copy of grid
              state. They communicate with a grid through the nearest provider.
              Use <code>RDGProvider</code> when a grid has search, column
              visibility, or both. It owns the shared connection scope while the
              grid remains authoritative for column visibility and the provider
              owns the search draft and committed query.
            </p>
            <ReferenceTable
              rows={[
                {
                  name: "Provider",
                  type: "required context",
                  defaultValue: "RDGProvider",
                  description:
                    "RDGProvider from @geovi/the-datagrid/components is the recommended one-grid scope for one or both controls. Feature-specific providers remain supported.",
                },
                {
                  name: "Control",
                  type: "context consumer",
                  defaultValue: "optional",
                  description:
                    "Renders the external UI and reads the nearest provider. Rendering it outside its provider is a configuration error.",
                },
                {
                  name: "Target",
                  type: "grid connection",
                  defaultValue: "conditional",
                  description:
                    "RDGTarget wraps exactly one nested ReactDataGrid when that grid is not an immediate RDGProvider child. Providers and targets render no extra DOM element.",
                },
              ]}
            />
            <Callout title="Provider required; target conditional">
              <p>
                A provider is required whenever you render{" "}
                <code>RDGSearchBar</code> or <code>RDGToolbar</code>. Prefer one{" "}
                <code>RDGProvider</code> for mixed controls. A target is
                required only when an element, Fragment, Suspense or error
                boundary, or custom component sits between that provider and the
                grid.
              </p>
              <p>
                If a screen uses none of these external controls, render{" "}
                <code>ReactDataGrid</code> normally with no provider or target.
              </p>
            </Callout>
            <p>
              <code>RDGProvider</code> requires <code>children</code> and
              accepts <code>defaultSearchValue</code> to initialize its search
              query.
              <code>RDGTarget</code> requires exactly one grid element as its{" "}
              <code>children</code> value.
            </p>
          </div>
        ),
      },
      {
        id: "direct-grid-child",
        title: "Direct grid children connect automatically",
        body: (
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              In the common layout, the grid element itself appears directly in
              <code>RDGProvider</code>&apos;s <code>children</code> list.
              Search, the toolbar, and application actions may be siblings. The
              provider recognizes the marked grid and installs both feature
              connections automatically, so adding <code>RDGTarget</code> would
              be redundant.
            </p>
            <CodeBlock code={directProviderChildrenSnippet} language="tsx" />
            <Callout title="What direct means">
              <p>
                “Direct” describes the React element tree, not visual proximity
                in the browser. The grid must be the provider&apos;s immediate
                React child. A wrapping <code>div</code>, <code>section</code>,{" "}
                <code>Fragment</code>, <code>Suspense</code>, error boundary, or
                application component makes it nested even if no extra box is
                visible.
              </p>
            </Callout>
          </div>
        ),
      },
      {
        id: "target-decision-table",
        title: "When a target is required",
        body: (
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              Use <code>RDGTarget</code> as an explicit marker whenever
              automatic direct-child detection cannot reach a grid under{" "}
              <code>RDGProvider</code>. The same direct-child rule applies to
              the stable feature-specific targets.
            </p>
            <ReferenceTable
              rows={[
                {
                  name: "Grid is an immediate provider child",
                  type: "target?",
                  defaultValue: "No",
                  description:
                    "RDGProvider connects the marked ReactDataGrid automatically.",
                },
                {
                  name: "Grid is inside a div, section, card, or panel",
                  type: "target?",
                  defaultValue: "Required",
                  description:
                    "Put the target inside the layout wrapper and wrap the grid directly.",
                },
                {
                  name: "Grid is inside Fragment, Suspense, or an error boundary",
                  type: "target?",
                  defaultValue: "Required",
                  description:
                    "Those React elements are still boundaries in the provider's direct child list.",
                },
                {
                  name: "A custom component renders the grid",
                  type: "target?",
                  defaultValue: "Required",
                  description:
                    "Place the target where the concrete ReactDataGrid element is created, while it remains under the provider context.",
                },
                {
                  name: "No external contextual control is rendered",
                  type: "provider / target?",
                  defaultValue: "Neither",
                  description:
                    "ReactDataGrid remains a standalone component; optional providers are never global setup requirements.",
                },
              ]}
            />
            <Callout title="A target must wrap the grid itself" tone="warning">
              <p>
                In application code, pass exactly one concrete{" "}
                <code>ReactDataGrid</code> to <code>RDGTarget</code>,{" "}
                <code>RDGSearchTarget</code>, or <code>RDGToolbarTarget</code>.
                Put the target inside a card or Fragment rather than wrapping
                that layout element.
              </p>
            </Callout>
          </div>
        ),
      },
      {
        id: "nested-combined-example",
        title: "Required target: nested mixed-controls layout",
        body: (
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              Here the <code>section</code> is the provider&apos;s direct child,
              not the grid. <code>RDGTarget</code> connects search and
              visibility together, so both controls operate on the same nested
              grid.
            </p>
            <CodeBlock code={requiredCombinedTargetSnippet} language="tsx" />
          </div>
        ),
      },
      {
        id: "mixed-provider-imports",
        title: "Combined provider with existing control imports",
        body: (
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              Controls imported from the original <code>/search</code> and{" "}
              <code>/toolbar</code> entries consume the same singleton contexts
              as <code>RDGProvider</code>. This lets applications adopt the
              combined provider without rewriting every control import.
            </p>
            <CodeBlock code={mixedProviderImportsSnippet} language="tsx" />
          </div>
        ),
      },
      {
        id: "why-targets-exist",
        title: "Why targets exist",
        body: (
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              A provider can inspect its immediate React children, but it cannot
              safely crawl through arbitrary components before React renders
              them. Querying the DOM would be too late, would fail during server
              rendering, and would make portals and multiple grids ambiguous.
            </p>
            <p>
              The target solves that boundary explicitly. It clones the exact
              grid element with an internal feature controller. That controller
              is removed from consumer-facing prop mirrors and remote
              data-source arguments, so targets do not expand{" "}
              <code>TypeDataGridProps</code> or leak implementation details into
              application business logic.
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>The target renders no layout wrapper or DOM node.</li>
              <li>The provider also renders no DOM layout wrapper.</li>
              <li>It does not replace or duplicate grid state.</li>
              <li>It does not require an id selector or global registry.</li>
              <li>
                It keeps the main package independent from optional provider UI
                and styles.
              </li>
            </ul>
          </div>
        ),
      },
      {
        id: "provider-scopes",
        title: "Scope providers deliberately",
        body: (
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              Controls always use their nearest matching provider. Use separate
              providers when grids need independent state.{" "}
              <code>RDGProvider</code>
              is intentionally one grid per provider because its visibility
              toolbar must have one unambiguous column model.
            </p>
            <CodeBlock code={independentProviderScopesSnippet} language="tsx" />
            <Callout title="Search can intentionally share a query">
              <p>
                The legacy search-only <code>RDGSearchProvider</code> may
                connect multiple search targets when all grids should receive
                the same query. Use separate <code>RDGProvider</code> scopes for
                mixed controls, and a separate <code>RDGToolbarProvider</code>{" "}
                for every visibility grid.
              </p>
            </Callout>
          </div>
        ),
      },
      {
        id: "provider-troubleshooting",
        title: "Troubleshooting provider connections",
        body: (
          <div className="space-y-4 text-sm text-muted-foreground">
            <ReferenceTable
              rows={[
                {
                  name: "Control reports that its provider is missing",
                  type: "configuration error",
                  defaultValue: "wrap the scope",
                  description:
                    "Move the controls inside RDGProvider, or inside their matching stable feature-specific provider.",
                },
                {
                  name: "Control renders but the nested grid does not react",
                  type: "missing connection",
                  defaultValue: "add a target",
                  description:
                    "An intervening React element is preventing direct-child discovery. Put the matching Target immediately around ReactDataGrid.",
                },
                {
                  name: "Target rejects or cannot connect its child",
                  type: "invalid nesting",
                  defaultValue: "wrap only the grid",
                  description:
                    "Pass exactly one concrete ReactDataGrid in application code, not a div, Fragment, custom card, or a consumer-assembled target stack. RDGTarget owns the internal mixed-feature composition.",
                },
                {
                  name: "Second visibility grid reports an ambiguous target",
                  type: "scope error",
                  defaultValue: "split providers",
                  description:
                    "Give each grid its own RDGProvider, or its own RDGToolbarProvider when only visibility is needed.",
                },
                {
                  name: "Remote search receives a query but rows do not change",
                  type: "remote ownership",
                  defaultValue: "apply searchValue",
                  description:
                    "The provider connection is working; a function dataSource remains responsible for applying args.searchValue on the server.",
                },
              ]}
            />
            <Callout title="Use the combined target for mixed controls">
              <p>
                Do not assemble your own nested stack of{" "}
                <code>RDGSearchTarget</code> and <code>RDGToolbarTarget</code>.
                That bridge composition is an implementation detail of{" "}
                <code>RDGTarget</code>. Use one <code>RDGProvider</code> and one{" "}
                <code>RDGTarget</code> when both controls share a grid.
              </p>
            </Callout>
          </div>
        ),
      },
      {
        id: "stable-provider-apis",
        title: "Combined and stable feature-specific APIs",
        body: (
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              The components entry is the concise default for new mixed-control
              integrations. The four original provider/target exports remain
              supported public API and are not deprecated.
            </p>
            <ReferenceTable
              rows={[
                {
                  name: "RDGProvider",
                  type: "@geovi/the-datagrid/components",
                  defaultValue: "recommended",
                  description:
                    "Owns one grid scope shared by RDGSearchBar and RDGToolbar.",
                },
                {
                  name: "RDGTarget",
                  type: "@geovi/the-datagrid/components",
                  defaultValue: "conditional",
                  description:
                    "Connects both contextual feature bridges to one nested ReactDataGrid.",
                },
                {
                  name: "RDGSearchProvider",
                  type: "@geovi/the-datagrid/search",
                  defaultValue: "supported",
                  description:
                    "Owns search draft and committed state for its search controls and target grids.",
                },
                {
                  name: "RDGSearchTarget",
                  type: "@geovi/the-datagrid/search",
                  defaultValue: "supported",
                  description:
                    "Explicitly connects one nested ReactDataGrid to the nearest search provider.",
                },
                {
                  name: "RDGToolbarProvider",
                  type: "@geovi/the-datagrid/toolbar",
                  defaultValue: "supported",
                  description: "Owns the one-grid toolbar scope.",
                },
                {
                  name: "RDGToolbarTarget",
                  type: "@geovi/the-datagrid/toolbar",
                  defaultValue: "supported",
                  description:
                    "Explicitly connects one nested ReactDataGrid to the nearest visibility provider.",
                },
              ]}
            />
            <Callout title="Compatibility decision">
              <p>
                <code>RDGProvider</code> and <code>RDGTarget</code> are
                additive. The four feature-specific APIs above remain available
                so existing applications and granular optional imports keep
                working.
              </p>
              <p>
                The <code>/components</code> entry also re-exports both
                controls, all four feature-specific provider/target APIs, and
                their prop types for one-import convenience.
              </p>
            </Callout>
            <p>
              Continue with the{" "}
              <DocsRouteLink
                group="guides"
                slug="table-search"
                className="font-medium text-foreground underline underline-offset-4"
              >
                table search guide
              </DocsRouteLink>{" "}
              or the{" "}
              <DocsRouteLink
                group="reference"
                slug="toolbar"
                className="font-medium text-foreground underline underline-offset-4"
              >
                toolbar reference
              </DocsRouteLink>{" "}
              for feature-specific behavior and props.
            </p>
          </div>
        ),
      },
    ],
  },
  {
    group: "reference",
    slug: "date-filter",
    title: "DateFilter component",
    summary: "Date-oriented filter editor for single-date and range operators.",
    description:
      "DateFilter switches between single and range layouts based on the active filter operator and supports both date and time-like inputs.",
    tags: ["Reference", "Component", "DateFilter"],
    sections: [
      {
        id: "datefilter-props",
        title: "Props",
        rows: dateFilterRows,
      },
    ],
  },
  {
    group: "reference",
    slug: "number-filter",
    title: "NumberFilter component",
    summary: "Numeric filter editor for single values and ranges.",
    description:
      "NumberFilter normalizes empty and invalid values to null and preserves range editing semantics for inrange operators.",
    tags: ["Reference", "Component", "NumberFilter"],
    sections: [
      {
        id: "numberfilter-props",
        title: "Props",
        rows: numberFilterRows,
      },
    ],
  },
  {
    group: "reference",
    slug: "select-filter",
    title: "SelectFilter component",
    summary: "Select-backed filter editor for single and multi-value filters.",
    description:
      "SelectFilter accepts both dataSource and options, normalizes record-like options, and switches into multi-select mode for inlist flows.",
    tags: ["Reference", "Component", "SelectFilter"],
    sections: [
      {
        id: "selectfilter-props",
        title: "Props",
        rows: selectFilterRows,
      },
    ],
  },
  {
    group: "reference",
    slug: "text-input",
    title: "TextInput component",
    summary:
      "Inovua-compatible standalone text input with value-first callbacks, a clear tool, and imperative instance methods.",
    description:
      "Import the default class component from @geovi/the-datagrid/packages/TextInput when migrating a legacy toolkit deep import. A named root export is also available.",
    tags: ["Reference", "Component", "TextInput", "Compatibility"],
    sections: [
      {
        id: "textinput-import",
        title: "Import",
        body: (
          <CodeBlock
            code={
              'import TextInput from "@geovi/the-datagrid/packages/TextInput";\n\n' +
              "const inputRef = React.createRef<TextInput>();\n\n" +
              "<TextInput\n" +
              "  ref={inputRef}\n" +
              '  defaultValue="Ada"\n' +
              "  onChange={(value, event) => {\n" +
              "    console.log(value, event);\n" +
              "  }}\n" +
              "/>;\n\n" +
              "inputRef.current?.focus();\n" +
              'inputRef.current?.setValue("Grace");'
            }
            language="tsx"
          />
        ),
      },
      {
        id: "textinput-props",
        title: "Props and instance API",
        rows: textInputRows,
      },
    ],
  },
  {
    group: "reference",
    slug: "checkbox",
    title: "CheckBox component",
    summary:
      "Compatibility checkbox wrapper used by selection flows and filter menus.",
    description:
      "CheckBox wraps the internal Radix checkbox and normalizes the change callback into a boolean-first signature.",
    tags: ["Reference", "Component", "CheckBox"],
    sections: [
      {
        id: "checkbox-props",
        title: "Props",
        rows: checkboxRows,
      },
    ],
  },
  {
    group: "reference",
    slug: "toolbar",
    title: "Grid toolbar",
    summary:
      "Optional contextual controls for grid columns, export, and the filter row, with a right-side slot for application actions.",
    description:
      "Import the provider, toolbar, and optional nested target from @geovi/the-datagrid/toolbar without adding toolbar props to ReactDataGrid. Column toggles are always present; export, filter-row and clear-filter actions are opt-in.",
    tags: ["Reference", "Component", "Columns", "Visibility", "Export"],
    sections: [
      {
        id: "toolbar-composition",
        title: "Compose the toolbar with a grid",
        body: (
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              A direct <code>ReactDataGrid</code> child connects automatically.
              The toolbar reads the grid&apos;s current order and visibility;
              its children render separately on the right, so export, filter,
              and other application controls remain application-owned.
            </p>
            <CodeBlock code={toolbarSnippet} language="tsx" />
            <Callout title="Using search and visibility together">
              <p>
                Prefer <code>RDGProvider</code> from{" "}
                <code>@geovi/the-datagrid/components</code> when this toolbar
                and
                <code>RDGSearchBar</code> control the same grid. The
                feature-specific provider above remains supported for
                visibility-only screens.
              </p>
            </Callout>
            <p>
              Read{" "}
              <DocsRouteLink
                group="reference"
                slug="providers-and-targets"
                className="font-medium text-foreground underline underline-offset-4"
              >
                Providers and targets
              </DocsRouteLink>{" "}
              before introducing layout wrappers or scoping controls for more
              than one grid.
            </p>
          </div>
        ),
      },
      {
        id: "toolbar-nested-target",
        title: "Target a nested grid",
        body: (
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              Wrap a grid in <code>RDGToolbarTarget</code> when layout markup
              sits between it and the provider. Keep one grid per provider so
              one toolbar always has an unambiguous column model.
            </p>
            <CodeBlock code={nestedToolbarSnippet} language="tsx" />
            <p>
              The dedicated{" "}
              <DocsRouteLink
                group="reference"
                slug="providers-and-targets"
                className="font-medium text-foreground underline underline-offset-4"
              >
                Providers and targets
              </DocsRouteLink>{" "}
              page explains every layout boundary that requires an explicit
              target and how to scope multiple grids.
            </p>
          </div>
        ),
      },
      {
        id: "toolbar-actions",
        title: "Built-in actions",
        body: (
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              <code>showExport</code>, <code>showFilterToggle</code> and{" "}
              <code>showClearFilters</code> each add one built-in button to the
              actions region. All three default to <code>false</code>, so a
              toolbar renders column toggles only until you opt in.
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                Export writes the columns currently in the grid, in grid order,
                as CSV or JSON. With more than one format the button opens a
                small format menu; with exactly one it exports directly.
              </li>
              <li>
                <code>exportScope</code> chooses the rows:{" "}
                <code>&quot;view&quot;</code> (default) writes the filtered,
                searched and sorted rows, <code>&quot;all&quot;</code> the whole
                data source. Under local pagination the grid holds one page, so{" "}
                <code>&quot;view&quot;</code> writes that page.
              </li>
              <li>
                The filter toggle drives the grid&apos;s own filter-row state.
                Passing <code>enableFiltering</code> as a prop makes the grid
                authoritative, and the button renders disabled.
              </li>
              <li>
                Clear filters calls the grid&apos;s <code>clearAllFilters</code>{" "}
                and stays disabled while no column holds a filter value.
              </li>
            </ul>
            <p>
              Export reads row values, never <code>render</code>, which returns
              React nodes. <code>exportValue</code> is the per-column transform
              for the exported representation; a throwing transform falls back
              to the raw value.
            </p>
            <CodeBlock code={toolbarExportColumnsSnippet} language="tsx" />
            <Callout title="Spreadsheet export needs one optional dependency">
              <p>
                <code>&quot;xlsx&quot;</code> is not offered by default because
                its writer, SheetJS, is many times the size of this entry.
                Install <code>xlsx</code> and list the format; the writer is
                then imported the first time somebody exports a workbook, so
                nobody else pays for it.
              </p>
              <p>
                Values keep their JavaScript type on the way into a workbook:
                numbers stay summable, <code>Date</code> values become date
                cells carrying <code>exportDateFormat</code>, and booleans
                become <code>TRUE</code>/<code>FALSE</code>. Text formats
                stringify the same values, writing dates as ISO-8601.
              </p>
            </Callout>
            <CodeBlock code={toolbarSpreadsheetSnippet} language="tsx" />
            <p>
              <code>exportDateFormat</code> is an Excel number format code, not
              a date-library pattern. SheetJS rejects dot separators that Excel
              itself accepts, so prefer <code>yyyy-mm-dd hh:mm</code> or{" "}
              <code>dd/mm/yyyy hh:mm</code>; a rejected format raises a
              descriptive error through <code>onExportError</code>. Return a
              formatted string from <code>exportValue</code> when the exact text
              matters more than the cell type.
            </p>
            <p>
              <code>onExportSuccess</code> reports a finished export - the
              format and scope, the row and column counts, the file name and its
              size - which is enough for a confirmation toast without
              recomputing anything. <code>onExportError</code> reports a
              failure, such as a missing peer dependency, and replaces the
              console message when set.
            </p>
            <p>
              Date cells are written with the writer&apos;s own local-time
              convention, so a value of <code>09:30Z</code> displays as{" "}
              <code>11:30</code> for a reader two hours ahead of UTC. Export a
              preformatted string when a fixed timezone matters.
            </p>
            <p>
              Migrating from a hand-rolled SheetJS export: a per-column
              serializer enum maps onto <code>exportValue</code> one to one.
            </p>
            <ReferenceTable
              sectionId="toolbar-actions-migration"
              rows={[
                {
                  name: "BOOLEAN",
                  type: "exportValue",
                  defaultValue: "({ value }) => Boolean(value)",
                  description:
                    "Writes a boolean cell, which Excel shows as TRUE or FALSE.",
                },
                {
                  name: "TIME",
                  type: "exportValue",
                  defaultValue: "({ value }) => new Date(value)",
                  description:
                    "Writes a date cell. Guard invalid input by returning the raw value when the parsed date is NaN.",
                },
                {
                  name: "FILESIZE",
                  type: "exportValue",
                  defaultValue: "({ value }) => filesize(value)",
                  description:
                    "Any text transform stays application-owned, including the formatting library it needs.",
                },
                {
                  name: "actions column",
                  type: "exportable",
                  defaultValue: "false",
                  description:
                    "Replaces excluding a column by name inside the export routine.",
                },
                {
                  name: "header row",
                  type: "column.header",
                  defaultValue: "automatic",
                  description:
                    "Headers come from the columns in grid order. Columns sharing a header stay separate columns rather than overwriting each other.",
                },
                {
                  name: "file name",
                  type: "exportFileName",
                  defaultValue: "string | (info) => string",
                  description:
                    "A callback runs per export, so a name built from branding, an id and the date stays accurate.",
                },
                {
                  name: "sheet name",
                  type: "exportSheetName",
                  defaultValue: "file name",
                  description:
                    "Sanitised to what Excel accepts: no [ ] : * ? / \\ and at most 31 characters.",
                },
              ]}
            />
            <ReferenceTable
              sectionId="toolbar-actions"
              rows={[
                {
                  name: "column.exportable",
                  type: "boolean",
                  defaultValue: "true",
                  description:
                    "False excludes the column from every export, visible or not. Always wins over exportWhenHidden.",
                },
                {
                  name: "column.exportWhenHidden",
                  type: "boolean",
                  defaultValue: "false",
                  description:
                    "Exports the column even while it is hidden in the grid. Ignored when exportable is false.",
                },
                {
                  name: "column.exportValue",
                  type: "({ value, data, column }) => unknown",
                  defaultValue: "none",
                  description:
                    "Transforms the exported cell value. Receives the raw row value, the row, and the column.",
                },
              ]}
            />
          </div>
        ),
      },
      {
        id: "toolbar-styling",
        title: "Styling and theme tokens",
        body: (
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              The toolbar carries no utility classes. Every visual decision is a{" "}
              <code>--tdg-toolbar-*</code> custom property, so restyling means
              redeclaring tokens on <code>.tdg-toolbar-root</code> (or any
              ancestor) rather than out-specifying a stylesheet.
            </p>
            <CodeBlock code={toolbarTokenSnippet} language="css" />
            <Callout title="Overrides never need !important">
              <p>
                Each default rule is written with exactly one unit of
                specificity: the part naming the state stays outside{" "}
                <code>:where()</code>, everything else goes inside. A selector
                of yours that adds a second part - a class plus an element, or a
                class of your own - outranks every default.
              </p>
            </Callout>
            <CodeBlock code={toolbarOverrideSnippet} language="css" />
            <p>
              Colour tokens fall back through <code>--tdg-color-*</code> and
              then the shadcn variable of the same name, so a themed application
              inherits sensible values without setting anything. Bridging
              another design system means assigning its values to the tokens
              once:
            </p>
            <CodeBlock code={toolbarThemeBridgeSnippet} language="tsx" />
            <p>
              Stacked layouts place the actions above the column toggles, since
              a wrapping toggle list would otherwise push export and the filter
              controls far down the card. From <code>80rem</code> the toolbar
              becomes a row with toggles leading and actions trailing. Override{" "}
              <code>
                {
                  '.tdg-toolbar-root [data-slot="rdg-toolbar-body"] { flex-direction: column }'
                }
              </code>{" "}
              to restore a single order at every width.
            </p>
            <ReferenceTable
              sectionId="toolbar-styling"
              rows={[
                {
                  name: "--tdg-toolbar-surface",
                  type: "<color>",
                  defaultValue: "card at 60%",
                  description: "Background of the toolbar card.",
                },
                {
                  name: "--tdg-toolbar-color",
                  type: "<color>",
                  defaultValue: "foreground",
                  description:
                    "Text colour the toolbar establishes for its contents.",
                },
                {
                  name: "--tdg-toolbar-padding",
                  type: "<length>",
                  defaultValue: "0.75rem",
                  description: "Inner padding of the card.",
                },
                {
                  name: "--tdg-toolbar-gap",
                  type: "<length>",
                  defaultValue: "0.75rem",
                  description:
                    "Vertical rhythm between heading, toggles and actions.",
                },
                {
                  name: "--tdg-toolbar-radius",
                  type: "<length>",
                  defaultValue: "--radius-xl",
                  description:
                    "Card corner radius; reads the host radius scale first.",
                },
                {
                  name: "--tdg-toolbar-border-width",
                  type: "<length>",
                  defaultValue: "1px",
                  description: "Card border width; 0 removes the border.",
                },
                {
                  name: "--tdg-toolbar-border-color",
                  type: "<color>",
                  defaultValue: "border",
                  description: "Card border colour.",
                },
                {
                  name: "--tdg-toolbar-shadow",
                  type: "<shadow>",
                  defaultValue: "shadow-sm",
                  description: "Card elevation; none flattens the card.",
                },
                {
                  name: "--tdg-toolbar-title-font-size",
                  type: "<length>",
                  defaultValue: "0.875rem",
                  description: "Heading size.",
                },
                {
                  name: "--tdg-toolbar-title-font-weight",
                  type: "<number>",
                  defaultValue: "500",
                  description: "Heading weight.",
                },
                {
                  name: "--tdg-toolbar-title-color",
                  type: "<color>",
                  defaultValue: "inherit",
                  description: "Heading colour.",
                },
                {
                  name: "--tdg-toolbar-description-font-size",
                  type: "<length>",
                  defaultValue: "0.75rem",
                  description: "Description size.",
                },
                {
                  name: "--tdg-toolbar-description-color",
                  type: "<color>",
                  defaultValue: "muted-foreground",
                  description: "Description colour.",
                },
                {
                  name: "--tdg-toolbar-body-gap",
                  type: "<length>",
                  defaultValue: "1.5rem",
                  description:
                    "Spacing between the column toggles and the actions.",
                },
                {
                  name: "--tdg-toolbar-toggle-gap",
                  type: "<length>",
                  defaultValue: "0.5rem",
                  description: "Spacing between column toggles.",
                },
                {
                  name: "--tdg-toolbar-actions-gap",
                  type: "<length>",
                  defaultValue: "0.5rem",
                  description:
                    "Spacing between action buttons, including your children.",
                },
                {
                  name: "--tdg-toolbar-control-height",
                  type: "<length>",
                  defaultValue: "2rem",
                  description:
                    "Height of every button; auto lets padding size them.",
                },
                {
                  name: "--tdg-toolbar-control-padding",
                  type: "<length>{1,4}",
                  defaultValue: "0 0.75rem",
                  description: "Button padding shorthand.",
                },
                {
                  name: "--tdg-toolbar-control-radius",
                  type: "<length>",
                  defaultValue: "--radius-md",
                  description: "Button corner radius.",
                },
                {
                  name: "--tdg-toolbar-control-gap",
                  type: "<length>",
                  defaultValue: "0.5rem",
                  description: "Space between a button's icon and its label.",
                },
                {
                  name: "--tdg-toolbar-control-font-weight",
                  type: "<number>",
                  defaultValue: "500",
                  description: "Button label weight.",
                },
                {
                  name: "--tdg-toolbar-toggle-font-size",
                  type: "<length>",
                  defaultValue: "0.875rem",
                  description: "Column toggle label size.",
                },
                {
                  name: "--tdg-toolbar-action-font-size",
                  type: "<length>",
                  defaultValue: "0.75rem",
                  description:
                    "Export, filter-toggle and clear-filter label size.",
                },
                {
                  name: "--tdg-toolbar-control-border-width",
                  type: "<length>",
                  defaultValue: "1px",
                  description: "Button border width.",
                },
                {
                  name: "--tdg-toolbar-control-cursor",
                  type: "<cursor>",
                  defaultValue: "default",
                  description:
                    "Cursor over buttons; pointer if that matches your app.",
                },
                {
                  name: "--tdg-toolbar-control-transition",
                  type: "<time>",
                  defaultValue: "150ms",
                  description:
                    "Colour transition duration; 0s disables the animation.",
                },
                {
                  name: "--tdg-toolbar-control-disabled-opacity",
                  type: "<number>",
                  defaultValue: "0.5",
                  description: "Opacity of a disabled button.",
                },
                {
                  name: "--tdg-toolbar-icon-size",
                  type: "<length>",
                  defaultValue: "1rem",
                  description: "Size of the built-in action icons.",
                },
                {
                  name: "--tdg-toolbar-control-fill",
                  type: "<color>",
                  defaultValue: "transparent",
                  description: "Background of a resting button.",
                },
                {
                  name: "--tdg-toolbar-control-color",
                  type: "<color>",
                  defaultValue: "inherit",
                  description: "Label colour of a resting button.",
                },
                {
                  name: "--tdg-toolbar-control-border-color",
                  type: "<color>",
                  defaultValue: "input",
                  description: "Border colour of a resting button.",
                },
                {
                  name: "--tdg-toolbar-control-hover-fill",
                  type: "<color>",
                  defaultValue: "accent",
                  description: "Hover background of a resting button.",
                },
                {
                  name: "--tdg-toolbar-control-hover-color",
                  type: "<color>",
                  defaultValue: "accent-foreground",
                  description: "Hover label colour of a resting button.",
                },
                {
                  name: "--tdg-toolbar-control-on-fill",
                  type: "<color>",
                  defaultValue: "secondary",
                  description:
                    "Background of a pressed button: a visible column, or a visible filter row.",
                },
                {
                  name: "--tdg-toolbar-control-on-color",
                  type: "<color>",
                  defaultValue: "secondary-foreground",
                  description: "Label colour of a pressed button.",
                },
                {
                  name: "--tdg-toolbar-control-on-border-color",
                  type: "<color>",
                  defaultValue: "transparent",
                  description: "Border colour of a pressed button.",
                },
                {
                  name: "--tdg-toolbar-control-on-hover-fill",
                  type: "<color>",
                  defaultValue: "secondary at 80%",
                  description: "Hover background of a pressed button.",
                },
                {
                  name: "--tdg-toolbar-control-on-hover-color",
                  type: "<color>",
                  defaultValue: "on label colour",
                  description: "Hover label colour of a pressed button.",
                },
                {
                  name: "--tdg-toolbar-focus-ring-width",
                  type: "<length>",
                  defaultValue: "1px",
                  description: "Focus ring thickness on every control.",
                },
                {
                  name: "--tdg-toolbar-focus-ring-color",
                  type: "<color>",
                  defaultValue: "ring",
                  description: "Focus ring colour.",
                },
                {
                  name: "--tdg-toolbar-menu-fill",
                  type: "<color>",
                  defaultValue: "popover",
                  description: "Export format menu background.",
                },
                {
                  name: "--tdg-toolbar-menu-color",
                  type: "<color>",
                  defaultValue: "popover-foreground",
                  description: "Export format menu text colour.",
                },
                {
                  name: "--tdg-toolbar-menu-border-width",
                  type: "<length>",
                  defaultValue: "1px",
                  description: "Menu border width.",
                },
                {
                  name: "--tdg-toolbar-menu-border-color",
                  type: "<color>",
                  defaultValue: "border",
                  description: "Menu border colour.",
                },
                {
                  name: "--tdg-toolbar-menu-radius",
                  type: "<length>",
                  defaultValue: "control radius",
                  description: "Menu corner radius.",
                },
                {
                  name: "--tdg-toolbar-menu-padding",
                  type: "<length>",
                  defaultValue: "0.25rem",
                  description: "Padding around the menu items.",
                },
                {
                  name: "--tdg-toolbar-menu-min-width",
                  type: "<length>",
                  defaultValue: "8rem",
                  description: "Minimum menu width.",
                },
                {
                  name: "--tdg-toolbar-menu-offset",
                  type: "<length>",
                  defaultValue: "0.25rem",
                  description: "Gap between the export button and the menu.",
                },
                {
                  name: "--tdg-toolbar-menu-shadow",
                  type: "<shadow>",
                  defaultValue: "shadow-md",
                  description: "Menu elevation.",
                },
                {
                  name: "--tdg-toolbar-menu-item-font-size",
                  type: "<length>",
                  defaultValue: "0.875rem",
                  description: "Menu item label size.",
                },
                {
                  name: "--tdg-toolbar-menu-item-padding",
                  type: "<length>{1,4}",
                  defaultValue: "0.375rem 0.5rem",
                  description: "Menu item padding shorthand.",
                },
                {
                  name: "--tdg-toolbar-menu-item-radius",
                  type: "<length>",
                  defaultValue: "--radius-sm",
                  description: "Menu item corner radius.",
                },
                {
                  name: "--tdg-toolbar-menu-item-hover-fill",
                  type: "<color>",
                  defaultValue: "accent",
                  description: "Menu item hover background.",
                },
                {
                  name: "--tdg-toolbar-menu-item-hover-color",
                  type: "<color>",
                  defaultValue: "accent-foreground",
                  description: "Menu item hover label colour.",
                },
              ]}
            />
            <p>
              The elements carry stable <code>data-slot</code> names for
              targeting: <code>rdg-toolbar</code>,{" "}
              <code>rdg-toolbar-heading</code>, <code>rdg-toolbar-title</code>,{" "}
              <code>rdg-toolbar-description</code>,{" "}
              <code>rdg-toolbar-body</code>, <code>rdg-column-toggle-list</code>
              , <code>rdg-column-toggle</code>, <code>rdg-toolbar-actions</code>
              , <code>rdg-toolbar-export</code>,{" "}
              <code>rdg-toolbar-export-menu</code>,{" "}
              <code>rdg-toolbar-export-format</code>,{" "}
              <code>rdg-toolbar-filter-toggle</code> and{" "}
              <code>rdg-toolbar-clear-filters</code>. Toggle buttons and the
              filter toggle also expose <code>data-state</code> as{" "}
              <code>on</code> or <code>off</code>.
            </p>
          </div>
        ),
      },
      {
        id: "toolbar-behavior",
        title: "Behavior and public props",
        body: (
          <div className="space-y-4 text-sm text-muted-foreground">
            <ul className="list-disc space-y-2 pl-5">
              <li>
                Toggle labels use a string or numeric header, then the stable
                column <code>id</code> or <code>name</code>.
              </li>
              <li>
                Columns with <code>{"hideable={false}"}</code> are omitted, and
                the last visible column cannot be hidden because its toggle is
                disabled.
              </li>
              <li>
                Button <code>aria-pressed</code> state follows the live grid; no
                eye icon or separate consumer visibility state is required.
              </li>
              <li>
                The optional entry follows the target grid theme and loads only
                its scoped toolbar stylesheet.
              </li>
            </ul>
            <CodeBlock code={toolbarColumnsSnippet} language="tsx" />
            <Callout title="Initialization and remounts">
              <p>
                Set <code>{"defaultVisible: false"}</code> or{" "}
                <code>{"defaultHidden: true"}</code> for grid-owned initial
                hidden state, <code>{"visible: false"}</code> for live
                prop-owned state, and <code>{"hideable: false"}</code> for a
                column that must not appear as a toggle.
              </p>
              <p>
                Visibility button clicks update grid-owned imperative state. A
                real grid remount discards those runtime overrides and
                initializes visibility again from the current column props.
              </p>
            </Callout>
            <Callout title="Accessible title and description">
              <p>
                When <code>title</code> is present, the toolbar exposes it as a
                level-two heading and labels the toolbar region with{" "}
                <code>aria-labelledby</code>. The toggle group always keeps the
                public <code>ariaLabel</code>, and the description is connected
                to both region and group through <code>aria-describedby</code>.
                Set <code>{"title={null}"}</code> to suppress the heading and
                region label without changing the group&apos;s accessible name.
              </p>
            </Callout>
            <ReferenceTable
              sectionId="toolbar-behavior"
              rows={[
                {
                  name: "RDGToolbarProvider.children",
                  type: "ReactNode",
                  defaultValue: "required",
                  description:
                    "Contains the toolbar and one direct grid or explicit target.",
                },
                {
                  name: "RDGToolbar.ariaLabel",
                  type: "string",
                  defaultValue: '"Visible column toggles"',
                  description:
                    "Accessible name for the group of visibility buttons.",
                },
                {
                  name: "RDGToolbar.title",
                  type: "ReactNode",
                  defaultValue: '"Visible columns"',
                  description:
                    "Level-two heading that labels the toolbar region; null suppresses the heading while the toggle group keeps ariaLabel.",
                },
                {
                  name: "RDGToolbar.description",
                  type: "ReactNode",
                  defaultValue:
                    '"Choose which columns are visible in the grid."',
                  description:
                    "Supporting copy associated with the toolbar region and toggle group through aria-describedby; null suppresses it.",
                },
                {
                  name: "RDGToolbar.showColumnToggles",
                  type: "boolean",
                  defaultValue: "true",
                  description:
                    "Renders the column visibility toggle group. False leaves an actions-only toolbar.",
                },
                {
                  name: "RDGToolbar.showExport",
                  type: "boolean",
                  defaultValue: "false",
                  description:
                    "Adds the built-in export control for the formats in exportFormats.",
                },
                {
                  name: "RDGToolbar.showFilterToggle",
                  type: "boolean",
                  defaultValue: "false",
                  description:
                    "Adds a button that shows or hides the grid filter row; disabled while enableFiltering is a controlled prop.",
                },
                {
                  name: "RDGToolbar.showClearFilters",
                  type: "boolean",
                  defaultValue: "false",
                  description:
                    "Adds a button that clears every column filter; disabled while nothing is filtered.",
                },
                {
                  name: "RDGToolbar.exportScope",
                  type: '"view" | "all"',
                  defaultValue: '"view"',
                  description:
                    "Rows written by the export: the current grid view, or the entire data source.",
                },
                {
                  name: "RDGToolbar.exportFormats",
                  type: 'readonly ("csv" | "json" | "xlsx")[]',
                  defaultValue: '["csv", "json"]',
                  description:
                    'Offered export formats, in menu order. A single entry exports on click instead of opening a menu. "xlsx" needs the optional xlsx peer dependency.',
                },
                {
                  name: "RDGToolbar.exportFileName",
                  type: "string | ((info) => string)",
                  defaultValue: '"grid-export"',
                  description:
                    "Downloaded file name without extension; the format supplies that. A callback receives the format, scope and row/column counts, and runs per export.",
                },
                {
                  name: "RDGToolbar.exportDateFormat",
                  type: "string",
                  defaultValue: '"yyyy-mm-dd hh:mm"',
                  description:
                    "Excel number format for date cells in spreadsheet exports. Must be a format the writer accepts; dot separators are rejected.",
                },
                {
                  name: "RDGToolbar.exportSheetName",
                  type: "string",
                  defaultValue: "the file name",
                  description:
                    "Worksheet name for spreadsheet exports, sanitised to Excel's rules.",
                },
                {
                  name: "RDGToolbar.onExportSuccess",
                  type: "(result) => void",
                  defaultValue: "none",
                  description:
                    "Called once the file has been handed to the browser, with the format, scope, row and column counts, file name and byte size.",
                },
                {
                  name: "RDGToolbar.onExportError",
                  type: "(error: unknown) => void",
                  defaultValue: "console.error",
                  description:
                    "Called when an export fails, e.g. when the optional xlsx peer dependency is missing.",
                },
                {
                  name: "RDGToolbar.labels",
                  type: "Partial<RDGToolbarLabels>",
                  defaultValue: "English defaults",
                  description:
                    "Overrides every string the toolbar renders, as strings or elements: export, showFilters, hideFilters, clearFilters, exportFormats (menu entry per format), exportSingle (whole button text when one format is offered, for languages that trail the verb) and filteringControlledHint.",
                },
                {
                  name: "RDGToolbar.children",
                  type: "ReactNode",
                  defaultValue: "none",
                  description:
                    "Application controls rendered in the right-side actions region, after the built-in ones.",
                },
                {
                  name: "RDGToolbar.className",
                  type: "string",
                  defaultValue: "none",
                  description:
                    "Appended to the toolbar root's class list, for scoping style overrides to your own class.",
                },
                {
                  name: "RDGToolbarTarget.children",
                  type: "ReactElement<TypeDataGridProps>",
                  defaultValue: "required",
                  description:
                    "The single nested ReactDataGrid connected to the nearest provider.",
                },
              ]}
            />
          </div>
        ),
      },
    ],
  },
  {
    group: "migration",
    slug: "inovua-compat",
    title: "Inovua compatibility contract",
    summary:
      "The public commitment to 100% backwards compatibility with Inovua Community, how compatibility is judged, and how exceptions are governed.",
    description:
      "This is the normative product contract. The separate status ledger records the completed Community 5.10.2 evidence and Enterprise exclusions.",
    tags: ["Migration", "Inovua", "Compatibility contract"],
    sections: [
      {
        id: "compatibility-promise",
        title: "Compatibility promise",
        body: (
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              <strong className="text-foreground">
                the-datagrid targets 100% backwards compatibility
              </strong>{" "}
              with the documented public API and observable behavior of{" "}
              <code>@inovua/reactdatagrid-community@5.10.2</code>, except only
              for an individually documented behavior that is demonstrated to be
              technically impossible.
            </p>
            <p>
              The implementation may be lighter and may use TanStack, Tailwind,
              shadcn-style patterns, or different internal code. Those
              implementation choices do not permit a different public result. A
              consumer should be able to change the package dependency and
              import specifier without rewriting application business logic that
              uses the public Community contract.
            </p>
            <Callout title="Audited Community gate complete">
              <p>
                Issue 17 and Issue 31–45 now have executable evidence across
                types, runtime behavior, browsers, packed consumers, and
                performance.
              </p>
              <p>
                A newly discovered Community mismatch is a regression, not an
                intentional difference or silent exception.
              </p>
            </Callout>
          </div>
        ),
      },
      {
        id: "baseline-and-scope",
        title: "Baseline and scope",
        body: (
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              The canonical baseline is the public Community package at version{" "}
              <a
                href="https://www.npmjs.com/package/@inovua/reactdatagrid-community/v/5.10.2"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-foreground underline underline-offset-4"
              >
                @inovua/reactdatagrid-community@5.10.2
              </a>
              . We use its published documentation, top-level TypeScript
              declarations, and observable runtime together. When archived prose
              and the published package disagree, the executable package
              contract wins; for example, the 5.10.2 root <code>editable</code>{" "}
              prop is boolean, while conditional or async editability belongs on{" "}
              <code>column.editable</code>. Filtering is another verified case:
              archived prose describes controlled and uncontrolled local
              filtering together, while the published runtime applies local
              array filters from <code>defaultFilterValue</code> and treats
              controlled <code>filterValue</code> as externally owned display
              state. The runtime behavior is the compatibility requirement.
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                Included: documented Community component props, column fields,
                exported public types, defaults, callbacks, methods, and
                observable interactions.
              </li>
              <li>
                Included: default visual behavior with semantic meaning, such as
                visible zebra rows, plus keyboard, focus, and accessibility
                behavior.
              </li>
              <li>
                Not part of this baseline: Enterprise-only APIs, private
                implementation modules, undocumented toolkit deep imports, and
                pixel-identical internal DOM or CSS.
              </li>
              <li>
                A public behavior does not leave the baseline merely because it
                is large, difficult, expensive, or absent from the current
                implementation.
              </li>
            </ul>
          </div>
        ),
      },
      {
        id: "internal-engine-boundary",
        title: "Internal engine boundary",
        body: (
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              The Inovua-facing contract remains the canonical public API.
              Consumers configure the grid with the documented Inovua-shaped
              props, columns, state, callbacks, and imperative methods; TanStack
              types and state shapes are internal implementation details and do
              not replace that migration surface.
            </p>
            <p>
              Internally, responsibilities are deliberately split. TanStack
              Table provides the column, header, controlled-state, and pixel
              geometry engine. TanStack Virtual provides the row and column
              render windows because Table is headless and does not perform
              virtualization itself.
            </p>
            <p>
              Compatibility adapters preserve behavior that cannot be delegated
              directly to those engines: Inovua <code>flex</code> and{" "}
              <code>defaultFlex</code> allocation, selection callback payloads,
              complete filter metadata, local and remote data-source semantics,
              and the editing lifecycle. This boundary lets the implementation
              use TanStack without asking an existing Inovua application to
              rewrite its business logic or adopt additional public props.
            </p>
          </div>
        ),
      },
      {
        id: "what-compatibility-means",
        title: "What 100% compatibility means",
        body: (
          <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            <li>
              The same public prop and column names accept the same value shapes
              and preserve their documented defaults.
            </li>
            <li>
              Exported types preserve Inovua vocabulary, unions, callback
              payloads, and controlled versus uncontrolled semantics.
            </li>
            <li>
              State changes, callback timing, local and remote data flow, and
              imperative methods produce equivalent observable results.
            </li>
            <li>
              Mouse, touch, keyboard, focus, cancellation, navigation, and
              accessibility behavior remain migration-safe.
            </li>
            <li>
              Layout contracts—including defaults, row measurement, controlled
              column sizing, flex allocation, and resize reporting—are business
              logic, not cosmetic implementation details.
            </li>
            <li>
              Compatible means behavior, not simply declaring a similarly named
              optional TypeScript field and ignoring it at runtime.
            </li>
          </ul>
        ),
      },
      {
        id: "current-status",
        title: "Target versus current status",
        body: (
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              The living{" "}
              <DocsRouteLink
                group="migration"
                slug="inovua-status"
                className="font-medium text-foreground underline underline-offset-4"
              >
                Inovua implementation status
              </DocsRouteLink>{" "}
              separates verified behavior, known gaps, areas still being
              audited, and anything outside the public baseline.
            </p>
            <p>
              Issue 17 and Issue 31–45 cover the audited Community surface: data
              ownership, columns, headers, menus, selection, customization,
              editing, row heights, scrolling/RTL, package entrypoints, explicit
              computed APIs, and executable feature descriptors. The release
              ledger links each contract to its test evidence.
            </p>
          </div>
        ),
      },
      {
        id: "exception-policy",
        title: "Technical exception policy",
        body: (
          <div className="space-y-4 text-sm text-muted-foreground">
            <Callout title="No approved exceptions">
              <p>
                No compatibility exceptions are currently approved. Every
                feasible missing behavior is tracked as a known gap.
              </p>
            </Callout>
            <p>
              An exception can be approved only after technical impossibility is
              demonstrated. Cost, bundle size, schedule, implementation effort,
              architectural preference, or a desire for fewer props do not
              qualify.
            </p>
            <p>Every proposed exception must publish:</p>
            <ol className="list-decimal space-y-2 pl-5">
              <li>
                the exact upstream behavior and a primary source proving it;
              </li>
              <li>
                technical evidence explaining why equivalent behavior cannot be
                implemented;
              </li>
              <li>
                affected consumers, observable impact, and the closest safe
                migration path;
              </li>
              <li>
                an explicit decision record, version boundary, documentation,
                and executable test for the chosen behavior.
              </li>
            </ol>
            <p>
              An unimplemented behavior remains a gap while a proposal is being
              considered. It cannot be silently renamed as a substitute or
              hidden behind a general “leaner implementation” disclaimer.
            </p>
          </div>
        ),
      },
      {
        id: "release-discipline",
        title: "Release and regression discipline",
        body: (
          <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            <li>
              Every discovered mismatch receives a public status entry and an
              executable parity specification.
            </li>
            <li>
              A deliberately red parity test describes the upstream contract; it
              becomes a permanent green regression test when implemented.
            </li>
            <li>
              A behavior is marked compatible only when types, runtime,
              callbacks, default state, and relevant interactions are verified.
            </li>
            <li>
              Regressing a compatible Community behavior is a compatibility bug
              and must be handled as a semver-sensitive public API regression.
            </li>
            <li>
              A future Inovua version does not silently move the baseline; any
              baseline upgrade is an explicit, documented product decision.
            </li>
          </ul>
        ),
      },
      {
        id: "migration-checklist",
        title: "Migration checklist today",
        body: (
          <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
            <li>
              Change the dependency and import specifier, then preserve the
              existing public Inovua-shaped configuration first.
            </li>
            <li>
              Check every used prop and column field against both the current
              reference and the parity status ledger.
            </li>
            <li>
              Run focused application tests for defaults, callback payloads,
              controlled state, keyboard interaction, and layout—not only a
              successful TypeScript build.
            </li>
            <li>
              If a mismatch is absent from the ledger, report it as a new gap
              rather than building application business logic around an
              undocumented substitution.
            </li>
          </ol>
        ),
      },
    ],
  },
  createInovuaStatusPage(),
];

export const docsNavGroups: DocsNavGroup[] = [
  {
    key: "getting-started",
    label: "Getting started",
    pages: docsPages.filter((page) => page.group === "getting-started"),
  },
  {
    key: "guides",
    label: "Guides",
    pages: docsPages.filter((page) => page.group === "guides"),
  },
  {
    key: "reference",
    label: "Reference",
    pages: docsPages.filter((page) => page.group === "reference"),
  },
  {
    key: "migration",
    label: "Migration",
    pages: docsPages.filter((page) => page.group === "migration"),
  },
];

export function getDocsPage(group: string, slug: string): DocsPage | undefined {
  return docsPages.find((page) => page.group === group && page.slug === slug);
}

export function getDocsPageHref(page: DocsPage): string {
  return `/docs/${page.group}/${page.slug}`;
}

export function getDocsHomeCards() {
  return [
    {
      title: "Get started",
      summary:
        "Install the package, render the first grid, and understand the stable prop surface.",
      kind: "docs" as const,
      group: "getting-started" as const,
      slug: "installation",
    },
    {
      title: "Implemented today",
      summary:
        "Inspect the source-backed inventory of exports, defaults, data flow, interactions, responsive behavior, and imperative methods.",
      kind: "docs" as const,
      group: "reference" as const,
      slug: "implemented-surface",
    },
    {
      title: "Inovua compatibility",
      summary:
        "Read the 100% backwards-compatibility contract, completed Community evidence, and explicit Enterprise exclusions.",
      kind: "docs" as const,
      group: "migration" as const,
      slug: "inovua-status",
    },
    {
      title: "Examples",
      summary:
        "Open the live examples and inspect the source code beside the running preview.",
      kind: "route" as const,
      to: "/examples" as const,
    },
  ] satisfies DocsHomeCard[];
}

export function getAllDocsPages(): DocsPage[] {
  return docsPages;
}
