import * as React from "react";

import type {
  TypeColumn,
  TypeComputedProps,
  TypeDataGridProps,
  TypeDataSourceArgs,
  TypeFilterTypes,
  TypeFilterValue,
  TypeSortFunctions,
  TypeSortInfo,
} from "../../types";
import { getColumnId } from "../../utils/column";
import {
  applyLocalFilter,
  resolveFilterValueForColumns,
} from "../../filters/utils";
import { applyLocalSort } from "../../sorting/utils";
import { stripFromOrder } from "../utils/gridUtils";
import { createLoadingStore } from "../utils/loadingStore";
import type { InternalSearchController } from "../internalProps";

export type UseGridDataLoaderParams = {
  activeLocalFilter: boolean;
  apiRef: React.MutableRefObject<TypeComputedProps | null>;
  checkboxColId: string;
  checkboxEnabled: boolean;
  controlledLoading: boolean | undefined;
  dataSource: TypeDataGridProps["dataSource"];
  draftFilterValue: TypeFilterValue;
  effectiveColumnOrder: string[];
  filterTypes: TypeFilterTypes;
  filterValue: TypeFilterValue;
  idProperty: string;
  inputColumns: TypeColumn[];
  limit: number;
  loadAbortControllerRef: React.MutableRefObject<AbortController | null>;
  loadRequestIdRef: React.MutableRefObject<number>;
  loadSkip: number;
  localFilterValue: TypeFilterValue | null;
  localPagination: boolean;
  localSortInfo: TypeSortInfo | null;
  notifyFilteredRowsCount: (count: number) => void;
  orderedColumns: TypeColumn[];
  paginationMode: TypeDataGridProps["pagination"];
  remoteDataSource: boolean;
  remotePagination: boolean;
  searchActive: boolean;
  searchConnected: boolean;
  searchFilterRows: InternalSearchController["filterRows"] | undefined;
  searchValue: string;
  setCount: React.Dispatch<React.SetStateAction<number>>;
  setFilterValue: (next: TypeFilterValue) => void;
  setRows: React.Dispatch<React.SetStateAction<any[]>>;
  sortFunctions: TypeSortFunctions | null;
  sortInfo: TypeSortInfo;
  themeName: string;
};

/**
 * Owns everything that fetches or recomputes `rows`: the loading store, the
 * data-source request, and the debounced filter commit that retriggers it.
 *
 * This is the closure most implicated in the retained-rows growth, so it lives
 * in its own module: a memoised `loadData`/`reload` from an older render now
 * only keeps this hook's parameters alive instead of the entire grid render
 * scope (and, transitively, every other stale callback in it).
 */
export function useGridDataLoader(params: UseGridDataLoaderParams) {
  const {
    activeLocalFilter,
    apiRef,
    checkboxColId,
    checkboxEnabled,
    controlledLoading,
    dataSource,
    draftFilterValue,
    effectiveColumnOrder,
    filterTypes,
    filterValue,
    idProperty,
    inputColumns,
    limit,
    loadAbortControllerRef,
    loadRequestIdRef,
    loadSkip,
    localFilterValue,
    localPagination,
    localSortInfo,
    notifyFilteredRowsCount,
    orderedColumns,
    paginationMode,
    remoteDataSource,
    remotePagination,
    searchActive,
    searchConnected,
    searchFilterRows,
    searchValue,
    setCount,
    setFilterValue,
    setRows,
    sortFunctions,
    sortInfo,
    themeName,
  } = params;

  const [loadingStore] = React.useState(createLoadingStore);
  const controlledLoadingRef = React.useRef(controlledLoading);
  const loadMountedRef = React.useRef(false);
  const loading = loadingStore.getEffective(controlledLoading);
  React.useLayoutEffect(() => {
    controlledLoadingRef.current = controlledLoading;
  }, [controlledLoading]);

  // The theme only ever reaches the data source as a reported value; it does
  // not influence what is fetched, filtered or sorted. Keeping it in a ref
  // rather than in `loadData`'s dependencies means a theme switch no longer
  // rebuilds the callback and re-runs the whole load. Any genuine load still
  // reports the current theme.
  const themeNameRef = React.useRef(themeName);
  React.useLayoutEffect(() => {
    themeNameRef.current = themeName;
  }, [themeName]);
  const setInternalLoading = React.useCallback(
    (nextLoading: boolean) => {
      loadingStore.setAutomatic(nextLoading);
      if (apiRef.current) {
        apiRef.current.computedLoading = loadingStore.getEffective(
          controlledLoadingRef.current
        );
      }
    },
    [loadingStore, apiRef]
  );

  const columnsForDs = React.useMemo(() => {
    return checkboxEnabled
      ? orderedColumns.filter((c) => getColumnId(c) !== checkboxColId)
      : orderedColumns;
  }, [checkboxColId, checkboxEnabled, orderedColumns]);
  const computedFilterForFetch = React.useMemo(
    () => resolveFilterValueForColumns(filterValue, columnsForDs),
    [columnsForDs, filterValue]
  );
  const computedSortForFetch = sortInfo;

  const columnOrderForDs = React.useMemo(() => {
    return checkboxEnabled
      ? stripFromOrder(effectiveColumnOrder, checkboxColId)
      : effectiveColumnOrder;
  }, [checkboxColId, checkboxEnabled, effectiveColumnOrder]);
  const dataSourceColumnOrder = React.useMemo(
    () => columnsForDs.map((column) => getColumnId(column)),
    [columnsForDs]
  );

  const loadData = React.useCallback(async () => {
    if (!loadMountedRef.current) return;

    const requestId = ++loadRequestIdRef.current;
    loadAbortControllerRef.current?.abort();
    const requestAbortController =
      remoteDataSource && typeof AbortController !== "undefined"
        ? new AbortController()
        : null;
    loadAbortControllerRef.current = requestAbortController;

    if (remoteDataSource) {
      setInternalLoading(true);
    } else {
      setInternalLoading(false);
    }

    try {
      if (Array.isArray(dataSource)) {
        let data = dataSource;

        if (searchActive && searchFilterRows) {
          data = searchFilterRows(data, inputColumns);
        }

        if (activeLocalFilter) {
          data = applyLocalFilter(data, localFilterValue, {
            filterTypes,
            columns: orderedColumns,
          });
        }
        if (localSortInfo) {
          data = applyLocalSort(
            data,
            localSortInfo,
            orderedColumns,
            sortFunctions
          );
        }

        const totalCount = data.length;

        const sliced = localPagination
          ? data.slice(loadSkip, loadSkip + limit)
          : data;

        setRows(sliced);
        setCount(totalCount);
        notifyFilteredRowsCount(totalCount);
        return;
      }

      const ds = dataSource;

      const dsIsFn = typeof ds === "function";
      const dsArg: TypeDataSourceArgs = {
        ...(remotePagination && dsIsFn ? { skip: loadSkip, limit } : {}),
        sortInfo: computedSortForFetch,
        filterValue: computedFilterForFetch,
        columnOrder: dataSourceColumnOrder,
        columns: columnsForDs,
        idProperty,
        theme: themeNameRef.current,
        ...(searchConnected ? { searchValue } : {}),
      };
      if (requestAbortController) {
        // Preserve the long-standing enumerable request-key contract while
        // exposing cancellation as an opt-in extension.
        Object.defineProperty(dsArg, "signal", {
          configurable: true,
          enumerable: false,
          value: requestAbortController.signal,
        });
      }

      let result: any;

      try {
        result = dsIsFn ? ds(dsArg) : ds;

        if (result && typeof result.then === "function") {
          result = await result;
        }
      } catch {
        // Remote data-source failures have no public error callback. Preserve
        // the last committed rows and contain the rejected request here.
        return;
      }

      if (!loadMountedRef.current || requestId !== loadRequestIdRef.current) {
        return;
      }

      const transformStaticPromiseRows = <Row>(snapshot: Row[]): Row[] => {
        // A bare static Promise can still act as a locally composable snapshot
        // when pagination is disabled or explicitly local. With
        // pagination=true/"remote", all Promise/function results are
        // authoritative remote pages and must not be transformed or sliced.
        if (
          dsIsFn ||
          (paginationMode !== false && paginationMode !== "local")
        ) {
          return snapshot;
        }

        let data = snapshot;

        if (searchActive && searchFilterRows) {
          data = searchFilterRows(data, inputColumns);
        }
        if (activeLocalFilter) {
          data = applyLocalFilter(data, localFilterValue, {
            filterTypes,
            columns: orderedColumns,
          });
        }
        if (localSortInfo) {
          data = applyLocalSort(
            data,
            localSortInfo,
            orderedColumns,
            sortFunctions
          );
        }

        return data;
      };

      if (result && typeof result === "object" && Array.isArray(result.data)) {
        // A count-bearing Promise payload represents an authoritative remote
        // page unless pagination is explicitly local.
        const resultData = dsIsFn
          ? result.data
          : localPagination
            ? transformStaticPromiseRows(result.data)
            : result.data;
        const staticPromiseHasLocalPredicate =
          !dsIsFn && localPagination && (searchActive || activeLocalFilter);
        const reportedCount = Number(
          staticPromiseHasLocalPredicate
            ? resultData.length
            : (result.count ?? resultData.length)
        );
        const totalCount = Number.isFinite(reportedCount)
          ? reportedCount
          : resultData.length;
        const nextRows = localPagination
          ? resultData.slice(loadSkip, loadSkip + limit)
          : resultData;

        setRows(nextRows);
        setCount(totalCount);
        notifyFilteredRowsCount(totalCount);
      } else if (Array.isArray(result)) {
        const resultData = transformStaticPromiseRows(result);
        const totalCount = resultData.length;
        const nextRows = localPagination
          ? resultData.slice(loadSkip, loadSkip + limit)
          : resultData;

        setRows(nextRows);
        setCount(totalCount);
        notifyFilteredRowsCount(totalCount);
      } else {
        setRows([]);
        setCount(0);
        notifyFilteredRowsCount(0);
      }
    } finally {
      if (
        remoteDataSource &&
        loadMountedRef.current &&
        requestId === loadRequestIdRef.current
      ) {
        loadAbortControllerRef.current = null;
        setInternalLoading(false);
      }
    }
  }, [
    dataSource,
    activeLocalFilter,
    computedFilterForFetch,
    computedSortForFetch,
    localSortInfo,
    notifyFilteredRowsCount,
    idProperty,
    inputColumns,
    limit,
    localPagination,
    loadSkip,
    orderedColumns,
    paginationMode,
    remoteDataSource,
    remotePagination,
    dataSourceColumnOrder,
    columnsForDs,
    filterTypes,
    localFilterValue,
    searchActive,
    searchConnected,
    searchFilterRows,
    searchValue,
    setInternalLoading,
    sortFunctions,
    loadAbortControllerRef,
    loadRequestIdRef,
    setCount,
    setRows,
  ]);

  React.useLayoutEffect(() => {
    loadMountedRef.current = true;

    return () => {
      loadMountedRef.current = false;
      loadRequestIdRef.current += 1;
      loadAbortControllerRef.current?.abort();
      loadAbortControllerRef.current = null;
    };
  }, [loadAbortControllerRef, loadRequestIdRef]);

  React.useEffect(() => {
    void loadData();
  }, [loadData]);

  const reload = React.useCallback(() => {
    void loadData();
  }, [loadData]);

  const filterCommitDelay = React.useMemo(() => {
    const committedEntries = new Map(
      (filterValue ?? []).map((entry) => [entry.name, entry])
    );
    const changedEntry = (draftFilterValue ?? []).find((entry) => {
      const committed = committedEntries.get(entry.name);
      return (
        !committed ||
        committed.operator !== entry.operator ||
        committed.type !== entry.type ||
        committed.active !== entry.active ||
        !Object.is(committed.value, entry.value)
      );
    });
    const removedEntry = (filterValue ?? []).find(
      (entry) =>
        !(draftFilterValue ?? []).some(
          (draftEntry) => draftEntry.name === entry.name
        )
    );
    const changedName = changedEntry?.name ?? removedEntry?.name;
    const changedColumn = changedName
      ? orderedColumns.find((column) => {
          const columnId = getColumnId(column);
          return (
            columnId === changedName ||
            column.name === changedName ||
            column.filterName === changedName
          );
        })
      : undefined;
    const delay = changedColumn?.filterDelay;

    if (delay === false || delay === 0) return 0;
    return typeof delay === "number" && Number.isFinite(delay)
      ? Math.max(0, delay)
      : 250;
  }, [draftFilterValue, filterValue, orderedColumns]);

  React.useEffect(() => {
    if (Object.is(draftFilterValue, filterValue)) return;

    const handle = window.setTimeout(() => {
      setFilterValue(draftFilterValue);
    }, filterCommitDelay);

    return () => window.clearTimeout(handle);
  }, [draftFilterValue, filterCommitDelay, filterValue, setFilterValue]);
  return {
    columnOrderForDs,
    controlledLoadingRef,
    loading,
    loadingStore,
    reload,
  };
}
