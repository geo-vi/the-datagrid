# the-datagrid Consumer Skill

Use this skill when an AI assistant needs to add, update, or explain a normal
`@geovi/the-datagrid` integration in an application.

## Primary goal

Generate code that uses the real the-datagrid API and styling model without
inventing props, setup steps, or Inovua features that are not present.

## Source of truth

Read these before making claims:

- `src/main.ts`
- `src/types.ts`
- `AGENTS.md`
- `/docs/reference/reactdatagrid`
- `/docs/reference/icolumn`
- `/docs/guides/selection`

## Hard rules

1. Never invent props.
   Only use props that exist in `TypeDataGridProps` or are explicitly
   documented in the docs site.
2. Always start from the real baseline:
   - `idProperty`
   - `columns`
   - `dataSource`
3. Prefer the exported type names from the package:
   - `TypeColumns`
   - `TypeRowSelection`
   - `TypeFilterValue`
   - `TypeSortInfo`
4. Do not tell consumers to install Tailwind or shadcn just to use the grid.
   The package ships compiled CSS and imports it from the package entry.
5. Use `theme` as a selector hook, not as a second styling system.
6. When in doubt, prefer the examples under `examples/src` over generic table
   advice.

## Minimal correct usage

```tsx
import ReactDataGrid, { type TypeColumns } from "@geovi/the-datagrid";

const columns: TypeColumns = [
  { name: "id", header: "ID", sortable: true },
  { name: "name", header: "Name", filterable: true },
];

const rows = [
  { id: 1, name: "Ada" },
  { id: 2, name: "Linus" },
];

<ReactDataGrid
  idProperty="id"
  columns={columns}
  dataSource={rows}
  virtualized
  enableFiltering
/>;
```

## Recommended conventions

- Prefer `name` for the column identity unless `id` is required separately.
- Keep `columnOrder` aligned with column ids or names.
- Use `defaultWidth`, `minWidth`, and `maxWidth` instead of hardcoded CSS for
  column sizing.
- Use `headerAlign` and `textAlign` for alignment instead of wrapping cells in
  ad hoc layout containers.
- For cell rendering, prefer the supported Inovua-style form when it makes the
  code clearer:

```tsx
render: ({ value, data }) => <span>{value}</span>;
```

The two-argument form is also supported:

```tsx
render: (value, { data }) => <span>{value}</span>;
```

## Selection pattern

If the task involves row selection, use the documented controlled flow:

```tsx
const [selectedRows, setSelectedRows] = useState<TypeRowSelection>({});

<ReactDataGrid
  idProperty="id"
  columns={columns}
  dataSource={rows}
  checkboxColumn
  selected={selectedRows}
  onSelectionChange={setSelectedRows}
/>;
```

The grid emits an Inovua-style wrapper object and also accepts that wrapper
back through `selected`, so the direct setter pattern is valid here.

## Things to avoid

- Do not claim support for grouping, pivoting, tree data, locked columns, row
  reorder, clipboard tooling, or full Inovua plugin parity unless you verify it
  in this repo first.
- Do not add styling props just to fix layout or theming.
- Do not assume consumers need a separate stylesheet import in normal bundler
  setups.
