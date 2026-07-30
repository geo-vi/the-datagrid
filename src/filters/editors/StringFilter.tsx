"use client";

import * as React from "react";

import { Input } from "../../components/ui/input";
import { cn } from "../../lib/utils";
import {
  type TypeCommunityFilterChange,
  type TypeCommunityFilterValue,
  withFilterEditorValue,
} from "./editorTypes";

export type StringFilterProps = {
  filterValue?: TypeCommunityFilterValue<string | null>;
  value?: string | null;
  onChange?: TypeCommunityFilterChange<string | null>;
  filterDelay?: number;
  readOnly?: boolean;
  disabled?: boolean;
  style?: React.CSSProperties;
  className?: string;
  rtl?: boolean;
  theme?: string;
  placeholder?: string;
  inputRef?: React.Ref<HTMLInputElement>;
  filterEditorProps?:
    | React.ComponentPropsWithRef<"input">
    | ((props: StringFilterProps) => React.ComponentPropsWithRef<"input">);
  render?: (input: React.ReactElement) => React.ReactNode;
};

export type StringFilterHandle = {
  getInputRef: () => HTMLInputElement | null;
  setValue: (value?: string | null) => void;
};

function assignRef<T>(ref: React.Ref<T> | undefined, value: T | null): void {
  if (typeof ref === "function") ref(value);
  else if (ref) ref.current = value;
}

const StringFilter = React.forwardRef<StringFilterHandle, StringFilterProps>(
  function StringFilter(props, forwardedRef): React.ReactElement {
    const {
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
      render,
    } = props;
    const controlledValue = value !== undefined ? value : filterValue?.value;
    const [draft, setDraft] = React.useState(controlledValue ?? "");
    const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const internalInputRef = React.useRef<HTMLInputElement | null>(null);
    const descriptorEditorProps =
      filterValue?.filterEditorProps &&
      typeof filterValue.filterEditorProps === "object"
        ? (filterValue.filterEditorProps as React.InputHTMLAttributes<HTMLInputElement>)
        : {};
    const propEditorProps =
      typeof props.filterEditorProps === "function"
        ? props.filterEditorProps(props)
        : (props.filterEditorProps ?? {});
    const resolvedEditorProps = {
      ...descriptorEditorProps,
      ...propEditorProps,
    };

    React.useEffect(() => {
      setDraft(controlledValue ?? "");
    }, [controlledValue]);

    React.useImperativeHandle(
      forwardedRef,
      () => ({
        getInputRef: () => internalInputRef.current,
        setValue: (nextValue) => setDraft(nextValue ?? ""),
      }),
      []
    );

    React.useEffect(
      () => () => {
        if (timerRef.current) clearTimeout(timerRef.current);
      },
      []
    );

    const emitValue = React.useCallback(
      (nextValue: string | null) => {
        onChange?.(withFilterEditorValue(filterValue, nextValue, "string"));
      },
      [filterValue, onChange]
    );

    const input = (
      <Input
        {...resolvedEditorProps}
        ref={(node) => {
          internalInputRef.current = node;
          assignRef(inputRef, node);
          assignRef(
            (resolvedEditorProps as React.ComponentPropsWithRef<"input">).ref,
            node
          );
        }}
        type="text"
        value={draft}
        readOnly={readOnly}
        disabled={disabled}
        dir={rtl ? "rtl" : "ltr"}
        placeholder={resolvedEditorProps.placeholder ?? placeholder}
        className={cn("h-8 w-full", resolvedEditorProps.className, className)}
        style={{ ...resolvedEditorProps.style, ...style }}
        data-slot="string-filter"
        onChange={(event) => {
          resolvedEditorProps.onChange?.(event);
          const next = event.target.value;
          setDraft(next);
          if (timerRef.current) clearTimeout(timerRef.current);
          if (filterDelay > 0) {
            timerRef.current = setTimeout(
              () => emitValue(next === "" ? null : next),
              filterDelay
            );
          } else {
            emitValue(next === "" ? null : next);
          }
        }}
      />
    );

    return <>{render ? render(input) : input}</>;
  }
);
StringFilter.displayName = "StringFilter";

export default StringFilter;
