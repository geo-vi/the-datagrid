import * as React from "react";

import ReactDataGrid, { type TypeColumns } from "../../src/main";

// Fixture for a header that outgrows `headerHeight`. Nothing here sets a
// height: the second and third columns render a stacked, two-line header, and
// the toggle adds a third line, so the header row grows the way a wrapped
// label does in a consumer app. What is being watched is the first data row --
// the header is a sticky, zero-height layer painted over the body, so a header
// the grid has not measured covers the row instead of pushing it down.
type StackedHeaderProps = {
  label: string;
  hint: string;
  // Separate elements rather than one long sentence: the header label is
  // `truncate`d, so text inside it never wraps on its own -- it is stacked
  // content that makes a real header outgrow its row.
  extra?: string[];
};

function StackedHeader({ label, hint, extra }: StackedHeaderProps) {
  return (
    <span className="flex flex-col items-start leading-tight">
      <span>{label}</span>
      <span className="text-xs font-normal opacity-70">{hint}</span>
      {extra?.map((line) => (
        <span key={line} className="text-xs font-normal opacity-70">
          {line}
        </span>
      ))}
    </span>
  );
}

const rows = [
  {
    id: 1,
    name: "Ada Lovelace",
    city: "London",
    amount: 1200,
  },
  { id: 2, name: "Grace Hopper", city: "New York", amount: 940 },
  { id: 3, name: "Katherine Johnson", city: "Hampton", amount: 1785 },
  { id: 4, name: "Annie Easley", city: "Cleveland", amount: 1320 },
  { id: 5, name: "Mary Jackson", city: "Hampton", amount: 1015 },
];

export default function TallHeaderCompatPage() {
  const [tallest, setTallest] = React.useState(false);
  const columns = React.useMemo<TypeColumns>(
    () => [
      { name: "id", header: "ID", width: 90 },
      {
        name: "name",
        width: 220,
        header: () => (
          <StackedHeader
            label="Name"
            hint="Given and family name"
            extra={
              tallest
                ? [
                    "As recorded in the source system",
                    "Family name last",
                    "Editable by owners only",
                  ]
                : undefined
            }
          />
        ),
      },
      {
        name: "city",
        width: 200,
        header: () => (
          <StackedHeader
            label="City"
            hint="Place of work"
            extra={
              tallest
                ? [
                    "Head office where one exists",
                    "Otherwise the billing address",
                    "Free text",
                  ]
                : undefined
            }
          />
        ),
      },
      { name: "amount", header: "Amount", width: 160, textAlign: "end" },
    ],
    [tallest]
  );

  return (
    <main
      data-testid="tall-header-scenario"
      className="mx-auto flex w-full max-w-4xl flex-col gap-4"
    >
      <header className="space-y-1">
        <p className="text-sm font-medium text-muted-foreground">
          Header height fixture
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          A header taller than headerHeight keeps the first row visible
        </h1>
        <p className="text-sm text-muted-foreground">
          Toggling the extra header lines grows the header past its 40px rows.
          The first data row must move down with it, not disappear underneath.
        </p>
      </header>
      <button
        type="button"
        data-testid="toggle-tall-header"
        className="w-fit rounded-md border px-3 py-1.5 text-sm font-medium"
        onClick={() => setTallest((current) => !current)}
      >
        {tallest ? "Shrink the header" : "Grow the header"}
      </button>
      {/* Filtering on, so the measured block covers the filter row too: it
          shares the header's sticky layer and the same reserved offset. */}
      <div
        data-testid="tall-header-grid"
        className="h-[320px] min-h-0 rounded-lg border"
      >
        <ReactDataGrid
          idProperty="id"
          columns={columns}
          dataSource={rows}
          defaultFilterValue={[
            { name: "name", operator: "contains", type: "string", value: "" },
          ]}
          enableFiltering
          virtualized={false}
        />
      </div>
      {/* The same columns virtualized: the reserved offset also feeds the row
          virtualizer's scroll margin, which is a separate code path. */}
      <div
        data-testid="tall-header-virtualized-grid"
        className="h-[320px] min-h-0 rounded-lg border"
      >
        <ReactDataGrid
          idProperty="id"
          columns={columns}
          dataSource={rows}
          virtualized
        />
      </div>
    </main>
  );
}
