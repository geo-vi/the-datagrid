import ReactDataGrid from "../main";
import type { DataGridSearchRuntime } from "../grid/searchRuntime";

const DATA_GRID_SEARCH_RUNTIME_SYMBOL = Symbol.for(
  "@geovi/the-datagrid/search-runtime"
);

let runtime: DataGridSearchRuntime | undefined;

export function getCoreSearchRuntime(): DataGridSearchRuntime {
  if (runtime) return runtime;

  const candidate = (ReactDataGrid as unknown as Record<PropertyKey, unknown>)[
    DATA_GRID_SEARCH_RUNTIME_SYMBOL
  ];

  if (!candidate) {
    throw new Error(
      "The optional search entry requires a matching the-datagrid core runtime."
    );
  }

  runtime = candidate as DataGridSearchRuntime;
  return runtime;
}
