import ReactDataGrid, {
  type TypeColumns,
  type TypeRowStyleArgs,
} from "../../src/main";

// Regression fixture for GitHub issue #58: a `color` returned from `rowStyle`
// must reach the cell text. Previously `.InovuaReactDataGrid__cell` asserted
// its own `color`, which beat any color inherited from the row and silently
// dropped the `rowStyle` color.
const columns: TypeColumns = [
  { name: "id", header: "ID", width: 88 },
  { name: "name", header: "Name", width: 240 },
];
const columnOrder = ["id", "name"];
const rows = [
  { id: 1, name: "Ada Lovelace" },
  { id: 2, name: "Grace Hopper" },
  { id: 3, name: "Katherine Johnson" },
];

// A vivid, unambiguous color so the computed value is easy to assert against.
const ROW_COLOR = "rgb(220, 20, 60)";

export default function Issue58RowStyleColorCompatPage() {
  return (
    <main
      data-testid="issue-58-scenario"
      data-issue="58"
      className="mx-auto flex w-full max-w-3xl flex-col gap-4"
    >
      <header className="space-y-1">
        <p className="text-sm font-medium text-muted-foreground">
          Issue #58 compatibility fixture
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          rowStyle color reaches cell text
        </h1>
      </header>
      <div className="h-[220px] min-h-0 rounded-lg border">
        <ReactDataGrid
          idProperty="id"
          columns={columns}
          dataSource={rows}
          columnOrder={columnOrder}
          virtualized={false}
          rowStyle={(_args: TypeRowStyleArgs) => ({ color: ROW_COLOR })}
        />
      </div>
    </main>
  );
}
