import * as React from "react";

import ReactDataGrid, {
  type TypeColumnGroup,
  type TypeColumns,
  type TypeComputedProps,
} from "../../src/main";

type StackedRow = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  city: string;
  region: string;
  status: string;
  owner: string;
  updated: string;
  score: number;
  risk: string;
  [key: string]: string | number;
};

const firstNames = ["Ada", "Grace", "Katherine", "Mary", "Dorothy"];
const lastNames = ["Lovelace", "Hopper", "Johnson", "Ross", "Vaughan"];
const cities = ["Sofia", "Vienna", "London", "Tokyo", "New York"];
const regions = ["EMEA", "EMEA", "EMEA", "APAC", "Americas"];
const statuses = ["Active", "Review", "Planning", "Blocked"];
const owners = ["Foundations", "Platform", "Analytics", "Operations"];

const q1ColumnIds = Array.from({ length: 8 }, (_, index) => `q1_${index + 1}`);
const q2ColumnIds = Array.from({ length: 8 }, (_, index) => `q2_${index + 1}`);
const nearColumnIds = Array.from(
  { length: 8 },
  (_, index) => `near_${index + 1}`
);
const longColumnIds = Array.from(
  { length: 8 },
  (_, index) => `long_${index + 1}`
);
const metricColumnIds = [
  ...q1ColumnIds,
  ...q2ColumnIds,
  ...nearColumnIds,
  ...longColumnIds,
];
const initialColumnOrder = [
  "id",
  "firstName",
  "lastName",
  "email",
  "city",
  "region",
  ...metricColumnIds,
  "status",
  "owner",
  "updated",
  "score",
  "risk",
];

function makeRows(count: number): StackedRow[] {
  return Array.from({ length: count }, (_, index) => {
    const firstName = firstNames[index % firstNames.length]!;
    const lastName = lastNames[(index * 3) % lastNames.length]!;
    const row: StackedRow = {
      id: index + 1,
      firstName,
      lastName,
      email: `${firstName}.${lastName}.${index + 1}@example.com`.toLowerCase(),
      city: cities[index % cities.length]!,
      region: regions[index % regions.length]!,
      status: statuses[index % statuses.length]!,
      owner: owners[index % owners.length]!,
      updated: `2026-07-${String((index % 28) + 1).padStart(2, "0")}`,
      score: 55 + ((index * 7) % 46),
      risk: ["Low", "Medium", "High"][index % 3]!,
    };

    metricColumnIds.forEach((columnId, metricIndex) => {
      row[columnId] = (index * (metricIndex + 3) + metricIndex * 17) % 10_000;
    });
    return row;
  });
}

function metricColumns(
  ids: string[],
  group: string,
  label: string
): TypeColumns {
  return ids.map((id, index) => ({
    name: id,
    header: `${label} ${index + 1}`,
    group,
    defaultWidth: 112,
    minWidth: 72,
    maxWidth: 220,
    type: "number",
    textAlign: "end",
  }));
}

function buttonClassName(active = false) {
  return [
    "inline-flex h-8 items-center justify-center rounded-md border px-3 text-xs font-medium",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    active
      ? "border-primary bg-primary text-primary-foreground"
      : "border-input bg-background hover:bg-accent hover:text-accent-foreground",
  ].join(" ");
}

export default function StackedColumnsExample() {
  const performanceScenario =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("scenario") ===
      "performance";
  const rows = React.useMemo(
    () => makeRows(performanceScenario ? 10_000 : 320),
    [performanceScenario]
  );
  const [columnOrder, setColumnOrder] =
    React.useState<string[]>(initialColumnOrder);
  const [cityVisible, setCityVisible] = React.useState(true);
  const [allowSplit, setAllowSplit] = React.useState(true);
  const [applyOrderProposals, setApplyOrderProposals] = React.useState(true);
  const [orderProposals, setOrderProposals] = React.useState<string[][]>([]);
  const [resizeBatches, setResizeBatches] = React.useState<
    { ids: string[]; widths: number[] }[]
  >([]);
  const latestProposal = orderProposals[orderProposals.length - 1];

  const groups = React.useMemo<TypeColumnGroup[]>(
    () => [
      {
        name: "profile",
        header: ({ columnIds, segmentIndex, split }) => (
          <span
            data-testid="profile-custom-header"
            data-column-count={columnIds.length}
            data-segment-index={segmentIndex}
            data-split={split ? "true" : "false"}
            className="inline-flex items-center gap-2"
          >
            Customer profile
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {columnIds.length}
            </span>
          </span>
        ),
        headerDOMProps: ({ segmentCount }) => ({
          "data-custom-group-header": "profile",
          "data-logical-segment-count": segmentCount,
        }),
      },
      { name: "identity", header: "Identity", group: "profile" },
      { name: "contact", header: "Contact", group: "profile" },
      { name: "planning", header: "Planning", resizable: true },
      { name: "actuals", header: "Actuals", group: "planning" },
      { name: "q1", header: "Q1", group: "actuals" },
      { name: "q2", header: "Q2", group: "actuals" },
      { name: "outlook", header: "Outlook", group: "planning" },
      { name: "near", header: "Near term", group: "outlook" },
      { name: "long", header: "Long term", group: "outlook" },
      { name: "operations", header: "Operations" },
      { name: "workflow", header: "Workflow", group: "operations" },
      { name: "quality", header: "Quality", group: "operations" },
    ],
    []
  );

  const columns = React.useMemo<TypeColumns>(
    () => [
      {
        name: "id",
        header: "ID",
        group: "identity",
        defaultWidth: 90,
        minWidth: 70,
        maxWidth: 170,
        type: "number",
        textAlign: "end",
      },
      {
        name: "firstName",
        header: "First name",
        group: "identity",
        defaultWidth: 150,
        minWidth: 100,
        maxWidth: 260,
      },
      {
        name: "lastName",
        header: "Last name",
        group: "identity",
        defaultWidth: 150,
        minWidth: 100,
        maxWidth: 260,
      },
      {
        name: "email",
        header: "Email",
        group: "contact",
        defaultWidth: 240,
        minWidth: 160,
        maxWidth: 360,
      },
      {
        name: "city",
        header: "City",
        group: "contact",
        defaultWidth: 150,
        minWidth: 100,
        maxWidth: 240,
        visible: cityVisible,
      },
      {
        name: "region",
        header: "Region",
        group: "contact",
        defaultWidth: 130,
        minWidth: 90,
        maxWidth: 200,
      },
      ...metricColumns(q1ColumnIds, "q1", "Q1"),
      ...metricColumns(q2ColumnIds, "q2", "Q2"),
      ...metricColumns(nearColumnIds, "near", "Near"),
      ...metricColumns(longColumnIds, "long", "Long"),
      {
        name: "status",
        header: "Status",
        group: "workflow",
        defaultWidth: 130,
        minWidth: 90,
        maxWidth: 220,
      },
      {
        name: "owner",
        header: "Owner",
        group: "workflow",
        defaultWidth: 150,
        minWidth: 100,
        maxWidth: 240,
      },
      {
        name: "updated",
        header: "Updated",
        group: "workflow",
        defaultWidth: 140,
        minWidth: 100,
        maxWidth: 220,
      },
      {
        name: "score",
        header: "Score",
        group: "quality",
        defaultWidth: 110,
        minWidth: 75,
        maxWidth: 180,
        type: "number",
        textAlign: "end",
      },
      {
        name: "risk",
        header: "Risk",
        group: "quality",
        defaultWidth: 120,
        minWidth: 80,
        maxWidth: 180,
      },
    ],
    [cityVisible]
  );

  const splitIdentity = React.useCallback(() => {
    const next = initialColumnOrder.filter((columnId) => columnId !== "status");
    next.splice(next.indexOf("id") + 1, 0, "status");
    setColumnOrder(next);
  }, []);

  const handleReady = React.useCallback(
    (ref: React.MutableRefObject<TypeComputedProps | null>) => {
      if (!ref.current) return;
      (
        window as typeof window & {
          __issue36StackedApi?: TypeComputedProps;
        }
      ).__issue36StackedApi = ref.current;
    },
    []
  );

  React.useEffect(
    () => () => {
      delete (
        window as typeof window & {
          __issue36StackedApi?: TypeComputedProps;
        }
      ).__issue36StackedApi;
    },
    []
  );

  return (
    <section
      data-testid="stacked-columns-example"
      data-row-count={rows.length}
      className="space-y-4"
    >
      {!performanceScenario ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              data-testid="split-identity"
              className={buttonClassName()}
              onClick={splitIdentity}
            >
              Split identity
            </button>
            <button
              type="button"
              data-testid="rejoin-groups"
              className={buttonClassName()}
              onClick={() => setColumnOrder(initialColumnOrder)}
            >
              Rejoin groups
            </button>
            <button
              type="button"
              data-testid="toggle-city"
              className={buttonClassName(cityVisible)}
              onClick={() => setCityVisible((visible) => !visible)}
            >
              City: {cityVisible ? "visible" : "hidden"}
            </button>
            <button
              type="button"
              data-testid="toggle-group-splitting"
              className={buttonClassName(allowSplit)}
              onClick={() => setAllowSplit((allowed) => !allowed)}
            >
              Allow group split: {String(allowSplit)}
            </button>
            <button
              type="button"
              data-testid="toggle-order-ownership"
              className={buttonClassName(applyOrderProposals)}
              onClick={() => setApplyOrderProposals((apply) => !apply)}
            >
              Apply order proposals: {String(applyOrderProposals)}
            </button>
            <button
              type="button"
              data-testid="apply-latest-order"
              className={buttonClassName()}
              disabled={!latestProposal}
              onClick={() => {
                if (latestProposal) setColumnOrder(latestProposal);
              }}
            >
              Apply latest proposal
            </button>
          </div>

          <div className="grid gap-2 text-xs text-muted-foreground md:grid-cols-3">
            <output
              data-testid="stacked-column-order"
              className="truncate rounded-md border bg-muted/30 px-2 py-1.5"
            >
              {JSON.stringify(columnOrder)}
            </output>
            <output
              data-testid="stacked-order-proposals"
              data-proposal-count={orderProposals.length}
              className="truncate rounded-md border bg-muted/30 px-2 py-1.5"
            >
              {JSON.stringify(orderProposals)}
            </output>
            <output
              data-testid="stacked-resize-batches"
              data-batch-count={resizeBatches.length}
              className="truncate rounded-md border bg-muted/30 px-2 py-1.5"
            >
              {JSON.stringify(resizeBatches)}
            </output>
          </div>
        </>
      ) : null}

      <div
        data-testid="stacked-columns-grid"
        className="h-[440px] min-w-0 overflow-hidden rounded-lg border bg-background"
      >
        <ReactDataGrid
          idProperty="id"
          columns={columns}
          groups={groups}
          dataSource={rows}
          columnOrder={columnOrder}
          onColumnOrderChange={(nextOrder) => {
            if (!performanceScenario) {
              setOrderProposals((current) => [...current, nextOrder]);
            }
            if (applyOrderProposals) setColumnOrder(nextOrder);
          }}
          allowGroupSplitOnReorder={allowSplit}
          onBatchColumnResize={(entries) => {
            if (!performanceScenario) {
              setResizeBatches((current) => [
                ...current,
                {
                  ids: entries.map(
                    ({ column }) => column.id ?? column.name ?? ""
                  ),
                  widths: entries.map(({ width }) => Math.round(width ?? 0)),
                },
              ]);
            }
          }}
          onReady={handleReady}
          enableFiltering
          defaultFilterValue={[
            {
              name: "firstName",
              type: "string",
              operator: "contains",
              value: "",
            },
          ]}
          virtualized
          virtualizeColumns
          virtualizeColumnsThreshold={1}
          columnDefaultWidth={112}
          columnMinWidth={70}
          showColumnMenuTool={false}
        />
      </div>
    </section>
  );
}
