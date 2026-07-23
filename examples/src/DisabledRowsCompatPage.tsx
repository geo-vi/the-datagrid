import * as React from "react";

import ReactDataGrid, {
  CheckBox,
  type CellProps,
  type TypeCheckboxColumn,
  type TypeColumns,
  type TypeComputedProps,
  type TypeFilterValue,
  type TypeOnSelectionChangeArg,
  type TypeRowSelection,
  type TypeRowStyleArgs,
} from "../../src/main";

type FixtureMode =
  | "basic"
  | "custom-checkbox"
  | "filter"
  | "mobile"
  | "pagination"
  | "virtual";

type FixtureRow = {
  id: string;
  name: string;
  city: string;
};

const basicRows: FixtureRow[] = [
  { id: "person-c", name: "Charlie", city: "Sofia" },
  { id: "person-a", name: "Ada", city: "London" },
  { id: "person-d", name: "Delta", city: "Berlin" },
  { id: "person-b", name: "Beatrice", city: "Paris" },
  { id: "person-f", name: "Farah", city: "Cairo" },
  { id: "person-e", name: "Edsger", city: "Rotterdam" },
];

const virtualRows: FixtureRow[] = Array.from({ length: 120 }, (_, index) => ({
  id: `virtual-${index}`,
  name: `Virtual row ${index}`,
  city: `City ${index}`,
}));

function readMode(): FixtureMode {
  if (typeof window === "undefined") return "basic";
  const mode = new URLSearchParams(window.location.search).get("mode");
  return mode === "custom-checkbox" ||
    mode === "filter" ||
    mode === "mobile" ||
    mode === "pagination" ||
    mode === "virtual"
    ? mode
    : "basic";
}

function unwrapSelection(selection: TypeRowSelection): Record<string, unknown> {
  if (!selection || typeof selection !== "object") return {};
  if (
    "selected" in selection &&
    selection.selected &&
    typeof selection.selected === "object"
  ) {
    return selection.selected as Record<string, unknown>;
  }
  return selection as Record<string, unknown>;
}

function getSelectedKeys(selection: TypeRowSelection): string[] {
  const map = unwrapSelection(selection);
  return Object.keys(map)
    .filter((key) => Boolean(map[key]))
    .sort();
}

function formatDisabledRowState(value: boolean | null | undefined): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  return String(value);
}

export default function DisabledRowsCompatPage() {
  const mode = readMode();
  const rows = mode === "virtual" ? virtualRows : basicRows;
  const initialDisabledRows =
    mode === "virtual"
      ? { 1: true, 60: true }
      : mode === "pagination"
        ? { 0: true }
        : { 1: true, 3: false };
  const [disabledRows, setDisabledRows] = React.useState<{
    [key: string]: boolean;
  } | null>(initialDisabledRows);
  const [selected, setSelected] = React.useState<TypeRowSelection>({});
  const [selectionEventCount, setSelectionEventCount] = React.useState(0);
  const [editStartCount, setEditStartCount] = React.useState(0);
  const apiRef = React.useRef<TypeComputedProps | null>(null);

  const columns = React.useMemo<TypeColumns>(
    () => [
      { name: "id", header: "ID", width: 150, editable: false },
      {
        name: "name",
        header: "Name",
        width: 230,
        editable: mode !== "mobile",
        render: (renderProps: CellProps) => (
          <span
            data-testid={`disabled-row-render-${renderProps.rowIndex}`}
            data-disabled-row={formatDisabledRowState(
              renderProps.cellProps.disabledRow as boolean | null | undefined
            )}
          >
            {String(renderProps.value ?? "")}
          </span>
        ),
      },
      { name: "city", header: "City", width: 190 },
    ],
    [mode]
  );
  const checkboxColumn = React.useMemo<TypeCheckboxColumn>(() => {
    if (mode !== "custom-checkbox") return true;

    return {
      renderCheckbox: (checkboxProps, cellProps) => (
        <CheckBox
          {...checkboxProps}
          data-testid={
            cellProps.headerCell
              ? "disabled-header-checkbox-metadata"
              : `disabled-row-checkbox-metadata-${cellProps.rowIndex}`
          }
          data-disabled-row={formatDisabledRowState(cellProps.disabledRow)}
          tabIndex={cellProps.disabledRow ? -1 : undefined}
        />
      ),
    };
  }, [mode]);

  const rowStyle = React.useCallback((args: TypeRowStyleArgs) => {
    return {
      "--fixture-disabled-row": args.props.disabledRow ? 1 : 0,
    } as React.CSSProperties & Record<string, string | number>;
  }, []);

  const onSelectionChange = React.useCallback(
    (event: TypeOnSelectionChangeArg) => {
      setSelected(event.selected);
      setSelectionEventCount((count) => count + 1);
    },
    []
  );

  const paginationProps =
    mode === "pagination"
      ? ({
          pagination: "local" as const,
          defaultLimit: 2,
          pageSizes: [2],
        } as const)
      : {};
  const defaultFilterValue: TypeFilterValue =
    mode === "filter"
      ? [
          {
            name: "name",
            operator: "neq",
            type: "string",
            value: "Charlie",
            active: true,
          },
        ]
      : null;

  return (
    <main
      className="flex min-w-0 flex-col gap-3 p-4"
      data-testid="disabled-rows-fixture"
      data-mode={mode}
    >
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="restore-disabled-rows"
          onClick={() =>
            setDisabledRows(
              mode === "virtual"
                ? { 1: true, 60: true }
                : mode === "pagination"
                  ? { 0: true }
                  : { 1: true, 3: false }
            )
          }
        >
          Restore disabled rows
        </button>
        <button
          type="button"
          data-testid="clear-disabled-rows"
          onClick={() => setDisabledRows(null)}
        >
          Clear disabled rows
        </button>
        <button
          type="button"
          data-testid="move-virtual-disabled-row"
          onClick={() => setDisabledRows({ 61: true })}
        >
          Move disabled row
        </button>
        <button
          type="button"
          data-testid="select-row-one"
          onClick={() => apiRef.current?.setSelectedAt?.(1, true)}
        >
          Select row one through API
        </button>
        <button
          type="button"
          data-testid="select-all-rows"
          onClick={() => apiRef.current?.selectAll?.()}
        >
          Select all through API
        </button>
        <button
          type="button"
          data-testid="start-edit-row-one"
          onClick={() => {
            void apiRef.current
              ?.startEdit?.({ rowIndex: 1, columnId: "name" })
              .catch(() => undefined);
          }}
        >
          Edit row one through API
        </button>
        <button
          type="button"
          data-testid="scroll-to-row-sixty"
          onClick={() => apiRef.current?.scrollToIndex?.(60, { top: true })}
        >
          Scroll to row sixty
        </button>
      </div>

      <output data-testid="disabled-rows-value">
        {JSON.stringify(disabledRows)}
      </output>
      <output data-testid="disabled-selected-keys">
        {JSON.stringify(getSelectedKeys(selected))}
      </output>
      <output data-testid="disabled-selection-events">
        {selectionEventCount}
      </output>
      <output data-testid="disabled-edit-start-events">{editStartCount}</output>

      <div
        className={
          mode === "mobile"
            ? "h-[620px] min-w-0"
            : "h-[360px] min-w-0 overflow-hidden rounded-xl border"
        }
        data-testid="disabled-rows-grid-frame"
      >
        <ReactDataGrid
          idProperty="id"
          columns={columns}
          dataSource={rows}
          columnOrder={["id", "name", "city"]}
          disabledRows={disabledRows}
          checkboxColumn={checkboxColumn}
          enableSelection
          multiSelect
          checkboxOnlyRowSelect={false}
          selected={selected}
          onSelectionChange={onSelectionChange}
          editable={mode !== "mobile"}
          editStartEvent="dblclick"
          onEditStart={() => setEditStartCount((count) => count + 1)}
          rowStyle={rowStyle}
          rowHeight={40}
          virtualized={mode === "virtual" || mode === "mobile"}
          allowMobileTransform={mode === "mobile"}
          enableFiltering={false}
          defaultFilterValue={defaultFilterValue}
          onReady={(ref) => {
            apiRef.current = ref.current;
          }}
          {...paginationProps}
        />
      </div>
    </main>
  );
}
