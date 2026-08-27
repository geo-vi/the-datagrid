import type * as React from "react";
import type { CellProps, TypeColumnEditorCell } from "../types";

export type TypeCommunityEditorProps<T> = {
  value?: T;
  onChange?: (value: T, event?: React.SyntheticEvent) => void;
  onComplete?: (value: T, event?: React.SyntheticEvent) => void;
  onCancel?: (event?: React.SyntheticEvent) => void;
  onTabNavigation?: (
    complete?: boolean,
    direction?: -1 | 0 | 1,
    event?: React.KeyboardEvent<HTMLElement>
  ) => void;
  onKeyDown?: React.KeyboardEventHandler<HTMLElement>;
  autoFocus?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  rtl?: boolean;
  theme?: string;
  /**
   * Renders the editor as a full-cell overlay instead of a bordered control
   * inside the cell padding, matching the grid's built-in editor.
   */
  seamless?: boolean;
  className?: string;
  style?: React.CSSProperties;
  cell?: TypeColumnEditorCell;
  cellProps?: CellProps;
  editorProps?: React.InputHTMLAttributes<HTMLInputElement>;
};

/**
 * Opts an editor into the grid's full-cell surface. `CellEditorSurfaceSync`
 * looks for this class to mark the cell, and `runtime.css` positions the
 * element over it.
 */
export const SEAMLESS_EDITOR_CLASS = "InovuaReactDataGrid__cell__editor";

/**
 * The bordered alternative. Also taken out of flow, so mounting an editor
 * cannot change the height of the row it opens in.
 */
export const SHELL_EDITOR_CLASS = "tdg-cell-editor-shell";

export function editorSurfaceClass(seamless?: boolean): string {
  return seamless ? SEAMLESS_EDITOR_CLASS : SHELL_EDITOR_CLASS;
}

/**
 * `column.editorProps` arrives both as top-level props and as the nested
 * object, so it still carries the editor's own config. Drop those keys before
 * spreading the rest onto a DOM node, or React warns about unknown attributes.
 */
export function toDomEditorProps(
  editorProps: object | null | undefined,
  ownKeys: readonly string[] = []
): Record<string, unknown> {
  if (!editorProps) return {};

  const domProps: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(editorProps)) {
    if (key === "seamless" || ownKeys.includes(key)) continue;
    domProps[key] = value;
  }
  return domProps;
}
