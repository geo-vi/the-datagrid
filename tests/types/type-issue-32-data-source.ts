import {
  type TypeColumns,
  type TypeDataGridProps,
  type TypeDataSource,
  type TypeDataSourceArgs,
  type TypeDataSourceResult,
  type TypeLoadMaskProps,
  type TypePaginationProps,
} from "@geovi/the-datagrid";

const columns: TypeColumns = [{ name: "id" }, { name: "name" }];

export const synchronousCountSource: TypeDataSource = (
  args: TypeDataSourceArgs
): TypeDataSourceResult => {
  args.signal?.throwIfAborted();
  return {
    data: [{ id: args.skip ?? 0, name: String(args.limit ?? 0) }],
    count: 100,
  };
};

export const completeIssue32Props = {
  idProperty: "id",
  columns,
  dataSource: synchronousCountSource,
  pagination: true,
  skip: 0,
  limit: 25,
  loadingText: () => "Loading page",
  onLoadingChange(loading) {
    const next: boolean = loading;
    void next;
  },
  renderLoadMask(props: TypeLoadMaskProps) {
    const visible: boolean = props.visible;
    const theme: string = props.theme;
    void visible;
    void theme;
    return undefined;
  },
  renderPaginationToolbar(props: TypePaginationProps) {
    props.gotoPage(2);
    props.gotoPage(2, { force: true });
    props.gotoNextPage();
    props.gotoPrevPage();
    props.gotoFirstPage();
    props.gotoLastPage();
    props.onSkipChange(25);
    props.onLimitChange(50);
    props.reload();
    props.onRefresh();
    const ownership: [boolean, boolean] = [
      props.remotePagination,
      props.localPagination,
    ];
    return ownership.join(":");
  },
} satisfies TypeDataGridProps;
