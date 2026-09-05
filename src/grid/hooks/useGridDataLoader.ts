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
import {
  countTreeRecords,
  processTreeData,
  type TreeRecord,
} from "../hierarchy/treeData";
import { stripFromOrder } from "../utils/gridUtils";
import { createLoadingStore } from "../utils/loadingStore";
import type { InternalSearchController } from "../internalProps";

/**
 * Returns the previous array when the next one holds the same rows in the same
 * order, so a load that recomputed an identical result does not hand React a
 * fresh identity.
 *
 * Rows are compared by reference, matching how React and the row model already
 * decide what changed. A load that genuinely alters the data produces
 * different row references and is passed through untouched.
 *
 * Only effect-driven local array loads use this; an explicit `reload()` asks to
 * publish the newly evaluated page and bypasses reuse. On the remote paths
 * `setRows` doubles as the re-render that publishes the finished load:
 * `setInternalLoading` writes to a store that only re-renders the load mask, so
 * the grid's own `loading` value refreshes on the next render from somewhere
 * else. Reusing the array there swallows that render, and a remote load
 * resolving to empty data never reveals `emptyText`.
 */
function reuseRowsIfUnchanged<T>(prev: readonly T[], next: T[]): T[] {
  if ((prev as unknown as T[]) === next) return next;
  if (prev.length !== next.length) return next;
  for (let index = 0; index < next.length; index += 1) {
    if (prev[index] !== next[index]) return next;
  }
  return prev as T[];
}

type LoadDataOptions = {
  bypassLocalRowReuse?: boolean;
};

export type UseGridDataLoaderParams = {
  treeEnabled: boolean;
  nodesProperty: string;
  detailColumnId?: string;
  setTreeRevealNodes: (nodes: ReadonlySet<TreeRecord>) => void;
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
    treeEnabled,
    nodesProperty,
    detailColumnId,
    setTreeRevealNodes,
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

  // Non-function sources cannot observe the data-source argument object, so a
  // theme change should not reload them. Function sources do receive `theme`
  // as part of the public request contract and must reload when it changes.
  const themeNameRef = React.useRef(themeName);
  React.useLayoutEffect(() => {
    themeNameRef.current = themeName;
  }, [themeName]);
  const functionDataSourceTheme =
    typeof dataSource === "function" ? themeName : null;
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
    const columns = checkboxEnabled
      ? orderedColumns.filter((c) => getColumnId(c) !== checkboxColId)
      : orderedColumns;
    return detailColumnId
      ? columns.filter((c) => getColumnId(c) !== detailColumnId)
      : columns;
  }, [checkboxColId, checkboxEnabled, orderedColumns, detailColumnId]);
  const computedFilterForFetch = React.useMemo(
    () => resolveFilterValueForColumns(filterValue, columnsForDs),
    [columnsForDs, filterValue]
  );
  const computedSortForFetch = sortInfo;

  const columnOrderForDs = React.useMemo(() => {
    const order = checkboxEnabled
      ? stripFromOrder(effectiveColumnOrder, checkboxColId)
      : effectiveColumnOrder;
    return detailColumnId ? stripFromOrder(order, detailColumnId) : order;
  }, [checkboxColId, checkboxEnabled, effectiveColumnOrder, detailColumnId]);
  const dataSourceColumnOrder = React.useMemo(
    () => columnsForDs.map((column) => getColumnId(column)),
    [columnsForDs]
  );

  const loadData = React.useCallback(
    async (options?: LoadDataOptions) => {
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

          if (treeEnabled) {
            const result = processTreeData(data as TreeRecord[], {
              nodesProperty,
              filterValue: activeLocalFilter ? localFilterValue : null,
              filterTypes,
              columns: orderedColumns,
              sortInfo: localSortInfo,
              sortFunctions,
              search:
                searchActive && searchFilterRows
                  ? (rows) => searchFilterRows(rows, inputColumns)
                  : undefined,
            });
            const nextRows = localPagination
              ? result.data.slice(loadSkip, loadSkip + limit)
              : result.data;
            setTreeRevealNodes(result.revealNodes);
            setRows((previous) => reuseRowsIfUnchanged(previous, nextRows));
            setCount(result.data.length);
            notifyFilteredRowsCount(result.count);
            return;
          }

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

          if (options?.bypassLocalRowReuse) {
            setRows(sliced);
          } else {
            setRows((previous) => reuseRowsIfUnchanged(previous, sliced));
          }
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
          theme: functionDataSourceTheme ?? themeNameRef.current,
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

          if (treeEnabled) {
            const result = processTreeData(data as TreeRecord[], {
              nodesProperty,
              filterValue: activeLocalFilter ? localFilterValue : null,
              filterTypes,
              columns: orderedColumns,
              sortInfo: localSortInfo,
              sortFunctions,
              search:
                searchActive && searchFilterRows
                  ? (rows) => searchFilterRows(rows, inputColumns)
                  : undefined,
            });
            setTreeRevealNodes(result.revealNodes);
            return result.data as Row[];
          }

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

        if (
          result &&
          typeof result === "object" &&
          Array.isArray(result.data)
        ) {
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
          notifyFilteredRowsCount(
            treeEnabled && !dsIsFn && localPagination
              ? countTreeRecords(resultData, nodesProperty)
              : totalCount
          );
        } else if (Array.isArray(result)) {
          const resultData = transformStaticPromiseRows(result);
          const totalCount = resultData.length;
          const nextRows = localPagination
            ? resultData.slice(loadSkip, loadSkip + limit)
            : resultData;

          setRows(nextRows);
          setCount(totalCount);
          notifyFilteredRowsCount(
            treeEnabled
              ? countTreeRecords(resultData, nodesProperty)
              : totalCount
          );
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
    },
    [
      treeEnabled,
      nodesProperty,
      setTreeRevealNodes,
      dataSource,
      functionDataSourceTheme,
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
    ]
  );

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
    // An explicit reload is a request to publish freshly evaluated local
    // rows, even when filtering/pagination produced the same row references.
    void loadData({ bypassLocalRowReuse: true });
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
