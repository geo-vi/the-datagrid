const COMBINING_MARKS = /[\u0300-\u036f]/g;

export type MobileSearchColumn = {
  id: string;
  aliases: readonly string[];
};

export type ParsedMobileSearchQuery = {
  columnIds: string[];
  prefixEnd: number | null;
  searchQuery: string;
};

export function normalizeMobileSearchText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(COMBINING_MARKS, "")
    .toLocaleLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function buildMobileSearchText(value: unknown): string {
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
    if (current instanceof Date) {
      output.push(current.toISOString());
      return;
    }
    if (typeof current !== "object" || ReactIsElement(current)) return;
    if (visited.has(current)) return;
    visited.add(current);

    const values = Array.isArray(current)
      ? current
      : Object.values(current as Record<string, unknown>);
    values.slice(0, 64).forEach((entry) => visit(entry, depth + 1));
  };

  visit(value, 0);
  return normalizeMobileSearchText(output.join(" "));
}

export function parseMobileSearchQuery(
  query: string,
  columns: readonly MobileSearchColumn[]
): ParsedMobileSearchQuery {
  let colonIndex = query.indexOf(":");
  let match: ParsedMobileSearchQuery | null = null;

  while (colonIndex >= 0) {
    const requestedAlias = normalizeMobileSearchText(
      query.slice(0, colonIndex)
    );

    if (requestedAlias) {
      const columnIds = Array.from(
        new Set(
          columns
            .filter((column) =>
              column.aliases.some(
                (alias) => normalizeMobileSearchText(alias) === requestedAlias
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

export function tokenizeMobileSearchQuery(query: string): string[] {
  return normalizeMobileSearchText(query).split(" ").filter(Boolean);
}

export function matchesMobileSearchTokens(
  searchText: string,
  tokens: readonly string[]
): boolean {
  return (
    tokens.length === 0 || tokens.every((token) => searchText.includes(token))
  );
}

function ReactIsElement(value: object): boolean {
  return "$$typeof" in value && "props" in value;
}

export function matchesMobileSearch(
  searchText: string,
  query: string
): boolean {
  return matchesMobileSearchTokens(
    searchText,
    tokenizeMobileSearchQuery(query)
  );
}
