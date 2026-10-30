"use client";

import * as React from "react";
import { createPortal } from "react-dom";

/**
 * The page title and the page's action buttons live in the shell's topbar, so they stay in view while the page
 * scrolls and the heading is written in one place. A page declares them; the topbar draws them.
 * Ported from buildframe_ecomm components/admin/admin-header-context.tsx.
 */
export type PageHeaderValue = { title: string; subtitle?: string };

type Store = {
  header: PageHeaderValue | null;
  setHeader: (h: PageHeaderValue) => void;
  slot: HTMLElement | null;
  setSlot: (el: HTMLElement | null) => void;
};

const Ctx = React.createContext<Store | null>(null);

export function PageHeaderProvider({ children }: { children: React.ReactNode }) {
  const [header, setHeader] = React.useState<PageHeaderValue | null>(null);
  const [slot, setSlot] = React.useState<HTMLElement | null>(null);
  const value = React.useMemo(() => ({ header, setHeader, slot, setSlot }), [header, slot]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** The current page's title, for the topbar. Null outside a provider. */
export function usePageHeader() {
  return React.useContext(Ctx)?.header ?? null;
}

/** The topbar attaches this to the empty box at the right end of its row. */
export function usePageActionsSlot() {
  const ctx = React.useContext(Ctx);
  return ctx?.setSlot ?? (() => {});
}

/** True inside a PageHeaderProvider, so a component can draw its buttons inline when there is no topbar. */
export function useHasPageHeader() {
  return React.useContext(Ctx) !== null;
}

/** Declares the page's title and subtitle. Renders nothing. */
export function PageHeader({ title, subtitle }: PageHeaderValue) {
  const ctx = React.useContext(Ctx);
  const setHeader = ctx?.setHeader;
  React.useEffect(() => {
    setHeader?.({ title, subtitle });
  }, [title, subtitle, setHeader]);
  return null;
}

/**
 * Puts the page's action buttons in the topbar, right-most. The children stay part of the calling screen (its
 * state and handlers); only where they are drawn changes. Outside a provider they render in place.
 */
export function PageActions({ children }: { children: React.ReactNode }) {
  const ctx = React.useContext(Ctx);
  if (!ctx) return <div className="flex items-center gap-1.5">{children}</div>;
  return ctx.slot ? createPortal(children, ctx.slot) : null;
}
