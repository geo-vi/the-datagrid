import { cn } from "./utils";
import { useDatagridThemeClassSuffix } from "../theme/context";

/**
 * The select trigger's look, kept out of the component file so the multi-value
 * filter trigger can wear it too. That one is a dropdown menu rather than a
 * Radix Select, so it cannot reuse SelectTrigger itself, and styling it as a
 * Button is not an option either: `.tdg-button` armours `justify-content:
 * center` and a transparent background with `!important`, which centres the
 * label against its chevron and refuses the select surface. One source for the
 * class list is what keeps the single and multiple triggers from drifting.
 */
export function useSelectTriggerClassName(state?: {
  disabled?: boolean;
  focused?: boolean;
}): string {
  const themeClassSuffix = useDatagridThemeClassSuffix();

  return cn(
    "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border bg-[var(--tdg-select-bg)] px-3 py-2 text-sm text-[var(--tdg-select-color)] shadow-sm ring-offset-background data-[placeholder]:text-muted-foreground [border-color:var(--tdg-select-border-color)] hover:[border-color:var(--tdg-select-border-color-hover)] focus:outline-none focus:ring-1 focus:ring-ring focus:[border-color:var(--tdg-select-border-color-focus)] disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
    "tdg-select-trigger",
    "inovua-react-toolkit-combo-box inovua-react-toolkit-combo-box--ltr",
    `inovua-react-toolkit-combo-box--theme-${themeClassSuffix}`,
    state?.disabled ? "inovua-react-toolkit-combo-box--disabled" : "",
    state?.focused ? "inovua-react-toolkit-combo-box--focus" : ""
  );
}
