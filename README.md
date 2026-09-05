# the-datagrid

A fast, fully typed React data grid with an Inovua-compatible API and a
shadcn-aligned interface.

[Documentation and live examples](https://geo-vi.github.io/the-datagrid/) ·
[npm](https://www.npmjs.com/package/@geovi/the-datagrid) ·
[GitHub](https://github.com/geo-vi/the-datagrid)

## Why the-datagrid?

- Familiar Inovua Community 5.10.2 naming and behavior for easier migrations.
- Virtualized rows and columns for large datasets.
- Local and remote sorting, filtering, pagination, selection, and editing.
- Resizable, reorderable, hideable, nested, and responsive columns.
- Optional search, column controls, CSV/JSON/XLSX export, and mobile layout.
- Packaged styles with shadcn-compatible tokens—Tailwind and shadcn are not
  required in consumer apps.

## Experimental tree-grid and master-detail

This branch adds loaded tree rows and expandable detail panels using the legacy
Inovua prop names. The [compatibility specification](docs/hierarchy-compatibility.md)
lists supported behavior, acceptance checks, and remaining work. The
[archived API inventory](docs/research/inovua-hierarchy-sources.md) records the
recovered documentation and full legacy prop surface. Run `yarn dev` and open
`/examples/hierarchy` for an interactive example.

```tsx
<ReactDataGrid
  idProperty="id"
  columns={[{ name: "name", header: "Team" }]}
  dataSource={[{ id: "engineering", name: "Engineering", nodes: [
    { id: "platform", name: "Platform" },
  ] }]}
  treeColumn="name"
  defaultExpandedNodes={{}}
  enableFiltering
  defaultFilterValue={[{ name: "name", type: "string", operator: "contains", value: "" }]}
/>

<ReactDataGrid
  idProperty="id"
  columns={columns}
  dataSource={rows}
  rowExpandHeight={260}
  renderRowDetails={({ data }) => <AccountDetails account={data} />}
/>
```

Tree branches start collapsed. Uncontrolled local filters temporarily reveal
paths to matching descendants; clearing the filter restores expansion state.
`rowExpandHeight` is the **total expanded row height**, including its master
row. `renderDetailsGrid` is also available for returning a nested grid.
These extensions are a prototype; the coverage table explicitly lists deferred
Inovua features.

## Install

```bash
npm install @geovi/the-datagrid react react-dom
```

React 16.8 through 19 is supported. Package styles load automatically in modern
bundlers.

## Quick start

```tsx
import ReactDataGrid, { type TypeColumns } from "@geovi/the-datagrid";

const columns: TypeColumns = [
  { name: "id", header: "ID", sortable: true },
  { name: "name", header: "Name", sortable: true, filterable: true },
  { name: "email", header: "Email", filterable: true },
];

const rows = [
  { id: 1, name: "Ada Lovelace", email: "ada@example.com" },
  { id: 2, name: "Grace Hopper", email: "grace@example.com" },
];

export function UsersGrid() {
  return (
    <div style={{ height: 480 }}>
      <ReactDataGrid
        idProperty="id"
        columns={columns}
        dataSource={rows}
        enableFiltering
        virtualized
      />
    </div>
  );
}
```

## Search and toolbar

The optional components entry adds search, column visibility, filters, and
export without increasing the core grid API:

```tsx
import {
  RDGProvider,
  RDGSearchBar,
  RDGToolbar,
} from "@geovi/the-datagrid/components";

<RDGProvider>
  <RDGSearchBar />
  <RDGToolbar showExport showFilterToggle showClearFilters />
  <ReactDataGrid idProperty="id" columns={columns} dataSource={rows} />
</RDGProvider>;
```

Install `xlsx` only when workbook export is needed:

```bash
npm install xlsx
```

## Learn more

- [Examples and API documentation](https://geo-vi.github.io/the-datagrid/)
- [Inovua migration contract](https://geo-vi.github.io/the-datagrid/docs/migration/inovua-compat)
- [Implemented compatibility status](https://geo-vi.github.io/the-datagrid/docs/migration/inovua-status)

MIT licensed.
