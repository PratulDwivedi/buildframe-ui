import { appearanceErrors, brandFromAppearance, emptyAppearance, type AppearanceValue } from "../src/site/appearance";
import { themeInitScript } from "../src/theme/init";

const ok = (over: Partial<AppearanceValue> = {}): AppearanceValue => ({ ...emptyAppearance(), ...over });

describe("appearanceErrors", () => {
  it("accepts an empty appearance (every colour blank keeps the platform default)", () => {
    expect(appearanceErrors(emptyAppearance())).toEqual({});
  });
  it("accepts six-digit hex colours in either case", () => {
    expect(appearanceErrors(ok({ brand: "#1E40AF", brandDark: "#93c5fd", accent: "#facc15" }))).toEqual({});
  });
  it("refuses a colour that is not a six-digit hex, naming the field", () => {
    const e = appearanceErrors(ok({ brand: "blue", brandDark: "#fff", accent: "red;}" }));
    expect(Object.keys(e).sort()).toEqual(["accent", "brand", "brandDark"]);
  });
  it("refuses an unknown mode", () => {
    expect(appearanceErrors(ok({ mode: "sepia" as never })).mode).toBeTruthy();
  });
  it("takes only https addresses for the logo, the favicon and the default pictures", () => {
    expect(appearanceErrors(ok({ logoUrl: "https://cdn.example/logo.png", faviconUrl: "https://cdn.example/f.png", images: { home: "https://cdn.example/h.jpg" } }))).toEqual({});
    const e = appearanceErrors(ok({ logoUrl: "http://cdn.example/logo.png", faviconUrl: "javascript:alert(1)", images: { home: "data:image/png;base64,AAAA" } }));
    expect(Object.keys(e).sort()).toEqual(["faviconUrl", "image:home", "logoUrl"]);
  });
});

describe("brandFromAppearance", () => {
  it("returns null for a blank or bad colour so the platform default stays", () => {
    expect(brandFromAppearance(ok({ brand: "", brandDark: "nope", accent: "#facc15" }))).toEqual({ brand: null, brandDark: null, accent: "#facc15" });
  });
});

describe("themeInitScript with a default mode", () => {
  const run = (script: string, stored: string | null, prefersDark: boolean) => {
    document.documentElement.className = "";
    const ls = { getItem: () => stored };
    const mm = () => ({ matches: prefersDark });
    new Function("localStorage", "matchMedia", script)(ls, mm);
    return document.documentElement.classList.contains("dark");
  };
  it("keeps today's behaviour with no default: dark only when the visitor chose dark", () => {
    const s = themeInitScript("k");
    expect(run(s, "dark", false)).toBe(true);
    expect(run(s, null, true)).toBe(false);
    expect(run(s, "light", true)).toBe(false);
  });
  it("default dark applies until the visitor chooses light", () => {
    const s = themeInitScript("k", "dark");
    expect(run(s, null, false)).toBe(true);
    expect(run(s, "light", false)).toBe(false);
    expect(run(s, "dark", false)).toBe(true);
  });
  it("default system follows the device until the visitor chooses", () => {
    const s = themeInitScript("k", "system");
    expect(run(s, null, true)).toBe(true);
    expect(run(s, null, false)).toBe(false);
    expect(run(s, "light", true)).toBe(false);
    expect(run(s, "dark", false)).toBe(true);
  });
  it("default light is the old behaviour", () => {
    const s = themeInitScript("k", "light");
    expect(run(s, null, true)).toBe(false);
  });
  it("refuses a default that is not one of the three", () => {
    expect(() => themeInitScript("k", "x');alert(1);('" as never)).toThrow();
  });
});
