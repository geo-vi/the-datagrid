"use client";

import * as React from "react";

import { Input } from "../../components/ui/input";
import { cn } from "../../lib/utils";

export type StringFilterProps = {
  filterValue?: {
    name?: string;
    operator?: string;
    type?: string;
    value?: string | null;
    filterEditorProps?: Record<string, unknown>;
  };
  value?: string | null;
  onChange?: (value: string | null) => void;
  filterDelay?: number;
  readOnly?: boolean;
  disabled?: boolean;
  style?: React.CSSProperties;
  className?: string;
  rtl?: boolean;
  theme?: string;
  placeholder?: string;
  inputRef?: React.Ref<HTMLInputElement>;
  filterEditorProps?: React.InputHTMLAttributes<HTMLInputElement>;
  render?: (input: React.ReactElement) => React.ReactNode;
};

export default function StringFilter({
  filterValue,
  value,
  onChange,
  filterDelay = 0,
  readOnly,
  disabled,
  style,
  className,
  rtl,
  placeholder,
  inputRef,
  filterEditorProps,
  render,
}: StringFilterProps): React.ReactElement {
  const controlledValue = value !== undefined ? value : filterValue?.value;
  const [draft, setDraft] = React.useState(controlledValue ?? "");
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    setDraft(controlledValue ?? "");
  }, [controlledValue]);

  React.useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  const input = (
    <Input
      {...filterEditorProps}
      ref={inputRef}
      type="text"
      value={draft}
      readOnly={readOnly}
      disabled={disabled}
      dir={rtl ? "rtl" : "ltr"}
      placeholder={filterEditorProps?.placeholder ?? placeholder}
      className={cn("h-8 w-full", filterEditorProps?.className, className)}
      style={{ ...filterEditorProps?.style, ...style }}
      data-slot="string-filter"
      onChange={(event) => {
        filterEditorProps?.onChange?.(event);
        const next = event.target.value;
        setDraft(next);
        if (timerRef.current) clearTimeout(timerRef.current);
        if (filterDelay > 0) {
          timerRef.current = setTimeout(
            () => onChange?.(next === "" ? null : next),
            filterDelay
          );
        } else {
          onChange?.(next === "" ? null : next);
        }
      }}
    />
  );

  return <>{render ? render(input) : input}</>;
}
