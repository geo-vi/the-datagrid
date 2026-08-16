import * as React from "react";

import type { TypeDataGridProps } from "./types";

export const RDG_SEARCH_TARGET_COMPONENT_MARKER = Symbol.for(
  "@geovi/the-datagrid/search-target-component"
);

export const RDG_TOOLBAR_TARGET_COMPONENT_MARKER = Symbol.for(
  "@geovi/the-datagrid/toolbar-target-component"
);

function hasMarker(type: unknown, marker: symbol): boolean {
  if ((typeof type !== "function" && typeof type !== "object") || !type) {
    return false;
  }

  return (type as Record<PropertyKey, unknown>)[marker] === true;
}

export function isOptionalTargetType(type: unknown): boolean {
  return (
    hasMarker(type, RDG_SEARCH_TARGET_COMPONENT_MARKER) ||
    hasMarker(type, RDG_TOOLBAR_TARGET_COMPONENT_MARKER)
  );
}

export function findTargetGridElement(
  element: React.ReactElement<unknown>,
  isGridType: (type: unknown) => boolean
): React.ReactElement<TypeDataGridProps> | null {
  let current: React.ReactElement<unknown> = element;
  const visited = new Set<React.ReactElement<unknown>>();

  while (!visited.has(current)) {
    visited.add(current);

    if (isGridType(current.type)) {
      return current as React.ReactElement<TypeDataGridProps>;
    }
    if (!isOptionalTargetType(current.type)) return null;

    const nested = (current.props as { children?: React.ReactNode }).children;
    if (!React.isValidElement(nested)) return null;
    current = nested;
  }

  return null;
}

export function markOptionalTargetType(type: unknown, marker: symbol): void {
  if ((typeof type !== "function" && typeof type !== "object") || !type) {
    return;
  }

  Object.defineProperty(type, marker, { value: true });
}
