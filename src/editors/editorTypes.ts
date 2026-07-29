import type * as React from "react";

export type TypeCommunityEditorProps<T> = {
  value?: T;
  onChange?: (value: T, event?: React.SyntheticEvent) => void;
  onComplete?: (value: T, event?: React.SyntheticEvent) => void;
  onCancel?: (event?: React.SyntheticEvent) => void;
  onTabNavigation?: (
    direction: -1 | 1,
    event?: React.KeyboardEvent<HTMLInputElement>
  ) => void;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
  autoFocus?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  rtl?: boolean;
  theme?: string;
  className?: string;
  style?: React.CSSProperties;
  cell?: unknown;
  cellProps?: unknown;
  editorProps?: React.InputHTMLAttributes<HTMLInputElement>;
};
