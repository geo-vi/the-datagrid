import ReactDataGrid from "../main";

const RDG_GRID_TARGET_MARKER = Symbol.for("@geovi/the-datagrid/toolbar-target");

export function isMarkedGridType(type: unknown): boolean {
  if ((typeof type !== "function" && typeof type !== "object") || !type) {
    return false;
  }

  return (
    type === ReactDataGrid ||
    (type as Record<PropertyKey, unknown>)[RDG_GRID_TARGET_MARKER] === true
  );
}
