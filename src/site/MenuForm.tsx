"use client";

import * as React from "react";
import { FormError, FormNotice } from "../primitives/Field";
import { Button } from "../primitives/Button";
import { Card } from "../primitives/Status";
import type { ComboOption } from "../combobox/Combobox";
import { PageSaveAction } from "../shell/PageSaveAction";
import { useHasPageHeader } from "../shell/page-header";
import { LinkRows } from "./LinkRows";
import { LINK_LIMITS, menuErrors, type NavLink } from "./links";
import { useFormSave } from "./useFormSave";

const clean = (rows: NavLink[]): NavLink[] => rows.map((r) => ({ label: r.label.trim(), href: r.href.trim() }));

/** A header menu: up to six links. The product supplies `linkOptions` (its pages for the picker) and `onSave`; Save sits in the page header when there is one. */
export function MenuForm({
  value,
  linkOptions,
  onSave,
  saveLabel = "Save menu",
  formId = "menu-form",
  max = LINK_LIMITS.menu,
}: {
  value: NavLink[];
  linkOptions: ComboOption[];
  onSave: (links: NavLink[]) => Promise<{ error: string | null }>;
  saveLabel?: string;
  formId?: string;
  max?: number;
}) {
  const inTopbar = useHasPageHeader();
  const [rows, setRows] = React.useState<NavLink[]>(value);
  const { errors, error, saved, pending, submit, touch } = useFormSave({ validate: () => menuErrors(clean(rows)), save: () => onSave(clean(rows)) });
  const change = (r: NavLink[]) => {
    touch();
    setRows(r);
  };
  return (
    <form id={formId} onSubmit={submit} noValidate className="space-y-4">
      {inTopbar ? <PageSaveAction formId={formId} label={saveLabel} pending={pending} saved={saved} /> : null}
      <Card className="space-y-4 p-5">
        <h2 className="text-sm font-semibold">Header links</h2>
        <LinkRows rows={rows} onChange={change} options={linkOptions} errors={errors} prefix="link" max={max} />
        {errors.links ? <p className="text-xs text-bf-danger-ink">{errors.links}</p> : null}
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
