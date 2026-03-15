import * as React from "react"

import { cn } from "../../lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-md border bg-[var(--tdg-input-bg)] px-3 py-1 text-base text-[var(--tdg-input-color)] shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground [border-color:var(--tdg-input-border-color)] hover:[border-color:var(--tdg-input-border-color-hover)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:[border-color:var(--tdg-input-border-color-focus)] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
