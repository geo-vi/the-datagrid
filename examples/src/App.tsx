import { useMemo, useState } from 'react'
import ReactDataGrid, { type TypeColumns, type TypeI18n } from '../../src/main'

function App() {
  const i18n: TypeI18n = useMemo(
    () => ({
      noRecords: 'No records',
      clear: 'Clear',
      contains: 'Contains',
      startsWith: 'Starts with',
      endsWith: 'Ends with',
      eq: 'Equals',
      neq: 'Not equals',
      empty: 'Empty',
      notEmpty: 'Not empty',
      sortAsc: 'Sort asc',
      sortDesc: 'Sort desc',
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

  const columns: TypeColumns = useMemo(
    () => [
      { name: 'cldomnr', header: 'ID', sortable: true, filterable: true },
      { name: 'name', header: 'Name', sortable: true, filterable: true },
      { name: 'city', header: 'City', sortable: true, filterable: true },
      {
        name: 'amount',
        header: 'Amount',
        sortable: true,
        filterable: true,
        textAlign: 'end',
        headerAlign: 'end',
      },
    ],
    []
  )

  const rows = useMemo(
    () =>
      Array.from({ length: 1000 }, (_, index) => ({
        cldomnr: index + 1,
        name: `Row ${index + 1}`,
        city: ['London', 'Berlin', 'Paris', 'Rome'][index % 4],
        amount: (index * 13) % 1000,
      })),
    []
  )

  const [columnOrder, setColumnOrder] = useState(() =>
    columns.map((c) => c.name ?? '')
  )
  const [filteredCount, setFilteredCount] = useState(rows.length)

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h1 style={{ margin: 0 }}>the-datagrid demo</h1>
      <div style={{ fontSize: 12, opacity: 0.75 }}>
        Filtered rows: <span style={{ fontFamily: 'monospace' }}>{filteredCount}</span>
      </div>

      <ReactDataGrid
        theme="default"
        idProperty="cldomnr"
        columns={columns}
        dataSource={rows}
        columnOrder={columnOrder}
        enableColumnFilterContextMenu={true}
        enableColumnAutosize={true}
        skipHeaderOnAutoSize={false}
        enableFiltering={true}
        defaultFilterValue={null}
        filteredRowsCount={setFilteredCount}
        onColumnOrderChange={setColumnOrder}
        virtualized={true}
        columnUserSelect={true}
        i18n={i18n}
        showColumnMenuTool={false}
      />
    </div>
  )
}

export default App
