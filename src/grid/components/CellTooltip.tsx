"use client";

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { Check, Copy } from "lucide-react";

import type { TypeCellTooltip, TypeI18n } from "../../types";
import { t } from "../../utils/helpers";
import {
  useDatagridThemeBase,
  useDatagridThemeName,
} from "../../theme/context";

const OPEN_DELAY_MS = 400;
// Long enough to cross the gap between the cell and the tooltip.
const CLOSE_DELAY_MS = 120;
// On the way to the tooltip the pointer crosses the next row's cells, which
// must not swap the content before the pointer arrives.
const SWITCH_DELAY_MS = 150;
const COPIED_FEEDBACK_MS = 1500;

export type CellTooltipRequest = {
  anchor: HTMLElement;
  body: React.ReactNode;
  copyText: string;
  clickToCopy: boolean;
  theme: NonNullable<TypeCellTooltip["theme"]>;
};

export type CellTooltipController = {
  show: (request: CellTooltipRequest) => void;
  hide: () => void;
};

async function writeClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  // `navigator.clipboard` exists only in secure contexts, so a grid served over
  // plain http falls back to the legacy command.
  const field = document.createElement("textarea");
  field.value = text;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.opacity = "0";
  document.body.appendChild(field);
  field.select();
  try {
    document.execCommand("copy");
  } finally {
    field.remove();
  }
}

export const CellTooltipLayer = React.forwardRef<
  CellTooltipController,
  { i18n?: TypeI18n }
>(function CellTooltipLayer({ i18n }, ref) {
  const themeName = useDatagridThemeName();
  const themeBase = useDatagridThemeBase();
  const [request, setRequest] = React.useState<
    (CellTooltipRequest & { openCount: number }) | null
  >(null);
  const [copied, setCopied] = React.useState(false);
  const openRef = React.useRef(false);
  const openTimerRef = React.useRef<number | null>(null);
  const closeTimerRef = React.useRef<number | null>(null);
  const copiedTimerRef = React.useRef<number | null>(null);
  const anchorNodeRef = React.useRef<HTMLElement | null>(null);
  // One popover serves every cell through a virtual anchor that always measures
  // the current cell. Swapping the anchor object instead reaches Radix one render
  // late, so the first frame was placed against the old one.
  const openCountRef = React.useRef(0);
  const virtualAnchorRef = React.useRef({
    getBoundingClientRect: () =>
      anchorNodeRef.current?.getBoundingClientRect() ?? new DOMRect(),
  });
  const contentRef = React.useRef<HTMLDivElement | null>(null);

  const clearTimer = (timerRef: React.MutableRefObject<number | null>) => {
    if (timerRef.current != null) window.clearTimeout(timerRef.current);
    timerRef.current = null;
  };

  const close = React.useCallback(() => {
    clearTimer(openTimerRef);
    clearTimer(closeTimerRef);
    openRef.current = false;
    setRequest(null);
    setCopied(false);
  }, []);

  const keepOpen = React.useCallback(() => {
    clearTimer(openTimerRef);
    clearTimer(closeTimerRef);
  }, []);

  const scheduleClose = React.useCallback(() => {
    clearTimer(openTimerRef);
    clearTimer(closeTimerRef);
    closeTimerRef.current = window.setTimeout(close, CLOSE_DELAY_MS);
  }, [close]);

  React.useImperativeHandle(
    ref,
    () => ({
      show(next) {
        clearTimer(openTimerRef);
        clearTimer(closeTimerRef);
        const open = () => {
          anchorNodeRef.current = next.anchor;
          openCountRef.current += 1;
          openRef.current = true;
          setCopied(false);
          setRequest({ ...next, openCount: openCountRef.current });
        };
        openTimerRef.current = window.setTimeout(
          open,
          openRef.current ? SWITCH_DELAY_MS : OPEN_DELAY_MS
        );
      },
      hide: scheduleClose,
    }),
    [scheduleClose]
  );

  React.useEffect(() => {
    if (!request) return;
    // The tooltip is placed once, so a scrolled grid would leave it floating
    // over the wrong cell.
    const closeUnlessInside = (event: Event) => {
      if (
        event.target instanceof Node &&
        contentRef.current?.contains(event.target)
      )
        return;
      close();
    };
    window.addEventListener("scroll", closeUnlessInside, true);
    window.addEventListener("wheel", closeUnlessInside, { passive: true });
    return () => {
      window.removeEventListener("scroll", closeUnlessInside, true);
      window.removeEventListener("wheel", closeUnlessInside);
    };
  }, [request, close]);

  React.useEffect(
    () => () => {
      clearTimer(openTimerRef);
      clearTimer(closeTimerRef);
      clearTimer(copiedTimerRef);
    },
    []
  );

  const copy = () => {
    if (!request) return;
    void writeClipboard(request.copyText).then(() => {
      setCopied(true);
      clearTimer(copiedTimerRef);
      copiedTimerRef.current = window.setTimeout(
        () => setCopied(false),
        COPIED_FEEDBACK_MS
      );
    });
  };

  const body = request ? (
    <span data-slot="cell-tooltip-body" className="tdg-cell-tooltip__body">
      {request.body}
    </span>
  ) : null;

  return (
    <PopoverPrimitive.Root
      open={request != null}
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <PopoverPrimitive.Anchor virtualRef={virtualAnchorRef} />
      {/* The grid root isolates its stacking layers, so a tooltip left inside it
          would paint under the next grid on the page. It escapes to the body the
          way the dialog does, as its own themed root. */}
      <PopoverPrimitive.Portal>
        {request ? (
          <div
            className="tdg-root tdg-tokens tdg-cell-tooltip-portal"
            data-theme={themeBase !== "default" ? themeName : undefined}
            data-theme-base={themeBase !== "default" ? themeBase : undefined}
          >
            <PopoverPrimitive.Content
              // A new cell remounts the tooltip: Radix keeps it hidden until
              // placed, so it never shows at the previous cell for a frame.
              key={request.openCount}
              ref={contentRef}
              data-slot="cell-tooltip"
              data-tooltip-theme={request.theme}
              className="tdg-cell-tooltip"
              // A tooltip must hold nothing interactive, so with the copy
              // button it keeps Radix's non-modal dialog role instead.
              {...(request.clickToCopy ? {} : { role: "tooltip" })}
              side="bottom"
              align="start"
              sideOffset={4}
              collisionPadding={8}
              onOpenAutoFocus={(event) => event.preventDefault()}
              onCloseAutoFocus={(event) => event.preventDefault()}
              // Mouse, not pointer, events: a pointer event on the tooltip fires
              // before the cell's `mouseleave`, which would re-schedule the close.
              onMouseEnter={keepOpen}
              onMouseLeave={scheduleClose}
            >
              {request.clickToCopy ? (
                <button
                  type="button"
                  data-slot="cell-tooltip-copy"
                  className="tdg-cell-tooltip__copy"
                  onClick={copy}
                >
                  {body}
                  <span
                    data-slot="cell-tooltip-footer"
                    className="tdg-cell-tooltip__footer"
                    aria-live="polite"
                  >
                    {copied ? (
                      <Check aria-hidden="true" />
                    ) : (
                      <Copy aria-hidden="true" />
                    )}
                    {copied
                      ? t(i18n, "cellTooltipCopied", "Copied")
                      : t(i18n, "cellTooltipClickToCopy", "Click to copy")}
                  </span>
                </button>
              ) : (
                body
              )}
            </PopoverPrimitive.Content>
          </div>
        ) : null}
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
});
