"use client";

import * as React from "react";
import { Button } from "../primitives/Button";
import { Field, FormError, Input } from "../primitives/Field";
import { MIN_PASSWORD, passwordProblem, type AuthResult } from "./forms";

/** Someone with no account joins from an invitation: a name and a password. The product's action does the rest. */
export function InviteNewAccountForm({
  email,
  onSubmit,
  onDone,
  submitLabel = "Join the team",
}: {
  email: string;
  onSubmit: (v: { fullName: string; password: string }) => Promise<AuthResult>;
  onDone: () => void;
  submitLabel?: string;
}) {
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const fullName = String(fd.get("full_name") ?? "").trim();
        const password = String(fd.get("password") ?? "");
        const problem = !fullName ? "Enter your name." : passwordProblem(password, String(fd.get("confirm") ?? ""));
        if (problem) return setError(problem);
        setError(null);
        startTransition(async () => {
          const r = await onSubmit({ fullName, password });
          if (!r.ok) return setError(r.message);
          onDone();
        });
      }}
      className="space-y-4"
    >
      <p className="text-sm text-bf-muted">
        Email <span className="font-semibold break-all text-bf-ink">{email}</span>
      </p>
      <Field label="Your name" htmlFor="bf-invite-name">
        <Input id="bf-invite-name" name="full_name" required maxLength={120} autoComplete="name" className="h-11" disabled={pending} />
      </Field>
      <Field label="New password" htmlFor="bf-invite-password">
        <Input id="bf-invite-password" name="password" type="password" required minLength={MIN_PASSWORD} autoComplete="new-password" placeholder={`At least ${MIN_PASSWORD} characters`} className="h-11" disabled={pending} />
      </Field>
      <Field label="Confirm password" htmlFor="bf-invite-confirm">
        <Input id="bf-invite-confirm" name="confirm" type="password" required minLength={MIN_PASSWORD} autoComplete="new-password" placeholder="Type it again" className="h-11" disabled={pending} />
      </Field>
      <FormError message={error} />
      <Button type="submit" variant="primary" className="h-11 w-full" pending={pending}>
        {pending ? "Joining…" : submitLabel}
      </Button>
    </form>
  );
}

/** Someone already signed in as the invited address: one button. */
export function InviteAcceptButton({
  onAccept,
  onDone,
  label = "Accept invitation",
}: {
  onAccept: () => Promise<AuthResult>;
  onDone: () => void;
  label?: string;
}) {
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();
  return (
    <div className="space-y-3">
      <FormError message={error} />
      <Button
        type="button"
        variant="primary"
        className="h-11 w-full"
        pending={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const r = await onAccept();
            if (!r.ok) return setError(r.message);
            onDone();
          });
        }}
      >
        {pending ? "Joining…" : label}
      </Button>
    </div>
  );
}
