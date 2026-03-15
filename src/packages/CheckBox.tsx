"use client";

import * as React from "react";
import { Checkbox } from "../components/ui/checkbox";
import { cn } from "../lib/utils";

export type CheckBoxProps = {
  checked?: boolean;
  indeterminate?: boolean;
  disabled?: boolean;

  onChange?: (checked: boolean, event?: unknown) => void;
  onClick?: (event: unknown) => void;

  className?: string;
  style?: React.CSSProperties;

  [key: string]: any;
};

export default function CheckBox(props: CheckBoxProps) {
  const {
    checked = false,
    indeterminate = false,
    disabled = false,
    onChange,
    onClick,
    className,
    style,
    ...rest
  } = props;

  return (
    <Checkbox
      checked={indeterminate ? "indeterminate" : checked}
      disabled={disabled}
      className={cn(className)}
      style={style}
      onClick={(e) => {
        onClick?.(e);
        // Keep row clicks from toggling selection unexpectedly
        (e as any)?.stopPropagation?.();
      }}
      onCheckedChange={(v) => {
        // Radix returns boolean | "indeterminate"
        const next = v === true;
        onChange?.(next, v);
      }}
      {...rest}
    />
  );
}
