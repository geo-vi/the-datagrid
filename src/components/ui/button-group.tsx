import * as React from "react";

import { cn } from "../../lib/utils";

type ButtonGroupOrientation = "horizontal" | "vertical";

export interface ButtonGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: ButtonGroupOrientation;
}

const ButtonGroup = React.forwardRef<HTMLDivElement, ButtonGroupProps>(
  ({ className, orientation = "horizontal", role = "group", ...props }, ref) => (
    <div
      ref={ref}
      role={role}
      data-slot="button-group"
      data-orientation={orientation}
      className={cn("tdg-button-group", className)}
      {...props}
    />
  )
);

ButtonGroup.displayName = "ButtonGroup";

export interface ButtonGroupSeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: ButtonGroupOrientation;
}

const ButtonGroupSeparator = React.forwardRef<HTMLDivElement, ButtonGroupSeparatorProps>(
  ({ className, orientation = "vertical", ...props }, ref) => (
    <div
      ref={ref}
      role="presentation"
      aria-hidden="true"
      data-slot="button-group-separator"
      data-orientation={orientation}
      className={cn("tdg-button-group-separator", className)}
      {...props}
    />
  )
);

ButtonGroupSeparator.displayName = "ButtonGroupSeparator";

const ButtonGroupText = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
  ({ className, ...props }, ref) => (
    <span ref={ref} data-slot="button-group-text" className={cn("tdg-button-group-text", className)} {...props} />
  )
);

ButtonGroupText.displayName = "ButtonGroupText";

export { ButtonGroup, ButtonGroupSeparator, ButtonGroupText };
