export const RDG_SEARCH_TARGET_MARKER = Symbol.for(
  "@geovi/the-datagrid/search-target"
);

export function isMarkedGridType(type: unknown): boolean {
  if ((typeof type !== "function" && typeof type !== "object") || !type) {
    return false;
  }

  return (
    (type as Record<PropertyKey, unknown>)[RDG_SEARCH_TARGET_MARKER] === true
  );
}
