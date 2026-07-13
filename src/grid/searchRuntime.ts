import { DataGridSearchBar } from "./components/DataGridSearchBar";
import {
  buildDataGridSearchIndex,
  filterDataGridSearchIndex,
} from "./utils/search";

export const DATA_GRID_SEARCH_RUNTIME_SYMBOL = Symbol.for(
  "@geovi/the-datagrid/search-runtime"
);

export type DataGridSearchRuntime = {
  SearchBar: typeof DataGridSearchBar;
  buildIndex: typeof buildDataGridSearchIndex;
  filterIndex: typeof filterDataGridSearchIndex;
};

let runtime: DataGridSearchRuntime | undefined;

export function getDataGridSearchRuntime(): DataGridSearchRuntime {
  return (runtime ??= {
    SearchBar: DataGridSearchBar,
    buildIndex: buildDataGridSearchIndex,
    filterIndex: filterDataGridSearchIndex,
  });
}
