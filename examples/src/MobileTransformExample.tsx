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
  type TypeMobileCardColumns,
  type TypeMobileCardFields,
  type TypeMobileListActions,
  type TypeMobileListActionsSide,
  type TypeMobileListSummaryFlow,
  type TypeMobileListSummaryLabels,
  type TypeMobileListSummarySeparator,
  type TypeMobileSettingsSurface,
  type TypeMobileListExpand,
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
import { resolveThemeBase } from "../../src/theme/context";
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

/** TEMPORARY: pads the column set out to a CWeb-sized table. */
const FILLER_COLUMNS: TypeColumns = [
  "Contract",
  "Renewal",
  "Region",
  "Segment",
  "Tier",
  "Reseller",
  "Licences",
  "Quota",
  "Domains",
  "Aliases",
  "Retention",
  "Policy",
  "Gateway",
  "Ruleset",
].map((header, index) => ({
  name: `filler${index}`,
  header,
  defaultWidth: 140,
}));

const SETTINGS_SURFACES: {
  value: TypeMobileSettingsSurface;
  label: string;
}[] = [
  { value: "drawer", label: "Drawer" },
  { value: "panel", label: "Panel" },
];

const LIST_ACTION_SIDES: {
  value: TypeMobileListActionsSide;
  label: string;
}[] = [
  { value: "end", label: "End" },
  { value: "start", label: "Start" },
];

const SUMMARY_FLOWS: { value: TypeMobileListSummaryFlow; label: string }[] = [
  { value: "wrap", label: "Wrap" },
  { value: "column", label: "Column" },
];

const SUMMARY_LABELS: { value: TypeMobileListSummaryLabels; label: string }[] = [
  { value: "show", label: "Show" },
  { value: "hide", label: "Hide" },
];

const SUMMARY_SEPARATORS: {
  value: TypeMobileListSummarySeparator;
  label: string;
}[] = [
  { value: "none", label: "None" },
  { value: "dot", label: "Dot" },
  { value: "pipe", label: "Pipe" },
  { value: "slash", label: "Slash" },
];

const LIST_FIELD_LIMITS: (number | "all")[] = [1, 2, 3, "all"];

/** Two columns a consumer might pin under the label instead of the first few. */
const PINNED_LIST_FIELD_IDS = ["status", "revenue"];

const LIST_EXPAND_MODES: { value: TypeMobileListExpand; label: string }[] = [
  { value: "none", label: "None" },
  { value: "chevron", label: "Chevron" },
  { value: "click", label: "Row click" },
];

const CARD_FIELD_STYLES: { value: TypeMobileCardFields; label: string }[] = [
  { value: "stacked", label: "Stacked" },
  { value: "inline", label: "Inline" },
];

const CARD_COLUMN_COUNTS: {
  value: TypeMobileCardColumns;
  label: string;
}[] = [
  { value: "auto", label: "Auto" },
  { value: 1, label: "One" },
  { value: 2, label: "Two" },
];

const CARD_FIELD_LIMITS: (number | "all")[] = [3, 6, "all"];

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

function ControlGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="min-w-0 rounded-lg border border-[var(--border)] px-3 pb-3 pt-1">
      <legend className="px-1 text-[0.6875rem] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </legend>
      <div className="flex flex-wrap items-end gap-3">{children}</div>
    </fieldset>
  );
}

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
  const gridThemeBase = resolveThemeBase(gridTheme);
  const [lastAction, setLastAction] = useState("No action selected");
  const [scroll, setScroll] = useState<TypeMobileTransformScroll>("page");
  const [overflow, setOverflow] =
    useState<TypeMobileTransformOverflow>("show-more");
  const [gridPagination, setGridPagination] = useState(false);
  // Uncontrolled: `defaultVariant` seeds it, `onVariantChange` only reports.
  const [variant, setVariant] = useState<TypeMobileTransformVariant>("list");
  const [breakpoint, setBreakpoint] = useState(1024);
  const [showToolbar, setShowToolbar] = useState(true);
  // TEMPORARY harness for the sticky offset. Remove before committing.
  const [hostHeader, setHostHeader] = useState(false);
  const [showSettings, setShowSettings] = useState(true);
  const [settingsSurface, setSettingsSurface] =
    useState<TypeMobileSettingsSurface>("drawer");
  // TEMPORARY: stands in for a CWeb table's column count. Remove with the mock
  // header below.
  const [manyColumns, setManyColumns] = useState(false);
  // Stands in for a consumer that persists the scope, as CWeb does for column
  // visibility. TEMPORARY: drop with the mock header below.
  const [searchColumnIds, setSearchColumnIds] = useState<string[] | undefined>(
    undefined
  );
  const [matchStickyOffset, setMatchStickyOffset] = useState(true);
  const [listRows, setListRows] = useState<TypeMobileListRows>("divided");
  const [listActions, setListActions] =
    useState<TypeMobileListActions>("inline");
  const [listActionsSide, setListActionsSide] =
    useState<TypeMobileListActionsSide>("end");
  const [listFieldLimit, setListFieldLimit] = useState<number | "all">(3);
  const [summaryFlow, setSummaryFlow] =
    useState<TypeMobileListSummaryFlow>("wrap");
  const [summaryLabels, setSummaryLabels] =
    useState<TypeMobileListSummaryLabels>("show");
  const [summarySeparator, setSummarySeparator] =
    useState<TypeMobileListSummarySeparator>("none");
  const [customSummary, setCustomSummary] = useState(false);
  const [pinnedListFields, setPinnedListFields] = useState(false);
  const [listExpand, setListExpand] = useState<TypeMobileListExpand>("click");
  const [rowExpandToggle, setRowExpandToggle] = useState(true);
  const [cardFields, setCardFields] = useState<TypeMobileCardFields>("auto");
  const [cardColumns, setCardColumns] = useState<TypeMobileCardColumns>("auto");
  const [cardFieldLimit, setCardFieldLimit] = useState<number | "all">(6);
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
        // A coloured dot and the word beside it already say "status", so the
        // label is repetition on the one line that has no room for it.
        mobileSummaryLabel: false,
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
        // A bare number says nothing once its label is hidden, so the value
        // carries its own unit on the surface that took the label away.
        mobileRender: ({
          value,
          mobileSurface,
          mobileLabelShown,
        }: CellProps) => (
          <span
            data-mobile-surface={mobileSurface}
            data-mobile-label-shown={mobileLabelShown ? "true" : "false"}
          >
            {mobileSurface === "summary" && !mobileLabelShown
              ? `${value} ${Number(value) === 1 ? "seat" : "seats"}`
              : value}
          </span>
        ),
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
      ...(manyColumns ? FILLER_COLUMNS : []),
    ],
    [manyColumns]
  );

  return (
    <section
      className={[
        "flex flex-col gap-3 rounded-2xl border p-4 shadow-sm",
        // The section is the surface the page-scrolling layout sits on, so it
        // follows the grid's theme rather than the site's: the token for the
        // exact colour, the class so the shadcn utilities inside it agree.
        gridThemeBase === "default"
          ? "bg-background/95"
          : "tdg-tokens bg-[var(--tdg-color-background)]",
        gridThemeBase === "dark" ? "dark" : "",
        gridThemeBase === "light" ? "light" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      data-theme={gridThemeBase === "default" ? undefined : gridTheme}
      data-theme-base={gridThemeBase === "default" ? undefined : gridThemeBase}
      data-testid="mobile-transform-example"
    >
      {/* A dashed panel so the harness never reads as part of the grid below. */}
      <div className="tdg-tokens flex flex-col gap-3 rounded-xl border border-dashed border-[var(--border)] bg-[var(--card)] p-3">
        <div
          className="grid items-start gap-3 text-sm min-[880px]:grid-cols-2 min-[1240px]:grid-cols-3"
          data-testid="mobile-transform-controls"
        >
          <ControlGroup title="Layout">
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
                checked={gridPagination}
                data-testid="mobile-grid-pagination-toggle"
                onCheckedChange={(checked) =>
                  setGridPagination(checked === true)
                }
              />
              Grid pagination
            </label>
          </ControlGroup>
          <ControlGroup title="Toolbar">
            <label className="flex items-center gap-2 pb-2 text-sm">
              <Checkbox
                checked={showToolbar}
                data-testid="mobile-toolbar-toggle"
                onCheckedChange={(checked) => setShowToolbar(checked === true)}
              />
              Mobile toolbar
            </label>
            <label className="flex items-center gap-2 pb-2 text-sm">
              <Checkbox
                checked={showSettings}
                data-testid="mobile-settings-toggle"
                onCheckedChange={(checked) => setShowSettings(checked === true)}
              />
              Settings button
            </label>
            {showSettings ? (
              <ControlField label="Settings surface">
                <Select
                  value={settingsSurface}
                  onValueChange={(value) =>
                    setSettingsSurface(value as TypeMobileSettingsSurface)
                  }
                >
                  <SelectTrigger
                    className="h-9 w-[6.5rem]"
                    data-testid="mobile-settings-surface"
                    aria-label="Settings surface"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={CONTROL_LIST_CLASS}>
                    {SETTINGS_SURFACES.map((mode) => (
                      <SelectItem key={mode.value} value={mode.value}>
                        {mode.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </ControlField>
            ) : null}
          </ControlGroup>
          <ControlGroup title="List rows">
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
            {variant === "list" ? (
              <ControlField label="Action side">
                <Select
                  value={listActionsSide}
                  onValueChange={(value) =>
                    setListActionsSide(value as TypeMobileListActionsSide)
                  }
                >
                  <SelectTrigger
                    className="h-9 w-[6.5rem]"
                    data-testid="mobile-list-actions-side"
                    aria-label="Action side"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={CONTROL_LIST_CLASS}>
                    {LIST_ACTION_SIDES.map((mode) => (
                      <SelectItem key={mode.value} value={mode.value}>
                        {mode.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </ControlField>
            ) : null}
            {variant === "list" ? (
              <ControlField label="Label fields">
                <Select
                  value={`${listFieldLimit}`}
                  onValueChange={(value) =>
                    setListFieldLimit(value === "all" ? "all" : Number(value))
                  }
                >
                  <SelectTrigger
                    className="h-9 w-[6.5rem]"
                    data-testid="mobile-list-field-limit"
                    aria-label="Label fields"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={CONTROL_LIST_CLASS}>
                    {LIST_FIELD_LIMITS.map((limit) => (
                      <SelectItem key={limit} value={`${limit}`}>
                        {limit === "all" ? "All" : limit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </ControlField>
            ) : null}
            {variant === "list" ? (
              <label className="flex items-center gap-2 pb-2 text-sm">
                <Checkbox
                  checked={pinnedListFields}
                  data-testid="mobile-list-pinned-fields-toggle"
                  onCheckedChange={(checked) =>
                    setPinnedListFields(checked === true)
                  }
                />
                Pin status + revenue
              </label>
            ) : null}
            {variant === "list" ? (
              <ControlField label="Summary flow">
                <Select
                  value={summaryFlow}
                  onValueChange={(value) =>
                    setSummaryFlow(value as TypeMobileListSummaryFlow)
                  }
                >
                  <SelectTrigger
                    className="h-9 w-[6.5rem]"
                    data-testid="mobile-summary-flow"
                    aria-label="Summary flow"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={CONTROL_LIST_CLASS}>
                    {SUMMARY_FLOWS.map((mode) => (
                      <SelectItem key={mode.value} value={mode.value}>
                        {mode.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </ControlField>
            ) : null}
            {variant === "list" ? (
              <ControlField label="Summary labels">
                <Select
                  value={summaryLabels}
                  onValueChange={(value) =>
                    setSummaryLabels(value as TypeMobileListSummaryLabels)
                  }
                >
                  <SelectTrigger
                    className="h-9 w-[6.5rem]"
                    data-testid="mobile-summary-labels"
                    aria-label="Summary labels"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={CONTROL_LIST_CLASS}>
                    {SUMMARY_LABELS.map((mode) => (
                      <SelectItem key={mode.value} value={mode.value}>
                        {mode.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </ControlField>
            ) : null}
            {variant === "list" && summaryFlow === "wrap" ? (
              <ControlField label="Separator">
                <Select
                  value={summarySeparator}
                  onValueChange={(value) =>
                    setSummarySeparator(value as TypeMobileListSummarySeparator)
                  }
                >
                  <SelectTrigger
                    className="h-9 w-[6.5rem]"
                    data-testid="mobile-summary-separator"
                    aria-label="Separator"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={CONTROL_LIST_CLASS}>
                    {SUMMARY_SEPARATORS.map((mode) => (
                      <SelectItem key={mode.value} value={mode.value}>
                        {mode.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </ControlField>
            ) : null}
            {variant === "list" ? (
              <label className="flex items-center gap-2 pb-2 text-sm">
                <Checkbox
                  checked={customSummary}
                  data-testid="mobile-custom-summary-toggle"
                  onCheckedChange={(checked) =>
                    setCustomSummary(checked === true)
                  }
                />
                Custom summary
              </label>
            ) : null}
            {variant === "list" ? (
              <ControlField label="Row expand">
                <Select
                  value={listExpand}
                  onValueChange={(value) =>
                    setListExpand(value as TypeMobileListExpand)
                  }
                >
                  <SelectTrigger
                    className="h-9 w-[7.5rem]"
                    data-testid="mobile-list-expand"
                    aria-label="Row expand"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={CONTROL_LIST_CLASS}>
                    {LIST_EXPAND_MODES.map((mode) => (
                      <SelectItem key={mode.value} value={mode.value}>
                        {mode.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </ControlField>
            ) : null}
            {variant === "list" && listExpand !== "none" ? (
              <label className="flex items-center gap-2 pb-2 text-sm">
                <Checkbox
                  checked={rowExpandToggle}
                  data-testid="mobile-row-expand-toggle"
                  onCheckedChange={(checked) =>
                    setRowExpandToggle(checked === true)
                  }
                />
                Chevron
              </label>
            ) : null}
          </ControlGroup>
          {variant === "cards" || listExpand !== "none" ? (
            <ControlGroup title="Cards">
              <>
                <ControlField label="Card fields">
                  <Select
                    value={cardFields}
                    onValueChange={(value) =>
                      setCardFields(value as TypeMobileCardFields)
                    }
                  >
                    <SelectTrigger
                      className="h-9 w-[7.5rem]"
                      data-testid="mobile-card-fields"
                      aria-label="Card fields"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={CONTROL_LIST_CLASS}>
                      {CARD_FIELD_STYLES.map((mode) => (
                        <SelectItem key={mode.value} value={mode.value}>
                          {mode.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </ControlField>
                <ControlField label="Card columns">
                  <Select
                    value={`${cardColumns}`}
                    onValueChange={(value) =>
                      setCardColumns(
                        value === "auto"
                          ? "auto"
                          : (Number(value) as TypeMobileCardColumns)
                      )
                    }
                  >
                    <SelectTrigger
                      className="h-9 w-[6.5rem]"
                      data-testid="mobile-card-columns"
                      aria-label="Card columns"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={CONTROL_LIST_CLASS}>
                      {CARD_COLUMN_COUNTS.map((mode) => (
                        <SelectItem key={mode.value} value={`${mode.value}`}>
                          {mode.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </ControlField>
                <ControlField label="Fields shown">
                  <Select
                    value={`${cardFieldLimit}`}
                    onValueChange={(value) =>
                      setCardFieldLimit(value === "all" ? "all" : Number(value))
                    }
                  >
                    <SelectTrigger
                      className="h-9 w-[6.5rem]"
                      data-testid="mobile-card-field-limit"
                      aria-label="Fields shown"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={CONTROL_LIST_CLASS}>
                      {CARD_FIELD_LIMITS.map((limit) => (
                        <SelectItem key={limit} value={`${limit}`}>
                          {limit === "all" ? "All" : limit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </ControlField>
              </>
            </ControlGroup>
          ) : null}
          <ControlGroup title="Harness, temporary">
            <label className="flex items-center gap-2 pb-2 text-sm">
              <Checkbox
                checked={manyColumns}
                data-testid="mobile-many-columns-toggle"
                onCheckedChange={(checked) => setManyColumns(checked === true)}
              />
              24 columns
            </label>
            <label className="flex items-center gap-2 pb-2 text-sm">
              <Checkbox
                checked={hostHeader}
                data-testid="mobile-host-header-toggle"
                onCheckedChange={(checked) => setHostHeader(checked === true)}
              />
              Mock host header
            </label>
            <label className="flex items-center gap-2 pb-2 text-sm">
              <Checkbox
                checked={matchStickyOffset}
                disabled={!hostHeader}
                data-testid="mobile-sticky-offset-toggle"
                onCheckedChange={(checked) =>
                  setMatchStickyOffset(checked === true)
                }
              />
              stickyOffset: {hostHeader && matchStickyOffset ? "56" : "0"}
            </label>
          </ControlGroup>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <output data-testid="mobile-variant-output">
            Variant: {variant}
          </output>
          <output data-testid="mobile-action-output">{lastAction}</output>
          <output data-testid="mobile-search-columns-output">
            Searched: {searchColumnIds ? searchColumnIds.join(", ") : "all"}
          </output>
        </div>
      </div>
      {/* No sizing wrapper: `minHeight`/`maxHeight` replace it, and `flex` covers
          a flex parent with a definite height. */}
      {hostHeader ? (
        <div
          /* `bg-primary` resolved to nothing here, leaving the bar
             transparent over the rows: the section only carries the grid's own
             tokens, so it takes its colours from those. z-40 keeps it under the
             settings drawer at 50. */
          className="tdg-tokens sticky top-0 z-40 flex h-14 items-center justify-between border-b border-[var(--tdg-color-border)] bg-[var(--tdg-color-card)] px-4 text-sm font-semibold text-[var(--tdg-color-card-foreground)]"
          data-testid="mobile-host-header"
        >
          <span>Mock host header</span>
          <span className="text-xs font-normal opacity-80">56px, sticky</span>
        </div>
      ) : null}
      <div className="min-w-0" data-testid="mobile-transform-shell">
        <ReactDataGrid
          theme={gridTheme}
          idProperty="id"
          columns={columns}
          dataSource={rows}
          allowMobileTransform
          pagination={gridPagination}
          defaultLimit={25}
          minHeight={300}
          maxHeight={680}
          mobileTransform={{
            breakpoint,
            scroll,
            overflow,
            defaultVariant: "list",
            onVariantChange: setVariant,
            listRows,
            listActions,
            listActionsSide,
            listFieldLimit,
            listFieldIds: pinnedListFields ? PINNED_LIST_FIELD_IDS : undefined,
            listSummaryFlow: summaryFlow,
            listSummaryLabels: summaryLabels,
            listSummarySeparator: summarySeparator,
            renderListSummary: customSummary
              ? ({ fields, renderDefault }) => (
                  <>
                    <span
                      className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary"
                      data-testid="custom-summary-badge"
                    >
                      {fields.length} fields
                    </span>
                    {renderDefault()}
                  </>
                )
              : undefined,
            listExpand,
            showRowExpandToggle: rowExpandToggle,
            cardFields,
            cardColumns,
            cardFieldLimit,
            showToolbar,
            showSettings,
            settingsSurface,
            searchColumnIds,
            onSearchColumnIdsChange: setSearchColumnIds,
            stickyOffset: hostHeader && matchStickyOffset ? 56 : 0,
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
