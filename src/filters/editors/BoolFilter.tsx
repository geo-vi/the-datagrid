"use client";

import * as React from "react";

import { Checkbox } from "../../components/ui/checkbox";
import { cn } from "../../lib/utils";
import {
  type TypeCommunityFilterChange,
  type TypeCommunityFilterValue,
  withFilterEditorValue,
} from "./editorTypes";

export type BoolFilterProps = {
  filterValue?: TypeCommunityFilterValue<boolean | null>;
  value?: boolean | null;
  onChange?: TypeCommunityFilterChange<boolean | null>;
  emptyValue?: boolean | null;
  filterDelay?: number;
  readOnly?: boolean;
  disabled?: boolean;
  rtl?: boolean;
  theme?: string;
  className?: string;
  style?: React.CSSProperties;
  i18n?: (key: string, defaultLabel: string) => React.ReactNode;
  filterEditorProps?:
    | React.ComponentPropsWithoutRef<typeof Checkbox>
    | ((
        props: BoolFilterProps
      ) => React.ComponentPropsWithoutRef<typeof Checkbox>);
  render?: (checkbox: React.ReactElement) => React.ReactNode;
};

export default function BoolFilter({
  filterValue,
  value,
  onChange,
  emptyValue = null,
  filterDelay = 0,
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
  const [draft, setDraft] = React.useState<boolean | null>(
    current === undefined ? emptyValue : current
  );
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const descriptorEditorProps =
    filterValue?.filterEditorProps &&
    typeof filterValue.filterEditorProps === "object"
      ? (filterValue.filterEditorProps as React.ComponentPropsWithoutRef<
          typeof Checkbox
        >)
      : {};
  const propEditorProps =
    typeof filterEditorProps === "function"
      ? filterEditorProps({
          filterValue,
          value,
          onChange,
          emptyValue,
          filterDelay,
          readOnly,
          disabled,
          rtl,
          className,
          style,
          i18n,
          filterEditorProps,
          render,
        })
      : (filterEditorProps ?? {});
  const resolvedEditorProps = {
    ...descriptorEditorProps,
    ...propEditorProps,
  };

  React.useEffect(() => {
    setDraft(current === undefined ? emptyValue : current);
  }, [current, emptyValue]);

  React.useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  const emitValue = (nextValue: boolean | null) => {
    const descriptor = withFilterEditorValue(
      filterValue,
      nextValue,
      filterValue?.type ?? "bool"
    );
    if (timerRef.current) clearTimeout(timerRef.current);
    if (filterDelay > 0) {
      timerRef.current = setTimeout(() => onChange?.(descriptor), filterDelay);
    } else {
      onChange?.(descriptor);
    }
  };

  const checkbox = (
    <Checkbox
      {...resolvedEditorProps}
      checked={draft == null ? "indeterminate" : draft}
      disabled={disabled || readOnly}
      dir={rtl ? "rtl" : "ltr"}
      className={cn("mx-auto", resolvedEditorProps.className, className)}
      style={{ ...resolvedEditorProps.style, ...style }}
      data-slot="bool-filter"
      aria-label={
        resolvedEditorProps["aria-label"] ??
        String(i18n?.("boolFilter", "Boolean filter") ?? "Boolean filter")
      }
      onCheckedChange={() => {
        resolvedEditorProps.onCheckedChange?.(
          draft == null ? true : draft ? false : "indeterminate"
        );
        const next = draft == null ? true : draft ? false : emptyValue;
        setDraft(next);
        emitValue(next);
      }}
    />
  );

  return <>{render ? render(checkbox) : checkbox}</>;
}
