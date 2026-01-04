"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

function isRangeOperator(op?: string): boolean {
  return op === "inrange" || op === "notinrange";
}

function toDate(value: unknown): Date | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value : null;
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

function parseInputValue(input: string, mode: "date" | "datetime-local"): Date | null {
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
  filterValue?: { value?: any; operator?: string; type?: string; name?: string };
  value?: any;
  onChange?: (value: any) => void;

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

  [key: string]: any;
};

export default function DateFilter(props: DateFilterProps) {
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
  } = props;

  const operator = filterValue?.operator;
  const type = filterValue?.type;

  // If column type is "time", use datetime-local; otherwise date.
  const inputMode: "date" | "datetime-local" = type === "time" ? "datetime-local" : "date";

  const raw = valueProp !== undefined ? valueProp : filterValue?.value;

  if (isRangeOperator(operator)) {
    const arr = Array.isArray(raw) ? raw : raw == null ? [] : [raw];
    const start = toDate(arr[0]);
    const end = toDate(arr[1]);

    const startStr = inputMode === "datetime-local" ? toInputDateTimeLocalValue(start) : toInputDateValue(start);
    const endStr = inputMode === "datetime-local" ? toInputDateTimeLocalValue(end) : toInputDateValue(end);

    return (
      <div className={cn("flex items-center gap-1", className)} style={style}>
        <Input
          type={inputMode}
          value={startStr}
          disabled={disabled}
          className="h-8 w-full"
          placeholder={startPlaceholder ?? placeholder ?? ""}
          onChange={(e) => {
            const nextStart = parseInputValue(e.target.value, inputMode);
            const next: [Date | null, Date | null] = [nextStart, end];
            onChange?.(next[0] || next[1] ? next : null);
          }}
        />
        <Input
          type={inputMode}
          value={endStr}
          disabled={disabled}
          className="h-8 w-full"
          placeholder={endPlaceholder ?? placeholder ?? ""}
          onChange={(e) => {
            const nextEnd = parseInputValue(e.target.value, inputMode);
            const next: [Date | null, Date | null] = [start, nextEnd];
            onChange?.(next[0] || next[1] ? next : null);
          }}
        />
      </div>
    );
  }

  // Single date
  const d = toDate(raw);
  const str = inputMode === "datetime-local" ? toInputDateTimeLocalValue(d) : toInputDateValue(d);

  return (
    <Input
      type={inputMode}
      value={str}
      disabled={disabled}
      className={cn("h-8 w-full", className)}
      style={style}
      placeholder={placeholder ?? ""}
      onChange={(e) => {
        const next = parseInputValue(e.target.value, inputMode);
        onChange?.(next);
      }}
    />
  );
}
