"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type { TypeDataGridProps } from "../../types";
import { Button } from "../../components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { t } from "../../utils/helpers";

export type MobileGridPaginationProps = {
  pageIndex: number;
  pageCount: number;
  pageSize: number;
  pageSizes: number[];
  rangeStart: number;
  rangeEnd: number;
  total: number;
  i18n: TypeDataGridProps["i18n"];
  onPageIndexChange: (pageIndex: number) => void;
  onPageSizeChange: (pageSize: number) => void;
};

/** Replaces {@link GridPagination}, which hides half of itself below `md`. */
export function MobileGridPagination({
  pageIndex,
  pageCount,
  pageSize,
  pageSizes,
  rangeStart,
  rangeEnd,
  total,
  i18n,
  onPageIndexChange,
  onPageSizeChange,
}: MobileGridPaginationProps): React.ReactElement {
  const label = (key: string, fallback: string) => {
    const value = t(i18n, key, fallback);
    return typeof value === "string" ? value : fallback;
  };
  const previousLabel = label("mobilePreviousPage", "Previous page");
  const nextLabel = label("mobileNextPage", "Next page");

  return (
    <nav
      className="tdg-mobile-pagination grid grid-cols-[1fr_auto_1fr] items-center gap-2"
      data-slot="mobile-pagination"
      aria-label={label("mobilePagination", "Pagination")}
    >
      <div className="tdg-mobile-pagination__summary min-w-0 truncate text-xs tabular-nums text-muted-foreground">
        <span className="font-medium text-foreground">
          {total === 0 ? 0 : rangeStart + 1}–{rangeEnd}
        </span>{" "}
        {label("ofText", "of")} {total}
      </div>

      <div className="tdg-mobile-pagination__nav flex items-center justify-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="tdg-mobile-pagination__button size-9 shrink-0"
          disabled={pageIndex <= 0}
          aria-label={previousLabel}
          title={previousLabel}
          onClick={() => onPageIndexChange(pageIndex - 1)}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="tdg-mobile-pagination__page min-w-[4.5rem] text-center text-xs whitespace-nowrap tabular-nums text-muted-foreground">
          {pageIndex + 1} / {pageCount}
        </span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="tdg-mobile-pagination__button size-9 shrink-0"
          disabled={pageIndex >= pageCount - 1}
          aria-label={nextLabel}
          title={nextLabel}
          onClick={() => onPageIndexChange(pageIndex + 1)}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <div className="flex min-w-0 justify-end">
        {pageSizes.length > 1 ? (
          <Select
            value={`${pageSize}`}
            onValueChange={(value) => onPageSizeChange(Number(value))}
          >
            <SelectTrigger
              className="tdg-mobile-pagination__size h-9 w-[4.75rem] shrink-0"
              aria-label={label("perPageText", "Rows")}
            >
              <SelectValue placeholder={`${pageSize}`} />
            </SelectTrigger>
            <SelectContent>
              {pageSizes.map((size) => (
                <SelectItem key={size} value={`${size}`}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
      </div>
    </nav>
  );
}
