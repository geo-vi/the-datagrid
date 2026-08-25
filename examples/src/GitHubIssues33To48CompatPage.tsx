import * as React from "react";

import ReactDataGrid, {
  BoolEditor,
  BoolFilter,
  DateEditor,
  DateFilter,
  NumberFilter,
  NumericEditor,
  SelectFilter,
  SelectEditor,
  StringFilter,
  TextEditor,
  plugins,
  type CellProps,
  type TypeColumns,
  type TypeComputedProps,
  type TypeDataGridProps,
  type TypeFilterValue,
  type TypeRowProps,
  type TypeSortInfo,
} from "../../src/main";
import packageManifest from "../../package.json";
import communityApiManifest from "../../community-api-manifest.json";

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
          if (!gridRef) return;
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
  const mode =
    typeof window === "undefined"
      ? "async-seed"
      : (new URLSearchParams(window.location.search).get("editingMode") ??
        "async-seed");
  const [events, setEvents] = React.useState<string[]>([]);
  const editorModuleRows = React.useMemo(
    () => [
      {
        id: "editor-row-1",
        active: true,
        amount: 42,
        date: "2026-07-29",
        tier: "basic",
      },
      {
        id: "editor-row-2",
        active: false,
        amount: 84,
        date: "2026-07-30",
        tier: "premium",
      },
    ],
    []
  );
  const columns = React.useMemo<TypeColumns>(() => {
    if (mode === "column-callbacks") {
      // These run with `(value, cellProps)` ahead of the grid-level handlers.
      const log = (entry: string) =>
        setEvents((current) => [...current, entry]);
      return [
        { name: "id", header: "ID", editable: false },
        {
          name: "name",
          header: "Name",
          editable: true,
          editor: TextEditor,
          editorProps: { trim: true, seamless: true },
          getEditCompleteValue: (value: unknown) => `${String(value)}!`,
          onEditStart: (value: unknown, cellProps: CellProps) =>
            log(`col-start:${String(cellProps.rowId)}:${String(value)}`),
          onEditValueChange: (value: unknown) =>
            log(`col-change:${String(value)}`),
          onEditStop: (value: unknown) => log(`col-stop:${String(value)}`),
          onEditComplete: (value: unknown, cellProps: CellProps) =>
            log(`col-complete:${String(cellProps.rowId)}:${String(value)}`),
          onEditCancel: (cellProps: CellProps) =>
            log(`col-cancel:${String(cellProps.rowId)}`),
        },
      ];
    }

    if (mode === "modules") {
      return [
        { name: "id", header: "ID", editable: false },
        {
          name: "active",
          header: "Active",
          editable: true,
          editor: BoolEditor,
        },
        {
          name: "amount",
          header: "Amount",
          editable: true,
          editor: NumericEditor,
        },
        {
          name: "date",
          header: "Date",
          editable: true,
          editor: DateEditor,
        },
        {
          name: "tier",
          header: "Tier",
          editable: true,
          editor: SelectEditor,
          editorProps: {
            dataSource: [
              { id: "basic", label: "Basic" },
              { id: "premium", label: "Premium" },
            ],
          },
        },
      ];
    }

    const nameColumn = {
      ...baseColumns[1]!,
      editable: true,
      ...(mode === "reject"
        ? {
            getEditStartValue: async () => {
              throw new Error("rejected-start-value");
            },
          }
        : {
            getEditStartValue: async () => {
              await Promise.resolve();
              return "seeded-by-getEditStartValue";
            },
          }),
      ...(mode === "inline"
        ? {
            rendersInlineEditor: true,
            render: (cellProps: CellProps) => (
              <input
                data-testid={`issue-41-inline-${String(cellProps.rowId)}`}
                value={String(
                  cellProps.editProps?.value ?? cellProps.value ?? ""
                )}
                onFocus={() => {
                  void cellProps.editProps?.startEdit();
                }}
                onChange={(event) =>
                  cellProps.editProps?.onChange(event.target.value, event)
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    cellProps.editProps?.onComplete(event.currentTarget.value);
                  }
                  if (event.key === "Escape") {
                    event.preventDefault();
                    cellProps.editProps?.onCancel(event);
                  }
                }}
              />
            ),
          }
        : {}),
    };

    return [{ ...baseColumns[0]!, editable: false }, nameColumn];
  }, [mode]);

  return (
    <>
      <output data-testid="issue-41-edit-events">
        {JSON.stringify(events)}
      </output>
      <button type="button" data-testid="issue-41-blur-target">
        Move focus outside the editor
      </button>
      <GridFrame>
        <CompatibilityGrid
          idProperty="id"
          columns={columns}
          dataSource={mode === "modules" ? editorModuleRows : baseRows}
          columnOrder={
            mode === "modules"
              ? ["id", "active", "amount", "date", "tier"]
              : ["id", "name"]
          }
          virtualized={false}
          enableFiltering={false}
          editable
          isStartEditKeyPressed={
            mode === "shortcut" ? ({ event }) => event.key === "F2" : undefined
          }
          autoFocusOnEditComplete={mode !== "focus-disabled"}
          autoFocusOnEditEscape={mode !== "focus-disabled"}
          onEditStart={(info) =>
            setEvents((current) => [
              ...current,
              `start:${String(info.rowId)}:${String(info.value)}`,
            ])
          }
          onEditValueChange={(info) =>
            setEvents((current) => [...current, `change:${String(info.value)}`])
          }
          onEditStop={(info) =>
            setEvents((current) => [...current, `stop:${String(info.value)}`])
          }
          onEditComplete={(info) =>
            setEvents((current) => [
              ...current,
              `complete:${String(info.value)}`,
            ])
          }
          onEditCancel={(info) =>
            setEvents((current) => [...current, `cancel:${String(info.rowId)}`])
          }
        />
      </GridFrame>
    </>
  );
}

function Issue42PerRowHeights() {
  const mode =
    typeof window === "undefined"
      ? "controlled"
      : (new URLSearchParams(window.location.search).get("heightMode") ??
        "controlled");
  const apiRef = React.useRef<TypeComputedProps | null>(null);
  const [ready, setReady] = React.useState(false);
  const initialRows = React.useMemo(
    () =>
      mode === "virtualized" || mode === "matrix"
        ? Array.from(
            { length: mode === "virtualized" ? 240 : 30 },
            (_, index) => ({
              id: `row-${index}`,
              name: `Person ${index}`,
              city: `City ${index % 7}`,
            })
          )
        : baseRows,
    [mode]
  );
  const [displayRows, setDisplayRows] = React.useState(initialRows);
  const columns = React.useMemo<TypeColumns>(
    () =>
      mode === "matrix"
        ? baseColumns.map((column) => ({
            ...column,
            width: undefined,
            defaultWidth: column.width,
          }))
        : baseColumns,
    [mode]
  );
  const [rowHeights, setRowHeights] = React.useState<Record<string, number>>({
    ...(mode === "virtualized"
      ? { "row-0": 40 }
      : mode === "matrix"
        ? { "row-5": 88 }
        : { "row-2": 88 }),
  });
  const [heightEvents, setHeightEvents] = React.useState<unknown[]>([]);
  const [imperativeScrollTop, setImperativeScrollTop] = React.useState<
    number | null
  >(null);
  const resolvedDataSource = React.useMemo(
    () =>
      mode === "remote"
        ? async () => ({
            data: displayRows,
            count: displayRows.length,
          })
        : displayRows,
    [displayRows, mode]
  );

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
      <button
        type="button"
        data-testid="issue-42-grow-first-row"
        disabled={!ready}
        onClick={() => apiRef.current?.setRowHeightById(100, "row-0")}
      >
        Grow first row
      </button>
      <button
        type="button"
        data-testid="issue-42-scroll-to-row-ten"
        disabled={!ready}
        onClick={() => {
          apiRef.current?.scrollToIndex?.(10);
          setImperativeScrollTop(apiRef.current?.getScrollTop?.() ?? null);
        }}
      >
        Scroll to row 10
      </button>
      <output data-testid="issue-42-scroll-top">
        {String(imperativeScrollTop)}
      </output>
      <button
        type="button"
        data-testid="issue-42-clear-row-two"
        disabled={!ready}
        onClick={() => apiRef.current?.setRowHeightById(null, "row-2")}
      >
        Clear row 2 height
      </button>
      <button
        type="button"
        data-testid="issue-42-reverse-rows"
        onClick={() => setDisplayRows((current) => [...current].reverse())}
      >
        Reverse rows
      </button>
      <button
        type="button"
        data-testid="issue-42-replace-rows"
        onClick={() =>
          setDisplayRows((current) => current.map((row) => ({ ...row })))
        }
      >
        Replace rows
      </button>
      <output data-testid="issue-42-height-events">
        {JSON.stringify(heightEvents)}
      </output>
      <GridFrame
        className={
          mode === "virtualized" || mode === "matrix" ? "h-[420px]" : undefined
        }
      >
        <CompatibilityGrid
          idProperty="id"
          columns={columns}
          dataSource={resolvedDataSource}
          columnOrder={["id", "name", "city"]}
          virtualized={mode === "virtualized" || mode === "matrix"}
          enableFiltering={mode === "matrix"}
          defaultFilterValue={
            mode === "matrix"
              ? [
                  {
                    name: "city",
                    operator: "contains",
                    type: "string",
                    value: "",
                  },
                ]
              : null
          }
          pagination={mode === "matrix" ? "local" : false}
          defaultLimit={10}
          rowHeight={40}
          {...(mode === "uncontrolled"
            ? { defaultRowHeights: rowHeights }
            : { rowHeights })}
          onRowHeightsChange={(next: unknown) => {
            setHeightEvents((current) => [...current, next]);
            if (mode !== "uncontrolled") {
              setRowHeights(next as Record<string, number>);
            }
          }}
          onUpdateRowHeights={(next) =>
            setHeightEvents((current) => [...current, { indexed: next }])
          }
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
  const mode =
    typeof window === "undefined"
      ? "initial"
      : (new URLSearchParams(window.location.search).get("scrollMode") ??
        "initial");
  const rtl = mode === "rtl" || mode === "mobile-rtl";
  const nativeScroll = mode === "native";
  const apiRef = React.useRef<TypeComputedProps | null>(null);
  const [ready, setReady] = React.useState(false);
  const [scrollReport, setScrollReport] = React.useState({
    events: 0,
    top: 0,
    left: 0,
    smoothValue: null as number | null,
  });
  const columns = React.useMemo<TypeColumns>(
    () =>
      Array.from({ length: 10 }, (_, index) => ({
        name: `column-${index}`,
        header: `Column ${index}`,
        defaultWidth: 180,
        filterDelay: mode === "filter-race" && index === 0 ? 0 : undefined,
      })),
    [mode]
  );
  const [columnOrder, setColumnOrder] = React.useState(() =>
    columns.map((column) => String(column.name))
  );
  const rows = React.useMemo(
    () =>
      Array.from(
        { length: mode === "performance" ? 10_000 : 120 },
        (_, rowIndex) =>
          Object.fromEntries([
            ["id", `scroll-row-${rowIndex}`],
            ...columns.map((column, columnIndex) => [
              String(column.name),
              `row-${rowIndex}-column-${columnIndex}`,
            ]),
          ])
      ),
    [columns, mode]
  );

  return (
    <>
      <button
        type="button"
        data-testid="issue-43-set-scroll"
        disabled={!ready}
        onClick={() => {
          if (!apiRef.current) return;
          apiRef.current.scrollTop = 360;
          apiRef.current.scrollLeft = 240;
        }}
      >
        Set public scroll properties
      </button>
      <button
        type="button"
        data-testid="issue-43-smooth-scroll"
        disabled={!ready}
        onClick={() => {
          apiRef.current
            ?.getVirtualList()
            .smoothScrollTo(
              420,
              { orientation: "vertical", duration: 80 },
              (value) =>
                setScrollReport((current) => ({
                  ...current,
                  smoothValue: value,
                }))
            );
        }}
      >
        Smooth scroll
      </button>
      <output data-testid="issue-43-scroll-report">
        {JSON.stringify(scrollReport)}
      </output>
      <output data-testid="issue-43-column-order">
        {JSON.stringify(columnOrder)}
      </output>
      <GridFrame className="h-[260px] w-[460px]">
        <CompatibilityGrid
          idProperty="id"
          columns={columns}
          dataSource={rows}
          columnOrder={columnOrder}
          onColumnOrderChange={setColumnOrder}
          virtualized={
            mode === "virtualized" || mode === "rtl" || mode === "performance"
          }
          virtualizeColumns={
            mode === "virtualized" || mode === "rtl" || mode === "performance"
          }
          allowMobileTransform={mode === "mobile-rtl"}
          enableKeyboardNavigation={mode !== "keyboard"}
          enableFiltering={mode === "filter-race"}
          defaultFilterValue={
            mode === "filter-race"
              ? [
                  {
                    name: "column-0",
                    operator: "contains",
                    type: "string",
                    value: "",
                  },
                ]
              : null
          }
          nativeScroll={nativeScroll}
          rtl={rtl}
          {...(mode === "defaults"
            ? {}
            : {
                scrollProps: {
                  autoHide: false,
                  scrollThumbMargin: 3,
                  scrollThumbWidth: 13,
                  scrollThumbOverWidth: 15,
                  scrollThumbRadius: 0,
                  scrollThumbStyle: {
                    outline: "1px solid var(--tdg-color-ring)",
                  },
                },
              })}
          initialScrollTop={mode === "initial" ? 120 : 0}
          initialScrollLeft={mode === "initial" ? 90 : 0}
          onScroll={(event) => {
            const top = Math.round(event.currentTarget.scrollTop);
            const left = Math.round(apiRef.current?.getScrollLeft?.() ?? 0);
            setScrollReport((current) => ({
              ...current,
              events: current.events + 1,
              top,
              left,
            }));
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
  const [boolValue, setBoolValue] = React.useState<boolean | null>(false);
  const [dateValue, setDateValue] = React.useState<string | Date | null>(null);
  const [numericValue, setNumericValue] = React.useState<
    string | number | null
  >(1);
  const [completedNumericValue, setCompletedNumericValue] = React.useState<
    string | number | null
  >(null);
  const [stringFilterValue, setStringFilterValue] = React.useState({
    name: "name",
    operator: "contains",
    type: "string",
    value: null as string | null,
  });
  const [boolFilterValue, setBoolFilterValue] = React.useState({
    name: "active",
    operator: "eq",
    type: "bool",
    value: null as boolean | null,
  });
  const [numberFilterValue, setNumberFilterValue] = React.useState({
    name: "amount",
    operator: "gte",
    type: "number",
    value: null as number | null,
  });
  const [dateFilterValue, setDateFilterValue] = React.useState({
    name: "createdAt",
    operator: "after",
    type: "date",
    value: null as Date | null,
  });
  const [selectFilterValue, setSelectFilterValue] = React.useState({
    name: "status",
    operator: "eq",
    type: "select",
    value: null as string | null,
  });

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
          "./DateFilter",
          "./NumberFilter",
          "./SelectFilter",
          "./types",
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
    <>
      <output data-testid="issue-44-package-results">
        {results == null ? "pending" : JSON.stringify(results)}
      </output>
      <div className="grid max-w-lg gap-2">
        <div data-testid="issue-44-select-filter">
          <SelectFilter
            filterValue={selectFilterValue}
            dataSource={["draft", "published"]}
            onChange={(next) =>
              setSelectFilterValue({
                name: next.name ?? "status",
                operator: next.operator ?? "eq",
                type: next.type ?? "select",
                value: typeof next.value === "string" ? next.value : null,
              })
            }
          />
        </div>
        <output data-testid="issue-44-select-filter-value">
          {JSON.stringify(selectFilterValue)}
        </output>
        <BoolEditor
          value={boolValue}
          onChange={setBoolValue}
          autoFocus={false}
        />
        <output data-testid="issue-44-bool-editor-value">
          {String(boolValue)}
        </output>
        <DateEditor value={dateValue} onChange={setDateValue} />
        <output data-testid="issue-44-date-editor-value">
          {dateValue instanceof Date
            ? dateValue.toISOString()
            : String(dateValue)}
        </output>
        <NumericEditor
          value={numericValue}
          onChange={setNumericValue}
          onComplete={setCompletedNumericValue}
        />
        <output data-testid="issue-44-numeric-editor-value">
          {String(numericValue)}
        </output>
        <output data-testid="issue-44-numeric-complete-value">
          {String(completedNumericValue)}
        </output>
        <StringFilter
          filterValue={stringFilterValue}
          onChange={(next) =>
            setStringFilterValue({
              name: next.name ?? "name",
              operator: next.operator ?? "contains",
              type: next.type ?? "string",
              value: next.value ?? null,
            })
          }
        />
        <output data-testid="issue-44-string-filter-value">
          {JSON.stringify(stringFilterValue)}
        </output>
        <BoolFilter
          filterValue={boolFilterValue}
          onChange={(next) =>
            setBoolFilterValue({
              name: next.name ?? "active",
              operator: next.operator ?? "eq",
              type: next.type ?? "bool",
              value: next.value ?? null,
            })
          }
        />
        <output data-testid="issue-44-bool-filter-value">
          {JSON.stringify(boolFilterValue)}
        </output>
        <NumberFilter
          filterValue={numberFilterValue}
          filterEditorProps={{ "data-testid": "issue-44-number-filter" }}
          onChange={(next) =>
            setNumberFilterValue({
              name: next.name ?? "amount",
              operator: next.operator ?? "gte",
              type: next.type ?? "number",
              value: typeof next.value === "number" ? next.value : null,
            })
          }
        />
        <output data-testid="issue-44-number-filter-value">
          {JSON.stringify(numberFilterValue)}
        </output>
        <DateFilter
          filterValue={dateFilterValue}
          filterEditorProps={{ "data-testid": "issue-44-date-filter" }}
          onChange={(next) =>
            setDateFilterValue({
              name: next.name ?? "createdAt",
              operator: next.operator ?? "after",
              type: next.type ?? "date",
              value: next.value instanceof Date ? next.value : null,
            })
          }
        />
        <output data-testid="issue-44-date-filter-value">
          {JSON.stringify(dateFilterValue)}
        </output>
      </div>
    </>
  );
}

function Issue45UnknownComputedMethod() {
  const apiRef = React.useRef<TypeComputedProps | null>(null);
  const [ready, setReady] = React.useState(false);
  const [result, setResult] = React.useState("not-run");
  const [contractErrors, setContractErrors] = React.useState<string[]>([
    "pending",
  ]);
  const [behaviorResult, setBehaviorResult] = React.useState("not-run");

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
      <output data-testid="issue-45-contract-errors">
        {JSON.stringify(contractErrors)}
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
      <button
        type="button"
        data-testid="issue-45-run-behavior"
        disabled={!ready}
        onClick={() => {
          const api = apiRef.current;
          if (!api) return;
          const range = api.getCellSelectionBetween?.([0, 0], [1, 1]) ?? {};
          api.setCellSelection?.(range);
          api.setRowHeightById(64, "row-1");
          api.setShowHoverRows?.(false);
          api.setShowEmptyRows?.(true);
          api.setShowCellBorders?.("horizontal");
          api.setSortInfo({ name: "name", dir: 1 });

          window.setTimeout(() => {
            const current = apiRef.current;
            setBehaviorResult(
              JSON.stringify({
                range: Object.keys(range).sort(),
                rowHeight: current?.getRowHeightById("row-1"),
                hover: current?.computedShowHoverRows,
                empty: current?.computedShowEmptyRows,
                borders: current?.computedShowCellBorders,
                sort: current?.getSortInfo(),
                stateCount: current?.getState?.().count,
              })
            );
          }, 0);
        }}
      >
        Exercise computed contracts
      </button>
      <output data-testid="issue-45-behavior-result">{behaviorResult}</output>
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
            const api = ref.current;
            if (!api) return;

            const errors = communityApiManifest.computedMethods
              .filter(
                (method) =>
                  typeof api[method as keyof typeof api] !== "function"
              )
              .map((method) => `computed:${method}`);
            const virtualList = api.getVirtualList();
            errors.push(
              ...communityApiManifest.virtualListMethods
                .filter(
                  (method) =>
                    typeof virtualList[method as keyof typeof virtualList] !==
                    "function"
                )
                .map((method) => `virtual-list:${method}`)
            );
            for (const plugin of plugins) {
              if (
                typeof plugin.hook !== "function" ||
                typeof plugin.defaultProps !== "function" ||
                typeof plugin.isEnabled !== "function" ||
                typeof plugin.getState !== "function"
              ) {
                errors.push(`plugin:${plugin.name}:not-executable`);
                continue;
              }
              try {
                const defaults = plugin.defaultProps();
                const hookResult = plugin.hook(
                  (api.initialProps ?? {}) as TypeDataGridProps,
                  api,
                  ref
                );
                plugin.getState(api);
                if (
                  defaults == null ||
                  typeof defaults !== "object" ||
                  hookResult == null ||
                  typeof hookResult !== "object"
                ) {
                  errors.push(`plugin:${plugin.name}:invalid-contract`);
                  continue;
                }
                const hookRecord = hookResult as Record<string, unknown>;
                for (const method of plugin.methods) {
                  if (typeof hookRecord[method] !== "function") {
                    errors.push(`plugin:${plugin.name}:${String(method)}`);
                  }
                }
              } catch {
                errors.push(`plugin:${plugin.name}:state-error`);
              }
            }
            setContractErrors(errors);
            setReady(true);
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
