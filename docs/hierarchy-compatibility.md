# Tree-grid and master-detail compatibility

Status: implementation specification for the draft PR, 2026-09-05. This is an
explicit API extension requested by the maintainer. Existing grid props and
their defaults remain compatible. No Inovua runtime is introduced.

## Evidence and compatibility target

Target the public hierarchy contracts of `@inovua/reactdatagrid-community`
5.10.2 (which includes enterprise declarations) and the surviving
`reactdatagrid.io` documentation. The [research inventory](research/inovua-hierarchy-sources.md)
records URLs, archive snapshots, defaults, callback signatures and evidence
gaps. API declarations establish names and argument shapes, but do not alone
prove runtime behavior. Do not describe unsupported legacy props as working.

## Tree-grid behavior

Tree behavior activates only when `treeEnabled={true}`. Use the original
`nodesProperty`, `treeColumn`,
`treeNestingSize`, `expandedNodes`, `defaultExpandedNodes`,
`onExpandedNodesChange` and node lifecycle callback vocabulary. Data stays a
nested array; child arrays live under `nodesProperty` (default `nodes`). Node
identity uses `idProperty`; path generation is available through the legacy
`generateIdFromPath` option. The original input objects must not be mutated.

Branches start collapsed. Only descendants of expanded ancestors render.
An explicit controlled expansion map remains authoritative: user actions emit
the next map without mutating the supplied map or pretending it was accepted.
Node metadata is available to custom cells and lifecycle callbacks. Leaf and
non-expandable nodes do not present a working toggle. Expansion controls are
keyboard operable and expose their state through ARIA.

Local filtering evaluates all loaded descendants, retains ancestor context,
and temporarily reveals paths to matches. Clearing filters restores the user's
previous expansion map. This automatic reveal is an explicitly requested
extension; it must not fire expansion callbacks or overwrite controlled state.
When only a parent matches, preserve its original subtree as in the legacy
filter helper, without treating those descendants as matches for automatic
reveal. Controlled `filterValue` and `sortInfo` keep this library's existing
Inovua behavior: the consumer owns processing, even for an array source.
Sorting applies independently to each sibling list. Pagination counts/slices
root records so a subtree stays with its root; `filteredRowsCount` reports
retained records (including context ancestors) before root pagination and
independent of manual collapse. Remote functions retain ownership of filtering
and sorting and receive all existing request arguments unchanged.

## Master-detail behavior

Detail behavior activates only when `enableRowExpand={true}`. Use
`renderRowDetails`, `expandedRows`,
`defaultExpandedRows`, `collapsedRows`, `defaultCollapsedRows`,
`multiRowExpand`, `isRowExpandable`, `unexpandableRows`, `rowExpandColumn`,
`rowExpandHeight`, and the original row expansion callbacks. A detail panel is
arbitrary React content and can contain a nested instance of this grid.

Expansion uses stable row IDs. The `true` expansion sentinel supports
collapse exceptions; controlled maps remain authoritative. Single expansion
mode closes the previous panel. Callback arguments preserve the original
object payload, rather than substituting a TanStack updater or bare ID array.
Details must not become selectable records, inflate record counts or appear
as synthetic rows in exports. Toggle clicks must not accidentally select or
edit the master row. Collapse returns focus predictably to its control.

`rowExpandHeight` is the total expanded height, default 80. The initial
implementation supports numeric and per-record total heights; natural master
heights are observed to subtract the actual master from that total. The virtual
item includes the master row plus its remaining detail height, so
subsequent records do not overlap the panel. Nonvirtual rendering uses the
same expansion state and content. Unsupported sizing/cache/grid registration
options must be listed explicitly in the coverage section before PR review.

## Internal implementation

Keep legacy types and expansion state in dedicated hierarchy modules. Process
nested local data before converting it into the existing flat TanStack row
model; retain metadata outside consumer objects. Keep the table's sorting,
selection, filter and ordering adapters intact. TanStack Virtual remains the
single desktop row virtualizer. Render panels beside their master row using
semantic table cells spanning the visible layout. Use existing Tailwind/shadcn
tokens, focus rings and button conventions.

## Acceptance checks

1. A three-level tree is initially collapsed and can expand/collapse without
   losing stable IDs, column order or selection.
2. A deep child filter keeps its ancestors, auto-reveals the match and restores
   prior expansion when cleared; counts are independent of collapse.
3. Sibling sorting and root pagination retain parent-child relationships.
4. Controlled maps emit the legacy payload and do not change until accepted;
   veto callbacks and non-expandable records are respected.
5. Detail panels support default/controlled expansion, `true` with exceptions,
   single/multiple expansion, nested grids and row-specific heights.
6. Virtual and nonvirtual modes show the same logical records, with no overlap
   after detail expansion, filtering, sorting or scrolling.
7. Header/filter/menu behavior, local/remote request contracts, toolbar export
   and existing exact-props examples continue to work.
8. Desktop and mobile views remain usable with keyboard and pointer input;
   screenshots document collapsed, filtered-tree and expanded-detail states.
9. The API audit, type checks, focused behavioral tests, build and relevant
   existing regression checks pass. Any baseline failure is documented.

## Coverage at review time

| Area            | Implemented in this prototype                                                                                                                                                                                | Deferred legacy behavior                                                                                                                                                                                |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tree input      | Explicit `treeEnabled`, `treeColumn`, `nodesProperty`, `nodePathSeparator`, `generateIdFromPath`, `treeNestingSize`                                                                                          | `loadNode`, `loadNodeOnce`, async caches and invalidation; `nodes: null` is identified as async but has no toggle in this prototype                                                                     |
| Tree state      | `expandedNodes`, `defaultExpandedNodes`, `collapseChildrenRecursive`, `unexpandableNodes`, `isNodeExpandable`, `isNodeLeaf`, `onNodeExpand`, `onNodeCollapse`, `onNodeExpandChange`, `onExpandedNodesChange` | Bulk/imperative tree methods; recursive selection/deselection; sticky nodes; tree drag/reparenting                                                                                                      |
| Tree rendering  | Node metadata on desktop cell/row callbacks, `renderTreeExpandTool`, `renderTreeCollapseTool`, accessible controls, mobile cards                                                                             | `renderNodeTool`, loading tools and `expandOnMouseDown`; arrow-key navigation between tree rows (toggle itself handles arrows)                                                                          |
| Data processing | Sibling sorting, legacy ancestor/subtree filtering, temporary reveal, root pagination, arrays/static promises/function sources                                                                               | Server ancestor discovery; consumer-controlled filtering must supply matching nested data                                                                                                               |
| Detail state    | `enableRowExpand`, expanded/default/collapsed maps, `true` sentinel, `multiRowExpand`, `isRowExpandable`, `unexpandableRows`, original row lifecycle callbacks and vetoes                                    | Bulk/imperative detail methods                                                                                                                                                                          |
| Detail content  | `renderRowDetails`, `renderDetailsGrid`, `TypeRowDetailsInfo`, configurable `rowExpandColumn`, custom icons, nested grids                                                                                    | `detailsGridCacheKey`, grid registration and lifecycle callbacks; second renderer argument is currently an empty props object                                                                           |
| Detail sizing   | Numeric/function `rowExpandHeight`, total desktop height, natural master measurement, composite virtual item                                                                                                 | `rowDetailsWidth` modes, `growExpandHeightWithDetails`, and automatic nested-grid growth                                                                                                                |
| Mobile          | Tree controls and detail panels in existing responsive cards; shared expansion state                                                                                                                         | Mobile cards keep natural master height and use `rowExpandHeight - 52` for the panel budget. Built-in flat mobile quick search is hidden for trees; use the grid filter API or optional search package. |

Deferred props are deliberately absent from the public type surface. No vendor
enterprise code is included. `renderDetailsGrid` currently shares the ordinary
detail mount/unmount lifecycle; scrolling/collapse unmounts panels, so consumers
must lift state that should survive unmounting. Record IDs must be stable and
paths unambiguous; duplicate paths and cycles fail explicitly. Parents and
their descendants should be distinct objects, as metadata is keyed by record
identity. Detail regions use the current column-table width until legacy width
modes are implemented. Table header rendering remains a separate existing
sticky layer; the tree body has `treegrid` semantics and rows expose depth and
expansion, but full cross-row tree keyboard navigation remains follow-up work.

## Review evidence

See `tests/engine/tree-data.test.ts`, `tests/engine/tree-row-adapter.test.ts`,
`tests/engine/master-detail.test.ts`, `tests/engine/detail-row-spans.test.ts`,
`tests/types/type-hierarchy.ts`, `tests/playwright/hierarchy.spec.ts`,
`tests/playwright/hierarchy-regression.spec.ts`, and
`tests/playwright/hierarchy-fixes.spec.ts`. Screenshots in
`docs/screenshots/` show the actual local implementation, not mockups.
The [validation report](hierarchy-validation.md) records passing checks and
independently reproduced baseline failures.

Ownership: the root task owns the tree engine and integration, public exports,
manifest, specification and final combined verification. Research owns the
archived source inventory; the master-detail agent owns its isolated state/types
and advanced regression tests; the demo agent owns the example, feature browser
tests and screenshots. All work shares one checkout, branch and draft PR.
