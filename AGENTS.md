Project: the-datagrid

Mission
the-datagrid is a React DataGrid library that provides an Inovua-like developer experience (API shape + type naming) while keeping the implementation lightweight and maintainable. The library prioritizes stability of its public API and type vocabulary over adding new knobs and options.

Non-negotiable public contract (React component props)
ReactDataGrid MUST support exactly these props as the public instantiation surface:

* theme
* idProperty
* columns
* dataSource
* columnOrder
* enableColumnFilterContextMenu
* enableColumnAutosize
* skipHeaderOnAutoSize
* enableFiltering
* defaultFilterValue
* filteredRowsCount
* onColumnOrderChange
* virtualized
* columnUserSelect
* i18n
* showColumnMenuTool

Rules:

1. Do not introduce new public props without an explicit decision. If functionality cannot fit into the fixed prop surface, it must be implemented internally, through column-level configuration (TypeColumn fields), or deferred.
2. Do not rely on consumers passing additional props “for styling” or “for layout”. Styling must be handled internally via Tailwind/shadcn conventions (see below).
3. Maintain backward compatibility for the semantics of these props once released.

Explicit API decision (2026-09-05): the maintainer requested Inovua-compatible
tree-grid and master-detail support. The implemented `TypeTreeGridProps` and
`TypeMasterDetailProps` extend the baseline above. See
`docs/hierarchy-compatibility.md` for acceptance criteria and coverage, and
`docs/research/inovua-hierarchy-sources.md` for recovered legacy contracts.
Do not expose deferred legacy options as accepted but nonfunctional props.

Canonical exported types (Inovua-aligned vocabulary)
the-datagrid exposes a naming and conceptual model aligned with Inovua, even if the implementation is simplified:

* IColumn, TypeColumn, TypeColumns
* TypeDataGridProps
* TypeDataSource
* TypeFilterValue, TypeSingleFilterValue
* TypeSortInfo, TypeSingleSortInfo, SortDirection
* TypeFilterTypes, TypeFilterType, TypeFilterOperator
* TypeI18n

The goal is migration ergonomics: a developer familiar with Inovua should understand the types immediately, and app-level code should need minimal rewrites.

Behavior contracts

1. Columns

* Every column must have a stable identifier via id or name.
* columnOrder is a list of column IDs (derived from id/name) and defines the rendered order.
* Column visibility is controlled by column.visible (if supported) but must not require new public props.
* Column rendering must support header/renderHeader/render and alignments (headerAlign/textAlign).
* Column sizing must support width/defaultWidth/minWidth/maxWidth and work with enableColumnAutosize.

2. DataSource (local + remote)
   TypeDataSource must support:

* Local array data sources: any[]
* Remote sources:

  * Promise<any[]>
  * Promise<{ data: any[]; count: number }>
  * (args) => any[] | Promise<any[]> | Promise<{ data: any[]; count: number }>

Remote args must include, at minimum:

* sortInfo
* filterValue
* columnOrder
* columns
* idProperty
* theme
  This args object is part of the API contract and must remain stable.

3. Filtering

* enableFiltering toggles the filter row behavior.
* defaultFilterValue initializes uncontrolled filter state.
* Filter state model uses TypeFilterValue = TypeSingleFilterValue[] | null.
* Each filter entry includes name (column key), operator, type, value, and optional active.
* enableColumnFilterContextMenu enables operator changes via a context menu on the filter cell.
* For local array sources: filtering must be applied client-side.
* For remote sources: filterValue must be passed to dataSource(args).
* filteredRowsCount must report the number of rows after filtering (and before any local pagination slicing if pagination exists internally).

4. Sorting

* Sorting state uses TypeSortInfo = single | array | null.
* Toggle behavior must be deterministic and respect allowUnsort semantics internally (even if allowUnsort is not publicly configurable).
* For local array sources: sorting must be applied client-side.
* For remote sources: sortInfo must be passed to dataSource(args).

5. Column order + reordering

* columnOrder + onColumnOrderChange define the ordering contract.
* Column reordering must only commit changes through onColumnOrderChange (no hidden mutation of consumer state).
* If onColumnOrderChange is not provided, reordering should be disabled (the grid can render columnOrder but must not pretend it can persist changes).

6. Virtualization

* virtualized controls row virtualization (TanStack Virtual or equivalent).
* Virtualization must not break:

  * header rendering
  * filter row rendering
  * column widths/autosizing behavior
  * context menus positioning

7. Autosizing

* enableColumnAutosize enables a deterministic width heuristic.
* skipHeaderOnAutoSize controls whether header text is included in measurement.
* Autosize should use a bounded sampling strategy (e.g., first N rows) and clamp widths to sane limits.
* Avoid relying on DOM measurement where possible; prefer deterministic estimation (fast, SSR-friendly).

8. i18n

* i18n is an object map keyed by known UI keys, with fallbacks.
* At minimum, cover: noRecords, clear, clearAll, contains/startsWith/endsWith/eq/neq/empty/notEmpty, columns, sortAsc/sortDesc/unsort.

Tailwind + shadcn: mandatory design system alignment (why it matters and how to implement it)

This is not optional. the-datagrid must “feel native” inside a shadcn + Tailwind application, because that is the primary integration environment. If the grid ships with bespoke styling or mismatched UI primitives, it becomes visually inconsistent, harder to theme, and expensive to maintain across products.

Design requirements:

1. Tailwind-first styling

* The grid should be styled primarily via Tailwind utility classes.
* Avoid custom CSS files for the main look-and-feel.
* Use Tailwind tokens that align with shadcn conventions: bg-background, text-foreground, border-border, ring-ring, muted/secondary/accent states, etc.
* Only use inline styles for numeric, data-driven layout (e.g., computed column widths, virtualization offsets). Never hardcode colors inline.

2. shadcn-compatible UI patterns
   Even if you do not literally import a consumer’s shadcn components (because shadcn is “copy code”, not a stable package API), the grid’s UI must mimic shadcn patterns closely:

* Buttons should look/behave like shadcn Button (focus-visible ring, hover states, disabled states).
* Inputs should look/behave like shadcn Input (height, padding, border, focus ring).
* Menus (filter operator menu, column menu tool) must behave like shadcn DropdownMenu (Radix-style interaction, correct focus handling, keyboard navigation, click-outside behavior).
* Select-type filters should mimic shadcn Select styling and interactions.

Practical implementation guidance:

* Prefer using Radix primitives internally for menus/popovers (shadcn is Radix-based), and apply Tailwind classes in the same style as shadcn components.
* Do not import from app-relative paths (e.g., "@/components/ui/...") inside the library; that makes the library non-portable.
* The output should still be consistent with shadcn theming because it relies on the same Tailwind token classes and CSS variables.

3. Theme handling

* The theme prop should translate into a predictable styling hook (e.g., a data attribute or a class) that can be targeted by Tailwind or CSS variables.
* Do not treat “theme” as a full alternative styling system; it is a selector/hook, not a replacement for the shadcn token model.

4. Accessibility and interaction parity
   shadcn users expect:

* focus-visible rings and keyboard operability
* correct ARIA semantics for menus
* predictable Escape/Outside click behavior
* no broken tab order due to virtualization or custom handlers

If the grid deviates here, it will feel “non-shadcn” even if the colors match.

Repository map (where changes belong)

* ReactDataGrid.tsx: the component implementation and UI glue (table, header, filter row, menus, pagination).
* types.ts: public API types; treat as semver-sensitive.
* filters/utils.ts: normalizeFilterValue, filter entry upsert, local filter operators.
* sorting/utils.ts: sort toggling + local sort helpers.
* hooks/useControllableState.ts: controlled/uncontrolled state helper.
* utils/*: stable helper utilities (column id resolution, etc.).

Rules for agents contributing to the codebase

1. Public prop surface is fixed. Do not add new props.
2. Keep types aligned with Inovua naming and intent.
3. Ensure both local and remote dataSources work and receive correct args.
4. Ensure filteredRowsCount is accurate and consistent.
5. Styling must be Tailwind + shadcn-aligned: token classes, Radix-like interactions for menus, no bespoke design language.
6. Avoid heavy dependencies and avoid app-path imports.
7. Prefer deterministic behavior (no fragile DOM measurement for autosize).

Definition of done for changes
A change is acceptable only if:

* The “exact props” instantiation remains valid and behaves correctly.
* Local dataSource filtering/sorting works.
* Remote dataSource receives stable args including sortInfo/filterValue/columnOrder/columns/idProperty/theme.
* Column reordering changes propagate only through onColumnOrderChange.
* Virtualization does not break header/filter/menu interactions.
* UI is visually and behaviorally consistent with shadcn + Tailwind expectations (tokens, focus states, menu ergonomics).
