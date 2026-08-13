# the-datagrid

A modern, feature-rich React data grid built on **TanStack Table** with a **shadcn-aligned** look-and-feel and **self-contained packaged styles**.

Documentation and live examples: https://geo-vi.github.io/the-datagrid/

## Features

- Virtualized rendering for large datasets
- Sorting (single + multi-column)
- Filtering with a built-in filter row and operators
- Opt-in global table search through a separate, tree-shakeable entry
- Opt-in grid toolbar: column toggles, export, filter-row and clear-filter actions
- Column management (reorder, resize, auto-size)
- Stacked and nested column headers with split/rejoin and group resizing
- Pagination (local + remote)
- Row selection (checkbox column)
- Modern shadcn-aligned look-and-feel with packaged styles
- Fully typed TypeScript API
- Public product target of 100% backwards compatibility with Inovua Community

## Inovua compatibility

the-datagrid targets **100% backwards compatibility** with the documented
public API and observable behavior of
[`@inovua/reactdatagrid-community@5.10.2`](https://www.npmjs.com/package/@inovua/reactdatagrid-community/v/5.10.2).
After changing the package dependency and import specifier, public
Inovua-shaped application business logic should not require a rewrite.

The audited Community 5.10.2 release gate is implemented and backed by
type, runtime, browser, packed-package, and performance tests. Compatibility
covers more than similarly named TypeScript fields: it includes defaults,
runtime behavior, callback payloads and timing, controlled/uncontrolled state,
local and remote data flow, layout, keyboard and focus interaction, and
accessibility behavior.

The Issue 17 and Issue 31–45 compatibility batches implement and
regression-test:

- Inovua's `idProperty`, theme, row/filter height, text-selection, filter-menu,
  and column-menu defaults;
- tri-state filter-row inference and the upstream controlled/uncontrolled local
  transformation split;
- root class/style and focus, blur, and keyboard lifecycle handlers; and
- packed-package compatibility across React 16.8, 17, 18, and 19;
- natural and per-row height (`rowHeight={null}`, a `rowHeight` function,
  `minRowHeight`/`maxRowHeight`, and width-change remeasurement);
- `onColumnResize`, controlled `width`, and uncontrolled `defaultWidth`;
- weighted `flex`/`defaultFlex` remaining-space allocation;
- visible zebra rows by default and the per-grid `showZebraRows` toggle;
- inline editing (`editable`, `editStartEvent`, column editors, lifecycle
  callbacks, cancellation, focus, and keyboard navigation);
- object- or function-valued whole-row `rowStyle`.
- stacked and nested column groups, custom group headers, split/rejoin
  reordering, controlled group moves, proportional group resizing, and
  horizontal-virtualization geometry;
- the standalone
  `@geovi/the-datagrid/packages/TextInput` compatibility entry, including its
  value-first callbacks, clear tool, legacy class hooks, and imperative ref;
- the `onDidMount` computed-props lifecycle callback; and
- `getVirtualList().adjustHeights()` for instantiated variable-height rows in
  virtual and non-virtual layouts.

This closes the audited Community gate. The
[source release ledger](docs/inovua-community-5.10.2-compatibility.md) maps
every child issue to executable evidence, and
[`community-api-manifest.json`](community-api-manifest.json) records the
behavior-backed computed API, plugins, types, and Enterprise exclusions.
Unknown computed method names are absent instead of being fabricated as no-op
functions. Any future mismatch is a compatibility regression and must be
tracked with executable coverage.

Issue 48 explicitly adopts Inovua's standalone `TextInput` toolkit path. Migrate
its default import to `@geovi/the-datagrid/packages/TextInput`; the package also
provides a named root export. The deep entry and its class-instance TypeScript
shape are now part of the compatibility contract.

Read the public
[compatibility contract](https://geo-vi.github.io/the-datagrid/docs/migration/inovua-compat)
and the
[living implementation-status ledger](https://geo-vi.github.io/the-datagrid/docs/migration/inovua-status)
before treating the current package as a drop-in runtime replacement.

## Implemented today

The following inventory describes behavior that ships in the current package.
The public docs contain the full
[source-backed implemented-surface reference](https://geo-vi.github.io/the-datagrid/docs/reference/implemented-surface),
including exact defaults, timing, transform order, exports, and imperative
method allowlists.

- **Data loading:** local arrays, static Promises, and function-backed sources
  returning either an array or `{ data, count }`. Function sources
  receive `sortInfo`, `filterValue`, `columnOrder`, `columns`, `idProperty`, and
  `theme`, plus `skip`/`limit` when remote pagination is active and the optional
  `searchValue` when connected to the search entry. Function args also include
  an optional, non-enumerable `AbortSignal`; replacement requests abort the
  prior signal without changing the established enumerable request keys, and
  stale async responses are ignored even when a source does not honor it.
  Rejections preserve the last committed rows and clear their automatic loading
  state. `loading`, `loadingText`, `renderLoadMask`, and `onLoadingChange`
  expose the effective lifecycle without unmounting replacement rows.
- **Local and remote data flow:** local arrays own local pagination. With
  `pagination={true}`, every Promise/function result is an authoritative remote
  page and is never sliced a second time. `pagination="local"` opts a
  Promise/function source into local slicing; bare Promise arrays can also be
  searched, filtered, and sorted when pagination is disabled or explicitly
  local.
  `filteredRowsCount` reports the post-search, post-filter count before local
  page slicing.
- **Columns and cells:** stable `id`/`name` identity, controlled rendered order,
  callback-driven drag reordering, explicit visibility, custom headers and cell
  renderers, per-column sorting/filtering/search configuration, alignment, cell
  classes/styles, and header props. Root `groups`, `column.group`, and nested
  `groups[].group` render accessible stacked headers with automatic split/rejoin
  segments, block dragging, and proportional min/max-clamped resizing.
- **Column and row sizing:** controlled `width`/`flex`, uncontrolled
  `defaultWidth`/`defaultFlex`, `minWidth`/`maxWidth` clamps, proportional flex
  allocation, the upstream 40px implicit column minimum (while preserving an
  explicit `minWidth={0}`), deterministic autosizing from a bounded row sample,
  mouse/pen/touch drag resizing with `onColumnResize`, opt-in
  animation-frame-coalesced `liveColumnResize`, and double-click autosizing.
  Rows support numeric, functional, and natural measured heights with
  minimum/maximum bounds and width-change remeasurement.
- **Filtering and sorting:** inferred or explicitly controlled filter-row
  visibility, uncontrolled local filters, externally owned controlled filter
  state, custom filter registries and editors, filter operator menus, single
  sorting, persistent array-valued multi-sorting, custom comparator registries
  and sort tools, configurable initial direction, optional unsorting, and
  configurable scroll reset behavior. Filter and sort changes reset pagination
  to the first page.
- **Pagination:** controlled or uncontrolled `skip` and `limit`, local and remote
  modes, configurable page sizes, a built-in accessible pager, an
  Inovua-shaped `renderPaginationToolbar` contract, and reload/refresh/page
  navigation helpers.
- **Selection:** single or multi-row selection, a configurable checkbox column,
  controlled or uncontrolled selection maps, checkbox-only row selection,
  Shift-range checkbox selection, and custom checkbox rendering.
- **Rendering modes:** fixed, per-row, or natural measured desktop row
  virtualization, a non-virtual table path, sticky header and filter rows, and
  an opt-in responsive virtual card layout at viewport widths up to 1024px. The
  mobile layout retains cell renderers and selection while providing search,
  sorting, and a hideable-column picker.
- **Row appearance and editing:** visible default zebra striping with a per-grid
  toggle, data-dependent row styling, default/custom inline editors, click or
  double-click activation, sync/async column editability, session-safe async
  completion, cancellation, and keyboard traversal. Custom editors receive the
  Inovua-shaped editor/cell contract, and the imperative API can start, inspect,
  complete, or cancel an edit. Completing an edit reports the value;
  applications remain responsible for persisting it to their data source. The
  mobile card transform stays disabled whenever root or column-level editing is
  enabled so the editing surface is never silently replaced.
- **Optional global search:** a separate tree-shakeable provider/bar/target
  entry, normalized AND matching, column-scoped queries and aliases, nested or
  derived search values, hidden-column search, a lazy cached local index, static
  Promise search, and `searchValue` forwarding for remote functions.
- **Optional toolbar:** a separate provider/toolbar/target entry that
  follows live grid order and visibility, honors non-hideable columns, protects
  the final visible column, and accepts application actions on the right.
- **Themes and UI:** packaged CSS, shadcn-aligned controls, fixed
  `default-light`/`light`, adaptive `default`, and fixed `dark` token bases,
  custom `data-theme` hooks, grid-scoped menu portals, cell-border modes, i18n
  overrides, and compatibility class hooks for existing Inovua-oriented theme
  styles.
- **Imperative compatibility API:** `onDidMount`, `handle`, and `onReady`
  expose the same stable `TypeComputedProps` ref with implemented data,
  pagination, filtering, sorting, column lookup/order/visibility, selection, DOM
  lookup, scrolling, loading, header/filter visibility, localization, editing,
  and virtual-list helpers. `onDidMount` runs first from the passive mount
  lifecycle; `getVirtualList().adjustHeights()` reads the instantiated
  variable-height rows' DOM `scrollHeight` without registering extra resize
  observers.
  The editing subset includes `startEdit`, `tryStartEdit`, `completeEdit`,
  `cancelEdit`, `getCurrentEditInfo`, `isInEdit`, and
  `currentEditCompletePromise`. The API is explicit and behavior-backed;
  unknown method-like properties resolve to `undefined`.

### Migration: data-transform ownership

This release makes one component responsible for each sort/page transform:

- A controlled `sortInfo` supplies indicators and callback/request state but
  does not reorder a local array. Use `defaultSortInfo` for grid-owned local
  sorting, or sort the rows in the parent before passing them to `dataSource`.
- With `pagination={true}` or `"remote"`, static Promise arrays and
  `Promise<{ data, count }>` values are authoritative remote pages and are not
  sliced a second time.
- Set `pagination="local"` to opt a Promise result into local slicing. Bare
  Promise arrays also retain local search/filter/sort composition when
  pagination is disabled.

These are intentional compatibility changes for consumers that relied on the
previous implicit transforms. They align the grid with React controlled-state
ownership, TanStack manual sorting/pagination, and Inovua 5.10.2. See the
[source-backed architecture evaluation](docs/inovua-parity-issues-32-37.md#architecture-evaluation-one-owner-per-transform)
for rationale and migration examples.

### Public package entries and exports

The main entry, `@geovi/the-datagrid`, exports:

- default and named `ReactDataGrid`, plus executable descriptors for the
  built-in sorting, filtering, menu, and cell-selection plugins;
- `BoolEditor`, `DateEditor`, `NumericEditor`, `StringFilter`, `BoolFilter`,
  `DateFilter`, `NumberFilter`, `SelectFilter`, `CheckBox`, and the named
  `TextInput`;
- `DEFAULT_FILTER_TYPES` and its `filterTypes` alias;
- the public types `CellProps`, `IColumn`, `SortDirection`, `TypeColumn`,
  `TypeColumns`, `TypeColumnEditorProps`, `TypeColumnResizeContext`,
  `TypeColumnResizeInfo`, `TypeColumnEditorCell`, `TypeComputedColumn`,
  `TypeComputedColumnsMap`, `TypeComputedProps`, `TypeDataGridProps`,
  `TypeColumnGroup`, `TypeColumnGroupDOMProps`,
  `TypeColumnGroupHeaderProps`, `TypeDataSourceArgs`, `TypeDataSource`,
  `TypeDataSourceResult`,
  `TypePaginationProps`, `TypeLoadMaskProps`, `TypeEditInfo`, `TypeStartEditArgs`,
  `TypeTryStartEditArgs`, `TypeCompleteEditArgs`, `TypeCancelEditArgs`,
  `TypeFilterOperator`, `TypeFilterType`, `TypeFilterTypes`, `TypeFilterValue`,
  `TypeGetColumnByParam`, `TypeI18n`, `TypeOnSelectionChangeArg`,
  `TypePaginationMode`, `TypeRowSelection`, `TypeRowStyle`, `TypeRowStyleArgs`,
  `TypeRowStyleProps`, `TypeShowCellBorders`, `TypeSize`, `TypeSingleFilterValue`,
  `TypeSingleSortInfo`, `TypeSortInfo`, `TypeSortFunction`,
  `TypeSortFunctions`, `TypeColumnSort`, `TypeSortToolProps`,
  `TypeRenderSortTool`, `TypeCheckboxColumn`, `TypeCheckboxProps`,
  `TextInputProps`, `TypeTextInputProps`, and the TextInput
  callback/input/wrapper/clear-button helper types.

The same editors and filters are available through their documented deep
imports. `@geovi/the-datagrid/types` and the documented
`@geovi/the-datagrid/types/Type*` paths expose the migration type vocabulary.
The main and Community compatibility entries publish both ESM and CommonJS.

The optional `@geovi/the-datagrid/search` entry exports `RDGSearchProvider`,
`RDGSearchBar`, `RDGSearchTarget`, and their prop types. The explicit stylesheet
fallbacks include `@geovi/the-datagrid/index.css`,
`@geovi/the-datagrid/base.css`, every documented default/amber/blue/green/pink
light/dark theme path, and `@geovi/the-datagrid/search/style.css`.

The optional `@geovi/the-datagrid/components` entry is the one-import choice for
mixed contextual controls. It exports `RDGProvider`, `RDGTarget`,
`RDGSearchBar`, `RDGToolbar`, all four stable feature-specific
provider/target APIs, and their prop types. It reuses the existing search and
toolbar singleton contexts and automatically loads both isolated
stylesheets; there is intentionally no duplicate `components/style.css`.

The optional `@geovi/the-datagrid/toolbar` entry exports
`RDGToolbarProvider`, `RDGToolbar`, `RDGToolbarTarget`, and their prop types.
Its explicit stylesheet fallback is
`@geovi/the-datagrid/toolbar/style.css`.

The Inovua-compatible standalone input remains a default class export at
`@geovi/the-datagrid/packages/TextInput`. That deep entry loads the packaged
standalone styles, does not load the grid runtime, and preserves `focus()` /
`setValue()` instance refs.

### Runtime defaults and filter registry

Both the default and named grid exports expose `ReactDataGrid.defaultProps` for
Inovua-shaped integrations that inspect or extend runtime defaults. It contains
the shipped theme, filtering, autosize, resize, virtualization, mobile,
selection-text, border, menu, and row/header/filter-height defaults, including
the default filter registry.

That registry ships string operators (`contains`, `notContains`, `containsOr`,
`eq`, `neq`, `empty`, `notEmpty`, `startsWith`, and `endsWith`), select
operators (`inlist`, `notinlist`, `eq`, and `neq`), boolean equality operators,
number comparison/range operators, and date/time comparison/range operators.
Operator definitions can opt into empty-value filtering, initialize a value
when selected, or disable the editor for value-free operations.

Unseeded `bool` and `boolean` filters default to `eq`, matching their shipped
operator registry. Other defaults are `contains` for strings, `gte` for
numbers, `eq` for selects, and `afterOrOn` for date/time values.

Custom filter types are shallow-merged by registry key with the built-ins:

```tsx
import ReactDataGrid, { type TypeFilterTypes } from "@geovi/the-datagrid";

const filterTypes: TypeFilterTypes = {
  ...ReactDataGrid.defaultProps.filterTypes,
  status: {
    type: "status",
    emptyValue: null,
    operators: [
      {
        name: "eq",
        fn: ({ value, filterValue }) =>
          filterValue == null || value === filterValue,
      },
    ],
  },
};
```

## Installation

```bash
npm install @geovi/the-datagrid react react-dom
# or
yarn add @geovi/the-datagrid react react-dom
# or
pnpm add @geovi/the-datagrid react react-dom
```

That is the normal installation flow for consumers.

The peer contract supports React and React DOM 16.8, 17, 18, and 19. The
published-package compatibility matrix installs the packed tarball against an
exact version from every supported major, compiles its declarations, and mounts
the core grid, optional providers, mobile layout, and menu interactions. React
16/17 use the package's official external-store shim and compatibility fallbacks
for newer React hooks.

The shipped JavaScript already bundles the tested Radix, TanStack, icon, and
utility implementations, so consumers do not install a second, independently
resolved UI dependency graph. Those packages remain development dependencies
for building the library; the official external-store shim is the only runtime
dependency in the published manifest.

You do **not** need to install:

- Tailwind CSS
- shadcn/ui
- a separate package stylesheet import in normal app setups

This also applies when you use custom grid themes. The grid theme variables are plain CSS variables in the shipped stylesheet, so consumers do not need Tailwind just to use `theme="dark"`, `theme="hf-dark"`, or their own imported grid theme CSS.

## Styling

`@geovi/the-datagrid` ships compiled CSS and loads it automatically from the package entry.

In a typical React app with a modern bundler, this is enough:

- Vite
- Next.js
- Webpack-based apps
- other setups that support CSS imports from npm packages

The grid keeps a shadcn-aligned look and uses the same token vocabulary
(`--background`, `--foreground`, `--border`, `--ring`, etc.). The adaptive
`theme="default"` inherits those app-level variables, while fixed theme bases
and explicit `--tdg-*` custom-theme tokens stay scoped to the grid. Packaged
fallbacks keep the grid usable when an app does not define shadcn variables.

Theme variables are resolved at runtime from normal CSS, not from the consumer's Tailwind build. Tailwind is only used to build this library, not required to consume it.

Built-in theme behavior:

- `theme="default-light"` is the default and keeps a fixed shadcn light token
  base—even below a `.dark` application ancestor—while preserving the
  Inovua-compatible theme name on the grid root
- `theme="default"` follows the nearest `.dark` ancestor
- `theme="light"` forces the light token set
- `theme="dark"` forces the dark token set
- `theme="<custom-name>"` activates a named custom theme on the grid root via `data-theme="<custom-name>"`

The fixed light base remains customizable through the documented
`--tdg-color-*` and component-level `--tdg-*` variables. A custom named theme
can therefore opt into a `-light` suffix without losing its own explicit grid
tokens.

For non-built-in theme names, the grid also keeps Inovua-compatible root and
element class hooks. When a readable legacy Inovua stylesheet for that theme is
already loaded, the runtime maps its grid, text-input, combo-box, and menu
colors into the corresponding `--tdg-*` tokens. This bridge helps existing
themes migrate incrementally; it is browser-only, ignores unreadable or
late-loaded stylesheets, and does not reproduce legacy layout CSS. Defining the
grid tokens directly remains the deterministic long-term path.

If your environment does **not** process CSS imported from package entries, use the exported fallback once in your app:

```ts
import "@geovi/the-datagrid/style.css";
```

### Custom named themes

Named themes are configured with CSS variables on the grid root selector. For example, this custom `hf-dark` theme can be used with `theme="hf-dark"`:

```css
.tdg-root[data-theme="hf-dark"] {
  --tdg-color-background: #191919;
  --tdg-color-foreground: #e5e5e5;
  --tdg-color-accent: #26324a;
  --tdg-grid-bg: #191919;
  --tdg-header-bg: #1e1e1e;
  --tdg-grid-border-color: #2c2c2c;
  --tdg-cell-border-color: #2c2c2c;
  --tdg-header-border-color: #2c2c2c;
  --tdg-row-odd-bg: #191919;
  --tdg-row-even-bg: #191919;
  --tdg-row-odd-hover-bg: #26324a;
  --tdg-row-even-hover-bg: #26324a;
  --tdg-row-selected-bg: #1a2740;
  --tdg-row-selected-hover-bg: #1a2740;
  --tdg-input-bg: #191919;
  --tdg-input-border-color: #383838;
  --tdg-input-border-color-hover: #383838;
  --tdg-input-border-color-focus: #383838;
  --tdg-select-bg: #191919;
  --tdg-select-list-bg: #191919;
  --tdg-select-border-color: #383838;
  --tdg-select-border-color-hover: #383838;
  --tdg-select-border-color-focus: #383838;
  --tdg-select-item-hover-bg: #26324a;
  --tdg-select-item-selected-bg: #26324a;
  --tdg-checkbox-checked-bg: #688ad7;
  --tdg-checkbox-checked-color: #e5e5e5;
  --tdg-checkbox-indeterminate-bg: #688ad7;
  color-scheme: dark;
}
```

This lets you keep using a migration-friendly theme name such as `hf-dark` while mapping it to the grid’s internal theme tokens.

The example assigns identical odd/even row colors, which intentionally
suppresses visible striping for that custom theme. Built-in themes show zebra
rows by default; `showZebraRows={false}` disables them for one grid, while
`--tdg-row-odd-bg` and `--tdg-row-even-bg` customize their theme colors.

---

## Basic usage

```tsx
import { ReactDataGrid } from "@geovi/the-datagrid";
import type { TypeColumns } from "@geovi/the-datagrid";

export default function App() {
  const columns: TypeColumns = [
    { name: "id", header: "ID", sortable: true, filterable: true },
    { name: "name", header: "Name", sortable: true, filterable: true },
    { name: "email", header: "Email", sortable: true, filterable: true },
  ];

  const rows = [
    { id: 1, name: "John Doe", email: "john@example.com" },
    { id: 2, name: "Jane Smith", email: "jane@example.com" },
  ];

  return (
    <ReactDataGrid
      idProperty="id"
      columns={columns}
      dataSource={rows}
      virtualized
      enableFiltering
      defaultFilterValue={[
        { name: "id", type: "number", operator: "eq", value: null },
        { name: "name", type: "string", operator: "contains", value: "" },
        { name: "email", type: "string", operator: "contains", value: "" },
      ]}
    />
  );
}
```

## Combined contextual controls

Use one `RDGProvider` when search and the toolbar control the same grid.
A direct grid child connects automatically:

```tsx
import ReactDataGrid from "@geovi/the-datagrid";
import {
  RDGToolbar,
  RDGProvider,
  RDGSearchBar,
} from "@geovi/the-datagrid/components";

<RDGProvider>
  <RDGSearchBar />
  <RDGToolbar showExport showFilterToggle />
  <ReactDataGrid idProperty="id" columns={columns} dataSource={rows} />
</RDGProvider>;
```

If a `div`, card, Fragment, Suspense boundary, or application component sits
between the provider and grid, put one `RDGTarget` immediately around the grid.
`RDGProvider` and `RDGTarget` add no DOM elements and support one grid per
provider scope. Use `defaultSearchValue` when the shared search query needs a
non-empty initial value. Do not nest `RDGSearchTarget` and
`RDGToolbarTarget`; use the combined target instead.

Controls imported from `@geovi/the-datagrid/search` and
`@geovi/the-datagrid/toolbar` also work inside `RDGProvider`. The
existing `RDGSearchProvider`, `RDGSearchTarget`,
`RDGToolbarProvider`, and `RDGToolbarTarget` exports remain
supported and are not deprecated.

## Optional table search

Global search is intentionally separate from the main component entry. A plain
`ReactDataGrid` does not render a search control, subscribe to search context,
or load the optional provider, store, or search stylesheet. The optional entry
reuses the same core search field and search engine already used by the mobile
layout, so search-enabled screens do not ship a second implementation. Import
the provider and bar only on screens that need them:

```tsx
import ReactDataGrid from "@geovi/the-datagrid";
import { RDGSearchBar, RDGSearchProvider } from "@geovi/the-datagrid/search";

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
}
```

The provider automatically connects marked `ReactDataGrid` elements that are
its direct children. If layout markup needs to sit between the provider and the
grid, mark the grid explicitly:

```tsx
import {
  RDGSearchBar,
  RDGSearchProvider,
  RDGSearchTarget,
} from "@geovi/the-datagrid/search";

<RDGSearchProvider>
  <RDGSearchBar />
  <section className="min-h-0 flex-1">
    <RDGSearchTarget>
      <ReactDataGrid idProperty="id" columns={columns} dataSource={rows} />
    </RDGSearchTarget>
  </section>
</RDGSearchProvider>;
```

See [Providers and targets](https://geo-vi.github.io/the-datagrid/docs/reference/providers-and-targets)
for the exact direct-child rule, Fragment and Suspense boundaries, and
multiple-grid scoping.

The normal-table bar and transformed-mobile search are two placements of the
same internal component. They use the same shadcn-style Input and Button,
column-prefix highlighting, IME handling, Escape behavior, and clear/refocus
interaction. Local arrays and bare Promise snapshots under disabled/explicitly
local pagination also use the same normalization and matching engine. Function
data sources receive the committed `searchValue` and remain responsible for
remote matching. When
`allowMobileTransform` is active under `RDGSearchProvider`, the external
placement remains the single search control; the mobile list suppresses only
its duplicate placement while keeping its sort and column tools.

`RDGSearchBar` uses the accessible label `Search all fields`, the placeholder
`Search all fields`, and a 150 ms provider commit debounce by default. Set
`debounceMs={0}` for an immediate remote/local commit or pass another delay.
The input interaction itself is shared with mobile. Terms are matched with AND
semantics after case, whitespace, and diacritic normalization. Prefix a query
with a column id, name, string header, or configured alias to scope it, for
example `city:paris`.

Column-level search configuration stays on `TypeColumn` rather than adding new
`ReactDataGrid` props. Configured columns remain searchable when hidden; use
`searchable: false` for an explicit exclusion:

```tsx
const columns: TypeColumns = [
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
];
```

For local data, the normalized search index is built lazily on the first
committed query and reused while the row and column arrays keep the same
identity. Update rows and column configuration immutably so changed searchable
content naturally invalidates that cache.

The optional entry loads its own scoped stylesheet. If your environment does
not process package CSS imports, add
`import "@geovi/the-datagrid/search/style.css"` beside the manual grid
stylesheet import.

For local arrays, search is combined with column filters before local
pagination and `filteredRowsCount` reports the combined result count. A bare
static Promise array is locally searchable when pagination is disabled or
explicitly `"local"`. With `pagination={true}`/`"remote"`, either Promise
result shape is authoritative and is not post-filtered or sliced. A function
data source remains remote and receives `searchValue` alongside its existing
args; when remote pagination is active, a new search resets `skip` to `0`.

```tsx
import type { TypeDataSourceArgs } from "@geovi/the-datagrid";

const dataSource = async ({
  searchValue,
  signal,
  ...gridArgs
}: TypeDataSourceArgs) => {
  const response = await fetch("/api/accounts/search", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...gridArgs, searchValue }),
    signal,
  });

  return response.json();
};
```

Remote functions own the search operation. The grid does not post-filter one
remote page and present it as a server-wide result. If the backend does not yet
support global search, keep that search state application-owned until its
request contract is defined.

## Optional grid toolbar

Grid toolbar controls are also an opt-in contextual entry. A direct grid child
connects automatically. Column toggles always render; export, filter-row and
clear-filter buttons are opt-in props, and toolbar children stay a separate
right-side action area for consumer-owned controls:

```tsx
import ReactDataGrid from "@geovi/the-datagrid";
import { RDGToolbarProvider, RDGToolbar } from "@geovi/the-datagrid/toolbar";

<RDGToolbarProvider>
  <RDGToolbar showExport showFilterToggle showClearFilters>
    <button type="button" onClick={reload}>
      Reload
    </button>
  </RDGToolbar>
  <ReactDataGrid idProperty="id" columns={columns} dataSource={rows} />
</RDGToolbarProvider>;
```

`showExport` writes the grid's current columns, in grid order, as CSV, JSON or
XLSX. Spreadsheet output needs the optional `xlsx` peer dependency:

```bash
npm install xlsx
```

It is left out of `exportFormats` by default, since its writer is many times the
size of the toolbar entry, and it is imported on demand the first time somebody
exports a workbook. Values keep their JavaScript type on the way into a
workbook, so numbers stay summable, `Date` values become date cells carrying
`exportDateFormat`, and booleans become `TRUE`/`FALSE`; text formats stringify
the same values and write dates as ISO-8601. `exportDateFormat` is an Excel
number format code rather than a date-library pattern, `exportSheetName` names
the worksheet, and `onExportError` reports a failure such as a missing peer
dependency.

`exportScope` selects the rows: `"view"` (default) exports the filtered,
searched and sorted rows, `"all"` the entire data source. Under local pagination
the grid holds a single page, so `"view"` exports that page. `exportFormats`,
`exportFileName` and `labels` cover the rest; with exactly one format the button
exports on click instead of opening a menu.

Export reads row values, never `render`, which returns React nodes. Columns
describe their own exported shape:

```tsx
const columns: TypeColumns = [
  { name: "id", header: "ID" },

  // render returns a React node, so export needs its own value.
  {
    name: "active",
    header: "Active",
    render: ({ value }) => <StatusPill active={value} />,
    exportValue: ({ value }) => (value ? "Yes" : "No"),
  },

  // Hidden in the grid, still written to the file.
  {
    name: "auditId",
    header: "Audit ID",
    defaultVisible: false,
    exportWhenHidden: true,
  },

  // Row buttons have no exportable representation.
  { name: "actions", header: "Actions", exportable: false },
];
```

Only visible columns are exported unless a column sets `exportWhenHidden`, and
`exportable: false` always wins. `showFilterToggle` drives the grid's own
filter-row state, so it renders disabled while `enableFiltering` is passed as a
controlled prop; `showClearFilters` calls `clearAllFilters` and stays disabled
while nothing is filtered.

The toolbar renders columns in the grid's current order and reflects the live
visibility map. It uses string or numeric headers with stable `id`/`name`
fallbacks, omits columns with `hideable={false}`, and does not allow the final
visible column to be hidden. Button state is exposed through `aria-pressed`; no
eye icon or parallel application visibility state is required.

Set controlled `visible: false`, uncontrolled `defaultVisible: false`, or the
legacy `defaultHidden: true` alias on a column that should start hidden.
`hideable: false` disables menu/toolbar toggles but does not block the
imperative API. `onColumnVisibleChange({ column, visible })` receives every
effective proposal. A declarative `visible` value remains authoritative until
the parent applies that proposal; otherwise the grid persists the change in
its own runtime state.

The default title is a level-two heading that labels the toolbar region. The
toggle group keeps its `ariaLabel`, and the description is associated with both
through `aria-describedby`. Passing `title={null}` suppresses the heading while
preserving the group's accessible name.

### Styling the toolbar

The toolbar carries no utility classes: every visual decision is a
`--tdg-toolbar-*` custom property, so restyling means redeclaring tokens on
`.tdg-toolbar-root` or any ancestor.

```css
.tdg-toolbar-root {
  --tdg-toolbar-padding: 0;
  --tdg-toolbar-radius: 0;
  --tdg-toolbar-border-width: 0;
  --tdg-toolbar-shadow: none;

  --tdg-toolbar-toggle-gap: 3px;
  --tdg-toolbar-control-padding: 6px 8px;
  --tdg-toolbar-control-radius: 4px;
  --tdg-toolbar-control-height: auto;
  --tdg-toolbar-control-cursor: pointer;

  --tdg-toolbar-control-fill: #eef1f5;
  --tdg-toolbar-control-color: #12263f;
  --tdg-toolbar-control-on-fill: #1a73e8;
  --tdg-toolbar-control-on-color: #ffffff;
}
```

Colour tokens fall back through `--tdg-color-*` and then the shadcn variable of
the same name, so a themed application inherits sensible values without setting
anything. Bridging another design system - BaseUI, MUI, a styled-components
theme - means assigning its values to these tokens once, on a wrapper element.

Plain CSS overrides work too, and never need `!important`: every default rule is
written with exactly one unit of specificity, so any selector of yours that adds
a second part outranks it.

```css
.tdg-toolbar-root button[data-state="off"] {
  background-color: var(--button-secondary-fill);
}
```

Elements expose stable `data-slot` names (`rdg-toolbar`, `rdg-column-toggle`,
`rdg-toolbar-actions`, `rdg-toolbar-export`, `rdg-toolbar-filter-toggle`, ...),
and toggles expose `data-state` as `on` or `off`. `RDGToolbar` also accepts
`className` for scoping overrides to a class of your own. The complete token
table lives in
[the toolbar styling reference](https://geo-vi.github.io/the-datagrid/docs/reference/toolbar#toolbar-styling).

Stacked, the toolbar places its actions above the column toggles, since a
wrapping toggle list would otherwise push export and the filter controls far
down the card; from `80rem` it becomes a row with toggles leading.

Use `RDGToolbarTarget` around the grid when layout markup separates it
from the provider. Keep one grid per provider so the column model is
unambiguous. The JavaScript entry loads its scoped stylesheet automatically; if
your environment requires manual CSS imports, add
`import "@geovi/the-datagrid/toolbar/style.css"`.

For the complete direct-child rules, nested layout examples, multiple-grid
scoping, and the stability contract for all feature-specific providers and
targets, see [Providers and targets](https://geo-vi.github.io/the-datagrid/docs/reference/providers-and-targets).

When search and the toolbar share a grid, prefer `RDGProvider`/`RDGTarget` from
`@geovi/the-datagrid/components`. The feature-specific provider and target
remain supported for toolbar-only screens and existing integrations.

## Advanced usage

```tsx
import { useMemo, useState } from "react";
import { ReactDataGrid } from "@geovi/the-datagrid";
import type {
  TypeColumns,
  TypeFilterValue,
  TypeI18n,
  TypeOnSelectionChangeArg,
  TypeRowSelection,
} from "@geovi/the-datagrid";

export default function App() {
  const [selected, setSelected] = useState<TypeRowSelection>({});
  const [columnOrder, setColumnOrder] = useState<string[]>([]);

  const columns: TypeColumns = useMemo(
    () => [
      { name: "id", header: "ID", sortable: true, filterable: true },
      { name: "name", header: "Name", sortable: true, filterable: true },
      { name: "email", header: "Email", sortable: true, filterable: true },
    ],
    []
  );

  const defaultFilterValue = useMemo<TypeFilterValue>(
    () => [
      { name: "id", type: "number", operator: "eq", value: null },
      { name: "name", type: "string", operator: "contains", value: "" },
      { name: "email", type: "string", operator: "contains", value: "" },
    ],
    []
  );

  const rows = useMemo(
    () => [
      { id: 1, name: "John Doe", email: "john@example.com" },
      { id: 2, name: "Jane Smith", email: "jane@example.com" },
    ],
    []
  );

  const i18n: TypeI18n = useMemo(
    () => ({
      noRecords: "No records",
      clear: "Clear",
      clearAll: "Clear all",
      enable: "Enable",
      disable: "Disable",
      filter: "Filter",
      operator: "Operator",
      contains: "Contains",
      sortAsc: "Sort A→Z",
      sortDesc: "Sort Z→A",
    }),
    []
  );

  const onSelectionChange = (config: TypeOnSelectionChangeArg) => {
    setSelected(config.selected);
  };

  return (
    <ReactDataGrid
      theme="default"
      idProperty="id"
      columns={columns}
      columnOrder={columnOrder}
      dataSource={rows}
      enableFiltering
      defaultFilterValue={defaultFilterValue}
      onFilterValueChange={(v) => console.log("Filters:", v)}
      filteredRowsCount={(count) => console.log("Filtered rows:", count)}
      enableColumnFilterContextMenu
      enableColumnAutosize
      skipHeaderOnAutoSize={false}
      onColumnOrderChange={setColumnOrder}
      virtualized
      columnUserSelect
      i18n={i18n}
      showColumnMenuTool={false}
      checkboxColumn
      onSelectionChange={onSelectionChange}
      selected={selected}
    />
  );
}
```

`onSelectionChange` still emits the Inovua-style config object. For migration ergonomics, the grid also accepts the emitted object back through `selected`, so `onSelectionChange={setSelectedRows}` works with the same state variable used for `selected`.

## Props (high-level)

Note: this is a curated overview. For the complete contract, refer to the exported TypeScript types.

### Core

| Prop         | Type                | Default  | Description                                                  |
| ------------ | ------------------- | -------- | ------------------------------------------------------------ |
| `idProperty` | `string`            | `"id"`   | Property name used as unique row identifier; JSX may omit it |
| `columns`    | `TypeColumns`       | required | Column definitions                                           |
| `groups`     | `TypeColumnGroup[]` | `[]`     | Stacked and nested column-header descriptors                 |
| `dataSource` | `TypeDataSource`    | required | Data source (array, function, or promise)                    |

### Display

| Prop                   | Type                                             | Default           | Description                                                       |
| ---------------------- | ------------------------------------------------ | ----------------- | ----------------------------------------------------------------- |
| `theme`                | `string`                                         | `"default-light"` | Theme name                                                        |
| `rowHeight`            | `number \| ((rowIndex) => number) \| null`       | `40`              | Fixed, per-row, or naturally measured row height                  |
| `minRowHeight`         | `number`                                         | `20`              | Minimum natural row height and virtualizer estimate               |
| `maxRowHeight`         | `number`                                         | -                 | Optional upper bound for measured or functional row heights       |
| `rowStyle`             | `CSSProperties \| ({ data, props, style }) => …` | -                 | Static or data-dependent style merged onto each row               |
| `disabledRows`         | `{ [displayedIndex: string]: boolean } \| null`  | -                 | Dim and block pointer interaction for displayed row indexes       |
| `showZebraRows`        | `boolean`                                        | `true`            | Show visible alternating row backgrounds                          |
| `headerHeight`         | `number`                                         | `40`              | Header height in pixels                                           |
| `filterRowHeight`      | `number`                                         | `40`              | Filter row height in pixels                                       |
| `virtualized`          | `boolean`                                        | `true`            | Enable virtual scrolling, including measured natural rows         |
| `allowMobileTransform` | `boolean`                                        | `false`           | Use searchable, sortable virtual cards at widths up to 1024px     |
| `columnUserSelect`     | `boolean \| "text" \| "none"`                    | `false`           | Column text selection behavior                                    |
| `showCellBorders`      | `boolean \| "vertical" \| "horizontal"`          | `true`            | Cell separator mode; use `"horizontal"` to disable vertical lines |

A `rowStyle` callback receives the live Inovua-shaped base style, including
`height`, `width`, `minWidth`, and LTR `direction`. It may mutate that object
and return `undefined`, or return a style object to merge. `props.id` preserves
numeric IDs, `rowIndex` is page-local, and `remoteRowIndex` includes the current
pagination offset. Locked-column indexes, presence flags, and section widths
reflect the live rendered geometry.

`disabledRows` follows the Inovua 5.10.2 index contract. A truthy entry such as
`{ 1: true }` disables the second row in the current sorted, filtered, and
page-local view; keys are not row IDs. Disabled rows receive the legacy
`InovuaReactDataGrid__row--disabled` hook, 50% opacity, and no pointer
interaction. They are deliberately still included by controlled selection,
header select-all, and imperative selection/editing APIs, matching upstream.
The current state is also exposed as `props.disabledRow` to `rowStyle` and
custom cell metadata. That callback value preserves upstream’s raw shape:
`null` when the map is absent, `undefined` for a missing key, and the explicit
`false` or `true` entry otherwise.

### Columns

| Prop                       | Type                            | Default | Description                                                                     |
| -------------------------- | ------------------------------- | ------- | ------------------------------------------------------------------------------- |
| `columnOrder`              | `string[]`                      | -       | Controlled ordered array of column ids/names                                    |
| `defaultColumnOrder`       | `string[]`                      | columns | Initial order for grid-owned ordering                                           |
| `onColumnOrderChange`      | `(order: string[]) => void`     | -       | Receives reorder proposals; optional for grid-owned ordering                    |
| `onColumnVisibleChange`    | `({ column, visible }) => void` | -       | Receives controlled or uncontrolled visibility proposals                        |
| `reorderColumns`           | `boolean`                       | `true`  | Disable user drag reordering                                                    |
| `allowGroupSplitOnReorder` | `boolean`                       | `true`  | Allow reordering to split one logical group into visual segments                |
| `resizable`                | `boolean`                       | `true`  | Enable header resize handles                                                    |
| `columnDefaultWidth`       | `number`                        | `150`   | Root fallback when a column has no width/defaultWidth                           |
| `columnMinWidth`           | `number`                        | `40`    | Root fallback when a column has no minWidth                                     |
| `columnMaxWidth`           | `number \| null`                | `null`  | Root fallback when a column has no maxWidth                                     |
| `shareSpaceOnResize`       | `boolean`                       | `false` | Resize the adjacent visible column in the opposite direction                    |
| `columnResizeHandleWidth`  | `number`                        | `24`    | Header resize pointer-target width                                              |
| `columnResizeProxyWidth`   | `number`                        | `5`     | Deferred resize-proxy width                                                     |
| `liveColumnResize`         | `boolean`                       | `false` | Resize rendered geometry during drag; callbacks remain completion-only          |
| `onColumnResize`           | `(info, context) => void`       | -       | Reports each proposed width/flex and reserved viewport width                    |
| `onBatchColumnResize`      | `(entries, context) => void`    | -       | Reports one coherent callback for every resize transaction                      |
| `enableColumnAutosize`     | `boolean`                       | `true`  | Estimate widths from a bounded row sample when no numeric width is supplied     |
| `skipHeaderOnAutoSize`     | `boolean`                       | `false` | Skip header text when estimating an automatic width                             |
| `showColumnMenuTool`       | `boolean`                       | `true`  | Show sort, visibility, auto-size, and fit actions in the accessible column menu |

When `columnOrder` is omitted, `defaultColumnOrder` seeds grid-owned ordering
and drag changes persist even without a callback. When `columnOrder` is
supplied, it is authoritative: `onColumnOrderChange` receives the proposal and
the display changes only after the parent returns it. The same ownership rule
applies to `column.visible` versus `defaultVisible`/`defaultHidden`.

Column sizing precedence is controlled `width`, column `defaultWidth` and
`minWidth`/`maxWidth`, then the root fallbacks. An uncontrolled flex column
retains flex ownership by default; set `column.keepFlex: false` to convert it to
fixed sizing after a no-share resize. Shared-space resize preserves the adjacent
pair's total width and handles fixed/fixed, flex/flex, and mixed pairs.
Controlled `width` and `flex` values remain prop-owned while both resize
callbacks receive the proposal.

Set `column.locked` to `"start"` or `"end"` to keep it visible at that
horizontal edge; `true` is the Inovua-compatible alias for `"start"`. Locked
columns keep their relative `columnOrder` within the start/unlocked/end
sections, remain mounted during column virtualization, and use the same
header, filter-row, body, resize, and controlled-reorder geometry.

This is an opt-in, Enterprise-derived compatibility extension rather than part
of the Inovua Community 5.10.2 release gate. The implemented contract is the
declarative `column.locked` field above. Inovua's `column.defaultLocked`,
`column.lockable`, `column.autoLock`, root `onColumnLockedChange` and
`showColumnMenuLockOptions`, imperative `setColumnLocked`, lock/unlock menu
actions, and RTL edge mirroring are not implemented. Dragging may reorder
columns inside the same locked/unlocked section, but a cross-section drop is
rejected instead of changing the column's locked state. Declare the target
section in the column definition up front; changing a column's locked section
at runtime is not a supported contract yet.
The grid groups columns only for rendering: the controlled `columnOrder` and
remote data-source argument keep the application-owned sequence, with lock
state carried separately by each column. Computed locked-section widths report
the grid's logical column allocation; when an underfilled fixed-layout table is
stretched to the viewport, browser-distributed surplus space is not added to
those compatibility metrics.

### Filtering

| Prop                                    | Type                                           | Default            | Description                                               |
| --------------------------------------- | ---------------------------------------------- | ------------------ | --------------------------------------------------------- |
| `enableFiltering`                       | `boolean`                                      | inferred           | Explicitly show or hide the filter row                    |
| `filterValue`                           | `TypeFilterValue`                              | -                  | Controlled display state; data ownership remains external |
| `defaultFilterValue`                    | `TypeFilterValue`                              | -                  | Uncontrolled initial state and local filtering input      |
| `onFilterValueChange`                   | `(value: TypeFilterValue) => void`             | -                  | Fired on filter change                                    |
| `filterTypes`                           | `TypeFilterTypes`                              | built-in registry  | Extend or override filter types and operators             |
| `enableColumnFilterContextMenu`         | `boolean`                                      | `true`             | Operator, activation, Clear, and Clear All menu           |
| `scrollTopOnFilter`                     | `boolean`                                      | `true`             | Reset vertical scroll after a filter commits              |
| `renderColumnFilterContextMenu`         | `TypeRenderColumnFilterContextMenu`            | -                  | Render a custom operator menu with grid/cell context      |
| `columnFilterContextMenuAlignPositions` | `string[]`                                     | built-in fallbacks | Configure custom/operator menu alignment candidates       |
| `columnFilterContextMenuConstrainTo`    | `boolean \| HTMLElement \| string \| function` | `true`             | Supply the custom menu constraint target                  |
| `columnFilterContextMenuPosition`       | `string`                                       | `"absolute"`       | Supply the custom menu positioning mode                   |
| `updateMenuPositionOnScroll`            | `boolean`                                      | `true`             | Request custom menu repositioning while scrolling         |
| `filteredRowsCount`                     | `(count: number) => void`                      | -                  | Reports filtered row count                                |

For Inovua 5.10.2 compatibility, filter-row visibility and local array
transformation are separate decisions. With no explicit `enableFiltering`, a
non-empty `defaultFilterValue` or `filterValue` shows the row; an empty or
missing descriptor array hides it. `enableFiltering` explicitly overrides only
that row's visibility. A descriptor is still required for a column to render a
filter editor; `enableFiltering={true}` by itself renders the structural row
without inventing filter state. Active uncontrolled `defaultFilterValue`
entries filter a local array even when the row is hidden, while controlled
`filterValue` is treated as externally owned display state and is not reapplied
locally. An entry with `active: false` still makes its editor visible but does
not filter data. Clear resets values without changing activation; Enable and
Disable are explicit menu actions, and Clear All emits one aggregate update.

### Sorting

| Prop                      | Type                           | Default       | Description                                                    |
| ------------------------- | ------------------------------ | ------------- | -------------------------------------------------------------- |
| `sortInfo`                | `TypeSortInfo`                 | -             | Controlled sort state                                          |
| `defaultSortInfo`         | `TypeSortInfo`                 | -             | Uncontrolled initial sort                                      |
| `onSortInfoChange`        | `(info: TypeSortInfo) => void` | -             | Fired on sort change                                           |
| `sortable`                | `boolean`                      | `true`        | Root sorting switch; `column.sortable` can override it         |
| `allowUnsort`             | `boolean`                      | `true`        | Allow a single sort to return to “unsorted”                    |
| `defaultSortingDirection` | `"asc" \| "desc"`              | `"asc"`       | Default sort direction                                         |
| `sortFunctions`           | `TypeSortFunctions`            | date registry | Comparator registry addressed by `column.type`                 |
| `renderSortTool`          | `TypeRenderSortTool`           | built-in icon | Root sort-indicator renderer; `column.renderSortTool` wins     |
| `scrollTopOnSort`         | `boolean \| "always"`          | `true`        | Reset vertical scroll on sort, never, or on every data refresh |

An object-valued `sortInfo` is single-sort mode. An array-valued sort state is
persistent multi-sort mode, including when the array contains zero or one
descriptor; ordinary click, Enter, Space, header-menu, mobile, and imperative
sort actions retain that array shape without requiring Shift. Descriptor order
is sort priority, and retoggling a descriptor preserves its position until it
is removed.

Local sorting uses `column.sort` first, then a descriptor `fn`, a
`sortFunctions[column.type]` registry entry, and finally the built-in
`number`/`date`/`string` comparator. A named column comparator receives
`(value1, value2, column, data1, data2, sortInfo)`. An id-only column receives
the complete rows as `value1` and `value2`. Controlled `sortInfo` remains
externally owned and is not applied again to local array order.

Migration notes for the completed Inovua sorting contract:

- Previous releases inferred numeric ordering when both values were
  number-like. Untyped columns now use Inovua's string comparator; declare
  `type: "number"` (or provide a comparator) for numeric ordering.
- Shift no longer changes a single descriptor into multi-sort mode. Initialize
  `sortInfo` or `defaultSortInfo` as an array to opt into persistent multi-sort.
- `TypeSingleSortInfo.fn`, `column.sort`, and registered sort functions now
  expose their exact comparator argument lists while retaining Inovua's
  `number | boolean` result compatibility.

### Selection

| Prop                           | Type                                            | Default                          | Description                                                                     |
| ------------------------------ | ----------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------- |
| `checkboxColumn`               | `boolean \| IColumn`                            | `false`                          | Enable or customize the checkbox column                                         |
| `selected`                     | `TypeRowSelection`                              | -                                | Controlled selection                                                            |
| `defaultSelected`              | `TypeRowSelection`                              | `{}` for multi-select, else null | Uncontrolled initial selection                                                  |
| `unselected`                   | `{ [rowId: string]: boolean }`                  | -                                | Controlled exclusions while `selected === true`                                 |
| `defaultUnselected`            | `{ [rowId: string]: boolean }`                  | -                                | Initial uncontrolled select-all exclusions                                      |
| `onSelectionChange`            | `(config: TypeOnSelectionChangeArg) => void`    | -                                | Fired with the next selection and row metadata                                  |
| `multiSelect`                  | `boolean`                                       | `true` with `checkboxColumn`     | Enable multi-row selection semantics                                            |
| `checkboxOnlyRowSelect`        | `boolean`                                       | `false`                          | Require the checkbox instead of a plain row click                               |
| `checkboxSelectEnableShiftKey` | `boolean`                                       | `false`                          | Enable Shift-range selection through the checkbox column                        |
| `toggleRowSelectOnClick`       | `boolean`                                       | `false`                          | Toggle off the sole selected row on an unmodified click                         |
| `activeIndex`                  | `number`                                        | -                                | Controlled active-row index                                                     |
| `defaultActiveIndex`           | `number`                                        | `-1`                             | Initial uncontrolled active-row index                                           |
| `onActiveIndexChange`          | `(index: number) => void`                       | -                                | Fired when pointer, keyboard, or focus changes the active row                   |
| `enableKeyboardNavigation`     | `boolean`                                       | `true`                           | Enable Arrow, Home, End, Page, Enter, and optional Tab row navigation           |
| `activateRowOnFocus`           | `boolean`                                       | `true`                           | Restore the last active row when grid focus returns                             |
| `keyPageStep`                  | `number`                                        | `10`                             | Row distance for Page Up and Page Down                                          |
| `allowRowTabNavigation`        | `boolean`                                       | `false`                          | Move the active row with Tab while another row remains available                |
| `disabledRows`                 | `{ [displayedIndex: string]: boolean } \| null` | -                                | Block pointer interaction by current view index without excluding API selection |

Shift-click selects an inclusive range from the previous row anchor. Ctrl/Cmd
click toggles one row, while an unmodified multi-select click selects only that
row. Enter applies the same selection rules to the active row. Focus leaving
the grid clears the live active index and restores the last index when focus
returns; virtualized navigation scrolls the active row into view.

### Editing

| Prop                | Type                           | Default      | Description                                                                                  |
| ------------------- | ------------------------------ | ------------ | -------------------------------------------------------------------------------------------- |
| `editable`          | `boolean`                      | `false`      | Enable default editing for columns that do not opt out                                       |
| `editStartEvent`    | `string`                       | `"dblclick"` | Use double-click or compatible click activation                                              |
| `onEditStart`       | `(info: TypeEditInfo) => void` | -            | Reports the original value and stable row/column identity                                    |
| `onEditValueChange` | `(info: TypeEditInfo) => void` | -            | Reports each draft value change                                                              |
| `onEditStop`        | `(info: TypeEditInfo) => void` | -            | Runs before completion or cancellation                                                       |
| `onEditComplete`    | `(info) => void \| Promise`    | -            | Runs after the editor stops; navigation waits for fulfillment and is suppressed on rejection |
| `onEditCancel`      | `(info: TypeEditInfo) => void` | -            | Reports Escape cancellation without persisting the draft                                     |

Column-level `editable` may be a boolean or a synchronous/asynchronous
predicate. Pointer and imperative starts pass it the same Inovua-shaped
`CellProps`, including raw string/number row identity, row/render/remote
indices, column aliases and computed indices/width, selection and row-height
metadata, theme, and native-scroll state. A falsy result or rejection refuses
the edit. `editor` accepts a component type or React element, while
`renderEditor(editorProps, cellProps, cell)` receives the compatibility
contract. Values from `editorProps` are
available both as top-level editor props and through the nested `editorProps`
object. Navigation callbacks use `(complete, direction)`: passing
`complete=false` stops the editor and navigates without firing
`onEditComplete` or `onEditCancel`. The built-in editor exposes a stable
accessible name from the column header/name/ID.

The stable `TypeComputedProps` ref exposes these editing methods and fields:

| Member                                                | Behavior                                                                                                                                                                                                                               |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `startEdit({ columnId, rowIndex?, rowId?, value? })`  | Starts the requested editable cell after scroll/deferred dispatch and resolves to its start value. It replaces an active editor without ending the former edit. Invalid columns reject with an error; invalid rows reject with `null`. |
| `tryStartEdit({ columnId, rowIndex?, rowId?, dir? })` | Searches in `dir` order after deferred dispatch and resolves to the first editable value, replacing an active editor without end callbacks. It rejects with `null` if none can start. Numeric columns are visible-column indices.      |
| `completeEdit(args?)`                                 | Scrolls, waits for the rendered/editable target, and reads live cell metadata/draft at dispatch. An invalid/missing column falls back both coordinates to current. No object uses `""`; an omitted cross-target value is `undefined`.  |
| `cancelEdit(args?)`                                   | Immediately targets only a rendered/editable cell and never scrolls. An invalid/missing column falls back to current; a valid column without a row, a non-editable target, or an offscreen target is a no-op.                          |
| `getCurrentEditInfo()`                                | Returns the live edit identity/value or `null`.                                                                                                                                                                                        |
| `isInEdit.current`                                    | Exposes the upstream lifecycle edit flag.                                                                                                                                                                                              |
| `currentEditCompletePromise.current`                  | Tracks the current completion callback promise.                                                                                                                                                                                        |

It also exposes behavior-backed column-state methods:

| Member                                               | Behavior                                                                                                     |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `setColumnVisible(column, visible)`                  | Uses the same controlled/uncontrolled ownership and callback path as the built-in menu and optional toolbar. |
| `setColumnOrder(order)`                              | Applies an uncontrolled order or emits a controlled proposal without mutating consumer state.                |
| `setColumnSizes(action)` / `setColumnFlexes(action)` | Replace grid-owned width/flex maps; declarative `width`/`flex` values remain authoritative.                  |
| `onBatchColumnResize(entries, context?)`             | Applies a width/flex transaction and emits per-column plus batch completion callbacks.                       |
| `setColumnSizeAuto(id, skipHeader?)`                 | Deterministically auto-sizes one resizable visible column.                                                   |
| `setColumnsSizesAuto(config?)`                       | Auto-sizes selected or all resizable visible columns as one batch.                                           |
| `setColumnSizesToFit()`                              | Fits resizable visible columns to the viewport while honoring min/max bounds.                                |

Completion is session-safe: an older async completion settling cannot clear or
navigate a newer edit. The editor is already stopped when `onEditComplete`
runs; rejecting its Promise leaves it stopped and suppresses keyboard
navigation. Exact 5.10.2 cross-target behavior is preserved: dispatching
complete/cancel to a different valid cell reports that target without emitting
`onEditStop` for it and leaves the current editor/edit info in place; the
upstream lifecycle flag becomes false. Numeric row IDs remain numeric in all
lifecycle payloads, and numeric row lookup accepts equivalent numeric strings.
The published upstream `TypeEditInfo` declaration nevertheless labels
`rowId` as `string`; the compatibility type intentionally uses `any` so both
existing string-typed handlers and the observed numeric runtime contract remain
source-compatible.

### Pagination

| Prop                      | Type                                        | Default                 | Description                                                            |
| ------------------------- | ------------------------------------------- | ----------------------- | ---------------------------------------------------------------------- |
| `pagination`              | `true \| false \| "remote" \| "local"`      | `false`                 | Pagination mode                                                        |
| `skip`                    | `number`                                    | -                       | Controlled offset                                                      |
| `defaultSkip`             | `number`                                    | `0`                     | Initial offset                                                         |
| `limit`                   | `number`                                    | -                       | Controlled page size                                                   |
| `defaultLimit`            | `number`                                    | first page size or `10` | Initial page size                                                      |
| `onSkipChange`            | `(skip: number) => void`                    | -                       | Fired when offset changes                                              |
| `onLimitChange`           | `(limit: number) => void`                   | -                       | Fired when page size changes                                           |
| `pageSizes`               | `number[]`                                  | `[10, 50, 100, 1000]`   | Allowed page sizes                                                     |
| `renderPaginationToolbar` | `(props: TypePaginationProps) => ReactNode` | -                       | Custom toolbar; `undefined` uses the built-in and `null` suppresses it |

### Misc

| Prop              | Type                                                 | Default     | Description                                                         |
| ----------------- | ---------------------------------------------------- | ----------- | ------------------------------------------------------------------- |
| `i18n`            | `TypeI18n`                                           | -           | Text overrides (labels, operators, etc.)                            |
| `loading`         | `boolean`                                            | -           | Controlled effective loading state                                  |
| `loadingText`     | `ReactNode \| (() => ReactNode)`                     | `"Loading"` | Built-in/custom mask content                                        |
| `renderLoadMask`  | `(props: TypeLoadMaskProps) => ReactNode \| null`    | -           | Custom mask; `undefined` uses the built-in and `null` suppresses it |
| `onLoadingChange` | `(loading: boolean) => void`                         | -           | Fires once per effective loading transition                         |
| `onDidMount`      | `(ref: MutableRefObject<TypeComputedProps \| null>)` | -           | Passive mount callback after API hydration, before handle/onReady   |
| `handle`          | `(ref: MutableRefObject<TypeComputedProps \| null>)` | -           | Receives the same stable ref after onDidMount                       |
| `onReady`         | `(ref: MutableRefObject<TypeComputedProps \| null>)` | -           | Receives the same stable ref after handle                           |
| `className`       | `string`                                             | -           | Extra CSS classes on the outer grid root                            |
| `style`           | `CSSProperties`                                      | -           | Inline styles on the outer grid root                                |
| `onFocus`         | `FocusEventHandler<HTMLDivElement>`                  | -           | Bubbling root focus lifecycle handler                               |
| `onBlur`          | `FocusEventHandler<HTMLDivElement>`                  | -           | Bubbling root blur lifecycle handler                                |
| `onKeyDown`       | `KeyboardEventHandler<HTMLDivElement>`               | -           | Bubbling root keyboard handler                                      |

Issue 48 certifies the `onDidMount` mount contract. The existing `handle` and
`onReady` adapters are usable, but Inovua's callback-identity cleanup and
nonzero-width readiness details remain explicitly listed as a known gap in the
public compatibility ledger.

## TypeScript

The package ships full type definitions.

```tsx
import { ReactDataGrid } from "@geovi/the-datagrid";
import type {
  TypeColumns,
  TypeColumn,
  TypeDataGridProps,
  TypeDataSourceArgs,
  TypeRowSelection,
  TypeOnSelectionChangeArg,
  TypeFilterValue,
  TypeSortInfo,
  TypeI18n,
} from "@geovi/the-datagrid";
```
