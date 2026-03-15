import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../../lib/utils"
import { useDatagridThemeClassSuffix } from "../../theme/context"

const buttonVariants = cva(
  "inline-flex appearance-none items-center justify-center gap-2 whitespace-nowrap rounded-md border-0 bg-transparent text-sm font-medium align-middle transition-colors select-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:cursor-default disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-transparent hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

function isSrOnlyElement(node: React.ReactNode): boolean {
  if (!React.isValidElement<{ className?: string }>(node)) return false

  const className = node.props.className
  return typeof className === "string" && className.split(/\s+/).includes("sr-only")
}

function isTextContentNode(node: React.ReactNode): boolean {
  if (typeof node === "string" || typeof node === "number") return true
  if (!React.isValidElement<{ children?: React.ReactNode }>(node)) return false
  if (isSrOnlyElement(node)) return true

  const children = React.Children.toArray(node.props.children)
  return children.length > 0 && children.every(isTextContentNode)
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      children,
      dir,
      disabled,
      onBlur,
      onFocus,
      onMouseDown,
      onMouseEnter,
      onMouseLeave,
      onMouseUp,
      type,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button"
    const themeClassSuffix = useDatagridThemeClassSuffix()
    const [focused, setFocused] = React.useState(false)
    const [over, setOver] = React.useState(false)
    const [active, setActive] = React.useState(false)
    const direction = dir === "rtl" ? "rtl" : "ltr"

    const childArray = React.Children.toArray(children)
    const srOnlyChildren = childArray.filter(isSrOnlyElement)
    const visibleChildren = childArray.filter((child) => !isSrOnlyElement(child))

    const iconOnly =
      size === "icon" ||
      (visibleChildren.length === 1 && !isTextContentNode(visibleChildren[0]))
    const leadingIconWithText =
      !iconOnly &&
      visibleChildren.length > 1 &&
      !isTextContentNode(visibleChildren[0]) &&
      visibleChildren.slice(1).every(isTextContentNode)

    const hasIcon = iconOnly || leadingIconWithText
    const hasVisibleText = !iconOnly && visibleChildren.some(isTextContentNode)

    let content = children

    if (!asChild) {
      if (iconOnly) {
        content = (
          <>
            {visibleChildren.length > 0 ? (
              <span className="inovua-react-toolkit-button__icon-wrap flex items-center justify-center">
                {visibleChildren}
              </span>
            ) : null}
            {srOnlyChildren.length > 0 ? (
              <span className="inovua-react-toolkit-button__text sr-only">
                {srOnlyChildren}
              </span>
            ) : null}
          </>
        )
      } else if (leadingIconWithText) {
        content = (
          <>
            <span className="inovua-react-toolkit-button__icon-wrap flex items-center justify-center">
              {visibleChildren[0]}
            </span>
            <span className="inovua-react-toolkit-button__text min-w-0 flex-1">
              {visibleChildren.slice(1)}
            </span>
            {srOnlyChildren.length > 0 ? (
              <span className="inovua-react-toolkit-button__text sr-only">
                {srOnlyChildren}
              </span>
            ) : null}
          </>
        )
      } else {
        content = (
          <span className="inovua-react-toolkit-button__text min-w-0 flex-1">
            {children}
          </span>
        )
      }
    }

    return (
      <Comp
        className={cn(
          buttonVariants({ variant, size }),
          "tdg-button",
          "inovua-react-toolkit-button inovua-react-toolkit-button--align-center inovua-react-toolkit-button--vertical-align-middle",
          `inovua-react-toolkit-button--theme-${themeClassSuffix}`,
          direction === "rtl"
            ? "inovua-react-toolkit-button--rtl"
            : "inovua-react-toolkit-button--ltr",
          disabled ? "inovua-react-toolkit-button--disabled" : "",
          focused ? "inovua-react-toolkit-button--focused" : "",
          over ? "inovua-react-toolkit-button--over" : "",
          active ? "inovua-react-toolkit-button--active" : "",
          hasIcon ? "inovua-react-toolkit-button--has-icon inovua-react-toolkit-button--icon-first" : "",
          !hasVisibleText ? "inovua-react-toolkit-button--no-children" : "",
          className
        )}
        ref={ref}
        data-slot="button"
        data-variant={variant ?? "default"}
        data-size={size ?? "default"}
        dir={dir}
        disabled={disabled}
        type={!asChild ? (type ?? "button") : undefined}
        onFocus={(event) => {
          setFocused(true)
          onFocus?.(event)
        }}
        onBlur={(event) => {
          setFocused(false)
          setActive(false)
          onBlur?.(event)
        }}
        onMouseEnter={(event) => {
          setOver(true)
          onMouseEnter?.(event)
        }}
        onMouseLeave={(event) => {
          setOver(false)
          setActive(false)
          onMouseLeave?.(event)
        }}
        onMouseDown={(event) => {
          setActive(true)
          onMouseDown?.(event)
        }}
        onMouseUp={(event) => {
          setActive(false)
          onMouseUp?.(event)
        }}
        {...props}
      >
        {content}
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
