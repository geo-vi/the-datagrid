"use client";

import * as React from "react";

import { Input } from "../components/ui/input";
import { cn } from "../lib/utils";
import {
  editorSurfaceClass,
  toDomEditorProps,
  type TypeCommunityEditorProps,
} from "./editorTypes";

export type NumericEditorValue = number | string | null;

export type NumericEditorProps =
  TypeCommunityEditorProps<NumericEditorValue> & {
    min?: number;
    max?: number;
    step?: number;
    emptyValue?: number | null;
  };

function parseNumericValue(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export default function NumericEditor({
  value = null,
  onChange,
  onComplete,
  onCancel,
  onTabNavigation,
  onKeyDown,
  autoFocus,
  disabled,
  readOnly,
  rtl,
  seamless,
  className,
  style,
  editorProps,
  min,
  max,
  step,
}: NumericEditorProps): React.ReactElement {
  const [draft, setDraft] = React.useState(value == null ? "" : String(value));
  const draftRef = React.useRef(draft);

  React.useEffect(() => {
    const nextDraft = value == null ? "" : String(value);
    draftRef.current = nextDraft;
    setDraft(nextDraft);
  }, [value]);

  return (
    <Input
      {...toDomEditorProps(editorProps)}
      type="number"
      value={draft}
      min={min ?? editorProps?.min}
      max={max ?? editorProps?.max}
      step={step ?? editorProps?.step}
      autoFocus={autoFocus}
      disabled={disabled}
      readOnly={readOnly}
      dir={rtl ? "rtl" : "ltr"}
      className={cn(
        "h-full min-h-8 w-full",
        editorSurfaceClass(seamless),
        editorProps?.className,
        className
      )}
      style={{ ...editorProps?.style, ...style }}
      data-slot="numeric-editor"
      onChange={(event) => {
        draftRef.current = event.target.value;
        setDraft(event.target.value);
        onChange?.(parseNumericValue(event.target.value), event);
      }}
      onBlur={(event) => {
        editorProps?.onBlur?.(event);
        onComplete?.(parseNumericValue(draftRef.current), event);
      }}
      onKeyDown={(event) => {
        editorProps?.onKeyDown?.(event);
        onKeyDown?.(event);
        if (event.defaultPrevented) return;
        if (event.key === "Escape") {
          event.preventDefault();
          onCancel?.(event);
        } else if (event.key === "Enter") {
          event.preventDefault();
          onComplete?.(parseNumericValue(draftRef.current), event);
        } else if (event.key === "Tab") {
          event.preventDefault();
          onTabNavigation?.(true, event.shiftKey ? -1 : 1, event);
        }
      }}
    />
  );
}
