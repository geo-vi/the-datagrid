import type {
  TypeColumnGroup,
  TypeCommunityPlugin,
  TypeDataGridProps,
  TypeSortFunctions,
} from "../types";
import { DEFAULT_FILTER_TYPES } from "../filters/utils";

export const EMPTY_COLUMN_GROUPS: TypeColumnGroup[] = [];

export const DEFAULT_SORT_FUNCTIONS: TypeSortFunctions = {
  date: (value1, value2) => Number(value1) - Number(value2),
};

/**
 * Inovua exposes feature plugins. The implementation here is built in, so
 * these executable descriptors expose equivalent enablement and state rather
 * than asking consumers to register them.
 */
export const plugins: readonly TypeCommunityPlugin[] = [
  {
    name: "sortable-columns",
    methods: [
      "getSortInfo",
      "setSortInfo",
      "toggleColumnSort",
      "setColumnSortInfo",
      "unsortColumn",
    ],
    hook: (_props, computedProps) => ({
      computedIsMultiSort: Array.isArray(computedProps.getSortInfo()),
      computedSortInfo: computedProps.getSortInfo(),
      getSortInfo: computedProps.getSortInfo,
      setSortInfo: computedProps.setSortInfo,
      toggleColumnSort: computedProps.toggleColumnSort,
      setColumnSortInfo: computedProps.setColumnSortInfo,
      unsortColumn: computedProps.unsortColumn,
    }),
    defaultProps: () => ({ sortable: true }),
    isEnabled: (props) => props.sortable !== false,
    getState: (computedProps) => computedProps.getSortInfo(),
  },
  {
    name: "filters",
    methods: [
      "getFilterValue",
      "setFilterValue",
      "clearAllFilters",
      "clearColumnFilter",
      "getColumnFilterValue",
      "setColumnFilterValue",
      "isColumnFiltered",
    ],
    hook: (_props, computedProps) => ({
      computedFilterValue: computedProps.getFilterValue(),
      getFilterValue: computedProps.getFilterValue,
      setFilterValue: computedProps.setFilterValue,
      clearAllFilters: computedProps.clearAllFilters,
      clearColumnFilter: computedProps.clearColumnFilter,
      getColumnFilterValue: computedProps.getColumnFilterValue,
      setColumnFilterValue: computedProps.setColumnFilterValue,
      isColumnFiltered: computedProps.isColumnFiltered,
    }),
    defaultProps: () => ({
      columnFilterContextMenuConstrainTo: true,
      columnFilterContextMenuPosition: "absolute",
    }),
    isEnabled: (props) =>
      props.enableFiltering === true ||
      Boolean(props.filterValue?.length || props.defaultFilterValue?.length),
    getState: (computedProps) => computedProps.getFilterValue(),
  },
  {
    name: "menus",
    methods: [
      "showColumnFilterContextMenu",
      "hideColumnFilterContextMenu",
      "showColumnContextMenu",
      "hideColumnContextMenu",
      "showRowContextMenu",
      "hideRowContextMenu",
    ],
    hook: (_props, computedProps) => ({
      getMenuAvailableHeight: computedProps.getMenuAvailableHeight,
      showColumnFilterContextMenu: computedProps.showColumnFilterContextMenu,
      hideColumnFilterContextMenu: computedProps.hideColumnFilterContextMenu,
      showColumnContextMenu: computedProps.showColumnContextMenu,
      hideColumnContextMenu: computedProps.hideColumnContextMenu,
      showRowContextMenu: computedProps.showRowContextMenu,
      hideRowContextMenu: computedProps.hideRowContextMenu,
      columnContextMenuProps: computedProps.columnContextMenuProps,
      rowContextMenuProps: computedProps.rowContextMenuProps,
    }),
    defaultProps: () => ({ showColumnMenuTool: true }),
    isEnabled: (props) =>
      props.enableColumnFilterContextMenu !== false ||
      Boolean(props.renderColumnContextMenu || props.renderRowContextMenu),
    getState: (computedProps) => ({
      column: computedProps.columnContextMenuProps ?? null,
      filter: computedProps.columnFilterContextMenuProps ?? null,
      row: computedProps.rowContextMenuProps ?? null,
    }),
  },
  {
    name: "cell-selection",
    methods: [
      "getActiveCell",
      "setActiveCell",
      "getCellSelection",
      "setCellSelection",
      "isCellSelected",
    ],
    hook: (_props, computedProps) => ({
      computedActiveCell: computedProps.getActiveCell?.() ?? null,
      computedCellSelection: computedProps.getCellSelection?.() ?? null,
      getActiveCell: computedProps.getActiveCell,
      setActiveCell: computedProps.setActiveCell,
      incrementActiveCell: computedProps.incrementActiveCell,
      getCellSelection: computedProps.getCellSelection,
      setCellSelection: computedProps.setCellSelection,
      isCellSelected: computedProps.isCellSelected,
      toggleActiveCellSelection: computedProps.toggleActiveCellSelection,
      getCellSelectionBetween: computedProps.getCellSelectionBetween,
    }),
    defaultProps: () => ({}),
    isEnabled: (props) =>
      props.activeCell !== undefined ||
      props.defaultActiveCell !== undefined ||
      props.cellSelection !== undefined ||
      props.defaultCellSelection !== undefined,
    getState: (computedProps) => ({
      activeCell: computedProps.getActiveCell?.() ?? null,
      selection: computedProps.getCellSelection?.() ?? null,
    }),
  },
] as const;

export type ReactDataGridDefaultPropName =
  | "nodesProperty"
  | "nodePathSeparator"
  | "generateIdFromPath"
  | "treeNestingSize"
  | "collapseChildrenRecursive"
  | "rowExpandHeight"
  | "multiRowExpand"
  | "idProperty"
  | "theme"
  | "enableColumnFilterContextMenu"
  | "enableColumnAutosize"
  | "skipHeaderOnAutoSize"
  | "resizable"
  | "liveColumnResize"
  | "columnDefaultWidth"
  | "columnDefaultHeaderAlign"
  | "sortIconVisibility"
  | "columnMinWidth"
  | "columnMaxWidth"
  | "shareSpaceOnResize"
  | "columnResizeHandleWidth"
  | "columnResizeProxyWidth"
  | "allowGroupSplitOnReorder"
  | "filterTypes"
  | "virtualized"
  | "virtualizeColumnsThreshold"
  | "nativeScroll"
  | "scrollProps"
  | "rtl"
  | "allowMobileTransform"
  | "columnUserSelect"
  | "showCellBorders"
  | "showColumnMenuTool"
  | "sortable"
  | "sortFunctions"
  | "scrollTopOnFilter"
  | "scrollTopOnSort"
  | "columnFilterContextMenuAlignPositions"
  | "columnFilterContextMenuConstrainTo"
  | "columnFilterContextMenuPosition"
  | "updateMenuPositionOnScroll"
  | "columnContextMenuAlignPositions"
  | "columnContextMenuConstrainTo"
  | "columnContextMenuPosition"
  | "rowContextMenuAlignPositions"
  | "rowContextMenuConstrainTo"
  | "rowContextMenuPosition"
  | "updateMenuPositionOnColumnsChange"
  | "rowHeight"
  | "minRowHeight"
  | "defaultShowZebraRows"
  | "editStartEvent"
  | "isStartEditKeyPressed"
  | "autoFocusOnEditComplete"
  | "autoFocusOnEditEscape"
  | "emptyText"
  | "headerHeight"
  | "filterRowHeight"
  | "enableKeyboardNavigation"
  | "activateRowOnFocus"
  | "keyPageStep"
  | "allowRowTabNavigation"
  | "toggleRowSelectOnClick"
  | "toggleCellSelectOnClick"
  | "cellSelectionByIndex"
  | "showHoverRows"
  | "showEmptyRows"
  | "showActiveRowIndicator";

export type ReactDataGridDefaultProps = Required<
  Pick<TypeDataGridProps, ReactDataGridDefaultPropName>
>;

export const REACT_DATA_GRID_DEFAULT_PROPS: ReactDataGridDefaultProps = {
  nodesProperty: "nodes",
  nodePathSeparator: "/",
  generateIdFromPath: true,
  treeNestingSize: 22,
  collapseChildrenRecursive: true,
  rowExpandHeight: 80,
  multiRowExpand: true,
  idProperty: "id",
  theme: "default-light",
  enableColumnFilterContextMenu: true,
  enableColumnAutosize: true,
  skipHeaderOnAutoSize: false,
  resizable: true,
  liveColumnResize: false,
  columnDefaultWidth: 150,
  columnDefaultHeaderAlign: "start",
  sortIconVisibility: "always",
  columnMinWidth: 40,
  columnMaxWidth: null,
  shareSpaceOnResize: false,
  // Preserve the library's accessible pointer target while exposing the
  // Inovua-compatible sizing controls.
  columnResizeHandleWidth: 24,
  columnResizeProxyWidth: 5,
  allowGroupSplitOnReorder: true,
  filterTypes: DEFAULT_FILTER_TYPES,
  virtualized: true,
  virtualizeColumnsThreshold: 15,
  nativeScroll: false,
  scrollProps: {
    autoHide: true,
    scrollThumbMargin: 4,
    scrollThumbWidth: 6,
    scrollThumbOverWidth: 8,
    scrollThumbRadius: 3,
  },
  rtl: false,
  allowMobileTransform: false,
  columnUserSelect: false,
  showCellBorders: true,
  showColumnMenuTool: true,
  sortable: true,
  sortFunctions: DEFAULT_SORT_FUNCTIONS,
  scrollTopOnFilter: true,
  scrollTopOnSort: true,
  columnFilterContextMenuAlignPositions: ["tl-bl", "tr-br", "bl-tl", "br-tr"],
  columnFilterContextMenuConstrainTo: true,
  columnFilterContextMenuPosition: "absolute",
  updateMenuPositionOnScroll: true,
  columnContextMenuAlignPositions: [
    "tl-bl",
    "tr-br",
    "tl-tr",
    "tr-tl",
    "br-tr",
    "bl-tl",
  ],
  columnContextMenuConstrainTo: true,
  columnContextMenuPosition: "absolute",
  rowContextMenuAlignPositions: [
    "tl-bl",
    "tr-br",
    "tl-tr",
    "tr-tl",
    "br-tr",
    "bl-tl",
  ],
  rowContextMenuConstrainTo: true,
  rowContextMenuPosition: "absolute",
  updateMenuPositionOnColumnsChange: true,
  rowHeight: 40,
  minRowHeight: 20,
  defaultShowZebraRows: true,
  editStartEvent: "dblclick",
  isStartEditKeyPressed: ({ event }) => event.key === "e" && event.ctrlKey,
  autoFocusOnEditComplete: true,
  autoFocusOnEditEscape: true,
  emptyText: "noRecords",
  headerHeight: 40,
  filterRowHeight: 40,
  enableKeyboardNavigation: true,
  activateRowOnFocus: true,
  keyPageStep: 10,
  allowRowTabNavigation: false,
  toggleRowSelectOnClick: false,
  toggleCellSelectOnClick: true,
  cellSelectionByIndex: false,
  showHoverRows: true,
  showEmptyRows: false,
  showActiveRowIndicator: true,
};
