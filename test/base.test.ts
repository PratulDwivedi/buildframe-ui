import { readFileSync } from "node:fs";

const base = readFileSync("src/base.css", "utf8");
const theme = readFileSync("src/theme.css", "utf8");
const pkg = JSON.parse(readFileSync("package.json", "utf8"));

it("is an entry point of the package", () => {
  expect(pkg.exports["./base.css"]).toBe("./src/base.css");
});

it("maps the family's three font variables and falls back to system fonts", () => {
  for (const v of ["--font-jakarta", "--font-grotesk", "--font-mono-code"]) expect(base).toContain(`var(${v})`);
  expect(base).toMatch(/--font-sans:[^;]*system-ui/);
});

it("takes every colour from a token theme.css defines, never a hex", () => {
  expect(base).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  for (const m of base.matchAll(/var\((--bf-[\w-]+)\)/g)) expect(theme, m[1]).toContain(`${m[1]}:`);
});

it("honours reduced motion", () => {
  expect(base).toContain("prefers-reduced-motion: reduce");
});
