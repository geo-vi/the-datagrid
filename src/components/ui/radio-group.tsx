import * as React from "react"
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group"
import { CircleIcon } from "lucide-react"

import { cn } from "../../lib/utils"
import { useDatagridThemeClassSuffix } from "../../theme/context"

function RadioGroup({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
  const themeClassSuffix = useDatagridThemeClassSuffix()

  return (
    <RadioGroupPrimitive.Root
      data-slot="radio-group"
      className={cn(
        "tdg-radio-group grid gap-3 inovua-react-toolkit-radio-button-group",
        `inovua-react-toolkit-radio-button-group--theme-${themeClassSuffix}`,
        className
      )}
      {...props}
    />
  )
}

function RadioGroupItem({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item>) {
  const themeClassSuffix = useDatagridThemeClassSuffix()

  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-group-item"
      className={cn(
        "tdg-radio-item aspect-square size-4 shrink-0 rounded-full border border-input bg-background text-primary shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20",
        "inovua-react-toolkit-radio-button",
        `inovua-react-toolkit-radio-button--theme-${themeClassSuffix}`,
        className
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator
        data-slot="radio-group-indicator"
        className="tdg-radio-indicator-shell inovua-react-toolkit-radio-button__icon-wrapper relative flex items-center justify-center"
      >
        <CircleIcon className="tdg-radio-indicator-icon absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 fill-primary" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  )
}

export { RadioGroup, RadioGroupItem }
