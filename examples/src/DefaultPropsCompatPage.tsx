import * as React from "react";

import ReactDataGrid, { type TypeColumns } from "../../src/main";

const columns: TypeColumns = [
  { name: "id", header: "ID", defaultWidth: 72 },
  { name: "name", header: "Name", defaultWidth: 180 },
  { name: "team", header: "Team", defaultWidth: 160 },
];

const rows = [
  { id: 1, name: "Ada Lovelace", team: "Analytics" },
  { id: 2, name: "Grace Hopper", team: "Platform" },
  { id: 3, name: "Katherine Johnson", team: "Research" },
];

export default function DefaultPropsCompatPage() {
  const [filteredCount, setFilteredCount] = React.useState(rows.length);
  const defaultProps = ReactDataGrid.defaultProps;
  const defaultPropKeys = Object.keys(defaultProps).sort().join(",");
  const stringOperators =
    defaultProps.filterTypes.string.operators
      .map((operator) => operator.name)
      .join(",") || "none";
  const defaultValues = [
    `theme=${defaultProps.theme}`,
    `virtualized=${String(defaultProps.virtualized)}`,
    `rowHeight=${defaultProps.rowHeight}`,
  ].join(",");

  return (
    <main className="flex flex-col gap-6">
      <section className="rounded-lg border bg-background p-6 shadow-sm">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase text-muted-foreground">
            Runtime compat
          </p>
          <h2 className="text-2xl font-semibold">
            defaultProps compatibility check
          </h2>
          <p className="max-w-3xl text-sm text-muted-foreground">
            This page reads the default export static that Inovua integrations
            commonly inspect before rendering a grid.
          </p>
        </div>
      </section>

      <section className="grid gap-3 rounded-lg border bg-card p-4 shadow-sm md:grid-cols-2">
        <div className="rounded-md border bg-background p-3">
          <div className="text-xs font-medium uppercase text-muted-foreground">
            available
          </div>
          <div
            className="mt-2 font-mono text-sm"
            data-testid="default-props-available"
          >
            {String(Boolean(defaultProps))}
          </div>
        </div>
        <div className="rounded-md border bg-background p-3">
          <div className="text-xs font-medium uppercase text-muted-foreground">
            keys
          </div>
          <div
            className="mt-2 break-all font-mono text-sm"
            data-testid="default-props-keys"
          >
            {defaultPropKeys}
          </div>
        </div>
        <div className="rounded-md border bg-background p-3">
          <div className="text-xs font-medium uppercase text-muted-foreground">
            string operators
          </div>
          <div
            className="mt-2 break-all font-mono text-sm"
            data-testid="default-props-string-operators"
          >
            {stringOperators}
          </div>
        </div>
        <div className="rounded-md border bg-background p-3">
          <div className="text-xs font-medium uppercase text-muted-foreground">
            values
          </div>
          <div
            className="mt-2 break-all font-mono text-sm"
            data-testid="default-props-values"
          >
            {defaultValues}
          </div>
        </div>
        <div className="rounded-md border bg-background p-3">
          <div className="text-xs font-medium uppercase text-muted-foreground">
            filtered rows
          </div>
          <div
            className="mt-2 font-mono text-sm"
            data-testid="default-props-filtered-count"
          >
            {filteredCount}
          </div>
        </div>
      </section>

      <section className="rounded-lg border bg-background p-4 shadow-sm">
        <ReactDataGrid
          idProperty="id"
          columns={columns}
          dataSource={rows}
          columnOrder={["id", "name", "team"]}
          enableColumnFilterContextMenu
          enableColumnAutosize
          skipHeaderOnAutoSize={false}
          enableFiltering
          filteredRowsCount={setFilteredCount}
          onColumnOrderChange={() => undefined}
          virtualized={false}
          columnUserSelect
          showColumnMenuTool={false}
        />
      </section>
    </main>
  );
}
