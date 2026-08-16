"use client";

import * as React from "react";

/**
 * Inline glyphs for the built-in toolbar actions.
 *
 * The icon library the examples use is a dev dependency, and the optional
 * toolbar entry may only depend on the core runtime, so these are drawn here in
 * the same 24-unit, 2-stroke idiom the rest of the UI uses. They are decorative:
 * every button keeps a text label, so each icon is aria-hidden.
 */
type ToolbarIconProps = {
  className?: string;
};

function ToolbarIcon(
  props: ToolbarIconProps & { children: React.ReactNode }
): React.ReactElement {
  const { children, className } = props;

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

/** Arrow into a tray: download. */
export function ExportIcon(props: ToolbarIconProps): React.ReactElement {
  return (
    <ToolbarIcon className={props.className}>
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M4 21h16" />
    </ToolbarIcon>
  );
}

/** Funnel: the filter row is hidden and can be shown. */
export function FilterIcon(props: ToolbarIconProps): React.ReactElement {
  return (
    <ToolbarIcon className={props.className}>
      <path d="M3 4h18l-7 8v8l-4-2v-6z" />
    </ToolbarIcon>
  );
}

/** Funnel with a cross: the filter row is visible and can be hidden. */
export function FilterOffIcon(props: ToolbarIconProps): React.ReactElement {
  return (
    <ToolbarIcon className={props.className}>
      <path d="M3 4h18l-7 8v8l-4-2v-6z" />
      <path d="m16 16 5 5" />
      <path d="m21 16-5 5" />
    </ToolbarIcon>
  );
}

/** Counter-clockwise arrow: reset the filter values. */
export function ResetIcon(props: ToolbarIconProps): React.ReactElement {
  return (
    <ToolbarIcon className={props.className}>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
    </ToolbarIcon>
  );
}
