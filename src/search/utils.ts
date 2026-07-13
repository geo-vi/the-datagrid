import type { TypeColumn } from "../types";
import type { DataGridSearchIndex } from "../grid/utils/search";
import { getCoreSearchRuntime } from "./runtime";

const SEARCH_INDEX_CACHE = new WeakMap<
  readonly unknown[],
  WeakMap<readonly TypeColumn[], DataGridSearchIndex<unknown>>
>();

export function getCachedRDGSearchIndex(
  rows: readonly unknown[],
  columns: readonly TypeColumn[]
): DataGridSearchIndex<unknown> {
  let indexesByColumns = SEARCH_INDEX_CACHE.get(rows);

  if (!indexesByColumns) {
    indexesByColumns = new WeakMap();
    SEARCH_INDEX_CACHE.set(rows, indexesByColumns);
  }

  let index = indexesByColumns.get(columns);

  if (!index) {
    index = getCoreSearchRuntime().buildIndex(rows, columns);
    indexesByColumns.set(columns, index);
  }

  return index;
}

export function filterRDGSearchIndex(
  index: DataGridSearchIndex<unknown>,
  query: string
): unknown[] {
  return getCoreSearchRuntime().filterIndex(index, query);
}
