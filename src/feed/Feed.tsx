import * as React from "react";
import { cn } from "../lib/cn";

/**
 * A list of things that happened, newest first as given: what leads the row (an avatar or an icon), a line of
 * text, and when. A row with an `href` is a link. From vyapar_ping components/dashboard/activity-feed.
 */
export type FeedItem = {
  key: string;
  lead?: React.ReactNode;
  text: React.ReactNode;
  /** Already written for people: "9:12", "Yesterday", "17 Nov". */
  time?: string;
  href?: string;
};

export function Feed({
  items,
  label,
  empty = "Nothing yet.",
  className,
}: {
  items: FeedItem[];
  /** The list's accessible name. */
  label: string;
  empty?: React.ReactNode;
  className?: string;
}) {
  if (items.length === 0) return <p className={cn("py-6 text-center text-sm text-bf-muted", className)}>{empty}</p>;
  return (
    <ul aria-label={label} className={cn("-mx-2", className)}>
      {items.map((it) => {
        const body = (
          <>
            {it.lead && <span className="mt-px shrink-0">{it.lead}</span>}
            <span className="min-w-0 flex-1 text-[13px] leading-5 text-bf-copy">{it.text}</span>
            {it.time && <span className="shrink-0 text-xs tabular-nums leading-5 text-bf-muted">{it.time}</span>}
          </>
        );
        const row = "flex items-start gap-2.5 rounded-lg px-2 py-1.5";
        return (
          <li key={it.key}>
            {it.href ? (
              <a href={it.href} className={cn(row, "transition-colors hover:bg-bf-surface-alt")}>
                {body}
              </a>
            ) : (
              <div className={row}>{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
