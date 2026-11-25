"use client";

import * as React from "react";
import { Field, Input } from "../primitives/Field";
import { isHex } from "../lib/brand";

/** A colour as the person thinks of it: a picker and the hex beside it. Blank is allowed and means "keep the default". */
export function ColorField({ id, label, hint, value, error, onChange }: { id: string; label: string; hint?: string; value: string; error?: string | null; onChange: (v: string) => void }) {
  return (
    <Field label={label} htmlFor={id} hint={hint} error={error}>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={`${label} picker`}
          value={isHex(value) ? value : "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="size-10 shrink-0 cursor-pointer rounded-lg border border-bf-line bg-transparent p-0.5"
        />
        <Input id={id} value={value} onChange={(e) => onChange(e.target.value.trim())} placeholder="#1e40af" maxLength={7} aria-invalid={error ? true : undefined} className="font-mono" />
      </div>
    </Field>
  );
}
