"use client";

import * as React from "react";
import { Button } from "../primitives/Button";
import { Checkbox, Field, FormError, FormNotice } from "../primitives/Field";
import { Card } from "../primitives/Status";
import { Combobox } from "../combobox/Combobox";
import { ColorField } from "./ColorField";
import { AppearanceSample } from "./AppearanceSample";
import { APPEARANCE_MODES, appearanceErrors, type AppearanceMode, type AppearanceValue } from "./appearance";

export type ImageSlot = {
  /** "logo", "favicon", or a default picture's slot name. */
  key: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (url: string) => void;
};
export type PictureSlot = { key: string; label: string; hint?: string };

/**
 * A tenant's Appearance screen: logo, favicon, colours, default mode, two switches and default pictures, with a live sample. The product
 * supplies what is its own: `onSave` (its server action, answering `{ error }`) and `renderImage` (its picture upload, because where
 * pictures go differs by product). The same checks as `appearanceErrors` run before `onSave` is called.
 */
export function AppearanceForm({
  value,
  name,
  pictureSlots = [],
  onSave,
  renderImage,
  saveLabel = "Save appearance",
}: {
  value: AppearanceValue;
  /** The tenant's name, for the sample. */
  name: string;
  pictureSlots?: PictureSlot[];
  onSave: (v: AppearanceValue) => Promise<{ error: string | null }>;
  renderImage: (slot: ImageSlot) => React.ReactNode;
  saveLabel?: string;
}) {
  const [f, setF] = React.useState<AppearanceValue>(value);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [error, setError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);
  const [pending, start] = React.useTransition();

  const set = <K extends keyof AppearanceValue>(k: K, v: AppearanceValue[K]) => {
    setSaved(false);
    setF((x) => ({ ...x, [k]: v }));
  };

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const found = appearanceErrors(f);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    start(async () => {
      const r = await onSave(f);
      if (r.error) setError(r.error);
      else setSaved(true);
    });
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-5 p-5">
          <h2 className="text-sm font-semibold">Brand</h2>
          <Field label="Logo" hint="PNG, JPEG or WebP. Shown in the header and the console." error={errors.logoUrl}>
            {renderImage({ key: "logo", label: "Logo", value: f.logoUrl, onChange: (u) => set("logoUrl", u) })}
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={f.showName} onChange={(e) => set("showName", e.target.checked)} />
            Show the name beside the logo
          </label>
          <Field label="Favicon" hint="The small icon in the browser tab. Square works best." error={errors.faviconUrl}>
            {renderImage({ key: "favicon", label: "Favicon", value: f.faviconUrl, onChange: (u) => set("faviconUrl", u) })}
          </Field>
        </Card>

        <Card className="space-y-5 p-5">
          <h2 className="text-sm font-semibold">Colours and mode</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <ColorField id="ap-brand" label="Primary colour" hint="Buttons, links and highlights." value={f.brand} error={errors.brand} onChange={(v) => set("brand", v)} />
            <ColorField id="ap-brand-dark" label="Primary in dark mode" hint="Optional. Blank uses the primary." value={f.brandDark} error={errors.brandDark} onChange={(v) => set("brandDark", v)} />
            <ColorField id="ap-accent" label="Accent colour" hint="Badges and small highlights." value={f.accent} error={errors.accent} onChange={(v) => set("accent", v)} />
          </div>
          <AppearanceSample value={f} name={name} />
          <Field label="Default mode" htmlFor="ap-mode" hint="What a first-time visitor sees. A visitor who switches keeps their own choice." error={errors.mode}>
            <Combobox id="ap-mode" required value={f.mode} onChange={(v) => set("mode", v as AppearanceMode)} options={APPEARANCE_MODES.map((m) => ({ value: m.value, label: m.label }))} />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={f.showToggle} onChange={(e) => set("showToggle", e.target.checked)} />
            Show visitors the light and dark switch
          </label>
        </Card>

        {pictureSlots.length > 0 ? (
          <Card className="space-y-5 p-5 lg:col-span-2">
            <div>
              <h2 className="text-sm font-semibold">Default pictures</h2>
              <p className="mt-1 text-xs text-bf-muted">Shown wherever the real picture is missing, so a page never has an empty box.</p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {pictureSlots.map((s) => (
                <Field key={s.key} label={s.label} hint={s.hint} error={errors[`image:${s.key}`]}>
                  {renderImage({ ...s, value: f.images[s.key] ?? "", onChange: (u) => set("images", { ...f.images, [s.key]: u }) })}
                </Field>
              ))}
            </div>
          </Card>
        ) : null}
      </div>

      <FormError message={error} />
      {saved ? <FormNotice message="Saved. Visitors see it on the next page load." /> : null}
      <Button type="submit" variant="primary" pending={pending}>
        {saveLabel}
      </Button>
    </form>
  );
}
