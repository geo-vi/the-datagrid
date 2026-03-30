# the-datagrid Data Flow Skill

Use this skill when an AI assistant needs to wire local or remote data,
filtering, sorting, pagination, or controlled selection state for
`@geovi/the-datagrid`.

## Source of truth

- `src/types.ts`
- `src/grid/ReactDataGrid.tsx`
- `/docs/guides/remote-data`
- `/docs/guides/filtering-and-sorting`
- `/docs/guides/selection`

## Core mental model

1. `dataSource` can be:
   - a local array
   - a promise of rows
   - a promise of `{ data, count }`
   - a function that returns any of the above
2. Local arrays are filtered and sorted client-side.
3. Function-backed remote sources receive the current grid state and should do
   filtering, sorting, and optionally pagination on the server side.
4. The grid supports controlled and uncontrolled state for filters, sorting,
   pagination, and selection.

## Remote args contract

When `dataSource` is a function, the AI should assume these fields are part of
the stable request contract:

- `sortInfo`
- `filterValue`
- `columnOrder`
- `columns`
- `idProperty`
- `theme`

When pagination is remote, also expect:

- `skip`
- `limit`

Do not invent separate props such as `remoteSort`, `remoteFilter`, or
`remotePagination` unless they already exist in the consumer codebase. Remote
behavior is inferred by the grid.

## Correct local controlled state

```tsx
const [filterValue, setFilterValue] = useState<TypeFilterValue>(null);
const [sortInfo, setSortInfo] = useState<TypeSortInfo>(null);

<ReactDataGrid
  idProperty="id"
  columns={columns}
  dataSource={rows}
  enableFiltering
  filterValue={filterValue}
  onFilterValueChange={setFilterValue}
  sortInfo={sortInfo}
  onSortInfoChange={setSortInfo}
/>;
```

## Correct remote data source shape

```tsx
const dataSource = async (args: {
  sortInfo: TypeSortInfo;
  filterValue: TypeFilterValue;
  columnOrder: string[];
  columns: TypeColumns;
  idProperty: string;
  theme?: string;
  skip?: number;
  limit?: number;
}) => {
  const response = await fetch("/api/accounts/search", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(args),
  });

  return response.json() as Promise<{ data: AccountRow[]; count: number }>;
};
```

## Filtering rules

- `enableFiltering` shows the filter row.
- `defaultFilterValue` is the uncontrolled initial state.
- `filterValue` and `onFilterValueChange` are the controlled state pair.
- `enableColumnFilterContextMenu` enables operator switching UI in the filter
  row.
- `filteredRowsCount` receives the number of rows after filtering.

## Sorting rules

- Use `sortInfo` and `onSortInfoChange` for controlled sorting.
- `defaultSortInfo` is the uncontrolled initial sort state.
- `allowUnsort` controls whether sort cycles return to the unsorted state.
- Local arrays are sorted client-side. Remote functions receive the sort state.

## Selection rules

- Use `checkboxColumn` to render the selection column.
- Use `selected` and `onSelectionChange` for controlled selection.
- Prefer the row-id object map model in app code.
- The direct setter pattern is valid:

```tsx
const [selectedRows, setSelectedRows] = useState<TypeRowSelection>({});

<ReactDataGrid
  checkboxColumn
  selected={selectedRows}
  onSelectionChange={setSelectedRows}
/>;
```

## Do not hallucinate

- Do not describe local arrays as remote just because filtering or sorting is
  controlled.
- Do not claim pagination is always server-side.
- Do not claim `onSelectionChange` emits only the raw map; it emits the wrapper
  object and tolerates that wrapper when passed back through `selected`.
