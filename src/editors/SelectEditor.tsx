"use client";

import * as React from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { cn } from "../lib/utils";
import {
  editorSurfaceClass,
  toDomEditorProps,
  type TypeCommunityEditorProps,
} from "./editorTypes";

export type SelectEditorValue = string | number | boolean | null;

export type SelectEditorOption = {
  id?: SelectEditorValue;
  value?: SelectEditorValue;
  label?: React.ReactNode;
  [key: string]: unknown;
};

export type SelectEditorProps = Omit<
  TypeCommunityEditorProps<SelectEditorValue>,
  "editorProps"
> & {
  /** Inovua's option list. Plain values are accepted too. */
  dataSource?: ReadonlyArray<SelectEditorOption | SelectEditorValue>;
  /** Alias for `dataSource`, matching the filter editors. */
  options?: ReadonlyArray<SelectEditorOption | SelectEditorValue>;
  placeholder?: string;
  editorProps?: Record<string, unknown>;
};

type NormalizedOption = {
  key: string;
  raw: SelectEditorValue;
  label: React.ReactNode;
};

function normalizeOptions(
  input: SelectEditorProps["dataSource"]
): NormalizedOption[] {
  if (!Array.isArray(input)) return [];

  return input.map((item) => {
    if (item != null && typeof item === "object") {
      const raw = (item.id ?? item.value ?? null) as SelectEditorValue;
      return {
        key: String(raw ?? ""),
        raw,
        label: item.label ?? String(raw ?? ""),
      };
    }

    return { key: String(item ?? ""), raw: item, label: String(item ?? "") };
  });
}

/**
 * Single-choice editor over a fixed option list.
 *
 * Upstream's `SelectEditor` is a ComboBox that commits on item click; this
 * keeps that contract on the library's own `Select`. Picking an option
 * completes the edit, so there is no way to commit a value outside the list —
 * which is the reason to use it over the built-in text editor.
 */
export default function SelectEditor({
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
  dataSource,
  options,
  placeholder = "Select…",
}: SelectEditorProps): React.ReactElement {
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = React.useState(Boolean(autoFocus));

  const optionList = React.useMemo(
    () => normalizeOptions(dataSource ?? options),
    [dataSource, options]
  );
  const optionByKey = React.useMemo(
    () => new Map(optionList.map((option) => [option.key, option])),
    [optionList]
  );

  React.useEffect(() => {
    if (autoFocus) triggerRef.current?.focus();
  }, [autoFocus]);

  return (
    <Select
      open={open}
      onOpenChange={setOpen}
      value={value == null ? undefined : String(value)}
      disabled={disabled || readOnly}
      onValueChange={(key) => {
        const next = optionByKey.get(key)?.raw ?? key;
        onChange?.(next);
        // Upstream defers completion by a tick so the popup unmounts first.
        window.setTimeout(() => onComplete?.(next), 0);
      }}
    >
      <SelectTrigger
        {...toDomEditorProps(editorProps, [
          "dataSource",
          "options",
          "placeholder",
        ])}
        ref={triggerRef}
        dir={rtl ? "rtl" : "ltr"}
        className={cn(
          "h-full w-full",
          editorSurfaceClass(seamless),
          className
        )}
        style={style}
        data-slot="select-editor"
        onBlur={(event) => {
          // Blurring into the popup is not the end of the edit.
          if (open) return;
          onComplete?.(value, event);
        }}
        onKeyDown={(event) => {
          onKeyDown?.(event);
          if (event.defaultPrevented) return;
          if (event.key === "Escape" && !open) {
            event.preventDefault();
            onCancel?.(event);
          } else if (event.key === "Tab") {
            event.preventDefault();
            onTabNavigation?.(true, event.shiftKey ? -1 : 1, event);
          }
        }}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>

      <SelectContent>
        {optionList.map((option) => (
          <SelectItem key={option.key} value={option.key}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
