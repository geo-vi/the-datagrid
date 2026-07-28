import type {
  TypeComputedProps,
  TypeDataGridProps,
  TypeRenderColumnContextMenu,
  TypeRenderRowContextMenu,
} from "../../src/main";

const renderColumnContextMenu: TypeRenderColumnContextMenu = (
  menuProps,
  { cellProps, grid, computedProps, computedPropsRef }
) => {
  const sameApi: boolean =
    grid === computedProps && computedPropsRef.current === computedProps;
  menuProps.onDismiss?.();
  return `${cellProps.columnId}:${sameApi}`;
};

const renderRowContextMenu: TypeRenderRowContextMenu = (
  menuProps,
  { rowProps, cellProps, grid, computedPropsRef }
) => {
  const api: TypeComputedProps = grid;
  menuProps.onDismiss?.();
  return `${String(rowProps.id)}:${cellProps?.columnId}:${Boolean(
    computedPropsRef.current === api
  )}`;
};

const props: TypeDataGridProps = {
  idProperty: "id",
  columns: [{ name: "id" }],
  dataSource: [{ id: 1 }],
  renderColumnContextMenu,
  renderRowContextMenu,
  onRowContextMenu: (rowProps, event) => {
    String(rowProps.id);
    event.preventDefault();
  },
  columnContextMenuAlignPositions: ["tl-bl"],
  columnContextMenuConstrainTo: true,
  columnContextMenuPosition: "fixed",
  rowContextMenuAlignPositions: ["tl-tr"],
  rowContextMenuConstrainTo: "#grid-shell",
  rowContextMenuPosition: "absolute",
  updateMenuPositionOnColumnsChange: true,
};

declare const api: TypeComputedProps;
api.showRowContextMenu?.({ left: 0, top: 0 }, { data: { id: 1 }, rowIndex: 0 });

void props;
