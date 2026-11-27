"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "../lib/cn";
import { useOutsidePress, viewport } from "../combobox/position";

/**
 * A small popover anchored to a button: the Download choices, the column chooser, the view menu.
 * Not a dropdown for picking a value (that is always Combobox). Arrow keys move between items marked
 * role="menuitem"; Escape closes and gives focus back to the button.
 */
export function Popover({
  trigger,
  align = "end",
  width = 224,
  label,
  children,
  className,
  open: openProp,
  onOpenChange,
  role = "menu",
}: {
  /** Controlled: the panel is open when true. Leave out and the button toggles it. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** "dialog" for a panel holding a small form rather than a list of actions. */
  role?: "menu" | "dialog";
  /** Renders the button. Spread the props onto it. */
  trigger: (props: { ref: React.Ref<HTMLButtonElement>; onClick: () => void; "aria-expanded": boolean; "aria-haspopup": "menu" | "dialog" }) => React.ReactNode;
  align?: "start" | "end";
  width?: number;
  label?: string;
  /** A function receives `close`. */
  children: React.ReactNode | ((close: () => void) => React.ReactNode);
  className?: string;
}) {
  const [inner, setInner] = React.useState(false);
  const open = openProp ?? inner;
  const setOpen = React.useCallback(
    (next: boolean) => {
      setInner(next);
      onOpenChange?.(next);
    },
    [onOpenChange],
  );
  const btn = React.useRef<HTMLButtonElement>(null);
  const panel = React.useRef<HTMLDivElement>(null);
  const [pos, setPos] = React.useState<{ top: number; left: number } | null>(null);

  const close = React.useCallback(() => {
    setOpen(false);
    btn.current?.focus();
  }, [setOpen]);
  useOutsidePress(open, [btn, panel], () => setOpen(false));

  React.useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const r = btn.current?.getBoundingClientRect();
      if (!r) return;
      const view = viewport();
      const w = Math.min(width, view.right - view.left - 16);
      const left = align === "end" ? r.right - w : r.left;
      setPos({ top: r.bottom + 6, left: Math.max(view.left + 8, Math.min(left, view.right - w - 8)) });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, align, width]);

  // Once the panel is drawn its height is known: if it would run off the bottom of the screen, open it above the
  // button instead (as the Combobox does), never past the top. Placed again from the button on scroll and resize.
  React.useLayoutEffect(() => {
    if (!open || !pos || !panel.current || !btn.current) return;
    const h = panel.current.offsetHeight;
    const r = btn.current.getBoundingClientRect();
    const view = viewport();
    const fitsBelow = r.bottom + 6 + h <= view.bottom - 8;
    const wanted = fitsBelow ? r.bottom + 6 : Math.max(view.top + 8, r.top - 6 - h);
    if (Math.abs(wanted - pos.top) > 1) setPos({ ...pos, top: wanted });
  }, [open, pos]);

  React.useEffect(() => {
    // A panel with nothing to focus (plain text) takes the focus itself, so Escape still closes it.
    if (open) (panel.current?.querySelector<HTMLElement>('[role="menuitem"],[role="menuitemcheckbox"],input,button') ?? panel.current)?.focus();
  }, [open, pos]);

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      close();
      return;
    }
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const items = Array.from(panel.current?.querySelectorAll<HTMLElement>('[role="menuitem"],[role="menuitemcheckbox"]') ?? []);
    if (items.length === 0) return;
    e.preventDefault();
    const at = items.indexOf(document.activeElement as HTMLElement);
    const next = e.key === "ArrowDown" ? (at + 1) % items.length : (at - 1 + items.length) % items.length;
    items[next].focus();
  }

  return (
    <>
      {trigger({ ref: btn, onClick: () => setOpen(!open), "aria-expanded": open, "aria-haspopup": role })}
      {open &&
        pos &&
        createPortal(
          <div
            ref={panel}
            role={role}
            tabIndex={-1}
            aria-label={label}
            onKeyDown={onKey}
            style={{ position: "fixed", top: pos.top, left: pos.left, width: Math.min(width, viewport().right - viewport().left - 16) }}
            className={cn("z-[80] rounded-xl border border-bf-line bg-bf-surface p-1 text-sm text-bf-copy shadow-[var(--bf-shadow-pop)] outline-none", className)}
          >
            {typeof children === "function" ? children(close) : children}
          </div>,
          document.body,
        )}
    </>
  );
}

export const menuItemClass =
  "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-bf-copy outline-none hover:bg-bf-surface-alt focus:bg-bf-surface-alt [&_svg]:size-4 [&_svg]:text-bf-muted";

export function MenuItem({
  href,
  download,
  onSelect,
  children,
  className,
}: {
  href?: string;
  download?: boolean;
  onSelect?: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  if (href) {
    return (
      <a role="menuitem" href={href} download={download} onClick={onSelect} className={cn(menuItemClass, className)}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" role="menuitem" onClick={onSelect} className={cn(menuItemClass, className)}>
      {children}
    </button>
  );
}

export function MenuLabel({ children }: { children: React.ReactNode }) {
  return <p className="px-2.5 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-bf-muted">{children}</p>;
}

export function MenuSeparator() {
  return <div role="separator" className="my-1 h-px bg-bf-line" />;
}
