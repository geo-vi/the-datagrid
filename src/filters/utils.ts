import type {
  TypeColumn,
  TypeFilterOperator,
  TypeFilterTypes,
  TypeFilterType,
  TypeFilterValue,
  TypeSingleFilterValue,
} from "../types";
import { getColumnId } from "../utils/column";

type AnyRecord = Record<string, any>;

function isRecord(v: unknown): v is AnyRecord {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function toStringSafe(v: unknown): string {
  if (v == null) return "";
  return String(v);
}

function tokenizeContainsOr(q: string): string[] {
  return q
    .split(/[\s,;]+/g)
    .map((t) => t.trim())
    .filter(Boolean);
}

function toNumberSafe(v: unknown): number {
  if (typeof v === "number") return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : Number.NaN;
}

function getRangeParts(filterValue: unknown): { start: unknown; end: unknown } {
  if (filterValue == null) return { start: undefined, end: undefined };

  if (Array.isArray(filterValue)) {
    return { start: filterValue[0], end: filterValue[1] };
  }

  if (isRecord(filterValue)) {
    return { start: filterValue.start, end: filterValue.end };
  }

  return { start: undefined, end: undefined };
}

/**
 * Treat "range" objects/arrays as empty only when BOTH endpoints are empty.
 */
function isEmptyLike(v: unknown): boolean {
  if (v == null) return true;

  if (typeof v === "string") return v.trim().length === 0;

  if (Array.isArray(v)) {
    if (v.length === 0) return true;
    if (v.length === 2) return isEmptyLike(v[0]) && isEmptyLike(v[1]);
    return false;
  }

  if (isRecord(v) && ("start" in v || "end" in v)) {
    return isEmptyLike((v as any).start) && isEmptyLike((v as any).end);
  }

  return false;
}

/** Optional moment support (mirrors Inovua behavior, but without hard dependency). */
function getMoment(): any | null {
  const m = (globalThis as any)?.moment;
  return typeof m === "function" ? m : null;
}

function toDateMs(
  value: unknown,
  opts?: {
    dateFormat?: string;
    /**
     * If true, normalize row values to dateFormat (Inovua does this).
     */
    normalizeToFormat?: boolean;
  }
): number {
  const dateFormat = opts?.dateFormat;
  const normalizeToFormat = opts?.normalizeToFormat ?? false;

  if (value == null || value === "") return Number.NaN;

  if (value instanceof Date) {
    const ms = value.getTime();
    return Number.isFinite(ms) ? ms : Number.NaN;
  }

  if (typeof value === "number") return value;

  const s = String(value);

  const moment = getMoment();
  if (moment && dateFormat) {
    try {
      if (normalizeToFormat) {
        const normalized = moment(s).format(dateFormat);
        const ms = moment(normalized, dateFormat).valueOf();
        return Number.isFinite(ms) ? ms : Number.NaN;
      }
      const ms = moment(s, dateFormat).valueOf();
      return Number.isFinite(ms) ? ms : Number.NaN;
    } catch {
      // fall through
    }
  }

  const ms = Date.parse(s);
  return Number.isFinite(ms) ? ms : Number.NaN;
}

const op = (o: TypeFilterOperator) => o;

/**
 * Default filter types (Inovua-inspired), plus project-specific `containsOr`.
 */
export const DEFAULT_FILTER_TYPES: TypeFilterTypes = {
  string: {
    type: "string",
    emptyValue: "",
    operators: [
      op({
        name: "contains",
        fn: ({ value, filterValue }) => {
          const v = toStringSafe(value).toLowerCase();
          const q = toStringSafe(filterValue).toLowerCase();
          return !q ? true : v.includes(q);
        },
      }),
      op({
        name: "notContains",
        fn: ({ value, filterValue }) => {
          const v = toStringSafe(value).toLowerCase();
          const q = toStringSafe(filterValue).toLowerCase();
          return !q ? true : !v.includes(q);
        },
      }),
      op({
        // project-specific (used in your samples)
        name: "containsOr",
        fn: ({ value, filterValue }) => {
          const v = toStringSafe(value).toLowerCase();
          const q = toStringSafe(filterValue).toLowerCase();
          const tokens = tokenizeContainsOr(q);
          if (tokens.length === 0) return true;
          return tokens.some((t) => v.includes(t));
        },
      }),
      op({
        name: "eq",
        fn: ({ value, filterValue }) => {
          const v = toStringSafe(value).toLowerCase();
          const q = toStringSafe(filterValue).toLowerCase();
          return !q ? true : v === q;
        },
      }),
      op({
        name: "neq",
        fn: ({ value, filterValue }) => {
          const v = toStringSafe(value).toLowerCase();
          const q = toStringSafe(filterValue).toLowerCase();
          return !q ? true : v !== q;
        },
      }),
      op({
        name: "empty",
        fn: ({ value }) => toStringSafe(value) === "",
        filterOnEmptyValue: true,
        valueOnOperatorSelect: "",
        disableFilterEditor: true,
      }),
      op({
        name: "notEmpty",
        fn: ({ value }) => toStringSafe(value) !== "",
        filterOnEmptyValue: true,
        valueOnOperatorSelect: "",
        disableFilterEditor: true,
      }),
      op({
        name: "startsWith",
        fn: ({ value, filterValue }) => {
          const v = toStringSafe(value).toLowerCase();
          const q = toStringSafe(filterValue).toLowerCase();
          return !q ? true : v.startsWith(q);
        },
      }),
      op({
        name: "endsWith",
        fn: ({ value, filterValue }) => {
          const v = toStringSafe(value).toLowerCase();
          const q = toStringSafe(filterValue).toLowerCase();
          return !q ? true : v.endsWith(q);
        },
      }),
    ],
  },

  select: {
    type: "select",
    emptyValue: null,
    operators: [
      op({
        name: "inlist",
        fn: ({ value, filterValue }) => {
          if (filterValue == null) return true;
          const list = Array.isArray(filterValue) ? filterValue : [filterValue];
          if (!list.length) return true;
          return list.some((x) => x === value);
        },
      }),
      op({
        name: "notinlist",
        fn: ({ value, filterValue }) => {
          if (filterValue == null) return true;
          const list = Array.isArray(filterValue) ? filterValue : [filterValue];
          if (!list.length) return true;
          return !list.some((x) => x === value);
        },
      }),
      op({
        name: "eq",
        fn: ({ value, filterValue, emptyValue }) => {
          return filterValue !== emptyValue ? filterValue === value : true;
        },
      }),
      op({
        name: "neq",
        fn: ({ value, filterValue, emptyValue }) => {
          return filterValue !== emptyValue ? filterValue !== value : true;
        },
      }),
    ],
  },

  bool: {
    type: "bool",
    emptyValue: null,
    operators: [
      op({
        name: "eq",
        fn: ({ value, filterValue }) =>
          filterValue != null ? filterValue === value : true,
      }),
      op({
        name: "neq",
        fn: ({ value, filterValue }) =>
          filterValue != null ? filterValue !== value : true,
      }),
    ],
  },

  boolean: {
    type: "boolean",
    emptyValue: null,
    operators: [
      op({
        name: "eq",
        fn: ({ value, filterValue }) =>
          filterValue != null ? filterValue === value : true,
      }),
      op({
        name: "neq",
        fn: ({ value, filterValue }) =>
          filterValue != null ? filterValue !== value : true,
      }),
    ],
  },

  number: {
    type: "number",
    emptyValue: null,
    operators: [
      op({
        name: "gt",
        fn: ({ value, filterValue }) => {
          const fv = toNumberSafe(filterValue);
          if (!Number.isFinite(fv)) return true;
          const v = toNumberSafe(value);
          return Number.isFinite(v) ? v > fv : false;
        },
      }),
      op({
        name: "gte",
        fn: ({ value, filterValue }) => {
          const fv = toNumberSafe(filterValue);
          if (!Number.isFinite(fv)) return true;
          const v = toNumberSafe(value);
          return Number.isFinite(v) ? v >= fv : false;
        },
      }),
      op({
        name: "lt",
        fn: ({ value, filterValue }) => {
          const fv = toNumberSafe(filterValue);
          if (!Number.isFinite(fv)) return true;
          const v = toNumberSafe(value);
          return Number.isFinite(v) ? v < fv : false;
        },
      }),
      op({
        name: "lte",
        fn: ({ value, filterValue }) => {
          const fv = toNumberSafe(filterValue);
          if (!Number.isFinite(fv)) return true;
          const v = toNumberSafe(value);
          return Number.isFinite(v) ? v <= fv : false;
        },
      }),
      op({
        name: "eq",
        fn: ({ value, filterValue }) => {
          const fv = toNumberSafe(filterValue);
          if (!Number.isFinite(fv)) return true;
          const v = toNumberSafe(value);
          return Number.isFinite(v) ? v === fv : false;
        },
      }),
      op({
        name: "neq",
        fn: ({ value, filterValue }) => {
          const fv = toNumberSafe(filterValue);
          if (!Number.isFinite(fv)) return true;
          const v = toNumberSafe(value);
          return Number.isFinite(v) ? v !== fv : false;
        },
      }),
      op({
        name: "inrange",
        fn: ({ value, filterValue }) => {
          const { start, end } = getRangeParts(filterValue);
          const s = toNumberSafe(start);
          const e = toNumberSafe(end);

          const v = toNumberSafe(value);
          if (!Number.isFinite(v)) return false;

          const hasS = Number.isFinite(s);
          const hasE = Number.isFinite(e);

          if (hasS && hasE) return v >= s && v <= e;
          if (hasS) return v >= s;
          if (hasE) return v <= e;
          return true;
        },
      }),
      op({
        name: "notinrange",
        fn: ({ value, filterValue }) => {
          const { start, end } = getRangeParts(filterValue);
          const s = toNumberSafe(start);
          const e = toNumberSafe(end);

          const v = toNumberSafe(value);
          if (!Number.isFinite(v)) return false;

          const hasS = Number.isFinite(s);
          const hasE = Number.isFinite(e);

          if (hasS && hasE) return v < s || v > e;
          if (hasS) return v < s;
          if (hasE) return v > e;
          return true;
        },
      }),
    ],
  },

  date: {
    type: "date",
    emptyValue: "",
    operators: [
      op({
        name: "after",
        fn: ({ value, filterValue, column }) => {
          const fmt = (column as any)?.dateFormat as string | undefined;
          const fv = toDateMs(filterValue, { dateFormat: fmt });
          if (!Number.isFinite(fv)) return true;
          const v = toDateMs(value, {
            dateFormat: fmt,
            normalizeToFormat: Boolean(fmt),
          });
          return Number.isFinite(v) ? v > fv : false;
        },
      }),
      op({
        name: "afterOrOn",
        fn: ({ value, filterValue, column }) => {
          const fmt = (column as any)?.dateFormat as string | undefined;
          const fv = toDateMs(filterValue, { dateFormat: fmt });
          if (!Number.isFinite(fv)) return true;
          const v = toDateMs(value, {
            dateFormat: fmt,
            normalizeToFormat: Boolean(fmt),
          });
          return Number.isFinite(v) ? v >= fv : false;
        },
      }),
      op({
        name: "before",
        fn: ({ value, filterValue, column }) => {
          const fmt = (column as any)?.dateFormat as string | undefined;
          const fv = toDateMs(filterValue, { dateFormat: fmt });
          if (!Number.isFinite(fv)) return true;
          const v = toDateMs(value, {
            dateFormat: fmt,
            normalizeToFormat: Boolean(fmt),
          });
          return Number.isFinite(v) ? v < fv : false;
        },
      }),
      op({
        name: "beforeOrOn",
        fn: ({ value, filterValue, column }) => {
          const fmt = (column as any)?.dateFormat as string | undefined;
          const fv = toDateMs(filterValue, { dateFormat: fmt });
          if (!Number.isFinite(fv)) return true;
          const v = toDateMs(value, {
            dateFormat: fmt,
            normalizeToFormat: Boolean(fmt),
          });
          return Number.isFinite(v) ? v <= fv : false;
        },
      }),
      op({
        name: "eq",
        fn: ({ value, filterValue, column }) => {
          const fmt = (column as any)?.dateFormat as string | undefined;
          const fv = toDateMs(filterValue, { dateFormat: fmt });
          if (!Number.isFinite(fv)) return true;
          const v = toDateMs(value, {
            dateFormat: fmt,
            normalizeToFormat: Boolean(fmt),
          });
          return Number.isFinite(v) ? v === fv : false;
        },
      }),
      op({
        name: "neq",
        fn: ({ value, filterValue, column }) => {
          const fmt = (column as any)?.dateFormat as string | undefined;
          const fv = toDateMs(filterValue, { dateFormat: fmt });
          if (!Number.isFinite(fv)) return true;
          const v = toDateMs(value, {
            dateFormat: fmt,
            normalizeToFormat: Boolean(fmt),
          });
          return Number.isFinite(v) ? v !== fv : false;
        },
      }),
      op({
        name: "inrange",
        fn: ({ value, filterValue, column }) => {
          const fmt = (column as any)?.dateFormat as string | undefined;
          const { start, end } = getRangeParts(filterValue);
          const s = toDateMs(start, { dateFormat: fmt });
          const e = toDateMs(end, { dateFormat: fmt });

          const v = toDateMs(value, {
            dateFormat: fmt,
            normalizeToFormat: Boolean(fmt),
          });
          if (!Number.isFinite(v)) return false;

          const hasS = Number.isFinite(s);
          const hasE = Number.isFinite(e);

          if (hasS && hasE) return v >= s && v <= e;
          if (hasS) return v >= s;
          if (hasE) return v <= e;
          return true;
        },
      }),
      op({
        name: "notinrange",
        fn: ({ value, filterValue, column }) => {
          const fmt = (column as any)?.dateFormat as string | undefined;
          const { start, end } = getRangeParts(filterValue);
          const s = toDateMs(start, { dateFormat: fmt });
          const e = toDateMs(end, { dateFormat: fmt });

          const v = toDateMs(value, {
            dateFormat: fmt,
            normalizeToFormat: Boolean(fmt),
          });
          if (!Number.isFinite(v)) return false;

          const hasS = Number.isFinite(s);
          const hasE = Number.isFinite(e);

          if (hasS && hasE) return v < s || v > e;
          if (hasS) return v < s;
          if (hasE) return v > e;
          return true;
        },
      }),
    ],
  },

  // time behaves like date in this implementation
  time: {
    type: "time",
    emptyValue: "",
    operators: [],
  },
};

// time operators = date operators (avoid duplicating objects)
DEFAULT_FILTER_TYPES.time.operators = DEFAULT_FILTER_TYPES.date.operators;

export const filterTypes: TypeFilterTypes = DEFAULT_FILTER_TYPES;

/** ---------- API ---------- */

export function normalizeFilterValue(
  v: TypeFilterValue | undefined
): TypeFilterValue {
  if (!v || !Array.isArray(v) || v.length === 0) return null;
  return v;
}

export function getFilterEntry(
  filterValue: TypeFilterValue,
  name: string
): TypeSingleFilterValue | undefined {
  if (!filterValue) return undefined;
  return filterValue.find((f) => f.name === name);
}

function getTypeDef(
  filterTypes: TypeFilterTypes | undefined,
  typeName: string | undefined
): TypeFilterType {
  const all = { ...DEFAULT_FILTER_TYPES, ...(filterTypes ?? {}) };
  if (typeName && all[typeName]) return all[typeName]!;
  return all.string!;
}

function getOperatorDef(
  typeDef: TypeFilterType,
  operatorName: string
): TypeFilterOperator | undefined {
  return typeDef.operators.find((o) => o.name === operatorName);
}

function isRunnableFilterEntry(
  filter: TypeSingleFilterValue,
  allTypes: TypeFilterTypes
): boolean {
  const typeDef = allTypes[filter.type] ?? allTypes.string!;
  const opDef = getOperatorDef(typeDef, filter.operator);
  const canRunWithoutValue =
    Boolean(opDef?.filterOnEmptyValue) || Boolean(opDef?.disableFilterEditor);
  const active =
    filter.active !== undefined
      ? filter.active
      : canRunWithoutValue
        ? true
        : !isEmptyLike(filter.value);

  return active && (canRunWithoutValue || !isEmptyLike(filter.value));
}

export function hasActiveLocalFilter(
  filterValue: TypeFilterValue,
  customFilterTypes?: TypeFilterTypes
): boolean {
  if (!filterValue?.length) return false;

  const allTypes = { ...DEFAULT_FILTER_TYPES, ...(customFilterTypes ?? {}) };
  return filterValue.some((filter) => isRunnableFilterEntry(filter, allTypes));
}

/**
 * Upsert WITHOUT removing entry on empty.
 * We keep the entry but mark it inactive when it’s empty (Inovua-like behavior).
 */
export function upsertFilterEntry(
  filterValue: TypeFilterValue,
  entry: TypeSingleFilterValue | null,
  opts?: { filterTypes?: TypeFilterTypes }
): TypeFilterValue {
  const current = filterValue ?? [];
  if (!entry) return current.length ? current : null;

  const idx = current.findIndex((f) => f.name === entry.name);
  const existing = idx >= 0 ? current[idx] : undefined;

  const merged: TypeSingleFilterValue = {
    ...(existing ?? {}),
    ...entry,
  };

  const typeDef = getTypeDef(opts?.filterTypes, merged.type);
  const emptyValue =
    merged.emptyValue !== undefined ? merged.emptyValue : typeDef.emptyValue;
  merged.emptyValue = emptyValue;

  const opDef = getOperatorDef(typeDef, merged.operator);

  if (merged.active === undefined) {
    const canRunWithoutValue =
      Boolean(opDef?.filterOnEmptyValue) || Boolean(opDef?.disableFilterEditor);
    merged.active = canRunWithoutValue ? true : !isEmptyLike(merged.value);
  }

  const next = [...current];
  if (idx >= 0) next[idx] = merged;
  else next.push(merged);

  return next.length ? next : null;
}

export function setFilterOperator(
  filterValue: TypeFilterValue,
  name: string,
  operator: string,
  opts?: { filterTypes?: TypeFilterTypes; type?: string }
): TypeFilterValue {
  const current = filterValue ?? [];
  const existing = current.find((f) => f.name === name);

  const typeName = opts?.type ?? existing?.type ?? "string";
  const typeDef = getTypeDef(opts?.filterTypes, typeName);
  const opDef = getOperatorDef(typeDef, operator);

  const nextEntry: TypeSingleFilterValue = {
    ...(existing ?? {}),
    name,
    type: typeName,
    operator,
    emptyValue: existing?.emptyValue ?? typeDef.emptyValue,
    value: existing?.value ?? typeDef.emptyValue,
  };

  if (opDef?.valueOnOperatorSelect !== undefined) {
    nextEntry.value = opDef.valueOnOperatorSelect;
  }

  if (opDef?.filterOnEmptyValue || opDef?.disableFilterEditor) {
    nextEntry.active = true;
    nextEntry.value = nextEntry.value ?? typeDef.emptyValue;
  }

  return upsertFilterEntry(filterValue, nextEntry, opts);
}

export function clearFilter(
  filterValue: TypeFilterValue,
  name: string,
  opts?: { filterTypes?: TypeFilterTypes }
): TypeFilterValue {
  const existing = getFilterEntry(filterValue, name);
  if (!existing) return filterValue ?? null;

  const typeDef = getTypeDef(opts?.filterTypes, existing.type);
  return upsertFilterEntry(
    filterValue,
    {
      ...existing,
      value:
        existing.emptyValue !== undefined
          ? existing.emptyValue
          : typeDef.emptyValue,
      active: false,
    },
    opts
  );
}

/**
 * Local filter (array dataSource).
 * Uses filterTypes + columnsMap so date operators can use column.dateFormat.
 */
export function applyLocalFilter(
  data: any[],
  filterValue: TypeFilterValue,
  opts?: { filterTypes?: TypeFilterTypes; columns?: TypeColumn[] }
): any[] {
  if (!filterValue || filterValue.length === 0) return data;

  const allTypes = { ...DEFAULT_FILTER_TYPES, ...(opts?.filterTypes ?? {}) };

  const columnsMap: Record<string, TypeColumn> = {};
  for (const c of opts?.columns ?? []) {
    columnsMap[getColumnId(c)] = c;
  }

  return data.filter((row) => {
    return filterValue.every((f) => {
      const typeDef = allTypes[f.type] ?? allTypes.string!;
      const opDef = getOperatorDef(typeDef, f.operator);

      if (!isRunnableFilterEntry(f, allTypes)) return true;

      const raw = (row as any)?.[f.name];

      const fn =
        opDef?.fn ??
        allTypes.string!.operators.find((o) => o.name === "contains")!.fn;

      return fn({
        value: raw,
        filterValue: f.value,
        emptyValue: f.emptyValue ?? typeDef.emptyValue,
        data: row,
        _data: row,
        column: columnsMap[f.name],
      });
    });
  });
}
