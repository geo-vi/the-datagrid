# Inovua parity audit: issues #32–#37

This audit compares `the-datagrid` with
`@inovua/reactdatagrid-community@5.10.2`. Issue #32 includes the explicit
public-API decision that Inovua's implemented surface is a compatibility floor
and behavior-backed extensions are allowed.

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

| Issue | Upstream behavior inspected                                                                                                                                                                                                                                                        | This draft                                                                                                                                                                                                                                                                                                                 | Remaining delta                                                                                                                                                                                  |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| #32   | Promise and function sources are remote by default. `pagination=true` treats their resolved pages as authoritative. Inovua also has `loadingText`, `renderLoadMask`, `renderPaginationToolbar`, controlled paging, reload, and latest-request guards.                              | All Promise/function sources infer remote pagination; explicit `local` opts into slicing. Loading/mask/toolbar contracts, controlled reset order, reload, rejection preservation, stale-result guards, and cancellation are implemented. `onLoadingChange` and `TypeDataSourceArgs.signal` are behavior-backed extensions. | No remaining delta against issue #32's acceptance criteria.                                                                                                                                      |
| #33   | Controlled `sortInfo` supplies indicator/request state but `computeData` does not reorder a local array. Array shape is persistent multi-sort mode. Root/column sortability, `column.sort`, `sortFunctions[type]`, custom sort tools, and `scrollTopOnSort` are runtime contracts. | The same ownership and persistent array behavior are implemented across header, menu, mobile, imperative, local, and remote paths. Typed, registered, descriptor, named-column, and id-only comparators preserve upstream argument shapes; root/column sort tools and all scroll modes are covered.                        | No remaining delta against issue #33's acceptance criteria.                                                                                                                                      |
| #34   | Inovua copies a column's `getFilterValue` onto its local filter descriptor, redirects `name` through `filterName`, and calls `getFilterValue({ data, value })`.                                                                                                                    | Local filtering resolves column id/name/filterName aliases and invokes the same `{ data, value }` getter shape.                                                                                                                                                                                                            | Filter editor arguments, delay/scroll behavior, operator edge cases, menu customization, and exact remote descriptor projection remain open.                                                     |
| #35   | `defaultVisible=false` seeds Inovua's internal visibility map; `visible` is the live value.                                                                                                                                                                                        | `defaultVisible=false` and the existing `defaultHidden=true` alias now initialize hidden state unless runtime visibility overrides it.                                                                                                                                                                                     | The repository intentionally requires `onColumnOrderChange` for reordering, unlike upstream uncontrolled reordering. Root sizing/visibility callbacks and advanced resize ownership remain open. |
| #36   | `groups: TypeColumnGroup[]` is a root prop. Groups can be nested through `groups[].group`; columns join them through `column.group`. Runtime behavior also covers split groups, reordering, and resizing.                                                                          | No runtime change. The E2E remains an explicit `fixme`.                                                                                                                                                                                                                                                                    | The fixed root prop surface does not include `groups`. A flat label inferred only from `column.group` would pass the narrow fixture but would misrepresent upstream behavior.                    |
| #37   | `renderRowContextMenu(menuProps, details)` is a root prop. The runtime supplies row/cell/grid/computed details plus constrained positioning, portal rendering, dismissal, focus, and scrolling behavior.                                                                           | No runtime change. The E2E remains an explicit `fixme`.                                                                                                                                                                                                                                                                    | The fixed root prop surface does not include the renderer. A raw `contextmenu` callback would omit most of the required interaction and accessibility contract.                                  |

## Architectural decisions in this draft

### Promise and function results are remote pages

The previous implementation treated every static Promise as a complete local
snapshot. With `skip=2` and `limit=2`, a Promise already resolving rows three
and four was sliced again and became empty.

The implemented rule matches upstream pagination ownership:

- with `pagination=true` or `"remote"`, bare arrays and `{ data, count }`
  returned by Promise/function sources are authoritative remote pages;
- `pagination="local"` omits `skip`/`limit` from function args and locally
  slices the resolved full result;
- when pagination is disabled, a bare static Promise array remains a useful
  local search/filter/sort snapshot.

### Controlled descriptors do not imply local ownership

The grid now treats controlled sorting like its existing controlled-filter
compatibility: the descriptor controls UI and remote request state, while the
consumer remains responsible for transforming a local array.

### Array shape owns multi-sort mode

Inovua derives `computedIsMultiSort` from `Array.isArray(sortInfo)`. The grid
now preserves that shape through header, keyboard, menu, transformed-mobile,
imperative, and TanStack adapter paths. No modifier key is required. Existing
descriptor positions remain stable as directions change, and removing the last
descriptor produces `[]` rather than collapsing out of multi-sort mode.

### Comparator and sort-tool contracts

Local descriptor projection now carries column id/name/type metadata and wraps
`column.sort` with the upstream
`(value1, value2, column, data1, data2, sortInfo)` argument order. Registered
`sortFunctions[column.type]`, descriptor `fn`, and built-in number/date/string
comparators are also applied. Id-only columns receive complete rows as the
first two comparator values. Root `sortable`, root/column `renderSortTool`, and
the `true`, `false`, and `"always"` scroll-reset modes are implemented without
adding styling props.

## Architecture evaluation: one owner per transform

The two ownership changes were evaluated through the requested four-part
framework:

| Lens                           | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Consequence for this grid                                                                                                                        |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Senior developer documentation | [React controlled-component guidance](https://react.dev/learn/sharing-state-between-components) makes the parent the source of truth. [TanStack manual sorting](https://tanstack.com/table/v8/docs/guide/sorting#manual-server-side-sorting) expects already-sorted rows, and [manual pagination](https://tanstack.com/table/v8/docs/guide/pagination#manual-server-side-pagination) expects an already-paged result plus its total count.                                   | A controlled descriptor must not silently apply a second local transform. A remote page must not be sliced again.                                |
| Wiki and project ledger        | The installed Inovua 5.10.2 implementation classifies Promise/function sources as remote, skips local sorting for controlled `sortInfo`, and treats `default*` state as grid-owned. The repository's issues [#32](https://github.com/geo-vi/the-datagrid/issues/32), [#33](https://github.com/geo-vi/the-datagrid/issues/33), [#34](https://github.com/geo-vi/the-datagrid/issues/34), and [#35](https://github.com/geo-vi/the-datagrid/issues/35) track compatibility work. | Keep the upstream ownership boundary and prove completed acceptance paths with executable browser coverage.                                      |
| Books                          | Martin Fowler's [_Patterns of Enterprise Application Architecture_](https://martinfowler.com/books/eaa.html) separates data-source responsibilities from presentation concerns. Martin Kleppmann's [_Designing Data-Intensive Applications_](https://dataintensive.net/) treats derived views as outputs of an authoritative source. Applied here, both support avoiding two independent writers for the same derived ordering/page.                                         | Use one owner for each search/filter/sort/page transform. The result shape and controlled/default convention make that owner observable.         |
| Conventions                    | React's `value`/`defaultValue` convention distinguishes parent ownership from initialization. `{ data, count }` is the repository's count-bearing remote-result shape. [Semantic Versioning](https://semver.org/) requires incompatible behavior changes to be identified to consumers.                                                                                                                                                                                      | Preserve `defaultSortInfo` for grid-owned local sorting, require the parent to supply controlled ordering, and publish the migration note below. |

The alternatives were rejected:

- applying controlled sorting locally creates two possible owners and can
  reorder already-sorted consumer data;
- slicing `{ data, count }` locally by default can turn a valid remote page into
  an empty page;
- locally slicing an inferred remote Promise array would violate upstream
  ownership and can erase an already-paged result.

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
snapshot. Pagination mode now determines ownership:

- `pagination=true` or `"remote"` makes either Promise result shape an
  authoritative remote page;
- `pagination="local"` opts either shape into local slicing;
- without pagination, a bare Promise array retains local composition.

### Do not pass a narrow fixture by inventing a partial public contract

Issues #36 and #37 require full upstream-shaped behavior. This draft does not
add partial look-alikes that lack upstream geometry, payload, focus, or
lifecycle semantics. The API-expansion decision is now explicit; those issues
can add root props when their complete contracts are implemented and tested.

## Executable debt

Issue #32 has active type and browser coverage for its full source matrix,
loading transitions, replacement/rejection/reload behavior, controlled reset
order, custom rendering, stale resolution, request cancellation, and repeated
performance budgets. Issue #33 has type, unit, and browser coverage for state
shape and ownership, callback order, comparator resolution and exact argument
shapes, custom sort tools, root/column sortability, scroll modes, remote
forwarding, and five repeated 10,000-row virtualized local multi-sorts. The
remaining executable debt belongs to other parity issues and is not claimed by
this implementation.
