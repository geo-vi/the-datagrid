"use client";

import { IconCheck, IconFilter } from "@tabler/icons-react";

import type { TypeI18n } from "../../types";
import { cn } from "../../lib/utils";
import { t } from "../../utils/helpers";

import { Button } from "../../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";

export type FilterOperatorMenuProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  active: boolean;

  operator: string;
  operators: Array<{ name: string }>;

  i18n?: TypeI18n;

  onClear: () => void;
  onSelectOperator: (opName: string) => void;

  title?: string;
};

export function FilterOperatorMenu(props: FilterOperatorMenuProps) {
  const { open, onOpenChange, active, operator, operators, i18n, onClear, onSelectOperator, title } = props;

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7 shrink-0"
          aria-label={String(t(i18n, "filter", "Filter"))}
          title={title ?? String(t(i18n, "filter", "Filter"))}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <IconFilter className={cn("size-4", active ? "" : "opacity-50")} />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <div className="px-3 py-2 text-xs font-medium text-muted-foreground">
          {String(t(i18n, "filter", "Filter"))}
        </div>

        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            onClear();
          }}
        >
          {String(t(i18n, "clear", "Clear"))}
        </DropdownMenuItem>

        <div className="px-3 py-2 text-xs font-medium text-muted-foreground">
          {String(t(i18n, "operator", "Operator"))}
        </div>

        {operators.map((opItem) => {
          const opName = String(opItem?.name ?? "");
          if (!opName) return null;

          const isCurrent = opName === operator;

          return (
            <DropdownMenuItem
              key={opName}
              onSelect={(e) => {
                e.preventDefault();
                onSelectOperator(opName);
              }}
            >
              <div className="flex w-full items-center justify-between gap-3">
                <span className="truncate">{String(t(i18n, opName, opName))}</span>
                {isCurrent ? <IconCheck className="size-4 opacity-80" /> : null}
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
