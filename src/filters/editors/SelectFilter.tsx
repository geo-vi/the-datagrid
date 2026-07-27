"use client";

import * as React from "react";
import { IconChevronDown } from "@tabler/icons-react";

import { cn } from "../../lib/utils";
import { Button } from "../../components/ui/button";
import { Checkbox } from "../../components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";

type AnyRecord = Record<string, any>;

function isRecord(v: unknown): v is AnyRecord {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function toKey(v: unknown): string {
  if (v == null) return "";
  return String(v);
}

function normalizeOptions(
  input: any[] | undefined
): { key: string; raw: any; label: string }[] {
  const arr = Array.isArray(input) ? input : [];
  return arr.map((item) => {
    if (isRecord(item)) {
      const raw =
        item.value ??
        item.id ??
        item.key ??
        item.name ??
        item.label ??
        item.title ??
        item.code ??
        "";
      const label = String(
        item.label ??
          item.name ??
          item.title ??
          item.value ??
          item.id ??
          raw ??
          ""
      );
      return { key: toKey(raw), raw, label };
    }

    return { key: toKey(item), raw: item, label: String(item) };
  });
}

function splitStringList(v: string): string[] {
  return v
    .split(/[;,]+/g)
    .map((x) => x.trim())
    .filter(Boolean);
}

export type SelectFilterProps = {
  filterValue?: {
    value?: any;
    operator?: string;
    type?: string;
    name?: string;
  };
  value?: any;
  onChange?: (value: any) => void;
  filterEditorProps?:
    | Record<string, unknown>
    | ((
        editorProps: SelectFilterProps,
        meta: { index: number; value: unknown }
      ) => Record<string, unknown> | undefined);

  /**
   * Inovua uses `dataSource`.
   * Some codebases use `options`.
   */
  dataSource?: any[];
  options?: any[];

  /**
   * Inovua props
   */
  multiple?: boolean;
  wrapMultiple?: boolean;
  placeholder?: string;

  disabled?: boolean;

  className?: string;
  style?: React.CSSProperties;

  [key: string]: any;
};

export default function SelectFilter(
  props: SelectFilterProps
): React.ReactElement {
  const resolvedFilterEditorProps =
    typeof props.filterEditorProps === "function"
      ? (props.filterEditorProps(
          { ...props, value: props.value ?? props.filterValue?.value },
          { index: 0, value: props.value ?? props.filterValue?.value }
        ) ?? {})
      : (props.filterEditorProps ?? {});
  const mergedProps = {
    ...resolvedFilterEditorProps,
    ...props,
  };
  const {
    filterValue,
    value: valueProp,
    onChange,
    dataSource,
    options,
    multiple: multipleProp,
    placeholder,
    disabled,
    className,
    style,
  } = mergedProps;

  const current = valueProp !== undefined ? valueProp : filterValue?.value;
  const operator = filterValue?.operator;

  const multiple = Boolean(multipleProp) || operator === "inlist";

  const optionList = React.useMemo(
    () => normalizeOptions(dataSource ?? options),
    [dataSource, options]
  );

  const optionByKey = React.useMemo(() => {
    const m = new Map<string, { raw: any; label: string }>();
    for (const o of optionList) m.set(o.key, { raw: o.raw, label: o.label });
    return m;
  }, [optionList]);

  const clearLabel = placeholder ?? "All";

  if (multiple) {
    const selectedRaw: any[] = Array.isArray(current)
      ? current
      : typeof current === "string"
        ? splitStringList(current)
        : current == null
          ? []
          : [current];

    const selectedKeys = selectedRaw.map((v) => toKey(v)).filter(Boolean);
    const selectedSet = new Set(selectedKeys);

    const selectedLabels = selectedKeys
      .map((k) => optionByKey.get(k)?.label ?? k)
      .filter(Boolean);

    const buttonText =
      selectedLabels.length === 0
        ? clearLabel
        : selectedLabels.length <= 2
          ? selectedLabels.join(", ")
          : `${selectedLabels.length} selected`;

    const toggle = (key: string) => {
      const nextSet = new Set(selectedSet);
      if (nextSet.has(key)) nextSet.delete(key);
      else nextSet.add(key);

      const nextKeys = Array.from(nextSet);

      // Map keys -> raw values (preserve original types)
      const nextRaw = nextKeys.map((k) => optionByKey.get(k)?.raw ?? k);

      onChange?.(nextRaw.length ? nextRaw : null);
    };

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn("h-8 w-full justify-between px-2", className)}
            style={style}
            disabled={disabled}
          >
            <span className="truncate">{buttonText}</span>
            <IconChevronDown className="ml-2 size-3 opacity-60" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuItem
            onSelect={(e: Event) => {
              e.preventDefault();
              onChange?.(null);
            }}
          >
            {clearLabel}
          </DropdownMenuItem>

          {optionList.map((o) => {
            const checked = selectedSet.has(o.key);

            return (
              <DropdownMenuItem
                key={o.key}
                className="flex items-center gap-2"
                onSelect={(e: Event) => {
                  e.preventDefault();
                  toggle(o.key);
                }}
              >
                <Checkbox checked={checked} onCheckedChange={() => {}} />
                <span className="truncate">{o.label}</span>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // single select
  const selectedKey =
    current == null || current === "" ? "__all__" : toKey(current);

  return (
    <Select
      value={selectedKey}
      onValueChange={(k) => {
        if (k === "__all__") {
          onChange?.(null);
          return;
        }
        onChange?.(optionByKey.get(k)?.raw ?? k);
      }}
      disabled={disabled}
    >
      <SelectTrigger className={cn("h-8 w-full", className)} style={style}>
        <SelectValue placeholder={clearLabel} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__all__">{clearLabel}</SelectItem>
        {optionList.map((o) => (
          <SelectItem key={o.key} value={o.key}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
