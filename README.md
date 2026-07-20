# the-datagrid

A modern, feature-rich React data grid built on **TanStack Table** with a **shadcn-aligned** look-and-feel and **self-contained packaged styles**.

Documentation and live examples: https://geo-vi.github.io/the-datagrid/

## Features

- Virtualized rendering for large datasets
- Sorting (single + multi-column)
- Filtering with a built-in filter row and operators
- Opt-in global table search through a separate, tree-shakeable entry
- Opt-in contextual column-visibility toolbar with a right-side action slot
- Column management (reorder, resize, auto-size)
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

That statement is the product contract, **not a claim that the current release
has already completed parity**. Compatibility covers more than similarly named
TypeScript fields: it includes defaults, runtime behavior, callback payloads
and timing, controlled/uncontrolled state, local and remote data flow, layout,
keyboard and focus interaction, and accessibility behavior.

The audited Issue 17 and Issue 48 compatibility batches now implement and
regression-test:

- natural and per-row height (`rowHeight={null}`, a `rowHeight` function,
  `minRowHeight`/`maxRowHeight`, and width-change remeasurement);
- `onColumnResize`, controlled `width`, and uncontrolled `defaultWidth`;
- weighted `flex`/`defaultFlex` remaining-space allocation;
- visible zebra rows by default and the per-grid `showZebraRows` toggle;
- inline editing (`editable`, `editStartEvent`, column editors, lifecycle
  callbacks, cancellation, focus, and keyboard navigation);
- object- or function-valued whole-row `rowStyle`.
- the standalone
  `@geovi/the-datagrid/packages/TextInput` compatibility entry, including its
  value-first callbacks, clear tool, legacy class hooks, and imperative ref;
- the `onDidMount` computed-props lifecycle callback; and
- `getVirtualList().adjustHeights()` for instantiated variable-height rows in
  virtual and non-virtual layouts.

This closes those audited differences; it does not certify the entire Inovua
Community API as complete. Remaining mismatches stay in the public status
ledger until their types and observable behavior have executable evidence. No
technical-impossibility exceptions are currently approved. Any future exception
must identify the exact upstream contract, prove why equivalent behavior is
technically impossible, document consumer impact and a safe migration path, and
carry executable coverage. Cost, bundle size, schedule, or architectural
preference alone do not qualify.

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
It is a statement of current capability, not a declaration that the wider
Inovua compatibility audit is complete. The public docs contain the full
[source-backed implemented-surface reference](https://geo-vi.github.io/the-datagrid/docs/reference/implemented-surface),
including exact defaults, timing, transform order, exports, and imperative
method allowlists.

- **Data loading:** local arrays, static Promise snapshots, and function-backed
  sources returning either an array or `{ data, count }`. Function sources
  receive `sortInfo`, `filterValue`, `columnOrder`, `columns`, `idProperty`, and
  `theme`, plus `skip`/`limit` when remote pagination is active and the optional
  `searchValue` when connected to the search entry. Stale async responses are
  ignored; rejected requests preserve the last committed rows and clear their
  automatic loading state. `loading` can also be controlled by the application.
- **Local and remote data flow:** local arrays and static Promise snapshots can
  be searched, filtered, sorted, counted, and paged in the browser. Function
  sources own their remote transforms and authoritative count.
  `filteredRowsCount` reports the post-search, post-filter count before local
  page slicing.
- **Columns and cells:** stable `id`/`name` identity, controlled rendered order,
  callback-driven drag reordering, explicit visibility, custom headers and cell
  renderers, per-column sorting/filtering/search configuration, alignment, cell
  classes/styles, and header props.
- **Column and row sizing:** controlled `width`/`flex`, uncontrolled
  `defaultWidth`/`defaultFlex`, `minWidth`/`maxWidth` clamps, proportional flex
  allocation, the upstream 40px implicit column minimum (while preserving an
  explicit `minWidth={0}`), deterministic autosizing from a bounded row sample,
  mouse/pen/touch drag resizing with `onColumnResize`, opt-in
  animation-frame-coalesced `liveColumnResize`, and double-click autosizing.
  Rows support numeric, functional, and natural measured heights with
  minimum/maximum bounds and width-change remeasurement.
- **Filtering and sorting:** controlled and uncontrolled state, local operators,
  custom filter registries and editors, filter operator menus, single sorting,
  Shift-assisted multi-sorting, configurable initial direction, and optional
  unsorting. Filter and sort changes reset pagination to the first page.
- **Pagination:** controlled or uncontrolled `skip` and `limit`, local and remote
  modes, configurable page sizes, and a built-in accessible pager.
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
- **Optional column visibility:** a separate provider/toolbar/target entry that
  follows live grid order and visibility, honors non-hideable columns, protects
  the final visible column, and accepts application actions on the right.
- **Themes and UI:** packaged CSS, shadcn-aligned controls, `default`, `light`,
  and `dark` token bases, custom `data-theme` hooks, grid-scoped menu portals,
  cell-border modes, i18n overrides, and compatibility class hooks for existing
  Inovua-oriented theme styles.
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
  `currentEditCompletePromise`. This is an implemented subset;
  compatibility-shaped placeholder methods are not a claim of working
  behavior.

### Public package entries and exports

The main entry, `@geovi/the-datagrid`, exports:

- default and named `ReactDataGrid`, plus the compatibility-shaped `plugins`
  empty list;
- `DateFilter`, `NumberFilter`, `SelectFilter`, `CheckBox`, and the named
  `TextInput`;
- `DEFAULT_FILTER_TYPES` and its `filterTypes` alias;
- the public types `CellProps`, `IColumn`, `SortDirection`, `TypeColumn`,
  `TypeColumns`, `TypeColumnEditorProps`, `TypeColumnResizeContext`,
  `TypeColumnResizeInfo`, `TypeColumnEditorCell`, `TypeComputedColumn`,
  `TypeComputedColumnsMap`, `TypeComputedProps`, `TypeDataGridProps`,
  `TypeDataSourceArgs`, `TypeDataSource`, `TypeEditInfo`, `TypeStartEditArgs`,
  `TypeTryStartEditArgs`, `TypeCompleteEditArgs`, `TypeCancelEditArgs`,
  `TypeFilterOperator`, `TypeFilterType`, `TypeFilterTypes`, `TypeFilterValue`,
  `TypeGetColumnByParam`, `TypeI18n`, `TypeOnSelectionChangeArg`,
  `TypePaginationMode`, `TypeRowSelection`, `TypeRowStyle`, `TypeRowStyleArgs`,
  `TypeRowStyleProps`, `TypeShowCellBorders`, `TypeSize`, `TypeSingleFilterValue`,
  `TypeSingleSortInfo`, `TypeSortInfo`, `TypeCheckboxColumn`,
  `TypeCheckboxProps`, `TextInputProps`, `TypeTextInputProps`, and the
  TextInput callback/input/wrapper/clear-button helper types.

The optional `@geovi/the-datagrid/search` entry exports `RDGSearchProvider`,
`RDGSearchBar`, `RDGSearchTarget`, and their prop types. The explicit stylesheet
fallbacks are `@geovi/the-datagrid/style.css` and
`@geovi/the-datagrid/search/style.css`.

The optional `@geovi/the-datagrid/components` entry is the one-import choice for
mixed contextual controls. It exports `RDGProvider`, `RDGTarget`,
`RDGSearchBar`, `RDGColumnVisibilityToolbar`, all four stable feature-specific
provider/target APIs, and their prop types. It reuses the existing search and
column-visibility singleton contexts and automatically loads both isolated
stylesheets; there is intentionally no duplicate `components/style.css`.

The optional `@geovi/the-datagrid/column-visibility` entry exports
`RDGColumnVisibilityProvider`, `RDGColumnVisibilityToolbar`,
`RDGColumnVisibilityTarget`, and their prop types. Its explicit stylesheet
fallback is `@geovi/the-datagrid/column-visibility/style.css`.

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

Current caveat: an unseeded `bool`/`boolean` filter resolves through the generic
`contains` fallback even though those registries expose only `eq`/`neq`. Seed an
`eq` or `neq` filter entry until that implementation gap is corrected.

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

The grid keeps a shadcn-aligned look and will inherit app-level shadcn theme variables when they exist (`--background`, `--foreground`, `--border`, `--ring`, etc.). If they do not exist, the package uses scoped fallback tokens so it still renders correctly.

Theme variables are resolved at runtime from normal CSS, not from the consumer's Tailwind build. Tailwind is only used to build this library, not required to consume it.

Built-in theme behavior:

- `theme="default"` follows the nearest `.dark` ancestor
- `theme="light"` forces the light token set
- `theme="dark"` forces the dark token set
- `theme="<custom-name>"` activates a named custom theme on the grid root via `data-theme="<custom-name>"`

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
    />
  );
}
```

## Combined contextual controls

Use one `RDGProvider` when search and column visibility control the same grid.
A direct grid child connects automatically:

```tsx
import ReactDataGrid from "@geovi/the-datagrid";
import {
  RDGColumnVisibilityToolbar,
  RDGProvider,
  RDGSearchBar,
} from "@geovi/the-datagrid/components";

<RDGProvider>
  <RDGSearchBar />
  <RDGColumnVisibilityToolbar>
    <button type="button" onClick={exportRows}>
      Export CSV
    </button>
  </RDGColumnVisibilityToolbar>
  <ReactDataGrid idProperty="id" columns={columns} dataSource={rows} />
</RDGProvider>;
```

If a `div`, card, Fragment, Suspense boundary, or application component sits
between the provider and grid, put one `RDGTarget` immediately around the grid.
`RDGProvider` and `RDGTarget` add no DOM elements and support one grid per
provider scope. Use `defaultSearchValue` when the shared search query needs a
non-empty initial value. Do not nest `RDGSearchTarget` and
`RDGColumnVisibilityTarget`; use the combined target instead.

Controls imported from `@geovi/the-datagrid/search` and
`@geovi/the-datagrid/column-visibility` also work inside `RDGProvider`. The
existing `RDGSearchProvider`, `RDGSearchTarget`,
`RDGColumnVisibilityProvider`, and `RDGColumnVisibilityTarget` exports remain
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
interaction. Local arrays and static Promise snapshots also use the same
normalization and matching engine. Function data sources receive the committed
`searchValue` and remain responsible for remote matching. When
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
pagination and `filteredRowsCount` reports the combined result count. A static
`Promise` data source is resolved as a locally searchable snapshot. A function
data source remains remote and receives `searchValue` alongside its existing
args; when remote pagination is active, a new search resets `skip` to `0`.

```tsx
import type { TypeDataSourceArgs } from "@geovi/the-datagrid";

const dataSource = async ({ searchValue, ...gridArgs }: TypeDataSourceArgs) => {
  const response = await fetch("/api/accounts/search", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...gridArgs, searchValue }),
  });

  return response.json();
};
```

Remote functions own the search operation. The grid does not post-filter one
remote page and present it as a server-wide result. If the backend does not yet
support global search, keep that search state application-owned until its
request contract is defined.

## Optional column visibility toolbar

Column visibility controls are also an opt-in contextual entry. A direct grid
child connects automatically, and toolbar children form a separate right-side
action area for consumer-owned export, filter, or navigation controls:

```tsx
import ReactDataGrid from "@geovi/the-datagrid";
import {
  RDGColumnVisibilityProvider,
  RDGColumnVisibilityToolbar,
} from "@geovi/the-datagrid/column-visibility";

<RDGColumnVisibilityProvider>
  <RDGColumnVisibilityToolbar>
    <button type="button" onClick={exportRows}>
      Export CSV
    </button>
    <button type="button" onClick={toggleFilters}>
      Show filters
    </button>
  </RDGColumnVisibilityToolbar>
  <ReactDataGrid idProperty="id" columns={columns} dataSource={rows} />
</RDGColumnVisibilityProvider>;
```

The toolbar renders columns in the grid's current order and reflects the live
visibility map. It uses string or numeric headers with stable `id`/`name`
fallbacks, omits columns with `hideable={false}`, and does not allow the final
visible column to be hidden. Button state is exposed through `aria-pressed`; no
eye icon or parallel application visibility state is required.

Set `visible: false` on a column that should start hidden and `hideable: false`
on one that must not be toggled. `defaultVisible` and `defaultHidden` remain
ignored compatibility fields. Visibility clicks update grid-owned runtime
state; a real grid remount discards those overrides and initializes again from
the current column props.

The default title is a level-two heading that labels the toolbar region. The
toggle group keeps its `ariaLabel`, and the description is associated with both
through `aria-describedby`. Passing `title={null}` suppresses the heading while
preserving the group's accessible name.

Use `RDGColumnVisibilityTarget` around the grid when layout markup separates it
from the provider. Keep one grid per provider so the column model is
unambiguous. The JavaScript entry loads its scoped stylesheet automatically; if
your environment requires manual CSS imports, add
`import "@geovi/the-datagrid/column-visibility/style.css"`.

For the complete direct-child rules, nested layout examples, multiple-grid
scoping, and the stability contract for all feature-specific providers and
targets, see [Providers and targets](https://geo-vi.github.io/the-datagrid/docs/reference/providers-and-targets).

When search and visibility share a grid, prefer `RDGProvider`/`RDGTarget` from
`@geovi/the-datagrid/components`. The feature-specific provider and target
remain supported for visibility-only screens and existing integrations.

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
  const [filterValue, setFilterValue] = useState<TypeFilterValue | null>(null);

  const columns: TypeColumns = useMemo(
    () => [
      { name: "id", header: "ID", sortable: true, filterable: true },
      { name: "name", header: "Name", sortable: true, filterable: true },
      { name: "email", header: "Email", sortable: true, filterable: true },
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
      defaultFilterValue={filterValue ?? undefined}
      onFilterValueChange={(v) => setFilterValue(v)}
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

| Prop         | Type             | Default      | Description                                 |
| ------------ | ---------------- | ------------ | ------------------------------------------- |
| `idProperty` | `string`         | **required** | Property name used as unique row identifier |
| `columns`    | `TypeColumns`    | **required** | Column definitions                          |
| `dataSource` | `TypeDataSource` | **required** | Data source (array, function, or promise)   |

### Display

| Prop                   | Type                                             | Default     | Description                                                       |
| ---------------------- | ------------------------------------------------ | ----------- | ----------------------------------------------------------------- |
| `theme`                | `string`                                         | `"default"` | Theme name                                                        |
| `rowHeight`            | `number \| ((rowIndex) => number) \| null`       | `44`        | Fixed, per-row, or naturally measured row height                  |
| `minRowHeight`         | `number`                                         | `20`        | Minimum natural row height and virtualizer estimate               |
| `maxRowHeight`         | `number`                                         | -           | Optional upper bound for measured or functional row heights       |
| `rowStyle`             | `CSSProperties \| ({ data, props, style }) => …` | -           | Static or data-dependent style merged onto each row               |
| `showZebraRows`        | `boolean`                                        | `true`      | Show visible alternating row backgrounds                          |
| `headerHeight`         | `number`                                         | `40`        | Header height in pixels                                           |
| `filterRowHeight`      | `number`                                         | `44`        | Filter row height in pixels                                       |
| `virtualized`          | `boolean`                                        | `true`      | Enable virtual scrolling, including measured natural rows         |
| `allowMobileTransform` | `boolean`                                        | `false`     | Use searchable, sortable virtual cards at widths up to 1024px     |
| `columnUserSelect`     | `boolean \| "text" \| "none"`                    | `true`      | Column text selection behavior                                    |
| `showCellBorders`      | `boolean \| "vertical" \| "horizontal"`          | `true`      | Cell separator mode; use `"horizontal"` to disable vertical lines |

A `rowStyle` callback receives the live Inovua-shaped base style, including
`height`, `width`, `minWidth`, and LTR `direction`. It may mutate that object
and return `undefined`, or return a style object to merge. `props.id` preserves
numeric IDs, `rowIndex` is page-local, and `remoteRowIndex` includes the current
pagination offset. Unsupported locking is represented by fixed unlocked
sentinels (`-1`, `false`, and `0`).

### Columns

| Prop                   | Type                        | Default | Description                                                                   |
| ---------------------- | --------------------------- | ------- | ----------------------------------------------------------------------------- |
| `columnOrder`          | `string[]`                  | -       | Ordered array of column ids/names                                             |
| `onColumnOrderChange`  | `(order: string[]) => void` | -       | Fired when column order changes; drag reordering requires this callback       |
| `reorderColumns`       | `boolean`                   | `true`  | Disable user drag reordering while continuing to render `columnOrder`         |
| `resizable`            | `boolean`                   | `true`  | Enable header resize handles                                                  |
| `liveColumnResize`     | `boolean`                   | `false` | Resize header and body geometry during drag; callbacks remain completion-only |
| `onColumnResize`       | `(info, context) => void`   | -       | Reports proposed width/flex and reserved viewport width                       |
| `enableColumnAutosize` | `boolean`                   | `true`  | Estimate widths from a bounded row sample when no numeric width is supplied   |
| `skipHeaderOnAutoSize` | `boolean`                   | `false` | Skip header text when estimating an automatic width                           |
| `showColumnMenuTool`   | `boolean`                   | `false` | Show the header menu tool                                                     |

### Filtering

| Prop                            | Type                               | Default           | Description                                   |
| ------------------------------- | ---------------------------------- | ----------------- | --------------------------------------------- |
| `enableFiltering`               | `boolean`                          | `true`            | Enable filter row                             |
| `filterValue`                   | `TypeFilterValue`                  | -                 | Controlled filter value                       |
| `defaultFilterValue`            | `TypeFilterValue`                  | -                 | Uncontrolled initial filter value             |
| `onFilterValueChange`           | `(value: TypeFilterValue) => void` | -                 | Fired on filter change                        |
| `filterTypes`                   | `TypeFilterTypes`                  | built-in registry | Extend or override filter types and operators |
| `enableColumnFilterContextMenu` | `boolean`                          | `false`           | Context menu for filter operators             |
| `filteredRowsCount`             | `(count: number) => void`          | -                 | Reports filtered row count                    |

### Sorting

| Prop                      | Type                           | Default | Description                   |
| ------------------------- | ------------------------------ | ------- | ----------------------------- |
| `sortInfo`                | `TypeSortInfo`                 | -       | Controlled sort state         |
| `defaultSortInfo`         | `TypeSortInfo`                 | -       | Uncontrolled initial sort     |
| `onSortInfoChange`        | `(info: TypeSortInfo) => void` | -       | Fired on sort change          |
| `allowUnsort`             | `boolean`                      | `true`  | Allow returning to “unsorted” |
| `defaultSortingDirection` | `"asc" \| "desc"`              | `"asc"` | Default sort direction        |

### Selection

| Prop                           | Type                                         | Default                          | Description                                              |
| ------------------------------ | -------------------------------------------- | -------------------------------- | -------------------------------------------------------- |
| `checkboxColumn`               | `boolean \| IColumn`                         | `false`                          | Enable or customize the checkbox column                  |
| `selected`                     | `TypeRowSelection`                           | -                                | Controlled selection                                     |
| `defaultSelected`              | `TypeRowSelection`                           | `{}` for multi-select, else null | Uncontrolled initial selection                           |
| `onSelectionChange`            | `(config: TypeOnSelectionChangeArg) => void` | -                                | Fired with the next selection and row metadata           |
| `multiSelect`                  | `boolean`                                    | `true` with `checkboxColumn`     | Enable multi-row selection semantics                     |
| `checkboxOnlyRowSelect`        | `boolean`                                    | `true` with `checkboxColumn`     | Require the checkbox instead of a plain row click        |
| `checkboxSelectEnableShiftKey` | `boolean`                                    | `false`                          | Enable Shift-range selection through the checkbox column |

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

| Prop            | Type                                   | Default                 | Description                  |
| --------------- | -------------------------------------- | ----------------------- | ---------------------------- |
| `pagination`    | `true \| false \| "remote" \| "local"` | `false`                 | Pagination mode              |
| `skip`          | `number`                               | -                       | Controlled offset            |
| `defaultSkip`   | `number`                               | `0`                     | Initial offset               |
| `limit`         | `number`                               | -                       | Controlled page size         |
| `defaultLimit`  | `number`                               | first page size or `10` | Initial page size            |
| `onSkipChange`  | `(skip: number) => void`               | -                       | Fired when offset changes    |
| `onLimitChange` | `(limit: number) => void`              | -                       | Fired when page size changes |
| `pageSizes`     | `number[]`                             | `[10, 50, 100, 1000]`   | Allowed page sizes           |

### Misc

| Prop         | Type                                                 | Default | Description                                                       |
| ------------ | ---------------------------------------------------- | ------- | ----------------------------------------------------------------- |
| `i18n`       | `TypeI18n`                                           | -       | Text overrides (labels, operators, etc.)                          |
| `loading`    | `boolean`                                            | -       | Loading state                                                     |
| `onDidMount` | `(ref: MutableRefObject<TypeComputedProps \| null>)` | -       | Passive mount callback after API hydration, before handle/onReady |
| `handle`     | `(ref: MutableRefObject<TypeComputedProps \| null>)` | -       | Receives the same stable ref after onDidMount                     |
| `onReady`    | `(ref: MutableRefObject<TypeComputedProps \| null>)` | -       | Receives the same stable ref after handle                         |
| `className`  | `string`                                             | -       | Extra CSS classes                                                 |
| `style`      | `CSSProperties`                                      | -       | Inline styles                                                     |

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
