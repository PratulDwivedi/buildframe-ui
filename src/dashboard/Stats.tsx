"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowDownRightIcon, ArrowUpRightIcon, MinusIcon } from "lucide-react";
import { cn } from "../lib/cn";
import { Card } from "../primitives/Status";
import { periodChange, type SeriesPoint } from "./series";

/**
 * Dashboard pieces (from buildframe_ecomm's dashboard): a stat tile with an icon and a change against the period
 * before, bars per day in plain CSS (nothing to load, a title on each bar for the exact figure), a share bar per
 * row, and the 7 / 30 / 90 day switch that writes `?days`.
 */

/** "12% vs the period before", up green, down red. `upIsGood` false flips the colours (errors, failures). */
export function Change({ now, before, upIsGood = true, className }: { now: number; before: number; upIsGood?: boolean; className?: string }) {
  const c = periodChange(now, before);
  if (c.kind === "none") return <span className={cn("text-xs text-bf-muted", className)}>no change</span>;
  if (c.kind === "new") return <span className={cn("text-xs text-bf-muted", className)}>none the period before</span>;
  if (c.kind === "same") {
    return (
      <span className={cn("inline-flex items-center gap-0.5 text-xs text-bf-muted", className)}>
        <MinusIcon className="size-3" /> same as the period before
      </span>
    );
  }
  const good = (c.kind === "up") === upIsGood;
  const Icon = c.kind === "up" ? ArrowUpRightIcon : ArrowDownRightIcon;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs", good ? "text-bf-ok-ink" : "text-bf-danger-ink", className)}>
      <Icon className="size-3" /> {c.pct}% vs the period before
    </span>
  );
}

export type StatTone = "brand" | "ok" | "warn" | "bad" | "ai" | "off";
const iconTones: Record<StatTone, string> = {
  brand: "bg-bf-brand-bg text-bf-brand-strong",
  ok: "bg-bf-ok-bg text-bf-ok-ink",
  warn: "bg-bf-warn-bg text-bf-warn-ink",
  bad: "bg-bf-danger-bg text-bf-danger-ink",
  ai: "bg-bf-ai-bg text-bf-ai-strong",
  off: "bg-bf-neutral-bg text-bf-neutral-ink",
};

/** One figure: an icon, its label, the value, then a change line or a footnote (or both). `href` makes it a link. */
export function StatTile({
  icon,
  label,
  value,
  change,
  foot,
  tone = "brand",
  href,
  className,
}: {
  icon?: React.ReactNode;
  label: string;
  value: React.ReactNode;
  change?: { now: number; before: number; upIsGood?: boolean };
  foot?: React.ReactNode;
  tone?: StatTone;
  href?: string;
  className?: string;
}) {
  const body = (
    <>
      <div className="flex items-center gap-2.5">
        {icon && <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg [&_svg]:size-4", iconTones[tone])}>{icon}</span>}
        <span className="text-[13px] font-medium text-bf-muted">{label}</span>
      </div>
      <p className="mt-3 text-2xl font-semibold tabular-nums text-bf-ink">{value}</p>
      {change && <Change className="mt-1" {...change} />}
      {foot && <p className="mt-1 text-xs text-bf-muted">{foot}</p>}
    </>
  );
  if (href) {
    return (
      <a href={href} className={cn("block rounded-2xl border border-bf-line bg-bf-surface p-4 transition-colors hover:border-bf-line-strong", className)}>
        {body}
      </a>
    );
  }
  return <Card className={cn("p-4", className)}>{body}</Card>;
}

/** A titled card for a dashboard section, with an optional action (a link) on the right of the title. */
export function DashCard({ title, action, children, className }: { title: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <Card className={cn("p-4 sm:p-5", className)}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-bf-ink">{title}</h2>
        {action}
      </div>
      {children}
    </Card>
  );
}

export type BarKey = { key: string; label: string; color?: string };
const CHART = ["var(--bf-chart-1)", "var(--bf-chart-3)", "var(--bf-chart-2)", "var(--bf-chart-4)", "var(--bf-chart-5)"];

/**
 * Bars per point, one bar per key side by side (credited and used, say). Each bar's title carries the exact figures.
 * `format` turns a value into text (money, credits). A legend shows when there is more than one key.
 */
export function BarSeries({
  points,
  keys,
  format = (v) => String(v),
  label,
  height = 144,
  className,
}: {
  points: SeriesPoint[];
  keys: BarKey[];
  format?: (v: number) => string;
  /** The accessible name of the chart. */
  label: string;
  height?: number;
  className?: string;
}) {
  const max = Math.max(1, ...points.flatMap((p) => keys.map((k) => p.values[k.key] ?? 0)));
  const colour = (i: number) => keys[i].color ?? CHART[i % CHART.length];
  return (
    <div className={className}>
      {keys.length > 1 && (
        <div className="mb-2 flex flex-wrap gap-3 text-xs text-bf-muted">
          {keys.map((k, i) => (
            <span key={k.key} className="inline-flex items-center gap-1.5">
              <span aria-hidden className="size-2.5 rounded-sm" style={{ background: colour(i) }} /> {k.label}
            </span>
          ))}
        </div>
      )}
      <div className="flex items-end gap-[3px]" style={{ height }} role="img" aria-label={label}>
        {points.map((p) => {
          const title = `${p.label}: ${keys.map((k) => `${k.label} ${format(p.values[k.key] ?? 0)}`).join(", ")}`;
          return (
            <div key={p.label} title={title} className="flex h-full min-w-[3px] flex-1 items-end gap-px">
              {keys.map((k, i) => {
                const v = p.values[k.key] ?? 0;
                return (
                  <div
                    key={k.key}
                    data-testid="bar"
                    className="flex-1 rounded-t-sm transition-opacity hover:opacity-80"
                    style={{ height: `${Math.max((v / max) * 100, v > 0 ? 4 : 1)}%`, background: colour(i), opacity: v > 0 ? 1 : 0.2 }}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
      {points.length > 0 && (
        <div className="mt-1.5 flex justify-between text-[11px] text-bf-muted">
          <span>{points[0].label}</span>
          <span>{points[points.length - 1].label}</span>
        </div>
      )}
    </div>
  );
}

/** Rows with a label, a value and a bar showing each row's share of the largest (credits per product, tenants per product). */
export function ShareBars({
  rows,
  format = (v) => String(v),
  className,
}: {
  rows: { key: string; label: React.ReactNode; value: number; note?: React.ReactNode }[];
  format?: (v: number) => string;
  className?: string;
}) {
  const max = Math.max(1, ...rows.map((r) => Math.abs(r.value)));
  return (
    <ul className={cn("space-y-3", className)}>
      {rows.map((r) => (
        <li key={r.key}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-bf-ink">{r.label}</span>
            <span className="shrink-0 tabular-nums font-medium text-bf-ink">{format(r.value)}</span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-bf-surface-alt">
            <div className="h-full rounded-full bg-bf-brand" style={{ width: `${Math.max((Math.abs(r.value) / max) * 100, r.value ? 2 : 0)}%` }} />
          </div>
          {r.note && <p className="mt-1 text-xs text-bf-muted">{r.note}</p>}
        </li>
      ))}
    </ul>
  );
}

/** The period switch. Writes `?days` (the default is left out of the URL) and keeps every other param. */
export function PeriodSwitch({ value, options = [7, 30, 90], defaultDays = 30 }: { value: number; options?: number[]; defaultDays?: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const current = useSearchParams();
  const set = (days: number) => {
    const next = new URLSearchParams(current?.toString() ?? "");
    if (days === defaultDays) next.delete("days");
    else next.set("days", String(days));
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };
  return (
    <div className="inline-flex rounded-lg border border-bf-line bg-bf-surface p-0.5" role="group" aria-label="Period">
      {options.map((d) => (
        <button
          key={d}
          type="button"
          onClick={() => set(d)}
          aria-pressed={value === d}
          className={cn(
            "rounded-md px-3 py-1 text-[13px] font-medium transition-colors",
            value === d ? "bg-bf-brand text-bf-on-brand" : "text-bf-copy hover:bg-bf-surface-alt",
          )}
        >
          {d} days
        </button>
      ))}
    </div>
  );
}
