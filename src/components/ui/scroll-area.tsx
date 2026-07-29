import * as React from "react";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";

import { cn } from "../../lib/utils";

type ScrollAreaProps = React.ComponentPropsWithoutRef<
  typeof ScrollAreaPrimitive.Root
> & {
  viewportClassName?: string;
  viewportStyle?: React.CSSProperties;
  viewportRef?: React.Ref<HTMLDivElement>;
  viewportProps?: React.HTMLAttributes<HTMLDivElement>;
  nativeScroll?: boolean;
  scrollProps?: {
    autoHide?: boolean;
    scrollThumbMargin?: number;
    scrollThumbWidth?: number;
    scrollThumbOverWidth?: number;
    scrollTrackStyle?: React.CSSProperties;
    scrollThumbStyle?: React.CSSProperties;
    scrollThumbRadius?: number | string;
  };
};

const ScrollArea = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Root>,
  ScrollAreaProps
>(
  (
    {
      className,
      children,
      viewportClassName,
      viewportStyle,
      viewportRef,
      viewportProps,
      nativeScroll = false,
      scrollProps,
      type,
      ...props
    },
    forwardedRef
  ) => {
    const viewport = (
      <div
        {...viewportProps}
        ref={viewportRef}
        data-slot="scroll-area-viewport"
        style={{
          ...viewportStyle,
          ...(nativeScroll ? { overflow: "auto" } : undefined),
        }}
        className={cn(
          "size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1",
          viewportClassName,
          viewportProps?.className
        )}
      >
        {children}
      </div>
    );

    if (nativeScroll) {
      return (
        <div
          ref={forwardedRef as React.Ref<HTMLDivElement>}
          data-slot="scroll-area"
          className={cn("relative overflow-hidden", className)}
          {...(props as React.HTMLAttributes<HTMLDivElement>)}
        >
          {viewport}
        </div>
      );
    }

    const scrollbarThickness = scrollProps?.scrollThumbWidth;
    const scrollbarOverThickness =
      scrollProps?.scrollThumbOverWidth ?? scrollbarThickness;
    const thumbStyle: React.CSSProperties = {
      borderRadius: scrollProps?.scrollThumbRadius,
      "--tdg-scroll-thumb-width":
        scrollbarThickness == null ? undefined : `${scrollbarThickness}px`,
      "--tdg-scroll-thumb-over-width":
        scrollbarOverThickness == null
          ? undefined
          : `${scrollbarOverThickness}px`,
      ...scrollProps?.scrollThumbStyle,
    } as React.CSSProperties;
    const trackStyle: React.CSSProperties = {
      margin: scrollProps?.scrollThumbMargin,
      ...scrollProps?.scrollTrackStyle,
    };

    return (
      <ScrollAreaPrimitive.Root
        ref={forwardedRef}
        data-slot="scroll-area"
        type={
          type ??
          (scrollProps?.autoHide === false
            ? "always"
            : scrollProps?.autoHide === true
              ? "hover"
              : "hover")
        }
        className={cn("relative overflow-hidden", className)}
        {...props}
      >
        <ScrollAreaPrimitive.Viewport
          {...viewportProps}
          ref={viewportRef}
          data-slot="scroll-area-viewport"
          style={viewportStyle}
          className={cn(
            "size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1",
            viewportClassName,
            viewportProps?.className
          )}
        >
          {children}
        </ScrollAreaPrimitive.Viewport>
        <ScrollBar
          style={{
            ...trackStyle,
            width: scrollbarOverThickness,
          }}
          thumbStyle={thumbStyle}
        />
        <ScrollBar
          orientation="horizontal"
          style={{
            ...trackStyle,
            height: scrollbarOverThickness,
          }}
          thumbStyle={thumbStyle}
        />
        <ScrollAreaPrimitive.Corner
          data-slot="scroll-area-corner"
          className="bg-transparent"
        />
      </ScrollAreaPrimitive.Root>
    );
  }
);
ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName;

function ScrollBar({
  className,
  orientation = "vertical",
  thumbStyle,
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.ScrollAreaScrollbar> & {
  thumbStyle?: React.CSSProperties;
}) {
  return (
    <ScrollAreaPrimitive.ScrollAreaScrollbar
      data-slot="scroll-area-scrollbar"
      orientation={orientation}
      className={cn(
        "group z-30 flex touch-none transition-colors select-none data-[state=hidden]:hidden",
        orientation === "vertical" &&
          "w-2.5 flex-col items-center justify-center border-l border-l-transparent",
        orientation === "horizontal" &&
          "h-2.5 flex-row items-center justify-center border-t border-t-transparent",
        className
      )}
      {...props}
    >
      <ScrollAreaPrimitive.ScrollAreaThumb
        data-slot="scroll-area-thumb"
        className={cn(
          "relative flex-1 rounded-full bg-[var(--tdg-color-ring)] transition-[width,height,background-color] hover:bg-[var(--tdg-color-muted-foreground)]",
          orientation === "vertical" &&
            "group-hover:!w-[var(--tdg-scroll-thumb-over-width)]",
          orientation === "horizontal" &&
            "group-hover:!h-[var(--tdg-scroll-thumb-over-width)]"
        )}
        style={{
          ...thumbStyle,
          ...(orientation === "vertical"
            ? { width: "var(--tdg-scroll-thumb-width)" }
            : { height: "var(--tdg-scroll-thumb-width)" }),
        }}
      />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
  );
}

export { ScrollArea, ScrollBar };
