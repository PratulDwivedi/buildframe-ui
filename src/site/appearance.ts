// What a tenant's appearance is made of, and the checks on it. Pure (no React, no browser), so a server action can run the same
// checks the form runs. The product stores these fields wherever its settings live; this file only says what is valid.

import { isHex, type BrandColours } from "../lib/brand";

export const APPEARANCE_MODES = [
  { value: "system", label: "Follow the visitor's device" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
] as const;
export type AppearanceMode = (typeof APPEARANCE_MODES)[number]["value"];
export const isAppearanceMode = (v: unknown): v is AppearanceMode => APPEARANCE_MODES.some((m) => m.value === v);

export type AppearanceValue = {
  logoUrl: string;
  faviconUrl: string;
  /** Six-digit hex, or "" to keep the platform default. */
  brand: string;
  brandDark: string;
  accent: string;
  mode: AppearanceMode;
  /** Show the name beside the logo (off when the logo already holds the name). */
  showName: boolean;
  /** Show visitors the light or dark switch. */
  showToggle: boolean;
  /** Default pictures by slot name ("banner", "avatar"...): an https address or "". */
  images: Record<string, string>;
};

export const emptyAppearance = (): AppearanceValue => ({
  logoUrl: "",
  faviconUrl: "",
  brand: "",
  brandDark: "",
  accent: "",
  mode: "system",
  showName: true,
  showToggle: true,
  images: {},
});

const https = (v: string) => v === "" || (/^https:\/\/[^\s"'<>]+$/.test(v) && v.length <= 2000);
const colour = (v: string) => v === "" || isHex(v);

/** The fields that are wrong, by name ("brand", "logoUrl", "image:home"), each with a message for the person. Empty when all is well. */
export function appearanceErrors(v: AppearanceValue): Record<string, string> {
  const e: Record<string, string> = {};
  if (!colour(v.brand)) e.brand = "Use a colour like #1e40af, or leave it blank";
  if (!colour(v.brandDark)) e.brandDark = "Use a colour like #93c5fd, or leave it blank";
  if (!colour(v.accent)) e.accent = "Use a colour like #facc15, or leave it blank";
  if (!isAppearanceMode(v.mode)) e.mode = "Choose light, dark or the visitor's device";
  if (!https(v.logoUrl)) e.logoUrl = "The logo must be uploaded here, not a web link";
  if (!https(v.faviconUrl)) e.faviconUrl = "The favicon must be uploaded here, not a web link";
  for (const [slot, url] of Object.entries(v.images)) if (!https(url)) e[`image:${slot}`] = "That picture must be uploaded here, not a web link";
  return e;
}

/** The colours as `brandCss` wants them: a blank or bad colour is null, so the platform default stays. */
export function brandFromAppearance(v: Pick<AppearanceValue, "brand" | "brandDark" | "accent">): Required<{ [K in keyof BrandColours]: string | null }> {
  const hex = (s: string) => (isHex(s) ? s : null);
  return { brand: hex(v.brand), brandDark: hex(v.brandDark), accent: hex(v.accent) };
}
