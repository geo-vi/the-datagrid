"use client";

import * as React from "react";

import { Checkbox } from "../components/ui/checkbox";
import { cn } from "../lib/utils";
import type { TypeCommunityEditorProps } from "./editorTypes";

export type BoolEditorProps = Omit<
  TypeCommunityEditorProps<boolean | null>,
  "onTabNavigation"
> & {
  emptyValue?: boolean | null;
  onTabNavigation?: (
    direction: -1 | 1,
    event?: React.KeyboardEvent<HTMLButtonElement>
  ) => void;
};

export default function BoolEditor({
  value = null,
  onChange,
  onComplete,
  onCancel,
  onTabNavigation,
  autoFocus,
  disabled,
  readOnly,
  rtl,
  className,
  style,
}: BoolEditorProps): React.ReactElement {
  const buttonRef = React.useRef<HTMLButtonElement | null>(null);

  React.useEffect(() => {
    if (autoFocus) buttonRef.current?.focus();
  }, [autoFocus]);

  return (
    <div
      className={cn(
        "flex h-full min-h-8 w-full items-center justify-center",
        className
      )}
      style={style}
      dir={rtl ? "rtl" : "ltr"}
      data-slot="bool-editor"
    >
      <Checkbox
        ref={buttonRef}
        checked={value === true}
        disabled={disabled || readOnly}
        aria-label="Boolean value"
        onCheckedChange={(checked) => {
          const next = checked === true;
          onChange?.(next);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            onCancel?.(event);
          } else if (event.key === "Enter") {
            event.preventDefault();
            onComplete?.(value, event);
          } else if (event.key === "Tab") {
            onTabNavigation?.(event.shiftKey ? -1 : 1, event);
          }
        }}
      />
    </div>
  );
}
