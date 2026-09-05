# Inovua tree-grid and master-detail: recovered contracts

Research date: 2026-09-05. Compatibility reference: Inovua 5.10.2 public
declarations, surviving public defaults, and archived official documentation.

<!-- Collaboration: inovua_research owns this source inventory; root owns the
implementation specification and tree integration; master_detail owns the detail
state/rendering subsystem. No vendor implementation is copied into this document. -->

This is an evidence inventory, not a claim that every listed prop is implemented.
See [the feature specification](../hierarchy-compatibility.md) for the prototype's
actual scope and acceptance criteria. Public signatures, observable defaults and
documented behavior are the compatibility inputs. The new implementation uses
this repository's React, TanStack and Tailwind architecture.

## Sources and recovery

| ID | Primary source | What was recovered |
| --- | --- | --- |
| S1 | [Official TreeGrid guide, 2024-04-19](https://web.archive.org/web/20240419044005/https://reactdatagrid.io/docs/tree-grid) | Tree data shape, IDs, async/leaf rules, expansion callbacks, filtering overview. |
| S2 | [Official row-details guide, 2024-04-19](https://web.archive.org/web/20240419060015/https://reactdatagrid.io/docs/row-details) | Expanded rows, render payload, sizing, single expansion, veto callbacks, width modes. |
| S3 | [Official master-detail guide, 2024-02-27](https://web.archive.org/web/20240227111522/https://reactdatagrid.io/docs/master-detail) | `renderDetailsGrid` entry point. |
| S4 | [Official API reference, 2024-04-19](https://web.archive.org/web/20240419063914/https://reactdatagrid.io/docs/api-reference) | Initial portion of API reference, including expansion-map and generated-ID semantics. The archived HTML is truncated at 1,048,576 bytes. |
| S5 | [Official API reference, 2021-02-24](https://web.archive.org/web/20210224181504/https://reactdatagrid.io/docs/api-reference) | Earlier API reference; also truncated, but its smaller preceding sections expose async-node documentation and metadata. |
| S6 | [Official API prop documentation bundle, 2022-09-07](https://web.archive.org/web/20220907034010/https://reactdatagrid.io/docs/_next/static/chunks/d9e30e2e.1a0ae8ffbb58978fa10c.js) | Complete recovered prop descriptions and examples, including material missing from the truncated HTML. Decodes to 946,033 bytes. |
| S7 | [Official TreeGrid examples bundle, 2022-09-07](https://web.archive.org/web/20220907034011/https://reactdatagrid.io/docs/_next/static/chunks/pages/tree-grid-a484096eb8304046026a.js) | Basic, async, sticky-node, veto and filtering examples. |
| S8 | [Official master-detail example bundle, 2022-09-07](https://web.archive.org/web/20220907034011/https://reactdatagrid.io/docs/_next/static/chunks/pages/master-detail-762905a6a12a8bae255e.js) | Parent account grid returning a child contacts grid through `renderDetailsGrid`; child filtering derives from parent data. |
| S9 | [Official API page/methods bundle, 2022-09-07](https://web.archive.org/web/20220907034010/https://reactdatagrid.io/docs/_next/static/chunks/pages/api-reference-c803dfa60bb82c6ec280.js) | Imperative methods, including row and tree expansion, and styling reference. |
| S10 | [Community 5.10.2 `TypeDataGridProps.d.ts`](https://unpkg.com/@inovua/reactdatagrid-community@5.10.2/types/TypeDataGridProps.d.ts) | Public prop and computed API declarations, including enterprise feature names. MIT-labelled file. |
| S11 | [Community 5.10.2 `types/index.d.ts`](https://unpkg.com/@inovua/reactdatagrid-community@5.10.2/types/index.d.ts) | `TypeExpandedNodes`, `TypeExpandedRows`, `TypeCollapsedRows`, `TypeNodeProps`, cache types. MIT-labelled file. |
| S12 | [Enterprise 5.10.2 type entry](https://unpkg.com/@inovua/reactdatagrid-enterprise@5.10.2/types/index.d.ts) | Re-exports the community types, explaining why enterprise signatures survive in the community package. |
| S13 | [Community 5.10.2 public defaults in `factory.js`](https://unpkg.com/@inovua/reactdatagrid-community@5.10.2/factory.js) | Default values independently cross-checked against S6; no implementation copied. |
| S14 | [Community 5.10.2 `treeFilter` public helper](https://unpkg.com/@inovua/reactdatagrid-community@5.10.2/treeFilter.js) | Existing MIT helper's ancestor-retention behavior, including a parent-match edge case. |
| S15 | [Published enterprise package description](https://www.npmjs.com/package/@inovua/reactdatagrid-enterprise?activeTab=readme) | Confirms TreeGrid, master-detail and row details were enterprise features and that 5.10.2 ships declarations. |

The live guide URLs returned HTTP 403 during this research. Wayback's CDX index
returned guide captures from 2021, 2022, 2023 and 2024. The 2024 page-specific
JavaScript assets were not recovered, but 2022 document bundles were. Archived
JavaScript responses can contain gzip bytes even through the `id_` replay path;
decode gzip before interpreting their text. No browser was needed for recovery.

Useful reproducible archive queries:

- [Tree guide CDX captures](https://web.archive.org/cdx/search/cdx?url=reactdatagrid.io/docs/tree-grid&output=json&filter=statuscode:200&collapse=timestamp:4)
- [Master-detail CDX captures](https://web.archive.org/cdx/search/cdx?url=reactdatagrid.io/docs/master-detail&output=json&filter=statuscode:200&collapse=timestamp:4)
- [API CDX captures](https://web.archive.org/cdx/search/cdx?url=reactdatagrid.io/docs/api-reference&output=json&filter=statuscode:200&collapse=timestamp:4)
- [Archived document asset index](https://web.archive.org/cdx/search/cdx?url=reactdatagrid.io/docs/_next/static/chunks/*&output=json&filter=statuscode:200&collapse=urlkey)

## Tree prop inventory

`BoolMap` below means `{ [key: string]: boolean }`; it is explanatory shorthand,
not a replacement for the canonical exported type names. An undefined default
means no explicit default value was found, rather than a promised boolean value.

| Prop | Public shape | Default / acceptance evidence |
| --- | --- | --- |
| `treeColumn` | `string` | Undefined. Naming the column enables tree mode and locates the node tools. S1, S6, S10. |
| `treeEnabled` | `boolean` | Optional override in S10; not individually documented in recovered S6. Exact interaction with an absent `treeColumn` needs an explicit local decision. |
| `nodesProperty` | `string` | `"nodes"`. Configures the child collection property. S1, S6, S13. |
| `treeNestingSize` | `number` | `22`. Indentation increment. S6, S13. |
| `nodePathSeparator` | `string` | `"/"`. Joins ancestor IDs into the generated node identity. S1, S6, S13. |
| `generateIdFromPath` | `boolean` | `true`. S4, S6, S13. |
| `expandedNodes` | `TypeExpandedNodes` | Undefined. Controlled map of expanded path IDs. S1, S4, S10–S11. |
| `defaultExpandedNodes` | `TypeExpandedNodes` | Undefined. Initial uncontrolled map. S1, S4, S10–S11. |
| `onExpandedNodesChange` | `(NodeChangeInfo) => void` | Final expansion notification. S1, S10. |
| `onNodeExpand` | `(NodeEventInfo) => boolean \| undefined` | Runs before opening; `false` vetoes. S1, S10. |
| `onNodeCollapse` | `(NodeEventInfo) => boolean \| undefined` | Runs before closing; `false` vetoes. S1, S10. |
| `onNodeExpandChange` | `(NodeChangeInfo) => boolean \| undefined` | Runs after the direction-specific callback, before final notification; `false` vetoes. S1, S10. |
| `isNodeExpandable` | `({ id, data, rowIndex, nodeProps, node }) => boolean` | Declared in S10; predicate/map precedence is not established by recovered guide prose. |
| `unexpandableNodes` | `BoolMap` | Declared in S10. |
| `isNodeLeaf` | `({ node, nodeProps }) => boolean` | Overrides the default leaf classification. S1, S6, S10. |
| `isNodeAsync` | `({ node, nodeProps }) => boolean` | Overrides the default async classification. S1, S6, S10. |
| `loadNode` | `({ node, nodeProps }) => object[] \| Promise<object[]>` | Called on every async expansion. S1 also permits undefined results, unlike S10's narrower type. |
| `loadNodeOnce` | Same loader signature | Caches the first loaded children for later expansion. S1, S5–S6, S10. |
| `nodeCache` / `defaultNodeCache` | `TypeNodeCache` | Controlled/default cache objects in S10–S11. Not fully explained by recovered guides. |
| `onNodeCache` | `(nodeCache, info?: { nodeId, node }) => void` | This is the exact declared callback name, not `onNodeCacheChange`. S10. |
| `clearNodeCacheOnDataSourceChange` | `boolean` | `true`. Clears cached data when the source changes; S6 discusses cached item updates. S10, S13. |
| `collapseChildrenOnAsyncNodeCollapse` | `boolean` | `true`. With `loadNode`, closing an async parent also closes descendants. Does not apply to `loadNodeOnce`. S1, S5–S6, S13. |
| `collapseChildrenRecursive` | `boolean` | `true` in S13; full independent runtime semantics not recovered from S6. |
| `renderNodeTool` | `(domProps, cellProps) => ReactNode \| undefined` | S1/S6 documented, absent S10. Returning undefined preserves the default tool and permits modification of supplied `domProps`. |
| `renderTreeExpandTool` | `({ domProps, size? }) => renderable` | S6 documented; S10 declares a `void` result. Treat the return declaration as a typing inconsistency, not a requirement to discard content. |
| `renderTreeCollapseTool` | Same tool shape | Same S6/S10 discrepancy. |
| `renderTreeLoadingTool` | `({ domProps, size, className }) => renderable` | S6 documented, absent S10. |
| `expandOnMouseDown` | `boolean` | `false`. Changes pointer activation timing. S6, S13; absent S10. |
| `stickyTreeNodes` | `boolean` | `false`. Sticky ancestors while scrolling. S1, S6. |
| `isExpandKeyPressed` | `(info) => boolean` | Default `Alt+ArrowRight`. S6, S13. More payload fields are documented than S10's `{ event }` type. |
| `isCollapseKeyPressed` | `(info) => boolean` | Default `Alt+ArrowLeft`. S6, S13. |
| `selectNodesRecursive` | `boolean` | `true` in S13; declared S10. S1's recursive-selection limitation is stale relative to later API entries below. |
| `treeGridChildrenSelectionEnabled` | `boolean` | S6: selecting a parent selects children when enabled. S10 declares the prop. No explicit default found. |
| `treeGridChildrenDeselectionEnabled` | `boolean` | S6: deselecting a parent deselects children when enabled. S10 declares the prop. No explicit default found. |
| `enableTreeRowReorder` | `boolean` | `false`. S6 requires both this and `rowReorderColumn`; generated path IDs are required. |
| `enableTreeRowReorderNestingChange` | `boolean` | `true` in S6. Horizontal dragging changes indentation. |
| `enableTreeRowReorderParentChange` | `boolean` | `true` in S6. Allows dropping under another parent. |
| `onTreeRowReorderEnd` | `({ updatedTreeData: any[] }) => void` | S10. Separate concern from ordinary expansion. |

### Tree payloads and identity

The S10–S11 declaration shapes are:

```ts
type TypeExpandedNodes = { [key: string]: boolean };
type TypeNodeCache = { [key: string]: any };

type TypeNodeProps = {
  expanded: boolean;
  loading: boolean;
  depth: number;
  path: string;
  leafNode: boolean;
  asyncNode: boolean;
  childIndex: number;
  parentNodeId: string | number;
  groupSummary?: any;
  groupColumnSummary?: { [columnName: string]: any } | null;
};

// Explanatory aliases for the callback payloads, not historical export names.
type NodeEventInfo = {
  nodeProps: TypeNodeProps;
  node: any;
  data: any;
  index: number;
  id: string | number;
};
type NodeChangeInfo = NodeEventInfo & {
  expandedNodes: TypeExpandedNodes | undefined;
  nodeExpanded: boolean;
};
```

Top-level nodes have depth zero. `childIndex` is relative to siblings, while
`index`/`rowIndex` belongs to the rendered data sequence. The documentation does
not establish a root `parentNodeId` sentinel. `node` refers to the source node;
preserving an original source object separately from any derived row is a useful
implementation boundary. S1/S4 establish generated ID behavior, but do not require
mutating caller-owned input objects.

Sibling IDs may repeat under different parents when path generation is enabled.
For example, children `1` under parents `a` and `b` are `a/1` and `b/1`. With
`generateIdFromPath=false`, all source IDs must already be globally unique. An
expanded descendant entry does not imply that its ancestors are expanded.

`renderNodeTool` receives normal cell information plus `leafNode`,
`nodeCollapsed`, `nodeLoading`, `nodeProps`, and `toggleNodeExpand()`. The loader
documentation also references `loadNodeAsync` on `columns.render` information.
The exact callback shape of that latter helper is not established here.

Keyboard predicate `info` in S6 includes `event`, `data`, `index`, `activeItem`,
`activeIndex`, `grid`, `isGroup`, `selectionEnabled`, `treeEnabled`,
`rowExpandEnabled`, `nodeExpanded`, `nodeExpandable`, `rowExpandable`, and
`rowExpanded`. `data` aliases `activeItem`; `index` aliases `activeIndex`.

### Tree acceptance semantics established by sources

1. A node with the configured child property absent/undefined is a leaf. An
   array, including an empty array, denotes a synchronous non-leaf parent. Null
   denotes an async node. `isNodeLeaf` and `isNodeAsync` can override this. S1/S6.
2. Expansion maps use node identity, not array position. Default maps initialize
   uncontrolled state; controlled maps must be updated by the consumer in
   `onExpandedNodesChange`. S1/S4/S6.
3. Expand callback order is `onNodeExpand`, `onNodeExpandChange`, then
   `onExpandedNodesChange`; collapse substitutes `onNodeCollapse`. Either of the
   first two may cancel with false. S1.
4. Async loading displays a loading node tool. `loadNode` refreshes on each
   expansion; `loadNodeOnce` reuses loaded children. Metadata reaches loaders and
   custom tools. S1/S5–S7.
5. Sorting, filtering, pagination and live pagination are described as compatible
   with trees. Grouping is explicitly incompatible. The guides do not precisely
   define root-vs-visible-row pagination counts or every sorting/filtering edge
   case. Those need explicit local acceptance rules. S1/S6.
6. S14 retains ancestors of matching descendants. If descendants match, it prunes
   nonmatching sibling descendants. If only the parent matches and no descendant
   matches, the helper retains the parent's original children array. This edge
   case must be recorded if the new filter chooses different subtree semantics.
7. The recovered filtering example initializes an expansion map explicitly. It
   does not demonstrate automatic opening of collapsed branches after filtering.
   Automatic filter reveal and restoring the previous expansion state are user
   requirements for this implementation, not a proven historical default. S7.

## Row-details and master-detail prop inventory

Master-detail is built upon row expansion. `renderRowDetails` renders arbitrary
React content; `renderDetailsGrid` specifically renders a nested grid. Their
state and sizing props are shared. S2/S3/S6/S8.

| Prop | Public shape | Default / acceptance evidence |
| --- | --- | --- |
| `enableRowExpand` | `boolean` | Undefined. S5/S6 infer enablement from `expandedRows`, `defaultExpandedRows` or `renderRowDetails`; S8 also demonstrates inference from `renderDetailsGrid`. Explicit false disables it. |
| `renderRowDetails` | `(TypeRowDetailsInfo) => ReactNode` | Undefined. Arbitrary expanded content. S2, S6, S10. |
| `renderDetailsGrid` | `(TypeRowDetailsInfo, detailsProps: any) => ReactNode` | S10 includes the second argument; S6 documents only the first. No verified contract for all `detailsProps` fields. |
| `expandedRows` | `TypeExpandedRows` | Undefined. Controlled boolean map or `true` sentinel for all rows. S2, S6, S10–S11. |
| `defaultExpandedRows` | `TypeExpandedRows` | Undefined. Initial uncontrolled map or `true`. S2, S6. |
| `collapsedRows` | `TypeCollapsedRows` | Undefined. Controlled exceptions when all rows are expanded. S2, S5–S6. |
| `defaultCollapsedRows` | `TypeCollapsedRows` | Undefined. Initial uncontrolled exceptions to `defaultExpandedRows=true`. S5–S6. |
| `onRowExpand` | `(RowEventInfo) => boolean` | Returning false vetoes opening. S2, S10. |
| `onRowCollapse` | `(RowEventInfo) => boolean` | Returning false vetoes closing. S2, S10. |
| `onRowExpandChange` | `(RowChangeInfo) => boolean` | Applies to a single row in either direction; false vetoes. S2, S10. |
| `onExpandedRowsChange` | `(RowsChangeInfo) => boolean` | Final notification for single-row changes and bulk expand/collapse. S2/S10; declaration return type does not itself establish a fourth veto point. |
| `multiRowExpand` | `boolean` | `true`. False makes opening one row close the previous expanded row. S2, S6, S13. |
| `isRowExpandable` | `({ id, data, rowIndex }) => boolean` | Optional predicate; not called when `unexpandableRows` is supplied. S5–S6. |
| `unexpandableRows` | `BoolMap` | Optional map. Its presence takes precedence over `isRowExpandable`, not just a true entry. S5–S6. |
| `rowExpandColumn` | `IColumn \| boolean` | Automatically displayed when expansion is enabled. False hides it; object accepts normal column configuration. S2/S6/S10. |
| `rowExpandHeight` | `number \| ({ data }) => number` | `80`. Total expanded row height. Detail content gets `rowExpandHeight - rowHeight`. S2/S6/S13. |
| `rowDetailsWidth` | `EnumRowDetailsWidth` | `"max-viewport-width"`. Exact width modes below. S2/S6/S10/S13. |
| `renderRowDetailsExpandIcon` | `() => renderable` | S6's example returns a minus icon: expanded state, collapse action. S10 incorrectly/narrowly declares `() => void`. |
| `renderRowDetailsCollapsedIcon` | `() => renderable` | S6's example returns a plus icon: collapsed state, expand action. Exact spelling includes `Collapsed`; same S6/S10 return-type discrepancy. |
| `renderRowDetailsMoreIcon` | `() => renderable` | S6 documented, absent S10. Custom detail-column header more icon. |
| `shouldRenderCollapsedRowDetails` | `boolean` | S6 documented, absent S10. True leaves collapsed detail content mounted with `display: none`. No explicit default established. |
| `rowDetailsStyle` | style object | Documented in S9 and referenced by S6; absent S10. Customize the details wrapper, subject to this library's existing styling contract. |
| `growExpandHeightWithDetails` | `boolean` | `true` in S13; S10 declaration exists. Full nested-resize behavior not established by the recovered guides. |
| `detailsGridCacheKey` | `any` | `true` in S13; S10 declaration exists. Exact key derivation and state restoration semantics need separate evidence. |
| `onDetailsDidMount` | `(MutableRefObject<TypeComputedProps \| null>) => void` | S10 lifecycle declaration. Full callback ownership/registration behavior not described in S6. |
| `onDetailsWillUnmount` | Same ref callback shape | S10 lifecycle declaration. |

`__parentRowInfo` also occurs in S10. It is an internal-looking linkage field;
its presence in the vendor declaration is not evidence that consumer code should
be required to supply it. Likewise `TypeDetailsGridInfo` exposes vendor-specific
cache/instance fields, which should not dictate the new implementation design.

### Detail payloads and sizing

S10–S11 specify:

```ts
type TypeCollapsedRows = { [key: string]: boolean };
type TypeExpandedRows = TypeCollapsedRows | true;

type TypeRowDetailsInfo = {
  id: string | number;
  data: object;
  rowSelected: boolean;
  rowActive: boolean;
  rowExpanded: boolean;
  rowId: any;
  dataSource: object[];
  rowIndex: number;
  toggleRowExpand: () => void;
};

// Explanatory aliases, not historical exported names.
type RowEventInfo = {
  data: object;
  id: string | number | null;
  index: number;
};
type RowChangeInfo = RowEventInfo & {
  rowExpanded: boolean;
  expandedRows: { [key: string]: boolean } | true | undefined;
  collapsedRows: { [key: string]: boolean } | true | undefined;
};
type RowsChangeInfo = Omit<RowChangeInfo, 'data' | 'index'> & {
  data: object | null;
  index: number | undefined;
};
```

There is an upstream declaration inconsistency: callback `collapsedRows` permits
`true`, while `TypeCollapsedRows` permits only a map. Do not silently turn that
into a new all-collapsed public sentinel without a behavior decision. Bulk
callbacks can lack a single row (`data: null`, `id: null`, `index: undefined`).

For total visible column width `C` and viewport width `V`, S2/S6 specify:

| `rowDetailsWidth` | Detail width |
| --- | --- |
| `"max-viewport-width"` | `min(C, V)` |
| `"min-viewport-width"` | `max(C, V)`; wider details scroll with the column area. |
| `"viewport-width"` | `V`, regardless of column width. |

A row with `rowHeight=40` and `rowExpandHeight=200` has 160 pixels available for
details and 200 pixels total expanded height. Treating 200 as extra detail height
would violate the documented contract. Heights may differ by source row.

### Detail acceptance semantics established by sources

1. Default and controlled state behave like the equivalent tree maps. Consumer
   state is updated from callback payloads, never mutated behind the consumer's
   back. `true` enables an all-expanded baseline with collapsed-row exceptions.
2. A direction-specific row callback and the single-row change callback can
   cancel the action. `onExpandedRowsChange` is also used for bulk operations.
3. The detail render payload identifies the master row and exposes a zero-argument
   collapse toggle. Nested grids can derive their own filters/source from it.
   Details are presentation content, not extra source records.
4. Hiding `rowExpandColumn` leaves programmatic or custom-cell expansion useful.
   Normal column rendering receives row-expansion information. S2/S6.
5. Keeping collapsed content mounted is separately configurable. Do not equate
   ordinary React unmount/remount with the vendor's undocumented cache behavior.
6. S6 states that one master-detail level is fully supported; deeper nesting was
   possible but not fully supported at the time of that archive. The prototype
   should not promise unlimited historical parity based on this source.

## Related imperative surface

S9/S10 identify these methods; adding methods should follow the repository's
existing imperative API allowlist rather than leaking internal TanStack objects.

- Tree: `toggleNodeExpand(dataOrIndex)`, `isNodeExpanded(dataOrIndex)`,
  `setNodeExpandedAt(index, expanded)`, `setNodeExpandedById(id, expanded)`,
  `isNodeExpandableAt(index)`, `expandAllTreeNodes()`, `collapseAllTreeNodes()`.
  The last two are documented in S9, although not found in S10's explicit types.
- Details: `isRowExpandEnabled()`, `isRowExpandableAt(index)`,
  `isRowExpandableById(id)`, `isRowExpanded(dataOrIndex)`,
  `isRowExpandedById(id)`, `toggleRowExpand(dataOrIndex)`,
  `toggleRowExpandById(id)`, `setRowExpandedAt(index, expanded)`,
  `setRowExpandedById(id, expanded)`, `expandAllRows()`, `collapseAllRows()`,
  `setExpandedRows(mapOrTrue)`, `setCollapsedRows(map)`, `getExpandedMap()`,
  `getCollapsedMap()`.
- Related node cache methods in S10: `getNodeCache`, `setNodeCache`,
  `appendCacheForNode`, `clearNodeChildrenCache`. Their presence is an inventory
  item; precise mutation/lifecycle acceptance is not established by the guides.

## Evidence gaps and explicit implementation decisions

- **Documentation is not fully synchronized.** The feature guide's statement
  that recursive tree selection is unsupported conflicts with later API
  descriptions. 5.10.2 declarations include props absent from archived prose,
  while prose includes render props absent from declarations.
- **Automatic filter expansion is new acceptance.** Preserve the user's prior
  expansion state and distinguish temporary reveal from consumer-controlled
  state. Do not describe this as verified old default behavior.
- **Parent-only filter matches have an upstream edge case.** S14 retains their
  original subtree when no child matches. A more consistent prune policy is a
  documented compatibility difference, not proven identical behavior.
- **Tree record counts and pagination units need a local contract.** The old
  guide promises compatibility but does not pin down how retained ancestors,
  collapsed children, remote counts and page slicing combine.
- **Async races and failures need tests.** The sources do not specify stale
  response cancellation, loading failures, retry policy or data-source changes
  during an in-flight node request. These should be made deterministic locally.
- **Cache and deep nested resize behavior are not recovered.** Defaults alone
  cannot prove `detailsGridCacheKey`, `growExpandHeightWithDetails`, lifecycle
  registration or arbitrary nested-state restoration parity.
- **Tree selection, sticky ancestors and drag reparenting are separate work.**
  They are genuine old surface area and must stay visible in the scope inventory,
  even when excluded from the first implementation.
- **A published-package runtime comparison was not completed.** Attempting to
  execute the existing local `treeFilter` helper failed because its installed
  dependency graph lacks `@babel/runtime`. No dependencies were changed for this
  research. S14's edge case is a source observation, not a recorded runtime test.

The compatibility work can preserve the original prop vocabulary and callback
payloads while implementing only an explicitly named subset first. Any omitted
prop must remain listed as deferred or unsupported in the draft PR and public
coverage documentation; accepting a prop in TypeScript is not implementation.
