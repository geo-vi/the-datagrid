import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { DatagridThemeProvider } from "../theme/context";

export const DATA_GRID_MENU_RUNTIME_SYMBOL = Symbol.for(
  "@geovi/the-datagrid/menu-runtime"
);

/**
 * The grid's own dropdown menu, handed to optional entries that must not bundle
 * a second copy of it. Radix and its popper already ship inside the core, and an
 * optional entry importing this module directly would duplicate both - along
 * with the React contexts they rely on. Reaching it through the core runtime
 * instead keeps one implementation, one context, and one set of bytes.
 *
 * `ThemeProvider` travels with the parts on purpose: a menu portals into the
 * container that provider names, and reads its theme class from the same
 * context. An entry outside the grid has to supply both for either to work.
 */
export type DataGridMenuRuntime = {
  ThemeProvider: typeof DatagridThemeProvider;
  Root: typeof DropdownMenu;
  Trigger: typeof DropdownMenuTrigger;
  Content: typeof DropdownMenuContent;
  Group: typeof DropdownMenuGroup;
  Label: typeof DropdownMenuLabel;
  Separator: typeof DropdownMenuSeparator;
  Item: typeof DropdownMenuItem;
  CheckboxItem: typeof DropdownMenuCheckboxItem;
};

let runtime: DataGridMenuRuntime | undefined;

export function getDataGridMenuRuntime(): DataGridMenuRuntime {
  return (runtime ??= {
    ThemeProvider: DatagridThemeProvider,
    Root: DropdownMenu,
    Trigger: DropdownMenuTrigger,
    Content: DropdownMenuContent,
    Group: DropdownMenuGroup,
    Label: DropdownMenuLabel,
    Separator: DropdownMenuSeparator,
    Item: DropdownMenuItem,
    CheckboxItem: DropdownMenuCheckboxItem,
  });
}
