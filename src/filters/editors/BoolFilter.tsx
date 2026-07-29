"use client";

import * as React from "react";

import { cn } from "../../lib/utils";

export type BoolFilterProps = {
  filterValue?: {
    name?: string;
    operator?: string;
    type?: string;
    value?: boolean | null;
  };
  value?: boolean | null;
  onChange?: (value: boolean | null) => void;
  emptyValue?: boolean | null;
  readOnly?: boolean;
  disabled?: boolean;
  rtl?: boolean;
  theme?: string;
  className?: string;
  style?: React.CSSProperties;
  i18n?: (key: string, defaultLabel: string) => React.ReactNode;
  filterEditorProps?: React.SelectHTMLAttributes<HTMLSelectElement>;
  render?: (select: React.ReactElement) => React.ReactNode;
};

export default function BoolFilter({
  filterValue,
  value,
  onChange,
  emptyValue = null,
  readOnly,
  disabled,
  rtl,
  className,
  style,
  i18n,
  filterEditorProps,
  render,
}: BoolFilterProps): React.ReactElement {
  const current = value !== undefined ? value : filterValue?.value;
  const select = (
    <select
      {...filterEditorProps}
      value={current == null ? "" : current ? "true" : "false"}
      disabled={disabled || readOnly}
      dir={rtl ? "rtl" : "ltr"}
      className={cn(
        "h-8 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        filterEditorProps?.className,
        className
      )}
      style={{ ...filterEditorProps?.style, ...style }}
      data-slot="bool-filter"
      onChange={(event) => {
        filterEditorProps?.onChange?.(event);
        onChange?.(
          event.target.value === "" ? emptyValue : event.target.value === "true"
        );
      }}
    >
      <option value="">{i18n?.("all", "All") ?? "All"}</option>
      <option value="true">{i18n?.("true", "True") ?? "True"}</option>
      <option value="false">{i18n?.("false", "False") ?? "False"}</option>
    </select>
  );

  return <>{render ? render(select) : select}</>;
}
