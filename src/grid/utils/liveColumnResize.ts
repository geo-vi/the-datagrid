import type { TypeColumn } from "../../types";
import { GRID_SLACK_FILLER_ID } from "./lockedColumns";

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
  surface: HTMLElement;
  /**
   * Border rules read `data-grid-slack`, and a drag moves the filler between zero
   * and non-zero width without a React render — so the preview maintains it here
   * and restores it if the gesture is abandoned.
   */
  root: HTMLElement | null;
  inlineGridSlack: string | null;
  /** The drag moves width between the resized column and this, so the table
   * stays pinned to the viewport until the slack runs out. */
  fillers: {
    element: HTMLTableColElement;
    inlineWidth: string;
  }[];
  baseSlackWidth: number;
  lockedColumns: {
    side: "start" | "end";
    columnId: string;
    cells: {
      element: HTMLElement;
      inlineOffset: string;
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
  /**
   * Snapshotting the rendered widths is what switches stretch -> fixed, so it is
   * deferred until a width actually changes: pressing a handle and letting go
   * must leave the layout mode alone.
   */
  hasSeededManualWidths: boolean;
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
    });
  }

  const root = surface.closest<HTMLElement>(".tdg-root");
  const fillers = Array.from(
    surface.querySelectorAll<HTMLTableColElement>("col[data-column-id]")
  )
    .filter((element) => element.dataset.columnId === GRID_SLACK_FILLER_ID)
    .map((element) => ({ element, inlineWidth: element.style.width }));
  const baseSlackWidth = fillers[0]
    ? fillers[0].element.getBoundingClientRect().width
    : 0;

  return {
    baseColumnWidth,
    columns,
    tables: Array.from(owningTables, (element) => ({
      element,
      inlineWidth: element.style.width,
      renderedWidth: element.getBoundingClientRect().width,
    })),
    viewport: surface.querySelector<HTMLElement>(".tdg-body-viewport"),
    surface,
    root,
    inlineGridSlack: root?.getAttribute("data-grid-slack") ?? null,
    fillers,
    baseSlackWidth,
    lockedColumns: Array.from(lockedColumnsByKey.values()),
  };
}

export function updateLiveLockedColumnLayout(preview: LiveColumnResizePreview) {
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

  const preview = session.preview;
  const widthDelta = nextWidth - preview.baseColumnWidth;
  for (const { element } of preview.columns) {
    element.style.width = `${nextWidth}px`;
  }

  /*
   * Move the delta between the resized column and the filler rather than onto the
   * table, so the table stays pinned to the viewport while slack remains and a
   * locked-end section keeps sitting on its edge. Past that the table grows.
   */
  const viewportWidth = preview.surface.clientWidth;
  const baseTableWidth = preview.tables.reduce(
    (width, table) => Math.max(width, table.renderedWidth),
    0
  );
  const columnsTotal = baseTableWidth - preview.baseSlackWidth + widthDelta;
  // No filler mounted means stretch mode, for the instant before seeding the
  // manual widths flips to fixed and mounts one.
  const nextSlack = preview.fillers.length
    ? Math.max(0, viewportWidth - columnsTotal)
    : 0;

  for (const { element } of preview.tables) {
    element.style.width = `${Math.max(1, columnsTotal + nextSlack)}px`;
  }
  for (const { element } of preview.fillers) {
    element.style.width = `${nextSlack}px`;
  }
  if (preview.root && preview.fillers.length) {
    preview.root.setAttribute(
      "data-grid-slack",
      nextSlack > 0 ? "some" : "none"
    );
  }
  updateLiveLockedColumnLayout(preview);
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
  for (const { element, inlineWidth } of session.preview.fillers) {
    element.style.width = inlineWidth;
  }
  if (session.preview.root) {
    if (session.preview.inlineGridSlack == null) {
      session.preview.root.removeAttribute("data-grid-slack");
    } else {
      session.preview.root.setAttribute(
        "data-grid-slack",
        session.preview.inlineGridSlack
      );
    }
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
    }
  }
  session.appliedPreviewWidth = null;
}
