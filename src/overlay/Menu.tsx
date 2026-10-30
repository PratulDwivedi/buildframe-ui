"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "../lib/cn";
import { useOutsidePress } from "../combobox/position";

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
}: {
  /** Renders the button. Spread the props onto it. */
  trigger: (props: { ref: React.Ref<HTMLButtonElement>; onClick: () => void; "aria-expanded": boolean; "aria-haspopup": "menu" | "dialog" }) => React.ReactNode;
  align?: "start" | "end";
  width?: number;
  label?: string;
  /** A function receives `close`. */
  children: React.ReactNode | ((close: () => void) => React.ReactNode);
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const btn = React.useRef<HTMLButtonElement>(null);
  const panel = React.useRef<HTMLDivElement>(null);
  const [pos, setPos] = React.useState<{ top: number; left: number } | null>(null);

  const close = React.useCallback(() => {
    setOpen(false);
    btn.current?.focus();
  }, []);
  useOutsidePress(open, [btn, panel], () => setOpen(false));

  React.useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const r = btn.current?.getBoundingClientRect();
      if (!r) return;
      const w = Math.min(width, window.innerWidth - 16);
      const left = align === "end" ? r.right - w : r.left;
      setPos({ top: r.bottom + 6, left: Math.max(8, Math.min(left, window.innerWidth - w - 8)) });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, align, width]);

  React.useEffect(() => {
    if (open) panel.current?.querySelector<HTMLElement>('[role="menuitem"],[role="menuitemcheckbox"],input,button')?.focus();
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
      {trigger({ ref: btn, onClick: () => setOpen((o) => !o), "aria-expanded": open, "aria-haspopup": "menu" })}
      {open &&
        pos &&
        createPortal(
          <div
            ref={panel}
            role="menu"
            aria-label={label}
            onKeyDown={onKey}
            style={{ position: "fixed", top: pos.top, left: pos.left, width: Math.min(width, window.innerWidth - 16) }}
            className={cn("z-[80] rounded-xl border border-bf-line bg-bf-surface p-1 text-sm text-bf-copy shadow-[var(--bf-shadow-pop)]", className)}
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
