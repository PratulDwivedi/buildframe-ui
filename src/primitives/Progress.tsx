import * as React from "react";
import { cn } from "../lib/cn";

/**
 * One measure from 0 to 100 as a bar (a sprint's points done, a project's items done). ShareBars compares rows
 * against each other; this is a single figure against its whole. `label` names it for screen readers.
 */
export type ProgressTone = "brand" | "ok" | "warn" | "bad" | "ai" | "off";

const FILL: Record<ProgressTone, string> = {
  brand: "bg-bf-brand",
  ok: "bg-bf-ok-ink",
  warn: "bg-bf-warn",
  bad: "bg-bf-danger",
  ai: "bg-bf-ai",
  off: "bg-bf-line-strong",
};

export function ProgressBar({
  value,
  label,
  tone = "brand",
  size = "md",
  showValue = false,
  className,
}: {
  value: number;
  label: string;
  tone?: ProgressTone;
  size?: "sm" | "md";
  /** Writes "45%" after the bar. */
  showValue?: boolean;
  className?: string;
}) {
  const pct = Number.isFinite(value) ? Math.round(Math.min(100, Math.max(0, value))) : 0;
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        className={cn("min-w-0 flex-1 overflow-hidden rounded-full bg-bf-surface-alt", size === "sm" ? "h-1.5" : "h-2")}
      >
        <div className={cn("h-full rounded-full transition-[width] duration-300", FILL[tone])} style={{ width: `${pct}%` }} />
      </div>
      {showValue && <span className="shrink-0 text-xs font-medium tabular-nums text-bf-muted">{pct}%</span>}
    </div>
  );
}
