import { useMemo, useState } from "react";
import { CircleDollarSign, Eye } from "lucide-react";

import ReactDataGrid, {
  type CellProps,
  type TypeColumns,
} from "../../src/main";
import { Button } from "../../src/components/ui/button";
import { useExamplesUi } from "./App";

const statuses = ["Active", "Review", "Paused"] as const;

export default function MobileTransformExample() {
  const { gridTheme, i18n, resizable, showCellBorders } = useExamplesUi();
  const [lastAction, setLastAction] = useState("No action selected");
  const rows = useMemo(
    () =>
      Array.from({ length: 10_000 }, (_, index) => ({
        id: `AC-${String(index + 1).padStart(5, "0")}`,
        account:
          index === 9000 ? "Aurora Clinic ZX-9001" : `Account ${index + 1}`,
        status: statuses[index % statuses.length],
        seats: (index % 250) + 1,
        revenue: 1200 + ((index * 7919) % 240_000),
        owner: ["Maya Chen", "Luis Ortega", "Priya Shah", "Jon Bell"][
          index % 4
        ],
        note:
          index === 9000
            ? "Reference: AC-09001"
            : index % 7 === 0
              ? "Renewal requires legal review and procurement approval."
              : "Healthy account with regular product activity.",
      })),
    []
  );
  const columns = useMemo<TypeColumns>(
    () => [
      { name: "id", header: "Account ID", width: 120 },
      { name: "account", header: "Account", minWidth: 220 },
      {
        name: "status",
        header: "Status",
        render: ({ value }: CellProps) => (
          <span className="inline-flex items-center gap-1.5 text-sm">
            <span
              className="h-2 w-2 rounded-full bg-emerald-500"
              aria-hidden="true"
            />
            {value}
          </span>
        ),
      },
      { name: "seats", header: "Seats", textAlign: "end" },
      {
        name: "revenue",
        header: "Revenue",
        textAlign: "end",
        render: ({ value }: CellProps) => (
          <span className="inline-flex items-center gap-1 tabular-nums">
            <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
            {Number(value).toLocaleString("en-US")}
          </span>
        ),
      },
      { name: "owner", header: "Owner" },
      { name: "note", header: "Notes", minWidth: 300 },
      {
        name: "actions",
        header: "Customer account actions",
        sortable: false,
        render: ({ data }: CellProps) => (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setLastAction(`Opened ${data.account}`)}
          >
            <Eye /> View
          </Button>
        ),
      },
    ],
    []
  );

  return (
    <section
      className="flex flex-col gap-3 rounded-2xl border bg-background/95 p-4 shadow-sm"
      data-testid="mobile-transform-example"
    >
      <output
        className="block text-sm text-muted-foreground"
        data-testid="mobile-action-output"
      >
        {lastAction}
      </output>
      <div
        className="h-[680px] min-h-0 overflow-hidden"
        data-testid="mobile-transform-shell"
      >
        <ReactDataGrid
          theme={gridTheme}
          idProperty="id"
          columns={columns}
          dataSource={rows}
          allowMobileTransform
          resizable={resizable}
          enableColumnAutosize={false}
          enableFiltering
          virtualized
          showCellBorders={showCellBorders}
          i18n={i18n}
        />
      </div>
    </section>
  );
}
