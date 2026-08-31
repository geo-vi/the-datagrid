import { useMemo, useState } from "react";
import {
  CircleDollarSign,
  Eye,
  Mail,
  Settings,
  Shield,
  Zap,
} from "lucide-react";

import ReactDataGrid, {
  type CellProps,
  type TypeColumns,
  type TypeMobileListActions,
  type TypeMobileListRows,
  type TypeMobileTransformOverflow,
  type TypeMobileTransformScroll,
  type TypeMobileTransformVariant,
} from "../../src/main";
import { Button } from "../../src/components/ui/button";
import { Checkbox } from "../../src/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../src/components/ui/select";
import { useExamplesUi } from "./App";

const statuses = ["Active", "Review", "Paused"] as const;

const SCROLL_MODES: { value: TypeMobileTransformScroll; label: string }[] = [
  { value: "container", label: "Container scroll" },
  { value: "page", label: "Page scroll" },
];

const OVERFLOW_MODES: {
  value: TypeMobileTransformOverflow;
  label: string;
}[] = [
  { value: "none", label: "None" },
  { value: "show-more", label: "Show more" },
  { value: "pagination", label: "Pagination" },
  { value: "both", label: "Both" },
];

const LIST_ROW_STYLES: { value: TypeMobileListRows; label: string }[] = [
  { value: "divided", label: "Divided" },
  { value: "boxed", label: "Boxed" },
];

const LIST_ACTION_PLACEMENTS: {
  value: TypeMobileListActions;
  label: string;
}[] = [
  { value: "inline", label: "Inline" },
  { value: "bottom", label: "Bottom" },
];

const BREAKPOINTS = [640, 768, 1024, 1280];

/** Stands in for a renderer that fills its table cell to centre against the row. */
const FILL_CELL_STYLE: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "flex",
  height: "100%",
  width: "100%",
  alignItems: "center",
  justifyContent: "center",
  gap: "0.375rem",
};

// The datagrid's controls paint themselves from `--tdg-*` tokens, which
// `tdg-tokens` carries outside a grid; the Select list portals to the body.
const CONTROL_LIST_CLASS =
  "tdg-tokens border border-[var(--border)] bg-[var(--popover)] text-[var(--popover-foreground)]";

function ControlField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

export default function MobileTransformExample() {
  const { gridTheme, i18n, resizable, showCellBorders } = useExamplesUi();
  const [lastAction, setLastAction] = useState("No action selected");
  const [scroll, setScroll] = useState<TypeMobileTransformScroll>("page");
  const [overflow, setOverflow] =
    useState<TypeMobileTransformOverflow>("show-more");
  // Uncontrolled: `defaultVariant` seeds it, `onVariantChange` only reports.
  const [variant, setVariant] = useState<TypeMobileTransformVariant>("cards");
  const [breakpoint, setBreakpoint] = useState(1024);
  const [showToolbar, setShowToolbar] = useState(true);
  const [listRows, setListRows] = useState<TypeMobileListRows>("divided");
  const [listActions, setListActions] =
    useState<TypeMobileListActions>("inline");
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
      {
        name: "id",
        header: "Account ID",
        searchAliases: ["account-key"],
        width: 120,
      },
      {
        name: "account",
        header: "Account",
        minWidth: 220,
        // Claims the headline instead of leaving it to the guess.
        mobileRole: "primary",
      },
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
      {
        name: "seats",
        header: "Seats",
        type: "number",
        textAlign: "end",
      },
      {
        name: "revenue",
        header: "Revenue",
        type: "number",
        textAlign: "end",
        searchValue: (row) => [row.revenue, `ledger-${row.id}`],
        render: ({ value }: CellProps) => (
          <span className="inline-flex items-center gap-1 tabular-nums">
            <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
            {Number(value).toLocaleString("en-US")}
          </span>
        ),
      },
      { name: "owner", header: "Owner" },
      {
        name: "products",
        header: "Products",
        sortable: false,
        searchable: false,
        render: ({ data }: CellProps) => (
          <div className="tdg-cell-fill" style={FILL_CELL_STYLE}>
            <Shield className="h-4 w-4" />
            <Mail className="h-4 w-4" />
            {Number(data.seats) % 2 === 0 ? <Zap className="h-4 w-4" /> : null}
          </div>
        ),
      },
      {
        name: "mailboxes",
        header: "Mailboxes",
        sortable: false,
        searchable: false,
        render: ({ data }: CellProps) => (
          <div className="tdg-cell-fill" style={FILL_CELL_STYLE}>
            <Button size="sm" variant="outline">
              <Settings /> Configure - [{Number(data.seats) % 12}]
            </Button>
          </div>
        ),
        // The absolute fill has nothing to size against in a card.
        mobileRender: ({ data }: CellProps) => (
          <Button size="sm" variant="outline">
            <Settings /> Configure - [{Number(data.seats) % 12}]
          </Button>
        ),
      },
      {
        name: "note",
        header: "Notes",
        minWidth: 300,
        searchable: false,
      },
      {
        name: "actions",
        header: "Customer account actions",
        sortable: false,
        mobileRole: "action",
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
      {/* A dashed panel so the harness never reads as part of the grid below. */}
      <div className="tdg-tokens flex flex-col gap-3 rounded-xl border border-dashed border-[var(--border)] bg-[var(--card)] p-3">
        <div
          className="flex flex-wrap items-end gap-3 text-sm"
          data-testid="mobile-transform-controls"
        >
          <ControlField label="Scroll">
            <Select
              value={scroll}
              onValueChange={(value) =>
                setScroll(value as TypeMobileTransformScroll)
              }
            >
              <SelectTrigger
                className="h-9 w-[10.5rem]"
                data-testid="mobile-scroll-mode"
                aria-label="Scroll"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={CONTROL_LIST_CLASS}>
                {SCROLL_MODES.map((mode) => (
                  <SelectItem key={mode.value} value={mode.value}>
                    {mode.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ControlField>
          <ControlField label="Row budget">
            <Select
              value={overflow}
              onValueChange={(value) =>
                setOverflow(value as TypeMobileTransformOverflow)
              }
            >
              <SelectTrigger
                className="h-9 w-[9rem]"
                data-testid="mobile-overflow-mode"
                aria-label="Row budget"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={CONTROL_LIST_CLASS}>
                {OVERFLOW_MODES.map((mode) => (
                  <SelectItem key={mode.value} value={mode.value}>
                    {mode.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ControlField>
          <ControlField label="List rows">
            <Select
              value={listRows}
              onValueChange={(value) =>
                setListRows(value as TypeMobileListRows)
              }
            >
              <SelectTrigger
                className="h-9 w-[7.5rem]"
                data-testid="mobile-list-rows"
                aria-label="List rows"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={CONTROL_LIST_CLASS}>
                {LIST_ROW_STYLES.map((mode) => (
                  <SelectItem key={mode.value} value={mode.value}>
                    {mode.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ControlField>
          <ControlField label="List actions">
            <Select
              value={listActions}
              onValueChange={(value) =>
                setListActions(value as TypeMobileListActions)
              }
            >
              <SelectTrigger
                className="h-9 w-[7.5rem]"
                data-testid="mobile-list-actions"
                aria-label="List actions"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={CONTROL_LIST_CLASS}>
                {LIST_ACTION_PLACEMENTS.map((mode) => (
                  <SelectItem key={mode.value} value={mode.value}>
                    {mode.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ControlField>
          <ControlField label="Breakpoint">
            <Select
              value={`${breakpoint}`}
              onValueChange={(value) => setBreakpoint(Number(value))}
            >
              <SelectTrigger
                className="h-9 w-[7.5rem]"
                data-testid="mobile-breakpoint"
                aria-label="Breakpoint"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={CONTROL_LIST_CLASS}>
                {BREAKPOINTS.map((width) => (
                  <SelectItem key={width} value={`${width}`}>
                    ≤ {width}px
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ControlField>
          <label className="flex items-center gap-2 pb-2 text-sm">
            <Checkbox
              checked={showToolbar}
              data-testid="mobile-toolbar-toggle"
              onCheckedChange={(checked) => setShowToolbar(checked === true)}
            />
            Mobile toolbar
          </label>
          <output
            className="ml-auto pb-2 text-xs text-muted-foreground"
            data-testid="mobile-variant-output"
          >
            Variant: {variant}
          </output>
        </div>
        <output
          className="block text-sm text-muted-foreground"
          data-testid="mobile-action-output"
        >
          {lastAction}
        </output>
      </div>
      {/* No sizing wrapper: `minHeight`/`maxHeight` replace it, and `flex` covers
          a flex parent with a definite height. */}
      <div className="min-w-0" data-testid="mobile-transform-shell">
        <ReactDataGrid
          theme={gridTheme}
          idProperty="id"
          columns={columns}
          dataSource={rows}
          allowMobileTransform
          minHeight={300}
          maxHeight={680}
          mobileTransform={{
            breakpoint,
            scroll,
            overflow,
            defaultVariant: "cards",
            onVariantChange: setVariant,
            listRows,
            listActions,
            showToolbar,
            pageSize: 25,
            showMoreStep: 10,
          }}
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
