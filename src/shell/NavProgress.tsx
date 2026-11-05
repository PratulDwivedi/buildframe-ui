"use client";

import * as React from "react";
import { useLinkStatus } from "next/link";

/**
 * A progress bar across the top of the page while a link navigation is in flight.
 *
 * Console pages are dynamic and make their own round trips, so a click on the sidebar can wait a second or two.
 * Next.js keeps the current page on screen meanwhile, which is right, and also why nothing seems to respond.
 * A `loading.tsx` would replace the whole content area on every navigation; this keeps the page and puts a bar
 * over it instead.
 *
 * `useLinkStatus` only works inside a `<Link>`, so each link reports its own state through `<LinkPending />` and
 * the provider counts them. A count, not a boolean: two links can be pending at once, and the bar must not clear
 * when only the abandoned one does.
 *
 * `AppShell` already mounts the provider and puts `LinkPending` in its sidebar links. An app only needs these
 * two for links outside the shell.
 */
const Ctx = React.createContext<(delta: number) => void>(() => {});

export function NavProgressProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = React.useState(0);
  const bump = React.useCallback((d: number) => setPending((n) => Math.max(0, n + d)), []);

  return (
    <Ctx.Provider value={bump}>
      <div
        role="progressbar"
        aria-label="Loading page"
        aria-busy={pending > 0}
        aria-hidden={pending === 0}
        className={`bf-nav-progress${pending > 0 ? " is-pending" : ""}`}
      />
      {children}
    </Ctx.Provider>
  );
}

/** Reports one link's pending state upward. Renders nothing. Must be a child of a `<Link>`, else it does nothing. */
export function LinkPending() {
  const { pending } = useLinkStatus();
  const bump = React.useContext(Ctx);

  React.useEffect(() => {
    if (!pending) return;
    bump(1);
    // The cleanup ends the bar: it runs when `pending` goes false, and when the link unmounts mid-flight.
    return () => bump(-1);
  }, [pending, bump]);

  return null;
}
