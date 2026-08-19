import assert from "node:assert/strict";
import test from "node:test";

import { read, utils } from "xlsx";

import type { TypeColumn } from "../../src/types";
import {
  buildExportTable,
  mergeExportSettings,
  performExport,
  resolveExportColumns,
  serializeExportCsv,
  serializeExportJson,
  type RDGToolbarExportSource,
} from "../../src/toolbar/export";
import {
  createXlsxContent,
  toSheetName,
  XlsxWriteError,
} from "../../src/toolbar/xlsx";

const BYTE_ORDER_MARK = String.fromCharCode(0xfeff);

type Row = Record<string, unknown>;

function snapshotOf(columns: TypeColumn[], hidden: string[] = []) {
  return {
    columns,
    columnOrder: columns.map((column) => String(column.name ?? column.id)),
    columnVisibilityMap: Object.fromEntries(
      columns.map((column) => [
        String(column.id ?? column.name),
        !hidden.includes(String(column.name ?? column.id)),
      ])
    ),
  };
}

test("export columns follow grid order and honour the column flags", () => {
  const columns: TypeColumn[] = [
    { name: "id", header: "ID" },
    { name: "hiddenPlain", header: "Hidden" },
    { name: "auditId", header: "Audit", exportWhenHidden: true },
    { name: "actions", header: "Actions", exportable: false },
    {
      name: "alsoNever",
      header: "Never",
      exportable: false,
      exportWhenHidden: true,
    },
  ];
  const snapshot = snapshotOf(columns, ["hiddenPlain", "auditId", "alsoNever"]);

  const resolved = resolveExportColumns({
    ...snapshot,
    columnOrder: ["auditId", "id", "hiddenPlain", "actions", "alsoNever"],
  });

  assert.deepEqual(
    resolved.map((column) => column.name),
    ["auditId", "id"],
    "hidden columns need exportWhenHidden, and exportable:false always wins"
  );
});

test("exportValue transforms the cell and falls back when it throws", () => {
  const columns: TypeColumn[] = [
    {
      name: "total",
      header: "Total",
      exportValue: ({ value }) => Number(value) * 2,
    },
    {
      name: "broken",
      header: "Broken",
      exportValue: () => {
        throw new Error("boom");
      },
    },
    { name: "plain", header: "Plain" },
  ];
  const rows: Row[] = [{ total: 21, broken: "raw", plain: "kept" }];

  const table = buildExportTable(columns, rows);

  assert.deepEqual(table.headers, ["Total", "Broken", "Plain"]);
  assert.deepEqual(table.fields, ["total", "broken", "plain"]);
  assert.deepEqual(table.rows, [[42, "raw", "kept"]]);
});

test("exportValue receives the row and the column", () => {
  const columns: TypeColumn[] = [
    {
      name: "label",
      header: "Label",
      exportValue: ({ value, data, column }) =>
        `${String(column.name)}:${(data as Row).id}:${String(value)}`,
    },
  ];

  const table = buildExportTable(columns, [{ id: 7, label: "x" }]);

  assert.deepEqual(table.rows, [["label:7:x"]]);
});

test("CSV is RFC 4180 with a BOM so spreadsheets read it as UTF-8", () => {
  const table = {
    headers: ["Name", "Note"],
    fields: ["name", "note"],
    rows: [
      ['Quote "here"', "comma, inside"],
      ["line\nbreak", null],
      [undefined, 42],
    ] as unknown[][],
  };

  const csv = serializeExportCsv(table);

  assert.ok(csv.startsWith(BYTE_ORDER_MARK), "a UTF-8 BOM leads the file");
  assert.deepEqual(csv.slice(BYTE_ORDER_MARK.length).split("\r\n"), [
    "Name,Note",
    '"Quote ""here""","comma, inside"',
    '"line\nbreak",',
    ",42",
  ]);
});

test("JSON keys are data fields and undefined becomes null", () => {
  const table = {
    headers: ["Identifier", "Note"],
    fields: ["id", "note"],
    rows: [[1, undefined]] as unknown[][],
  };

  assert.deepEqual(JSON.parse(serializeExportJson(table)), [
    { id: 1, note: null },
  ]);
});

test("worksheet names are sanitised to what Excel accepts", () => {
  assert.equal(toSheetName("Orders"), "Orders");
  assert.equal(toSheetName("a/b:c*d?e[f]g"), "a b c d e f g");
  assert.equal(toSheetName("   "), "Export");
  assert.equal(toSheetName("x".repeat(40)).length, 31);
});

test("XLSX keeps cell types and duplicate headers as separate columns", async () => {
  const placed = new Date(Date.UTC(2026, 4, 2, 9, 30));
  const table = {
    headers: ["Order", "Total", "Fulfilled", "Placed", "Total"],
    fields: ["orderId", "total", "fulfilled", "placedAt", "totalAgain"],
    rows: [["SO-1", 1250, false, placed, 99]] as unknown[][],
  };

  const content = await createXlsxContent(table, { sheetName: "Orders" });
  const workbook = read(content, { type: "array", cellDates: true });

  assert.deepEqual(workbook.SheetNames, ["Orders"]);

  const sheet = workbook.Sheets.Orders;
  assert.equal(sheet.A1.v, "Order");
  // The repeated header keeps its own column instead of overwriting the first.
  assert.equal(sheet.E1.v, "Total");

  assert.equal(sheet.A2.t, "s", "text stays text");
  assert.equal(sheet.B2.t, "n", "numbers stay summable");
  assert.equal(sheet.B2.v, 1250);
  assert.equal(sheet.C2.t, "b", "booleans stay booleans");
  assert.equal(sheet.C2.v, false);
  assert.equal(sheet.D2.t, "d", "dates stay dates");
  assert.equal((sheet.D2.v as Date).toISOString(), placed.toISOString());
  assert.equal(sheet.E2.v, 99);

  const asJson = utils.sheet_to_json<Record<string, unknown>>(sheet);
  assert.equal(asJson.length, 1);
});

test("XLSX applies the requested date number format", async () => {
  const table = {
    headers: ["Placed"],
    fields: ["placedAt"],
    rows: [[new Date(Date.UTC(2026, 0, 3, 8, 15))]] as unknown[][],
  };

  const content = await createXlsxContent(table, {
    dateFormat: "dd/mm/yyyy hh:mm",
  });
  // The number format lives in the workbook styles, so reading it back needs
  // cellStyles; without it SheetJS still renders the cell through the format.
  const workbook = read(content, {
    type: "array",
    cellDates: true,
    cellStyles: true,
  });
  const sheet = workbook.Sheets.Export;

  assert.equal(sheet.A2.z, "dd/mm/yyyy hh:mm");
  assert.match(String(sheet.A2.w), /^03\/01\/2026 \d{2}:\d{2}$/);
});

test("a number format the writer rejects reports which prop caused it", async () => {
  const table = {
    headers: ["Placed"],
    fields: ["placedAt"],
    rows: [[new Date(Date.UTC(2026, 0, 3, 8, 15))]] as unknown[][],
  };

  // Excel accepts dot separators; the SheetJS formatter does not.
  await assert.rejects(
    () => createXlsxContent(table, { dateFormat: "dd.mm.yyyy hh:mm" }),
    (error: unknown) => {
      assert.ok(error instanceof XlsxWriteError);
      assert.match(error.message, /exportDateFormat/);
      assert.match(error.message, /dd\.mm\.yyyy hh:mm/);
      return true;
    }
  );
});

function sourceOf(
  columns: TypeColumn[],
  viewRows: Row[],
  allRows: Row[] = viewRows
): RDGToolbarExportSource {
  return {
    ...snapshotOf(columns),
    getViewRows: () => viewRows,
    getAllRows: () => allRows,
  };
}

test("export settings resolve most specific layer first, field by field", () => {
  const merged = mergeExportSettings(
    { scope: "all" },
    { fileName: "toolbar-prop", sheetName: "Sheet" },
    { fileName: "provider-default", dateFormat: "yyyy-mm-dd" }
  );

  assert.deepEqual(merged, {
    scope: "all",
    fileName: "toolbar-prop",
    dateFormat: "yyyy-mm-dd",
    sheetName: "Sheet",
  });
});

test("a settings layer that omits a field defers instead of blanking it", () => {
  // `undefined` is how "the caller said nothing" arrives, so it must not win.
  const merged = mergeExportSettings(
    { scope: undefined, fileName: undefined },
    undefined,
    { scope: "all", fileName: "provider-default" }
  );

  assert.deepEqual(merged, {
    scope: "all",
    fileName: "provider-default",
    dateFormat: undefined,
    sheetName: undefined,
  });
});

test("an export with nothing to write resolves null rather than a file", async () => {
  const detached = await performExport(sourceOf([], []), "csv");
  assert.equal(detached, null, "a snapshot with no grid attached exports null");

  const unexportable = await performExport(
    sourceOf(
      [{ name: "actions", header: "Actions", exportable: false }],
      [{ actions: "x" }]
    ),
    "csv"
  );
  assert.equal(unexportable, null, "no exportable column means no file");
});

test("performExport reports the export it wrote and defaults its name", async () => {
  const columns: TypeColumn[] = [{ name: "id", header: "ID" }];
  const result = await performExport(
    sourceOf(columns, [{ id: 1 }], [{ id: 1 }, { id: 2 }]),
    "csv"
  );

  assert.deepEqual(result, {
    format: "csv",
    scope: "view",
    rowCount: 1,
    columnCount: 1,
    fileName: "grid-export.csv",
    // Nothing was downloaded: there is no document in this environment.
    byteLength: 0,
  });
});

test("scope all exports the data source, and the file name sees the export", async () => {
  const columns: TypeColumn[] = [{ name: "id", header: "ID" }];
  const result = await performExport(
    sourceOf(columns, [{ id: 1 }], [{ id: 1 }, { id: 2 }]),
    "json",
    {
      scope: "all",
      fileName: (info) => `orders-${info.scope}-${info.rowCount}`,
    }
  );

  assert.equal(result?.rowCount, 2);
  assert.equal(result?.fileName, "orders-all-2.json");
});
