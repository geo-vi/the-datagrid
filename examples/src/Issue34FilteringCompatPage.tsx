import * as React from "react";

import ReactDataGrid, {
  NumberFilter,
  type TypeColumns,
  type TypeComputedProps,
  type TypeDataSource,
  type TypeDataSourceArgs,
  type TypeFilterValue,
  type TypeSingleFilterValue,
} from "../../src/main";
import { Button } from "../../src/components/ui/button";
import { applyLocalFilter } from "../../src/filters/utils";

function GridShell(props: {
  testId: string;
  children: React.ReactNode;
  height?: number;
}): React.ReactElement {
  return (
    <section className="space-y-2" data-testid={props.testId}>
      <h2 className="text-sm font-semibold">{props.testId}</h2>
      <div
        className="min-h-0 w-[760px] max-w-full overflow-hidden rounded-lg border"
        style={{ height: props.height ?? 220 }}
      >
        {props.children}
      </div>
    </section>
  );
}

function makeFilter(
  value: Partial<TypeSingleFilterValue> &
    Pick<TypeSingleFilterValue, "name" | "operator" | "value">
): TypeSingleFilterValue {
  return {
    type: "string",
    ...value,
  };
}

type AliasRow = {
  id: string;
  profile: {
    displayName: string;
  };
};

const aliasRows: AliasRow[] = [
  { id: "alias-ada", profile: { displayName: "Ada Lovelace" } },
  { id: "alias-grace", profile: { displayName: "Grace Hopper" } },
];

function aliasColumns(): TypeColumns {
  return [
    { name: "id", header: "ID", width: 140, filterable: false },
    {
      name: "displayName",
      filterName: "profileName",
      header: "Display name",
      width: 240,
      type: "string",
      filterType: "string",
      getFilterValue: ({ data }) => (data as AliasRow).profile.displayName,
    },
    {
      name: "visibleMeta",
      header: "Visible metadata",
      width: 180,
      defaultVisible: true,
    },
    {
      name: "hiddenByDefault",
      header: "Hidden by default",
      width: 180,
      defaultHidden: true,
    },
    {
      name: "notVisibleByDefault",
      header: "Not visible by default",
      width: 180,
      defaultVisible: false,
    },
  ];
}

const aliasFilter = [
  makeFilter({
    name: "displayName",
    type: undefined as unknown as string,
    operator: "contains",
    value: "Ada",
  }),
];

function ProjectionScenario(): React.ReactElement {
  const columns = React.useMemo(() => aliasColumns(), []);
  const [remoteSnapshot, setRemoteSnapshot] = React.useState<Record<
    string,
    unknown
  > | null>(null);
  const remoteSource = React.useCallback((args: TypeDataSourceArgs) => {
    const entry = args.filterValue?.[0];
    setRemoteSnapshot({
      filter: entry
        ? {
            name: entry.name,
            type: entry.type ?? null,
            operator: entry.operator,
            value: entry.value,
            hasGetter: typeof entry.getFilterValue === "function",
          }
        : null,
      columnOrder: args.columnOrder,
      columns: args.columns.map((column) => String(column.id ?? column.name)),
    });
    return aliasRows;
  }, []) as TypeDataSource;

  return (
    <main
      className="space-y-6 p-6"
      data-testid="issue-34-projection"
      aria-label="Issue 34 local and remote filter projection"
    >
      <GridShell testId="issue-34-local-alias">
        <ReactDataGrid
          idProperty="id"
          columns={columns}
          dataSource={aliasRows}
          defaultFilterValue={aliasFilter}
          virtualized={false}
          showColumnMenuTool={false}
        />
      </GridShell>

      <output data-testid="issue-34-remote-snapshot">
        {JSON.stringify(remoteSnapshot)}
      </output>
      <GridShell testId="issue-34-remote-alias">
        <ReactDataGrid
          idProperty="id"
          columns={columns}
          dataSource={remoteSource}
          defaultFilterValue={aliasFilter}
          virtualized={false}
          showColumnMenuTool={false}
        />
      </GridShell>
    </main>
  );
}

type NestedRow = {
  id: string;
  profile: {
    displayName: string;
  };
};

function DescriptorScenario(): React.ReactElement {
  const getterColumns = React.useMemo<TypeColumns>(
    () => [
      { name: "id", header: "ID", width: 140, filterable: false },
      {
        name: "displayName",
        header: "Descriptor getter",
        width: 240,
        type: "string",
      },
    ],
    []
  );
  const getterRows = React.useMemo<NestedRow[]>(
    () => [
      { id: "getter-ada", profile: { displayName: "Ada Lovelace" } },
      { id: "getter-grace", profile: { displayName: "Grace Hopper" } },
    ],
    []
  );
  const getterFilter = React.useMemo<TypeFilterValue>(
    () => [
      {
        name: "displayName",
        type: "string",
        operator: "contains",
        value: "Ada",
        getFilterValue: (args: unknown) =>
          (args as { data: NestedRow }).data.profile.displayName,
      },
    ],
    []
  );
  const functionColumns = React.useMemo<TypeColumns>(
    () => [
      { name: "id", header: "ID", width: 140, filterable: false },
      {
        name: "score",
        header: "Descriptor function",
        width: 240,
        type: "number",
      },
    ],
    []
  );
  const functionFilter = React.useMemo<TypeFilterValue>(
    () => [
      {
        name: "score",
        type: "number",
        operator: "gt",
        value: 10,
        fn: (args: unknown) =>
          (args as { data: { id: string } }).data.id === "fn-keep",
      },
    ],
    []
  );

  return (
    <main
      className="space-y-6 p-6"
      data-testid="issue-34-descriptors"
      aria-label="Issue 34 descriptor hooks"
    >
      <GridShell testId="issue-34-descriptor-getter">
        <ReactDataGrid
          idProperty="id"
          columns={getterColumns}
          dataSource={getterRows}
          defaultFilterValue={getterFilter}
          virtualized={false}
          showColumnMenuTool={false}
        />
      </GridShell>
      <GridShell testId="issue-34-descriptor-function">
        <ReactDataGrid
          idProperty="id"
          columns={functionColumns}
          dataSource={[
            { id: "fn-keep", score: 1 },
            { id: "fn-drop", score: 100 },
          ]}
          defaultFilterValue={functionFilter}
          virtualized={false}
          showColumnMenuTool={false}
        />
      </GridShell>
    </main>
  );
}

function ContractFilterEditor(
  props: Record<string, unknown>
): React.ReactElement {
  const filterValue = props.filterValue as TypeSingleFilterValue | undefined;
  const summary = {
    filterEditorPropsType: typeof props.filterEditorProps,
    hasI18n: Boolean(props.i18n),
    hasTheme: typeof props.theme === "string",
    hasRender: typeof props.render === "function",
    hasCellProps: Boolean(props.cellProps),
    hasCell: Boolean(props.cell),
    hasEmptyValue: Object.hasOwn(props, "emptyValue"),
    hasFilterType: Boolean(props.filterType),
    hasOnChange: typeof props.onChange === "function",
    filterDelay: props.filterDelay ?? null,
    active: props.active ?? null,
    operator: filterValue?.operator ?? null,
  };

  return (
    <div className="flex min-w-0 items-center gap-1">
      <output data-testid="issue-34-custom-editor-props">
        {JSON.stringify(summary)}
      </output>
      <Button
        type="button"
        size="sm"
        data-testid="issue-34-custom-editor-change"
        onClick={() => {
          const onChange = props.onChange as
            | ((value: TypeSingleFilterValue) => void)
            | undefined;
          onChange?.({
            name: filterValue?.name ?? "name",
            type: filterValue?.type ?? "string",
            operator: filterValue?.operator ?? "contains",
            value: "Grace",
          });
        }}
      >
        Grace
      </Button>
    </div>
  );
}

type EditorPropsCall = {
  index: number | null;
  value: unknown;
  hasFilterValue: boolean;
  hasColumn: boolean;
  hasCellProps: boolean;
};

function EditorsScenario(): React.ReactElement {
  const [filterEvents, setFilterEvents] = React.useState<TypeFilterValue[]>([]);
  const numberCallsRef = React.useRef<EditorPropsCall[]>([]);
  const [numberCalls, setNumberCalls] = React.useState<EditorPropsCall[]>([]);
  const customEditorProps = React.useCallback(
    () => ({
      "data-consumer-prop": "preserved",
    }),
    []
  );
  const numberEditorProps = React.useCallback(
    (editorProps: Record<string, unknown>, meta: { index?: number }) => {
      numberCallsRef.current.push({
        index: typeof meta?.index === "number" ? meta.index : null,
        value: editorProps.value ?? null,
        hasFilterValue: Boolean(editorProps.filterValue),
        hasColumn: Boolean(editorProps.column),
        hasCellProps: Boolean(editorProps.cellProps),
      });
      return {
        placeholder: meta?.index === 0 ? "Minimum" : "Maximum",
      };
    },
    []
  );
  const columns = React.useMemo<TypeColumns>(
    () => [
      { name: "id", header: "ID", width: 110, filterable: false },
      {
        name: "name",
        header: "Custom editor",
        width: 330,
        type: "string",
        filterEditor: ContractFilterEditor,
        filterEditorProps: customEditorProps,
      },
      {
        name: "score",
        header: "Number range",
        width: 260,
        type: "number",
        filterEditor: NumberFilter,
        filterEditorProps: numberEditorProps,
      },
    ],
    [customEditorProps, numberEditorProps]
  );

  return (
    <main
      className="space-y-4 p-6"
      data-testid="issue-34-editors"
      aria-label="Issue 34 filter editor arguments"
    >
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          data-testid="issue-34-capture-number-editor-calls"
          onClick={() => setNumberCalls([...numberCallsRef.current])}
        >
          Capture number editor calls
        </Button>
        <output data-testid="issue-34-number-editor-calls">
          {JSON.stringify(numberCalls)}
        </output>
        <output data-testid="issue-34-editor-filter-events">
          {JSON.stringify(filterEvents)}
        </output>
      </div>
      <GridShell testId="issue-34-editor-grid" height={245}>
        <ReactDataGrid
          idProperty="id"
          columns={columns}
          dataSource={[
            { id: "editor-ada", name: "Ada", score: 2 },
            { id: "editor-grace", name: "Grace", score: 4 },
            { id: "editor-katherine", name: "Katherine", score: 8 },
          ]}
          defaultFilterValue={[
            makeFilter({
              name: "name",
              operator: "contains",
              value: "",
              active: true,
            }),
            makeFilter({
              name: "score",
              type: "number",
              operator: "inrange",
              value: { start: 1, end: 5 },
              active: true,
            }),
          ]}
          virtualized={false}
          showColumnMenuTool={false}
          onFilterValueChange={(next) =>
            setFilterEvents((current) => [...current, next])
          }
        />
      </GridShell>
    </main>
  );
}

function BooleanFilterEditor(
  props: Record<string, unknown>
): React.ReactElement {
  const filterValue = props.filterValue as TypeSingleFilterValue;
  return (
    <output data-testid={`issue-34-${String(props.columnId)}-operator`}>
      {filterValue.operator}
    </output>
  );
}

function BooleanScenario(): React.ReactElement {
  const boolColumns = React.useMemo<TypeColumns>(
    () => [
      { name: "id", header: "ID", width: 130, filterable: false },
      {
        name: "boolValue",
        header: "bool value",
        width: 180,
        filterType: "bool",
        filterEditor: BooleanFilterEditor,
      },
    ],
    []
  );
  const booleanColumns = React.useMemo<TypeColumns>(
    () => [
      { name: "id", header: "ID", width: 130, filterable: false },
      {
        name: "booleanValue",
        header: "boolean value",
        width: 180,
        filterType: "boolean",
        filterEditor: BooleanFilterEditor,
      },
    ],
    []
  );

  return (
    <main
      className="space-y-6 p-6"
      data-testid="issue-34-booleans"
      aria-label="Issue 34 boolean filtering"
    >
      <GridShell testId="issue-34-bool-default">
        <ReactDataGrid
          idProperty="id"
          columns={boolColumns}
          dataSource={[
            { id: "bool-true", boolValue: true },
            { id: "bool-false", boolValue: false },
          ]}
          defaultFilterValue={[
            makeFilter({
              name: "boolValue",
              type: "bool",
              operator: "",
              value: true,
            }),
          ]}
          virtualized={false}
          showColumnMenuTool={false}
        />
      </GridShell>
      <GridShell testId="issue-34-boolean-default">
        <ReactDataGrid
          idProperty="id"
          columns={booleanColumns}
          dataSource={[
            { id: "boolean-true", booleanValue: true },
            { id: "boolean-false", booleanValue: false },
          ]}
          defaultFilterValue={[
            makeFilter({
              name: "booleanValue",
              type: "boolean",
              operator: "",
              value: true,
            }),
          ]}
          virtualized={false}
          showColumnMenuTool={false}
        />
      </GridShell>
      <GridShell testId="issue-34-boolean-empty">
        <ReactDataGrid
          idProperty="id"
          columns={booleanColumns}
          dataSource={[
            { id: "boolean-empty-true", booleanValue: true },
            { id: "boolean-empty-false", booleanValue: false },
          ]}
          defaultFilterValue={[
            makeFilter({
              name: "booleanValue",
              type: "boolean",
              operator: "eq",
              value: null,
            }),
          ]}
          virtualized={false}
          showColumnMenuTool={false}
        />
      </GridShell>
    </main>
  );
}

function AuditTextFilterEditor(
  props: Record<string, unknown>
): React.ReactElement {
  const auditInput = props.onAuditInput as (() => void) | undefined;
  const onChange = props.onChange as ((value: string) => void) | undefined;
  return (
    <input
      aria-label={String(props.auditLabel ?? "Audit filter")}
      className="h-8 w-full rounded border px-2"
      value={String(props.value ?? "")}
      onChange={(event) => {
        auditInput?.();
        onChange?.(event.target.value);
      }}
    />
  );
}

function DelayScenario(): React.ReactElement {
  const [eventTimes, setEventTimes] = React.useState<number[]>([]);
  const columns = React.useMemo<TypeColumns>(
    () => [
      { name: "id", header: "ID", width: 130, filterable: false },
      {
        name: "name",
        header: "Name",
        width: 260,
        type: "string",
        filterDelay: 25,
      },
    ],
    []
  );

  return (
    <main
      className="space-y-4 p-6"
      data-testid="issue-34-delay"
      aria-label="Issue 34 filter delay"
    >
      <output data-testid="issue-34-delay-event-times">
        {JSON.stringify(eventTimes)}
      </output>
      <GridShell testId="issue-34-delay-grid">
        <ReactDataGrid
          idProperty="id"
          columns={columns}
          dataSource={[
            { id: "delay-ada", name: "Ada" },
            { id: "delay-grace", name: "Grace" },
          ]}
          defaultFilterValue={[
            makeFilter({
              name: "name",
              operator: "contains",
              value: "",
            }),
          ]}
          virtualized={false}
          showColumnMenuTool={false}
          onFilterValueChange={() =>
            setEventTimes((current) => [
              ...current,
              Math.round(performance.now()),
            ])
          }
        />
      </GridShell>
    </main>
  );
}

const scrollRows = Array.from({ length: 180 }, (_, index) => ({
  id: `scroll-${index + 1}`,
  name: `Row ${index + 1}`,
}));

function ScrollGrid(props: {
  testId: string;
  scrollTopOnFilter: boolean;
}): React.ReactElement {
  const columns = React.useMemo<TypeColumns>(
    () => [
      { name: "id", header: "ID", width: 140, filterable: false },
      {
        name: "name",
        header: "Name",
        width: 260,
        type: "string",
        filterEditor: AuditTextFilterEditor,
        filterEditorProps: {
          auditLabel: `${props.testId} filter`,
        },
      },
    ],
    [props.testId]
  );

  return (
    <GridShell testId={props.testId} height={270}>
      <ReactDataGrid
        idProperty="id"
        columns={columns}
        dataSource={scrollRows}
        defaultFilterValue={[
          makeFilter({
            name: "name",
            operator: "contains",
            value: "",
          }),
        ]}
        scrollTopOnFilter={props.scrollTopOnFilter}
        rowHeight={36}
        virtualized
        showColumnMenuTool={false}
      />
    </GridShell>
  );
}

function ScrollScenario(): React.ReactElement {
  return (
    <main
      className="space-y-6 p-6"
      data-testid="issue-34-scroll"
      aria-label="Issue 34 scroll reset"
    >
      <ScrollGrid testId="issue-34-scroll-enabled" scrollTopOnFilter />
      <ScrollGrid testId="issue-34-scroll-disabled" scrollTopOnFilter={false} />
    </main>
  );
}

function MenuScenario(): React.ReactElement {
  const columns = React.useMemo<TypeColumns>(
    () => [
      { name: "id", header: "ID", width: 130, filterable: false },
      { name: "name", header: "Name", width: 260, type: "string" },
    ],
    []
  );
  const filter = React.useMemo<TypeFilterValue>(
    () => [
      makeFilter({
        name: "name",
        operator: "contains",
        value: "Ada",
      }),
    ],
    []
  );
  const constrainTo = React.useCallback(() => document.body, []);
  const renderMenu = React.useCallback(
    (menuProps: Record<string, unknown>, context: Record<string, unknown>) => (
      <div
        role="menu"
        data-testid="issue-34-custom-filter-menu"
        data-position={String(
          menuProps.position ??
            (menuProps.style as { position?: string } | undefined)?.position ??
            ""
        )}
        data-has-cell-props={String(Boolean(context.cellProps))}
        data-has-grid={String(Boolean(context.grid))}
        data-has-grid-props={String(Boolean(context.props))}
        data-has-constrain-to={String(Boolean(menuProps.constrainTo))}
        data-update-position-on-scroll={String(
          menuProps.updatePositionOnScroll
        )}
        data-align-positions={JSON.stringify(menuProps.alignPositions ?? null)}
      >
        Custom filter menu
      </div>
    ),
    []
  );

  return (
    <main
      className="space-y-6 p-6"
      data-testid="issue-34-menu"
      aria-label="Issue 34 filter context menu"
    >
      <GridShell testId="issue-34-standard-menu">
        <ReactDataGrid
          idProperty="id"
          columns={columns}
          dataSource={[{ id: "menu-ada", name: "Ada" }]}
          defaultFilterValue={filter}
          enableColumnFilterContextMenu
          virtualized={false}
          showColumnMenuTool={false}
        />
      </GridShell>
      <GridShell testId="issue-34-custom-menu">
        <ReactDataGrid
          idProperty="id"
          columns={columns}
          dataSource={[{ id: "custom-menu-ada", name: "Ada" }]}
          defaultFilterValue={filter}
          enableColumnFilterContextMenu
          renderColumnFilterContextMenu={renderMenu}
          columnFilterContextMenuAlignPositions={["tl-bl"]}
          columnFilterContextMenuConstrainTo={constrainTo}
          columnFilterContextMenuPosition="fixed"
          updateMenuPositionOnScroll={false}
          virtualized={false}
          showColumnMenuTool={false}
        />
      </GridShell>
    </main>
  );
}

function OperatorScenario(): React.ReactElement {
  const stringColumns = React.useMemo<TypeColumns>(
    () => [
      { name: "id", header: "ID", width: 150, filterable: false },
      { name: "value", header: "String value", width: 220, type: "string" },
    ],
    []
  );
  const numberColumns = React.useMemo<TypeColumns>(
    () => [
      { name: "id", header: "ID", width: 150, filterable: false },
      { name: "value", header: "Number value", width: 220, type: "number" },
    ],
    []
  );
  const selectColumns = React.useMemo<TypeColumns>(
    () => [
      { name: "id", header: "ID", width: 150, filterable: false },
      { name: "value", header: "Select value", width: 220, type: "select" },
    ],
    []
  );
  const dateColumns = React.useMemo<TypeColumns>(
    () => [
      { name: "id", header: "ID", width: 150, filterable: false },
      { name: "value", header: "Date value", width: 220, type: "date" },
    ],
    []
  );

  return (
    <main
      className="space-y-6 p-6"
      data-testid="issue-34-operators"
      aria-label="Issue 34 operator semantics"
    >
      <GridShell testId="issue-34-string-falsy">
        <ReactDataGrid
          idProperty="id"
          columns={stringColumns}
          dataSource={[
            { id: "string-number-zero", value: 0 },
            { id: "string-text-zero", value: "0" },
            { id: "string-false", value: false },
          ]}
          defaultFilterValue={[
            makeFilter({
              name: "value",
              operator: "contains",
              value: "0",
            }),
          ]}
          virtualized={false}
          showColumnMenuTool={false}
        />
      </GridShell>
      <GridShell testId="issue-34-number-equality">
        <ReactDataGrid
          idProperty="id"
          columns={numberColumns}
          dataSource={[
            { id: "number-native", value: 2 },
            { id: "number-string", value: "2" },
            { id: "number-other", value: 3 },
          ]}
          defaultFilterValue={[
            makeFilter({
              name: "value",
              type: "number",
              operator: "eq",
              value: 2,
            }),
          ]}
          virtualized={false}
          showColumnMenuTool={false}
        />
      </GridShell>
      <GridShell testId="issue-34-number-empty">
        <ReactDataGrid
          idProperty="id"
          columns={numberColumns}
          dataSource={[
            { id: "number-empty-string", value: "" },
            { id: "number-zero", value: 0 },
            { id: "number-one", value: 1 },
          ]}
          defaultFilterValue={[
            makeFilter({
              name: "value",
              type: "number",
              operator: "eq",
              value: "",
            }),
          ]}
          virtualized={false}
          showColumnMenuTool={false}
        />
      </GridShell>
      <GridShell testId="issue-34-number-range">
        <ReactDataGrid
          idProperty="id"
          columns={numberColumns}
          dataSource={[
            { id: "range-one", value: 1 },
            { id: "range-two", value: 2 },
            { id: "range-three", value: 3 },
          ]}
          defaultFilterValue={[
            makeFilter({
              name: "value",
              type: "number",
              operator: "inrange",
              value: { start: 1, end: 2 },
            }),
          ]}
          virtualized={false}
          showColumnMenuTool={false}
        />
      </GridShell>
      <GridShell testId="issue-34-select-list">
        <ReactDataGrid
          idProperty="id"
          columns={selectColumns}
          dataSource={[
            { id: "select-a", value: "a" },
            { id: "select-b", value: "b" },
            { id: "select-c", value: "c" },
          ]}
          defaultFilterValue={[
            makeFilter({
              name: "value",
              type: "select",
              operator: "inlist",
              value: ["a", "c"],
            }),
          ]}
          virtualized={false}
          showColumnMenuTool={false}
        />
      </GridShell>
      <GridShell testId="issue-34-date-range">
        <ReactDataGrid
          idProperty="id"
          columns={dateColumns}
          dataSource={[
            { id: "date-start", value: "2026-01-01" },
            { id: "date-middle", value: "2026-01-15" },
            { id: "date-outside", value: "2026-02-01" },
          ]}
          defaultFilterValue={[
            makeFilter({
              name: "value",
              type: "date",
              operator: "inrange",
              value: {
                start: "2026-01-01",
                end: "2026-01-31",
              },
            }),
          ]}
          virtualized={false}
          showColumnMenuTool={false}
        />
      </GridShell>
    </main>
  );
}

type OperatorMatrixRow = {
  id: string;
  value: unknown;
};

function runOperatorCase(
  rows: OperatorMatrixRow[],
  type: string,
  operator: string,
  value: unknown
): string[] {
  return applyLocalFilter(
    rows,
    [
      {
        name: "value",
        type,
        operator,
        value,
      },
    ],
    {
      columns: [
        {
          name: "value",
          type,
          dateFormat: "YYYY-MM-DD",
        },
      ],
    }
  ).map((row) => String(row.id));
}

function OperatorMatrixScenario(): React.ReactElement {
  const matrix = React.useMemo(() => {
    const stringRows: OperatorMatrixRow[] = [
      { id: "empty", value: "" },
      { id: "null", value: null },
      { id: "number-zero", value: 0 },
      { id: "text-zero", value: "0" },
      { id: "false", value: false },
      { id: "alpha", value: "Alpha" },
      { id: "alphabet", value: "alphabet" },
      { id: "beta", value: "Beta" },
    ];
    const numberRows: OperatorMatrixRow[] = [
      { id: "null", value: null },
      { id: "empty", value: "" },
      { id: "zero", value: 0 },
      { id: "one", value: 1 },
      { id: "two", value: 2 },
      { id: "text-two", value: "2" },
      { id: "three", value: 3 },
    ];
    const booleanRows: OperatorMatrixRow[] = [
      { id: "null", value: null },
      { id: "false", value: false },
      { id: "true", value: true },
      { id: "zero", value: 0 },
      { id: "one", value: 1 },
    ];
    const selectRows: OperatorMatrixRow[] = [
      { id: "null", value: null },
      { id: "empty", value: "" },
      { id: "a", value: "a" },
      { id: "b", value: "b" },
      { id: "c", value: "c" },
      { id: "zero", value: 0 },
      { id: "false", value: false },
    ];
    const dateRows: OperatorMatrixRow[] = [
      { id: "start", value: "2026-01-01" },
      { id: "middle", value: "2026-01-15" },
      { id: "end", value: "2026-01-31" },
      { id: "outside", value: "2026-02-01" },
    ];

    return {
      string: {
        contains: runOperatorCase(stringRows, "string", "contains", "alp"),
        notContains: runOperatorCase(
          stringRows,
          "string",
          "notContains",
          "alp"
        ),
        eq: runOperatorCase(stringRows, "string", "eq", "0"),
        neq: runOperatorCase(stringRows, "string", "neq", "0"),
        empty: runOperatorCase(stringRows, "string", "empty", ""),
        notEmpty: runOperatorCase(stringRows, "string", "notEmpty", ""),
        startsWith: runOperatorCase(stringRows, "string", "startsWith", "alp"),
        endsWith: runOperatorCase(stringRows, "string", "endsWith", "a"),
        falsyNumberFilter: runOperatorCase(stringRows, "string", "contains", 0),
        falsyBooleanFilter: runOperatorCase(
          stringRows,
          "string",
          "contains",
          false
        ),
      },
      number: {
        gt: runOperatorCase(numberRows, "number", "gt", 1),
        gte: runOperatorCase(numberRows, "number", "gte", 2),
        lt: runOperatorCase(numberRows, "number", "lt", 2),
        lte: runOperatorCase(numberRows, "number", "lte", 2),
        eq: runOperatorCase(numberRows, "number", "eq", 2),
        neq: runOperatorCase(numberRows, "number", "neq", 2),
        inrange: runOperatorCase(numberRows, "number", "inrange", {
          start: 1,
          end: 2,
        }),
        notinrange: runOperatorCase(numberRows, "number", "notinrange", {
          start: 1,
          end: 2,
        }),
        emptyStringEq: runOperatorCase(numberRows, "number", "eq", ""),
        nullEq: runOperatorCase(numberRows, "number", "eq", null),
      },
      bool: {
        eq: runOperatorCase(booleanRows, "bool", "eq", true),
        neq: runOperatorCase(booleanRows, "bool", "neq", true),
        nullEq: runOperatorCase(booleanRows, "bool", "eq", null),
      },
      boolean: {
        eq: runOperatorCase(booleanRows, "boolean", "eq", true),
        neq: runOperatorCase(booleanRows, "boolean", "neq", true),
        nullEq: runOperatorCase(booleanRows, "boolean", "eq", null),
      },
      select: {
        inlist: runOperatorCase(selectRows, "select", "inlist", ["a", "c"]),
        notinlist: runOperatorCase(selectRows, "select", "notinlist", [
          "a",
          "c",
        ]),
        eq: runOperatorCase(selectRows, "select", "eq", "a"),
        neq: runOperatorCase(selectRows, "select", "neq", "a"),
        emptyList: runOperatorCase(selectRows, "select", "inlist", []),
        nullEq: runOperatorCase(selectRows, "select", "eq", null),
        scalarList: runOperatorCase(selectRows, "select", "inlist", "ab"),
      },
      date: {
        after: runOperatorCase(dateRows, "date", "after", "2026-01-15"),
        afterOrOn: runOperatorCase(dateRows, "date", "afterOrOn", "2026-01-15"),
        before: runOperatorCase(dateRows, "date", "before", "2026-01-15"),
        beforeOrOn: runOperatorCase(
          dateRows,
          "date",
          "beforeOrOn",
          "2026-01-15"
        ),
        eq: runOperatorCase(dateRows, "date", "eq", "2026-01-15"),
        neq: runOperatorCase(dateRows, "date", "neq", "2026-01-15"),
        inrange: runOperatorCase(dateRows, "date", "inrange", {
          start: "2026-01-01",
          end: "2026-01-31",
        }),
        notinrange: runOperatorCase(dateRows, "date", "notinrange", {
          start: "2026-01-01",
          end: "2026-01-31",
        }),
        emptyEq: runOperatorCase(dateRows, "date", "eq", ""),
      },
    };
  }, []);

  return (
    <main
      className="space-y-4 p-6"
      data-testid="issue-34-operator-matrix"
      aria-label="Issue 34 complete operator matrix"
    >
      <output data-testid="issue-34-operator-matrix-output">
        {JSON.stringify(matrix)}
      </output>
    </main>
  );
}

function PerformanceScenario(): React.ReactElement {
  const rowCount = 10_000;
  const rows = React.useMemo(
    () =>
      Array.from({ length: rowCount }, (_, index) => ({
        id: `filter-performance-${index}`,
        token: `token-${index % 20}`,
        value: index,
      })),
    []
  );
  const columns = React.useMemo<TypeColumns>(
    () => [
      { name: "id", header: "ID", width: 220, filterable: false },
      { name: "token", header: "Token", width: 180, type: "string" },
      { name: "value", header: "Value", width: 140, type: "number" },
    ],
    []
  );
  const apiRef = React.useRef<TypeComputedProps | null>(null);
  const startedAtRef = React.useRef(0);
  const dispatchDurationRef = React.useRef(0);
  const runRef = React.useRef(0);
  const [metrics, setMetrics] = React.useState<Record<string, unknown> | null>(
    null
  );

  const recordSettledFilter = React.useCallback(() => {
    if (!startedAtRef.current) return;

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const scope = document.querySelector(
          '[data-testid="issue-34-performance-grid"]'
        );
        const renderedRows = scope?.querySelectorAll('[data-slot="grid-row"]');
        setMetrics({
          run: runRef.current,
          rowCount,
          filteredCount: apiRef.current?.getCount() ?? null,
          runtimeMode: import.meta.env.PROD ? "production" : "development",
          dispatchDuration: dispatchDurationRef.current,
          settledDuration: performance.now() - startedAtRef.current,
          renderedRowCount: renderedRows?.length ?? 0,
          firstRow: renderedRows?.[0]?.getAttribute("data-row-id") ?? null,
        });
        startedAtRef.current = 0;
      });
    });
  }, []);

  const runFilter = React.useCallback(() => {
    const startedAt = performance.now();
    runRef.current += 1;
    startedAtRef.current = startedAt;
    apiRef.current?.setFilterValue([
      {
        name: "token",
        type: "string",
        operator: "eq",
        value: `token-${runRef.current % 5}`,
      },
    ]);
    dispatchDurationRef.current = performance.now() - startedAt;
  }, []);

  return (
    <main
      className="space-y-4 p-6"
      data-testid="issue-34-performance"
      aria-label="Issue 34 filtering performance"
    >
      <div className="flex items-center gap-3">
        <Button
          type="button"
          size="sm"
          data-testid="issue-34-performance-run"
          onClick={runFilter}
        >
          Benchmark filter
        </Button>
        <output data-testid="issue-34-performance-metrics">
          {JSON.stringify(metrics)}
        </output>
      </div>
      <GridShell testId="issue-34-performance-grid" height={420}>
        <ReactDataGrid
          idProperty="id"
          columns={columns}
          dataSource={rows}
          defaultFilterValue={[
            {
              name: "token",
              type: "string",
              operator: "eq",
              value: "",
            },
          ]}
          rowHeight={36}
          virtualized
          showColumnMenuTool={false}
          handle={(computedPropsRef) => {
            if (!computedPropsRef) return;
            apiRef.current = computedPropsRef.current;
          }}
          onFilterValueChange={recordSettledFilter}
        />
      </GridShell>
    </main>
  );
}

function readScenario():
  | "projection"
  | "descriptors"
  | "editors"
  | "booleans"
  | "delay"
  | "scroll"
  | "menu"
  | "operators"
  | "operator-matrix"
  | "performance" {
  if (typeof window === "undefined") return "projection";
  const scenario = new URLSearchParams(window.location.search).get("scenario");
  if (
    scenario === "descriptors" ||
    scenario === "editors" ||
    scenario === "booleans" ||
    scenario === "delay" ||
    scenario === "scroll" ||
    scenario === "menu" ||
    scenario === "operators" ||
    scenario === "operator-matrix" ||
    scenario === "performance"
  ) {
    return scenario;
  }
  return "projection";
}

export default function Issue34FilteringCompatPage(): React.ReactElement {
  const scenario = readScenario();

  if (scenario === "descriptors") return <DescriptorScenario />;
  if (scenario === "editors") return <EditorsScenario />;
  if (scenario === "booleans") return <BooleanScenario />;
  if (scenario === "delay") return <DelayScenario />;
  if (scenario === "scroll") return <ScrollScenario />;
  if (scenario === "menu") return <MenuScenario />;
  if (scenario === "operators") return <OperatorScenario />;
  if (scenario === "operator-matrix") return <OperatorMatrixScenario />;
  if (scenario === "performance") return <PerformanceScenario />;
  return <ProjectionScenario />;
}
