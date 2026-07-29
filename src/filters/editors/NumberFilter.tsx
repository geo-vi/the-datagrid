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

function toNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export type NumberFilterProps = {
  filterValue?: TypeCommunityFilterValue<unknown>;
  value?: unknown;
  onChange?: TypeCommunityFilterChange<unknown>;
  filterEditorProps?:
    | Record<string, unknown>
    | ((
        editorProps: NumberFilterProps,
        meta: { index: number; value: unknown }
      ) => Record<string, unknown> | undefined);

  placeholder?: string;
  startPlaceholder?: string;
  endPlaceholder?: string;

  step?: number;
  min?: number;
  max?: number;

  disabled?: boolean;

  className?: string;
  style?: React.CSSProperties;
};

export default function NumberFilter(
  props: NumberFilterProps
): React.ReactElement {
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
    filterEditorProps,
  } = props;

  const operator = filterValue?.operator;
  const raw = valueProp !== undefined ? valueProp : filterValue?.value;
  const configuredFilterEditorProps =
    filterEditorProps ??
    (filterValue?.filterEditorProps as NumberFilterProps["filterEditorProps"]);
  const resolveInputProps = (value: unknown, index: number) => {
    if (typeof configuredFilterEditorProps === "function") {
      return (
        configuredFilterEditorProps({ ...props, value }, { index, value }) ?? {}
      );
    }
    return configuredFilterEditorProps ?? {};
  };
  const emitValue = (nextValue: unknown) =>
    onChange?.(withFilterEditorValue(filterValue, nextValue, "number"));

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
    const start = toNumber(startRaw);
    const end = toNumber(endRaw);
    const startInputProps = resolveInputProps(start, 0);
    const endInputProps = resolveInputProps(end, 1);
    const makeRangeValue = (
      nextStart: number | null,
      nextEnd: number | null
    ) => {
      if (nextStart == null && nextEnd == null) return null;
      return Array.isArray(raw)
        ? [nextStart, nextEnd]
        : { start: nextStart, end: nextEnd };
    };

    return (
      <div className={cn("flex items-center gap-1", className)} style={style}>
        <Input
          {...startInputProps}
          type="number"
          value={start == null ? "" : String(start)}
          disabled={disabled || Boolean(startInputProps.disabled)}
          className={cn("h-8 w-full", startInputProps.className as string)}
          placeholder={String(
            startInputProps.placeholder ?? startPlaceholder ?? placeholder ?? ""
          )}
          step={(startInputProps.step as number | undefined) ?? step}
          min={(startInputProps.min as number | undefined) ?? min}
          max={(startInputProps.max as number | undefined) ?? max}
          onChange={(e) => {
            const nextStart =
              e.target.value === "" ? null : Number(e.target.value);
            emitValue(
              makeRangeValue(Number.isFinite(nextStart) ? nextStart : null, end)
            );
          }}
        />
        <Input
          {...endInputProps}
          type="number"
          value={end == null ? "" : String(end)}
          disabled={disabled || Boolean(endInputProps.disabled)}
          className={cn("h-8 w-full", endInputProps.className as string)}
          placeholder={String(
            endInputProps.placeholder ?? endPlaceholder ?? placeholder ?? ""
          )}
          step={(endInputProps.step as number | undefined) ?? step}
          min={(endInputProps.min as number | undefined) ?? min}
          max={(endInputProps.max as number | undefined) ?? max}
          onChange={(e) => {
            const nextEnd =
              e.target.value === "" ? null : Number(e.target.value);
            emitValue(
              makeRangeValue(start, Number.isFinite(nextEnd) ? nextEnd : null)
            );
          }}
        />
      </div>
    );
  }

  const n = toNumber(raw);
  const inputProps = resolveInputProps(n, 0);

  return (
    <Input
      {...inputProps}
      type="number"
      value={n == null ? "" : String(n)}
      disabled={disabled || Boolean(inputProps.disabled)}
      className={cn("h-8 w-full", inputProps.className as string, className)}
      style={style}
      placeholder={String(inputProps.placeholder ?? placeholder ?? "")}
      step={(inputProps.step as number | undefined) ?? step}
      min={(inputProps.min as number | undefined) ?? min}
      max={(inputProps.max as number | undefined) ?? max}
      onChange={(e) => {
        const next = e.target.value === "" ? null : Number(e.target.value);
        emitValue(Number.isFinite(next) ? next : null);
      }}
    />
  );
}
