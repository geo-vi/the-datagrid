import { clamp } from "../../utils/helpers";

type RtlScrollType = "negative" | "positive-ascending" | "positive-descending";
let cachedRtlScrollType: RtlScrollType | null = null;

export function getRtlScrollType(): RtlScrollType {
  if (cachedRtlScrollType) return cachedRtlScrollType;
  if (typeof document === "undefined" || !document.body) return "negative";

  const outer = document.createElement("div");
  const inner = document.createElement("div");
  Object.assign(outer.style, {
    width: "4px",
    height: "1px",
    overflow: "scroll",
    direction: "rtl",
    position: "absolute",
    top: "-10000px",
  });
  Object.assign(inner.style, { width: "8px", height: "1px" });
  outer.appendChild(inner);
  document.body.appendChild(outer);

  if (outer.scrollLeft > 0) {
    cachedRtlScrollType = "positive-descending";
  } else {
    outer.scrollLeft = 1;
    cachedRtlScrollType =
      outer.scrollLeft === 0 ? "negative" : "positive-ascending";
  }

  outer.remove();
  return cachedRtlScrollType;
}

export function getLogicalScrollLeft(
  element: HTMLElement,
  rtl: boolean
): number {
  const max = Math.max(0, element.scrollWidth - element.clientWidth);
  if (!rtl) return clamp(element.scrollLeft, 0, max);

  switch (getRtlScrollType()) {
    case "negative":
      return clamp(-element.scrollLeft, 0, max);
    case "positive-descending":
      return clamp(max - element.scrollLeft, 0, max);
    case "positive-ascending":
      return clamp(element.scrollLeft, 0, max);
  }
}

export function setLogicalScrollLeft(
  element: HTMLElement,
  value: number,
  rtl: boolean
): void {
  const max = Math.max(0, element.scrollWidth - element.clientWidth);
  const next = clamp(value, 0, max);
  if (!rtl) {
    element.scrollLeft = next;
    return;
  }

  switch (getRtlScrollType()) {
    case "negative":
      element.scrollLeft = -next;
      break;
    case "positive-descending":
      element.scrollLeft = max - next;
      break;
    case "positive-ascending":
      element.scrollLeft = next;
      break;
  }
}
