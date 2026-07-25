# Inovua parity audit: issues #32–#37

This audit compares `the-datagrid` with
`@inovua/reactdatagrid-community@5.10.2`. It distinguishes behavior that can
fit the repository's fixed `ReactDataGrid` prop contract from behavior that
requires an explicit public-API decision.

Primary sources:

- [Inovua 5.10.2 package](https://unpkg.com/browse/@inovua/reactdatagrid-community@5.10.2/)
- [data-source hook](https://unpkg.com/@inovua/reactdatagrid-community@5.10.2/hooks/useDataSource/index.js)
- [local data computation](https://unpkg.com/@inovua/reactdatagrid-community@5.10.2/hooks/useDataSource/computeData.js)
- [filter/column projection](https://unpkg.com/@inovua/reactdatagrid-community@5.10.2/hooks/useDataSource/getFilterValueForColumns.js)
- [filter predicate construction](https://unpkg.com/@inovua/reactdatagrid-community@5.10.2/filter.js)
- [column state hook](https://unpkg.com/@inovua/reactdatagrid-community@5.10.2/hooks/useColumns.js)
- [published grid props](https://unpkg.com/@inovua/reactdatagrid-community@5.10.2/types/TypeDataGridProps.d.ts)
- [published column/group types](https://unpkg.com/@inovua/reactdatagrid-community@5.10.2/types/TypeColumn.d.ts)
- [row context-menu renderer](https://unpkg.com/@inovua/reactdatagrid-community@5.10.2/plugins/menus/useMenus/renderRowContextMenu.js)

## Outcome matrix

| Issue | Upstream behavior inspected                                                                                                                                                                                                | This draft                                                                                                                                                                                              | Remaining delta                                                                                                                                                                                                                                              |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| #32   | Promise and function sources are remote by default. `pagination=true` therefore treats a resolved remote page as authoritative. Inovua also has root `loadingText`, `renderLoadMask`, and `renderPaginationToolbar` props. | A count-bearing static Promise (`{ data, count }`) is no longer sliced a second time when `pagination=true`. Bare Promise arrays remain locally composable snapshots, an intentional project extension. | Loading and toolbar customization require new root props. `onLoadingChange`, although listed by issue #32, is not a DataGrid prop in the published 5.10.2 runtime/types. Replacement, rejection, reload, and controlled paging coverage is still incomplete. |
| #33   | Controlled `sortInfo` supplies indicator/request state but `computeData` does not reorder a local array. Uncontrolled/default sort state owns local sorting.                                                               | Controlled `sortInfo` no longer mutates array order; indicators and callbacks remain controlled.                                                                                                        | Persistent multi-sort, root `sortable`, custom comparators/types, `renderSortTool`, and scroll behavior remain open.                                                                                                                                         |
| #34   | Inovua copies a column's `getFilterValue` onto its local filter descriptor, redirects `name` through `filterName`, and calls `getFilterValue({ data, value })`.                                                            | Local filtering resolves column id/name/filterName aliases and invokes the same `{ data, value }` getter shape.                                                                                         | Filter editor arguments, delay/scroll behavior, operator edge cases, menu customization, and exact remote descriptor projection remain open.                                                                                                                 |
| #35   | `defaultVisible=false` seeds Inovua's internal visibility map; `visible` is the live value.                                                                                                                                | `defaultVisible=false` and the existing `defaultHidden=true` alias now initialize hidden state unless runtime visibility overrides it.                                                                  | The repository intentionally requires `onColumnOrderChange` for reordering, unlike upstream uncontrolled reordering. Root sizing/visibility callbacks and advanced resize ownership remain open.                                                             |
| #36   | `groups: TypeColumnGroup[]` is a root prop. Groups can be nested through `groups[].group`; columns join them through `column.group`. Runtime behavior also covers split groups, reordering, and resizing.                  | No runtime change. The E2E remains an explicit `fixme`.                                                                                                                                                 | The fixed root prop surface does not include `groups`. A flat label inferred only from `column.group` would pass the narrow fixture but would misrepresent upstream behavior.                                                                                |
| #37   | `renderRowContextMenu(menuProps, details)` is a root prop. The runtime supplies row/cell/grid/computed details plus constrained positioning, portal rendering, dismissal, focus, and scrolling behavior.                   | No runtime change. The E2E remains an explicit `fixme`.                                                                                                                                                 | The fixed root prop surface does not include the renderer. A raw `contextmenu` callback would omit most of the required interaction and accessibility contract.                                                                                              |

## Architectural decisions in this draft

### Count-bearing Promise results are remote pages

The previous implementation treated every static Promise as a complete local
snapshot. With `skip=2` and `limit=2`, a Promise already resolving rows three
and four was sliced again and became empty.

This draft uses the result shape to preserve both useful behaviors:

- `{ data, count }` is an authoritative remote page unless pagination is
  explicitly `"local"`;
- a bare array is still a locally searchable/filterable/sortable snapshot.

The second behavior is intentionally more permissive than Inovua and preserves
the project's existing static-Promise composition feature.

### Controlled descriptors do not imply local ownership

The grid now treats controlled sorting like its existing controlled-filter
compatibility: the descriptor controls UI and remote request state, while the
consumer remains responsible for transforming a local array.

## Architecture evaluation: one owner per transform

The two ownership changes were evaluated through the requested four-part
framework:

| Lens                           | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Consequence for this grid                                                                                                                        |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Senior developer documentation | [React controlled-component guidance](https://react.dev/learn/sharing-state-between-components) makes the parent the source of truth. [TanStack manual sorting](https://tanstack.com/table/v8/docs/guide/sorting#manual-server-side-sorting) expects already-sorted rows, and [manual pagination](https://tanstack.com/table/v8/docs/guide/pagination#manual-server-side-pagination) expects an already-paged result plus its total count.                                                                                                                  | A controlled descriptor must not silently apply a second local transform. A remote page must not be sliced again.                                |
| Wiki and project ledger        | The installed Inovua 5.10.2 implementation classifies Promise/function sources as remote, skips local sorting for controlled `sortInfo`, and treats `default*` state as grid-owned. The repository's issues [#32](https://github.com/geo-vi/the-datagrid/issues/32), [#33](https://github.com/geo-vi/the-datagrid/issues/33), [#34](https://github.com/geo-vi/the-datagrid/issues/34), and [#35](https://github.com/geo-vi/the-datagrid/issues/35) record the remaining compatibility work instead of treating a narrow passing fixture as complete parity. | Keep the upstream ownership boundary, while documenting the project's explicit bare-array Promise extension and remaining debt.                  |
| Books                          | Martin Fowler's [_Patterns of Enterprise Application Architecture_](https://martinfowler.com/books/eaa.html) separates data-source responsibilities from presentation concerns. Martin Kleppmann's [_Designing Data-Intensive Applications_](https://dataintensive.net/) treats derived views as outputs of an authoritative source. Applied here, both support avoiding two independent writers for the same derived ordering/page.                                                                                                                        | Use one owner for each search/filter/sort/page transform. The result shape and controlled/default convention make that owner observable.         |
| Conventions                    | React's `value`/`defaultValue` convention distinguishes parent ownership from initialization. `{ data, count }` is the repository's count-bearing remote-result shape. [Semantic Versioning](https://semver.org/) requires incompatible behavior changes to be identified to consumers.                                                                                                                                                                                                                                                                     | Preserve `defaultSortInfo` for grid-owned local sorting, require the parent to supply controlled ordering, and publish the migration note below. |

The alternatives were rejected:

- applying controlled sorting locally creates two possible owners and can
  reorder already-sorted consumer data;
- slicing `{ data, count }` locally by default can turn a valid remote page into
  an empty page;
- treating all Promises identically would remove the existing bare-array local
  composition extension.

The selected design therefore uses a stable rule: controlled state and
count-bearing results are authoritative; `default*` state and explicitly local
pagination are grid-owned.

## Migration note

### Controlled `sortInfo` with a local array

Previously, a controlled descriptor also reordered the array inside the grid.
The grid now renders the array in consumer order while retaining the controlled
indicator and callback state.

- Use `defaultSortInfo` when the grid should own local sorting.
- Keep `sortInfo` controlled when the parent or data layer owns sorting, and
  pass the resulting ordered rows back through `dataSource`.

### Static Promise results

Previously, every static Promise result was treated as a complete local
snapshot. The result shape now determines ownership:

- `Promise<{ data, count }>` is an authoritative remote page and is not sliced
  again;
- set `pagination="local"` to opt a count-bearing result into local
  search/filter/sort/page composition;
- `Promise<rows[]>` retains the project's existing local-snapshot extension.

### Do not pass a narrow fixture by inventing a partial public contract

Issues #36 and #37 require root props that are absent from the repository's
non-negotiable instantiation surface. This draft does not add them and does not
replace them with look-alike behavior that lacks the upstream geometry,
payload, focus, or lifecycle semantics.

Before implementing those issues, the project needs an explicit decision to
either:

1. expand the root prop contract and implement the full upstream-shaped
   behavior; or
2. declare stacked groups and custom context-menu renderers intentional
   non-goals and update the compatibility claims.

## Executable debt

The Playwright issue ledger keeps 11 `fixme` tests enabled as known parity debt:
the upstream loading/pagination render hooks from #32, plus issues #36–#37 and
#39–#46. They are not functionality fixed by this draft. Issues #32–#35 have
active regression tests for the specific behavior changed here, but their
wider umbrella issues should remain open until their remaining acceptance
criteria are implemented.
