"use client";

import * as React from "react";
import { useFlash } from "../lib/useFlash";

/**
 * The save flow every site editor shares: check first (`validate` answers the fields that are wrong, by name), then call the product's `save`,
 * show its error, and flash "saved" for a moment. `touch()` clears the saved flash when the person edits again.
 */
export function useFormSave({ validate, save }: { validate: () => Record<string, string>; save: () => Promise<{ error: string | null }> }) {
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [error, setError] = React.useState<string | null>(null);
  const [saved, flashSaved, clearSaved] = useFlash(3500);
  const [pending, start] = React.useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    start(async () => {
      const r = await save();
      if (r.error) setError(r.error);
      else flashSaved();
    });
  };
  return { errors, error, saved, pending, submit, touch: clearSaved };
}
