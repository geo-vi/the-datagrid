# the-datagrid

A modern, feature-rich React data grid built on **TanStack Table** with a **shadcn-aligned** look-and-feel and **self-contained packaged styles**.

Documentation and live examples: https://geo-vi.github.io/the-datagrid/

## Features

- Virtualized rendering for large datasets
- Sorting (single + multi-column)
- Filtering with a built-in filter row and operators
- Column management (reorder, resize, auto-size)
- Pagination (local + remote)
- Row selection (checkbox column)
- Modern shadcn-aligned look-and-feel with packaged styles
- Fully typed TypeScript API
- Migration-friendly API inspired by Inovua ReactDataGrid

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

| Prop               | Type                          | Default     | Description                    |
| ------------------ | ----------------------------- | ----------- | ------------------------------ |
| `theme`            | `string`                      | `"default"` | Theme name                     |
| `rowHeight`        | `number`                      | `44`        | Row height in pixels           |
| `headerHeight`     | `number`                      | `40`        | Header height in pixels        |
| `filterRowHeight`  | `number`                      | `44`        | Filter row height in pixels    |
| `virtualized`      | `boolean`                     | `true`      | Enable virtual scrolling       |
| `columnUserSelect` | `boolean \| "text" \| "none"` | `true`      | Column text selection behavior |
| `showCellBorders`  | `boolean \| "vertical" \| "horizontal"` | `true` | Cell separator mode; use `"horizontal"` to disable vertical lines |

### Columns

| Prop                   | Type                        | Default | Description                       |
| ---------------------- | --------------------------- | ------- | --------------------------------- |
| `columnOrder`          | `string[]`                  | -       | Ordered array of column ids/names |
| `onColumnOrderChange`  | `(order: string[]) => void` | -       | Fired when column order changes   |
| `enableColumnAutosize` | `boolean`                   | `true`  | Auto-calc column widths           |
| `skipHeaderOnAutoSize` | `boolean`                   | `false` | Skip header when auto-sizing      |
| `showColumnMenuTool`   | `boolean`                   | `false` | Show column menu tool in header   |

### Filtering

| Prop                            | Type                               | Default | Description                       |
| ------------------------------- | ---------------------------------- | ------- | --------------------------------- |
| `enableFiltering`               | `boolean`                          | `true`  | Enable filter row                 |
| `filterValue`                   | `TypeFilterValue`                  | -       | Controlled filter value           |
| `defaultFilterValue`            | `TypeFilterValue`                  | -       | Uncontrolled initial filter value |
| `onFilterValueChange`           | `(value: TypeFilterValue) => void` | -       | Fired on filter change            |
| `enableColumnFilterContextMenu` | `boolean`                          | `false` | Context menu for filter operators |
| `filteredRowsCount`             | `(count: number) => void`          | -       | Reports filtered row count        |

### Sorting

| Prop                      | Type                           | Default | Description                   |
| ------------------------- | ------------------------------ | ------- | ----------------------------- |
| `sortInfo`                | `TypeSortInfo`                 | -       | Controlled sort state         |
| `defaultSortInfo`         | `TypeSortInfo`                 | -       | Uncontrolled initial sort     |
| `onSortInfoChange`        | `(info: TypeSortInfo) => void` | -       | Fired on sort change          |
| `allowUnsort`             | `boolean`                      | `true`  | Allow returning to “unsorted” |
| `defaultSortingDirection` | `"asc" \| "desc"`              | `"asc"` | Default sort direction        |

### Selection

| Prop                | Type                                         | Default | Description                    |
| ------------------- | -------------------------------------------- | ------- | ------------------------------ |
| `checkboxColumn`    | `boolean \| IColumn`                         | `false` | Enable checkbox column         |
| `selected`          | `TypeRowSelection`                           | -       | Controlled selection           |
| `defaultSelected`   | `TypeRowSelection`                           | -       | Uncontrolled initial selection |
| `onSelectionChange` | `(config: TypeOnSelectionChangeArg) => void` | -       | Fired on selection changes     |

### Pagination

| Prop            | Type                                   | Default                | Description                  |
| --------------- | -------------------------------------- | ---------------------- | ---------------------------- |
| `pagination`    | `true \| false \| "remote" \| "local"` | `true`                 | Pagination mode              |
| `skip`          | `number`                               | -                      | Controlled offset            |
| `defaultSkip`   | `number`                               | `0`                    | Initial offset               |
| `limit`         | `number`                               | -                      | Controlled page size         |
| `defaultLimit`  | `number`                               | `10`                   | Initial page size            |
| `onSkipChange`  | `(skip: number) => void`               | -                      | Fired when offset changes    |
| `onLimitChange` | `(limit: number) => void`              | -                      | Fired when page size changes |
| `pageSizes`     | `number[]`                             | `[10, 20, 30, 40, 50]` | Allowed page sizes           |

### Misc

| Prop        | Type                       | Default | Description                              |
| ----------- | -------------------------- | ------- | ---------------------------------------- |
| `i18n`      | `TypeI18n`                 | -       | Text overrides (labels, operators, etc.) |
| `loading`   | `boolean`                  | -       | Loading state                            |
| `onReady`   | `(ref: RefObject) => void` | -       | Called when grid ref is ready            |
| `handle`    | `(ref: RefObject) => void` | -       | Alias for `onReady`                      |
| `className` | `string`                   | -       | Extra CSS classes                        |
| `style`     | `CSSProperties`            | -       | Inline styles                            |

## TypeScript

The package ships full type definitions.

```tsx
import { ReactDataGrid } from "@geovi/the-datagrid";
import type {
  TypeColumns,
  TypeColumn,
  TypeDataGridProps,
  TypeRowSelection,
  TypeOnSelectionChangeArg,
  TypeFilterValue,
  TypeSortInfo,
  TypeI18n,
} from "@geovi/the-datagrid";
```
