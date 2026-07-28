"use client";

import * as React from "react";
import { IconFilter } from "@tabler/icons-react";

import type {
  TypeCellProps,
  TypeComputedProps,
  TypeI18n,
  TypeRenderColumnFilterContextMenu,
} from "../../types";
import { cn } from "../../lib/utils";
import { t } from "../../utils/helpers";
import {
  focusFirstContextMenuItem,
  resolveContextMenuBoundary,
  resolveContextMenuPlacement,
} from "../utils/contextMenuPosition";

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
  renderColumnFilterContextMenu?: TypeRenderColumnFilterContextMenu;
  columnFilterContextMenuAlignPositions?: string[];
  columnFilterContextMenuConstrainTo?:
    | boolean
    | HTMLElement
    | string
    | ((...args: unknown[]) => HTMLElement | null);
  columnFilterContextMenuPosition?: string;
  updateMenuPositionOnScroll: boolean;
  cellProps: TypeCellProps;
  gridRef: React.MutableRefObject<TypeComputedProps | null>;
  gridProps: TypeComputedProps;
  restoreFocusTo?: HTMLElement | null;
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
    renderColumnFilterContextMenu,
    columnFilterContextMenuAlignPositions,
    columnFilterContextMenuConstrainTo,
    columnFilterContextMenuPosition,
    updateMenuPositionOnScroll,
    cellProps,
    gridRef,
    gridProps,
    restoreFocusTo,
  } = props;

  const selectAndClose = React.useCallback(
    (action: () => void) => {
      action();
      onOpenChange(false);
    },
    [onOpenChange]
  );
  const [triggerElement, setTriggerElement] =
    React.useState<HTMLButtonElement | null>(null);
  const restoreFocusRef = React.useRef<HTMLElement | null>(
    restoreFocusTo ?? null
  );
  const fallbackFocusRef = React.useRef<HTMLElement | null>(null);
  const menuInstanceId = React.useId();
  const customRendererInvoked = Boolean(open && renderColumnFilterContextMenu);
  const customMenu =
    customRendererInvoked && renderColumnFilterContextMenu
      ? renderColumnFilterContextMenu(
          {
            autoFocus: true,
            nativeScroll: true,
            enableSelection: true,
            position: columnFilterContextMenuPosition,
            style: {
              position: columnFilterContextMenuPosition as
                | React.CSSProperties["position"]
                | undefined,
            },
            constrainTo: columnFilterContextMenuConstrainTo,
            alignPositions: columnFilterContextMenuAlignPositions,
            updatePositionOnScroll: updateMenuPositionOnScroll,
            alignTo: triggerElement,
            selected: { operator },
            items: [
              ...operators.map((operatorItem) => ({
                name: operatorItem.name,
                value: operatorItem.name,
                label: String(t(i18n, operatorItem.name, operatorItem.name)),
              })),
              "-",
              {
                name: enabled ? "disable" : "enable",
                label: String(
                  enabled
                    ? t(i18n, "disable", "Disable")
                    : t(i18n, "enable", "Enable")
                ),
                disabled: false,
                onClick: enabled ? onDisable : onEnable,
              },
              {
                name: "clear",
                label: String(t(i18n, "clear", "Clear")),
                disabled: clearDisabled,
                onClick: onClear,
              },
              {
                name: "clearAll",
                label: String(t(i18n, "clearAll", "Clear all")),
                disabled: clearAllDisabled,
                onClick: onClearAll,
              },
            ],
            onSelectionChange: (nextOperator) =>
              selectAndClose(() => onSelectOperator(nextOperator)),
            onDismiss: () => onOpenChange(false),
          },
          {
            cellProps,
            grid: gridRef,
            props: gridProps,
          }
        )
      : undefined;
  const hasCustomMenu = customMenu != null && customMenu !== false;
  const customMenuSuppressed =
    customRendererInvoked && (customMenu === null || customMenu === false);
  React.useEffect(() => {
    if (customMenuSuppressed) onOpenChange(false);
  }, [customMenuSuppressed, onOpenChange]);
  React.useLayoutEffect(() => {
    if (!open || !restoreFocusTo) return;
    restoreFocusRef.current = restoreFocusTo;
    fallbackFocusRef.current =
      restoreFocusTo
        .closest<HTMLElement>(".tdg-root")
        ?.querySelector<HTMLElement>('[data-slot="grid-surface"]') ?? null;
  }, [open, restoreFocusTo]);
  React.useEffect(() => {
    if (!open) return;

    const frame = requestAnimationFrame(() => {
      const activeOperator = document.querySelector<HTMLElement>(
        `[data-filter-operator-active="true"][data-filter-menu-instance="${menuInstanceId}"]`
      );
      if (activeOperator) {
        activeOperator.focus();
        return;
      }
      const content = Array.from(
        document.querySelectorAll<HTMLElement>(
          "[data-filter-menu-content-instance]"
        )
      ).find(
        (element) =>
          element.dataset.filterMenuContentInstance === menuInstanceId
      );
      focusFirstContextMenuItem(content ?? null);
    });

    return () => cancelAnimationFrame(frame);
  }, [menuInstanceId, open]);
  const placement = resolveContextMenuPlacement(
    columnFilterContextMenuAlignPositions
  );
  const collisionBoundary = open
    ? resolveContextMenuBoundary(columnFilterContextMenuConstrainTo)
    : undefined;
  const handleCloseAutoFocus = React.useCallback((event: Event) => {
    const focusTarget = restoreFocusRef.current;
    const fallbackTarget = fallbackFocusRef.current;
    if (!focusTarget?.isConnected && !fallbackTarget?.isConnected) return;
    event.preventDefault();
    (focusTarget?.isConnected ? focusTarget : fallbackTarget)?.focus({
      preventScroll: true,
    });
  }, []);

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          ref={setTriggerElement}
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

      {customMenuSuppressed ? null : customMenu &&
        React.isValidElement(customMenu) ? (
        <DropdownMenuContent
          asChild
          data-filter-menu-content-instance={menuInstanceId}
          side={placement.side}
          align={placement.align}
          collisionBoundary={collisionBoundary}
          avoidCollisions={columnFilterContextMenuConstrainTo !== false}
          onCloseAutoFocus={handleCloseAutoFocus}
        >
          {customMenu}
        </DropdownMenuContent>
      ) : hasCustomMenu ? (
        <DropdownMenuContent
          data-filter-menu-content-instance={menuInstanceId}
          side={placement.side}
          align={placement.align}
          collisionBoundary={collisionBoundary}
          avoidCollisions={columnFilterContextMenuConstrainTo !== false}
          onCloseAutoFocus={handleCloseAutoFocus}
          className="w-56"
        >
          {customMenu}
        </DropdownMenuContent>
      ) : (
        <DropdownMenuContent
          data-filter-menu-content-instance={menuInstanceId}
          side={placement.side}
          align={placement.align}
          collisionBoundary={collisionBoundary}
          avoidCollisions={columnFilterContextMenuConstrainTo !== false}
          onCloseAutoFocus={handleCloseAutoFocus}
          className="w-56"
        >
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
                    <DropdownMenuRadioItem
                      key={opName}
                      value={opName}
                      data-filter-operator-active={
                        opName === operator ? "true" : undefined
                      }
                      data-filter-menu-instance={menuInstanceId}
                    >
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
      )}
    </DropdownMenu>
  );
}
