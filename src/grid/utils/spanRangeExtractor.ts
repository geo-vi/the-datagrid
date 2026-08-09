import { defaultRangeExtractor, type Range } from "@tanstack/react-virtual";

export type TypeSpanInterval = { start: number; end: number };

export function createSpanAwareRangeExtractor(intervals: TypeSpanInterval[]) {
  if (intervals.length === 0) return defaultRangeExtractor;

  return (range: Range): number[] => {
    const defaultIndexes = defaultRangeExtractor(range);
    let start = defaultIndexes[0] ?? range.startIndex;
    let end = defaultIndexes[defaultIndexes.length - 1] ?? range.endIndex;
    let expanded = true;

    while (expanded) {
      expanded = false;
      for (const interval of intervals) {
        if (interval.end < start || interval.start > end) continue;
        if (interval.start < start) {
          start = interval.start;
          expanded = true;
        }
        if (interval.end > end) {
          end = interval.end;
          expanded = true;
        }
      }
    }

    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  };
}
