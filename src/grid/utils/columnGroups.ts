import type { TypeColumn, TypeColumnGroup } from "../../types";
import { getColumnId } from "../../utils/column";
import type {
  TypeGridColumnRenderItem,
  TypeResolvedColumnLock,
} from "./lockedColumns";
import { resolveColumnLock } from "./lockedColumns";

export type TypeNormalizedColumnGroup = TypeColumnGroup & {
  computedDepth: number;
  parentPath: string[];
  path: string[];
};

export type TypeColumnGroupModel = {
  depth: number;
  groups: TypeNormalizedColumnGroup[];
  groupsMap: ReadonlyMap<string, TypeNormalizedColumnGroup>;
  pathsByColumnId: ReadonlyMap<string, TypeNormalizedColumnGroup[]>;
};

export type TypeColumnGroupHeaderRenderItem =
  | {
      type: "spacer";
      key: string;
      depth: number;
      width: number;
      colSpan: 1;
    }
  | {
      type: "placeholder";
      key: string;
      depth: number;
      width: number;
      colSpan: number;
      columnIds: string[];
      locked: TypeResolvedColumnLock;
    }
  | {
      type: "group";
      key: string;
      depth: number;
      width: number;
      fullWidth: number;
      colSpan: number;
      group: TypeNormalizedColumnGroup;
      groupName: string;
      columnIds: string[];
      renderedColumnIds: string[];
      segmentIndex: number;
      segmentCount: number;
      split: boolean;
      locked: TypeResolvedColumnLock;
      resizableBoundary: boolean;
    };

export function getColumnGroupSegmentKey(
  item: Extract<TypeColumnGroupHeaderRenderItem, { type: "group" }>
): string {
  return `${item.depth}:${item.groupName}:${item.segmentIndex}:${item.locked || "unlocked"}`;
}

type LogicalGroupSegment = {
  depth: number;
  group: TypeNormalizedColumnGroup | null;
  groupName: string | null;
  columnIds: string[];
  firstIndex: number;
  lastIndex: number;
  segmentIndex: number;
  locked: TypeResolvedColumnLock;
};

function normalizeGroups(
  groups: readonly TypeColumnGroup[] | null | undefined
): {
  groups: TypeNormalizedColumnGroup[];
  groupsMap: Map<string, TypeNormalizedColumnGroup>;
} {
  const sourceByName = new Map<string, TypeColumnGroup>();

  for (const group of groups ?? []) {
    if (!group || typeof group.name !== "string" || group.name.length === 0) {
      continue;
    }
    // Match ordinary prop-map ownership: the final descriptor for a stable
    // group name is authoritative.
    sourceByName.set(group.name, group);
  }

  const groupsMap = new Map<string, TypeNormalizedColumnGroup>();
  const visiting = new Set<string>();

  const visit = (name: string): TypeNormalizedColumnGroup | undefined => {
    const existing = groupsMap.get(name);
    if (existing) return existing;

    const source = sourceByName.get(name);
    if (!source) return undefined;

    if (visiting.has(name)) {
      // A cyclic parent chain cannot form a header hierarchy. Keep the group
      // usable as a root instead of recursing or mutating consumer input.
      const cyclicRoot: TypeNormalizedColumnGroup = {
        ...source,
        group: undefined,
        computedDepth: 0,
        parentPath: [],
        path: [name],
      };
      groupsMap.set(name, cyclicRoot);
      return cyclicRoot;
    }

    visiting.add(name);
    const parent =
      source.group && source.group !== name ? visit(source.group) : undefined;
    visiting.delete(name);

    const cycleFallback = groupsMap.get(name);
    if (cycleFallback) return cycleFallback;

    const parentPath = parent?.path ?? [];
    const normalized: TypeNormalizedColumnGroup = {
      ...source,
      group: parent?.name,
      computedDepth: parentPath.length,
      parentPath: [...parentPath],
      path: [...parentPath, name],
    };
    groupsMap.set(name, normalized);
    return normalized;
  };

  for (const name of sourceByName.keys()) visit(name);

  return {
    groups: Array.from(sourceByName.keys()).flatMap((name) => {
      const group = groupsMap.get(name);
      return group ? [group] : [];
    }),
    groupsMap,
  };
}

export function buildColumnGroupModel(args: {
  groups?: readonly TypeColumnGroup[] | null;
  columns: readonly TypeColumn[];
}): TypeColumnGroupModel {
  const { groups, groupsMap } = normalizeGroups(args.groups);
  const pathsByColumnId = new Map<string, TypeNormalizedColumnGroup[]>();
  let depth = 0;

  for (const column of args.columns) {
    const columnId = getColumnId(column);
    const leafGroup =
      typeof column.group === "string"
        ? groupsMap.get(column.group)
        : undefined;
    const path = leafGroup
      ? leafGroup.path.flatMap((name) => {
          const group = groupsMap.get(name);
          return group ? [group] : [];
        })
      : [];

    pathsByColumnId.set(columnId, path);
    depth = Math.max(depth, path.length);
  }

  return {
    depth,
    groups,
    groupsMap,
    pathsByColumnId,
  };
}

function buildLogicalSegments(args: {
  model: TypeColumnGroupModel;
  columns: readonly TypeColumn[];
  columnWidths: Readonly<Record<string, number>>;
}): {
  byDepthAndColumnId: Map<string, LogicalGroupSegment>;
  segmentCounts: Map<string, number>;
  fullWidths: Map<string, number>;
} {
  const { model, columns, columnWidths } = args;
  const byDepthAndColumnId = new Map<string, LogicalGroupSegment>();
  const segmentCounts = new Map<string, number>();
  const fullWidths = new Map<string, number>();

  for (let depth = 0; depth < model.depth; depth += 1) {
    const segments: LogicalGroupSegment[] = [];
    let current: LogicalGroupSegment | null = null;

    columns.forEach((column, index) => {
      const columnId = getColumnId(column);
      const group = model.pathsByColumnId.get(columnId)?.[depth] ?? null;
      const groupName = group?.name ?? null;
      const locked = resolveColumnLock(column);
      const canContinue =
        current &&
        current.groupName === groupName &&
        current.locked === locked &&
        current.lastIndex === index - 1;

      if (!canContinue) {
        current = {
          depth,
          group,
          groupName,
          columnIds: [],
          firstIndex: index,
          lastIndex: index,
          segmentIndex: groupName
            ? (segmentCounts.get(`${depth}:${groupName}`) ?? 0)
            : segments.length,
          locked,
        };
        segments.push(current);
        if (groupName) {
          const countKey = `${depth}:${groupName}`;
          segmentCounts.set(countKey, current.segmentIndex + 1);
        }
      }

      current!.columnIds.push(columnId);
      current!.lastIndex = index;
    });

    for (const segment of segments) {
      const segmentKey = `${depth}:${segment.groupName ?? "__blank__"}:${segment.segmentIndex}:${segment.locked || "unlocked"}`;
      const fullWidth = segment.columnIds.reduce(
        (total, columnId) => total + (columnWidths[columnId] ?? 0),
        0
      );
      fullWidths.set(segmentKey, fullWidth);
      for (const columnId of segment.columnIds) {
        byDepthAndColumnId.set(`${depth}:${columnId}`, segment);
      }
    }
  }

  return { byDepthAndColumnId, segmentCounts, fullWidths };
}

export function buildColumnGroupHeaderRows(args: {
  model: TypeColumnGroupModel;
  columns: readonly TypeColumn[];
  columnWidths: Readonly<Record<string, number>>;
  columnRenderItems: readonly TypeGridColumnRenderItem[];
}): TypeColumnGroupHeaderRenderItem[][] {
  const { model, columns, columnWidths, columnRenderItems } = args;
  if (model.depth === 0) return [];

  const columnById = new Map(
    columns.map((column) => [getColumnId(column), column])
  );
  const columnIndexById = new Map(
    columns.map((column, index) => [getColumnId(column), index])
  );
  const { byDepthAndColumnId, segmentCounts, fullWidths } =
    buildLogicalSegments({
      model,
      columns,
      columnWidths,
    });

  return Array.from({ length: model.depth }, (_, depth) => {
    const row: TypeColumnGroupHeaderRenderItem[] = [];
    let fragmentIndex = 0;

    const appendColumn = (columnId: string, width: number) => {
      const logical = byDepthAndColumnId.get(`${depth}:${columnId}`);
      const column = columnById.get(columnId);
      if (!logical || !column) return;

      const logicalKey = `${depth}:${logical.groupName ?? "__blank__"}:${logical.segmentIndex}:${logical.locked || "unlocked"}`;
      const previous = row[row.length - 1];
      const previousColumnId =
        previous?.type === "group"
          ? previous.renderedColumnIds[previous.renderedColumnIds.length - 1]
          : previous?.type === "placeholder"
            ? previous.columnIds[previous.columnIds.length - 1]
            : undefined;
      const previousIndex = previousColumnId
        ? (columnIndexById.get(previousColumnId) ?? -1)
        : -1;
      const currentIndex = columnIndexById.get(columnId) ?? -1;
      const canMerge =
        previous &&
        previous.type !== "spacer" &&
        previous.locked === logical.locked &&
        previousIndex + 1 === currentIndex &&
        ((previous.type === "group" &&
          logical.group &&
          previous.groupName === logical.groupName &&
          previous.segmentIndex === logical.segmentIndex) ||
          (previous.type === "placeholder" && !logical.group));

      if (canMerge) {
        previous.width += width;
        previous.colSpan += 1;
        if (previous.type === "group") {
          previous.renderedColumnIds.push(columnId);
          previous.resizableBoundary = logical.lastIndex === currentIndex;
        } else {
          previous.columnIds.push(columnId);
        }
        return;
      }

      fragmentIndex += 1;
      if (!logical.group || !logical.groupName) {
        row.push({
          type: "placeholder",
          key: `group-placeholder:${depth}:${fragmentIndex}:${columnId}`,
          depth,
          width,
          colSpan: 1,
          columnIds: [columnId],
          locked: logical.locked,
        });
        return;
      }

      const segmentCount =
        segmentCounts.get(`${depth}:${logical.groupName}`) ?? 1;
      row.push({
        type: "group",
        key: `group:${logicalKey}:${fragmentIndex}`,
        depth,
        width,
        fullWidth: fullWidths.get(logicalKey) ?? width,
        colSpan: 1,
        group: logical.group,
        groupName: logical.groupName,
        columnIds: [...logical.columnIds],
        renderedColumnIds: [columnId],
        segmentIndex: logical.segmentIndex,
        segmentCount,
        split: segmentCount > 1,
        locked: logical.locked,
        resizableBoundary: logical.lastIndex === currentIndex,
      });
    };

    for (const renderItem of columnRenderItems) {
      if (renderItem.type === "spacer") {
        row.push({
          type: "spacer",
          key: `group-spacer:${depth}:${renderItem.id}`,
          depth,
          width: renderItem.width,
          colSpan: 1,
        });
        continue;
      }

      appendColumn(renderItem.id, columnWidths[renderItem.id] ?? 0);
    }

    return row;
  });
}

export function haveSameColumnGroupPath(
  model: TypeColumnGroupModel,
  firstColumnId: string,
  secondColumnId: string
): boolean {
  const first =
    model.pathsByColumnId.get(firstColumnId)?.map((group) => group.name) ?? [];
  const second =
    model.pathsByColumnId.get(secondColumnId)?.map((group) => group.name) ?? [];
  return (
    first.length === second.length &&
    first.every((name, index) => name === second[index])
  );
}

export function canMoveColumnGroupSegment(args: {
  model: TypeColumnGroupModel;
  sourceDepth: number;
  sourceColumnIds: readonly string[];
  targetColumnId: string;
}): boolean {
  const { model, sourceDepth, sourceColumnIds, targetColumnId } = args;
  const firstSourceId = sourceColumnIds[0];
  if (!firstSourceId) return false;

  const sourcePath = model.pathsByColumnId.get(firstSourceId) ?? [];
  const targetPath = model.pathsByColumnId.get(targetColumnId) ?? [];
  if (sourcePath.length <= sourceDepth || targetPath.length <= sourceDepth) {
    return false;
  }

  return sourcePath
    .slice(0, sourceDepth)
    .every((group, index) => targetPath[index]?.name === group.name);
}

export function moveColumnIdsBefore(
  order: readonly string[],
  movingColumnIds: readonly string[],
  targetColumnId: string
): string[] {
  const moving = new Set(movingColumnIds);
  if (moving.size === 0 || moving.has(targetColumnId)) return [...order];

  const remainder = order.filter((columnId) => !moving.has(columnId));
  const targetIndex = remainder.indexOf(targetColumnId);
  if (targetIndex < 0) return [...order];

  const orderedMovingIds = order.filter((columnId) => moving.has(columnId));
  remainder.splice(targetIndex, 0, ...orderedMovingIds);
  return remainder;
}

export function resizeColumnWidthsProportionally(args: {
  columns: readonly {
    id: string;
    width: number;
    minWidth: number;
    maxWidth: number;
  }[];
  requestedTotalWidth: number;
}): Record<string, number> {
  const columns = args.columns.filter(
    (column) =>
      Number.isFinite(column.width) &&
      column.width > 0 &&
      Number.isFinite(column.minWidth) &&
      Number.isFinite(column.maxWidth)
  );
  if (columns.length === 0) return {};

  const minimumTotal = columns.reduce(
    (total, column) => total + column.minWidth,
    0
  );
  const maximumTotal = columns.reduce(
    (total, column) => total + column.maxWidth,
    0
  );
  const targetTotal = Math.min(
    maximumTotal,
    Math.max(minimumTotal, args.requestedTotalWidth)
  );
  const startTotal = columns.reduce((total, column) => total + column.width, 0);
  const scale = startTotal > 0 ? targetTotal / startTotal : 1;
  const widths = new Map(
    columns.map((column) => [
      column.id,
      Math.min(
        column.maxWidth,
        Math.max(column.minWidth, column.width * scale)
      ),
    ])
  );

  for (let pass = 0; pass < columns.length * 2; pass += 1) {
    const currentTotal = Array.from(widths.values()).reduce(
      (total, width) => total + width,
      0
    );
    const remaining = targetTotal - currentTotal;
    if (Math.abs(remaining) < 0.01) break;

    const candidates = columns.filter((column) => {
      const width = widths.get(column.id) ?? column.width;
      return remaining > 0
        ? width < column.maxWidth - 0.01
        : width > column.minWidth + 0.01;
    });
    if (candidates.length === 0) break;

    const weightTotal = candidates.reduce(
      (total, column) => total + column.width,
      0
    );
    for (const column of candidates) {
      const width = widths.get(column.id) ?? column.width;
      const share =
        remaining *
        (weightTotal > 0 ? column.width / weightTotal : 1 / candidates.length);
      widths.set(
        column.id,
        Math.min(column.maxWidth, Math.max(column.minWidth, width + share))
      );
    }
  }

  const rounded = Object.fromEntries(
    columns.map((column) => [
      column.id,
      Math.round(widths.get(column.id) ?? column.width),
    ])
  );
  let roundedDiff =
    Math.round(targetTotal) -
    Object.values(rounded).reduce((total, width) => total + width, 0);

  for (const column of columns) {
    if (roundedDiff === 0) break;
    const current = rounded[column.id] ?? Math.round(column.width);
    const available =
      roundedDiff > 0
        ? Math.floor(column.maxWidth - current)
        : Math.floor(current - column.minWidth);
    const adjustment =
      Math.sign(roundedDiff) *
      Math.min(Math.abs(roundedDiff), Math.max(0, available));
    rounded[column.id] = current + adjustment;
    roundedDiff -= adjustment;
  }

  return rounded;
}
