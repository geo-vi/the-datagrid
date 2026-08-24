import ReactDataGrid from "../main";
import type { DataGridMenuRuntime } from "../grid/menuRuntime";

const RDG_GRID_TARGET_MARKER = Symbol.for("@geovi/the-datagrid/toolbar-target");
const DATA_GRID_MENU_RUNTIME_SYMBOL = Symbol.for(
  "@geovi/the-datagrid/menu-runtime"
);

export function isMarkedGridType(type: unknown): boolean {
  if ((typeof type !== "function" && typeof type !== "object") || !type) {
    return false;
  }

  return (
    type === ReactDataGrid ||
    (type as Record<PropertyKey, unknown>)[RDG_GRID_TARGET_MARKER] === true
  );
}

let menuRuntime: DataGridMenuRuntime | undefined;

/**
 * The core's dropdown menu. `../main` is the one import this entry externalizes,
 * so the parts arrive from the runtime the consumer already loaded rather than
 * as a second copy of Radix inside this bundle.
 */
export function getCoreMenuRuntime(): DataGridMenuRuntime {
  if (menuRuntime) return menuRuntime;

  const candidate = (ReactDataGrid as unknown as Record<PropertyKey, unknown>)[
    DATA_GRID_MENU_RUNTIME_SYMBOL
  ];

  if (!candidate) {
    throw new Error(
      "The optional toolbar entry requires a matching the-datagrid core runtime."
    );
  }

  menuRuntime = candidate as DataGridMenuRuntime;
  return menuRuntime;
}
