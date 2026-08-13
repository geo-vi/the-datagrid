import * as React from "react";

import ReactDataGrid, {
  type TypeColumns,
  type TypeDataGridProps,
} from "@geovi/the-datagrid";
import {
  RDGSearchBar,
  RDGSearchProvider,
  RDGSearchTarget,
} from "@geovi/the-datagrid/search";
import {
  RDGToolbarProvider,
  RDGToolbarTarget,
  RDGToolbar,
} from "@geovi/the-datagrid/toolbar";
import {
  RDGProvider,
  RDGSearchBar as CombinedSearchBar,
  RDGToolbar as CombinedToolbar,
  RDGTarget,
} from "@geovi/the-datagrid/components";

const columns: TypeColumns = [
  { name: "id", header: "ID", width: 90 },
  { name: "name", header: "Name", defaultFlex: 1, filterable: true },
];
const rows = [{ id: "row-1", name: "Ada Lovelace" }];

const gridProps: TypeDataGridProps = {
  idProperty: "id",
  columns,
  dataSource: rows,
  allowMobileTransform: true,
  enableFiltering: true,
  showColumnMenuTool: true,
  virtualized: false,
};

const grid = <ReactDataGrid {...gridProps} />;

// Keep this object narrow on purpose. React 16's createElement overloads
// previously rejected literal optional props when the component/defaultProps
// intersection was not anchored to TypeDataGridProps.
const narrowGridProps = {
  idProperty: "id",
  columns,
  dataSource: rows,
  allowMobileTransform: true,
  enableFiltering: true,
  showColumnMenuTool: true,
  virtualized: false,
} satisfies TypeDataGridProps;

export const narrowCreateElementGrid = React.createElement(
  ReactDataGrid,
  narrowGridProps
);

// `idProperty` is required by the raw compatibility type but is managed by the
// component's public defaultProps contract in JSX, exactly as it is upstream.
export const defaultIdPropertyGrid = (
  <ReactDataGrid columns={columns} dataSource={rows} />
);

export const searchComposition = (
  <RDGSearchProvider>
    <RDGSearchBar />
    <RDGSearchTarget>{grid}</RDGSearchTarget>
  </RDGSearchProvider>
);

export const toolbarComposition = (
  <RDGToolbarProvider>
    <RDGToolbar showClearFilters showExport showFilterToggle />
    <RDGToolbarTarget>{grid}</RDGToolbarTarget>
  </RDGToolbarProvider>
);

export const combinedComposition = (
  <RDGProvider>
    <CombinedSearchBar />
    <CombinedToolbar />
    <RDGTarget>{grid}</RDGTarget>
  </RDGProvider>
);

export type PackedGridProps = React.ComponentProps<typeof ReactDataGrid>;
