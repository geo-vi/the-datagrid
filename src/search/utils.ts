import type { TypeColumn } from "../types";

const COMBINING_MARKS = /[\u0300-\u036f]/g;

type SearchColumn = {
  aliases: string[];
  column: TypeColumn;
  id: string;
};

type SearchIndexEntry = {
  columnText: string[];
  row: unknown;
};

export type RDGSearchIndex = {
  columns: SearchColumn[];
  entries: SearchIndexEntry[];
};

const SEARCH_INDEX_CACHE = new WeakMap<
  readonly unknown[],
  WeakMap<readonly TypeColumn[], RDGSearchIndex>
>();

function normalizeText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(COMBINING_MARKS, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function columnId(column: TypeColumn): string {
  const value = column.id ?? column.name;
  return value == null ? "" : String(value);
}

function isReactElementLike(value: object): boolean {
  return "$$typeof" in value && "props" in value;
}

function searchableText(value: unknown): string {
  const output: string[] = [];
  const visited = new WeakSet<object>();

  const visit = (current: unknown, depth: number) => {
    if (current == null || output.length >= 128 || depth > 4) return;

    if (
      typeof current === "string" ||
      typeof current === "number" ||
      typeof current === "boolean" ||
      typeof current === "bigint"
    ) {
      output.push(String(current));
      return;
    }

    if (typeof current !== "object") return;

    try {
      if (current instanceof Date) {
        output.push(
          Number.isFinite(current.getTime())
            ? current.toISOString()
            : String(current)
        );
        return;
      }

      if (isReactElementLike(current) || visited.has(current)) return;
      visited.add(current);

      const values = Array.isArray(current)
        ? current
        : Object.values(current as Record<string, unknown>);
      values.slice(0, 64).forEach((entry) => visit(entry, depth + 1));
    } catch {
      // Proxies and property getters can throw. One opaque cell value should
      // not make the entire grid search unavailable.
    }
  };

  visit(value, 0);
  return normalizeText(output.join(" "));
}

function searchColumns(columns: readonly TypeColumn[]): SearchColumn[] {
  return columns
    .filter((column) => column.searchable !== false)
    .map((column) => {
      const id = columnId(column);
      const aliases = [
        id,
        typeof column.name === "string" ? column.name : "",
        typeof column.header === "string" ? column.header : "",
        ...(column.searchAliases ?? []),
      ]
        .map((alias) => normalizeText(String(alias)))
        .filter(Boolean);

      return {
        aliases: Array.from(new Set(aliases)),
        column,
        id,
      };
    })
    .filter((column) => column.id.length > 0);
}

function valueForColumn(row: unknown, searchColumn: SearchColumn): unknown {
  const { column, id } = searchColumn;

  try {
    if (typeof column.searchValue === "function") {
      return column.searchValue(row);
    }

    if (typeof row !== "object" || row == null) return undefined;
    return (row as Record<string, unknown>)[id];
  } catch {
    return undefined;
  }
}

export function buildRDGSearchIndex(
  rows: readonly unknown[],
  columns: readonly TypeColumn[]
): RDGSearchIndex {
  const indexedColumns = searchColumns(columns);

  return {
    columns: indexedColumns,
    entries: rows.map((row) => ({
      row,
      columnText: indexedColumns.map((column) =>
        searchableText(valueForColumn(row, column))
      ),
    })),
  };
}

export function getCachedRDGSearchIndex(
  rows: readonly unknown[],
  columns: readonly TypeColumn[]
): RDGSearchIndex {
  let indexesByColumns = SEARCH_INDEX_CACHE.get(rows);

  if (!indexesByColumns) {
    indexesByColumns = new WeakMap();
    SEARCH_INDEX_CACHE.set(rows, indexesByColumns);
  }

  let index = indexesByColumns.get(columns);

  if (!index) {
    index = buildRDGSearchIndex(rows, columns);
    indexesByColumns.set(columns, index);
  }

  return index;
}

function parseQuery(query: string, columns: readonly SearchColumn[]) {
  let searchQuery = query;
  let scopedColumnIndexes: number[] | null = null;
  let colonIndex = query.indexOf(":");

  // The last recognized prefix wins. Values can therefore still contain a
  // colon without accidentally becoming a scope expression.
  while (colonIndex >= 0) {
    const requestedAlias = normalizeText(query.slice(0, colonIndex));
    const matches = columns.flatMap((column, index) =>
      column.aliases.includes(requestedAlias) ? [index] : []
    );

    if (requestedAlias && matches.length > 0) {
      scopedColumnIndexes = matches;
      searchQuery = query.slice(colonIndex + 1);
    }

    colonIndex = query.indexOf(":", colonIndex + 1);
  }

  return {
    scopedColumnIndexes,
    tokens: normalizeText(searchQuery).split(" ").filter(Boolean),
  };
}

export function filterRDGSearchIndex(
  index: RDGSearchIndex,
  query: string
): unknown[] {
  const { scopedColumnIndexes, tokens } = parseQuery(query, index.columns);
  if (tokens.length === 0) return index.entries.map((entry) => entry.row);

  return index.entries
    .filter((entry) => {
      const candidateText = scopedColumnIndexes
        ? scopedColumnIndexes.map(
            (columnIndex) => entry.columnText[columnIndex] ?? ""
          )
        : entry.columnText;

      return tokens.every((token) =>
        candidateText.some((text) => text.includes(token))
      );
    })
    .map((entry) => entry.row);
}
