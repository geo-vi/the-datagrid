/* eslint-disable @typescript-eslint/no-explicit-any -- Legacy row callbacks expose consumer-defined data, matching the existing grid public types. */
import type * as React from "react";

import type { IColumn, TypeDataGridProps } from "../../types";

/** Legacy master-detail contracts; integration into the grid is owned by the root task. */
export type TypeCollapsedRows = { [key: string]: boolean };
export type TypeExpandedRows = TypeCollapsedRows | true;

export type TypeRowDetailsInfo = {
  id: string | number;
  data: any;
  rowSelected: boolean;
  rowActive: boolean;
  rowExpanded: boolean;
  rowId: string | number;
  dataSource: any[];
  rowIndex: number;
  toggleRowExpand: () => void;
};

export type TypeRowExpandHeightFunction = (args: { data: any }) => number;

export type TypeRowExpandInfo = {
  data: any;
  id: string | number | null;
  index: number;
};

export type TypeRowExpandChangeInfo = TypeRowExpandInfo & {
  rowExpanded: boolean;
  expandedRows: TypeExpandedRows | undefined;
  collapsedRows: TypeCollapsedRows | true | undefined;
};

export type TypeExpandedRowsChangeInfo = Omit<
  TypeRowExpandChangeInfo,
  "data" | "index"
> & {
  data: object | null;
  index: number | undefined;
};

export type TypeMasterDetailProps = {
  renderRowDetails?: (rowDetailsInfo: TypeRowDetailsInfo) => React.ReactNode;
  /** Rendering compatibility; automatic nested-grid registration/cache is deferred. */
  renderDetailsGrid?: (
    rowDetailsInfo: TypeRowDetailsInfo,
    detailsProps: Partial<TypeDataGridProps>
  ) => React.ReactNode;
  enableRowExpand?: boolean;
  expandedRows?: TypeExpandedRows;
  defaultExpandedRows?: TypeExpandedRows;
  collapsedRows?: TypeCollapsedRows;
  defaultCollapsedRows?: TypeCollapsedRows;
  multiRowExpand?: boolean;
  isRowExpandable?: (rowInfo: {
    id: string | number;
    data: any;
    rowIndex: number;
  }) => boolean;
  unexpandableRows?: TypeCollapsedRows;
  rowExpandColumn?: boolean | IColumn;
  /** Total expanded height, including the master row. Defaults to 80. */
  rowExpandHeight?: number | TypeRowExpandHeightFunction;
  onRowExpand?: (info: TypeRowExpandInfo) => boolean | void;
  onRowCollapse?: (info: TypeRowExpandInfo) => boolean | void;
  onRowExpandChange?: (info: TypeRowExpandChangeInfo) => boolean | void;
  onExpandedRowsChange?: (info: TypeExpandedRowsChangeInfo) => boolean | void;
  renderRowDetailsExpandIcon?: () => React.ReactNode;
  renderRowDetailsCollapsedIcon?: () => React.ReactNode;
};
