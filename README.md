# the-datagrid

A modern, feature-rich React data grid built on **TanStack Table** and styled with **shadcn/ui + Tailwind CSS v4**.

## Features

- Virtualized rendering for large datasets
- Sorting (single + multi-column)
- Filtering with a built-in filter row and operators
- Column management (reorder, resize, auto-size)
- Pagination (local + remote)
- Row selection (checkbox column)
- Modern shadcn/ui look-and-feel (Tailwind CSS v4)
- Fully typed TypeScript API
- Migration-friendly API inspired by Inovua ReactDataGrid

## Installation

```bash
npm install the-datagrid
# or
yarn add the-datagrid
# or
pnpm add the-datagrid
```

## Peer dependencies

This library expects **React** and **React DOM** to be provided by your app:

```bash
npm install react react-dom
```

## Styling

`the-datagrid` ships compiled CSS and loads it automatically from the package entry. Consumers do not need:

- a manual `import "the-datagrid/style.css"` line
- Tailwind scanning via `@source`
- a local shadcn/ui install

The grid keeps a shadcn-aligned look and will inherit app-level shadcn theme variables when they exist (`--background`, `--foreground`, `--border`, `--ring`, etc.). If they do not exist, the package uses scoped fallback tokens so it still renders correctly.

Dark mode follows the nearest `.dark` ancestor, or `theme="dark"` on the grid root.

---

## Basic usage

```tsx
import { ReactDataGrid } from "the-datagrid";
import type { TypeColumns } from "the-datagrid";

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
import { ReactDataGrid } from "the-datagrid";
import type {
  TypeColumns,
  TypeFilterValue,
  TypeI18n,
  TypeOnSelectionChangeArg,
  TypeRowSelection,
} from "the-datagrid";

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
import { ReactDataGrid } from "the-datagrid";
import type {
  TypeColumns,
  TypeColumn,
  TypeDataGridProps,
  TypeRowSelection,
  TypeOnSelectionChangeArg,
  TypeFilterValue,
  TypeSortInfo,
  TypeI18n,
} from "the-datagrid";
```
