import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { Check } from "lucide-react"

import { cn } from "../../lib/utils"
import { toThemeClassSuffix, useDatagridThemeName } from "../../theme/context"

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ checked, className, ...props }, ref) => {
  const themeName = useDatagridThemeName()
  const themeClassSuffix = toThemeClassSuffix(themeName)
  const stateClassName =
    checked === "indeterminate"
      ? "tdg-checkbox--indeterminate inovua-react-toolkit-checkbox--indeterminate"
      : checked
        ? "tdg-checkbox--checked inovua-react-toolkit-checkbox--checked"
        : ""

  return (
    <CheckboxPrimitive.Root
      ref={ref}
      checked={checked}
      data-theme={themeName}
      className={cn(
        "tdg-checkbox inovua-react-toolkit-checkbox grid h-4 w-4 shrink-0 place-content-center rounded-sm border shadow focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [background:var(--tdg-checkbox-bg)] [border-color:var(--tdg-checkbox-border-color)] [color:var(--tdg-checkbox-color)] data-[state=checked]:bg-[var(--tdg-checkbox-checked-bg)] data-[state=checked]:text-[var(--tdg-checkbox-checked-color)] data-[state=checked]:[border-color:var(--tdg-checkbox-checked-border-color)] data-[state=indeterminate]:bg-[var(--tdg-checkbox-indeterminate-bg)] data-[state=indeterminate]:text-[var(--tdg-checkbox-indeterminate-color)] data-[state=indeterminate]:[border-color:var(--tdg-checkbox-indeterminate-border-color)]",
        `tdg-checkbox--theme-${themeClassSuffix}`,
        `inovua-react-toolkit-checkbox--theme-${themeClassSuffix}`,
        stateClassName,
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="tdg-checkbox__icon-wrapper inovua-react-toolkit-checkbox__icon-wrapper grid place-content-center text-current">
        <Check className="h-4 w-4" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
})
Checkbox.displayName = CheckboxPrimitive.Root.displayName

export { Checkbox }
