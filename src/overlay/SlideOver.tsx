"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { SaveIcon, XIcon } from "lucide-react";
import { cn } from "../lib/cn";
import { Button } from "../primitives/Button";
import { FormError } from "../primitives/Field";

/**
 * A panel from the right, for adding and editing without leaving the list (house rule: small forms open
 * here, big forms are pages). Ported from insightuno components/app/SlideOver.tsx, plus ecomm's RecordSheet.
 *
 * Two ways to drive it:
 *   - state: `open` + `onClose` (ecomm's RecordSheet).
 *   - routed: `closeHref`; the panel is a page, closing navigates there (InsightUno), so a panel can be linked
 *     to and opens on a hard load. Mount it to open it.
 *
 * Portalled to <body> so it and its backdrop sit above the sidebar. Full width on a phone, capped on desktop,
 * footer always in reach. Escape closes unless an inner Combobox took the key first. Tab stays inside.
 */
const SLIDE_MS = 200;
const noop = () => () => {};
const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select,textarea,[tabindex]:not([tabindex="-1"])';

export type SlideOverWidth = "md" | "lg" | "xl";
const WIDTH: Record<SlideOverWidth, string> = { md: "sm:max-w-[460px]", lg: "sm:max-w-[560px]", xl: "sm:max-w-[720px]" };

export function SlideOver({
  open: openProp,
  onClose,
  closeHref,
  title,
  subtitle,
  footer,
  width = "md",
  closeOnBackdrop = true,
  closeOnEscape = true,
  children,
}: {
  open?: boolean;
  onClose?: () => void;
  closeHref?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** A function receives `close`, so a footer Cancel animates out like the header button. */
  footer?: React.ReactNode | ((close: () => void) => React.ReactNode);
  width?: SlideOverWidth;
  /** Off for forms: a stray click outside must not throw typed data away. */
  closeOnBackdrop?: boolean;
  /** Off when only the close button (or the form's Cancel) may close it. */
  closeOnEscape?: boolean;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const routed = openProp === undefined;
  const wanted = routed ? true : openProp;
  // Mounted in the DOM while open or sliding out; `shown` drives the slide.
  const [present, setPresent] = React.useState(wanted);
  const [shown, setShown] = React.useState(false);
  const mounted = React.useSyncExternalStore(noop, () => true, () => false);
  const panelRef = React.useRef<HTMLElement>(null);
  const lastFocus = React.useRef<HTMLElement | null>(null);
  const titleId = React.useId();

  React.useEffect(() => {
    if (wanted) {
      lastFocus.current = document.activeElement as HTMLElement | null;
      setPresent(true);
      // Next frame, so the closed position paints first and the move animates.
      const id = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
      return () => cancelAnimationFrame(id);
    }
    setShown(false);
    const t = window.setTimeout(() => {
      setPresent(false);
      lastFocus.current?.focus?.();
    }, SLIDE_MS);
    return () => window.clearTimeout(t);
  }, [wanted]);

  React.useEffect(() => {
    if (shown) panelRef.current?.focus();
  }, [shown]);

  // The page behind does not scroll while the panel is up.
  React.useEffect(() => {
    if (!present) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [present]);

  const close = React.useCallback(() => {
    if (routed) {
      setShown(false);
      window.setTimeout(() => (closeHref ? router.push(closeHref, { scroll: false }) : router.back()), SLIDE_MS);
    } else onClose?.();
  }, [routed, router, closeHref, onClose]);

  React.useEffect(() => {
    if (!present) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented && closeOnEscape) close();
      if (e.key === "Tab" && panelRef.current) {
        const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === panelRef.current)) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close, present, closeOnEscape]);

  if (!mounted || !present) return null;

  return createPortal(
    <>
      <div
        onClick={closeOnBackdrop ? close : undefined}
        aria-hidden
        className={cn("fixed inset-0 z-[60] bg-black/35 transition-opacity duration-200", shown ? "opacity-100" : "pointer-events-none opacity-0")}
      />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          "fixed inset-y-0 right-0 z-[70] flex w-full flex-col border-l border-bf-line bg-bf-surface text-bf-copy shadow-2xl outline-none transition-transform duration-200 ease-out",
          WIDTH[width],
          shown ? "translate-x-0" : "translate-x-full",
        )}
      >
        <header className="flex items-start gap-3 border-b border-bf-line px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="truncate text-[15px] font-semibold leading-tight text-bf-ink">
              {title}
            </h2>
            {subtitle && <p className="mt-0.5 truncate text-[13px] text-bf-muted">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="grid size-8 shrink-0 place-items-center rounded-lg text-bf-muted transition hover:bg-bf-surface-alt hover:text-bf-ink"
          >
            <XIcon className="size-4" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        {footer && (
          <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-bf-line bg-bf-surface px-5 py-3">
            {typeof footer === "function" ? footer(close) : footer}
          </footer>
        )}
      </aside>
    </>,
    document.body,
  );
}

/**
 * A SlideOver holding one form with Cancel and Save in the footer (ecomm's RecordSheet). A click outside never
 * closes it; Cancel, the X and Escape do.
 */
export function SlideOverForm({
  open,
  onClose,
  title,
  subtitle,
  formId,
  submitLabel = "Save",
  pending,
  error,
  footerExtra,
  width,
  onSubmit,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  formId: string;
  submitLabel?: string;
  pending?: boolean;
  error?: string | null;
  /** Drawn at the footer's left, e.g. a Delete button. */
  footerExtra?: React.ReactNode;
  width?: SlideOverWidth;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  children: React.ReactNode;
}) {
  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      width={width}
      closeOnBackdrop={false}
      footer={(close) => (
        <>
          {footerExtra && <div className="mr-auto">{footerExtra}</div>}
          <Button variant="secondary" disabled={pending} onClick={close}>
            Cancel
          </Button>
          <Button type="submit" form={formId} variant="primary" pending={pending}>
            {!pending && <SaveIcon />}
            {submitLabel}
          </Button>
        </>
      )}
    >
      <form id={formId} onSubmit={onSubmit} className="space-y-5 p-5">
        {children}
        <FormError message={error} />
      </form>
    </SlideOver>
  );
}
