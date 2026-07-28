import * as React from "react"
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu"
import { CheckIcon, ChevronRightIcon, CircleIcon } from "lucide-react"

import { cn } from "../../lib/utils"
import { useLegacyStateClasses } from "../../lib/use-legacy-state-classes"
import {
  useDatagridPortalContainer,
  useDatagridThemeClassSuffix,
} from "../../theme/context"

function DropdownMenu({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Root>) {
  return <DropdownMenuPrimitive.Root data-slot="dropdown-menu" {...props} />
}

function DropdownMenuPortal({
  container,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Portal>) {
  const portalContainer = useDatagridPortalContainer()

  return (
    <DropdownMenuPrimitive.Portal
      data-slot="dropdown-menu-portal"
      {...props}
      container={container ?? portalContainer ?? undefined}
    />
  )
}

const DropdownMenuTrigger = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Trigger>
>(({ ...props }, ref) => (
  <DropdownMenuPrimitive.Trigger
    ref={ref}
    data-slot="dropdown-menu-trigger"
    {...props}
  />
))
DropdownMenuTrigger.displayName = DropdownMenuPrimitive.Trigger.displayName

const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => {
  const themeClassSuffix = useDatagridThemeClassSuffix()

  return (
    <DropdownMenuPortal>
      <DropdownMenuPrimitive.Content
        ref={ref}
        data-slot="dropdown-menu-content"
        sideOffset={sideOffset}
        className={cn(
          "z-50 max-h-(--radix-dropdown-menu-content-available-height) min-w-[8rem] origin-(--radix-dropdown-menu-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
          "tdg-dropdown-content",
          "inovua-react-toolkit-menu inovua-react-toolkit-menu--shadow inovua-react-toolkit-menu--depth-1",
          `inovua-react-toolkit-menu--theme-${themeClassSuffix}`,
          className
        )}
        {...props}
      />
    </DropdownMenuPortal>
  )
})
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName

function DropdownMenuGroup({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Group>) {
  return (
    <DropdownMenuPrimitive.Group data-slot="dropdown-menu-group" {...props} />
  )
}

function DropdownMenuItem({
  className,
  inset,
  variant = "default",
  disabled,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Item> & {
  inset?: boolean
  variant?: "default" | "destructive"
}) {
  const itemRef = React.useRef<React.ElementRef<typeof DropdownMenuPrimitive.Item>>(null)

  useLegacyStateClasses(itemRef, [
    { attribute: "data-highlighted", className: "inovua-react-toolkit-menu__row--over" },
    { attribute: "data-highlighted", className: "inovua-react-toolkit-menu__row--focused" },
    { attribute: "data-disabled", className: "inovua-react-toolkit-menu__row--disabled" },
  ])

  return (
    <DropdownMenuPrimitive.Item
      ref={itemRef}
      data-slot="dropdown-menu-item"
      data-inset={inset}
      data-variant={variant}
      className={cn(
        "relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset]:pl-8 data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/20 data-[variant=destructive]:focus:text-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground data-[variant=destructive]:*:[svg]:text-destructive!",
        "tdg-dropdown-item",
        "inovua-react-toolkit-menu__row",
        disabled ? "inovua-react-toolkit-menu__row--disabled" : "",
        className
      )}
      disabled={disabled}
      {...props}
    >
      <span className="tdg-dropdown-cell inovua-react-toolkit-menu__cell flex min-w-0 flex-1 items-center gap-2">
        {children}
      </span>
    </DropdownMenuPrimitive.Item>
  )
}

function DropdownMenuCheckboxItem({
  className,
  children,
  checked,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem>) {
  const itemRef = React.useRef<React.ElementRef<typeof DropdownMenuPrimitive.CheckboxItem>>(null)

  useLegacyStateClasses(itemRef, [
    { attribute: "data-highlighted", className: "inovua-react-toolkit-menu__row--over" },
    { attribute: "data-highlighted", className: "inovua-react-toolkit-menu__row--focused" },
    { attribute: "data-state", value: "checked", className: "inovua-react-toolkit-menu__row--checked" },
    { attribute: "data-disabled", className: "inovua-react-toolkit-menu__row--disabled" },
  ])

  return (
    <DropdownMenuPrimitive.CheckboxItem
      ref={itemRef}
      data-slot="dropdown-menu-checkbox-item"
      className={cn(
        "relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        "tdg-dropdown-item",
        "inovua-react-toolkit-menu__row",
        className
      )}
      checked={checked}
      {...props}
    >
      <span className="tdg-dropdown-cell tdg-dropdown-indicator-cell inovua-react-toolkit-menu__cell inovua-react-toolkit-menu__cell--icon pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <CheckIcon className="size-4" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      <span className="tdg-dropdown-cell inovua-react-toolkit-menu__cell flex min-w-0 flex-1 items-center gap-2">
        {children}
      </span>
    </DropdownMenuPrimitive.CheckboxItem>
  )
}

function DropdownMenuRadioGroup({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioGroup>) {
  return (
    <DropdownMenuPrimitive.RadioGroup
      data-slot="dropdown-menu-radio-group"
      {...props}
    />
  )
}

function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioItem>) {
  const itemRef = React.useRef<React.ElementRef<typeof DropdownMenuPrimitive.RadioItem>>(null)

  useLegacyStateClasses(itemRef, [
    { attribute: "data-highlighted", className: "inovua-react-toolkit-menu__row--over" },
    { attribute: "data-highlighted", className: "inovua-react-toolkit-menu__row--focused" },
    { attribute: "data-state", value: "checked", className: "inovua-react-toolkit-menu__row--checked" },
    { attribute: "data-disabled", className: "inovua-react-toolkit-menu__row--disabled" },
  ])

  return (
    <DropdownMenuPrimitive.RadioItem
      ref={itemRef}
      data-slot="dropdown-menu-radio-item"
      className={cn(
        "relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        "tdg-dropdown-item",
        "inovua-react-toolkit-menu__row",
        className
      )}
      {...props}
      >
      <span
        data-slot="dropdown-menu-radio-indicator-shell"
        className="tdg-dropdown-cell tdg-dropdown-indicator-cell tdg-dropdown-radio-shell pointer-events-none absolute top-1/2 left-2 flex size-4 -translate-y-1/2 items-center justify-center rounded-full border border-input bg-background text-primary shadow-xs"
      >
        <DropdownMenuPrimitive.ItemIndicator>
          <span
            data-slot="dropdown-menu-radio-indicator"
            className="tdg-dropdown-radio-indicator relative flex items-center justify-center"
          >
            <CircleIcon className="tdg-dropdown-radio-icon absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 fill-current text-current" />
          </span>
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      <span className="tdg-dropdown-cell inovua-react-toolkit-menu__cell flex min-w-0 flex-1 items-center gap-2">
        {children}
      </span>
    </DropdownMenuPrimitive.RadioItem>
  )
}

function DropdownMenuLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Label> & {
  inset?: boolean
}) {
  return (
    <DropdownMenuPrimitive.Label
      data-slot="dropdown-menu-label"
      data-inset={inset}
      className={cn(
        "tdg-dropdown-label",
        "px-2 py-1.5 text-sm font-medium data-[inset]:pl-8",
        className
      )}
      {...props}
    />
  )
}

function DropdownMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  return (
    <DropdownMenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      className={cn("tdg-dropdown-separator -mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  )
}

function DropdownMenuShortcut({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="dropdown-menu-shortcut"
      className={cn(
        "ml-auto text-xs tracking-widest text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

function DropdownMenuSub({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Sub>) {
  return <DropdownMenuPrimitive.Sub data-slot="dropdown-menu-sub" {...props} />
}

function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubTrigger> & {
  inset?: boolean
}) {
  return (
    <DropdownMenuPrimitive.SubTrigger
      data-slot="dropdown-menu-sub-trigger"
      data-inset={inset}
      className={cn(
        "tdg-dropdown-item tdg-dropdown-sub-trigger",
        "flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-[inset]:pl-8 data-[state=open]:bg-accent data-[state=open]:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground",
        className
      )}
      {...props}
    >
      {children}
      <ChevronRightIcon className="ml-auto size-4" />
    </DropdownMenuPrimitive.SubTrigger>
  )
}

function DropdownMenuSubContent({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubContent>) {
  const themeClassSuffix = useDatagridThemeClassSuffix()

  return (
    <DropdownMenuPrimitive.SubContent
      data-slot="dropdown-menu-sub-content"
      className={cn(
        "tdg-dropdown-content",
        "z-50 min-w-[8rem] origin-(--radix-dropdown-menu-content-transform-origin) overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
        "inovua-react-toolkit-menu inovua-react-toolkit-menu--shadow inovua-react-toolkit-menu--depth-2",
        `inovua-react-toolkit-menu--theme-${themeClassSuffix}`,
        className
      )}
      {...props}
    />
  )
}

export {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
}
