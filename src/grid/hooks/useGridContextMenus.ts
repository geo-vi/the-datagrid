import * as React from "react";

import type {
  TypeCellProps,
  TypeDataGridProps,
  TypeRowProps,
} from "../../types";
import type {
  OpenColumnContextMenu,
  OpenRowContextMenu,
} from "../internalProps";

export type UseGridContextMenusParams = {
  onRowContextMenu: TypeDataGridProps["onRowContextMenu"];
  renderRowContextMenu: TypeDataGridProps["renderRowContextMenu"];
  surfaceRef: React.RefObject<HTMLDivElement | null>;
};

/**
 * Open/close state for the column, row and column-filter context menus. The
 * `onHide` callbacks supplied by consumers outlive the render that opened the
 * menu, so they are held in refs inside this module rather than in the grid
 * render scope.
 */
export function useGridContextMenus(params: UseGridContextMenusParams) {
  const { onRowContextMenu, renderRowContextMenu, surfaceRef } = params;

  const [openFilterMenuColId, setOpenFilterMenuColId] = React.useState<
    string | null
  >(null);
  const filterContextMenuOnHideRef = React.useRef<(() => void) | null>(null);
  const hideColumnFilterContextMenu = React.useCallback(() => {
    setOpenFilterMenuColId(null);
    const onHide = filterContextMenuOnHideRef.current;
    filterContextMenuOnHideRef.current = null;
    onHide?.();
  }, []);
  const setOpenFilterContextMenuColumn = React.useCallback(
    (columnId: string | null) => {
      if (columnId == null) {
        hideColumnFilterContextMenu();
      } else {
        setOpenFilterMenuColId(columnId);
      }
    },
    [hideColumnFilterContextMenu]
  );
  const [columnContextMenu, setColumnContextMenu] =
    React.useState<OpenColumnContextMenu | null>(null);
  const [rowContextMenu, setRowContextMenu] =
    React.useState<OpenRowContextMenu | null>(null);
  const [columnVisibilityMenuOpen, setColumnVisibilityMenuOpen] =
    React.useState(false);
  const columnContextMenuRef = React.useRef(columnContextMenu);
  const rowContextMenuRef = React.useRef(rowContextMenu);
  columnContextMenuRef.current = columnContextMenu;
  rowContextMenuRef.current = rowContextMenu;

  const hideColumnContextMenu = React.useCallback(() => {
    const current = columnContextMenuRef.current;
    if (!current) return;
    columnContextMenuRef.current = null;
    setColumnContextMenu(null);
    setColumnVisibilityMenuOpen(false);
    current.onHide?.();
  }, []);

  const hideRowContextMenu = React.useCallback(() => {
    const current = rowContextMenuRef.current;
    if (!current) return;
    rowContextMenuRef.current = null;
    setRowContextMenu(null);
    current.onHide?.();
  }, []);

  const showColumnContextMenu = React.useCallback(
    (
      alignTo: HTMLElement | { left: number; top: number },
      cellProps: TypeCellProps,
      _config?: { computedVisibleIndex?: number },
      onHide?: () => void,
      restoreFocusTo?: HTMLElement | null
    ) => {
      hideColumnContextMenu();
      hideRowContextMenu();
      hideColumnFilterContextMenu();
      setColumnVisibilityMenuOpen(false);
      const next = {
        alignTo,
        cellProps,
        restoreFocusTo:
          restoreFocusTo ??
          (alignTo instanceof HTMLElement ? alignTo : surfaceRef.current),
        onHide,
      };
      columnContextMenuRef.current = next;
      setColumnContextMenu(next);
    },
    [
      hideColumnContextMenu,
      hideColumnFilterContextMenu,
      hideRowContextMenu,
      surfaceRef,
    ]
  );

  const showRowContextMenu = React.useCallback(
    (
      alignTo: HTMLElement | { left: number; top: number },
      rowProps: TypeRowProps,
      cellProps?: TypeCellProps,
      onHide?: () => void,
      restoreFocusTo?: HTMLElement | null
    ) => {
      hideColumnContextMenu();
      hideRowContextMenu();
      hideColumnFilterContextMenu();
      const next = {
        alignTo,
        rowProps,
        cellProps,
        restoreFocusTo:
          restoreFocusTo ??
          (alignTo instanceof HTMLElement ? alignTo : surfaceRef.current),
        onHide,
      };
      rowContextMenuRef.current = next;
      setRowContextMenu(next);
    },
    [
      hideColumnContextMenu,
      hideColumnFilterContextMenu,
      hideRowContextMenu,
      surfaceRef,
    ]
  );

  const handleUiRowContextMenu = React.useCallback(
    (
      rowProps: TypeRowProps,
      cellProps: TypeCellProps | undefined,
      event:
        | React.MouseEvent<HTMLElement>
        | React.KeyboardEvent<HTMLElement>
        | React.PointerEvent<HTMLElement>,
      alignTo: HTMLElement | { left: number; top: number }
    ) => {
      onRowContextMenu?.(rowProps, event);
      if (!renderRowContextMenu) return;
      event.preventDefault();
      showRowContextMenu(
        alignTo,
        rowProps,
        cellProps,
        undefined,
        document.activeElement instanceof HTMLElement &&
          document.activeElement !== document.body
          ? document.activeElement
          : surfaceRef.current
      );
    },
    [onRowContextMenu, renderRowContextMenu, showRowContextMenu, surfaceRef]
  );

  React.useEffect(() => {
    if (openFilterMenuColId) {
      hideColumnContextMenu();
      hideRowContextMenu();
    }
  }, [hideColumnContextMenu, hideRowContextMenu, openFilterMenuColId]);
  return {
    columnContextMenu,
    filterContextMenuOnHideRef,
    setColumnContextMenu,
    setOpenFilterMenuColId,
    setRowContextMenu,
    columnVisibilityMenuOpen,
    handleUiRowContextMenu,
    hideColumnContextMenu,
    hideColumnFilterContextMenu,
    hideRowContextMenu,
    openFilterMenuColId,
    rowContextMenu,
    setColumnVisibilityMenuOpen,
    setOpenFilterContextMenuColumn,
    showColumnContextMenu,
    showRowContextMenu,
  };
}
