import type { TypeColumn } from "../../types";

import { getColumnId } from "../../utils/column";

const DEFAULT_COLUMN_WIDTH = 120;
const DEFAULT_MIN_COLUMN_WIDTH = 40;
const DEFAULT_MAX_COLUMN_WIDTH = Number.MAX_SAFE_INTEGER;

export type AllocateColumnWidthsArgs = {
  /** Visible columns in rendered order. */
  columns: readonly TypeColumn[];
  /** Width available to the rendered columns, normally the body viewport. */
  availableWidth: number;
  /**
   * Widths resolved by the caller before flex allocation, such as manual,
   * autosized, or deterministic fallback widths.
   */
  preferredWidths?: Readonly<Record<string, number>>;
  /**
   * Grid-owned flex values. A numeric value replaces `defaultFlex`; `null`
   * explicitly converts an uncontrolled flex column to fixed sizing. The
   * controlled `column.flex` value always remains authoritative.
   */
  preferredFlexes?: Readonly<Record<string, number | null>>;
  defaultWidth?: number;
  defaultMinWidth?: number;
  defaultMaxWidth?: number;
};

export type ColumnWidthAllocation = {
  widths: Record<string, number>;
  flexWeights: Record<string, number>;
  totalWidth: number;
  /** Positive only when max-width constraints leave viewport space unused. */
  unallocatedWidth: number;
};

type WidthBounds = {
  minWidth: number;
  maxWidth: number;
};

type FlexColumn = WidthBounds & {
  columnId: string;
  weight: number;
};

function toFinitePositive(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : undefined;
}

function toNonNegativeInteger(value: number, fallback: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.round(value)) : fallback;
}

function getWidthBounds(
  column: TypeColumn,
  defaultMinWidth: number,
  defaultMaxWidth: number
): WidthBounds {
  const configuredMinWidth =
    typeof column.minWidth === "number" &&
    Number.isFinite(column.minWidth) &&
    column.minWidth >= 0
      ? column.minWidth
      : undefined;
  const minWidth = Math.max(
    0,
    Math.ceil(configuredMinWidth ?? defaultMinWidth)
  );
  const configuredMaxWidth = toFinitePositive(column.maxWidth);
  const maxWidth = configuredMaxWidth
    ? Math.max(minWidth, Math.floor(configuredMaxWidth))
    : Math.max(minWidth, Math.floor(defaultMaxWidth));

  return { minWidth, maxWidth };
}

function clampWidth(value: number, bounds: WidthBounds): number {
  return Math.min(
    bounds.maxWidth,
    Math.max(bounds.minWidth, Math.round(value))
  );
}

function getFlexWeight(
  column: TypeColumn,
  preferredFlexes: Readonly<Record<string, number | null>>
): number | undefined {
  if (column.flex !== undefined) {
    return toFinitePositive(column.flex);
  }

  const columnId = getColumnId(column);
  if (Object.prototype.hasOwnProperty.call(preferredFlexes, columnId)) {
    return toFinitePositive(preferredFlexes[columnId]);
  }

  return toFinitePositive(column.defaultFlex);
}

/**
 * Allocates the available viewport width using Inovua-style sizing rules.
 *
 * A positive controlled `column.width` is fixed and authoritative. Remaining
 * fixed columns use `preferredWidths`, `defaultWidth`, or the configured
 * fallback. Columns without a controlled width and with a positive
 * `flex`/`defaultFlex` share the remaining space. Flex columns that hit a
 * min/max bound are removed from the pool before the rest is redistributed.
 * Rounding follows rendered column order, with the final flex column absorbing
 * the remaining pixel.
 */
export function allocateColumnWidths({
  columns,
  availableWidth,
  preferredWidths = {},
  preferredFlexes = {},
  defaultWidth = DEFAULT_COLUMN_WIDTH,
  defaultMinWidth = DEFAULT_MIN_COLUMN_WIDTH,
  defaultMaxWidth = DEFAULT_MAX_COLUMN_WIDTH,
}: AllocateColumnWidthsArgs): ColumnWidthAllocation {
  const normalizedAvailableWidth = toNonNegativeInteger(availableWidth, 0);
  const normalizedDefaultWidth = Math.max(
    1,
    toNonNegativeInteger(defaultWidth, DEFAULT_COLUMN_WIDTH)
  );
  const normalizedDefaultMinWidth = toNonNegativeInteger(
    defaultMinWidth,
    DEFAULT_MIN_COLUMN_WIDTH
  );
  const normalizedDefaultMaxWidth = Math.max(
    normalizedDefaultMinWidth,
    toNonNegativeInteger(defaultMaxWidth, DEFAULT_MAX_COLUMN_WIDTH)
  );
  const widths: Record<string, number> = {};
  const flexWeights: Record<string, number> = {};
  const flexColumns: FlexColumn[] = [];
  let fixedWidth = 0;

  for (const column of columns) {
    const columnId = getColumnId(column);
    const bounds = getWidthBounds(
      column,
      normalizedDefaultMinWidth,
      normalizedDefaultMaxWidth
    );
    const controlledWidth = toFinitePositive(column.width);

    if (controlledWidth !== undefined) {
      const width = clampWidth(controlledWidth, bounds);
      widths[columnId] = width;
      fixedWidth += width;
      continue;
    }

    const flexWeight = getFlexWeight(column, preferredFlexes);
    if (flexWeight !== undefined) {
      flexWeights[columnId] = flexWeight;
      flexColumns.push({ columnId, weight: flexWeight, ...bounds });
      continue;
    }

    const preferredWidth = toFinitePositive(preferredWidths[columnId]);
    const columnDefaultWidth = toFinitePositive(column.defaultWidth);
    const width = clampWidth(
      preferredWidth ?? columnDefaultWidth ?? normalizedDefaultWidth,
      bounds
    );
    widths[columnId] = width;
    fixedWidth += width;
  }

  let remainingWidth = Math.max(0, normalizedAvailableWidth - fixedWidth);
  let remainingWeight = flexColumns.reduce(
    (sum, column) => sum + column.weight,
    0
  );
  const pending = [...flexColumns];

  // Remove constrained columns one at a time. Recomputing after each removal
  // prevents the result from depending on how many columns hit a bound in a
  // single pass, while rendered order keeps the choice deterministic.
  let constraintFound = true;
  while (constraintFound && pending.length > 0 && remainingWeight > 0) {
    constraintFound = false;

    for (let index = 0; index < pending.length; index += 1) {
      const column = pending[index]!;
      const proportionalWidth =
        (remainingWidth * column.weight) / remainingWeight;
      const constrainedWidth =
        proportionalWidth < column.minWidth
          ? column.minWidth
          : proportionalWidth > column.maxWidth
            ? column.maxWidth
            : undefined;

      if (constrainedWidth === undefined) continue;

      widths[column.columnId] = constrainedWidth;
      remainingWidth = Math.max(0, remainingWidth - constrainedWidth);
      remainingWeight -= column.weight;
      pending.splice(index, 1);
      constraintFound = true;
      break;
    }
  }

  for (let index = 0; index < pending.length; index += 1) {
    const column = pending[index]!;
    const lastColumn = index === pending.length - 1;
    const width = lastColumn
      ? remainingWidth
      : Math.round((remainingWidth * column.weight) / remainingWeight);
    const clampedWidth = clampWidth(width, column);

    widths[column.columnId] = clampedWidth;
    remainingWidth = Math.max(0, remainingWidth - clampedWidth);
    remainingWeight -= column.weight;
  }

  const totalWidth = Object.values(widths).reduce(
    (sum, width) => sum + width,
    0
  );

  return {
    widths,
    flexWeights,
    totalWidth,
    unallocatedWidth: Math.max(0, normalizedAvailableWidth - totalWidth),
  };
}
