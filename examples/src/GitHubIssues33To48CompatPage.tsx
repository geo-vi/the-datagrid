import * as React from "react";

import ReactDataGrid, {
  plugins,
  type TypeColumns,
  type TypeComputedProps,
  type TypeDataGridProps,
  type TypeFilterValue,
  type TypeRowProps,
  type TypeSortInfo,
} from "../../src/main";
import packageManifest from "../../package.json";

type AuditedIssue =
  | "33"
  | "34"
  | "35"
  | "36"
  | "37"
  | "38"
  | "39"
  | "40"
  | "41"
  | "42"
  | "43"
  | "44"
  | "45";

type CompatibilityGridProps = TypeDataGridProps & Record<string, unknown>;

const CompatibilityGrid =
  ReactDataGrid as React.ComponentType<CompatibilityGridProps>;

const auditedIssues = new Set<AuditedIssue>([
  "33",
  "34",
  "35",
  "36",
  "37",
  "38",
  "39",
  "40",
  "41",
  "42",
  "43",
  "44",
  "45",
]);

const baseRows = [
  { id: "row-1", name: "Ada Lovelace", city: "London" },
  { id: "row-2", name: "Grace Hopper", city: "New York" },
  { id: "row-3", name: "Katherine Johnson", city: "White Sulphur Springs" },
];

const baseColumns: TypeColumns = [
  { name: "id", header: "ID", width: 110 },
  { name: "name", header: "Name", width: 220 },
  { name: "city", header: "City", width: 220 },
];

function readIssue(): AuditedIssue {
  if (typeof window === "undefined") return "33";

  const issue = new URLSearchParams(window.location.search).get("issue");
  return auditedIssues.has(issue as AuditedIssue)
    ? (issue as AuditedIssue)
    : "33";
}

function GridFrame(props: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`h-[280px] w-[620px] max-w-full min-w-0 overflow-hidden rounded-xl border bg-background ${props.className ?? ""}`}
      data-testid="issue-grid-frame"
    >
      {props.children}
    </div>
  );
}

function Issue33ControlledSort() {
  const rows = React.useMemo(
    () => [
      { id: "sort-z", name: "Zed" },
      { id: "sort-a", name: "Ada" },
    ],
    []
  );
  const columns = React.useMemo<TypeColumns>(
    () => [
      { name: "id", header: "ID", width: 120 },
      { name: "name", header: "Name", width: 220 },
    ],
    []
  );
  const controlledSort = React.useMemo<TypeSortInfo>(
    () => ({ name: "name", dir: 1 }),
    []
  );
  const [events, setEvents] = React.useState<TypeSortInfo[]>([]);

  return (
    <>
      <output data-testid="issue-33-sort-events">
        {JSON.stringify(events)}
      </output>
      <GridFrame>
        <CompatibilityGrid
          idProperty="id"
          columns={columns}
          dataSource={rows}
          columnOrder={["id", "name"]}
          virtualized={false}
          enableFiltering={false}
          sortInfo={controlledSort}
          onSortInfoChange={(next) =>
            setEvents((current) => [...current, next])
          }
        />
      </GridFrame>
    </>
  );
}

function Issue34FilterAlias() {
  const rows = React.useMemo(
    () => [
      { id: "filter-a", profile: { name: "Ada Lovelace" } },
      { id: "filter-g", profile: { name: "Grace Hopper" } },
    ],
    []
  );
  const columns = React.useMemo<TypeColumns>(
    () => [
      { name: "id", header: "ID", width: 120 },
      {
        name: "displayName",
        header: "Display name",
        width: 260,
        filterable: true,
        filterName: "profileName",
        getFilterValue: (value: unknown) => {
          const candidate = value as {
            profile?: { name?: string };
            data?: { profile?: { name?: string } };
          };
          return candidate.profile?.name ?? candidate.data?.profile?.name;
        },
        render: ({ data }: { data: (typeof rows)[number] }) =>
          data.profile.name,
      },
    ],
    []
  );
  const initialFilter = React.useMemo<TypeFilterValue>(
    () => [
      {
        name: "profileName",
        type: "string",
        operator: "contains",
        value: "Ada",
      },
    ],
    []
  );

  return (
    <GridFrame>
      <CompatibilityGrid
        idProperty="id"
        columns={columns}
        dataSource={rows}
        columnOrder={["id", "displayName"]}
        virtualized={false}
        enableFiltering
        defaultFilterValue={initialFilter}
        i18n={{ noRecords: "No matching alias rows" }}
      />
    </GridFrame>
  );
}

function Issue35DefaultVisibility() {
  const columns = React.useMemo<TypeColumns>(
    () => [
      baseColumns[0]!,
      baseColumns[1]!,
      {
        name: "secret",
        header: "Secret",
        width: 180,
        defaultVisible: false,
      },
      {
        name: "legacySecret",
        header: "Legacy secret",
        width: 180,
        defaultHidden: true,
      },
    ],
    []
  );
  const rows = React.useMemo(
    () =>
      baseRows.map((row) => ({
        ...row,
        secret: `secret-${row.id}`,
        legacySecret: `legacy-secret-${row.id}`,
      })),
    []
  );

  return (
    <GridFrame>
      <CompatibilityGrid
        idProperty="id"
        columns={columns}
        dataSource={rows}
        columnOrder={["id", "name", "secret", "legacySecret"]}
        virtualized={false}
        enableFiltering={false}
      />
    </GridFrame>
  );
}

function Issue36ColumnGroups() {
  const columns = React.useMemo<TypeColumns>(
    () => [
      { ...baseColumns[0]!, group: "identity" },
      { ...baseColumns[1]!, group: "identity" },
      { ...baseColumns[2]!, group: "location" },
    ],
    []
  );

  return (
    <GridFrame>
      <CompatibilityGrid
        idProperty="id"
        columns={columns}
        dataSource={baseRows}
        columnOrder={["id", "name", "city"]}
        virtualized={false}
        enableFiltering={false}
        groups={[
          { name: "identity", header: "Identity" },
          { name: "location", header: "Location" },
        ]}
      />
    </GridFrame>
  );
}

function Issue37RowContextMenu() {
  const sequenceRef = React.useRef(0);
  const callbackOrderRef = React.useRef(0);
  const callbackSawPreventedRef = React.useRef(false);
  const callbackRowPropsRef = React.useRef<TypeRowProps | null>(null);
  const useDefaultColumnMenu =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("menuMode") === "default";

  return (
    <GridFrame>
      <ReactDataGrid
        idProperty="id"
        columns={baseColumns}
        dataSource={baseRows}
        columnOrder={["id", "name", "city"]}
        virtualized={false}
        allowMobileTransform
        {...(useDefaultColumnMenu ? {} : { enableFiltering: true })}
        defaultFilterValue={[
          {
            name: "name",
            type: "string",
            operator: "contains",
            value: "",
          },
        ]}
        onRowContextMenu={(rowProps, event) => {
          callbackRowPropsRef.current = rowProps;
          callbackSawPreventedRef.current = event.defaultPrevented;
          callbackOrderRef.current = ++sequenceRef.current;
        }}
        renderColumnContextMenu={
          useDefaultColumnMenu
            ? undefined
            : (menuProps, context) => (
                <button
                  type="button"
                  role="menuitem"
                  data-testid="issue-37-column-menu"
                  data-column-id={context.cellProps.columnId}
                  data-position={menuProps.position}
                  data-align-positions={JSON.stringify(
                    menuProps.alignPositions
                  )}
                  data-has-constrain-to={String(Boolean(menuProps.constrainTo))}
                  data-api-same={
                    context.grid === context.computedProps &&
                    context.computedPropsRef.current === context.computedProps
                      ? "true"
                      : "false"
                  }
                  onClick={menuProps.onDismiss}
                >
                  Inspect column
                </button>
              )
        }
        renderColumnFilterContextMenu={(menuProps, context) => (
          <div
            data-testid="issue-37-filter-menu"
            data-column-id={context.cellProps.columnId}
            data-selected-operator={
              typeof menuProps.selected === "object"
                ? menuProps.selected.operator
                : menuProps.selected
            }
          >
            <button type="button" role="menuitem" onClick={menuProps.onDismiss}>
              Inspect filter
            </button>
          </div>
        )}
        renderRowContextMenu={(menuProps, context) => {
          const renderOrder = ++sequenceRef.current;
          return (
            <button
              type="button"
              role="menuitem"
              aria-label="Issue 37 row actions"
              data-testid="issue-37-row-menu"
              data-row-id={String(context.rowProps.id)}
              data-cell-column={context.cellProps?.columnId ?? ""}
              data-position={menuProps.position}
              data-align-positions={JSON.stringify(menuProps.alignPositions)}
              data-has-constrain-to={String(Boolean(menuProps.constrainTo))}
              data-callback-before-render={
                callbackOrderRef.current > 0 &&
                callbackOrderRef.current < renderOrder
                  ? "true"
                  : "false"
              }
              data-callback-saw-prevented={String(
                callbackSawPreventedRef.current
              )}
              data-row-props-same={String(
                callbackRowPropsRef.current === context.rowProps
              )}
              data-api-same={
                context.grid === context.computedProps &&
                context.computedPropsRef.current === context.computedProps
                  ? "true"
                  : "false"
              }
              onClick={menuProps.onDismiss}
            >
              Inspect row
            </button>
          );
        }}
        handle={(gridRef) => {
          (
            window as typeof window & {
              __issue37GridApi?: TypeComputedProps | null;
            }
          ).__issue37GridApi = gridRef.current;
        }}
      />
    </GridFrame>
  );
}

function Issue38ActiveRowNavigation() {
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);
  const [controlledActiveIndex, setControlledActiveIndex] = React.useState(0);
  const [selected, setSelected] = React.useState<TypeDataGridProps["selected"]>(
    {}
  );
  const [unselected, setUnselected] = React.useState<Record<string, boolean>>(
    {}
  );
  const [selectionEvents, setSelectionEvents] = React.useState<
    Array<{
      selected: boolean | string[] | string | number | null;
      unselected: string[];
      data: string[];
      originalDataMatches: boolean;
    }>
  >([]);
  const rows = React.useMemo(
    () =>
      Array.from({ length: 40 }, (_, index) => ({
        id: `active-${index}`,
        name: `Person ${index}`,
        city: `City ${index}`,
      })),
    []
  );
  const selectionSummary =
    selected === true
      ? {
          selected: true,
          unselected: Object.keys(unselected).sort(),
        }
      : {
          selected:
            selected && typeof selected === "object"
              ? Object.keys(selected).sort()
              : selected,
          unselected: [],
        };
  const query = React.useMemo(
    () =>
      new URLSearchParams(
        typeof window === "undefined" ? "" : window.location.search
      ),
    []
  );
  const controlledActiveMode = query.get("activeMode") === "controlled";
  const selectionMode = query.get("selectionMode");
  const navigationMode = query.get("navigationMode");
  const uncontrolledExclusions = selectionMode === "default-unselected";
  const paginationMode = query.get("dataMode") === "pagination";
  const transformsMode = query.get("dataMode") === "transforms";
  const summarizeSelected = (
    value: TypeDataGridProps["selected"]
  ): boolean | string[] | string | number | null => {
    if (
      value == null ||
      typeof value === "boolean" ||
      typeof value === "string" ||
      typeof value === "number"
    ) {
      return value ?? null;
    }
    return Object.keys(value).sort();
  };

  return (
    <>
      <output data-testid="issue-38-active-index">
        {activeIndex == null ? "none" : activeIndex}
      </output>
      <output data-testid="issue-38-selection">
        {JSON.stringify(selectionSummary)}
      </output>
      <output data-testid="issue-38-selection-events">
        {JSON.stringify(selectionEvents)}
      </output>
      <GridFrame>
        <ReactDataGrid
          idProperty="id"
          columns={baseColumns}
          dataSource={rows}
          columnOrder={["id", "name", "city"]}
          virtualized
          rowHeight={36}
          enableFiltering={transformsMode}
          defaultFilterValue={
            transformsMode
              ? [
                  {
                    name: "name",
                    type: "string",
                    operator: "contains",
                    value: "",
                  },
                ]
              : undefined
          }
          pagination={paginationMode || undefined}
          defaultLimit={paginationMode ? 5 : undefined}
          enableSelection
          multiSelect
          checkboxColumn
          checkboxOnlyRowSelect={selectionMode === "checkbox-only"}
          checkboxSelectEnableShiftKey={
            selectionMode !== "checkbox-shift-disabled"
          }
          toggleRowSelectOnClick={selectionMode === "toggle"}
          selected={uncontrolledExclusions ? undefined : selected}
          unselected={uncontrolledExclusions ? undefined : unselected}
          defaultSelected={uncontrolledExclusions ? true : undefined}
          defaultUnselected={
            uncontrolledExclusions ? { "active-0": true } : undefined
          }
          onSelectionChange={(change) => {
            const data = Array.isArray(change.data)
              ? change.data
              : change.data == null
                ? []
                : [change.data];
            setSelectionEvents((current) => [
              ...current,
              {
                selected: summarizeSelected(change.selected),
                unselected:
                  change.unselected &&
                  typeof change.unselected === "object" &&
                  !Array.isArray(change.unselected)
                    ? Object.keys(change.unselected).sort()
                    : [],
                data: data.flatMap((item) =>
                  item &&
                  typeof item === "object" &&
                  "id" in item &&
                  typeof item.id === "string"
                    ? [item.id]
                    : []
                ),
                originalDataMatches: change.originalData === rows,
              },
            ]);
            if (!uncontrolledExclusions) {
              setSelected(change.selected);
              setUnselected(
                change.unselected &&
                  typeof change.unselected === "object" &&
                  !Array.isArray(change.unselected)
                  ? (change.unselected as Record<string, boolean>)
                  : {}
              );
            }
          }}
          enableKeyboardNavigation={navigationMode !== "disabled"}
          activeIndex={controlledActiveMode ? controlledActiveIndex : undefined}
          defaultActiveIndex={navigationMode === "no-activate" ? -1 : 0}
          activeIndexThrottle={controlledActiveMode ? 40 : undefined}
          keyPageStep={5}
          allowRowTabNavigation={navigationMode !== "no-tab"}
          activateRowOnFocus={navigationMode !== "no-activate"}
          rowFocusClassName="issue-38-row-focused"
          focusedClassName="issue-38-grid-focused"
          showActiveRowIndicator={navigationMode !== "no-indicator"}
          activeRowIndicatorClassName="issue-38-active-indicator"
          onActiveIndexChange={(nextActiveIndex) => {
            setActiveIndex(nextActiveIndex);
            if (controlledActiveMode) {
              setControlledActiveIndex(nextActiveIndex);
            }
          }}
        />
      </GridFrame>
      <button
        type="button"
        data-testid="issue-38-select-all-mode"
        onClick={() => {
          setSelected(true);
          setUnselected({});
        }}
      >
        Use selected=true
      </button>
      <button type="button" data-testid="issue-38-outside-focus">
        Outside grid
      </button>
    </>
  );
}

function Issue39CellSelection() {
  const search =
    typeof window === "undefined"
      ? new URLSearchParams()
      : new URLSearchParams(window.location.search);
  const mode = search.get("selectionMode") ?? "controlled";
  const useVirtualRows = search.get("virtual") === "true";
  const transformsMode = search.get("transforms") === "true";
  const paginationMode = search.get("pagination") === "true";
  const rowCount = Number(search.get("rows") ?? (useVirtualRows ? 200 : 3));
  const initialRows = React.useMemo(
    () =>
      rowCount === 3
        ? baseRows
        : Array.from({ length: rowCount }, (_, index) => ({
            id: `row-${index + 1}`,
            name: `Person ${String(index + 1).padStart(5, "0")}`,
            city: `City ${index % 20}`,
          })),
    [rowCount]
  );
  const [rows, setRows] = React.useState(initialRows);
  const [columnOrder, setColumnOrder] = React.useState(["id", "name", "city"]);
  const [activeCell, setActiveCell] = React.useState<unknown>(null);
  const [cellSelection, setCellSelection] = React.useState<
    Record<string, boolean>
  >({});
  const [selectionEvents, setSelectionEvents] = React.useState<unknown[]>([]);
  const controlled = mode !== "uncontrolled";
  const byIndex = mode === "by-index";
  const single = mode === "single";

  return (
    <>
      <output data-testid="issue-39-active-cell">
        {activeCell == null ? "none" : JSON.stringify(activeCell)}
      </output>
      <output data-testid="issue-39-cell-selection">
        {JSON.stringify(cellSelection)}
      </output>
      <output data-testid="issue-39-selection-events">
        {JSON.stringify(selectionEvents)}
      </output>
      <button
        type="button"
        data-testid="issue-39-reverse-rows"
        onClick={() => setRows((current) => [...current].reverse())}
      >
        Reverse rows
      </button>
      <button
        type="button"
        data-testid="issue-39-reorder-columns"
        onClick={() => setColumnOrder(["city", "id", "name"])}
      >
        Reorder columns
      </button>
      <GridFrame>
        <CompatibilityGrid
          idProperty="id"
          columns={baseColumns}
          dataSource={rows}
          columnOrder={columnOrder}
          onColumnOrderChange={setColumnOrder}
          virtualized={useVirtualRows}
          enableFiltering={transformsMode}
          defaultFilterValue={
            transformsMode
              ? [
                  {
                    name: "name",
                    type: "string",
                    operator: "contains",
                    value: "",
                  },
                ]
              : undefined
          }
          pagination={paginationMode || undefined}
          defaultLimit={paginationMode ? 3 : undefined}
          cellSelection={controlled ? cellSelection : undefined}
          defaultCellSelection={controlled ? undefined : { "row-1,id": true }}
          cellSelectionByIndex={byIndex}
          multiSelect={!single}
          defaultActiveCell={[0, 0]}
          onActiveCellChange={(next: unknown) => setActiveCell(next)}
          onCellSelectionChange={(next: unknown) => {
            setCellSelection(next as Record<string, boolean>);
            setSelectionEvents((current) => [...current, next]);
          }}
          checkboxColumn={mode === "coexist"}
          enableSelection={mode === "coexist"}
          editable={mode === "coexist"}
        />
      </GridFrame>
    </>
  );
}

function Issue40CellDomProps() {
  const search =
    typeof window === "undefined"
      ? new URLSearchParams()
      : new URLSearchParams(window.location.search);
  const mode = search.get("customizationMode") ?? "dom-props";
  const rowCount = Number(
    search.get("rows") ?? (mode === "empty-rows" ? 1 : 4)
  );
  const transformsMode =
    mode === "spans" && search.get("transforms") === "true";
  const [events, setEvents] = React.useState<string[]>([]);
  const [columnOrder, setColumnOrder] = React.useState(["id", "name", "city"]);
  const [cityVisible, setCityVisible] = React.useState(true);
  const rows = React.useMemo(
    () =>
      rowCount === 1
        ? [baseRows[0]!]
        : rowCount === 4
          ? [
              ...baseRows,
              { id: "row-4", name: "Dorothy Vaughan", city: "Kansas City" },
            ]
          : Array.from({ length: rowCount }, (_, index) => ({
              id: `row-${index + 1}`,
              name: `Person ${String(index + 1).padStart(5, "0")}`,
              city: `City ${index % 20}`,
            })),
    [rowCount]
  );
  const columns = React.useMemo<TypeColumns>(
    () => [
      {
        name: "id",
        width: 110,
        rowspan:
          mode === "spans"
            ? (cell) => (cell.rowIndex % 25 === 0 ? 2 : 1)
            : undefined,
      },
      {
        name: "name",
        header: (headerCell) =>
          `Function header ${headerCell.computedVisibleIndex}`,
        width: 220,
        render: (cell) => (
          <span
            data-testid={`issue-40-render-${String(cell.rowId)}`}
            data-render-payload={JSON.stringify({
              value: cell.value,
              rowId: cell.rowId,
              selected: cell.cellSelected,
              active: cell.cellActive,
              empty: cell.empty,
              totalDataCount: cell.totalDataCount,
            })}
          >
            {String(cell.value)}
          </span>
        ),
        className: (cell) => `issue-40-cell-class-${cell.rowIndex}`,
        style: (cell) => ({
          opacity: cell.rowIndex === 0 ? 0.99 : 1,
        }),
        cellDOMProps: (cell) => ({
          "data-column-cell-props": `${cell.rowId}:${cell.columnId}`,
        }),
        colspan:
          mode === "spans"
            ? (cell) => (cell.rowIndex % 31 === 2 ? 2 : 1)
            : undefined,
        headerDOMProps: {
          "data-column-header-props": "name-header",
        },
      },
      {
        name: "city",
        header: "City",
        width: 220,
        visible: transformsMode ? cityVisible : undefined,
      },
    ],
    [cityVisible, mode, transformsMode]
  );

  return (
    <>
      <output data-testid="issue-40-events">{JSON.stringify(events)}</output>
      {transformsMode ? (
        <>
          <button
            type="button"
            data-testid="issue-40-toggle-city"
            onClick={() => setCityVisible((current) => !current)}
          >
            Toggle city visibility
          </button>
          <button
            type="button"
            data-testid="issue-40-reorder-columns"
            onClick={() => setColumnOrder(["city", "id", "name"])}
          >
            Reorder columns
          </button>
        </>
      ) : null}
      <GridFrame>
        <CompatibilityGrid
          idProperty="id"
          columns={columns}
          dataSource={rows}
          columnOrder={columnOrder}
          onColumnOrderChange={setColumnOrder}
          virtualized={mode === "spans"}
          virtualizeColumns={mode === "spans"}
          enableFiltering={transformsMode}
          defaultFilterValue={
            transformsMode
              ? [
                  {
                    name: "name",
                    type: "string",
                    operator: "contains",
                    value: "",
                  },
                ]
              : undefined
          }
          defaultCellSelection={{ "row-1,name": true }}
          defaultActiveCell={[0, 1]}
          cellDOMProps={(cell: unknown) => {
            const candidate = cell as {
              data?: { id?: string };
              name?: string;
              rowIndex?: number;
              columnIndex?: number;
            };
            return {
              "data-issue-40-cell": JSON.stringify([
                candidate.data?.id ?? null,
                candidate.name ?? null,
                candidate.rowIndex ?? null,
                candidate.columnIndex ?? null,
              ]),
            };
          }}
          headerDOMProps={(cell: unknown) => ({
            "data-root-header-props": String(
              (cell as { columnId?: string }).columnId
            ),
          })}
          rowProps={(row: TypeRowProps) => ({
            "data-row-props": String(row.id),
          })}
          rowClassName={(row: TypeRowProps) =>
            `issue-40-row-class-${row.rowIndex}`
          }
          renderRow={({ rowProps: compatibilityRowProps, ...nativeProps }) => (
            <tr
              {...nativeProps}
              data-render-row={String(compatibilityRowProps.id)}
            />
          )}
          onRowClick={(row: TypeRowProps) =>
            setEvents((current) => [...current, `row-click:${String(row.id)}`])
          }
          onRowDoubleClick={(_event: unknown, row: TypeRowProps) =>
            setEvents((current) => [...current, `row-double:${String(row.id)}`])
          }
          onCellClick={(
            _event: unknown,
            cell: { rowId?: unknown; columnId?: unknown }
          ) =>
            setEvents((current) => [
              ...current,
              `cell-click:${String(cell.rowId)}:${String(cell.columnId)}`,
            ])
          }
          onCellDoubleClick={(
            _event: unknown,
            cell: { rowId?: unknown; columnId?: unknown }
          ) =>
            setEvents((current) => [
              ...current,
              `cell-double:${String(cell.rowId)}:${String(cell.columnId)}`,
            ])
          }
          onRowContextMenu={(row: TypeRowProps) =>
            setEvents((current) => [
              ...current,
              `row-context:${String(row.id)}`,
            ])
          }
          showHoverRows={mode !== "no-hover"}
          showEmptyRows={mode === "empty-rows"}
        />
      </GridFrame>
    </>
  );
}

function Issue41EditStartValue() {
  const columns = React.useMemo<TypeColumns>(
    () => [
      baseColumns[0]!,
      {
        ...baseColumns[1]!,
        editable: true,
        getEditStartValue: async () => "seeded-by-getEditStartValue",
      },
    ],
    []
  );

  return (
    <GridFrame>
      <CompatibilityGrid
        idProperty="id"
        columns={columns}
        dataSource={baseRows}
        columnOrder={["id", "name"]}
        virtualized={false}
        enableFiltering={false}
        editable
      />
    </GridFrame>
  );
}

function Issue42PerRowHeights() {
  const apiRef = React.useRef<TypeComputedProps | null>(null);
  const [ready, setReady] = React.useState(false);
  const [rowHeights, setRowHeights] = React.useState<Record<string, number>>({
    "row-2": 88,
  });
  const [heightEvents, setHeightEvents] = React.useState<unknown[]>([]);

  return (
    <>
      <button
        type="button"
        data-testid="issue-42-set-row-height"
        disabled={!ready}
        onClick={() => {
          const api = apiRef.current as
            | (TypeComputedProps & {
                setRowHeightById?: (
                  rowHeight: number | null,
                  id: string | number
                ) => void;
              })
            | null;
          api?.setRowHeightById?.(96, "row-3");
        }}
      >
        Set row 3 height
      </button>
      <output data-testid="issue-42-height-events">
        {JSON.stringify(heightEvents)}
      </output>
      <GridFrame>
        <CompatibilityGrid
          idProperty="id"
          columns={baseColumns}
          dataSource={baseRows}
          columnOrder={["id", "name", "city"]}
          virtualized={false}
          enableFiltering={false}
          rowHeight={40}
          rowHeights={rowHeights}
          onRowHeightsChange={(next: unknown) => {
            setHeightEvents((current) => [...current, next]);
            setRowHeights(next as Record<string, number>);
          }}
          onReady={(ref) => {
            apiRef.current = ref.current;
            setReady(Boolean(ref.current));
          }}
        />
      </GridFrame>
    </>
  );
}

function Issue43InitialScroll() {
  const columns = React.useMemo<TypeColumns>(
    () =>
      Array.from({ length: 6 }, (_, index) => ({
        name: `column-${index}`,
        header: `Column ${index}`,
        width: 180,
      })),
    []
  );
  const rows = React.useMemo(
    () =>
      Array.from({ length: 40 }, (_, rowIndex) =>
        Object.fromEntries([
          ["id", `scroll-row-${rowIndex}`],
          ...columns.map((column, columnIndex) => [
            String(column.name),
            `row-${rowIndex}-column-${columnIndex}`,
          ]),
        ])
      ),
    [columns]
  );

  return (
    <GridFrame className="h-[260px] w-[460px]">
      <CompatibilityGrid
        idProperty="id"
        columns={columns}
        dataSource={rows}
        columnOrder={columns.map((column) => String(column.name))}
        virtualized={false}
        enableFiltering={false}
        initialScrollTop={120}
        initialScrollLeft={90}
      />
    </GridFrame>
  );
}

type PackageExportValue =
  | string
  | {
      browser?: string;
      import?: string;
      default?: string;
    };

type PackageProbeResult = Record<string, string>;

type PackageArtifactLoader = () => Promise<unknown>;

const packageModuleLoaders = import.meta.glob("../../dist/**/*.js") as Record<
  string,
  PackageArtifactLoader
>;
const packageStylesheetLoaders = import.meta.glob("../../dist/**/*.css", {
  query: "?raw",
  import: "default",
}) as Record<string, PackageArtifactLoader>;

function resolveBrowserExportTarget(value: PackageExportValue | undefined) {
  if (typeof value === "string") return value;
  return value?.browser ?? value?.import ?? value?.default;
}

function toPackageArtifactKey(target: string) {
  return target.startsWith("./") ? `../../${target.slice(2)}` : target;
}

function Issue44PackageBrowserConsumer() {
  const [results, setResults] = React.useState<PackageProbeResult | null>(null);

  React.useEffect(() => {
    let active = true;

    void (async () => {
      const next: PackageProbeResult = {};
      const manifest = packageManifest as {
        exports?: Record<string, PackageExportValue>;
      };
      try {
        const moduleEntries = [
          ".",
          "./BoolEditor",
          "./DateEditor",
          "./NumericEditor",
          "./StringFilter",
          "./BoolFilter",
        ];
        const stylesheetEntries = [
          "./index.css",
          "./base.css",
          "./style/theme/default-light/index.css",
          "./style/theme/default-dark/index.css",
        ];

        for (const entry of moduleEntries) {
          const target = resolveBrowserExportTarget(manifest.exports?.[entry]);
          if (!target) {
            next[entry] = "missing-export";
            continue;
          }

          try {
            const loader = packageModuleLoaders[toPackageArtifactKey(target)];
            const imported = loader ? await loader() : null;
            next[entry] =
              imported && Object.keys(imported).length > 0
                ? "loaded"
                : loader
                  ? "empty-module"
                  : "missing-artifact";
          } catch (error) {
            next[entry] =
              `load-error:${error instanceof Error ? error.name : "unknown"}`;
          }
        }

        for (const entry of stylesheetEntries) {
          const target = resolveBrowserExportTarget(manifest.exports?.[entry]);
          if (!target) {
            next[entry] = "missing-export";
            continue;
          }

          try {
            const loader =
              packageStylesheetLoaders[toPackageArtifactKey(target)];
            const css = loader ? await loader() : null;
            next[entry] =
              typeof css === "string" && css.trim()
                ? "loaded"
                : loader
                  ? "empty-stylesheet"
                  : "missing-artifact";
          } catch (error) {
            next[entry] =
              `load-error:${error instanceof Error ? error.name : "unknown"}`;
          }
        }
      } catch (error) {
        next.manifest = `load-error:${error instanceof Error ? error.name : "unknown"}`;
      }

      if (active) setResults(next);
    })();

    return () => {
      active = false;
    };
  }, []);

  return (
    <output data-testid="issue-44-package-results">
      {results == null ? "pending" : JSON.stringify(results)}
    </output>
  );
}

function Issue45UnknownComputedMethod() {
  const apiRef = React.useRef<TypeComputedProps | null>(null);
  const [ready, setReady] = React.useState(false);
  const [result, setResult] = React.useState("not-run");

  return (
    <>
      <output data-testid="issue-45-public-plugins">
        {JSON.stringify(
          plugins.map((plugin) =>
            typeof plugin === "object" &&
            plugin != null &&
            "name" in plugin &&
            typeof plugin.name === "string"
              ? plugin.name
              : null
          )
        )}
      </output>
      <button
        type="button"
        data-testid="issue-45-call-unknown"
        disabled={!ready}
        onClick={() => {
          const unknownMethod = (
            apiRef.current as TypeComputedProps & {
              getDefinitelyMissingCommunityContract?: () => unknown;
            }
          )?.getDefinitelyMissingCommunityContract;

          if (typeof unknownMethod !== "function") {
            setResult(`${typeof unknownMethod}:not-callable`);
            return;
          }

          try {
            unknownMethod();
            setResult(`${typeof unknownMethod}:succeeded`);
          } catch {
            setResult(`${typeof unknownMethod}:threw`);
          }
        }}
      >
        Call unknown computed method
      </button>
      <output data-testid="issue-45-unknown-result">{result}</output>
      <GridFrame>
        <CompatibilityGrid
          idProperty="id"
          columns={baseColumns}
          dataSource={baseRows}
          columnOrder={["id", "name", "city"]}
          virtualized={false}
          enableFiltering={false}
          onReady={(ref) => {
            apiRef.current = ref.current;
            setReady(Boolean(ref.current));
          }}
        />
      </GridFrame>
    </>
  );
}

function IssueScenario(props: { issue: AuditedIssue }) {
  switch (props.issue) {
    case "33":
      return <Issue33ControlledSort />;
    case "34":
      return <Issue34FilterAlias />;
    case "35":
      return <Issue35DefaultVisibility />;
    case "36":
      return <Issue36ColumnGroups />;
    case "37":
      return <Issue37RowContextMenu />;
    case "38":
      return <Issue38ActiveRowNavigation />;
    case "39":
      return <Issue39CellSelection />;
    case "40":
      return <Issue40CellDomProps />;
    case "41":
      return <Issue41EditStartValue />;
    case "42":
      return <Issue42PerRowHeights />;
    case "43":
      return <Issue43InitialScroll />;
    case "44":
      return <Issue44PackageBrowserConsumer />;
    case "45":
      return <Issue45UnknownComputedMethod />;
    default:
      return null;
  }
}

export default function GitHubIssues33To48CompatPage() {
  const issue = readIssue();

  return (
    <main
      className="flex min-w-0 flex-col gap-4 rounded-2xl border bg-background p-5"
      data-testid="github-issues-33-48-scenario"
      data-issue={issue}
    >
      <h1 className="text-xl font-semibold">
        GitHub issue #{issue} compatibility
      </h1>
      <IssueScenario issue={issue} />
    </main>
  );
}
