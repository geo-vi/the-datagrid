import type { SortingState } from "@tanstack/react-table";

import type {
  TypeColumn,
  TypeSingleSortInfo,
  TypeSortFunctions,
  TypeSortInfo,
} from "../types";
import { getColumnId, getColumnSortName } from "../utils/column";

type RuntimeColumn = TypeColumn & {
  id?: unknown;
  name?: unknown;
  sortName?: unknown;
};

function sortInfoList(sortInfo: TypeSortInfo): TypeSingleSortInfo[] {
  if (!sortInfo) return [];
  return Array.isArray(sortInfo) ? sortInfo : [sortInfo];
}

function getColumnName(column: TypeColumn): string {
  const name = (column as RuntimeColumn).name;
  return name == null ? "" : String(name);
}

/**
 * Inovua keeps an id-only column distinct from a named column. Its generated
 * sort descriptor has an empty `name`, which makes a custom comparator receive
 * the complete row as its first two arguments.
 */
function getColumnSortField(column: TypeColumn): string {
  const runtimeColumn = column as RuntimeColumn;
  const value = runtimeColumn.sortName ?? runtimeColumn.name;
  return value == null ? "" : String(value);
}

function matchesColumn(
  sortInfo: TypeSingleSortInfo,
  column: TypeColumn
): boolean {
  const columnId = getColumnId(column);
  const sortName = getColumnSortField(column);
  const columnName = getColumnName(column);

  return (
    (sortInfo.id != null && String(sortInfo.id) === columnId) ||
    (sortInfo.name !== "" &&
      (sortInfo.name === sortName ||
        sortInfo.name === columnName ||
        sortInfo.name === columnId))
  );
}

function findSortInfoIndex(
  sortInfo: readonly TypeSingleSortInfo[],
  column: TypeColumn
): number {
  return sortInfo.findIndex((entry) => matchesColumn(entry, column));
}

function findColumn(
  sortInfo: TypeSingleSortInfo,
  columns: readonly TypeColumn[]
): TypeColumn | undefined {
  return columns.find((column) => matchesColumn(sortInfo, column));
}

function normalizeDirection(value: unknown): -1 | 0 | 1 {
  return value === -1 ? -1 : value === 1 ? 1 : 0;
}

function nextSortDirection(options: {
  current: -1 | 0 | 1;
  defaultDir: 1 | -1;
  allowUnsort: boolean;
  multiSort: boolean;
}): -1 | 0 | 1 {
  const { current, defaultDir, allowUnsort, multiSort } = options;
  const opposite = defaultDir === 1 ? -1 : 1;

  if (current === 0) return defaultDir;
  if (current === defaultDir) return opposite;
  return allowUnsort || multiSort ? 0 : defaultDir;
}

function createComparator(
  column: TypeColumn,
  sortFunctions: TypeSortFunctions | undefined
): TypeSingleSortInfo["fn"] | undefined {
  if (column.sort) {
    return (value1, value2, data1, data2, sortInfo) =>
      column.sort!(value1, value2, column, data1, data2, sortInfo);
  }

  const registered =
    column.type == null ? undefined : sortFunctions?.[column.type];
  if (!registered) return undefined;

  return (value1, value2) => registered(value1, value2, column);
}

export function createColumnSortInfo(options: {
  column: TypeColumn;
  dir: 1 | -1;
  sortFunctions?: TypeSortFunctions;
}): TypeSingleSortInfo | null {
  const { column, dir, sortFunctions } = options;
  const id = getColumnId(column);
  const name = getColumnSortField(column);
  const fn = createComparator(column, sortFunctions);

  // This is an intentional Inovua distinction: an id-only column requires a
  // custom comparator (or sortName) because there is no named value to read.
  if (!name && !fn) return null;

  return {
    dir,
    id,
    name,
    columnName: getColumnName(column),
    type: column.type,
    ...(fn ? { fn } : {}),
  };
}

export function getSortDir(
  sortInfo: TypeSortInfo,
  columnOrSortName: TypeColumn | string
): 0 | 1 | -1 {
  const found = getColumnSortInfo(sortInfo, columnOrSortName);
  return normalizeDirection(found?.dir);
}

export function getColumnSortInfo(
  sortInfo: TypeSortInfo,
  columnOrSortName: TypeColumn | string
): TypeSingleSortInfo | null {
  return (
    (typeof columnOrSortName === "string"
      ? sortInfoList(sortInfo).find((entry) => entry.name === columnOrSortName)
      : sortInfoList(sortInfo).find((entry) =>
          matchesColumn(entry, columnOrSortName)
        )) ?? null
  );
}

function updateSortInfoForColumn(options: {
  sortInfo: TypeSortInfo;
  column: TypeColumn;
  dir: -1 | 0 | 1;
  sortFunctions?: TypeSortFunctions;
}): TypeSortInfo {
  const { sortInfo, column, dir, sortFunctions } = options;
  const multiSort = Array.isArray(sortInfo);
  const currentList = sortInfoList(sortInfo);
  const currentIndex = findSortInfoIndex(currentList, column);
  const nextDescriptor =
    dir === 0 ? null : createColumnSortInfo({ column, dir, sortFunctions });

  if (!multiSort) return nextDescriptor;

  const nextList = [...currentList];
  if (currentIndex >= 0) {
    if (nextDescriptor) nextList[currentIndex] = nextDescriptor;
    else nextList.splice(currentIndex, 1);
  } else if (nextDescriptor) {
    nextList.push(nextDescriptor);
  }

  // Array shape is the persistent multi-sort mode, including for zero or one
  // descriptors. Do not collapse it to null or a single object.
  return nextList;
}

export function toggleSortInfo(options: {
  sortInfo: TypeSortInfo;
  col: TypeColumn;
  allowUnsort: boolean;
  defaultDir: 1 | -1;
  /**
   * Retained for source compatibility with the earlier helper. Inovua derives
   * multi-sort mode from array-valued state, not from a modifier-key gesture.
   */
  multi?: boolean;
  sortFunctions?: TypeSortFunctions;
}): TypeSortInfo {
  const { sortInfo, col, allowUnsort, defaultDir, sortFunctions } = options;
  const current = getSortDir(sortInfo, col);
  const multiSort = Array.isArray(sortInfo);
  const dir = nextSortDirection({
    current,
    defaultDir,
    allowUnsort,
    multiSort,
  });

  return updateSortInfoForColumn({
    sortInfo,
    column: col,
    dir,
    sortFunctions,
  });
}

export function setColumnSortInfo(options: {
  sortInfo: TypeSortInfo;
  col: TypeColumn;
  dir: -1 | 0 | 1;
  sortFunctions?: TypeSortFunctions;
}): TypeSortInfo {
  return updateSortInfoForColumn({
    sortInfo: options.sortInfo,
    column: options.col,
    dir: options.dir,
    sortFunctions: options.sortFunctions,
  });
}

export function toTanstackSorting(
  sortInfo: TypeSortInfo,
  columns: TypeColumn[]
): SortingState {
  if (!sortInfo) return [];
  const list = sortInfoList(sortInfo);

  const nameToId = new Map<string, string>();
  for (const column of columns) {
    const id = getColumnId(column);
    nameToId.set(getColumnSortName(column), id);
    nameToId.set(getColumnSortField(column), id);
  }

  return list
    .filter((entry) => entry.dir === 1 || entry.dir === -1)
    .map((entry) => {
      const sourceId = entry.id ?? nameToId.get(entry.name) ?? entry.name;
      return { id: String(sourceId), desc: entry.dir === -1 };
    })
    .filter((entry) => entry.id.length > 0);
}

function createValueGetter(path: string): (data: unknown) => unknown {
  if (!path) return (data) => data;

  const segments = path.split(".");
  if (segments.length === 1) {
    return (data) => {
      if (data == null || typeof data !== "object") return undefined;
      return (data as Record<string, unknown>)[path];
    };
  }

  return (data) => {
    let value = data;
    for (const segment of segments) {
      if (value == null || typeof value !== "object") return undefined;
      value = (value as Record<string, unknown>)[segment];
    }
    return value;
  };
}

function numberComparator(value1: unknown, value2: unknown): number {
  const first = Number(value1);
  const second = Number(value2);
  const firstIsFinite = Number.isFinite(first);
  const secondIsFinite = Number.isFinite(second);

  if (firstIsFinite && secondIsFinite) return first - second;
  if (firstIsFinite) return -1;
  if (secondIsFinite) return 1;
  return 0;
}

function stringComparator(value1: unknown, value2: unknown): number {
  const first = typeof value1 === "string" ? value1 : String(value1);
  const second = typeof value2 === "string" ? value2 : String(value2);
  return first.localeCompare(second);
}

function dateComparator(value1: unknown, value2: unknown): number {
  const first = value1 instanceof Date ? value1.getTime() : Number(value1);
  const second = value2 instanceof Date ? value2.getTime() : Number(value2);
  return first - second;
}

function resolveComparator(options: {
  column: TypeColumn | undefined;
  sortInfo: TypeSingleSortInfo;
  sortFunctions: TypeSortFunctions | undefined;
}): NonNullable<TypeSingleSortInfo["fn"]> {
  const { column, sortInfo, sortFunctions } = options;

  if (column?.sort) {
    return (value1, value2, data1, data2, effectiveSortInfo) =>
      column.sort!(value1, value2, column, data1, data2, effectiveSortInfo);
  }

  if (sortInfo.fn) return sortInfo.fn;

  const type = column?.type ?? sortInfo.type;
  const registered = type == null ? undefined : sortFunctions?.[type];
  if (registered) {
    const comparatorColumn = column ?? { name: sortInfo.name };
    return (value1, value2) => registered(value1, value2, comparatorColumn);
  }

  if (type === "number") return numberComparator;
  if (type === "date") return dateComparator;
  return stringComparator;
}

function enrichSortInfo(
  sortInfo: TypeSingleSortInfo,
  column: TypeColumn | undefined
): TypeSingleSortInfo {
  if (!column) return sortInfo;

  return {
    ...sortInfo,
    id: sortInfo.id ?? getColumnId(column),
    name: typeof column.sortName === "string" ? column.sortName : sortInfo.name,
    columnName: getColumnName(column),
    type: column.type ?? sortInfo.type,
  };
}

/**
 * Sort a complete local snapshot using Inovua's descriptor/comparator model.
 * Function-backed sources remain authoritative and receive sortInfo instead.
 */
export function applyLocalSort<Row>(
  data: Row[],
  sortInfo: TypeSortInfo,
  columns: readonly TypeColumn[] = [],
  sortFunctions?: TypeSortFunctions
): Row[] {
  const list = sortInfoList(sortInfo).filter(
    (entry) => entry.dir === 1 || entry.dir === -1
  );
  if (list.length === 0) return data;

  const descriptors = list.map((entry) => {
    const column = findColumn(entry, columns);
    const effectiveSortInfo = enrichSortInfo(entry, column);

    return {
      column,
      sortInfo: effectiveSortInfo,
      getValue: createValueGetter(effectiveSortInfo.name),
      comparator: resolveComparator({
        column,
        sortInfo: effectiveSortInfo,
        sortFunctions,
      }),
    };
  });

  const sorted = [...data];
  sorted.sort((data1, data2) => {
    for (const descriptor of descriptors) {
      const { sortInfo: effectiveSortInfo, comparator, getValue } = descriptor;
      const value1 = getValue(data1);
      const value2 = getValue(data2);
      const rawResult = comparator(
        value1,
        value2,
        data1,
        data2,
        effectiveSortInfo
      );
      const result = Number(rawResult);

      if (Number.isFinite(result) && result !== 0) {
        return effectiveSortInfo.dir === -1 ? -result : result;
      }
    }

    return 0;
  });

  return sorted;
}
