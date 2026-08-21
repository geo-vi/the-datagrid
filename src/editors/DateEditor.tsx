"use client";

import * as React from "react";

import { Input } from "../components/ui/input";
import { cn } from "../lib/utils";
import {
  editorSurfaceClass,
  toDomEditorProps,
  type TypeCommunityEditorProps,
} from "./editorTypes";

export type DateEditorValue = string | Date | null;

export type DateEditorProps = TypeCommunityEditorProps<DateEditorValue> & {
  relativeToViewport?: boolean;
  constrainTo?: unknown;
  renderPicker?: (...args: unknown[]) => React.ReactNode;
  overlayProps?: Record<string, unknown>;
};

function toInputValue(value: DateEditorValue): string {
  if (value == null || value === "") return "";
  if (typeof value === "string") return value.slice(0, 10);
  if (!Number.isFinite(value.getTime())) return "";
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function DateEditor({
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
}: DateEditorProps): React.ReactElement {
  const [draft, setDraft] = React.useState(() => toInputValue(value));
  const draftRef = React.useRef(draft);

  React.useEffect(() => {
    const nextDraft = toInputValue(value);
    draftRef.current = nextDraft;
    setDraft(nextDraft);
  }, [value]);

  return (
    <Input
      {...toDomEditorProps(editorProps, [
        "relativeToViewport",
        "constrainTo",
        "renderPicker",
        "overlayProps",
      ])}
      type="date"
      value={draft}
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
      data-slot="date-editor"
      onChange={(event) => {
        draftRef.current = event.target.value;
        setDraft(event.target.value);
        onChange?.(event.target.value || null, event);
      }}
      onBlur={(event) => {
        editorProps?.onBlur?.(event);
        onComplete?.(draftRef.current || null, event);
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
          onComplete?.(draftRef.current || null, event);
        } else if (event.key === "Tab") {
          event.preventDefault();
          onTabNavigation?.(true, event.shiftKey ? -1 : 1, event);
        }
      }}
    />
  );
}

DateEditor.defaultProps = {
  relativeToViewport: false,
};
