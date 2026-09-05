/* eslint-disable @typescript-eslint/no-explicit-any -- Rows retain the existing grid's open record shape at this adapter boundary. */
import { applyLocalFilter } from "../../filters/utils";
import { applyLocalSort } from "../../sorting/utils";
import type {
  TypeColumn,
  TypeFilterTypes,
  TypeFilterValue,
  TypeSortFunctions,
  TypeSortInfo,
} from "../../types";

export type TreeRecord = Record<string, any>;

export function countTreeRecords(
  rows: TreeRecord[],
  nodesProperty: string
): number {
  return rows.reduce(
    (count, row) =>
      count +
      1 +
      (Array.isArray(row[nodesProperty])
        ? countTreeRecords(row[nodesProperty], nodesProperty)
        : 0),
    0
  );
}

/** Visit siblings independently. Keep ancestors of matches without mutating input. */
export function processTreeData(
  rows: TreeRecord[],
  options: {
    nodesProperty: string;
    filterValue: TypeFilterValue;
    filterTypes: TypeFilterTypes;
    columns: TypeColumn[];
    sortInfo: TypeSortInfo;
    sortFunctions: TypeSortFunctions | null;
    search?: (rows: TreeRecord[]) => TreeRecord[];
  }
): { data: TreeRecord[]; count: number; revealNodes: Set<TreeRecord> } {
  const ancestors = new Set<object>();
  const revealNodes = new Set<TreeRecord>();
  const matchingSubtrees = new WeakSet<TreeRecord>();
  const sortRetainedSubtree = (siblings: TreeRecord[]): TreeRecord[] => {
    if (!options.sortInfo) return siblings;
    const nested = siblings.map((row) =>
      Array.isArray(row[options.nodesProperty])
        ? {
            ...row,
            [options.nodesProperty]: sortRetainedSubtree(
              row[options.nodesProperty]
            ),
          }
        : row
    );
    return applyLocalSort(
      nested,
      options.sortInfo,
      options.columns,
      options.sortFunctions
    );
  };
  const visit = (siblings: TreeRecord[]): TreeRecord[] => {
    const matches = new Set(
      applyLocalFilter(
        options.search ? options.search(siblings) : siblings,
        options.filterValue,
        { filterTypes: options.filterTypes, columns: options.columns }
      )
    );
    const kept: TreeRecord[] = [];
    for (const row of siblings) {
      if (ancestors.has(row))
        throw new Error("the-datagrid: cyclic tree data.");
      ancestors.add(row);
      const originalChildren = row[options.nodesProperty];
      let children = Array.isArray(originalChildren)
        ? visit(originalChildren)
        : undefined;
      ancestors.delete(row);
      if (!matches.has(row) && !children?.length) continue;
      const matchingDescendant =
        children?.some((child) => matchingSubtrees.has(child)) ?? false;
      // The documented legacy helper retains the original subtree when only
      // the parent matches. Retained descendants aren't themselves matches.
      if (matches.has(row) && children?.length === 0)
        children = sortRetainedSubtree(originalChildren);
      const next =
        children &&
        (children.length !== originalChildren.length ||
          children.some(
            (child: TreeRecord, index: number) =>
              child !== originalChildren[index]
          ))
          ? { ...row, [options.nodesProperty]: children }
          : row;
      if (matches.has(row) || matchingDescendant) matchingSubtrees.add(next);
      if (matchingDescendant) revealNodes.add(next);
      kept.push(next);
    }
    return options.sortInfo
      ? applyLocalSort(
          kept,
          options.sortInfo,
          options.columns,
          options.sortFunctions
        )
      : kept;
  };
  const data = visit(rows);
  return {
    data,
    count: countTreeRecords(data, options.nodesProperty),
    revealNodes,
  };
}

export type TreeEntry = {
  data: TreeRecord;
  id: string;
  path: string;
  depth: number;
  childIndex: number;
  parentNodeId: string;
  children: TreeEntry[];
  leaf: boolean;
};

/** Compatibility IDs belong to the adapter, never to the consumer's records. */
export function indexTree(
  rows: TreeRecord[],
  options: {
    idProperty: string;
    nodesProperty: string;
    nodePathSeparator: string;
    generateIdFromPath: boolean;
  }
): { roots: TreeEntry[]; entries: Map<string, TreeEntry> } {
  const entries = new Map<string, TreeEntry>();
  const ancestors = new Set<object>();
  const visit = (siblings: TreeRecord[], parent?: TreeEntry): TreeEntry[] =>
    siblings.map((data, childIndex) => {
      if (ancestors.has(data))
        throw new Error("the-datagrid: cyclic tree data.");
      const localId = String(data[options.idProperty] ?? childIndex);
      const path = parent
        ? `${parent.path}${options.nodePathSeparator}${localId}`
        : localId;
      const id = options.generateIdFromPath ? path : localId;
      if (entries.has(id))
        throw new Error(
          `the-datagrid: duplicate tree node ID "${id}". Use stable IDs and an unambiguous nodePathSeparator.`
        );
      const children = data[options.nodesProperty];
      const entry: TreeEntry = {
        data,
        id,
        path,
        depth: parent ? parent.depth + 1 : 0,
        childIndex,
        parentNodeId: parent?.id ?? "",
        children: [],
        leaf: children === undefined,
      };
      entries.set(id, entry);
      ancestors.add(data);
      entry.children = Array.isArray(children) ? visit(children, entry) : [];
      ancestors.delete(data);
      return entry;
    });
  return { roots: visit(rows), entries };
}
