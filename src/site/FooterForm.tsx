"use client";

import * as React from "react";
import { ArrowDownIcon, ArrowUpIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { Button, IconButton } from "../primitives/Button";
import { Field, FormError, FormNotice, Input, Textarea } from "../primitives/Field";
import { Card } from "../primitives/Status";
import { Combobox, type ComboOption } from "../combobox/Combobox";
import { PageSaveAction } from "../shell/PageSaveAction";
import { useHasPageHeader } from "../shell/page-header";
import { LinkRows } from "./LinkRows";
import { footerErrors, LINK_LIMITS, SOCIAL_NETWORKS, type FooterGroup, type FooterValue, type SocialLink, type SocialNetwork } from "./links";
import { useFormSave } from "./useFormSave";

const NETWORK_OPTIONS: ComboOption[] = SOCIAL_NETWORKS.map((n) => ({ value: n.value, label: n.label }));

const clean = (f: FooterValue): FooterValue => ({
  about: f.about.trim(),
  closing: f.closing.trim(),
  groups: f.groups.map((g) => ({ title: g.title.trim(), links: g.links.map((l) => ({ label: l.label.trim(), href: l.href.trim() })) })),
  social: f.social.map((s) => ({ network: s.network, url: s.url.trim() })),
});

/**
 * A footer: the text under the logo, the closing line, up to five columns of up to twelve links, and social links. The product supplies
 * `linkOptions` (its pages for the picker) and `onSave`. Phone numbers and WhatsApp addresses are refused (see `hrefError`). Save sits in the
 * page header when there is one (`PageSaveAction`).
 */
export function FooterForm({
  value,
  linkOptions,
  onSave,
  saveLabel = "Save footer",
  formId = "footer-form",
}: {
  value: FooterValue;
  linkOptions: ComboOption[];
  onSave: (f: FooterValue) => Promise<{ error: string | null }>;
  saveLabel?: string;
  formId?: string;
}) {
  const inTopbar = useHasPageHeader();
  const [f, setF] = React.useState<FooterValue>(value);
  const { errors, error, saved, pending, submit, touch } = useFormSave({ validate: () => footerErrors(clean(f)), save: () => onSave(clean(f)) });
  const set = (p: Partial<FooterValue>) => {
    touch();
    setF((x) => ({ ...x, ...p }));
  };
  const setGroups = (groups: FooterGroup[]) => set({ groups });
  const patchGroup = (i: number, p: Partial<FooterGroup>) => setGroups(f.groups.map((g, k) => (k === i ? { ...g, ...p } : g)));
  const moveGroup = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= f.groups.length) return;
    const n = [...f.groups];
    [n[i], n[j]] = [n[j]!, n[i]!];
    setGroups(n);
  };
  const setSocial = (social: SocialLink[]) => set({ social });
  const patchSocial = (i: number, p: Partial<SocialLink>) => setSocial(f.social.map((s, k) => (k === i ? { ...s, ...p } : s)));
  const nextNetwork = (): SocialNetwork => SOCIAL_NETWORKS.find((n) => !f.social.some((s) => s.network === n.value))?.value ?? "instagram";

  return (
    <form id={formId} onSubmit={submit} noValidate className="space-y-4">
      {inTopbar ? <PageSaveAction formId={formId} label={saveLabel} pending={pending} saved={saved} /> : null}

      <Card className="space-y-5 p-5">
        <h2 className="text-sm font-semibold">About text and closing line</h2>
        <Field label="Text under the logo" htmlFor="ft-about" hint="A short line about you. Blank uses your tagline." error={errors.about}>
          <Textarea id="ft-about" rows={3} value={f.about} onChange={(e) => set({ about: e.target.value })} maxLength={LINK_LIMITS.about} />
        </Field>
        <Field label="Closing line" htmlFor="ft-closing" hint="Blank shows the year, your name and All rights reserved." error={errors.closing}>
          <Input id="ft-closing" value={f.closing} onChange={(e) => set({ closing: e.target.value })} maxLength={LINK_LIMITS.closing} />
        </Field>
      </Card>

      <Card className="space-y-4 p-5">
        <div>
          <h2 className="text-sm font-semibold">Link columns</h2>
          <p className="mt-1 text-xs text-bf-muted">Up to {LINK_LIMITS.groups} columns of up to {LINK_LIMITS.groupLinks} links. Link to a page of your site or any https address.</p>
        </div>
        {f.groups.map((g, i) => (
          <div key={i} className="space-y-3 rounded-xl border border-bf-line p-4">
            <div className="flex items-start gap-2">
              <Field label="Column title" className="flex-1" error={errors[`group:${i}:title`]}>
                <Input aria-label="Column title" value={g.title} onChange={(e) => patchGroup(i, { title: e.target.value })} maxLength={LINK_LIMITS.title} aria-invalid={errors[`group:${i}:title`] ? true : undefined} />
              </Field>
              <div className="flex items-center gap-1 pt-[1.625rem]">
                <IconButton icon={<ArrowUpIcon />} label="Move column up" disabled={i === 0} onClick={() => moveGroup(i, -1)} type="button" />
                <IconButton icon={<ArrowDownIcon />} label="Move column down" disabled={i === f.groups.length - 1} onClick={() => moveGroup(i, 1)} type="button" />
                <IconButton icon={<Trash2Icon />} label="Remove column" onClick={() => setGroups(f.groups.filter((_, k) => k !== i))} type="button" />
              </div>
            </div>
            <LinkRows rows={g.links} onChange={(links) => patchGroup(i, { links })} options={linkOptions} errors={errors} prefix={`group:${i}:link`} max={LINK_LIMITS.groupLinks} />
            {errors[`group:${i}:links`] ? <p className="text-xs text-bf-danger-ink">{errors[`group:${i}:links`]}</p> : null}
          </div>
        ))}
        {errors.groups ? <p className="text-xs text-bf-danger-ink">{errors.groups}</p> : null}
        <Button type="button" variant="secondary" size="sm" disabled={f.groups.length >= LINK_LIMITS.groups} onClick={() => setGroups([...f.groups, { title: "", links: [] }])}>
          <PlusIcon aria-hidden className="mr-1.5 size-4" />
          Add a column
        </Button>
      </Card>

      <Card className="space-y-4 p-5">
        <div>
          <h2 className="text-sm font-semibold">Social links</h2>
          <p className="mt-1 text-xs text-bf-muted">The round icons under your name. Use the full https address of your page, one for each network.</p>
        </div>
        {f.social.map((s, i) => (
          <div key={i} className="grid grid-cols-1 gap-2 sm:grid-cols-[11rem_1fr_auto] sm:items-start">
            <Combobox aria-label="Network" required value={s.network} onChange={(v) => patchSocial(i, { network: v as SocialNetwork })} options={NETWORK_OPTIONS} />
            <Field label="" error={errors[`social:${i}`]}>
              <Input aria-label="Social address" value={s.url} onChange={(e) => patchSocial(i, { url: e.target.value })} placeholder="https://www.instagram.com/yourpage" maxLength={500} aria-invalid={errors[`social:${i}`] ? true : undefined} />
            </Field>
            <IconButton icon={<Trash2Icon />} label="Remove social link" onClick={() => setSocial(f.social.filter((_, k) => k !== i))} type="button" />
          </div>
        ))}
        {errors.social ? <p className="text-xs text-bf-danger-ink">{errors.social}</p> : null}
        <Button type="button" variant="secondary" size="sm" disabled={f.social.length >= LINK_LIMITS.social} onClick={() => setSocial([...f.social, { network: nextNetwork(), url: "" }])}>
          <PlusIcon aria-hidden className="mr-1.5 size-4" />
          Add a social link
        </Button>
      </Card>

      <FormError message={error} />
      {saved ? <FormNotice message="Saved. Visitors see it on the next page load." /> : null}
      {inTopbar ? null : (
        <Button type="submit" variant="primary" pending={pending}>
          {saveLabel}
        </Button>
      )}
    </form>
  );
}
