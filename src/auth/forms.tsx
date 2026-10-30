"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon, KeyRoundIcon, MailIcon } from "lucide-react";
import { Button } from "../primitives/Button";
import { Field, FormError, FormNotice, Input } from "../primitives/Field";
import { GoogleButton, CheckEmail, type GoogleStart } from "./AuthShell";

/**
 * The signed-out forms every product shares. They take their actions as props (server actions or client calls),
 * so a product keeps its own auth calls, routes and wording; the forms own the fields, states and messages.
 * Ported from buildframe_ecomm's AdminLoginForm (password or emailed code) and insightuno's login, forgot, reset,
 * sign-up and change-password forms.
 */

export type AuthResult = { ok: true } | { ok: false; message: string };

const wide = "h-11 w-full";

/* ── sign in ──────────────────────────────────────────────────────────────────────────────────────── */

export function SignInForm({
  password,
  code,
  googleHref,
  google,
  forgotHref,
  next,
  onSuccess,
  emailLabel = "Email",
  emailPlaceholder = "you@company.com",
  notice,
  error: outerError,
}: {
  /** Password sign-in. Leave out for a code-only form. */
  password?: (email: string, password: string) => Promise<AuthResult>;
  /** Emailed one-time code: ask for it, then check it. */
  code?: { request: (email: string) => Promise<AuthResult>; verify: (email: string, code: string) => Promise<AuthResult> };
  /** Shows "Continue with Google" linking here. */
  googleHref?: string;
  /** Or Google started by a server action. */
  google?: GoogleStart;
  forgotHref?: string;
  /** Where to go after signing in (already checked as same-site by the page, see safeNext). */
  next?: string;
  /** Instead of going to `next`. */
  onSuccess?: () => void;
  emailLabel?: string;
  emailPlaceholder?: string;
  /** A message from the URL, e.g. "Email confirmed. Sign in to continue." */
  notice?: string | null;
  /** An error from the URL, e.g. a failed Google sign-in. Look it up, never show free text from a link. */
  error?: string | null;
}) {
  const router = useRouter();
  const [mode, setMode] = React.useState<"password" | "code">(password ? "password" : "code");
  const [awaitingCode, setAwaitingCode] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [pass, setPass] = React.useState("");
  const [otp, setOtp] = React.useState("");
  // An error from this form's own attempt; the one carried in on the link shows at the top until then.
  const [error, setError] = React.useState<string | null>(null);
  const [tried, setTried] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  const done = () => {
    if (onSuccess) onSuccess();
    else {
      router.replace(next ?? "/");
      router.refresh();
    }
  };

  const run = (fn: () => Promise<AuthResult>, then: () => void) => {
    setError(null);
    setTried(true);
    startTransition(async () => {
      const r = await fn();
      if (r.ok) then();
      else setError(r.message);
    });
  };

  function switchMode(to: "password" | "code") {
    setMode(to);
    setError(null);
    setAwaitingCode(false);
    setOtp("");
  }

  const errorId = "bf-signin-error";
  const described = error ? errorId : undefined;
  const emailField = (
    <Field label={emailLabel} htmlFor="bf-email">
      <Input
        id="bf-email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        autoFocus
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={emailPlaceholder}
        className="h-11"
        aria-invalid={!!error}
        aria-describedby={described}
        disabled={pending}
      />
    </Field>
  );
  const errorNode = error && (
    <p id={errorId} role="alert" className="rounded-lg border border-bf-danger-line bg-bf-danger-bg px-3 py-2 text-sm text-bf-danger-ink">
      {error}
    </p>
  );
  const switcher = (to: "password" | "code", label: string) => (
    <button type="button" onClick={() => switchMode(to)} className="mx-auto block text-xs text-bf-muted underline underline-offset-4 hover:text-bf-ink">
      {label}
    </button>
  );

  return (
    <div>
      <FormNotice message={notice} className="mb-5" />
      {!tried && <FormError message={outerError} className="mb-5" />}
      {(google || googleHref) && !awaitingCode && <GoogleButton start={google} href={googleHref} />}

      {mode === "code" && awaitingCode && code ? (
        <form onSubmit={(e) => (e.preventDefault(), run(() => code.verify(email, otp), done))} className="space-y-4">
          <Field label="Six-digit code" htmlFor="bf-code" hint={`Sent to ${email} if that address has an account.`}>
            <Input
              id="bf-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={6}
              required
              autoFocus
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              placeholder="123456"
              className="h-11 text-center text-lg tracking-[0.4em]"
              aria-invalid={!!error}
              aria-describedby={described}
              disabled={pending}
            />
          </Field>
          {errorNode}
          <Button type="submit" variant="primary" className={wide} pending={pending}>
            {pending ? "Checking…" : "Sign in"}
          </Button>
          <button
            type="button"
            onClick={() => switchMode("code")}
            className="mx-auto flex items-center gap-1.5 text-xs text-bf-muted hover:text-bf-ink"
          >
            <ArrowLeftIcon className="size-3" /> Use a different email
          </button>
        </form>
      ) : mode === "code" && code ? (
        <form onSubmit={(e) => (e.preventDefault(), run(() => code.request(email), () => setAwaitingCode(true)))} className="space-y-4">
          {emailField}
          {errorNode}
          <Button type="submit" variant="primary" className={wide} pending={pending}>
            {!pending && <MailIcon />}
            {pending ? "Sending…" : "Email me a code"}
          </Button>
          {password && switcher("password", "Sign in with a password")}
        </form>
      ) : password ? (
        <form onSubmit={(e) => (e.preventDefault(), run(() => password(email, pass), done))} className="space-y-4">
          {emailField}
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-3">
              <label htmlFor="bf-password" className="text-[13px] font-semibold text-bf-ink">
                Password
              </label>
              {forgotHref && (
                <Link href={forgotHref} className="text-xs text-bf-muted underline underline-offset-4 hover:text-bf-ink">
                  Forgot password?
                </Link>
              )}
            </div>
            <Input
              id="bf-password"
              type="password"
              autoComplete="current-password"
              required
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              className="h-11"
              aria-invalid={!!error}
              aria-describedby={described}
              disabled={pending}
            />
          </div>
          {errorNode}
          <Button type="submit" variant="primary" className={wide} pending={pending}>
            {!pending && <KeyRoundIcon />}
            {pending ? "Signing in…" : "Sign in"}
          </Button>
          {code && switcher("code", "Email me a code instead")}
        </form>
      ) : null}
    </div>
  );
}

/* ── forgot and reset ─────────────────────────────────────────────────────────────────────────────── */

/** Asks for a reset link. Says the same thing whether or not the address has an account. */
export function ForgotPasswordForm({ onSubmit }: { onSubmit: (email: string) => Promise<AuthResult> }) {
  const [email, setEmail] = React.useState("");
  const [sent, setSent] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          const r = await onSubmit(email.trim());
          if (r.ok) setSent(true);
          else setError(r.message);
        });
      }}
      className="space-y-4"
    >
      <Field label="Email" htmlFor="bf-forgot-email">
        <Input id="bf-forgot-email" type="email" autoComplete="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" className="h-11" disabled={pending} />
      </Field>
      <FormError message={error} />
      <FormNotice message={sent ? "If that address has an account, a link to set a new password is on its way. It works once." : null} />
      <Button type="submit" variant="primary" className={wide} pending={pending}>
        {pending ? "Sending…" : sent ? "Send it again" : "Email me a link"}
      </Button>
    </form>
  );
}

export const MIN_PASSWORD = 8;

/** Checks a new password and its confirmation; null when fine. */
export function passwordProblem(password: string, confirm: string): string | null {
  if (password.length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters.`;
  if (password !== confirm) return "The two passwords do not match.";
  return null;
}

function NewPasswordFields({ disabled, idPrefix }: { disabled: boolean; idPrefix: string }) {
  return (
    <>
      <Field label="New password" htmlFor={`${idPrefix}-password`}>
        <Input id={`${idPrefix}-password`} name="password" type="password" required minLength={MIN_PASSWORD} autoComplete="new-password" placeholder={`At least ${MIN_PASSWORD} characters`} className="h-11" disabled={disabled} />
      </Field>
      <Field label="Confirm password" htmlFor={`${idPrefix}-confirm`}>
        <Input id={`${idPrefix}-confirm`} name="confirm" type="password" required minLength={MIN_PASSWORD} autoComplete="new-password" placeholder="Type it again" className="h-11" disabled={disabled} />
      </Field>
    </>
  );
}

/** Sets a new password from a reset link (the page has already redeemed it). */
export function ResetPasswordForm({ onSubmit, onDone }: { onSubmit: (password: string) => Promise<AuthResult>; onDone: () => void }) {
  return <NewPasswordForm onSubmit={onSubmit} onDone={onDone} submitLabel="Save password" idPrefix="bf-reset" />;
}

/** Change password while signed in. */
export function ChangePasswordForm({ onSubmit }: { onSubmit: (password: string) => Promise<AuthResult> }) {
  return <NewPasswordForm onSubmit={onSubmit} submitLabel="Change password" idPrefix="bf-change" doneText="Password changed." />;
}

function NewPasswordForm({
  onSubmit,
  onDone,
  submitLabel,
  idPrefix,
  doneText,
}: {
  onSubmit: (password: string) => Promise<AuthResult>;
  onDone?: () => void;
  submitLabel: string;
  idPrefix: string;
  doneText?: string;
}) {
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const fd = new FormData(form);
        const p = String(fd.get("password") ?? "");
        const problem = passwordProblem(p, String(fd.get("confirm") ?? ""));
        setNotice(null);
        if (problem) return setError(problem);
        setError(null);
        startTransition(async () => {
          const r = await onSubmit(p);
          if (!r.ok) return setError(r.message);
          form.reset();
          if (doneText) setNotice(doneText);
          onDone?.();
        });
      }}
      className="space-y-4"
    >
      <NewPasswordFields disabled={pending} idPrefix={idPrefix} />
      <FormError message={error} />
      <FormNotice message={notice} />
      <Button type="submit" variant="primary" className={wide} pending={pending}>
        {pending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}

/* ── sign up ──────────────────────────────────────────────────────────────────────────────────────── */

export type SignUpValues = { organisation: string; name: string; email: string; password: string };
export type SignUpResult = AuthResult & { mailWarning?: string | null };

/**
 * A new organisation (or store, or workspace) and its first admin. From tripsetu / insightuno's sign-up. After
 * success it shows CheckEmail in place of the form.
 */
export function SignUpForm({
  onSubmit,
  organisationLabel = "Organisation",
  organisationHint,
  organisationPlaceholder = "Acme Foods",
  submitLabel = "Create my account",
  googleHref,
  google,
  terms,
  signInHref,
}: {
  onSubmit: (v: SignUpValues) => Promise<SignUpResult>;
  /** null leaves the organisation field out (a person joining, not founding). */
  organisationLabel?: string | null;
  organisationHint?: string;
  organisationPlaceholder?: string;
  submitLabel?: string;
  googleHref?: string;
  google?: GoogleStart;
  /** Terms and privacy links shown under the button. */
  terms?: { termsHref: string; privacyHref: string };
  signInHref: string;
}) {
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState<{ email: string; org: string; warning?: string | null } | null>(null);
  const [pending, startTransition] = React.useTransition();

  if (done) return <CheckEmail email={done.email} what={done.org || undefined} warning={done.warning} signInHref={signInHref} />;

  return (
    <div>
      {(google || googleHref) && <GoogleButton start={google} href={googleHref} label="Sign up with Google" />}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const v: SignUpValues = {
            organisation: String(fd.get("organisation") ?? "").trim(),
            name: String(fd.get("name") ?? "").trim(),
            email: String(fd.get("email") ?? "").trim(),
            password: String(fd.get("password") ?? ""),
          };
          const problem = passwordProblem(v.password, String(fd.get("confirm") ?? ""));
          if (problem) return setError(problem);
          setError(null);
          startTransition(async () => {
            const r = await onSubmit(v);
            if (r.ok) setDone({ email: v.email, org: v.organisation, warning: r.mailWarning });
            else setError(r.message);
          });
        }}
        className="space-y-4"
      >
        {organisationLabel !== null && (
          <Field label={organisationLabel} htmlFor="bf-su-org" hint={organisationHint}>
            <Input id="bf-su-org" name="organisation" required minLength={2} maxLength={120} autoComplete="organization" placeholder={organisationPlaceholder} className="h-11" disabled={pending} />
          </Field>
        )}
        <Field label="Your name" htmlFor="bf-su-name">
          <Input id="bf-su-name" name="name" required maxLength={120} autoComplete="name" className="h-11" disabled={pending} />
        </Field>
        <Field label="Work email" htmlFor="bf-su-email" hint="You confirm this address before you sign in.">
          <Input id="bf-su-email" name="email" type="email" required autoComplete="email" inputMode="email" placeholder="you@company.com" className="h-11" disabled={pending} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Password" htmlFor="bf-su-password">
            <Input id="bf-su-password" name="password" type="password" required minLength={MIN_PASSWORD} autoComplete="new-password" className="h-11" disabled={pending} />
          </Field>
          <Field label="Confirm" htmlFor="bf-su-confirm">
            <Input id="bf-su-confirm" name="confirm" type="password" required minLength={MIN_PASSWORD} autoComplete="new-password" className="h-11" disabled={pending} />
          </Field>
        </div>
        <p className="-mt-2 text-xs text-bf-muted">At least {MIN_PASSWORD} characters.</p>
        <FormError message={error} />
        <Button type="submit" variant="primary" className={wide} pending={pending}>
          {pending ? "Setting up…" : submitLabel}
        </Button>
        {terms && (
          <p className="text-center text-xs text-bf-muted">
            By continuing you accept the{" "}
            <Link href={terms.termsHref} className="underline">
              Terms
            </Link>{" "}
            and the{" "}
            <Link href={terms.privacyHref} className="underline">
              Privacy policy
            </Link>
            .
          </p>
        )}
      </form>
    </div>
  );
}
