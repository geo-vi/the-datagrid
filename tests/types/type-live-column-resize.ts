import type { TypeDataGridProps } from "../../src/main";

const baseProps = {
  idProperty: "id",
  columns: [{ name: "name", defaultWidth: 180 }],
  dataSource: [{ id: 1, name: "Ada Lovelace" }],
} satisfies TypeDataGridProps;

export const deferredResizeProps = {
  ...baseProps,
  liveColumnResize: false,
} satisfies TypeDataGridProps;

export const interactiveResizeProps = {
  ...baseProps,
  liveColumnResize: true,
  onColumnResize: (info, context) => {
    void info.column;
    void info.width;
    void info.flex;
    void context.reservedViewportWidth;
  },
} satisfies TypeDataGridProps;
