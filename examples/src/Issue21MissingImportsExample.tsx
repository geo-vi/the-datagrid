import { useMemo, useState } from "react";

import ReactDataGrid, {
  filterTypes,
  type CellProps,
  type TypeColumns,
  type TypeFilterTypes,
} from "../../src/main";
import { useExamplesUi } from "./App";

type ExportProbeRow = {
  id: number;
  name: string;
  role: string;
  status: "Active" | "Queued" | "Paused";
};

const rows: ExportProbeRow[] = [
  { id: 1, name: "Ada Lovelace", role: "Analyst ops", status: "Active" },
  { id: 2, name: "Grace Hopper", role: "Compiler team", status: "Queued" },
  { id: 3, name: "Katherine Johnson", role: "Flight desk", status: "Paused" },
];

const exportedFilterTypes: TypeFilterTypes = filterTypes;

function renderName(cellProps: CellProps) {
  return (
    <span
      data-testid={`issue-21-name-${cellProps.data.id}`}
      className="inline-flex max-w-full items-center gap-2 truncate"
    >
      <span className="truncate font-medium">{String(cellProps.value)}</span>
      <span className="truncate text-xs text-muted-foreground">
        {cellProps.data.role}
      </span>
    </span>
  );
}

function renderStatus(cellProps: CellProps) {
  const status = String(cellProps.value);

  return (
    <span
      data-testid={`issue-21-status-${cellProps.data.id}`}
      className="inline-flex h-6 items-center rounded-md border border-border bg-muted/40 px-2 text-xs font-medium text-foreground"
    >
      {status}
    </span>
  );
}

export default function Issue21MissingImportsExample() {
  const { gridTheme, i18n } = useExamplesUi();
  const [columnOrder, setColumnOrder] = useState(["name", "status"]);
  const [filteredRows, setFilteredRows] = useState(rows.length);

  const columns: TypeColumns = useMemo(
    () => [
      {
        name: "name",
        header: "Name",
        sortable: true,
        filterable: true,
        filterType: exportedFilterTypes.string.type,
        render: renderName,
      },
      {
        name: "status",
        header: "Status",
        sortable: true,
        filterable: true,
        filterType: exportedFilterTypes.select.type,
        filterEditorProps: {
          options: ["Active", "Queued", "Paused"],
        },
        render: renderStatus,
      },
    ],
    []
  );

  const defaultFilterValue = useMemo(
    () => [
      {
        name: "name",
        type: exportedFilterTypes.string.type,
        operator:
          exportedFilterTypes.string.operators.find(
            (operator) => operator.name === "contains"
          )?.name ?? "contains",
        value: "",
      },
    ],
    []
  );

  return (
    <section className="flex flex-col gap-3 rounded-2xl border bg-background/95 p-4 shadow-sm">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Issue 21 export example</h2>
        <p className="text-sm text-muted-foreground">
          Rendered cells use the package-entry cell props type.
        </p>
      </div>

      <div className="text-xs text-muted-foreground">
        Filtered rows: <span className="font-mono">{filteredRows}</span>
      </div>

      <ReactDataGrid
        theme={gridTheme}
        idProperty="id"
        columns={columns}
        dataSource={rows}
        columnOrder={columnOrder}
        enableColumnFilterContextMenu
        enableColumnAutosize
        skipHeaderOnAutoSize={false}
        enableFiltering
        defaultFilterValue={defaultFilterValue}
        filteredRowsCount={setFilteredRows}
        onColumnOrderChange={setColumnOrder}
        virtualized={false}
        columnUserSelect
        i18n={i18n}
        showColumnMenuTool={false}
      />
    </section>
  );
}
