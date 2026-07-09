import * as React from "react";

import { cn } from "../../lib/utils";
import { useDatagridThemeClassSuffix } from "../../theme/context";

type InputProps = React.ComponentProps<"input"> & {
  inputClassName?: string;
};

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      inputClassName,
      type,
      onFocus,
      onBlur,
      disabled,
      style,
      ...props
    },
    ref
  ) => {
    const themeClassSuffix = useDatagridThemeClassSuffix();
    const [focused, setFocused] = React.useState(false);

    return (
      <div
        className={cn(
          "flex h-9 w-full items-center rounded-md border bg-[var(--tdg-input-bg)] px-3 py-1 text-[var(--tdg-input-color)] shadow-sm transition-colors [border-color:var(--tdg-input-border-color)] hover:[border-color:var(--tdg-input-border-color-hover)] focus-within:ring-1 focus-within:ring-ring focus-within:[border-color:var(--tdg-input-border-color-focus)] disabled:cursor-not-allowed disabled:opacity-50",
          "inovua-react-toolkit-text-input",
          `inovua-react-toolkit-text-input--theme-${themeClassSuffix}`,
          disabled ? "inovua-react-toolkit-text-input--disabled" : "",
          focused ? "inovua-react-toolkit-text-input--focused" : "",
          className
        )}
        style={style}
      >
        <input
          type={type}
          className={cn(
            "inovua-react-toolkit-text-input__input flex-1 bg-transparent text-base text-[var(--tdg-input-color)] outline-none file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground md:text-sm",
            inputClassName
          )}
          ref={ref}
          disabled={disabled}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          {...props}
        />
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
