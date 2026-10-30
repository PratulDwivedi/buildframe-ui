/**
 * The arithmetic behind the dashboard pieces, kept free of React so a server page can use it too
 * (also exported from `@buildframe/ui/core`).
 */

/** How a figure moved against the period before: "up" / "down" with a whole percent, "same", "new" (nothing before) or "none" (nothing either side). */
export type PeriodChange =
  | { kind: "up" | "down"; pct: number }
  | { kind: "same" }
  | { kind: "new" }
  | { kind: "none" };

export function periodChange(now: number, before: number): PeriodChange {
  if (now === 0 && before === 0) return { kind: "none" };
  if (before === 0) return { kind: "new" };
  const pct = Math.round(((now - before) / Math.abs(before)) * 100);
  if (pct === 0) return { kind: "same" };
  return { kind: pct > 0 ? "up" : "down", pct: Math.abs(pct) };
}

/** One bar position: a label (usually a day) and a value per series key. */
export type SeriesPoint = { label: string; values: Record<string, number> };

/**
 * Sums consecutive points into groups of `size` (7 turns 90 days into 13 weeks), labelled by the group's first point.
 * A last, shorter group is kept. `size` of 1 or less returns the points unchanged.
 */
export function bucketSeries(points: SeriesPoint[], size: number): SeriesPoint[] {
  if (size <= 1) return points;
  const out: SeriesPoint[] = [];
  for (let i = 0; i < points.length; i += size) {
    const group = points.slice(i, i + size);
    const values: Record<string, number> = {};
    for (const p of group) for (const [k, v] of Object.entries(p.values)) values[k] = (values[k] ?? 0) + v;
    out.push({ label: group[0].label, values });
  }
  return out;
}

/** The allowed periods (days), the default first. Anything else in the URL falls back to the default. */
export function pickPeriod(raw: string | string[] | undefined | null, allowed: readonly number[] = [30, 7, 90]): number {
  const v = Number.parseInt(String(Array.isArray(raw) ? raw[0] : raw ?? ""), 10);
  return allowed.includes(v) ? v : allowed[0];
}
