# the-datagrid

A modern, feature-rich React data grid component built with [shadcn/ui](https://ui.shadcn.com/) and [TanStack Table](https://tanstack.com/table).

## Features

- ✅ **Virtualized rendering** - Efficiently handle large datasets
- ✅ **Sorting** - Single and multi-column sorting
- ✅ **Filtering** - Built-in filter row with multiple operators
- ✅ **Column management** - Reorder, resize, auto-size columns
- ✅ **Pagination** - Built-in pagination controls
- ✅ **Row selection** - Checkbox-based row selection
- ✅ **Modern UI** - Built with shadcn/ui components and Tailwind CSS
- ✅ **TypeScript** - Fully typed with TypeScript
- ✅ **Compatible API** - Inspired by Inovua ReactDataGrid for easy migration

## Installation

```bash
npm install the-datagrid
# or
yarn add the-datagrid
# or
pnpm add the-datagrid
```

## Peer Dependencies

This package requires React and React DOM as peer dependencies. You also need to set up Tailwind CSS in your project.

```bash
npm install react react-dom
npm install -D tailwindcss postcss autoprefixer
```

## Setup Tailwind CSS

Since this package uses Tailwind CSS, you need to configure it in your project. Add the following to your `tailwind.config.js`:

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./node_modules/the-datagrid/**/*.{js,ts,jsx,tsx}", // Add this line
  ],
  theme: {
    extend: {
      // Add shadcn/ui theme variables
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        // ... add other shadcn colors
      },
    },
  },
  plugins: [],
}
```

Add the Tailwind directives to your CSS file:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    /* ... add other CSS variables */
  }
}
```

See [shadcn/ui documentation](https://ui.shadcn.com/docs/theming) for full theme configuration.

## Basic Usage

```tsx
import { ReactDataGrid } from 'the-datagrid'
import type { TypeColumns, TypeI18n } from 'the-datagrid'

function App() {
  const columns: TypeColumns = [
    { name: 'id', header: 'ID', sortable: true, filterable: true },
    { name: 'name', header: 'Name', sortable: true, filterable: true },
    { name: 'email', header: 'Email', sortable: true, filterable: true },
  ]

  const rows = [
    { id: 1, name: 'John Doe', email: 'john@example.com' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
    // ... more rows
  ]

  return (
    <ReactDataGrid
      idProperty="id"
      columns={columns}
      dataSource={rows}
      virtualized={true}
      enableFiltering={true}
    />
  )
}
```

## Advanced Usage

```tsx
import { useState, useMemo } from 'react'
import { ReactDataGrid } from 'the-datagrid'
import type { TypeColumns, TypeI18n, TypeRowSelection, TypeOnSelectionChangeArg } from 'the-datagrid'

function App() {
  const [selected, setSelected] = useState<TypeRowSelection>({})
  const [columnOrder, setColumnOrder] = useState<string[]>([])
  const [filterValue, setFilterValue] = useState(null)

  const columns: TypeColumns = useMemo(
    () => [
      { name: 'id', header: 'ID', sortable: true, filterable: true },
      { name: 'name', header: 'Name', sortable: true, filterable: true },
      { name: 'email', header: 'Email', sortable: true, filterable: true },
    ],
    []
  )

  const rows = useMemo(
    () => [
      { id: 1, name: 'John Doe', email: 'john@example.com' },
      { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
      // ... more rows
    ],
    []
  )

  const i18n: TypeI18n = useMemo(
    () => ({
      noRecords: 'No records',
      clear: 'Clear',
      contains: 'Contains',
      sortAsc: 'Sort A→Z',
      sortDesc: 'Sort Z→A',
      // ... more translations
    }),
    []
  )

  const onSelectionChange = (config: TypeOnSelectionChangeArg) => {
    setSelected(config.selected)
  }

  return (
    <ReactDataGrid
      theme="default"
      idProperty="id"
      columns={columns}
      columnOrder={columnOrder}
      dataSource={rows}
      enableColumnFilterContextMenu={true}
      enableColumnAutosize={true}
      skipHeaderOnAutoSize={false}
      enableFiltering={true}
      defaultFilterValue={filterValue}
      filteredRowsCount={(count) => console.log('Filtered rows:', count)}
      onColumnOrderChange={setColumnOrder}
      virtualized={true}
      columnUserSelect={true}
      i18n={i18n}
      showColumnMenuTool={false}
      checkboxColumn={true}
      onSelectionChange={onSelectionChange}
      selected={selected}
    />
  )
}
```

## Props

### Core Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `idProperty` | `string` | **required** | Property name used as unique row identifier |
| `columns` | `TypeColumns` | **required** | Array of column definitions |
| `dataSource` | `TypeDataSource` | **required** | Data source (array, function, or promise) |

### Display Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `theme` | `string` | `"default"` | Theme name |
| `rowHeight` | `number` | `44` | Height of each row in pixels |
| `headerHeight` | `number` | `40` | Height of header row in pixels |
| `filterRowHeight` | `number` | `44` | Height of filter row in pixels |
| `virtualized` | `boolean` | `true` | Enable virtual scrolling |
| `columnUserSelect` | `boolean \| 'text' \| 'none'` | `true` | Column text selection behavior |

### Column Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `columnOrder` | `string[]` | - | Ordered array of column IDs/names |
| `onColumnOrderChange` | `(order: string[]) => void` | - | Callback when column order changes |
| `enableColumnAutosize` | `boolean` | `true` | Enable automatic column width calculation |
| `skipHeaderOnAutoSize` | `boolean` | `false` | Skip header text when auto-sizing |
| `showColumnMenuTool` | `boolean` | `false` | Show column menu tool in header |

### Filtering Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `enableFiltering` | `boolean` | `true` | Enable filter row |
| `filterValue` | `TypeFilterValue` | - | Controlled filter value |
| `defaultFilterValue` | `TypeFilterValue` | - | Default filter value |
| `onFilterValueChange` | `(value: TypeFilterValue) => void` | - | Filter value change callback |
| `enableColumnFilterContextMenu` | `boolean` | `false` | Enable context menu for filters |
| `filteredRowsCount` | `(count: number) => void` | - | Callback with filtered row count |

### Sorting Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `sortInfo` | `TypeSortInfo` | - | Controlled sort information |
| `defaultSortInfo` | `TypeSortInfo` | - | Default sort information |
| `onSortInfoChange` | `(info: TypeSortInfo) => void` | - | Sort change callback |
| `allowUnsort` | `boolean` | `true` | Allow unsorting columns |
| `defaultSortingDirection` | `'asc' \| 'desc'` | `'asc'` | Default sort direction |

### Selection Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `checkboxColumn` | `boolean \| IColumn` | `false` | Enable checkbox column for row selection |
| `selected` | `TypeRowSelection` | - | Controlled selected rows |
| `defaultSelected` | `TypeRowSelection` | - | Default selected rows |
| `onSelectionChange` | `(config: TypeOnSelectionChangeArg) => void` | - | Selection change callback |

### Pagination Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `pagination` | `true \| false \| 'remote' \| 'local'` | `true` | Pagination mode |
| `skip` | `number` | - | Controlled skip/offset |
| `defaultSkip` | `number` | `0` | Default skip/offset |
| `limit` | `number` | - | Controlled page size |
| `defaultLimit` | `number` | `10` | Default page size |
| `onSkipChange` | `(skip: number) => void` | - | Skip change callback |
| `onLimitChange` | `(limit: number) => void` | - | Limit change callback |
| `pageSizes` | `number[]` | `[10, 20, 30, 40, 50]` | Available page sizes |

### Other Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `i18n` | `TypeI18n` | - | Internationalization object |
| `loading` | `boolean` | - | Loading state |
| `onReady` | `(ref: RefObject) => void` | - | Callback when grid is ready |
| `handle` | `(ref: RefObject) => void` | - | Alias for onReady |
| `className` | `string` | - | Additional CSS classes |
| `style` | `CSSProperties` | - | Inline styles |

## TypeScript

This package is written in TypeScript and provides full type definitions. Import types as needed:

```tsx
import type {
  ReactDataGrid,
  TypeColumns,
  TypeColumn,
  TypeDataGridProps,
  TypeRowSelection,
  TypeOnSelectionChangeArg,
  TypeFilterValue,
  TypeSortInfo,
  TypeI18n,
} from 'the-datagrid'
```

## License

MIT
