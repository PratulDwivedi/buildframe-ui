"use client";

import * as React from "react";
import { ArrowDownIcon, ArrowUpIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { Button, IconButton } from "../primitives/Button";
import { Field, Input } from "../primitives/Field";
import { Combobox, type ComboOption } from "../combobox/Combobox";
import type { NavLink } from "./links";

/**
 * An editable list of links: the words, the address and, beside them, a picker of the product's own pages that fills both in. Rows can be moved
 * up and down and removed. `errors` is the form's error map and `prefix` the key stem the rows use ("link" for a menu, "group:0:link" for a
 * footer column), so each message lands on its own field. Phone-first: a row stacks on a narrow screen.
 */
export function LinkRows({
  rows,
  onChange,
  options,
  errors = {},
  prefix,
  max,
  addLabel = "Add a link",
}: {
  rows: NavLink[];
  onChange: (rows: NavLink[]) => void;
  options: ComboOption[];
  errors?: Record<string, string>;
  prefix: string;
  max: number;
  addLabel?: string;
}) {
  const patch = (i: number, p: Partial<NavLink>) => onChange(rows.map((r, k) => (k === i ? { ...r, ...p } : r)));
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= rows.length) return;
    const n = [...rows];
    [n[i], n[j]] = [n[j]!, n[i]!];
    onChange(n);
  };
  return (
    <div className="space-y-3">
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-1 gap-2 rounded-lg border border-bf-line p-3 sm:grid-cols-[1fr_1fr_11rem_auto] sm:items-start sm:border-0 sm:p-0">
          <Field label={i === 0 ? "Link text" : ""} error={errors[`${prefix}:${i}:label`]}>
            <Input aria-label="Link text" value={r.label} onChange={(e) => patch(i, { label: e.target.value })} maxLength={40} aria-invalid={errors[`${prefix}:${i}:label`] ? true : undefined} />
          </Field>
          <Field label={i === 0 ? "Address" : ""} error={errors[`${prefix}:${i}:href`]}>
            <Input aria-label="Address" value={r.href} onChange={(e) => patch(i, { href: e.target.value })} placeholder="/about or https://" maxLength={500} aria-invalid={errors[`${prefix}:${i}:href`] ? true : undefined} />
          </Field>
          <Field label={i === 0 ? "Or pick" : ""}>
            <Combobox
              aria-label="Or pick a page"
              value=""
              onChange={(v) => {
                const o = options.find((x) => x.value === v);
                if (o) patch(i, { href: o.value, label: r.label.trim() === "" ? o.label : r.label });
              }}
              options={options}
              placeholder="A page"
              clearable={false}
            />
          </Field>
          <div className={`flex items-center gap-1 ${i === 0 ? "sm:pt-[1.625rem]" : ""}`}>
            <IconButton icon={<ArrowUpIcon />} label="Move link up" disabled={i === 0} onClick={() => move(i, -1)} type="button" />
            <IconButton icon={<ArrowDownIcon />} label="Move link down" disabled={i === rows.length - 1} onClick={() => move(i, 1)} type="button" />
            <IconButton icon={<Trash2Icon />} label="Remove link" onClick={() => onChange(rows.filter((_, k) => k !== i))} type="button" />
          </div>
        </div>
      ))}
      <Button type="button" variant="secondary" size="sm" disabled={rows.length >= max} onClick={() => onChange([...rows, { label: "", href: "" }])}>
        <PlusIcon aria-hidden className="mr-1.5 size-4" />
        {addLabel}
      </Button>
    </div>
  );
}
