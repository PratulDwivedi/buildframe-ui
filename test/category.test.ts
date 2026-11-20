import { CATEGORY_COUNT, categoryOf, categoryStyle } from "../src/lib/category";

it("picks the same category for the same text, whatever its case or spacing", () => {
  expect(categoryOf("Riya Kapoor")).toBe(categoryOf("  riya kapoor "));
  expect(categoryOf("Riya Kapoor")).toBe(categoryOf("Riya Kapoor"));
});

it("stays inside 1 to the count, and spreads names across it", () => {
  const names = ["Riya Kapoor", "Arjun Mehta", "Meera Nair", "Kabir Rao", "Ananya Iyer", "Dev Malhotra", "Acme Store", "you@company.com", "", "Z"];
  const got = names.map(categoryOf);
  for (const n of got) {
    expect(n).toBeGreaterThanOrEqual(1);
    expect(n).toBeLessThanOrEqual(CATEGORY_COUNT);
  }
  expect(new Set(got).size).toBeGreaterThanOrEqual(4);
});

it("styles from the theme variables, never a hex, and wraps a number out of range", () => {
  expect(categoryStyle(3)).toEqual({ background: "var(--bf-cat-3-bg)", color: "var(--bf-cat-3-ink)" });
  expect(categoryStyle(CATEGORY_COUNT + 1)).toEqual(categoryStyle(1));
  expect(categoryStyle(0)).toEqual(categoryStyle(CATEGORY_COUNT));
});
