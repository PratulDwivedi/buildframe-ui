import theme from "../src/theme.css?raw";
import family from "../src/family.css?raw";

/** family.css is only aliases: every one must point at a token that theme.css really defines, and none may carry its own value. */
const defined = new Set([...theme.matchAll(/(--bf-[\w-]+)\s*:/g)].map((m) => m[1]));
const aliases = [...family.matchAll(/^\s*(--[\w-]+)\s*:\s*([^;]+);/gm)].map((m) => ({ name: m[1], value: m[2].trim() }));

it("declares aliases", () => {
  expect(aliases.length).toBeGreaterThan(30);
});

it("gives every name once, and only as var(--bf-*)", () => {
  expect(new Set(aliases.map((a) => a.name)).size).toBe(aliases.length);
  for (const a of aliases) expect(a.value, a.name).toMatch(/^var\(--bf-[\w-]+\)$/);
});

it("points only at tokens theme.css defines", () => {
  for (const a of aliases) {
    const target = a.value.slice(4, -1);
    expect(defined.has(target), `${a.name} -> ${target}`).toBe(true);
  }
});
