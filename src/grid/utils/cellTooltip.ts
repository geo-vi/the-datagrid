import type { TypeCellTooltip } from "../../types";

type CellTooltipSetting = boolean | TypeCellTooltip | undefined;

function toCellTooltip(setting: CellTooltipSetting): TypeCellTooltip | null {
  if (!setting) return null;
  return setting === true ? {} : setting;
}

export function resolveCellTooltip(
  gridSetting: CellTooltipSetting,
  columnSetting: CellTooltipSetting
): TypeCellTooltip | null {
  if (columnSetting === false) return null;
  const gridTooltip = toCellTooltip(gridSetting);
  if (columnSetting === undefined) return gridTooltip;
  return { ...gridTooltip, ...toCellTooltip(columnSetting) };
}

function overflowWidth(box: HTMLElement, style: CSSStyleDeclaration): number {
  const range = document.createRange();
  range.selectNodeContents(box);
  const innerWidth =
    box.getBoundingClientRect().width -
    parseFloat(style.paddingLeft) -
    parseFloat(style.paddingRight) -
    parseFloat(style.borderLeftWidth) -
    parseFloat(style.borderRightWidth);
  return range.getBoundingClientRect().width - innerWidth;
}

/**
 * Only a box that clips counts: content spilling out of an `overflow: visible`
 * box hides nothing, and whatever the content box clips shows up on it.
 *
 * Widths come from the laid-out text, not `scrollWidth`, which rounds to whole
 * pixels: text 0.2px too wide already gets an ellipsis but no `scrollWidth`.
 */
export function isCellContentCut(content: HTMLElement): boolean {
  if (content.scrollHeight > content.clientHeight + 1) return true;
  const boxes = [content, ...content.querySelectorAll<HTMLElement>("*")];
  return boxes.some((box) => {
    const style = getComputedStyle(box);
    if (box !== content && style.overflowX === "visible") return false;
    // A plain clip hides a sub-pixel overflow; an ellipsis shows it.
    const tolerance = style.textOverflow === "ellipsis" ? 0.01 : 1;
    return overflowWidth(box, style) > tolerance;
  });
}

const collapseWhitespace = (text: string) => text.replace(/\s+/g, " ").trim();

/**
 * The cell collapses line breaks, so a multi-line string value would lose them.
 * The raw value is used when it is the text the cell shows, and the rendered
 * text otherwise (a custom `render`, a formatted date).
 */
export function resolveShownText(content: HTMLElement, value: unknown): string {
  const rendered = content.innerText.trim();
  if (
    typeof value === "string" &&
    collapseWhitespace(value) === collapseWhitespace(rendered)
  )
    return value.trim();
  return rendered;
}
