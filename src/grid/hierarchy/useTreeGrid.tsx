import * as React from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type {
  TypeTreeGridProps,
  TypeExpandedNodes,
  TypeNodeProps,
  TypeNodeEvent,
} from "./treeTypes";
import { indexTree, type TreeEntry, type TreeRecord } from "./treeData";

export function useTreeGrid({
  props,
  sourceRows,
  idProperty,
  revealMatches,
  revealNodes,
}: {
  props: TypeTreeGridProps;
  sourceRows: TreeRecord[];
  idProperty: string;
  revealMatches: boolean;
  revealNodes: ReadonlySet<TreeRecord>;
}) {
  const enabled = props.treeEnabled === true;
  const nodesProperty = props.nodesProperty ?? "nodes";
  const nodePathSeparator = props.nodePathSeparator ?? "/";
  const generateIdFromPath = props.generateIdFromPath ?? true;
  const [internalExpanded, setInternalExpanded] =
    React.useState<TypeExpandedNodes>(() => ({
      ...props.defaultExpandedNodes,
    }));
  const expanded = props.expandedNodes ?? internalExpanded;
  const tree = React.useMemo(
    () =>
      enabled
        ? indexTree(sourceRows, {
            idProperty,
            nodesProperty,
            nodePathSeparator,
            generateIdFromPath,
          })
        : { roots: [], entries: new Map<string, TreeEntry>() },
    [
      enabled,
      sourceRows,
      idProperty,
      nodesProperty,
      nodePathSeparator,
      generateIdFromPath,
    ]
  );

  const getNodeProps = (entry: TreeEntry): TypeNodeProps => {
    const metadata: TypeNodeProps = {
      expanded:
        Boolean(
          Object.prototype.hasOwnProperty.call(expanded, entry.id) &&
          expanded[entry.id]
        ) ||
        (revealMatches && revealNodes.has(entry.data)),
      loading: false,
      depth: entry.depth,
      path: entry.path,
      leafNode: entry.leaf,
      asyncNode: entry.data[nodesProperty] === null,
      childIndex: entry.childIndex,
      parentNodeId:
        !generateIdFromPath && entry.parentNodeId
          ? (tree.entries.get(entry.parentNodeId)?.data[idProperty] ??
            entry.parentNodeId)
          : entry.parentNodeId,
    };
    return {
      ...metadata,
      leafNode:
        props.isNodeLeaf?.({ node: entry.data, nodeProps: metadata }) ??
        metadata.leafNode,
    };
  };
  const getEvent = (entry: TreeEntry, index: number): TypeNodeEvent => ({
    id: generateIdFromPath ? entry.id : (entry.data[idProperty] ?? entry.id),
    data: entry.data,
    node: entry.data,
    index,
    nodeProps: getNodeProps(entry),
  });
  const canExpand = (entry: TreeEntry, index: number) => {
    const event = getEvent(entry, index);
    const leaf = event.nodeProps.leafNode;
    // Lazy loading is not claimed in this initial compatibility implementation.
    return (
      !leaf &&
      entry.data[nodesProperty] !== null &&
      !(
        props.unexpandableNodes &&
        Object.prototype.hasOwnProperty.call(
          props.unexpandableNodes,
          entry.id
        ) &&
        props.unexpandableNodes[entry.id]
      ) &&
      (props.isNodeExpandable?.({ ...event, rowIndex: index }) ?? true)
    );
  };
  const visibleEntries: TreeEntry[] = [];
  const visit = (entries: TreeEntry[]) => {
    for (const entry of entries) {
      const index = visibleEntries.length;
      visibleEntries.push(entry);
      if (getNodeProps(entry).expanded && canExpand(entry, index))
        visit(entry.children);
    }
  };
  if (enabled) visit(tree.roots);
  // Preserve row identities across unrelated state changes, particularly the
  // loader's callbacks: a new flat array on every render would retrigger loads.
  const visibleKey = JSON.stringify(visibleEntries.map((entry) => entry.id));
  const rows = React.useMemo(
    () => (enabled ? visibleEntries.map((entry) => entry.data) : sourceRows),
    // `tree` changes whenever the underlying records change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [enabled, sourceRows, tree, visibleKey]
  );
  const byData = React.useMemo(() => {
    const result = new WeakMap<TreeRecord, TreeEntry>();
    for (const entry of tree.entries.values()) result.set(entry.data, entry);
    return result;
  }, [tree]);
  const getId = React.useCallback(
    (data: TreeRecord, index: number) =>
      byData.get(data)?.id ?? String(data?.[idProperty] ?? index),
    [byData, idProperty]
  );
  const getMetadata = (data: TreeRecord): TypeNodeProps | undefined => {
    const entry = byData.get(data);
    return entry ? getNodeProps(entry) : undefined;
  };
  const toggle = (data: TreeRecord, index: number, requested?: boolean) => {
    const entry = byData.get(data);
    if (!entry || !canExpand(entry, index)) return;
    const event = getEvent(entry, index);
    const nodeExpanded = requested ?? !event.nodeProps.expanded;
    if (nodeExpanded === event.nodeProps.expanded) return;
    // Matched paths are temporarily revealed without changing persisted state.
    if (revealMatches && revealNodes.has(entry.data) && !nodeExpanded) return;
    if (
      (nodeExpanded ? props.onNodeExpand : props.onNodeCollapse)?.(event) ===
      false
    )
      return;
    const next = { ...expanded, [entry.id]: nodeExpanded };
    if (!nodeExpanded && (props.collapseChildrenRecursive ?? true)) {
      const collapse = (children: TreeEntry[]) =>
        children.forEach((child) => {
          delete next[child.id];
          collapse(child.children);
        });
      collapse(entry.children);
    }
    const change = { ...event, nodeExpanded, expandedNodes: next };
    if (props.onNodeExpandChange?.(change) === false) return;
    if (props.expandedNodes === undefined) setInternalExpanded(next);
    props.onExpandedNodesChange?.(change);
  };
  const renderToggle = (data: TreeRecord, index: number) => {
    const entry = byData.get(data);
    if (!entry) return null;
    const nodeProps = getNodeProps(entry);
    const expandable = canExpand(entry, index);
    const forced = revealMatches && revealNodes.has(entry.data);
    const customTool = nodeProps.expanded
      ? props.renderTreeCollapseTool
      : props.renderTreeExpandTool;
    return (
      <span
        className="inline-flex shrink-0 items-center"
        style={{
          paddingInlineStart:
            entry.depth * Math.max(0, props.treeNestingSize ?? 22),
        }}
      >
        {expandable ? (
          <button
            type="button"
            data-slot="tree-toggle"
            aria-label={`${nodeProps.expanded ? "Collapse" : "Expand"} node ${entry.id}`}
            aria-expanded={nodeProps.expanded}
            aria-disabled={forced || undefined}
            title={
              forced
                ? "Matching descendants are shown while filtering"
                : undefined
            }
            className="inline-flex size-7 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onPointerDown={(event) => event.stopPropagation()}
            onDoubleClick={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              toggle(data, index);
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
                event.preventDefault();
                event.stopPropagation();
                toggle(data, index, event.key === "ArrowRight");
              }
            }}
          >
            {customTool ? (
              customTool({ domProps: { "aria-hidden": true }, size: 16 })
            ) : nodeProps.expanded ? (
              <ChevronDown className="size-4" aria-hidden="true" />
            ) : (
              <ChevronRight className="size-4" aria-hidden="true" />
            )}
          </button>
        ) : (
          <span className="inline-block size-7" aria-hidden="true" />
        )}
      </span>
    );
  };
  return {
    enabled,
    rows,
    getId,
    getMetadata,
    renderToggle,
    toggle,
    expandedNodes: expanded,
  };
}

export type TreeGridController = ReturnType<typeof useTreeGrid>;
