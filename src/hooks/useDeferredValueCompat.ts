import * as React from "react";

type UseDeferredValue = <T>(value: T) => T;

const useDeferredValue: UseDeferredValue =
  (React as typeof React & { useDeferredValue?: UseDeferredValue })
    .useDeferredValue ?? ((value) => value);

/** Uses React's deferred hook when available and stays synchronous on React 16/17. */
export function useDeferredValueCompat<T>(value: T): T {
  return useDeferredValue(value);
}
