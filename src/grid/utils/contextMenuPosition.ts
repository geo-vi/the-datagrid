import type { TypeContextMenuConstrainTo } from "../../types";

function isHTMLElement(value: unknown): value is HTMLElement {
  return typeof HTMLElement !== "undefined" && value instanceof HTMLElement;
}

export function resolveContextMenuBoundary(
  constrainTo: TypeContextMenuConstrainTo | undefined
): Element | null | undefined {
  if (constrainTo === false) return null;
  if (isHTMLElement(constrainTo)) return constrainTo;
  if (typeof constrainTo === "string") {
    if (typeof document === "undefined") return undefined;
    return document.querySelector(constrainTo);
  }
  if (typeof constrainTo === "function") {
    return constrainTo() ?? undefined;
  }
  return undefined;
}

export function resolveContextMenuPlacement(alignPositions?: string[]): {
  side: "top" | "right" | "bottom" | "left";
  align: "start" | "center" | "end";
} {
  const placement = alignPositions?.[0]?.toLowerCase() ?? "tl-bl";
  const [source = "tl", target = "bl"] = placement.split("-");
  const sourceVertical = source[0];
  const sourceHorizontal = source[1];
  const targetVertical = target[0];
  const targetHorizontal = target[1];

  if (sourceHorizontal === "l" && targetHorizontal === "r") {
    return {
      side: "right",
      align:
        targetVertical === "b"
          ? "end"
          : targetVertical === "c"
            ? "center"
            : "start",
    };
  }
  if (sourceHorizontal === "r" && targetHorizontal === "l") {
    return {
      side: "left",
      align:
        targetVertical === "b"
          ? "end"
          : targetVertical === "c"
            ? "center"
            : "start",
    };
  }

  return {
    side: sourceVertical === "b" && targetVertical === "t" ? "top" : "bottom",
    align:
      targetHorizontal === "r"
        ? "end"
        : targetHorizontal === "c"
          ? "center"
          : "start",
  };
}

export function focusFirstContextMenuItem(
  content: HTMLElement | null
): boolean {
  if (!content) return false;
  const selector =
    '[role^="menuitem"]:not([aria-disabled="true"]):not([data-disabled])';
  const target = content.matches(selector)
    ? content
    : content.querySelector<HTMLElement>(selector);
  if (!target) return false;

  target.focus({ preventScroll: true });
  return true;
}
