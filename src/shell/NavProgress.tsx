"use client";

import * as React from "react";
import { useLinkStatus } from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * A progress bar across the top of the page while a navigation is in flight.
 *
 * Console pages are dynamic and make their own round trips, so a click can wait a second or two. Next.js keeps the
 * current page on screen meanwhile, which is right, and also why nothing seems to respond. A `loading.tsx` would
 * replace the whole content area on every navigation; this keeps the page and puts a bar over it instead.
 *
 * Three signals start the bar:
 *  1. `<LinkPending />` inside a `<Link>` (the framework's own `useLinkStatus`). `AppShell` puts it in its sidebar links.
 *     A count, not a boolean: two links can be pending at once, and the bar must not clear when only one does.
 *  2. A click on any other internal `<a>` anywhere under the provider (in-page links, buttons built with `ButtonLink`).
 *     Opt out with `data-no-progress`. Links that open a new tab, download, change only the hash, or point at the
 *     current URL are ignored.
 *  3. `useNavProgress().start()`, for code that calls `router.push` (a table row click, a form that redirects).
 * Signals 2 and 3 end when the path or query string changes, or after 8 seconds if nothing does.
 */
type Api = { bump: (delta: number) => void; start: () => void };
const Ctx = React.createContext<Api>({ bump: () => {}, start: () => {} });

const SAFETY_MS = 8000;

/** Call `start()` just before a `router.push` / `router.replace` so the bar shows while the next page loads. */
export function useNavProgress(): { start: () => void } {
  const { start } = React.useContext(Ctx);
  return React.useMemo(() => ({ start }), [start]);
}

function RouteWatcher({ onChange }: { onChange: () => void }) {
  const path = usePathname();
  const search = useSearchParams().toString();
  React.useEffect(() => {
    onChange();
  }, [path, search, onChange]);
  return null;
}

export function NavProgressProvider({ children }: { children: React.ReactNode }) {
  const [links, setLinks] = React.useState(0);
  const [manual, setManual] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const bump = React.useCallback((d: number) => setLinks((n) => Math.max(0, n + d)), []);
  const done = React.useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setManual(false);
  }, []);
  const start = React.useCallback(() => {
    setManual(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setManual(false), SAFETY_MS);
  }, []);

  React.useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.hasAttribute("download") || a.hasAttribute("data-no-progress")) return;
      if (a.target && a.target !== "_self") return;
      let u: URL;
      try {
        u = new URL(a.href, window.location.href);
      } catch {
        return;
      }
      if (u.origin !== window.location.origin) return;
      if (u.pathname === window.location.pathname && u.search === window.location.search) return;
      start();
    };
    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [start]);

  const api = React.useMemo(() => ({ bump, start }), [bump, start]);
  const busy = links > 0 || manual;

  return (
    <Ctx.Provider value={api}>
      <div
        role="progressbar"
        aria-label="Loading page"
        aria-busy={busy}
        aria-hidden={!busy}
        className={`bf-nav-progress${busy ? " is-pending" : ""}`}
      />
      <React.Suspense fallback={null}>
        <RouteWatcher onChange={done} />
      </React.Suspense>
      {children}
    </Ctx.Provider>
  );
}

/** Reports one link's pending state upward. Renders nothing. Must be a child of a `<Link>`, else it does nothing. */
export function LinkPending() {
  const { pending } = useLinkStatus();
  const { bump } = React.useContext(Ctx);

  React.useEffect(() => {
    if (!pending) return;
    bump(1);
    // The cleanup ends the bar: it runs when `pending` goes false, and when the link unmounts mid-flight.
    return () => bump(-1);
  }, [pending, bump]);

  return null;
}
