"use client";

import { IconFilter } from "@tabler/icons-react";

import type { TypeI18n } from "../../types";
import { cn } from "../../lib/utils";
import { t } from "../../utils/helpers";

import { Button } from "../../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
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
          className="InovuaReactDataGrid__column-header__filter-settings size-6 shrink-0"
          aria-label={String(t(i18n, "filter", "Filter"))}
          title={title ?? String(t(i18n, "filter", "Filter"))}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <IconFilter
            className={cn(
              "InovuaReactDataGrid__column-header__filter-settings-icon size-4",
              active ? "" : "opacity-50",
            )}
          />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{String(t(i18n, "filter", "Filter"))}</DropdownMenuLabel>
          <DropdownMenuItem
            onSelect={(e: Event) => {
              e.preventDefault();
              onClear();
            }}
          >
            {String(t(i18n, "clear", "Clear"))}
          </DropdownMenuItem>
        </DropdownMenuGroup>

        {operators.length > 0 ? (
          <>
            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              <DropdownMenuLabel>{String(t(i18n, "operator", "Operator"))}</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={operator} onValueChange={onSelectOperator}>
                {operators.map((opItem) => {
                  const opName = String(opItem?.name ?? "");
                  if (!opName) return null;

                  return (
                    <DropdownMenuRadioItem key={opName} value={opName}>
                      <span className="truncate">{String(t(i18n, opName, opName))}</span>
                    </DropdownMenuRadioItem>
                  );
                })}
              </DropdownMenuRadioGroup>
            </DropdownMenuGroup>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
