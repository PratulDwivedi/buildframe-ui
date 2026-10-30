import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// tailwind-merge does not know the bf-* colour names, so without this it would treat
// `text-bf-muted` and `text-sm` as the same group and drop one of them.
const COLOURS = [
  "bf-canvas", "bf-surface", "bf-surface-alt", "bf-ink", "bf-copy", "bf-muted", "bf-line", "bf-line-strong",
  "bf-brand", "bf-brand-hover", "bf-brand-strong", "bf-brand-bg", "bf-on-brand", "bf-accent", "bf-accent-strong",
  "bf-on-accent", "bf-ai", "bf-ai-strong", "bf-ai-bg", "bf-ok-bg", "bf-ok-ink", "bf-warn-bg", "bf-warn-ink",
  "bf-warn-line", "bf-danger", "bf-danger-bg", "bf-danger-ink", "bf-danger-line", "bf-neutral-bg", "bf-neutral-ink",
  "bf-chart-1", "bf-chart-2", "bf-chart-3", "bf-chart-4", "bf-chart-5",
];

const merge = extendTailwindMerge({
  extend: { theme: { color: COLOURS } },
});

/** Joins class names; a later Tailwind class wins over an earlier one of the same kind. */
export function cn(...inputs: ClassValue[]) {
  return merge(clsx(inputs));
}
