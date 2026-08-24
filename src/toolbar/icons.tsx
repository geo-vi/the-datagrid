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
  "data-icon"?: "inline-start" | "inline-end";
};

function ToolbarIcon(
  props: ToolbarIconProps & { children: React.ReactNode }
): React.ReactElement {
  const { children, ...svgProps } = props;

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      {...svgProps}
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
    <ToolbarIcon {...props}>
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M4 21h16" />
    </ToolbarIcon>
  );
}

/** Funnel: the filter row is hidden and can be shown. */
export function FilterIcon(props: ToolbarIconProps): React.ReactElement {
  return (
    <ToolbarIcon {...props}>
      <path d="M3 4h18l-7 8v8l-4-2v-6z" />
    </ToolbarIcon>
  );
}

/** Funnel with a cross: the filter row is visible and can be hidden. */
export function FilterOffIcon(props: ToolbarIconProps): React.ReactElement {
  return (
    <ToolbarIcon {...props}>
      <path d="M3 4h18l-7 8v8l-4-2v-6z" />
      <path d="m16 16 5 5" />
      <path d="m21 16-5 5" />
    </ToolbarIcon>
  );
}

/** Counter-clockwise arrow: reset the filter values. */
export function ResetIcon(props: ToolbarIconProps): React.ReactElement {
  return (
    <ToolbarIcon {...props}>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
    </ToolbarIcon>
  );
}

/** Sliders: the compact toolbar can reveal its column and filter controls. */
export function ToolbarSettingsIcon(
  props: ToolbarIconProps
): React.ReactElement {
  return (
    <ToolbarIcon {...props}>
      <path d="M4 7h10" />
      <path d="M18 7h2" />
      <path d="M14 5v4" />
      <path d="M4 17h2" />
      <path d="M10 17h10" />
      <path d="M10 15v4" />
    </ToolbarIcon>
  );
}

/** Three vertical panels: opens the compact column visibility menu. */
export function ColumnsIcon(props: ToolbarIconProps): React.ReactElement {
  return (
    <ToolbarIcon {...props}>
      <rect x="3" y="5" width="18" height="14" rx="1" />
      <path d="M9 5v14" />
      <path d="M15 5v14" />
    </ToolbarIcon>
  );
}

/** Down chevron: rotates while the compact toolbar panel is expanded. */
export function ChevronDownIcon(props: ToolbarIconProps): React.ReactElement {
  return (
    <ToolbarIcon {...props}>
      <path d="m6 9 6 6 6-6" />
    </ToolbarIcon>
  );
}
