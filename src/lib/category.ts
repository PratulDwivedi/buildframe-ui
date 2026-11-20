import type { CSSProperties } from "react";

/**
 * Category colours: a colour for identity, not meaning (a person's avatar, a project's mark). Six pairs of soft
 * background and text colour live in theme.css as --bf-cat-N-bg and --bf-cat-N-ink, light and dark, each pair
 * checked at 4.5:1. None is the assistant's violet or the brand blue.
 *
 * The colour is chosen at run time, so it is applied as a style from the variables, never as a class Tailwind
 * would have to see in the source.
 */
export const CATEGORY_COUNT = 6;

/** The same text always gets the same category, 1 to CATEGORY_COUNT. Case and outer spaces do not matter. */
export function categoryOf(text: string | null | undefined): number {
  const s = (text ?? "").trim().toLowerCase();
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return (h % CATEGORY_COUNT) + 1;
}

/** The style for a category. A number outside 1 to CATEGORY_COUNT wraps round. */
export function categoryStyle(n: number): CSSProperties {
  const c = ((((Math.trunc(n) || 0) - 1) % CATEGORY_COUNT) + CATEGORY_COUNT) % CATEGORY_COUNT + 1;
  return { background: `var(--bf-cat-${c}-bg)`, color: `var(--bf-cat-${c}-ink)` };
}
