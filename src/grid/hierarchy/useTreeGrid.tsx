import * as React from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type {
  TypeTreeGridProps,
  TypeExpandedNodes,
  TypeNodeProps,
  TypeNodeEvent,
} from "./treeTypes";
import { indexTree, type TreeEntry, type TreeRecord } from "./treeData";
import { cn } from "../../lib/utils";

/** Lets the mobile layout size the toggle without forking it. */
export type TreeToggleOptions = {
  nestingSize?: number | string;
  buttonClassName?: string;
};

export const TREE_ROOT_BRANCH_KEY = " root";

/*
 * Fixed so the desktop virtualizer can add it to the owning row's estimate
 * without measuring: a table cannot nest the control inside the row it
 * follows, so it rides as a sibling the way a detail panel does. One data
 * row tall, its rule included.
 */
export const TREE_BRANCH_MORE_ROW_HEIGHT = 41;

/** A branch that has more children than it is currently showing. */
export type TreeBranchTruncation = {
  branchKey: string;
  /** Id of the last child on screen, which the control follows. */
  afterRowId: string;
  depth: number;
  hidden: number;
};

export function useTreeGrid({
  props,
  sourceRows,
  idProperty,
  revealMatches,
  revealNodes,
  revealKey,
  branchPageSize,
}: {
  props: TypeTreeGridProps;
  sourceRows: TreeRecord[];
  idProperty: string;
  revealMatches: boolean;
  revealNodes: ReadonlySet<TreeRecord>;
  /** Discards the folds below when it changes. Must not change on a sort. */
  revealKey?: string;
  /** `Infinity` shows every child, which is the table's own default. */
  branchPageSize: number;
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
  const [revealedByBranch, setRevealedByBranch] = React.useState<
    Record<string, number>
  >({});
  // Kept out of the expansion map so a fold never reaches a consumer's
  // controlled state, and discarded when `revealKey` changes.
  const [suppressedReveals, setSuppressedReveals] = React.useState<
    ReadonlySet<string>
  >(() => new Set());
  React.useEffect(() => {
    setSuppressedReveals((current) => (current.size ? new Set() : current));
  }, [revealKey]);
  const revealBranch = React.useCallback(
    (branchKey: string, step: number) =>
      setRevealedByBranch((current) => ({
        ...current,
        [branchKey]: (current[branchKey] ?? 0) + Math.max(1, step),
      })),
    []
  );
  const clearRevealedBranches = React.useCallback((branchKeys: string[]) => {
    setRevealedByBranch((current) => {
      const next = { ...current };
      let changed = false;
      for (const key of branchKeys) {
        if (!(key in next)) continue;
        delete next[key];
        changed = true;
      }
      return changed ? next : current;
    });
  }, []);
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
        !suppressedReveals.has(entry.id) &&
        (Boolean(
          Object.prototype.hasOwnProperty.call(expanded, entry.id) &&
          expanded[entry.id]
        ) ||
          (revealMatches && revealNodes.has(entry.data))),
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
  const branchTruncations: TreeBranchTruncation[] = [];
  // Per sibling group, so revealing more of one never displaces the others.
  const visit = (entries: TreeEntry[], branchKey: string) => {
    const limit = Math.max(
      1,
      branchPageSize + (revealedByBranch[branchKey] ?? 0)
    );
    entries.forEach((entry, childIndex) => {
      if (childIndex >= limit) return;
      const index = visibleEntries.length;
      visibleEntries.push(entry);
      if (getNodeProps(entry).expanded && canExpand(entry, index))
        visit(entry.children, entry.id);
    });
    if (entries.length > limit) {
      branchTruncations.push({
        branchKey,
        afterRowId: entries[limit - 1]!.id,
        depth: entries[0]!.depth,
        hidden: entries.length - limit,
      });
    }
  };
  if (enabled) visit(tree.roots, TREE_ROOT_BRANCH_KEY);
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
    if (
      (nodeExpanded ? props.onNodeExpand : props.onNodeCollapse)?.(event) ===
      false
    )
      return;
    if (revealMatches && revealNodes.has(entry.data)) {
      setSuppressedReveals((current) => {
        const next = new Set(current);
        if (nodeExpanded) next.delete(entry.id);
        else next.add(entry.id);
        return next;
      });
      return;
    }
    const next = { ...expanded, [entry.id]: nodeExpanded };
    // Reopening starts from the first batch again rather than restoring
    // however far the branch had been revealed before it closed.
    const clearedBranches = nodeExpanded ? [] : [entry.id];
    if (!nodeExpanded && (props.collapseChildrenRecursive ?? true)) {
      const collapse = (children: TreeEntry[]) =>
        children.forEach((child) => {
          delete next[child.id];
          clearedBranches.push(child.id);
          collapse(child.children);
        });
      collapse(entry.children);
    }
    const change = { ...event, nodeExpanded, expandedNodes: next };
    if (props.onNodeExpandChange?.(change) === false) return;
    if (clearedBranches.length) clearRevealedBranches(clearedBranches);
    if (props.expandedNodes === undefined) setInternalExpanded(next);
    props.onExpandedNodesChange?.(change);
  };
  const renderToggle = (
    data: TreeRecord,
    index: number,
    options?: TreeToggleOptions
  ) => {
    const entry = byData.get(data);
    if (!entry) return null;
    const nodeProps = getNodeProps(entry);
    const expandable = canExpand(entry, index);
    const customTool = nodeProps.expanded
      ? props.renderTreeCollapseTool
      : props.renderTreeExpandTool;
    const nesting = options?.nestingSize ?? props.treeNestingSize ?? 22;
    return (
      <span
        className="inline-flex shrink-0 items-center"
        style={{
          paddingInlineStart:
            typeof nesting === "number"
              ? entry.depth * Math.max(0, nesting)
              : `calc(${nesting} * ${entry.depth})`,
        }}
      >
        {expandable ? (
          <button
            type="button"
            data-slot="tree-toggle"
            aria-label={`${nodeProps.expanded ? "Collapse" : "Expand"} node ${entry.id}`}
            aria-expanded={nodeProps.expanded}
            className={cn(
              "inline-flex size-7 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              options?.buttonClassName
            )}
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
          <span
            className={cn("inline-block size-7", options?.buttonClassName)}
            aria-hidden="true"
          />
        )}
      </span>
    );
  };
  return {
    enabled,
    rows,
    branchTruncations,
    revealBranch,
    getId,
    getMetadata,
    renderToggle,
    toggle,
    expandedNodes: expanded,
  };
}

export type TreeGridController = ReturnType<typeof useTreeGrid>;
