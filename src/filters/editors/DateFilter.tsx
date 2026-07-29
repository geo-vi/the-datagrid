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
  return n < 10 ? `0${n}` : String(n);
}

function toInputDateValue(d: Date | null): string {
  if (!d) return "";
  const y = d.getFullYear();
  const m = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  return `${y}-${m}-${day}`;
}

function toInputDateTimeLocalValue(d: Date | null): string {
  if (!d) return "";
  const y = d.getFullYear();
  const m = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  const hh = pad2(d.getHours());
  const mm = pad2(d.getMinutes());
  return `${y}-${m}-${day}T${hh}:${mm}`;
}

function parseInputValue(
  input: string,
  mode: "date" | "datetime-local"
): Date | null {
  if (!input) return null;
  if (mode === "date") {
    // Interpret as local date
    const d = new Date(`${input}T00:00:00`);
    return Number.isFinite(d.getTime()) ? d : null;
  }
  const d = new Date(input);
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
          value={startStr}
          disabled={disabled || Boolean(startInputProps.disabled)}
          className={cn("h-8 w-full", startInputProps.className as string)}
          placeholder={String(
            startInputProps.placeholder ?? startPlaceholder ?? placeholder ?? ""
          )}
          onChange={(e) => {
            const nextStart = parseInputValue(e.target.value, inputMode);
            emitValue(makeRangeValue(nextStart, end));
          }}
        />
        <Input
          {...endInputProps}
          type={inputMode}
          value={endStr}
          disabled={disabled || Boolean(endInputProps.disabled)}
          className={cn("h-8 w-full", endInputProps.className as string)}
          placeholder={String(
            endInputProps.placeholder ?? endPlaceholder ?? placeholder ?? ""
          )}
          onChange={(e) => {
            const nextEnd = parseInputValue(e.target.value, inputMode);
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
      value={str}
      disabled={disabled || Boolean(inputProps.disabled)}
      className={cn("h-8 w-full", inputProps.className as string, className)}
      style={style}
      placeholder={String(inputProps.placeholder ?? placeholder ?? "")}
      onChange={(e) => {
        const next = parseInputValue(e.target.value, inputMode);
        emitValue(next);
      }}
    />
  );
}
