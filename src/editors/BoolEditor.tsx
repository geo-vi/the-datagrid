"use client";

import * as React from "react";

import { Checkbox } from "../components/ui/checkbox";
import { cn } from "../lib/utils";
import {
  editorSurfaceClass,
  toDomEditorProps,
  type TypeCommunityEditorProps,
} from "./editorTypes";

export type BoolEditorProps = Omit<
  TypeCommunityEditorProps<boolean | null>,
  "editorProps"
> & {
  emptyValue?: boolean | null;
  editorProps?: React.ButtonHTMLAttributes<HTMLButtonElement>;
};

export default function BoolEditor({
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
}: BoolEditorProps): React.ReactElement {
  const buttonRef = React.useRef<HTMLButtonElement | null>(null);
  const currentValueRef = React.useRef(value);

  React.useEffect(() => {
    currentValueRef.current = value;
  }, [value]);

  React.useEffect(() => {
    if (autoFocus) buttonRef.current?.focus();
  }, [autoFocus]);

  return (
    <div
      className={cn(
        "flex h-full min-h-8 w-full items-center justify-center",
        editorSurfaceClass(seamless),
        className
      )}
      style={style}
      dir={rtl ? "rtl" : "ltr"}
      data-slot="bool-editor"
    >
      <Checkbox
        {...toDomEditorProps(editorProps, ["emptyValue"])}
        ref={buttonRef}
        checked={value === true}
        disabled={disabled || readOnly}
        aria-label={editorProps?.["aria-label"] ?? "Boolean value"}
        className={cn(editorProps?.className)}
        style={editorProps?.style}
        onBlur={(event) => {
          editorProps?.onBlur?.(event);
          onComplete?.(currentValueRef.current, event);
        }}
        onCheckedChange={(checked) => {
          const next = checked === true;
          currentValueRef.current = next;
          onChange?.(next);
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
            onComplete?.(currentValueRef.current, event);
          } else if (event.key === "Tab") {
            event.preventDefault();
            onTabNavigation?.(true, event.shiftKey ? -1 : 1, event);
          }
        }}
      />
    </div>
  );
}
