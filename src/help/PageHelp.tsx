"use client";

import * as React from "react";
import { CircleHelpIcon } from "lucide-react";
import { SlideOver } from "../overlay/SlideOver";

/**
 * The "?" at the right end of a page's header, opening a panel that explains the page in plain words (ported from
 * TripSetu's PageHelp). A page keeps no help paragraph above its table; the explanation goes here instead. Usually
 * drawn through PageHeader's `help`; order-last keeps it after Refresh, which a list adds to the same row.
 */
export function PageHelp({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Help: ${title}`}
        title="Help"
        className="order-last grid size-9 shrink-0 place-items-center rounded-lg border border-bf-line text-bf-muted transition hover:bg-bf-surface-alt hover:text-bf-ink"
      >
        <CircleHelpIcon className="size-[18px]" />
      </button>
      <SlideOver open={open} onClose={() => setOpen(false)} title={`Help: ${title}`}>
        <div className="space-y-5 p-5 text-sm leading-relaxed text-bf-copy">{children}</div>
      </SlideOver>
    </>
  );
}
