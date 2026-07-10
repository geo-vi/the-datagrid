import * as React from "react";

export function useControllableState<T>(args: {
  value: T | undefined;
  defaultValue: T;
  onChange?: (next: T) => void;
}): [T, (next: T) => void, boolean] {
  const { value, defaultValue, onChange } = args;
  const isControlled = value !== undefined;
  const [internal, setInternal] = React.useState<T>(defaultValue);
  const onChangeRef = React.useRef(onChange);

  React.useLayoutEffect(() => {
    onChangeRef.current = onChange;

    return () => {
      onChangeRef.current = undefined;
    };
  }, [onChange]);

  const state = (isControlled ? (value as T) : internal) as T;

  const setState = React.useCallback(
    (next: T) => {
      if (!isControlled) setInternal(next);
      onChangeRef.current?.(next);
    },
    [isControlled]
  );

  return [state, setState, isControlled];
}
