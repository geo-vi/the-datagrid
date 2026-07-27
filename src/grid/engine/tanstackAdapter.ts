import type {
  ColumnFiltersState,
  ColumnOrderState,
  ColumnSizingState,
  RowSelectionState,
  SortingState,
  VisibilityState,
} from "@tanstack/react-table";

import type {
  TypeColumn,
  TypeFilterValue,
  TypeRowSelection,
  TypeSingleFilterValue,
  TypeSingleSortInfo,
  TypeSortInfo,
} from "../../types";

type RuntimeColumn = TypeColumn & {
  id?: unknown;
  name?: unknown;
  sortName?: unknown;
  filterName?: unknown;
};

type SelectionMap = Record<string, unknown>;

const hasOwn = (value: object, key: PropertyKey): boolean =>
  Object.prototype.hasOwnProperty.call(value, key);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * TanStack stores every state identifier as a string. Nullish identifiers are
 * absent, while other falsy identifiers (`0`, `false`, and `""`) remain
 * distinct and must not be discarded by truthiness checks.
 */
function toStateKey(value: unknown): string | null {
  return value === null || value === undefined ? null : String(value);
}

function getColumnId(column: TypeColumn): string {
  const runtimeColumn = column as RuntimeColumn;
  const id = toStateKey(runtimeColumn.id ?? runtimeColumn.name);

  if (id === null || id.length === 0) {
    throw new Error("the-datagrid: column must have `id` or `name`.");
  }

  return id;
}

function getColumnSortName(column: TypeColumn): string {
  const runtimeColumn = column as RuntimeColumn;
  return String(runtimeColumn.sortName ?? runtimeColumn.name ?? "");
}

function getColumnFilterAliases(column: TypeColumn): string[] {
  const runtimeColumn = column as RuntimeColumn;
  const aliases = [
    getColumnId(column),
    toStateKey(runtimeColumn.name),
    toStateKey(runtimeColumn.filterName),
  ];

  return Array.from(
    new Set(aliases.filter((alias): alias is string => alias !== null))
  );
}

function buildColumnLookups(columns: readonly TypeColumn[]) {
  const sortNameToId = new Map<string, string>();
  const filterNameToId = new Map<string, string>();
  const idToSortName = new Map<string, string>();
  const columnIds: string[] = [];

  for (const column of columns) {
    const id = getColumnId(column);
    const sortName = getColumnSortName(column);

    if (!columnIds.includes(id)) columnIds.push(id);
    if (!idToSortName.has(id)) idToSortName.set(id, sortName);
    if (!sortNameToId.has(id)) sortNameToId.set(id, id);
    if (sortName && !sortNameToId.has(sortName)) {
      sortNameToId.set(sortName, id);
    }

    for (const alias of getColumnFilterAliases(column)) {
      if (!filterNameToId.has(alias)) filterNameToId.set(alias, id);
    }
  }

  return { columnIds, filterNameToId, idToSortName, sortNameToId };
}

function sortInfoList(sortInfo: TypeSortInfo): TypeSingleSortInfo[] {
  if (!sortInfo) return [];
  return Array.isArray(sortInfo) ? sortInfo : [sortInfo];
}

/** Project the compatibility sorting model into controlled TanStack state. */
export function toTanStackSortingState(
  sortInfo: TypeSortInfo,
  columns: readonly TypeColumn[]
): SortingState {
  const { sortNameToId } = buildColumnLookups(columns);
  const result: SortingState = [];
  const seen = new Set<string>();

  for (const item of sortInfoList(sortInfo)) {
    if (item.dir !== 1 && item.dir !== -1) continue;

    const sourceName = toStateKey(item.name);
    const sourceId = toStateKey(item.id);
    if (
      (sourceName === null || sourceName.length === 0) &&
      (sourceId === null || sourceId.length === 0)
    ) {
      continue;
    }

    const id =
      (sourceId == null ? undefined : sortNameToId.get(sourceId)) ??
      (sourceName == null ? undefined : sortNameToId.get(sourceName)) ??
      sourceId ??
      sourceName!;
    if (seen.has(id)) continue;

    seen.add(id);
    result.push({ id, desc: item.dir === -1 });
  }

  return result;
}

/**
 * Restore TanStack sorting to the Inovua-shaped model. Existing entries are
 * used as templates so compatibility metadata (`type`, `fn`, `columnName`,
 * and custom fields) survives a controlled state update.
 */
export function fromTanStackSortingState(
  sorting: readonly SortingState[number][],
  columns: readonly TypeColumn[],
  current: TypeSortInfo = null
): TypeSortInfo {
  const { idToSortName, sortNameToId } = buildColumnLookups(columns);
  const currentList = sortInfoList(current);
  const currentById = new Map<string, TypeSingleSortInfo>();

  for (const item of currentList) {
    const name = toStateKey(item.name);
    const itemId = toStateKey(item.id);
    if (name === null && itemId === null) continue;
    const id =
      (itemId == null ? undefined : sortNameToId.get(itemId)) ??
      (name == null ? undefined : sortNameToId.get(name)) ??
      itemId ??
      name!;
    if (!currentById.has(id)) currentById.set(id, item);
  }

  const next: TypeSingleSortInfo[] = [];
  const seen = new Set<string>();

  for (const item of sorting) {
    const id = toStateKey(item.id);
    if (id === null || id.length === 0 || seen.has(id)) continue;
    seen.add(id);

    const currentItem = currentById.get(id);
    const name = idToSortName.get(id) ?? currentItem?.name ?? id;
    next.push({
      ...currentItem,
      ...(currentItem?.id != null || name === ""
        ? { id: currentItem?.id ?? id }
        : {}),
      name,
      dir: item.desc ? -1 : 1,
    });
  }

  if (next.length === 0) return Array.isArray(current) ? [] : null;
  if (next.length > 1 || Array.isArray(current)) return next;
  return next[0]!;
}

function isCompleteFilterEntry(value: unknown): value is TypeSingleFilterValue {
  return (
    isRecord(value) &&
    typeof value.name === "string" &&
    typeof value.type === "string" &&
    typeof value.operator === "string" &&
    hasOwn(value, "value")
  );
}

/**
 * Store the complete compatibility filter entry as the TanStack filter value.
 * Keeping more than just `entry.value` prevents operator/type/active metadata
 * from being lost when TanStack calls a controlled state updater.
 */
export function toTanStackColumnFiltersState(
  filterValue: TypeFilterValue,
  columns: readonly TypeColumn[]
): ColumnFiltersState {
  if (!filterValue) return [];

  const { filterNameToId } = buildColumnLookups(columns);
  const result: ColumnFiltersState = [];
  const seen = new Set<string>();

  for (const entry of filterValue) {
    const name = toStateKey(entry.name);
    if (name === null) continue;

    const id = filterNameToId.get(name) ?? name;
    if (seen.has(id)) continue;

    seen.add(id);
    result.push({ id, value: { ...entry } });
  }

  return result;
}

/**
 * Restore complete filter entries from TanStack state. A raw TanStack value is
 * accepted only when a current compatibility entry can provide its required
 * type/operator metadata; otherwise the malformed entry is ignored.
 */
export function fromTanStackColumnFiltersState(
  columnFilters: readonly ColumnFiltersState[number][],
  columns: readonly TypeColumn[],
  current: TypeFilterValue = null
): TypeFilterValue {
  const { filterNameToId } = buildColumnLookups(columns);
  const currentById = new Map<string, TypeSingleFilterValue>();

  for (const entry of current ?? []) {
    const name = toStateKey(entry.name);
    if (name === null) continue;
    const id = filterNameToId.get(name) ?? name;
    if (!currentById.has(id)) currentById.set(id, entry);
  }

  const next: TypeSingleFilterValue[] = [];
  const seen = new Set<string>();

  for (const columnFilter of columnFilters) {
    const id = toStateKey(columnFilter.id);
    if (id === null || seen.has(id)) continue;

    let entry: TypeSingleFilterValue | undefined;
    if (isCompleteFilterEntry(columnFilter.value)) {
      const valueName = toStateKey(columnFilter.value.name);
      const valueId =
        valueName === null
          ? null
          : (filterNameToId.get(valueName) ?? valueName);

      entry = {
        ...columnFilter.value,
        name:
          valueId === id
            ? columnFilter.value.name
            : (currentById.get(id)?.name ?? id),
      };
    } else {
      const existing = currentById.get(id);
      if (existing) entry = { ...existing, value: columnFilter.value };
    }

    if (!entry) continue;
    seen.add(id);
    next.push(entry);
  }

  return next.length > 0 ? next : null;
}

function unwrapSelection(selection: TypeRowSelection): TypeRowSelection {
  if (
    isRecord(selection) &&
    hasOwn(selection, "selected") &&
    (hasOwn(selection, "data") ||
      hasOwn(selection, "unselected") ||
      hasOwn(selection, "originalData"))
  ) {
    return selection.selected as TypeRowSelection;
  }

  return selection;
}

function selectionMap(selection: TypeRowSelection): SelectionMap {
  const normalized = unwrapSelection(selection);

  if (normalized === null) return {};
  if (isRecord(normalized)) return normalized;

  const key = toStateKey(normalized);
  return key === null ? {} : { [key]: true };
}

/** Project an Inovua selection value into TanStack's ID/boolean map. */
export function toTanStackRowSelectionState(
  selection: TypeRowSelection
): RowSelectionState {
  const result: RowSelectionState = {};

  for (const [id, selected] of Object.entries(selectionMap(selection))) {
    if (selected) result[id] = true;
  }

  return result;
}

/**
 * Restore an ID map without requiring row data. When available, values from
 * the current compatibility selection are retained instead of being replaced
 * by `true`.
 */
export function fromTanStackRowSelectionState(
  rowSelection: Readonly<RowSelectionState>,
  current: TypeRowSelection = null
): TypeRowSelection {
  const currentMap = selectionMap(current);
  const result: SelectionMap = {};

  for (const [id, selected] of Object.entries(rowSelection)) {
    if (!selected) continue;
    result[id] =
      hasOwn(currentMap, id) && currentMap[id] ? currentMap[id] : true;
  }

  return result;
}

/**
 * Hydrate selected IDs with objects from the latest row model. Stale selected
 * IDs are intentionally dropped, and duplicate row IDs keep the first row to
 * match TanStack's requirement that row IDs are unique.
 */
export function hydrateTanStackRowSelection<TRow>(
  rowSelection: Readonly<RowSelectionState>,
  rows: readonly TRow[],
  getRowId: (row: TRow, index: number) => unknown
): Record<string, TRow> {
  const result: Record<string, TRow> = {};

  rows.forEach((row, index) => {
    const id = toStateKey(getRowId(row, index));
    if (id === null || !rowSelection[id] || hasOwn(result, id)) return;
    result[id] = row;
  });

  return result;
}

/** Build complete, controlled visibility state for the current columns. */
export function projectTanStackColumnVisibility(
  columns: readonly TypeColumn[],
  overrides: Readonly<Record<string, boolean | undefined>> = {},
  initialDefaults: Readonly<Record<string, boolean | undefined>> = {}
): VisibilityState {
  const result: VisibilityState = {};

  for (const column of columns) {
    const id = getColumnId(column);
    if (hasOwn(result, id)) continue;

    if (hasOwn(overrides, id) && typeof overrides[id] === "boolean") {
      result[id] = overrides[id]!;
    } else if (typeof column.visible === "boolean") {
      result[id] = column.visible;
    } else if (
      hasOwn(initialDefaults, id) &&
      typeof initialDefaults[id] === "boolean"
    ) {
      result[id] = initialDefaults[id]!;
    } else {
      result[id] = true;
    }
  }

  return result;
}

/** Filter/dedupe a requested order, then append every still-available column. */
export function projectTanStackColumnOrder(
  columns: readonly TypeColumn[],
  requestedOrder?: readonly unknown[] | null
): ColumnOrderState {
  const { columnIds } = buildColumnLookups(columns);
  const available = new Set(columnIds);
  const result: ColumnOrderState = [];
  const seen = new Set<string>();

  for (const rawId of requestedOrder ?? []) {
    const id = toStateKey(rawId);
    if (id === null || !available.has(id) || seen.has(id)) continue;
    seen.add(id);
    result.push(id);
  }

  for (const id of columnIds) {
    if (seen.has(id)) continue;
    seen.add(id);
    result.push(id);
  }

  return result;
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

/**
 * Project resolved grid widths into TanStack sizing state. Explicit computed
 * widths win, while column min/max constraints remain authoritative.
 */
export function projectTanStackColumnSizing(
  columns: readonly TypeColumn[],
  computedWidths: Readonly<Record<string, number | undefined>> = {}
): ColumnSizingState {
  const result: ColumnSizingState = {};

  for (const column of columns) {
    const id = getColumnId(column);
    if (hasOwn(result, id)) continue;

    let size = finiteNumber(computedWidths[id]);
    size ??= finiteNumber(column.width);
    size ??= finiteNumber(column.defaultWidth);
    if (size === undefined) continue;

    const min = finiteNumber(column.minWidth);
    const max = finiteNumber(column.maxWidth);

    if (max !== undefined) size = Math.min(size, max);
    if (min !== undefined) size = Math.max(size, min);
    result[id] = size;
  }

  return result;
}
