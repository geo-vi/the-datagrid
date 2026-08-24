"use client";

import * as React from "react";

import type {
  TypeContextMenuConstrainTo,
  TypeContextMenuPoint,
} from "../../types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import {
  focusFirstContextMenuItem,
  resolveContextMenuBoundary,
  resolveContextMenuPlacement,
} from "../utils/contextMenuPosition";

type GridContextMenuLayerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alignTo: HTMLElement | TypeContextMenuPoint | null;
  alignPositions?: string[];
  constrainTo?: TypeContextMenuConstrainTo;
  position?: string;
  updatePositionOnScroll?: boolean;
  positionRevision?: unknown;
  restoreFocusTo?: HTMLElement | null;
  ariaLabel: string;
  testId: string;
  rtl?: boolean;
  children: React.ReactNode;
};

function isHTMLElement(value: unknown): value is HTMLElement {
  return typeof HTMLElement !== "undefined" && value instanceof HTMLElement;
}

function resolvePoint(
  alignTo: GridContextMenuLayerProps["alignTo"]
): TypeContextMenuPoint {
  if (isHTMLElement(alignTo) && alignTo.isConnected) {
    const rect = alignTo.getBoundingClientRect();
    return { left: rect.left, top: rect.bottom };
  }

  if (
    alignTo &&
    typeof alignTo === "object" &&
    Number.isFinite((alignTo as TypeContextMenuPoint).left) &&
    Number.isFinite((alignTo as TypeContextMenuPoint).top)
  ) {
    const point = alignTo as TypeContextMenuPoint;
    return { left: point.left, top: point.top };
  }

  return { left: 0, top: 0 };
}

/**
 * Shared Radix/shadcn menu shell for header and row context menus.
 *
 * The invisible positioned trigger lets pointer coordinates and imperative API
 * coordinates use the same collision-aware positioning implementation as
 * toolbar-triggered menus.
 */
export function GridContextMenuLayer({
  open,
  onOpenChange,
  alignTo,
  alignPositions,
  constrainTo,
  position = "absolute",
  updatePositionOnScroll = true,
  positionRevision,
  restoreFocusTo,
  ariaLabel,
  testId,
  rtl = false,
  children,
}: GridContextMenuLayerProps): React.ReactElement {
  const [point, setPoint] = React.useState(() => resolvePoint(alignTo));
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const restoreFocusRef = React.useRef<HTMLElement | null>(
    restoreFocusTo ?? null
  );
  const fallbackFocusRef = React.useRef<HTMLElement | null>(null);

  const updatePoint = React.useCallback(() => {
    setPoint(resolvePoint(alignTo));
  }, [alignTo]);

  React.useLayoutEffect(() => {
    if (!open || !restoreFocusTo) return;
    restoreFocusRef.current = restoreFocusTo;
    fallbackFocusRef.current =
      restoreFocusTo
        .closest<HTMLElement>(".tdg-root")
        ?.querySelector<HTMLElement>('[data-slot="grid-surface"]') ?? null;
  }, [open, restoreFocusTo]);

  React.useLayoutEffect(() => {
    if (open) updatePoint();
  }, [open, positionRevision, updatePoint]);

  React.useEffect(() => {
    if (!open || !updatePositionOnScroll) return;

    const handlePositionChange = () => updatePoint();
    window.addEventListener("scroll", handlePositionChange, true);
    window.addEventListener("resize", handlePositionChange);

    const observedElement = isHTMLElement(alignTo) ? alignTo : null;
    const observer =
      typeof ResizeObserver === "undefined" || !observedElement
        ? null
        : new ResizeObserver(handlePositionChange);
    if (observer && observedElement) observer.observe(observedElement);

    return () => {
      window.removeEventListener("scroll", handlePositionChange, true);
      window.removeEventListener("resize", handlePositionChange);
      observer?.disconnect();
    };
  }, [alignTo, open, updatePoint, updatePositionOnScroll]);

  React.useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      focusFirstContextMenuItem(contentRef.current);
    });
    return () => cancelAnimationFrame(frame);
  }, [open]);

  const resolvedPlacement = resolveContextMenuPlacement(alignPositions);
  const placement = {
    ...resolvedPlacement,
    align:
      rtl && resolvedPlacement.align !== "center"
        ? resolvedPlacement.align === "start"
          ? ("end" as const)
          : ("start" as const)
        : resolvedPlacement.align,
  };
  const collisionBoundary = open
    ? resolveContextMenuBoundary(constrainTo)
    : undefined;
  const positionMode = position === "fixed" ? "fixed" : "absolute";
  const frame =
    (isHTMLElement(alignTo)
      ? alignTo.closest<HTMLElement>('[data-slot="grid-frame"]')
      : null) ??
    restoreFocusTo?.closest<HTMLElement>('[data-slot="grid-frame"]') ??
    null;
  const frameRect =
    positionMode === "absolute" ? frame?.getBoundingClientRect() : null;
  const positionedPoint = frameRect
    ? {
        left: point.left - frameRect.left,
        top: point.top - frameRect.top,
      }
    : point;

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange} modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-hidden="true"
          tabIndex={-1}
          data-testid={`${testId}-anchor`}
          className="pointer-events-none z-50 size-px border-0 bg-transparent p-0 opacity-0"
          style={{
            position: positionMode,
            left: positionedPoint.left,
            top: positionedPoint.top,
          }}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        ref={contentRef}
        data-testid={testId}
        side={placement.side}
        align={placement.align}
        collisionBoundary={collisionBoundary}
        avoidCollisions={constrainTo !== false}
        /*
         * `max-h-80` alone would replace the menu's own available-height cap,
         * since both are `max-h-*` and the later one wins the class merge -
         * leaving the menu free to run past the edge of the window it was
         * measured against. Keeping the smaller of the two caps holds the
         * compact height without ever outgrowing the room reported for it.
         */
        className="max-h-[min(20rem,var(--radix-dropdown-menu-content-available-height))] w-56 overflow-y-auto"
        aria-label={ariaLabel}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          const focusTarget = restoreFocusRef.current;
          if (focusTarget?.isConnected) {
            focusTarget.focus({ preventScroll: true });
          } else if (fallbackFocusRef.current?.isConnected) {
            fallbackFocusRef.current.focus({ preventScroll: true });
          }
        }}
      >
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
