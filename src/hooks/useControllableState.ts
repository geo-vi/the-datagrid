import * as React from "react"

export function useControllableState<T>(args: {
  value: T | undefined
  defaultValue: T
  onChange?: (next: T) => void
}): [T, (next: T) => void, boolean] {
  const { value, defaultValue, onChange } = args
  const isControlled = value !== undefined
  const [internal, setInternal] = React.useState<T>(defaultValue)

  const state = (isControlled ? (value as T) : internal) as T

  const setState = React.useCallback(
    (next: T) => {
      if (!isControlled) setInternal(next)
      onChange?.(next)
    },
    [isControlled, onChange]
  )

  return [state, setState, isControlled]
}
