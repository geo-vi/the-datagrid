"use client";

import * as React from "react";
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
  enabled: boolean;
  clearDisabled: boolean;
  clearAllDisabled: boolean;

  operator: string;
  operators: Array<{ name: string }>;

  i18n?: TypeI18n;

  onClear: () => void;
  onClearAll: () => void;
  onEnable: () => void;
  onDisable: () => void;
  onSelectOperator: (opName: string) => void;

  title?: string;
};

export function FilterOperatorMenu(
  props: FilterOperatorMenuProps
): React.ReactElement {
  const {
    open,
    onOpenChange,
    active,
    enabled,
    clearDisabled,
    clearAllDisabled,
    operator,
    operators,
    i18n,
    onClear,
    onClearAll,
    onEnable,
    onDisable,
    onSelectOperator,
    title,
  } = props;

  const selectAndClose = React.useCallback(
    (action: () => void) => {
      action();
      onOpenChange(false);
    },
    [onOpenChange]
  );

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
              active ? "" : "opacity-50"
            )}
          />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            {String(t(i18n, "filter", "Filter"))}
          </DropdownMenuLabel>
        </DropdownMenuGroup>

        {operators.length > 0 ? (
          <DropdownMenuGroup>
            <DropdownMenuLabel>
              {String(t(i18n, "operator", "Operator"))}
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={operator}
              onValueChange={(nextOperator) =>
                selectAndClose(() => onSelectOperator(nextOperator))
              }
            >
              {operators.map((opItem) => {
                const opName = String(opItem?.name ?? "");
                if (!opName) return null;

                return (
                  <DropdownMenuRadioItem key={opName} value={opName}>
                    <span className="truncate">
                      {String(t(i18n, opName, opName))}
                    </span>
                  </DropdownMenuRadioItem>
                );
              })}
            </DropdownMenuRadioGroup>
          </DropdownMenuGroup>
        ) : null}

        {operators.length > 0 ? <DropdownMenuSeparator /> : null}

        <DropdownMenuGroup>
          <DropdownMenuItem
            disabled={enabled}
            onSelect={() => selectAndClose(onEnable)}
          >
            {String(t(i18n, "enable", "Enable"))}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!enabled}
            onSelect={() => selectAndClose(onDisable)}
          >
            {String(t(i18n, "disable", "Disable"))}
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem
            disabled={clearDisabled}
            onSelect={() => selectAndClose(onClear)}
          >
            {String(t(i18n, "clear", "Clear"))}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={clearAllDisabled}
            onSelect={() => selectAndClose(onClearAll)}
          >
            {String(t(i18n, "clearAll", "Clear All"))}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
