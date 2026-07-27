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

function toInovuaString(v: unknown): string {
  return String(v || "");
}

function tokenizeContainsOr(q: string): string[] {
  return q
    .split(/[\s,;]+/g)
    .map((t) => t.trim())
    .filter(Boolean);
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
          const v = toInovuaString(value).toLowerCase();
          const q = toInovuaString(filterValue).toLowerCase();
          return !q ? true : v.includes(q);
        },
      }),
      op({
        name: "notContains",
        fn: ({ value, filterValue }) => {
          const v = toInovuaString(value).toLowerCase();
          const q = toInovuaString(filterValue).toLowerCase();
          return !q ? true : !v.includes(q);
        },
      }),
      op({
        // project-specific (used in your samples)
        name: "containsOr",
        fn: ({ value, filterValue }) => {
          const v = toInovuaString(value).toLowerCase();
          const q = toInovuaString(filterValue).toLowerCase();
          const tokens = tokenizeContainsOr(q);
          if (tokens.length === 0) return true;
          return tokens.some((t) => v.includes(t));
        },
      }),
      op({
        name: "eq",
        fn: ({ value, filterValue }) => {
          const v = toInovuaString(value).toLowerCase();
          const q = toInovuaString(filterValue).toLowerCase();
          return !q ? true : v === q;
        },
      }),
      op({
        name: "neq",
        fn: ({ value, filterValue }) => {
          const v = toInovuaString(value).toLowerCase();
          const q = toInovuaString(filterValue).toLowerCase();
          return !q ? true : v !== q;
        },
      }),
      op({
        name: "empty",
        fn: ({ value }) => value === "",
        filterOnEmptyValue: true,
        valueOnOperatorSelect: "",
        disableFilterEditor: true,
      }),
      op({
        name: "notEmpty",
        fn: ({ value }) => value !== "",
        filterOnEmptyValue: true,
        valueOnOperatorSelect: "",
        disableFilterEditor: true,
      }),
      op({
        name: "startsWith",
        fn: ({ value, filterValue }) => {
          const v = toInovuaString(value).toLowerCase();
          const q = toInovuaString(filterValue).toLowerCase();
          return !q ? true : v.startsWith(q);
        },
      }),
      op({
        name: "endsWith",
        fn: ({ value, filterValue }) => {
          const v = toInovuaString(value).toLowerCase();
          const q = toInovuaString(filterValue).toLowerCase();
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
          const list = filterValue as {
            length?: number;
            indexOf?: (item: unknown) => number;
          };
          if (!list.length) return true;
          return typeof list.indexOf === "function"
            ? list.indexOf(value) !== -1
            : true;
        },
      }),
      op({
        name: "notinlist",
        fn: ({ value, filterValue }) => {
          if (filterValue == null) return true;
          const list = filterValue as {
            length?: number;
            indexOf?: (item: unknown) => number;
          };
          if (!list.length) return true;
          return typeof list.indexOf === "function"
            ? list.indexOf(value) === -1
            : true;
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
        fn: ({ value, filterValue }) =>
          filterValue != null
            ? (value as number) > (filterValue as number)
            : true,
      }),
      op({
        name: "gte",
        fn: ({ value, filterValue }) =>
          filterValue != null
            ? (value as number) >= (filterValue as number)
            : true,
      }),
      op({
        name: "lt",
        fn: ({ value, filterValue }) =>
          filterValue != null
            ? (value as number) < (filterValue as number)
            : true,
      }),
      op({
        name: "lte",
        fn: ({ value, filterValue }) =>
          filterValue != null
            ? (value as number) <= (filterValue as number)
            : true,
      }),
      op({
        name: "eq",
        fn: ({ value, filterValue, emptyValue }) =>
          filterValue !== emptyValue ? value === filterValue : true,
      }),
      op({
        name: "neq",
        fn: ({ value, filterValue, emptyValue }) =>
          filterValue !== emptyValue ? value !== filterValue : true,
      }),
      op({
        name: "inrange",
        fn: ({ value, filterValue }) => {
          const { start, end } = getRangeParts(filterValue);
          const hasStart = start != null && start !== "";
          const hasEnd = end != null && end !== "";

          if (hasStart && hasEnd) {
            return (
              (value as number) >= (start as number) &&
              (value as number) <= (end as number)
            );
          }
          if (hasStart) return (value as number) >= (start as number);
          if (hasEnd) return (value as number) <= (end as number);
          return true;
        },
      }),
      op({
        name: "notinrange",
        fn: ({ value, filterValue }) => {
          const { start, end } = getRangeParts(filterValue);
          const hasStart = start != null && start !== "";
          const hasEnd = end != null && end !== "";

          if (hasStart && hasEnd) {
            return (
              (value as number) < (start as number) ||
              (value as number) > (end as number)
            );
          }
          if (hasStart) return (value as number) < (start as number);
          if (hasEnd) return (value as number) > (end as number);
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

export function isFilterEntryEmptyValue(
  entry: TypeSingleFilterValue,
  customFilterTypes?: TypeFilterTypes
): boolean {
  const typeDef = getTypeDef(customFilterTypes, entry.type);
  const emptyValue =
    entry.emptyValue !== undefined ? entry.emptyValue : typeDef.emptyValue;
  return entry.value === emptyValue;
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
  if (filter.active === false) return false;
  if (!opDef && typeof filter.fn !== "function") return false;

  const emptyValue =
    filter.emptyValue !== undefined ? filter.emptyValue : typeDef.emptyValue;
  const isEmptyValue = filter.value === emptyValue;

  return (
    !isEmptyValue ||
    Boolean(opDef?.filterOnEmptyValue) ||
    Boolean(opDef?.disableFilterEditor)
  );
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
 * Upsert without removing a descriptor on empty.
 *
 * Empty values make ordinary predicates no-ops; only an explicit `active`
 * boolean changes whether the descriptor itself is enabled.
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

  // `active` is an explicit enable/disable switch in Inovua. A value update
  // with an omitted/undefined flag must not accidentally re-enable or disable
  // an existing descriptor.
  if (entry.active === undefined) {
    merged.active = existing?.active;
  }

  const typeDef = getTypeDef(opts?.filterTypes, merged.type);
  const emptyValue =
    merged.emptyValue !== undefined ? merged.emptyValue : typeDef.emptyValue;
  merged.emptyValue = emptyValue;

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
      // Inovua's clearColumnFilter changes only the value. Empty values make
      // the predicate a no-op, but they do not change filter activation.
      active: existing.active,
    },
    opts
  );
}

export function clearAllFilters(
  filterValue: TypeFilterValue,
  opts?: { filterTypes?: TypeFilterTypes }
): TypeFilterValue {
  if (!filterValue?.length) return null;

  return filterValue.reduce<TypeFilterValue>(
    (next, entry) => clearFilter(next, entry.name, opts),
    filterValue
  );
}

/**
 * Projects public filter descriptors through their columns before local
 * evaluation or a remote dataSource call.
 *
 * This mirrors Inovua's `getFilterValueForColumns`: the descriptor keeps its
 * identity and operator/value state while inheriting the column's filter type,
 * alias and value getter.
 */
export function resolveFilterValueForColumns(
  filterValue: TypeFilterValue,
  columns: TypeColumn[] = []
): TypeFilterValue {
  if (!filterValue?.length) return filterValue ?? null;

  const columnsMap = new Map<string, TypeColumn>();
  for (const column of columns) {
    const id = getColumnId(column);
    columnsMap.set(id, column);
    if (typeof column.name === "string") columnsMap.set(column.name, column);
  }

  return filterValue.map((filter) => {
    const column = columnsMap.get(filter.name);
    const next: TypeSingleFilterValue = { ...filter };
    const columnType =
      typeof column?.filterType === "string"
        ? column.filterType
        : typeof column?.type === "string"
          ? column.type
          : undefined;

    if (!next.type && columnType) next.type = columnType;
    if (!next.operator) {
      if (next.type === "number") next.operator = "gte";
      else if (next.type === "select") next.operator = "eq";
      else if (next.type === "bool" || next.type === "boolean")
        next.operator = "eq";
      else if (next.type === "date" || next.type === "time")
        next.operator = "afterOrOn";
      else next.operator = "contains";
    }
    if (typeof column?.getFilterValue === "function") {
      next.getFilterValue = column.getFilterValue;
    }
    if (typeof column?.filterName === "string") {
      next.name = column.filterName;
    }

    return next;
  });
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
  const projectedFilterValue = resolveFilterValueForColumns(
    filterValue,
    opts?.columns
  );

  const columnsMap: Record<string, TypeColumn> = {};
  for (const c of opts?.columns ?? []) {
    const id = getColumnId(c);
    columnsMap[id] = c;
    if (typeof c.name === "string") columnsMap[c.name] = c;
    if (typeof c.filterName === "string") columnsMap[c.filterName] = c;
  }

  return data.filter((row) => {
    return (projectedFilterValue ?? []).every((f) => {
      const typeDef = allTypes[f.type] ?? allTypes.string!;
      const opDef = getOperatorDef(typeDef, f.operator);

      if (!isRunnableFilterEntry(f, allTypes)) return true;

      const column = columnsMap[f.name];
      const resolvedName =
        typeof column?.filterName === "string" ? column.filterName : f.name;
      const rawValue = (row as any)?.[resolvedName];
      const raw =
        typeof f.getFilterValue === "function"
          ? f.getFilterValue({ data: row, value: rawValue })
          : typeof column?.getFilterValue === "function"
            ? column.getFilterValue({ data: row, value: rawValue })
            : rawValue;

      const fn =
        (typeof f.fn === "function" ? f.fn : opDef?.fn) ??
        allTypes.string!.operators.find((o) => o.name === "contains")!.fn;

      return (
        fn({
          value: raw,
          filterValue: f.value,
          emptyValue: f.emptyValue ?? typeDef.emptyValue,
          data: row,
          _data: row,
          column,
        }) === true
      );
    });
  });
}
