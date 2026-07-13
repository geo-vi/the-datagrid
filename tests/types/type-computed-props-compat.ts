import type {
  TypeComputedColumnsMap,
  TypeComputedProps,
  TypeGetColumnByParam,
  TypeSize,
} from "../../src/main";

type AssertFalse<T extends false> = T;
type IsAny<T> = 0 extends 1 & T ? true : false;

type VirtualListGetter = TypeComputedProps["getVirtualList"];
export type VirtualListGetterIsTyped = AssertFalse<IsAny<VirtualListGetter>>;
type VirtualListCompat = ReturnType<NonNullable<VirtualListGetter>>;
export type VirtualListCompatIsTyped = AssertFalse<IsAny<VirtualListCompat>>;

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
  const virtualList = api.getVirtualList();
  const virtualListRange = virtualList.getVisibleRange();
  const virtualListRows = virtualList.getRows();
  const virtualListScrollSize = virtualList.getScrollSize();
  const virtualListClientSize = virtualList.getClientSize();

  api.setColumnVisible?.(column, false);
  api.setColumnSortInfo?.(column, 1);
  api.unsortColumn?.(column);
  api.setColumnFilterValue?.(column, "Ada");
  api.clearColumnFilter?.(column);
  api.scrollToIndex?.(0);
  api.scrollToCell?.({ rowIndex: 0, columnIndex: 0 });
  api.scrollToColumn?.(0);
  api.setShowHeader?.(false);
  api.setShowZebraRows((current) => !current);
  api.setEnableFiltering?.(false);
  api.setLoading?.(false);
  api.selectAll?.();
  api.deselectAll?.();
  virtualList.scrollToIndex(0);
  virtualList.smoothScrollTo(0);

  // @ts-expect-error TanStack Virtualizer internals must not be exposed here.
  virtualList.getVirtualItems();

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
    virtualList,
    virtualListRange,
    virtualListRows,
    virtualListScrollSize,
    virtualListClientSize,
  };
}
