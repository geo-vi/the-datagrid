import * as React from "react";

import type {
  TypeColumn,
  TypeColumnContextMenuProps,
  TypeComputedProps,
  TypeDataGridProps,
  TypeGetColumnByParam,
  TypeRowContextMenuProps,
  TypeSortInfo,
} from "../../types";
import { getColumnId } from "../../utils/column";
import { t } from "../../utils/helpers";
import type {
  OpenColumnContextMenu,
  OpenRowContextMenu,
} from "../internalProps";

export type UseGridContextMenuLayersParams = {
  allowUnsort: boolean;
  apiRef: React.MutableRefObject<TypeComputedProps | null>;
  autosizeColumn: (columnId: string) => void;
  checkboxColId: string;
  checkboxEnabled: boolean;
  columnContextMenu: OpenColumnContextMenu | null;
  columnContextMenuAlignPositions: TypeDataGridProps["columnContextMenuAlignPositions"];
  columnContextMenuConstrainTo: TypeDataGridProps["columnContextMenuConstrainTo"];
  columnContextMenuPosition: NonNullable<
    TypeDataGridProps["columnContextMenuPosition"]
  >;
  columnVisibilityMap: Record<string, boolean>;
  effectiveEnableFiltering: boolean;
  enableColumnAutosize: boolean;
  enableFiltering: boolean | undefined;
  groupedColumns: TypeColumn[];
  hideColumnContextMenu: () => void;
  hideRowContextMenu: () => void;
  i18n: TypeDataGridProps["i18n"];
  nativeScroll: boolean;
  renderColumnContextMenu: TypeDataGridProps["renderColumnContextMenu"];
  renderRowContextMenu: TypeDataGridProps["renderRowContextMenu"];
  rowContextMenu: OpenRowContextMenu | null;
  rowContextMenuAlignPositions: TypeDataGridProps["rowContextMenuAlignPositions"];
  rowContextMenuConstrainTo: TypeDataGridProps["rowContextMenuConstrainTo"];
  rowContextMenuPosition: NonNullable<
    TypeDataGridProps["rowContextMenuPosition"]
  >;
  rtl: boolean;
  setColumnSizesToFitCompat: () => void;
  setColumnSortInfoCompat: (
    column: TypeGetColumnByParam,
    dir: 1 | 0 | -1
  ) => void;
  setColumnVisibleById: (columnId: string, visible: boolean) => void;
  setColumnsSizesAutoCompat: (config?: {
    columnIds?: string[];
    skipHeader?: boolean;
    skipSortTool?: boolean;
  }) => void;
  setEnableFilteringCompat: (next: boolean) => void;
  sortInfo: TypeSortInfo;
  sortable: boolean;
  stableApi: TypeComputedProps;
  themeName: string;
  updateMenuPositionOnScroll: boolean;
};

/**
 * Derives the column/row context menu render props and their default item
 * lists from the currently open menu.
 */
export function useGridContextMenuLayers(
  params: UseGridContextMenuLayersParams
) {
  const {
    allowUnsort,
    apiRef,
    autosizeColumn,
    checkboxColId,
    checkboxEnabled,
    columnContextMenu,
    columnContextMenuAlignPositions,
    columnContextMenuConstrainTo,
    columnContextMenuPosition,
    columnVisibilityMap,
    effectiveEnableFiltering,
    enableColumnAutosize,
    enableFiltering,
    groupedColumns,
    hideColumnContextMenu,
    hideRowContextMenu,
    i18n,
    nativeScroll,
    renderColumnContextMenu,
    renderRowContextMenu,
    rowContextMenu,
    rowContextMenuAlignPositions,
    rowContextMenuConstrainTo,
    rowContextMenuPosition,
    rtl,
    setColumnSizesToFitCompat,
    setColumnSortInfoCompat,
    setColumnVisibleById,
    setColumnsSizesAutoCompat,
    setEnableFilteringCompat,
    sortInfo,
    sortable,
    stableApi,
    themeName,
    updateMenuPositionOnScroll,
  } = params;

  const contextMenuColumn = columnContextMenu?.cellProps.column as
    | TypeColumn
    | undefined;
  const contextMenuColumnId =
    columnContextMenu?.cellProps.columnId ??
    columnContextMenu?.cellProps.name ??
    (contextMenuColumn ? getColumnId(contextMenuColumn) : undefined);
  const contextMenuCanSort = Boolean(
    contextMenuColumnId &&
    (contextMenuColumn?.sortable ?? sortable) &&
    (!checkboxEnabled || contextMenuColumnId !== checkboxColId)
  );
  const contextMenuSortEntries = Array.isArray(sortInfo)
    ? sortInfo
    : sortInfo
      ? [sortInfo]
      : [];
  const contextMenuIsSorted = Boolean(
    contextMenuColumnId &&
    contextMenuSortEntries.some(
      (entry) =>
        entry.name === contextMenuColumnId ||
        entry.id === contextMenuColumnId ||
        entry.columnName === contextMenuColumnId
    )
  );
  const contextMenuCanUnsort =
    contextMenuCanSort &&
    contextMenuIsSorted &&
    (allowUnsort || Array.isArray(sortInfo));
  const visibleColumnCount = groupedColumns.reduce(
    (total, column) =>
      total + (columnVisibilityMap[getColumnId(column)] !== false ? 1 : 0),
    0
  );
  const columnContextMenuItems: NonNullable<
    TypeColumnContextMenuProps["items"]
  > = contextMenuColumnId
    ? [
        {
          name: "sortAsc",
          label: t(i18n, "sortAsc", "Sort A→Z"),
          disabled: !contextMenuCanSort,
          onClick: () => setColumnSortInfoCompat(contextMenuColumnId, 1),
        },
        {
          name: "sortDesc",
          label: t(i18n, "sortDesc", "Sort Z→A"),
          disabled: !contextMenuCanSort,
          onClick: () => setColumnSortInfoCompat(contextMenuColumnId, -1),
        },
        {
          name: "unsort",
          label: t(i18n, "unsort", "Unsort"),
          disabled: !contextMenuCanUnsort,
          onClick: () => setColumnSortInfoCompat(contextMenuColumnId, 0),
        },
        "-",
        {
          name: effectiveEnableFiltering ? "hideFiltering" : "showFiltering",
          label: effectiveEnableFiltering
            ? t(i18n, "hideFiltering", "Hide filtering")
            : t(i18n, "showFiltering", "Show filtering"),
          disabled: enableFiltering !== undefined,
          onClick: () => setEnableFilteringCompat(!effectiveEnableFiltering),
        },
        {
          name: "columns",
          label: t(i18n, "columns", "Columns"),
          items: groupedColumns.map((column) => {
            const columnId = getColumnId(column);
            const visible = columnVisibilityMap[columnId] !== false;
            return {
              name: columnId,
              label:
                typeof column.header === "string"
                  ? column.header
                  : (column.name ?? column.id ?? columnId),
              checked: visible,
              disabled:
                column.hideable === false ||
                (visible && visibleColumnCount <= 1),
              onClick: () => setColumnVisibleById(columnId, !visible),
            };
          }),
        },
        ...(enableColumnAutosize
          ? ([
              "-",
              {
                name: "autoSizeColumn",
                label: t(i18n, "autoSizeColumn", "Auto size this column"),
                onClick: () => autosizeColumn(contextMenuColumnId),
              },
              {
                name: "autoSizeAllColumns",
                label: t(i18n, "autoSizeAllColumns", "Auto size all columns"),
                onClick: () => setColumnsSizesAutoCompat(),
              },
              {
                name: "sizeColumnsToFit",
                label: t(i18n, "sizeColumnsToFit", "Size columns to fit"),
                onClick: setColumnSizesToFitCompat,
              },
            ] as const)
          : []),
      ]
    : [];
  const columnMenuProps: TypeColumnContextMenuProps | null = columnContextMenu
    ? {
        autoFocus: true,
        alignTo: columnContextMenu.alignTo,
        alignPositions: columnContextMenuAlignPositions,
        cellProps: columnContextMenu.cellProps,
        constrainTo: columnContextMenuConstrainTo,
        items: columnContextMenuItems,
        nativeScroll,
        onDismiss: hideColumnContextMenu,
        position: columnContextMenuPosition,
        style: {
          position:
            columnContextMenuPosition as React.CSSProperties["position"],
        },
        theme: themeName,
        rtl,
        updatePositionOnScroll: updateMenuPositionOnScroll,
      }
    : null;
  const rowMenuProps: TypeRowContextMenuProps | null = rowContextMenu
    ? {
        autoFocus: true,
        alignTo: rowContextMenu.alignTo,
        alignPositions: rowContextMenuAlignPositions,
        cellProps: rowContextMenu.cellProps,
        constrainTo: rowContextMenuConstrainTo,
        items: [],
        nativeScroll,
        onDismiss: hideRowContextMenu,
        position: rowContextMenuPosition,
        rowProps: rowContextMenu.rowProps,
        style: {
          position: rowContextMenuPosition as React.CSSProperties["position"],
        },
        theme: themeName,
        rtl,
        updatePositionOnScroll: updateMenuPositionOnScroll,
      }
    : null;
  const renderedColumnContextMenu =
    columnContextMenu && columnMenuProps && renderColumnContextMenu
      ? renderColumnContextMenu(columnMenuProps, {
          cellProps: columnContextMenu.cellProps,
          grid: stableApi,
          computedProps: stableApi,
          computedPropsRef: apiRef,
        })
      : undefined;
  const renderedRowContextMenu =
    rowContextMenu && rowMenuProps && renderRowContextMenu
      ? renderRowContextMenu(rowMenuProps, {
          rowProps: rowContextMenu.rowProps,
          cellProps: rowContextMenu.cellProps,
          grid: stableApi,
          computedProps: stableApi,
          computedPropsRef: apiRef,
        })
      : undefined;
  const showColumnMenuLayer =
    Boolean(columnContextMenu && columnMenuProps) &&
    renderedColumnContextMenu !== null &&
    renderedColumnContextMenu !== false;
  const showRowMenuLayer =
    Boolean(rowContextMenu && rowMenuProps) &&
    renderedRowContextMenu !== null &&
    renderedRowContextMenu !== false;
  const columnContextMenuSuppressed = Boolean(
    columnContextMenu &&
    renderColumnContextMenu &&
    (renderedColumnContextMenu === null || renderedColumnContextMenu === false)
  );
  const rowContextMenuSuppressed = Boolean(
    rowContextMenu &&
    renderRowContextMenu &&
    (renderedRowContextMenu === null || renderedRowContextMenu === false)
  );
  React.useEffect(() => {
    if (columnContextMenuSuppressed) hideColumnContextMenu();
  }, [columnContextMenuSuppressed, hideColumnContextMenu]);
  React.useEffect(() => {
    if (rowContextMenuSuppressed) hideRowContextMenu();
  }, [hideRowContextMenu, rowContextMenuSuppressed]);
  return {
    columnMenuProps,
    contextMenuCanSort,
    contextMenuCanUnsort,
    contextMenuColumnId,
    renderedColumnContextMenu,
    renderedRowContextMenu,
    rowMenuProps,
    showColumnMenuLayer,
    showRowMenuLayer,
    visibleColumnCount,
  };
}
