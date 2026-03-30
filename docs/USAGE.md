# Usage Example

```tsx
import { ReactDataGrid } from 'the-datagrid'
import type { TypeColumns, TypeI18n, TypeRowSelection, TypeOnSelectionChangeArg } from 'the-datagrid'
import { useState, useMemo } from 'react'

function MyComponent() {
  const [selected, setSelected] = useState<TypeRowSelection>({})
  const [columnOrder, setColumnOrder] = useState<string[]>([])
  const [filterValue, setFilterValue] = useState(null)
  const [enableColumnFilterContextMenu, setEnableColumnFilterContextMenu] = useState(true)

  const columns: TypeColumns = useMemo(
    () => [
      { name: 'clmboxnr', header: 'ID', sortable: true, filterable: true },
      { name: 'name', header: 'Name', sortable: true, filterable: true },
      { name: 'email', header: 'Email', sortable: true, filterable: true },
    ],
    []
  )

  const rows = useMemo(
    () => [
      { clmboxnr: 1, name: 'John Doe', email: 'john@example.com' },
      { clmboxnr: 2, name: 'Jane Smith', email: 'jane@example.com' },
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
      unsort: 'Unsort',
      perPageText: 'Rows',
      pageText: 'Page',
      ofText: 'of',
      showingText: 'Showing',
      columns: 'Column',
      clearAll: 'All',
    }),
    []
  )

  const onSelectionChange = (config: TypeOnSelectionChangeArg) => {
    setSelected(config.selected)
  }

  const updateFilterRowsCount = (count: number) => {
    console.log('Filtered rows:', count)
  }

  const onColumnOrderChange = (order: string[]) => {
    setColumnOrder(order)
  }

  const useGridTheme = () => 'default'

  return (
    <ReactDataGrid
      theme={useGridTheme()}
      idProperty="clmboxnr"
      columns={columns}
      columnOrder={columns.map((c) => c.name || '')}
      dataSource={rows}
      enableColumnFilterContextMenu={enableColumnFilterContextMenu}
      enableColumnAutosize={true}
      skipHeaderOnAutoSize={false}
      enableFiltering={true}
      defaultFilterValue={filterValue}
      filteredRowsCount={updateFilterRowsCount}
      onColumnOrderChange={onColumnOrderChange}
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

`onSelectionChange` emits the Inovua-style config object. The grid also accepts that emitted object back through `selected`, so direct React setter wiring like `onSelectionChange={setSelectedRows}` is supported.
