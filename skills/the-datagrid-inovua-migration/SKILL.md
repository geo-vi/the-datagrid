# the-datagrid Inovua Migration Skill

Use this skill when an AI assistant is converting code or mental models from
`@inovua/reactdatagrid-community` to `@geovi/the-datagrid`.

## Objective

Preserve the useful Inovua vocabulary and callback shapes while avoiding false
claims of full feature parity.

## Source of truth

- `src/types.ts`
- `src/main.ts`
- `AGENTS.md`
- `/docs/migration/inovua-compat`
- `/docs/guides/selection`
- `/docs/reference/reactdatagrid`

## Safe assumptions

These are reasonable compatibility assumptions:

- The type vocabulary is intentionally Inovua-aligned:
  - `IColumn`
  - `TypeColumn`
  - `TypeColumns`
  - `TypeDataSource`
  - `TypeFilterValue`
  - `TypeSortInfo`
  - `TypeI18n`
- Inovua-style render callbacks are supported:

```tsx
render: ({ value, data, rowIndex }) => ...
```

- `onSelectionChange` uses the wrapper shape:

```ts
{
  (selected, data, unselected, originalData);
}
```

- The direct setter round-trip is supported:

```tsx
selected = { selectedRows };
onSelectionChange = { setSelectedRows };
```

## Important differences

Do not promise parity for these areas unless you verify them in the codebase:

- grouping
- pivoting
- tree data
- mutable/full Enterprise locked-column behavior (`defaultLocked`, `lockable`,
  `autoLock`, `onColumnLockedChange`, `showColumnMenuLockOptions`,
  `setColumnLocked`, lock/unlock menu actions, cross-section drag mutation, and
  RTL mirroring). Static declarative `column.locked` start/end pinning is
  supported.
- row reorder
- cell selection
- clipboard systems
- larger plugin ecosystems

This library is migration-friendly, not a claim of full Inovua feature
coverage.

## Selection migration guidance

Prefer this end state:

```tsx
const [selectedRows, setSelectedRows] = useState<TypeRowSelection>({});

<ReactDataGrid
  checkboxColumn
  selected={selectedRows}
  onSelectionChange={setSelectedRows}
/>;
```

If old app code uses broader Inovua patterns such as `selected === true` plus
`unselected`, do not describe that as the primary recommended model here.
Map-based selected state is the intended long-term path.

## Remote-data migration guidance

- Keep remote fetch code focused on:
  - `sortInfo`
  - `filterValue`
  - `columnOrder`
  - `columns`
  - `idProperty`
  - `theme`
  - `skip` and `limit` when pagination is remote
- Do not invent separate remote mode props if they are not already present.

## Prompting rules for AI

When asked to “make this work like Inovua,” the assistant should:

1. Preserve familiar type names and callback shapes.
2. Reuse supported concepts already present in `TypeDataGridProps`.
3. Explicitly call out unsupported advanced features instead of fabricating
   them.
4. Point back to the compatibility docs when parity is partial.
