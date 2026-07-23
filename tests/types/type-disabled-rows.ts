import type { TypeDataGridProps, TypeRowStyleProps } from "../../src/main";

const baseProps = {
  idProperty: "id",
  columns: [{ name: "name" }],
  dataSource: [{ id: "row-1", name: "Ada" }],
} satisfies TypeDataGridProps;

export const disabledRowsMap = {
  ...baseProps,
  disabledRows: { 1: true, 4: false },
} satisfies TypeDataGridProps;

export const disabledRowsNull = {
  ...baseProps,
  disabledRows: null,
} satisfies TypeDataGridProps;

type DisabledRowsProp = TypeDataGridProps["disabledRows"];
const disabledRowsValue: DisabledRowsProp = { 2: true };
const noDisabledRowsValue: DisabledRowsProp = undefined;
const nullDisabledRowsValue: DisabledRowsProp = null;

declare const rowStyleProps: TypeRowStyleProps;
const rowStyleDisabledState: boolean | null | undefined =
  rowStyleProps.disabledRow;

const invalidValue = {
  ...baseProps,
  // @ts-expect-error disabledRows values are booleans, not row data.
  disabledRows: { 1: "disabled" },
} satisfies TypeDataGridProps;

const invalidFunction = {
  ...baseProps,
  // @ts-expect-error disabledRows is an index map, not a predicate.
  disabledRows: (rowIndex: number) => rowIndex === 1,
} satisfies TypeDataGridProps;

export const disabledRowsTypeCoverage = {
  disabledRowsValue,
  noDisabledRowsValue,
  nullDisabledRowsValue,
  rowStyleDisabledState,
  invalidValue,
  invalidFunction,
};
