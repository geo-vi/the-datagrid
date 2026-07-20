import type * as React from "react";

import type { TypeComputedProps, TypeDataGridProps } from "../../src/main";

type ExpectedOnDidMount = (
  computedPropsRef: React.MutableRefObject<TypeComputedProps | null>
) => void;

const onDidMount: ExpectedOnDidMount = (computedPropsRef) => {
  const currentApi: TypeComputedProps | null = computedPropsRef.current;
  currentApi?.reload();
  currentApi?.getVirtualList().adjustHeights();
};

export const issue48LifecycleProps = {
  idProperty: "id",
  columns: [{ name: "name", header: "Name" }],
  dataSource: [{ id: 1, name: "Ada Lovelace" }],
  onDidMount,
} satisfies TypeDataGridProps;

export function exerciseIssue48VirtualListContract(
  virtualList: ReturnType<TypeComputedProps["getVirtualList"]>
): void {
  const result: void = virtualList.adjustHeights();
  void result;

  // Inovua's adjustHeights method is an argument-free synchronous command.
  // @ts-expect-error adjustHeights does not accept configuration arguments.
  virtualList.adjustHeights({ force: true });
}
