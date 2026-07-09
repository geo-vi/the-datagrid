const COMBINING_MARKS = /[\u0300-\u036f]/g;

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

function ReactIsElement(value: object): boolean {
  return "$$typeof" in value && "props" in value;
}

export function matchesMobileSearch(
  searchText: string,
  query: string
): boolean {
  const tokens = normalizeMobileSearchText(query).split(" ").filter(Boolean);
  return (
    tokens.length === 0 || tokens.every((token) => searchText.includes(token))
  );
}
