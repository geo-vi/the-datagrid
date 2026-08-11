import type { TypeColumn } from "../../types";

export type LiveColumnResizePreview = {
  baseColumnWidth: number;
  columns: {
    element: HTMLTableColElement;
    inlineWidth: string;
  }[];
  tables: {
    element: HTMLTableElement;
    inlineWidth: string;
    renderedWidth: number;
  }[];
  viewport: HTMLElement | null;
  lockedColumns: {
    side: "start" | "end";
    columnId: string;
    cells: {
      element: HTMLElement;
      inlineOffset: string;
      inlineViewportOffset: string;
    }[];
  }[];
};

export type ColumnResizeSession = {
  columnId: string;
  column: TypeColumn;
  inputType: "mouse" | "pointer";
  pointerId: number | null;
  startX: number;
  startWidth: number;
  nextWidth: number;
  columnLeft: number;
  minWidth: number;
  maxWidth: number;
  liveColumnResize: boolean;
  appliedPreviewWidth: number | null;
  preview: LiveColumnResizePreview | null;
};

export type GroupResizeSession = {
  key: string;
  inputType: "mouse" | "pointer";
  pointerId: number | null;
  startX: number;
  startTotalWidth: number;
  nextTotalWidth: number;
  groupRight: number;
  minTotalWidth: number;
  maxTotalWidth: number;
  columns: {
    column: TypeColumn;
    id: string;
    width: number;
    minWidth: number;
    maxWidth: number;
  }[];
};

export function captureLiveColumnResizePreview(
  surface: HTMLElement,
  columnId: string,
  baseColumnWidth: number
): LiveColumnResizePreview {
  const columns = Array.from(
    surface.querySelectorAll<HTMLTableColElement>("col[data-column-id]")
  )
    .filter((element) => element.dataset.columnId === columnId)
    .map((element) => ({
      element,
      inlineWidth: element.style.width,
    }));
  const owningTables = new Set<HTMLTableElement>();

  for (const { element } of columns) {
    const table = element.closest("table");
    if (table instanceof HTMLTableElement) owningTables.add(table);
  }

  const lockedColumnsByKey = new Map<
    string,
    LiveColumnResizePreview["lockedColumns"][number]
  >();
  for (const element of surface.querySelectorAll<HTMLElement>(
    ".tdg-locked-column[data-column-id]"
  )) {
    const lockedColumnId = element.dataset.columnId;
    const side = element.classList.contains("tdg-locked-column--start")
      ? "start"
      : element.classList.contains("tdg-locked-column--end")
        ? "end"
        : null;
    if (!lockedColumnId || !side) continue;

    const key = `${side}:${lockedColumnId}`;
    let lockedColumn = lockedColumnsByKey.get(key);
    if (!lockedColumn) {
      lockedColumn = {
        side,
        columnId: lockedColumnId,
        cells: [],
      };
      lockedColumnsByKey.set(key, lockedColumn);
    }
    lockedColumn.cells.push({
      element,
      inlineOffset: element.style.getPropertyValue(
        "--tdg-locked-column-offset"
      ),
      inlineViewportOffset: element.style.getPropertyValue(
        "--tdg-locked-column-viewport-offset"
      ),
    });
  }

  return {
    baseColumnWidth,
    columns,
    tables: Array.from(owningTables, (element) => ({
      element,
      inlineWidth: element.style.width,
      renderedWidth: element.getBoundingClientRect().width,
    })),
    viewport: surface.querySelector<HTMLElement>(".tdg-body-viewport"),
    lockedColumns: Array.from(lockedColumnsByKey.values()),
  };
}

export function updateLiveLockedColumnLayout(preview: LiveColumnResizePreview) {
  const root = preview.viewport?.closest<HTMLElement>(".tdg-root");
  const fixedWidthMode = root?.dataset.columnWidthMode === "fixed";
  const renderedTableWidth = preview.tables.reduce(
    (width, table) =>
      Math.max(width, table.element.getBoundingClientRect().width),
    0
  );
  const viewportOffset =
    fixedWidthMode && preview.viewport
      ? Math.max(0, preview.viewport.clientWidth - renderedTableWidth)
      : 0;

  const updateSide = (side: "start" | "end") => {
    const columns = preview.lockedColumns.filter(
      (column) => column.side === side
    );
    const iteration = side === "end" ? [...columns].reverse() : columns;
    let offset = 0;

    for (const column of iteration) {
      for (const cell of column.cells) {
        cell.element.style.setProperty(
          "--tdg-locked-column-offset",
          `${offset}px`
        );
        cell.element.style.setProperty(
          "--tdg-locked-column-viewport-offset",
          side === "end" ? `${viewportOffset}px` : "0px"
        );
      }

      const representativeCell = column.cells[0]?.element;
      offset += representativeCell?.getBoundingClientRect().width ?? 0;
    }
  };

  updateSide("start");
  updateSide("end");
}

export function applyLiveColumnResizePreview(
  session: ColumnResizeSession,
  nextWidth: number
) {
  if (!session.preview || session.appliedPreviewWidth === nextWidth) return;

  const widthDelta = nextWidth - session.preview.baseColumnWidth;
  for (const { element } of session.preview.columns) {
    element.style.width = `${nextWidth}px`;
  }
  for (const { element, renderedWidth } of session.preview.tables) {
    element.style.width = `${Math.max(1, renderedWidth + widthDelta)}px`;
  }
  updateLiveLockedColumnLayout(session.preview);
  session.appliedPreviewWidth = nextWidth;
}

export function restoreLiveColumnResizePreview(
  session: ColumnResizeSession | null
) {
  if (!session?.preview || session.appliedPreviewWidth == null) return;

  for (const { element, inlineWidth } of session.preview.columns) {
    element.style.width = inlineWidth;
  }
  for (const { element, inlineWidth } of session.preview.tables) {
    element.style.width = inlineWidth;
  }
  for (const column of session.preview.lockedColumns) {
    for (const cell of column.cells) {
      if (cell.inlineOffset) {
        cell.element.style.setProperty(
          "--tdg-locked-column-offset",
          cell.inlineOffset
        );
      } else {
        cell.element.style.removeProperty("--tdg-locked-column-offset");
      }
      if (cell.inlineViewportOffset) {
        cell.element.style.setProperty(
          "--tdg-locked-column-viewport-offset",
          cell.inlineViewportOffset
        );
      } else {
        cell.element.style.removeProperty(
          "--tdg-locked-column-viewport-offset"
        );
      }
    }
  }
  session.appliedPreviewWidth = null;
}
