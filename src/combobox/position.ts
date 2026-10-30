"use client";

import * as React from "react";

export type PopPos = { left: number; width: number; top?: number; bottom?: number; maxHeight: number };

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
      const below = window.innerHeight - r.bottom;
      const up = below < 260 && r.top > below;
      const width = Math.max(r.width, minWidth);
      // Keep a wide list on screen at 400px: shift it left rather than let it run off the edge.
      const left = Math.max(8, Math.min(r.left, window.innerWidth - width - 8));
      setPos({
        left,
        width,
        maxHeight: Math.max(160, Math.min(320, (up ? r.top : below) - 16)),
        ...(up ? { bottom: window.innerHeight - r.top + 4 } : { top: r.bottom + 4 }),
      });
    };
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
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
