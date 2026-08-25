"use client";

import * as React from "react";

import { Input } from "../components/ui/input";
import { cn } from "../lib/utils";
import {
  editorSurfaceClass,
  toDomEditorProps,
  type TypeCommunityEditorProps,
} from "./editorTypes";

export type TextEditorValue = string | null;

export type TextEditorProps = TypeCommunityEditorProps<TextEditorValue> & {
  maxLength?: number;
  minLength?: number;
  placeholder?: string;
  /** Value reported on completion for an empty field. Defaults to `""`. */
  emptyValue?: TextEditorValue;
  /** Reports the trimmed draft on completion. Typing is left untouched. */
  trim?: boolean;
  /** Shows an inline clear button, like the standalone `TextInput`. */
  enableClearButton?: boolean;
};

/**
 * Single-line text editor.
 *
 * Enter completes without navigating: the Inovua default editor paired
 * completion with `onEnterNavigation`, so a held Enter walked the editor down
 * the column one row at a time. Call `onEnterNavigation` from `onKeyDown` to
 * opt back in.
 *
 * `trim` and `emptyValue` apply only on completion, so a normalized value is
 * never echoed back mid-keystroke and the caret stays put.
 */
export default function TextEditor({
  value = "",
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
  maxLength,
  minLength,
  placeholder,
  emptyValue = "",
  trim = false,
  enableClearButton = false,
}: TextEditorProps): React.ReactElement {
  const [draft, setDraft] = React.useState(value == null ? "" : String(value));
  const draftRef = React.useRef(draft);
  const fieldRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    const nextDraft = value == null ? "" : String(value);
    draftRef.current = nextDraft;
    setDraft(nextDraft);
  }, [value]);

  const readCompletedDraft = React.useCallback((): TextEditorValue => {
    const current = trim ? draftRef.current.trim() : draftRef.current;
    return current === "" ? emptyValue : current;
  }, [emptyValue, trim]);

  const clearButton =
    enableClearButton && draft !== "" && !disabled && !readOnly ? (
      <button
        type="button"
        aria-label="Clear"
        className="tdg-text-editor__clear ml-1 shrink-0 opacity-60 hover:opacity-100"
        tabIndex={-1}
        // Clearing must not blur the field, which would complete the edit.
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          draftRef.current = "";
          setDraft("");
          onChange?.("");
          fieldRef.current?.focus();
        }}
      >
        <svg aria-hidden="true" viewBox="0 0 10 10" width="10" height="10">
          <path
            d="M1 1l8 8m0-8L1 9"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.33"
          />
        </svg>
      </button>
    ) : null;

  return (
    <Input
      {...toDomEditorProps(editorProps, [
        "trim",
        "emptyValue",
        "enableClearButton",
      ])}
      ref={fieldRef}
      endAdornment={clearButton}
      type="text"
      value={draft}
      maxLength={maxLength ?? editorProps?.maxLength}
      minLength={minLength ?? editorProps?.minLength}
      placeholder={placeholder ?? editorProps?.placeholder}
      autoFocus={autoFocus}
      disabled={disabled}
      readOnly={readOnly}
      dir={rtl ? "rtl" : "ltr"}
      className={cn(
        "tdg-text-editor h-full min-h-8 w-full",
        editorSurfaceClass(seamless),
        editorProps?.className,
        className
      )}
      style={{ ...editorProps?.style, ...style }}
      data-slot="text-editor"
      onChange={(event) => {
        draftRef.current = event.target.value;
        setDraft(event.target.value);
        onChange?.(event.target.value, event);
      }}
      onBlur={(event) => {
        editorProps?.onBlur?.(event);
        onComplete?.(readCompletedDraft(), event);
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
          onComplete?.(readCompletedDraft(), event);
        } else if (event.key === "Tab") {
          event.preventDefault();
          onTabNavigation?.(true, event.shiftKey ? -1 : 1, event);
        }
      }}
    />
  );
}
