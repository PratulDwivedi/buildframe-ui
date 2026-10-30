import { brandCss, readableOn } from "../src/lib/brand";

it("writes nothing for missing or unsafe colours", () => {
  expect(brandCss({})).toBe("");
  expect(brandCss({ brand: "red;}body{display:none" })).toBe("");
});

it("writes light and dark brand tokens for a valid hex", () => {
  const css = brandCss({ brand: "#e11d48", accent: "#facc15" });
  expect(css).toContain(":root:root:root{--bf-brand:#e11d48;");
  expect(css).toContain(":root.dark:root:root{");
  expect(css).toContain("--bf-accent:#facc15;--bf-on-accent:#111111");
});

it("picks readable text on a fill", () => {
  expect(readableOn("#ffffff")).toBe("#111111");
  expect(readableOn("#1554d1")).toBe("#ffffff");
});
