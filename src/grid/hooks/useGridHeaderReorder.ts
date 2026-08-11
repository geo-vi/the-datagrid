import * as React from "react";

import type { TypeColumn } from "../../types";
import { getColumnId } from "../../utils/column";
import { resolveColumnLock } from "../utils/lockedColumns";
import {
  canMoveColumnGroupSegment,
  haveSameColumnGroupPath,
  moveColumnIdsBefore,
  type GroupHeaderRenderItem,
  type TypeColumnGroupModel,
} from "../utils/columnGroups";

export type UseGridHeaderReorderParams = {
  allowColumnReorder: boolean;
  allowGroupSplitOnReorder: boolean;
  checkboxColId: string;
  checkboxEnabled: boolean;
  columnGroupModel: TypeColumnGroupModel;
  orderedColumns: TypeColumn[];
  renderColumnOrder: string[];
  table: { setColumnOrder: (order: string[]) => void };
};

/** Header drag-and-drop column/group reordering. */
export function useGridHeaderReorder(params: UseGridHeaderReorderParams) {
  const {
    allowColumnReorder,
    allowGroupSplitOnReorder,
    checkboxColId,
    checkboxEnabled,
    columnGroupModel,
    orderedColumns,
    renderColumnOrder,
    table,
  } = params;

  const headerDragRef = React.useRef<
    | {
        type: "column";
        columnIds: string[];
      }
    | {
        type: "group";
        columnIds: string[];
        depth: number;
      }
    | null
  >(null);

  function onHeaderDragStart(e: React.DragEvent, columnId: string) {
    if (!allowColumnReorder) return;
    if (checkboxEnabled && columnId === checkboxColId) return;

    headerDragRef.current = {
      type: "column",
      columnIds: [columnId],
    };
    try {
      e.dataTransfer.setData("text/plain", columnId);
    } catch {
      // Some environments reject custom drag payloads; column reordering still works.
    }
    e.dataTransfer.effectAllowed = "move";
  }

  function onGroupHeaderDragStart(
    e: React.DragEvent,
    item: GroupHeaderRenderItem
  ) {
    if (!allowColumnReorder || item.group.draggable === false) return;

    headerDragRef.current = {
      type: "group",
      columnIds: [...item.columnIds],
      depth: item.depth,
    };
    try {
      e.dataTransfer.setData(
        "text/plain",
        JSON.stringify({
          type: "group",
          group: item.groupName,
          depth: item.depth,
          columnIds: item.columnIds,
        })
      );
    } catch {
      // The in-memory drag state remains authoritative.
    }
    e.dataTransfer.effectAllowed = "move";
  }

  function commitHeaderDrop(e: React.DragEvent, targetId: string) {
    if (!allowColumnReorder) return;

    e.preventDefault();
    const drag = headerDragRef.current;
    headerDragRef.current = null;
    if (!drag || drag.columnIds.length === 0) return;
    if (
      checkboxEnabled &&
      (targetId === checkboxColId || drag.columnIds.includes(checkboxColId))
    ) {
      return;
    }

    const targetColumn = orderedColumns.find(
      (column) => getColumnId(column) === targetId
    );
    const sourceColumns = drag.columnIds.flatMap((columnId) => {
      const column = orderedColumns.find(
        (candidate) => getColumnId(candidate) === columnId
      );
      return column ? [column] : [];
    });
    if (
      sourceColumns.length !== drag.columnIds.length ||
      !targetColumn ||
      sourceColumns.some(
        (column) =>
          resolveColumnLock(column) !== resolveColumnLock(targetColumn)
      )
    ) {
      return;
    }

    if (!allowGroupSplitOnReorder) {
      const valid =
        drag.type === "column"
          ? haveSameColumnGroupPath(
              columnGroupModel,
              drag.columnIds[0]!,
              targetId
            )
          : canMoveColumnGroupSegment({
              model: columnGroupModel,
              sourceDepth: drag.depth,
              sourceColumnIds: drag.columnIds,
              targetColumnId: targetId,
            });
      if (!valid) return;
    }

    const next = moveColumnIdsBefore(
      renderColumnOrder,
      drag.columnIds,
      targetId
    );
    if (
      next.length === renderColumnOrder.length &&
      next.every((columnId, index) => columnId === renderColumnOrder[index])
    ) {
      return;
    }
    table.setColumnOrder(next);
  }

  function onHeaderDrop(e: React.DragEvent, targetId: string) {
    commitHeaderDrop(e, targetId);
  }

  function onGroupHeaderDrop(e: React.DragEvent, item: GroupHeaderRenderItem) {
    const drag = headerDragRef.current;
    if (drag?.type === "group" && drag.depth !== item.depth) {
      e.preventDefault();
      headerDragRef.current = null;
      return;
    }
    const targetId = item.columnIds[0];
    if (!targetId) return;
    commitHeaderDrop(e, targetId);
  }

  function onHeaderDragOver(e: React.DragEvent) {
    if (!allowColumnReorder) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }
  return {
    onGroupHeaderDragStart,
    onGroupHeaderDrop,
    onHeaderDragOver,
    onHeaderDragStart,
    onHeaderDrop,
  };
}
