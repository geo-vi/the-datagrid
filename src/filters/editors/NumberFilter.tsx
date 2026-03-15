"use client";

import * as React from "react";
import { cn } from "../../lib/utils";
import { Input } from "../../components/ui/input";

function isRangeOperator(op?: string): boolean {
  return op === "inrange" || op === "notinrange";
}

function toNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export type NumberFilterProps = {
  filterValue?: { value?: any; operator?: string; type?: string; name?: string };
  value?: any;
  onChange?: (value: any) => void;

  placeholder?: string;
  startPlaceholder?: string;
  endPlaceholder?: string;

  step?: number;
  min?: number;
  max?: number;

  disabled?: boolean;

  className?: string;
  style?: React.CSSProperties;

  [key: string]: any;
};

export default function NumberFilter(props: NumberFilterProps) {
  const {
    filterValue,
    value: valueProp,
    onChange,
    placeholder,
    startPlaceholder,
    endPlaceholder,
    step,
    min,
    max,
    disabled,
    className,
    style,
  } = props;

  const operator = filterValue?.operator;
  const raw = valueProp !== undefined ? valueProp : filterValue?.value;

  if (isRangeOperator(operator)) {
    const arr = Array.isArray(raw) ? raw : raw == null ? [] : [raw];
    const start = toNumber(arr[0]);
    const end = toNumber(arr[1]);

    return (
      <div className={cn("flex items-center gap-1", className)} style={style}>
        <Input
          type="number"
          value={start == null ? "" : String(start)}
          disabled={disabled}
          className="h-8 w-full"
          placeholder={startPlaceholder ?? placeholder ?? ""}
          step={step}
          min={min}
          max={max}
          onChange={(e) => {
            const nextStart = e.target.value === "" ? null : Number(e.target.value);
            const next: [number | null, number | null] = [Number.isFinite(nextStart) ? nextStart : null, end];
            onChange?.(next[0] != null || next[1] != null ? next : null);
          }}
        />
        <Input
          type="number"
          value={end == null ? "" : String(end)}
          disabled={disabled}
          className="h-8 w-full"
          placeholder={endPlaceholder ?? placeholder ?? ""}
          step={step}
          min={min}
          max={max}
          onChange={(e) => {
            const nextEnd = e.target.value === "" ? null : Number(e.target.value);
            const next: [number | null, number | null] = [start, Number.isFinite(nextEnd) ? nextEnd : null];
            onChange?.(next[0] != null || next[1] != null ? next : null);
          }}
        />
      </div>
    );
  }

  const n = toNumber(raw);

  return (
    <Input
      type="number"
      value={n == null ? "" : String(n)}
      disabled={disabled}
      className={cn("h-8 w-full", className)}
      style={style}
      placeholder={placeholder ?? ""}
      step={step}
      min={min}
      max={max}
      onChange={(e) => {
        const next = e.target.value === "" ? null : Number(e.target.value);
        onChange?.(Number.isFinite(next) ? next : null);
      }}
    />
  );
}
