import type { RDGToolbarExportTable } from "./export";

/**
 * XLSX support is an optional peer dependency: SheetJS is far larger than this
 * whole entry, so it is imported on demand the first time a workbook is
 * requested and never bundled here. Consumers who list `"xlsx"` in
 * `exportFormats` install `xlsx` themselves.
 *
 * The module is typed structurally rather than with `import type ... from
 * "xlsx"`, so the published declarations stay resolvable for the majority of
 * consumers, who never install it.
 */
type XlsxSheetOptions = {
  cellDates?: boolean;
  dateNF?: string;
};

type XlsxModule = {
  utils: {
    aoa_to_sheet: (
      rows: readonly unknown[][],
      options?: XlsxSheetOptions
    ) => unknown;
    book_new: () => unknown;
    book_append_sheet: (
      workbook: unknown,
      sheet: unknown,
      name?: string
    ) => void;
  };
  write: (
    workbook: unknown,
    options: { bookType: "xlsx"; type: "array" } & XlsxSheetOptions
  ) => ArrayBuffer;
};

export const XLSX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** Excel number format applied to date cells. */
export const DEFAULT_XLSX_DATE_FORMAT = "yyyy-mm-dd hh:mm";

export class MissingXlsxDependencyError extends Error {
  constructor(cause: unknown) {
    super(
      'XLSX export needs the optional "xlsx" peer dependency. ' +
        'Install it with `npm install xlsx`, or drop "xlsx" from the ' +
        "toolbar's exportFormats."
    );
    this.name = "MissingXlsxDependencyError";
    this.cause = cause;
  }
}

/**
 * The writer reports an invalid number format as `bad second format: .` or with
 * no message at all, so the failure is restated here in terms of the prop that
 * causes it. Notably SheetJS refuses dot separators that Excel itself accepts.
 */
export class XlsxWriteError extends Error {
  constructor(dateFormat: string, cause: unknown) {
    super(
      "Writing the XLSX workbook failed. If exportDateFormat is set it must be " +
        "an Excel number format code the writer accepts - dot separators are " +
        `rejected, so prefer "yyyy-mm-dd hh:mm" or "dd/mm/yyyy hh:mm" over ` +
        `"dd.mm.yyyy hh:mm". Received ${JSON.stringify(dateFormat)}. Format the ` +
        "value with column.exportValue instead when you need exact text."
    );
    this.name = "XlsxWriteError";
    this.cause = cause;
  }
}

/**
 * Excel rejects sheet names that are empty, longer than 31 characters or
 * contain `[ ] : * ? / \`, and `book_append_sheet` throws on them.
 */
export function toSheetName(name: string): string {
  const cleaned = name.replace(/[[\]:*?/\\]/g, " ").trim();
  return cleaned ? cleaned.slice(0, 31) : "Export";
}

async function loadXlsx(): Promise<XlsxModule> {
  try {
    return (await import("xlsx")) as unknown as XlsxModule;
  } catch (error) {
    throw new MissingXlsxDependencyError(error);
  }
}

export type CreateXlsxContentOptions = {
  /** Excel number format for date cells. */
  dateFormat?: string;
  sheetName?: string;
};

/**
 * Builds a single-sheet workbook from the export table.
 *
 * Values keep their JavaScript type, so booleans become boolean cells, `Date`
 * values become date cells carrying `dateFormat`, and numbers stay numeric and
 * summable in a spreadsheet. Rows are written positionally from the table, so
 * two columns sharing a header stay two distinct columns.
 */
export async function createXlsxContent(
  table: RDGToolbarExportTable,
  options: CreateXlsxContentOptions = {}
): Promise<ArrayBuffer> {
  const { dateFormat = DEFAULT_XLSX_DATE_FORMAT, sheetName = "Export" } =
    options;
  const xlsx = await loadXlsx();
  const sheetOptions: XlsxSheetOptions = {
    cellDates: true,
    dateNF: dateFormat,
  };

  try {
    const sheet = xlsx.utils.aoa_to_sheet(
      [table.headers, ...table.rows],
      sheetOptions
    );
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, sheet, toSheetName(sheetName));

    return xlsx.write(workbook, {
      bookType: "xlsx",
      type: "array",
      ...sheetOptions,
    });
  } catch (error) {
    throw new XlsxWriteError(dateFormat, error);
  }
}
