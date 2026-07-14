import type * as React from "react";

import type { TypeDataGridProps } from "../../types";
import { t } from "../../utils/helpers";

const DEFAULT_EMPTY_TEXT_KEY = "noRecords";
const DEFAULT_EMPTY_TEXT = "No records";

export function resolveEmptyText(
  emptyText: TypeDataGridProps["emptyText"],
  i18n: TypeDataGridProps["i18n"]
): React.ReactNode {
  const candidate =
    emptyText === undefined ? DEFAULT_EMPTY_TEXT_KEY : emptyText;
  const localized =
    typeof candidate === "string"
      ? t(
          i18n,
          candidate,
          candidate === DEFAULT_EMPTY_TEXT_KEY ? DEFAULT_EMPTY_TEXT : candidate
        )
      : candidate;
  const content = typeof localized === "function" ? localized() : localized;

  return content == null || content === false || content === ""
    ? null
    : content;
}
