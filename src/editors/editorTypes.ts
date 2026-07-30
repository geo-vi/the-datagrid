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
  className?: string;
  style?: React.CSSProperties;
  cell?: TypeColumnEditorCell;
  cellProps?: CellProps;
  editorProps?: React.InputHTMLAttributes<HTMLInputElement>;
};
