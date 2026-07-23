import type { TypeColumns, TypeComputedColumn } from "@geovi/the-datagrid";

export const lockedColumns: TypeColumns = [
  { name: "selection", locked: true },
  { name: "account", locked: "start" },
  { name: "owner", locked: false },
  { name: "actions", locked: "end" },
];

export const computedLockedEnd: TypeComputedColumn = {
  name: "actions",
  computedLocked: "end",
};

export const computedUnlocked: TypeComputedColumn = {
  name: "owner",
  computedLocked: false,
};

export const invalidLockedColumn: TypeColumns = [
  {
    name: "actions",
    // @ts-expect-error Inovua accepts start/end/boolean, not arbitrary edges.
    locked: "right",
  },
];
