"use client";

import * as React from "react";
import { cn } from "../../lib/utils";
import { Input } from "../../components/ui/input";
import {
  type TypeCommunityFilterChange,
  type TypeCommunityFilterValue,
  withFilterEditorValue,
} from "./editorTypes";

function isRangeOperator(op?: string): boolean {
  return op === "inrange" || op === "notinrange";
}

function toDate(value: unknown): Date | null {
  if (value == null || value === "") return null;
  if (value instanceof Date)
    return Number.isFinite(value.getTime()) ? value : null;
  if (typeof value === "number") {
    const d = new Date(value);
    return Number.isFinite(d.getTime()) ? d : null;
  }
  const d = new Date(String(value));
  return Number.isFinite(d.getTime()) ? d : null;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * The year segment of a date input is complete after every keystroke, so a
 * half-typed "2026" round-trips through us as year 2, then 20, then 202. Those
 * only survive the trip back as "0002", "0020", "0202": an unpadded year makes
 * the whole value invalid, the browser blanks the field, and typing restarts.
 */
function pad4(n: number): string {
  return String(n).padStart(4, "0");
}

function toInputDateValue(d: Date | null): string {
  if (!d) return "";
  const y = pad4(d.getFullYear());
  const m = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  return `${y}-${m}-${day}`;
}

function toInputDateTimeLocalValue(d: Date | null): string {
  if (!d) return "";
  const y = pad4(d.getFullYear());
  const m = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  const hh = pad2(d.getHours());
  const mm = pad2(d.getMinutes());
  return `${y}-${m}-${day}T${hh}:${mm}`;
}

/**
 * Left uncapped, the year segment grows to six digits. That range is unusable:
 * `Date` tops out at 275760-09-13, and beyond that day the input stops
 * reporting a value at all — the segments keep showing what was typed while
 * `value` reads empty, so the filter silently clears while the field still
 * looks filled. Capping the year at four digits keeps the segment inside what
 * the rest of the pipeline can represent, and the browser then cycles the
 * digits within those four rather than widening the field.
 */
const MAX_INPUT_VALUE = {
  date: "9999-12-31",
  "datetime-local": "9999-12-31T23:59",
} as const;

/** The shape a date / datetime-local input reports: a 4-to-6 digit year, then fixed-width parts. */
const INPUT_VALUE_PATTERN =
  /^(\d{4,6})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2}))?)?$/;

/**
 * Parsed field by field rather than by handing the string to `new Date`, which
 * speaks a different dialect at both ends of the year range. Above 9999 the
 * input says "20265-08-08" but `Date` only reads the expanded form
 * "+020265-08-08"; below 100 `new Date(y, ...)` would remap year 26 to 1926.
 * Getting either wrong yields null, which blanks the field mid-typing.
 */
function parseInputValue(input: string): Date | null {
  const parts = INPUT_VALUE_PATTERN.exec(input);
  if (!parts) return null;
  const [, year, month, day, hours, minutes, seconds] = parts;
  const d = new Date(0);
  d.setFullYear(Number(year), Number(month) - 1, Number(day));
  d.setHours(Number(hours ?? 0), Number(minutes ?? 0), Number(seconds ?? 0), 0);
  return Number.isFinite(d.getTime()) ? d : null;
}

export type DateFilterProps = {
  filterValue?: TypeCommunityFilterValue<unknown>;
  value?: unknown;
  onChange?: TypeCommunityFilterChange<unknown>;
  filterEditorProps?:
    | Record<string, unknown>
    | ((
        editorProps: DateFilterProps,
        meta: { index: number; value: unknown }
      ) => Record<string, unknown> | undefined);

  /**
   * Inovua commonly passes placeholder via filterEditorProps.
   * If you want different placeholders for range, pass:
   *  - startPlaceholder
   *  - endPlaceholder
   */
  placeholder?: string;
  startPlaceholder?: string;
  endPlaceholder?: string;

  disabled?: boolean;

  className?: string;
  style?: React.CSSProperties;
};

export default function DateFilter(props: DateFilterProps): React.ReactElement {
  const {
    filterValue,
    value: valueProp,
    onChange,
    placeholder,
    startPlaceholder,
    endPlaceholder,
    disabled,
    className,
    style,
    filterEditorProps,
  } = props;

  const operator = filterValue?.operator;
  const type = filterValue?.type;

  // If column type is "time", use datetime-local; otherwise date.
  const inputMode: "date" | "datetime-local" =
    type === "time" ? "datetime-local" : "date";

  const raw = valueProp !== undefined ? valueProp : filterValue?.value;
  const configuredFilterEditorProps =
    filterEditorProps ??
    (filterValue?.filterEditorProps as DateFilterProps["filterEditorProps"]);
  const resolveInputProps = (value: unknown, index: number) => {
    if (typeof configuredFilterEditorProps === "function") {
      return (
        configuredFilterEditorProps({ ...props, value }, { index, value }) ?? {}
      );
    }
    return configuredFilterEditorProps ?? {};
  };
  const resolveMax = (inputProps: Record<string, unknown>) =>
    (inputProps.max as string | undefined) ?? MAX_INPUT_VALUE[inputMode];
  const emitValue = (nextValue: unknown) =>
    onChange?.(withFilterEditorValue(filterValue, nextValue, type ?? "date"));

  if (isRangeOperator(operator)) {
    const rangeRecord =
      raw && typeof raw === "object" && !Array.isArray(raw)
        ? (raw as Record<string, unknown>)
        : null;
    const startRaw = Array.isArray(raw)
      ? raw[0]
      : rangeRecord
        ? rangeRecord.start
        : raw;
    const endRaw = Array.isArray(raw)
      ? raw[1]
      : rangeRecord
        ? rangeRecord.end
        : undefined;
    const start = toDate(startRaw);
    const end = toDate(endRaw);
    const startInputProps = resolveInputProps(startRaw, 0);
    const endInputProps = resolveInputProps(endRaw, 1);
    const makeRangeValue = (nextStart: Date | null, nextEnd: Date | null) => {
      if (!nextStart && !nextEnd) return null;
      return Array.isArray(raw)
        ? [nextStart, nextEnd]
        : { start: nextStart, end: nextEnd };
    };

    const startStr =
      inputMode === "datetime-local"
        ? toInputDateTimeLocalValue(start)
        : toInputDateValue(start);
    const endStr =
      inputMode === "datetime-local"
        ? toInputDateTimeLocalValue(end)
        : toInputDateValue(end);

    return (
      <div className={cn("flex items-center gap-1", className)} style={style}>
        <Input
          {...startInputProps}
          type={inputMode}
          max={resolveMax(startInputProps)}
          value={startStr}
          disabled={disabled || Boolean(startInputProps.disabled)}
          className={cn("h-8 w-full", startInputProps.className as string)}
          placeholder={String(
            startInputProps.placeholder ?? startPlaceholder ?? placeholder ?? ""
          )}
          onChange={(e) => {
            const nextStart = parseInputValue(e.target.value);
            emitValue(makeRangeValue(nextStart, end));
          }}
        />
        <Input
          {...endInputProps}
          type={inputMode}
          max={resolveMax(endInputProps)}
          value={endStr}
          disabled={disabled || Boolean(endInputProps.disabled)}
          className={cn("h-8 w-full", endInputProps.className as string)}
          placeholder={String(
            endInputProps.placeholder ?? endPlaceholder ?? placeholder ?? ""
          )}
          onChange={(e) => {
            const nextEnd = parseInputValue(e.target.value);
            emitValue(makeRangeValue(start, nextEnd));
          }}
        />
      </div>
    );
  }

  // Single date
  const d = toDate(raw);
  const str =
    inputMode === "datetime-local"
      ? toInputDateTimeLocalValue(d)
      : toInputDateValue(d);
  const inputProps = resolveInputProps(raw, 0);

  return (
    <Input
      {...inputProps}
      type={inputMode}
      max={resolveMax(inputProps)}
      value={str}
      disabled={disabled || Boolean(inputProps.disabled)}
      className={cn("h-8 w-full", inputProps.className as string, className)}
      style={style}
      placeholder={String(inputProps.placeholder ?? placeholder ?? "")}
      onChange={(e) => {
        const next = parseInputValue(e.target.value);
        emitValue(next);
      }}
    />
  );
}
