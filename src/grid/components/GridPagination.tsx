"use client";

import * as React from "react";

import type { TypeI18n } from "../../types";
import { t } from "../../utils/helpers";

import { Button } from "../../components/ui/button";
import { Label } from "../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import {
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
} from "@tabler/icons-react";

export type GridPaginationProps = {
  count: number;
  skip: number;
  limit: number;

  pageIndex: number;
  pageCount: number;

  canPrev: boolean;
  canNext: boolean;

  pageSizes: number[];

  setSkip: (n: number) => void;
  setLimit: (n: number) => void;

  i18n?: TypeI18n;
};

export function GridPagination(props: GridPaginationProps) {
  const { count, skip, limit, pageIndex, pageCount, canPrev, canNext, pageSizes, setSkip, setLimit, i18n } = props;

  return (
    <div className="flex items-center justify-between px-4">
      <div className="hidden flex-1 text-sm text-muted-foreground md:block">
        {t(i18n, "showingText", "Showing")} <span className="font-mono">{count === 0 ? 0 : skip + 1}</span>–
        <span className="font-mono">{Math.min(skip + limit, count)}</span> {t(i18n, "ofText", "of")}{" "}
        <span className="font-mono">{count}</span>
      </div>

      <div className="flex w-full items-center gap-4 md:w-auto">
        <div className="hidden items-center gap-2 md:flex">
          <Label htmlFor="rows-per-page" className="text-sm font-medium">
            {t(i18n, "perPageText", "Rows")}
          </Label>

          <Select
            value={`${limit}`}
            onValueChange={(value) => {
              setSkip(0);
              setLimit(Number(value));
            }}
          >
            <SelectTrigger className="h-9 w-20" id="rows-per-page">
              <SelectValue placeholder={`${limit}`} />
            </SelectTrigger>
            <SelectContent side="top">
              {pageSizes.map((size) => (
                <SelectItem key={size} value={`${size}`}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-center text-sm font-medium">
          {t(i18n, "pageText", "Page")} {pageIndex + 1} {t(i18n, "ofText", "of")} {pageCount}
        </div>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <Button
            type="button"
            variant="outline"
            className="hidden h-8 w-8 p-0 md:flex"
            onClick={() => setSkip(0)}
            disabled={!canPrev}
          >
            <span className="sr-only">Go to first page</span>
            <IconChevronsLeft className="size-4" />
          </Button>

          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => setSkip(Math.max(0, skip - limit))}
            disabled={!canPrev}
          >
            <span className="sr-only">Go to previous page</span>
            <IconChevronLeft className="size-4" />
          </Button>

          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => setSkip(skip + limit)}
            disabled={!canNext}
          >
            <span className="sr-only">Go to next page</span>
            <IconChevronRight className="size-4" />
          </Button>

          <Button
            type="button"
            variant="outline"
            size="icon"
            className="hidden size-8 md:flex"
            onClick={() => setSkip(Math.max(0, (pageCount - 1) * limit))}
            disabled={!canNext}
          >
            <span className="sr-only">Go to last page</span>
            <IconChevronsRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
