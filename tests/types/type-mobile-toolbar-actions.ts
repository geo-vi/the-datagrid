import * as React from "react";
import type { TypeDataGridProps } from "@geovi/the-datagrid";

// The approved responsive configuration owns this slot; the root prop surface
// must not acquire another option merely to render toolbar content.
export const mobileToolbarActionsProps = {
  idProperty: "id",
  columns: [{ name: "name" }],
  dataSource: [],
  allowMobileTransform: true,
  mobileTransform: {
    toolbarActions: React.createElement("button", { type: "button" }, "Export"),
  },
} satisfies TypeDataGridProps;

type AssertNever<T extends never> = T;
export type NoRootMobileToolbarActions = AssertNever<
  Extract<"mobileToolbarActions", keyof TypeDataGridProps>
>;
