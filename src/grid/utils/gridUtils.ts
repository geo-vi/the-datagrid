import type { TypeColumn, TypeRowSelection } from "../../types";

export function isPlainObject(v: unknown): v is Record<string, any> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function toSelectionMap(sel: TypeRowSelection): Record<string, any> {
  if (sel == null) return {};
  if (isPlainObject(sel)) return sel as Record<string, any>;
  return { [String(sel)]: true };
}

export function stripFromOrder(order: string[], id: string): string[] {
  return order.filter((x) => x !== id);
}

export function injectIntoOrder(order: string[] | undefined, id: string): string[] | undefined {
  if (!order) return order;
  if (order.includes(id)) return order;
  return [id, ...order];
}

export function isInteractiveClickTarget(target: HTMLElement | null): boolean {
  if (!target) return false;
  const el = target.closest(
    [
      "button",
      "a",
      "input",
      "select",
      "textarea",
      "[role='button']",
      "[data-rdg-stop-selection]",
      "[data-no-row-select]",
    ].join(","),
  );
  return Boolean(el);
}

export function isColumnVisible(c: TypeColumn): boolean {
  if (c.visible === false) return false;
  if (c.visible === true) return true;

  if ((c as any).defaultVisible === false) return false;
  if ((c as any).defaultHidden === true) return false;

  return true;
}

export function normalizeEditorOutput(next: unknown): unknown {
  if (next && typeof next === "object" && "value" in (next as any)) return (next as any).value;
  return next;
}

export function humanizeOperatorName(name: string): string {
  const spaced = name
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim();
  return spaced.length ? spaced.charAt(0).toUpperCase() + spaced.slice(1) : name;
}

export function isEmptyLikeUI(v: unknown): boolean {
  if (v == null) return true;
  if (typeof v === "string") return v.trim().length === 0;

  if (Array.isArray(v)) {
    if (v.length === 0) return true;
    if (v.length === 2) return isEmptyLikeUI(v[0]) && isEmptyLikeUI(v[1]);
    return false;
  }

  if (isPlainObject(v) && ("start" in v || "end" in v)) {
    return isEmptyLikeUI((v as any).start) && isEmptyLikeUI((v as any).end);
  }

  return false;
}
