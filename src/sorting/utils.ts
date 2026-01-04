import type { TypeSortInfo, TypeSingleSortInfo, TypeColumn } from "../types";
import type { SortingState } from "@tanstack/react-table";
import { getColumnSortName, getColumnId } from "../utils/column";

// sortIcon is moved to ReactDataGrid.tsx to avoid JSX in .ts file

export function getSortDir(sortInfo: TypeSortInfo, sortName: string): 0 | 1 | -1 {
  if (!sortInfo) return 0;
  const list = Array.isArray(sortInfo) ? sortInfo : [sortInfo];
  const found = list.find((s) => s.name === sortName);
  return (found?.dir ?? 0) as 0 | 1 | -1;
}

export function toggleSortInfo(opts: {
  sortInfo: TypeSortInfo;
  col: TypeColumn;
  allowUnsort: boolean;
  defaultDir: 1 | -1;
  multi: boolean;
}): TypeSortInfo {
  const { sortInfo, col, allowUnsort, defaultDir, multi } = opts;
  const name = getColumnSortName(col);

  const list = sortInfo ? (Array.isArray(sortInfo) ? [...sortInfo] : [sortInfo]) : [];
  const idx = list.findIndex((s) => s.name === name);
  const currentDir = idx >= 0 ? list[idx]!.dir : 0;

  let nextDir: 1 | -1 | 0 = 0;
  if (currentDir === 0) nextDir = defaultDir;
  else if (currentDir === defaultDir) nextDir = (defaultDir === 1 ? -1 : 1) as 1 | -1;
  else if (currentDir === (defaultDir === 1 ? -1 : 1)) nextDir = allowUnsort ? 0 : defaultDir;
  else nextDir = defaultDir;

  if (!multi) {
    return nextDir === 0 ? null : ({ name, dir: nextDir } satisfies TypeSingleSortInfo);
  }

  // multi-sort (shift)
  const nextList = list.filter((s) => s.name !== name);
  if (nextDir !== 0) nextList.push({ name, dir: nextDir });
  return nextList.length ? nextList : null;
}

export function toTanstackSorting(sortInfo: TypeSortInfo, columns: TypeColumn[]): SortingState {
  if (!sortInfo) return [];
  const list = Array.isArray(sortInfo) ? sortInfo : [sortInfo];

  // map Inovua sort "name" to our column id (best-effort)
  const nameToId = new Map<string, string>();
  for (const c of columns) {
    nameToId.set(getColumnSortName(c), getColumnId(c));
  }

  return list
    .map((s) => {
      const id = nameToId.get(s.name) ?? s.name;
      return { id, desc: s.dir === -1 };
    })
    .filter((x) => typeof x.id === "string" && x.id.length > 0);
}

/**
 * Local sorting for array dataSource.
 * Uses columns to map sortInfo.name -> column id where possible.
 */
export function applyLocalSort(data: any[], sortInfo: TypeSortInfo, columns?: TypeColumn[]): any[] {
  if (!sortInfo) return data;
  const list = Array.isArray(sortInfo) ? sortInfo : [sortInfo];
  if (list.length === 0) return data;

  const nameToId = new Map<string, string>();
  if (columns) {
    for (const c of columns) nameToId.set(getColumnSortName(c), getColumnId(c));
  }

  const sorted = [...data];
  sorted.sort((a, b) => {
    for (const s of list) {
      const key = nameToId.get(s.name) ?? s.name;

      const av = (a as any)?.[key];
      const bv = (b as any)?.[key];

      // numeric compare if both look numeric
      const an = typeof av === "number" ? av : Number(av);
      const bn = typeof bv === "number" ? bv : Number(bv);
      const bothNumeric = Number.isFinite(an) && Number.isFinite(bn);

      let cmp = 0;
      if (bothNumeric) cmp = an - bn;
      else
        cmp = String(av ?? "").localeCompare(String(bv ?? ""), undefined, {
          sensitivity: "base",
        });

      if (cmp !== 0) return s.dir === -1 ? -cmp : cmp;
    }
    return 0;
  });

  return sorted;
}
