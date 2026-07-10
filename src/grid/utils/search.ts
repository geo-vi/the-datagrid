import type { TypeColumn } from "../../types";
import { getColumnId } from "../../utils/column";

const COMBINING_MARKS = /[\u0300-\u036f]/g;

export type DataGridSearchColumn = {
  aliases: string[];
  column: TypeColumn;
  id: string;
};

export type DataGridSearchIndexEntry<Row> = {
  columnText: string[];
  row: Row;
};

export type DataGridSearchIndex<Row> = {
  columns: DataGridSearchColumn[];
  entries: DataGridSearchIndexEntry<Row>[];
};

export type ParsedDataGridSearchQuery = {
  columnIds: string[];
  prefixEnd: number | null;
  searchQuery: string;
};

export function normalizeDataGridSearchText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(COMBINING_MARKS, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function isReactElementLike(value: object): boolean {
  return "$$typeof" in value && "props" in value;
}

export function buildDataGridSearchText(value: unknown): string {
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
      // Search should remain usable when a cell contains an opaque Proxy or a
      // throwing getter. Treat that one value as non-searchable.
    }
  };

  visit(value, 0);
  return normalizeDataGridSearchText(output.join(" "));
}

export function createDataGridSearchColumns(
  columns: readonly TypeColumn[]
): DataGridSearchColumn[] {
  return columns
    .filter((column) => column.searchable !== false)
    .map((column) => {
      const id = getColumnId(column);
      const aliases = [
        id,
        typeof column.id === "string" ? column.id : "",
        typeof column.name === "string" ? column.name : "",
        typeof column.header === "string" ? column.header : "",
        ...(column.searchAliases ?? []),
      ]
        .map((alias) => normalizeDataGridSearchText(String(alias)))
        .filter(Boolean);

      return {
        aliases: Array.from(new Set(aliases)),
        column,
        id,
      };
    });
}

function valueForSearchColumn(
  rowData: unknown,
  searchColumn: DataGridSearchColumn
): unknown {
  const { column, id } = searchColumn;

  try {
    if (typeof column.searchValue === "function") {
      return column.searchValue(rowData);
    }

    if (typeof rowData !== "object" || rowData == null) return undefined;
    return (rowData as Record<string, unknown>)[id];
  } catch {
    return undefined;
  }
}

export function buildDataGridSearchIndex<Row>(
  rows: readonly Row[],
  columns: readonly TypeColumn[],
  getRowData?: (row: Row) => unknown
): DataGridSearchIndex<Row> {
  const indexedColumns = createDataGridSearchColumns(columns);

  return {
    columns: indexedColumns,
    entries: rows.map((row) => {
      const rowData = getRowData ? getRowData(row) : row;

      return {
        row,
        columnText: indexedColumns.map((column) =>
          buildDataGridSearchText(valueForSearchColumn(rowData, column))
        ),
      };
    }),
  };
}

export function parseDataGridSearchQuery(
  query: string,
  columns: readonly Pick<DataGridSearchColumn, "aliases" | "id">[]
): ParsedDataGridSearchQuery {
  let colonIndex = query.indexOf(":");
  let match: ParsedDataGridSearchQuery | null = null;

  // The last recognized prefix wins, so punctuation-rich aliases such as
  // `Time: UTC` work while unrecognized colons remain ordinary query text.
  while (colonIndex >= 0) {
    const requestedAlias = normalizeDataGridSearchText(
      query.slice(0, colonIndex)
    );

    if (requestedAlias) {
      const columnIds = Array.from(
        new Set(
          columns
            .filter((column) =>
              column.aliases.some(
                (alias) => normalizeDataGridSearchText(alias) === requestedAlias
              )
            )
            .map((column) => column.id)
        )
      );

      if (columnIds.length > 0) {
        match = {
          columnIds,
          prefixEnd: colonIndex + 1,
          searchQuery: query.slice(colonIndex + 1),
        };
      }
    }

    colonIndex = query.indexOf(":", colonIndex + 1);
  }

  return (
    match ?? {
      columnIds: [],
      prefixEnd: null,
      searchQuery: query,
    }
  );
}

export function tokenizeDataGridSearchQuery(query: string): string[] {
  return normalizeDataGridSearchText(query).split(" ").filter(Boolean);
}

export function filterDataGridSearchIndex<Row>(
  index: DataGridSearchIndex<Row>,
  query: string
): Row[] {
  const parsedQuery = parseDataGridSearchQuery(query, index.columns);
  const tokens = tokenizeDataGridSearchQuery(parsedQuery.searchQuery);
  if (tokens.length === 0) return index.entries.map((entry) => entry.row);

  const scopedColumnIds =
    parsedQuery.columnIds.length > 0 ? new Set(parsedQuery.columnIds) : null;

  return index.entries
    .filter((entry) => {
      const candidateText = scopedColumnIds
        ? index.columns.flatMap((column, columnIndex) =>
            scopedColumnIds.has(column.id)
              ? [entry.columnText[columnIndex] ?? ""]
              : []
          )
        : entry.columnText;

      return tokens.every((token) =>
        candidateText.some((text) => text.includes(token))
      );
    })
    .map((entry) => entry.row);
}
