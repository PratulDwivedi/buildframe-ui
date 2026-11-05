import css from "../src/theme.css?raw";

/**
 * Guards the standard theme (docs/theme-standard.md). Reads src/theme.css as text, so it needs no browser.
 *  1. The two dark sets (`:root.dark` and the device-follows-system block) must stay identical.
 *  2. Every text pair keeps WCAG AA (4.5:1) in light and dark.
 */
function blockAfter(marker: string): string {
  const start = css.indexOf(marker);
  if (start < 0) throw new Error(`theme.css has no block starting ${marker}`);
  const open = css.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === "{") depth++;
    else if (css[i] === "}" && --depth === 0) return css.slice(open + 1, i);
  }
  throw new Error(`theme.css block ${marker} is not closed`);
}

function declarations(block: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of block.matchAll(/(--bf-[\w-]+)\s*:\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
}

const light = declarations(blockAfter(":root {"));
const dark = declarations(blockAfter(":root.dark {"));
const system = declarations(blockAfter(':root[data-bf-theme="system"]:not(.light) {'));

const channel = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
function luminance(hex: string): number {
  const n = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => channel(parseInt(n.slice(i, i + 2), 16) / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function ratio(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

it("keeps the dark set and the follow-the-device set identical", () => {
  expect(system).toEqual(dark);
});

// [text token, background token]. Fills such as --bf-accent and hairlines such as --bf-line are decorative and not listed.
const TEXT_PAIRS: Array<[string, string]> = [
  ["copy", "canvas"], ["copy", "surface"], ["ink", "canvas"],
  ["muted", "canvas"], ["muted", "surface"], ["muted", "surface-alt"],
  ["brand-strong", "canvas"], ["brand-strong", "surface"], ["brand-strong", "brand-bg"],
  ["on-brand", "brand"], ["on-brand", "brand-hover"], ["on-accent", "accent"],
  ["accent-strong", "canvas"], ["accent-strong", "surface"],
  ["ai-strong", "canvas"], ["ai-strong", "ai-bg"],
  ["ok-ink", "canvas"], ["ok-ink", "ok-bg"],
  ["warn-ink", "warn-bg"], ["danger-ink", "danger-bg"], ["neutral-ink", "neutral-bg"],
];

describe.each([
  ["light", light],
  ["dark", { ...light, ...dark }],
] as const)("text contrast, %s", (_mode, tokens) => {
  it.each(TEXT_PAIRS)("--bf-%s on --bf-%s is at least 4.5:1", (fg, bg) => {
    const a = tokens[`--bf-${fg}`];
    const b = tokens[`--bf-${bg}`];
    expect(a, `--bf-${fg} is a hex colour`).toMatch(/^#[0-9a-f]{6}$/i);
    expect(b, `--bf-${bg} is a hex colour`).toMatch(/^#[0-9a-f]{6}$/i);
    expect(ratio(a, b)).toBeGreaterThanOrEqual(4.5);
  });
});
