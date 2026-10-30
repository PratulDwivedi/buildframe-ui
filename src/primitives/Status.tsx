import * as React from "react";
import { cn } from "../lib/cn";

export type Tone = "ok" | "warn" | "bad" | "off" | "brand" | "ai";

const tones: Record<Tone, string> = {
  ok: "bg-bf-ok-bg text-bf-ok-ink",
  warn: "bg-bf-warn-bg text-bf-warn-ink",
  bad: "bg-bf-danger-bg text-bf-danger-ink",
  off: "bg-bf-neutral-bg text-bf-neutral-ink",
  brand: "bg-bf-brand-bg text-bf-brand-strong",
  ai: "bg-bf-ai-bg text-bf-ai-strong",
};

/** Status pill. Colour comes from the tone, never from the caller, so "Paid" looks the same everywhere. */
export function StatusPill({ tone, children, className }: { tone: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold", tones[tone], className)}>
      {children}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-md bg-bf-surface-alt", className)} />;
}

/** The empty list or empty page: a line of what is missing and, when it helps, the one action that fills it. */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-12 text-center", className)}>
      {icon && <div className="mb-3 grid size-11 place-items-center rounded-xl bg-bf-neutral-bg text-bf-muted [&_svg]:size-5">{icon}</div>}
      <p className="text-sm font-semibold text-bf-ink">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-bf-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** The one card shape, so a border, radius and background trio cannot drift apart. */
export function Card({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("rounded-2xl border border-bf-line bg-bf-surface", className)} {...rest}>
      {children}
    </div>
  );
}
