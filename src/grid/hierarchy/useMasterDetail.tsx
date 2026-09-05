/* eslint-disable @typescript-eslint/no-explicit-any -- This adapter preserves the legacy public row-data callback contract. */
import * as React from "react";
import { IconChevronDown, IconChevronRight } from "@tabler/icons-react";

import { useStableId } from "../../hooks/useStableId";
import type { IColumn } from "../../types";
import type {
  TypeCollapsedRows,
  TypeExpandedRows,
  TypeMasterDetailProps,
  TypeRowDetailsInfo,
  TypeRowExpandChangeInfo,
} from "./masterDetailTypes";

/** Master-detail state and controls; the grid owns row/panel layout and virtualization. */
export type MasterDetailState = {
  expandedRows: TypeExpandedRows;
  collapsedRows: TypeCollapsedRows;
};

const hasFlag = (map: TypeCollapsedRows | undefined, id: string | number) =>
  Boolean(map && Object.prototype.hasOwnProperty.call(map, id) && map[id]);

export function isMasterDetailEnabled(props: TypeMasterDetailProps): boolean {
  return (
    props.enableRowExpand ??
    Boolean(
      props.renderRowDetails ||
      props.renderDetailsGrid ||
      props.expandedRows !== undefined ||
      props.defaultExpandedRows !== undefined
    )
  );
}

export function isMasterDetailExpandable(
  props: TypeMasterDetailProps,
  data: any,
  id: string | number,
  rowIndex: number
): boolean {
  return (
    isMasterDetailEnabled(props) &&
    (props.unexpandableRows !== undefined
      ? !hasFlag(props.unexpandableRows, id)
      : props.isRowExpandable?.({ id, data, rowIndex }) !== false)
  );
}

export function isMasterDetailExpanded(
  state: MasterDetailState,
  id: string | number
): boolean {
  return state.expandedRows === true
    ? !hasFlag(state.collapsedRows, id)
    : hasFlag(state.expandedRows, id);
}

/** Returns fresh maps, preserving the caller's maps and the expand-all sentinel. */
export function setMasterDetailExpanded(
  state: MasterDetailState,
  id: string | number,
  rowExpanded: boolean,
  multiRowExpand = true
): MasterDetailState {
  if (rowExpanded && !multiRowExpand) {
    return { expandedRows: { [id]: true }, collapsedRows: {} };
  }
  if (state.expandedRows === true) {
    if (!rowExpanded) {
      return {
        expandedRows: true,
        collapsedRows: { ...state.collapsedRows, [id]: true },
      };
    }
    const collapsedRows = { ...state.collapsedRows };
    delete collapsedRows[id];
    return { expandedRows: true, collapsedRows };
  }
  if (rowExpanded) {
    return {
      expandedRows: { ...state.expandedRows, [id]: true },
      collapsedRows: { ...state.collapsedRows },
    };
  }
  const expandedRows = { ...state.expandedRows };
  delete expandedRows[id];
  return { expandedRows, collapsedRows: { ...state.collapsedRows } };
}

/** Veto callbacks run before state changes or the final change notification. */
export function prepareMasterDetailToggle(args: {
  props: TypeMasterDetailProps;
  state: MasterDetailState;
  data: any;
  id: string | number;
  rowIndex: number;
}): { state: MasterDetailState; info: TypeRowExpandChangeInfo } | null {
  const { props, state, data, id, rowIndex } = args;
  if (!isMasterDetailExpandable(props, data, id, rowIndex)) return null;
  const rowExpanded = !isMasterDetailExpanded(state, id);
  const callback = rowExpanded ? props.onRowExpand : props.onRowCollapse;
  if (callback?.({ data, id, index: rowIndex }) === false) return null;
  const nextState = setMasterDetailExpanded(
    state,
    id,
    rowExpanded,
    props.multiRowExpand ?? true
  );
  const info: TypeRowExpandChangeInfo = {
    ...nextState,
    data,
    id,
    index: rowIndex,
    rowExpanded,
  };
  if (props.onRowExpandChange?.(info) === false) return null;
  return { state: nextState, info };
}

export function resolveMasterDetailHeight(
  rowExpandHeight: TypeMasterDetailProps["rowExpandHeight"],
  data: any,
  baseHeight: number
): number {
  const totalHeight =
    typeof rowExpandHeight === "function"
      ? rowExpandHeight({ data })
      : (rowExpandHeight ?? 80);
  const normalizedHeight = Number.isFinite(totalHeight) ? totalHeight : 80;
  return Math.max(0, normalizedHeight - Math.max(0, baseHeight));
}

export type UseMasterDetailResult = {
  enabled: boolean;
  showColumn: boolean;
  column: IColumn | undefined;
  expandedRows: TypeExpandedRows;
  collapsedRows: TypeCollapsedRows;
  isExpandable: (data: any, rowIndex: number) => boolean;
  isExpanded: (data: any, rowIndex: number) => boolean;
  toggle: (data: any, rowIndex: number) => void;
  getInfo: (data: any, rowIndex: number) => TypeRowDetailsInfo;
  getDetailHeight: (data: any, rowIndex: number, baseHeight: number) => number;
  getPanelId: (data: any, rowIndex: number) => string;
  renderToggle: (data: any, rowIndex: number) => React.ReactNode;
  renderDetails: (data: any, rowIndex: number) => React.ReactNode;
};

export function useMasterDetail(args: {
  props: TypeMasterDetailProps;
  rows: any[];
  getRowId: (data: any, rowIndex: number) => string | number;
  selectedMap?: Record<string, unknown>;
  activeIndex?: number;
}): UseMasterDetailResult {
  const { props, rows, getRowId, selectedMap, activeIndex } = args;
  const [internal, setInternal] = React.useState<MasterDetailState>(() => ({
    expandedRows: props.defaultExpandedRows ?? {},
    collapsedRows: props.defaultCollapsedRows ?? {},
  }));
  const state: MasterDetailState = {
    expandedRows: props.expandedRows ?? internal.expandedRows,
    collapsedRows: props.collapsedRows ?? internal.collapsedRows,
  };
  const instanceId = useStableId("tdg-details");
  const controlsRef = React.useRef(
    new Map<string | number, HTMLButtonElement>()
  );
  const enabled = isMasterDetailEnabled(props);
  const isExpandable = React.useCallback(
    (data: any, rowIndex: number) =>
      isMasterDetailExpandable(props, data, getRowId(data, rowIndex), rowIndex),
    [props, getRowId]
  );
  const isExpanded = React.useCallback(
    (data: any, rowIndex: number) =>
      isExpandable(data, rowIndex) &&
      isMasterDetailExpanded(
        {
          expandedRows: state.expandedRows,
          collapsedRows: state.collapsedRows,
        },
        getRowId(data, rowIndex)
      ),
    [isExpandable, getRowId, state.expandedRows, state.collapsedRows]
  );
  const getDetailHeight = React.useCallback(
    (data: any, rowIndex: number, baseHeight: number) =>
      isExpanded(data, rowIndex)
        ? resolveMasterDetailHeight(props.rowExpandHeight, data, baseHeight)
        : 0,
    [isExpanded, props.rowExpandHeight]
  );

  const toggle = (data: any, rowIndex: number) => {
    const id = getRowId(data, rowIndex);
    const next = prepareMasterDetailToggle({
      props,
      state,
      data,
      id,
      rowIndex,
    });
    if (!next) return;
    setInternal((previous) => ({
      expandedRows:
        props.expandedRows === undefined
          ? next.state.expandedRows
          : previous.expandedRows,
      collapsedRows:
        props.collapsedRows === undefined
          ? next.state.collapsedRows
          : previous.collapsedRows,
    }));
    props.onExpandedRowsChange?.(next.info);
    if (!next.info.rowExpanded) controlsRef.current.get(id)?.focus();
  };

  const getInfo = (data: any, rowIndex: number): TypeRowDetailsInfo => {
    const id = getRowId(data, rowIndex);
    return {
      id,
      data,
      rowSelected: Boolean(
        selectedMap &&
        Object.prototype.hasOwnProperty.call(selectedMap, id) &&
        selectedMap[id]
      ),
      rowActive: activeIndex === rowIndex,
      rowExpanded: isExpanded(data, rowIndex),
      rowId: id,
      dataSource: rows,
      rowIndex,
      toggleRowExpand: () => toggle(data, rowIndex),
    };
  };
  const getPanelId = (data: any, rowIndex: number) =>
    `${instanceId}-row-details-${encodeURIComponent(String(getRowId(data, rowIndex)))}`;

  const renderToggle = (data: any, rowIndex: number): React.ReactNode => {
    if (!isExpandable(data, rowIndex)) return null;
    const id = getRowId(data, rowIndex);
    const expanded = isExpanded(data, rowIndex);
    const renderIcon = expanded
      ? props.renderRowDetailsExpandIcon
      : props.renderRowDetailsCollapsedIcon;
    return (
      <button
        ref={(element) => {
          if (element) controlsRef.current.set(id, element);
          else controlsRef.current.delete(id);
        }}
        type="button"
        data-slot="row-detail-toggle"
        aria-label={expanded ? "Collapse row details" : "Expand row details"}
        aria-expanded={expanded}
        aria-controls={expanded ? getPanelId(data, rowIndex) : undefined}
        className="inline-flex size-7 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onPointerDown={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
        onDoubleClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          toggle(data, rowIndex);
        }}
      >
        {renderIcon ? (
          renderIcon()
        ) : expanded ? (
          <IconChevronDown className="size-4" aria-hidden="true" />
        ) : (
          <IconChevronRight className="size-4" aria-hidden="true" />
        )}
      </button>
    );
  };

  return {
    enabled,
    showColumn: enabled && props.rowExpandColumn !== false,
    column:
      typeof props.rowExpandColumn === "object"
        ? props.rowExpandColumn
        : undefined,
    ...state,
    isExpandable,
    isExpanded,
    toggle,
    getInfo,
    getDetailHeight,
    getPanelId,
    renderToggle,
    renderDetails: (data, rowIndex) =>
      isExpanded(data, rowIndex)
        ? props.renderRowDetails
          ? props.renderRowDetails(getInfo(data, rowIndex))
          : props.renderDetailsGrid?.(getInfo(data, rowIndex), {})
        : null,
  };
}
