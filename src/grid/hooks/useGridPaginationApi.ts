import * as React from "react";

import type {
  TypeDataGridProps,
  TypeFilterValue,
  TypePaginationProps,
  TypeSortInfo,
} from "../../types";
import { t } from "../../utils/helpers";

export type UseGridPaginationApiParams = {
  canNext: boolean;
  canPrev: boolean;
  count: number;
  filterControlled: boolean;
  i18n: TypeDataGridProps["i18n"];
  loadSkip: number;
  localPagination: boolean;
  pageCount: number;
  pageIndex: number;
  pageSizes: number[];
  paginationEnabled: boolean;
  reload: () => void;
  remotePagination: boolean;
  resetSkip: () => void;
  rowsCount: number;
  rtl: boolean;
  safeLimit: number;
  setDraftFilterValue: (next: TypeFilterValue) => void;
  setFilterValue: (next: TypeFilterValue) => void;
  setLimit: (next: number) => void;
  setSkip: (nextSkip: number) => void;
  setSortInfo: (next: TypeSortInfo) => void;
  themeName: string;
};

/**
 * Pagination navigation plus the page-resetting state setters that sorting and
 * filtering funnel through.
 */
export function useGridPaginationApi(params: UseGridPaginationApiParams) {
  const {
    canNext,
    canPrev,
    count,
    filterControlled,
    i18n,
    loadSkip,
    localPagination,
    pageCount,
    pageIndex,
    pageSizes,
    paginationEnabled,
    reload,
    remotePagination,
    resetSkip,
    rowsCount,
    rtl,
    safeLimit,
    setDraftFilterValue,
    setFilterValue,
    setLimit,
    setSkip,
    setSortInfo,
    themeName,
  } = params;

  const setLimitAndResetPage = React.useCallback(
    (next: number) => {
      resetSkip();
      setLimit(next);
    },
    [resetSkip, setLimit]
  );

  const setSortInfoAndResetPage = React.useCallback(
    (next: TypeSortInfo) => {
      resetSkip();
      setSortInfo(next);
    },
    [resetSkip, setSortInfo]
  );

  const setFilterValueAndResetPage = React.useCallback(
    (next: TypeFilterValue) => {
      resetSkip();
      if (!filterControlled) {
        setDraftFilterValue(next);
      }
      setFilterValue(next);
    },
    [filterControlled, resetSkip, setDraftFilterValue, setFilterValue]
  );

  const gotoPage = React.useCallback(
    (page: number, config?: { force: boolean }) => {
      const nextPage = Math.min(
        pageCount,
        Math.max(1, Math.trunc(Number.isFinite(page) ? page : 1))
      );
      const nextSkip = (nextPage - 1) * safeLimit;

      if (nextSkip === loadSkip) {
        if (config?.force) reload();
        return;
      }
      setSkip(nextSkip);
    },
    [loadSkip, pageCount, reload, safeLimit, setSkip]
  );
  const gotoFirstPage = React.useCallback(() => gotoPage(1), [gotoPage]);
  const gotoLastPage = React.useCallback(
    () => gotoPage(pageCount),
    [gotoPage, pageCount]
  );
  const gotoNextPage = React.useCallback(
    () => gotoPage(pageIndex + 2),
    [gotoPage, pageIndex]
  );
  const gotoPrevPage = React.useCallback(
    () => gotoPage(pageIndex),
    [gotoPage, pageIndex]
  );
  const hasNextPage = React.useCallback(() => canNext, [canNext]);
  const hasPrevPage = React.useCallback(() => canPrev, [canPrev]);
  const paginationProps = React.useMemo<TypePaginationProps>(
    () => ({
      skip: loadSkip,
      limit: safeLimit,
      count: rowsCount,
      pagination: paginationEnabled,
      livePagination: false,
      remotePagination,
      localPagination,
      totalCount: count,
      pageSizes,
      gotoNextPage,
      reload,
      onRefresh: reload,
      gotoFirstPage,
      gotoLastPage,
      gotoPrevPage,
      hasNextPage,
      hasPrevPage,
      onSkipChange: setSkip,
      onLimitChange: setLimit,
      gotoPage,
      onClick: (event: { stopPropagation?: () => void }) =>
        event.stopPropagation?.(),
      theme: themeName,
      perPageText: t(i18n, "perPageText", "Rows"),
      pageText: t(i18n, "pageText", "Page"),
      ofText: t(i18n, "ofText", "of"),
      showingText: t(i18n, "showingText", "Showing"),
      rtl,
      bordered: false,
    }),
    [
      count,
      gotoFirstPage,
      gotoLastPage,
      gotoNextPage,
      gotoPage,
      gotoPrevPage,
      hasNextPage,
      hasPrevPage,
      i18n,
      loadSkip,
      localPagination,
      pageSizes,
      paginationEnabled,
      reload,
      remotePagination,
      rtl,
      rowsCount,
      safeLimit,
      setLimit,
      setSkip,
      themeName,
    ]
  );
  return {
    gotoFirstPage,
    gotoLastPage,
    gotoNextPage,
    gotoPage,
    gotoPrevPage,
    hasNextPage,
    hasPrevPage,
    paginationProps,
    setFilterValueAndResetPage,
    setLimitAndResetPage,
    setSortInfoAndResetPage,
  };
}
