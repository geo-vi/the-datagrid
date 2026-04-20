import type {
  TypeComputedColumnsMap,
  TypeComputedProps,
  TypeGetColumnByParam,
  TypeSize,
} from "../../src/main";

export function assertComputedPropsCompat(
  api: TypeComputedProps,
  column: TypeGetColumnByParam,
  size: TypeSize,
  columnsMap: TypeComputedColumnsMap
) {
  const resolvedColumn = api.getColumnBy?.(column);
  const domNode = api.getDOMNodeForRowIndex?.(0);
  const renderRange = api.getRenderRange?.();
  const filterEntry = api.getColumnFilterValue?.(column);
  const isFiltered = api.isColumnFiltered?.(column);
  const isVisible = api.isColumnVisible?.(column);
  const selectedMap = api.getSelectedMap?.();

  api.setColumnVisible?.(column, false);
  api.setColumnSortInfo?.(column, 1);
  api.unsortColumn?.(column);
  api.setColumnFilterValue?.(column, "Ada");
  api.clearColumnFilter?.(column);
  api.scrollToIndex?.(0);
  api.scrollToCell?.({ rowIndex: 0, columnIndex: 0 });
  api.scrollToColumn?.(0);
  api.setShowHeader?.(false);
  api.setEnableFiltering?.(false);
  api.setLoading?.(false);
  api.selectAll?.();
  api.deselectAll?.();

  return {
    resolvedColumn,
    domNode,
    renderRange,
    filterEntry,
    isFiltered,
    isVisible,
    selectedMap,
    sizeWidth: size.width,
    sizeHeight: size.height,
    columnsMap,
    publicAPI: api.publicAPI,
    visibleColumns: api.visibleColumns,
    visibleColumnsMap: api.visibleColumnsMap,
    computedFilterValue: api.computedFilterValue,
    computedSortInfo: api.computedSortInfo,
  };
}
