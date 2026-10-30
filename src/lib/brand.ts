/**
 * Runtime rebranding. A tenant picks hex colours (ecomm's Appearance screen); this turns them into
 * CSS that overrides the bf-* brand tokens, for light and dark. The text colour that sits on a fill
 * is chosen here for contrast. Only a six-digit hex is ever written into the page, so the output is
 * safe to put in a <style> tag.
 *
 * Ported from buildframe_ecomm lib/store/theme.ts, which does the same for its shadcn tokens.
 */

const HEX = /^#[0-9a-f]{6}$/i;

export const isHex = (v: unknown): v is string => typeof v === "string" && HEX.test(v);

function luminance(hex: string): number {
  const c = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

/** White or near-black, whichever reads better on `hex`. */
export const readableOn = (hex: string) => (luminance(hex) > 0.4 ? "#111111" : "#ffffff");

/** Mixes `hex` toward black (amount > 0) or white (amount < 0), 0..1. */
function shade(hex: string, amount: number): string {
  const target = amount > 0 ? 0 : 255;
  const t = Math.abs(amount);
  const out = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16);
    return Math.round(v + (target - v) * t).toString(16).padStart(2, "0");
  });
  return `#${out.join("")}`;
}

/** The brand as TEXT must clear 4.5:1 on the surface; darken (light theme) or lighten (dark) until it does. */
function textSafe(hex: string, surface: string, dir: 1 | -1): string {
  let c = hex;
  for (let i = 0; i < 12 && contrast(c, surface) < 4.5; i++) c = shade(c, 0.12 * dir);
  return c;
}

function vars(brand: string | undefined, accent: string | undefined, dark: boolean): string {
  let css = "";
  if (isHex(brand)) {
    const surface = dark ? "#111a2e" : "#ffffff";
    css +=
      `--bf-brand:${brand};--bf-on-brand:${readableOn(brand)};` +
      `--bf-brand-hover:${shade(brand, dark ? -0.15 : 0.18)};` +
      `--bf-brand-strong:${textSafe(brand, surface, dark ? -1 : 1)};` +
      `--bf-brand-bg:color-mix(in oklab, ${brand} ${dark ? 22 : 10}%, var(--bf-surface));`;
  }
  if (isHex(accent)) {
    const surface = dark ? "#111a2e" : "#ffffff";
    css += `--bf-accent:${accent};--bf-on-accent:${readableOn(accent)};--bf-accent-strong:${textSafe(accent, surface, dark ? -1 : 1)};`;
  }
  return css;
}

export type BrandColours = {
  /** The main brand colour (buttons, links, the active menu item). */
  brand?: string | null;
  /** The brand in dark mode, when it differs. */
  brandDark?: string | null;
  /** The second colour (highlights). */
  accent?: string | null;
};

/**
 * CSS for a <style> tag in <head>. The selector is repeated so it outranks theme.css's own light,
 * .dark and device-preference blocks whatever order the stylesheets load in. Returns "" when no
 * colour is valid, so the InsightUno defaults stand.
 */
export function brandCss({ brand, brandDark, accent }: BrandColours): string {
  const b = brand ?? undefined;
  const bd = isHex(brandDark) ? brandDark : b;
  const light = vars(b, accent ?? undefined, false);
  const dark = vars(bd, accent ?? undefined, true);
  let css = "";
  if (light) css += `:root:root:root{${light}}`;
  if (dark) {
    css += `:root.dark:root:root{${dark}}`;
    css += `@media (prefers-color-scheme:dark){:root[data-bf-theme="system"]:not(.light):root:root{${dark}}}`;
  }
  return css;
}
