import { useMemo } from "react";

import ReactDataGrid, { type TypeColumns } from "../../src/main";
import { useExamplesUi } from "./App";

export default function IssueFiveExample() {
  const { gridTheme, i18n } = useExamplesUi();

  const issueFiveColumns: TypeColumns = useMemo(
    () => [
      { name: "ticket", header: "Ticket", defaultWidth: 220 },
      { name: "summary", header: "Summary", defaultWidth: 320 },
      { name: "owner", header: "Owner", defaultWidth: 220 },
      { name: "status", header: "Status", defaultWidth: 180 },
    ],
    []
  );

  const issueFiveRows = useMemo(
    () => [
      {
        id: 1,
        ticket: "ISSUE-5",
        summary:
          "Root grid element should stay contained inside a fixed-width card",
        owner: "layout-team",
        status: "Open",
      },
      {
        id: 2,
        ticket: "ISSUE-6",
        summary:
          "The reproduction intentionally uses columns wider than the parent shell",
        owner: "examples",
        status: "Open",
      },
    ],
    []
  );

  const issueFiveColumnOrder = useMemo(
    () => issueFiveColumns.map((column) => column.name ?? ""),
    [issueFiveColumns]
  );

  return (
    <section className="flex flex-col gap-3 rounded-2xl border bg-background/95 p-4 shadow-sm">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Issue #5 reproduction</h2>
        <p className="text-sm text-muted-foreground">
          The parent shell is fixed at 420px while the configured column widths
          sum well beyond that. The current bug is that the grid shell overflows
          the parent instead of staying contained and scrolling internally.
        </p>
      </div>

      <div
        data-testid="issue-5-parent-shell"
        className="flex rounded-xl border border-dashed bg-muted/20 p-3"
        style={{ width: 420 }}
      >
        <div className="flex flex-1 flex-col gap-3">
          <div className="text-xs text-muted-foreground">
            Fixed parent width: <span className="font-mono">420px</span>
          </div>

          <ReactDataGrid
            theme={gridTheme}
            idProperty="id"
            columns={issueFiveColumns}
            dataSource={issueFiveRows}
            columnOrder={issueFiveColumnOrder}
            enableColumnFilterContextMenu={false}
            enableColumnAutosize={false}
            skipHeaderOnAutoSize={false}
            enableFiltering={false}
            virtualized={false}
            columnUserSelect
            i18n={i18n}
            showColumnMenuTool={false}
          />
        </div>
      </div>
    </section>
  );
}
