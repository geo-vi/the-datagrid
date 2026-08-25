import { Fragment, useCallback, useMemo, useRef, useState } from "react";

import ReactDataGrid, {
  DateEditor,
  DateFilter,
  NumberFilter,
  NumericEditor,
  SelectEditor,
  SelectFilter,
  StringFilter,
  TextEditor,
  type CellProps,
  type TypeColumns,
  type TypeComputedProps,
  type TypeEditInfo,
  type TypeFilterValue,
} from "../../src/main";
import { Button } from "../../src/components/ui/button";
import { Checkbox } from "../../src/components/ui/checkbox";
import { cn } from "../../src/lib/utils";
import { useExamplesUi } from "./App";

/*
 * `<input type="date">` reads and writes "YYYY-MM-DD", so that is what the row
 * stores and what the edit callbacks report. Presentation is a `render`
 * concern, exactly as in the users example — the activity log below shows the
 * stored value, the cell shows the readable one.
 *
 * Built from the parts rather than `new Date("2026-09-04")`: that parses as UTC
 * midnight, which formats as the day before for any reader west of UTC.
 */
const dueFormatter = new Intl.DateTimeFormat("en-GB", {
  year: "numeric",
  month: "short",
  day: "2-digit",
});

function formatDue(value: unknown): string {
  if (value == null || value === "") return "—";

  const isoParts = String(value)
    .slice(0, 10)
    .match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!isoParts) return String(value);

  const [, year, month, day] = isoParts;
  return dueFormatter.format(
    new Date(Number(year), Number(month) - 1, Number(day))
  );
}

type ReviewStatus = "Triage" | "In review" | "Blocked" | "Signed off";

type ReviewRow = {
  id: string;
  task: string;
  owner: string;
  estimate: number;
  due: string;
  status: ReviewStatus;
  watching: boolean;
};

type EditLogEntry = {
  key: number;
  rowId: string;
  task: string;
  columnId: string;
  columnLabel: string;
  previous: string;
  next: string;
  at: string;
};

const COLUMN_LABELS: Record<string, string> = {
  task: "Task",
  owner: "Owner",
  estimate: "Estimate",
  due: "Due",
  status: "Status",
  watching: "Watching",
};

const STATUS_SOURCE = ["Triage", "In review", "Blocked", "Signed off"].map(
  (status) => ({ id: status, label: status })
);

const initialRows: ReviewRow[] = [
  {
    id: "task-1",
    task: "Migrate the ticket grid off the legacy editor",
    owner: "Ada Lovelace",
    estimate: 8,
    due: "2026-09-04",
    status: "In review",
    watching: true,
  },
  {
    id: "task-2",
    task: "Audit column-level edit callbacks",
    owner: "Grace Hopper",
    estimate: 3,
    due: "2026-08-28",
    status: "Triage",
    watching: true,
  },
  {
    id: "task-3",
    task: "Document the packaged editor entries",
    owner: "Alan Turing",
    estimate: 2,
    due: "2026-09-11",
    status: "Blocked",
    watching: false,
  },
  {
    id: "task-4",
    task: "Replace the bespoke text editor wrapper",
    owner: "Katherine Johnson",
    estimate: 5,
    due: "2026-08-22",
    status: "Signed off",
    watching: true,
  },
  {
    id: "task-5",
    task: "Add a regression test for Escape cancellation",
    owner: "Radia Perlman",
    estimate: 1,
    due: "2026-09-18",
    status: "Triage",
    watching: false,
  },
];

const defaultFilterValue: TypeFilterValue = [
  { name: "task", type: "string", operator: "contains", value: "" },
  { name: "owner", type: "string", operator: "contains", value: "" },
  { name: "estimate", type: "number", operator: "gte", value: null },
  { name: "due", type: "date", operator: "afterOrOn", value: null },
  { name: "status", type: "select", operator: "eq", value: null },
  { name: "watching", type: "bool", operator: "eq", value: null },
];

function formatValue(columnId: string, value: unknown): string {
  if (value == null || value === "") return "—";
  if (columnId === "watching") return value ? "Watching" : "Not watching";
  if (columnId === "estimate") return `${String(value)} pts`;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value);
}

function statusPillClasses(status: ReviewStatus): string {
  switch (status) {
    case "Signed off":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200";
    case "In review":
      return "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-200";
    case "Blocked":
      return "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200";
    default:
      return "border-border bg-muted/40 text-muted-foreground";
  }
}

const CODE = "rounded bg-muted px-1 py-0.5 text-xs";
const NOTES: Array<{ term: string; detail: string }> = [
  {
    term: "Click to edit",
    detail:
      'This grid sets editStartEvent="click". Inovua defaults to "dblclick".',
  },
  {
    term: "Surface",
    detail:
      "Seamless is the grid's full-cell overlay, which the built-in editor uses. Bordered is a control inside the cell. Set it per column with editorProps: { seamless: true }. It applies to the four columns using a packaged editor — Watching draws itself.",
  },
  {
    term: "Clear button",
    detail:
      "TextEditor draws one when enableClearButton is set, as Owner does here. It empties the field and keeps the editor open.",
  },
  {
    term: "Starting an edit",
    detail:
      "No cell draws a pencil of its own — an edit starts from the pointer, the keyboard, or the grid ref. Hover a Grid ref button to see the call it makes.",
  },
  {
    term: "Clear vs commit",
    detail:
      "completeEdit() with no argument commits an empty string, the upstream clear. completeEdit({}) commits what is typed.",
  },
  {
    term: "Booleans",
    detail:
      "Watching never enters edit mode. rendersInlineEditor keeps the checkbox live in the cell, so one click toggles and commits — which is how a boolean column behaves in grids people actually use.",
  },
  {
    term: "Async saves",
    detail:
      "Owner persists from a column-level onEditComplete. The grid waits on the returned promise before it moves on.",
  },
];

const LABEL =
  "text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground";

const IMPERATIVE_ACTIONS: Array<{
  testId: string;
  label: string;
  method: string;
  run: (api: TypeComputedProps | null) => void;
}> = [
  {
    testId: "editing-api-start",
    label: "Edit owner",
    method: 'startEdit({ columnId: "owner", rowIndex: 0 })',
    run: (api) => void api?.startEdit?.({ columnId: "owner", rowIndex: 0 }),
  },
  {
    testId: "editing-api-complete",
    label: "Commit",
    method: "completeEdit({}) — commits the draft",
    run: (api) => api?.completeEdit?.({}),
  },
  {
    testId: "editing-api-clear",
    label: "Clear",
    method: "completeEdit() — commits an empty string, the upstream clear",
    run: (api) => api?.completeEdit?.(),
  },
  {
    testId: "editing-api-cancel",
    label: "Cancel",
    method: "cancelEdit()",
    run: (api) => api?.cancelEdit?.(),
  },
];

const COLUMN_REFERENCE: Array<{
  column: string;
  editor: string;
  filter: string;
  why: string;
}> = [
  {
    column: "Task",
    editor: "built-in",
    filter: "built-in",
    why: "Sets editable and filterable and nothing else.",
  },
  {
    column: "Owner",
    editor: "TextEditor",
    filter: "StringFilter",
    why: "Needs trim, maxLength and a clear button, plus an async onEditComplete the grid waits on.",
  },
  {
    column: "Estimate",
    editor: "NumericEditor",
    filter: "NumberFilter",
    why: "Needs min/max/step, and completes with a number rather than a string.",
  },
  {
    column: "Due",
    editor: "DateEditor",
    filter: "DateFilter",
    why: "Needs a real date input.",
  },
  {
    column: "Status",
    editor: "SelectEditor",
    filter: "SelectFilter",
    why: "Both need a dataSource the grid cannot infer. The built-in editor would let you type a status that is not on the list.",
  },
  {
    column: "Watching",
    editor: "inline checkbox",
    filter: "SelectFilter",
    why: "A boolean reads better as a live toggle than as a cell that swaps into an editor, so this uses rendersInlineEditor and never leaves display mode. Named filter options beat BoolFilter's unlabelled tri-state box.",
  },
];

export default function EditingGridExample() {
  const { gridTheme, resizable, showCellBorders } = useExamplesUi();
  const [rows, setRows] = useState<ReviewRow[]>(initialRows);
  const [log, setLog] = useState<EditLogEntry[]>([]);
  const [savingRowId, setSavingRowId] = useState<string | null>(null);
  const [seamless, setSeamless] = useState(true);
  const logKeyRef = useRef(0);
  const apiRef = useRef<TypeComputedProps | null>(null);

  // Completion callbacks outlive the render that created them.
  const rowsRef = useRef(rows);
  rowsRef.current = rows;

  const recordEdit = useCallback((info: TypeEditInfo) => {
    const rowId = String(info.rowId);
    const columnId = String(info.columnId);
    const row = rowsRef.current.find((candidate) => candidate.id === rowId);
    if (!row) return;

    const previous = row[columnId as keyof ReviewRow];
    if (Object.is(previous, info.value)) return;

    setRows((current) =>
      current.map((candidate) =>
        candidate.id === rowId
          ? { ...candidate, [columnId]: info.value }
          : candidate
      )
    );

    logKeyRef.current += 1;
    setLog((current) =>
      [
        {
          key: logKeyRef.current,
          rowId,
          task: row.task,
          columnId,
          columnLabel: COLUMN_LABELS[columnId] ?? columnId,
          previous: formatValue(columnId, previous),
          next: formatValue(columnId, info.value),
          at: new Date().toLocaleTimeString(),
        },
        ...current,
      ].slice(0, 6)
    );
  }, []);

  const columns = useMemo<TypeColumns>(
    () => [
      {
        name: "task",
        header: "Task",
        defaultFlex: 2,
        minWidth: 240,
        editable: true,
        filterable: true,
      },
      {
        name: "owner",
        header: "Owner",
        defaultWidth: 190,
        editable: true,
        editor: TextEditor,
        editorProps: {
          seamless,
          trim: true,
          maxLength: 60,
          enableClearButton: true,
        },
        filterEditor: StringFilter,
        // Column-level: runs before the grid-level handler, and the grid waits
        // on the returned promise before moving focus on.
        onEditComplete: async (value: unknown, cellProps: CellProps) => {
          const rowId = String(cellProps.rowId);
          if (value === cellProps.data.owner) return;
          setSavingRowId(rowId);
          await new Promise((resolve) => setTimeout(resolve, 700));
          setSavingRowId((current) => (current === rowId ? null : current));
        },
        render: ({ value, data }: CellProps) => (
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate">{String(value ?? "")}</span>
            {savingRowId === String(data.id) ? (
              <span
                data-testid="editing-owner-saving"
                className="shrink-0 rounded-full border border-sky-500/25 bg-sky-500/10 px-2 py-0.5 text-[11px] font-medium text-sky-700 dark:text-sky-200"
              >
                saving…
              </span>
            ) : null}
          </span>
        ),
      },
      {
        name: "estimate",
        header: "Estimate",
        type: "number",
        defaultWidth: 130,
        textAlign: "end",
        headerAlign: "end",
        editable: true,
        editor: NumericEditor,
        editorProps: { seamless, min: 0, max: 40, step: 1 },
        filterEditor: NumberFilter,
        render: ({ value }: CellProps) =>
          value == null ? "—" : `${String(value)} pts`,
      },
      {
        name: "due",
        header: "Due",
        defaultWidth: 150,
        editable: true,
        editor: DateEditor,
        editorProps: { seamless },
        filterEditor: DateFilter,
        render: ({ value }: CellProps) => formatDue(value),
      },
      {
        name: "status",
        header: "Status",
        defaultWidth: 170,
        editable: true,
        editor: SelectEditor,
        editorProps: { seamless, dataSource: STATUS_SOURCE },
        filterEditor: SelectFilter,
        filterEditorProps: { multiple: false, dataSource: STATUS_SOURCE },
        render: ({ value }: CellProps) => {
          const status = String(value) as ReviewStatus;
          return (
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
                statusPillClasses(status)
              )}
            >
              {status}
            </span>
          );
        },
      },
      {
        name: "watching",
        header: "Watching",
        defaultWidth: 130,
        editable: true,
        // A boolean is a one-click toggle in every grid people actually use,
        // so this one never swaps into a separate editor: the checkbox is
        // always the cell, and `onComplete` starts and commits the edit in one
        // go. `BoolEditor` is there for the two-step pattern if you want it.
        rendersInlineEditor: true,
        // A bare tri-state checkbox in the filter row says nothing about what
        // it filters. Named options do.
        filterEditor: SelectFilter,
        filterEditorProps: {
          multiple: false,
          dataSource: [
            { id: true, label: "Watching" },
            { id: false, label: "Not watching" },
          ],
        },
        render: (cellProps: CellProps) => {
          const edit = cellProps.editProps;
          const checked = Boolean(edit?.inEdit ? edit.value : cellProps.value);
          return (
            <span className="flex w-full items-center gap-2">
              <Checkbox
                checked={checked}
                aria-label={`Watching ${String(cellProps.data.task)}`}
                onClick={edit?.onClick}
                onCheckedChange={(next) => edit?.onComplete(next === true)}
              />
              {/* A symmetric pair: the header carries the meaning, so the cell
                  only has to say on or off. Naming both states — "Watching" /
                  "Not watching" — reads as two different things instead. */}
              <span className="text-sm text-muted-foreground">
                {checked ? "Yes" : "No"}
              </span>
            </span>
          );
        },
      },
    ],
    [savingRowId, seamless]
  );

  const lastEdit = log[0] ?? null;

  return (
    <section
      data-testid="editing-example-shell"
      className="flex flex-col gap-4 rounded-2xl border bg-background/95 p-4 shadow-sm"
    >
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Editing example</h2>
        <p className="max-w-3xl text-sm text-muted-foreground">
          One column per editor. Click a cell to edit it, Enter or click away to
          commit, Escape to discard — the banner below confirms what the grid
          reported.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl border bg-card/70 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className={LABEL}>Surface</span>
          <div className="flex gap-1 rounded-xl border p-1">
            {[true, false].map((value) => (
              <Button
                key={String(value)}
                type="button"
                size="sm"
                variant={seamless === value ? "default" : "ghost"}
                data-testid={
                  value ? "editing-surface-seamless" : "editing-surface-shell"
                }
                aria-pressed={seamless === value}
                className="h-7"
                onClick={() => setSeamless(value)}
              >
                {value ? "Seamless" : "Bordered"}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={LABEL}>Grid ref</span>
          <div className="flex flex-wrap gap-1.5">
            {IMPERATIVE_ACTIONS.map((action) => (
              <Button
                key={action.testId}
                type="button"
                variant="outline"
                size="sm"
                title={action.method}
                data-testid={action.testId}
                // Keep focus in the editor, or the blur completes the edit
                // before the imperative call reaches a live session.
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => action.run(apiRef.current)}
              >
                {action.label}
              </Button>
            ))}
          </div>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="ml-auto"
          disabled={log.length === 0}
          onClick={() => {
            setRows(initialRows);
            setLog([]);
          }}
        >
          Reset rows
        </Button>
      </div>

      <div
        data-testid="editing-last-saved"
        className={cn(
          "rounded-2xl border p-4 transition-colors",
          lastEdit
            ? "border-emerald-500/30 bg-emerald-500/10"
            : "border-dashed bg-muted/30"
        )}
      >
        {lastEdit ? (
          <>
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
              Saved · {lastEdit.at}
            </div>
            <div className="mt-2 text-sm">
              <span className="font-medium">{lastEdit.columnLabel}</span> on{" "}
              <span className="font-medium">{lastEdit.task}</span>{" "}
              <span className="mr-2 text-muted-foreground">
                {lastEdit.previous}
              </span>
              <span aria-hidden="true" className="text-muted-foreground">
                →
              </span>
              <span className="ml-2 font-semibold">{lastEdit.next}</span>
            </div>
          </>
        ) : (
          <>
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Waiting for an edit
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Nothing committed yet. Click a cell, change it, then press Enter.
            </p>
          </>
        )}
      </div>

      <div className="max-w-full">
        <ReactDataGrid
          handle={(grid) => {
            apiRef.current = grid?.current ?? null;
          }}
          theme={gridTheme}
          idProperty="id"
          columns={columns}
          dataSource={rows}
          editable
          // Inovua defaults to "dblclick"; one click is friendlier for a demo.
          editStartEvent="click"
          // Grid-level: runs after every column handler.
          onEditComplete={recordEdit}
          enableFiltering
          defaultFilterValue={defaultFilterValue}
          virtualized={false}
          rowHeight={null}
          minRowHeight={48}
          resizable={resizable}
          showCellBorders={showCellBorders}
        />
      </div>

      <div className="rounded-2xl border bg-card/70 p-4">
        <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Activity log
        </div>
        {log.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Committed edits appear here, newest first.
          </p>
        ) : (
          <ol
            data-testid="editing-activity-log"
            className="mt-3 flex flex-col gap-2"
          >
            {log.map((entry) => (
              <li
                key={entry.key}
                className="flex flex-wrap items-baseline gap-x-2 gap-y-1 rounded-xl border bg-background/60 px-3 py-2 text-sm"
              >
                <span className="font-medium">{entry.columnLabel}</span>
                <span className="text-xs text-muted-foreground">
                  {entry.rowId}
                </span>
                <span className="text-muted-foreground">{entry.previous}</span>
                <span aria-hidden="true" className="text-muted-foreground">
                  →
                </span>
                <span className="font-semibold">{entry.next}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {entry.at}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="rounded-2xl border bg-card/70 p-4">
        <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          What each column uses
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          A column that sets only <code className={CODE}>editable</code> or{" "}
          <code className={CODE}>filterable</code> gets the grid&rsquo;s generic
          editor and inline filter with no import. The named components are
          replacements you import when you need props the generic one cannot
          guess.
        </p>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] border-separate border-spacing-0 text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="border-b px-3 py-2 font-medium">Column</th>
                <th className="border-b px-3 py-2 font-medium">Editor</th>
                <th className="border-b px-3 py-2 font-medium">Filter</th>
                <th className="border-b px-3 py-2 font-medium">Why</th>
              </tr>
            </thead>
            <tbody data-testid="editing-column-reference">
              {COLUMN_REFERENCE.map((entry) => (
                <tr key={entry.column} className="align-top">
                  <td className="border-b px-3 py-2 font-medium">
                    {entry.column}
                  </td>
                  <td className="border-b px-3 py-2">
                    <code className={CODE}>{entry.editor}</code>
                  </td>
                  <td className="border-b px-3 py-2">
                    <code className={CODE}>{entry.filter}</code>
                  </td>
                  <td className="border-b px-3 py-2 text-muted-foreground">
                    {entry.why}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border bg-card/70 p-4">
        <div className={LABEL}>Notes</div>
        <dl className="mt-3 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-[10rem_1fr]">
          {NOTES.map((note) => (
            <Fragment key={note.term}>
              <dt className="font-medium">{note.term}</dt>
              <dd className="text-muted-foreground">{note.detail}</dd>
            </Fragment>
          ))}
        </dl>
      </div>
    </section>
  );
}
