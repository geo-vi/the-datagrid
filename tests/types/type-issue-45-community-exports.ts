import type * as React from "react";

import type {
  CellProps,
  IColumn,
  RangeResultType,
  RowProps,
  TypeBatchUpdateQueue,
  TypeColumn,
  TypeColumnWithId,
  TypeComputedProps,
  TypeConfig,
  TypeConstrainRegion,
  TypeDataGridProps,
  TypeDiff,
  TypeDragHelper,
  TypeFilter,
  TypeFilterParam,
  TypeFnParam,
  TypeGetColumnByParam,
  TypeHeaderProps,
  TypePlugin,
  TypeRowUnselected,
  TypeShowCellBorders,
  TypeWithId,
} from "../../src/types/index";

type CommunityTypeInventory = [
  CellProps,
  IColumn,
  RangeResultType,
  RowProps,
  TypeBatchUpdateQueue,
  TypeColumn,
  TypeColumnWithId,
  TypeConfig,
  TypeConstrainRegion,
  TypeDiff,
  TypeDragHelper,
  TypeFilter,
  TypeFilterParam,
  TypeFnParam,
  TypeGetColumnByParam,
  TypeHeaderProps,
  TypeRowUnselected,
  TypeShowCellBorders,
  TypeWithId,
];

const plugin = {
  name: "contract",
  hook: (
    _props: TypeDataGridProps,
    computedProps: TypeComputedProps,
    computedPropsRef: React.MutableRefObject<TypeComputedProps | null>
  ) => {
    void computedPropsRef;
    return { count: computedProps.getCount() };
  },
  defaultProps: () => ({}),
} satisfies TypePlugin;

const column: TypeColumnWithId = { id: "id" };
const queue = ((fn: () => void) => fn()) as TypeBatchUpdateQueue;
queue.commit = (extraFn) => extraFn?.();

void plugin;
void column;
void queue;
void (null as CommunityTypeInventory | null);
