"use client";

import * as React from "react";

export type PopPos = { left: number; width: number; top?: number; bottom?: number; maxHeight: number };

/**
 * The page and the part of it a person can see, in the coordinates getBoundingClientRect and position: fixed use.
 * On a phone they differ: pinching or the keyboard leave a smaller "visual" view inside the page, and there
 * window.innerWidth is the VIEW's width. Measuring against that pushed a list off the left edge of the screen.
 */
export function viewport() {
  const pageWidth = document.documentElement.clientWidth || window.innerWidth;
  const pageHeight = document.documentElement.clientHeight || window.innerHeight;
  const v = window.visualViewport;
  const left = v?.offsetLeft ?? 0;
  const top = v?.offsetTop ?? 0;
  return { pageHeight, left, top, right: left + (v?.width ?? pageWidth), bottom: top + (v?.height ?? pageHeight) };
}

/**
 * Places a list drawn on <body> under its control, or above it when there is not room below, and keeps it
 * there while the page scrolls. The list is portalled because inside a table, a card or a panel that scrolls
 * or clips, an absolutely positioned list is cut off at the container's edge.
 */
export function usePopoverPosition(open: boolean, anchor: React.RefObject<HTMLElement | null>, minWidth = 0) {
  const [pos, setPos] = React.useState<PopPos | null>(null);
  React.useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const r = anchor.current?.getBoundingClientRect();
      if (!r) return;
      const view = viewport();
      const below = view.bottom - r.bottom;
      const above = r.top - view.top;
      const up = below < 260 && above > below;
      const width = Math.min(Math.max(r.width, minWidth), view.right - view.left - 16);
      // Keep a wide list on screen at 400px: shift it left rather than let it run off the edge.
      const left = Math.max(view.left + 8, Math.min(r.left, view.right - width - 8));
      setPos({
        left,
        width,
        maxHeight: Math.max(160, Math.min(320, (up ? above : below) - 16)),
        ...(up ? { bottom: view.pageHeight - r.top + 4 } : { top: r.bottom + 4 }),
      });
    };
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    // The keyboard opening, and a pinch, move only the visual view.
    const view = window.visualViewport;
    view?.addEventListener("resize", place);
    view?.addEventListener("scroll", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
      view?.removeEventListener("resize", place);
      view?.removeEventListener("scroll", place);
    };
  }, [open, anchor, minWidth]);
  return pos;
}

/** Closes on a mouse press outside every element given. */
export function useOutsidePress(open: boolean, refs: React.RefObject<HTMLElement | null>[], onOutside: () => void) {
  const cb = React.useRef(onOutside);
  React.useEffect(() => {
    cb.current = onOutside;
  });
  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (refs.every((r) => !r.current?.contains(t))) cb.current();
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
}

export function matchesQuery(o: { label: string; hint?: string; search?: string }, q: string) {
  return o.label.toLowerCase().includes(q) || (o.hint ?? "").toLowerCase().includes(q) || (o.search ?? "").toLowerCase().includes(q);
}
