import * as React from "react"

import { cn } from "../../lib/utils"

const Kbd = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
  ({ className, ...props }, ref) => (
    <kbd
      ref={ref}
      className={cn(
        "inline-flex min-h-5 min-w-5 items-center justify-center rounded-md border border-border/70 bg-muted/55 px-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground shadow-[inset_0_-1px_0_0_hsl(var(--border))]",
        className
      )}
      {...props}
    />
  )
)
Kbd.displayName = "Kbd"

const KbdGroup = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
  ({ className, ...props }, ref) => (
    <span
      ref={ref}
      className={cn("inline-flex items-center gap-1", className)}
      {...props}
    />
  )
)
KbdGroup.displayName = "KbdGroup"

export { Kbd, KbdGroup }
