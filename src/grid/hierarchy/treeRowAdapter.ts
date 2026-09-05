import * as React from "react";

import { indexTree, type TreeEntry, type TreeRecord } from "./treeData";

type TreeIndexOptions = Parameters<typeof indexTree>[1];
type VisibleRowsUpdate = React.SetStateAction<TreeRecord[]>;

const hasOwn = (record: TreeRecord, key: string) =>
  Object.prototype.hasOwnProperty.call(record, key);

/** Combine a direct row edit with edits supplied inside its parent's children. */
function mergeRowChanges(
  original: TreeRecord,
  supplied: TreeRecord,
  replacement: TreeRecord,
  nodesProperty: string
): TreeRecord {
  const next = { ...supplied };
  for (const key of Object.keys(original)) {
    if (key !== nodesProperty && !hasOwn(replacement, key)) delete next[key];
  }
  for (const key of Object.keys(replacement)) {
    if (!hasOwn(original, key) || !Object.is(replacement[key], original[key])) {
      Object.defineProperty(next, key, {
        value: replacement[key],
        enumerable: true,
        configurable: true,
        writable: true,
      });
    }
  }
  return next;
}

/**
 * Adapt the existing fixed-index row setters to a nested tree snapshot. Visible
 * indexes identify records; they never index the top-level source array.
 * Structural insertion/removal still belongs to the consumer's dataSource.
 */
export function applyVisibleTreeRows(
  sourceRows: TreeRecord[],
  visibleIds: readonly string[],
  update: VisibleRowsUpdate,
  options: TreeIndexOptions
): TreeRecord[] {
  const tree = indexTree(sourceRows, options);
  const visibleEntries = visibleIds.map((id) => tree.entries.get(id));
  // A delayed updater must not target a different record after a source reload.
  if (visibleEntries.some((entry) => !entry)) return sourceRows;
  const currentVisibleRows = visibleEntries.map((entry) => entry!.data);
  const nextVisibleRows =
    typeof update === "function" ? update(currentVisibleRows) : update;
  if (nextVisibleRows === currentVisibleRows) return sourceRows;
  if (nextVisibleRows.length !== currentVisibleRows.length) {
    throw new Error(
      "the-datagrid: tree row setters update existing records; change dataSource to add or remove nodes."
    );
  }
  const replacements = new Map<string, TreeRecord>();
  nextVisibleRows.forEach((row, index) => {
    if (Object.is(row, currentVisibleRows[index])) return;
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      throw new Error("the-datagrid: a tree row replacement must be a record.");
    }
    replacements.set(visibleIds[index]!, row);
  });
  if (!replacements.size) return sourceRows;

  const rewrite = (entry: TreeEntry, supplied = entry.data): TreeRecord => {
    const replacement = replacements.get(entry.id);
    const next = replacement
      ? supplied === entry.data
        ? replacement
        : mergeRowChanges(
            entry.data,
            supplied,
            replacement,
            options.nodesProperty
          )
      : supplied;
    const retainsChildren =
      !hasOwn(next, options.nodesProperty) &&
      hasOwn(entry.data, options.nodesProperty);
    const children = retainsChildren
      ? entry.data[options.nodesProperty]
      : next[options.nodesProperty];
    if (!Array.isArray(children)) {
      return retainsChildren
        ? { ...next, [options.nodesProperty]: children }
        : next;
    }
    const oldChildren = new Map(
      entry.children.map((child) => [
        String(child.data[options.idProperty] ?? child.childIndex),
        child,
      ])
    );
    const nextChildren = children.map((child: TreeRecord, index: number) => {
      const original = oldChildren.get(
        String(child[options.idProperty] ?? index)
      );
      return original ? rewrite(original, child) : child;
    });
    return retainsChildren ||
      nextChildren.some((child, index) => child !== children[index])
      ? { ...next, [options.nodesProperty]: nextChildren }
      : next;
  };
  return tree.roots.map((entry) => rewrite(entry));
}

/** Root integration uses this setter only when the explicit tree flag is on. */
export function useTreeRowAdapter(
  args: TreeIndexOptions & {
    enabled?: boolean;
    sourceRows: TreeRecord[];
    visibleRows: TreeRecord[];
    getRowId: (row: TreeRecord, index: number) => string;
    setSourceRows: React.Dispatch<React.SetStateAction<TreeRecord[]>>;
  }
): { setVisibleRows: React.Dispatch<VisibleRowsUpdate> } {
  const {
    enabled = true,
    visibleRows,
    getRowId,
    setSourceRows,
    idProperty,
    nodesProperty,
    nodePathSeparator,
    generateIdFromPath,
  } = args;
  const options = React.useMemo(
    () => ({
      idProperty,
      nodesProperty,
      nodePathSeparator,
      generateIdFromPath,
    }),
    [idProperty, nodesProperty, nodePathSeparator, generateIdFromPath]
  );
  const visibleIds = React.useMemo(
    () => (enabled ? visibleRows.map(getRowId) : []),
    [enabled, visibleRows, getRowId]
  );
  const setVisibleRows = React.useCallback<React.Dispatch<VisibleRowsUpdate>>(
    (update) => {
      if (!enabled) {
        setSourceRows(update);
        return;
      }
      setSourceRows((current) =>
        applyVisibleTreeRows(current, visibleIds, update, options)
      );
    },
    [enabled, options, setSourceRows, visibleIds]
  );
  return { setVisibleRows };
}
