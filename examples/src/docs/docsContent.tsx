import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";

import CopyableCodeBlock from "./CopyableCodeBlock";

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
  theme?: string;
  skip?: number;
  limit?: number;
};

const dataSource = async (args: RemoteArgs) => {
  const response = await fetch("/api/accounts/search", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(args),
  });

  return response.json() as Promise<{ data: AccountRow[]; count: number }>;
};`;

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
          ? "rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-4"
          : "rounded-2xl border border-sky-500/25 bg-sky-500/10 px-4 py-4"
      }
    >
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-2 space-y-3 text-sm text-muted-foreground">
        {children}
      </div>
    </div>
  );
}

function ReferenceTable(props: { rows: ReferenceRow[] }) {
  const { rows } = props;

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
              <tr key={row.name} className="align-top">
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

function SectionBody(props: { section: ReferenceSection }) {
  const { section } = props;

  return (
    <section id={section.id} className="scroll-mt-24 space-y-4">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight">
          {section.title}
        </h2>
      </div>
      {section.body}
      {section.rows ? <ReferenceTable rows={section.rows} /> : null}
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
    id: "core-props",
    title: "Core props",
    rows: [
      {
        name: "theme",
        type: "string",
        defaultValue: '"default"',
        description:
          "Theme hook for built-in and custom themes. Built-ins are default, light, and dark; custom names are exposed through data-theme.",
      },
      {
        name: "idProperty",
        type: "string",
        defaultValue: "required",
        description:
          "Row identity field. The grid uses it for selection, row ids, and stable rendering.",
      },
      {
        name: "columns",
        type: "TypeColumns",
        defaultValue: "required",
        description:
          "Column definitions. Every column should have a stable id or name.",
      },
      {
        name: "dataSource",
        type: "TypeDataSource",
        defaultValue: "required",
        description:
          "Array, promise, or function-backed data source. Local arrays are filtered and sorted client-side; remote functions receive the current grid state.",
      },
      {
        name: "columnOrder",
        type: "string[]",
        defaultValue: "derived from columns",
        description: "Controlled rendered order of the visible columns.",
      },
      {
        name: "onColumnOrderChange",
        type: "(columnOrder: string[]) => void",
        defaultValue: "-",
        description:
          "Receives the next column order after a user reorder. Reordering should be considered opt-in and controlled through this callback.",
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
        name: "resizable",
        type: "boolean",
        defaultValue: "true",
        description: "Turns header drag-resize handles on or off.",
      },
      {
        name: "enableColumnAutosize",
        type: "boolean",
        defaultValue: "true",
        description:
          "Applies the built-in width heuristic when no explicit width/defaultWidth is present.",
      },
      {
        name: "skipHeaderOnAutoSize",
        type: "boolean",
        defaultValue: "false",
        description: "Removes header text from autosize estimation when true.",
      },
      {
        name: "virtualized",
        type: "boolean",
        defaultValue: "true",
        description: "Enables row virtualization via TanStack Virtual.",
      },
      {
        name: "columnUserSelect",
        type: 'true | false | "text" | "none"',
        defaultValue: "true",
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
        type: "number",
        defaultValue: "44",
        description: "Body row height in pixels.",
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
        defaultValue: "44",
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
        description: "Inline styles for the grid root.",
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
        defaultValue: "true",
        description: "Turns the filter row on or off.",
      },
      {
        name: "filterValue",
        type: "TypeFilterValue",
        defaultValue: "-",
        description:
          "Controlled filter state. Use when your app owns the active filters.",
      },
      {
        name: "defaultFilterValue",
        type: "TypeFilterValue",
        defaultValue: "null",
        description: "Initial uncontrolled filter state.",
      },
      {
        name: "onFilterValueChange",
        type: "(filterValue: TypeFilterValue) => void",
        defaultValue: "-",
        description: "Receives the next filter state after user edits.",
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
        defaultValue: "false",
        description:
          "Enables operator switching through the filter-cell context menu.",
      },
      {
        name: "filteredRowsCount",
        type: "(count: number) => void",
        defaultValue: "-",
        description:
          "Reports the post-filter row count so host UIs can display totals.",
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
          "Called after sort toggles. Local arrays are sorted client-side; remote data sources receive the state through args.",
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
    ],
  },
  {
    id: "selection-props",
    title: "Selection",
    rows: [
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
        name: "onSelectionChange",
        type: "(config: TypeOnSelectionChangeArg) => void",
        defaultValue: "-",
        description:
          "Called with selected, data, unselected, and originalData. Direct React setter wiring is supported.",
      },
      {
        name: "multiSelect",
        type: "boolean",
        defaultValue: "checkboxColumn ? true : false",
        description: "Enables multi-row selection semantics.",
      },
      {
        name: "checkboxOnlyRowSelect",
        type: "boolean",
        defaultValue: "checkboxColumn ? true : false",
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
        name: "i18n",
        type: "TypeI18n",
        defaultValue: "built-in fallbacks",
        description:
          "Overrides UI strings such as noRecords, clear, sort labels, and column menu text.",
      },
      {
        name: "showColumnMenuTool",
        type: "boolean",
        defaultValue: "false",
        description: "Shows the header menu trigger for per-column actions.",
      },
      {
        name: "onReady",
        type: "(apiRef) => void",
        defaultValue: "-",
        description: "Receives the imperative grid API ref after mount.",
      },
      {
        name: "handle",
        type: "(apiRef) => void",
        defaultValue: "-",
        description: "Compatibility alias for onReady.",
      },
    ],
  },
];

const columnSections: ReferenceSection[] = [
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
        type: "(valueOrCellProps, args?) => ReactNode",
        defaultValue: "-",
        description:
          "Cell renderer. Supports both Inovua-style render({ value, data, ... }) and the legacy render(value, args) shape.",
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
        description: "Fixed rendered width.",
      },
      {
        name: "defaultWidth",
        type: "number",
        defaultValue: "-",
        description: "Starting width for uncontrolled sizing.",
      },
      {
        name: "minWidth",
        type: "number",
        defaultValue: "60",
        description: "Lower clamp for autosize and manual resize.",
      },
      {
        name: "maxWidth",
        type: "number",
        defaultValue: "9999",
        description: "Upper clamp for autosize and manual resize.",
      },
      {
        name: "flex",
        type: "number | null",
        defaultValue: "-",
        description:
          "Reserved for compatibility. The current implementation is width-first.",
      },
      {
        name: "defaultFlex",
        type: "number | null",
        defaultValue: "-",
        description:
          "Reserved compatibility field for callers that already shape column configs this way.",
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
        description: "Compatibility field for initial visibility.",
      },
      {
        name: "defaultHidden",
        type: "boolean",
        defaultValue: "-",
        description: "Compatibility field for initial hidden state.",
      },
      {
        name: "hideable",
        type: "boolean",
        defaultValue: "true",
        description: "Marks whether column-visibility UIs may hide the column.",
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
    ],
  },
  {
    id: "sorting-filtering-fields",
    title: "Sorting and filtering",
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
          "Compatibility field for a remote sort key that differs from name/id.",
      },
      {
        name: "filterable",
        type: "boolean",
        defaultValue: "false unless enableFiltering is true and you opt in",
        description: "Turns filter editor rendering on for the column.",
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
        defaultValue: "column name/id",
        description: "Remote filter field name override.",
      },
      {
        name: "filterEditor",
        type: "ComponentType<Record<string, unknown>>",
        defaultValue: "-",
        description: "Custom filter editor component.",
      },
      {
        name: "filterEditorProps",
        type: "unknown",
        defaultValue: "-",
        description: "Props forwarded to the active filter editor.",
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
        description: "Inline style object applied to cells.",
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

const typesSections: ReferenceSection[] = [
  {
    id: "typedatasource",
    title: "TypeDataSource",
    body: (
      <div className="space-y-4 text-sm text-muted-foreground">
        <p>
          <code>TypeDataSource</code> accepts local arrays, promises, and
          function-based remote sources. Remote functions receive the current
          grid state every time the grid reloads.
        </p>
        <CodeBlock
          code={`type TypeDataSource =
  | unknown[]
  | Promise<unknown[]>
  | Promise<{ data: unknown[]; count: number }>
  | ((props: unknown) => unknown[])
  | ((props: unknown) => Promise<unknown[]>)
  | ((props: unknown) => Promise<{ data: unknown[]; count: number }>);`}
          language="ts"
        />
        <CodeBlock code={remoteDataSnippet} language="tsx" />
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
  active?: boolean;
};

type TypeFilterValue = TypeSingleFilterValue[] | null;`}
          language="ts"
        />
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
      </div>
    ),
  },
  {
    id: "typei18n",
    title: "TypeI18n",
    body: (
      <div className="space-y-4 text-sm text-muted-foreground">
        <p>
          <code>TypeI18n</code> is a simple object map. At minimum, provide keys
          for the strings your product needs to localize.
        </p>
        <ReferenceTable
          rows={[
            {
              name: "noRecords",
              type: "string | ReactNode",
              defaultValue: "built-in fallback",
              description: "Empty-state body text.",
            },
            {
              name: "clear",
              type: "string | ReactNode",
              defaultValue: "built-in fallback",
              description: "Single-filter clear action label.",
            },
            {
              name: "clearAll",
              type: "string | ReactNode",
              defaultValue: "built-in fallback",
              description: "Global clear action label.",
            },
            {
              name: "contains / startsWith / endsWith / eq / neq / empty / notEmpty",
              type: "string | ReactNode",
              defaultValue: "built-in fallback",
              description: "Filter operator labels.",
            },
            {
              name: "columns",
              type: "string | ReactNode",
              defaultValue: "built-in fallback",
              description: "Column menu heading.",
            },
            {
              name: "sortAsc / sortDesc / unsort",
              type: "string | ReactNode",
              defaultValue: "built-in fallback",
              description: "Sorting action labels.",
            },
          ]}
        />
      </div>
    ),
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
            <li>Local array filtering when enableFiltering is on.</li>
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
                See every prop, its type, and its default behavior.
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
              enableFiltering applies local filter operators against the array.
            </li>
            <li>sortInfo applies local sorting against the same array.</li>
            <li>filteredRowsCount receives the post-filter row count.</li>
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
              Remote data sources always receive sortInfo and filterValue.
            </li>
            <li>
              When pagination is remote, skip and limit are included in the
              args.
            </li>
            <li>
              columns and columnOrder are passed so the server can understand
              the current user-facing grid shape.
            </li>
            <li>
              Return either an array or a {`{ data, count }`} object when the
              total count differs from the current slice.
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
              Use <code>sortable</code> to opt columns into header sorting.
            </li>
            <li>
              Use <code>filterable</code>, <code>filterType</code>, and{" "}
              <code>filterEditor</code> to shape each filter cell.
            </li>
            <li>
              Use <code>enableColumnFilterContextMenu</code> to expose the
              operator switcher UI.
            </li>
          </ul>
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
                The supported long-term model is the row-id object map. Inovua's{" "}
                <code>selected === true</code> plus <code>unselected</code>{" "}
                pattern is not the primary path in this library.
              </p>
            </Callout>
          </div>
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
      "These skill files encode the real grid contract, the remote-data model, and the Inovua compatibility boundaries so AI agents do not invent unsupported props or behavior.",
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
                    "Migration guidance for Inovua-shaped code without claiming unsupported parity.",
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
              <li>Do not claim full Inovua parity for unsupported features.</li>
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
    slug: "reactdatagrid",
    title: "ReactDataGrid prop reference",
    summary: "Complete prop-by-prop reference for the main grid component.",
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
      "The grid uses Inovua-aligned naming for column configuration. This page covers identity, rendering, sizing, filtering, and alignment fields.",
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
    group: "migration",
    slug: "inovua-compat",
    title: "Inovua compatibility",
    summary:
      "How the-datagrid mirrors the Inovua mental model, and where you should expect a leaner implementation.",
    description:
      "The package intentionally keeps Inovua-inspired names and callback shapes for migration ergonomics, while narrowing the runtime to the core grid surface used by this project.",
    tags: ["Migration", "Inovua", "Compatibility"],
    sections: [
      {
        id: "what-maps-cleanly",
        title: "What maps cleanly",
        body: (
          <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            <li>
              Type names such as IColumn, TypeDataSource, TypeFilterValue, and
              TypeSortInfo.
            </li>
            <li>Numeric sort directions and filter operator modeling.</li>
            <li>
              Checkbox column behavior and the onSelectionChange wrapper shape.
            </li>
            <li>
              Column render ergonomics, including render(
              {`{ value, data, ... }`}).
            </li>
          </ul>
        ),
      },
      {
        id: "intentional-differences",
        title: "Intentional differences",
        body: (
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              the-datagrid focuses on a smaller, maintainable feature set. The
              public docs and examples center on core table features: columns,
              sorting, filtering, selection, virtualization, i18n, and theming.
            </p>
            <Callout title="Document the supported surface" tone="warning">
              <p>
                If your app depends on advanced Inovua systems such as grouping,
                pivoting, tree data, or larger plugin ecosystems, treat this
                library as a focused compatibility layer rather than a drop-in
                replacement for every Inovua feature.
              </p>
              <p>
                The same caution applies to advanced systems such as clipboard
                tooling, row reorder, richer generated-column pipelines, or
                cell-selection flows that are outside the current documented
                promise.
              </p>
            </Callout>
          </div>
        ),
      },
      {
        id: "migration-checklist",
        title: "Migration checklist",
        body: (
          <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
            <li>Start with the same column names and idProperty values.</li>
            <li>
              Port local or remote dataSource functions without changing the
              remote args contract.
            </li>
            <li>
              Verify render callbacks. Both Inovua-style and legacy two-arg
              renderers are supported.
            </li>
            <li>
              Move selection screens to checkboxColumn plus
              selected/onSelectionChange, and prefer map-based selected state.
            </li>
            <li>
              Use the live examples to validate styling, selection, and
              filtering behavior screen by screen.
            </li>
          </ol>
        ),
      },
    ],
  },
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
      title: "Reference",
      summary:
        "Read the prop-by-prop ReactDataGrid and IColumn references, plus the public component pages.",
      kind: "docs" as const,
      group: "reference" as const,
      slug: "reactdatagrid",
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
