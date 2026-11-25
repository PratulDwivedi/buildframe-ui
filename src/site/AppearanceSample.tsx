import * as React from "react";
import { isHex, readableOn } from "../lib/brand";
import type { AppearanceValue } from "./appearance";

/** A small preview of the tenant's choices: the logo and name, and the primary, dark-mode and accent colours with the text each carries. */
export function AppearanceSample({ value, name }: { value: Pick<AppearanceValue, "logoUrl" | "brand" | "brandDark" | "accent" | "showName">; name: string }) {
  const chip = (hex: string, label: string) =>
    isHex(hex) ? (
      <span key={label} className="rounded-full px-4 py-1.5 text-sm font-medium" style={{ background: hex, color: readableOn(hex) }}>
        {label}
      </span>
    ) : null;
  const chips = [chip(value.brand, "Primary button"), chip(value.brandDark || value.brand, "In dark mode"), chip(value.accent, "Accent")].filter(Boolean);
  return (
    <div data-sample className="space-y-3 rounded-xl border border-bf-line bg-bf-surface-alt p-4">
      <div className="flex items-center gap-3">
        {value.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- a tenant's own upload, shown as a preview
          <img src={value.logoUrl} alt="" className={value.showName ? "h-9 w-auto max-w-[120px] object-contain" : "h-12 w-auto max-w-[200px] object-contain"} />
        ) : (
          <span aria-hidden className="grid size-9 place-items-center rounded-lg bg-bf-brand font-semibold text-bf-on-brand">
            {name.trim().charAt(0).toUpperCase()}
          </span>
        )}
        {value.showName || !value.logoUrl ? <span className="truncate font-semibold">{name}</span> : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {chips.length > 0 ? chips : <span className="text-xs text-bf-muted">Blank colours keep the platform defaults.</span>}
      </div>
    </div>
  );
}
